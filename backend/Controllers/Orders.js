import { notifyNewOrder } from "../services/push.js";
import mongoose from "mongoose";
import Orders from "../Model/Orders.js";
import Drinks from "../Model/Drinks.js";
import Pub from "../Model/Pub.js";

const createOrder = async (req, res) => {
  try {
    const { pub, table, items } = req.body ?? {};

    if (typeof pub !== "string" || !pub.trim()) {
      return res.status(400).json({ message: "El pub es obligatorio" });
    }

    if (!Number.isInteger(table) || table < 1) {
      return res.status(400).json({
        message: "La mesa debe ser un número entero mayor que cero",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "El pedido debe contener al menos una bebida",
      });
    }

    const owner = await Pub.findOne({ pub: pub.trim() });
    if (!owner) return res.status(404).json({ message: "Bar no encontrado" });
    const validatedItems = [];

    // Validamos todo antes de guardar para evitar pedidos incompletos.
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return res.status(400).json({ message: "Línea de pedido inválida" });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({
          message: "La cantidad debe ser un número entero mayor que cero",
        });
      }

      // Comprobamos el formato antes de consultar MongoDB.
      if (!mongoose.isObjectIdOrHexString(item.drink)) {
        return res.status(400).json({ message: "ID de bebida inválido" });
      }

      const drink = await Drinks.findOne({ _id: item.drink, pub: owner.pub });
      if (!drink || !drink.available) {
        return res.status(400).json({ message: "Bebida no disponible" });
      }

      // null o un campo omitido significa que la bebida se sirve sola.
      let mixer = null;
      if (item.mixer != null) {
        if (drink.type !== "copas") {
          return res.status(400).json({
            message: "Solo las copas pueden llevar mezcla",
          });
        }

        if (!mongoose.isObjectIdOrHexString(item.mixer)) {
          return res.status(400).json({ message: "ID de refresco inválido" });
        }

        mixer = await Drinks.findOne({ _id: item.mixer, pub: owner.pub });
        if (!mixer || !mixer.available || mixer.type !== "refrescos") {
          return res.status(400).json({ message: "Refresco no disponible" });
        }
      }

      validatedItems.push({
        drink: drink._id,
        mixer: mixer ? mixer._id : null,
        quantity: item.quantity,
        // En esta versión el refresco está incluido. Ignoramos precios del cliente.
        unitPrice: drink.price,
      });
    }

    // Solo guardamos campos comprobados; el cliente no decide el estado inicial.
    const order = await Orders.create({
      pub: pub.trim(),
      table,
      items: validatedItems,
      status: "pending",
    });

    // El pedido ya está guardado. Un fallo push no debe convertirlo en un error para el cliente.
    void notifyNewOrder(owner, order).catch((error) => {
      console.error("Fallo al preparar avisos del pedido:", error.name);
    });
    return res.status(201).json({
      message: "Pedido creado",
      order,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Datos del pedido inválidos" });
    }

    console.error("Error al crear el pedido:", error);
    return res.status(500).json({ message: "No se pudo crear el pedido" });
  }
};

// La paginación por cursor evita saltar miles de registros al consultar páginas antiguas.
export function buildOrdersQuery(pub, query = {}) {
  const view = query.view ?? "active";
  if (!["active", "history"].includes(view)) throw new Error("Vista inválida");
  const statuses =
    view === "active"
      ? ["pending", "preparing", "served"]
      : ["paid", "cancelled"];
  const status = query.status ?? "all";
  if (status !== "all" && !statuses.includes(status))
    throw new Error("Estado inválido para esta vista");
  if (
    query.limit !== undefined &&
    (typeof query.limit !== "string" || !/^[1-9][0-9]*$/.test(query.limit))
  ) {
    throw new Error("Tamaño de página inválido");
  }
  const limit = Number(query.limit ?? 20);
  if (!Number.isSafeInteger(limit) || limit > 50)
    throw new Error("El tamaño de página debe estar entre 1 y 50");

  const filter = { pub, status: status === "all" ? { $in: statuses } : status };
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== "string" || query.cursor.length > 512)
      throw new Error("Cursor inválido");
    let cursor;
    try {
      cursor = JSON.parse(
        Buffer.from(query.cursor, "base64url").toString("utf8"),
      );
    } catch {
      throw new Error("Cursor inválido");
    }
    if (
      !cursor ||
      typeof cursor.date !== "string" ||
      !Number.isFinite(Date.parse(cursor.date)) ||
      !mongoose.isObjectIdOrHexString(cursor.id)
    )
      throw new Error("Cursor inválido");
    const date = new Date(cursor.date);
    filter.$or = [
      { createdAt: { $lt: date } },
      { createdAt: date, _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
    ];
  }
  return { filter, limit };
}

// El GET sin parámetros solo carga pedidos activos, nunca el historial.
const getOrders = async (req, res) => {
  if (!req.pub) return res.status(401).json({ message: "Pub no autenticado" });
  let query;
  try {
    query = buildOrdersQuery(req.pub.pub, req.query);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    const rows = await Orders.find(query.filter)
      .select("pub table status items createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit + 1)
      .populate("items.drink", "name")
      .populate("items.mixer", "name")
      .lean();
    // Un registro extra indica si hay otra página; evitamos un countDocuments adicional.
    const hasMore = rows.length > query.limit;
    const orders = rows.slice(0, query.limit);
    const last = orders.at(-1);
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            date: new Date(last.createdAt).toISOString(),
            id: last._id.toString(),
          }),
        ).toString("base64url")
      : null;
    return res.json({ orders, hasMore, nextCursor, limit: query.limit });
  } catch (error) {
    console.error("Error al consultar pedidos:", error);
    return res
      .status(500)
      .json({ message: "No se pudieron obtener los pedidos" });
  }
};
// La actualización condicional evita que dos empleados cambien un estado antiguo a la vez.
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};
    if (!mongoose.isObjectIdOrHexString(id)) {
      return res.status(400).json({ message: "ID de pedido inválido" });
    }
    const allowedPrevious = {
      served: ["pending", "preparing"],
      paid: ["served"],
    };
    if (!Object.hasOwn(allowedPrevious, status)) {
      return res
        .status(400)
        .json({ message: "Solo se permite marcar como servido o pagado" });
    }
    const account = req.pub;
    if (!account)
      return res.status(401).json({ message: "Pub no autenticado" });
    if (typeof account.pub !== "string" || !account.pub.trim()) {
      return res.status(403).json({ message: "Cuenta de pub inválida" });
    }

    // El filtro por pub se aplica también al escribir; conocer un ID no da acceso.
    const order = await Orders.findOneAndUpdate(
      { _id: id, pub: account.pub, status: { $in: allowedPrevious[status] } },
      { $set: { status } },
      { new: true, runValidators: true },
    )
      .populate("items.drink", "name")
      .populate("items.mixer", "name");

    if (!order) {
      const existing = await Orders.findOne({
        _id: id,
        pub: account.pub,
      }).select("status");
      if (!existing)
        return res.status(404).json({ message: "Pedido no encontrado" });
      return res.status(409).json({
        message:
          "El pedido ha cambiado de estado. Actualiza la lista antes de continuar.",
      });
    }
    return res.status(200).json(order);
  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    return res.status(500).json({ message: "No se pudo actualizar el pedido" });
  }
};

export { createOrder, getOrders, updateOrderStatus };

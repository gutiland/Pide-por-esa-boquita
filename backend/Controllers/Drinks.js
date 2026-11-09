import mongoose from "mongoose";
import Pub from "../Model/Pub.js";
import Drinks from "../Model/Drinks.js";

const fields = (body = {}) =>
  Object.fromEntries(
    ["name", "price", "type", "img", "category", "available"]
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );
const fail = (res, error) =>
  res.status(error.name === "ValidationError" ? 400 : 500).json({
    message:
      error.name === "ValidationError"
        ? "Datos de bebida inválidos"
        : "No se pudo completar la operación",
  });

export const getDrinks = async (req, res) => {
  try {
    if (typeof req.query.pub !== "string")
      return res.status(400).json({ message: "Indica el pub de la carta" });
    const pub = await Pub.findOne({ pub: req.query.pub });
    if (!pub) return res.status(404).json({ message: "Bar no encontrado" });
    return res.json(await Drinks.find({ pub: pub.pub, available: true }));
  } catch (error) {
    return fail(res, error);
  }
};
export const createDrinks = async (req, res) => {
  try {
    const data = fields(req.body);
    if (await Drinks.exists({ pub: req.pub.pub, name: data.name })) {
      return res
        .status(409)
        .json({ message: "Esta bebida ya existe en tu carta" });
    }
    return res
      .status(201)
      .json(await Drinks.create({ ...data, pub: req.pub.pub }));
  } catch (error) {
    return fail(res, error);
  }
};
export const editDrinks = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id))
      return res.status(400).json({ message: "ID inválido" });
    const drink = await Drinks.findOneAndUpdate(
      { _id: req.params.id, pub: req.pub.pub },
      fields(req.body),
      { new: true, runValidators: true },
    );
    if (!drink)
      return res.status(404).json({ message: "Bebida no encontrada" });
    return res.json(drink);
  } catch (error) {
    return fail(res, error);
  }
};
export const deleteDrinks = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id))
      return res.status(400).json({ message: "ID inválido" });
    // Desactivamos en lugar de borrar para conservar nombres en pedidos históricos.
    const drink = await Drinks.findOneAndUpdate(
      { _id: req.params.id, pub: req.pub.pub },
      { available: false },
      { new: true },
    );
    if (!drink)
      return res.status(404).json({ message: "Bebida no encontrada" });
    return res.json({ message: "Bebida retirada de la carta" });
  } catch (error) {
    return fail(res, error);
  }
};

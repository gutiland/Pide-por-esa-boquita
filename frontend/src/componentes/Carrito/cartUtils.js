// Calculamos en céntimos para evitar errores decimales al sumar precios.
export const lineKey = (drink, mixer) =>
  drink._id + ":" + (mixer?._id ?? "solo");

export function addItem(items, drink, mixer = null) {
  const key = lineKey(drink, mixer);
  const existing = items.find((item) => item.key === key);
  if (existing) {
    return items.map((item) =>
      item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }
  return [
    ...items,
    {
      key,
      drink: { _id: drink._id, name: drink.name, type: drink.type },
      mixer: mixer ? { _id: mixer._id, name: mixer.name } : null,
      quantity: 1,
      unitPrice: drink.price,
    },
  ];
}

export function changeQuantity(items, key, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) return items;
  return items.map((item) => (item.key === key ? { ...item, quantity } : item));
}

export const totalCents = (items) =>
  items.reduce(
    (total, item) => total + Math.round(item.unitPrice * 100) * item.quantity,
    0,
  );

// Solo recuperamos el formato nuevo; los pedidos antiguos guardaban nombres sin IDs.
export function isSavedItem(item) {
  return Boolean(
    item &&
    item.drink &&
    typeof item.drink._id === "string" &&
    typeof item.drink.name === "string" &&
    (item.mixer === null ||
      (item.mixer &&
        typeof item.mixer._id === "string" &&
        typeof item.mixer.name === "string")) &&
    item.key === lineKey(item.drink, item.mixer) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0,
  );
}
// Solo aceptamos un parámetro mesa, entero positivo y sin formatos ambiguos.
export function readTable(search) {
  const values = new URLSearchParams(search).getAll("mesa");
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) return null;
  const table = Number(values[0]);
  return Number.isSafeInteger(table) ? table : null;
}

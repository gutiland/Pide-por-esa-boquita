import drinks from "./data.js";
import Drinks from "../Model/Drinks.js";
import Pub from "../Model/Pub.js";
import { configDotenv } from "dotenv";
import { connectBD } from "../config/config.js";
import mongoose from "mongoose";

configDotenv();
const slug = process.argv[2];
try {
  if (!slug) throw new Error("Indica el pub: npm run seed -- bar-central");
  await connectBD();
  const pub = await Pub.findOne({ pub: slug });
  if (!pub) throw new Error("Pub no encontrado");
  // La semilla solo sustituye la carta del pub indicado, nunca la de los demás.
  await Drinks.deleteMany({ pub: pub.pub });
  const inserted = await Drinks.insertMany(drinks.map((drink) => ({ ...drink, pub: pub.pub })));
  console.log("Bebidas insertadas: " + inserted.length);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
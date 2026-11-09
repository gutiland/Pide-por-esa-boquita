import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectBD } from "../config/config.js";
import { initializePubs } from "../config/initializePubs.js";
import Pub from "../Model/Pub.js";

configDotenv();
const [slug, name, email] = process.argv.slice(2);
try {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name || !email || !process.env.PUB_PASSWORD) {
    throw new Error('Uso: npm run create-pub -- identificador "Nombre del bar" email. Define PUB_PASSWORD antes de ejecutar.');
  }
  if (process.env.PUB_PASSWORD.length < 12) throw new Error("Utiliza una contraseña de al menos 12 caracteres.");
  await connectBD();
  // Asigna la antigua carta global antes de crear un segundo bar.
  await initializePubs();
  if (await Pub.exists({ $or: [{ pub: slug }, { email: email.trim().toLowerCase() }] })) {
    throw new Error("Ya existe un pub con ese identificador o email.");
  }
  await Pub.create({ pub: slug, name, email, password: await bcrypt.hash(process.env.PUB_PASSWORD, 12) });
  console.log("Pub creado. Carta pública: /bar/" + slug);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
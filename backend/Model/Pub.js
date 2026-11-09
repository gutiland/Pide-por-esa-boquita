import { isPubSlug } from "../config/pubSlugs.js";
import mongoose from "mongoose";

// Cada documento representa un bar. initializePubs copia las cuentas antiguas válidas sin borrarlas.
// Colores HEX de seis dígitos. primaryColor genera los matices; theme permite ajustes.
const themeColor = () => ({ type: String, match: /^#[0-9a-fA-F]{6}$/ });
const themeSchema = new mongoose.Schema(
  {
    background: themeColor(),
    surface: themeColor(),
    card: themeColor(),
    header: themeColor(),
    headerText: themeColor(),
    text: themeColor(),
    mutedText: themeColor(),
    buttonText: themeColor(),
  },
  { _id: false },
);
const pubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    pub: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      immutable: true,
      validate: {
        validator: isPubSlug,
        message: "Identificador inválido o reservado para la aplicación",
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: { type: String, required: true, select: false },
    logo: { type: String, default: "/images/drinks/offside-logo.png" },
    description: { type: String, default: "Tu terraza de siempre" },
    primaryColor: {
      type: String,
      default: "#ef78b3",
      match: /^#[0-9a-fA-F]{6}$/,
    },
    theme: { type: themeSchema, default: () => ({}) },
    currency: { type: String, enum: ["EUR"], default: "EUR" },
  },
  { timestamps: true, collection: "pubs" },
);

export default mongoose.model("Pub", pubSchema);

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Pub from "../Model/Pub.js";

export default async function auth(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token requerido" });
  }
  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!mongoose.isObjectIdOrHexString(payload.pubId)) throw new Error("Token sin pub");
  } catch {
    return res.status(401).json({ message: "Token inválido o caducado" });
  }
  try {
    const pub = await Pub.findById(payload.pubId);
    if (!pub) return res.status(401).json({ message: "Pub no encontrado" });
    req.pub = pub;
    next();
  } catch {
    return res.status(500).json({ message: "No se pudo comprobar la cuenta del pub" });
  }
}
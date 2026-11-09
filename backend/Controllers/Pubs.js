import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Pub from "../Model/Pub.js";

export const publicPub = (pub) => ({
  id: pub._id.toString(),
  slug: pub.pub,
  name: pub.name,
  logo: pub.logo,
  description: pub.description,
  primaryColor: pub.primaryColor,
  theme: pub.theme,
  currency: pub.currency,
});

export const loginPub = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email y contraseña obligatorios" });
    }
    const pub = await Pub.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!pub || !await bcrypt.compare(password, pub.password)) {
      return res.status(401).json({ message: "Email o contraseña incorrectos" });
    }
    const token = jwt.sign({ pubId: pub._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: "24h", algorithm: "HS256",
    });
    return res.json({ token });
  } catch (error) {
    console.error("Error en login del pub:", error);
    return res.status(500).json({ message: "No se pudo iniciar sesión" });
  }
};

export const getMe = (req, res) => res.json(publicPub(req.pub));

export const getPublicPub = async (req, res) => {
  try {
    const pub = await Pub.findOne({ pub: req.params.slug });
    if (!pub) return res.status(404).json({ message: "Bar no encontrado" });
    return res.json(publicPub(pub));
  } catch {
    return res.status(500).json({ message: "No se pudo cargar el bar" });
  }
};
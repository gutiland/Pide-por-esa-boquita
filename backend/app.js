import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import DrinksRouter from "./Routes/Drinks.js";
import PubsRouter from "./Routes/Pubs.js";
import OrderRouter from "./Routes/Orders.js";
import PushRouter from "./Routes/Push.js";

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
// En producción frontend y API comparten origen, sin CORS abierto a otros sitios.
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173" }));
}
app.use(express.json({ limit: "64kb" }));
app.get("/api/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting" });
});
app.use("/api/drinks", DrinksRouter);
app.use("/api/pubs", PubsRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/push", PushRouter);
// Una API inexistente devuelve JSON, nunca la página de React.
app.use("/api", (req, res) =>
  res.status(404).json({ message: "Ruta no encontrada" }),
);

const directory = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(directory, "../frontend/dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use((req, res, next) => {
    if (req.path.split("/").some((part) => part.startsWith(".")))
      return res.sendStatus(404);
    next();
  });
  app.use(
    express.static(dist, {
      dotfiles: "deny",
      setHeaders(res, file) {
        if (
          file.endsWith("sw.js") ||
          file.endsWith("index.html") ||
          file.endsWith("manifest.webmanifest")
        ) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );
  // No devolvemos HTML cuando falta un icono o el worker.
  app.get("/{*route}", (req, res) => {
    if (path.extname(req.path)) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(path.join(dist, "index.html"));
  });
} else if (process.env.NODE_ENV === "production") {
  throw new Error("Falta compilar el frontend antes de arrancar en producción");
}
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({
    message: status === 500 ? "Error del servidor" : "Petición inválida",
  });
});
export default app;

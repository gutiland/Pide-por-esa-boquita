import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { connectBD } from "./config/config.js";
import { initializePubs } from "./config/initializePubs.js";
import PushSubscription from "./Model/PushSubscription.js";
import Orders from "./Model/Orders.js";
import app from "./app.js";

configDotenv();
const port = Number(process.env.PORT || 3000);
let server;
try {
  if (!process.env.DB || !process.env.JWT_SECRET) throw new Error("Faltan DB o JWT_SECRET");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Puerto inválido");
  await connectBD();
  await initializePubs();
  await Promise.all([PushSubscription.init(), Orders.init()]);
  server = app.listen(port, "0.0.0.0", () => console.log("Servidor escuchando en puerto " + port));
} catch (error) {
  console.error("No se pudo iniciar el servidor:", error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}

// El alojamiento utiliza SIGTERM al desplegar una versión nueva.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 20000);
    timeout.unref();
    if (server) server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
    else mongoose.disconnect().finally(() => process.exit(0));
  });
}
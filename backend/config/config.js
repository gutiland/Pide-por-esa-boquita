import mongoose from "mongoose";
import { setServers } from "node:dns";

export const connectBD = async () => {
  // El ajuste DNS que necesitó este ordenador queda como opción, no se impone al hosting.
  if (process.env.DNS_SERVERS) {
    setServers(
      process.env.DNS_SERVERS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }
  await mongoose.connect(process.env.DB, { serverSelectionTimeoutMS: 15000 });
  console.log("bd conectada");
};

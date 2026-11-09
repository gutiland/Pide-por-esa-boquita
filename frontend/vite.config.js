import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Permite abrir la web desde otro dispositivo conectado a la misma red.
    host: "0.0.0.0",
    // El navegador usa /api; Vite contacta con Express desde el ordenador.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});

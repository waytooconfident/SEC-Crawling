import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = process.env.VITE_API_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 開發時把 /api 請求轉給 Flask
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      // WebSocket
      "/socket.io": {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});

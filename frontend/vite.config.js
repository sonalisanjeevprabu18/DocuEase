import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend URL for local development. In production the app talks to the
// deployed FastAPI service via VITE_API_BASE_URL (see .env.example).
const DEV_BACKEND = process.env.VITE_DEV_BACKEND || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: DEV_BACKEND, changeOrigin: true },
      "/health": { target: DEV_BACKEND, changeOrigin: true },
    },
  },
  preview: { port: 4173 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.js"],
    css: false,
    restoreMocks: true,
  },
});

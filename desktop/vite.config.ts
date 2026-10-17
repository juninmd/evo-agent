import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  clearScreen: false,
  // Not 1420/1421: other local dev servers already hold those ports.
  server: { port: 1435, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  build: { target: "esnext" },
});

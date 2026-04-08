import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  base: "/dashboard/",
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, "..", "dist", "dashboard"),
  },
  plugins: [react(), tailwindcss()],
  root: import.meta.dirname,
  server: {
    host: "0.0.0.0",
    port: 4173,
    proxy: {
      "/api": "http://localhost:4141",
    },
  },
})

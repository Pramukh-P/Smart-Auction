import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:5000", changeOrigin: true } } },
  build: { outDir: "dist", rollupOptions: { output: { manualChunks: { vendor: ["react","react-dom","react-router-dom"], redux: ["@reduxjs/toolkit","react-redux"] } } } }
});

import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Load .env so we can check LOCAL_AUTH before Vite processes env vars
dotenv.config({ path: path.resolve(import.meta.dirname, ".env") });

const isLocalAuth = process.env.LOCAL_AUTH === "true" || process.env.VITE_LOCAL_AUTH === "true";

const plugins = [react(), tailwindcss(), jsxLocPlugin()];
// Manus runtime has reconnect/reload logic that causes flickering when running locally
if (!isLocalAuth) {
  plugins.push(vitePluginManusRuntime());
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://localhost:${process.env.PORT || 3000}`,
        ws: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      host: process.env.VITE_HMR_HOST || "localhost",
      port: parseInt(process.env.VITE_HMR_PORT || "3000"),
      protocol: process.env.VITE_HMR_PROTOCOL || "ws",
    },
  },
});

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
    dedupe: ["react", "react-dom"],
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs',
            '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-scroll-area',
            '@radix-ui/react-checkbox', '@radix-ui/react-label', '@radix-ui/react-separator',
            '@radix-ui/react-tooltip', '@radix-ui/react-switch', '@radix-ui/react-accordion',
            '@radix-ui/react-avatar', '@radix-ui/react-collapsible', '@radix-ui/react-slider',
            '@radix-ui/react-progress',
          ],
          'vendor-trpc': ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "@trpc/react-query",
      "@tanstack/react-query",
      "sonner",
      "wouter",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
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
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        changeOrigin: true,
        timeout: 120_000,       // 2 min — large CAD binary uploads/downloads
        proxyTimeout: 120_000,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Prevent premature socket close for large binary transfers (.SLDPRT, .STEP)
            proxyReq.setSocketKeepAlive(true);
          });
          proxy.on("error", (_err, _req, res) => {
            // Friendly auto-retry page instead of white screen / JSON 502
            if (res && "writeHead" in res && !res.headersSent) {
              (res as any).writeHead(502, { "Content-Type": "text/html" });
              (res as any).end(
                `<html><body style="font-family:system-ui;padding:60px;text-align:center;background:#fafafa">` +
                `<h2 style="color:#334155">Backend is starting up...</h2>` +
                `<p style="color:#64748b">Express server on port ${process.env.PORT || 3000} is not ready yet. Auto-retrying in 3s...</p>` +
                `<script>setTimeout(()=>location.reload(),3000)</script>` +
                `</body></html>`
              );
            }
          });
        },
      },
      "/ws": {
        target: `ws://127.0.0.1:${process.env.PORT || 3000}`,
        ws: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      host: process.env.VITE_HMR_HOST || "localhost",
      port: 5174, // Dedicated HMR WebSocket port — avoids conflict with Express on PORT 3000
      protocol: process.env.VITE_HMR_PROTOCOL || "ws",
    },
  },
});

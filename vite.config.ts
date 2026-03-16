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
        manualChunks(id) {
          // Vendor: React core
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // Vendor: Radix UI primitives
          if (id.includes('@radix-ui/')) {
            return 'vendor-radix';
          }
          // Vendor: tRPC + React Query
          if (id.includes('@trpc/') || id.includes('@tanstack/react-query')) {
            return 'vendor-trpc';
          }
          // Vendor: Charts, 3D, Monaco, Mermaid — DO NOT force into named chunks
          // Let Vite split naturally so they only load with the pages that use them
          // Vendor: Icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Vendor: Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform/')) {
            return 'vendor-form';
          }
          // Vendor: Other large deps
          if (id.includes('superjson') || id.includes('zod') || id.includes('date-fns') || id.includes('wouter')) {
            return 'vendor-utils';
          }
          // Vendor: PDF/Excel processing
          if (id.includes('pdfjs') || id.includes('xlsx') || id.includes('exceljs') || id.includes('jspdf')) {
            return 'vendor-office';
          }
          // Vendor: KaTeX math rendering
          if (id.includes('katex')) {
            return 'vendor-katex';
          }
          // Vendor: Shiki/Streamdown — DO NOT chunk together; let lazy-loading split naturally
          // These are only used by AI chat components which are React.lazy() loaded
          // Vendor: Markdown (lightweight)
          if (id.includes('marked') && !id.includes('shiki')) {
            return 'vendor-markdown';
          }
          // Vendor: DnD / sorting
          if (id.includes('@dnd-kit/') || id.includes('react-dnd') || id.includes('react-beautiful-dnd')) {
            return 'vendor-dnd';
          }
          // Vendor: Animation
          if (id.includes('framer-motion') || id.includes('motion')) {
            return 'vendor-motion';
          }
          // Vendor: Date utilities
          if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
            return 'vendor-date';
          }
          // App: i18n — DO NOT force into named chunks; lazy imports handle splitting
          // Core modules (common, nav, etc.) stay in index; domain modules are dynamic imports
          // App: Shared UI components (shadcn)
          if (id.includes('client/src/components/ui/')) {
            return 'app-ui';
          }
          // NOTE: Do NOT chunk client/src/pages/ — React.lazy() handles code-splitting
          // NOTE: Do NOT catch-all remaining node_modules — let Vite split naturally
          // based on which lazy routes import them (enables proper Shiki lazy-loading)
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

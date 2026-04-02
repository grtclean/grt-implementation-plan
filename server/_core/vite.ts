import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("vite");

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    log.error({ distPath }, "Could not find the build directory, make sure to build the client first");
  }

  // ── Gzip/Brotli compression — reduces transfer size by 60-80% ──
  try {
    const compression = require("compression");
    app.use(compression({ level: 6, threshold: 1024 }));
    log.info("Compression middleware enabled");
  } catch {
    log.warn("compression package not installed — serving uncompressed. Run: pnpm add compression");
  }

  // ── Static assets with long cache (hashed filenames = cache-safe) ──
  app.use("/assets", express.static(path.resolve(distPath, "assets"), {
    maxAge: "365d",
    immutable: true,
  }));

  // ── Other static files (logo, manifest, sw.js) — short cache ──
  app.use(express.static(distPath, {
    maxAge: "1h",
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // Short cache + must-revalidate — browser can use cached HTML for 60s,
    // then must check with server (ETag). Reduces DDNS round-trips on quick revisits.
    res.set("Cache-Control", "public, max-age=60, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./local-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initWebSocketServer, getWebSocketStats } from "../services/websocket.service";
import { initIMEWebSocket, getIMEWebSocketStats } from "../ime/ime-websocket.service";
import { initScheduler } from "../services/scheduler.service";
import imeRestApi from "../ime/ime-rest-api";
import { showcaseLeadsRouter } from "../showcase/showcase-leads.router";

const isLocalAuth = process.env.LOCAL_AUTH === "true" || process.env.VITE_LOCAL_AUTH === "true";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register auth routes based on deployment mode
  if (isLocalAuth) {
    registerLocalAuthRoutes(app);
    console.log("[Auth] Local authentication enabled (username/password)");
  } else {
    registerOAuthRoutes(app);
    console.log("[Auth] Manus OAuth authentication enabled");
  }

  // Health check endpoint for production monitoring
  app.get("/health", async (req, res) => {
    let dbStatus = "unknown";
    let dbLatency = 0;
    
    try {
      const { getDb } = await import("../db");
      const startTime = Date.now();
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        dbStatus = "connected";
        dbLatency = Date.now() - startTime;
      } else {
        dbStatus = "not_configured";
      }
    } catch (error) {
      dbStatus = "error";
      console.error("[Health] Database check failed:", error);
    }
    
    const isHealthy = dbStatus === "connected" || dbStatus === "not_configured";
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
        unit: "ms"
      }
    });
  });

  app.get("/ready", (req, res) => {
    res.status(200).json({ ready: true });
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.use("/api/v1/ime", imeRestApi);

  // Showcase Portal — Public CRM lead capture (no auth required)
  app.use("/api/crm/leads", showcaseLeadsRouter);

  // Contract document download endpoint
  app.get("/api/contract-documents/:id/download", async (req, res) => {
    try {
      const { getDocumentById } = await import("../contract/contract.service");
      const doc = await getDocumentById(parseInt(req.params.id, 10));
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      const pathMod = await import("path");
      const filePath = pathMod.resolve(process.cwd(), doc.filePath);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("[Contract Download] Error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const wss = initWebSocketServer(server);
  const imeWss = initIMEWebSocket(server);

  app.get('/api/ws/stats', (req, res) => {
    res.json({
      collaboration: getWebSocketStats(),
      imeLive: getIMEWebSocketStats(),
    });
  });

  // Listen on all interfaces (IPv4 + IPv6) so browsers can connect via
  // either 127.0.0.1 or ::1 when they resolve "localhost".
  // Omitting the host parameter makes Node listen on both IPv4 and IPv6.
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket collaboration available at ws://localhost:${port}/ws/collaboration`);
    console.log(`WebSocket IME live available at ws://localhost:${port}/ws/ime-live`);
    initScheduler();
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch(console.error);

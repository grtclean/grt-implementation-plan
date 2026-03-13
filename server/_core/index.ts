import dotenv from "dotenv";
dotenv.config();
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
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
import { startTaskWorker, stopTaskWorker } from "../services/task-worker.service";
import { registerAllEngines } from "../services/sandbox-engines";
import imeRestApi from "../ime/ime-rest-api";
import { showcaseLeadsRouter } from "../showcase/showcase-leads.router";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("server");

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
  const isDev = process.env.NODE_ENV !== "production";
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'", "*.manus.computer", "*.manuspre.computer", "*.manus-asia.computer", "*.manuscomputer.ai", "*.manusvm.computer"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: isDev ? false : { policy: "same-origin" },
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // In dev, allow all origins (LAN IP access, etc.)
      if (isDev) return callback(null, true);
      const allowed = [
        /localhost/,
        /127\.0\.0\.1/,
        /\.manus\.computer$/,
        /\.manuspre\.computer$/,
        /\.manus-asia\.computer$/,
        /\.manuscomputer\.ai$/,
        /\.manusvm\.computer$/,
      ];
      if (allowed.some(re => re.test(origin))) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Global rate limiter — generous in dev (tRPC batches many queries), strict in prod
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 10000 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  }));

  // X-Request-ID: propagate or generate a unique request identifier
  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // Register auth routes based on deployment mode
  if (isLocalAuth) {
    registerLocalAuthRoutes(app);
    log.info("Local authentication enabled (username/password)");
  } else {
    registerOAuthRoutes(app);
    log.info("Manus OAuth authentication enabled");
  }

  // Health check endpoint for production monitoring
  app.get("/health", async (req, res) => {
    const startMs = Date.now();
    let dbStatus = "unknown";
    let dbLatency = 0;

    try {
      const { getDb } = await import("../db");
      const startTime = Date.now();
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1 LIMIT 1000`);
        dbStatus = "connected";
        dbLatency = Date.now() - startTime;
      } else {
        dbStatus = "not_configured";
      }
    } catch (error) {
      dbStatus = "error";
      log.error({ err: error }, "Database check failed");
    }

    const wsStats = getWebSocketStats();
    const imeStats = getIMEWebSocketStats();
    const isHealthy = dbStatus === "connected" || dbStatus === "not_configured";

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checkDurationMs: Date.now() - startMs,
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      websockets: {
        collaboration: wsStats?.totalConnections ?? 0,
        ime: imeStats?.totalConnections ?? 0,
      },
    });
  });

  app.get("/ready", (req, res) => {
    res.status(200).json({ ready: true });
  });

  // ── SSE Telemetry Stream ─────────────────────────────────────────────
  app.get("/api/telemetry/stream", async (req, res) => {
    try {
      const { sseManager } = await import("../services/telemetry-sse.service");
      const topics = ((req.query.topics as string) || "").split(",").filter(Boolean);
      if (topics.length === 0) {
        return res.status(400).json({ error: "topics query parameter required" });
      }
      const clientId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
      sseManager.addClient(clientId, res, topics);
    } catch (err) {
      log.error({ err }, "SSE stream setup failed");
      res.status(500).json({ error: "SSE unavailable" });
    }
  });

  // ── Chunked File Upload (raw buffer route — BEFORE tRPC) ────────────
  app.put("/api/upload/chunk/:sessionId/:chunkIndex", express.raw({ limit: "20mb", type: "*/*" }), async (req, res) => {
    try {
      const { receiveChunk } = await import("../services/chunked-upload.service");
      const sessionId = req.params.sessionId;
      const chunkIndex = parseInt(req.params.chunkIndex, 10);
      if (isNaN(chunkIndex) || chunkIndex < 0) {
        return res.status(400).json({ error: "Invalid chunk index" });
      }
      const result = await receiveChunk(sessionId, chunkIndex, req.body as Buffer);
      res.json(result);
    } catch (err: any) {
      log.error({ err, sessionId: req.params.sessionId }, "Chunk upload failed");
      res.status(err.code === "NOT_FOUND" ? 404 : 500).json({ error: err.message || "Chunk upload failed" });
    }
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
      const basePath = pathMod.resolve(process.cwd(), 'uploads');
      if (!filePath.startsWith(basePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.sendFile(filePath);
    } catch (error: any) {
      log.error({ err: error }, "Contract document download failed");
      res.status(500).json({ error: "Download failed" });
    }
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  const portFree = await isPortAvailable(port);
  if (!portFree) {
    log.fatal({ port }, "Port is already in use"); process.exit(1);
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
    log.info({ port }, "Server started"); log.info({ port }, "WebSocket collaboration ready"); log.info({ port }, "WebSocket IME live ready");
    initScheduler();

    // Fire-and-forget: auto-seed RBAC roles & permissions if tables are empty
    import("../seed/auto-seed-rbac").then(m => m.autoSeedRbac()).catch(() => {});

    // Start async AI task worker (sandbox engines)
    registerAllEngines();
    startTaskWorker({ pollIntervalMs: 5000, concurrency: 2 });
  });

  process.on("SIGTERM", () => {
    log.info("SIGTERM received, shutting down gracefully");
    stopTaskWorker();
    server.close(() => {
      log.info("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    log.info("SIGINT received, shutting down gracefully");
    stopTaskWorker();
    server.close(() => {
      log.info("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch((err) => log.fatal({ err }, "Server failed to start"));

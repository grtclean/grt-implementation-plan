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
import { initCameraEventWebSocket } from "../services/camera-event-websocket.service";
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

  // Trust proxy headers (x-forwarded-proto, x-forwarded-for) from reverse proxies / DDNS tunnels
  app.set("trust proxy", 1);

  // Gzip compression — MUST be first middleware for all responses (HTML, API, static)
  // Critical for DDNS: reduces 614KB CSS → 68KB, 83KB tRPC → 23KB
  try {
    const compression = require("compression");
    app.use(compression({ level: 6, threshold: 512 }));
  } catch {
    log.warn("compression package not found — responses sent uncompressed");
  }

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
        /\.vicp\.fun$/,
        /\.oicp\.net$/,
        /\.xicp\.net$/,
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
      llm: {
        provider: process.env.AI_PROVIDER || "openai",
        model: process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || process.env.GEMINI_MODEL || "default",
      },
    });
  });

  // LLM provider health check (detailed, separate from main health)
  app.get("/api/llm/health", async (_req, res) => {
    try {
      const { healthCheckAllProviders, listAvailableProviders } = await import("./llm");
      const results = await healthCheckAllProviders();
      const providers = listAvailableProviders();
      res.json({
        activeProvider: process.env.AI_PROVIDER || "openai",
        availableProviders: providers,
        healthChecks: results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
  // ── Conference Asset Upload Endpoint ──
  app.post("/api/conference-assets/upload", express.raw({ limit: "100mb", type: "*/*" }), async (req, res) => {
    try {
      const slug = req.headers["x-conference-slug"] as string || "gear-shaft";
      const assetType = req.headers["x-asset-type"] as string || "presentation";
      const fileName = decodeURIComponent(req.headers["x-file-name"] as string || "upload.pptx");
      const pathMod = await import("path");
      const fsMod = await import("fs");

      const ext = pathMod.extname(fileName);
      const safeName = `${slug}-${assetType}${ext}`;
      const destDir = pathMod.resolve(process.cwd(), "client/public/conference-assets");
      if (!fsMod.existsSync(destDir)) fsMod.mkdirSync(destDir, { recursive: true });
      const destPath = pathMod.join(destDir, safeName);

      fsMod.writeFileSync(destPath, req.body as Buffer);
      const fileSize = (req.body as Buffer).length;

      log.info({ slug, assetType, fileName, safeName, fileSize }, "Conference asset uploaded");
      res.json({ success: true, filePath: `/conference-assets/${safeName}`, fileName, fileSize });
    } catch (error: any) {
      log.error({ err: error }, "Conference asset upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── Portal ping: lightweight connectivity check (no DB, no auth) ──
  app.get("/api/portal/ping", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // /customer/auth is now served by Vite → React (CustomerAuth.tsx via customer-entry.tsx)
  // The previous inline HTML version had encoding issues on DDNS proxies.
  // /vendor/auth also served by Vite now (same encoding fix as /customer/auth)

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
  const cameraWss = initCameraEventWebSocket(server);

  app.get('/api/ws/stats', (req, res) => {
    res.json({
      collaboration: getWebSocketStats(),
      imeLive: getIMEWebSocketStats(),
    });
  });

  // Camera snapshot proxy — serves JPEG snapshots for CameraFeedView polling
  app.get('/api/camera/:id/snapshot', async (req, res) => {
    try {
      const { requireDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const { getCameraAdapter } = await import("../services/camera-adapter.service");
      const db = await requireDb();
      const result = await db.execute(sql`SELECT * FROM cameras WHERE id = ${Number(req.params.id)} AND is_active = true LIMIT 1`);
      const camera = (result.rows as any[])[0];
      if (!camera) { res.status(404).json({ error: 'Camera not found' }); return; }
      const adapter = getCameraAdapter(camera.brand);
      const snapshot = await adapter.getSnapshot(camera);
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'no-cache');
      res.send(snapshot);
    } catch {
      res.status(500).json({ error: 'Snapshot unavailable' });
    }
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

// ── Self-contained Customer Auth HTML ──────────────────────────────────
// Zero external JS/CSS. Everything inline. Loads in <200ms on any network.
function getCustomerAuthHTML(): string {
  return `<!DOCTYPE html><html lang="zh"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GRT 客户门户</title>
<link rel="icon" type="image/gif" href="/GRTlogo.gif">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','PingFang SC',system-ui,sans-serif;background:#faf9f8;color:#323130;-webkit-font-smoothing:antialiased}
.mx{max-width:480px;margin:0 auto;padding:0 20px}
.hdr{border-bottom:1px solid #edebe9;padding:28px 0 20px}
.hdr .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.hdr .logo-row{display:flex;align-items:center;gap:12px}
.hdr .logo-row img{width:44px;height:44px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.hdr h2{font-size:16px;font-weight:600}.hdr .sub{font-size:12px;color:#a19f9d}
.lang-btn{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;border:1px solid #edebe9;background:none;font-size:12px;color:#605e5c;cursor:pointer}
.lang-btn:hover{background:#f3f2f1}
.bar{width:32px;height:4px;background:#0078d4;border-radius:4px;margin-bottom:16px}
h1{font-size:24px;font-weight:600;line-height:1.3;margin-bottom:8px}
h1 span{display:block;color:#0078d4}
.desc{font-size:14px;color:#605e5c;line-height:1.6;margin-bottom:12px}
.metrics{font-size:11px;color:#0078d4;font-weight:500;letter-spacing:.3px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0 8px}
.stat{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;background:#fff;border:1px solid #edebe9;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.stat .num{font-size:20px;font-weight:700}.stat .lbl{font-size:10px;font-weight:600;color:#605e5c;text-align:center}.stat .det{font-size:9px;color:#a19f9d;text-align:center}
.trust{text-align:center;font-size:10px;color:#a19f9d;padding:4px 0}
.card{background:#fff;border:1px solid #edebe9;border-radius:8px;padding:20px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.card h3{font-size:16px;font-weight:600;margin-bottom:4px}.card .sub{font-size:12px;color:#a19f9d;margin-bottom:16px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
label{display:block;font-size:11px;font-weight:500;color:#605e5c;margin-bottom:4px}
label .req{color:#e53e3e}
input,select,textarea{width:100%;height:36px;border:1px solid #8a8886;border-radius:6px;padding:0 10px;font-size:14px;outline:none;background:#fff;color:#323130}
input:focus,select:focus,textarea:focus{border-color:#0078d4;box-shadow:0 0 0 2px rgba(0,120,212,.15)}
textarea{height:auto;padding:10px;font-size:12px;resize:none}
input:disabled,select:disabled,textarea:disabled{opacity:.5}
.err{padding:10px;border-radius:6px;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-size:12px;margin:12px 0;display:none}
.err.show{display:block}
.submit{width:100%;height:44px;border:none;border-radius:6px;background:#0078d4;color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px}
.submit:hover{background:#106ebe}.submit:disabled{opacity:.6;cursor:not-allowed}
.submit svg{width:16px;height:16px}
.footer{border-top:1px solid #edebe9;padding:16px 0 80px;display:flex;align-items:center;justify-content:space-between;margin-top:16px}
.footer span{font-size:10px;color:#a19f9d}
.footer button{font-size:10px;color:#a19f9d;background:none;border:none;cursor:pointer}
.footer button:hover{color:#605e5c}
.fab{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:6px 8px;border-radius:999px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid #edebe9;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:50}
.fab a,.fab button{padding:6px 12px;border-radius:999px;font-size:11px;font-weight:500;text-decoration:none;border:none;background:none;cursor:pointer}
.sol-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.sol-card{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:8px;border:1px solid #edebe9;border-left:2px solid;background:#fff;text-decoration:none;color:inherit}
.sol-card:hover{background:#f3f2f1}
.sol-card .name{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.sol-card .sdesc{font-size:10px;color:#a19f9d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sol-card .spec{font-size:9px;color:rgba(0,120,212,.6);font-family:monospace}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:16px;height:16px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;display:none}
.loading .spinner{display:block}.loading .arrow{display:none}
</style></head><body>
<div class="mx hdr">
  <div class="top">
    <div class="logo-row">
      <img src="/GRTlogo.gif" alt="GRT">
      <div><h2 id="portal">GRT 客户门户</h2><div class="sub" id="subtitle">全球机器人科技 · 工业精密清洗</div></div>
    </div>
    <button class="lang-btn" onclick="toggleLang()" id="langBtn">EN</button>
  </div>
  <div class="bar"></div>
  <h1 id="heroTitle">工业精密清洗<span id="heroHL">为您的行业量身定制</span></h1>
  <p class="desc" id="heroDesc">获取定制清洗方案、跟踪项目进度、查看质量报告，直接对接工程技术团队。</p>
  <div class="metrics" id="heroMetrics">ISO 16232 颗粒度检测 · 94%+ 首次直通率 · 500+ 套系统交付</div>
</div>
<div class="mx">
  <div class="stats" id="stats">
    <div class="stat"><span>🏭</span><div class="num">500+</div><div class="lbl" data-zh="套清洗系统" data-en="Cleaning Systems">套清洗系统</div><div class="det" data-zh="服务全球领军制造企业" data-en="Serving global OEMs">服务全球领军制造企业</div></div>
    <div class="stat"><span>🎯</span><div class="num">94%</div><div class="lbl" data-zh="首次直通率" data-en="First-Pass Yield">首次直通率</div><div class="det" data-zh="行业领先清洁度达标率" data-en="Industry-leading cleanliness">行业领先清洁度达标率</div></div>
    <div class="stat"><span>⏱️</span><div class="num">20+</div><div class="lbl" data-zh="年行业经验" data-en="Years Experience">年行业经验</div><div class="det" data-zh="德国技术 · 全球交付" data-en="German tech · Global delivery">德国技术 · 全球交付</div></div>
  </div>
  <div class="trust" id="trust">BMW · BYD · CATL · Bosch · Continental · ZF 等全球客户信赖</div>

  <div class="sol-grid">
    <a href="/showcase/new-energy" target="_blank" class="sol-card" style="border-left-color:#059669"><div class="name">⚡ <span data-zh="新能源清洗方案" data-en="New Energy Cleaning">新能源清洗方案</span></div><div class="sdesc" data-zh="电驱壳体 · 电池托盘" data-en="E-drive · Battery tray">电驱壳体 · 电池托盘</div><div class="spec">≤50μm · IoT</div></a>
    <a href="/showcase/die-casting" target="_blank" class="sol-card" style="border-left-color:#2563eb"><div class="name">🏭 <span data-zh="铝压铸清洗方案" data-en="Die Casting Solutions">铝压铸清洗方案</span></div><div class="sdesc" data-zh="一体化压铸件" data-en="Mega casting">一体化压铸件</div><div class="spec">Mega Casting</div></a>
    <a href="/showcase/fuel-injection" target="_blank" class="sol-card" style="border-left-color:#ef4444"><div class="name">💧 <span data-zh="燃油喷射精密清洗" data-en="Fuel Injection">燃油喷射精密清洗</span></div><div class="sdesc" data-zh="喷油嘴 · 高压共轨" data-en="Injectors · Common rail">喷油嘴 · 高压共轨</div><div class="spec">≤0.5mg</div></a>
    <a href="/showcase/ice" target="_blank" class="sol-card" style="border-left-color:#f97316"><div class="name">⚙️ <span data-zh="动力总成清洗" data-en="Powertrain / ICE">动力总成清洗</span></div><div class="sdesc" data-zh="缸体 · 缸盖 · 曲轴" data-en="Blocks · Heads · Crankshafts">缸体 · 缸盖 · 曲轴</div><div class="spec">60s takt</div></a>
    <a href="/showroom" target="_blank" class="sol-card" style="border-left-color:#a855f7"><div class="name">⭐ <span data-zh="设备展厅" data-en="Showroom">设备展厅</span></div><div class="sdesc" data-zh="交互式产品演示" data-en="Interactive demos">交互式产品演示</div><div class="spec">Adaptive</div></a>
    <a href="/showcase/company-intro" target="_blank" class="sol-card" style="border-left-color:#06b6d4"><div class="name">🌍 <span data-zh="公司介绍" data-en="About GRT">公司介绍</span></div><div class="sdesc" data-zh="四语言展示" data-en="4 languages">四语言展示</div><div class="spec">20+ years</div></a>
  </div>

  <div class="card">
    <h3 id="formTitle">立即获取专属方案</h3>
    <div class="sub" id="formSub">填写您的信息，30秒内获取匹配您行业的设备推荐</div>
    <form id="regForm" onsubmit="return submitForm(event)">
      <div class="row">
        <div><label id="lPhone">联系电话 <span class="req">*</span></label><input id="phone" name="phone" type="tel" placeholder="138 0013 8000" required autofocus></div>
        <div><label id="lName">您的姓名 <span style="font-size:9px;color:#a19f9d" id="nameOpt">(选填)</span></label><input id="name" name="name" type="text" placeholder="例如：张三"></div>
      </div>
      <div class="row">
        <div><label id="lCompany">公司名称 <span class="req">*</span></label><input id="company" name="company" type="text" placeholder="请输入公司全称" required></div>
        <div><label id="lIndustry">所属行业</label>
          <select id="industry" name="industry"><option value="" id="indPlaceholder">请选择行业</option>
          <option>新能源汽车</option><option>铝压铸</option><option>燃油喷射系统</option><option>动力总成</option><option>齿轮齿轴</option><option>半导体</option><option>医疗器械</option><option>其他</option></select></div>
      </div>
      <div style="margin-bottom:12px"><label id="lReq">需求简述 <span style="font-size:9px;color:#a19f9d" id="reqOpt">(选填)</span></label>
        <textarea id="requirement" name="requirement" rows="2" placeholder="例如：年产量50万件..."></textarea></div>
      <div class="err" id="errBox"></div>
      <button type="submit" class="submit" id="submitBtn">
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <div class="spinner"></div>
        <span id="submitText">立即获取专属方案</span>
      </button>
    </form>
  </div>
  <div class="footer">
    <span id="copyright">© 2026 GRT · 无锡 · 斯图加特 · 底特律</span>
    <button onclick="location.href='/login'" id="empLogin">员工登录</button>
  </div>
</div>
<nav class="fab">
  <button onclick="scrollTo({top:0,behavior:'smooth'})" style="color:#0078d4" id="fabTop">回顶部</button>
  <a href="/showroom" target="_blank" style="color:#8764b8" id="fabShowroom">展厅</a>
  <a href="/showcase/new-energy" target="_blank" style="color:#107c10" id="fabNEV">新能源</a>
</nav>
<div id="netStatus" style="position:fixed;top:8px;right:8px;font-size:10px;padding:4px 8px;border-radius:4px;z-index:99;background:#fef3c7;color:#92400e;display:none"></div>
<script>
(function(){var st=document.getElementById('netStatus');st.style.display='block';st.textContent='⏳ 检测连接...';var t0=Date.now();fetch('/api/portal/ping').then(function(r){return r.json()}).then(function(){var ms=Date.now()-t0;st.style.background=ms<1000?'#d1fae5':'#fef3c7';st.style.color=ms<1000?'#065f46':'#92400e';st.textContent=(ms<1000?'✅':'⚠️')+' '+ms+'ms';setTimeout(function(){st.style.display='none'},3000)}).catch(function(){st.style.background='#fee2e2';st.style.color='#991b1b';st.textContent='❌ 服务器不可达'})})();
var lang='zh';
var ZH={portal:'GRT 客户门户',subtitle:'全球机器人科技 · 工业精密清洗',heroTitle:'工业精密清洗',heroHL:'为您的行业量身定制',heroDesc:'获取定制清洗方案、跟踪项目进度、查看质量报告，直接对接工程技术团队。',heroMetrics:'ISO 16232 颗粒度检测 · 94%+ 首次直通率 · 500+ 套系统交付',trust:'BMW · BYD · CATL · Bosch · Continental · ZF 等全球客户信赖',formTitle:'立即获取专属方案',formSub:'填写您的信息，30秒内获取匹配您行业的设备推荐',lPhone:'联系电话',lName:'您的姓名',nameOpt:'(选填)',lCompany:'公司名称',lIndustry:'所属行业',indPlaceholder:'请选择行业',lReq:'需求简述',reqOpt:'(选填)',submit:'立即获取专属方案',copyright:'© 2026 GRT · 无锡 · 斯图加特 · 底特律',empLogin:'员工登录',langBtn:'EN',errPhone:'请输入联系电话',errPhoneFmt:'电话格式不正确',errCompany:'请输入公司名称',errNetwork:'网络错误，请稍后重试',errRegFail:'注册失败',fabTop:'回顶部',fabShowroom:'展厅',fabNEV:'新能源'};
var EN={portal:'GRT Customer Portal',subtitle:'Global Robot Technology',heroTitle:'Industrial Precision Cleaning',heroHL:'Engineered for Your Industry',heroDesc:'Access tailored cleaning solutions, track your project, review quality reports, and connect directly with our engineering team.',heroMetrics:'ISO 16232 Particle Testing · 94%+ First-Pass Yield · 500+ Systems Delivered',trust:'Trusted by BMW · BYD · CATL · Bosch · Continental · ZF and more',formTitle:'Get Your Tailored Solution',formSub:'Fill in your details — see matched equipment in 30 seconds',lPhone:'Phone Number',lName:'Your Name',nameOpt:'(optional)',lCompany:'Company',lIndustry:'Industry',indPlaceholder:'Select your industry',lReq:'Requirements',reqOpt:'(optional)',submit:'Get My Tailored Solution',copyright:'© 2026 GRT · Wuxi · Stuttgart · Detroit',empLogin:'Employee Login',langBtn:'中文',errPhone:'Please enter your phone number',errPhoneFmt:'Invalid phone format',errCompany:'Please enter your company name',errNetwork:'Network error, please try again',errRegFail:'Registration failed',fabTop:'Top',fabShowroom:'Showroom',fabNEV:'NEV'};
function T(){return lang==='zh'?ZH:EN}
function toggleLang(){
  lang=lang==='zh'?'en':'zh';localStorage.setItem('grt_customer_lang',lang);
  var t=T();
  var ids=['portal','subtitle','heroTitle','heroHL','heroDesc','heroMetrics','trust','formTitle','formSub','lPhone','lName','nameOpt','lCompany','lIndustry','indPlaceholder','lReq','reqOpt','copyright','empLogin','fabTop','fabShowroom','fabNEV'];
  ids.forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=t[id]||''});
  document.getElementById('submitText').textContent=t.submit;
  document.getElementById('langBtn').textContent=t.langBtn;
  document.querySelectorAll('[data-zh]').forEach(function(el){el.textContent=el.getAttribute('data-'+lang)||el.getAttribute('data-zh')});
}
// Restore saved language
(function(){var s=localStorage.getItem('grt_customer_lang');if(s==='en'){lang='en';toggleLang();lang='en'}})();

function submitForm(e){
  e.preventDefault();
  var t=T(),errBox=document.getElementById('errBox'),btn=document.getElementById('submitBtn'),stxt=document.getElementById('submitText');
  var phone=document.getElementById('phone').value.trim();
  var name=document.getElementById('name').value.trim();
  var company=document.getElementById('company').value.trim();
  errBox.className='err';errBox.textContent='';
  if(!phone){errBox.textContent=t.errPhone;errBox.className='err show';return false}
  var digits=phone.replace(/[\\s\\-\\+\\(\\)]/g,'');
  if(!/^\\d{6,15}$/.test(digits)){errBox.textContent=t.errPhoneFmt;errBox.className='err show';return false}
  if(!company){errBox.textContent=t.errCompany;errBox.className='err show';return false}
  btn.classList.add('loading');btn.disabled=true;
  stxt.textContent=lang==='zh'?'正在提交...':'Submitting...';
  // 15秒超时
  var ctrl=new AbortController();
  var timer=setTimeout(function(){ctrl.abort()},15000);
  fetch('/api/auth/customer-register',{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',
    body:JSON.stringify({phone:phone,name:name||undefined,company:company}),
    signal:ctrl.signal
  }).then(function(r){clearTimeout(timer);return r.json().then(function(d){return{ok:r.ok,data:d}})})
  .then(function(r){
    if(!r.ok){errBox.textContent=r.data.error||t.errRegFail;errBox.className='err show';btn.classList.remove('loading');btn.disabled=false;stxt.textContent=t.submit;return}
    showWorkspace(r.data,name,company,phone);
  }).catch(function(err){
    clearTimeout(timer);
    var msg=err&&err.name==='AbortError'?(lang==='zh'?'请求超时，请检查网络后重试':'Request timed out, please check network'):(t.errNetwork+' ('+((err&&err.message)||'unknown')+')');
    errBox.textContent=msg;errBox.className='err show';btn.classList.remove('loading');btn.disabled=false;stxt.textContent=t.submit;
  });
  return false;
}

function showWorkspace(data,name,company,phone){
  var zh=lang==='zh';
  var dn=name||(data.user&&data.user.name)||phone;
  var ind=document.getElementById('industry').value;
  document.body.innerHTML='<div style="min-height:100vh;background:#faf9f8;font-family:Segoe UI,PingFang SC,system-ui,sans-serif">'
  +'<div style="background:#fff;border-bottom:1px solid #edebe9;padding:20px"><div style="max-width:520px;margin:0 auto;display:flex;align-items:center;justify-content:space-between">'
  +'<div style="display:flex;align-items:center;gap:10px"><img src="/GRTlogo.gif" width="36" height="36" style="border-radius:8px">'
  +'<div><div style="font-size:15px;font-weight:600;color:#323130">'+(zh?'GRT 客户平台':'GRT Portal')+'</div>'
  +'<div style="font-size:10px;color:#a19f9d">'+(zh?'您的专属清洗方案中心':'Your Cleaning Solutions Hub')+'</div></div></div>'
  +'<button onclick="location.href=\\'/login\\'" style="font-size:11px;padding:6px 12px;border:1px solid #edebe9;border-radius:6px;background:none;cursor:pointer;color:#605e5c">'+(zh?'退出':'Sign Out')+'</button></div>'
  +'<div style="max-width:520px;margin:12px auto 0;background:#f3f2f1;border-radius:8px;border:1px solid #edebe9;padding:16px;display:flex;align-items:center;gap:12px">'
  +'<div style="width:44px;height:44px;border-radius:50%;background:#deecf9;display:flex;align-items:center;justify-content:center;font-size:18px">🏢</div>'
  +'<div><div style="font-size:14px;font-weight:600;color:#323130">'+(zh?dn+'，欢迎！':'Welcome, '+dn+'!')+'</div>'
  +(company?'<div style="font-size:12px;color:#605e5c">'+company+'</div>':'')+'</div></div></div>'
  +'<div style="max-width:520px;margin:0 auto;padding:20px">'
  +'<div style="font-size:13px;font-weight:600;color:#323130;margin-bottom:12px">'+(zh?'✅ 注册成功！以下是为您推荐的资源：':'✅ Registered! Here are your recommended resources:')+'</div>'
  +'<div style="display:grid;gap:10px">'
  +resourceCard(zh?'💬 技术论坛':'💬 Tech Forum',zh?'与行业专家交流清洗技术与经验':'Exchange insights with industry experts','/customer/forum')
  +resourceCard(zh?'⚡ 新能源方案':'⚡ New Energy',zh?'电驱壳体、电池托盘清洗方案':'E-drive & battery tray solutions','/showcase/new-energy')
  +resourceCard(zh?'⭐ 设备展厅':'⭐ Showroom',zh?'交互式产品演示与性能数据':'Interactive demos & performance data','/showroom')
  +resourceCard(zh?'🌍 公司介绍':'🌍 About GRT',zh?'20年发展历程 · 四语言展示':'20-year history · 4 languages','/showcase/company-intro')
  +resourceCard(zh?'🏭 铝压铸方案':'🏭 Die Casting',zh?'一体化压铸件清洗方案':'Mega casting solutions','/showcase/die-casting')
  +resourceCard(zh?'💧 燃油喷射':'💧 Fuel Injection',zh?'喷油嘴 · 高压共轨精密清洗':'Injectors · Common rail','/showcase/fuel-injection')
  +'</div>'
  +(ind?'<div style="margin-top:20px;padding:16px;background:#deecf9;border-radius:8px;border:1px solid #c7e0f4"><div style="font-size:13px;font-weight:600;color:#0078d4;margin-bottom:4px">'+(zh?'📋 您的行业：'+ind:'📋 Your Industry: '+ind)+'</div><div style="font-size:11px;color:#605e5c">'+(zh?'我们的工程团队将在24小时内为您准备行业专属方案报告。':'Our engineering team will prepare your industry-specific solution report within 24 hours.')+'</div></div>':'')
  +'<div style="margin-top:20px;text-align:center;font-size:10px;color:#a19f9d">'+(zh?'© 2026 GRT · 无锡 · 斯图加特 · 底特律':'© 2026 GRT · Wuxi · Stuttgart · Detroit')+'</div>'
  +'</div></div>';
  history.replaceState(null,'','/customer-workspace');
}
function resourceCard(title,desc,href){
  return '<a href="'+href+'" target="_blank" style="display:flex;align-items:center;gap:12px;padding:14px;background:#fff;border:1px solid #edebe9;border-radius:8px;text-decoration:none;color:inherit;transition:background .15s" onmouseover="this.style.background=\\'#f3f2f1\\'" onmouseout="this.style.background=\\'#fff\\'">'
  +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:#323130">'+title+'</div><div style="font-size:11px;color:#605e5c;margin-top:2px">'+desc+'</div></div>'
  +'<div style="color:#a19f9d;font-size:16px">→</div></a>';
}
</script></body></html>`;
}

// ── Self-contained Vendor/Supplier Auth HTML ──────────────────────────
function getVendorAuthHTML(): string {
  return `<!DOCTYPE html><html lang="zh"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GRT 供应商门户</title>
<link rel="icon" type="image/gif" href="/GRTlogo.gif">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','PingFang SC',system-ui,sans-serif;background:#f0f4f8;color:#1a202c;-webkit-font-smoothing:antialiased}
.mx{max-width:520px;margin:0 auto;padding:0 20px}
.hdr{background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);color:#fff;padding:28px 0 24px}
.hdr .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.hdr .logo-row{display:flex;align-items:center;gap:12px}
.hdr .logo-row img{width:44px;height:44px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.hdr h2{font-size:16px;font-weight:600}.hdr .sub{font-size:12px;color:rgba(255,255,255,.7)}
.lang-btn{padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:none;font-size:12px;color:rgba(255,255,255,.9);cursor:pointer}
.lang-btn:hover{background:rgba(255,255,255,.1)}
h1{font-size:22px;font-weight:600;line-height:1.3;margin-bottom:8px}
h1 span{display:block;color:#64b5f6;font-size:18px;margin-top:4px}
.desc{font-size:13px;color:rgba(255,255,255,.8);line-height:1.6;margin-bottom:12px}
.badge-row{display:flex;gap:8px;flex-wrap:wrap}
.badge{font-size:10px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.15);color:rgba(255,255,255,.9);font-weight:500}
.benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}
.benefit{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.benefit .emoji{font-size:24px}.benefit .lbl{font-size:11px;font-weight:600;color:#2d3748;text-align:center}.benefit .det{font-size:9px;color:#718096;text-align:center}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.card h3{font-size:16px;font-weight:600;margin-bottom:4px;color:#1a202c}.card .sub{font-size:12px;color:#718096;margin-bottom:16px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
label{display:block;font-size:11px;font-weight:500;color:#4a5568;margin-bottom:4px}
label .req{color:#e53e3e}
input,select,textarea{width:100%;height:36px;border:1px solid #cbd5e0;border-radius:6px;padding:0 10px;font-size:14px;outline:none;background:#fff;color:#1a202c}
input:focus,select:focus,textarea:focus{border-color:#3182ce;box-shadow:0 0 0 2px rgba(49,130,206,.2)}
textarea{height:auto;padding:10px;font-size:12px;resize:none}
input:disabled,select:disabled,textarea:disabled{opacity:.5}
.err{padding:10px;border-radius:6px;background:#fff5f5;border:1px solid #feb2b2;color:#c53030;font-size:12px;margin:12px 0;display:none}
.err.show{display:block}
.submit{width:100%;height:44px;border:none;border-radius:8px;background:linear-gradient(135deg,#2b6cb0,#3182ce);color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;transition:opacity .2s}
.submit:hover{opacity:.9}.submit:disabled{opacity:.5;cursor:not-allowed}
.process{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}
.step{text-align:center;padding:12px 4px;background:#fff;border:1px solid #e2e8f0;border-radius:8px}
.step .num{width:24px;height:24px;border-radius:50%;background:#ebf4ff;color:#3182ce;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px}
.step .stxt{font-size:10px;color:#4a5568;font-weight:500}
.footer{border-top:1px solid #e2e8f0;padding:16px 0 80px;display:flex;align-items:center;justify-content:space-between;margin-top:16px}
.footer span{font-size:10px;color:#a0aec0}.footer button{font-size:10px;color:#a0aec0;background:none;border:none;cursor:pointer}
.footer button:hover{color:#4a5568}
.fab{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:6px 8px;border-radius:999px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:50}
.fab a,.fab button{padding:6px 12px;border-radius:999px;font-size:11px;font-weight:500;text-decoration:none;border:none;background:none;cursor:pointer}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:16px;height:16px;border:2px solid transparent;border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;display:none}
.loading .spinner{display:block}.loading .arrow{display:none}
</style></head><body>
<div class="hdr">
<div class="mx">
  <div class="top">
    <div class="logo-row">
      <img src="/GRTlogo.gif" alt="GRT">
      <div><h2 id="portal">GRT 供应商门户</h2><div class="sub" id="subtitle">全球机器人科技 · 供应链协同平台</div></div>
    </div>
    <button class="lang-btn" onclick="toggleLang()" id="langBtn">EN</button>
  </div>
  <h1 id="heroTitle">供应链协同<span id="heroHL">智能化 · 透明化 · 高效化</span></h1>
  <p class="desc" id="heroDesc">注册成为 GRT 认证供应商，在线提交资质、跟踪订单、协同交付，获取采购预测与商机推送。</p>
  <div class="badge-row">
    <span class="badge">🏅 IATF 16949</span>
    <span class="badge">🌿 ISO 14001</span>
    <span class="badge">⚡ JIT 交付</span>
    <span class="badge">📊 在线对账</span>
  </div>
</div>
</div>
<div class="mx">
  <div class="benefits">
    <div class="benefit"><span class="emoji">📋</span><div class="lbl" data-zh="在线认证" data-en="Online Cert">在线认证</div><div class="det" data-zh="资质上传 · 自动校验" data-en="Upload & auto-verify">资质上传 · 自动校验</div></div>
    <div class="benefit"><span class="emoji">📦</span><div class="lbl" data-zh="订单协同" data-en="Order Sync">订单协同</div><div class="det" data-zh="实时进度 · 交付跟踪" data-en="Real-time tracking">实时进度 · 交付跟踪</div></div>
    <div class="benefit"><span class="emoji">💰</span><div class="lbl" data-zh="在线对账" data-en="Reconciliation">在线对账</div><div class="det" data-zh="账单透明 · 自动匹配" data-en="Auto bill matching">账单透明 · 自动匹配</div></div>
  </div>

  <div class="process">
    <div class="step"><div class="num">1</div><div class="stxt" data-zh="注册" data-en="Register">注册</div></div>
    <div class="step"><div class="num">2</div><div class="stxt" data-zh="上传资质" data-en="Upload Docs">上传资质</div></div>
    <div class="step"><div class="num">3</div><div class="stxt" data-zh="审核认证" data-en="Verify">审核认证</div></div>
    <div class="step"><div class="num">4</div><div class="stxt" data-zh="开始协同" data-en="Collaborate">开始协同</div></div>
  </div>

  <div class="card">
    <h3 id="formTitle">供应商注册</h3>
    <div class="sub" id="formSub">填写基本信息，即刻开通供应商账号</div>
    <form id="regForm" onsubmit="return submitForm(event)">
      <div class="row">
        <div><label id="lPhone">联系电话 <span class="req">*</span></label><input id="phone" name="phone" type="tel" placeholder="138 0013 8000" required autofocus></div>
        <div><label id="lName">联系人姓名</label><input id="name" name="name" type="text" placeholder="例如：王工"></div>
      </div>
      <div class="row">
        <div><label id="lCompany">公司全称 <span class="req">*</span></label><input id="company" name="company" type="text" placeholder="请输入公司全称" required></div>
        <div><label id="lRole">职务</label>
          <select id="contactRole" name="contactRole">
            <option value="" id="rolePlaceholder">请选择职务</option>
            <option data-zh="销售经理" data-en="Sales Manager">销售经理</option>
            <option data-zh="品质经理" data-en="Quality Manager">品质经理</option>
            <option data-zh="技术工程师" data-en="Technical Engineer">技术工程师</option>
            <option data-zh="总经理/法人" data-en="GM / Legal Rep">总经理/法人</option>
            <option data-zh="其他" data-en="Other">其他</option>
          </select></div>
      </div>
      <div class="row">
        <div><label id="lCategory">供应品类</label>
          <select id="category" name="category">
            <option value="" id="catPlaceholder">请选择品类</option>
            <option>标准件/紧固件</option><option>气动元件</option><option>传感器</option>
            <option>电气元件</option><option>机械加工件</option><option>钣金焊接件</option>
            <option>管路/接头</option><option>清洗剂/化学品</option><option>包装材料</option><option>其他</option>
          </select></div>
        <div><label id="lCerts">已有认证</label>
          <select id="certs" name="certs">
            <option value="">请选择</option>
            <option>ISO 9001</option><option>ISO 9001 + 14001</option>
            <option>IATF 16949</option><option>ISO 13485 (医疗)</option><option>暂无</option>
          </select></div>
      </div>
      <div class="err" id="errBox"></div>
      <button type="submit" class="submit" id="submitBtn">
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <div class="spinner"></div>
        <span id="submitText">立即注册</span>
      </button>
    </form>
  </div>
  <div class="footer">
    <span id="copyright">© 2026 GRT · 无锡 · 斯图加特 · 底特律</span>
    <button onclick="location.href='/login'" id="empLogin">员工登录</button>
  </div>
</div>
<nav class="fab">
  <button onclick="scrollTo({top:0,behavior:'smooth'})" style="color:#3182ce">回顶部</button>
  <a href="/customer/auth" style="color:#805ad5">客户门户</a>
  <button onclick="location.href='/login'" style="color:#718096">员工入口</button>
</nav>
<script>
var lang='zh';
var ZH={portal:'GRT 供应商门户',subtitle:'全球机器人科技 · 供应链协同平台',heroTitle:'供应链协同',heroHL:'智能化 · 透明化 · 高效化',heroDesc:'注册成为 GRT 认证供应商，在线提交资质、跟踪订单、协同交付，获取采购预测与商机推送。',formTitle:'供应商注册',formSub:'填写基本信息，即刻开通供应商账号',lPhone:'联系电话',lName:'联系人姓名',lCompany:'公司全称',lRole:'职务',rolePlaceholder:'请选择职务',lCategory:'供应品类',catPlaceholder:'请选择品类',lCerts:'已有认证',submit:'立即注册',copyright:'© 2026 GRT · 无锡 · 斯图加特 · 底特律',empLogin:'员工登录',langBtn:'EN',errPhone:'请输入联系电话',errPhoneFmt:'电话格式不正确',errCompany:'请输入公司名称',errNetwork:'网络错误',errRegFail:'注册失败'};
var EN={portal:'GRT Vendor Portal',subtitle:'Global Robot Technology · Supply Chain Platform',heroTitle:'Supply Chain Synergy',heroHL:'Smart · Transparent · Efficient',heroDesc:'Register as a certified GRT supplier. Submit qualifications online, track orders, collaborate on delivery, and receive procurement forecasts.',formTitle:'Vendor Registration',formSub:'Fill in your details to activate your vendor account',lPhone:'Phone',lName:'Contact Name',lCompany:'Company',lRole:'Role',rolePlaceholder:'Select role',lCategory:'Supply Category',catPlaceholder:'Select category',lCerts:'Certifications',submit:'Register Now',copyright:'© 2026 GRT · Wuxi · Stuttgart · Detroit',empLogin:'Employee Login',langBtn:'中文',errPhone:'Please enter phone',errPhoneFmt:'Invalid phone',errCompany:'Please enter company',errNetwork:'Network error',errRegFail:'Registration failed'};
function T(){return lang==='zh'?ZH:EN}
function toggleLang(){
  lang=lang==='zh'?'en':'zh';localStorage.setItem('grt_vendor_lang',lang);
  var t=T();
  ['portal','subtitle','heroTitle','heroHL','heroDesc','formTitle','formSub','lPhone','lName','lCompany','lRole','rolePlaceholder','lCategory','catPlaceholder','copyright','empLogin'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.textContent=t[id]||'';
  });
  document.getElementById('submitText').textContent=t.submit;
  document.getElementById('langBtn').textContent=t.langBtn;
  document.querySelectorAll('[data-zh]').forEach(function(el){el.textContent=el.getAttribute('data-'+lang)||el.getAttribute('data-zh')});
}
(function(){var s=localStorage.getItem('grt_vendor_lang');if(s==='en'){lang='en';toggleLang();lang='en'}})();

function submitForm(e){
  e.preventDefault();
  var t=T(),errBox=document.getElementById('errBox'),btn=document.getElementById('submitBtn');
  var phone=document.getElementById('phone').value.trim();
  var name=document.getElementById('name').value.trim();
  var company=document.getElementById('company').value.trim();
  errBox.className='err';
  if(!phone){errBox.textContent=t.errPhone;errBox.className='err show';return false}
  var digits=phone.replace(/[\\s\\-\\+\\(\\)]/g,'');
  if(!/^\\d{6,15}$/.test(digits)){errBox.textContent=t.errPhoneFmt;errBox.className='err show';return false}
  if(!company){errBox.textContent=t.errCompany;errBox.className='err show';return false}
  btn.classList.add('loading');btn.disabled=true;
  fetch('/api/auth/vendor-register',{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',
    body:JSON.stringify({phone:phone,name:name||undefined,company:company,contactRole:document.getElementById('contactRole').value})
  }).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})})
  .then(function(r){
    if(!r.ok){errBox.textContent=r.data.error||t.errRegFail;errBox.className='err show';btn.classList.remove('loading');btn.disabled=false;return}
    location.href='/supplier-portal/dashboard';
  }).catch(function(){
    errBox.textContent=t.errNetwork;errBox.className='err show';btn.classList.remove('loading');btn.disabled=false;
  });
  return false;
}
</script></body></html>`;
}

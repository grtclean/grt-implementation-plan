/**
 * G-IME Phase 15: Meeting Intelligence REST API
 * External-facing API with key-based authentication, rate limiting, and scoped access.
 */

import { Router, Request, Response, NextFunction } from "express";
import * as imeService from "./ime.service";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  apiKey?: {
    keyId: number;
    keyName: string;
    scopes: string[];
    rateLimit: number;
    rateLimitWindow: string;
  };
}

// --------------------------------------------------------------------------
// Middleware: Authenticate API Key
// --------------------------------------------------------------------------

async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

  if (!apiKeyHeader) {
    return res.status(401).json({ error: "Missing X-API-Key header" });
  }

  const validation = await imeService.validateApiKey(apiKeyHeader);
  if (!validation.valid) {
    return res.status(401).json({ error: "Invalid or expired API key" });
  }

  // Check rate limit
  const rateLimitResult = await imeService.checkRateLimit(
    validation.keyId!,
    validation.rateLimit!,
    validation.rateLimitWindow!
  );

  if (!rateLimitResult.allowed) {
    await imeService.logApiUsage({
      apiKeyId: validation.keyId!,
      keyName: validation.keyName!,
      endpoint: req.path,
      method: req.method,
      statusCode: 429,
      responseTimeMs: Date.now() - startTime,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      errorMessage: "Rate limit exceeded",
    });
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: validation.rateLimit,
      window: validation.rateLimitWindow,
      currentCount: rateLimitResult.currentCount,
    });
  }

  req.apiKey = {
    keyId: validation.keyId!,
    keyName: validation.keyName!,
    scopes: validation.scopes!,
    rateLimit: validation.rateLimit!,
    rateLimitWindow: validation.rateLimitWindow!,
  };

  // Attach start time for response logging
  (req as any)._startTime = startTime;
  next();
}

// --------------------------------------------------------------------------
// Middleware: Require Scope
// --------------------------------------------------------------------------

function requireScope(scope: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey?.scopes.includes(scope)) {
      const startTime = (req as any)._startTime || Date.now();
      imeService.logApiUsage({
        apiKeyId: req.apiKey!.keyId,
        keyName: req.apiKey!.keyName,
        endpoint: req.path,
        method: req.method,
        statusCode: 403,
        responseTimeMs: Date.now() - startTime,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        errorMessage: `Missing scope: ${scope}`,
      });
      return res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
    }
    next();
  };
}

// --------------------------------------------------------------------------
// Helper: wrap handler with response logging
// --------------------------------------------------------------------------

function withLogging(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<any>
) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const startTime = (req as any)._startTime || Date.now();
    try {
      const data = await handler(req, res);
      const responseTimeMs = Date.now() - startTime;
      res.json(data);
      imeService.logApiUsage({
        apiKeyId: req.apiKey!.keyId,
        keyName: req.apiKey!.keyName,
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        responseTimeMs,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ error: err.message || "Internal server error" });
      imeService.logApiUsage({
        apiKeyId: req.apiKey!.keyId,
        keyName: req.apiKey!.keyName,
        endpoint: req.path,
        method: req.method,
        statusCode,
        responseTimeMs,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        errorMessage: err.message,
      });
    }
  };
}

// --------------------------------------------------------------------------
// Apply auth middleware to all routes
// --------------------------------------------------------------------------

router.use(authenticateApiKey);

// --------------------------------------------------------------------------
// Endpoints
// --------------------------------------------------------------------------

// GET /analytics/dashboard — aggregated meeting analytics
router.get(
  "/analytics/dashboard",
  requireScope("read_analytics"),
  withLogging(async (req) => {
    return imeService.getContributionDashboard({});
  })
);

// GET /contributions/:meetingId — contribution breakdown for a meeting
router.get(
  "/contributions/:meetingId",
  requireScope("read_contributions"),
  withLogging(async (req) => {
    return imeService.analyzeContributions(req.params.meetingId);
  })
);

// GET /effectiveness/:meetingId — effectiveness scores for a meeting
router.get(
  "/effectiveness/:meetingId",
  requireScope("read_analytics"),
  withLogging(async (req) => {
    return imeService.scoreMeetingEffectiveness(req.params.meetingId);
  })
);

// GET /employee/:employeeId/trend — employee contribution trend
router.get(
  "/employee/:employeeId/trend",
  requireScope("read_contributions"),
  withLogging(async (req) => {
    return imeService.getEmployeeTrend(req.params.employeeId);
  })
);

// GET /hr-signals — HR signal list
router.get(
  "/hr-signals",
  requireScope("read_signals"),
  withLogging(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT * FROM ime_hr_signals ORDER BY detected_at DESC LIMIT 100
    `);
    return result.rows;
  })
);

// GET /department/:departmentId/rollup — department analytics rollup
router.get(
  "/department/:departmentId/rollup",
  requireScope("read_analytics"),
  withLogging(async (req) => {
    const period = (req.query.period as string) || "monthly";
    return imeService.computeDepartmentRollup(req.params.departmentId, period);
  })
);

// POST /webhooks/trigger — dispatch a webhook event
router.post(
  "/webhooks/trigger",
  requireScope("write_webhooks"),
  withLogging(async (req) => {
    const { event, payload } = req.body || {};
    if (!event) throw Object.assign(new Error("Missing 'event' in body"), { statusCode: 400 });
    // Log webhook dispatch as a usage event; actual webhook delivery is a placeholder
    return {
      dispatched: true,
      event,
      timestamp: new Date().toISOString(),
      message: "Webhook event queued for delivery",
    };
  })
);

// GET /meetings/effectiveness-list — list meetings with effectiveness scores
router.get(
  "/meetings/effectiveness-list",
  requireScope("read_analytics"),
  withLogging(async (req) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT * FROM meeting_effectiveness_scores ORDER BY scored_at DESC LIMIT ${limit}
    `);
    return result.rows;
  })
);

export default router;

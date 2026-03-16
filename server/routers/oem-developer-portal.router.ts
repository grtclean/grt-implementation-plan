/**
 * OEM Developer Portal Router — B2B Open Gateway
 *
 * 4 sub-routers, ~24 procedures:
 *   keys       — API key management (session auth)
 *   webhooks   — Webhook endpoint management (session auth)
 *   data       — External data access (OEM API key auth)
 *   analytics  — API usage monitoring (session auth)
 */

import { z } from "zod";
import { router, requirePermission, requireOemScope, type OemClientContext } from "../_core/trpc";
import { requireDb } from "../db";
import {
  oemApiKeys, oemWebhooks, oemApiCallLogs, oemWebhookDeliveries,
} from "../../drizzle/oem-portal-schema";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { randomBytes, createHash, createHmac } from "crypto";
import { submitTask } from "../services/task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("oem-portal");

// ── Helpers ────────────────────────────────────────────────

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `grt_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

function generateSecret(): { raw: string; hash: string; prefix: string } {
  const raw = `whsec_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

// ── Keys Router ────────────────────────────────────────────

const keysRouter = router({
  list: requirePermission("oem:keys:view").input(z.object({
    clientId: z.number(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select({
      id: oemApiKeys.id,
      keyName: oemApiKeys.keyName,
      keyPrefix: oemApiKeys.keyPrefix,
      scopes: oemApiKeys.scopes,
      status: oemApiKeys.status,
      rateLimitPerHour: oemApiKeys.rateLimitPerHour,
      expiresAt: oemApiKeys.expiresAt,
      lastUsedAt: oemApiKeys.lastUsedAt,
      createdAt: oemApiKeys.createdAt,
      revokedAt: oemApiKeys.revokedAt,
    }).from(oemApiKeys)
      .where(eq(oemApiKeys.clientId, input.clientId))
      .orderBy(desc(oemApiKeys.createdAt))
      .limit(100);
  }),

  create: requirePermission("oem:keys:manage").input(z.object({
    clientId: z.number(),
    keyName: z.string().min(1).max(100),
    scopes: z.array(z.string()).min(1),
    rateLimitPerHour: z.number().min(10).max(100000).default(1000),
    expiresAt: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const { raw, hash, prefix } = generateApiKey();

    const [key] = await db.insert(oemApiKeys).values({
      clientId: input.clientId,
      keyName: input.keyName,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: input.scopes,
      rateLimitPerHour: input.rateLimitPerHour,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: ctx.user.id,
    }).returning();

    log.info({ keyId: key.id, clientId: input.clientId }, "API key created");

    return {
      id: key.id,
      apiKey: raw,
      prefix,
      message: "Save this key securely — it will not be shown again",
    };
  }),

  revoke: requirePermission("oem:keys:manage").input(z.object({
    keyId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(oemApiKeys)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(oemApiKeys.id, input.keyId))
      .returning();
    log.info({ keyId: input.keyId }, "API key revoked");
    return { success: true, id: updated?.id };
  }),

  rotate: requirePermission("oem:keys:manage").input(z.object({
    keyId: z.number(),
    clientId: z.number(),
    keyName: z.string().min(1).max(100),
    scopes: z.array(z.string()).min(1),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();

    // Revoke old key
    await db.update(oemApiKeys)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(oemApiKeys.id, input.keyId));

    // Create new key
    const { raw, hash, prefix } = generateApiKey();
    const [newKey] = await db.insert(oemApiKeys).values({
      clientId: input.clientId,
      keyName: input.keyName,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: input.scopes,
      createdBy: ctx.user.id,
    }).returning();

    log.info({ oldKeyId: input.keyId, newKeyId: newKey.id }, "API key rotated");

    return {
      id: newKey.id,
      apiKey: raw,
      prefix,
      message: "Old key revoked. Save this new key securely.",
    };
  }),

  updateScopes: requirePermission("oem:keys:manage").input(z.object({
    keyId: z.number(),
    scopes: z.array(z.string()).min(1),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(oemApiKeys)
      .set({ scopes: input.scopes, updatedAt: new Date() })
      .where(eq(oemApiKeys.id, input.keyId))
      .returning();
    return { success: true, scopes: updated?.scopes };
  }),

  updateRateLimit: requirePermission("oem:keys:manage").input(z.object({
    keyId: z.number(),
    rateLimitPerHour: z.number().min(10).max(100000),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(oemApiKeys)
      .set({ rateLimitPerHour: input.rateLimitPerHour, updatedAt: new Date() })
      .where(eq(oemApiKeys.id, input.keyId))
      .returning();
    return { success: true, rateLimitPerHour: updated?.rateLimitPerHour };
  }),
});

// ── Webhooks Router ────────────────────────────────────────

const webhooksRouter = router({
  list: requirePermission("oem:webhooks:view").input(z.object({
    clientId: z.number(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select({
      id: oemWebhooks.id,
      endpointUrl: oemWebhooks.endpointUrl,
      events: oemWebhooks.events,
      secretPrefix: oemWebhooks.secretPrefix,
      status: oemWebhooks.status,
      failureCount: oemWebhooks.failureCount,
      lastTriggeredAt: oemWebhooks.lastTriggeredAt,
      createdAt: oemWebhooks.createdAt,
    }).from(oemWebhooks)
      .where(eq(oemWebhooks.clientId, input.clientId))
      .orderBy(desc(oemWebhooks.createdAt))
      .limit(50);
  }),

  create: requirePermission("oem:webhooks:manage").input(z.object({
    clientId: z.number(),
    endpointUrl: z.string().url(),
    events: z.array(z.string()).min(1),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const { raw, hash, prefix } = generateSecret();

    const [webhook] = await db.insert(oemWebhooks).values({
      clientId: input.clientId,
      endpointUrl: input.endpointUrl,
      events: input.events,
      secretHash: hash,
      secretPrefix: prefix,
      createdBy: ctx.user.id,
    }).returning();

    log.info({ webhookId: webhook.id, clientId: input.clientId }, "Webhook created");

    return {
      id: webhook.id,
      signingSecret: raw,
      prefix,
      message: "Save this signing secret securely — it will not be shown again",
    };
  }),

  update: requirePermission("oem:webhooks:manage").input(z.object({
    webhookId: z.number(),
    endpointUrl: z.string().url().optional(),
    events: z.array(z.string()).min(1).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.endpointUrl) updates.endpointUrl = input.endpointUrl;
    if (input.events) updates.events = input.events;

    const [updated] = await db.update(oemWebhooks)
      .set(updates)
      .where(eq(oemWebhooks.id, input.webhookId))
      .returning();
    return { success: true, id: updated?.id };
  }),

  delete: requirePermission("oem:webhooks:manage").input(z.object({
    webhookId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(oemWebhooks)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(eq(oemWebhooks.id, input.webhookId))
      .returning();
    log.info({ webhookId: input.webhookId }, "Webhook disabled");
    return { success: true, id: updated?.id };
  }),

  test: requirePermission("oem:webhooks:manage").input(z.object({
    webhookId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [webhook] = await db.select().from(oemWebhooks)
      .where(eq(oemWebhooks.id, input.webhookId)).limit(1);

    if (!webhook) return { success: false, error: "Webhook not found" };

    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      data: { message: "GRT OEM Gateway test event" },
    };

    const signature = createHmac("sha256", webhook.secretHash)
      .update(JSON.stringify(testPayload)).digest("hex");

    try {
      const response = await fetch(webhook.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GRT-Signature": `sha256=${signature}`,
          "X-GRT-Event": "test.ping",
          "X-GRT-Timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });
      return { success: response.ok, statusCode: response.status };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Request failed" };
    }
  }),

  resetFailures: requirePermission("oem:webhooks:manage").input(z.object({
    webhookId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [updated] = await db.update(oemWebhooks)
      .set({ failureCount: 0, status: "active", updatedAt: new Date() })
      .where(eq(oemWebhooks.id, input.webhookId))
      .returning();
    return { success: true, id: updated?.id };
  }),
});

// ── Data Router (External API — OEM API Key Auth) ──────────

const dataRouter = router({
  getBatchCleanlinessReport: requireOemScope("read:cleanliness").input(z.object({
    batchId: z.string().min(1),
  })).query(async ({ input, ctx }) => {
    const startTime = Date.now();
    const oemClient = (ctx as any).oemClient as OemClientContext;
    const db = await requireDb();

    // Multi-tenant isolation: filter by client_id
    const { cleaningMachineProjects } = await import("../../drizzle/cleaning-machine-schema");
    const { projects } = await import("../../drizzle/schema");

    const results = await db.select({
      projectId: projects.id,
      projectName: projects.name,
      cleaningMethod: cleaningMachineProjects.cleaningMethod,
      workpieceMaterial: cleaningMachineProjects.workpieceMaterial,
      cleanlinessStandard: cleaningMachineProjects.cleanlinessStandard,
      cleanlinessValue: cleaningMachineProjects.cleanlinessValue,
      automationLevel: cleaningMachineProjects.automationLevel,
      currentMPhase: cleaningMachineProjects.currentMPhase,
    }).from(projects)
      .innerJoin(cleaningMachineProjects, eq(cleaningMachineProjects.projectId, projects.id))
      .where(and(
        eq(projects.customerId, oemClient.clientId),
        eq(projects.projectCode, input.batchId),
      ))
      .limit(10);

    // Log API call (fire-and-forget)
    db.insert(oemApiCallLogs).values({
      apiKeyId: oemClient.keyId,
      clientId: oemClient.clientId,
      endpoint: "getBatchCleanlinessReport",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: ctx.req.ip || ctx.req.socket?.remoteAddress || null,
    }).catch(() => {});

    return { batchId: input.batchId, results, timestamp: new Date().toISOString() };
  }),

  getMachineOee: requireOemScope("read:oee").input(z.object({
    machineId: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  })).query(async ({ input, ctx }) => {
    const startTime = Date.now();
    const oemClient = (ctx as any).oemClient as OemClientContext;
    const db = await requireDb();

    const { oeeSnapshots } = await import("../../drizzle/oee-schema");

    const snapshots = await db.select().from(oeeSnapshots)
      .where(and(
        eq(oeeSnapshots.machineId, input.machineId),
        gte(oeeSnapshots.snapshotDate, input.startDate),
        lte(oeeSnapshots.snapshotDate, input.endDate),
      ))
      .orderBy(desc(oeeSnapshots.snapshotDate))
      .limit(365);

    db.insert(oemApiCallLogs).values({
      apiKeyId: oemClient.keyId,
      clientId: oemClient.clientId,
      endpoint: "getMachineOee",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: ctx.req.ip || ctx.req.socket?.remoteAddress || null,
    }).catch(() => {});

    return { machineId: input.machineId, snapshots, timestamp: new Date().toISOString() };
  }),

  getEquipmentStatus: requireOemScope("read:equipment").input(z.object({
    machineId: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    const startTime = Date.now();
    const oemClient = (ctx as any).oemClient as OemClientContext;
    const db = await requireDb();

    const { productionEquipments } = await import("../../drizzle/production-equipment-schema");

    let query = db.select().from(productionEquipments)
      .where(eq((productionEquipments as any).customerId, oemClient.clientId))
      .limit(200);

    const equipment = await query;

    db.insert(oemApiCallLogs).values({
      apiKeyId: oemClient.keyId,
      clientId: oemClient.clientId,
      endpoint: "getEquipmentStatus",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: ctx.req.ip || ctx.req.socket?.remoteAddress || null,
    }).catch(() => {});

    return { equipment, timestamp: new Date().toISOString() };
  }),

  getProjectMilestones: requireOemScope("read:project").input(z.object({
    projectId: z.number(),
  })).query(async ({ input, ctx }) => {
    const startTime = Date.now();
    const oemClient = (ctx as any).oemClient as OemClientContext;
    const db = await requireDb();

    const { projects } = await import("../../drizzle/schema");
    const { projectTMilestones } = await import("../../drizzle/cleaning-machine-schema");

    // Verify project belongs to client
    const [project] = await db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.customerId, oemClient.clientId)))
      .limit(1);

    if (!project) {
      return { error: "Project not found or access denied", milestones: [] };
    }

    const milestones = await db.select().from(projectTMilestones)
      .where(eq(projectTMilestones.projectId, input.projectId))
      .orderBy(projectTMilestones.milestoneCode)
      .limit(20);

    db.insert(oemApiCallLogs).values({
      apiKeyId: oemClient.keyId,
      clientId: oemClient.clientId,
      endpoint: "getProjectMilestones",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      ipAddress: ctx.req.ip || ctx.req.socket?.remoteAddress || null,
    }).catch(() => {});

    return { project, milestones, timestamp: new Date().toISOString() };
  }),
});

// ── Analytics Router ───────────────────────────────────────

const analyticsRouter = router({
  getCallVolume: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const logs = await db.select({
      date: sql<string>`DATE(${oemApiCallLogs.createdAt})`.as("date"),
      total: count().as("total"),
      success: sql<number>`COUNT(CASE WHEN ${oemApiCallLogs.statusCode} < 400 THEN 1 END)`.as("success"),
      errors: sql<number>`COUNT(CASE WHEN ${oemApiCallLogs.statusCode} >= 400 THEN 1 END)`.as("errors"),
    }).from(oemApiCallLogs)
      .where(and(
        eq(oemApiCallLogs.clientId, input.clientId),
        gte(oemApiCallLogs.createdAt, new Date(input.startDate)),
        lte(oemApiCallLogs.createdAt, new Date(input.endDate)),
      ))
      .groupBy(sql`DATE(${oemApiCallLogs.createdAt})`)
      .orderBy(sql`DATE(${oemApiCallLogs.createdAt})`)
      .limit(365);
    return logs;
  }),

  getCallsByEndpoint: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select({
      endpoint: oemApiCallLogs.endpoint,
      total: count().as("total"),
      avgLatency: sql<number>`AVG(${oemApiCallLogs.responseTimeMs})`.as("avg_latency"),
      errorRate: sql<number>`(COUNT(CASE WHEN ${oemApiCallLogs.statusCode} >= 400 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)`.as("error_rate"),
    }).from(oemApiCallLogs)
      .where(and(
        eq(oemApiCallLogs.clientId, input.clientId),
        gte(oemApiCallLogs.createdAt, new Date(input.startDate)),
        lte(oemApiCallLogs.createdAt, new Date(input.endDate)),
      ))
      .groupBy(oemApiCallLogs.endpoint)
      .limit(50);
  }),

  getErrorRate: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    days: z.number().min(1).max(90).default(30),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const since = new Date();
    since.setDate(since.getDate() - input.days);

    const [result] = await db.select({
      total: count().as("total"),
      errors: sql<number>`COUNT(CASE WHEN ${oemApiCallLogs.statusCode} >= 400 THEN 1 END)`.as("errors"),
    }).from(oemApiCallLogs)
      .where(and(
        eq(oemApiCallLogs.clientId, input.clientId),
        gte(oemApiCallLogs.createdAt, since),
      ));

    const total = Number(result?.total || 0);
    const errors = Number(result?.errors || 0);
    return { total, errors, errorRate: total > 0 ? ((errors / total) * 100).toFixed(2) : "0.00" };
  }),

  getAvgLatency: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    days: z.number().min(1).max(90).default(30),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const since = new Date();
    since.setDate(since.getDate() - input.days);

    const [result] = await db.select({
      avgMs: sql<number>`AVG(${oemApiCallLogs.responseTimeMs})`.as("avg_ms"),
      p95Ms: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${oemApiCallLogs.responseTimeMs})`.as("p95_ms"),
    }).from(oemApiCallLogs)
      .where(and(
        eq(oemApiCallLogs.clientId, input.clientId),
        gte(oemApiCallLogs.createdAt, since),
      ));

    return {
      avgMs: Math.round(Number(result?.avgMs || 0)),
      p95Ms: Math.round(Number(result?.p95Ms || 0)),
    };
  }),

  getWebhookDeliveryStats: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    days: z.number().min(1).max(90).default(30),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const since = new Date();
    since.setDate(since.getDate() - input.days);

    const [result] = await db.select({
      total: count().as("total"),
      delivered: sql<number>`COUNT(CASE WHEN ${oemWebhookDeliveries.status} = 'delivered' THEN 1 END)`.as("delivered"),
      failed: sql<number>`COUNT(CASE WHEN ${oemWebhookDeliveries.status} = 'failed' THEN 1 END)`.as("failed"),
      pending: sql<number>`COUNT(CASE WHEN ${oemWebhookDeliveries.status} IN ('pending', 'retrying') THEN 1 END)`.as("pending"),
    }).from(oemWebhookDeliveries)
      .where(and(
        eq(oemWebhookDeliveries.clientId, input.clientId),
        gte(oemWebhookDeliveries.createdAt, since),
      ));

    return result;
  }),

  getWebhookDeliveries: requirePermission("oem:analytics:view").input(z.object({
    clientId: z.number(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(10).max(100).default(20),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const offset = (input.page - 1) * input.pageSize;

    const deliveries = await db.select({
      id: oemWebhookDeliveries.id,
      eventType: oemWebhookDeliveries.eventType,
      status: oemWebhookDeliveries.status,
      attemptCount: oemWebhookDeliveries.attemptCount,
      statusCode: oemWebhookDeliveries.statusCode,
      deliveredAt: oemWebhookDeliveries.deliveredAt,
      createdAt: oemWebhookDeliveries.createdAt,
    }).from(oemWebhookDeliveries)
      .where(eq(oemWebhookDeliveries.clientId, input.clientId))
      .orderBy(desc(oemWebhookDeliveries.createdAt))
      .limit(input.pageSize)
      .offset(offset);

    return { deliveries, page: input.page, pageSize: input.pageSize };
  }),

  retryDelivery: requirePermission("oem:webhooks:manage").input(z.object({
    deliveryId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    const [delivery] = await db.select().from(oemWebhookDeliveries)
      .where(eq(oemWebhookDeliveries.id, input.deliveryId)).limit(1);

    if (!delivery) return { success: false, error: "Delivery not found" };

    // Reset and re-queue
    await db.update(oemWebhookDeliveries)
      .set({ status: "retrying", attemptCount: delivery.attemptCount, nextRetryAt: new Date() })
      .where(eq(oemWebhookDeliveries.id, input.deliveryId));

    const { taskId } = await submitTask("OEM_WEBHOOK_DELIVERY", {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      payload: delivery.payload,
      attempt: delivery.attemptCount,
    }, "system");

    return { success: true, taskId };
  }),

  getTopClients: requirePermission("oem:analytics:view").input(z.object({
    days: z.number().min(1).max(90).default(30),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const since = new Date();
    since.setDate(since.getDate() - input.days);

    return db.select({
      clientId: oemApiCallLogs.clientId,
      total: count().as("total"),
      avgLatency: sql<number>`AVG(${oemApiCallLogs.responseTimeMs})`.as("avg_latency"),
    }).from(oemApiCallLogs)
      .where(gte(oemApiCallLogs.createdAt, since))
      .groupBy(oemApiCallLogs.clientId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);
  }),
});

// ── Main Router ────────────────────────────────────────────

export const oemDeveloperPortalRouter = router({
  keys: keysRouter,
  webhooks: webhooksRouter,
  data: dataRouter,
  analytics: analyticsRouter,
});

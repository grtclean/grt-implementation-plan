/**
 * OEM Developer Portal Router — Unit Tests
 *
 * 4 sub-routers (~24 procedures):
 *   keys (6), webhooks (6), data (4), analytics (8)
 *
 * Run: pnpm test -- server/routers/oem-developer-portal.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "and", "orderBy", "groupBy", "limit", "offset",
    "values", "set", "innerJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() =>
    Promise.resolve(returningQueue.length > 0 ? returningQueue.shift()! : mockReturningResult)
  );
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };
  chain.catch = vi.fn(() => chain);
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock tRPC (passthrough — procedures become plain functions) ──
vi.mock("../_core/trpc", () => {
  const passthrough: any = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: passthrough,
    publicProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
    oemApiProcedure: passthrough,
    requireOemScope: vi.fn(() => passthrough),
    OemClientContext: {},
  };
});

// ── Mock schemas ────────────────────────────────────────
vi.mock("../../drizzle/oem-portal-schema", () => ({
  oemApiKeys: { id: "id", clientId: "clientId", keyHash: "keyHash", keyPrefix: "keyPrefix", keyName: "keyName", scopes: "scopes", status: "status", rateLimitPerHour: "rateLimitPerHour", expiresAt: "expiresAt", lastUsedAt: "lastUsedAt", createdAt: "createdAt", revokedAt: "revokedAt", createdBy: "createdBy", updatedAt: "updatedAt" },
  oemWebhooks: { id: "id", clientId: "clientId", endpointUrl: "endpointUrl", events: "events", secretHash: "secretHash", secretPrefix: "secretPrefix", status: "status", failureCount: "failureCount", lastTriggeredAt: "lastTriggeredAt", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt" },
  oemApiCallLogs: { id: "id", apiKeyId: "apiKeyId", clientId: "clientId", endpoint: "endpoint", method: "method", statusCode: "statusCode", responseTimeMs: "responseTimeMs", ipAddress: "ipAddress", errorMessage: "errorMessage", createdAt: "createdAt" },
  oemWebhookDeliveries: { id: "id", webhookId: "webhookId", clientId: "clientId", eventType: "eventType", payload: "payload", status: "status", attemptCount: "attemptCount", maxAttempts: "maxAttempts", statusCode: "statusCode", responseBody: "responseBody", nextRetryAt: "nextRetryAt", deliveredAt: "deliveredAt", createdAt: "createdAt" },
}));

vi.mock("../../drizzle/cleaning-machine-schema", () => ({
  cleaningMachineProjects: { projectId: "projectId", cleaningMethod: "cleaningMethod", workpieceMaterial: "workpieceMaterial", cleanlinessStandard: "cleanlinessStandard", cleanlinessValue: "cleanlinessValue", automationLevel: "automationLevel", currentMPhase: "currentMPhase" },
  projectTMilestones: { projectId: "projectId", milestoneCode: "milestoneCode" },
}));

vi.mock("../../drizzle/schema", () => ({
  projects: { id: "id", name: "name", customerId: "customerId", projectCode: "projectCode" },
}));

vi.mock("../../drizzle/oee-schema", () => ({
  oeeSnapshots: { machineId: "machineId", snapshotDate: "snapshotDate" },
}));

vi.mock("../../drizzle/production-equipment-schema", () => ({
  productionEquipments: { customerId: "customerId" },
}));

const mockSubmitTask = vi.fn(async () => ({ taskId: 99 }));
vi.mock("../services/task-worker.service", () => ({
  submitTask: (...args: any[]) => mockSubmitTask(...args),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

vi.mock("drizzle-orm", () => {
  const mockCol: any = {
    as: vi.fn(() => mockCol),
    asc: vi.fn(() => mockCol),
    desc: vi.fn(() => mockCol),
  };
  const sqlFn: any = (...args: any[]) => mockCol;
  sqlFn.raw = vi.fn((...a: any[]) => mockCol);
  return {
    eq: vi.fn((...a: any[]) => a),
    and: vi.fn((...a: any[]) => a),
    or: vi.fn((...a: any[]) => a),
    desc: vi.fn((a: any) => a),
    gte: vi.fn((...a: any[]) => a),
    lte: vi.fn((...a: any[]) => a),
    sql: sqlFn,
    count: vi.fn(() => mockCol),
  };
});

// ── Import router ──────────────────────────────────────
import { oemDeveloperPortalRouter } from "./oem-developer-portal.router";

const R = oemDeveloperPortalRouter as any;

const mockAdminCtx = {
  user: { id: 1, name: "Admin", role: "admin" },
  req: { ip: "127.0.0.1", headers: {}, socket: { remoteAddress: "127.0.0.1" } },
  res: {},
};

const mockOemCtx = {
  oemClient: { clientId: 42, scopes: ["read:cleanliness", "read:oee", "read:equipment", "read:project"], keyId: 1, rateLimitPerHour: 1000 },
  req: { ip: "10.0.0.1", headers: { "x-api-key": "grt_test" }, socket: { remoteAddress: "10.0.0.1" } },
  res: {},
};

// ── Tests ────────────────────────────────────────────────

describe("oem-developer-portal.router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = [];
    mockReturningResult = [{ id: 1 }];
    selectResultsQueue.length = 0;
    returningQueue.length = 0;
  });

  // ══════════════════════════════════════════════════════
  // Keys
  // ══════════════════════════════════════════════════════

  describe("keys", () => {
    it("list — returns keys for client", async () => {
      selectResultsQueue.push([{ id: 1, keyName: "Prod Key", keyPrefix: "grt_abc1", scopes: ["read:oee"], status: "active" }]);
      const result = await R.keys.list({ input: { clientId: 42 }, ctx: mockAdminCtx });
      expect(result).toHaveLength(1);
      expect(result[0].keyName).toBe("Prod Key");
    });

    it("create — generates API key and returns raw value once", async () => {
      returningQueue.push([{ id: 10, keyPrefix: "grt_abcd" }]);
      const result = await R.keys.create({
        input: { clientId: 42, keyName: "Test Key", scopes: ["read:cleanliness"] },
        ctx: mockAdminCtx,
      });
      expect(result.apiKey).toMatch(/^grt_/);
      expect(result.id).toBe(10);
      expect(result.message).toContain("Save this key");
    });

    it("revoke — sets status to revoked", async () => {
      returningQueue.push([{ id: 5, status: "revoked" }]);
      const result = await R.keys.revoke({ input: { keyId: 5 }, ctx: mockAdminCtx });
      expect(result.success).toBe(true);
    });

    it("rotate — revokes old and creates new", async () => {
      // update (revoke) resolves via .then() using default empty result
      // insert (create new) uses returningQueue
      returningQueue.push([{ id: 11, keyPrefix: "grt_new1" }]);
      const result = await R.keys.rotate({
        input: { keyId: 5, clientId: 42, keyName: "Rotated Key", scopes: ["read:oee"] },
        ctx: mockAdminCtx,
      });
      expect(result.apiKey).toMatch(/^grt_/);
      expect(result.message).toContain("Old key revoked");
    });

    it("updateScopes — modifies scopes array", async () => {
      returningQueue.push([{ id: 1, scopes: ["read:oee", "read:cleanliness"] }]);
      const result = await R.keys.updateScopes({
        input: { keyId: 1, scopes: ["read:oee", "read:cleanliness"] },
        ctx: mockAdminCtx,
      });
      expect(result.success).toBe(true);
    });

    it("updateRateLimit — modifies rate limit", async () => {
      returningQueue.push([{ id: 1, rateLimitPerHour: 5000 }]);
      const result = await R.keys.updateRateLimit({
        input: { keyId: 1, rateLimitPerHour: 5000 },
        ctx: mockAdminCtx,
      });
      expect(result.rateLimitPerHour).toBe(5000);
    });
  });

  // ══════════════════════════════════════════════════════
  // Webhooks
  // ══════════════════════════════════════════════════════

  describe("webhooks", () => {
    it("list — returns webhooks for client", async () => {
      selectResultsQueue.push([{ id: 1, endpointUrl: "https://vw-mes.example.com/hook", events: ["batch.cleaned"], status: "active" }]);
      const result = await R.webhooks.list({ input: { clientId: 42 }, ctx: mockAdminCtx });
      expect(result).toHaveLength(1);
    });

    it("create — generates signing secret", async () => {
      returningQueue.push([{ id: 20 }]);
      const result = await R.webhooks.create({
        input: { clientId: 42, endpointUrl: "https://test.example.com/webhook", events: ["batch.cleaned", "machine.fault"] },
        ctx: mockAdminCtx,
      });
      expect(result.signingSecret).toMatch(/^whsec_/);
      expect(result.message).toContain("Save this signing secret");
    });

    it("update — modifies endpoint URL", async () => {
      returningQueue.push([{ id: 20 }]);
      const result = await R.webhooks.update({
        input: { webhookId: 20, endpointUrl: "https://new.example.com/hook" },
        ctx: mockAdminCtx,
      });
      expect(result.success).toBe(true);
    });

    it("delete — soft-disables webhook", async () => {
      returningQueue.push([{ id: 20 }]);
      const result = await R.webhooks.delete({ input: { webhookId: 20 }, ctx: mockAdminCtx });
      expect(result.success).toBe(true);
    });

    it("test — sends request to webhook endpoint", async () => {
      selectResultsQueue.push([{ id: 20, endpointUrl: "https://httpbin.org/post", secretHash: "abc123", status: "active" }]);
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as any;
      try {
        const result = await R.webhooks.test({ input: { webhookId: 20 }, ctx: mockAdminCtx });
        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("resetFailures — resets failure count", async () => {
      returningQueue.push([{ id: 20, failureCount: 0, status: "active" }]);
      const result = await R.webhooks.resetFailures({ input: { webhookId: 20 }, ctx: mockAdminCtx });
      expect(result.success).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════
  // Data (OEM API Key Auth)
  // ══════════════════════════════════════════════════════

  describe("data", () => {
    it("getBatchCleanlinessReport — returns filtered results", async () => {
      selectResultsQueue.push([{
        projectId: 100, projectName: "VW Cleaning Line #3",
        cleaningMethod: "ultrasonic", cleanlinessStandard: "VDA19",
      }]);
      const result = await R.data.getBatchCleanlinessReport({
        input: { batchId: "PRJ-2026-001" }, ctx: mockOemCtx,
      });
      expect(result.batchId).toBe("PRJ-2026-001");
      expect(result.results).toHaveLength(1);
      expect(result.timestamp).toBeDefined();
    });

    it("getMachineOee — returns OEE snapshots", async () => {
      selectResultsQueue.push([
        { machineId: 5, snapshotDate: "2026-03-01", availability: "0.92", performance: "0.88", quality: "0.97" },
        { machineId: 5, snapshotDate: "2026-03-02", availability: "0.95", performance: "0.90", quality: "0.98" },
      ]);
      const result = await R.data.getMachineOee({
        input: { machineId: 5, startDate: "2026-03-01", endDate: "2026-03-10" }, ctx: mockOemCtx,
      });
      expect(result.snapshots).toHaveLength(2);
    });

    it("getEquipmentStatus — returns equipment list", async () => {
      selectResultsQueue.push([{ id: 1, name: "CNC-001", customerId: 42 }]);
      const result = await R.data.getEquipmentStatus({ input: {}, ctx: mockOemCtx });
      expect(result.equipment).toHaveLength(1);
    });

    it("getProjectMilestones — verifies client ownership", async () => {
      selectResultsQueue.push([{ id: 100, name: "VW Line 3" }]); // project ownership check
      selectResultsQueue.push([{ milestoneCode: "T1", status: "completed" }, { milestoneCode: "T2", status: "in_progress" }]);
      const result = await R.data.getProjectMilestones({ input: { projectId: 100 }, ctx: mockOemCtx });
      expect(result.milestones).toHaveLength(2);
    });

    it("getProjectMilestones — returns empty when project not found", async () => {
      selectResultsQueue.push([]); // no project found
      const result = await R.data.getProjectMilestones({ input: { projectId: 999 }, ctx: mockOemCtx });
      expect(result.milestones).toHaveLength(0);
      expect(result.error).toContain("access denied");
    });
  });

  // ══════════════════════════════════════════════════════
  // Analytics
  // ══════════════════════════════════════════════════════

  describe("analytics", () => {
    it("getCallVolume — returns daily aggregation", async () => {
      selectResultsQueue.push([
        { date: "2026-03-01", total: 150, success: 145, errors: 5 },
        { date: "2026-03-02", total: 200, success: 198, errors: 2 },
      ]);
      const result = await R.analytics.getCallVolume({
        input: { clientId: 42, startDate: "2026-03-01", endDate: "2026-03-10" },
        ctx: mockAdminCtx,
      });
      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(150);
    });

    it("getCallsByEndpoint — groups by endpoint", async () => {
      selectResultsQueue.push([
        { endpoint: "getBatchCleanlinessReport", total: 80, avgLatency: 120, errorRate: 2.5 },
        { endpoint: "getMachineOee", total: 50, avgLatency: 85, errorRate: 0 },
      ]);
      const result = await R.analytics.getCallsByEndpoint({
        input: { clientId: 42, startDate: "2026-03-01", endDate: "2026-03-10" },
        ctx: mockAdminCtx,
      });
      expect(result).toHaveLength(2);
    });

    it("getErrorRate — computes percentage", async () => {
      selectResultsQueue.push([{ total: 1000, errors: 15 }]);
      const result = await R.analytics.getErrorRate({
        input: { clientId: 42, days: 30 }, ctx: mockAdminCtx,
      });
      expect(result.errorRate).toBe("1.50");
    });

    it("getAvgLatency — returns avg and p95", async () => {
      selectResultsQueue.push([{ avgMs: 95.3, p95Ms: 240.7 }]);
      const result = await R.analytics.getAvgLatency({
        input: { clientId: 42, days: 30 }, ctx: mockAdminCtx,
      });
      expect(result.avgMs).toBe(95);
      expect(result.p95Ms).toBe(241);
    });

    it("getWebhookDeliveryStats — counts by status", async () => {
      selectResultsQueue.push([{ total: 500, delivered: 480, failed: 15, pending: 5 }]);
      const result = await R.analytics.getWebhookDeliveryStats({
        input: { clientId: 42, days: 30 }, ctx: mockAdminCtx,
      });
      expect(result?.total).toBe(500);
    });

    it("getWebhookDeliveries — returns paginated list", async () => {
      selectResultsQueue.push([
        { id: 1, eventType: "batch.cleaned", status: "delivered", attemptCount: 1 },
        { id: 2, eventType: "machine.fault", status: "failed", attemptCount: 5 },
      ]);
      const result = await R.analytics.getWebhookDeliveries({
        input: { clientId: 42, page: 1, pageSize: 20 }, ctx: mockAdminCtx,
      });
      expect(result.deliveries).toHaveLength(2);
      expect(result.page).toBe(1);
    });

    it("retryDelivery — re-queues a failed delivery", async () => {
      selectResultsQueue.push([{ id: 50, webhookId: 20, payload: { event: "batch.cleaned" }, attemptCount: 3 }]);
      const result = await R.analytics.retryDelivery({
        input: { deliveryId: 50 }, ctx: mockAdminCtx,
      });
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(99);
      expect(mockSubmitTask).toHaveBeenCalledWith(
        "OEM_WEBHOOK_DELIVERY",
        expect.objectContaining({ deliveryId: 50 }),
        "system",
      );
    });

    it("getTopClients — returns usage ranking", async () => {
      selectResultsQueue.push([
        { clientId: 42, total: 1500, avgLatency: 95 },
        { clientId: 88, total: 800, avgLatency: 120 },
      ]);
      const result = await R.analytics.getTopClients({
        input: { days: 30 }, ctx: mockAdminCtx,
      });
      expect(result).toHaveLength(2);
      expect(result[0].clientId).toBe(42);
    });
  });
});

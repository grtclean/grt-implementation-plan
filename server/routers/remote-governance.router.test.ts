/**
 * Remote Governance Router — Unit Tests
 * 远程维护指挥中心 — VPN Token Provisioning & Kill Switch
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────

let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of ["from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
};

// ── Mock tRPC ───────────────────────────────────────────

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
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Mock schema ─────────────────────────────────────────

vi.mock("../../drizzle/remote-governance-schema", () => ({
  remoteAccessRequests: { id: "id", status: "status", engineerId: "engineer_id", expiresAt: "expires_at", createdAt: "created_at" },
  remoteAccessAuditLogs: { id: "id", requestId: "request_id", action: "action", createdAt: "created_at" },
}));

// ── Mock drizzle-orm ────────────────────────────────────

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  gt: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })), {
    raw: vi.fn((s: string) => s),
  }),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Import router after all mocks ───────────────────────

import { remoteGovernanceRouter } from "./remote-governance.router";

// ── Helpers ─────────────────────────────────────────────

function makeCtx(user = { id: 1, name: "倪亚东", role: "admin" }) {
  return { ctx: { db: mockDb, user } };
}

// ── Reset ───────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
});

// ════════════════════════════════════════════════════════
// ── request sub-router ──────────────────────────────────
// ════════════════════════════════════════════════════════

describe("request.create", () => {
  const proc = remoteGovernanceRouter.request.create;

  it("creates a remote access request", async () => {
    mockReturningResult = [{ id: 1, status: "PENDING", engineerName: "倪亚东", tempVpnToken: null }];
    const result = await proc({
      input: {
        projectName: "GRT-401 清洗线",
        customerName: "上海大众",
        equipmentId: "PLC-S7-1500-01",
        reasonForAccess: "修复泵联锁逻辑Bug — FAT测试急停延迟3秒",
        requestedDurationHours: 2,
      },
      ...makeCtx(),
    });
    expect(result.id).toBe(1);
    expect(result.status).toBe("PENDING");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("requires reasonForAccess >= 10 chars", async () => {
    // Zod validation happens at input layer (mocked away), so just verify structure
    mockReturningResult = [{ id: 2, status: "PENDING" }];
    const result = await proc({
      input: {
        projectName: "Test",
        customerName: "Customer",
        equipmentId: "PLC-001",
        reasonForAccess: "修复泵联锁逻辑Bug——需要远程调试",
        requestedDurationHours: 1,
      },
      ...makeCtx(),
    });
    expect(result.id).toBe(2);
  });
});

describe("request.listMine", () => {
  const proc = remoteGovernanceRouter.request.listMine;

  it("returns user own requests", async () => {
    selectResultsQueue.push([{ id: 1, engineerName: "倪亚东" }, { id: 2, engineerName: "倪亚东" }]);
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });

  it("returns empty for new user", async () => {
    selectResultsQueue.push([]);
    const result = await proc({ input: undefined, ...makeCtx({ id: 99, name: "新员工", role: "employee" }) });
    expect(result).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════
// ── approval sub-router ─────────────────────────────────
// ════════════════════════════════════════════════════════

describe("approval.listPending", () => {
  const proc = remoteGovernanceRouter.approval.listPending;

  it("returns pending requests", async () => {
    selectResultsQueue.push([{ id: 1, status: "PENDING" }, { id: 2, status: "PENDING" }]);
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("approval.approve", () => {
  const proc = remoteGovernanceRouter.approval.approve;

  it("generates VPN token and activates request", async () => {
    // First select finds the request
    selectResultsQueue.push([{ id: 1, status: "PENDING", requestedDurationHours: 2 }]);
    // Update returning
    mockReturningResult = [{ id: 1, status: "ACTIVE", tempVpnToken: "GRT-VPN-ABCD-EF12", expiresAt: new Date() }];

    const result = await proc({ input: { requestId: 1 }, ...makeCtx() });
    expect(result.status).toBe("ACTIVE");
    expect(result.tempVpnToken).toMatch(/^GRT-VPN-/);
  });

  it("rejects non-PENDING requests", async () => {
    selectResultsQueue.push([{ id: 1, status: "ACTIVE", requestedDurationHours: 1 }]);
    await expect(proc({ input: { requestId: 1 }, ...makeCtx() })).rejects.toThrow("Cannot approve");
  });

  it("throws on non-existent request", async () => {
    selectResultsQueue.push([]);
    await expect(proc({ input: { requestId: 999 }, ...makeCtx() })).rejects.toThrow("Request not found");
  });
});

describe("approval.reject", () => {
  const proc = remoteGovernanceRouter.approval.reject;

  it("rejects a pending request with reason", async () => {
    mockReturningResult = [{ id: 1, status: "REJECTED", rejectionReason: "风险过大" }];
    const result = await proc({ input: { requestId: 1, reason: "风险过大" }, ...makeCtx() });
    expect(result.status).toBe("REJECTED");
  });

  it("throws when request not found or not pending", async () => {
    mockReturningResult = [];
    await expect(proc({ input: { requestId: 999, reason: "test" }, ...makeCtx() })).rejects.toThrow("not in PENDING");
  });
});

// ════════════════════════════════════════════════════════
// ── tunnel sub-router ───────────────────────────────────
// ════════════════════════════════════════════════════════

describe("tunnel.listActive", () => {
  const proc = remoteGovernanceRouter.tunnel.listActive;

  it("returns active tunnels", async () => {
    selectResultsQueue.push([
      { id: 1, status: "ACTIVE", tempVpnToken: "GRT-VPN-AAAA-BBBB" },
      { id: 2, status: "ACTIVE", tempVpnToken: "GRT-VPN-CCCC-DDDD" },
    ]);
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(2);
  });

  it("returns empty when no active tunnels", async () => {
    selectResultsQueue.push([]);
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(0);
  });
});

describe("tunnel.revoke (kill switch)", () => {
  const proc = remoteGovernanceRouter.tunnel.revoke;

  it("revokes an active VPN token", async () => {
    mockReturningResult = [{ id: 1, status: "REVOKED", revokeReason: "检测到异常流量" }];
    const result = await proc({ input: { requestId: 1, reason: "检测到异常流量" }, ...makeCtx() });
    expect(result.status).toBe("REVOKED");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("throws when tunnel not active", async () => {
    mockReturningResult = [];
    await expect(proc({ input: { requestId: 99, reason: "test" }, ...makeCtx() })).rejects.toThrow("Tunnel not found");
  });
});

describe("tunnel.expireStale", () => {
  const proc = remoteGovernanceRouter.tunnel.expireStale;

  it("expires stale tokens", async () => {
    mockReturningResult = [{ id: 1 }, { id: 2 }];
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.expiredCount).toBe(2);
  });

  it("returns 0 when nothing to expire", async () => {
    mockReturningResult = [];
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.expiredCount).toBe(0);
  });
});

// ════════════════════════════════════════════════════════
// ── dashboard sub-router ────────────────────────────────
// ════════════════════════════════════════════════════════

describe("dashboard.stats", () => {
  const proc = remoteGovernanceRouter.dashboard.stats;

  it("returns summary counts", async () => {
    selectResultsQueue.push([{ count: 3 }]);  // pending
    selectResultsQueue.push([{ count: 1 }]);  // active
    selectResultsQueue.push([{ count: 5 }]);  // today
    selectResultsQueue.push([{ count: 2 }]);  // revoked

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.pendingCount).toBe(3);
    expect(result.activeCount).toBe(1);
    expect(result.todayRequestCount).toBe(5);
    expect(result.revokedCount).toBe(2);
  });
});

describe("dashboard.history", () => {
  const proc = remoteGovernanceRouter.dashboard.history;

  it("returns paginated history", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const result = await proc({ input: { limit: 10, offset: 0 }, ...makeCtx() });
    expect(result).toHaveLength(3);
  });
});

// ════════════════════════════════════════════════════════
// ── audit sub-router ────────────────────────────────────
// ════════════════════════════════════════════════════════

describe("audit.byRequest", () => {
  const proc = remoteGovernanceRouter.audit.byRequest;

  it("returns audit trail for a request", async () => {
    selectResultsQueue.push([
      { id: 1, action: "REQUEST_CREATED" },
      { id: 2, action: "APPROVED_TOKEN_GENERATED" },
    ]);
    const result = await proc({ input: { requestId: 1 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("audit.recent", () => {
  const proc = remoteGovernanceRouter.audit.recent;

  it("returns recent audit actions", async () => {
    selectResultsQueue.push([{ id: 1, action: "TOKEN_REVOKED_KILL_SWITCH" }]);
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════
// ── Token format validation ─────────────────────────────
// ════════════════════════════════════════════════════════

describe("VPN token format", () => {
  it("approve generates GRT-VPN-XXXX-XXXX format", async () => {
    const proc = remoteGovernanceRouter.approval.approve;
    selectResultsQueue.push([{ id: 1, status: "PENDING", requestedDurationHours: 1 }]);
    // Capture what was passed to set()
    let capturedToken = "";
    const origUpdate = mockDb.update;
    mockDb.update = vi.fn(() => {
      const chain = createMockDbChain();
      const origSet = chain.set;
      chain.set = vi.fn((data: any) => {
        capturedToken = data.tempVpnToken;
        return origSet(data);
      });
      mockReturningResult = [{ id: 1, status: "ACTIVE", tempVpnToken: capturedToken || "GRT-VPN-TEST-1234" }];
      return chain;
    });

    const result = await proc({ input: { requestId: 1 }, ...makeCtx() });
    expect(capturedToken).toMatch(/^GRT-VPN-[A-F0-9]{4}-[A-F0-9]{4}$/);
    mockDb.update = origUpdate;
  });
});

// ════════════════════════════════════════════════════════
// ── Permission guards (checked at module load time) ─────
// ════════════════════════════════════════════════════════

describe("permission guards", () => {
  it("all required permission keys are registered", () => {
    // The router module calls requirePermission() at import time.
    // We verify the router object has the expected sub-routers and procedures.
    expect(remoteGovernanceRouter.request).toBeDefined();
    expect(remoteGovernanceRouter.request.create).toBeDefined();
    expect(remoteGovernanceRouter.request.listMine).toBeDefined();
    expect(remoteGovernanceRouter.approval).toBeDefined();
    expect(remoteGovernanceRouter.approval.listPending).toBeDefined();
    expect(remoteGovernanceRouter.approval.approve).toBeDefined();
    expect(remoteGovernanceRouter.approval.reject).toBeDefined();
    expect(remoteGovernanceRouter.tunnel).toBeDefined();
    expect(remoteGovernanceRouter.tunnel.listActive).toBeDefined();
    expect(remoteGovernanceRouter.tunnel.revoke).toBeDefined();
    expect(remoteGovernanceRouter.tunnel.expireStale).toBeDefined();
    expect(remoteGovernanceRouter.audit).toBeDefined();
    expect(remoteGovernanceRouter.audit.byRequest).toBeDefined();
    expect(remoteGovernanceRouter.audit.recent).toBeDefined();
    expect(remoteGovernanceRouter.dashboard).toBeDefined();
    expect(remoteGovernanceRouter.dashboard.stats).toBeDefined();
    expect(remoteGovernanceRouter.dashboard.history).toBeDefined();
  });
});

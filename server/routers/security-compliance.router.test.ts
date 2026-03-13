/**
 * Security & Compliance Router — Unit Tests
 *
 * 11 procedures:
 *   logAuditEvent             — async audit log (mutation)
 *   getAuditLogs              — query audit logs (query)
 *   getAuditStats             — today's audit stats (query)
 *   getTodayHighRiskEvents    — high-risk events list (query)
 *   checkMonthlyCommitment    — check commitment status (query)
 *   signCommitment            — sign monthly commitment (mutation)
 *   getCommitmentStats        — commitment stats (query)
 *   submitReport              — submit whistleblower report (mutation)
 *   getReports                — list reports (query)
 *   updateReportStatus        — update report status (mutation)
 *   getSecureDocument         — watermark issuance (mutation)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];
let mockExecuteResult: { rows: any[] } = { rows: [] };
const executeResultsQueue: { rows: any[] }[] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function getNextExecuteResult() {
  return executeResultsQueue.length > 0
    ? executeResultsQueue.shift()!
    : mockExecuteResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return Promise.resolve(resolve(getNextResult())); }
    catch (e) { if (reject) return Promise.resolve(reject(e)); return Promise.reject(e); }
  };
  chain.catch = vi.fn(() => Promise.resolve());

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(getNextExecuteResult())),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../permission-management/permission.service", () => ({
  permissionService: { checkPermission: vi.fn().mockResolvedValue(true) },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema
vi.mock("../../drizzle/security-compliance-schema", () => ({
  securityAuditLogs: {
    id: "id", userId: "userId", userName: "userName",
    actionType: "actionType", resourceType: "resourceType",
    resourceId: "resourceId", resourceName: "resourceName",
    ipAddress: "ipAddress", userAgent: "userAgent",
    metadata: "metadata", riskLevel: "riskLevel", createdAt: "createdAt",
  },
  whistleblowerReports: {
    id: "id", encryptedContent: "encryptedContent",
    category: "category", isAnonymous: "isAnonymous",
    reporterId: "reporterId", targetName: "targetName",
    status: "status", investigationNotes: "investigationNotes",
    handledBy: "handledBy", handledAt: "handledAt", createdAt: "createdAt",
  },
  complianceCommitments: {
    id: "id", userId: "userId", userName: "userName",
    period: "period", isAgreed: "isAgreed",
    signedAt: "signedAt", signedFromIp: "signedFromIp", createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  users: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => {
  const sqlTag = (...args: any[]) => ({ type: "sql", args });
  sqlTag.raw = vi.fn((s: string) => s);
  sqlTag.join = vi.fn((...args: any[]) => ({ type: "sql.join", args }));
  sqlTag.empty = "";
  return {
    eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
    and: vi.fn((...args: any[]) => ({ type: "and", args })),
    desc: vi.fn((...args: any[]) => ({ type: "desc", args })),
    sql: sqlTag,
    SQL: class SQL {},
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  mockExecuteResult = { rows: [] };
  selectResultsQueue.length = 0;
  executeResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════════

describe("securityCompliance router", () => {
  // ── logAuditEvent ──
  describe("logAuditEvent", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.securityCompliance.logAuditEvent({ actionType: "LOGIN" })
      ).rejects.toThrow();
    });

    it("logs audit event and returns success", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1 }];

      const result = await caller.securityCompliance.logAuditEvent({
        actionType: "DOWNLOAD_CAD",
        resourceType: "document",
        resourceId: "DOC-001",
      });

      expect(result.success).toBe(true);
    });

    it("accepts all valid action types", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1 }];

      const result = await caller.securityCompliance.logAuditEvent({
        actionType: "UNAUTHORIZED_ACCESS",
        metadata: { path: "/admin/secret" },
      });

      expect(result.success).toBe(true);
    });
  });

  // ── getAuditLogs ──
  describe("getAuditLogs", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.getAuditLogs()).rejects.toThrow();
    });

    it("returns audit logs via db.execute (camelCase mapped)", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, action_type: "LOGIN", user_name: "admin", risk_level: "low", created_at: "2026-03-05" },
          { id: 2, action_type: "DOWNLOAD_CAD", user_name: "engineer", risk_level: "medium", created_at: "2026-03-05" },
        ],
      };

      const result = await caller.securityCompliance.getAuditLogs();
      expect(result).toHaveLength(2);
      expect(result[0].actionType).toBe("LOGIN");
      expect(result[0].userName).toBe("admin");
      expect(result[1].riskLevel).toBe("medium");
    });

    it("accepts filters", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [{ id: 1 }] };

      const result = await caller.securityCompliance.getAuditLogs({
        actionType: "DOWNLOAD_CAD",
        riskLevel: "high",
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ── getAuditStats ──
  describe("getAuditStats", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.getAuditStats()).rejects.toThrow();
    });

    it("returns today stats", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [{
          total_events: 42,
          high_risk_count: 3,
          medium_risk_count: 8,
          unique_users: 15,
          unauthorized_count: 1,
          after_hours_count: 2,
          download_count: 12,
        }],
      };

      const result = await caller.securityCompliance.getAuditStats();
      expect(result.totalEvents).toBe(42);
      expect(result.highRiskCount).toBe(3);
      expect(result.downloadCount).toBe(12);
    });
  });

  // ── getTodayHighRiskEvents ──
  describe("getTodayHighRiskEvents", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.getTodayHighRiskEvents()).rejects.toThrow();
    });

    it("returns high-risk events (camelCase mapped)", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, action_type: "UNAUTHORIZED_ACCESS", risk_level: "high", user_name: "test", created_at: "2026-03-05" },
        ],
      };

      const result = await caller.securityCompliance.getTodayHighRiskEvents();
      expect(result).toHaveLength(1);
      expect(result[0].actionType).toBe("UNAUTHORIZED_ACCESS");
      expect(result[0].riskLevel).toBe("high");
    });
  });

  // ── checkMonthlyCommitment ──
  describe("checkMonthlyCommitment", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.checkMonthlyCommitment()).rejects.toThrow();
    });

    it("returns signed=false when no record", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);

      const result = await caller.securityCompliance.checkMonthlyCommitment();
      expect(result.signed).toBe(false);
      expect(result.period).toMatch(/^\d{4}-\d{2}$/);
    });

    it("returns signed=true when record exists", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, signedAt: "2026-03-05", isAgreed: true }]);

      const result = await caller.securityCompliance.checkMonthlyCommitment();
      expect(result.signed).toBe(true);
    });
  });

  // ── signCommitment ──
  describe("signCommitment", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.securityCompliance.signCommitment({ isAgreed: true })
      ).rejects.toThrow();
    });

    it("creates new commitment record", async () => {
      const caller = createAdminCaller();
      // check existing → not found
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 1 }];

      const result = await caller.securityCompliance.signCommitment({ isAgreed: true });
      expect(result.success).toBe(true);
      expect(result.alreadySigned).toBe(false);
    });

    it("returns alreadySigned when already committed", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, isAgreed: true, signedAt: "2026-03-01" }]);

      const result = await caller.securityCompliance.signCommitment({ isAgreed: true });
      expect(result.success).toBe(true);
      expect(result.alreadySigned).toBe(true);
    });
  });

  // ── getCommitmentStats ──
  describe("getCommitmentStats", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.getCommitmentStats()).rejects.toThrow();
    });

    it("returns commitment stats", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [{ total_signed: 50, agreed_count: 45 }],
      };

      const result = await caller.securityCompliance.getCommitmentStats();
      expect(result.totalSigned).toBe(50);
      expect(result.agreedCount).toBe(45);
    });
  });

  // ── submitReport ──
  describe("submitReport", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.securityCompliance.submitReport({
          encryptedContent: "base64data",
          category: "信息泄露",
        })
      ).rejects.toThrow();
    });

    it("creates anonymous report", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 10 }];

      const result = await caller.securityCompliance.submitReport({
        encryptedContent: "RSA_ENCRYPTED_BASE64_DATA",
        category: "贪腐",
        isAnonymous: true,
        targetName: "张三",
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBe(10);
    });

    it("rejects empty content", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.securityCompliance.submitReport({
          encryptedContent: "",
          category: "其他",
        })
      ).rejects.toThrow();
    });
  });

  // ── getReports ──
  describe("getReports", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.securityCompliance.getReports()).rejects.toThrow();
    });

    it("returns report list (camelCase mapped, no encrypted content)", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, category: "信息泄露", status: "PENDING", is_anonymous: true, target_name: null, created_at: "2026-03-05" },
        ],
      };

      const result = await caller.securityCompliance.getReports();
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("信息泄露");
      expect(result[0].isAnonymous).toBe(true);
    });
  });

  // ── updateReportStatus ──
  describe("updateReportStatus", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.securityCompliance.updateReportStatus({
          reportId: 1,
          status: "INVESTIGATING",
        })
      ).rejects.toThrow();
    });

    it("updates report status", async () => {
      const caller = createAdminCaller();
      const result = await caller.securityCompliance.updateReportStatus({
        reportId: 1,
        status: "RESOLVED",
        investigationNotes: "已核实并处理",
      });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── getSecureDocument ──
  describe("getSecureDocument", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.securityCompliance.getSecureDocument({
          documentId: "DOC-001",
          documentType: "CAD",
        })
      ).rejects.toThrow();
    });

    it("returns watermark metadata", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1 }];

      const result = await caller.securityCompliance.getSecureDocument({
        documentId: "DOC-001",
        documentType: "PDF",
      });

      expect(result.watermarkText).toBeTruthy();
      expect(result.watermarkToken).toBeTruthy();
      expect(result.watermarkStyle.opacity).toBe(0.15);
      expect(result.watermarkStyle.repeat).toBe(true);
    });
  });
});

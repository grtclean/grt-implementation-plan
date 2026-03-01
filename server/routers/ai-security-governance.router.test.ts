/**
 * AI Security Governance Router — Unit Tests
 * Tests 7 procedures: verifyOtp, getSystemStatus, togglePipelineFreeze,
 * rollbackKnowledge, listKnowledgeForRollback, listAuditLogs, getAuditStats
 *
 * OTP-gated procedures require code "123456".
 * Promise.all patterns: listKnowledgeForRollback (2), listAuditLogs (2).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  return { selectResultsQueue };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      returning: vi.fn(() => {
        return Object.assign(Promise.resolve([{ id: 1 }]), {
          then: (resolve: any) => Promise.resolve([{ id: 1 }]).then(resolve),
          catch: () => Promise.resolve([{ id: 1 }]),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleControl = {
  id: 1, controlKey: "PIPELINE_FROZEN", controlValue: "true",
  updatedAt: "2026-02-28T10:00:00Z", metadata: { reason: "Emergency freeze" },
};

const sampleDoc = {
  id: 1, fileName: "safety-manual.pdf", status: "approved",
  isPurged: false, createdAt: "2026-01-01",
};

const sampleAuditLog = {
  id: 1, entityType: "sys_global_controls", entityId: 1,
  action: "SYSTEM_FREEZE", actorName: "Security Admin",
  newData: { frozen: true }, metadata: { source: "ai-security-governance" },
  createdAt: "2026-02-28T10:00:00Z",
};

describe("ai-security-governance router", () => {

  // ═══ verifyOtp ═══
  describe("verifyOtp", () => {
    it("returns valid for correct OTP", async () => {
      const result = await caller().aiSecurityGovernance.verifyOtp({ code: "123456" });
      expect(result).toEqual({ valid: true });
    });

    it("returns invalid for wrong OTP", async () => {
      const result = await caller().aiSecurityGovernance.verifyOtp({ code: "000000" });
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid for empty code", async () => {
      const result = await caller().aiSecurityGovernance.verifyOtp({ code: "" });
      expect(result).toEqual({ valid: false });
    });
  });

  // ═══ getSystemStatus ═══
  describe("getSystemStatus", () => {
    it("returns frozen status", async () => {
      selectResultsQueue.push([sampleControl]);
      const result = await caller().aiSecurityGovernance.getSystemStatus();
      expect(result.pipelineFrozen).toBe(true);
      expect(result.updatedAt).toBe("2026-02-28T10:00:00Z");
    });

    it("returns false when control value is not 'true'", async () => {
      selectResultsQueue.push([{ ...sampleControl, controlValue: "false" }]);
      const result = await caller().aiSecurityGovernance.getSystemStatus();
      expect(result.pipelineFrozen).toBe(false);
    });

    it("returns false when no control record exists", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSecurityGovernance.getSystemStatus();
      expect(result.pipelineFrozen).toBe(false);
      expect(result.updatedAt).toBeNull();
    });
  });

  // ═══ togglePipelineFreeze ═══
  describe("togglePipelineFreeze", () => {
    it("freezes pipeline with valid OTP", async () => {
      selectResultsQueue.push([sampleControl]); // existing control
      selectResultsQueue.push([]); // update
      selectResultsQueue.push([]); // audit log insert
      const result = await caller().aiSecurityGovernance.togglePipelineFreeze({
        frozen: true, otpCode: "123456", reason: "Emergency",
      });
      expect(result).toEqual({ success: true, frozen: true });
    });

    it("unfreezes pipeline with valid OTP", async () => {
      selectResultsQueue.push([sampleControl]); // existing
      selectResultsQueue.push([]); // update
      selectResultsQueue.push([]); // audit log
      const result = await caller().aiSecurityGovernance.togglePipelineFreeze({
        frozen: false, otpCode: "123456",
      });
      expect(result).toEqual({ success: true, frozen: false });
    });

    it("creates new control when none exists", async () => {
      selectResultsQueue.push([]); // no existing control
      selectResultsQueue.push([]); // insert
      selectResultsQueue.push([]); // audit log
      const result = await caller().aiSecurityGovernance.togglePipelineFreeze({
        frozen: true, otpCode: "123456",
      });
      expect(result).toEqual({ success: true, frozen: true });
    });

    it("rejects invalid OTP", async () => {
      await expect(caller().aiSecurityGovernance.togglePipelineFreeze({
        frozen: true, otpCode: "wrong",
      })).rejects.toThrow("Invalid OTP code");
    });
  });

  // ═══ rollbackKnowledge ═══
  describe("rollbackKnowledge", () => {
    it("purges document with valid OTP", async () => {
      selectResultsQueue.push([sampleDoc]); // doc lookup
      selectResultsQueue.push([]); // update isPurged
      selectResultsQueue.push([]); // audit log
      const result = await caller().aiSecurityGovernance.rollbackKnowledge({
        documentId: 1, otpCode: "123456",
      });
      expect(result).toEqual({ success: true, documentId: 1 });
    });

    it("rejects invalid OTP", async () => {
      await expect(caller().aiSecurityGovernance.rollbackKnowledge({
        documentId: 1, otpCode: "bad",
      })).rejects.toThrow("Invalid OTP code");
    });

    it("throws when document not found", async () => {
      selectResultsQueue.push([]); // doc not found
      await expect(caller().aiSecurityGovernance.rollbackKnowledge({
        documentId: 999, otpCode: "123456",
      })).rejects.toThrow("Document not found");
    });
  });

  // ═══ listKnowledgeForRollback ═══
  describe("listKnowledgeForRollback", () => {
    it("returns non-purged documents", async () => {
      selectResultsQueue.push([sampleDoc, { ...sampleDoc, id: 2 }]); // items
      selectResultsQueue.push([{ value: 2 }]); // total
      const result = await caller().aiSecurityGovernance.listKnowledgeForRollback();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("supports pagination", async () => {
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([{ value: 10 }]);
      const result = await caller().aiSecurityGovernance.listKnowledgeForRollback({
        limit: 5, offset: 5,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it("returns empty list", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().aiSecurityGovernance.listKnowledgeForRollback();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ listAuditLogs ═══
  describe("listAuditLogs", () => {
    it("returns governance audit logs", async () => {
      selectResultsQueue.push([sampleAuditLog]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().aiSecurityGovernance.listAuditLogs();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by action", async () => {
      selectResultsQueue.push([sampleAuditLog]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().aiSecurityGovernance.listAuditLogs({
        actionFilter: "SYSTEM_FREEZE",
      });
      expect(result.items).toHaveLength(1);
    });

    it("supports pagination", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 100 }]);
      const result = await caller().aiSecurityGovernance.listAuditLogs({
        limit: 10, offset: 90,
      });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(100);
    });
  });

  // ═══ getAuditStats ═══
  describe("getAuditStats", () => {
    it("returns stats by action type", async () => {
      selectResultsQueue.push([
        { action: "SYSTEM_FREEZE", count: 5 },
        { action: "ROLLBACK_KNOWLEDGE", count: 3 },
        { action: "APPROVE_KNOWLEDGE", count: 10 },
      ]);
      const result = await caller().aiSecurityGovernance.getAuditStats();
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ action: "SYSTEM_FREEZE", count: 5 });
    });

    it("returns empty when no logs", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiSecurityGovernance.getAuditStats();
      expect(result).toEqual([]);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for verifyOtp", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.verifyOtp({ code: "123456" })).rejects.toThrow();
    });
    it("rejects anonymous for getSystemStatus", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.getSystemStatus()).rejects.toThrow();
    });
    it("rejects anonymous for togglePipelineFreeze", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.togglePipelineFreeze({
        frozen: true, otpCode: "123456",
      })).rejects.toThrow();
    });
    it("rejects anonymous for rollbackKnowledge", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.rollbackKnowledge({
        documentId: 1, otpCode: "123456",
      })).rejects.toThrow();
    });
    it("rejects anonymous for listKnowledgeForRollback", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.listKnowledgeForRollback()).rejects.toThrow();
    });
    it("rejects anonymous for listAuditLogs", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.listAuditLogs()).rejects.toThrow();
    });
    it("rejects anonymous for getAuditStats", async () => {
      await expect(createAnonymousCaller().aiSecurityGovernance.getAuditStats()).rejects.toThrow();
    });
  });
});

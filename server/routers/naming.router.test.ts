/**
 * Naming Router — Unit Tests
 * Tests all procedures: naming versions, project numbers, change requests,
 * equipment models, approvers, versions sub-routers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Mock schema
vi.mock("../../drizzle/schema", () => ({
  namingChangeRequests: { id: "id", requestCode: "requestCode", ruleType: "ruleType", requestType: "requestType", title: "title", status: "status", requestorName: "requestorName", requestDate: "requestDate", description: "description", reason: "reason", impactScope: "impactScope", requestorId: "requestorId", approvalDate: "approvalDate", approvalNotes: "approvalNotes", updatedAt: "updatedAt" },
  namingChangeImplementations: { id: "id" },
  namingChangeTests: { id: "id" },
  namingRuleApprovers: { id: "id", userId: "userId", ruleType: "ruleType", changeType: "changeType", approvalLevel: "approvalLevel", isActive: "isActive", remark: "remark", createdAt: "createdAt" },
  namingVersions: { id: "id", versionCode: "versionCode", versionName: "versionName", ruleType: "ruleType", changeType: "changeType", effectiveDate: "effectiveDate", isCurrent: "isCurrent", changeDescription: "changeDescription", createdAt: "createdAt" },
  equipmentModels: { id: "id", numericCode: "numericCode", functionCode: "functionCode", fullName: "fullName", chineseName: "chineseName", processType: "processType", configLevel: "configLevel", chamberCount: "chamberCount", status: "status", namingVersion: "namingVersion", categoryCode: "categoryCode", effectiveDate: "effectiveDate", createdAt: "createdAt" },
  projectNumberCounters: { id: "id", prefix: "prefix", currentMax: "currentMax", nextAvailable: "nextAvailable", formatDigits: "formatDigits", updatedAt: "updatedAt" },
  projectConversionHistory: { id: "id", tempProjectCode: "tempProjectCode", formalProjectCode: "formalProjectCode", contractNo: "contractNo", conversionDate: "conversionDate", numberingVersion: "numberingVersion", createdAt: "createdAt" },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("naming router", () => {

  // ═══ Top-level procedures ═══════════════════════════

  describe("list", () => {
    it("returns paginated naming versions", async () => {
      selectResultsQueue.push([{ count: 5 }]);
      selectResultsQueue.push([{ id: 1, versionCode: "V1.0" }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.list({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
    });

    it("handles no input", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.list();
      expect(result.total).toBe(0);
    });
  });

  describe("getById", () => {
    it("returns version by id", async () => {
      mockQueryResult = [{ id: 1, versionCode: "V1.0" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.getById({ id: "1" });
      expect(result).toHaveProperty("versionCode", "V1.0");
    });

    it("returns null when not found", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates naming version", async () => {
      mockReturningResult = [{ id: 1, versionCode: "V2.0" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.create({
        versionCode: "V2.0", ruleType: "equipment",
        effectiveDate: "2026-01-01", changeType: "major",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("data");
    });
  });

  describe("update", () => {
    it("updates naming version", async () => {
      mockReturningResult = [{ id: 1, versionName: "Updated" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.update({
        id: "1", versionName: "Updated",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("delete", () => {
    it("deletes naming version", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.delete({ id: "1" });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("validate", () => {
    it("returns valid when no match", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.validate({ name: "NEW-001" });
      expect(result).toHaveProperty("valid", true);
      expect(result.suggestions).toHaveLength(0);
    });

    it("returns suggestions when matching", async () => {
      mockQueryResult = [
        { fullName: "GRT-CL-SC001", chineseName: "清洗机" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.validate({ name: "CL" });
      expect(result).toHaveProperty("valid", false);
      expect(result.suggestions).toContain("GRT-CL-SC001");
    });
  });

  describe("generate", () => {
    it("generates name from counter", async () => {
      mockQueryResult = [{ prefix: "T", nextAvailable: 501, formatDigits: 3 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.generate({ prefix: "T" });
      expect(result).toHaveProperty("name", "T501");
    });

    it("returns empty when no prefix", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.generate({});
      expect(result).toHaveProperty("name", "");
    });

    it("returns empty when counter not found", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.generate({ prefix: "X" });
      expect(result).toHaveProperty("name", "");
    });
  });

  // ═══ Project Numbers sub-router ═══════════════════════

  describe("projectNumbers.getCounter", () => {
    it("returns counter data", async () => {
      mockQueryResult = [{ prefix: "T", currentMax: 500, nextAvailable: 501, formatDigits: 3 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.getCounter({ prefix: "T" });
      expect(result).toHaveProperty("prefix", "T");
      expect(result).toHaveProperty("nextAvailable", 501);
    });

    it("returns default fallback for T prefix", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.getCounter({ prefix: "T" });
      expect(result).toHaveProperty("currentMax", 500);
    });

    it("returns default fallback for other prefix", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.getCounter({ prefix: "P" });
      expect(result).toHaveProperty("currentMax", 100);
    });
  });

  describe("projectNumbers.getConversionHistory", () => {
    it("returns conversion history", async () => {
      mockQueryResult = [
        { id: 1, tempProjectCode: "T501", formalProjectCode: "GRT501", contractNo: "C001", conversionDate: "2026-01-01", numberingVersion: "V1.0" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.getConversionHistory();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("formalProjectCode", "GRT501");
    });
  });

  describe("projectNumbers.initCounters", () => {
    it("initializes counters when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.initCounters();
      expect(result).toHaveProperty("success", true);
    });

    it("skips when counters exist", async () => {
      selectResultsQueue.push([{ count: 3 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.initCounters();
      expect(result.message).toContain("已存在");
    });
  });

  describe("projectNumbers.generateNext", () => {
    it("generates next number", async () => {
      mockQueryResult = [{ id: 1, prefix: "T", nextAvailable: 501, formatDigits: 3 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.generateNext({ prefix: "T" });
      expect(result).toBe("T501");
    });

    it("returns default when no counter", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.generateNext({ prefix: "X" });
      expect(result).toBe("X001");
    });
  });

  describe("projectNumbers.convert", () => {
    it("converts temp to formal code", async () => {
      selectResultsQueue.push([{ versionCode: "V1.0", isCurrent: 1 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.projectNumbers.convert({
        tempCode: "T501", contractNo: "C001",
      });
      expect(result).toHaveProperty("formalCode", "GRT501");
    });
  });

  // ═══ Change Requests sub-router ═══════════════════════

  describe("changeRequests.list", () => {
    it("returns all change requests", async () => {
      mockQueryResult = [
        { id: 1, requestCode: "NCR-001", ruleType: "equipment", requestType: "add", title: "Test", status: "pending", requestorName: "Zhang", requestDate: "2026-01-01" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.changeRequests.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("requestCode");
    });

    it("filters by status", async () => {
      mockQueryResult = [
        { id: 1, requestCode: "NCR-001", ruleType: "equipment", requestType: "add", title: "T", status: "pending", requestorName: "", requestDate: "2026-01-01" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.changeRequests.list({ status: "pending" });
      expect(result).toHaveLength(1);
    });
  });

  describe("changeRequests.create", () => {
    it("creates change request", async () => {
      mockReturningResult = [{ id: 1, requestCode: "NCR-TEST" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.changeRequests.create({
        requestType: "add", ruleType: "equipment",
        title: "Add new model", description: "Details", reason: "Business need",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("changeRequests.approve", () => {
    it("approves change request", async () => {
      mockReturningResult = [{ id: 1, status: "approved" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.changeRequests.approve({ id: "1" });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("changeRequests.reject", () => {
    it("rejects change request with notes", async () => {
      mockReturningResult = [{ id: 1, status: "rejected" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.changeRequests.reject({
        id: "1", notes: "Insufficient justification",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  // ═══ Equipment Models sub-router ═══════════════════════

  describe("equipmentModels.list", () => {
    it("returns equipment models", async () => {
      mockQueryResult = [
        { id: 1, numericCode: "001", functionCode: "CL", fullName: "GRT-CL-SC001", chineseName: "清洗机", processType: "ultrasonic", configLevel: "standard", chamberCount: 1, status: "active", namingVersion: "V1.0" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.equipmentModels.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("fullName");
    });

    it("searches by name", async () => {
      mockQueryResult = [
        { id: 1, numericCode: "001", functionCode: "CL", fullName: "GRT-CL-SC001", chineseName: "清洗机", processType: null, configLevel: null, chamberCount: null, status: "active", namingVersion: null },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.equipmentModels.list({ search: "CL" });
      expect(result).toHaveLength(1);
    });
  });

  describe("equipmentModels.create", () => {
    it("creates equipment model", async () => {
      mockReturningResult = [{ id: 1, fullName: "GRT-NEW-001" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.equipmentModels.create({
        numericCode: "010", functionCode: "DR", categoryCode: "VD",
        fullName: "GRT-NEW-001", chineseName: "新设备",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("equipmentModels.initSample", () => {
    it("initializes sample when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.equipmentModels.initSample();
      expect(result).toHaveProperty("created", 3);
    });

    it("skips when data exists", async () => {
      selectResultsQueue.push([{ count: 5 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.equipmentModels.initSample();
      expect(result).toHaveProperty("created", 0);
    });
  });

  // ═══ Approvers sub-router ═══════════════════════

  describe("approvers.list", () => {
    it("returns approvers", async () => {
      mockQueryResult = [
        { id: 1, userId: 1, ruleType: "equipment", changeType: "add", approvalLevel: 1, isActive: 1, remark: "Test" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.approvers.list();
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe("approvers.create", () => {
    it("creates approver", async () => {
      mockReturningResult = [{ id: 1, userId: 5 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.approvers.create({
        userId: 5, ruleType: "equipment", changeType: "add",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("approvers.delete", () => {
    it("deletes approver", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.approvers.delete({ id: "1" });
      expect(result).toHaveProperty("success", true);
    });
  });

  // ═══ Versions sub-router ═══════════════════════

  describe("versions.list", () => {
    it("returns version list", async () => {
      mockQueryResult = [
        { id: 1, versionCode: "V1.0", versionName: "Equipment V1", ruleType: "equipment", changeType: "major", effectiveDate: "2026-01-01", isCurrent: 1, changeDescription: "Initial" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.versions.list();
      expect(result).toHaveLength(1);
      expect(result[0].isCurrent).toBe(true);
    });
  });

  describe("versions.initDefault", () => {
    it("initializes default versions when empty", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.versions.initDefault();
      expect(result).toHaveProperty("success", true);
    });

    it("skips when versions exist", async () => {
      selectResultsQueue.push([{ count: 3 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.naming.versions.initDefault();
      expect(result.message).toContain("已存在");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.naming.list()).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.naming.create({
        versionCode: "V1", ruleType: "equipment",
        effectiveDate: "2026-01-01", changeType: "major",
      })).rejects.toThrow();
    });

    it("rejects anonymous for projectNumbers.generateNext", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.naming.projectNumbers.generateNext({ prefix: "T" })).rejects.toThrow();
    });

    it("rejects anonymous for changeRequests.create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.naming.changeRequests.create({
        requestType: "add", ruleType: "equipment",
        title: "X", description: "X", reason: "X",
      })).rejects.toThrow();
    });

    it("rejects anonymous for equipmentModels.create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.naming.equipmentModels.create({
        numericCode: "1", functionCode: "X", categoryCode: "X",
        fullName: "X", chineseName: "X",
      })).rejects.toThrow();
    });
  });
});

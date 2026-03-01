/**
 * Concurrent Command Center Router — Unit Tests
 * Track 1: Software Dev Sandboxes, Track 2: Equipment Commissioning Rooms,
 * Activity Log, Role Improvement Input, Improvement Lifecycle V2, Seed Demo
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

// Mock schema imports
vi.mock("../../drizzle/concurrent-debug-schema", () => ({
  cccSandboxes: { id: "id", moduleName: "moduleName", branchStatus: "branchStatus", managerApproved: "managerApproved", updatedAt: "updatedAt" },
  cccRooms: { id: "id", subSystem: "subSystem", testStatus: "testStatus", engineerAssigned: "engineerAssigned", reportApproved: "reportApproved", projectName: "projectName", testNotes: "testNotes", updatedAt: "updatedAt" },
  cccActivities: { id: "id", action: "action", target: "target", userName: "userName", createdAt: "createdAt", extraData: "extraData" },
  cccImprovements: { id: "id", role: "role", area: "area", requirement: "requirement", priority: "priority", status: "status", steps: "steps", estimatedDays: "estimatedDays", assignedTo: "assignedTo", dueDate: "dueDate", completionPct: "completionPct", resultSummary: "resultSummary", resultEvidence: "resultEvidence", verifiedBy: "verifiedBy", verifiedAt: "verifiedAt", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt" },
  cccImprovementUpdates: { id: "id", improvementId: "improvementId", stepNumber: "stepNumber", action: "action", content: "content", evidenceData: "evidenceData", userName: "userName", createdAt: "createdAt" },
}));

// Mock websocket service
vi.mock("../services/websocket.service", () => ({
  broadcastToWorkspace: vi.fn(),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────
describe("concurrentCommand router", () => {

  // ═══ Track 1: Software Dev Sandboxes ═══════════════

  describe("listSandboxes", () => {
    it("returns sandbox list", async () => {
      mockQueryResult = [
        { id: 1, moduleName: "Finance", branchStatus: "TESTING" },
        { id: 2, moduleName: "HR", branchStatus: "ISOLATED" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listSandboxes();
      expect(result).toHaveLength(2);
    });

    it("returns empty list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listSandboxes();
      expect(result).toHaveLength(0);
    });
  });

  describe("updateSandboxStatus", () => {
    it("updates sandbox branch status", async () => {
      // existing check
      selectResultsQueue.push([{ id: 1, moduleName: "Finance", branchStatus: "ISOLATED" }]);
      // update returning
      mockReturningResult = [{ id: 1, moduleName: "Finance", branchStatus: "TESTING" }];
      // activity insert returning
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.updateSandboxStatus({
        id: 1, branchStatus: "TESTING",
      });
      expect(result).toHaveProperty("branchStatus", "TESTING");
    });

    it("throws when sandbox not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateSandboxStatus({
        id: 999, branchStatus: "TESTING",
      })).rejects.toThrow("Sandbox not found");
    });
  });

  describe("approveMerge", () => {
    it("approves merge when READY_FOR_MERGE", async () => {
      selectResultsQueue.push([{ id: 1, moduleName: "Quality", branchStatus: "READY_FOR_MERGE" }]);
      mockReturningResult = [{ id: 1, moduleName: "Quality", managerApproved: true }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.approveMerge({ id: 1 });
      expect(result).toHaveProperty("managerApproved", true);
    });

    it("throws when sandbox not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.approveMerge({ id: 999 })).rejects.toThrow("Sandbox not found");
    });

    it("throws when not READY_FOR_MERGE", async () => {
      selectResultsQueue.push([{ id: 1, moduleName: "Finance", branchStatus: "TESTING" }]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.approveMerge({ id: 1 })).rejects.toThrow("READY_FOR_MERGE");
    });
  });

  // ═══ Track 2: Equipment Commissioning Rooms ═══════════

  describe("listRooms", () => {
    it("returns room list", async () => {
      mockQueryResult = [
        { id: 1, subSystem: "Conveyor", testStatus: "PASSED" },
        { id: 2, subSystem: "Ultrasonic", testStatus: "DEBUGGING" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listRooms();
      expect(result).toHaveLength(2);
    });
  });

  describe("claimRoom", () => {
    it("claims idle room", async () => {
      selectResultsQueue.push([{ id: 1, subSystem: "Drying", testStatus: "IDLE", engineerAssigned: null }]);
      mockReturningResult = [{ id: 1, subSystem: "Drying", testStatus: "DEBUGGING", engineerAssigned: "Test User" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.claimRoom({ id: 1 });
      expect(result).toHaveProperty("testStatus", "DEBUGGING");
    });

    it("throws when room not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.claimRoom({ id: 999 })).rejects.toThrow("Room not found");
    });

    it("throws when room already passed", async () => {
      selectResultsQueue.push([{ id: 1, subSystem: "Conveyor", testStatus: "PASSED", engineerAssigned: null }]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.claimRoom({ id: 1 })).rejects.toThrow("already passed");
    });

    it("throws when claimed by another engineer", async () => {
      selectResultsQueue.push([{ id: 1, subSystem: "Conveyor", testStatus: "DEBUGGING", engineerAssigned: "Other Engineer" }]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.claimRoom({ id: 1 })).rejects.toThrow("Already claimed");
    });
  });

  describe("updateRoomStatus", () => {
    it("updates room status", async () => {
      selectResultsQueue.push([{ id: 1, subSystem: "Ultrasonic", testStatus: "DEBUGGING" }]);
      mockReturningResult = [{ id: 1, subSystem: "Ultrasonic", testStatus: "PASSED" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.updateRoomStatus({
        id: 1, testStatus: "PASSED",
      });
      expect(result).toHaveProperty("testStatus", "PASSED");
    });

    it("throws when room not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateRoomStatus({
        id: 999, testStatus: "IDLE",
      })).rejects.toThrow("Room not found");
    });
  });

  describe("generateCommissioningReport", () => {
    it("returns not ready when rooms pending", async () => {
      mockQueryResult = [
        { id: 1, testStatus: "PASSED", reportApproved: false },
        { id: 2, testStatus: "DEBUGGING", reportApproved: false },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.generateCommissioningReport();
      expect(result.ready).toBe(false);
      expect(result.report).toBeNull();
    });

    it("returns report when all rooms passed", async () => {
      mockQueryResult = [
        { id: 1, testStatus: "PASSED", reportApproved: false, subSystem: "Conveyor", engineerAssigned: "张工", testNotes: "OK", projectName: "SAIC" },
        { id: 2, testStatus: "PASSED", reportApproved: false, subSystem: "Drying", engineerAssigned: "李工", testNotes: "OK", projectName: "SAIC" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.generateCommissioningReport();
      expect(result.ready).toBe(true);
      expect(result.report).not.toBeNull();
      expect(result.report!.totalSubSystems).toBe(2);
      expect(result.report!.passedSubSystems).toBe(2);
    });

    it("returns approved when all rooms have reportApproved", async () => {
      mockQueryResult = [
        { id: 1, testStatus: "PASSED", reportApproved: true, subSystem: "A", engineerAssigned: "E1", testNotes: "", projectName: "P" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.generateCommissioningReport();
      expect(result.approved).toBe(true);
    });

    it("returns not ready for empty rooms", async () => {
      mockQueryResult = [];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.generateCommissioningReport();
      expect(result.ready).toBe(false);
    });
  });

  describe("approveCommissioningReport", () => {
    it("approves commissioning report", async () => {
      mockReturningResult = [{ id: 1 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.approveCommissioningReport();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("approvedBy");
      expect(result).toHaveProperty("approvedAt");
    });
  });

  // ═══ Activity Log ═══════════════════════════════════

  describe("getActivityLog", () => {
    it("returns activity log", async () => {
      mockQueryResult = [
        { id: 1, action: "claimRoom", target: "Conveyor", userName: "张工" },
        { id: 2, action: "updateRoomStatus", target: "Conveyor", userName: "张工" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.getActivityLog();
      expect(result).toHaveLength(2);
    });
  });

  // ═══ Role Improvement Input ═══════════════════════════

  describe("submitImprovement", () => {
    it("submits improvement with priority detection (high)", async () => {
      // activity insert returning (from broadcast helper)
      mockReturningResult = [{ id: 1 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.submitImprovement({
        role: "HR Manager",
        area: "绩效考核",
        requirement: "紧急优化考核流程",
      });
      expect(result).toHaveProperty("priority", "high");
      expect(result).toHaveProperty("steps");
      expect(result.steps).toHaveLength(6);
      expect(result).toHaveProperty("estimatedDays", "7-14天");
    });

    it("detects medium priority", async () => {
      mockReturningResult = [{ id: 2 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.submitImprovement({
        role: "Admin",
        area: "系统权限",
        requirement: "优化权限审批流程",
      });
      expect(result).toHaveProperty("priority", "medium");
      expect(result).toHaveProperty("estimatedDays", "14-30天");
    });

    it("detects low priority", async () => {
      mockReturningResult = [{ id: 3 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.submitImprovement({
        role: "Sales",
        area: "客户管理",
        requirement: "建议改善客户分类体系",
      });
      expect(result).toHaveProperty("priority", "low");
      expect(result).toHaveProperty("estimatedDays", "30-60天");
    });
  });

  describe("listImprovements", () => {
    it("returns improvement list", async () => {
      mockQueryResult = [
        { id: 1, action: "submitImprovement", target: "[HR] 绩效", userName: "王经理", extraData: { role: "HR Manager" }, createdAt: "2026-01-01" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listImprovements({});
      expect(result).toHaveLength(1);
    });

    it("filters by role", async () => {
      mockQueryResult = [
        { id: 1, action: "submitImprovement", target: "[HR]", userName: "王", extraData: { role: "HR Manager" }, createdAt: "2026-01-01" },
        { id: 2, action: "submitImprovement", target: "[Admin]", userName: "张", extraData: { role: "Admin" }, createdAt: "2026-01-01" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listImprovements({ role: "Admin" });
      expect(result).toHaveLength(1);
      expect(result[0].data?.role).toBe("Admin");
    });
  });

  // ═══ Improvement Lifecycle V2 ═══════════════════════

  describe("createImprovement", () => {
    it("creates improvement with auto-priority and steps", async () => {
      mockReturningResult = [{ id: 1, role: "HR Manager", area: "绩效考核", priority: "high", status: "submitted", completionPct: 0 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.createImprovement({
        role: "HR Manager",
        area: "绩效考核",
        requirement: "紧急改进绩效考核流程",
      });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("status", "submitted");
    });

    it("creates with custom assignee and due date", async () => {
      mockReturningResult = [{ id: 2, role: "Admin", area: "权限", priority: "medium", status: "submitted" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.createImprovement({
        role: "Admin",
        area: "权限",
        requirement: "优化权限管理",
        assignedTo: "IT Team",
        dueDate: "2026-04-01",
      });
      expect(result).toHaveProperty("id", 2);
    });
  });

  describe("getImprovement", () => {
    it("returns improvement with updates", async () => {
      // improvement select
      selectResultsQueue.push([{
        id: 1, role: "HR Manager", area: "绩效", requirement: "test",
        status: "in_progress", steps: [], completionPct: 35,
      }]);
      // updates select
      selectResultsQueue.push([
        { id: 1, improvementId: 1, stepNumber: 0, action: "create", content: "Created" },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.getImprovement({ id: 1 });
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("updates");
      expect(result.updates).toHaveLength(1);
    });

    it("throws when not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.getImprovement({ id: 999 })).rejects.toThrow("Improvement not found");
    });
  });

  describe("listImprovementsV2", () => {
    it("returns improvement list v2", async () => {
      mockQueryResult = [
        { id: 1, role: "HR Manager", status: "in_progress" },
        { id: 2, role: "Admin", status: "submitted" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listImprovementsV2({});
      expect(result).toHaveLength(2);
    });

    it("filters by role and status", async () => {
      mockQueryResult = [{ id: 1, role: "HR Manager", status: "in_progress" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.listImprovementsV2({
        role: "HR Manager", status: "in_progress",
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("updateProgress", () => {
    it("updates improvement progress", async () => {
      selectResultsQueue.push([{
        id: 1, status: "in_progress", steps: [
          { label: "现状分析", desc: "test", done: false },
          { label: "方案设计", desc: "test", done: false },
        ],
      }]);
      mockReturningResult = [{ id: 1, status: "in_progress", completionPct: 50 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.updateProgress({
        id: 1, stepNumber: 1, content: "Completed analysis", completionPct: 50,
      });
      expect(result).toHaveProperty("completionPct", 50);
    });

    it("throws when improvement not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateProgress({
        id: 999, stepNumber: 1, content: "test", completionPct: 10,
      })).rejects.toThrow("Improvement not found");
    });

    it("throws when status is completed", async () => {
      selectResultsQueue.push([{ id: 1, status: "completed" }]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateProgress({
        id: 1, stepNumber: 1, content: "test", completionPct: 10,
      })).rejects.toThrow("Cannot update progress");
    });
  });

  describe("submitResult", () => {
    it("submits improvement result", async () => {
      selectResultsQueue.push([{ id: 1, role: "HR Manager", area: "绩效", status: "in_progress" }]);
      mockReturningResult = [{ id: 1, status: "completed", completionPct: 100 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.submitResult({
        id: 1,
        resultSummary: "效率提升30%",
        resultEvidence: { before: "70%", after: "100%" },
      });
      expect(result).toHaveProperty("status", "completed");
      expect(result).toHaveProperty("completionPct", 100);
    });

    it("throws when not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.submitResult({
        id: 999, resultSummary: "test",
      })).rejects.toThrow("Improvement not found");
    });
  });

  describe("verifyImprovement", () => {
    it("approves improvement verification", async () => {
      selectResultsQueue.push([{ id: 1, role: "HR Manager", area: "绩效", status: "completed" }]);
      mockReturningResult = [{ id: 1, status: "verified", verifiedBy: "Test User" }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.verifyImprovement({
        id: 1, approved: true, comment: "Excellent work",
      });
      expect(result).toHaveProperty("status", "verified");
    });

    it("rejects improvement — back to in_progress", async () => {
      selectResultsQueue.push([{ id: 1, role: "Admin", area: "权限", status: "completed", completionPct: 100 }]);
      mockReturningResult = [{ id: 1, status: "in_progress", completionPct: 80 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.verifyImprovement({
        id: 1, approved: false, comment: "需要更多证据",
      });
      expect(result).toHaveProperty("status", "in_progress");
    });

    it("throws when not found", async () => {
      selectResultsQueue.push([]);
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.verifyImprovement({
        id: 999, approved: true,
      })).rejects.toThrow("Improvement not found");
    });
  });

  describe("improvementStats", () => {
    it("returns status counts", async () => {
      mockQueryResult = [
        { status: "submitted" },
        { status: "in_progress" },
        { status: "in_progress" },
        { status: "completed" },
      ];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.improvementStats({});
      expect(result).toHaveProperty("submitted", 1);
      expect(result).toHaveProperty("in_progress", 2);
      expect(result).toHaveProperty("completed", 1);
    });
  });

  // ═══ Seed Demo Data ═══════════════════════════════════

  describe("seedDemoData", () => {
    it("seeds demo data", async () => {
      // Multiple inserts with returning for improvements
      mockReturningResult = [{ id: 1 }];
      const caller = createAuthenticatedCaller();
      const result = await caller.concurrentCommand.seedDemoData();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message");
      expect(result.message).toContain("sandboxes");
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for listSandboxes", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.listSandboxes()).rejects.toThrow();
    });

    it("rejects anonymous for updateSandboxStatus", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.updateSandboxStatus({
        id: 1, branchStatus: "TESTING",
      })).rejects.toThrow();
    });

    it("rejects anonymous for claimRoom", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.claimRoom({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for submitImprovement", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.submitImprovement({
        role: "HR", area: "test", requirement: "test req",
      })).rejects.toThrow();
    });

    it("rejects anonymous for createImprovement", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.createImprovement({
        role: "HR", area: "test", requirement: "test req",
      })).rejects.toThrow();
    });

    it("rejects anonymous for verifyImprovement", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.concurrentCommand.verifyImprovement({
        id: 1, approved: true,
      })).rejects.toThrow();
    });
  });

  // ═══ Input Validation ═══════════════════════════════════

  describe("input validation", () => {
    it("rejects invalid branchStatus", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateSandboxStatus({
        id: 1, branchStatus: "INVALID" as any,
      })).rejects.toThrow();
    });

    it("rejects invalid testStatus", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateRoomStatus({
        id: 1, testStatus: "INVALID" as any,
      })).rejects.toThrow();
    });

    it("rejects empty role in submitImprovement", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.submitImprovement({
        role: "", area: "test", requirement: "test req",
      })).rejects.toThrow();
    });

    it("rejects empty area in createImprovement", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.createImprovement({
        role: "HR", area: "", requirement: "test req",
      })).rejects.toThrow();
    });

    it("rejects stepNumber out of range in updateProgress", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateProgress({
        id: 1, stepNumber: 0, content: "test", completionPct: 10,
      })).rejects.toThrow();
    });

    it("rejects completionPct over 100", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.concurrentCommand.updateProgress({
        id: 1, stepNumber: 1, content: "test", completionPct: 150,
      })).rejects.toThrow();
    });
  });
});

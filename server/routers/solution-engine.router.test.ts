/**
 * Solution Engine Router — Unit Tests
 *
 * 14 procedures:
 *   createRequirement       — create technical requirement (mutation)
 *   getRequirement          — get requirement by ID (query)
 *   listRequirements        — list requirements with filters (query)
 *   generateProposal        — trigger AI proposal generation (mutation)
 *   getProposalStatus       — poll proposal task status (query)
 *   getProposal             — get full proposal details (query)
 *   approveAndPushToM3      — approve and push to M3 (mutation)
 *   listProposals           — list proposals with filters (query)
 *   exportProposal          — export proposal as md/html (mutation)
 *   listBenchmarkProjects   — list historical benchmarks (query)
 *   getBenchmarkProject     — get single benchmark (query)
 *   createBenchmarkProject  — create benchmark project (mutation)
 *   updateBenchmarkProject  — update benchmark project (mutation)
 *   deleteBenchmarkProject  — soft-delete benchmark (mutation)
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
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

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
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock worker ─────────────────────────────────────────────
vi.mock("../workers/solutionEngineWorker", () => ({
  triggerSolutionGenerationWorker: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock proposal-export service ────────────────────────────
vi.mock("../services/proposal-export.service", () => ({
  exportProposalAsMarkdown: vi.fn(() => "# Markdown Export"),
  exportProposalAsHTML: vi.fn(() => "<html>HTML Export</html>"),
}));

// ── Mock schema tables ──────────────────────────────────────
vi.mock("../../drizzle/schema", () => ({
  aiTasks: {
    id: "id",
    taskType: "taskType",
    status: "status",
    inputData: "inputData",
    resultData: "resultData",
    errorMessage: "errorMessage",
    createdBy: "createdBy",
    startedAt: "startedAt",
    completedAt: "completedAt",
    createdAt: "createdAt",
    retryCount: "retryCount",
    maxRetries: "maxRetries",
    timeoutAt: "timeoutAt",
    workerLockId: "workerLockId",
  },
  users: { id: "id", name: "name" },
}));

vi.mock("../../drizzle/solution-engine-schema", () => ({
  customerTechnicalRequirements: {
    id: "id",
    projectId: "projectId",
    projectNo: "projectNo",
    customerId: "customerId",
    customerName: "customerName",
    workpieceName: "workpieceName",
    workpieceNameEn: "workpieceNameEn",
    workpieceMaterial: "workpieceMaterial",
    workpieceDimensions: "workpieceDimensions",
    particleLimit: "particleLimit",
    surfaceTensionLimit: "surfaceTensionLimit",
    residualOilLimit: "residualOilLimit",
    cycleTime: "cycleTime",
    dailyCapacity: "dailyCapacity",
    annualCapacity: "annualCapacity",
    shiftMode: "shiftMode",
    preferredCleaningType: "preferredCleaningType",
    chemicalRestrictions: "chemicalRestrictions",
    temperatureRange: "temperatureRange",
    siteConditions: "siteConditions",
    specialRequirements: "specialRequirements",
    industryStandards: "industryStandards",
    sourceDocument: "sourceDocument",
    aiTaskId: "aiTaskId",
    status: "status",
    createdBy: "createdBy",
    reviewedBy: "reviewedBy",
    reviewedAt: "reviewedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  aiSolutionProposals: {
    id: "id",
    requirementId: "requirementId",
    version: "version",
    parentProposalId: "parentProposalId",
    iterationReason: "iterationReason",
    aiTaskId: "aiTaskId",
    benchmarkProjectIds: "benchmarkProjectIds",
    benchmarkProjects: "benchmarkProjects",
    processFlow: "processFlow",
    equipmentConfig: "equipmentConfig",
    competitorAnalysis: "competitorAnalysis",
    budgetEstimate: "budgetEstimate",
    aiModel: "aiModel",
    generationPrompt: "generationPrompt",
    generationTokens: "generationTokens",
    generationTimeMs: "generationTimeMs",
    status: "status",
    approvedBy: "approvedBy",
    approvedAt: "approvedAt",
    pushedToM3At: "pushedToM3At",
    m3PhaseId: "m3PhaseId",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => {
  const sqlTag = (...args: any[]) => ({ type: "sql", args });
  sqlTag.raw = vi.fn((s: string) => s);
  sqlTag.join = vi.fn((...args: any[]) => ({ type: "sql.join", args }));
  sqlTag.empty = "";
  return {
    eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
    desc: vi.fn((...args: any[]) => ({ type: "desc", args })),
    and: vi.fn((...args: any[]) => ({ type: "and", args })),
    sql: sqlTag,
    SQL: class SQL {},
    relations: vi.fn(() => ({})),
  };
});

// Mock logger
vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  mockExecuteResult = { rows: [] };
  selectResultsQueue.length = 0;
  executeResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════

describe("solutionEngine router", () => {
  // ───────────────────────────────────────────────────────
  //  1. createRequirement
  // ───────────────────────────────────────────────────────
  describe("createRequirement", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.createRequirement({
          workpieceName: "测试工件",
        })
      ).rejects.toThrow();
    });

    it("creates requirement and returns ID", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 1, workpieceName: "汽车缸体" }];

      const result = await caller.solutionEngine.createRequirement({
        workpieceName: "汽车缸体",
        customerName: "大众",
        cycleTime: 60,
      });

      expect(result.success).toBe(true);
      expect(result.requirementId).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects empty workpieceName", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.solutionEngine.createRequirement({
          workpieceName: "",
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────
  //  2. getRequirement
  // ───────────────────────────────────────────────────────
  describe("getRequirement", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.getRequirement({ requirementId: 1 })
      ).rejects.toThrow();
    });

    it("returns requirement when found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 1,
        workpieceName: "汽车缸体",
        status: "DRAFT",
      }]);

      const result = await caller.solutionEngine.getRequirement({ requirementId: 1 });
      expect(result.workpieceName).toBe("汽车缸体");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.solutionEngine.getRequirement({ requirementId: 999 })
      ).rejects.toThrow("Requirement not found");
    });
  });

  // ───────────────────────────────────────────────────────
  //  3. listRequirements
  // ───────────────────────────────────────────────────────
  describe("listRequirements", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.listRequirements()
      ).rejects.toThrow();
    });

    it("returns list via db.execute", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, workpiece_name: "缸体", status: "DRAFT" },
          { id: 2, workpiece_name: "缸盖", status: "APPROVED" },
        ],
      };

      const result = await caller.solutionEngine.listRequirements();
      expect(result).toHaveLength(2);
    });

    it("accepts status and limit filters", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [{ id: 1 }] };

      const result = await caller.solutionEngine.listRequirements({
        status: "APPROVED",
        limit: 5,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────
  //  4. generateProposal
  // ───────────────────────────────────────────────────────
  describe("generateProposal", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.generateProposal({
          requirementId: 1,
        })
      ).rejects.toThrow();
    });

    it("throws when requirement not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // requirement not found

      await expect(
        caller.solutionEngine.generateProposal({ requirementId: 999 })
      ).rejects.toThrow("Requirement not found");
    });

    it("creates AI task and proposal, returns IDs", async () => {
      const caller = createAdminCaller();
      // 1. requirement found
      selectResultsQueue.push([{ id: 1, workpieceName: "汽车缸体" }]);
      // 2. insert AI task returning
      mockReturningResult = [{ id: 10, taskType: "SOLUTION_PROPOSAL_GENERATION", status: "pending" }];

      const result = await caller.solutionEngine.generateProposal({
        requirementId: 1,
        includeCompetitorAnalysis: true,
        includeBudgetEstimate: true,
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(10);
    });
  });

  // ───────────────────────────────────────────────────────
  //  5. getProposalStatus
  // ───────────────────────────────────────────────────────
  describe("getProposalStatus", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.getProposalStatus({ taskId: 1 })
      ).rejects.toThrow();
    });

    it("returns not_found for non-existent task", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // task not found

      const result = await caller.solutionEngine.getProposalStatus({ taskId: 999 });
      expect(result.status).toBe("not_found");
    });

    it("returns completed status with proposal", async () => {
      const caller = createAdminCaller();
      // task found
      selectResultsQueue.push([{
        id: 10,
        status: "completed",
        errorMessage: null,
        createdAt: "2026-03-05",
        completedAt: "2026-03-05",
      }]);
      // proposal query
      selectResultsQueue.push([{
        id: 5,
        status: "DRAFT",
        benchmarkProjects: [],
        processFlow: { stages: [] },
        competitorAnalysis: null,
        budgetEstimate: null,
        aiTaskId: 10,
      }]);

      const result = await caller.solutionEngine.getProposalStatus({ taskId: 10 });
      expect(result.status).toBe("completed");
      expect(result.proposal).toBeTruthy();
      expect(result.proposal!.id).toBe(5);
    });

    it("returns pending status without proposal", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 10,
        status: "pending",
        errorMessage: null,
        createdAt: "2026-03-05",
        completedAt: null,
      }]);

      const result = await caller.solutionEngine.getProposalStatus({ taskId: 10 });
      expect(result.status).toBe("pending");
      expect(result.proposal).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────
  //  6. getProposal
  // ───────────────────────────────────────────────────────
  describe("getProposal", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.getProposal({ proposalId: 1 })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // proposal not found

      await expect(
        caller.solutionEngine.getProposal({ proposalId: 999 })
      ).rejects.toThrow("Proposal not found");
    });

    it("returns proposal with requirement", async () => {
      const caller = createAdminCaller();
      // proposal
      selectResultsQueue.push([{
        id: 5,
        requirementId: 1,
        status: "DRAFT",
        processFlow: { stages: [] },
      }]);
      // requirement
      selectResultsQueue.push([{
        id: 1,
        workpieceName: "汽车缸体",
        status: "PROPOSAL_READY",
      }]);

      const result = await caller.solutionEngine.getProposal({ proposalId: 5 });
      expect(result.id).toBe(5);
      expect(result.requirement?.workpieceName).toBe("汽车缸体");
    });
  });

  // ───────────────────────────────────────────────────────
  //  7. approveAndPushToM3
  // ───────────────────────────────────────────────────────
  describe("approveAndPushToM3", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.approveAndPushToM3({ proposalId: 1 })
      ).rejects.toThrow();
    });

    it("updates proposal and requirement status", async () => {
      const caller = createAdminCaller();
      // proposal query after update
      selectResultsQueue.push([{
        id: 5,
        requirementId: 1,
        status: "PUSHED_TO_M3",
      }]);

      const result = await caller.solutionEngine.approveAndPushToM3({
        proposalId: 5,
        m3PhaseId: 42,
      });

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────
  //  8. listProposals
  // ───────────────────────────────────────────────────────
  describe("listProposals", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.listProposals()
      ).rejects.toThrow();
    });

    it("returns list via db.execute", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, status: "DRAFT", workpiece_name: "缸体" },
          { id: 2, status: "APPROVED", workpiece_name: "缸盖" },
        ],
      };

      const result = await caller.solutionEngine.listProposals();
      expect(result).toHaveLength(2);
    });

    it("accepts filters", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [{ id: 1 }] };

      const result = await caller.solutionEngine.listProposals({
        requirementId: 1,
        status: "APPROVED",
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────
  //  9. exportProposal
  // ───────────────────────────────────────────────────────
  describe("exportProposal", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.exportProposal({ proposalId: 1 })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // proposal not found

      await expect(
        caller.solutionEngine.exportProposal({ proposalId: 999 })
      ).rejects.toThrow("Proposal not found");
    });

    it("throws when requirement not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 5, requirementId: 1 }]); // proposal found
      selectResultsQueue.push([]); // requirement not found

      await expect(
        caller.solutionEngine.exportProposal({ proposalId: 5 })
      ).rejects.toThrow("Requirement not found");
    });

    it("returns HTML export by default", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 5,
        requirementId: 1,
        benchmarkProjects: [],
        processFlow: {},
        equipmentConfig: null,
        competitorAnalysis: null,
        budgetEstimate: null,
        createdAt: "2026-03-05",
      }]);
      selectResultsQueue.push([{
        id: 1,
        workpieceName: "缸体",
        workpieceNameEn: "Cylinder Block",
        workpieceMaterial: "铸铁",
        customerName: "大众",
        projectNo: "P-001",
        particleLimit: { maxParticleSize: 500 },
        cycleTime: 60,
        dailyCapacity: 1000,
      }]);

      const result = await caller.solutionEngine.exportProposal({
        proposalId: 5,
        format: "html",
      });

      expect(result.format).toBe("html");
      expect(result.mimeType).toBe("text/html");
      expect(result.filename).toContain("缸体");
    });

    it("returns markdown export when specified", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 5,
        requirementId: 1,
        benchmarkProjects: [],
        processFlow: {},
        equipmentConfig: null,
        competitorAnalysis: null,
        budgetEstimate: null,
        createdAt: "2026-03-05",
      }]);
      selectResultsQueue.push([{
        id: 1,
        workpieceName: "缸盖",
        workpieceNameEn: null,
        workpieceMaterial: null,
        customerName: null,
        projectNo: null,
        particleLimit: null,
        cycleTime: null,
        dailyCapacity: null,
      }]);

      const result = await caller.solutionEngine.exportProposal({
        proposalId: 5,
        format: "markdown",
      });

      expect(result.format).toBe("markdown");
      expect(result.mimeType).toBe("text/markdown");
    });
  });

  // ───────────────────────────────────────────────────────
  //  10. listBenchmarkProjects
  // ───────────────────────────────────────────────────────
  describe("listBenchmarkProjects", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.listBenchmarkProjects()
      ).rejects.toThrow();
    });

    it("returns list via db.execute", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [
          { id: 1, project_no: "P-001", workpiece: "缸体" },
        ],
      };

      const result = await caller.solutionEngine.listBenchmarkProjects();
      expect(result).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────
  //  11. getBenchmarkProject
  // ───────────────────────────────────────────────────────
  describe("getBenchmarkProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.getBenchmarkProject({ id: 1 })
      ).rejects.toThrow();
    });

    it("returns project when found", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = {
        rows: [{ id: 1, project_no: "P-001", workpiece: "缸体" }],
      };

      const result = await caller.solutionEngine.getBenchmarkProject({ id: 1 });
      expect(result.project_no).toBe("P-001");
    });

    it("throws when not found", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [] };

      await expect(
        caller.solutionEngine.getBenchmarkProject({ id: 999 })
      ).rejects.toThrow("Project not found");
    });
  });

  // ───────────────────────────────────────────────────────
  //  12. createBenchmarkProject
  // ───────────────────────────────────────────────────────
  describe("createBenchmarkProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.createBenchmarkProject({
          projectNo: "P-001",
          customerName: "大众",
          workpiece: "缸体",
        })
      ).rejects.toThrow();
    });

    it("creates benchmark project via db.execute", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [{ id: 10 }] };

      const result = await caller.solutionEngine.createBenchmarkProject({
        projectNo: "P-002",
        customerName: "宝马",
        workpiece: "缸盖",
        deliveryYear: 2025,
        highlights: ["高清洁度", "短节拍"],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(10);
    });

    it("rejects empty required fields", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.solutionEngine.createBenchmarkProject({
          projectNo: "",
          customerName: "大众",
          workpiece: "缸体",
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────
  //  13. updateBenchmarkProject
  // ───────────────────────────────────────────────────────
  describe("updateBenchmarkProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.updateBenchmarkProject({
          id: 1,
          workpiece: "新工件",
        })
      ).rejects.toThrow();
    });

    it("updates benchmark project fields", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [] };

      const result = await caller.solutionEngine.updateBenchmarkProject({
        id: 1,
        workpiece: "新缸体",
        cycleTime: 45,
        isActive: true,
      });

      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────
  //  14. deleteBenchmarkProject
  // ───────────────────────────────────────────────────────
  describe("deleteBenchmarkProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.solutionEngine.deleteBenchmarkProject({ id: 1 })
      ).rejects.toThrow();
    });

    it("soft-deletes benchmark project", async () => {
      const caller = createAdminCaller();
      mockExecuteResult = { rows: [] };

      const result = await caller.solutionEngine.deleteBenchmarkProject({ id: 1 });
      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });
});

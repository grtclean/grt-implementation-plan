/**
 * Meeting Intelligence Router — Unit Tests
 *
 * 5 procedures:
 *   analyzeMeetingTranscript  — async transcript analysis (mutation)
 *   getAnalysisStatus         — poll analysis task (query)
 *   iterateProposal           — iterate proposal based on feedback (mutation)
 *   getIterationStatus        — poll iteration task (query)
 *   getProposalVersionHistory — list version chain (query)
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

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
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
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
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
  projectNumberCounters: {
    id: "id", prefix: "prefix", currentMax: "currentMax",
    nextAvailable: "nextAvailable", formatDigits: "formatDigits",
    numberingVersion: "numberingVersion", updatedAt: "updatedAt",
  },
  projectsV2: {
    id: "id", projectCode: "projectCode", projectName: "projectName",
    customerId: "customerId", currentStage: "currentStage",
    status: "status", priority: "priority", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

vi.mock("../../drizzle/smart-meetings-schema", () => ({
  sysMeetings: {
    id: "id",
    title: "title",
    type: "type",
    status: "status",
    description: "description",
    transcript: "transcript",
    aiSummary: "aiSummary",
    projectId: "projectId",
    tProjectId: "tProjectId",
    departmentId: "departmentId",
    organizerName: "organizerName",
    organizerId: "organizerId",
    scheduledStart: "scheduledStart",
    scheduledEnd: "scheduledEnd",
    actualStart: "actualStart",
    actualEnd: "actualEnd",
    expectedAttendees: "expectedAttendees",
    teamsUrl: "teamsUrl",
    aiQuizQuestions: "aiQuizQuestions",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  meetingActionItems: {
    id: "id",
    meetingId: "meetingId",
    assignedTo: "assignedTo",
    assignedToName: "assignedToName",
    taskDesc: "taskDesc",
    status: "status",
    dueDate: "dueDate",
    completedAt: "completedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  customerInteractionFeedback: {
    id: "id",
    projectId: "projectId",
    meetingId: "meetingId",
    feedbackType: "feedbackType",
    content: "content",
    severity: "severity",
    resolvedAt: "resolvedAt",
    resolvedBy: "resolvedBy",
    proposalId: "proposalId",
    createdBy: "createdBy",
    createdAt: "createdAt",
  },
  tProjects: {
    id: "id", tNumber: "tNumber", displayName: "displayName",
    customerId: "customerId", customerName: "customerName",
    status: "status", convertedProjectId: "convertedProjectId",
    grtNumber: "grtNumber", convertedAt: "convertedAt",
    convertedBy: "convertedBy", description: "description",
    aiCommAnalysis: "aiCommAnalysis", createdBy: "createdBy",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  tProjectEvidence: {
    id: "id", tProjectId: "tProjectId", meetingId: "meetingId",
    evidenceType: "evidenceType", title: "title", content: "content",
    metadata: "metadata", recordedBy: "recordedBy", createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/solution-engine-schema", () => ({
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
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  desc: vi.fn((...args: any[]) => ({ type: "desc", args })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  sql: Object.assign(vi.fn(), {
    raw: vi.fn((s: string) => s),
    join: vi.fn(),
    empty: "",
  }),
}));

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
  selectResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════

describe("meetingIntelligence router", () => {
  // ───────────────────────────────────────────────────────
  //  1. analyzeMeetingTranscript
  // ───────────────────────────────────────────────────────
  describe("analyzeMeetingTranscript", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.analyzeMeetingTranscript({
          meetingId: 1,
          transcript: "test transcript",
        })
      ).rejects.toThrow();
    });

    it("throws when meeting not found", async () => {
      const caller = createAdminCaller();
      // select returns empty (meeting not found)
      selectResultsQueue.push([]);

      await expect(
        caller.meetingIntelligence.analyzeMeetingTranscript({
          meetingId: 999,
          transcript: "test transcript",
        })
      ).rejects.toThrow("Meeting #999 not found");
    });

    it("creates AI task and returns taskId on valid input", async () => {
      const caller = createAdminCaller();
      // select returns meeting
      selectResultsQueue.push([{ id: 1, title: "M3 方案评审", status: "LIVE" }]);
      // insert returning → new AI task
      mockReturningResult = [{ id: 42, taskType: "MEETING_TRANSCRIPT_ANALYSIS", status: "pending" }];

      const result = await caller.meetingIntelligence.analyzeMeetingTranscript({
        meetingId: 1,
        transcript: "客户反映清洁度不达标，存在痛点。建议调整工艺参数。",
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(42);
      expect(result.meetingId).toBe(1);
      expect(mockDb.update).toHaveBeenCalled(); // transcript saved
      expect(mockDb.insert).toHaveBeenCalled(); // task created
    });

    it("rejects empty transcript", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.meetingIntelligence.analyzeMeetingTranscript({
          meetingId: 1,
          transcript: "",
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────
  //  2. getAnalysisStatus
  // ───────────────────────────────────────────────────────
  describe("getAnalysisStatus", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.getAnalysisStatus({ taskId: 1 })
      ).rejects.toThrow();
    });

    it("returns not_found for non-existent task", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // task not found

      const result = await caller.meetingIntelligence.getAnalysisStatus({ taskId: 999 });
      expect(result.status).toBe("not_found");
    });

    it("returns pending status without result", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 42,
        status: "pending",
        resultData: null,
        errorMessage: null,
        createdAt: "2026-03-05",
        completedAt: null,
      }]);

      const result = await caller.meetingIntelligence.getAnalysisStatus({ taskId: 42 });
      expect(result.status).toBe("pending");
      expect(result.result).toBeNull();
    });

    it("returns completed status with pain points and suggestions", async () => {
      const caller = createAdminCaller();
      const resultData = {
        meetingId: 1,
        painPoints: ["清洁度不达标"],
        suggestions: ["调整超声波频率"],
        actionItems: [{ assignee: "张工", task: "提交测试报告" }],
      };
      // First: task query
      selectResultsQueue.push([{
        id: 42,
        status: "completed",
        resultData,
        errorMessage: null,
        createdAt: "2026-03-05",
        completedAt: "2026-03-05",
      }]);
      // Second: meeting aiSummary query
      selectResultsQueue.push([{
        aiSummary: { risks: ["清洁度不达标"], decisions: ["调整参数"] },
      }]);

      const result = await caller.meetingIntelligence.getAnalysisStatus({ taskId: 42 });
      expect(result.status).toBe("completed");
      expect(result.result).toBeTruthy();
      expect(result.result!.painPoints).toEqual(["清洁度不达标"]);
      expect(result.result!.suggestions).toEqual(["调整超声波频率"]);
    });
  });

  // ───────────────────────────────────────────────────────
  //  3. iterateProposal
  // ───────────────────────────────────────────────────────
  describe("iterateProposal", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.iterateProposal({
          proposalId: 1,
          meetingFeedback: "需要改进",
        })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // proposal not found

      await expect(
        caller.meetingIntelligence.iterateProposal({
          proposalId: 999,
          meetingFeedback: "需要改进",
        })
      ).rejects.toThrow("Proposal #999 not found");
    });

    it("creates new version proposal with correct version number", async () => {
      const caller = createAdminCaller();
      const oldProposal = {
        id: 7,
        requirementId: 1,
        version: 2,
        parentProposalId: 5,
        status: "APPROVED",
        processFlow: { stages: [], totalCycleTime: 120 },
        equipmentConfig: null,
        budgetEstimate: null,
        competitorAnalysis: null,
        benchmarkProjectIds: [1, 2],
        benchmarkProjects: [],
      };

      // select returns old proposal
      selectResultsQueue.push([oldProposal]);
      // insert returning → new AI task
      mockReturningResult = [{ id: 55, taskType: "PROPOSAL_ITERATION", status: "pending" }];

      const result = await caller.meetingIntelligence.iterateProposal({
        proposalId: 7,
        meetingFeedback: "客户要求缩短节拍至60秒",
        meetingId: 42,
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(55);
      expect(result.parentProposalId).toBe(7);
      expect(result.version).toBe(3); // 2 + 1
    });

    it("rejects empty feedback", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.meetingIntelligence.iterateProposal({
          proposalId: 1,
          meetingFeedback: "",
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────
  //  4. getIterationStatus
  // ───────────────────────────────────────────────────────
  describe("getIterationStatus", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.getIterationStatus({ taskId: 1 })
      ).rejects.toThrow();
    });

    it("returns not_found for non-existent task", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);

      const result = await caller.meetingIntelligence.getIterationStatus({ taskId: 999 });
      expect(result.status).toBe("not_found");
    });

    it("returns completed status with proposal details", async () => {
      const caller = createAdminCaller();
      // task query
      selectResultsQueue.push([{
        id: 55,
        status: "completed",
        resultData: { newProposalId: 8 },
        errorMessage: null,
        createdAt: "2026-03-05",
        completedAt: "2026-03-05",
      }]);
      // proposal query
      selectResultsQueue.push([{
        id: 8,
        version: 3,
        parentProposalId: 7,
        iterationReason: "客户要求缩短节拍",
        status: "DRAFT",
        processFlow: { stages: [] },
        equipmentConfig: null,
        budgetEstimate: null,
      }]);

      const result = await caller.meetingIntelligence.getIterationStatus({ taskId: 55 });
      expect(result.status).toBe("completed");
      expect(result.proposal).toBeTruthy();
      expect(result.proposal!.version).toBe(3);
      expect(result.proposal!.status).toBe("DRAFT");
    });
  });

  // ───────────────────────────────────────────────────────
  //  5. getProposalVersionHistory
  // ───────────────────────────────────────────────────────
  describe("getProposalVersionHistory", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.getProposalVersionHistory({ requirementId: 1 })
      ).rejects.toThrow();
    });

    it("returns version chain ordered by version desc", async () => {
      const caller = createAdminCaller();
      const versions = [
        { id: 8, version: 3, parentProposalId: 7, iterationReason: "客户反馈", status: "DRAFT", createdBy: "admin", createdAt: "2026-03-05" },
        { id: 7, version: 2, parentProposalId: 5, iterationReason: "评审意见", status: "APPROVED", createdBy: "admin", createdAt: "2026-03-04" },
        { id: 5, version: 1, parentProposalId: null, iterationReason: null, status: "APPROVED", createdBy: "admin", createdAt: "2026-03-01" },
      ];
      mockQueryResult = versions;

      const result = await caller.meetingIntelligence.getProposalVersionHistory({
        requirementId: 1,
      });

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[2].parentProposalId).toBeNull();
    });

    it("returns empty array when no proposals exist", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.meetingIntelligence.getProposalVersionHistory({
        requirementId: 999,
      });

      expect(result).toEqual([]);
    });

    it("respects custom limit", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [{ id: 1, version: 1 }];

      const result = await caller.meetingIntelligence.getProposalVersionHistory({
        requirementId: 1,
        limit: 5,
      });

      expect(result).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────
  //  6. submitCustomerFeedback
  // ───────────────────────────────────────────────────────
  describe("submitCustomerFeedback", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.submitCustomerFeedback({
          projectId: 1,
          feedbackType: "pain_point",
          content: "清洁度不达标",
        })
      ).rejects.toThrow();
    });

    it("creates feedback and returns feedbackId", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [{ id: 101, projectId: 1, feedbackType: "pain_point" }];

      const result = await caller.meetingIntelligence.submitCustomerFeedback({
        projectId: 1,
        meetingId: 5,
        feedbackType: "budget_signal",
        content: "预算超出 20%",
        severity: "high",
      });

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBe(101);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects empty content", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.meetingIntelligence.submitCustomerFeedback({
          projectId: 1,
          feedbackType: "objection",
          content: "",
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────
  //  7. getProjectFeedback
  // ───────────────────────────────────────────────────────
  describe("getProjectFeedback", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.getProjectFeedback({ projectId: 1 })
      ).rejects.toThrow();
    });

    it("returns feedback list for project", async () => {
      const caller = createAdminCaller();
      const feedbacks = [
        { id: 1, projectId: 1, feedbackType: "pain_point", content: "问题1", severity: "high" },
        { id: 2, projectId: 1, feedbackType: "budget_signal", content: "预算变更", severity: "medium" },
      ];
      mockQueryResult = feedbacks;

      const result = await caller.meetingIntelligence.getProjectFeedback({ projectId: 1 });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no feedback", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.meetingIntelligence.getProjectFeedback({ projectId: 999 });
      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────
  //  8. getProposalDiff
  // ───────────────────────────────────────────────────────
  describe("getProposalDiff", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.getProposalDiff({ oldProposalId: 1, newProposalId: 2 })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // old not found
      selectResultsQueue.push([]); // new not found

      await expect(
        caller.meetingIntelligence.getProposalDiff({ oldProposalId: 999, newProposalId: 998 })
      ).rejects.toThrow("One or both proposals not found");
    });

    it("returns diff structure for valid proposals", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 1, version: 1, processFlow: { stages: [], totalCycleTime: 120 },
        equipmentConfig: { mainEquipment: [] }, budgetEstimate: { equipmentCost: { min: 100 } },
        iterationReason: null,
      }]);
      selectResultsQueue.push([{
        id: 2, version: 2, processFlow: { stages: [], totalCycleTime: 90 },
        equipmentConfig: { mainEquipment: [] }, budgetEstimate: { equipmentCost: { min: 150 } },
        iterationReason: "优化节拍",
      }]);

      const result = await caller.meetingIntelligence.getProposalDiff({
        oldProposalId: 1,
        newProposalId: 2,
      });

      expect(result.oldVersion).toBe(1);
      expect(result.newVersion).toBe(2);
      expect(result.processFlowDiff).toBeTruthy();
      expect(result.equipmentConfigDiff).toBeTruthy();
      expect(result.budgetEstimateDiff).toBeTruthy();
      expect(result.iterationReason).toBe("优化节拍");
    });
  });

  // ───────────────────────────────────────────────────────
  //  9. confirmIteration
  // ───────────────────────────────────────────────────────
  describe("confirmIteration", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.confirmIteration({
          proposalId: 2,
          acceptFields: ["processFlow"],
          parentProposalId: 1,
        })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // new not found
      selectResultsQueue.push([]); // old not found

      await expect(
        caller.meetingIntelligence.confirmIteration({
          proposalId: 999,
          acceptFields: ["processFlow"],
          parentProposalId: 998,
        })
      ).rejects.toThrow("Proposal not found");
    });

    it("selectively merges accepted fields", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{
        id: 2, processFlow: { new: true }, equipmentConfig: { new: true }, budgetEstimate: { new: true },
      }]);
      selectResultsQueue.push([{
        id: 1, processFlow: { old: true }, equipmentConfig: { old: true }, budgetEstimate: { old: true },
      }]);

      const result = await caller.meetingIntelligence.confirmIteration({
        proposalId: 2,
        acceptFields: ["processFlow"], // only accept processFlow, revert others
        parentProposalId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("PENDING_REVIEW");
      expect(result.acceptedFields).toEqual(["processFlow"]);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────
  //  10. pushToM3
  // ───────────────────────────────────────────────────────
  describe("pushToM3", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.pushToM3({ proposalId: 1 })
      ).rejects.toThrow();
    });

    it("throws when proposal not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // not found

      await expect(
        caller.meetingIntelligence.pushToM3({ proposalId: 999 })
      ).rejects.toThrow("Proposal #999 not found");
    });

    it("rejects non-APPROVED proposals", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, status: "DRAFT", version: 1 }]);

      await expect(
        caller.meetingIntelligence.pushToM3({ proposalId: 1 })
      ).rejects.toThrow("Only APPROVED proposals can be pushed to M3");
    });

    it("pushes APPROVED proposal to M3", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 5, status: "APPROVED", version: 3 }]);

      const result = await caller.meetingIntelligence.pushToM3({ proposalId: 5 });

      expect(result.success).toBe(true);
      expect(result.status).toBe("PUSHED_TO_M3");
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════
  //  T-Project Numbering System Tests
  // ═══════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────
  //  11. createTProject
  // ───────────────────────────────────────────────────────
  describe("createTProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.createTProject({ displayName: "Test" })
      ).rejects.toThrow();
    });

    it("creates T-project with auto-generated T-number", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // no existing for date prefix
      mockReturningResult = [{ id: 1, tNumber: "T26030601" }];

      const result = await caller.meetingIntelligence.createTProject({
        displayName: "某客户项目",
        customerName: "客户A",
      });

      expect(result.success).toBe(true);
      expect(result.tProjectId).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("generates sequential number when projects exist", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([
        { id: 1, tNumber: "T26030601" },
        { id: 2, tNumber: "T26030602" },
      ]);
      mockReturningResult = [{ id: 3, tNumber: "T26030603" }];

      const result = await caller.meetingIntelligence.createTProject({
        displayName: "第三个项目",
      });

      expect(result.success).toBe(true);
      expect(result.tProjectId).toBe(3);
    });
  });

  // ───────────────────────────────────────────────────────
  //  12. listTProjects
  // ───────────────────────────────────────────────────────
  describe("listTProjects", () => {
    it("returns list of T-projects", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { id: 1, tNumber: "T26030601", displayName: "项目A", status: "INQUIRY" },
        { id: 2, tNumber: "T26030602", displayName: "项目B", status: "NEGOTIATING" },
      ];

      const result = await caller.meetingIntelligence.listTProjects();
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no T-projects", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.meetingIntelligence.listTProjects();
      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────
  //  13. assignMeetingToTProject
  // ───────────────────────────────────────────────────────
  describe("assignMeetingToTProject", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.assignMeetingToTProject({ meetingId: 1, tProjectId: 1 })
      ).rejects.toThrow();
    });

    it("throws when T-project not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // t-project not found

      await expect(
        caller.meetingIntelligence.assignMeetingToTProject({ meetingId: 1, tProjectId: 999 })
      ).rejects.toThrow("T-Project #999 not found");
    });

    it("links meeting to T-project", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, tNumber: "T26030601" }]); // t-project
      selectResultsQueue.push([{ id: 5, title: "Meeting" }]); // meeting

      const result = await caller.meetingIntelligence.assignMeetingToTProject({
        meetingId: 5,
        tProjectId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.tNumber).toBe("T26030601");
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────
  //  14. convertToGRT
  // ───────────────────────────────────────────────────────
  describe("convertToGRT", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.convertToGRT({ tProjectId: 1, projectName: "P", customerId: 1 })
      ).rejects.toThrow();
    });

    it("throws when T-project already converted", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, tNumber: "T26030601", status: "CONVERTED", grtNumber: "GRT-600" }]);

      await expect(
        caller.meetingIntelligence.convertToGRT({ tProjectId: 1, projectName: "P", customerId: 1 })
      ).rejects.toThrow("already converted");
    });

    it("converts T-project to GRT number", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, tNumber: "T26030601", status: "ORDER_RECEIVED" }]); // t-project
      selectResultsQueue.push([{ id: 10, prefix: "GRT", nextAvailable: 602, currentMax: 601 }]); // counter
      mockReturningResult = [{ id: 100, projectCode: "GRT-602", projectName: "正式项目" }]; // projectsV2

      const result = await caller.meetingIntelligence.convertToGRT({
        tProjectId: 1,
        projectName: "正式项目",
        customerId: 42,
      });

      expect(result.success).toBe(true);
      expect(result.grtNumber).toBe("GRT-602");
      expect(result.formalProjectId).toBe(100);
    });
  });

  // ───────────────────────────────────────────────────────
  //  15. recordEvidence
  // ───────────────────────────────────────────────────────
  describe("recordEvidence", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.recordEvidence({
          tProjectId: 1, evidenceType: "communication_record", title: "T", content: "C",
        })
      ).rejects.toThrow();
    });

    it("records evidence successfully", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, tNumber: "T26030601" }]); // t-project found
      mockReturningResult = [{ id: 50, tProjectId: 1, evidenceType: "communication_record" }];

      const result = await caller.meetingIntelligence.recordEvidence({
        tProjectId: 1,
        meetingId: 5,
        evidenceType: "communication_record",
        title: "技术交流纪要",
        content: "客户需求记录...",
      });

      expect(result.success).toBe(true);
      expect(result.evidenceId).toBe(50);
    });

    it("throws when T-project not found", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]); // not found

      await expect(
        caller.meetingIntelligence.recordEvidence({
          tProjectId: 999, evidenceType: "technical_note", title: "T", content: "C",
        })
      ).rejects.toThrow("T-Project #999 not found");
    });
  });

  // ───────────────────────────────────────────────────────
  //  16. getProjectEvidence
  // ───────────────────────────────────────────────────────
  describe("getProjectEvidence", () => {
    it("returns evidence list for T-project", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { id: 1, tProjectId: 1, evidenceType: "communication_record", title: "记录1" },
        { id: 2, tProjectId: 1, evidenceType: "technical_note", title: "记录2" },
      ];

      const result = await caller.meetingIntelligence.getProjectEvidence({ tProjectId: 1 });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no evidence", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.meetingIntelligence.getProjectEvidence({ tProjectId: 999 });
      expect(result).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────
  //  17. analyzeCommStrategy
  // ───────────────────────────────────────────────────────
  describe("analyzeCommStrategy", () => {
    it("rejects anonymous access", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.meetingIntelligence.analyzeCommStrategy({
          tProjectId: 1, communicationNotes: "notes",
        })
      ).rejects.toThrow();
    });

    it("creates AI task for comm analysis", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ id: 1, tNumber: "T26030601", customerName: "客户" }]); // t-project
      mockReturningResult = [{ id: 99, taskType: "COMM_STRATEGY_ANALYSIS", status: "pending" }];

      const result = await caller.meetingIntelligence.analyzeCommStrategy({
        tProjectId: 1,
        communicationNotes: "客户沟通记录...",
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(99);
    });
  });
});

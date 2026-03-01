/**
 * ProjectGate Router — Comprehensive Automated Test Suite
 * Covers all 16 procedures: stage definitions, project stages, gate checklist,
 * gate pass workflow, red-blue confrontation, V2 phase management, stats & history.
 *
 * Run: pnpm test -- server/routers/projectGate.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
// Shared mutable results that each test can override before calling.
// For tests that need different results on successive select() calls,
// push multiple entries to `selectResultsQueue`. When the queue is empty,
// fallback to `mockQueryResult`.
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  // Thenable: await db.select().from(x).where(y) resolves mockQueryResult
  chain.then = (resolve: any, reject?: any) => {
    try {
      resolve(mockQueryResult);
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    return {
      select: vi.fn(() => {
        const chain = createMockDbChain();
        // If the queue has entries, use the next one instead of the default
        if (selectResultsQueue.length > 0) {
          const nextResult = selectResultsQueue.shift()!;
          chain.then = (resolve: any) => resolve(nextResult);
        }
        return chain;
      }),
      insert: vi.fn(() => createMockDbChain()),
      update: vi.fn(() => {
        const chain = createMockDbChain();
        if (selectResultsQueue.length > 0) {
          const nextResult = selectResultsQueue.shift()!;
          chain.then = (resolve: any) => resolve(nextResult);
        }
        return chain;
      }),
      delete: vi.fn(() => createMockDbChain()),
    };
  }),
}));

// ─── Mock schema tables (column refs only) ───────────────────────────
vi.mock("../../drizzle/schema", () => ({
  projects: {
    id: "id", name: "name", projectCode: "projectCode", currentPhase: "currentPhase",
    createdAt: "createdAt", status: "status", completionPercent: "completionPercent",
    managerId: "managerId", plannedStartDate: "plannedStartDate",
    plannedEndDate: "plannedEndDate", actualStartDate: "actualStartDate",
    actualEndDate: "actualEndDate", updatedAt: "updatedAt",
  },
  projectGates: {
    id: "id", projectId: "projectId", phaseCode: "phaseCode", status: "status",
    name: "name", remark: "remark", version: "version", actualDate: "actualDate",
    approverId: "approverId", approvalComment: "approvalComment",
    attachments: "attachments", updatedAt: "updatedAt", plannedDate: "plannedDate",
    checklistCompleted: "checklistCompleted", checklistTotal: "checklistTotal",
  },
  projectMilestones: { id: "id" },
  projectsV2: { id: "id", currentStage: "currentStage", updatedAt: "updatedAt" },
  projectStagesV2: {
    projectId: "projectId", stageCode: "stageCode", status: "status",
    completionPercent: "completionPercent", actualEndDate: "actualEndDate",
    auditLog: "auditLog", updatedAt: "updatedAt", actualStartDate: "actualStartDate",
    stageName: "stageName", plannedStartDate: "plannedStartDate",
    plannedEndDate: "plannedEndDate",
  },
  gateChecklists: {
    id: "id", projectId: "projectId", gateStage: "gateStage",
    checkItem: "checkItem", category: "category", isMandatory: "isMandatory",
    status: "status", verifiedBy: "verifiedBy", verifiedAt: "verifiedAt",
    notes: "notes", sortOrder: "sortOrder", updatedAt: "updatedAt",
  },
  afterSalesClients: { id: "id", name: "name" },
  afterSalesEquipments: { id: "id" },
}));

vi.mock("../../drizzle/approval-engine-schema", () => ({
  redBlueConfigs: {
    id: "id", projectId: "projectId", configCode: "configCode",
    configName: "configName", results: "results", status: "status",
    lessonsLearned: "lessonsLearned", redTeamLeaderName: "redTeamLeaderName",
    blueTeamLeaderName: "blueTeamLeaderName", createdAt: "createdAt",
    redTeamLeaderId: "redTeamLeaderId", blueTeamLeaderId: "blueTeamLeaderId",
    redTeamObjectives: "redTeamObjectives", createdBy: "createdBy",
    updatedAt: "updatedAt",
  },
  redBlueExecutions: { id: "id" },
}));

vi.mock("../../drizzle/performance-schema", () => ({
  violationEvents: {
    id: "id", projectId: "projectId", eventType: "eventType",
    severity: "severity", sourceModule: "sourceModule", title: "title",
    description: "description", status: "status",
  },
}));

// Mock drizzle-orm operators to pass through (they just return the value)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn((col: any) => col),
  sql: Object.assign(vi.fn((...args: any[]) => args), {
    raw: vi.fn((s: string) => s),
  }),
  lt: vi.fn((...args: any[]) => args),
  gte: vi.fn((...args: any[]) => args),
  ne: vi.fn((...args: any[]) => args),
  inArray: vi.fn((...args: any[]) => args),
}));

// ─── Import test utilities ──────────────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// =====================================================================
// TESTS
// =====================================================================

beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
  vi.clearAllMocks();
});

// ─── 1. getStageDefinitions ─────────────────────────────────────────
describe("projectGate.getStageDefinitions", () => {
  it("returns exactly 13 M-stage definitions (M0-M12)", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getStageDefinitions();
    expect(result).toHaveLength(13);
  });

  it("each definition has code, nameZh, nameEn, category, description, requiredDeliverables", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getStageDefinitions();
    for (const def of result) {
      expect(def).toHaveProperty("code");
      expect(def).toHaveProperty("nameZh");
      expect(def).toHaveProperty("nameEn");
      expect(def).toHaveProperty("category");
      expect(def).toHaveProperty("description");
      expect(def).toHaveProperty("requiredDeliverables");
      expect(Array.isArray(def.requiredDeliverables)).toBe(true);
    }
  });

  it("stages are ordered M0 through M12", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getStageDefinitions();
    const codes = result.map((d: any) => d.code);
    expect(codes).toEqual([
      "M0", "M1", "M2", "M3", "M4", "M5", "M6",
      "M7", "M8", "M9", "M10", "M11", "M12",
    ]);
  });
});

// ─── 2. getProjectStages ────────────────────────────────────────────
describe("projectGate.getProjectStages", () => {
  it("returns project list with stage info", async () => {
    mockQueryResult = [
      {
        id: 1, name: "TestProject", projectCode: "PRJ-001",
        currentPhase: "M3", status: "active", completionPercent: 40,
        managerId: 5, plannedStartDate: "2026-01-01", plannedEndDate: "2026-12-31",
        actualStartDate: "2026-01-15", actualEndDate: null, createdAt: "2026-01-01",
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getProjectStages({});

    expect(result).toHaveLength(1);
    expect(result[0].projectName).toBe("TestProject");
    expect(result[0].projectNo).toBe("PRJ-001");
    expect(result[0].currentStage).toBe("M3");
    expect(result[0].stages).toHaveLength(13);
  });

  it("returns empty array when no projects exist", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getProjectStages({});
    expect(result).toEqual([]);
  });

  it("computes stageProgress from currentPhase index", async () => {
    mockQueryResult = [
      {
        id: 2, name: "Proj", projectCode: "P-2", currentPhase: "M6",
        status: "active", completionPercent: 60, managerId: null,
        plannedStartDate: null, plannedEndDate: null,
        actualStartDate: null, actualEndDate: null, createdAt: "2026-01-01",
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getProjectStages({});
    // M6 is index 6; progress = round(6/12 * 100) = 50
    expect(result[0].stageProgress).toBe(50);
  });
});

// ─── 3. getProjectStageDetail ───────────────────────────────────────
describe("projectGate.getProjectStageDetail", () => {
  it("returns detail for specific project", async () => {
    mockQueryResult = [
      {
        id: 10, name: "DetailProject", projectCode: "DET-10",
        currentPhase: "M5", status: "active", completionPercent: 50,
        managerId: 3, plannedStartDate: "2026-02-01",
        plannedEndDate: "2026-11-30", actualStartDate: "2026-02-10",
        actualEndDate: null, createdAt: "2026-02-01",
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getProjectStageDetail({ projectId: 10 });

    expect(result.projectId).toBe(10);
    expect(result.projectName).toBe("DetailProject");
    expect(result.currentStage).toBe("M5");
    expect(result.stages).toHaveLength(13);
    // M5 stage should have enriched definition fields
    const m5 = result.stages.find((s: any) => s.code === "M5");
    expect(m5).toBeDefined();
    expect(m5!.nameZh).toBe("生产启动");
    expect(m5!.nameEn).toBe("Production Start");
    expect(m5!.category).toBe("EXECUTION");
  });

  it("throws when project not found", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.getProjectStageDetail({ projectId: 999 })
    ).rejects.toThrow("项目不存在");
  });
});

// ─── 4. getGateChecklist ────────────────────────────────────────────
describe("projectGate.getGateChecklist", () => {
  it("returns formatted checklist items", async () => {
    mockQueryResult = [
      {
        id: 100, projectId: 1, gateStage: "M4", checkItem: "设计评审报告",
        category: "DESIGN", isMandatory: true, status: "verified",
        verifiedBy: 5, verifiedAt: "2026-03-01T10:00:00Z", notes: "已审核",
        sortOrder: 1,
      },
      {
        id: 101, projectId: 1, gateStage: "M4", checkItem: "BOM清单",
        category: null, isMandatory: false, status: "not_started",
        verifiedBy: null, verifiedAt: null, notes: null, sortOrder: 2,
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getGateChecklist({
      projectId: 1,
      stageCode: "M4",
    });

    expect(result).toHaveLength(2);
    // First item: verified -> PASSED
    expect(result[0].status).toBe("PASSED");
    expect(result[0].checkItem).toBe("设计评审报告");
    expect(result[0].category).toBe("DESIGN");
    expect(result[0].isRequired).toBe(true);
    expect(result[0].checkedBy).toBe("用户5");
    expect(result[0].checkedAt).toBe("2026-03-01");
    expect(result[0].evidence).toBe("已审核");

    // Second item: not_started -> NOT_STARTED
    expect(result[1].status).toBe("NOT_STARTED");
    expect(result[1].category).toBe("GENERAL"); // null defaults to GENERAL
    expect(result[1].checkedBy).toBeNull();
  });
});

// ─── 5. updateChecklistItem ─────────────────────────────────────────
describe("projectGate.updateChecklistItem", () => {
  it("updates status and returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.updateChecklistItem({
      checklistId: 100,
      status: "PASSED",
      evidence: "Verified by QA",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("检查项状态已更新");
  });

  it("maps WAIVED status to waived in DB", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.updateChecklistItem({
      checklistId: 101,
      status: "WAIVED",
      notes: "Customer waiver obtained",
    });
    expect(result.success).toBe(true);
  });
});

// ─── 6. requestGatePass ─────────────────────────────────────────────
describe("projectGate.requestGatePass", () => {
  it("creates new gate record when none exists", async () => {
    // First query (existing check) returns empty, then insert returns new record
    mockQueryResult = [];
    mockReturningResult = [{ id: 42 }];

    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.requestGatePass({
      projectId: 1,
      stageCode: "M3",
      summary: "All deliverables ready",
      attachments: ["file1.pdf"],
    });
    expect(result.success).toBe(true);
    expect(result.requestId).toBe(42);
    expect(result.message).toBe("门禁通过申请已提交");
  });

  it("updates existing gate record to in_review", async () => {
    // First query finds existing gate
    mockQueryResult = [{ id: 10, projectId: 1, phaseCode: "M3", status: "pending" }];

    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.requestGatePass({
      projectId: 1,
      stageCode: "M3",
      summary: "Re-submitting after fixes",
    });
    expect(result.success).toBe(true);
    expect(result.requestId).toBe(10);
  });
});

// ─── 7. approveGatePass ─────────────────────────────────────────────
describe("projectGate.approveGatePass", () => {
  it("approves gate and returns success", async () => {
    // Version check returns matching version, gate fetch returns in_review gate,
    // checklist returns no mandatory items, update+returning succeeds
    mockQueryResult = [
      { id: 5, projectId: 1, phaseCode: "M3", status: "in_review", remark: "[REQ:99] Summary", version: 1 },
    ];
    mockReturningResult = [
      { id: 5, projectId: 1, phaseCode: "M3", status: "approved", version: 2 },
    ];

    const caller = createAuthenticatedCaller({ id: 2 }); // different from REQ:99
    const result = await caller.projectGate.approveGatePass({
      requestId: 5,
      approved: true,
      score: 90,
      comments: "Looks good",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("门禁已批准通过");
  });

  it("rejects gate with comments", async () => {
    mockQueryResult = [
      { id: 6, projectId: 2, phaseCode: "M5", status: "in_review", remark: "[REQ:99] Test", version: 1 },
    ];
    mockReturningResult = [
      { id: 6, projectId: 2, phaseCode: "M5", status: "rejected", version: 2 },
    ];

    const caller = createAuthenticatedCaller({ id: 3 });
    const result = await caller.projectGate.approveGatePass({
      requestId: 6,
      approved: false,
      comments: "Design issues found",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("门禁申请已退回");
  });

  it("throws NOT_FOUND when gate does not exist", async () => {
    mockQueryResult = [];

    const caller = createAuthenticatedCaller({ id: 2 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 999,
        approved: true,
      })
    ).rejects.toThrow("Gate record not found");
  });

  it("throws BAD_REQUEST on wrong status (not in_review/pending)", async () => {
    mockQueryResult = [
      { id: 7, projectId: 1, phaseCode: "M4", status: "approved", remark: "[REQ:99]", version: 1 },
    ];

    const caller = createAuthenticatedCaller({ id: 2 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 7,
        approved: true,
      })
    ).rejects.toThrow("无法审批");
  });

  it("prevents self-approval when [REQ:N] matches user id", async () => {
    mockQueryResult = [
      { id: 8, projectId: 1, phaseCode: "M4", status: "in_review", remark: "[REQ:1] My request", version: 1 },
    ];

    // Default user id is 1, matching [REQ:1]
    const caller = createAuthenticatedCaller({ id: 1 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 8,
        approved: true,
      })
    ).rejects.toThrow("不能审批自己提交的门禁申请");
  });

  it("blocks approval when mandatory checklist items are failed", async () => {
    // approveGatePass (no expectedVersion) calls:
    //   1. db.select() — gate fetch
    //   2. db.select() — checklist items (since approved=true)
    selectResultsQueue = [
      // 1st select: gate record
      [{
        id: 9, projectId: 1, phaseCode: "M4", status: "in_review",
        remark: "[REQ:99] Ready", version: 1,
      }],
      // 2nd select: checklist with a failed mandatory item
      [
        { id: 200, projectId: 1, gateStage: "M4", checkItem: "设计报告", isMandatory: true, status: "failed" },
        { id: 201, projectId: 1, gateStage: "M4", checkItem: "BOM确认", isMandatory: true, status: "verified" },
      ],
    ];

    const caller = createAuthenticatedCaller({ id: 2 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 9,
        approved: true,
      })
    ).rejects.toThrow("必填检查项未通过");
  });

  it("blocks approval when mandatory checklist items are pending", async () => {
    selectResultsQueue = [
      // 1st select: gate record
      [{
        id: 11, projectId: 1, phaseCode: "M4", status: "in_review",
        remark: "[REQ:99] Ready", version: 1,
      }],
      // 2nd select: checklist with a pending mandatory item
      [
        { id: 300, projectId: 1, gateStage: "M4", checkItem: "验收条件", isMandatory: true, status: "not_started" },
      ],
    ];

    const caller = createAuthenticatedCaller({ id: 2 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 11,
        approved: true,
      })
    ).rejects.toThrow("必填检查项尚未完成验证");
  });

  it("throws CONFLICT on version mismatch (optimistic lock)", async () => {
    mockQueryResult = [{ version: 5 }]; // DB version is 5

    const caller = createAuthenticatedCaller({ id: 2 });
    await expect(
      caller.projectGate.approveGatePass({
        requestId: 12,
        expectedVersion: 3, // Client expects 3, DB has 5
        approved: true,
      })
    ).rejects.toThrow("版本冲突");
  });
});

// ─── 8. Red-Blue Confrontation ──────────────────────────────────────
describe("projectGate.getRedBlueRecords", () => {
  it("returns formatted red-blue records", async () => {
    mockQueryResult = [
      {
        id: 50, projectId: 1, configCode: "RB-1-M4",
        configName: "M4 红蓝对抗", status: "completed",
        redTeamLeaderName: "张三", blueTeamLeaderName: "李四",
        redTeamLeaderId: 10, blueTeamLeaderId: 11,
        results: { stageCode: "M4", redTeamFindings: ["Issue A"], blueTeamResponses: ["Fix A"], overallScore: 85 },
        lessonsLearned: "Good design review",
        createdAt: "2026-03-01T08:00:00Z",
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getRedBlueRecords({ projectId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(50);
    expect(result[0].redTeamLeader).toBe("张三");
    expect(result[0].blueTeamLeader).toBe("李四");
    expect(result[0].status).toBe("COMPLETED");
    expect(result[0].overallScore).toBe(85);
    expect(result[0].redTeamFindings).toEqual(["Issue A"]);
    expect(result[0].recommendation).toBe("Good design review");
  });
});

describe("projectGate.createRedBlueSession", () => {
  it("creates session and returns sessionId", async () => {
    mockReturningResult = [{ id: 77 }];

    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.createRedBlueSession({
      projectId: 1,
      stageCode: "M4",
      redTeamLeader: "张三",
      blueTeamLeader: "李四",
      scheduledDate: "2026-04-01",
      objectives: ["Review design", "Challenge assumptions"],
    });
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(77);
    expect(result.message).toBe("红蓝对抗会议已创建");
  });
});

describe("projectGate.recordRedBlueResult", () => {
  it("records results and returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.recordRedBlueResult({
      sessionId: 77,
      redTeamFindings: ["Found risk A", "Found risk B"],
      blueTeamResponses: ["Mitigated A", "Accepted B"],
      overallScore: 78,
      recommendation: "Proceed with caution",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("红蓝对抗结果已记录");
  });
});

// ─── 9. validateGateReadiness ───────────────────────────────────────
describe("projectGate.validateGateReadiness", () => {
  it("returns canAdvance=true when all mandatory items are verified", async () => {
    mockQueryResult = [
      { id: 1, isMandatory: true, status: "verified", checkItem: "A" },
      { id: 2, isMandatory: true, status: "waived", checkItem: "B" },
      { id: 3, isMandatory: false, status: "not_started", checkItem: "C" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.validateGateReadiness({
      projectId: 1,
      stageCode: "M4",
    });

    expect(result.canAdvance).toBe(true);
    expect(result.mandatoryTotal).toBe(2);
    expect(result.mandatoryPassed).toBe(2);
    expect(result.mandatoryFailed).toBe(0);
    expect(result.mandatoryPending).toBe(0);
    expect(result.optionalTotal).toBe(1);
    expect(result.completionPercent).toBe(100);
    expect(result.reasons).toHaveLength(0);
  });

  it("returns canAdvance=true when no mandatory items exist", async () => {
    mockQueryResult = [
      { id: 1, isMandatory: false, status: "not_started", checkItem: "Optional" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.validateGateReadiness({
      projectId: 1,
      stageCode: "M0",
    });
    expect(result.canAdvance).toBe(true);
    expect(result.completionPercent).toBe(100);
  });

  it("returns canAdvance=false with reasons when mandatory items failed", async () => {
    mockQueryResult = [
      { id: 1, isMandatory: true, status: "failed", checkItem: "设计报告" },
      { id: 2, isMandatory: true, status: "verified", checkItem: "BOM确认" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.validateGateReadiness({
      projectId: 1,
      stageCode: "M4",
    });

    expect(result.canAdvance).toBe(false);
    expect(result.mandatoryFailed).toBe(1);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("设计报告");
  });

  it("returns canAdvance=false with reasons when mandatory items pending", async () => {
    mockQueryResult = [
      { id: 1, isMandatory: true, status: "not_started", checkItem: "测试报告" },
      { id: 2, isMandatory: true, status: "in_progress", checkItem: "验收记录" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.validateGateReadiness({
      projectId: 1,
      stageCode: "M7",
    });

    expect(result.canAdvance).toBe(false);
    expect(result.mandatoryPending).toBe(2);
    expect(result.completionPercent).toBe(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("待验证");
  });
});

// ─── 10. advancePhaseV2 ─────────────────────────────────────────────
describe("projectGate.advancePhaseV2", () => {
  it("advances to next stage and returns audit entry", async () => {
    // advancePhaseV2 calls:
    //   1. db.select() — projectsV2 lookup
    //   2. db.select() — gateChecklists
    //   3. db.select() — current stage row for audit log
    selectResultsQueue = [
      [{ id: 1, currentStage: "M3" }],  // projectsV2
      [],                                 // gateChecklists — no mandatory items
      [{ auditLog: null }],              // current stage row
    ];

    const caller = createAuthenticatedCaller({ id: 5, name: "王工" });
    const result = await caller.projectGate.advancePhaseV2({
      projectId: 1,
      currentStageCode: "M3",
      score: 95,
      comments: "Excellent design",
    });

    expect(result.success).toBe(true);
    expect(result.previousStage).toBe("M3");
    expect(result.newStage).toBe("M4");
    expect(result.audit.type).toBe("ADVANCE");
    expect(result.audit.from).toBe("M3");
    expect(result.audit.to).toBe("M4");
    expect(result.audit.approvedBy).toBe("王工");
    expect(result.audit.score).toBe(95);
  });

  it("throws on stage mismatch (stale-race guard)", async () => {
    mockQueryResult = [{ id: 1, currentStage: "M5" }]; // DB has M5

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.advancePhaseV2({
        projectId: 1,
        currentStageCode: "M3", // Client thinks M3
      })
    ).rejects.toThrow("阶段不匹配");
  });

  it("throws on M12 (terminal stage)", async () => {
    mockQueryResult = [{ id: 1, currentStage: "M12" }];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.advancePhaseV2({
        projectId: 1,
        currentStageCode: "M12",
      })
    ).rejects.toThrow("M12 为终结阶段");
  });

  it("throws when project not found", async () => {
    mockQueryResult = [];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.advancePhaseV2({
        projectId: 999,
        currentStageCode: "M0",
      })
    ).rejects.toThrow("项目不存在");
  });

  it("blocks advance when mandatory checklist items failed", async () => {
    selectResultsQueue = [
      [{ id: 1, currentStage: "M4" }],  // projectsV2
      [{ id: 1, isMandatory: true, status: "failed", checkItem: "设计报告" }],  // checklist
    ];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.advancePhaseV2({
        projectId: 1,
        currentStageCode: "M4",
      })
    ).rejects.toThrow("必填检查项未通过");
  });

  it("blocks advance when mandatory checklist items not completed", async () => {
    selectResultsQueue = [
      [{ id: 1, currentStage: "M4" }],  // projectsV2
      [{ id: 1, isMandatory: true, status: "not_started", checkItem: "未完成项" }],  // checklist
    ];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.advancePhaseV2({
        projectId: 1,
        currentStageCode: "M4",
      })
    ).rejects.toThrow("必填检查项尚未完成");
  });
});

// ─── 11. regressPhaseV2 ─────────────────────────────────────────────
describe("projectGate.regressPhaseV2", () => {
  it("rolls back to earlier stage and returns result", async () => {
    // regressPhaseV2 from M6 to M3 calls:
    //   1. db.select() — projectsV2 lookup
    //   2-4. db.select() for intermediate stages M4, M5, M6 (3 stages between target+1 and current)
    //   5. db.select() — target stage M3
    selectResultsQueue = [
      [{ id: 1, currentStage: "M6" }],  // projectsV2
      [{ auditLog: null }],             // M4 stage row
      [{ auditLog: null }],             // M5 stage row
      [{ auditLog: null }],             // M6 stage row
      [{ auditLog: null }],             // M3 target stage row
    ];

    const caller = createAuthenticatedCaller({ id: 5, name: "赵经理" });
    const result = await caller.projectGate.regressPhaseV2({
      projectId: 1,
      targetStageCode: "M3",
      reason: "Design defect discovered during production",
    });

    expect(result.success).toBe(true);
    expect(result.previousStage).toBe("M6");
    expect(result.newStage).toBe("M3");
    expect(result.reason).toBe("Design defect discovered during production");
  });

  it("throws when target stage >= current stage", async () => {
    mockQueryResult = [{ id: 1, currentStage: "M4" }];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.regressPhaseV2({
        projectId: 1,
        targetStageCode: "M5", // target M5 is after current M4
        reason: "Testing",
      })
    ).rejects.toThrow("必须在当前阶段");
  });

  it("throws when target equals current stage", async () => {
    mockQueryResult = [{ id: 1, currentStage: "M4" }];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.regressPhaseV2({
        projectId: 1,
        targetStageCode: "M4", // same as current
        reason: "Testing",
      })
    ).rejects.toThrow("必须在当前阶段");
  });

  it("throws when project not found", async () => {
    mockQueryResult = [];

    const caller = createAuthenticatedCaller();
    await expect(
      caller.projectGate.regressPhaseV2({
        projectId: 999,
        targetStageCode: "M0",
        reason: "Rollback",
      })
    ).rejects.toThrow("项目不存在");
  });
});

// ─── 12. getPhaseTransitionHistory ──────────────────────────────────
describe("projectGate.getPhaseTransitionHistory", () => {
  it("returns stages with parsed audit events", async () => {
    const auditEvents = [
      { type: "ADVANCE", from: "M0", to: "M1", approvedBy: "Admin", timestamp: "2026-01-15" },
      { type: "ADVANCE", from: "M1", to: "M2", approvedBy: "Admin", timestamp: "2026-02-01" },
    ];
    mockQueryResult = [
      {
        stageCode: "M0", stageName: "项目启动", status: "Completed",
        completionPercent: 100, plannedStartDate: "2026-01-01",
        plannedEndDate: "2026-01-15", actualStartDate: "2026-01-01",
        actualEndDate: "2026-01-14", auditLog: JSON.stringify(auditEvents),
      },
      {
        stageCode: "M1", stageName: null, status: "InProgress",
        completionPercent: 50, plannedStartDate: "2026-01-15",
        plannedEndDate: "2026-02-01", actualStartDate: "2026-01-16",
        actualEndDate: null, auditLog: null,
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getPhaseTransitionHistory({ projectId: 1 });

    expect(result).toHaveLength(2);
    // First stage has parsed audit events
    expect(result[0].stageCode).toBe("M0");
    expect(result[0].stageName).toBe("项目启动");
    expect(result[0].auditEvents).toHaveLength(2);
    expect(result[0].auditEvents[0].type).toBe("ADVANCE");
    // Second stage: null stageName falls back to M_STAGE_DEFINITIONS
    expect(result[1].stageName).toBe("启动会"); // M1 nameZh
    expect(result[1].auditEvents).toHaveLength(0); // null auditLog -> empty array
  });
});

// ─── 13. getStageStats ──────────────────────────────────────────────
describe("projectGate.getStageStats", () => {
  it("returns aggregated project statistics", async () => {
    mockQueryResult = [
      { id: 1, currentPhase: "M3", status: "active", completionPercent: 60 },
      { id: 2, currentPhase: "M3", status: "active", completionPercent: 40 },
      { id: 3, currentPhase: "M7", status: "active", completionPercent: 80 },
      { id: 4, currentPhase: "M12", status: "completed", completionPercent: 100 },
      { id: 5, currentPhase: "M1", status: "on_hold", completionPercent: 10 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getStageStats();

    expect(result.totalProjects).toBe(5);
    // M3 has 2 projects
    const m3 = result.byStage.find((s: any) => s.code === "M3");
    expect(m3!.count).toBe(2);
    // M7 has 1 project
    const m7 = result.byStage.find((s: any) => s.code === "M7");
    expect(m7!.count).toBe(1);
    // Completed count
    expect(result.byStatus.completed).toBe(1);
    // on_hold -> delayed
    expect(result.byStatus.delayed).toBe(1);
    // active with >=50 completionPercent: ids 1 (60) and 3 (80) → 2
    expect(result.byStatus.onTrack).toBe(2);
    // active with <50 and >0: id 2 (40) → 1
    expect(result.byStatus.atRisk).toBe(1);
    // avgProgress of active projects: (60+40+80)/3 = 60
    expect(result.avgProgress).toBe(60);
  });

  it("handles empty project list", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getStageStats();

    expect(result.totalProjects).toBe(0);
    expect(result.avgProgress).toBe(0);
    expect(result.byStage).toHaveLength(13);
    result.byStage.forEach((s: any) => expect(s.count).toBe(0));
  });
});

// ─── 14. getUpcomingGates ───────────────────────────────────────────
describe("projectGate.getUpcomingGates", () => {
  it("filters gates due within N days", async () => {
    const now = Date.now();
    const inThreeDays = new Date(now + 3 * 86400000).toISOString().split("T")[0];
    const inTenDays = new Date(now + 10 * 86400000).toISOString().split("T")[0];

    mockQueryResult = [
      {
        id: 20, projectId: 1, phaseCode: "M5", status: "pending",
        plannedDate: inThreeDays, checklistCompleted: 3, checklistTotal: 5,
      },
      {
        id: 21, projectId: 2, phaseCode: "M8", status: "pending",
        plannedDate: inTenDays, checklistCompleted: null, checklistTotal: null,
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getUpcomingGates({ days: 7 });

    // Only the gate due in 3 days should be included (within 7-day window)
    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe(1);
    expect(result[0].currentStage).toBe("M5");
    expect(result[0].nextStage).toBe("M6");
    expect(result[0].daysRemaining).toBeLessThanOrEqual(7);
    expect(result[0].completionRate).toBe(60); // 3/5 * 100
  });

  it("returns empty when no gates are pending", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getUpcomingGates({ days: 7 });
    expect(result).toEqual([]);
  });

  it("excludes gates with past planned dates", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    mockQueryResult = [
      {
        id: 30, projectId: 3, phaseCode: "M2", status: "pending",
        plannedDate: yesterday, checklistCompleted: 0, checklistTotal: 0,
      },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.projectGate.getUpcomingGates({ days: 7 });
    // Past gate should be filtered out (diff < 0)
    expect(result).toHaveLength(0);
  });
});

// ─── 15. Auth ───────────────────────────────────────────────────────
describe("projectGate auth", () => {
  it("anonymous caller is rejected for getStageDefinitions", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.projectGate.getStageDefinitions()).rejects.toThrow();
  });

  it("anonymous caller is rejected for getProjectStages", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.projectGate.getProjectStages({})).rejects.toThrow();
  });

  it("anonymous caller is rejected for approveGatePass", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.projectGate.approveGatePass({ requestId: 1, approved: true })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for advancePhaseV2", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.projectGate.advancePhaseV2({ projectId: 1, currentStageCode: "M0" })
    ).rejects.toThrow();
  });

  it("anonymous caller is rejected for regressPhaseV2", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.projectGate.regressPhaseV2({ projectId: 1, targetStageCode: "M0", reason: "test" })
    ).rejects.toThrow();
  });
});

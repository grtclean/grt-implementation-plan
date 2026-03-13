/**
 * Smart Production Scheduling Router — Unit Tests
 *
 * Covers all 4 sub-routers (~26 procedures):
 *   A: BOM工时 (8)
 *   B: 前置与物料 (6)
 *   C: 里程碑 (6)
 *   D: 智能排程 (6)
 *
 * Run: pnpm test -- server/routers/smart-production-scheduling.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  chain.then = (resolve: any, reject?: any) => {
    try {
      if (selectResultsQueue.length > 0) {
        resolve(selectResultsQueue.shift()!);
      } else {
        resolve(mockQueryResult);
      }
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    select: vi.fn(() => {
      const chain = createMockDbChain();
      if (selectResultsQueue.length > 0) {
        const nextResult = selectResultsQueue.shift()!;
        chain.then = (resolve: any) => resolve(nextResult);
      }
      return chain;
    }),
    insert: vi.fn(() => createMockDbChain()),
    update: vi.fn(() => createMockDbChain()),
    delete: vi.fn(() => createMockDbChain()),
  })),
}));

// ─── Mock schema tables ───────────────────────────────────────────────
vi.mock("../../drizzle/smart-scheduling-schema", () => ({
  schedulingBomWorkHours: {
    id: "id", projectId: "projectId", processCode: "processCode",
    bomStepId: "bomStepId", assemblyDescription: "assemblyDescription",
    bomItemIds: "bomItemIds", baseTheoryMinutes: "baseTheoryMinutes",
    difficultyFactor: "difficultyFactor", adjustedMinutes: "adjustedMinutes",
    adjustReason: "adjustReason", adjustedBy: "adjustedBy", adjustedAt: "adjustedAt",
    predecessorStepIds: "predecessorStepIds", toolsRequired: "toolsRequired",
    equipmentRequired: "equipmentRequired", skillLevelRequired: "skillLevelRequired",
    workerCount: "workerCount", materialReady: "materialReady",
    materialEarliestAvailable: "materialEarliestAvailable",
    sortOrder: "sortOrder", status: "status",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  schedulingHistoricalBenchmarks: {
    id: "id", processCode: "processCode", productCategory: "productCategory",
    avgHours: "avgHours", minHours: "minHours", maxHours: "maxHours",
    p50Hours: "p50Hours", p80Hours: "p80Hours", sampleCount: "sampleCount",
    sourceProjects: "sourceProjects", lastComputedAt: "lastComputedAt",
    createdAt: "createdAt",
  },
  schedulingMilestoneCheckpoints: {
    id: "id", projectId: "projectId", milestoneCode: "milestoneCode",
    milestoneName: "milestoneName", targetDate: "targetDate",
    baselineDate: "baselineDate", actualDate: "actualDate",
    baselineSource: "baselineSource", historicalAvgDays: "historicalAvgDays",
    historicalMinDays: "historicalMinDays", historicalMaxDays: "historicalMaxDays",
    status: "status", slackDays: "slackDays", criticalPath: "criticalPath",
    relatedProcessCodes: "relatedProcessCodes", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  processDefinitions: { id: "id", code: "code", requiredCapabilityLevel: "requiredCapabilityLevel" },
  projectProcessInstances: {
    id: "id", projectId: "projectId", processCode: "processCode",
    actualEndDate: "actualEndDate", actualDurationHours: "actualDurationHours",
    plannedStartDate: "plannedStartDate", plannedEndDate: "plannedEndDate",
    updatedAt: "updatedAt",
  },
  sopTemplates: { id: "id", processCode: "processCode", estimatedDurationMinutes: "estimatedDurationMinutes" },
  stepMaterials: {
    id: "id", bomStepId: "bomStepId", materialCode: "materialCode",
    materialName: "materialName", requiredQty: "requiredQty", availableQty: "availableQty",
  },
  users: { id: "id" },
}));

vi.mock("../../drizzle/bom-schema", () => ({
  bomItems: {
    id: "id", processCode: "processCode", materialCode: "materialCode",
    materialName: "materialName", quantity: "quantity",
  },
}));

vi.mock("../../drizzle/procurement-schema", () => ({
  purchaseOrders: {
    id: "id", poNumber: "poNumber", poDate: "poDate",
    materialCode: "materialCode", expectedDeliveryDate: "expectedDeliveryDate",
    actualDeliveryDate: "actualDeliveryDate", status: "status",
  },
}));

vi.mock("../production-steps/processSteps.service", () => ({
  T_TO_M_MAPPING: {
    T1: ["M3", "M4"], T2: ["M3", "M4"], T3: ["M5", "M6"], T4: ["M5", "M6"],
    T5: ["M6", "M7"], T6: ["M6", "M7"], T7: ["M7", "M8"], T8: ["M7", "M8"],
    T9: ["M8", "M9"], T10: ["M9"], T11: ["M9", "M10"], T12: ["M10"],
    T13: ["M10", "M11"], T14: ["M11"], T15: ["M12"],
  },
  M_TO_T_MAPPING: {
    M3: ["T1", "T2"], M4: ["T1", "T2"], M5: ["T3", "T4"], M6: ["T3", "T4", "T5", "T6"],
    M7: ["T5", "T6", "T7", "T8"], M8: ["T7", "T8", "T9"], M9: ["T9", "T10", "T11"],
    M10: ["T11", "T12", "T13"], M11: ["T13", "T14"], M12: ["T15"],
  },
}));

vi.mock("../services/scheduling.service", () => ({
  SchedulingEngine: vi.fn().mockImplementation(() => ({
    solve: vi.fn(() => ({
      jobId: "job-1",
      scheduledTasks: [{ taskId: "1", scheduledStart: new Date(), scheduledEnd: new Date(), durationHours: 2, sequenceOrder: 1, changeoverTime: 0, delayPenalty: 0 }],
      totalDelay: 0,
      totalChangeoverCost: 0,
      objectiveValue: 0,
      solveTimeSeconds: 0.1,
      feasible: true,
      message: "OK",
    })),
  })),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────
import {
  createAdminCaller,
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// A: BOM Work Hours
// ═════════════════════════════════════════════════════════════════════
describe("smartProductionScheduling.bomWorkHours", () => {
  it("generateWorkHoursFromBom creates entries from BOM", async () => {
    // bomItems query → one item
    selectResultsQueue.push([{ id: 10, materialCode: "MAT-1", materialName: "Part A", quantity: "2", processCode: "T1" }]);
    // sopTemplates → found
    selectResultsQueue.push([{ id: 1, processCode: "T1", estimatedDurationMinutes: 30 }]);
    // processDefinitions
    selectResultsQueue.push([{ id: 1, code: "T1", requiredCapabilityLevel: "L2" }]);
    // existing count
    selectResultsQueue.push([{ count: 0 }]);

    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.generateWorkHoursFromBom({
      projectId: 1,
      processCode: "T1",
    });
    expect(result).toHaveProperty("projectId", 1);
    expect(result).toHaveProperty("generated");
  });

  it("generateWorkHoursFromBom handles no BOM data", async () => {
    selectResultsQueue.push([]); // no bom items
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.generateWorkHoursFromBom({
      projectId: 1,
      processCode: "T1",
    });
    expect(result.generated).toHaveLength(0);
  });

  it("getWorkHoursBreakdown returns grouped items", async () => {
    mockQueryResult = [
      { id: 1, processCode: "T1", sortOrder: 0, status: "pending", assemblyDescription: "Part A", baseTheoryMinutes: 60, adjustedMinutes: 60 },
      { id: 2, processCode: "T1", sortOrder: 1, status: "confirmed", assemblyDescription: "Part B", baseTheoryMinutes: 90, adjustedMinutes: 80 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.getWorkHoursBreakdown({ projectId: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("grouped");
  });

  it("adjustWorkHours rejects adjustment beyond ±50%", async () => {
    // existing row
    selectResultsQueue.push([{ id: 1, baseTheoryMinutes: 100 }]);
    const caller = createAdminCaller();
    await expect(
      caller.smartProductionScheduling.bomWorkHours.adjustWorkHours({
        id: 1,
        adjustedMinutes: 200, // > 150 (50% above base)
        adjustReason: "test",
      }),
    ).rejects.toThrow(/±50%/);
  });

  it("adjustWorkHours accepts valid adjustment", async () => {
    selectResultsQueue.push([{ id: 1, baseTheoryMinutes: 100 }]);
    mockReturningResult = [{ id: 1, adjustedMinutes: 120, adjustReason: "complexity" }];
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.adjustWorkHours({
      id: 1,
      adjustedMinutes: 120,
      adjustReason: "complexity",
    });
    expect(result).toHaveProperty("id", 1);
  });

  it("adjustWorkHours throws NOT_FOUND for missing entry", async () => {
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    await expect(
      caller.smartProductionScheduling.bomWorkHours.adjustWorkHours({
        id: 999,
        adjustedMinutes: 60,
        adjustReason: "test",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("batchConfirmWorkHours confirms multiple entries", async () => {
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.batchConfirmWorkHours({
      ids: [1, 2, 3],
    });
    expect(result).toHaveProperty("confirmed", 3);
  });

  it("getWorkHoursSummary returns aggregated totals", async () => {
    mockQueryResult = [
      { processCode: "T1", baseTheoryMinutes: 60, adjustedMinutes: 70, status: "confirmed" },
      { processCode: "T2", baseTheoryMinutes: 120, adjustedMinutes: null, status: "pending" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.getWorkHoursSummary({ projectId: 1 });
    expect(result).toHaveProperty("totalTheoryMinutes");
    expect(result).toHaveProperty("totalAdjustedMinutes");
    expect(result).toHaveProperty("byProcess");
    expect(result.totalItems).toBe(2);
  });

  it("autoCalculateFromSOP delegates to service", async () => {
    // SOP template found
    selectResultsQueue.push([{ id: 1, processCode: "T1", estimatedDurationMinutes: 45 }]);
    // work hours rows
    selectResultsQueue.push([{ id: 1, difficultyFactor: "1.5" }]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.autoCalculateFromSOP({
      projectId: 1,
      processCode: "T1",
    });
    expect(result).toHaveProperty("updated");
  });

  it("importHistoricalWorkHours imports from source project", async () => {
    selectResultsQueue.push([
      { id: 10, processCode: "T1", status: "confirmed", assemblyDescription: "Part A", bomStepId: 1, bomItemIds: [1], baseTheoryMinutes: 60, difficultyFactor: "1.0", adjustedMinutes: 60, predecessorStepIds: [], toolsRequired: [], equipmentRequired: null, skillLevelRequired: "L2", workerCount: 1, sortOrder: 0 },
    ]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.importHistoricalWorkHours({
      targetProjectId: 2,
      sourceProjectId: 1,
    });
    expect(result).toHaveProperty("imported", 1);
  });

  it("getWorkHoursComparison returns process-level comparison", async () => {
    // current work hours
    selectResultsQueue.push([
      { processCode: "T1", adjustedMinutes: 120, baseTheoryMinutes: 100 },
    ]);
    // benchmarks
    selectResultsQueue.push([
      { processCode: "T1", avgHours: "1.5", p50Hours: "1.4", p80Hours: "1.8" },
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.getWorkHoursComparison({ projectId: 1 });
    expect(result).toHaveProperty("comparison");
    expect(result.comparison.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// B: Resource & Material
// ═════════════════════════════════════════════════════════════════════
describe("smartProductionScheduling.resourceMaterial", () => {
  it("getResourceAvailability returns placeholder structure", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getResourceAvailability({
      processCode: "T1",
    });
    expect(result).toHaveProperty("processCode", "T1");
    expect(result).toHaveProperty("workers");
    expect(result).toHaveProperty("equipment");
  });

  it("getTaskPredecessors returns predecessor status", async () => {
    // Work hour row with predecessors
    selectResultsQueue.push([{ id: 1, predecessorStepIds: [2, 3] }]);
    // Predecessor rows
    selectResultsQueue.push([
      { id: 2, assemblyDescription: "Step A", status: "completed" },
      { id: 3, assemblyDescription: "Step B", status: "pending" },
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getTaskPredecessors({
      workHourId: 1,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("blocking", false); // completed
    expect(result[1]).toHaveProperty("blocking", true); // pending
  });

  it("getTaskPredecessors returns empty for no predecessors", async () => {
    selectResultsQueue.push([{ id: 1, predecessorStepIds: null }]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getTaskPredecessors({
      workHourId: 1,
    });
    expect(result).toHaveLength(0);
  });

  it("getMaterialReadinessWithPO returns material + PO info", async () => {
    // step_materials
    selectResultsQueue.push([
      { materialCode: "MAT-001", materialName: "Steel Plate", requiredQty: 10, availableQty: 5 },
    ]);
    // purchase_orders
    selectResultsQueue.push([
      { poNumber: "PO-001", poDate: "2026-03-01", expectedDelivery: "2026-03-15", actualDelivery: null, poStatus: "ordered" },
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getMaterialReadinessWithPO({
      bomStepId: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("shortage", 5);
    expect(result[0]).toHaveProperty("poNumber", "PO-001");
  });

  it("getMaterialReadinessWithPO handles no PO", async () => {
    selectResultsQueue.push([
      { materialCode: "MAT-002", materialName: "Bolt", requiredQty: 100, availableQty: 100 },
    ]);
    selectResultsQueue.push([]); // no PO
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getMaterialReadinessWithPO({
      bomStepId: 2,
    });
    expect(result[0].shortage).toBe(0);
    expect(result[0].poNumber).toBeNull();
  });

  it("getSchedulingConstraints returns constraint list", async () => {
    mockQueryResult = [
      { id: 1, processCode: "T1", predecessorStepIds: [2], equipmentRequired: "CNC", skillLevelRequired: "L3", materialReady: true, materialEarliestAvailable: null },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getSchedulingConstraints({ projectId: 1 });
    expect(result).toHaveProperty("constraints");
    expect(result.constraints.length).toBeGreaterThan(0);
  });

  it("getCapacityUtilization returns aggregated data", async () => {
    mockQueryResult = [
      { processCode: "T1", totalMinutes: 480, itemCount: 4 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.getCapacityUtilization();
    expect(result).toHaveProperty("utilization");
  });

  it("validateScheduleFeasibility returns feasibility result", async () => {
    mockQueryResult = [
      { id: 1, status: "confirmed", predecessorStepIds: null, materialReady: true, assemblyDescription: "Step A" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.resourceMaterial.validateScheduleFeasibility({
      projectId: 1,
      processCode: "T1",
    });
    expect(result).toHaveProperty("feasible");
    expect(result).toHaveProperty("blockers");
  });
});

// ═════════════════════════════════════════════════════════════════════
// C: Milestones
// ═════════════════════════════════════════════════════════════════════
describe("smartProductionScheduling.milestone", () => {
  it("computeHistoricalBenchmarks processes completed instances", async () => {
    // completed process instances
    selectResultsQueue.push([
      { processCode: "T1", actualDurationHours: "8", projectId: 1 },
      { processCode: "T1", actualDurationHours: "10", projectId: 2 },
    ]);
    // check existing benchmark — not found
    selectResultsQueue.push([]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.milestone.computeHistoricalBenchmarks();
    expect(result).toHaveProperty("computed");
  });

  it("computeHistoricalBenchmarks handles empty data", async () => {
    selectResultsQueue.push([]); // no completed instances
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.milestone.computeHistoricalBenchmarks({ processCode: "T99" });
    expect(result.computed).toBe(0);
  });

  it("getHistoricalBenchmarks returns items", async () => {
    mockQueryResult = [
      { id: 1, processCode: "T1", productCategory: "通用", avgHours: "8.5", sampleCount: 10 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.milestone.getHistoricalBenchmarks();
    expect(result).toHaveProperty("items");
    expect(result.items).toHaveLength(1);
  });

  it("generateMilestoneTargets creates M0-M12 checkpoints", async () => {
    // project first instance (planned start)
    selectResultsQueue.push([{ plannedStartDate: "2026-04-01T00:00:00Z" }]);
    // For each milestone's benchmark lookups → return empty
    for (let i = 0; i < 40; i++) {
      selectResultsQueue.push([]);
    }
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.milestone.generateMilestoneTargets({ projectId: 1 });
    expect(result).toHaveProperty("generated");
    expect(result.generated.length).toBe(13); // M0-M12
  });

  it("getMilestoneProgress returns milestone items", async () => {
    mockQueryResult = [
      { id: 1, milestoneCode: "M0", milestoneName: "立项", status: "completed", targetDate: "2026-03-01", actualDate: "2026-02-28" },
      { id: 2, milestoneCode: "M1", milestoneName: "需求确认", status: "on_track", targetDate: "2026-03-15", actualDate: null },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.milestone.getMilestoneProgress({ projectId: 1 });
    expect(result).toHaveProperty("items");
    expect(result.items).toHaveLength(2);
  });

  it("updateMilestoneTarget updates target date", async () => {
    mockReturningResult = [{ id: 1, targetDate: "2026-04-01", notes: "adjusted" }];
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.milestone.updateMilestoneTarget({
      id: 1,
      targetDate: "2026-04-01",
      notes: "adjusted",
    });
    expect(result).toHaveProperty("targetDate", "2026-04-01");
  });

  it("getMilestoneRiskAssessment returns risk levels", async () => {
    // milestone checkpoints
    selectResultsQueue.push([
      { id: 1, milestoneCode: "M5", milestoneName: "生产准备", status: "on_track", targetDate: "2026-05-01", actualDate: null, relatedProcessCodes: ["T3", "T4"], historicalAvgDays: "10", historicalMaxDays: "15", baselineSource: "" },
    ]);
    // benchmark for T3
    selectResultsQueue.push([{ p80Hours: "12" }]);
    // benchmark for T4
    selectResultsQueue.push([{ p80Hours: "16" }]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.milestone.getMilestoneRiskAssessment({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// D: Smart Scheduling
// ═════════════════════════════════════════════════════════════════════
describe("smartProductionScheduling.scheduling", () => {
  it("buildProjectSchedule runs solver on confirmed work hours", async () => {
    // confirmed work hours
    selectResultsQueue.push([
      { id: 1, processCode: "T1", assemblyDescription: "Part A", adjustedMinutes: 120, baseTheoryMinutes: 100, predecessorStepIds: [], skillLevelRequired: "L2", equipmentRequired: null, materialEarliestAvailable: null, status: "confirmed", sortOrder: 0 },
    ]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.scheduling.buildProjectSchedule({
      projectId: 1,
    });
    expect(result).toHaveProperty("result");
    expect(result.result).toHaveProperty("feasible");
  });

  it("buildProjectSchedule handles no confirmed tasks", async () => {
    selectResultsQueue.push([]); // no confirmed work hours
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.scheduling.buildProjectSchedule({
      projectId: 1,
    });
    expect(result.result.feasible).toBe(false);
  });

  it("getProjectGantt returns tasks and milestones", async () => {
    // tasks
    selectResultsQueue.push([
      { id: 1, processCode: "T1", assemblyDescription: "Part A", adjustedMinutes: 120, baseTheoryMinutes: 100, status: "scheduled", predecessorStepIds: [], materialReady: true, sortOrder: 0 },
    ]);
    // milestones
    selectResultsQueue.push([
      { milestoneCode: "M3", milestoneName: "设计确认", targetDate: "2026-04-01", actualDate: null, status: "on_track" },
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.scheduling.getProjectGantt({ projectId: 1 });
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("milestones");
    expect(result.tasks).toHaveLength(1);
    expect(result.milestones).toHaveLength(1);
  });

  it("getScheduleConflicts detects milestone violations", async () => {
    // at_risk/delayed milestones
    selectResultsQueue.push([
      { milestoneCode: "M5", milestoneName: "生产准备", status: "delayed" },
    ]);
    // not-ready materials
    selectResultsQueue.push([
      { id: 1 }, { id: 2 },
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.scheduling.getScheduleConflicts({ projectId: 1 });
    expect(result).toHaveProperty("conflicts");
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it("applyScheduleToProject writes back dates", async () => {
    // get work hour record
    selectResultsQueue.push([{ id: 1, processCode: "T1" }]);
    // get process instance
    selectResultsQueue.push([{ id: 10, projectId: 1, processCode: "T1" }]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.scheduling.applyScheduleToProject({
      projectId: 1,
      scheduledTasks: [{
        taskId: "1",
        scheduledStart: "2026-04-01T08:00:00Z",
        scheduledEnd: "2026-04-01T16:00:00Z",
      }],
    });
    expect(result).toHaveProperty("applied");
  });

  it("getScheduleChangeLog returns recent modifications", async () => {
    mockQueryResult = [
      { id: 1, processCode: "T1", assemblyDescription: "Part A", adjustedMinutes: 120, adjustReason: "complexity", adjustedBy: 1, adjustedAt: "2026-03-08T10:00:00Z" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.scheduling.getScheduleChangeLog({
      projectId: 1,
      limit: 10,
    });
    expect(result).toHaveProperty("changes");
    expect(result.changes).toHaveLength(1);
  });

  it("optimizeSchedule reruns solver with custom weights", async () => {
    selectResultsQueue.push([
      { id: 1, processCode: "T1", assemblyDescription: "Part A", adjustedMinutes: 120, baseTheoryMinutes: 100, predecessorStepIds: [], skillLevelRequired: "L2", equipmentRequired: null, materialEarliestAvailable: null, status: "confirmed", sortOrder: 0 },
    ]);
    const caller = createAdminCaller();
    const result = await caller.smartProductionScheduling.scheduling.optimizeSchedule({
      projectId: 1,
      delayWeight: 2,
      changeoverWeight: 0.3,
      optimizationLevel: "optimal",
    });
    expect(result).toHaveProperty("result");
  });
});

// ═════════════════════════════════════════════════════════════════════
// Permission isolation
// ═════════════════════════════════════════════════════════════════════
describe("permission isolation", () => {
  it("protected queries work for authenticated users", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.smartProductionScheduling.bomWorkHours.getWorkHoursBreakdown({ projectId: 1 });
    expect(result).toHaveProperty("items");
  });

  it("protected queries reject anonymous users", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.smartProductionScheduling.bomWorkHours.getWorkHoursBreakdown({ projectId: 1 }),
    ).rejects.toThrow();
  });
});

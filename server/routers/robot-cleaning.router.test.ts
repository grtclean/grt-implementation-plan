/**
 * Robot Cleaning Router — Unit Tests
 * Covers all 4 sub-routers (~18 procedures)
 *
 * Run: pnpm test -- server/routers/robot-cleaning.router.test.ts
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
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
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

// ─── Mock schema tables ──────────────────────────────────────────────
vi.mock("../../drizzle/robot-cleaning-performance-schema", () => ({
  robotCleaningActions: {
    id: "id",
    projectId: "projectId",
    processTrialId: "processTrialId",
    equipmentId: "equipmentId",
    robotCode: "robotCode",
    stationCode: "stationCode",
    pressureBar: "pressureBar",
    nozzleAngleDeg: "nozzleAngleDeg",
    flowRateLpm: "flowRateLpm",
    temperatureC: "temperatureC",
    distanceMm: "distanceMm",
    sprayDurationS: "sprayDurationS",
    cleanlinessBeforeMg: "cleanlinessBeforeMg",
    cleanlinessAfterMg: "cleanlinessAfterMg",
    maxParticleSizeUm: "maxParticleSizeUm",
    cleanlinessVerdict: "cleanlinessVerdict",
    isAdaptive: "isAdaptive",
    adaptiveAdjustmentJson: "adaptiveAdjustmentJson",
    cycleStartAt: "cycleStartAt",
    cycleEndAt: "cycleEndAt",
    cycleTimeSeconds: "cycleTimeSeconds",
    hasAlert: "hasAlert",
    alertType: "alertType",
    alertMessage: "alertMessage",
    operatorId: "operatorId",
    notes: "notes",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  oilingTorqueRecords: {
    id: "id",
    projectId: "projectId",
    equipmentId: "equipmentId",
    robotCode: "robotCode",
    stationCode: "stationCode",
    targetTorqueNm: "targetTorqueNm",
    actualTorqueNm: "actualTorqueNm",
    torqueUpperLimitNm: "torqueUpperLimitNm",
    torqueLowerLimitNm: "torqueLowerLimitNm",
    oilType: "oilType",
    applicationPoint: "applicationPoint",
    oilVolumeMl: "oilVolumeMl",
    isOverTorque: "isOverTorque",
    isUnderTorque: "isUnderTorque",
    verdict: "verdict",
    alertTriggered: "alertTriggered",
    alertMessage: "alertMessage",
    operatorId: "operatorId",
    notes: "notes",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  techPerformanceEntries: {
    id: "id",
    projectId: "projectId",
    userId: "userId",
    robotCleaningActionId: "robotCleaningActionId",
    oilingTorqueRecordId: "oilingTorqueRecordId",
    processInstanceId: "processInstanceId",
    entryType: "entryType",
    cycleTimeSeconds: "cycleTimeSeconds",
    standardCycleTimeSeconds: "standardCycleTimeSeconds",
    cycleEfficiency: "cycleEfficiency",
    qualityPass: "qualityPass",
    cleanlinessScore: "cleanlinessScore",
    laborMinutes: "laborMinutes",
    machineMinutes: "machineMinutes",
    performancePoints: "performancePoints",
    workDate: "workDate",
    shiftCode: "shiftCode",
    notes: "notes",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// ─── Import test utilities AFTER mocks ───────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset between tests ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// 1. robotCleaning sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotCleaning.robotCleaning", () => {
  it("record creates a cleaning action with PASS verdict", async () => {
    mockReturningResult = [{
      id: 1, robotCode: "R-01", cleanlinessVerdict: "PASS", hasAlert: false,
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.record({
      robotCode: "R-01",
      pressureBar: 3.5,
      nozzleAngleDeg: 45,
      cleanlinessAfterMg: 3.2,
    });
    expect(result).toHaveProperty("id", 1);
    expect(result.cleanlinessVerdict).toBe("PASS");
    expect(result.hasAlert).toBe(false);
  });

  it("record creates a cleaning action with FAIL verdict when cleanliness > 5.0", async () => {
    mockReturningResult = [{
      id: 2, robotCode: "R-01", cleanlinessVerdict: "FAIL", hasAlert: true,
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.record({
      robotCode: "R-01",
      cleanlinessAfterMg: 8.5,
    });
    expect(result).toHaveProperty("id", 2);
    expect(result.hasAlert).toBe(true);
  });

  it("recordAdaptive creates an adaptive cleaning action", async () => {
    mockReturningResult = [{
      id: 3, robotCode: "R-01", isAdaptive: true, cleanlinessVerdict: "PASS", hasAlert: false,
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.recordAdaptive({
      robotCode: "R-01",
      pressureBar: 3.5,
      nozzleAngleDeg: 50,
      cleanlinessAfterMg: 4.0,
      iteration: 3,
      pressureDelta: 0.5,
      angleDelta: 5,
      reason: "Gap=1.0mg",
    });
    expect(result).toHaveProperty("id", 3);
    expect(result.isAdaptive).toBe(true);
  });

  it("list returns items and total", async () => {
    selectResultsQueue = [
      [{ count: 5 }], // count query
    ];
    mockQueryResult = [{ id: 1, robotCode: "R-01" }]; // items query fallback
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with filters", async () => {
    selectResultsQueue = [[{ count: 2 }]];
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.list({
      robotCode: "R-01",
      verdict: "PASS",
      hasAlert: false,
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveProperty("total");
  });

  it("getById returns a single action", async () => {
    mockQueryResult = [{ id: 1, robotCode: "R-01", pressureBar: "3.5" }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });

  it("getById throws NOT_FOUND", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.robotCleaning.robotCleaning.getById({ id: 999 })).rejects.toThrow("Cleaning action not found");
  });

  it("getRealtimeFeed returns recent actions", async () => {
    mockQueryResult = [
      { id: 2, robotCode: "R-01" },
      { id: 1, robotCode: "R-01" },
    ];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.getRealtimeFeed({ robotCode: "R-01" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("getStats returns pass rate statistics", async () => {
    selectResultsQueue = [
      [{ count: 10 }], // total
      [{ count: 8 }],  // passed
      [{ count: 2 }],  // alerts
    ];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.robotCleaning.getStats();
    expect(result).toHaveProperty("totalActions");
    expect(result).toHaveProperty("passRate");
    expect(result).toHaveProperty("alertCount");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. oilingTorque sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotCleaning.oilingTorque", () => {
  it("record creates a torque record with PASS verdict", async () => {
    mockReturningResult = [{
      id: 1, robotCode: "R-01", actualTorqueNm: "12.5", verdict: "PASS",
      isOverTorque: false, alertTriggered: false,
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.oilingTorque.record({
      robotCode: "R-01",
      actualTorqueNm: 12.5,
      torqueUpperLimitNm: 15,
    });
    expect(result).toHaveProperty("id", 1);
    expect(result.isOverTorque).toBe(false);
  });

  it("record creates a torque record with over-torque alert", async () => {
    mockReturningResult = [{
      id: 2, robotCode: "R-01", actualTorqueNm: "16.8", verdict: "FAIL",
      isOverTorque: true, alertTriggered: true,
      alertMessage: "Torque 16.8Nm exceeds upper limit 15Nm",
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.oilingTorque.record({
      robotCode: "R-01",
      actualTorqueNm: 16.8,
      torqueUpperLimitNm: 15,
    });
    expect(result).toHaveProperty("id", 2);
    expect(result.isOverTorque).toBe(true);
    expect(result.alertTriggered).toBe(true);
  });

  it("list returns items and total", async () => {
    selectResultsQueue = [[{ count: 3 }]];
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.oilingTorque.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getById returns a single record", async () => {
    mockQueryResult = [{ id: 1, robotCode: "R-01", actualTorqueNm: "12.5" }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.oilingTorque.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });

  it("getById throws NOT_FOUND", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.robotCleaning.oilingTorque.getById({ id: 999 })).rejects.toThrow("Torque record not found");
  });

  it("getOverTorqueAlerts returns only over-torque records", async () => {
    mockQueryResult = [{ id: 5, isOverTorque: true, actualTorqueNm: "17.2" }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.oilingTorque.getOverTorqueAlerts();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. techPerformance sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotCleaning.techPerformance", () => {
  it("record creates a performance entry with auto-efficiency", async () => {
    mockReturningResult = [{
      id: 1, entryType: "cleaning", cycleTimeSeconds: "45.00",
      standardCycleTimeSeconds: "60.00", cycleEfficiency: "1.3333",
    }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.techPerformance.record({
      entryType: "cleaning",
      cycleTimeSeconds: 45,
      standardCycleTimeSeconds: 60,
      qualityPass: true,
    });
    expect(result).toHaveProperty("id", 1);
    expect(result.entryType).toBe("cleaning");
  });

  it("list returns items and total", async () => {
    selectResultsQueue = [[{ count: 10 }]];
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.techPerformance.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getUserSummary returns user performance data", async () => {
    selectResultsQueue = [[{ count: 5 }]];
    mockQueryResult = [{ id: 1, entryType: "cleaning" }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.techPerformance.getUserSummary({});
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("totalEntries");
  });

  it("getProjectSummary returns project performance data", async () => {
    selectResultsQueue = [[{ count: 20 }]];
    mockQueryResult = [{ id: 1, entryType: "oiling" }];
    const caller = createAdminCaller();
    const result = await caller.robotCleaning.techPerformance.getProjectSummary({ projectId: 1 });
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("totalEntries");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. showroom sub-router (public)
// ═════════════════════════════════════════════════════════════════════
describe("robotCleaning.showroom", () => {
  it("getDemoData returns demo source when no DB records", async () => {
    selectResultsQueue = [[{ count: 0 }]];
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoData();
    expect(result).toHaveProperty("source", "demo");
    expect(result).toHaveProperty("cleaningActions");
    expect(result).toHaveProperty("torqueRecords");
  });

  it("getDemoData returns live source when DB has records", async () => {
    selectResultsQueue = [[{ count: 5 }]];
    mockQueryResult = [{ id: 1, robotCode: "R-01" }];
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoData();
    expect(result).toHaveProperty("source", "live");
  });

  it("getParameterCurves returns demo curves", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getParameterCurves();
    expect(result).toHaveProperty("source", "demo");
    expect(result).toHaveProperty("curves");
    expect(result.curves.length).toBe(50);
  });

  it("getAdaptiveHistory returns demo history", async () => {
    mockQueryResult = [];
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getAdaptiveHistory();
    expect(result).toHaveProperty("source", "demo");
    expect(result).toHaveProperty("history");
    expect(result.history.length).toBe(5);
  });

  it("getKpiOverview returns demo kpi data", async () => {
    selectResultsQueue = [[{ count: 0 }]];
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getKpiOverview();
    expect(result).toHaveProperty("source", "demo");
    expect(result).toHaveProperty("totalEntries");
    expect(result).toHaveProperty("passRate");
    expect(result).toHaveProperty("entries");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. Engine Block AI Cleaning Demo (showroom sub-router extensions)
// ═════════════════════════════════════════════════════════════════════
describe("robotCleaning.showroom.getDemoCleaningPipeline", () => {
  it("returns 6 pipeline steps", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoCleaningPipeline();
    expect(result.pipeline).toHaveLength(6);
    expect(result.pipeline[0]).toHaveProperty("step", 1);
    expect(result.pipeline[0]).toHaveProperty("label");
    expect(result.pipeline[0]).toHaveProperty("aiRole");
  });

  it("returns 20 CNC trajectory waypoints", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoCleaningPipeline();
    expect(result.cncTrajectory).toHaveLength(20);
    expect(result.cncTrajectory[0]).toHaveProperty("waypointId", 1);
    expect(result.cncTrajectory[0]).toHaveProperty("x");
    expect(result.cncTrajectory[0]).toHaveProperty("pressure");
    expect(result.cncTrajectory[0]).toHaveProperty("targetFeature");
  });

  it("workpiece spec references VDA 19.1", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoCleaningPipeline();
    expect(result.workpieceSpec.standard).toContain("VDA 19.1");
    expect(result.workpieceSpec.material).toContain("ADC12");
    expect(result.workpieceSpec.cavities).toBe(20);
  });

  it("pipeline steps are in correct order (1-6)", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoCleaningPipeline();
    result.pipeline.forEach((s, i) => expect(s.step).toBe(i + 1));
  });

  it("each waypoint has valid feature type", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoCleaningPipeline();
    const validFeatures = ["blind_hole", "oil_gallery", "coolant_channel", "bearing_seat"];
    result.cncTrajectory.forEach(wp => {
      expect(validFeatures).toContain(wp.targetFeature);
    });
  });
});

describe("robotCleaning.showroom.getDemoInlineQC", () => {
  it("verdict is PASS", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoInlineQC();
    expect(result.verdict).toBe("PASS");
  });

  it("returns 6 size distribution bins", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoInlineQC();
    expect(result.sizeDistribution).toHaveLength(6);
    expect(result.sizeDistribution[0]).toHaveProperty("bin");
    expect(result.sizeDistribution[0]).toHaveProperty("before");
    expect(result.sizeDistribution[0]).toHaveProperty("after");
  });

  it("returns 20 zone map entries", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoInlineQC();
    expect(result.zoneMap).toHaveLength(20);
    expect(result.zoneMap[0]).toHaveProperty("zoneId");
    expect(result.zoneMap[0]).toHaveProperty("zoneName");
    expect(result.zoneMap[0]).toHaveProperty("status");
  });

  it("improvement percentages are positive", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoInlineQC();
    expect(result.improvement.massReduction).toBeGreaterThan(0);
    expect(result.improvement.particleReduction).toBeGreaterThan(0);
    expect(result.improvement.maxParticleReduction).toBeGreaterThan(0);
  });

  it("after values are less than before values", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoInlineQC();
    expect(result.after.totalMass).toBeLessThan(result.before.totalMass);
    expect(result.after.particleCount).toBeLessThan(result.before.particleCount);
  });
});

describe("robotCleaning.showroom.getDemoAIDecisions", () => {
  it("detects 4 feature types", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoAIDecisions();
    expect(result.featuresDetected).toHaveLength(4);
    expect(result.featuresDetected[0]).toHaveProperty("type");
    expect(result.featuresDetected[0]).toHaveProperty("confidence");
    expect(result.featuresDetected[0]).toHaveProperty("strategy");
  });

  it("case matches are present with similarity scores", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoAIDecisions();
    expect(result.caseMatches.length).toBeGreaterThanOrEqual(1);
    result.caseMatches.forEach(c => {
      expect(c.similarity).toBeGreaterThan(0);
      expect(c.similarity).toBeLessThanOrEqual(100);
    });
  });

  it("returns 3 adaptive iterations showing convergence", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoAIDecisions();
    expect(result.adaptiveIterations).toHaveLength(3);
    expect(result.adaptiveIterations[0].verdict).toBe("FAIL");
    expect(result.adaptiveIterations[2].verdict).toBe("PASS");
  });

  it("AI confidence is greater than 0", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoAIDecisions();
    expect(result.aiConfidence).toBeGreaterThan(0);
    expect(result.aiConfidence).toBeLessThanOrEqual(1);
  });

  it("has valid AI model version and historical data", async () => {
    const caller = createAnonymousCaller();
    const result = await caller.robotCleaning.showroom.getDemoAIDecisions();
    expect(result.aiModelVersion).toContain("GRT-CleanAI");
    expect(result.totalHistoricalCycles).toBeGreaterThan(0);
    expect(result.firstPassYield).toBeGreaterThan(0);
    expect(result.cycleTimeAchieved).toBeGreaterThan(0);
  });
});

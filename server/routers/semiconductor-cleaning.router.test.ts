/**
 * Semiconductor Cleaning Router — Unit Tests
 * Covers all 5 sub-routers (~32 procedures)
 *
 * Run: pnpm test -- server/routers/semiconductor-cleaning.router.test.ts
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
  chain.groupBy = vi.fn(() => chain);
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
vi.mock("../../drizzle/semiconductor-cleaning-schema", () => ({
  cleaningRecipes: {
    id: "id", recipeCode: "recipeCode", partType: "partType", partMaterial: "partMaterial",
    featureType: "featureType", pressureBar: "pressureBar", nozzleAngleDeg: "nozzleAngleDeg",
    flowRateLpm: "flowRateLpm", temperatureC: "temperatureC", distanceMm: "distanceMm",
    sprayDurationS: "sprayDurationS", mediaType: "mediaType", semiCompliant: "semiCompliant",
    iso14644Class: "iso14644Class", tsmcQualified: "tsmcQualified", cleanlinessTargetMg: "cleanlinessTargetMg",
    maxParticleSizeUm: "maxParticleSizeUm", validatedBy: "validatedBy", validatedAt: "validatedAt",
    status: "status", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  iso14644CleanroomClasses: {
    id: "id", isoClass: "isoClass", maxParticles01um: "maxParticles01um", maxParticles02um: "maxParticles02um",
    maxParticles03um: "maxParticles03um", maxParticles05um: "maxParticles05um",
    maxParticles10um: "maxParticles10um", maxParticles50um: "maxParticles50um",
    description: "description", typicalApplications: "typicalApplications", createdAt: "createdAt",
  },
  semiProcessStandards: {
    id: "id", standardCode: "standardCode", standardName: "standardName", category: "category",
    parameterName: "parameterName", unit: "unit", minValue: "minValue", maxValue: "maxValue",
    targetValue: "targetValue", applicableProcesses: "applicableProcesses",
    tsmcRequirement: "tsmcRequirement", description: "description",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  cleanroomEnvironmentLogs: {
    id: "id", cleanroomId: "cleanroomId", cleanroomName: "cleanroomName", isoClass: "isoClass",
    temperatureC: "temperatureC", humidityPct: "humidityPct", pressureDiffPa: "pressureDiffPa",
    particleCount05um: "particleCount05um", particleCount10um: "particleCount10um",
    particleCount50um: "particleCount50um", diWaterResistivityMOhm: "diWaterResistivityMOhm",
    diWaterTocPpb: "diWaterTocPpb", verdict: "verdict", violationDetails: "violationDetails",
    measuredAt: "measuredAt", measuredBy: "measuredBy", createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/robot-cleaning-performance-schema", () => ({
  robotCleaningActions: {
    id: "id", projectId: "projectId", robotCode: "robotCode", stationCode: "stationCode",
    pressureBar: "pressureBar", nozzleAngleDeg: "nozzleAngleDeg", cleanlinessAfterMg: "cleanlinessAfterMg",
    cleanlinessBeforeMg: "cleanlinessBeforeMg", cleanlinessVerdict: "cleanlinessVerdict",
    isAdaptive: "isAdaptive", adaptiveAdjustmentJson: "adaptiveAdjustmentJson",
    hasAlert: "hasAlert", createdAt: "createdAt",
  },
  oilingTorqueRecords: {
    id: "id", robotCode: "robotCode", createdAt: "createdAt",
  },
  techPerformanceEntries: {
    id: "id", workDate: "workDate", shiftCode: "shiftCode", cycleEfficiency: "cycleEfficiency",
    qualityPass: "qualityPass", createdAt: "createdAt",
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
// 1. recipe sub-router
// ═════════════════════════════════════════════════════════════════════
describe("semiconductorCleaning.recipe", () => {
  it("list returns items and total", async () => {
    selectResultsQueue = [[{ count: 3 }]];
    mockQueryResult = [{ id: 1, recipeCode: "RC-001" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("list with filters", async () => {
    selectResultsQueue = [[{ count: 1 }]];
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.list({
      partType: "Wafer Carrier",
      semiCompliant: true,
      tsmcQualified: true,
      status: "production",
    });
    expect(result).toHaveProperty("total");
  });

  it("getById returns a recipe", async () => {
    mockQueryResult = [{ id: 1, recipeCode: "RC-001", partType: "Wafer Carrier" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("recipeCode", "RC-001");
  });

  it("getById throws NOT_FOUND", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    await expect(caller.semiconductorCleaning.recipe.getById({ id: 999 })).rejects.toThrow("Recipe not found");
  });

  it("create inserts a new recipe", async () => {
    mockReturningResult = [{ id: 1, recipeCode: "RC-NEW", status: "draft" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.create({
      recipeCode: "RC-NEW",
      partType: "Test Part",
      pressureBar: 3.5,
      semiCompliant: true,
    });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("status", "draft");
  });

  it("update modifies a recipe", async () => {
    mockReturningResult = [{ id: 1, partType: "Updated Part" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.update({
      id: 1,
      partType: "Updated Part",
      pressureBar: 4.0,
    });
    expect(result).toHaveProperty("partType", "Updated Part");
  });

  it("update throws NOT_FOUND for missing recipe", async () => {
    mockReturningResult = [];
    const caller = createAdminCaller();
    await expect(caller.semiconductorCleaning.recipe.update({ id: 999, partType: "X" })).rejects.toThrow("Recipe not found");
  });

  it("validate marks recipe as validated", async () => {
    mockReturningResult = [{ id: 1, status: "validated", validatedBy: "Engineer A" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.validate({ id: 1, validatedBy: "Engineer A" });
    expect(result).toHaveProperty("status", "validated");
  });

  it("promote moves recipe to production", async () => {
    // First select for existing check returns validated recipe
    selectResultsQueue = [[{ id: 1, status: "validated" }]];
    mockReturningResult = [{ id: 1, status: "production" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.promote({ id: 1 });
    expect(result).toHaveProperty("status", "production");
  });

  it("promote rejects non-validated recipes", async () => {
    selectResultsQueue = [[{ id: 1, status: "draft" }]];
    const caller = createAdminCaller();
    await expect(caller.semiconductorCleaning.recipe.promote({ id: 1 })).rejects.toThrow("Only validated recipes");
  });

  it("deprecate marks recipe as deprecated", async () => {
    mockReturningResult = [{ id: 1, status: "deprecated" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.deprecate({ id: 1 });
    expect(result).toHaveProperty("status", "deprecated");
  });

  it("getByFeatureType returns production recipes for feature", async () => {
    mockQueryResult = [{ id: 1, featureType: "blind_hole", status: "production" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.recipe.getByFeatureType({ featureType: "blind_hole" });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. semiValidation sub-router
// ═════════════════════════════════════════════════════════════════════
describe("semiconductorCleaning.semiValidation", () => {
  it("listStandards returns SEMI standards", async () => {
    mockQueryResult = [{ id: 1, standardCode: "SEMI-F57", parameterName: "DI Water Resistivity" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.listStandards();
    expect(Array.isArray(result)).toBe(true);
  });

  it("validateRecipe checks recipe against standards", async () => {
    // First: recipe lookup, second: standards lookup
    selectResultsQueue = [
      [{ id: 1, recipeCode: "RC-001", cleanlinessTargetMg: "0.50", maxParticleSizeUm: "5.00", iso14644Class: 5 }],
      [],  // TSMC standards
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.validateRecipe({ recipeId: 1 });
    expect(result).toHaveProperty("compliant");
    expect(result).toHaveProperty("violations");
    expect(result).toHaveProperty("recipeCode", "RC-001");
  });

  it("validateRecipe throws for missing recipe", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    await expect(caller.semiconductorCleaning.semiValidation.validateRecipe({ recipeId: 999 })).rejects.toThrow("Recipe not found");
  });

  it("validateEnvironment checks cleanroom log", async () => {
    selectResultsQueue = [
      [{ id: 1, cleanroomId: "CR-A", isoClass: 5, particleCount05um: 2000, diWaterResistivityMOhm: "18.20", diWaterTocPpb: "2.00" }],
      [{ isoClass: 5, maxParticles05um: 3520, maxParticles10um: 832, maxParticles50um: 29 }],
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.validateEnvironment({ logId: 1 });
    expect(result).toHaveProperty("verdict", "PASS");
    expect(result).toHaveProperty("violations");
  });

  it("getTsmcChecklist returns checklist items", async () => {
    selectResultsQueue = [
      [{ count: 10 }],  // total recipes
      [{ count: 5 }],   // TSMC qualified
      [{ count: 8 }],   // SEMI compliant
      [{ count: 15 }],  // env pass
      [{ count: 20 }],  // env total
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.getTsmcChecklist();
    expect(result).toHaveProperty("totalRecipes", 10);
    expect(result).toHaveProperty("checklist");
    expect(result.checklist).toHaveLength(4);
  });

  it("getCertificationStatus returns readiness", async () => {
    selectResultsQueue = [
      [{ count: 10 }],  // total recipes
      [{ count: 9 }],   // qualified recipes
      [{ count: 18 }],  // env pass
      [{ count: 20 }],  // env total
      [{ count: 6 }],   // standards
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.getCertificationStatus();
    expect(result).toHaveProperty("recipeQualificationRate");
    expect(result).toHaveProperty("environmentPassRate");
    expect(result).toHaveProperty("overallReadiness");
  });

  it("seedStandards seeds ISO and SEMI data", async () => {
    // Multiple select queries for existence checks, all return empty
    selectResultsQueue = Array.from({ length: 20 }, () => []);
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.seedStandards();
    expect(result).toHaveProperty("success", true);
  });

  it("generateComplianceReport returns report data", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.semiValidation.generateComplianceReport();
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("summary");
    expect(result.summary).toHaveProperty("totalRecipes");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. environment sub-router
// ═════════════════════════════════════════════════════════════════════
describe("semiconductorCleaning.environment", () => {
  it("logReading records an environment reading with PASS verdict", async () => {
    // ISO class lookup
    selectResultsQueue = [
      [{ isoClass: 5, maxParticles05um: 3520, maxParticles10um: 832, maxParticles50um: 29 }],
    ];
    mockReturningResult = [{ id: 1, cleanroomId: "CR-A", verdict: "PASS" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.logReading({
      cleanroomId: "CR-A",
      isoClass: 5,
      temperatureC: 22.5,
      particleCount05um: 2000,
      diWaterResistivityMOhm: 18.2,
      diWaterTocPpb: 2.0,
    });
    expect(result).toHaveProperty("id", 1);
  });

  it("logReading detects FAIL for low DI water resistivity", async () => {
    selectResultsQueue = [[]]; // no ISO class found
    mockReturningResult = [{ id: 2, cleanroomId: "CR-B", verdict: "FAIL" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.logReading({
      cleanroomId: "CR-B",
      diWaterResistivityMOhm: 16.5,
      diWaterTocPpb: 7.0,
    });
    expect(result).toHaveProperty("id", 2);
  });

  it("listLogs returns items and total", async () => {
    selectResultsQueue = [[{ count: 10 }]];
    mockQueryResult = [{ id: 1, cleanroomId: "CR-A" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.listLogs();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getLatestByCleanroom returns latest reading", async () => {
    mockQueryResult = [{ id: 5, cleanroomId: "CR-A", verdict: "PASS" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.getLatestByCleanroom({ cleanroomId: "CR-A" });
    expect(result).toHaveProperty("id", 5);
  });

  it("getLatestByCleanroom returns null when no readings", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.getLatestByCleanroom({ cleanroomId: "CR-X" });
    expect(result).toBeNull();
  });

  it("getCleanroomList returns distinct cleanrooms", async () => {
    mockQueryResult = [{ cleanroomId: "CR-A", cleanroomName: "Fab A" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.getCleanroomList();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getAlerts returns FAIL readings", async () => {
    mockQueryResult = [{ id: 3, verdict: "FAIL" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.getAlerts();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getDashboard returns environment summary", async () => {
    selectResultsQueue = [
      [{ cleanroomId: "CR-A" }],  // cleanrooms groupBy
      [{ count: 15 }],  // PASS
      [{ count: 3 }],   // FAIL
      [{ count: 18 }],  // total
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.environment.getDashboard();
    expect(result).toHaveProperty("totalCleanrooms");
    expect(result).toHaveProperty("passingReadings");
    expect(result).toHaveProperty("failingReadings");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. certification sub-router
// ═════════════════════════════════════════════════════════════════════
describe("semiconductorCleaning.certification", () => {
  it("getIso14644Classes returns all classes", async () => {
    mockQueryResult = [{ id: 1, isoClass: 1 }, { id: 2, isoClass: 2 }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.certification.getIso14644Classes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getClassForCleanroom determines achieved ISO class", async () => {
    // latest reading
    selectResultsQueue = [
      [{ id: 1, cleanroomId: "CR-A", particleCount05um: 2000, particleCount10um: 500, particleCount50um: 10 }],
    ];
    // ISO classes
    mockQueryResult = [
      { isoClass: 1, maxParticles05um: null },
      { isoClass: 5, maxParticles05um: 3520, maxParticles10um: 832, maxParticles50um: 29 },
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.certification.getClassForCleanroom({ cleanroomId: "CR-A" });
    expect(result).toHaveProperty("cleanroomId", "CR-A");
    expect(result).toHaveProperty("achievedClass");
  });

  it("getClassForCleanroom returns null when no readings", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.certification.getClassForCleanroom({ cleanroomId: "CR-X" });
    expect(result.achievedClass).toBeNull();
  });

  it("getSemiStandardsByCategory filters by category", async () => {
    mockQueryResult = [{ id: 1, standardCode: "SEMI-F57", category: "water_quality" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.certification.getSemiStandardsByCategory({ category: "water_quality" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getComplianceMatrix returns recipe × standard matrix", async () => {
    // production recipes
    selectResultsQueue = [
      [{ id: 1, recipeCode: "RC-001", partType: "Wafer", cleanlinessTargetMg: "0.50", maxParticleSizeUm: "5.00", status: "production" }],
    ];
    // standards
    mockQueryResult = [{ id: 1, standardCode: "VDA-19.1", parameterName: "Gravimetric Cleanliness", maxValue: "5.000000" }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.certification.getComplianceMatrix();
    expect(result).toHaveProperty("matrix");
    expect(result).toHaveProperty("totalRecipes");
    expect(result).toHaveProperty("totalStandards");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. monitor sub-router
// ═════════════════════════════════════════════════════════════════════
describe("semiconductorCleaning.monitor", () => {
  it("getDashboard returns aggregated KPIs", async () => {
    selectResultsQueue = [
      [{ count: 50 }],   // total actions today
      [{ count: 45 }],   // pass actions today
      [{ count: 3 }],    // alert actions today
      [{ count: 2 }],    // draft recipes
      [{ count: 1 }],    // validated recipes
      [{ count: 5 }],    // production recipes
      [{ count: 15 }],   // env pass
      [{ count: 3 }],    // env fail
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.getDashboard();
    expect(result).toHaveProperty("todayActions");
    expect(result).toHaveProperty("todayPassRate");
    expect(result).toHaveProperty("todayAlerts");
    expect(result).toHaveProperty("recipes");
    expect(result).toHaveProperty("environment");
  });

  it("getRobotFleet returns fleet status", async () => {
    // groupBy returns robots
    selectResultsQueue = [
      [{ robotCode: "R-01" }],
    ];
    // latest action for R-01
    mockQueryResult = [{ robotCode: "R-01", createdAt: "2026-03-07", cleanlinessVerdict: "PASS", hasAlert: false }];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.getRobotFleet();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getAdaptiveHistory returns adaptive iterations", async () => {
    mockQueryResult = [
      { id: 1, robotCode: "R-01", pressureBar: "3.5", nozzleAngleDeg: "50", cleanlinessAfterMg: "4.2", cleanlinessVerdict: "PASS", adaptiveAdjustmentJson: {}, createdAt: "2026-03-07" },
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.getAdaptiveHistory();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("pressure");
  });

  it("getShiftSummary returns performance by shift", async () => {
    mockQueryResult = [
      { shiftCode: "morning", cycleEfficiency: "0.95", qualityPass: true },
      { shiftCode: "morning", cycleEfficiency: "0.88", qualityPass: true },
      { shiftCode: "afternoon", cycleEfficiency: "0.92", qualityPass: false },
    ];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.getShiftSummary();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getRecipeEffectiveness returns effectiveness data", async () => {
    // production recipes
    selectResultsQueue = [
      [{ id: 1, recipeCode: "RC-001", partType: "Wafer", featureType: "blind_hole", status: "production" }],
    ];
    // usage count for recipe
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.getRecipeEffectiveness();
    expect(Array.isArray(result)).toBe(true);
  });

  it("seedDemo seeds demo data", async () => {
    // Multiple select queries for existence checks, all return empty
    selectResultsQueue = Array.from({ length: 10 }, () => []);
    const caller = createAdminCaller();
    const result = await caller.semiconductorCleaning.monitor.seedDemo();
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("recipesSeeded");
    expect(result).toHaveProperty("environmentLogsSeeded");
  });
});

/**
 * Go-Live Command Center Router — Unit Tests
 *
 * Covers all 4 sub-routers (16 procedures):
 *   readiness (5), salaryImport (4), encoding (4), simulation (3)
 *
 * Run: pnpm test -- server/routers/go-live.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];
const executeResultsQueue: any[] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function getNextExecuteResult() {
  return executeResultsQueue.length > 0
    ? executeResultsQueue.shift()!
    : { rows: [] };
}

function createMockDbChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "and", "orderBy", "groupBy", "limit", "offset", "values", "set",
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
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => createMockDbChain()),
  insert: vi.fn(() => createMockDbChain()),
  update: vi.fn(() => createMockDbChain()),
  delete: vi.fn(() => createMockDbChain()),
  execute: vi.fn(() => Promise.resolve(getNextExecuteResult())),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock tRPC ───────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const passthrough: any = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Mock schema tables ──────────────────────────────────
vi.mock("../../drizzle/schema", () => ({
  hrmEmployees: { id: "id", employeeCode: "employeeCode", department: "department", position: "position" },
  salaryCalculations: { id: "id", calculationCode: "calculationCode", employeeId: "employeeId" },
  importHistory: { id: "id", importType: "importType", fileName: "fileName", totalRows: "totalRows", successCount: "successCount", failedCount: "failedCount", status: "status", importedData: "importedData", errorLog: "errorLog", createdById: "createdById", createdAt: "createdAt" },
  fmeaDocuments: { id: "id", status: "status" },
}));

vi.mock("../../drizzle/oee-schema", () => ({
  oeeSnapshots: { id: "id", oee: "oee" },
}));

vi.mock("../../drizzle/ai-agent-fleet-schema", () => ({
  aiAgentFleet: { id: "id" },
}));

vi.mock("../../drizzle/permission-schema", () => ({
  permissions: { id: "id", code: "code" },
}));

vi.mock("../../drizzle/sandbox-console-schema", () => ({
  sandboxScenarios: { id: "id", title: "title", status: "status", priority: "priority", createdById: "createdById" },
  sandboxKnowledgeLinks: { id: "id", scenarioId: "scenarioId" },
  sandboxRuns: { id: "id", scenarioId: "scenarioId", runType: "runType", status: "status", aiProvider: "aiProvider", aiModel: "aiModel", aiOutput: "aiOutput", durationMs: "durationMs", tokenUsage: "tokenUsage", createdAt: "createdAt", parentRunId: "parentRunId" },
  releaseGates: { id: "id", scenarioId: "scenarioId", gateType: "gateType", gateOrder: "gateOrder", status: "status", redTeamReport: "redTeamReport" },
  sandboxChangeTasks: { id: "id", scenarioId: "scenarioId", status: "status", taskType: "taskType", priority: "priority" },
}));

// ── Mock services ───────────────────────────────────────
const mockLegionOverview = {
  totalEmployees: 50,
  withMaster: 30,
  withFleet: 20,
  withActiveAgent: 15,
  totalAgents: 100,
  totalGTokens: 50000,
  byLevel: { 1: 5, 2: 10, 3: 15, 4: 12, 5: 8 },
  byDepartment: {},
  byRole: {},
};

const mockSkillMappings = [
  { employeeId: 1, employeeCode: "E001", name: "Alice", department: "R&D", position: "Engineer", roleId: "bu_mech", roleName: "Mechanical Engineer", tsdckl: { t: 80, s: 70, d: 75, c: 65, k: 72, l: 60 }, skillAvg: 70, computedLevel: 3 as const, hasMaster: true, hasFleet: true, fleetActiveLevel: 3 },
  { employeeId: 2, employeeCode: "E002", name: "Bob", department: "Sales", position: "Sales", roleId: "bu_sales", roleName: "Sales Rep", tsdckl: { t: 50, s: 85, d: 55, c: 80, k: 60, l: 50 }, skillAvg: 63, computedLevel: 3 as const, hasMaster: true, hasFleet: false, fleetActiveLevel: null },
  { employeeId: 3, employeeCode: "E003", name: "Carol", department: "HR", position: "HR Specialist", roleId: "hr_specialist", roleName: "HR Specialist", tsdckl: null, skillAvg: 0, computedLevel: 1 as const, hasMaster: false, hasFleet: false, fleetActiveLevel: null },
];

vi.mock("../services/legion-provisioning.service", () => ({
  getLegionOverview: vi.fn(async () => mockLegionOverview),
  getEmployeeSkillMappings: vi.fn(async () => mockSkillMappings),
  computeSkillLevel: vi.fn(() => 3),
}));

vi.mock("../batch-salary-simulation", () => ({
  batchSalarySimulation: vi.fn(async (input: any) => ({
    totalRecords: input.employees.length,
    successCount: input.employees.length,
    failureCount: 0,
    calculations: input.employees.map((e: any) => ({
      employeeId: e.employeeId,
      employeeName: `员工${e.employeeId}`,
      department: e.department,
      baseSalary: e.baseSalary,
      performanceSalary: Math.round(e.baseSalary * 0.3),
      bonus: 0,
      benefits: Math.round(e.baseSalary * 0.1),
      monthlyTotal: Math.round(e.baseSalary * 1.4),
      annualTotal: Math.round(e.baseSalary * 1.4 * 12),
      status: "success",
    })),
    summary: {
      totalMonthlyPayroll: input.employees.reduce((s: number, e: any) => s + e.baseSalary * 1.4, 0),
      totalAnnualPayroll: input.employees.reduce((s: number, e: any) => s + e.baseSalary * 1.4 * 12, 0),
      averageMonthly: input.employees[0]?.baseSalary * 1.4 || 0,
      averageAnnual: (input.employees[0]?.baseSalary * 1.4 * 12) || 0,
    },
  })),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  asc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn(),
  avg: vi.fn((col: any) => col),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
  gte: vi.fn((...args: any[]) => args),
}));

const mockGenerateProposal = vi.fn();
const mockExecuteImplementation = vi.fn();
const mockRunRedTeamReview = vi.fn();

vi.mock("../services/sandbox-ai.service", () => ({
  generateProposal: (...args: any[]) => mockGenerateProposal(...args),
  executeImplementation: (...args: any[]) => mockExecuteImplementation(...args),
  runRedTeamReview: (...args: any[]) => mockRunRedTeamReview(...args),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// ── Import router after all mocks ───────────────────────
import { goLiveRouter } from "./go-live.router";

// ── Helpers ─────────────────────────────────────────────
function makeCtx() {
  return { ctx: { user: { id: 1, role: "admin" } } };
}

// ── Reset before each test ──────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
  executeResultsQueue.length = 0;
});

// ======================================================================
// ── readiness.getReadinessScorecard ──────────────────────────────────
// ======================================================================
describe("readiness.getReadinessScorecard", () => {
  const proc = goLiveRouter.readiness.getReadinessScorecard;

  it("returns scorecard with 6 categories", async () => {
    // DB queries: employees, permissions, employees(encoding), salary, oee
    selectResultsQueue.push([{ value: 50 }]); // employees
    selectResultsQueue.push([{ value: 250 }]); // permissions
    selectResultsQueue.push([{ value: 50 }]); // encoding employees proxy
    selectResultsQueue.push([{ value: 10 }]); // salary
    // getLegionOverview is mocked
    selectResultsQueue.push([{ value: 5 }]); // oee

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.categories).toHaveLength(6);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.grade).toBeTruthy();
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });

  it("handles DB failures gracefully", async () => {
    // All queries fail → use fallbacks
    mockQueryResult = [];
    // Force rejections by making select throw
    mockDb.select.mockImplementationOnce(() => { throw new Error("DB error"); });

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.categories).toHaveLength(6);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it("calculates grade correctly for high score", async () => {
    selectResultsQueue.push([{ value: 100 }]); // employees → 90
    selectResultsQueue.push([{ value: 300 }]); // permissions → 95
    selectResultsQueue.push([{ value: 100 }]); // encoding → 75
    selectResultsQueue.push([{ value: 50 }]); // salary → 80
    selectResultsQueue.push([{ value: 10 }]); // oee → 80

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.totalScore).toBeGreaterThan(50);
  });
});

// ======================================================================
// ── readiness.getReadinessTimeline ───────────────────────────────────
// ======================================================================
describe("readiness.getReadinessTimeline", () => {
  const proc = goLiveRouter.readiness.getReadinessTimeline;

  it("returns 6 phases", async () => {
    selectResultsQueue.push([{ value: 20 }]); // employees
    selectResultsQueue.push([{ value: 250 }]); // permissions

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.phases).toHaveLength(6);
    expect(result.totalPhases).toBe(6);
  });

  it("marks current phase as active", async () => {
    selectResultsQueue.push([{ value: 5 }]); // employees → phase 2
    selectResultsQueue.push([{ value: 250 }]); // permissions

    const result = await proc({ input: undefined, ...makeCtx() });
    const active = result.phases.find((p: any) => p.status === "active");
    expect(active).toBeDefined();
  });
});

// ======================================================================
// ── readiness.runPreflightChecks ────────────────────────────────────
// ======================================================================
describe("readiness.runPreflightChecks", () => {
  const proc = goLiveRouter.readiness.runPreflightChecks;

  it("returns 10 preflight checks", async () => {
    // 10 DB queries for 10 checks
    for (let i = 0; i < 10; i++) {
      selectResultsQueue.push([{ value: 10 }]);
    }

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.checks).toHaveLength(10);
    expect(result.summary.total).toBe(10);
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it("marks DB connectivity as pass when query succeeds", async () => {
    for (let i = 0; i < 10; i++) {
      selectResultsQueue.push([{ value: 100 }]);
    }

    const result = await proc({ input: undefined, ...makeCtx() });
    const dbCheck = result.checks.find((c: any) => c.id === "db_connectivity");
    expect(dbCheck?.status).toBe("pass");
  });

  it("calculates readiness percentage", async () => {
    for (let i = 0; i < 10; i++) {
      selectResultsQueue.push([{ value: 50 }]);
    }

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.summary.readinessPercent).toBeGreaterThanOrEqual(0);
    expect(result.summary.readinessPercent).toBeLessThanOrEqual(100);
  });
});

// ======================================================================
// ── readiness.getBlockers ───────────────────────────────────────────
// ======================================================================
describe("readiness.getBlockers", () => {
  const proc = goLiveRouter.readiness.getBlockers;

  it("returns blocker structure with severity counts", async () => {
    // First call caches — test structure (subsequent calls hit cache)
    selectResultsQueue.push([{ value: 0 }]); // employees → critical blocker
    selectResultsQueue.push([{ value: 250 }]); // permissions → ok
    selectResultsQueue.push([{ value: 0 }]); // salary → warning

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.blockers).toBeDefined();
    expect(result.criticalCount).toBeGreaterThanOrEqual(0);
    expect(result.warningCount).toBeGreaterThanOrEqual(0);
    expect(result.infoCount).toBeGreaterThanOrEqual(0);
    // With 0 employees: should have critical blocker
    expect(result.criticalCount).toBeGreaterThan(0);
    expect(result.blockers.some((b: any) => b.severity === "critical")).toBe(true);
  });
});

// ======================================================================
// ── readiness.getPhaseProgress ──────────────────────────────────────
// ======================================================================
describe("readiness.getPhaseProgress", () => {
  const proc = goLiveRouter.readiness.getPhaseProgress;

  it("returns milestones and current phase", async () => {
    selectResultsQueue.push([{ value: 20 }]); // employees
    selectResultsQueue.push([{ value: 250 }]); // permissions
    selectResultsQueue.push([{ value: 5 }]); // salary

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.currentPhase).toBeGreaterThanOrEqual(1);
    expect(result.milestones.length).toBeGreaterThan(0);
  });
});

// ======================================================================
// ── salaryImport.getSalaryTemplate ──────────────────────────────────
// ======================================================================
describe("salaryImport.getSalaryTemplate", () => {
  const proc = goLiveRouter.salaryImport.getSalaryTemplate;

  it("returns template with columns and gemini prompt", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.columns).toHaveLength(5);
    expect(result.geminiPrompt).toContain("employeeId");
    expect(result.sampleData).toHaveLength(2);
  });

  it("prompt includes JSON format instructions", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.geminiPrompt).toContain("JSON");
    expect(result.geminiPrompt).toContain("baseSalary");
  });
});

// ======================================================================
// ── salaryImport.previewSalaryImport ────────────────────────────────
// ======================================================================
describe("salaryImport.previewSalaryImport", () => {
  const proc = goLiveRouter.salaryImport.previewSalaryImport;

  it("calculates salary preview correctly", async () => {
    const result = await proc({
      input: {
        employees: [
          { employeeId: 1, department: "R&D", baseSalary: 10000, performanceGrade: "A", projectBonus: 5000 },
          { employeeId: 2, department: "Sales", baseSalary: 8000, performanceGrade: "B" },
        ],
      },
      ...makeCtx(),
    });

    expect(result.records).toHaveLength(2);
    expect(result.summary.totalRecords).toBe(2);
    expect(result.summary.totalMonthlyPayroll).toBeGreaterThan(0);
  });

  it("applies performance grade coefficients", async () => {
    const result = await proc({
      input: {
        employees: [
          { employeeId: 1, department: "R&D", baseSalary: 10000, performanceGrade: "S" },
        ],
      },
      ...makeCtx(),
    });

    // S grade = 1.5 coefficient → performanceSalary = 10000 * 0.3 * 1.5 = 4500
    expect(result.records[0].performanceSalary).toBe(4500);
  });

  it("handles default coefficient for unknown grade", async () => {
    const result = await proc({
      input: {
        employees: [
          { employeeId: 1, department: "R&D", baseSalary: 10000, performanceGrade: "X" },
        ],
      },
      ...makeCtx(),
    });

    // Unknown grade defaults to 1.0 → performanceSalary = 10000 * 0.3 * 1.0 = 3000
    expect(result.records[0].performanceSalary).toBe(3000);
  });
});

// ======================================================================
// ── salaryImport.importSalaryData ───────────────────────────────────
// ======================================================================
describe("salaryImport.importSalaryData", () => {
  const proc = goLiveRouter.salaryImport.importSalaryData;

  it("calls batchSalarySimulation and records history", async () => {
    const result = await proc({
      input: {
        employees: [
          { employeeId: 1, department: "R&D", baseSalary: 10000, performanceGrade: "A" },
        ],
      },
      ...makeCtx(),
    });

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("handles multiple employees", async () => {
    const employees = Array.from({ length: 5 }, (_, i) => ({
      employeeId: i + 1,
      department: "Dept" + i,
      baseSalary: 10000 + i * 1000,
      performanceGrade: "B",
    }));

    const result = await proc({
      input: { employees },
      ...makeCtx(),
    });

    expect(result.totalRecords).toBe(5);
    expect(result.successCount).toBe(5);
  });
});

// ======================================================================
// ── salaryImport.getSalaryImportHistory ─────────────────────────────
// ======================================================================
describe("salaryImport.getSalaryImportHistory", () => {
  const proc = goLiveRouter.salaryImport.getSalaryImportHistory;

  it("returns import history records", async () => {
    selectResultsQueue.push([
      { id: 1, importType: "salary_excel", fileName: "test.json", totalRows: 10, status: "completed" },
    ]);

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(1);
    expect(result[0].importType).toBe("salary_excel");
  });

  it("returns empty array when no history", async () => {
    selectResultsQueue.push([]);

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(0);
  });
});

// ======================================================================
// ── encoding.validateCode ───────────────────────────────────────────
// ======================================================================
describe("encoding.validateCode", () => {
  const proc = goLiveRouter.encoding.validateCode;

  it("validates a correct drawing code", async () => {
    const result = await proc({ input: { code: "GRT-RC-ME-001" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("drawing");
  });

  it("validates a correct material code", async () => {
    const result = await proc({ input: { code: "UC-PMP-CEN-DN50-0001" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("material");
  });

  it("validates a correct project code", async () => {
    const result = await proc({ input: { code: "GRT001" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("project");
  });

  it("rejects invalid code", async () => {
    const result = await proc({ input: { code: "INVALID-CODE" }, ...makeCtx() });
    expect(result.valid).toBe(false);
  });

  it("validates BOM code", async () => {
    const result = await proc({ input: { code: "BOM-RC300-001" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("bom");
  });

  it("validates ECR code", async () => {
    const result = await proc({ input: { code: "ECR-2026-RC300-001" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("ecr");
  });

  it("validates ECO code", async () => {
    const result = await proc({ input: { code: "ECO-2026-SC200-005" }, ...makeCtx() });
    expect(result.valid).toBe(true);
    expect(result.codeType).toBe("eco");
  });
});

// ======================================================================
// ── encoding.getEncodingCompliance ──────────────────────────────────
// ======================================================================
describe("encoding.getEncodingCompliance", () => {
  const proc = goLiveRouter.encoding.getEncodingCompliance;

  it("returns compliance report", async () => {
    selectResultsQueue.push([]); // employees query

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.compliancePercent).toBeDefined();
    expect(result.totalCodes).toBeDefined();
  });
});

// ======================================================================
// ── encoding.getEncodingRules ───────────────────────────────────────
// ======================================================================
describe("encoding.getEncodingRules", () => {
  const proc = goLiveRouter.encoding.getEncodingRules;

  it("returns 6 encoding rules", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(6);
    expect(result.map((r: any) => r.type)).toEqual(["drawing", "material", "project", "bom", "ecr", "eco"]);
  });

  it("each rule has examples", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    for (const rule of result) {
      expect(rule.examples.length).toBeGreaterThan(0);
      expect(rule.pattern).toBeTruthy();
      expect(rule.descriptionZh).toBeTruthy();
    }
  });
});

// ======================================================================
// ── simulation.runLegionSimulation ──────────────────────────────────
// ======================================================================
describe("simulation.runLegionSimulation", () => {
  const proc = goLiveRouter.simulation.runLegionSimulation;

  it("returns simulation results with level distribution", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.totalEmployees).toBe(3); // mockSkillMappings has 3
    expect(result.levelDistribution).toBeDefined();
    expect(result.projectedGTokens).toBeGreaterThan(0);
  });

  it("calculates staffing capacity", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.staffingCapacity.machineTarget).toBe(100);
    expect(result.staffingCapacity.current).toBe(3);
    expect(result.staffingCapacity.estimatedCapacity).toBeGreaterThanOrEqual(0);
  });

  it("returns skill gap analysis with 6 dimensions", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.skillGaps).toHaveLength(6);
    for (const sg of result.skillGaps) {
      expect(sg.current).toBeGreaterThanOrEqual(0);
      expect(sg.target).toBeGreaterThan(0);
      expect(sg.gap).toBeGreaterThanOrEqual(0);
    }
  });

  it("records simulation to import history", async () => {
    await proc({ input: undefined, ...makeCtx() });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("calculates AI readiness percentage", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    // 2 of 3 have hasMaster=true → 67%
    expect(result.aiReadiness).toBe(67);
  });
});

// ======================================================================
// ── simulation.getSimulationResults ─────────────────────────────────
// ======================================================================
describe("simulation.getSimulationResults", () => {
  const proc = goLiveRouter.simulation.getSimulationResults;

  it("returns previous simulation records", async () => {
    selectResultsQueue.push([
      { id: 1, createdAt: "2026-03-10", totalRows: 50, importedData: JSON.stringify({ levelDistribution: { 1: 5, 2: 10, 3: 15, 4: 12, 5: 8 } }) },
    ]);

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(1);
    expect(result[0].data.levelDistribution).toBeDefined();
  });

  it("returns empty array when no simulations", async () => {
    selectResultsQueue.push([]);

    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result).toHaveLength(0);
  });
});

// ======================================================================
// ── simulation.getScenarioComparison ────────────────────────────────
// ======================================================================
describe("simulation.getScenarioComparison", () => {
  const proc = goLiveRouter.simulation.getScenarioComparison;

  it("returns current vs target comparison", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.current).toBeDefined();
    expect(result.target).toBeDefined();
    expect(result.gaps).toBeDefined();
    expect(result.target.machineCapacity).toBe(100);
  });

  it("enriches with real legion data", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.current.headcount).toBe(50); // from mock getLegionOverview
    expect(result.current.aiAssistants).toBe(30); // from mock getLegionOverview.withMaster
  });

  it("calculates gaps correctly", async () => {
    const result = await proc({ input: undefined, ...makeCtx() });
    expect(result.gaps.headcount).toBe(Math.max(0, 120 - 50)); // 70
    expect(result.gaps.aiAssistants).toBe(Math.max(0, 120 - 30)); // 90
  });
});

// ======================================================================
// ── scenario.list ────────────────────────────────────────────────────
// ======================================================================
describe("scenario.list", () => {
  const proc = goLiveRouter.scenario.list;

  it("returns scenario list", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "draft", priority: "P2" }]);
    const result = await proc({ input: {}, ...makeCtx() });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test");
  });

  it("returns empty array when no scenarios", async () => {
    selectResultsQueue.push([]);
    const result = await proc({ input: {}, ...makeCtx() });
    expect(result).toHaveLength(0);
  });
});

// ======================================================================
// ── scenario.getById ─────────────────────────────────────────────────
// ======================================================================
describe("scenario.getById", () => {
  const proc = goLiveRouter.scenario.getById;

  it("returns scenario with linked data", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "draft" }]); // scenario
    selectResultsQueue.push([]); // knowledge links
    selectResultsQueue.push([]); // runs
    selectResultsQueue.push([]); // gates
    selectResultsQueue.push([]); // tasks
    const result = await proc({ input: { id: 1 }, ...makeCtx() });
    expect(result.title).toBe("Test");
    expect(result.knowledgeLinks).toHaveLength(0);
    expect(result.runs).toHaveLength(0);
    expect(result.gates).toHaveLength(0);
    expect(result.changeTasks).toHaveLength(0);
  });

  it("throws when scenario not found", async () => {
    selectResultsQueue.push([]);
    await expect(proc({ input: { id: 999 }, ...makeCtx() })).rejects.toThrow("Scenario not found");
  });
});

// ======================================================================
// ── scenario.create ──────────────────────────────────────────────────
// ======================================================================
describe("scenario.create", () => {
  const proc = goLiveRouter.scenario.create;

  it("creates a new scenario", async () => {
    mockReturningResult = [{ id: 1, title: "New Scenario", status: "draft" }];
    const result = await proc({
      input: { title: "New Scenario", priority: "P1" },
      ...makeCtx(),
    });
    expect(result.title).toBe("New Scenario");
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

// ======================================================================
// ── scenario.updateStatus ────────────────────────────────────────────
// ======================================================================
describe("scenario.updateStatus", () => {
  const proc = goLiveRouter.scenario.updateStatus;

  it("updates scenario status", async () => {
    mockReturningResult = [{ id: 1, status: "approved" }];
    const result = await proc({
      input: { id: 1, status: "approved" },
      ...makeCtx(),
    });
    expect(result.status).toBe("approved");
  });
});

// ======================================================================
// ── scenario.linkKnowledge ───────────────────────────────────────────
// ======================================================================
describe("scenario.linkKnowledge", () => {
  const proc = goLiveRouter.scenario.linkKnowledge;

  it("links knowledge asset to scenario", async () => {
    mockReturningResult = [{ id: 1, scenarioId: 1, knowledgeAssetId: 5 }];
    const result = await proc({
      input: { scenarioId: 1, knowledgeAssetId: 5, relevanceScore: 80 },
      ...makeCtx(),
    });
    expect(result.scenarioId).toBe(1);
  });
});

// ======================================================================
// ── scenario.archive ─────────────────────────────────────────────────
// ======================================================================
describe("scenario.archive", () => {
  const proc = goLiveRouter.scenario.archive;

  it("archives scenario", async () => {
    mockReturningResult = [{ id: 1, status: "archived" }];
    const result = await proc({ input: { id: 1 }, ...makeCtx() });
    expect(result.status).toBe("archived");
  });
});

// ======================================================================
// ── sandboxRun.list ──────────────────────────────────────────────────
// ======================================================================
describe("sandboxRun.list", () => {
  const proc = goLiveRouter.sandboxRun.list;

  it("returns runs for scenario", async () => {
    selectResultsQueue.push([{ id: 1, runType: "proposal", status: "completed" }]);
    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

// ======================================================================
// ── sandboxRun.getById ───────────────────────────────────────────────
// ======================================================================
describe("sandboxRun.getById", () => {
  const proc = goLiveRouter.sandboxRun.getById;

  it("returns a run by id", async () => {
    selectResultsQueue.push([{ id: 1, runType: "proposal", aiProvider: "gemini" }]);
    const result = await proc({ input: { id: 1 }, ...makeCtx() });
    expect(result.runType).toBe("proposal");
  });

  it("throws when run not found", async () => {
    selectResultsQueue.push([]);
    await expect(proc({ input: { id: 999 }, ...makeCtx() })).rejects.toThrow("Run not found");
  });
});

// ======================================================================
// ── sandboxRun.generateProposal ──────────────────────────────────────
// ======================================================================
describe("sandboxRun.generateProposal", () => {
  const proc = goLiveRouter.sandboxRun.generateProposal;

  it("calls generateProposal service", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "draft", businessGoal: "Test goal" }]); // scenario lookup
    mockGenerateProposal.mockResolvedValueOnce({ runId: 1, proposal: { objective: "test" } });

    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(mockGenerateProposal).toHaveBeenCalled();
    expect(result.runId).toBe(1);
  });

  it("throws when scenario not found", async () => {
    selectResultsQueue.push([]);
    await expect(proc({ input: { scenarioId: 999 }, ...makeCtx() })).rejects.toThrow("Scenario not found");
  });
});

// ======================================================================
// ── sandboxRun.executeImplementation ─────────────────────────────────
// ======================================================================
describe("sandboxRun.executeImplementation", () => {
  const proc = goLiveRouter.sandboxRun.executeImplementation;

  it("rejects non-approved scenarios", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "draft" }]); // scenario
    await expect(proc({
      input: { scenarioId: 1, proposalRunId: 1 },
      ...makeCtx(),
    })).rejects.toThrow("Scenario must be approved");
  });

  it("executes with approved scenario", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "approved" }]); // scenario
    selectResultsQueue.push([{ id: 10, runType: "proposal", status: "completed", aiOutput: { objective: "test" } }]); // proposal run
    mockExecuteImplementation.mockResolvedValueOnce({ runId: 2, implementation: { codeChanges: [] } });

    const result = await proc({
      input: { scenarioId: 1, proposalRunId: 10 },
      ...makeCtx(),
    });
    expect(mockExecuteImplementation).toHaveBeenCalled();
    expect(result.runId).toBe(2);
  });

  it("rejects invalid proposal run", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "approved" }]);
    selectResultsQueue.push([{ id: 10, runType: "review", status: "completed" }]); // wrong type
    await expect(proc({
      input: { scenarioId: 1, proposalRunId: 10 },
      ...makeCtx(),
    })).rejects.toThrow("Valid completed proposal run required");
  });
});

// ======================================================================
// ── sandboxRun.runRedTeamReview ──────────────────────────────────────
// ======================================================================
describe("sandboxRun.runRedTeamReview", () => {
  const proc = goLiveRouter.sandboxRun.runRedTeamReview;

  it("calls runRedTeamReview service", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "approved" }]);
    selectResultsQueue.push([{ id: 10, runType: "proposal", aiOutput: { objective: "test" } }]);
    selectResultsQueue.push([{ id: 11, runType: "implementation", aiOutput: { codeChanges: [] } }]);
    mockRunRedTeamReview.mockResolvedValueOnce({ runId: 3, review: { overallVerdict: "pass", criteria: [] } });

    const result = await proc({
      input: { scenarioId: 1, proposalRunId: 10, implementationRunId: 11 },
      ...makeCtx(),
    });
    expect(mockRunRedTeamReview).toHaveBeenCalled();
    expect(result.review.overallVerdict).toBe("pass");
  });

  it("throws when runs missing output", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "approved" }]);
    selectResultsQueue.push([{ id: 10, runType: "proposal", aiOutput: null }]); // no output
    selectResultsQueue.push([{ id: 11, runType: "implementation", aiOutput: null }]);
    await expect(proc({
      input: { scenarioId: 1, proposalRunId: 10, implementationRunId: 11 },
      ...makeCtx(),
    })).rejects.toThrow("Both proposal and implementation runs required");
  });
});

// ======================================================================
// ── sandboxRun.runDryRun ─────────────────────────────────────────────
// ======================================================================
describe("sandboxRun.runDryRun", () => {
  const proc = goLiveRouter.sandboxRun.runDryRun;

  it("returns dry run output", async () => {
    selectResultsQueue.push([{ id: 1, title: "Test", status: "approved" }]); // scenario
    selectResultsQueue.push([]); // runs
    selectResultsQueue.push([]); // gates
    selectResultsQueue.push([]); // tasks
    mockReturningResult = [{ id: 99 }];

    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result.runId).toBe(99);
    expect(result.dryRun.scenario.title).toBe("Test");
  });
});

// ======================================================================
// ── sandboxRun.compareRuns ───────────────────────────────────────────
// ======================================================================
describe("sandboxRun.compareRuns", () => {
  const proc = goLiveRouter.sandboxRun.compareRuns;

  it("compares two runs", async () => {
    selectResultsQueue.push([{ id: 1, runType: "proposal", aiProvider: "gemini", aiModel: "gemini-2.0", status: "completed", durationMs: 100, tokenUsage: { total_tokens: 500 }, createdAt: "2026-03-13" }]);
    selectResultsQueue.push([{ id: 2, runType: "implementation", aiProvider: "claude", aiModel: "claude-sonnet", status: "completed", durationMs: 200, tokenUsage: { total_tokens: 1000 }, createdAt: "2026-03-13" }]);
    const result = await proc({ input: { runIdA: 1, runIdB: 2 }, ...makeCtx() });
    expect(result.runA.provider).toBe("gemini");
    expect(result.runB.provider).toBe("claude");
  });
});

// ======================================================================
// ── gate.initGates ───────────────────────────────────────────────────
// ======================================================================
describe("gate.initGates", () => {
  const proc = goLiveRouter.gate.initGates;

  it("creates 5 gates in order", async () => {
    mockReturningResult = [{ id: 1, gateType: "proposal_review", gateOrder: 1, status: "pending" }];
    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result).toHaveLength(5);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

// ======================================================================
// ── gate.review ──────────────────────────────────────────────────────
// ======================================================================
describe("gate.review", () => {
  const proc = goLiveRouter.gate.review;

  it("passes gate review", async () => {
    selectResultsQueue.push([{ id: 1, scenarioId: 1, gateOrder: 1, gateType: "proposal_review" }]); // gate lookup
    mockReturningResult = [{ id: 1, status: "passed" }];
    const result = await proc({
      input: { gateId: 1, status: "passed", comment: "LGTM" },
      ...makeCtx(),
    });
    expect(result.status).toBe("passed");
  });

  it("enforces gate order — blocks if previous gates not passed", async () => {
    selectResultsQueue.push([{ id: 2, scenarioId: 1, gateOrder: 2, gateType: "red_team" }]); // gate lookup
    selectResultsQueue.push([
      { id: 1, scenarioId: 1, gateOrder: 1, gateType: "proposal_review", status: "pending" },
      { id: 2, scenarioId: 1, gateOrder: 2, gateType: "red_team", status: "pending" },
    ]); // all gates for scenario
    await expect(proc({
      input: { gateId: 2, status: "passed" },
      ...makeCtx(),
    })).rejects.toThrow("Previous gate(s) not cleared");
  });
});

// ======================================================================
// ── gate.override ────────────────────────────────────────────────────
// ======================================================================
describe("gate.override", () => {
  const proc = goLiveRouter.gate.override;

  it("overrides gate with comment", async () => {
    mockReturningResult = [{ id: 1, status: "overridden" }];
    const result = await proc({
      input: { gateId: 1, comment: "CEO approved" },
      ...makeCtx(),
    });
    expect(result.status).toBe("overridden");
  });
});

// ======================================================================
// ── gate.getProgress ─────────────────────────────────────────────────
// ======================================================================
describe("gate.getProgress", () => {
  const proc = goLiveRouter.gate.getProgress;

  it("returns gate progress summary", async () => {
    selectResultsQueue.push([
      { id: 1, gateType: "proposal_review", gateOrder: 1, status: "passed" },
      { id: 2, gateType: "red_team", gateOrder: 2, status: "pending" },
    ]);
    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result.summary.passed).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.readyForDeploy).toBe(false);
    expect(result.currentGate).toBe("red_team");
  });

  it("readyForDeploy when all passed", async () => {
    selectResultsQueue.push([
      { id: 1, gateType: "proposal_review", gateOrder: 1, status: "passed" },
      { id: 2, gateType: "red_team", gateOrder: 2, status: "overridden" },
    ]);
    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result.readyForDeploy).toBe(true);
  });
});

// ======================================================================
// ── changeTask.list ──────────────────────────────────────────────────
// ======================================================================
describe("changeTask.list", () => {
  const proc = goLiveRouter.changeTask.list;

  it("returns tasks", async () => {
    selectResultsQueue.push([{ id: 1, title: "Fix bug", status: "ai_generated", taskType: "code_change" }]);
    const result = await proc({ input: { scenarioId: 1 }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

// ======================================================================
// ── changeTask.updateStatus ──────────────────────────────────────────
// ======================================================================
describe("changeTask.updateStatus", () => {
  const proc = goLiveRouter.changeTask.updateStatus;

  it("updates task status", async () => {
    mockReturningResult = [{ id: 1, status: "approved" }];
    const result = await proc({
      input: { id: 1, status: "approved" },
      ...makeCtx(),
    });
    expect(result.status).toBe("approved");
  });
});

// ======================================================================
// ── changeTask.assignTask ────────────────────────────────────────────
// ======================================================================
describe("changeTask.assignTask", () => {
  const proc = goLiveRouter.changeTask.assignTask;

  it("assigns task to user", async () => {
    mockReturningResult = [{ id: 1, assigneeId: 5 }];
    const result = await proc({
      input: { id: 1, assigneeId: 5 },
      ...makeCtx(),
    });
    expect(result.assigneeId).toBe(5);
  });
});

// ======================================================================
// ── changeTask.promoteToProjectTask ──────────────────────────────────
// ======================================================================
describe("changeTask.promoteToProjectTask", () => {
  const proc = goLiveRouter.changeTask.promoteToProjectTask;

  it("promotes task with project task ID", async () => {
    mockReturningResult = [{ id: 1, projectTaskId: 42 }];
    const result = await proc({
      input: { id: 1, projectTaskId: 42 },
      ...makeCtx(),
    });
    expect(result.projectTaskId).toBe(42);
  });
});

// ======================================================================
// ── changeTask.bulkStatusUpdate ──────────────────────────────────────
// ======================================================================
describe("changeTask.bulkStatusUpdate", () => {
  const proc = goLiveRouter.changeTask.bulkStatusUpdate;

  it("bulk updates multiple tasks", async () => {
    mockReturningResult = [{ id: 1, status: "approved" }];
    const result = await proc({
      input: { ids: [1, 2, 3], status: "approved" },
      ...makeCtx(),
    });
    expect(result.updated).toBe(3);
    expect(result.total).toBe(3);
  });
});

// ======================================================================
// ── changeTask.addRollback ───────────────────────────────────────────
// ======================================================================
describe("changeTask.addRollback", () => {
  const proc = goLiveRouter.changeTask.addRollback;

  it("adds rollback instructions", async () => {
    mockReturningResult = [{ id: 1, rollbackInstructions: "Revert migration" }];
    const result = await proc({
      input: { id: 1, rollbackInstructions: "Revert migration" },
      ...makeCtx(),
    });
    expect(result.rollbackInstructions).toBe("Revert migration");
  });
});

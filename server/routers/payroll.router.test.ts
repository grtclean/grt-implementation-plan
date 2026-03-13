/**
 * Smart Payroll Engine Router — Unit Tests
 *
 * Covers all 8 sub-routers (36 tests):
 *   structures (4), attendance (3), performance (3), ledger (8), awards (4),
 *   readiness (2), confidentiality (3), perfWageOverride (2)
 *
 * Run: pnpm test -- server/routers/payroll.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
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
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
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

// ── Mock schemas ────────────────────────────────────────
vi.mock("../../drizzle/smart-payroll-schema", () => ({
  salaryStructures: { id: "id", employeeId: "employee_id", effectiveFrom: "effective_from", department: "department" },
  attendanceRecords: { id: "id", employeeId: "employee_id", period: "period" },
  performanceEvaluations: { id: "id", employeeId: "employee_id", period: "period" },
  payrollLedgers: {
    id: "id", ledgerCode: "ledger_code", employeeId: "employee_id", period: "period",
    status: "status", grossPay: "gross_pay", netPay: "net_pay", incomeTax: "income_tax",
    totalSocialInsurance: "total_social_insurance", overtimePay: "overtime_pay",
    performanceBonus: "performance_bonus", specialBonus: "special_bonus", totalDeductions: "total_deductions",
    performanceWage1: "perf_wage1", performanceWage2: "perf_wage2", performanceWage3: "perf_wage3",
  },
  payrollApprovalLogs: { id: "id", ledgerId: "ledger_id", fromStatus: "from_status", toStatus: "to_status" },
  payrollExcellenceAwards: { id: "id", employeeId: "employee_id", period: "period", awardAmount: "award_amount", awardType: "award_type" },
  payrollAccessControl: { id: "id", userId: "user_id", isActive: "is_active", canOverridePerf: "can_override_perf", accessLevel: "access_level" },
  perfWageOverrideAudit: { id: "id", ledgerId: "ledger_id", employeeId: "employee_id", period: "period", wageSlot: "wage_slot" },
}));

vi.mock("../../drizzle/schema", () => ({
  hrmEmployees: { id: "id" },
  aiTasks: { id: "id", taskType: "task_type", status: "status", inputData: "input_data" },
}));

// ── Mock payroll calculator ─────────────────────────────
vi.mock("../workers/payrollCalculator", () => ({
  calculateEmployeePayroll: vi.fn(async (input: any) => ({
    success: true,
    employeeId: input.employeeId,
    period: input.period,
    ledgerCode: `PAY-${input.period}-${String(input.employeeId).padStart(4, "0")}`,
    breakdown: {
      baseSalary: "10000.00", totalAllowances: "3000.00", overtimePay: "500.00",
      performanceBonus: "2000.00", specialBonus: "0.00", projectBonus: "0.00",
      grossPay: "15500.00", attendanceDeduction: "0.00",
      pensionEmployee: "800.00", medicalEmployee: "200.00", unemploymentEmployee: "50.00",
      housingFundEmployee: "1200.00", totalSocialInsurance: "2250.00",
      taxableIncome: "8250.00", incomeTax: "247.50",
      totalDeductions: "2497.50", netPay: "13002.50", taxBracket: 1,
    },
  })),
  calculateBatchPayroll: vi.fn(async (period: string, ids?: number[]) => ({
    total: (ids || [1, 2, 3]).length,
    success: (ids || [1, 2, 3]).length,
    failed: 0,
    results: [],
  })),
  processPayrollTask: vi.fn(async () => {}),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(),
  sum: vi.fn((col: any) => col),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Import router after mocks ───────────────────────────
import { payrollRouter } from "./payroll.router";

function makeCtx(role = "admin") {
  return { ctx: { user: { id: 1, role } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue.length = 0;
});

// ======================================================================
// ── structures ──────────────────────────────────────────────────────
// ======================================================================
describe("structures.get", () => {
  it("returns salary structure for employee", async () => {
    selectResultsQueue.push([{ id: 1, employeeId: 10, baseSalary: "15000.00" }]);
    const result = await payrollRouter.structures.get({ input: { employeeId: 10 }, ...makeCtx() });
    expect(result).toBeDefined();
    expect(result.baseSalary).toBe("15000.00");
  });

  it("returns null when no structure found", async () => {
    selectResultsQueue.push([]);
    const result = await payrollRouter.structures.get({ input: { employeeId: 999 }, ...makeCtx() });
    expect(result).toBeNull();
  });
});

describe("structures.upsert", () => {
  it("creates new salary structure", async () => {
    selectResultsQueue.push([]); // No existing
    const result = await payrollRouter.structures.upsert({
      input: {
        employeeId: 10, effectiveFrom: "2026-03-01",
        baseSalary: "15000", socialInsuranceBase: "12000", housingFundBase: "12000",
      },
      ...makeCtx(),
    });
    expect(result.action).toBe("created");
  });

  it("updates existing salary structure", async () => {
    selectResultsQueue.push([{ id: 5, employeeId: 10 }]); // Existing found
    const result = await payrollRouter.structures.upsert({
      input: {
        employeeId: 10, effectiveFrom: "2026-03-01",
        baseSalary: "16000", socialInsuranceBase: "12000", housingFundBase: "12000",
      },
      ...makeCtx(),
    });
    expect(result.action).toBe("updated");
  });
});

describe("structures.list", () => {
  it("returns list of salary structures", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
    const result = await payrollRouter.structures.list({ input: { limit: 50 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("structures.getHistory", () => {
  it("returns history for employee", async () => {
    selectResultsQueue.push([{ id: 1, effectiveFrom: "2026-01-01" }, { id: 2, effectiveFrom: "2025-06-01" }]);
    const result = await payrollRouter.structures.getHistory({ input: { employeeId: 10 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ======================================================================
// ── attendance ──────────────────────────────────────────────────────
// ======================================================================
describe("attendance.get", () => {
  it("returns attendance record", async () => {
    selectResultsQueue.push([{ id: 1, employeeId: 10, period: "2026-03", actualDays: "21" }]);
    const result = await payrollRouter.attendance.get({ input: { employeeId: 10, period: "2026-03" }, ...makeCtx() });
    expect(result.actualDays).toBe("21");
  });
});

describe("attendance.upsert", () => {
  it("creates attendance record", async () => {
    selectResultsQueue.push([]); // No existing
    const result = await payrollRouter.attendance.upsert({
      input: { employeeId: 10, period: "2026-03", scheduledDays: 22, actualDays: "21" },
      ...makeCtx(),
    });
    expect(result.action).toBe("created");
  });
});

describe("attendance.list", () => {
  it("returns attendance list for period", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
    const result = await payrollRouter.attendance.list({ input: { period: "2026-03", limit: 100 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

// ======================================================================
// ── performance ─────────────────────────────────────────────────────
// ======================================================================
describe("performance.get", () => {
  it("returns performance evaluation", async () => {
    selectResultsQueue.push([{ id: 1, mboScore: "85.00", evaluationGrade: "A" }]);
    const result = await payrollRouter.performance.get({ input: { employeeId: 10, period: "2026-03" }, ...makeCtx() });
    expect(result.evaluationGrade).toBe("A");
  });
});

describe("performance.upsert", () => {
  it("creates performance evaluation", async () => {
    selectResultsQueue.push([]);
    const result = await payrollRouter.performance.upsert({
      input: { employeeId: 10, period: "2026-03", mboScore: "85.00", evaluationGrade: "A" },
      ...makeCtx(),
    });
    expect(result.action).toBe("created");
  });
});

describe("performance.list", () => {
  it("returns evaluations for period", async () => {
    selectResultsQueue.push([{ id: 1 }]);
    const result = await payrollRouter.performance.list({ input: { period: "2026-03", limit: 100 }, ...makeCtx() });
    expect(result).toHaveLength(1);
  });
});

// ======================================================================
// ── ledger ──────────────────────────────────────────────────────────
// ======================================================================
describe("ledger.calculate", () => {
  it("calculates single employee payroll", async () => {
    const result = await payrollRouter.ledger.calculate({
      input: { employeeId: 10, period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.success).toBe(true);
    expect(result.breakdown.netPay).toBe("13002.50");
  });
});

describe("ledger.calculateBatch", () => {
  it("queues batch calculation task", async () => {
    mockReturningResult = [{ id: 42 }];
    const result = await payrollRouter.ledger.calculateBatch({
      input: { period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.status).toBe("queued");
    expect(result.taskId).toBe(42);
  });
});

describe("ledger.get", () => {
  it("returns ledger by id", async () => {
    selectResultsQueue.push([{ id: 1, ledgerCode: "PAY-2026-03-0001", netPay: "13000.00" }]);
    const result = await payrollRouter.ledger.get({ input: { id: 1 }, ...makeCtx() });
    expect(result.ledgerCode).toBe("PAY-2026-03-0001");
  });
});

describe("ledger.list", () => {
  it("returns ledgers for period", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const result = await payrollRouter.ledger.list({ input: { period: "2026-03", limit: 100 }, ...makeCtx() });
    expect(result).toHaveLength(3);
  });
});

describe("ledger.getPeriodSummary", () => {
  it("returns period summary with MoM comparison", async () => {
    // Summary query
    selectResultsQueue.push([{
      totalEmployees: 50, totalGrossPay: "750000.00", totalNetPay: "600000.00",
      totalTax: "50000.00", totalSocialInsurance: "100000.00",
      totalOvertime: "20000.00", totalPerformanceBonus: "80000.00",
      totalSpecialBonus: "10000.00", totalDeductions: "150000.00",
    }]);
    // Status distribution
    selectResultsQueue.push([{ status: "DRAFT", cnt: 10 }, { status: "PAID", cnt: 40 }]);
    // Previous period
    selectResultsQueue.push([{
      totalGrossPay: "700000.00", totalNetPay: "560000.00",
      totalOvertime: "15000.00", totalPerformanceBonus: "75000.00",
    }]);

    const result = await payrollRouter.ledger.getPeriodSummary({ input: { period: "2026-03" }, ...makeCtx() });
    expect(result.period).toBe("2026-03");
    expect(Number(result.totalEmployees)).toBe(50);
    expect(result.momChangePercent).toBeDefined();
  });
});

describe("ledger.submitForApproval", () => {
  it("transitions DRAFT to HR_VERIFIED", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]); // 2 draft records
    const result = await payrollRouter.ledger.submitForApproval({
      input: { period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.updated).toBe(2);
  });

  it("returns 0 when no drafts found", async () => {
    selectResultsQueue.push([]);
    const result = await payrollRouter.ledger.submitForApproval({
      input: { period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.updated).toBe(0);
  });
});

describe("ledger.approvePayroll", () => {
  it("transitions FINANCE_APPROVED to CEO_APPROVED for admin", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
    const result = await payrollRouter.ledger.approvePayroll({
      input: { period: "2026-03", fromStatus: "FINANCE_APPROVED" },
      ...makeCtx("admin"),
    });
    expect(result.updated).toBe(2);
    expect(result.toStatus).toBe("CEO_APPROVED");
  });

  it("rejects unauthorized role", async () => {
    const result = await payrollRouter.ledger.approvePayroll({
      input: { period: "2026-03", fromStatus: "FINANCE_APPROVED" },
      ...makeCtx("employee"),
    });
    expect(result.updated).toBe(0);
    expect(result.error).toContain("cannot approve");
  });
});

describe("ledger.executePayout", () => {
  it("executes payout for CEO_APPROVED records", async () => {
    selectResultsQueue.push([{ id: 1, netPay: "13000.00" }, { id: 2, netPay: "15000.00" }]);
    const result = await payrollRouter.ledger.executePayout({
      input: { period: "2026-03", confirmationCode: "TEST1234" },
      ...makeCtx("admin"),
    });
    expect(result.success).toBe(true);
    expect(result.paid).toBe(2);
  });

  it("rejects payout without CEO_APPROVED records", async () => {
    selectResultsQueue.push([]);
    const result = await payrollRouter.ledger.executePayout({
      input: { period: "2026-03", confirmationCode: "TEST1234" },
      ...makeCtx("admin"),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("CEO_APPROVED");
  });

  it("rejects unauthorized role for payout", async () => {
    const result = await payrollRouter.ledger.executePayout({
      input: { period: "2026-03", confirmationCode: "TEST1234" },
      ...makeCtx("hr_specialist"),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("finance_manager");
  });
});

// ======================================================================
// ── awards ──────────────────────────────────────────────────────────
// ======================================================================
describe("awards.create", () => {
  it("creates excellence award", async () => {
    mockReturningResult = [{ id: 1, employeeId: 10, awardType: "outstanding_contributor", awardAmount: "5000.00" }];
    const result = await payrollRouter.awards.create({
      input: {
        employeeId: 10, period: "2026-03",
        awardType: "outstanding_contributor", awardAmount: "5000.00",
        reason: "Q1超额完成目标",
      },
      ...makeCtx(),
    });
    expect(result.awardType).toBe("outstanding_contributor");
  });
});

describe("awards.list", () => {
  it("returns awards for period", async () => {
    selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
    const result = await payrollRouter.awards.list({ input: { period: "2026-03", limit: 50 }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("awards.getByPeriod", () => {
  it("returns awards sorted by amount", async () => {
    selectResultsQueue.push([{ id: 1, awardAmount: "10000.00" }, { id: 2, awardAmount: "5000.00" }]);
    const result = await payrollRouter.awards.getByPeriod({ input: { period: "2026-03" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

describe("awards.delete", () => {
  it("deletes award", async () => {
    const result = await payrollRouter.awards.delete({ input: { id: 1 }, ...makeCtx() });
    expect(result.deleted).toBe(true);
  });
});

// ======================================================================
// ── readiness ────────────────────────────────────────────────────────
// ======================================================================
describe("readiness.check", () => {
  it("returns readiness report with all checks", async () => {
    selectResultsQueue.push([{ cnt: 90 }]);   // salary_structures count
    selectResultsQueue.push([{ cnt: 85 }]);   // attendance_records count
    selectResultsQueue.push([{ cnt: 80 }]);   // performance_evaluations count
    selectResultsQueue.push([{ cnt: 0 }]);    // payroll_ledgers count

    const result = await payrollRouter.readiness.check({ input: { period: "2026-03" }, ...makeCtx() });
    expect(result.period).toBe("2026-03");
    expect(result.checks).toHaveLength(4);
    expect(result.summary.totalStructures).toBe(90);
    expect(result.summary.canCalculate).toBe(true);
  });

  it("reports canCalculate=false when no salary structures", async () => {
    selectResultsQueue.push([{ cnt: 0 }]);
    selectResultsQueue.push([{ cnt: 0 }]);
    selectResultsQueue.push([{ cnt: 0 }]);
    selectResultsQueue.push([{ cnt: 0 }]);

    const result = await payrollRouter.readiness.check({ input: { period: "2026-03" }, ...makeCtx() });
    expect(result.summary.canCalculate).toBe(false);
    expect(result.checks[0].status).toBe("missing");
  });
});

describe("readiness.seedDefaultAttendance", () => {
  it("seeds attendance for employees missing records", async () => {
    // salary_structures employees
    selectResultsQueue.push([{ employeeId: 1 }, { employeeId: 2 }, { employeeId: 3 }]);
    // existing attendance
    selectResultsQueue.push([{ employeeId: 1 }]);

    const result = await payrollRouter.readiness.seedDefaultAttendance({
      input: { period: "2026-03" },
      ...makeCtx(),
    });
    expect(result.seeded).toBe(2); // 3 total - 1 existing = 2 new
  });
});

// ======================================================================
// ── confidentiality ──────────────────────────────────────────────────
// ======================================================================
describe("confidentiality.checkAccess", () => {
  it("returns hasAccess=true for authorized user", async () => {
    selectResultsQueue.push([{ id: 1, accessLevel: "full", canViewAll: true, canApprove: true, canOverridePerf: true, canExport: true, expiresAt: null }]);
    const result = await payrollRouter.confidentiality.checkAccess({ ...makeCtx() });
    expect(result.hasAccess).toBe(true);
    expect(result.level).toBe("full");
  });

  it("returns hasAccess=false for unauthorized user", async () => {
    selectResultsQueue.push([]);
    const result = await payrollRouter.confidentiality.checkAccess({ ...makeCtx("employee") });
    expect(result.hasAccess).toBe(false);
  });
});

describe("confidentiality.grantAccess", () => {
  it("grants payroll access", async () => {
    mockReturningResult = [{ id: 1, userId: 10, employeeGrtId: "GRT080" }];
    const result = await payrollRouter.confidentiality.grantAccess({
      input: { userId: 10, employeeGrtId: "GRT080", employeeName: "刘奥运", accessLevel: "full" },
      ...makeCtx(),
    });
    expect(result.userId).toBe(10);
  });
});

// ======================================================================
// ── perfWageOverride ─────────────────────────────────────────────────
// ======================================================================
describe("perfWageOverride.override", () => {
  it("overrides wage with admin role", async () => {
    selectResultsQueue.push([]); // no access control row (but user is admin)
    selectResultsQueue.push([{ id: 1, employeeId: 10, period: "2026-03", performanceWage1: "1500.00", performanceWage2: "1000.00", performanceWage3: "500.00" }]);
    const result = await payrollRouter.perfWageOverride.override({
      input: { ledgerId: 1, wageSlot: "wage1", overrideValue: "2000.00", reason: "CEO特批优秀员工绩效工资" },
      ...makeCtx("admin"),
    });
    expect(result.success).toBe(true);
  });
});

describe("perfWageOverride.listOverrides", () => {
  it("returns override audit trail", async () => {
    selectResultsQueue.push([{ id: 1, wageSlot: "wage1" }, { id: 2, wageSlot: "wage2" }]);
    const result = await payrollRouter.perfWageOverride.listOverrides({ input: { period: "2026-03" }, ...makeCtx() });
    expect(result).toHaveLength(2);
  });
});

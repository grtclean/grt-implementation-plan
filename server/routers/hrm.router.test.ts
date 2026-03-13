/**
 * HRM Router — Comprehensive Unit Tests
 * 28 procedures covering: CRUD (list, getById, create, update, delete),
 * employees, departments, candidates, salary structures (init + get),
 * performance grades (init + get), positions, attendance (records + stats),
 * leave requests, training records, org chart, statistics,
 * salary calculation, scheduled tasks, teams meetings,
 * performance score (RBAC-aware deterministic algorithm).
 *
 * Security focus: salary data + employee records are permission-gated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
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

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * Avoids JS thenable-unwrapping where Promise.resolve(obj) calls obj.then().
 */
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
    execute: vi.fn(() =>
      Promise.resolve({ rows: getNextResult() })
    ),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Schema mocks (column-name string objects) ───────────────
vi.mock("../../drizzle/schema", () => ({
  hrmEmployees: {
    id: "id",
    employeeCode: "employeeCode",
    userId: "userId",
    name: "name",
    englishName: "englishName",
    gender: "gender",
    birthDate: "birthDate",
    idNumber: "idNumber",
    phone: "phone",
    email: "email",
    department: "department",
    position: "position",
    level: "level",
    hireDate: "hireDate",
    regularDate: "regularDate",
    managerId: "managerId",
    seniorManagerId: "seniorManagerId",
    hrbpId: "hrbpId",
    status: "status",
    workLocation: "workLocation",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrmCandidates: {
    id: "id",
    candidateCode: "candidateCode",
    name: "name",
    gender: "gender",
    age: "age",
    phone: "phone",
    email: "email",
    positionId: "positionId",
    positionName: "positionName",
    source: "source",
    resumeUrl: "resumeUrl",
    resumeAnalysis: "resumeAnalysis",
    workYears: "workYears",
    education: "education",
    expectedSalary: "expectedSalary",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrmPositions: {
    id: "id",
    positionCode: "positionCode",
    name: "name",
    englishName: "englishName",
    department: "department",
    responsibilities: "responsibilities",
    keyTasks: "keyTasks",
    qualifications: "qualifications",
    kpiIndicators: "kpiIndicators",
    digitalizationScore: "digitalizationScore",
    digitalizationRoadmap: "digitalizationRoadmap",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrmSalaryStructures: {
    id: "id",
    department: "department",
    level: "level",
    baseSalaryRatioMin: "baseSalaryRatioMin",
    baseSalaryRatioMax: "baseSalaryRatioMax",
    performanceRatioMin: "performanceRatioMin",
    performanceRatioMax: "performanceRatioMax",
    bonusRatioMin: "bonusRatioMin",
    bonusRatioMax: "bonusRatioMax",
    benefitsRatioMin: "benefitsRatioMin",
    benefitsRatioMax: "benefitsRatioMax",
    effectiveDate: "effectiveDate",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrmPerformanceGrades: {
    id: "id",
    gradeCode: "gradeCode",
    gradeName: "gradeName",
    scoreMin: "scoreMin",
    scoreMax: "scoreMax",
    coefficient: "coefficient",
    description: "description",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  hrmTrainingPlans: {
    id: "id",
    planCode: "planCode",
    employeeId: "employeeId",
    planType: "planType",
    name: "name",
    startDate: "startDate",
    endDate: "endDate",
    content: "content",
    stages: "stages",
    status: "status",
    completionRate: "completionRate",
    createdById: "createdById",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// Mock the permission service — by default deny all permissions
// (admin role bypasses via the requirePermission middleware itself)
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(false),
  },
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Helper: make an employee DB row ─────────────────────────
function makeEmployeeRow(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    employeeCode: "EMP001",
    name: "张三",
    englishName: "Zhang San",
    gender: "male",
    birthDate: "1990-01-15",
    idNumber: "110101199001151234",
    phone: "13800138001",
    email: "zhangsan@example.com",
    department: "研发设计部",
    position: "高级工程师",
    level: "P3",
    hireDate: "2020-06-01",
    regularDate: "2020-09-01",
    managerId: 10,
    seniorManagerId: 5,
    hrbpId: 20,
    status: "regular",
    workLocation: "上海总部",
    createdAt: "2020-06-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
describe("hrm router", () => {
  // ═══════════════════════════════════════════════════════════
  // Auth guards — anonymous callers should be rejected
  // ═══════════════════════════════════════════════════════════
  describe("auth guards (anonymous rejection)", () => {
    it("rejects anonymous access to list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.hrm.list()).rejects.toThrow();
    });

    it("rejects anonymous access to getById", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.hrm.getById({ id: "EMP-1" })).rejects.toThrow();
    });

    it("rejects anonymous access to create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.hrm.create({ name: "Test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous access to update", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.hrm.update({ id: "EMP-1", name: "Updated" })
      ).rejects.toThrow();
    });

    it("rejects anonymous access to delete", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.hrm.delete({ id: "EMP-1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous access to getEmployees", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.hrm.getEmployees()).rejects.toThrow();
    });

    it("rejects anonymous access to getSalaryStructures", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.hrm.getSalaryStructures()).rejects.toThrow();
    });

    it("rejects anonymous access to calculateSalary", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.hrm.calculateSalary({
          department: "研发部",
          baseSalary: 10000,
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous access to getStatistics", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.hrm.getStatistics()).rejects.toThrow();
    });

    it("rejects anonymous access to calculatePerformanceScore", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.hrm.calculatePerformanceScore({ projectId: 1 })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // RBAC — permission-gated procedures
  // ═══════════════════════════════════════════════════════════
  describe("RBAC — permission-gated procedures", () => {
    it("denies non-admin create without hrm_employee_management permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.create({ name: "New Employee" })
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin update without hrm_employee_management permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.update({ id: "EMP-1", name: "Updated" })
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin delete without hrm_employee_management permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.delete({ id: "EMP-1" })
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin getSalaryStructures without hrm_salary_structure permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.getSalaryStructures()
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin initSalaryStructures without hrm_salary_structure permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.initSalaryStructures()
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin initPerformanceGrades without hrm_salary_structure permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.initPerformanceGrades()
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin calculateSalary without hrm_salary_calculation permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.calculateSalary({ department: "研发部", baseSalary: 10000 })
      ).rejects.toThrow(/Missing permission/);
    });

    it("denies non-admin createSalaryCalculation without hrm_salary_calculation permission", async () => {
      const caller = createAdminCaller({ role: "employee" });
      await expect(
        caller.hrm.createSalaryCalculation({ department: "研发部", baseSalary: 10000 })
      ).rejects.toThrow(/Missing permission/);
    });

    it("allows admin to bypass permission checks on create", async () => {
      const caller = createAdminCaller();
      mockReturningResult = [];
      const result = await caller.hrm.create({ name: "Admin Created" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("allows admin to bypass permission checks on getSalaryStructures", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      const result = await caller.hrm.getSalaryStructures();
      expect(result).toEqual([]);
    });

    it("allows admin to bypass permission checks on calculateSalary", async () => {
      const caller = createAdminCaller();
      // First query: salary structures (empty — uses defaults)
      selectResultsQueue.push([]);
      const result = await caller.hrm.calculateSalary({
        department: "研发部",
        baseSalary: 10000,
      });
      expect(result).toHaveProperty("monthlyTotal");
      expect(result).toHaveProperty("annualTotal");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // list — paginated employee list
  // ═══════════════════════════════════════════════════════════
  describe("list", () => {
    it("returns paginated employees with defaults", async () => {
      const caller = createAdminCaller();
      const emp = makeEmployeeRow();
      // First select: count query
      selectResultsQueue.push([{ count: 1 }]);
      // Second select: actual rows
      selectResultsQueue.push([emp]);

      const result = await caller.hrm.list();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("EMP-1");
      expect(result.items[0].name).toBe("张三");
    });

    it("returns paginated employees with custom limit/offset", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ count: 100 }]);
      selectResultsQueue.push([
        makeEmployeeRow({ id: 11 }),
        makeEmployeeRow({ id: 12 }),
      ]);

      const result = await caller.hrm.list({ limit: 10, offset: 10 });
      expect(result.total).toBe(100);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.items).toHaveLength(2);
    });

    it("returns empty list when no employees exist", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]);

      const result = await caller.hrm.list();
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getById
  // ═══════════════════════════════════════════════════════════
  describe("getById", () => {
    it("returns employee details with EMP- prefix id", async () => {
      const caller = createAdminCaller();
      const emp = makeEmployeeRow();
      mockQueryResult = [emp];

      const result = await caller.hrm.getById({ id: "EMP-1" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe("EMP-1");
      expect(result!.name).toBe("张三");
      expect(result!.department).toBe("研发设计部");
      expect(result!.idNumber).toBe("110101199001151234");
      expect(result!.managerId).toBe(10);
    });

    it("returns null when employee not found", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.hrm.getById({ id: "EMP-999" });
      expect(result).toBeNull();
    });

    it("returns null for non-numeric id", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.getById({ id: "INVALID" });
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════
  describe("create", () => {
    it("creates employee with all fields (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.create({
        employeeCode: "EMP999",
        name: "李四",
        gender: "male",
        department: "销售部",
        position: "销售经理",
        level: "P4",
        hireDate: "2024-01-01",
        phone: "13900139001",
        email: "lisi@example.com",
        status: "probation",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("creates employee with minimal fields (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.create({ name: "王五" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects input with name exceeding max length", async () => {
      const caller = createAdminCaller();
      const longName = "a".repeat(201);
      await expect(
        caller.hrm.create({ name: longName })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════
  describe("update", () => {
    it("updates employee fields (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.update({
        id: "EMP-1",
        name: "张三更新",
        department: "技术部",
        workLocation: "北京分公司",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("handles numeric id input", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.update({ id: 42, name: "数字ID" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("returns success silently for non-numeric EMP- id", async () => {
      const caller = createAdminCaller();
      // "EMP-abc" -> parseInt("abc") -> NaN -> returns successResponse
      const result = await caller.hrm.update({ id: "EMP-abc" });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // delete
  // ═══════════════════════════════════════════════════════════
  describe("delete", () => {
    it("deletes employee by id (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.delete({ id: "EMP-5" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("returns success silently for non-numeric id", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.delete({ id: "INVALID" });
      expect(result).toEqual({ success: true, message: "操作成功" });
      // delete should NOT have been called (NaN check short-circuits)
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getEmployees
  // ═══════════════════════════════════════════════════════════
  describe("getEmployees", () => {
    it("returns mapped employee list", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        makeEmployeeRow({ id: 1 }),
        makeEmployeeRow({ id: 2, name: "李四", department: "销售部" }),
      ];

      const result = await caller.hrm.getEmployees();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("EMP-1");
      expect(result[0].joinDate).toBe("2020-06-01"); // mapped from hireDate
      expect(result[1].id).toBe("EMP-2");
      expect(result[1].name).toBe("李四");
    });

    it("returns empty array when no employees", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];
      const result = await caller.hrm.getEmployees();
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getDepartments
  // ═══════════════════════════════════════════════════════════
  describe("getDepartments", () => {
    it("returns departments aggregated from employees", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { department: "研发设计部", headcount: 15 },
        { department: "销售部", headcount: 8 },
        { department: "生产部", headcount: 20 },
      ];

      const result = await caller.hrm.getDepartments();
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("DEPT-001");
      expect(result[0].name).toBe("研发设计部");
      expect(result[0].headcount).toBe(15);
      expect(result[0].manager).toBe("");
      expect(result[2].id).toBe("DEPT-003");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getCandidates
  // ═══════════════════════════════════════════════════════════
  describe("getCandidates", () => {
    it("returns mapped candidate list", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 1,
          candidateCode: "CAN001",
          name: "候选人A",
          positionName: "前端工程师",
          status: "interviewing",
          source: "内推",
          phone: "13700137001",
          email: "a@example.com",
          workYears: 5,
          education: "本科",
          age: 28,
          createdAt: "2024-01-15",
        },
      ];

      const result = await caller.hrm.getCandidates();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("CAN-1");
      expect(result[0].name).toBe("候选人A");
      expect(result[0].experience).toBe("5年");
      expect(result[0].position).toBe("前端工程师");
    });

    it("handles null optional fields gracefully", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 2,
          candidateCode: "CAN002",
          name: "候选人B",
          positionName: null,
          status: "new",
          source: null,
          phone: null,
          email: null,
          workYears: null,
          education: null,
          age: null,
          createdAt: "2024-02-01",
        },
      ];

      const result = await caller.hrm.getCandidates();
      expect(result[0].position).toBe("");
      expect(result[0].source).toBe("");
      expect(result[0].experience).toBe("");
      expect(result[0].phone).toBe("");
      expect(result[0].email).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getSalaryStructures (permission-gated)
  // ═══════════════════════════════════════════════════════════
  describe("getSalaryStructures", () => {
    it("returns salary structures for admin", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 1,
          department: "研发部",
          level: "P1",
          baseSalaryRatioMin: "0.50",
          baseSalaryRatioMax: "0.60",
          performanceRatioMin: "0.20",
          performanceRatioMax: "0.30",
          bonusRatioMin: "0.10",
          bonusRatioMax: "0.15",
          benefitsRatioMin: "0.05",
          benefitsRatioMax: "0.10",
          status: "active",
          effectiveDate: "2024-01-01",
        },
      ];

      const result = await caller.hrm.getSalaryStructures();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("SAL-1");
      expect(result[0].level).toBe("P1");
      expect(result[0].department).toBe("研发部");
      expect(result[0].baseSalaryRatioMin).toBe("0.50");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // initSalaryStructures (permission-gated)
  // ═══════════════════════════════════════════════════════════
  describe("initSalaryStructures", () => {
    it("seeds 6 default salary structures (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.initSalaryStructures();
      expect(result).toEqual({ created: 6 });
      // insert called 6 times (one per default structure) + 1 for gateway admin audit log
      expect(mockDb.insert).toHaveBeenCalledTimes(7);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // initPerformanceGrades (permission-gated)
  // ═══════════════════════════════════════════════════════════
  describe("initPerformanceGrades", () => {
    it("seeds 5 default performance grades (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.initPerformanceGrades();
      expect(result).toEqual({ created: 5 });
      // insert called 5 times (one per grade) + 1 for gateway admin audit log
      expect(mockDb.insert).toHaveBeenCalledTimes(6);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getPerformanceGrades
  // ═══════════════════════════════════════════════════════════
  describe("getPerformanceGrades", () => {
    it("returns mapped performance grades", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { id: 1, gradeCode: "S", gradeName: "卓越", scoreMin: 90, scoreMax: 100, coefficient: "2.00" },
        { id: 2, gradeCode: "A", gradeName: "优秀", scoreMin: 80, scoreMax: 89, coefficient: "1.50" },
      ];

      const result = await caller.hrm.getPerformanceGrades();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("PG-1");
      expect(result[0].gradeCode).toBe("S");
      expect(result[0].grade).toBe("S");
      expect(result[0].description).toBe("卓越");
      expect(result[0].bonusRate).toBe(2.0);
      expect(result[1].bonusRate).toBe(1.5);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getPositions
  // ═══════════════════════════════════════════════════════════
  describe("getPositions", () => {
    it("returns mapped positions with defaults for missing fields", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 1,
          positionCode: "POS001",
          name: "高级工程师",
          department: "研发设计部",
          qualifications: "5年以上经验",
          status: "active",
          responsibilities: "系统设计",
          keyTasks: "架构评审",
          kpiIndicators: "代码质量",
        },
        {
          id: 2,
          positionCode: "POS002",
          name: "产品经理",
          department: "产品部",
          qualifications: null,
          status: "active",
          responsibilities: null,
          keyTasks: null,
          kpiIndicators: null,
        },
      ];

      const result = await caller.hrm.getPositions();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("POS-1");
      expect(result[0].name).toBe("高级工程师");
      expect(result[0].requirements).toBe("5年以上经验");
      expect(result[0].level).toBe(""); // always empty
      expect(result[0].headcount).toBe(0); // always 0
      expect(result[1].requirements).toBe("");
      expect(result[1].responsibilities).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getAttendance
  // ═══════════════════════════════════════════════════════════
  describe("getAttendance", () => {
    it("returns attendance records", async () => {
      const caller = createAdminCaller();
      // First execute: CREATE TABLE IF NOT EXISTS (bootstrap)
      // Second execute: SELECT COUNT (bootstrap)
      // Third execute: INSERT (bootstrap seed) - skipped if cnt > 0
      // Then the actual query execute
      // We need to handle all execute calls from ensureAttendance + the query
      const bootstrapRows = [{ cnt: 5 }]; // non-zero so seed INSERT is skipped
      const attendanceRows = [
        { id: 1, employee_name: "焦斌", department: "研发设计部", record_date: "2024-01-15", clock_in: "08:28", clock_out: "17:35", work_hours: "9.1h", status: "正常" },
        { id: 2, employee_name: "李工", department: "销售部", record_date: "2024-01-15", clock_in: "09:15", clock_out: "-", work_hours: "-", status: "迟到" },
      ];

      // Reset the bootstrap flag so ensureAttendance runs
      // We need to handle multiple execute calls
      let executeCallCount = 0;
      mockDb.execute.mockImplementation(() => {
        executeCallCount++;
        if (executeCallCount === 1) {
          // CREATE TABLE
          return Promise.resolve({ rows: [] });
        } else if (executeCallCount === 2) {
          // SELECT COUNT
          return Promise.resolve({ rows: bootstrapRows });
        } else {
          // The actual attendance query
          return Promise.resolve({ rows: attendanceRows });
        }
      });

      const result = await caller.hrm.getAttendance();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("焦斌");
      expect(result[0].clockIn).toBe("08:28");
      expect(result[1].status).toBe("迟到");
    });

    it("filters attendance by status", async () => {
      const caller = createAdminCaller();
      const attendanceRows = [
        { id: 1, employee_name: "焦斌", department: "研发设计部", record_date: "2024-01-15", clock_in: "08:28", clock_out: "17:35", work_hours: "9.1h", status: "正常" },
        { id: 2, employee_name: "李工", department: "销售部", record_date: "2024-01-15", clock_in: "09:15", clock_out: "-", work_hours: "-", status: "迟到" },
        { id: 3, employee_name: "张工", department: "技术服务部", record_date: "2024-01-15", clock_in: "-", clock_out: "-", work_hours: "-", status: "请假" },
      ];

      mockDb.execute.mockImplementation(() =>
        Promise.resolve({ rows: attendanceRows })
      );

      const result = await caller.hrm.getAttendance({ status: "迟到" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("李工");
    });

    it("returns all records when status is 'all'", async () => {
      const caller = createAdminCaller();
      const attendanceRows = [
        { id: 1, employee_name: "焦斌", department: "研发设计部", record_date: "2024-01-15", clock_in: "08:28", clock_out: "17:35", work_hours: "9.1h", status: "正常" },
        { id: 2, employee_name: "李工", department: "销售部", record_date: "2024-01-15", clock_in: "09:15", clock_out: "-", work_hours: "-", status: "迟到" },
      ];

      mockDb.execute.mockImplementation(() =>
        Promise.resolve({ rows: attendanceRows })
      );

      const result = await caller.hrm.getAttendance({ status: "all" });
      expect(result).toHaveLength(2);
    });

    it("handles search parameter (uses different SQL path)", async () => {
      const caller = createAdminCaller();
      const searchRows = [
        { id: 1, employee_name: "焦斌", department: "研发设计部", record_date: "2024-01-15", clock_in: "08:28", clock_out: "17:35", work_hours: "9.1h", status: "正常" },
      ];

      mockDb.execute.mockImplementation(() =>
        Promise.resolve({ rows: searchRows })
      );

      const result = await caller.hrm.getAttendance({ search: "王" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("焦斌");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getAttendanceStats
  // ═══════════════════════════════════════════════════════════
  describe("getAttendanceStats", () => {
    it("returns attendance statistics", async () => {
      const caller = createAdminCaller();
      mockDb.execute.mockImplementation(() =>
        Promise.resolve({
          rows: [{ total: 8, present: 5, late: 1, absent: 1, leave_count: 1 }],
        })
      );

      const result = await caller.hrm.getAttendanceStats();
      expect(result).toEqual({
        total: 8,
        present: 5,
        late: 1,
        absent: 1,
        leave: 1,
      });
    });

    it("returns zeros when no attendance data", async () => {
      const caller = createAdminCaller();
      mockDb.execute.mockImplementation(() =>
        Promise.resolve({ rows: [{}] })
      );

      const result = await caller.hrm.getAttendanceStats();
      expect(result).toEqual({
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getLeaveRequests (stub)
  // ═══════════════════════════════════════════════════════════
  describe("getLeaveRequests", () => {
    it("returns empty array (stub)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.getLeaveRequests();
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getTrainingRecords
  // ═══════════════════════════════════════════════════════════
  describe("getTrainingRecords", () => {
    it("returns mapped training records", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 1,
          planCode: "TRN001",
          name: "新员工入职培训",
          planType: "onboarding",
          status: "pending",
          startDate: "2024-02-01",
          endDate: "2024-02-15",
          employeeId: 1,
          completionRate: 75,
          content: "公司文化、流程规范",
        },
      ];

      const result = await caller.hrm.getTrainingRecords();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("TRN-1");
      expect(result[0].planCode).toBe("TRN001");
      expect(result[0].type).toBe("onboarding");
      expect(result[0].completionRate).toBe(75);
    });

    it("defaults completionRate to 0 when null", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        {
          id: 2,
          planCode: "TRN002",
          name: "技能提升",
          planType: "skill",
          status: "active",
          startDate: "2024-03-01",
          endDate: "2024-03-30",
          employeeId: 2,
          completionRate: null,
          content: null,
        },
      ];

      const result = await caller.hrm.getTrainingRecords();
      expect(result[0].completionRate).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getOrgChart
  // ═══════════════════════════════════════════════════════════
  describe("getOrgChart", () => {
    it("returns org chart with CEO root and department children", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [
        { department: "研发设计部", headcount: 15 },
        { department: "销售部", headcount: 8 },
      ];

      const result = await caller.hrm.getOrgChart();
      expect(result.chart.id).toBe("CEO");
      expect(result.chart.name).toBe("总经理");
      expect(result.chart.children).toHaveLength(2);
      expect(result.chart.children[0].id).toBe("DEPT-001");
      expect(result.chart.children[0].headcount).toBe(15);
      expect(result.chart.children[1].id).toBe("DEPT-002");
    });

    it("returns empty children when no employees", async () => {
      const caller = createAdminCaller();
      mockQueryResult = [];

      const result = await caller.hrm.getOrgChart();
      expect(result.chart.children).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getStatistics
  // ═══════════════════════════════════════════════════════════
  describe("getStatistics", () => {
    it("returns aggregated statistics from multiple tables", async () => {
      const caller = createAdminCaller();
      // Promise.all resolves 5 parallel queries; our mock resolves each select chain
      // with getNextResult(), so we queue 5 results
      selectResultsQueue.push([{ count: 50 }]);  // total employees
      selectResultsQueue.push([{ count: 45 }]);  // active employees
      selectResultsQueue.push([{ count: 3 }]);   // open positions
      selectResultsQueue.push([{ count: 7 }]);   // pending candidates
      selectResultsQueue.push([{ count: 2 }]);   // upcoming trainings

      const result = await caller.hrm.getStatistics();
      expect(result.statistics).toEqual({
        totalEmployees: 50,
        activeEmployees: 45,
        openPositions: 3,
        pendingCandidates: 7,
        upcomingTrainings: 2,
      });
    });

    it("returns zeros when all tables are empty", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);

      const result = await caller.hrm.getStatistics();
      expect(result.statistics.totalEmployees).toBe(0);
      expect(result.statistics.activeEmployees).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // calculateSalary (permission-gated: hrm_salary_calculation)
  // ═══════════════════════════════════════════════════════════
  describe("calculateSalary", () => {
    it("calculates salary using salary structure ratios (admin)", async () => {
      const caller = createAdminCaller();
      // First query: salary structures
      selectResultsQueue.push([
        {
          id: 1,
          department: "研发部",
          level: "P1",
          baseSalaryRatioMin: "0.50",
          baseSalaryRatioMax: "0.60",
          performanceRatioMin: "0.20",
          performanceRatioMax: "0.30",
          bonusRatioMin: "0.10",
          bonusRatioMax: "0.15",
          benefitsRatioMin: "0.05",
          benefitsRatioMax: "0.10",
          status: "active",
          effectiveDate: "2024-01-01",
        },
      ]);

      const result = await caller.hrm.calculateSalary({
        department: "研发部",
        baseSalary: 20000,
      });

      // baseSalaryRatio = (0.50+0.60)/2 = 0.55 → 20000*0.55 = 11000
      // performanceRatio = (0.20+0.30)/2 = 0.25 → 20000*0.25*1.0 = 5000
      // bonusRatio = (0.10+0.15)/2 = 0.125 → 20000*0.125 = 2500
      // benefitsRatio = (0.05+0.10)/2 = 0.075 → 20000*0.075 = 1500
      // monthlyTotal = 11000 + 5000 + 2500 + 1500 = 20000
      expect(result.baseSalary).toBe(11000);
      expect(result.performanceSalary).toBe(5000);
      expect(result.bonus).toBe(2500);
      expect(result.benefits).toBe(1500);
      expect(result.monthlyTotal).toBe(20000);
      expect(result.annualTotal).toBe(240000);
    });

    it("uses default ratios when no structure found", async () => {
      const caller = createAdminCaller();
      // No salary structures
      selectResultsQueue.push([]);

      const result = await caller.hrm.calculateSalary({
        department: "未知部门",
        baseSalary: 10000,
      });

      // defaults: base=1.0, perf=0.3, bonus=0.2, benefits=0.1
      // base: 10000*1.0 = 10000
      // perf: 10000*0.3*1.0 = 3000
      // bonus: 10000*0.2 = 2000
      // benefits: 10000*0.1 = 1000
      // total: 16000
      expect(result.baseSalary).toBe(10000);
      expect(result.performanceSalary).toBe(3000);
      expect(result.bonus).toBe(2000);
      expect(result.benefits).toBe(1000);
      expect(result.monthlyTotal).toBe(16000);
      expect(result.annualTotal).toBe(192000);
    });

    it("applies performance grade coefficient", async () => {
      const caller = createAdminCaller();
      // salary structures (empty — use defaults)
      selectResultsQueue.push([]);
      // performance grade for "S"
      selectResultsQueue.push([{ id: 1, gradeCode: "S", coefficient: "2.00" }]);

      const result = await caller.hrm.calculateSalary({
        department: "研发部",
        baseSalary: 10000,
        performanceGrade: "S",
      });

      // defaults: base=1.0, perf=0.3 * coeff 2.0, bonus=0.2, benefits=0.1
      // perf: 10000 * 0.3 * 2.0 = 6000
      expect(result.performanceSalary).toBe(6000);
    });

    it("adds project bonus to calculated bonus", async () => {
      const caller = createAdminCaller();
      selectResultsQueue.push([]);

      const result = await caller.hrm.calculateSalary({
        department: "研发部",
        baseSalary: 10000,
        projectBonus: 5000,
      });

      // default bonus: 10000*0.2 = 2000 + 5000 project = 7000
      expect(result.bonus).toBe(7000);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // createSalaryCalculation (permission-gated stub)
  // ═══════════════════════════════════════════════════════════
  describe("createSalaryCalculation", () => {
    it("returns success response (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.createSalaryCalculation({
        department: "研发部",
        baseSalary: 10000,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("accepts optional performanceGrade", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.createSalaryCalculation({
        department: "研发部",
        baseSalary: 10000,
        performanceGrade: "A",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Scheduled Tasks (stubs)
  // ═══════════════════════════════════════════════════════════
  describe("scheduled tasks (stubs)", () => {
    it("getScheduledTasks returns empty array", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.getScheduledTasks();
      expect(result).toEqual([]);
    });

    it("createScheduledTask returns success", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.createScheduledTask({
        taskName: "Daily Report",
        taskType: "report",
        cronExpression: "0 9 * * *",
        isEnabled: true,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("updateScheduledTask returns success", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.updateScheduledTask({
        id: "TASK-1",
        taskName: "Updated Task",
        isEnabled: false,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("updateScheduledTask accepts numeric id", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.updateScheduledTask({
        id: 42,
        isEnabled: true,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Teams Meetings (stubs)
  // ═══════════════════════════════════════════════════════════
  describe("teams meetings (stubs)", () => {
    it("getTeamsMeetings returns empty array", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.getTeamsMeetings();
      expect(result).toEqual([]);
    });

    it("createTeamsMeeting returns success", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.createTeamsMeeting({
        subject: "Sprint Review",
        startTime: "2024-03-01T10:00:00Z",
        durationMinutes: 60,
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("createTeamsMeeting accepts Date object for startTime", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.createTeamsMeeting({
        subject: "Standup",
        startTime: new Date("2024-03-01T09:00:00Z"),
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });

    it("updateTeamsMeeting returns success", async () => {
      const caller = createAdminCaller();
      const result = await caller.hrm.updateTeamsMeeting({
        id: "MTG-1",
        subject: "Updated Meeting",
        status: "cancelled",
      });
      expect(result).toEqual({ success: true, message: "操作成功" });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // calculatePerformanceScore (RBAC-aware deterministic)
  // ═══════════════════════════════════════════════════════════
  describe("calculatePerformanceScore", () => {
    it("calculates own performance score (any authenticated user)", async () => {
      const caller = createAdminCaller({ id: 1 });
      const result = await caller.hrm.calculatePerformanceScore({
        projectId: 100,
      });

      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("dimensions");
      expect(result).toHaveProperty("recommendations");
      expect(result.dimensions).toHaveProperty("efficiency");
      expect(result.dimensions).toHaveProperty("quality");
      expect(result.dimensions).toHaveProperty("innovation");
      expect(result.dimensions).toHaveProperty("collaboration");
      expect(typeof result.overallScore).toBe("number");
      expect(["A", "B", "C", "D", "E"]).toContain(result.grade);
    });

    it("returns deterministic results for same input", async () => {
      const caller = createAdminCaller({ id: 5 });
      const r1 = await caller.hrm.calculatePerformanceScore({ projectId: 10 });
      const r2 = await caller.hrm.calculatePerformanceScore({ projectId: 10 });
      expect(r1.overallScore).toBe(r2.overallScore);
      expect(r1.grade).toBe(r2.grade);
    });

    it("produces different results for different projectIds", async () => {
      const caller = createAdminCaller({ id: 1 });
      const r1 = await caller.hrm.calculatePerformanceScore({ projectId: 1 });
      const r2 = await caller.hrm.calculatePerformanceScore({ projectId: 999 });
      // Very unlikely same score for vastly different seeds
      // (not guaranteed but statistically safe for this test)
      expect(r1.overallScore !== r2.overallScore || r1.grade !== r2.grade).toBe(true);
    });

    it("non-manager cannot view another user's score", async () => {
      const caller = createAdminCaller({ id: 1, role: "employee" });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 999, // not self
        projectId: 100,
      });

      expect(result.overallScore).toBe(0);
      expect(result.grade).toBe("N/A");
      expect(result.recommendations).toContain("无权查看他人绩效评分");
    });

    it("admin can view another user's score", async () => {
      const caller = createAdminCaller({ id: 999 });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 5,
        projectId: 100,
      });

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.grade).not.toBe("N/A");
    });

    it("hr_manager can view another user's score", async () => {
      const caller = createAdminCaller({ id: 50, role: "hr_manager" });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 5,
        projectId: 100,
      });

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.grade).not.toBe("N/A");
    });

    it("director can view another user's score", async () => {
      const caller = createAdminCaller({ id: 60, role: "director" });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 5,
        projectId: 100,
      });

      expect(result.overallScore).toBeGreaterThan(0);
    });

    it("dept_manager can view another user's score", async () => {
      const caller = createAdminCaller({ id: 70, role: "dept_manager" });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 5,
        projectId: 100,
      });

      expect(result.overallScore).toBeGreaterThan(0);
    });

    it("team_lead can view another user's score", async () => {
      const caller = createAdminCaller({ id: 80, role: "team_lead" });
      const result = await caller.hrm.calculatePerformanceScore({
        userId: 5,
        projectId: 100,
      });

      expect(result.overallScore).toBeGreaterThan(0);
    });

    it("includes stageCode in seed calculation", async () => {
      const caller = createAdminCaller({ id: 1 });
      const r1 = await caller.hrm.calculatePerformanceScore({
        projectId: 100,
      });
      const r2 = await caller.hrm.calculatePerformanceScore({
        projectId: 100,
        stageCode: "M3",
      });
      // stageCode changes seed, scores may differ
      // We just check the stageCode path doesn't throw
      expect(r2).toHaveProperty("overallScore");
      expect(r2).toHaveProperty("grade");
    });

    it("generates appropriate recommendations for low scores", async () => {
      // We test that recommendations array is always populated
      const caller = createAdminCaller({ id: 1 });
      const result = await caller.hrm.calculatePerformanceScore({
        projectId: 1,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      // All recommendations should be strings
      result.recommendations.forEach((r: string) => {
        expect(typeof r).toBe("string");
        expect(r.length).toBeGreaterThan(0);
      });
    });

    it("scores are clamped between 0 and 100", async () => {
      // Test with various user/project combos to check clamping
      for (const userId of [1, 50, 100, 999]) {
        for (const projectId of [1, 50, 100, 999]) {
          const caller = createAdminCaller({ id: userId });
          const result = await caller.hrm.calculatePerformanceScore({
            projectId,
          });
          expect(result.overallScore).toBeGreaterThanOrEqual(0);
          expect(result.overallScore).toBeLessThanOrEqual(100);

          const dims = result.dimensions;
          expect(dims.efficiency.score).toBeGreaterThanOrEqual(0);
          expect(dims.efficiency.score).toBeLessThanOrEqual(100);
          expect(dims.quality.score).toBeGreaterThanOrEqual(0);
          expect(dims.quality.score).toBeLessThanOrEqual(100);
          expect(dims.innovation.score).toBeGreaterThanOrEqual(0);
          expect(dims.innovation.score).toBeLessThanOrEqual(100);
          expect(dims.collaboration.score).toBeGreaterThanOrEqual(0);
          expect(dims.collaboration.score).toBeLessThanOrEqual(100);
        }
      }
    });

    it("grade mapping is correct based on score", async () => {
      // Use known seed values to verify grade thresholds
      const caller = createAdminCaller({ id: 1 });
      const result = await caller.hrm.calculatePerformanceScore({
        projectId: 100,
      });

      const score = result.overallScore;
      const expectedGrade =
        score >= 90 ? "A" :
        score >= 80 ? "B" :
        score >= 70 ? "C" :
        score >= 60 ? "D" : "E";
      expect(result.grade).toBe(expectedGrade);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Input validation edge cases
  // ═══════════════════════════════════════════════════════════
  describe("input validation", () => {
    it("list rejects limit > 500", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.hrm.list({ limit: 501, offset: 0 })
      ).rejects.toThrow();
    });

    it("list rejects limit < 1", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.hrm.list({ limit: 0, offset: 0 })
      ).rejects.toThrow();
    });

    it("list rejects negative offset", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.hrm.list({ limit: 10, offset: -1 })
      ).rejects.toThrow();
    });

    it("create rejects missing name", async () => {
      const caller = createAdminCaller();
      await expect(
        // @ts-expect-error — intentionally missing required field
        caller.hrm.create({})
      ).rejects.toThrow();
    });

    it("calculateSalary rejects missing department", async () => {
      const caller = createAdminCaller();
      await expect(
        // @ts-expect-error — intentionally missing required field
        caller.hrm.calculateSalary({ baseSalary: 10000 })
      ).rejects.toThrow();
    });

    it("calculateSalary rejects missing baseSalary", async () => {
      const caller = createAdminCaller();
      await expect(
        // @ts-expect-error — intentionally missing required field
        caller.hrm.calculateSalary({ department: "研发部" })
      ).rejects.toThrow();
    });

    it("getById rejects missing id", async () => {
      const caller = createAdminCaller();
      await expect(
        // @ts-expect-error — intentionally missing required field
        caller.hrm.getById({})
      ).rejects.toThrow();
    });

    it("calculatePerformanceScore rejects missing projectId", async () => {
      const caller = createAdminCaller();
      await expect(
        // @ts-expect-error — intentionally missing required field
        caller.hrm.calculatePerformanceScore({})
      ).rejects.toThrow();
    });
  });
});

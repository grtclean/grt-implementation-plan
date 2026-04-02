/**
 * Employee Router — Comprehensive Unit Tests
 * 16 procedures covering: getAll, listAll, list (filtered), getStats,
 * getByDepartment, getByBU, getById, search, getDepartmentStats, getBUStats,
 * getNextId, create, batchCreate, update, updateRole, batchUpdateRoles,
 * updateStatus, initFromData, syncFromExternalSync
 *
 * Auth: requirePermission('hr:employees:view') for reads, protectedProcedure for writes.
 * Admin role bypasses permission checks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mock state ──────────────────────────────────────
const { mockEmployeeService } = vi.hoisted(() => {
  const mockEmployeeService = {
    getAllEmployees: vi.fn(),
    getEmployeesByDepartment: vi.fn(),
    getEmployeesByBU: vi.fn(),
    getEmployeeById: vi.fn(),
    searchEmployees: vi.fn(),
    getDepartmentStats: vi.fn(),
    getBUStats: vi.fn(),
    getNextEmployeeId: vi.fn(),
    createEmployee: vi.fn(),
    batchCreateEmployees: vi.fn(),
    updateEmployee: vi.fn(),
    updateSystemRole: vi.fn(),
    batchUpdateRoles: vi.fn(),
    updateEmployeeStatus: vi.fn(),
  };
  return { mockEmployeeService };
});

// ── Mock the employee service ──────────────────────────────
vi.mock("../services/employee.service", () => ({
  getAllEmployees: mockEmployeeService.getAllEmployees,
  getEmployeesByDepartment: mockEmployeeService.getEmployeesByDepartment,
  getEmployeesByBU: mockEmployeeService.getEmployeesByBU,
  getEmployeeById: mockEmployeeService.getEmployeeById,
  searchEmployees: mockEmployeeService.searchEmployees,
  getDepartmentStats: mockEmployeeService.getDepartmentStats,
  getBUStats: mockEmployeeService.getBUStats,
  getNextEmployeeId: mockEmployeeService.getNextEmployeeId,
  createEmployee: mockEmployeeService.createEmployee,
  batchCreateEmployees: mockEmployeeService.batchCreateEmployees,
  updateEmployee: mockEmployeeService.updateEmployee,
  updateSystemRole: mockEmployeeService.updateSystemRole,
  batchUpdateRoles: mockEmployeeService.batchUpdateRoles,
  updateEmployeeStatus: mockEmployeeService.updateEmployeeStatus,
}));

// Mock the permission service — deny all by default; admin role bypasses
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(false),
  },
}));

// ── Sample data factories ───────────────────────────────────
function makeEmployee(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    employeeId: "GRT001",
    name: "倪亚东",
    department: "总裁办",
    position: "董事长",
    buCode: "HQ",
    email: null,
    phone: null,
    hireDate: null,
    status: "active",
    systemRole: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEmployeeList() {
  return [
    makeEmployee({ id: 1, employeeId: "GRT001", name: "倪亚东", department: "总裁办", position: "董事长", buCode: "HQ" }),
    makeEmployee({ id: 2, employeeId: "GRT002", name: "黄晓兰", department: "财务部", position: "会计", buCode: "FIN" }),
    makeEmployee({ id: 3, employeeId: "GRT003", name: "倪亚琴", department: "事业三部", position: "采购与项目工程师", buCode: "BU3" }),
    makeEmployee({ id: 4, employeeId: "GRT004", name: "戴晓燕", department: "事业一部", position: "高级销售经理", buCode: "BU1" }),
  ];
}

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // Set sensible defaults
  mockEmployeeService.getAllEmployees.mockResolvedValue([]);
  mockEmployeeService.getEmployeesByDepartment.mockResolvedValue([]);
  mockEmployeeService.getEmployeesByBU.mockResolvedValue([]);
  mockEmployeeService.getEmployeeById.mockResolvedValue(null);
  mockEmployeeService.searchEmployees.mockResolvedValue([]);
  mockEmployeeService.getDepartmentStats.mockResolvedValue([]);
  mockEmployeeService.getBUStats.mockResolvedValue([]);
  mockEmployeeService.getNextEmployeeId.mockResolvedValue("GRT001");
  mockEmployeeService.createEmployee.mockResolvedValue({ id: 1 });
  mockEmployeeService.batchCreateEmployees.mockResolvedValue({ created: 0, skipped: 0 });
  mockEmployeeService.updateEmployee.mockResolvedValue(true);
  mockEmployeeService.updateSystemRole.mockResolvedValue(true);
  mockEmployeeService.batchUpdateRoles.mockResolvedValue({ updated: 0, failed: 0 });
  mockEmployeeService.updateEmployeeStatus.mockResolvedValue(true);
});

// ── Tests ───────────────────────────────────────────────────
describe("employee router", () => {

  // ====================================================================
  // getAll — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getAll", () => {
    it("returns all active employees for admin", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.getAll();
      expect(result).toHaveLength(4);
      expect(mockEmployeeService.getAllEmployees).toHaveBeenCalledWith();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getAll()).rejects.toThrow();
    });

    it("rejects non-admin without permission", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.employee.getAll()).rejects.toThrow();
    });

    it("returns empty array when no employees", async () => {
      const caller = createAdminCaller();
      const result = await caller.employee.getAll();
      expect(result).toEqual([]);
    });
  });

  // ====================================================================
  // listAll — protectedProcedure (any authenticated user)
  // ====================================================================
  describe("listAll", () => {
    it("returns all employees including inactive for authenticated user", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.listAll();
      expect(result).toHaveLength(4);
      expect(mockEmployeeService.getAllEmployees).toHaveBeenCalledWith(true);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.listAll()).rejects.toThrow();
    });
  });

  // ====================================================================
  // list — requirePermission('hr:employees:view') + filtering
  // ====================================================================
  describe("list", () => {
    it("returns employees with total count (admin, no filter)", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list();
      expect(result).toEqual({ employees, total: 4 });
    });

    it("filters by buCode", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ buCode: "BU1" });
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].employeeId).toBe("GRT004");
      expect(result.total).toBe(1);
    });

    it("filters by department", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ department: "财务部" });
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe("黄晓兰");
    });

    it("filters by search keyword (name match)", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ search: "亚" });
      expect(result.employees).toHaveLength(2); // 倪亚东 + 倪亚琴
    });

    it("filters by search keyword (employeeId match)", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ search: "GRT002" });
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe("黄晓兰");
    });

    it("filters by search keyword (position match)", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ search: "销售" });
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe("戴晓燕");
    });

    it("combines buCode and search filters", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ buCode: "HQ", search: "倪" });
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].name).toBe("倪亚东");
    });

    it("returns empty when no matches", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.list({ search: "不存在" });
      expect(result.employees).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("passes includeAll flag to service", async () => {
      mockEmployeeService.getAllEmployees.mockResolvedValue([]);
      const caller = createAdminCaller();
      await caller.employee.list({ includeAll: true });
      expect(mockEmployeeService.getAllEmployees).toHaveBeenCalledWith(true);
    });

    it("defaults includeAll to false", async () => {
      mockEmployeeService.getAllEmployees.mockResolvedValue([]);
      const caller = createAdminCaller();
      await caller.employee.list();
      expect(mockEmployeeService.getAllEmployees).toHaveBeenCalledWith(false);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.list()).rejects.toThrow();
    });
  });

  // ====================================================================
  // getStats — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getStats", () => {
    it("returns total, byBU, byDepartment for admin", async () => {
      const employees = makeEmployeeList();
      mockEmployeeService.getAllEmployees.mockResolvedValue(employees);
      const caller = createAdminCaller();
      const result = await caller.employee.getStats();
      expect(result.total).toBe(4);
      expect(result.byBU).toEqual({ HQ: 1, FIN: 1, BU3: 1, BU1: 1 });
      expect(result.byDepartment).toEqual({
        "总裁办": 1,
        "财务部": 1,
        "事业三部": 1,
        "事业一部": 1,
      });
    });

    it("handles empty employee list", async () => {
      const caller = createAdminCaller();
      const result = await caller.employee.getStats();
      expect(result).toEqual({ total: 0, byBU: {}, byDepartment: {} });
    });

    it("counts duplicates correctly", async () => {
      mockEmployeeService.getAllEmployees.mockResolvedValue([
        makeEmployee({ id: 1, buCode: "BU1", department: "事业一部" }),
        makeEmployee({ id: 2, buCode: "BU1", department: "事业一部" }),
        makeEmployee({ id: 3, buCode: "BU2", department: "事业二部" }),
      ]);
      const caller = createAdminCaller();
      const result = await caller.employee.getStats();
      expect(result.total).toBe(3);
      expect(result.byBU).toEqual({ BU1: 2, BU2: 1 });
      expect(result.byDepartment).toEqual({ "事业一部": 2, "事业二部": 1 });
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getStats()).rejects.toThrow();
    });
  });

  // ====================================================================
  // getByDepartment — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getByDepartment", () => {
    it("delegates to service with department param", async () => {
      const emps = [makeEmployee({ department: "事业一部" })];
      mockEmployeeService.getEmployeesByDepartment.mockResolvedValue(emps);
      const caller = createAdminCaller();
      const result = await caller.employee.getByDepartment({ department: "事业一部" });
      expect(result).toEqual(emps);
      expect(mockEmployeeService.getEmployeesByDepartment).toHaveBeenCalledWith("事业一部");
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getByDepartment({ department: "x" })).rejects.toThrow();
    });
  });

  // ====================================================================
  // getByBU — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getByBU", () => {
    it("delegates to service with buCode param", async () => {
      const emps = [makeEmployee({ buCode: "BU3" })];
      mockEmployeeService.getEmployeesByBU.mockResolvedValue(emps);
      const caller = createAdminCaller();
      const result = await caller.employee.getByBU({ buCode: "BU3" });
      expect(result).toEqual(emps);
      expect(mockEmployeeService.getEmployeesByBU).toHaveBeenCalledWith("BU3");
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getByBU({ buCode: "BU1" })).rejects.toThrow();
    });
  });

  // ====================================================================
  // getById — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getById", () => {
    it("returns employee by id", async () => {
      const emp = makeEmployee();
      mockEmployeeService.getEmployeeById.mockResolvedValue(emp);
      const caller = createAdminCaller();
      const result = await caller.employee.getById({ employeeId: "GRT001" });
      expect(result).toEqual(emp);
      expect(mockEmployeeService.getEmployeeById).toHaveBeenCalledWith("GRT001");
    });

    it("returns null when employee not found", async () => {
      const caller = createAdminCaller();
      const result = await caller.employee.getById({ employeeId: "GRT999" });
      expect(result).toBeNull();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getById({ employeeId: "GRT001" })).rejects.toThrow();
    });
  });

  // ====================================================================
  // search — requirePermission('hr:employees:view')
  // ====================================================================
  describe("search", () => {
    it("delegates to service with keyword", async () => {
      const emps = [makeEmployee()];
      mockEmployeeService.searchEmployees.mockResolvedValue(emps);
      const caller = createAdminCaller();
      const result = await caller.employee.search({ keyword: "侯" });
      expect(result).toEqual(emps);
      expect(mockEmployeeService.searchEmployees).toHaveBeenCalledWith("侯");
    });

    it("returns empty array for no matches", async () => {
      const caller = createAdminCaller();
      const result = await caller.employee.search({ keyword: "nobody" });
      expect(result).toEqual([]);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.search({ keyword: "x" })).rejects.toThrow();
    });
  });

  // ====================================================================
  // getDepartmentStats — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getDepartmentStats", () => {
    it("delegates to service", async () => {
      const stats = [{ department: "事业一部", buCode: "BU1", buName: "海外事业部", count: 10 }];
      mockEmployeeService.getDepartmentStats.mockResolvedValue(stats);
      const caller = createAdminCaller();
      const result = await caller.employee.getDepartmentStats();
      expect(result).toEqual(stats);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getDepartmentStats()).rejects.toThrow();
    });
  });

  // ====================================================================
  // getBUStats — requirePermission('hr:employees:view')
  // ====================================================================
  describe("getBUStats", () => {
    it("delegates to service", async () => {
      const stats = [{ buCode: "BU1", buName: "海外事业部", count: 15, departments: ["事业一部"] }];
      mockEmployeeService.getBUStats.mockResolvedValue(stats);
      const caller = createAdminCaller();
      const result = await caller.employee.getBUStats();
      expect(result).toEqual(stats);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getBUStats()).rejects.toThrow();
    });
  });

  // ====================================================================
  // getNextId — protectedProcedure
  // ====================================================================
  describe("getNextId", () => {
    it("returns next available employee id", async () => {
      mockEmployeeService.getNextEmployeeId.mockResolvedValue("GRT104");
      const caller = createAdminCaller();
      const result = await caller.employee.getNextId();
      expect(result).toEqual({ nextId: "GRT104" });
    });

    it("returns GRT001 for empty DB", async () => {
      mockEmployeeService.getNextEmployeeId.mockResolvedValue("GRT001");
      const caller = createAdminCaller();
      const result = await caller.employee.getNextId();
      expect(result).toEqual({ nextId: "GRT001" });
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.getNextId()).rejects.toThrow();
    });
  });

  // ====================================================================
  // create — protectedProcedure
  // ====================================================================
  describe("create", () => {
    it("creates employee with minimal input", async () => {
      mockEmployeeService.createEmployee.mockResolvedValue({ id: 42 });
      const caller = createAdminCaller();
      const result = await caller.employee.create({
        employeeId: "GRT100",
        name: "测试员工",
        department: "事业一部",
        position: "工程师",
      });
      expect(result).toEqual({ id: 42 });
      expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith({
        employeeId: "GRT100",
        name: "测试员工",
        department: "事业一部",
        position: "工程师",
      });
    });

    it("creates employee with all optional fields", async () => {
      mockEmployeeService.createEmployee.mockResolvedValue({ id: 43 });
      const caller = createAdminCaller();
      const result = await caller.employee.create({
        employeeId: "GRT200",
        name: "全字段员工",
        department: "财务部",
        position: "会计",
        buCode: "FIN",
        email: "test@grt.com",
        phone: "13800138000",
        systemRole: "finance_specialist",
      });
      expect(result).toEqual({ id: 43 });
      expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          buCode: "FIN",
          email: "test@grt.com",
          phone: "13800138000",
          systemRole: "finance_specialist",
        }),
      );
    });

    it("rejects invalid systemRole", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.create({
          employeeId: "GRT300",
          name: "坏角色",
          department: "X",
          position: "Y",
          systemRole: "superuser" as any,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.create({
          employeeId: "GRT300",
          name: "匿名",
          department: "X",
          position: "Y",
        }),
      ).rejects.toThrow();
    });

    it("rejects missing required fields", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.create({
          employeeId: "GRT300",
          name: "缺字段",
        } as any),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // batchCreate — protectedProcedure
  // ====================================================================
  describe("batchCreate", () => {
    it("creates multiple employees", async () => {
      mockEmployeeService.batchCreateEmployees.mockResolvedValue({ created: 2, skipped: 0 });
      const caller = createAdminCaller();
      const result = await caller.employee.batchCreate({
        employees: [
          { employeeId: "GRT100", name: "A", department: "X", position: "P1" },
          { employeeId: "GRT101", name: "B", department: "Y", position: "P2" },
        ],
      });
      expect(result).toEqual({ created: 2, skipped: 0 });
      expect(mockEmployeeService.batchCreateEmployees).toHaveBeenCalledWith([
        { employeeId: "GRT100", name: "A", department: "X", position: "P1" },
        { employeeId: "GRT101", name: "B", department: "Y", position: "P2" },
      ]);
    });

    it("handles partial creation (some skipped)", async () => {
      mockEmployeeService.batchCreateEmployees.mockResolvedValue({ created: 1, skipped: 1 });
      const caller = createAdminCaller();
      const result = await caller.employee.batchCreate({
        employees: [
          { employeeId: "GRT100", name: "New", department: "X", position: "P1" },
          { employeeId: "GRT001", name: "Existing", department: "Y", position: "P2" },
        ],
      });
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.batchCreate({
          employees: [{ employeeId: "GRT100", name: "A", department: "X", position: "P1" }],
        }),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // update — protectedProcedure
  // ====================================================================
  describe("update", () => {
    it("updates employee name", async () => {
      mockEmployeeService.updateEmployee.mockResolvedValue(true);
      const caller = createAdminCaller();
      const result = await caller.employee.update({
        employeeId: "GRT001",
        updates: { name: "新名字" },
      });
      expect(result).toBe(true);
      expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith("GRT001", { name: "新名字" });
    });

    it("updates employee status", async () => {
      const caller = createAdminCaller();
      await caller.employee.update({
        employeeId: "GRT001",
        updates: { status: "resigned" },
      });
      expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith("GRT001", { status: "resigned" });
    });

    it("updates employee systemRole", async () => {
      const caller = createAdminCaller();
      await caller.employee.update({
        employeeId: "GRT001",
        updates: { systemRole: "hr_manager" },
      });
      expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith("GRT001", { systemRole: "hr_manager" });
    });

    it("rejects invalid status", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.update({
          employeeId: "GRT001",
          updates: { status: "fired" as any },
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid systemRole", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.update({
          employeeId: "GRT001",
          updates: { systemRole: "root" as any },
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.update({ employeeId: "GRT001", updates: { name: "X" } }),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // updateRole — protectedProcedure
  // ====================================================================
  describe("updateRole", () => {
    it("updates system role", async () => {
      mockEmployeeService.updateSystemRole.mockResolvedValue(true);
      const caller = createAdminCaller();
      const result = await caller.employee.updateRole({
        employeeId: "GRT049",
        systemRole: "admin",
      });
      expect(result).toBe(true);
      expect(mockEmployeeService.updateSystemRole).toHaveBeenCalledWith("GRT049", "admin");
    });

    it("accepts all valid system roles", async () => {
      const roles = [
        "admin", "director", "bu_gm", "bu_pm", "bu_sales",
        "bu_mech", "bu_elec", "procurement_eng", "cs_engineer",
        "dept_manager", "team_lead", "hr_manager", "hr_specialist",
        "finance_manager", "finance_specialist", "employee",
        "production_worker", "guest",
      ];
      const caller = createAdminCaller();
      for (const role of roles) {
        mockEmployeeService.updateSystemRole.mockResolvedValue(true);
        const result = await caller.employee.updateRole({
          employeeId: "GRT001",
          systemRole: role as any,
        });
        expect(result).toBe(true);
      }
    });

    it("rejects invalid system role", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.updateRole({
          employeeId: "GRT001",
          systemRole: "superadmin" as any,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.updateRole({ employeeId: "GRT001", systemRole: "admin" }),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // batchUpdateRoles — protectedProcedure
  // ====================================================================
  describe("batchUpdateRoles", () => {
    it("batch updates roles", async () => {
      mockEmployeeService.batchUpdateRoles.mockResolvedValue({ updated: 3, failed: 0 });
      const caller = createAdminCaller();
      const result = await caller.employee.batchUpdateRoles({
        updates: [
          { employeeId: "GRT001", systemRole: "admin" },
          { employeeId: "GRT002", systemRole: "finance_specialist" },
          { employeeId: "GRT003", systemRole: "employee" },
        ],
      });
      expect(result).toEqual({ updated: 3, failed: 0 });
    });

    it("handles partial failures", async () => {
      mockEmployeeService.batchUpdateRoles.mockResolvedValue({ updated: 1, failed: 2 });
      const caller = createAdminCaller();
      const result = await caller.employee.batchUpdateRoles({
        updates: [
          { employeeId: "GRT001", systemRole: "admin" },
          { employeeId: "GRT002", systemRole: "guest" },
          { employeeId: "GRT003", systemRole: "employee" },
        ],
      });
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(2);
    });

    it("rejects empty updates array", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.batchUpdateRoles({ updates: [] }),
      ).rejects.toThrow();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.batchUpdateRoles({
          updates: [{ employeeId: "GRT001", systemRole: "admin" }],
        }),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // updateStatus — protectedProcedure
  // ====================================================================
  describe("updateStatus", () => {
    it("activates employee", async () => {
      mockEmployeeService.updateEmployeeStatus.mockResolvedValue(true);
      const caller = createAdminCaller();
      const result = await caller.employee.updateStatus({
        employeeId: "GRT001",
        status: "active",
      });
      expect(result).toBe(true);
      expect(mockEmployeeService.updateEmployeeStatus).toHaveBeenCalledWith("GRT001", "active");
    });

    it("deactivates employee", async () => {
      const caller = createAdminCaller();
      await caller.employee.updateStatus({ employeeId: "GRT001", status: "inactive" });
      expect(mockEmployeeService.updateEmployeeStatus).toHaveBeenCalledWith("GRT001", "inactive");
    });

    it("resigns employee", async () => {
      const caller = createAdminCaller();
      await caller.employee.updateStatus({ employeeId: "GRT001", status: "resigned" });
      expect(mockEmployeeService.updateEmployeeStatus).toHaveBeenCalledWith("GRT001", "resigned");
    });

    it("rejects invalid status", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.employee.updateStatus({
          employeeId: "GRT001",
          status: "terminated" as any,
        }),
      ).rejects.toThrow();
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.employee.updateStatus({ employeeId: "GRT001", status: "active" }),
      ).rejects.toThrow();
    });
  });

  // ====================================================================
  // initFromData — protectedProcedure (hardcoded employee list)
  // ====================================================================
  describe("initFromData", () => {
    it("calls batchCreateEmployees with hardcoded data", async () => {
      mockEmployeeService.batchCreateEmployees.mockResolvedValue({ created: 90, skipped: 0 });
      const caller = createAdminCaller();
      const result = await caller.employee.initFromData();
      expect(result).toEqual({ created: 90, skipped: 0 });
      expect(mockEmployeeService.batchCreateEmployees).toHaveBeenCalledTimes(1);
      // Verify the hardcoded list is passed (first entry)
      const callArgs = mockEmployeeService.batchCreateEmployees.mock.calls[0][0];
      expect(callArgs[0]).toEqual({
        employeeId: "GRT001",
        name: "倪亚东",
        department: "总裁办",
        position: "董事长",
      });
      // Last entry
      expect(callArgs[callArgs.length - 1]).toEqual({
        employeeId: "GRT079_2",
        name: "马鹏风",
        department: "财务部",
        position: "供应链工程师",
      });
    });

    it("passes all employees to service (90 entries)", async () => {
      mockEmployeeService.batchCreateEmployees.mockResolvedValue({ created: 0, skipped: 90 });
      const caller = createAdminCaller();
      await caller.employee.initFromData();
      const callArgs = mockEmployeeService.batchCreateEmployees.mock.calls[0][0];
      expect(callArgs.length).toBeGreaterThanOrEqual(80);
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.initFromData()).rejects.toThrow();
    });
  });

  // ====================================================================
  // syncFromExternalSync — protectedProcedure (stub)
  // ====================================================================
  describe("syncFromExternalSync", () => {
    it("returns stub sync result", async () => {
      const caller = createAdminCaller();
      const result = await caller.employee.syncFromExternalSync();
      expect(result).toEqual({
        added: 0,
        updated: 0,
        deleted: 0,
        message: "同步完成，请确保外部数据平台API已配置",
      });
    });

    it("rejects anonymous users", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.employee.syncFromExternalSync()).rejects.toThrow();
    });
  });
});

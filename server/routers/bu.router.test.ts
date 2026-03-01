/**
 * BU Router — Unit Tests
 * Tests 16 procedures: list, getById, getByCode, create, update, delete,
 * getPerformance, savePerformance, getPerformanceTrend, getKpis, createKpi,
 * updateKpi, getStatistics, getEmployees, addEmployee, removeEmployee
 *
 * All DB work delegated to ../db/bu-queries — mock the entire module.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { mockBuQueries } = vi.hoisted(() => {
  const mockBuQueries = {
    getAllBusinessUnits: vi.fn(),
    getBusinessUnitById: vi.fn(),
    getBusinessUnitByCode: vi.fn(),
    createBusinessUnit: vi.fn(),
    updateBusinessUnit: vi.fn(),
    deleteBusinessUnit: vi.fn(),
    getPerformanceByBuAndYear: vi.fn(),
    createPerformance: vi.fn(),
    updatePerformance: vi.fn(),
    getPerformanceTrend: vi.fn(),
    getKpisByBu: vi.fn(),
    createKpi: vi.fn(),
    updateKpi: vi.fn(),
    getBuStatistics: vi.fn(),
    getBuEmployees: vi.fn(),
    addEmployeeToBu: vi.fn(),
    removeBuEmployee: vi.fn(),
  };
  return { mockBuQueries };
});

vi.mock("../db/bu-queries", () => mockBuQueries);

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAuthenticatedCaller();

const sampleBu = {
  id: 1, code: "overseas", name: "海外事业部",
  description: "Overseas BU", managerId: 10, parentBuId: null,
  fiscalYear: 2026, status: "active",
};

const samplePerformance = {
  id: 1, buId: 1, fiscalYear: 2026, fiscalQuarter: 1,
  revenue: 50000000, revenueTarget: 60000000, revenueAchievementRate: 83.3,
  overallScore: 85, overallRating: "A",
};

const sampleKpi = {
  id: 1, buId: 1, kpiCode: "REV-001", kpiName: "营收目标",
  dimension: "financial", unit: "CNY", fiscalYear: 2026,
  targetValue: 100000000, weight: 0.3, status: "active",
};

const sampleEmployee = {
  id: 1, buId: 1, employeeId: 100, role: "bu_pm",
  department: "项目管理", joinDate: "2026-01-01", status: "active",
};

describe("bu router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all business units", async () => {
      mockBuQueries.getAllBusinessUnits.mockResolvedValueOnce([sampleBu]);
      const result = await caller().bu.list();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it("returns error on failure", async () => {
      mockBuQueries.getAllBusinessUnits.mockRejectedValueOnce(new Error("DB error"));
      const result = await caller().bu.list();
      expect(result.success).toBe(false);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns BU by ID", async () => {
      mockBuQueries.getBusinessUnitById.mockResolvedValueOnce([sampleBu]);
      const result = await caller().bu.getById({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("code", "overseas");
    });

    it("returns null for missing BU", async () => {
      mockBuQueries.getBusinessUnitById.mockResolvedValueOnce([]);
      const result = await caller().bu.getById({ id: 999 });
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("returns error on failure", async () => {
      mockBuQueries.getBusinessUnitById.mockRejectedValueOnce(new Error("fail"));
      const result = await caller().bu.getById({ id: 1 });
      expect(result.success).toBe(false);
    });
  });

  // ═══ getByCode ═══
  describe("getByCode", () => {
    it("returns BU by code", async () => {
      mockBuQueries.getBusinessUnitByCode.mockResolvedValueOnce([sampleBu]);
      const result = await caller().bu.getByCode({ code: "overseas" });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("name", "海外事业部");
    });

    it("returns null for missing code", async () => {
      mockBuQueries.getBusinessUnitByCode.mockResolvedValueOnce([]);
      const result = await caller().bu.getByCode({ code: "nonexist" });
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a BU", async () => {
      mockBuQueries.createBusinessUnit.mockResolvedValueOnce([{ ...sampleBu, id: 5 }]);
      const result = await caller().bu.create({
        code: "semiconductor", name: "半导体事业部",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 5);
    });

    it("rejects empty code", async () => {
      await expect(caller().bu.create({ code: "", name: "X" })).rejects.toThrow();
    });

    it("rejects empty name", async () => {
      await expect(caller().bu.create({ code: "X", name: "" })).rejects.toThrow();
    });

    it("returns error on DB failure", async () => {
      mockBuQueries.createBusinessUnit.mockRejectedValueOnce(new Error("dup"));
      const result = await caller().bu.create({ code: "X", name: "X" });
      expect(result.success).toBe(false);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates BU fields", async () => {
      mockBuQueries.updateBusinessUnit.mockResolvedValueOnce([{ ...sampleBu, name: "Updated" }]);
      const result = await caller().bu.update({ id: 1, name: "Updated" });
      expect(result.success).toBe(true);
    });

    it("updates status", async () => {
      mockBuQueries.updateBusinessUnit.mockResolvedValueOnce([{ ...sampleBu, status: "inactive" }]);
      const result = await caller().bu.update({ id: 1, status: "inactive" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().bu.update({ id: 1, status: "invalid" as any })).rejects.toThrow();
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes a BU", async () => {
      mockBuQueries.deleteBusinessUnit.mockResolvedValueOnce(undefined);
      const result = await caller().bu.delete({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("returns error on failure", async () => {
      mockBuQueries.deleteBusinessUnit.mockRejectedValueOnce(new Error("FK constraint"));
      const result = await caller().bu.delete({ id: 1 });
      expect(result.success).toBe(false);
    });
  });

  // ═══ getPerformance ═══
  describe("getPerformance", () => {
    it("returns performance data", async () => {
      mockBuQueries.getPerformanceByBuAndYear.mockResolvedValueOnce([samplePerformance]);
      const result = await caller().bu.getPerformance({ buId: 1, fiscalYear: 2026 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it("returns empty for no data", async () => {
      mockBuQueries.getPerformanceByBuAndYear.mockResolvedValueOnce([]);
      const result = await caller().bu.getPerformance({ buId: 999, fiscalYear: 2025 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ═══ savePerformance ═══
  describe("savePerformance", () => {
    it("creates new performance when none exists", async () => {
      mockBuQueries.getPerformanceByBuAndYear.mockResolvedValueOnce([]);
      mockBuQueries.createPerformance.mockResolvedValueOnce([{ ...samplePerformance, id: 10 }]);
      const result = await caller().bu.savePerformance({
        buId: 1, fiscalYear: 2026, revenue: 50000000,
      });
      expect(result.success).toBe(true);
      expect(mockBuQueries.createPerformance).toHaveBeenCalled();
    });

    it("updates existing performance", async () => {
      mockBuQueries.getPerformanceByBuAndYear.mockResolvedValueOnce([samplePerformance]);
      mockBuQueries.updatePerformance.mockResolvedValueOnce([{ ...samplePerformance, revenue: 60000000 }]);
      const result = await caller().bu.savePerformance({
        buId: 1, fiscalYear: 2026, revenue: 60000000,
      });
      expect(result.success).toBe(true);
      expect(mockBuQueries.updatePerformance).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  // ═══ getPerformanceTrend ═══
  describe("getPerformanceTrend", () => {
    it("returns trend data", async () => {
      mockBuQueries.getPerformanceTrend.mockResolvedValueOnce([samplePerformance, { ...samplePerformance, id: 2, fiscalYear: 2025 }]);
      const result = await caller().bu.getPerformanceTrend({ buId: 1, startYear: 2025, endYear: 2026 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ═══ getKpis ═══
  describe("getKpis", () => {
    it("returns KPIs for BU and year", async () => {
      mockBuQueries.getKpisByBu.mockResolvedValueOnce([sampleKpi]);
      const result = await caller().bu.getKpis({ buId: 1, fiscalYear: 2026 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ═══ createKpi ═══
  describe("createKpi", () => {
    it("creates a KPI", async () => {
      mockBuQueries.createKpi.mockResolvedValueOnce([{ ...sampleKpi, id: 5 }]);
      const result = await caller().bu.createKpi({
        buId: 1, kpiCode: "QAL-001", kpiName: "Quality", dimension: "quality", fiscalYear: 2026,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty kpiCode", async () => {
      await expect(caller().bu.createKpi({
        buId: 1, kpiCode: "", kpiName: "X", dimension: "X", fiscalYear: 2026,
      })).rejects.toThrow();
    });
  });

  // ═══ updateKpi ═══
  describe("updateKpi", () => {
    it("updates KPI fields", async () => {
      mockBuQueries.updateKpi.mockResolvedValueOnce([{ ...sampleKpi, targetValue: 200000000 }]);
      const result = await caller().bu.updateKpi({
        id: 1, kpiName: "Updated", dimension: "financial", targetValue: 200000000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getStatistics ═══
  describe("getStatistics", () => {
    it("returns BU statistics", async () => {
      mockBuQueries.getBuStatistics.mockResolvedValueOnce({ revenue: 50000000, projects: 10 });
      const result = await caller().bu.getStatistics({ buId: 1, fiscalYear: 2026 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("revenue");
    });
  });

  // ═══ getEmployees ═══
  describe("getEmployees", () => {
    it("returns employees in BU", async () => {
      mockBuQueries.getBuEmployees.mockResolvedValueOnce([sampleEmployee]);
      const result = await caller().bu.getEmployees({ buId: 1 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ═══ addEmployee ═══
  describe("addEmployee", () => {
    it("adds employee to BU", async () => {
      mockBuQueries.addEmployeeToBu.mockResolvedValueOnce([{ ...sampleEmployee, id: 5 }]);
      const result = await caller().bu.addEmployee({
        buId: 1, employeeId: 200,
      });
      expect(result.success).toBe(true);
    });

    it("passes optional fields", async () => {
      mockBuQueries.addEmployeeToBu.mockResolvedValueOnce([sampleEmployee]);
      const result = await caller().bu.addEmployee({
        buId: 1, employeeId: 200, role: "bu_pm",
        department: "Project", joinDate: "2026-03-01", status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().bu.addEmployee({
        buId: 1, employeeId: 200, status: "fired" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ removeEmployee ═══
  describe("removeEmployee", () => {
    it("removes employee from BU", async () => {
      mockBuQueries.removeBuEmployee.mockResolvedValueOnce(undefined);
      const result = await caller().bu.removeEmployee({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("returns error on failure", async () => {
      mockBuQueries.removeBuEmployee.mockRejectedValueOnce(new Error("Not found"));
      const result = await caller().bu.removeEmployee({ id: 999 });
      expect(result.success).toBe(false);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().bu.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().bu.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().bu.create({ code: "X", name: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().bu.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().bu.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getPerformance", async () => {
      await expect(createAnonymousCaller().bu.getPerformance({ buId: 1, fiscalYear: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for savePerformance", async () => {
      await expect(createAnonymousCaller().bu.savePerformance({ buId: 1, fiscalYear: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for getKpis", async () => {
      await expect(createAnonymousCaller().bu.getKpis({ buId: 1, fiscalYear: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for createKpi", async () => {
      await expect(createAnonymousCaller().bu.createKpi({
        buId: 1, kpiCode: "X", kpiName: "X", dimension: "X", fiscalYear: 2026,
      })).rejects.toThrow();
    });
    it("rejects anonymous for getStatistics", async () => {
      await expect(createAnonymousCaller().bu.getStatistics({ buId: 1, fiscalYear: 2026 })).rejects.toThrow();
    });
    it("rejects anonymous for getEmployees", async () => {
      await expect(createAnonymousCaller().bu.getEmployees({ buId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for addEmployee", async () => {
      await expect(createAnonymousCaller().bu.addEmployee({ buId: 1, employeeId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for removeEmployee", async () => {
      await expect(createAnonymousCaller().bu.removeEmployee({ id: 1 })).rejects.toThrow();
    });
  });
});

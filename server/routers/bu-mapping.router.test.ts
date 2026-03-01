/**
 * BU Mapping Router — Unit Tests
 * Tests all 15 procedures: getAllBUs, getBUStats, getAllMappings, getMappingsByBU,
 * createMapping, batchCreateMappings, updateMapping, deleteMapping, autoMatchDepartments,
 * getBUMembers, getAllLeaders, getLeadersByBU, setLeader, deleteLeader,
 * getPerformanceStats, updatePerformanceStats, initSamplePerformanceData
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller, createAdminCaller } from "../_test/trpc-test-utils";

// ── Hoisted mock state (vi.mock factories can only reference hoisted vars) ──
const { mockBuMappingService, mockJdyService, DEFAULT_BUS_MOCK, BU_KEYWORDS_MOCK,
  mockGetAllLeaders, mockGetLeadersByBU, mockSetLeader, mockDeleteLeader,
  mockGetPerformanceStats, mockUpdatePerformanceStats, mockInitSamplePerformanceData,
} = vi.hoisted(() => {
  const mockBuMappingService = {
    getBUStats: vi.fn(),
    getAllMappings: vi.fn(),
    getMappingsByBU: vi.fn(),
    createMapping: vi.fn(),
    batchCreateMappings: vi.fn(),
    updateMapping: vi.fn(),
    deleteMapping: vi.fn(),
    matchBUByDeptName: vi.fn(),
  };
  const mockJdyService = {
    isConfigured: vi.fn(() => true),
    getDepartments: vi.fn(async () => []),
    getMembers: vi.fn(async () => []),
  };
  return {
    mockBuMappingService,
    mockJdyService,
    DEFAULT_BUS_MOCK: [
      { code: "BU1", name: "海外事业部" },
      { code: "BU2", name: "商用车事业部" },
      { code: "BU3", name: "乘用车事业部" },
      { code: "BU4", name: "半导体事业部" },
      { code: "BU5", name: "工业通用事业部" },
    ],
    BU_KEYWORDS_MOCK: {
      BU1: ["海外", "overseas"],
      BU2: ["商用车"],
      BU3: ["乘用车"],
      BU4: ["半导体"],
      BU5: ["工业", "通用"],
    } as Record<string, string[]>,
    mockGetAllLeaders: vi.fn(async () => []),
    mockGetLeadersByBU: vi.fn(async () => []),
    mockSetLeader: vi.fn(async () => 1),
    mockDeleteLeader: vi.fn(async () => true),
    mockGetPerformanceStats: vi.fn(async () => []),
    mockUpdatePerformanceStats: vi.fn(async () => 1),
    mockInitSamplePerformanceData: vi.fn(async () => ({ created: 5, skipped: 0 })),
  };
});

vi.mock("../services/bu-mapping.service", () => ({
  buMappingService: mockBuMappingService,
  DEFAULT_BUS: DEFAULT_BUS_MOCK,
  BU_KEYWORDS: BU_KEYWORDS_MOCK,
  getAllLeaders: mockGetAllLeaders,
  getLeadersByBU: mockGetLeadersByBU,
  setLeader: mockSetLeader,
  deleteLeader: mockDeleteLeader,
  getPerformanceStats: mockGetPerformanceStats,
  updatePerformanceStats: mockUpdatePerformanceStats,
  initSamplePerformanceData: mockInitSamplePerformanceData,
}));

vi.mock("../jiandaoyun", () => ({
  getJiandaoyunSyncService: vi.fn(() => mockJdyService),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockBuMappingService.getBUStats.mockResolvedValue([]);
  mockBuMappingService.getAllMappings.mockResolvedValue([]);
  mockBuMappingService.getMappingsByBU.mockResolvedValue([]);
  mockBuMappingService.createMapping.mockResolvedValue(1);
  mockBuMappingService.batchCreateMappings.mockResolvedValue({ created: 0, updated: 0 });
  mockBuMappingService.updateMapping.mockResolvedValue(true);
  mockBuMappingService.deleteMapping.mockResolvedValue(true);
  mockBuMappingService.matchBUByDeptName.mockReturnValue(null);
  mockJdyService.isConfigured.mockReturnValue(true);
  mockJdyService.getDepartments.mockResolvedValue([]);
  mockJdyService.getMembers.mockResolvedValue([]);
});

// ── Tests ───────────────────────────────────────────────
describe("bu-mapping router", () => {

  describe("getAllBUs", () => {
    it("returns default BUs and keywords", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getAllBUs();
      expect(result).toHaveProperty("bus");
      expect(result).toHaveProperty("keywords");
      expect(result.bus).toHaveLength(5);
      expect(result.keywords).toHaveProperty("BU1");
    });
  });

  describe("getBUStats", () => {
    it("returns stats from service", async () => {
      mockBuMappingService.getBUStats.mockResolvedValue([
        { buCode: "BU1", mappingCount: 3, memberCount: 15 },
        { buCode: "BU2", mappingCount: 2, memberCount: 10 },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUStats();
      expect(result).toHaveProperty("stats");
      expect(result.stats).toHaveLength(2);
    });

    it("returns empty stats", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUStats();
      expect(result.stats).toHaveLength(0);
    });
  });

  describe("getAllMappings", () => {
    it("returns all mappings", async () => {
      mockBuMappingService.getAllMappings.mockResolvedValue([
        { id: 1, buCode: "BU1", jdyDeptNo: 100, jdyDeptName: "海外销售" },
        { id: 2, buCode: "BU2", jdyDeptNo: 200, jdyDeptName: "商用车项目" },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getAllMappings();
      expect(result.mappings).toHaveLength(2);
    });

    it("returns empty when no mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getAllMappings();
      expect(result.mappings).toHaveLength(0);
    });
  });

  describe("getMappingsByBU", () => {
    it("returns mappings for specific BU", async () => {
      mockBuMappingService.getMappingsByBU.mockResolvedValue([
        { id: 1, buCode: "BU1", jdyDeptNo: 100, jdyDeptName: "海外销售", roleType: "Sales" },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getMappingsByBU({ buCode: "BU1" });
      expect(result.mappings).toHaveLength(1);
      expect(mockBuMappingService.getMappingsByBU).toHaveBeenCalledWith("BU1");
    });

    it("returns empty for BU with no mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getMappingsByBU({ buCode: "BU5" });
      expect(result.mappings).toHaveLength(0);
    });

    it("rejects invalid BU code", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.buMapping.getMappingsByBU({ buCode: "INVALID" as any })).rejects.toThrow();
    });
  });

  describe("createMapping", () => {
    it("creates mapping with required fields", async () => {
      mockBuMappingService.createMapping.mockResolvedValue(10);
      const caller = createAdminCaller();
      const result = await caller.buMapping.createMapping({
        buCode: "BU1", jdyDeptNo: 100,
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 10);
    });

    it("creates mapping with all optional fields", async () => {
      mockBuMappingService.createMapping.mockResolvedValue(11);
      const caller = createAdminCaller();
      const result = await caller.buMapping.createMapping({
        buCode: "BU2", jdyDeptNo: 200, jdyDeptName: "商用车设计部", roleType: "Mech",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 11);
    });
  });

  describe("batchCreateMappings", () => {
    it("batch creates multiple mappings", async () => {
      mockBuMappingService.batchCreateMappings.mockResolvedValue({ created: 3, updated: 0 });
      const caller = createAdminCaller();
      const result = await caller.buMapping.batchCreateMappings({
        mappings: [
          { buCode: "BU1", jdyDeptNo: 100 },
          { buCode: "BU1", jdyDeptNo: 101, jdyDeptName: "海外采购" },
          { buCode: "BU2", jdyDeptNo: 200, roleType: "Sales" },
        ],
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 3);
      expect(result).toHaveProperty("updated", 0);
    });

    it("handles updates on conflict", async () => {
      mockBuMappingService.batchCreateMappings.mockResolvedValue({ created: 1, updated: 2 });
      const caller = createAdminCaller();
      const result = await caller.buMapping.batchCreateMappings({
        mappings: [
          { buCode: "BU1", jdyDeptNo: 100 },
          { buCode: "BU2", jdyDeptNo: 200 },
          { buCode: "BU3", jdyDeptNo: 300 },
        ],
      });
      expect(result.created).toBe(1);
      expect(result.updated).toBe(2);
    });
  });

  describe("updateMapping", () => {
    it("updates mapping", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.updateMapping({
        id: 1, buCode: "BU2", roleType: "Elec", isActive: true,
      });
      expect(result).toHaveProperty("success", true);
    });

    it("updates with minimal fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.updateMapping({ id: 1, isActive: false });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("deleteMapping", () => {
    it("deletes mapping", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.deleteMapping({ id: 1 });
      expect(result).toHaveProperty("success", true);
    });

    it("returns false for non-existent mapping", async () => {
      mockBuMappingService.deleteMapping.mockResolvedValue(false);
      const caller = createAdminCaller();
      const result = await caller.buMapping.deleteMapping({ id: 999 });
      expect(result.success).toBe(false);
    });
  });

  describe("autoMatchDepartments", () => {
    it("matches departments to BUs by keywords", async () => {
      mockJdyService.getDepartments.mockResolvedValue([
        { dept_no: 100, name: "海外销售部" },
        { dept_no: 200, name: "商用车项目部" },
        { dept_no: 300, name: "行政后勤" },
      ]);
      mockBuMappingService.matchBUByDeptName
        .mockReturnValueOnce("BU1")
        .mockReturnValueOnce("BU2")
        .mockReturnValueOnce(null);
      mockBuMappingService.batchCreateMappings.mockResolvedValue({ created: 2, updated: 0 });

      const caller = createAdminCaller();
      const result = await caller.buMapping.autoMatchDepartments();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("totalDepartments", 3);
      expect(result).toHaveProperty("matched", 2);
      expect(result).toHaveProperty("unmatched", 1);
      expect(result).toHaveProperty("created", 2);
      expect(result.unmatchedDepts).toHaveLength(1);
      expect(result.unmatchedDepts![0]).toHaveProperty("deptName", "行政后勤");
    });

    it("returns error when JDY not configured", async () => {
      mockJdyService.isConfigured.mockReturnValue(false);
      const caller = createAdminCaller();
      const result = await caller.buMapping.autoMatchDepartments();
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("handles all departments matching", async () => {
      mockJdyService.getDepartments.mockResolvedValue([
        { dept_no: 100, name: "海外事业部" },
      ]);
      mockBuMappingService.matchBUByDeptName.mockReturnValue("BU1");
      mockBuMappingService.batchCreateMappings.mockResolvedValue({ created: 1, updated: 0 });

      const caller = createAdminCaller();
      const result = await caller.buMapping.autoMatchDepartments();
      expect(result.matched).toBe(1);
      expect(result.unmatched).toBe(0);
    });

    it("handles no departments", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.autoMatchDepartments();
      expect(result).toHaveProperty("success", true);
      expect(result.totalDepartments).toBe(0);
      expect(result.matched).toBe(0);
    });

    it("handles service error", async () => {
      mockJdyService.getDepartments.mockRejectedValue(new Error("API timeout"));
      const caller = createAdminCaller();
      const result = await caller.buMapping.autoMatchDepartments();
      expect(result).toHaveProperty("success", false);
      expect(result.error).toContain("API timeout");
    });
  });

  describe("getBUMembers", () => {
    it("returns members grouped by BU and role", async () => {
      mockBuMappingService.getAllMappings.mockResolvedValue([
        { buCode: "BU1", jdyDeptNo: 100, jdyDeptName: "海外销售", roleType: "Sales" },
      ]);
      mockJdyService.getMembers.mockResolvedValue([
        { username: "user1", name: "张三", status: 1, departments: [100] },
        { username: "user2", name: "李四", status: 1, departments: [200] },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUMembers({});
      expect(result).toHaveProperty("buMembers");
      expect(result.error).toBeNull();
      // BU1 should have 1 member in Sales role
      const bu1 = result.buMembers.find((b: any) => b.buCode === "BU1");
      expect(bu1).toBeDefined();
      expect(bu1!.totalMembers).toBe(1);
    });

    it("filters by specific BU code", async () => {
      mockBuMappingService.getMappingsByBU.mockResolvedValue([
        { buCode: "BU2", jdyDeptNo: 200, jdyDeptName: "商用车设计", roleType: "Mech" },
      ]);
      mockJdyService.getMembers.mockResolvedValue([
        { username: "user1", name: "王五", status: 1, departments: [200] },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUMembers({ buCode: "BU2" });
      expect(result.buMembers).toHaveLength(1);
      expect(result.buMembers[0].buCode).toBe("BU2");
    });

    it("returns error when JDY not configured", async () => {
      mockJdyService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUMembers({});
      expect(result.buMembers).toHaveLength(0);
      expect(result.error).toContain("简道云API未配置");
    });

    it("handles service error", async () => {
      mockBuMappingService.getAllMappings.mockRejectedValue(new Error("DB error"));
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUMembers({});
      expect(result.buMembers).toHaveLength(0);
      expect(result.error).toContain("DB error");
    });

    it("deduplicates members across mappings", async () => {
      mockBuMappingService.getAllMappings.mockResolvedValue([
        { buCode: "BU1", jdyDeptNo: 100, jdyDeptName: "海外-A", roleType: "Sales" },
        { buCode: "BU1", jdyDeptNo: 101, jdyDeptName: "海外-B", roleType: "Sales" },
      ]);
      mockJdyService.getMembers.mockResolvedValue([
        { username: "user1", name: "张三", status: 1, departments: [100, 101] },
      ]);
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getBUMembers({});
      const bu1 = result.buMembers.find((b: any) => b.buCode === "BU1");
      expect(bu1!.totalMembers).toBe(1); // should not be 2
    });
  });

  describe("getAllLeaders", () => {
    it("returns leaders from dynamic import", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getAllLeaders();
      expect(result).toHaveProperty("leaders");
    });
  });

  describe("getLeadersByBU", () => {
    it("returns leaders for specific BU", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getLeadersByBU({ buCode: "BU1" });
      expect(result).toHaveProperty("leaders");
    });

    it("rejects invalid BU code", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.buMapping.getLeadersByBU({ buCode: "INVALID" as any })).rejects.toThrow();
    });
  });

  describe("setLeader", () => {
    it("sets leader with required fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.setLeader({
        buCode: "BU1", roleType: "Sales", leaderName: "张三",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 1);
    });

    it("sets leader with all optional fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.setLeader({
        buCode: "BU2", roleType: "Mech", leaderName: "李四",
        leaderUserId: "user123", leaderEmail: "li@example.com",
        leaderPhone: "13800138000", isPrimary: true,
      });
      expect(result).toHaveProperty("success", true);
    });

    it("rejects empty leader name", async () => {
      const caller = createAdminCaller();
      await expect(caller.buMapping.setLeader({
        buCode: "BU1", roleType: "Sales", leaderName: "",
      })).rejects.toThrow();
    });
  });

  describe("deleteLeader", () => {
    it("deletes leader", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.deleteLeader({ id: 1 });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("getPerformanceStats", () => {
    it("returns stats with no input", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getPerformanceStats();
      expect(result).toHaveProperty("stats");
    });

    it("returns stats with filters", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.buMapping.getPerformanceStats({
        buCode: "BU1", periodType: "quarterly", period: "2026-Q1",
      });
      expect(result).toHaveProperty("stats");
    });
  });

  describe("updatePerformanceStats", () => {
    it("updates performance stats", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.updatePerformanceStats({
        buCode: "BU1", statPeriod: "2026-Q1", periodType: "quarterly",
        projectCount: 10, totalRevenue: 5000000, grossMargin: 0.35,
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id", 1);
    });

    it("updates with minimal required fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.updatePerformanceStats({
        buCode: "BU3", statPeriod: "2026-01", periodType: "monthly",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("initSamplePerformanceData", () => {
    it("initializes sample data", async () => {
      const caller = createAdminCaller();
      const result = await caller.buMapping.initSamplePerformanceData();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 5);
      expect(result).toHaveProperty("skipped", 0);
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for getAllBUs", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.getAllBUs()).rejects.toThrow();
    });

    it("rejects anonymous for getBUStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.getBUStats()).rejects.toThrow();
    });

    it("rejects anonymous for createMapping", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.createMapping({
        buCode: "BU1", jdyDeptNo: 100,
      })).rejects.toThrow();
    });

    it("rejects anonymous for autoMatchDepartments", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.autoMatchDepartments()).rejects.toThrow();
    });

    it("rejects anonymous for setLeader", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.setLeader({
        buCode: "BU1", roleType: "Sales", leaderName: "Test",
      })).rejects.toThrow();
    });

    it("rejects anonymous for updatePerformanceStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buMapping.updatePerformanceStats({
        buCode: "BU1", statPeriod: "2026-Q1", periodType: "quarterly",
      })).rejects.toThrow();
    });
  });
});

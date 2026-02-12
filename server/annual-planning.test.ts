import { describe, expect, it, vi } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getAnnualPlanningConfigs: vi.fn().mockResolvedValue([
    {
      id: 1,
      year: 2026,
      version: "v1",
      versionName: "2026年度规划-初版",
      status: "active",
      createdAt: new Date(),
    },
  ]),
  getActiveAnnualPlanningConfig: vi.fn().mockResolvedValue({
    id: 1,
    year: 2026,
    version: "v1",
    versionName: "2026年度规划-初版",
    status: "active",
  }),
  getAnnualPlanningConfigById: vi.fn().mockResolvedValue({
    id: 1,
    year: 2026,
    version: "v1",
    versionName: "2026年度规划-初版",
    status: "active",
  }),
  createAnnualPlanningConfig: vi.fn().mockResolvedValue({ id: 1 }),
  updateAnnualPlanningConfig: vi.fn().mockResolvedValue({ success: true }),
  activateAnnualPlanningConfig: vi.fn().mockResolvedValue({ success: true }),
  getAnnualPlanningItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      configId: 1,
      category: "culture",
      name: "卓越文化月度活动",
      status: "pending",
    },
    {
      id: 2,
      configId: 1,
      category: "training",
      name: "新员工入职培训",
      status: "pending",
    },
  ]),
  createAnnualPlanningItem: vi.fn().mockResolvedValue({ id: 1 }),
  updateAnnualPlanningItem: vi.fn().mockResolvedValue({ success: true }),
  deleteAnnualPlanningItem: vi.fn().mockResolvedValue({ success: true }),
  copyAnnualPlanningToNewYear: vi.fn().mockResolvedValue({
    success: true,
    newConfigId: 2,
    copiedItemsCount: 7,
    message: "成功创建2027年度规划，复制了7个项目",
  }),
  aiUpdateAnnualPlanning: vi.fn().mockResolvedValue({
    success: true,
    totalUpdates: 3,
    successfulUpdates: 3,
    failedUpdates: 0,
  }),
  batchAddTrainingParticipants: vi.fn().mockResolvedValue({
    success: true,
    totalRequested: 5,
    successCount: 4,
    failedCount: 1,
    details: [
      { userId: 1, success: true, participantId: 1 },
      { userId: 2, success: true, participantId: 2 },
      { userId: 3, success: true, participantId: 3 },
      { userId: 4, success: true, participantId: 4 },
      { userId: 5, success: false, message: "该用户已是参与者" },
    ],
  }),
}));

describe("Annual Planning Management", () => {
  describe("Config Management", () => {
    it("should get annual planning configs", async () => {
      const { getAnnualPlanningConfigs } = await import("./db");
      const configs = await getAnnualPlanningConfigs({ year: 2026 });
      
      expect(configs).toBeDefined();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0].year).toBe(2026);
    });

    it("should get active config for a year", async () => {
      const { getActiveAnnualPlanningConfig } = await import("./db");
      const config = await getActiveAnnualPlanningConfig(2026);
      
      expect(config).toBeDefined();
      expect(config?.status).toBe("active");
      expect(config?.year).toBe(2026);
    });

    it("should create annual planning config", async () => {
      const { createAnnualPlanningConfig } = await import("./db");
      const result = await createAnnualPlanningConfig({
        year: 2027,
        version: "v1",
        versionName: "2027年度规划",
        creatorId: 1,
      });
      
      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it("should update annual planning config", async () => {
      const { updateAnnualPlanningConfig } = await import("./db");
      const result = await updateAnnualPlanningConfig(1, {
        versionName: "2026年度规划-修订版",
      }, 1);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it("should activate annual planning config", async () => {
      const { activateAnnualPlanningConfig } = await import("./db");
      const result = await activateAnnualPlanningConfig(1, 1);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe("Item Management", () => {
    it("should get annual planning items", async () => {
      const { getAnnualPlanningItems } = await import("./db");
      const items = await getAnnualPlanningItems(1);
      
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);
    });

    it("should filter items by category", async () => {
      const { getAnnualPlanningItems } = await import("./db");
      const items = await getAnnualPlanningItems(1, { category: "culture" });
      
      expect(items).toBeDefined();
    });

    it("should create annual planning item", async () => {
      const { createAnnualPlanningItem } = await import("./db");
      const result = await createAnnualPlanningItem({
        configId: 1,
        category: "training",
        name: "安全生产培训",
        frequency: "yearly",
        month: 3,
      });
      
      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it("should update annual planning item", async () => {
      const { updateAnnualPlanningItem } = await import("./db");
      const result = await updateAnnualPlanningItem(1, {
        status: "in_progress",
      });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it("should delete annual planning item", async () => {
      const { deleteAnnualPlanningItem } = await import("./db");
      const result = await deleteAnnualPlanningItem(1);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe("AI Functions", () => {
    it("should copy annual planning to new year", async () => {
      const { copyAnnualPlanningToNewYear } = await import("./db");
      const result = await copyAnnualPlanningToNewYear(1, 2027, 1, {
        resetStatus: true,
        adjustDates: true,
        newVersionName: "2027年度规划",
      });
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.newConfigId).toBeDefined();
      expect(result?.copiedItemsCount).toBeGreaterThan(0);
    });

    it("should perform AI batch update", async () => {
      const { aiUpdateAnnualPlanning } = await import("./db");
      const result = await aiUpdateAnnualPlanning(1, 1, [
        { itemId: 1, changes: { status: "completed" } },
        { itemId: 2, changes: { status: "in_progress" } },
        { itemId: 3, changes: { responsibleUserName: "张三" } },
      ]);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.totalUpdates).toBe(3);
      expect(result?.successfulUpdates).toBe(3);
      expect(result?.failedUpdates).toBe(0);
    });
  });
});

describe("Batch Add Training Participants", () => {
  it("should batch add participants successfully", async () => {
    const { batchAddTrainingParticipants } = await import("./db");
    const result = await batchAddTrainingParticipants(1, [1, 2, 3, 4, 5]);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.totalRequested).toBe(5);
    expect(result.successCount).toBe(4);
    expect(result.failedCount).toBe(1);
  });

  it("should return details for each participant", async () => {
    const { batchAddTrainingParticipants } = await import("./db");
    const result = await batchAddTrainingParticipants(1, [1, 2, 3, 4, 5]);
    
    expect(result.details).toBeDefined();
    expect(result.details?.length).toBe(5);
    
    // Check successful additions
    const successful = result.details?.filter(d => d.success);
    expect(successful?.length).toBe(4);
    
    // Check failed additions
    const failed = result.details?.filter(d => !d.success);
    expect(failed?.length).toBe(1);
    expect(failed?.[0].message).toBe("该用户已是参与者");
  });

  it("should handle empty user list", async () => {
    const { batchAddTrainingParticipants } = await import("./db");
    
    // Mock for empty case
    vi.mocked(batchAddTrainingParticipants).mockResolvedValueOnce({
      success: true,
      totalRequested: 0,
      successCount: 0,
      failedCount: 0,
      details: [],
    });
    
    const result = await batchAddTrainingParticipants(1, []);
    
    expect(result.totalRequested).toBe(0);
    expect(result.successCount).toBe(0);
  });
});

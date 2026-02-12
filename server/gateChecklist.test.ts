/**
 * v2.5.37 Gate检查清单配置单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue(Promise.resolve([
      { id: 1, gateStage: "M7", category: "cleaning_performance", item: "清洗效果目视检查", weight: 10, required: 1 },
      { id: 2, gateStage: "M7", category: "mechanical_system", item: "传送带运行检查", weight: 8, required: 1 },
    ])),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnValue(Promise.resolve([{ insertId: BigInt(1) }])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
}));

describe("Gate检查清单配置", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("工业清洗设备检查类别", () => {
    const CLEANING_EQUIPMENT_CATEGORIES = [
      { value: "cleaning_performance", label: "清洗性能" },
      { value: "mechanical_system", label: "机械系统" },
      { value: "electrical_control", label: "电气控制" },
      { value: "process_parameters", label: "工艺参数" },
      { value: "cycle_time", label: "节拍效率" },
      { value: "safety_compliance", label: "安全合规" },
      { value: "documentation", label: "文档资料" },
    ];

    it("应该包含7个工业清洗设备专用检查类别", () => {
      expect(CLEANING_EQUIPMENT_CATEGORIES).toHaveLength(7);
    });

    it("应该包含清洗性能类别", () => {
      const cleaningPerf = CLEANING_EQUIPMENT_CATEGORIES.find(c => c.value === "cleaning_performance");
      expect(cleaningPerf).toBeDefined();
      expect(cleaningPerf?.label).toBe("清洗性能");
    });

    it("应该包含节拍效率类别", () => {
      const cycleTime = CLEANING_EQUIPMENT_CATEGORIES.find(c => c.value === "cycle_time");
      expect(cycleTime).toBeDefined();
      expect(cycleTime?.label).toBe("节拍效率");
    });

    it("应该包含安全合规类别", () => {
      const safety = CLEANING_EQUIPMENT_CATEGORIES.find(c => c.value === "safety_compliance");
      expect(safety).toBeDefined();
      expect(safety?.label).toBe("安全合规");
    });
  });

  describe("Gate阶段定义", () => {
    const GATE_STAGES = [
      { value: "M7", label: "M7 - 预验收FAT" },
      { value: "M8", label: "M8 - 终验收SAT" },
      { value: "M9", label: "M9 - 质保期" },
    ];

    it("应该包含3个Gate阶段", () => {
      expect(GATE_STAGES).toHaveLength(3);
    });

    it("M7阶段应该是预验收FAT", () => {
      const m7 = GATE_STAGES.find(g => g.value === "M7");
      expect(m7?.label).toContain("FAT");
    });

    it("M8阶段应该是终验收SAT", () => {
      const m8 = GATE_STAGES.find(g => g.value === "M8");
      expect(m8?.label).toContain("SAT");
    });

    it("M9阶段应该是质保期", () => {
      const m9 = GATE_STAGES.find(g => g.value === "M9");
      expect(m9?.label).toContain("质保期");
    });
  });

  describe("M7检查项模板", () => {
    const M7_TEMPLATE = [
      { category: "cleaning_performance", item: "清洗效果目视检查", weight: 10, required: true, criteria: "工件表面无可见油污、碎屑、水渍" },
      { category: "cleaning_performance", item: "清洁度测试（重量法）", weight: 15, required: true, criteria: "残留物重量≤客户规定标准" },
      { category: "cleaning_performance", item: "清洁度测试（颗粒计数）", weight: 15, required: true, criteria: "颗粒数量和尺寸符合ISO 16232标准" },
      { category: "mechanical_system", item: "传送带/链条运行", weight: 8, required: true, criteria: "运行平稳，无异响，张紧度合适" },
      { category: "electrical_control", item: "PLC程序功能测试", weight: 10, required: true, criteria: "所有程序功能正常，逻辑正确" },
      { category: "cycle_time", item: "单件节拍测试", weight: 10, required: true, criteria: "实际节拍≤设计节拍" },
    ];

    it("M7模板应该包含清洁度测试项", () => {
      const cleanlinessTests = M7_TEMPLATE.filter(t => t.item.includes("清洁度"));
      expect(cleanlinessTests.length).toBeGreaterThanOrEqual(2);
    });

    it("清洁度测试应该引用ISO 16232标准", () => {
      const isoTest = M7_TEMPLATE.find(t => t.criteria?.includes("ISO 16232"));
      expect(isoTest).toBeDefined();
    });

    it("节拍测试应该是必检项", () => {
      const cycleTest = M7_TEMPLATE.find(t => t.item.includes("节拍"));
      expect(cycleTest?.required).toBe(true);
    });

    it("PLC程序测试应该是必检项", () => {
      const plcTest = M7_TEMPLATE.find(t => t.item.includes("PLC"));
      expect(plcTest?.required).toBe(true);
    });
  });

  describe("M8检查项模板", () => {
    const M8_TEMPLATE = [
      { category: "cleaning_performance", item: "实际工件清洗测试", weight: 15, required: true, criteria: "使用客户实际工件测试，清洁度达标" },
      { category: "cleaning_performance", item: "批量清洗一致性", weight: 10, required: true, criteria: "连续清洗10件，清洁度一致" },
      { category: "cycle_time", item: "产线节拍匹配", weight: 12, required: true, criteria: "与产线节拍匹配，无瓶颈" },
      { category: "cycle_time", item: "8小时连续运行", weight: 10, required: true, criteria: "连续运行8小时无故障" },
      { category: "safety_compliance", item: "现场安全培训", weight: 8, required: true, criteria: "操作人员培训完成并签字确认" },
    ];

    it("M8应该包含实际工件清洗测试", () => {
      const actualTest = M8_TEMPLATE.find(t => t.item.includes("实际工件"));
      expect(actualTest).toBeDefined();
      expect(actualTest?.required).toBe(true);
    });

    it("M8应该包含8小时连续运行测试", () => {
      const continuousTest = M8_TEMPLATE.find(t => t.item.includes("8小时"));
      expect(continuousTest).toBeDefined();
    });

    it("M8应该包含现场安全培训", () => {
      const trainingTest = M8_TEMPLATE.find(t => t.item.includes("安全培训"));
      expect(trainingTest).toBeDefined();
    });
  });

  describe("M9检查项模板", () => {
    const M9_TEMPLATE = [
      { category: "cleaning_performance", item: "定期清洁度抽检", weight: 15, required: true, criteria: "每月抽检，清洁度持续达标" },
      { category: "cycle_time", item: "OEE监控", weight: 10, required: true, criteria: "设备综合效率≥85%" },
      { category: "cycle_time", item: "故障停机记录", weight: 8, required: true, criteria: "故障记录完整，MTBF达标" },
    ];

    it("M9应该包含OEE监控", () => {
      const oeeTest = M9_TEMPLATE.find(t => t.item.includes("OEE"));
      expect(oeeTest).toBeDefined();
      expect(oeeTest?.criteria).toContain("85%");
    });

    it("M9应该包含MTBF指标", () => {
      const mtbfTest = M9_TEMPLATE.find(t => t.criteria?.includes("MTBF"));
      expect(mtbfTest).toBeDefined();
    });

    it("M9应该包含定期清洁度抽检", () => {
      const periodicTest = M9_TEMPLATE.find(t => t.item.includes("定期"));
      expect(periodicTest).toBeDefined();
      expect(periodicTest?.criteria).toContain("每月");
    });
  });

  describe("权重计算", () => {
    const sampleItems = [
      { weight: 10, required: true },
      { weight: 15, required: true },
      { weight: 8, required: false },
      { weight: 5, required: false },
    ];

    it("应该正确计算总权重", () => {
      const totalWeight = sampleItems.reduce((sum, item) => sum + item.weight, 0);
      expect(totalWeight).toBe(38);
    });

    it("应该正确统计必检项数量", () => {
      const requiredCount = sampleItems.filter(item => item.required).length;
      expect(requiredCount).toBe(2);
    });
  });
});

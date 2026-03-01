/**
 * Safety Rule Router -- Unit Tests
 * Tests 8 procedures: list, getById, create, update, delete, validate, seedDefaults, getStats
 *
 * Uses standard Drizzle ORM chain mock pattern with FIFO queues.
 * Key logic: validate engine checks min/max/forbidden values, wildcard equipment matching,
 * 10% margin warnings, severity-based summary (fatal > critical > warning > pass).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// -- Hoisted mocks --
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// Mock DB
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

// -- Sample data --
const sampleRule = {
  id: 1,
  ruleCode: "SR-001",
  name: "超声波功率限制",
  category: "physical",
  description: "超声波清洗设备功率不得超过5000W",
  materialType: null,
  equipmentModel: null,
  parameterName: "ultrasonicPower",
  unit: "W",
  minValue: null,
  maxValue: "5000",
  forbiddenValues: null,
  severity: "critical",
  isActive: 1,
  createdBy: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const aluminumTempRule = {
  id: 2,
  ruleCode: "SR-002",
  name: "清洗液温度限制-铝件",
  category: "physical",
  description: "铝件清洗温度20-80°C",
  materialType: "aluminum",
  equipmentModel: "GRT-SC-*",
  parameterName: "temperature",
  unit: "°C",
  minValue: "20",
  maxValue: "80",
  forbiddenValues: null,
  severity: "critical",
  isActive: 1,
  createdBy: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const pressureRule = {
  id: 4,
  ruleCode: "SR-004",
  name: "高压清洗压力限制-铝件",
  category: "physical",
  description: "铝件高压清洗压力0.1-2.0MPa",
  materialType: "aluminum",
  equipmentModel: "GRT-HP-*",
  parameterName: "pressure",
  unit: "MPa",
  minValue: "0.1",
  maxValue: "2.0",
  forbiddenValues: null,
  severity: "fatal",
  isActive: 1,
  createdBy: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const forbiddenRule = {
  id: 5,
  ruleCode: "SR-005",
  name: "禁止值测试",
  category: "chemical",
  description: "禁止特定值",
  materialType: "plastic",
  equipmentModel: null,
  parameterName: "concentration",
  unit: "%",
  minValue: null,
  maxValue: null,
  forbiddenValues: '["0","100"]',
  severity: "warning",
  isActive: 1,
  createdBy: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("safety-rule router", () => {

  // === list ===
  describe("list", () => {
    it("returns all rules when no filter", async () => {
      selectResultsQueue.push([sampleRule, aluminumTempRule]);
      const result = await caller().safetyRule.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns all rules with empty input", async () => {
      selectResultsQueue.push([sampleRule]);
      const result = await caller().safetyRule.list({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by category", async () => {
      selectResultsQueue.push([
        sampleRule,
        { ...sampleRule, id: 3, category: "chemical" },
      ]);
      const result = await caller().safetyRule.list({ category: "physical" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe("physical");
    });

    it("filters by materialType", async () => {
      selectResultsQueue.push([
        sampleRule,
        aluminumTempRule,
      ]);
      const result = await caller().safetyRule.list({ materialType: "aluminum" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].materialType).toBe("aluminum");
    });

    it("filters by isActive=true", async () => {
      selectResultsQueue.push([
        sampleRule,
        { ...sampleRule, id: 3, isActive: 0 },
      ]);
      const result = await caller().safetyRule.list({ isActive: true });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isActive).toBe(1);
    });

    it("filters by isActive=false", async () => {
      selectResultsQueue.push([
        sampleRule,
        { ...sampleRule, id: 3, isActive: 0 },
      ]);
      const result = await caller().safetyRule.list({ isActive: false });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isActive).toBe(0);
    });

    it("combines multiple filters", async () => {
      selectResultsQueue.push([
        sampleRule,
        aluminumTempRule,
        { ...sampleRule, id: 3, category: "chemical", isActive: 0 },
      ]);
      const result = await caller().safetyRule.list({
        category: "physical",
        isActive: true,
      });
      expect(result.items).toHaveLength(2);
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push([]);
      const result = await caller().safetyRule.list({ category: "electrical" });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("rejects invalid category enum", async () => {
      await expect(caller().safetyRule.list({
        category: "nuclear" as any,
      })).rejects.toThrow();
    });
  });

  // === getById ===
  describe("getById", () => {
    it("returns rule by numeric id", async () => {
      selectResultsQueue.push([sampleRule]);
      const result = await caller().safetyRule.getById({ id: 1 });
      expect(result).toHaveProperty("name", "超声波功率限制");
      expect(result).toHaveProperty("ruleCode", "SR-001");
    });

    it("returns rule by string id", async () => {
      selectResultsQueue.push([sampleRule]);
      const result = await caller().safetyRule.getById({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("returns null when rule not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().safetyRule.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // === create ===
  describe("create", () => {
    it("creates a rule with required fields only", async () => {
      const created = { ...sampleRule, id: 10 };
      returningQueue.push([created]);
      const result = await caller().safetyRule.create({
        name: "New Rule",
        category: "physical",
        parameterName: "voltage",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("安全规则已创建");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates a rule with all optional fields", async () => {
      const created = { ...sampleRule, id: 11 };
      returningQueue.push([created]);
      const result = await caller().safetyRule.create({
        name: "Full Rule",
        category: "chemical",
        description: "Description",
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameterName: "temperature",
        unit: "°C",
        minValue: "20",
        maxValue: "80",
        forbiddenValues: ["50", "60"],
        severity: "fatal",
      });
      expect(result.success).toBe(true);
    });

    it("defaults severity to warning", async () => {
      returningQueue.push([{ ...sampleRule, severity: "warning" }]);
      const result = await caller().safetyRule.create({
        name: "Default Severity",
        category: "operational",
        parameterName: "speed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      await expect(caller().safetyRule.create({
        name: "",
        category: "physical",
        parameterName: "test",
      })).rejects.toThrow();
    });

    it("rejects empty parameterName", async () => {
      await expect(caller().safetyRule.create({
        name: "Rule",
        category: "physical",
        parameterName: "",
      })).rejects.toThrow();
    });

    it("rejects invalid category", async () => {
      await expect(caller().safetyRule.create({
        name: "Rule",
        category: "nuclear" as any,
        parameterName: "test",
      })).rejects.toThrow();
    });

    it("rejects invalid severity", async () => {
      await expect(caller().safetyRule.create({
        name: "Rule",
        category: "physical",
        parameterName: "test",
        severity: "extreme" as any,
      })).rejects.toThrow();
    });
  });

  // === update ===
  describe("update", () => {
    it("updates name field", async () => {
      returningQueue.push([{ ...sampleRule, name: "Updated Name" }]);
      const result = await caller().safetyRule.update({
        id: 1,
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("安全规则已更新");
      expect(result.data).toHaveProperty("name", "Updated Name");
    });

    it("updates category", async () => {
      returningQueue.push([{ ...sampleRule, category: "electrical" }]);
      const result = await caller().safetyRule.update({
        id: 1,
        category: "electrical",
      });
      expect(result.success).toBe(true);
    });

    it("updates isActive to false (maps boolean to 0)", async () => {
      returningQueue.push([{ ...sampleRule, isActive: 0 }]);
      const result = await caller().safetyRule.update({
        id: 1,
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it("updates isActive to true (maps boolean to 1)", async () => {
      returningQueue.push([{ ...sampleRule, isActive: 1 }]);
      const result = await caller().safetyRule.update({
        id: 1,
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("updates forbiddenValues (serialized to JSON)", async () => {
      returningQueue.push([{ ...sampleRule, forbiddenValues: '["10","20"]' }]);
      const result = await caller().safetyRule.update({
        id: 1,
        forbiddenValues: ["10", "20"],
      });
      expect(result.success).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      returningQueue.push([{
        ...sampleRule,
        name: "Multi Update",
        severity: "fatal",
        minValue: "5",
      }]);
      const result = await caller().safetyRule.update({
        id: 1,
        name: "Multi Update",
        severity: "fatal",
        minValue: "5",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string id", async () => {
      returningQueue.push([{ ...sampleRule, name: "String ID" }]);
      const result = await caller().safetyRule.update({
        id: "1",
        name: "String ID",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid category enum", async () => {
      await expect(caller().safetyRule.update({
        id: 1,
        category: "nuclear" as any,
      })).rejects.toThrow();
    });

    it("rejects invalid severity enum", async () => {
      await expect(caller().safetyRule.update({
        id: 1,
        severity: "extreme" as any,
      })).rejects.toThrow();
    });
  });

  // === delete ===
  describe("delete", () => {
    it("deletes rule by numeric id", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().safetyRule.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "安全规则已删除" });
    });

    it("deletes rule by string id", async () => {
      selectResultsQueue.push([]);
      const result = await caller().safetyRule.delete({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // === validate ===
  describe("validate", () => {
    it("passes when all parameters within limits", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 50 }],
      });
      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.violations).toHaveLength(0);
      expect(result.summary).toBe("所有参数在安全范围内");
    });

    it("detects violation when value below min", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 10 }],
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].parameter).toBe("temperature");
      expect(result.violations[0].actualValue).toBe(10);
      expect(result.violations[0].severity).toBe("critical");
      expect(result.violations[0].message).toContain("低于安全下限");
    });

    it("detects violation when value above max", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 100 }],
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("超过安全上限");
    });

    it("detects forbidden value violation", async () => {
      selectResultsQueue.push([forbiddenRule]);
      const result = await caller().safetyRule.validate({
        materialType: "plastic",
        equipmentModel: "ANY",
        parameters: [{ name: "concentration", value: 0 }],
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("禁止值");
    });

    it("blocks on fatal severity violation", async () => {
      selectResultsQueue.push([pressureRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-HP-200",
        parameters: [{ name: "pressure", value: 3.0 }],
      });
      expect(result.passed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.summary).toBe("致命安全违规，操作被阻止");
    });

    it("reports critical summary for critical violations (no fatal)", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 100 }],
      });
      expect(result.blocked).toBe(false);
      expect(result.summary).toBe("严重安全违规，需审批后方可继续");
    });

    it("reports warning summary for warning-severity violations", async () => {
      const warningRule = { ...sampleRule, severity: "warning", parameterName: "speed", maxValue: "100" };
      selectResultsQueue.push([warningRule]);
      const result = await caller().safetyRule.validate({
        materialType: "any",
        equipmentModel: "any",
        parameters: [{ name: "speed", value: 150 }],
      });
      expect(result.passed).toBe(false);
      expect(result.blocked).toBe(false);
      expect(result.summary).toBe("存在安全警告，请注意");
    });

    it("matches wildcard equipment model (GRT-SC-*)", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-500",
        parameters: [{ name: "temperature", value: 50 }],
      });
      expect(result.passed).toBe(true);
    });

    it("does not match non-matching equipment model", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-HP-100",
        parameters: [{ name: "temperature", value: 10 }],
      });
      // Equipment model mismatch: rule GRT-SC-* does not match GRT-HP-100
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("does not match wrong materialType", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "stainless_steel",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 10 }],
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("does not match wrong parameter name", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "pressure", value: 999 }],
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("generates warning when value is within 10% of lower limit", async () => {
      // min=20, max=80, range=60, margin=6 => warning zone: 20 <= v < 26
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 22 }],
      });
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("接近安全下限");
      expect(result.warnings[0].recommendation).toContain("26.0");
    });

    it("generates warning when value is within 10% of upper limit", async () => {
      // min=20, max=80, range=60, margin=6 => warning zone: 74 < v <= 80
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 78 }],
      });
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("接近安全上限");
      expect(result.warnings[0].recommendation).toContain("74.0");
    });

    it("no warnings when value is comfortably in range", async () => {
      selectResultsQueue.push([aluminumTempRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 50 }],
      });
      expect(result.warnings).toHaveLength(0);
    });

    it("handles multiple parameters and multiple rules", async () => {
      selectResultsQueue.push([aluminumTempRule, pressureRule]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [
          { name: "temperature", value: 100 }, // exceeds max 80 (matches aluminumTempRule)
          { name: "pressure", value: 1.0 },     // pressure rule has equipmentModel GRT-HP-*, does not match GRT-SC-100
        ],
      });
      // Only temperature violation
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].parameter).toBe("temperature");
    });

    it("handles rule with null equipmentModel (matches any)", async () => {
      const ruleNoEquip = { ...sampleRule, materialType: null, equipmentModel: null };
      selectResultsQueue.push([ruleNoEquip]);
      const result = await caller().safetyRule.validate({
        materialType: "any",
        equipmentModel: "ANY-MODEL",
        parameters: [{ name: "ultrasonicPower", value: 6000 }],
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it("handles rule with only maxValue (no minValue)", async () => {
      // sampleRule has maxValue=5000, no minValue
      selectResultsQueue.push([sampleRule]);
      const result = await caller().safetyRule.validate({
        materialType: "any",
        equipmentModel: "any",
        parameters: [{ name: "ultrasonicPower", value: 1000 }],
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("handles malformed forbiddenValues JSON gracefully", async () => {
      const badJsonRule = {
        ...forbiddenRule,
        forbiddenValues: "not-json",
        minValue: null,
        maxValue: null,
      };
      selectResultsQueue.push([badJsonRule]);
      const result = await caller().safetyRule.validate({
        materialType: "plastic",
        equipmentModel: "ANY",
        parameters: [{ name: "concentration", value: 50 }],
      });
      // Should not crash; parse error is caught and ignored
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("handles empty parameters array", async () => {
      selectResultsQueue.push([sampleRule]);
      const result = await caller().safetyRule.validate({
        materialType: "any",
        equipmentModel: "any",
        parameters: [],
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("handles no active rules", async () => {
      selectResultsQueue.push([]);
      const result = await caller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 999 }],
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // === seedDefaults ===
  describe("seedDefaults", () => {
    it("skips seeding when rules already exist", async () => {
      selectResultsQueue.push([{ id: 1 }]); // existing rule found
      const result = await caller().safetyRule.seedDefaults();
      expect(result.success).toBe(true);
      expect(result.message).toBe("安全规则已存在");
    });

    it("seeds default rules when table is empty", async () => {
      selectResultsQueue.push([]); // no existing rules
      // 5 inserts, each goes through the chain. The insert(...).values(...) calls
      // resolve via chain.then for each one.
      for (let i = 0; i < 5; i++) {
        selectResultsQueue.push([]);
      }
      const result = await caller().safetyRule.seedDefaults();
      expect(result.success).toBe(true);
      expect(result.message).toContain("5");
      expect(result.message).toContain("默认安全规则已初始化");
    });
  });

  // === getStats ===
  describe("getStats", () => {
    it("returns statistics for rules", async () => {
      selectResultsQueue.push([
        { ...sampleRule, category: "physical", severity: "critical", isActive: 1 },
        { ...sampleRule, id: 2, category: "physical", severity: "fatal", isActive: 1 },
        { ...sampleRule, id: 3, category: "chemical", severity: "warning", isActive: 0 },
        { ...sampleRule, id: 4, category: "electrical", severity: "info", isActive: 1 },
      ]);
      const result = await caller().safetyRule.getStats();
      expect(result.total).toBe(4);
      expect(result.active).toBe(3);
      expect(result.byCategory.physical).toBe(2);
      expect(result.byCategory.chemical).toBe(1);
      expect(result.byCategory.electrical).toBe(1);
      expect(result.byCategory.operational).toBe(0);
      expect(result.bySeverity.fatal).toBe(1);
      expect(result.bySeverity.critical).toBe(1);
      expect(result.bySeverity.warning).toBe(1);
      expect(result.bySeverity.info).toBe(1);
    });

    it("returns zeros when no rules exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().safetyRule.getStats();
      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.byCategory.physical).toBe(0);
      expect(result.byCategory.chemical).toBe(0);
      expect(result.byCategory.electrical).toBe(0);
      expect(result.byCategory.operational).toBe(0);
      expect(result.bySeverity.fatal).toBe(0);
      expect(result.bySeverity.critical).toBe(0);
      expect(result.bySeverity.warning).toBe(0);
      expect(result.bySeverity.info).toBe(0);
    });

    it("counts only active rules correctly", async () => {
      selectResultsQueue.push([
        { ...sampleRule, isActive: 1 },
        { ...sampleRule, id: 2, isActive: 0 },
        { ...sampleRule, id: 3, isActive: 0 },
      ]);
      const result = await caller().safetyRule.getStats();
      expect(result.total).toBe(3);
      expect(result.active).toBe(1);
    });
  });

  // === Auth Guards ===
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().safetyRule.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().safetyRule.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().safetyRule.create({
        name: "X", category: "physical", parameterName: "Y",
      })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().safetyRule.update({
        id: 1, name: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().safetyRule.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for validate", async () => {
      await expect(createAnonymousCaller().safetyRule.validate({
        materialType: "aluminum",
        equipmentModel: "GRT-SC-100",
        parameters: [{ name: "temperature", value: 50 }],
      })).rejects.toThrow();
    });
    it("rejects anonymous for seedDefaults", async () => {
      await expect(createAnonymousCaller().safetyRule.seedDefaults()).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().safetyRule.getStats()).rejects.toThrow();
    });
  });
});

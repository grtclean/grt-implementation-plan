/**
 * Safety Rule Engine Router
 * 工业安全规则管理 + 参数校验
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { safetyRules } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const safetyRuleRouter = router({
  // 规则列表
  list: protectedProcedure.input(z.object({
    category: z.enum(["physical", "chemical", "electrical", "operational"]).optional(),
    materialType: z.string().optional(),
    isActive: z.boolean().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(safetyRules).orderBy(safetyRules.ruleCode).limit(1000);
    if (input?.category) items = items.filter(r => r.category === input.category);
    if (input?.materialType) items = items.filter(r => r.materialType === input.materialType);
    if (input?.isActive !== undefined) items = items.filter(r => r.isActive === (input.isActive ? 1 : 0));
    return { items, total: items.length };
  }),

  // 详情
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [rule] = await db.select().from(safetyRules).where(eq(safetyRules.id, toNum(input.id))).limit(1000);
    return rule || null;
  }),

  // 创建规则
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    category: z.enum(["physical", "chemical", "electrical", "operational"]),
    description: z.string().optional(),
    materialType: z.string().optional(),
    equipmentModel: z.string().optional(),
    parameterName: z.string().min(1),
    unit: z.string().optional(),
    minValue: z.string().optional(),
    maxValue: z.string().optional(),
    forbiddenValues: z.array(z.string()).optional(),
    severity: z.enum(["fatal", "critical", "warning", "info"]).default("warning"),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `SR-${Date.now().toString(36).toUpperCase()}`;
    const [rule] = await db.insert(safetyRules).values({
      ruleCode: code,
      name: input.name,
      category: input.category,
      description: input.description,
      materialType: input.materialType,
      equipmentModel: input.equipmentModel,
      parameterName: input.parameterName,
      unit: input.unit,
      minValue: input.minValue,
      maxValue: input.maxValue,
      forbiddenValues: input.forbiddenValues ? JSON.stringify(input.forbiddenValues) : undefined,
      severity: input.severity,
      isActive: 1,
    }).returning();
    return { success: true, message: "安全规则已创建", data: rule };
  }),

  // 更新规则
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    category: z.enum(["physical", "chemical", "electrical", "operational"]).optional(),
    description: z.string().optional(),
    materialType: z.string().optional(),
    equipmentModel: z.string().optional(),
    parameterName: z.string().optional(),
    unit: z.string().optional(),
    minValue: z.string().optional(),
    maxValue: z.string().optional(),
    forbiddenValues: z.array(z.string()).optional(),
    severity: z.enum(["fatal", "critical", "warning", "info"]).optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, forbiddenValues, isActive, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (forbiddenValues !== undefined) updates.forbiddenValues = JSON.stringify(forbiddenValues);
    if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;
    const [rule] = await db.update(safetyRules).set(updates).where(eq(safetyRules.id, toNum(input.id))).returning();
    return { success: true, message: "安全规则已更新", data: rule };
  }),

  // 删除规则
  delete: requirePermission('mfg:safety:manage').input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(safetyRules).where(eq(safetyRules.id, toNum(input.id)));
    return { success: true, message: "安全规则已删除" };
  }),

  // ===== Safety Validation Engine =====

  // 校验参数是否安全
  validate: protectedProcedure.input(z.object({
    materialType: z.string(),
    equipmentModel: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      value: z.number(),
      unit: z.string().optional(),
    })),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const rules = await db.select().from(safetyRules).where(eq(safetyRules.isActive, 1)).limit(1000);

    const violations: Array<{
      ruleCode: string;
      ruleName: string;
      parameter: string;
      actualValue: number;
      limit: string;
      severity: string;
      message: string;
    }> = [];

    const warnings: Array<{
      ruleCode: string;
      ruleName: string;
      message: string;
      recommendation: string;
    }> = [];

    for (const param of input.parameters) {
      // Find matching rules (support wildcard in equipmentModel)
      const matchingRules = rules.filter(r => {
        if (r.parameterName !== param.name) return false;
        if (r.materialType && r.materialType !== input.materialType) return false;
        if (r.equipmentModel) {
          const pattern = r.equipmentModel.replace(/\*/g, ".*");
          if (!new RegExp(`^${pattern}$`).test(input.equipmentModel)) return false;
        }
        return true;
      });

      for (const rule of matchingRules) {
        const min = rule.minValue ? Number(rule.minValue) : null;
        const max = rule.maxValue ? Number(rule.maxValue) : null;

        if (min !== null && param.value < min) {
          violations.push({
            ruleCode: rule.ruleCode,
            ruleName: rule.name,
            parameter: param.name,
            actualValue: param.value,
            limit: `最小值: ${min} ${rule.unit || ""}`,
            severity: rule.severity,
            message: `${param.name} = ${param.value} 低于安全下限 ${min}`,
          });
        }
        if (max !== null && param.value > max) {
          violations.push({
            ruleCode: rule.ruleCode,
            ruleName: rule.name,
            parameter: param.name,
            actualValue: param.value,
            limit: `最大值: ${max} ${rule.unit || ""}`,
            severity: rule.severity,
            message: `${param.name} = ${param.value} 超过安全上限 ${max}`,
          });
        }

        // Forbidden values check
        if (rule.forbiddenValues) {
          try {
            const forbidden = JSON.parse(rule.forbiddenValues) as string[];
            if (forbidden.includes(String(param.value))) {
              violations.push({
                ruleCode: rule.ruleCode,
                ruleName: rule.name,
                parameter: param.name,
                actualValue: param.value,
                limit: `禁止值: ${forbidden.join(", ")}`,
                severity: rule.severity,
                message: `${param.name} = ${param.value} 为禁止值`,
              });
            }
          } catch { /* ignore parse error */ }
        }

        // Warning if close to limits (within 10%)
        if (min !== null && max !== null) {
          const range = max - min;
          const margin = range * 0.1;
          if (param.value >= min && param.value < min + margin) {
            warnings.push({
              ruleCode: rule.ruleCode,
              ruleName: rule.name,
              message: `${param.name} = ${param.value} 接近安全下限`,
              recommendation: `建议将 ${param.name} 调整至 ${(min + margin).toFixed(1)} 以上`,
            });
          }
          if (param.value <= max && param.value > max - margin) {
            warnings.push({
              ruleCode: rule.ruleCode,
              ruleName: rule.name,
              message: `${param.name} = ${param.value} 接近安全上限`,
              recommendation: `建议将 ${param.name} 调整至 ${(max - margin).toFixed(1)} 以下`,
            });
          }
        }
      }
    }

    const hasFatal = violations.some(v => v.severity === "fatal");
    const hasCritical = violations.some(v => v.severity === "critical");

    return {
      passed: violations.length === 0,
      blocked: hasFatal,
      violations,
      warnings,
      summary: hasFatal
        ? "致命安全违规，操作被阻止"
        : hasCritical
        ? "严重安全违规，需审批后方可继续"
        : violations.length > 0
        ? "存在安全警告，请注意"
        : "所有参数在安全范围内",
    };
  }),

  // 初始化默认安全规则
  seedDefaults: requirePermission('mfg:safety:manage').mutation(async () => {
    const db = await requireDb();
    const existing = await db.select({ id: safetyRules.id }).from(safetyRules).limit(1);
    if (existing.length > 0) return { success: true, message: "安全规则已存在" };

    type Cat = "physical" | "chemical" | "electrical" | "operational";
    type Sev = "fatal" | "critical" | "warning" | "info";
    const defaults: Array<{
      ruleCode: string; name: string; category: Cat; parameterName: string;
      unit: string; minValue?: string; maxValue?: string; severity: Sev;
      description: string; materialType?: string; equipmentModel?: string;
    }> = [
      { ruleCode: "SR-001", name: "超声波功率限制", category: "physical", parameterName: "ultrasonicPower", unit: "W", maxValue: "5000", severity: "critical", description: "超声波清洗设备功率不得超过5000W" },
      { ruleCode: "SR-002", name: "清洗液温度限制-铝件", category: "physical", materialType: "aluminum", equipmentModel: "GRT-SC-*", parameterName: "temperature", unit: "°C", minValue: "20", maxValue: "80", severity: "critical", description: "铝件清洗温度20-80°C" },
      { ruleCode: "SR-003", name: "清洗液温度限制-不锈钢", category: "physical", materialType: "stainless_steel", equipmentModel: "GRT-SC-*", parameterName: "temperature", unit: "°C", minValue: "20", maxValue: "120", severity: "warning", description: "不锈钢清洗温度20-120°C" },
      { ruleCode: "SR-004", name: "高压清洗压力限制-铝件", category: "physical", materialType: "aluminum", equipmentModel: "GRT-HP-*", parameterName: "pressure", unit: "MPa", minValue: "0.1", maxValue: "2.0", severity: "fatal", description: "铝件高压清洗压力0.1-2.0MPa" },
      { ruleCode: "SR-005", name: "清洗液温度限制-塑料件", category: "physical", materialType: "plastic", equipmentModel: "GRT-*", parameterName: "temperature", unit: "°C", minValue: "10", maxValue: "60", severity: "critical", description: "塑料件清洗温度10-60°C" },
    ];
    for (const rule of defaults) {
      await db.insert(safetyRules).values({ ...rule, isActive: 1 });
    }
    return { success: true, message: `${defaults.length} 条默认安全规则已初始化` };
  }),

  // 统计
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rules = await db.select().from(safetyRules).limit(1000);
    return {
      total: rules.length,
      active: rules.filter(r => r.isActive === 1).length,
      byCategory: {
        physical: rules.filter(r => r.category === "physical").length,
        chemical: rules.filter(r => r.category === "chemical").length,
        electrical: rules.filter(r => r.category === "electrical").length,
        operational: rules.filter(r => r.category === "operational").length,
      },
      bySeverity: {
        fatal: rules.filter(r => r.severity === "fatal").length,
        critical: rules.filter(r => r.severity === "critical").length,
        warning: rules.filter(r => r.severity === "warning").length,
        info: rules.filter(r => r.severity === "info").length,
      },
    };
  }),
});

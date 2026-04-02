/**
 * AI Quality Assistant tRPC Routes
 * 质量管理助手API路由
 *
 * Data source: trpc.qualityAssistant.getDashboard (DB-backed)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { QualityAssistant } from "./qualityAssistant";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-quality-routes");

// ─── Dashboard Bootstrap ─────────────────────────────────────────
let _qualityDashReady = false;
async function ensureQualityDashboard() {
  if (_qualityDashReady) return;
  _qualityDashReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'quality'`);
    if ((rows[0] as any).cnt === 0) {
      const causes = JSON.stringify([
        { category: "人员", cause: "操作员未按SOP设定清洗参数", probability: 35 },
        { category: "机器", cause: "超声波换能器功率衰减", probability: 25 },
        { category: "材料", cause: "清洗液浓度偏低（低于3%）", probability: 20 },
        { category: "方法", cause: "清洗时间不足（<5分钟）", probability: 10 },
        { category: "环境", cause: "环境温度过低影响清洗效果", probability: 5 },
        { category: "测量", cause: "检测设备校准偏差", probability: 5 },
      ]);
      const inspection = JSON.stringify([
        { id: "i1", name: "清洁度重量法检测", method: "称重法", frequency: "每批次", standard: "残留<2mg", stage: "M8" },
        { id: "i2", name: "颗粒度检测", method: "颗粒计数", frequency: "每批次", standard: "≤500um颗粒<100个", stage: "M8" },
        { id: "i3", name: "表面荧光检测", method: "UV荧光", frequency: "抽检10%", standard: "无荧光残留", stage: "M8" },
        { id: "i4", name: "尺寸精度复检", method: "三坐标", frequency: "首件+抽检", standard: "公差IT7级", stage: "M7" },
        { id: "i5", name: "干燥完整性验证", method: "目测+仪器", frequency: "每件", standard: "无水渍残留", stage: "M7" },
        { id: "i6", name: "设备运行参数记录", method: "PLC数据", frequency: "连续", standard: "参数在控", stage: "M7" },
        { id: "i7", name: "FAT性能测试", method: "综合测试", frequency: "全检", standard: "按合同指标", stage: "M8" },
        { id: "i8", name: "SAT现场验证", method: "实际工况", frequency: "全检", standard: "客户标准", stage: "M11" },
      ]);
      const metrics = JSON.stringify([
        { label: "一次合格率", value: 96.5, target: 98, unit: "%", trend: "up" },
        { label: "客户投诉率", value: 0.8, target: 1.0, unit: "%", trend: "down" },
        { label: "FAT通过率", value: 94.2, target: 95, unit: "%", trend: "stable" },
        { label: "返工率", value: 3.2, target: 2.0, unit: "%", trend: "down" },
        { label: "交付准时率", value: 91.8, target: 95, unit: "%", trend: "up" },
        { label: "CAPA闭环率", value: 87.5, target: 90, unit: "%", trend: "up" },
      ]);
      const capa = JSON.stringify([
        { id: "CA-001", type: "CA", title: "USC-3000清洗不均匀问题纠正", status: "in_progress", priority: "高", assignee: "孙国祥", dueDate: "2026-02-20" },
        { id: "CA-002", type: "CA", title: "喷嘴堵塞导致清洁度不达标", status: "open", priority: "高", assignee: "洪香龙", dueDate: "2026-02-15" },
        { id: "PA-001", type: "PA", title: "引入清洗液在线浓度监测系统", status: "in_progress", priority: "中", assignee: "孙坚", dueDate: "2026-03-01" },
        { id: "CA-003", type: "CA", title: "FAT测试急停功能延迟", status: "closed", priority: "高", assignee: "李大鹏", dueDate: "2026-01-30" },
        { id: "PA-002", type: "PA", title: "建立供应商来料检验强化流程", status: "open", priority: "中", assignee: "洪小东", dueDate: "2026-03-15" },
        { id: "PA-003", type: "PA", title: "工人操作认证体系升级", status: "in_progress", priority: "低", assignee: "钱佳奇", dueDate: "2026-04-01" },
      ]);
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('quality', 'causes', ${causes}::jsonb),
        ('quality', 'inspection', ${inspection}::jsonb),
        ('quality', 'metrics', ${metrics}::jsonb),
        ('quality', 'capa', ${capa}::jsonb)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "quality dashboard bootstrap failed");
  }
}

// ============================================================================
// Quality Assistant Routes
// ============================================================================

export const qualityAssistantRouter = router({
  /**
   * 缺陷分析 - 根因分析与鱼骨图数据
   */
  analyzeDefect: protectedProcedure
    .input(z.object({
      defectDescription: z.string().min(1),
      equipmentModel: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const analysis = await QualityAssistant.analyzeDefect(
        input.defectDescription,
        input.equipmentModel
      );
      return { success: true, data: analysis };
    }),

  /**
   * 建议检验计划
   */
  suggestInspectionPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stage: z.enum(["incoming", "process", "final", "fat"]),
    }))
    .query(async ({ input }) => {
      const plan = await QualityAssistant.suggestInspectionPlan(
        input.projectId,
        input.stage
      );
      return { success: true, data: plan };
    }),

  /**
   * 生成质量报告
   */
  generateQualityReport: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      period: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const report = await QualityAssistant.generateQualityReport(
        input.projectId,
        input.period
      );
      return { success: true, data: report };
    }),

  /**
   * CAPA追踪
   */
  trackCAPAActions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const tracking = await QualityAssistant.trackCAPAActions(input.projectId);
      return { success: true, data: tracking };
    }),

  /**
   * 过程能力评估 (Cp/Cpk)
   */
  assessProcessCapability: protectedProcedure
    .input(z.object({
      processId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await QualityAssistant.assessProcessCapability(
        input.processId
      );
      return { success: true, data: result };
    }),

  /**
   * 质量助手仪表板数据 (DB-backed)
   */
  getDashboard: protectedProcedure.query(async () => {
    await ensureQualityDashboard();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT category, items FROM ai_assistant_dashboard WHERE assistant_type = 'quality' LIMIT 1000`);
    const data: Record<string, any[]> = { causes: [], inspection: [], metrics: [], capa: [] };
    for (const r of rows as any[]) {
      data[r.category] = r.items;
    }
    return data;
  }),
});

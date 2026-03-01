/**
 * AI Service Assistant tRPC Routes
 * 售后服务助手API路由
 *
 * Data source: trpc.serviceAssistant.getDashboard (DB-backed)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { ServiceAssistant } from "./serviceAssistant";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ─── Dashboard Bootstrap ─────────────────────────────────────────
let _serviceDashReady = false;
async function ensureServiceDashboard() {
  if (_serviceDashReady) return;
  _serviceDashReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'service'`);
    if ((rows[0] as any).cnt === 0) {
      const steps = JSON.stringify([
        { id: 1, question: "设备是否有异常噪音?", result: "是 - 超声波槽体振动异常", confidence: 90 },
        { id: 2, question: "清洗液温度是否正常?", result: "正常 - 55C在范围内", confidence: 95 },
        { id: 3, question: "超声波功率输出是否达标?", result: "偏低 - 实测功率仅为额定的65%", confidence: 88 },
        { id: 4, question: "换能器是否有脱胶现象?", result: "疑似 - 需要现场确认", confidence: 72 },
      ]);
      const actions = JSON.stringify([
        { action: "检查超声波换能器与槽体的粘接状态", priority: "高", estimatedTime: "30分钟" },
        { action: "使用阻抗分析仪测量换能器频率响应", priority: "高", estimatedTime: "1小时" },
        { action: "如确认脱胶，更换换能器并重新粘接", priority: "中", estimatedTime: "4小时" },
        { action: "更换后进行功率输出校验", priority: "中", estimatedTime: "1小时" },
        { action: "运行清洗测试验证效果", priority: "低", estimatedTime: "2小时" },
      ]);
      const maintenance = JSON.stringify([
        { id: "m1", equipment: "USC-3000 #001", task: "清洗液更换", interval: "每月", nextDue: "2026-02-20", status: "即将到期" },
        { id: "m2", equipment: "USC-3000 #001", task: "过滤器清洁", interval: "每周", nextDue: "2026-02-15", status: "正常" },
        { id: "m3", equipment: "USC-3000 #001", task: "换能器功率检测", interval: "每季度", nextDue: "2026-03-01", status: "正常" },
        { id: "m4", equipment: "SPR-5000 #002", task: "喷嘴检查与清洁", interval: "每两周", nextDue: "2026-02-14", status: "今日" },
        { id: "m5", equipment: "SPR-5000 #002", task: "高压泵密封件检查", interval: "每月", nextDue: "2026-02-28", status: "正常" },
        { id: "m6", equipment: "ASC-5000 #003", task: "传动链条润滑", interval: "每周", nextDue: "2026-02-16", status: "正常" },
        { id: "m7", equipment: "ASC-5000 #003", task: "安全联锁功能测试", interval: "每月", nextDue: "2026-02-25", status: "正常" },
        { id: "m8", equipment: "USC-2000 #004", task: "PLC程序备份", interval: "每季度", nextDue: "2026-02-18", status: "即将到期" },
      ]);
      const summaries = JSON.stringify([
        { id: "s1", ticketNo: "SRV-2026-0128", customer: "宝马汽车(沈阳)", equipment: "USC-3000", issue: "清洗效果不稳定，部分工件残留超标", resolution: "更换两个衰减换能器，重新校准超声功率", duration: "6小时" },
        { id: "s2", ticketNo: "SRV-2026-0125", customer: "博世(苏州)", equipment: "SPR-5000", issue: "喷淋压力波动，泵站异响", resolution: "更换高压泵密封件，清洗安全阀", duration: "4小时" },
        { id: "s3", ticketNo: "SRV-2026-0120", customer: "中航工业", equipment: "ASC-5000", issue: "传送带偶发卡顿，PLC报警", resolution: "调整传送带张力，更新PLC逻辑消除误报", duration: "8小时" },
      ]);
      const kb = JSON.stringify([
        { id: "kb1", title: "超声波换能器脱胶故障诊断与处理", category: "故障处理", relevance: 98, views: 342, lastUpdated: "2025-12-15" },
        { id: "kb2", title: "USC-3000功率输出偏低排查流程", category: "故障处理", relevance: 95, views: 256, lastUpdated: "2025-11-20" },
        { id: "kb3", title: "超声波清洗设备日常维护保养指南", category: "维护保养", relevance: 82, views: 518, lastUpdated: "2025-10-01" },
        { id: "kb4", title: "清洗液浓度异常处理方案", category: "工艺优化", relevance: 75, views: 189, lastUpdated: "2025-09-15" },
        { id: "kb5", title: "PLC报警代码速查手册", category: "技术手册", relevance: 68, views: 723, lastUpdated: "2025-08-20" },
        { id: "kb6", title: "高压泵维修保养标准作业", category: "维护保养", relevance: 62, views: 291, lastUpdated: "2025-11-05" },
      ]);
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('service', 'steps', ${steps}::jsonb),
        ('service', 'actions', ${actions}::jsonb),
        ('service', 'maintenance', ${maintenance}::jsonb),
        ('service', 'summaries', ${summaries}::jsonb),
        ('service', 'kb', ${kb}::jsonb)
      `);
    }
  } catch (e: any) {
    console.warn("service dashboard bootstrap:", e.message);
  }
}

// ============================================================================
// Service Assistant Routes
// ============================================================================

export const serviceAssistantRouter = router({
  /**
   * 故障诊断
   */
  diagnoseFault: protectedProcedure
    .input(z.object({
      symptoms: z.array(z.string()).min(1),
      equipmentModel: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const diagnosis = await ServiceAssistant.diagnoseFault(
        input.symptoms,
        input.equipmentModel
      );
      return { success: true, data: diagnosis };
    }),

  /**
   * 建议维护计划
   */
  suggestMaintenancePlan: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
    }))
    .query(async ({ input }) => {
      const plan = await ServiceAssistant.suggestMaintenancePlan(
        input.equipmentId
      );
      return { success: true, data: plan };
    }),

  /**
   * 生成服务报告
   */
  generateServiceReport: protectedProcedure
    .input(z.object({
      serviceTicketId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const report = await ServiceAssistant.generateServiceReport(
        input.serviceTicketId
      );
      return { success: true, data: report };
    }),

  /**
   * 匹配知识库文章
   */
  matchKBArticles: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const results = await ServiceAssistant.matchKBArticles(input.query);
      return { success: true, data: results };
    }),

  /**
   * 估算维修时间
   */
  estimateRepairTime: protectedProcedure
    .input(z.object({
      faultType: z.string().min(1),
      equipmentModel: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const estimate = await ServiceAssistant.estimateRepairTime(
        input.faultType,
        input.equipmentModel
      );
      return { success: true, data: estimate };
    }),

  /**
   * 服务助手仪表板数据 (DB-backed)
   */
  getDashboard: protectedProcedure.query(async () => {
    await ensureServiceDashboard();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT category, items FROM ai_assistant_dashboard WHERE assistant_type = 'service'`);
    const data: Record<string, any[]> = { steps: [], actions: [], maintenance: [], summaries: [], kb: [] };
    for (const r of rows as any[]) {
      data[r.category] = r.items;
    }
    return data;
  }),
});

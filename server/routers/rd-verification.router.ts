/**
 * R&D Verification Router
 * 研发验证阶段门管理 (StageOverview, GateManagement, ReviewManagement, PullSignals)
 *
 * Data source: ai_assistant_dashboard table (DB-backed)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("rd-verification");

// ─── Bootstrap ───────────────────────────────────────────────────
let _rdVerReady = false;
async function ensureRdVerData() {
  if (_rdVerReady) return;
  _rdVerReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'rd_verification'`);
    if ((rows[0] as any).cnt === 0) {
      const projects = JSON.stringify([
        { id: 1, name: "汽车动力总成超声波清洗线", code: "GRT-2026-001", currentStage: "M4", completedStages: ["M0","M1","M2","M3"], customer: "上汽集团", risk: "low" },
        { id: 2, name: "半导体晶圆精密清洗设备", code: "GRT-2026-002", currentStage: "M7", completedStages: ["M0","M1","M2","M3","M4","M5","M6"], customer: "台积电", risk: "medium" },
        { id: 3, name: "医疗器械超声波清洗系统", code: "GRT-2026-003", currentStage: "M2", completedStages: ["M0","M1"], customer: "美敦力", risk: "low" },
        { id: 4, name: "航空发动机叶片清洗线", code: "GRT-2026-004", currentStage: "M10", completedStages: ["M0","M1","M2","M3","M4","M5","M6","M7","M8","M9"], customer: "中航工业", risk: "high" },
        { id: 5, name: "光伏硅片清洗设备", code: "GRT-2026-005", currentStage: "M5", completedStages: ["M0","M1","M2","M3","M4"], customer: "隆基绿能", risk: "low" },
      ]);
      const checklists = JSON.stringify({
        M3: [
          { id: 1, checkItem: "商业价值评估完成", status: "pass", isMandatory: true },
          { id: 2, checkItem: "项目范围定义确认", status: "pass", isMandatory: true },
          { id: 3, checkItem: "资源配置计划审批", status: "pending", isMandatory: false },
          { id: 4, checkItem: "RACI矩阵确认", status: "pending", isMandatory: false },
          { id: 5, checkItem: "风险评估报告", status: "fail", isMandatory: true },
        ],
        M4: [
          { id: 6, checkItem: "机械方案评审通过", status: "pass", isMandatory: true },
          { id: 7, checkItem: "电气方案评审通过", status: "pass", isMandatory: true },
          { id: 8, checkItem: "质量方案确认", status: "pending", isMandatory: true },
          { id: 9, checkItem: "采购BOM初版确认", status: "pending", isMandatory: false },
        ],
        M5: [
          { id: 10, checkItem: "3D模型最终版发布", status: "pass", isMandatory: true, autoVerifySource: "PLM_Model_Status" },
          { id: 11, checkItem: "加工图纸完成", status: "pass", isMandatory: true, autoVerifySource: "PLM_Drawing_Status" },
          { id: 12, checkItem: "PLC程序设计完成", status: "pending", isMandatory: true },
          { id: 13, checkItem: "BOM与3D模型一致性", status: "fail", isMandatory: true, autoVerifySource: "ERP_BOM_Consistency" },
          { id: 14, checkItem: "结构仿真通过", status: "pass", isMandatory: false },
        ],
      });
      const reviews = JSON.stringify([
        { id: 1, projectName: "汽车动力总成超声波清洗线", projectCode: "GRT-2026-001", gatePhase: "M3", gateName: "立项评审", status: "approved", reviewer: "张总", reviewNotes: "商业价值明确，资源充足，批准立项", createdAt: "2026-01-15" },
        { id: 2, projectName: "半导体晶圆精密清洗设备", projectCode: "GRT-2026-002", gatePhase: "M5", gateName: "详细设计评审", status: "conditional", reviewer: "李工", reviewNotes: "BOM一致性需修正后重新提交", createdAt: "2026-02-01" },
        { id: 3, projectName: "医疗器械超声波清洗系统", projectCode: "GRT-2026-003", gatePhase: "M2", gateName: "方案设计评审", status: "in_review", reviewer: "王经理", createdAt: "2026-02-10" },
        { id: 4, projectName: "航空发动机叶片清洗线", projectCode: "GRT-2026-004", gatePhase: "M8", gateName: "FAT验收", status: "pending", reviewer: "赵工", createdAt: "2026-02-12" },
      ]);
      const signals = JSON.stringify([
        { id: 1, upstreamGate: "M6", triggerEvent: "上汽JIS订单到达", targetAasId: "AAS-GRT501-CL01", status: "triggered", actionPayload: { action: "start_production", line: "A3" } },
        { id: 2, upstreamGate: "M7", triggerEvent: "装配完成信号", targetAasId: "AAS-GRT501-TST01", status: "pending", actionPayload: { action: "start_test", protocol: "FAT" } },
        { id: 3, upstreamGate: "M9", triggerEvent: "发货确认", targetAasId: "AAS-GRT502-INS01", status: "confirmed", actionPayload: { action: "prepare_installation", site: "台积电南京" } },
        { id: 4, upstreamGate: "M4", triggerEvent: "方案冻结完成", targetAasId: "AAS-GRT503-PRO01", status: "pending", actionPayload: { action: "start_procurement", priority: "high" } },
      ]);
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('rd_verification', 'projects', ${projects}::jsonb),
        ('rd_verification', 'checklists', ${checklists}::jsonb),
        ('rd_verification', 'reviews', ${reviews}::jsonb),
        ('rd_verification', 'signals', ${signals}::jsonb)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "rd-verification bootstrap failed");
  }
}

// ============================================================================
// R&D Verification Router
// ============================================================================

export const rdVerificationRouter = router({
  getProjects: protectedProcedure.query(async () => {
    await ensureRdVerData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'rd_verification' AND category = 'projects'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getChecklists: protectedProcedure.query(async () => {
    await ensureRdVerData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'rd_verification' AND category = 'checklists'`);
    return (rows[0] as any)?.items ?? {};
  }),

  getReviews: protectedProcedure.query(async () => {
    await ensureRdVerData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'rd_verification' AND category = 'reviews'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getSignals: protectedProcedure.query(async () => {
    await ensureRdVerData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'rd_verification' AND category = 'signals'`);
    return (rows[0] as any)?.items ?? [];
  }),
});

/**
 * Operations Dashboard Router
 * Consolidates seed data for: Recruitment, GanttChart, MaterialTracking,
 * ProcessManagement, TeamCapability, CrossBorder demo orders
 *
 * Data source: ai_assistant_dashboard table (DB-backed)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ─── Bootstrap ───────────────────────────────────────────────────
let _opsDashReady = false;
async function ensureOpsDashData() {
  if (_opsDashReady) return;
  _opsDashReady = true;
  try {
    const db = await requireDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS ai_assistant_dashboard (
      id SERIAL PRIMARY KEY,
      assistant_type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      UNIQUE(assistant_type, category)
    )`);
    const { rows } = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash'`);
    if ((rows[0] as any).cnt === 0) {
      const positions = JSON.stringify([
        { id: 1, title: "高级机械工程师", dept: "研发设计部", bu: "BU3", applicants: 12, status: "招聘中", urgency: "紧急", salary: "20-35K" },
        { id: 2, title: "PLC程序员", dept: "研发设计部", bu: "BU1", applicants: 8, status: "招聘中", urgency: "高", salary: "18-28K" },
        { id: 3, title: "销售经理", dept: "销售部", bu: "BU4", applicants: 15, status: "面试中", urgency: "正常", salary: "25-40K" },
        { id: 4, title: "现场服务工程师", dept: "技术服务部", bu: "通用", applicants: 6, status: "已关闭", urgency: "正常", salary: "15-22K" },
      ]);
      const ganttTasks = JSON.stringify([
        { id: 1, name: "需求分析", project: "缸体清洗线", start: 1, duration: 3, progress: 100, color: "bg-green-500" },
        { id: 2, name: "方案设计", project: "缸体清洗线", start: 3, duration: 4, progress: 80, color: "bg-blue-500" },
        { id: 3, name: "机械设计", project: "缸体清洗线", start: 5, duration: 6, progress: 45, color: "bg-primary" },
        { id: 4, name: "电气设计", project: "缸体清洗线", start: 6, duration: 5, progress: 30, color: "bg-cyan-500" },
        { id: 5, name: "采购", project: "缸体清洗线", start: 8, duration: 4, progress: 10, color: "bg-amber-500" },
        { id: 6, name: "组装", project: "缸体清洗线", start: 11, duration: 5, progress: 0, color: "bg-purple-500" },
        { id: 7, name: "调试", project: "缸体清洗线", start: 15, duration: 3, progress: 0, color: "bg-rose-500" },
        { id: 8, name: "发货安装", project: "缸体清洗线", start: 17, duration: 3, progress: 0, color: "bg-indigo-500" },
      ]);
      const materials = JSON.stringify([
        { id: "MAT-001", name: "304不锈钢板 3mm", batch: "B2026-001", location: "A区-01-03", qty: 120, unit: "张", status: "在库", project: "缸体清洗线" },
        { id: "MAT-002", name: "西门子S7-1500 CPU", batch: "B2026-015", location: "B区-02-01", qty: 5, unit: "个", status: "已领料", project: "变速箱清洗" },
        { id: "MAT-003", name: "耐酸泵 50L/min", batch: "B2026-008", location: "C区-01-02", qty: 8, unit: "台", status: "在途", project: "晶圆清洗" },
        { id: "MAT-004", name: "PTFE密封圈 DN80", batch: "B2026-022", location: "A区-03-05", qty: 3, unit: "包", status: "低库存", project: "通用" },
      ]);
      const processes = JSON.stringify([
        { id: "WP-001", name: "钢结构焊接", category: "结构", avgTime: "4.5h", workers: 3, status: "进行中", quality: 98 },
        { id: "WP-002", name: "管路安装", category: "管路", avgTime: "3.0h", workers: 2, status: "进行中", quality: 97 },
        { id: "WP-003", name: "电气布线", category: "电气", avgTime: "6.0h", workers: 2, status: "待开始", quality: 99 },
        { id: "WP-004", name: "喷淋系统安装", category: "核心", avgTime: "5.0h", workers: 4, status: "已完成", quality: 100 },
        { id: "WP-005", name: "整机调试", category: "调试", avgTime: "8.0h", workers: 3, status: "待开始", quality: 0 },
      ]);
      const teamMembers = JSON.stringify([
        { id: "user1", name: "张工程师", role: "高级服务工程师", capabilities: { T: 4, S: 3, D: 4, C: 3, K: 2, L: 2 }, totalPoints: 850 },
        { id: "user2", name: "李技术员", role: "技术支持工程师", capabilities: { T: 3, S: 4, D: 3, C: 4, K: 3, L: 2 }, totalPoints: 720 },
        { id: "user3", name: "王专家", role: "技术专家", capabilities: { T: 5, S: 4, D: 3, C: 3, K: 4, L: 3 }, totalPoints: 1200 },
        { id: "user4", name: "赵工程师", role: "现场服务工程师", capabilities: { T: 2, S: 2, D: 3, C: 3, K: 1, L: 1 }, totalPoints: 320 },
        { id: "user5", name: "陈主管", role: "服务主管", capabilities: { T: 3, S: 3, D: 4, C: 4, K: 3, L: 4 }, totalPoints: 980 },
      ]);
      const usOrders = JSON.stringify([
        { order_id: "US-2026-0042", customer_name: "John Doe", customer_email: "john.doe@acme-corp.com", customer_phone: "+1-555-0142", unit_price: 2500, total_price: 5000, sku: "GRT-CLN-R200", quantity: 2, specs: "Robotic Cleaning System R200, 220V/60Hz, EN ISO 13849", shipping_address: "1234 Innovation Dr, San Jose, CA 95134", payment_method: "Wire Transfer — Chase Bank ****4821" },
        { order_id: "US-2026-0043", customer_name: "Sarah Miller", customer_email: "s.miller@globaltech.io", customer_phone: "+1-555-0198", unit_price: 8200, total_price: 24600, sku: "GRT-WLD-X500", quantity: 3, specs: "Welding Cell X500, 480V/3Ph, AWS D1.1 certified", shipping_address: "5678 Tech Park Blvd, Austin, TX 78759", payment_method: "L/C — Bank of America ****7733" },
        { order_id: "US-2026-0044", customer_name: "Michael Chen", customer_email: "m.chen@nextgen-mfg.com", customer_phone: "+1-555-0276", unit_price: 15000, total_price: 15000, sku: "GRT-ASM-A800", quantity: 1, specs: "Assembly Line A800, 380V/50Hz, IATF 16949 compliant", shipping_address: "9012 Industrial Way, Detroit, MI 48201", payment_method: "Net 60 — PO#GTX-20260044" },
      ]);
      await db.execute(sql`INSERT INTO ai_assistant_dashboard (assistant_type, category, items) VALUES
        ('operations_dash', 'positions', ${positions}::jsonb),
        ('operations_dash', 'gantt_tasks', ${ganttTasks}::jsonb),
        ('operations_dash', 'materials', ${materials}::jsonb),
        ('operations_dash', 'processes', ${processes}::jsonb),
        ('operations_dash', 'team_members', ${teamMembers}::jsonb),
        ('operations_dash', 'us_orders', ${usOrders}::jsonb)
      `);
    }
  } catch (e: any) {
    console.warn("operations-dashboard bootstrap:", e.message);
  }
}

// ============================================================================
// Operations Dashboard Router
// ============================================================================

export const operationsDashboardRouter = router({
  getPositions: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'positions'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getGanttTasks: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'gantt_tasks'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getMaterials: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'materials'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getProcesses: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'processes'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getTeamMembers: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'team_members'`);
    return (rows[0] as any)?.items ?? [];
  }),

  getUSOrders: protectedProcedure.query(async () => {
    await ensureOpsDashData();
    const db = await requireDb();
    const { rows } = await db.execute(sql`SELECT items FROM ai_assistant_dashboard WHERE assistant_type = 'operations_dash' AND category = 'us_orders'`);
    return (rows[0] as any)?.items ?? [];
  }),
});

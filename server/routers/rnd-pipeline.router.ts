/**
 * R&D Pipeline Router — Quotation / Requirements / Solution Design
 *
 * Covers M0-M2 pre-project stages:
 *   quotation.*   — Quote CRUD (draft→quoted→approving→won/lost)
 *   requirement.*  — Customer requirement tracking (draft→reviewing→approved→in_progress→completed)
 *   solution.*     — Solution design tracking (设计中→已评审→修改中)
 *
 * Each sub-router auto-creates its table + seeds demo data.
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { sql, SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("rnd-pipeline");

// ---------------------------------------------------------------------------
// Table bootstrap helpers
// ---------------------------------------------------------------------------

const bootstrapped = { quotation: false, requirement: false, solution: false };

async function ensureQuotationTable() {
  if (bootstrapped.quotation) return;
  bootstrapped.quotation = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_quotations (
        id SERIAL PRIMARY KEY,
        quote_number VARCHAR(50) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        project VARCHAR(500) NOT NULL,
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        amount VARCHAR(50) NOT NULL DEFAULT '0',
        currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        version VARCHAR(10) NOT NULL DEFAULT 'V1',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // Seed if empty
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_quotations`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_quotations (quote_number, customer, project, bu_code, amount, currency, status, version, created_at) VALUES
          ('QT-2026-001', '上海大众', '缸体清洗线升级', 'BU3', '2850000', 'CNY', 'quoted', 'V2', '2026-02-08'),
          ('QT-2026-002', '宝马慕尼黑', '变速箱清洗新线', 'BU1', '1200000', 'EUR', 'approving', 'V1', '2026-02-10'),
          ('QT-2026-003', '英飞凌', '晶圆清洗扩容', 'BU4', '4500000', 'CNY', 'won', 'V3', '2026-01-25'),
          ('QT-2026-004', '潍柴动力', '柴油机零部件清洗', 'BU2', '1680000', 'CNY', 'draft', 'V1', '2026-02-11')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "quotation table bootstrap failed");
  }
}

async function ensureRequirementTable() {
  if (bootstrapped.requirement) return;
  bootstrapped.requirement = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_requirements (
        id SERIAL PRIMARY KEY,
        req_number VARCHAR(50) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        title VARCHAR(500) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        assignee VARCHAR(100) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_requirements`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_requirements (req_number, customer, title, status, priority, bu_code, assignee, created_at) VALUES
          ('REQ-2026-001', '上海大众', '缸体清洗线需求', 'approved', 'high', 'BU3', '洪香龙', '2026-02-05'),
          ('REQ-2026-002', '宝马慕尼黑', '变速箱壳体清洗方案', 'reviewing', 'urgent', 'BU1', '李大鹏', '2026-02-08'),
          ('REQ-2026-003', '英飞凌', '晶圆清洗设备需求', 'in_progress', 'high', 'BU4', '孙国祥', '2026-02-01'),
          ('REQ-2026-004', '潍柴动力', '柴油机零部件清洗系统', 'draft', 'medium', 'BU2', '洪小东', '2026-02-10')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "requirement table bootstrap failed");
  }
}

async function ensureSolutionTable() {
  if (bootstrapped.solution) return;
  bootstrapped.solution = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_solutions (
        id SERIAL PRIMARY KEY,
        sol_number VARCHAR(50) NOT NULL,
        project VARCHAR(500) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT '设计中',
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        version VARCHAR(10) NOT NULL DEFAULT 'V1.0',
        engineer VARCHAR(100) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_solutions`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_solutions (sol_number, project, customer, status, bu_code, version, engineer, created_at) VALUES
          ('SOL-001', '缸体清洗线', '上海大众', '设计中', 'BU3', 'V2.1', '洪香龙', '2026-02-06'),
          ('SOL-002', '变速箱清洗方案', '宝马慕尼黑', '已评审', 'BU1', 'V1.0', '李大鹏', '2026-02-09'),
          ('SOL-003', '晶圆清洗设备', '英飞凌', '修改中', 'BU4', 'V3.2', '孙国祥', '2026-02-02')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "solution table bootstrap failed");
  }
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: string, currency: string): string {
  const num = Number(amount);
  if (isNaN(num)) return amount;
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "¥";
  if (num >= 1000000) return `${symbol}${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${symbol}${(num / 1000).toFixed(0)}K`;
  return `${symbol}${num}`;
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const quotationRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional(), bu: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureQuotationTable();
      const db = await requireDb();
      const search = input?.search;
      const bu = input?.bu;

      let result;
      if (search && bu) {
        const q = `%${search}%`;
        result = await db.execute(sql`
          SELECT id, quote_number AS "quoteNumber", customer, project, bu_code AS "bu",
                 amount, currency, status, version, created_at AS "date"
          FROM rnd_quotations
          WHERE bu_code = ${bu} AND (customer ILIKE ${q} OR project ILIKE ${q})
          ORDER BY created_at DESC
        `);
      } else if (search) {
        const q = `%${search}%`;
        result = await db.execute(sql`
          SELECT id, quote_number AS "quoteNumber", customer, project, bu_code AS "bu",
                 amount, currency, status, version, created_at AS "date"
          FROM rnd_quotations
          WHERE customer ILIKE ${q} OR project ILIKE ${q}
          ORDER BY created_at DESC
        `);
      } else if (bu) {
        result = await db.execute(sql`
          SELECT id, quote_number AS "quoteNumber", customer, project, bu_code AS "bu",
                 amount, currency, status, version, created_at AS "date"
          FROM rnd_quotations
          WHERE bu_code = ${bu}
          ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, quote_number AS "quoteNumber", customer, project, bu_code AS "bu",
                 amount, currency, status, version, created_at AS "date"
          FROM rnd_quotations
          ORDER BY created_at DESC
        `);
      }

      const items = ((result.rows as any[]) || []).map((r: any) => ({
        ...r,
        formattedAmount: formatAmount(r.amount, r.currency),
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      }));

      // Aggregate stats
      const total = items.length;
      const totalAmount = items.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      const won = items.filter((r: any) => r.status === "won").length;
      const pending = items.filter((r: any) => r.status === "approving").length;
      const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

      return {
        items,
        stats: {
          total,
          totalAmount: formatAmount(String(totalAmount), "CNY"),
          winRate: `${winRate}%`,
          pendingApproval: pending,
        },
      };
    }),

  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      customer: z.string().min(1),
      project: z.string().min(1),
      bu: z.string().optional(),
      amount: z.string().optional(),
      currency: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureQuotationTable();
      const db = await requireDb();
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_quotations (quote_number, customer, project, bu_code, amount, currency, status, version)
        VALUES (${quoteNumber}, ${input.customer}, ${input.project}, ${input.bu ?? "BU3"}, ${input.amount ?? "0"}, ${input.currency ?? "CNY"}, 'draft', 'V1')
        RETURNING id, quote_number AS "quoteNumber"
      `);
      return (result.rows as any[])[0];
    }),
});

const requirementRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional(), bu: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureRequirementTable();
      const db = await requireDb();
      const search = input?.search;
      const bu = input?.bu;
      const status = input?.status;

      // Build dynamic query
      const conditions: SQL[] = [];
      if (bu) conditions.push(sql`bu_code = ${bu}`);
      if (status && status !== "all") conditions.push(sql`status = ${status}`);
      if (search) conditions.push(sql`(title ILIKE ${'%' + search + '%'} OR customer ILIKE ${'%' + search + '%'})`);

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      const result = await db.execute(sql`
        SELECT id, req_number AS "reqNumber", customer, title, status, priority,
               bu_code AS "bu", assignee, created_at AS "date"
        FROM rnd_requirements
        ${whereClause}
        ORDER BY created_at DESC
      `);

      const items = ((result.rows as any[]) || []).map((r: any) => ({
        ...r,
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      }));

      return { items };
    }),

  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      title: z.string().min(1),
      customer: z.string().min(1),
      assignee: z.string().min(1),
      priority: z.string().optional(),
      bu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureRequirementTable();
      const db = await requireDb();
      const reqNumber = `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_requirements (req_number, customer, title, status, priority, bu_code, assignee)
        VALUES (${reqNumber}, ${input.customer}, ${input.title}, 'draft', ${input.priority ?? "medium"}, ${input.bu ?? "BU3"}, ${input.assignee})
        RETURNING id, req_number AS "reqNumber"
      `);
      return (result.rows as any[])[0];
    }),

  updateStatus: requirePermission('rnd:requirements:manage')
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(async ({ input }) => {
      await ensureRequirementTable();
      const db = await requireDb();
      await db.execute(sql`UPDATE rnd_requirements SET status = ${input.status} WHERE id = ${input.id}`);
      return { success: true };
    }),
});

const solutionRouter = router({
  list: protectedProcedure
    .input(z.object({ bu: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureSolutionTable();
      const db = await requireDb();
      const bu = input?.bu;

      let result;
      if (bu) {
        result = await db.execute(sql`
          SELECT id, sol_number AS "solNumber", project, customer, status,
                 bu_code AS "bu", version, engineer, created_at AS "date"
          FROM rnd_solutions WHERE bu_code = ${bu} ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, sol_number AS "solNumber", project, customer, status,
                 bu_code AS "bu", version, engineer, created_at AS "date"
          FROM rnd_solutions ORDER BY created_at DESC
        `);
      }

      return {
        items: ((result.rows as any[]) || []).map((r: any) => ({
          ...r,
          date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
        })),
      };
    }),

  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      project: z.string().min(1),
      customer: z.string().min(1),
      engineer: z.string().min(1),
      bu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureSolutionTable();
      const db = await requireDb();
      const solNumber = `SOL-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_solutions (sol_number, project, customer, status, bu_code, version, engineer)
        VALUES (${solNumber}, ${input.project}, ${input.customer}, '设计中', ${input.bu ?? "BU3"}, 'V1.0', ${input.engineer})
        RETURNING id, sol_number AS "solNumber"
      `);
      return (result.rows as any[])[0];
    }),
});

// ---------------------------------------------------------------------------
// Design Task (mechanical + electrical share schema)
// ---------------------------------------------------------------------------

// Mechanical design types (GRT cleaning equipment)
const MECH_DESIGN_TYPES = ["总装图", "零件图", "结构设计", "工装夹具", "管路布局", "钣金件"] as const;
// Electrical design types
const ELEC_DESIGN_TYPES = ["PLC程序", "电气原理图", "HMI界面", "IO分配", "电气布线", "控制柜设计"] as const;

// Mechanical status flow: 设计中 → 自检完成 → 审核中 → 已审核 → 变更中
const MECH_STATUSES = ["设计中", "自检完成", "审核中", "已审核", "变更中"] as const;
// Electrical status flow: 编程中 → 仿真测试 → 审核中 → 已完成 → 变更中
const ELEC_STATUSES = ["编程中", "仿真测试", "审核中", "已完成", "变更中"] as const;

async function ensureDesignTaskTable() {
  if ((ensureDesignTaskTable as any)._done) return;
  (ensureDesignTaskTable as any)._done = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_design_tasks (
        id SERIAL PRIMARY KEY,
        task_number VARCHAR(50) NOT NULL,
        name VARCHAR(500) NOT NULL,
        project VARCHAR(500) NOT NULL,
        discipline VARCHAR(20) NOT NULL DEFAULT 'mechanical',
        design_type VARCHAR(50) NOT NULL DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT '设计中',
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        revision VARCHAR(10) NOT NULL DEFAULT 'R1',
        engineer VARCHAR(100) NOT NULL DEFAULT '',
        reviewer VARCHAR(100) NOT NULL DEFAULT '',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        progress INTEGER NOT NULL DEFAULT 0,
        description TEXT DEFAULT '',
        due_date DATE,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        review_notes TEXT DEFAULT '',
        checklist JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // Add columns if table existed from before (idempotent ALTER)
    const addCol = async (col: string, type: string, def: string) => {
      try { await db.execute(sql`ALTER TABLE rnd_design_tasks ADD COLUMN IF NOT EXISTS ${sql.raw(col)} ${sql.raw(type)} ${sql.raw(def)}`); } catch {}
    };
    await addCol("design_type", "VARCHAR(50)", "NOT NULL DEFAULT ''");
    await addCol("reviewer", "VARCHAR(100)", "NOT NULL DEFAULT ''");
    await addCol("priority", "VARCHAR(20)", "NOT NULL DEFAULT 'medium'");
    await addCol("description", "TEXT", "DEFAULT ''");
    await addCol("due_date", "DATE", "");
    await addCol("started_at", "TIMESTAMP", "");
    await addCol("completed_at", "TIMESTAMP", "");
    await addCol("review_notes", "TEXT", "DEFAULT ''");
    await addCol("checklist", "JSONB", "DEFAULT '[]'");
    await addCol("attachments", "JSONB", "DEFAULT '[]'");
    await addCol("notes", "TEXT", "DEFAULT ''");
    await addCol("updated_at", "TIMESTAMP", "DEFAULT NOW() NOT NULL");

    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_design_tasks`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_design_tasks (task_number, name, project, discipline, design_type, status, bu_code, revision, engineer, reviewer, priority, progress, description, due_date, created_at) VALUES
          ('MD-001', '清洗槽体结构设计', '缸体清洗线', 'mechanical', '结构设计', '设计中', 'BU3', 'R3', '洪香龙', '杨勇', 'high', 75, '主清洗槽体SUS316L材质，含溢流槽、加热系统安装座、超声换能器安装孔位', '2026-03-15', '2026-02-06'),
          ('MD-002', '传送机构总装图', '变速箱清洗', 'mechanical', '总装图', '已审核', 'BU1', 'R1', '李大鹏', '杨勇', 'medium', 100, '变速箱壳体清洗线传送机构总装图，含链式输送、升降机构、定位夹具', '2026-02-28', '2026-02-08'),
          ('MD-003', '干燥室结构设计', '晶圆清洗', 'mechanical', '结构设计', '审核中', 'BU4', 'R2', '孙国祥', '翁小飞', 'urgent', 90, '洁净干燥室设计，含热风循环系统、HEPA过滤、温湿度控制', '2026-03-10', '2026-02-03'),
          ('MD-004', '框架结构优化', '柴油机清洗', 'mechanical', '结构设计', '设计中', 'BU2', 'R1', '洪小东', '', 'medium', 40, '设备主框架Q235B焊接结构优化，减重15%目标', '2026-03-20', '2026-02-10'),
          ('MD-005', '喷淋管路总装', '缸体清洗线', 'mechanical', '管路布局', '自检完成', 'BU3', 'R1', '洪香龙', '杨勇', 'high', 85, '高压喷淋管路布局设计，含喷嘴选型、管径计算、压力损失分析', '2026-03-12', '2026-02-12'),
          ('MD-006', '工装夹具设计', '变速箱清洗', 'mechanical', '工装夹具', '设计中', 'BU1', 'R1', '李大鹏', '', 'medium', 30, '变速箱壳体定位夹具，兼容3种型号，快换设计', '2026-03-25', '2026-02-15'),
          ('ED-001', '主控PLC程序设计', '缸体清洗线', 'electrical', 'PLC程序', '编程中', 'BU3', 'R1', '孙坚', '沈豪', 'high', 60, 'S7-1500主站程序，含清洗工艺控制、液位联锁、温度PID、报警处理', '2026-03-18', '2026-02-07'),
          ('ED-002', 'HMI界面开发', '变速箱清洗', 'electrical', 'HMI界面', '已完成', 'BU1', 'R1', '钱绍辉', '沈豪', 'medium', 100, 'WinCC Comfort V18界面，含工艺画面、参数设置、报警记录、趋势曲线', '2026-02-28', '2026-02-09'),
          ('ED-003', '电气原理图设计', '晶圆清洗', 'electrical', '电气原理图', '审核中', 'BU4', 'R1', '梅奥杰', '沈豪', 'urgent', 85, 'EPLAN P8电气原理图，含主回路、控制回路、安全回路设计', '2026-03-08', '2026-02-04'),
          ('ED-004', 'IO分配表', '柴油机清洗', 'electrical', 'IO分配', '编程中', 'BU2', 'R1', '马柯', '', 'low', 30, 'PLC IO分配表编制，DI/DO/AI/AO点位分配，含备用点预留', '2026-03-22', '2026-02-11'),
          ('ED-005', '控制柜布局设计', '缸体清洗线', 'electrical', '控制柜设计', '仿真测试', 'BU3', 'R1', '孙坚', '沈豪', 'high', 70, '主控制柜+远程IO柜布局，含散热计算、EMC设计', '2026-03-16', '2026-02-13'),
          ('ED-006', '电气布线图', '变速箱清洗', 'electrical', '电气布线', '编程中', 'BU1', 'R1', '钱绍辉', '', 'medium', 45, '现场电气布线路径规划，桥架布局、线缆选型', '2026-03-28', '2026-02-16')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "design-task table bootstrap failed");
  }
}

// Select columns shared by all design-task queries
const DESIGN_TASK_COLS = sql`
  id, task_number AS "taskNumber", name, project, discipline, design_type AS "designType",
  status, bu_code AS "bu", revision AS "rev", engineer, reviewer, priority,
  progress, description, due_date AS "dueDate", started_at AS "startedAt",
  completed_at AS "completedAt", review_notes AS "reviewNotes",
  checklist, attachments, notes, created_at AS "createdAt", updated_at AS "updatedAt"
`;

function makeDesignRouter(discipline: "mechanical" | "electrical") {
  const designTypes = discipline === "mechanical" ? MECH_DESIGN_TYPES : ELEC_DESIGN_TYPES;
  const defaultStatus = discipline === "mechanical" ? "设计中" : "编程中";
  const prefix = discipline === "mechanical" ? "MD" : "ED";

  return router({
    // List with filtering
    list: protectedProcedure
      .input(z.object({
        bu: z.string().optional(),
        status: z.string().optional(),
        designType: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const conditions: SQL[] = [sql`discipline = ${discipline}`];
        if (input?.bu) conditions.push(sql`bu_code = ${input.bu}`);
        if (input?.status && input.status !== "all") conditions.push(sql`status = ${input.status}`);
        if (input?.designType && input.designType !== "all") conditions.push(sql`design_type = ${input.designType}`);
        if (input?.priority && input.priority !== "all") conditions.push(sql`priority = ${input.priority}`);
        if (input?.search) {
          const q = `%${input.search}%`;
          conditions.push(sql`(name ILIKE ${q} OR project ILIKE ${q} OR engineer ILIKE ${q} OR task_number ILIKE ${q})`);
        }
        const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;
        const result = await db.execute(sql`SELECT ${DESIGN_TASK_COLS} FROM rnd_design_tasks ${where} ORDER BY created_at DESC LIMIT 500`);
        const items = ((result.rows as any[]) || []).map((r: any) => ({
          ...r,
          dueDate: r.dueDate ? new Date(r.dueDate).toISOString().slice(0, 10) : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
          checklist: typeof r.checklist === "string" ? JSON.parse(r.checklist) : (r.checklist || []),
          attachments: typeof r.attachments === "string" ? JSON.parse(r.attachments) : (r.attachments || []),
        }));
        return { items, designTypes: [...designTypes] };
      }),

    // Get by ID (detail)
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const result = await db.execute(sql`SELECT ${DESIGN_TASK_COLS} FROM rnd_design_tasks WHERE id = ${input.id} AND discipline = ${discipline} LIMIT 1`);
        const row = (result.rows as any[])[0];
        if (!row) return null;
        return {
          ...row,
          dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : null,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : "",
          checklist: typeof row.checklist === "string" ? JSON.parse(row.checklist) : (row.checklist || []),
          attachments: typeof row.attachments === "string" ? JSON.parse(row.attachments) : (row.attachments || []),
        };
      }),

    // Create
    create: requirePermission('rnd:requirements:manage')
      .input(z.object({
        name: z.string().min(1),
        project: z.string().min(1),
        engineer: z.string().min(1),
        designType: z.string().optional(),
        priority: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        reviewer: z.string().optional(),
        bu: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const taskNumber = `${prefix}-${String(Date.now()).slice(-3)}`;
        const result = await db.execute(sql`
          INSERT INTO rnd_design_tasks (task_number, name, project, discipline, design_type, status, bu_code, revision, engineer, reviewer, priority, progress, description, due_date, started_at)
          VALUES (${taskNumber}, ${input.name}, ${input.project}, ${discipline}, ${input.designType ?? ""}, ${defaultStatus}, ${input.bu ?? "BU3"}, 'R1', ${input.engineer}, ${input.reviewer ?? ""}, ${input.priority ?? "medium"}, 0, ${input.description ?? ""}, ${input.dueDate ? sql`${input.dueDate}::date` : sql`NULL`}, NOW())
          RETURNING id, task_number AS "taskNumber"
        `);
        return (result.rows as any[])[0];
      }),

    // Update task details
    update: requirePermission('rnd:requirements:manage')
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        engineer: z.string().optional(),
        reviewer: z.string().optional(),
        priority: z.string().optional(),
        designType: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        notes: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const setParts: SQL[] = [sql`updated_at = NOW()`];
        if (input.name !== undefined) setParts.push(sql`name = ${input.name}`);
        if (input.engineer !== undefined) setParts.push(sql`engineer = ${input.engineer}`);
        if (input.reviewer !== undefined) setParts.push(sql`reviewer = ${input.reviewer}`);
        if (input.priority !== undefined) setParts.push(sql`priority = ${input.priority}`);
        if (input.designType !== undefined) setParts.push(sql`design_type = ${input.designType}`);
        if (input.description !== undefined) setParts.push(sql`description = ${input.description}`);
        if (input.notes !== undefined) setParts.push(sql`notes = ${input.notes}`);
        if (input.progress !== undefined) setParts.push(sql`progress = ${input.progress}`);
        if (input.dueDate !== undefined) {
          setParts.push(input.dueDate ? sql`due_date = ${input.dueDate}::date` : sql`due_date = NULL`);
        }
        await db.execute(sql`UPDATE rnd_design_tasks SET ${sql.join(setParts, sql`, `)} WHERE id = ${input.id} AND discipline = ${discipline}`);
        return { success: true };
      }),

    // Update status (workflow transition)
    updateStatus: requirePermission('rnd:requirements:manage')
      .input(z.object({
        id: z.number(),
        status: z.enum(discipline === "mechanical" ? MECH_STATUSES : ELEC_STATUSES),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const setParts: SQL[] = [sql`status = ${input.status}`, sql`updated_at = NOW()`];
        if (input.reviewNotes !== undefined) setParts.push(sql`review_notes = ${input.reviewNotes}`);
        // Auto-set completed_at when reaching terminal status
        const completedStatuses = discipline === "mechanical" ? ["已审核"] : ["已完成"];
        if (completedStatuses.includes(input.status)) {
          setParts.push(sql`completed_at = NOW()`);
          setParts.push(sql`progress = 100`);
        }
        await db.execute(sql`UPDATE rnd_design_tasks SET ${sql.join(setParts, sql`, `)} WHERE id = ${input.id} AND discipline = ${discipline}`);
        return { success: true };
      }),

    // Update checklist
    updateChecklist: requirePermission('rnd:requirements:manage')
      .input(z.object({
        id: z.number(),
        checklist: z.array(z.object({ item: z.string(), checked: z.boolean() }).passthrough()),
      }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        await db.execute(sql`UPDATE rnd_design_tasks SET checklist = ${JSON.stringify(input.checklist)}::jsonb, updated_at = NOW() WHERE id = ${input.id}`);
        return { success: true };
      }),

    // Bump revision
    bumpRevision: requirePermission('rnd:requirements:manage')
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        // Get current revision
        const cur = await db.execute(sql`SELECT revision FROM rnd_design_tasks WHERE id = ${input.id} LIMIT 1`);
        const curRev = (cur.rows as any[])[0]?.revision || "R1";
        const revNum = parseInt(curRev.replace("R", "")) || 1;
        const newRev = `R${revNum + 1}`;
        await db.execute(sql`UPDATE rnd_design_tasks SET revision = ${newRev}, status = ${defaultStatus}, progress = 0, completed_at = NULL, updated_at = NOW() WHERE id = ${input.id}`);
        return { success: true, newRevision: newRev };
      }),

    // Delete
    delete: requirePermission('rnd:requirements:manage')
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        await db.execute(sql`DELETE FROM rnd_design_tasks WHERE id = ${input.id} AND discipline = ${discipline}`);
        return { success: true };
      }),

    // Stats
    getStats: protectedProcedure
      .input(z.object({ bu: z.string().optional() }).optional())
      .query(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const conditions: SQL[] = [sql`discipline = ${discipline}`];
        if (input?.bu) conditions.push(sql`bu_code = ${input.bu}`);
        const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

        const result = await db.execute(sql`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('已审核','已完成')) AS overdue,
            COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent,
            ROUND(AVG(progress)) AS "avgProgress",
            COUNT(*) FILTER (WHERE status IN ('已审核','已完成')) AS completed,
            COUNT(*) FILTER (WHERE status = '审核中') AS reviewing
          FROM rnd_design_tasks ${where}
        `);
        const row = (result.rows as any[])[0] || {};
        return {
          total: Number(row.total) || 0,
          overdue: Number(row.overdue) || 0,
          urgent: Number(row.urgent) || 0,
          avgProgress: Number(row.avgProgress) || 0,
          completed: Number(row.completed) || 0,
          reviewing: Number(row.reviewing) || 0,
        };
      }),
  });
}

const mechanicalRouter = makeDesignRouter("mechanical");
const electricalRouter = makeDesignRouter("electrical");

// ---------------------------------------------------------------------------
// Field Installation
// ---------------------------------------------------------------------------

async function ensureInstallationTable() {
  if ((ensureInstallationTable as any)._done) return;
  (ensureInstallationTable as any)._done = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_installations (
        id SERIAL PRIMARY KEY,
        inst_number VARCHAR(50) NOT NULL,
        project VARCHAR(500) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        location VARCHAR(500) NOT NULL DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT '待出发',
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        team VARCHAR(100) NOT NULL DEFAULT '',
        progress INTEGER NOT NULL DEFAULT 0,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_installations`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_installations (inst_number, project, customer, location, status, bu_code, team, progress, start_date, end_date) VALUES
          ('INS-001', '缸体清洗线', '上海大众', '上海安亭工厂', '安装中', 'BU3', '安装A组', 65, '2026-02-01', '2026-02-28'),
          ('INS-002', '变速箱清洗', '宝马慕尼黑', '慕尼黑工厂', '待出发', 'BU1', '安装B组', 0, '2026-03-01', '2026-03-20'),
          ('INS-003', '半导体清洗', '英飞凌', '德累斯顿工厂', '已完成', 'BU4', '安装C组', 100, '2026-01-10', '2026-01-25')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "installation table bootstrap failed");
  }
}

const installationRouter = router({
  list: protectedProcedure
    .input(z.object({ bu: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureInstallationTable();
      const db = await requireDb();
      const bu = input?.bu;
      let result;
      if (bu) {
        result = await db.execute(sql`
          SELECT id, inst_number AS "instNumber", project, customer, location, status, bu_code AS "bu",
                 team, progress, start_date AS "startDate", end_date AS "endDate"
          FROM rnd_installations WHERE bu_code = ${bu} ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, inst_number AS "instNumber", project, customer, location, status, bu_code AS "bu",
                 team, progress, start_date AS "startDate", end_date AS "endDate"
          FROM rnd_installations ORDER BY created_at DESC
        `);
      }
      const items = ((result.rows as any[]) || []).map((r: any) => ({
        ...r,
        startDate: r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : "",
        endDate: r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : "",
      }));
      return { items };
    }),
  create: protectedProcedure
    .input(z.object({
      project: z.string().min(1),
      customer: z.string().min(1),
      location: z.string().min(1),
      team: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      bu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureInstallationTable();
      const db = await requireDb();
      const instNumber = `INS-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_installations (inst_number, project, customer, location, status, bu_code, team, progress, start_date, end_date)
        VALUES (${instNumber}, ${input.project}, ${input.customer}, ${input.location}, '待出发', ${input.bu ?? "BU3"}, ${input.team}, 0, ${input.startDate}::date, ${input.endDate}::date)
        RETURNING id, inst_number AS "instNumber"
      `);
      return (result.rows as any[])[0];
    }),
});

// ---------------------------------------------------------------------------
// SAT Testing (M10)
// ---------------------------------------------------------------------------

async function ensureSatTestTable() {
  if ((ensureSatTestTable as any)._done) return;
  (ensureSatTestTable as any)._done = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_sat_tests (
        id SERIAL PRIMARY KEY,
        sat_number VARCHAR(50) NOT NULL,
        project VARCHAR(500) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        status VARCHAR(30) NOT NULL DEFAULT '待测试',
        pass_rate INTEGER NOT NULL DEFAULT 0,
        total_items INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        pending INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_sat_tests`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_sat_tests (sat_number, project, customer, bu_code, status, pass_rate, total_items, passed, failed, pending) VALUES
          ('SAT-001', '缸体清洗线', '上海大众', 'BU3', '测试中', 85, 48, 41, 3, 4),
          ('SAT-002', '半导体清洗', '英飞凌', 'BU4', '已通过', 100, 32, 32, 0, 0),
          ('SAT-003', '商用车清洗', '潍柴动力', 'BU2', '待测试', 0, 36, 0, 0, 36)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "sat-test table bootstrap failed");
  }
}

const satTestRouter = router({
  list: protectedProcedure
    .input(z.object({ bu: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureSatTestTable();
      const db = await requireDb();
      const bu = input?.bu;
      let result;
      if (bu) {
        result = await db.execute(sql`
          SELECT id, sat_number AS "satNumber", project, customer, bu_code AS "bu",
                 status, pass_rate AS "passRate", total_items AS "totalItems",
                 passed, failed, pending
          FROM rnd_sat_tests WHERE bu_code = ${bu} ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, sat_number AS "satNumber", project, customer, bu_code AS "bu",
                 status, pass_rate AS "passRate", total_items AS "totalItems",
                 passed, failed, pending
          FROM rnd_sat_tests ORDER BY created_at DESC
        `);
      }
      return { items: (result.rows as any[]) || [] };
    }),
  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      project: z.string().min(1),
      customer: z.string().min(1),
      totalItems: z.number().min(1),
      bu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureSatTestTable();
      const db = await requireDb();
      const satNumber = `SAT-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_sat_tests (sat_number, project, customer, bu_code, status, pass_rate, total_items, passed, failed, pending)
        VALUES (${satNumber}, ${input.project}, ${input.customer}, ${input.bu ?? "BU3"}, '待测试', 0, ${input.totalItems}, 0, 0, ${input.totalItems})
        RETURNING id, sat_number AS "satNumber"
      `);
      return (result.rows as any[])[0];
    }),
});

// ---------------------------------------------------------------------------
// Final Acceptance (M11)
// ---------------------------------------------------------------------------

async function ensureAcceptanceTable() {
  if ((ensureAcceptanceTable as any)._done) return;
  (ensureAcceptanceTable as any)._done = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_acceptances (
        id SERIAL PRIMARY KEY,
        acc_number VARCHAR(50) NOT NULL,
        project VARCHAR(500) NOT NULL,
        customer VARCHAR(200) NOT NULL,
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        status VARCHAR(30) NOT NULL DEFAULT '待验收',
        acceptance_date DATE,
        signed_by VARCHAR(100) NOT NULL DEFAULT '-',
        score INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_acceptances`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_acceptances (acc_number, project, customer, bu_code, status, acceptance_date, signed_by, score) VALUES
          ('ACC-001', '半导体清洗设备', '英飞凌', 'BU4', '已验收', '2026-01-25', 'Dr. Mueller', 98),
          ('ACC-002', '缸体清洗线', '上海大众', 'BU3', '验收中', '2026-02-15', '-', 0),
          ('ACC-003', '商用车清洗线', '潍柴动力', 'BU2', '待验收', '2026-03-10', '-', 0)
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "acceptance table bootstrap failed");
  }
}

const acceptanceRouter = router({
  list: protectedProcedure
    .input(z.object({ bu: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureAcceptanceTable();
      const db = await requireDb();
      const bu = input?.bu;
      let result;
      if (bu) {
        result = await db.execute(sql`
          SELECT id, acc_number AS "accNumber", project, customer, bu_code AS "bu",
                 status, acceptance_date AS "date", signed_by AS "signedBy", score
          FROM rnd_acceptances WHERE bu_code = ${bu} ORDER BY created_at DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, acc_number AS "accNumber", project, customer, bu_code AS "bu",
                 status, acceptance_date AS "date", signed_by AS "signedBy", score
          FROM rnd_acceptances ORDER BY created_at DESC
        `);
      }
      const items = ((result.rows as any[]) || []).map((r: any) => ({
        ...r,
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      }));
      return { items };
    }),
  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      project: z.string().min(1),
      customer: z.string().min(1),
      date: z.string(),
      bu: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureAcceptanceTable();
      const db = await requireDb();
      const accNumber = `ACC-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_acceptances (acc_number, project, customer, bu_code, status, acceptance_date, signed_by, score)
        VALUES (${accNumber}, ${input.project}, ${input.customer}, ${input.bu ?? "BU3"}, '待验收', ${input.date}::date, '-', 0)
        RETURNING id, acc_number AS "accNumber"
      `);
      return (result.rows as any[])[0];
    }),
});

// ---------------------------------------------------------------------------
// RFQ Kanban (supply chain RFQ cards)
// ---------------------------------------------------------------------------

async function ensureRfqCardTable() {
  if ((ensureRfqCardTable as any)._done) return;
  (ensureRfqCardTable as any)._done = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rnd_rfq_cards (
        id SERIAL PRIMARY KEY,
        rfq_code VARCHAR(50) NOT NULL,
        title_zh VARCHAR(500) NOT NULL,
        title_en VARCHAR(500) NOT NULL DEFAULT '',
        supplier VARCHAR(200) NOT NULL DEFAULT '',
        amount VARCHAR(50) NOT NULL DEFAULT '¥0',
        due_date VARCHAR(20) NOT NULL DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_rfq_cards`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_rfq_cards (rfq_code, title_zh, title_en, supplier, amount, due_date, status) VALUES
          ('RFQ-001', '超声换能器 ×50', 'Ultrasonic Transducer ×50', '供应商A', '¥85,000', '03-05', 'draft'),
          ('RFQ-002', '304不锈钢板 20T', '304 SS Sheet 20T', '供应商B', '¥220,000', '03-03', 'draft'),
          ('RFQ-003', 'PLC控制模块 ×10', 'PLC Module ×10', '供应商C', '¥45,000', '03-08', 'sent'),
          ('RFQ-004', '高压泵组 ×5', 'High-pressure Pump ×5', '供应商D', '¥128,000', '03-01', 'sent'),
          ('RFQ-005', '过滤器组件 ×100', 'Filter Assembly ×100', '供应商E', '¥32,000', '03-10', 'quoted'),
          ('RFQ-006', '电加热管 ×30', 'Heating Element ×30', '供应商F', '¥18,500', '02-28', 'quoted'),
          ('RFQ-007', '传送链条 50m', 'Conveyor Chain 50m', '供应商A', '¥67,000', '02-25', 'awarded'),
          ('RFQ-008', '温控仪表 ×20', 'Temp Controller ×20', '供应商G', '¥24,000', '02-20', 'awarded'),
          ('RFQ-009', '密封圈 ×500', 'O-Ring ×500', '供应商H', '¥8,200', '03-12', 'quoted'),
          ('RFQ-010', '废液处理泵 ×2', 'Waste Fluid Pump ×2', '供应商B', '¥95,000', '02-18', 'rejected'),
          ('RFQ-011', '触摸屏HMI ×8', 'HMI Touchscreen ×8', '供应商I', '¥56,000', '03-15', 'sent')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "rfq-card table bootstrap failed");
  }
}

const rfqKanbanRouter = router({
  list: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      await ensureRfqCardTable();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, rfq_code AS "rfqCode", title_zh AS "titleZh", title_en AS "titleEn",
               supplier, amount, due_date AS "dueDate", status
        FROM rnd_rfq_cards ORDER BY created_at DESC
      `);
      return { items: (result.rows as any[]) || [] };
    }),
  create: requirePermission('rnd:requirements:manage')
    .input(z.object({
      titleZh: z.string().min(1),
      titleEn: z.string().optional(),
      supplier: z.string().min(1),
      amount: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureRfqCardTable();
      const db = await requireDb();
      const rfqCode = `RFQ-${String(Date.now()).slice(-3)}`;
      const result = await db.execute(sql`
        INSERT INTO rnd_rfq_cards (rfq_code, title_zh, title_en, supplier, amount, due_date, status)
        VALUES (${rfqCode}, ${input.titleZh}, ${input.titleEn ?? ""}, ${input.supplier}, ${input.amount ?? "¥0"}, ${input.dueDate ?? ""}, 'draft')
        RETURNING id, rfq_code AS "rfqCode"
      `);
      return (result.rows as any[])[0];
    }),
});

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export const rndPipelineRouter = router({
  quotation: quotationRouter,
  requirement: requirementRouter,
  solution: solutionRouter,
  mechanical: mechanicalRouter,
  electrical: electricalRouter,
  installation: installationRouter,
  satTest: satTestRouter,
  acceptance: acceptanceRouter,
  rfqKanban: rfqKanbanRouter,
});

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
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

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
    console.warn("rnd-pipeline quotation bootstrap:", e.message);
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
          ('REQ-2026-001', '上海大众', '缸体清洗线需求', 'approved', 'high', 'BU3', '王工', '2026-02-05'),
          ('REQ-2026-002', '宝马慕尼黑', '变速箱壳体清洗方案', 'reviewing', 'urgent', 'BU1', '李工', '2026-02-08'),
          ('REQ-2026-003', '英飞凌', '晶圆清洗设备需求', 'in_progress', 'high', 'BU4', '张工', '2026-02-01'),
          ('REQ-2026-004', '潍柴动力', '柴油机零部件清洗系统', 'draft', 'medium', 'BU2', '赵工', '2026-02-10')
      `);
    }
  } catch (e: any) {
    console.warn("rnd-pipeline requirement bootstrap:", e.message);
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
          ('SOL-001', '缸体清洗线', '上海大众', '设计中', 'BU3', 'V2.1', '王工', '2026-02-06'),
          ('SOL-002', '变速箱清洗方案', '宝马慕尼黑', '已评审', 'BU1', 'V1.0', '李工', '2026-02-09'),
          ('SOL-003', '晶圆清洗设备', '英飞凌', '修改中', 'BU4', 'V3.2', '张工', '2026-02-02')
      `);
    }
  } catch (e: any) {
    console.warn("rnd-pipeline solution bootstrap:", e.message);
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

  create: protectedProcedure
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
      const conditions: string[] = [];
      if (bu) conditions.push(`bu_code = '${bu}'`);
      if (status && status !== "all") conditions.push(`status = '${status}'`);
      if (search) conditions.push(`(title ILIKE '%${search}%' OR customer ILIKE '%${search}%')`);

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const result = await db.execute(sql.raw(`
        SELECT id, req_number AS "reqNumber", customer, title, status, priority,
               bu_code AS "bu", assignee, created_at AS "date"
        FROM rnd_requirements
        ${where}
        ORDER BY created_at DESC
      `));

      const items = ((result.rows as any[]) || []).map((r: any) => ({
        ...r,
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
      }));

      return { items };
    }),

  create: protectedProcedure
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

  updateStatus: protectedProcedure
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

  create: protectedProcedure
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
        status VARCHAR(30) NOT NULL DEFAULT '设计中',
        bu_code VARCHAR(20) NOT NULL DEFAULT 'BU3',
        revision VARCHAR(10) NOT NULL DEFAULT 'R1',
        engineer VARCHAR(100) NOT NULL DEFAULT '',
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM rnd_design_tasks`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO rnd_design_tasks (task_number, name, project, discipline, status, bu_code, revision, engineer, progress, created_at) VALUES
          ('MD-001', '清洗槽体结构设计', '缸体清洗线', 'mechanical', '设计中', 'BU3', 'R3', '王工', 75, '2026-02-06'),
          ('MD-002', '传送机构总装图', '变速箱清洗', 'mechanical', '已审核', 'BU1', 'R1', '李工', 100, '2026-02-08'),
          ('MD-003', '干燥室结构设计', '晶圆清洗', 'mechanical', '审核中', 'BU4', 'R2', '张工', 90, '2026-02-03'),
          ('MD-004', '框架结构优化', '柴油机清洗', 'mechanical', '设计中', 'BU2', 'R1', '赵工', 40, '2026-02-10'),
          ('ED-001', '主控PLC程序设计', '缸体清洗线', 'electrical', '编程中', 'BU3', 'R1', '陈工', 60, '2026-02-07'),
          ('ED-002', 'HMI界面开发', '变速箱清洗', 'electrical', '已完成', 'BU1', 'R1', '周工', 100, '2026-02-09'),
          ('ED-003', '电气原理图设计', '晶圆清洗', 'electrical', '审核中', 'BU4', 'R1', '吴工', 85, '2026-02-04'),
          ('ED-004', 'IO分配表', '柴油机清洗', 'electrical', '编程中', 'BU2', 'R1', '郑工', 30, '2026-02-11')
      `);
    }
  } catch (e: any) {
    console.warn("rnd-pipeline design-task bootstrap:", e.message);
  }
}

function makeDesignRouter(discipline: "mechanical" | "electrical") {
  return router({
    list: protectedProcedure
      .input(z.object({ bu: z.string().optional() }).optional())
      .query(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const bu = input?.bu;
        let result;
        if (bu) {
          result = await db.execute(sql`
            SELECT id, task_number AS "taskNumber", name, project, status, bu_code AS "bu",
                   revision AS "rev", engineer, progress, created_at AS "date"
            FROM rnd_design_tasks WHERE discipline = ${discipline} AND bu_code = ${bu}
            ORDER BY created_at DESC
          `);
        } else {
          result = await db.execute(sql`
            SELECT id, task_number AS "taskNumber", name, project, status, bu_code AS "bu",
                   revision AS "rev", engineer, progress, created_at AS "date"
            FROM rnd_design_tasks WHERE discipline = ${discipline}
            ORDER BY created_at DESC
          `);
        }
        return { items: (result.rows as any[]) || [] };
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        project: z.string().min(1),
        engineer: z.string().min(1),
        bu: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await ensureDesignTaskTable();
        const db = await requireDb();
        const prefix = discipline === "mechanical" ? "MD" : "ED";
        const taskNumber = `${prefix}-${String(Date.now()).slice(-3)}`;
        const result = await db.execute(sql`
          INSERT INTO rnd_design_tasks (task_number, name, project, discipline, status, bu_code, revision, engineer, progress)
          VALUES (${taskNumber}, ${input.name}, ${input.project}, ${discipline}, ${discipline === "electrical" ? "编程中" : "设计中"}, ${input.bu ?? "BU3"}, 'R1', ${input.engineer}, 0)
          RETURNING id, task_number AS "taskNumber"
        `);
        return (result.rows as any[])[0];
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
    console.warn("rnd-pipeline installation bootstrap:", e.message);
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
    console.warn("rnd-pipeline sat-test bootstrap:", e.message);
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
  create: protectedProcedure
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
    console.warn("rnd-pipeline acceptance bootstrap:", e.message);
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
  create: protectedProcedure
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
    console.warn("rnd-pipeline rfq-card bootstrap:", e.message);
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
  create: protectedProcedure
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

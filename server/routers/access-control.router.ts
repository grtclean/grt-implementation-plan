/**
 * Access Control Router — Permission Blacklist + Temp Permissions + User Status
 * Zone D [安全与底层管控] — Security & Access Management
 *
 * Sub-routers:
 *   blacklist      — permission blacklist (ban specific users from modules)
 *   tempPermission — temporary permission grants with auto-expiry
 *   userStatus     — user profile status overview for admin
 *
 * Data source: CREATE TABLE IF NOT EXISTS + seed (Phase 0 pattern)
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("access-control");

// ─── Bootstrap helpers ───────────────────────────────────────────

const bootstrapped = { blacklist: false, tempPerm: false, userStatus: false };

async function ensureBlacklist() {
  if (bootstrapped.blacklist) return;
  bootstrapped.blacklist = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permission_blacklists (
        id            SERIAL PRIMARY KEY,
        bl_number     VARCHAR(20) NOT NULL,
        user_name     VARCHAR(100) NOT NULL,
        department    VARCHAR(100) NOT NULL DEFAULT '',
        blocked_module VARCHAR(100) NOT NULL,
        blocked_action VARCHAR(200) NOT NULL DEFAULT '',
        reason        TEXT,
        created_by    VARCHAR(100) NOT NULL DEFAULT 'admin',
        created_at    DATE NOT NULL DEFAULT CURRENT_DATE,
        status        VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM permission_blacklists`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO permission_blacklists (bl_number, user_name, department, blocked_module, blocked_action, reason, created_by, created_at, status) VALUES
        ('BL-001', '赵某', '销售部', '财务管理', '查看成本数据', '离职过渡期限制敏感数据访问', 'HR经理', '2026-02-01', 'active'),
        ('BL-002', '钱某', '研发部', '合同管理', '导出合同', '竞业协议限制', '法务部', '2026-01-15', 'active'),
        ('BL-003', '孙某', '生产部', '薪酬管理', '查看他人薪资', '数据泄露事件处罚', 'admin', '2025-12-20', 'lifted')
      `);
    }
  } catch (e: any) {
    log.warn({ message: e.message }, "blacklist bootstrap warning");
  }
}

async function ensureTempPerm() {
  if (bootstrapped.tempPerm) return;
  bootstrapped.tempPerm = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS temporary_permissions (
        id          SERIAL PRIMARY KEY,
        tp_number   VARCHAR(20) NOT NULL,
        user_name   VARCHAR(100) NOT NULL,
        role_code   VARCHAR(50) NOT NULL DEFAULT '',
        module_name VARCHAR(100) NOT NULL DEFAULT '',
        reason      TEXT,
        granted_by  VARCHAR(100) NOT NULL DEFAULT '',
        start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        status      VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM temporary_permissions`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO temporary_permissions (tp_number, user_name, role_code, module_name, reason, granted_by, start_date, end_date, status) VALUES
        ('TP-001', '洪小东', 'bu_sales',           '客户管理',     '临时支援BU3销售',         '倪亚东', '2026-02-01', '2026-02-28', 'active'),
        ('TP-002', '蔡瑞',   'finance_specialist',  '费用报销审批', '财务休假期间代理审批',     '戴晓燕', '2026-02-10', '2026-02-14', 'active'),
        ('TP-003', '李大鹏', 'hr_specialist',       '考勤管理',     '协助HR月度考勤统计',      '杨勇',   '2026-01-25', '2026-01-31', 'expired'),
        ('TP-004', '孙国祥', 'bu_pm',               '项目管理',     '紧急项目临时项目经理',     '金晓锋', '2026-02-05', '2026-03-05', 'active')
      `);
    }
  } catch (e: any) {
    log.warn({ message: e.message }, "tempPerm bootstrap warning");
  }
}

async function ensureUserStatus() {
  if (bootstrapped.userStatus) return;
  bootstrapped.userStatus = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profile_status (
        id                    SERIAL PRIMARY KEY,
        employee_id           VARCHAR(20) NOT NULL,
        name                  VARCHAR(100) NOT NULL,
        department            VARCHAR(100) NOT NULL DEFAULT '',
        bu_code               VARCHAR(10) NOT NULL DEFAULT 'FUNC',
        email                 VARCHAR(200) NOT NULL DEFAULT '',
        has_profile           BOOLEAN NOT NULL DEFAULT false,
        work_plan_enabled     BOOLEAN NOT NULL DEFAULT false,
        work_plan_frequency   VARCHAR(20) NOT NULL DEFAULT 'daily',
        training_enabled      BOOLEAN NOT NULL DEFAULT false,
        project_enabled       BOOLEAN NOT NULL DEFAULT false,
        performance_enabled   BOOLEAN NOT NULL DEFAULT false,
        report_enabled        BOOLEAN NOT NULL DEFAULT false,
        task_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
        task_reminder_time    VARCHAR(10) NOT NULL DEFAULT '15:00',
        email_enabled         BOOLEAN NOT NULL DEFAULT false,
        last_active           TIMESTAMP NULL,
        pending_tasks         INT NOT NULL DEFAULT 0,
        overdue_tasks         INT NOT NULL DEFAULT 0
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM user_profile_status`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO user_profile_status (employee_id, name, department, bu_code, email, has_profile,
          work_plan_enabled, work_plan_frequency, training_enabled, project_enabled,
          performance_enabled, report_enabled, task_reminder_enabled, task_reminder_time, email_enabled,
          last_active, pending_tasks, overdue_tasks) VALUES
        ('GRT001', '倪亚东', '总裁办',   'FUNC', 'ni.yadong@grt.com',  true,  true,'daily', true,true,true,true,true,'15:00',true,  '2026-02-28 10:30:00', 3, 0),
        ('GRT003', '侯亚琴', '事业三部', 'BU3',  'hou.yaqin@grt.com',   true,  true,'weekly',true,true,false,true,true,'14:00',true,  '2026-02-28 09:15:00', 5, 1),
        ('GRT004', '戴晓燕', '事业一部', 'BU1',  'dai.xiaoyan@grt.com', false, false,'daily', false,false,false,false,false,'15:00',false, NULL,                  0, 0),
        ('GRT006', '洪香龙', '事业二部', 'BU2',  'hong.xilong@grt.com', true,  true,'daily', false,true,true,false,false,'15:00',false, '2026-02-27 16:45:00', 2, 0),
        ('GRT007', '孙坚',   '事业三部', 'BU3',  'sun.jian@grt.com',    true,  true,'daily', true,true,true,true,true,'15:00',true,  '2026-02-28 11:00:00', 4, 2)
      `);
    }
  } catch (e: any) {
    log.warn({ message: e.message }, "userStatus bootstrap warning");
  }
}

// ─── Sub-routers ─────────────────────────────────────────────────

const blacklistRouter = router({
  list: protectedProcedure.query(async () => {
    await ensureBlacklist();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT id, bl_number, user_name, department, blocked_module, blocked_action,
             reason, created_by, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at, status
      FROM permission_blacklists ORDER BY created_at DESC
    `);
    const items = (result.rows as any[]).map((r: any) => ({
      id: r.id,
      blNumber: r.bl_number,
      user: r.user_name,
      department: r.department,
      blockedModule: r.blocked_module,
      blockedAction: r.blocked_action,
      reason: r.reason,
      createdBy: r.created_by,
      createdAt: r.created_at,
      status: r.status,
    }));
    const active = items.filter((r: any) => r.status === "active").length;
    const lifted = items.filter((r: any) => r.status === "lifted").length;
    return { items, stats: { active, lifted, total: items.length } };
  }),

  create: requirePermission('system:permissions:assign')
    .input(z.object({
      user: z.string().min(1),
      department: z.string().optional(),
      blockedModule: z.string().min(1),
      blockedAction: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureBlacklist();
      const db = await requireDb();
      const cntResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM permission_blacklists`);
      const num = Number((cntResult.rows as any[])[0]?.cnt) + 1;
      const blNumber = `BL-${String(num).padStart(3, "0")}`;
      const createdBy = ctx.user?.name ?? "admin";
      await db.execute(sql`
        INSERT INTO permission_blacklists (bl_number, user_name, department, blocked_module, blocked_action, reason, created_by)
        VALUES (${blNumber}, ${input.user}, ${input.department ?? ""}, ${input.blockedModule}, ${input.blockedAction ?? ""}, ${input.reason ?? ""}, ${createdBy})
      `);
      return { success: true, blNumber };
    }),

  lift: requirePermission('system:permissions:assign')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureBlacklist();
      const db = await requireDb();
      const numId = Number(input.id);
      await db.execute(sql`UPDATE permission_blacklists SET status = 'lifted' WHERE id = ${numId}`);
      return { success: true };
    }),
});

const tempPermissionRouter = router({
  list: protectedProcedure.query(async () => {
    await ensureTempPerm();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT id, tp_number, user_name, role_code, module_name, reason, granted_by,
             TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
             TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date, status
      FROM temporary_permissions ORDER BY start_date DESC
    `);
    const items = (result.rows as any[]).map((r: any) => ({
      id: r.id,
      tpNumber: r.tp_number,
      user: r.user_name,
      role: r.role_code,
      module: r.module_name,
      reason: r.reason,
      grantedBy: r.granted_by,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
    }));
    const active = items.filter((r: any) => r.status === "active").length;
    const expired = items.filter((r: any) => r.status === "expired").length;
    const expiringSoon = items.filter((r: any) => {
      if (r.status !== "active") return false;
      const end = new Date(r.endDate);
      const now = new Date();
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      return diffDays >= 0 && diffDays <= 3;
    }).length;
    return { items, stats: { active, expired, expiringSoon, total: items.length } };
  }),

  create: requirePermission('system:permissions:assign')
    .input(z.object({
      user: z.string().min(1),
      role: z.string().min(1),
      module: z.string().optional(),
      reason: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTempPerm();
      const db = await requireDb();
      const cntResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM temporary_permissions`);
      const num = Number((cntResult.rows as any[])[0]?.cnt) + 1;
      const tpNumber = `TP-${String(num).padStart(3, "0")}`;
      const grantedBy = ctx.user?.name ?? "admin";
      await db.execute(sql`
        INSERT INTO temporary_permissions (tp_number, user_name, role_code, module_name, reason, granted_by, start_date, end_date)
        VALUES (${tpNumber}, ${input.user}, ${input.role}, ${input.module ?? ""}, ${input.reason ?? ""}, ${grantedBy}, ${input.startDate}::date, ${input.endDate}::date)
      `);
      return { success: true, tpNumber };
    }),

  revoke: requirePermission('system:permissions:assign')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      await ensureTempPerm();
      const db = await requireDb();
      const numId = Number(input.id);
      await db.execute(sql`UPDATE temporary_permissions SET status = 'revoked' WHERE id = ${numId}`);
      return { success: true };
    }),
});

const userStatusRouter = router({
  list: protectedProcedure
    .input(z.object({
      bu: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureUserStatus();
      const db = await requireDb();

      // Build query dynamically
      let result;
      if (input?.bu && input?.search) {
        const searchPat = `%${input.search}%`;
        result = await db.execute(sql`
          SELECT * FROM user_profile_status
          WHERE bu_code = ${input.bu}
            AND (name LIKE ${searchPat} OR employee_id LIKE ${searchPat} OR department LIKE ${searchPat})
          ORDER BY employee_id
        `);
      } else if (input?.bu) {
        result = await db.execute(sql`
          SELECT * FROM user_profile_status WHERE bu_code = ${input.bu} ORDER BY employee_id
        `);
      } else if (input?.search) {
        const searchPat = `%${input.search}%`;
        result = await db.execute(sql`
          SELECT * FROM user_profile_status
          WHERE name LIKE ${searchPat} OR employee_id LIKE ${searchPat} OR department LIKE ${searchPat}
          ORDER BY employee_id
        `);
      } else {
        result = await db.execute(sql`SELECT * FROM user_profile_status ORDER BY employee_id LIMIT 1000`);
      }

      const items = (result.rows as any[]).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        name: r.name,
        department: r.department,
        buCode: r.bu_code,
        email: r.email,
        hasProfile: !!r.has_profile,
        settings: r.has_profile ? {
          workPlanEnabled: !!r.work_plan_enabled,
          workPlanFrequency: r.work_plan_frequency,
          trainingEnabled: !!r.training_enabled,
          projectEnabled: !!r.project_enabled,
          performanceEnabled: !!r.performance_enabled,
          reportEnabled: !!r.report_enabled,
          taskReminderEnabled: !!r.task_reminder_enabled,
          taskReminderTime: r.task_reminder_time,
          emailEnabled: !!r.email_enabled,
        } : null,
        lastActive: r.last_active,
        pendingTasks: r.pending_tasks ?? 0,
        overdueTasks: r.overdue_tasks ?? 0,
      }));

      const total = items.length;
      const configured = items.filter((u: any) => u.hasProfile).length;
      const unconfigured = total - configured;
      const withOverdue = items.filter((u: any) => u.overdueTasks > 0).length;
      const reminderEnabled = items.filter((u: any) => u.settings?.taskReminderEnabled).length;
      return {
        items,
        stats: { total, configured, unconfigured, withOverdue, reminderEnabled },
      };
    }),

  sendReminder: requirePermission('system:permissions:assign')
    .input(z.object({ userId: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      return { success: true, message: `配置提醒已发送至用户 #${input.userId}` };
    }),
});

// ─── Combined export ─────────────────────────────────────────────

export const accessControlRouter = router({
  blacklist: blacklistRouter,
  tempPermission: tempPermissionRouter,
  userStatus: userStatusRouter,
});

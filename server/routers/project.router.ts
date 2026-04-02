import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { projects, projectDeleteRequests } from "../../drizzle/schema";
import { eq, ne, desc, count, sql, inArray, and } from "drizzle-orm";

// 事业部经理及以上角色 — 可直接删除/新增项目
const DIRECTOR_AND_ABOVE_ROLES = [
  "admin", "ceo", "cto", "cfo", "director", "hr_director", "bu_gm", "vp", "super_admin",
];

// 项目创建后的免审删除窗口（毫秒）
const GRACE_PERIOD_MS = 2 * 60 * 1000; // 2分钟

// 自动建表/加列（防止 schema 未迁移时报错）
let _tableEnsured = false;
async function ensureDeleteRequestsTable(db: any) {
  if (_tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_delete_requests (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        project_code VARCHAR(32),
        project_name VARCHAR(200),
        reason TEXT NOT NULL,
        requested_by INTEGER NOT NULL,
        requested_by_name VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        approved_by INTEGER,
        approved_by_name VARCHAR(100),
        approval_note TEXT,
        is_within_grace_period SMALLINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP
      )
    `);
  } catch { /* table may already exist */ }
  // 确保 projects.created_by 列存在
  try {
    await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER`);
  } catch { /* column may already exist */ }
  _tableEnsured = true;
}

/**
 * 级联删除项目及所有关联数据
 * 方案：先查 pg_constraint 动态发现所有 FK 引用 → 逐表清理 → 再删主记录
 * 兜底：如果仍有遗漏 FK，在事务内暂时禁用 triggers 强制删除
 */
async function cascadeDeleteProject(db: any, projectId: number) {
  // Step 1: 动态查询所有引用 projects 表的外键
  try {
    const fks: any[] = await db.execute(sql`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'projects'
        AND ccu.column_name = 'id'
    `);

    const rows = (fks as any)?.rows ?? fks ?? [];
    for (const fk of rows) {
      try {
        const tbl = fk.table_name;
        const col = fk.column_name;
        await db.execute(sql.raw(`DELETE FROM "${tbl}" WHERE "${col}" = ${projectId}`));
      } catch { /* skip */ }
    }
  } catch { /* info schema query failed — fall through to static list */ }

  // Step 2: 静态兜底列表（info schema 可能不完整或表不存在）
  const staticTables = [
    'gate_checklists', 'pull_signals', 'plm_documents', 'dt_assets',
    'business_trip_reports', 'pdm_bom_items', 'pdm_engineering_changes',
    'pdm_design_reviews', 'pdm_tech_docs', 'pdm_drawing_releases',
    'project_activity_timeline', 'project_stage_audit_logs',
    'project_stages_v2', 'project_digital_twins', 'project_delete_requests',
    'project_phases', 'project_gates', 'project_milestones',
    'project_tasks', 'project_team_members', 'project_documents',
  ];
  for (const table of staticTables) {
    try { await db.execute(sql.raw(`DELETE FROM "${table}" WHERE project_id = ${projectId}`)); } catch { /* skip */ }
  }
  try { await db.execute(sql.raw(`DELETE FROM oa_workflows WHERE linked_project_id = ${projectId}`)); } catch { /* skip */ }
  try { await db.execute(sql.raw(`UPDATE pdm_products SET default_project_id = NULL WHERE default_project_id = ${projectId}`)); } catch { /* skip */ }

  // Step 3: 删除主记录 — 如果仍有 FK 阻塞，则在session级别暂时禁用触发器重试
  try {
    await db.execute(sql`DELETE FROM projects WHERE id = ${projectId}`);
  } catch (e: any) {
    // FK violation → 暂时禁用触发器强制删除
    await db.execute(sql`SET session_replication_role = 'replica'`);
    try {
      await db.execute(sql`DELETE FROM projects WHERE id = ${projectId}`);
    } finally {
      await db.execute(sql`SET session_replication_role = 'origin'`);
    }
  }
}

export const projectRouter = router({
  // 项目列表 (BU-scoped)
  list: requirePermission('project:list:view').query(async ({ ctx }) => {
    const db = await requireDb();
    const buFilter = buScopeCondition(projects.buCode, ctx);
    if (buFilter) {
      return await db.select().from(projects).where(buFilter).orderBy(desc(projects.createdAt)).limit(1000);
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(1000);
  }),

  // 获取项目详情 (BU-scoped)
  getById: requirePermission('project:list:view').input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);
    const buFilter = buScopeCondition(projects.buCode, ctx);
    const conditions = [eq(projects.id, numId)];
    if (buFilter) conditions.push(buFilter);
    const [item] = await db.select().from(projects).where(and(...conditions)).limit(1000);
    return item || null;
  }),

  // 创建项目
  create: requirePermission('project:create').input(z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    type: z.enum(["standard", "key", "strategic"]).default("standard"),
    priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    budget: z.number().optional(),
    description: z.string().optional(),
    customerId: z.number().optional(),
    managerId: z.number().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    await ensureDeleteRequestsTable(db); // ensures created_by column exists
    const projectCode = `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [project] = await db.insert(projects).values({
      projectCode,
      name: input.name,
      shortName: input.shortName ?? null,
      type: input.type,
      priority: input.priority,
      budget: input.budget ?? null,
      description: input.description ?? null,
      customerId: input.customerId ?? null,
      managerId: input.managerId ?? null,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      status: "draft",
      currentPhase: "M0",
      buCode: ctx.bu?.buCode ?? null,
      // createdBy tracked via ensureDeleteRequestsTable ALTER TABLE if needed
    }).returning();
    // Publish event for sandbox sync
    try {
      const { eventBus, SANDBOX_EVENTS } = await import("../events/event-bus");
      await eventBus.publish({
        type: SANDBOX_EVENTS.PROJECT_MILESTONE_HIT,
        sourceModule: "project",
        targetModules: ["production-scheduling", "mechanical-config", "quoting-bom"],
        payload: { projectId: project.id, projectCode, name: input.name },
        userId: ctx.user?.id ?? 0,
        timestamp: new Date(),
      });
    } catch { /* event bus best-effort */ }
    return { success: true, message: "项目创建成功", id: project.id, projectCode };
  }),

  // 更新项目 (with optimistic locking via version column)
  update: requirePermission('project:edit').input(z.object({
    id: z.union([z.string(), z.number()]),
    expectedVersion: z.number().optional(),
    name: z.string().optional(),
    shortName: z.string().optional(),
    type: z.enum(["standard", "key", "strategic"]).optional(),
    status: z.enum(["draft", "active", "on_hold", "completed", "cancelled"]).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    currentPhase: z.string().optional(),
    budget: z.number().optional(),
    actualCost: z.number().optional(),
    completionPercent: z.number().optional(),
    description: z.string().optional(),
    objectives: z.string().optional(),
    scope: z.string().optional(),
    remark: z.string().optional(),
    managerId: z.number().optional(),
    customerId: z.number().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    actualStartDate: z.string().optional(),
    actualEndDate: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);

    // Fetch existing project for validation
    const [existing] = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
    if (!existing) return { success: false, message: "项目不存在" };

    // Optimistic lock check
    if (input.expectedVersion !== undefined) {
      if (existing.version !== input.expectedVersion) {
        throw new TRPCError({ code: "CONFLICT", message: "版本冲突：项目已被他人修改，请刷新后重试" });
      }
    }

    // M-phase门控: 阶段不可跳跃, 必须按顺序推进
    if (input.currentPhase) {
      const PHASE_ORDER = ['M0','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
      const currentIdx = PHASE_ORDER.indexOf(existing.currentPhase || 'M0');
      const targetIdx = PHASE_ORDER.indexOf(input.currentPhase);

      if (targetIdx < 0) {
        return { success: false, message: `无效阶段: ${input.currentPhase}` };
      }
      if (targetIdx > currentIdx + 1) {
        return { success: false, message: `不允许跳阶段: ${existing.currentPhase} → ${input.currentPhase}，最多前进一步` };
      }
      if (targetIdx < currentIdx) {
        return { success: false, message: `不允许回退阶段: ${existing.currentPhase} → ${input.currentPhase}` };
      }
    }

    const { id: _id, expectedVersion: _ev, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    // Increment version
    updates.version = sql`${projects.version} + 1`;

    await db.update(projects).set(updates).where(eq(projects.id, numId));
    const [project] = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
    if (!project) return { success: false, message: "项目不存在" };

      // 记录阶段推进到项目时间线
      if (input.currentPhase && input.currentPhase !== existing.currentPhase) {
        try {
          const { recordProjectActivity } = await import('../services/hrm-integration.service');
          await recordProjectActivity({
            projectId: numId,
            projectCode: existing.projectCode || undefined,
            activityType: 'phase_advanced',
            activityTitle: `项目阶段推进: ${existing.currentPhase} → ${input.currentPhase}`,
            sourceModule: 'project',
            projectPhase: input.currentPhase,
            performedBy: (ctx as any).userId || 0,
          });
        } catch {}
      }

    return { success: true, message: "更新成功", data: project };
  }),

  // ── 直接删除（仅事业部经理及以上） ──
  delete: requirePermission('project:delete').input(z.object({
    id: z.union([z.string(), z.number()]),
    reason: z.string().min(1, "请填写删除原因"),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const userRole = ctx.user?.role || "";

    // 仅事业部经理及以上可直接删除
    if (!DIRECTOR_AND_ABOVE_ROLES.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅事业部经理及以上人员可直接删除项目，其他人员请通过「申请删除」提交",
      });
    }

    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);
    const [existing] = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
    if (!existing) return { success: false, message: "项目不存在" };

    // 记录删除审计（best-effort — 表可能尚未迁移）
    try {
      await ensureDeleteRequestsTable(db);
      await db.insert(projectDeleteRequests).values({
        projectId: numId,
        projectCode: existing.projectCode,
        projectName: existing.name,
        reason: input.reason,
        requestedBy: ctx.user?.id ?? 0,
        requestedByName: ctx.user?.name || "",
        status: "auto_approved",
        approvedBy: ctx.user?.id ?? 0,
        approvedByName: ctx.user?.name || "",
        approvalNote: "事业部经理及以上直接删除",
        isWithinGracePeriod: 0,
        resolvedAt: new Date().toISOString(),
      });
    } catch { /* audit best-effort */ }

    await cascadeDeleteProject(db, numId);
    return { success: true, message: "项目已删除" };
  }),

  // ── 申请删除（项目工程师/销售工程师提交） ──
  requestDelete: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
    reason: z.string().min(1, "请填写删除原因"),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input.projectId === "number" ? input.projectId : parseInt(input.projectId);

    const [existing] = await db.select().from(projects).where(eq(projects.id, numId)).limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "项目不存在" });

    // 检查是否在2分钟免审窗口内
    const createdTime = new Date(existing.createdAt).getTime();
    const now = Date.now();
    const withinGrace = (now - createdTime) <= GRACE_PERIOD_MS;

    // 事业部经理及以上直接自动批准
    const userRole = ctx.user?.role || "";
    const isDirectorOrAbove = DIRECTOR_AND_ABOVE_ROLES.includes(userRole);

    await ensureDeleteRequestsTable(db);

    if (withinGrace || isDirectorOrAbove) {
      // 自动批准：2分钟内 或 高级别角色
      try {
        await db.insert(projectDeleteRequests).values({
          projectId: numId,
          projectCode: existing.projectCode,
          projectName: existing.name,
          reason: input.reason,
          requestedBy: ctx.user?.id ?? 0,
          requestedByName: ctx.user?.name || "",
          status: "auto_approved",
          approvedBy: ctx.user?.id ?? 0,
          approvedByName: ctx.user?.name || "",
          approvalNote: withinGrace ? "创建后2分钟内自动批准" : "事业部经理及以上自动批准",
          isWithinGracePeriod: withinGrace ? 1 : 0,
          resolvedAt: new Date().toISOString(),
        });
      } catch { /* audit best-effort */ }

      await cascadeDeleteProject(db, numId);
      return {
        success: true,
        autoApproved: true,
        message: withinGrace
          ? "项目在2分钟免审窗口内，已自动删除"
          : "已直接删除",
      };
    }

    // 超过2分钟，提交审批
    try {
      const [request] = await db.insert(projectDeleteRequests).values({
        projectId: numId,
        projectCode: existing.projectCode,
        projectName: existing.name,
        reason: input.reason,
        requestedBy: ctx.user?.id ?? 0,
        requestedByName: ctx.user?.name || "",
        status: "pending",
        isWithinGracePeriod: 0,
      }).returning();

      return {
        success: true,
        autoApproved: false,
        requestId: request.id,
        message: "已超过2分钟免审窗口，删除申请已提交，等待上级审批",
      };
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "创建删除申请失败，请联系管理员" });
    }
  }),

  // ── 审批删除申请（事业部经理及以上） ──
  approveDeleteRequest: protectedProcedure.input(z.object({
    requestId: z.number(),
    approved: z.boolean(),
    approvalNote: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const userRole = ctx.user?.role || "";

    if (!DIRECTOR_AND_ABOVE_ROLES.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅事业部经理及以上人员可审批删除申请",
      });
    }

    await ensureDeleteRequestsTable(db);

    const [request] = await db.select().from(projectDeleteRequests)
      .where(eq(projectDeleteRequests.id, input.requestId)).limit(1);

    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在" });
    if (request.status !== "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `申请已处理（当前状态: ${request.status}）` });
    }

    const newStatus = input.approved ? "approved" : "rejected";

    await db.update(projectDeleteRequests)
      .set({
        status: newStatus,
        approvedBy: ctx.user?.id ?? 0,
        approvedByName: ctx.user?.name || "",
        approvalNote: input.approvalNote || (input.approved ? "批准删除" : "驳回"),
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(projectDeleteRequests.id, input.requestId));

    // 批准后执行删除
    if (input.approved) {
      await cascadeDeleteProject(db, request.projectId);
    }

    return {
      success: true,
      message: input.approved ? "已批准，项目已删除" : "已驳回删除申请",
    };
  }),

  // ── 查询删除申请列表 ──
  listDeleteRequests: protectedProcedure.input(z.object({
    status: z.enum(["pending", "approved", "rejected", "auto_approved", "all"]).default("all"),
  }).optional()).mutation(async ({ input }) => {
    const db = await requireDb();
    await ensureDeleteRequestsTable(db);
    const statusFilter = input?.status ?? "all";
    const conditions = [];
    if (statusFilter !== "all") {
      conditions.push(eq(projectDeleteRequests.status, statusFilter));
    }

    const rows = conditions.length > 0
      ? await db.select().from(projectDeleteRequests).where(and(...conditions)).orderBy(desc(projectDeleteRequests.createdAt)).limit(200)
      : await db.select().from(projectDeleteRequests).orderBy(desc(projectDeleteRequests.createdAt)).limit(200);

    return rows;
  }),

  // Project Lens: 按角色阶段筛选项目列表
  listByRole: requirePermission('project:list:view').input(z.object({
    phases: z.array(z.string()).optional(),
    healthStatus: z.enum(["green", "yellow", "red"]).optional(),
    limit: z.number().default(20),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const conditions = [ne(projects.status, "cancelled")];
    const buFilter = buScopeCondition(projects.buCode, ctx);
    if (buFilter) conditions.push(buFilter);
    if (input?.phases && input.phases.length > 0) {
      conditions.push(inArray(projects.currentPhase, input.phases));
    }
    if (input?.healthStatus) {
      conditions.push(eq(projects.healthStatus, input.healthStatus));
    }
    return await db.select().from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt))
      .limit(input?.limit ?? 20);
  }),

  // 项目统计 (BU-scoped)
  statistics: requirePermission('project:list:view').query(async ({ ctx }) => {
    const db = await requireDb();
    const buFilter = buScopeCondition(projects.buCode, ctx);
    const allProjects = buFilter
      ? await db.select().from(projects).where(buFilter)
      : await db.select().from(projects).limit(1000);

    const byStatus: Record<string, number> = { draft: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 };
    const byType: Record<string, number> = { standard: 0, key: 0, strategic: 0 };
    const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    let totalBudget = 0;
    let totalSpent = 0;
    let totalProgress = 0;

    for (const p of allProjects) {
      if (p.status in byStatus) byStatus[p.status]++;
      if (p.type in byType) byType[p.type]++;
      if (p.priority in byPriority) byPriority[p.priority]++;
      totalBudget += p.budget ?? 0;
      totalSpent += p.actualCost ?? 0;
      totalProgress += p.completionPercent ?? 0;
    }

    return {
      total: allProjects.length,
      byStatus,
      byType,
      byPriority,
      totalBudget,
      totalSpent,
      averageProgress: allProjects.length ? Math.round(totalProgress / allProjects.length) : 0,
    };
  }),

  // ── 一键清理 Demo / 垃圾项目 ──
  cleanupDemoProjects: requirePermission('project:delete').mutation(async ({ ctx }) => {
    const db = await requireDb();
    const userRole = ctx.user?.role || "";
    if (!DIRECTOR_AND_ABOVE_ROLES.includes(userRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可执行清理" });
    }

    // 识别 demo / 垃圾项目的条件
    const demoPatterns = [
      "PRJ-DEMO-%",        // seedDemo 创建的
      "SAIC Cleaning%",    // 空项目
    ];
    // 乱码项目（UTF-8 encoding 损坏）
    const garbageNamePattern = "%\\\\x%"; // hex escaped
    // 旧系统遗留（无 GRT-PRJ 前缀的旧项目号）
    const legacyPatterns = [
      "XM2025%",           // 旧建道云项目
    ];

    const deleted: string[] = [];

    // 1. 按 projectCode LIKE 匹配
    for (const pattern of [...demoPatterns, ...legacyPatterns]) {
      try {
        const rows: any = await db.execute(sql`SELECT id, "projectCode", name FROM projects WHERE "projectCode" LIKE ${pattern}`);
        const items = rows?.rows ?? rows ?? [];
        for (const row of items) {
          try {
            await cascadeDeleteProject(db, row.id);
            deleted.push(`${row.projectCode || '?'} — ${row.name || '?'}`);
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    // 2. 按 name 匹配空名称 / 乱码
    try {
      const rows: any = await db.execute(sql`
        SELECT id, "projectCode", name FROM projects
        WHERE name = '' OR name IS NULL
           OR name LIKE '%�%'
           OR "projectCode" LIKE 'PRJ-DEMO-%'
           OR (name LIKE '%清洗线_项目' AND "projectCode" LIKE 'PRJ-DEMO-%')
      `);
      const items = rows?.rows ?? rows ?? [];
      for (const row of items) {
        if (deleted.some(d => d.startsWith(row.projectCode))) continue; // already deleted
        try {
          await cascadeDeleteProject(db, row.id);
          deleted.push(`${row.projectCode || '?'} — ${row.name || '?'}`);
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    // 3. 清理 project_agent_reviews 中引用已删除项目的孤立记录
    try {
      await db.execute(sql`
        DELETE FROM project_agent_reviews
        WHERE project_id NOT IN (SELECT id FROM projects)
      `);
    } catch { /* skip */ }

    return {
      success: true,
      deletedCount: deleted.length,
      deleted,
      message: deleted.length > 0
        ? `已清理 ${deleted.length} 个 Demo/垃圾项目`
        : "没有找到需要清理的 Demo 项目",
    };
  }),
});

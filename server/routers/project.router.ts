import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { projects } from "../../drizzle/schema";
import { eq, ne, desc, count, sql, inArray, and } from "drizzle-orm";

export const projectRouter = router({
  // 项目列表
  list: publicProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }),

  // 获取项目详情
  getById: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);
    const [item] = await db.select().from(projects).where(eq(projects.id, numId));
    return item || null;
  }),

  // 创建项目
  create: protectedProcedure.input(z.object({
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
  })).mutation(async ({ input }) => {
    const db = await requireDb();
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
    }).returning();
    return { success: true, message: "项目创建成功", id: project.id, projectCode };
  }),

  // 更新项目
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
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
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    const [project] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, numId))
      .returning();
    if (!project) return { success: false, message: "项目不存在" };
    return { success: true, message: "更新成功", data: project };
  }),

  // 删除项目
  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input.id === "number" ? input.id : parseInt(input.id);
    const deleted = await db.delete(projects).where(eq(projects.id, numId)).returning();
    return { success: deleted.length > 0, message: deleted.length > 0 ? "删除成功" : "项目不存在" };
  }),

  // Project Lens: 按角色阶段筛选项目列表
  listByRole: publicProcedure.input(z.object({
    phases: z.array(z.string()).optional(),
    healthStatus: z.enum(["green", "yellow", "red"]).optional(),
    limit: z.number().default(20),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [ne(projects.status, "cancelled")];
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

  // 项目统计
  statistics: publicProcedure.query(async () => {
    const db = await requireDb();
    const allProjects = await db.select().from(projects);

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
});

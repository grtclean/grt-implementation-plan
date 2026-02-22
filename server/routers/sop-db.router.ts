/**
 * SOP Template Library — DB-backed Router
 * Replaces in-memory sop.service.ts with real sopTemplates table
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sopTemplates } from "../../drizzle/production-process-schema";
import { eq, desc, sql, ilike } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const sopDbRouter = router({
  // 列表（支持筛选）
  list: publicProcedure.input(z.object({
    category: z.string().optional(),
    status: z.string().optional(),
    stage: z.string().optional(),
    equipmentModel: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(sopTemplates).orderBy(desc(sopTemplates.createdAt));
    if (input?.category) items = items.filter(s => s.category === input.category);
    if (input?.status) {
      const isActive = input.status === "approved";
      items = items.filter(s => s.isActive === isActive);
    }
    return items;
  }),

  // 详情
  getById: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [sop] = await db.select().from(sopTemplates).where(eq(sopTemplates.id, toNum(input.id)));
    return sop || null;
  }),

  // 创建SOP
  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    category: z.string(),
    content: z.string().optional(),
    equipmentModels: z.array(z.string()).optional(),
    stages: z.array(z.string()).optional(),
    processCode: z.string().optional(),
    steps: z.any().optional(),
    requiredTools: z.any().optional(),
    safetyPrecautions: z.any().optional(),
    qualityCheckpoints: z.any().optional(),
    estimatedDurationMinutes: z.number().optional(),
    difficultyLevel: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `SOP-${Date.now().toString(36).toUpperCase()}`;
    const [sop] = await db.insert(sopTemplates).values({
      code,
      title: input.title,
      category: input.category,
      processCode: input.processCode,
      steps: input.steps || (input.content ? [{ stepNo: 1, title: "操作步骤", description: input.content }] : undefined),
      applicableProducts: input.equipmentModels,
      requiredTools: input.requiredTools,
      safetyPrecautions: input.safetyPrecautions,
      qualityCheckpoints: input.qualityCheckpoints,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      difficultyLevel: input.difficultyLevel,
      isActive: true,
    }).returning();
    return sop;
  }),

  // 更新SOP
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    category: z.string().optional(),
    content: z.string().optional(),
    equipmentModels: z.array(z.string()).optional(),
    stages: z.array(z.string()).optional(),
    status: z.string().optional(),
    processCode: z.string().optional(),
    steps: z.any().optional(),
    requiredTools: z.any().optional(),
    safetyPrecautions: z.any().optional(),
    qualityCheckpoints: z.any().optional(),
    estimatedDurationMinutes: z.number().optional(),
    difficultyLevel: z.string().optional(),
    approver: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, status, approver, content, equipmentModels, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (equipmentModels !== undefined) updates.applicableProducts = equipmentModels;
    if (status === "approved") {
      updates.isActive = true;
      updates.approvedAt = new Date();
    }
    if (status === "archived") updates.isActive = false;
    const [sop] = await db.update(sopTemplates).set(updates).where(eq(sopTemplates.id, id)).returning();
    return sop;
  }),

  // 搜索
  search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(sopTemplates);
    const q = input.query.toLowerCase();
    return items.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  }),

  // 分类列表
  categories: publicProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select({ category: sopTemplates.category }).from(sopTemplates);
    return [...new Set(items.map(i => i.category).filter(Boolean))];
  }),

  // 版本升级
  version: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [sop] = await db.select().from(sopTemplates).where(eq(sopTemplates.id, input.id));
    if (!sop) return null;
    const currentVersion = parseFloat(sop.version || "1.0");
    const newVersion = (currentVersion + 0.1).toFixed(1);
    const [updated] = await db.update(sopTemplates)
      .set({ version: newVersion, updatedAt: new Date() })
      .where(eq(sopTemplates.id, input.id))
      .returning();
    return updated;
  }),
});

/**
 * GRT 5.0 成本管理 tRPC 路由
 *
 * 功能:
 * - 成本记录CRUD (costRecords)
 * - 成本类别管理 (costCategories)
 * - 预算/成本估算 (costEstimates)
 * - 成本费率 (costRates)
 * - 成本偏差分析 (costVarianceAnalysis)
 * - 人工成本查询
 * - 预算与成本汇总统计
 *
 * All data persisted via Drizzle ORM (no in-memory stores).
 */

import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  costRecords, costCategories, costEstimates, costRates,
  costVarianceAnalysis,
} from "../../drizzle/schema";

const successResponse = { success: true, message: "操作成功" };

export const costRouter = router({
  // ==================== CRUD (cost records) ====================

  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [totalResult] = await db.select({ count: count() }).from(costRecords);
      const total = totalResult?.count ?? 0;
      const rows = await db.select().from(costRecords).orderBy(desc(costRecords.createdAt)).limit(limit).offset(offset);
      return { items: rows, total, page: Math.floor(offset / limit) + 1, pageSize: limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;
      const rows = await db.select().from(costRecords).where(eq(costRecords.id, numericId));
      return rows[0] ?? null;
    }),

  create: protectedProcedure.input(z.object({
    projectId: z.number(),
    categoryId: z.number().optional(),
    costCode: z.string().optional(),
    description: z.string().optional(),
    amount: z.number(),
    costDate: z.string().optional(),
    vendor: z.string().optional(),
    invoiceNo: z.string().optional(),
    taskId: z.number().optional(),
    milestoneId: z.number().optional(),
    phaseCode: z.string().optional(),
    status: z.string().optional(),
    remark: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    await db.insert(costRecords).values({
      projectId: input.projectId,
      categoryId: input.categoryId,
      costCode: input.costCode ?? `COST-${Date.now()}`,
      description: input.description ?? "",
      amount: input.amount,
      costDate: input.costDate ?? new Date().toISOString(),
      vendor: input.vendor,
      invoiceNo: input.invoiceNo,
      taskId: input.taskId,
      milestoneId: input.milestoneId,
      phaseCode: input.phaseCode,
      status: input.status ?? "pending",
      submitterId: ctx.user.id,
      remark: input.remark,
    } as any);
    return successResponse;
  }),

  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    projectId: z.number().optional(),
    categoryId: z.number().optional(),
    costCode: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    costDate: z.string().optional(),
    vendor: z.string().optional(),
    invoiceNo: z.string().optional(),
    taskId: z.number().optional(),
    milestoneId: z.number().optional(),
    phaseCode: z.string().optional(),
    status: z.string().optional(),
    remark: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return successResponse;
    const { id: _id, ...data } = input;
    await db.update(costRecords).set({ ...data, updatedAt: new Date().toISOString() } as any).where(eq(costRecords.id, id));
    return successResponse;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = parseInt(input.id, 10);
      if (!isNaN(id)) await db.delete(costRecords).where(eq(costRecords.id, id));
      return successResponse;
    }),

  // ==================== Budget (costEstimates) ====================

  getBudget: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const projectId = Number(input?.projectId);
    if (!projectId) return { budget: 0, spent: 0, remaining: 0 };

    const estimates = await db.select().from(costEstimates).where(eq(costEstimates.projectId, projectId));
    const budget = estimates.reduce((sum, e) => sum + (e.estimatedAmount ?? 0), 0);

    const records = await db.select().from(costRecords).where(eq(costRecords.projectId, projectId));
    const spent = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return { budget, spent, remaining: budget - spent };
  }),

  getStatistics: protectedProcedure.query(async () => {
    const db = await requireDb();
    const records = await db.select().from(costRecords);
    const categories = await db.select().from(costCategories);

    const total = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const categoryStats = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      code: cat.code,
      total: records.filter(r => r.categoryId === cat.id).reduce((sum, r) => sum + (r.amount ?? 0), 0),
    }));

    return { total, categories: categoryStats };
  }),

  getBudgets: protectedProcedure.query(async () => {
    const db = await requireDb();
    const estimates = await db.select().from(costEstimates).orderBy(desc(costEstimates.createdAt));

    // Group by project
    const byProject: Record<number, { projectId: number; budget: number; items: typeof estimates }> = {};
    for (const e of estimates) {
      if (!byProject[e.projectId]) byProject[e.projectId] = { projectId: e.projectId, budget: 0, items: [] };
      byProject[e.projectId].budget += e.estimatedAmount ?? 0;
      byProject[e.projectId].items.push(e);
    }

    // Get actual spending per project
    const records = await db.select().from(costRecords);
    const spentByProject: Record<number, number> = {};
    for (const r of records) {
      spentByProject[r.projectId] = (spentByProject[r.projectId] ?? 0) + (r.amount ?? 0);
    }

    return Object.values(byProject).map(p => ({
      projectId: p.projectId,
      projectName: `Project #${p.projectId}`,
      budget: p.budget,
      spent: spentByProject[p.projectId] ?? 0,
    }));
  }),

  createBudget: protectedProcedure.input(z.object({
    projectId: z.number(),
    categoryId: z.number().optional(),
    name: z.string().optional(),
    estimateType: z.string().optional(),
    estimatedAmount: z.number().optional(),
    amount: z.number().optional(),
    budgetAmount: z.number().optional(),
    budgetYear: z.number().optional(),
    budgetMonth: z.number().optional(),
    lowEstimate: z.number().optional(),
    highEstimate: z.number().optional(),
    confidence: z.number().optional(),
    phaseCode: z.string().optional(),
    basis: z.string().optional(),
    assumptions: z.string().optional(),
    remark: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    await db.insert(costEstimates).values({
      projectId: input.projectId,
      categoryId: input.categoryId ?? 1,
      name: input.name ?? "Budget",
      estimateType: input.estimateType ?? "rough",
      estimatedAmount: input.estimatedAmount ?? input.amount ?? 0,
      lowEstimate: input.lowEstimate,
      highEstimate: input.highEstimate,
      confidence: input.confidence ?? 80,
      phaseCode: input.phaseCode,
      basis: input.basis,
      assumptions: input.assumptions,
      estimatorId: ctx.user.id,
    } as any);
    return successResponse;
  }),

  // ==================== Records ====================

  getRecords: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(costRecords).orderBy(desc(costRecords.costDate));
  }),

  createRecord: protectedProcedure.input(z.object({
    projectId: z.number(),
    categoryId: z.number().optional(),
    costCode: z.string().optional(),
    description: z.string().optional(),
    amount: z.number(),
    costDate: z.string().optional(),
    vendor: z.string().optional(),
    invoiceNo: z.string().optional(),
    phaseCode: z.string().optional(),
    remark: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(costRecords).values({
      projectId: input.projectId,
      categoryId: input.categoryId,
      costCode: input.costCode ?? `CR-${Date.now()}`,
      description: input.description ?? "",
      amount: input.amount,
      costDate: input.costDate ?? new Date().toISOString(),
      vendor: input.vendor,
      invoiceNo: input.invoiceNo,
      status: "pending",
    } as any);
    return successResponse;
  }),

  // ==================== Categories ====================

  getCategories: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(costCategories).orderBy(costCategories.sortOrder);
  }),

  initCategories: protectedProcedure.mutation(async () => {
    const db = await requireDb();
    // Check if already populated
    const existing = await db.select({ count: count() }).from(costCategories);
    if (Number(existing[0]?.count ?? 0) > 0) return { success: true, message: "Categories already exist", created: 0 };

    const defaults = [
      { name: "材料费", code: "MAT", type: "direct" as const, description: "原材料和零部件", sortOrder: 1, isActive: 1 },
      { name: "人工费", code: "LAB", type: "direct" as const, description: "直接人工成本", sortOrder: 2, isActive: 1 },
      { name: "设备费", code: "EQP", type: "direct" as const, description: "设备使用和折旧", sortOrder: 3, isActive: 1 },
      { name: "外协费", code: "SUB", type: "direct" as const, description: "外协加工费用", sortOrder: 4, isActive: 1 },
      { name: "差旅费", code: "TRV", type: "indirect" as const, description: "出差交通住宿", sortOrder: 5, isActive: 1 },
      { name: "管理费", code: "ADM", type: "overhead" as const, description: "行政管理费用", sortOrder: 6, isActive: 1 },
      { name: "其他费用", code: "OTH", type: "indirect" as const, description: "其他杂项费用", sortOrder: 7, isActive: 1 },
    ];

    for (const cat of defaults) {
      await db.insert(costCategories).values(cat);
    }
    return { success: true, message: "Default categories created", created: defaults.length };
  }),

  // ==================== Labor Costs ====================

  getLaborCosts: requirePermission('pm_project_cost').query(async () => {
    const db = await requireDb();
    // Filter cost records by labor category
    const laborCats = await db.select().from(costCategories).where(eq(costCategories.code, "LAB"));
    if (laborCats.length === 0) return [];

    const laborCatId = laborCats[0].id;
    const rows = await db.select().from(costRecords).where(eq(costRecords.categoryId, laborCatId)).orderBy(desc(costRecords.costDate));
    return rows.map(r => ({
      id: `LC-${r.id}`,
      projectId: r.projectId,
      employeeId: r.submitterId,
      hours: 0,
      rate: 0,
      total: r.amount,
      month: r.costDate?.slice(0, 7) ?? "",
    }));
  }),

  // ==================== Summary ====================

  getSummary: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [records, categories, estimates] = await Promise.all([
      db.select().from(costRecords),
      db.select().from(costCategories),
      db.select().from(costEstimates),
    ]);

    const totalBudget = estimates.reduce((sum, e) => sum + (e.estimatedAmount ?? 0), 0);
    const totalSpent = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const byCategory = categories.map(cat => ({
      category: cat.name,
      amount: records.filter(r => r.categoryId === cat.id).reduce((sum, r) => sum + (r.amount ?? 0), 0),
    }));

    return { summary: { totalBudget, totalSpent, byCategory } };
  }),
});

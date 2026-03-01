/**
 * GRT 5.0 年度规划 tRPC 路由
 *
 * 功能:
 * - 年度计划CRUD (annualPlans)
 * - 规划配置版本管理 (annualPlanningConfigs)
 * - 规划项目条目 (annualPlanningItems)
 * - 规划依赖关系 (annualPlanningDependencies)
 * - 变更日志 (annualPlanningUpdateLogs)
 * - 配置激活/复制/初始化
 *
 * All data persisted via Drizzle ORM (no in-memory stores).
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, and, count, sql, ne } from "drizzle-orm";
import {
  annualPlanningConfigs, annualPlanningItems, annualPlanningUpdateLogs,
  annualPlans, annualPlanningDependencies,
} from "../../drizzle/schema";

const successResponse = { success: true, message: "操作成功" };

export const annualPlanningRouter = router({
  // ==================== CRUD (annualPlans) ====================

  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(annualPlans).orderBy(desc(annualPlans.year), desc(annualPlans.id));
    return { items: rows, total: rows.length, page: 1, pageSize: 10 };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;
      const rows = await db.select().from(annualPlans).where(eq(annualPlans.id, numericId));
      return rows[0] ?? null;
    }),

  create: protectedProcedure.input(z.object({
    year: z.number().optional(),
    type: z.string().optional(),
    departmentId: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    revenueTarget: z.number().optional(),
    profitTarget: z.number().optional(),
    customerTarget: z.number().optional(),
    investmentBudget: z.number().optional(),
    hiringBudget: z.number().optional(),
    trainingBudget: z.number().optional(),
    keyInitiatives: z.union([z.string(), z.array(z.string())]).optional(),
    risksAndChallenges: z.union([z.string(), z.array(z.string())]).optional(),
    status: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    await db.insert(annualPlans).values({
      year: input.year ?? new Date().getFullYear(),
      type: input.type ?? "company",
      departmentId: input.departmentId,
      name: input.name,
      description: input.description,
      revenueTarget: input.revenueTarget,
      profitTarget: input.profitTarget,
      customerTarget: input.customerTarget,
      investmentBudget: input.investmentBudget,
      hiringBudget: input.hiringBudget,
      trainingBudget: input.trainingBudget,
      keyInitiatives: typeof input.keyInitiatives === 'string' ? input.keyInitiatives : JSON.stringify(input.keyInitiatives),
      risksAndChallenges: typeof input.risksAndChallenges === 'string' ? input.risksAndChallenges : JSON.stringify(input.risksAndChallenges),
      status: input.status ?? "draft",
      creatorId: ctx.user.id,
    } as any);
    return successResponse;
  }),

  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    year: z.number().optional(),
    type: z.string().optional(),
    departmentId: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    revenueTarget: z.number().optional(),
    profitTarget: z.number().optional(),
    customerTarget: z.number().optional(),
    investmentBudget: z.number().optional(),
    hiringBudget: z.number().optional(),
    trainingBudget: z.number().optional(),
    keyInitiatives: z.union([z.string(), z.array(z.string())]).optional(),
    risksAndChallenges: z.union([z.string(), z.array(z.string())]).optional(),
    status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return successResponse;
    const { id: _id, ...data } = input;
    if (data.keyInitiatives && typeof data.keyInitiatives !== 'string') data.keyInitiatives = JSON.stringify(data.keyInitiatives);
    if (data.risksAndChallenges && typeof data.risksAndChallenges !== 'string') data.risksAndChallenges = JSON.stringify(data.risksAndChallenges);
    await db.update(annualPlans).set({ ...data, updatedAt: new Date().toISOString() } as any).where(eq(annualPlans.id, id));
    return successResponse;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = parseInt(input.id, 10);
      if (!isNaN(id)) await db.delete(annualPlans).where(eq(annualPlans.id, id));
      return successResponse;
    }),

  // ==================== Goals (targets from annual plans) ====================

  getGoals: protectedProcedure.query(async () => {
    const db = await requireDb();
    const currentYear = new Date().getFullYear();
    const plans = await db.select().from(annualPlans).where(eq(annualPlans.year, currentYear));
    return plans.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      revenueTarget: p.revenueTarget,
      profitTarget: p.profitTarget,
      customerTarget: p.customerTarget,
      investmentBudget: p.investmentBudget,
      hiringBudget: p.hiringBudget,
      trainingBudget: p.trainingBudget,
      status: p.status,
    }));
  }),

  // ==================== Progress ====================

  getProgress: protectedProcedure.query(async () => {
    const db = await requireDb();
    // Find active config
    const [activeConfig] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.status, "active")).limit(1);
    if (!activeConfig) return { progress: 0 };

    const [totalRes] = await db.select({ count: count() }).from(annualPlanningItems).where(eq(annualPlanningItems.configId, activeConfig.id));
    const [completedRes] = await db.select({ count: count() }).from(annualPlanningItems)
      .where(and(eq(annualPlanningItems.configId, activeConfig.id), eq(annualPlanningItems.status, "completed")));

    const total = Number(totalRes?.count ?? 0);
    const completed = Number(completedRes?.count ?? 0);
    return { progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }),

  // ==================== Config Management ====================

  getConfigs: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(annualPlanningConfigs).orderBy(desc(annualPlanningConfigs.year), desc(annualPlanningConfigs.createdAt));
  }),

  getActiveConfig: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [config] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.status, "active")).limit(1);
    return { config: config ?? null };
  }),

  createConfig: protectedProcedure.input(z.object({
    year: z.number().optional(),
    version: z.string().optional(),
    versionName: z.string().optional(),
    status: z.string().optional(),
    basedOnId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const result = await db.insert(annualPlanningConfigs).values({
      year: input.year ?? new Date().getFullYear(),
      version: input.version ?? "V1.0",
      versionName: input.versionName ?? `${input.year ?? new Date().getFullYear()} Annual Plan`,
      status: input.status ?? "draft",
      basedOnId: input.basedOnId,
      creatorId: ctx.user.id,
      notes: input.notes,
    } as any).returning();
    return { success: true, message: "Config created", id: result[0]?.id };
  }),

  activateConfig: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    configId: z.union([z.string(), z.number()]).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const configId = Number(input.id ?? input.configId);
    if (!configId) return successResponse;

    const [config] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, configId));
    if (!config) return { success: false, message: "Config not found" };

    await db.transaction(async (tx) => {
      // Deactivate all other configs for the same year
      await tx.update(annualPlanningConfigs)
        .set({ status: "draft", updatedAt: new Date().toISOString() })
        .where(and(eq(annualPlanningConfigs.year, config.year), ne(annualPlanningConfigs.id, configId)));

      // Activate this config
      await tx.update(annualPlanningConfigs)
        .set({ status: "active", effectiveDate: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(annualPlanningConfigs.id, configId));

      // Log the activation
      await tx.insert(annualPlanningUpdateLogs).values({
        configId,
        updateType: "update",
        description: `Config ${config.versionName} activated`,
        beforeData: JSON.stringify({ status: config.status }),
        afterData: JSON.stringify({ status: "active" }),
        operatorId: ctx.user.id,
      });
    });

    return successResponse;
  }),

  copyToNewYear: protectedProcedure.input(z.object({
    sourceConfigId: z.union([z.string(), z.number()]).optional(),
    configId: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    targetYear: z.number().optional(),
    year: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const sourceConfigId = Number(input.sourceConfigId ?? input.configId ?? input.id);
    const targetYear = Number(input.targetYear ?? input.year ?? new Date().getFullYear() + 1);

    if (!sourceConfigId) return { success: false, message: "Source config ID required" };

    const [sourceConfig] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, sourceConfigId));
    if (!sourceConfig) return { success: false, message: "Source config not found" };

    await db.transaction(async (tx) => {
      // Create new config
      const [newConfig] = await tx.insert(annualPlanningConfigs).values({
        year: targetYear,
        version: "V1.0",
        versionName: `${targetYear} Annual Plan (copied from ${sourceConfig.versionName})`,
        status: "draft",
        basedOnId: sourceConfigId,
        creatorId: ctx.user.id,
        notes: `Copied from ${sourceConfig.year} ${sourceConfig.versionName}`,
      }).returning();

      // Copy items
      const sourceItems = await tx.select().from(annualPlanningItems).where(eq(annualPlanningItems.configId, sourceConfigId));
      for (const item of sourceItems) {
        await tx.insert(annualPlanningItems).values({
          configId: newConfig.id,
          category: item.category,
          name: item.name,
          description: item.description,
          tasks: item.tasks,
          frequency: item.frequency,
          responsibleUserId: item.responsibleUserId,
          responsibleUserName: item.responsibleUserName,
          participantIds: item.participantIds,
          status: "pending",
          sortOrder: item.sortOrder,
          isTemplate: item.isTemplate,
        });
      }

      // Log the copy
      await tx.insert(annualPlanningUpdateLogs).values({
        configId: newConfig.id,
        updateType: "create",
        description: `Copied ${sourceItems.length} items from config #${sourceConfigId} (${sourceConfig.year}) to ${targetYear}`,
        operatorId: ctx.user.id,
      });
    });

    return successResponse;
  }),

  // ==================== Items ====================

  getItems: protectedProcedure.query(async () => {
    const db = await requireDb();
    // Try to use active config, else return all
    const [activeConfig] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.status, "active")).limit(1);
    if (activeConfig) {
      return db.select().from(annualPlanningItems).where(eq(annualPlanningItems.configId, activeConfig.id)).orderBy(annualPlanningItems.sortOrder);
    }
    return db.select().from(annualPlanningItems).orderBy(desc(annualPlanningItems.createdAt));
  }),

  createItem: protectedProcedure.input(z.object({
    configId: z.number().optional(),
    category: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tasks: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),
    frequency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    weekNumber: z.number().optional(),
    month: z.number().optional(),
    responsibleUserId: z.number().optional(),
    responsibleUserName: z.string().optional(),
    participantIds: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
    status: z.string().optional(),
    sortOrder: z.number().optional(),
    operatorId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const configId = Number(input.configId);
    if (!configId) {
      // Use active config
      const [activeConfig] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.status, "active")).limit(1);
      if (!activeConfig) return { success: false, message: "No active config found" };
      input.configId = activeConfig.id;
    }

    await db.insert(annualPlanningItems).values({
      configId: input.configId,
      category: input.category ?? "other",
      name: input.name,
      description: input.description,
      tasks: typeof input.tasks === 'string' ? input.tasks : JSON.stringify(input.tasks),
      frequency: input.frequency ?? "once",
      startDate: input.startDate,
      endDate: input.endDate,
      weekNumber: input.weekNumber,
      month: input.month,
      responsibleUserId: input.responsibleUserId,
      responsibleUserName: input.responsibleUserName,
      participantIds: input.participantIds ? (typeof input.participantIds === 'string' ? input.participantIds : JSON.stringify(input.participantIds)) : null,
      status: input.status ?? "pending",
      sortOrder: input.sortOrder ?? 0,
    } as any);

    // Log the creation
    await db.insert(annualPlanningUpdateLogs).values({
      configId: input.configId,
      updateType: "create",
      description: `Created item: ${input.name}`,
      afterData: JSON.stringify(input),
      operatorId: input.operatorId ?? 1,
    });

    return successResponse;
  }),

  updateItem: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    configId: z.number().optional(),
    category: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tasks: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),
    frequency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    weekNumber: z.number().optional(),
    month: z.number().optional(),
    responsibleUserId: z.number().optional(),
    responsibleUserName: z.string().optional(),
    participantIds: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
    status: z.string().optional(),
    sortOrder: z.number().optional(),
    operatorId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return successResponse;

    // Get before state for logging
    const [before] = await db.select().from(annualPlanningItems).where(eq(annualPlanningItems.id, id));

    const { id: _id, operatorId, ...data } = input;
    if (data.tasks && typeof data.tasks !== 'string') data.tasks = JSON.stringify(data.tasks);
    if (data.participantIds && typeof data.participantIds !== 'string') data.participantIds = JSON.stringify(data.participantIds);

    await db.update(annualPlanningItems).set({ ...data, updatedAt: new Date().toISOString() } as any).where(eq(annualPlanningItems.id, id));

    // Log update
    if (before) {
      await db.insert(annualPlanningUpdateLogs).values({
        configId: before.configId,
        updateType: "update",
        description: `Updated item: ${before.name}`,
        beforeData: JSON.stringify(before),
        afterData: JSON.stringify(data),
        operatorId: operatorId ?? 1,
      });
    }

    return successResponse;
  }),

  // ==================== Logs ====================

  getUpdateLogs: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(annualPlanningUpdateLogs).orderBy(desc(annualPlanningUpdateLogs.createdAt)).limit(200);
  }),

  // ==================== Seed Sample Data ====================

  initSampleData: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Check if data exists
    const [existing] = await db.select({ count: count() }).from(annualPlanningConfigs);
    if (Number(existing?.count ?? 0) > 0) return { success: true, message: "Data already exists", created: 0 };

    const currentYear = new Date().getFullYear();

    // Create config
    const [config] = await db.insert(annualPlanningConfigs).values({
      year: currentYear,
      version: "V1.0",
      versionName: `${currentYear} 年度经营计划`,
      status: "active",
      effectiveDate: new Date().toISOString(),
      creatorId: 1,
      notes: "Sample data for development",
    }).returning();

    // Create items
    const items = [
      { configId: config.id, category: "sales" as any, name: "Q1 销售目标达成", description: "完成Q1销售额 500万", frequency: "quarterly" as any, month: 3, sortOrder: 1 },
      { configId: config.id, category: "production" as any, name: "新产线投产", description: "清洗线新产线调试并投产", frequency: "once" as any, month: 6, sortOrder: 2 },
      { configId: config.id, category: "rd" as any, name: "新产品研发", description: "完成2款新型清洗设备研发", frequency: "once" as any, month: 9, sortOrder: 3 },
      { configId: config.id, category: "hr" as any, name: "年度培训计划", description: "完成全员质量管理培训", frequency: "quarterly" as any, month: 12, sortOrder: 4 },
      { configId: config.id, category: "finance" as any, name: "成本优化", description: "整体成本降低5%", frequency: "monthly" as any, sortOrder: 5 },
    ];

    for (const item of items) {
      await db.insert(annualPlanningItems).values({ ...item, status: "pending" });
    }

    // Create annual plan
    await db.insert(annualPlans).values({
      year: currentYear,
      type: "company",
      name: `${currentYear} 年度经营计划`,
      description: "公司级年度经营目标和关键举措",
      revenueTarget: 20000000,
      profitTarget: 4000000,
      customerTarget: 50,
      investmentBudget: 3000000,
      hiringBudget: 10,
      trainingBudget: 200000,
      keyInitiatives: JSON.stringify(["新产线投产", "海外市场拓展", "数字化转型"]),
      risksAndChallenges: JSON.stringify(["原材料价格波动", "人才招聘困难", "国际贸易风险"]),
      status: "approved",
      creatorId: 1,
    });

    // Log
    await db.insert(annualPlanningUpdateLogs).values({
      configId: config.id,
      updateType: "create",
      description: `Sample data initialized: 1 config + ${items.length} items + 1 annual plan`,
      operatorId: 1,
    });

    return { success: true, message: "Sample data created", created: items.length + 2 };
  }),
});

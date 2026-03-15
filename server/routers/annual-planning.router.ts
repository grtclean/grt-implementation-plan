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
import { jsonValue } from "@shared/validators";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
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
    const rows = await db.select().from(annualPlans).orderBy(desc(annualPlans.year), desc(annualPlans.id)).limit(1000);
    return { items: rows, total: rows.length, page: 1, pageSize: 10 };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;
      const rows = await db.select().from(annualPlans).where(eq(annualPlans.id, numericId)).limit(1000);
      return rows[0] ?? null;
    }),

  create: requirePermission('strategy:agenda:manage').input(z.object({
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

  update: requirePermission('strategy:agenda:manage').input(z.object({
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

  delete: requirePermission('strategy:agenda:manage')
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
    const plans = await db.select().from(annualPlans).where(eq(annualPlans.year, currentYear)).limit(1000);
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
    return db.select().from(annualPlanningConfigs).orderBy(desc(annualPlanningConfigs.year), desc(annualPlanningConfigs.createdAt)).limit(1000);
  }),

  getActiveConfig: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [config] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.status, "active")).limit(1);
    return { config: config ?? null };
  }),

  createConfig: requirePermission('strategy:agenda:manage').input(z.object({
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

  activateConfig: requirePermission('strategy:agenda:manage').input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    configId: z.union([z.string(), z.number()]).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const configId = Number(input.id ?? input.configId);
    if (!configId) return successResponse;

    const [config] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, configId)).limit(1000);
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

  copyToNewYear: requirePermission('strategy:agenda:manage').input(z.object({
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

    const [sourceConfig] = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, sourceConfigId)).limit(1000);
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
      const sourceItems = await tx.select().from(annualPlanningItems).where(eq(annualPlanningItems.configId, sourceConfigId)).limit(1000);
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
      return db.select().from(annualPlanningItems).where(eq(annualPlanningItems.configId, activeConfig.id)).orderBy(annualPlanningItems.sortOrder).limit(1000);
    }
    return db.select().from(annualPlanningItems).orderBy(desc(annualPlanningItems.createdAt)).limit(1000);
  }),

  createItem: requirePermission('strategy:agenda:manage').input(z.object({
    configId: z.number().optional(),
    category: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tasks: jsonValue.optional(),
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

  updateItem: requirePermission('strategy:agenda:manage').input(z.object({
    id: z.union([z.string(), z.number()]),
    configId: z.number().optional(),
    category: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tasks: jsonValue.optional(),
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
    const [before] = await db.select().from(annualPlanningItems).where(eq(annualPlanningItems.id, id)).limit(1000);

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

  deleteItem: requirePermission('strategy:agenda:manage')
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = Number(input.id);
      if (!id) return successResponse;

      // Get before state for logging
      const [before] = await db.select().from(annualPlanningItems).where(eq(annualPlanningItems.id, id)).limit(1);

      await db.delete(annualPlanningItems).where(eq(annualPlanningItems.id, id));

      if (before) {
        await db.insert(annualPlanningUpdateLogs).values({
          configId: before.configId,
          updateType: "delete",
          description: `Deleted item: ${before.name}`,
          beforeData: JSON.stringify(before),
          operatorId: 1,
        });
      }

      return successResponse;
    }),

  // ==================== Logs ====================

  getUpdateLogs: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(annualPlanningUpdateLogs).orderBy(desc(annualPlanningUpdateLogs.createdAt)).limit(200);
  }),

  // ==================== KPI Persistence (沙盘专用) ====================

  /** Save KPIs — batch upsert into annualPlanningItems with category='kpi' */
  saveKPIs: requirePermission('strategy:agenda:manage').input(z.object({
    year: z.number(),
    kpis: z.array(z.object({
      id: z.union([z.string(), z.number()]).optional(),
      name: z.string(),
      category: z.string(),
      target: z.number(),
      unit: z.string(),
      owner: z.string().optional(),
      description: z.string().optional(),
      calculationMethod: z.string().optional(),
      dataSource: z.string().optional(),
      reviewFrequency: z.string().optional(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();

    // Ensure an active config exists for this year
    let [activeConfig] = await db.select().from(annualPlanningConfigs)
      .where(and(eq(annualPlanningConfigs.year, input.year), eq(annualPlanningConfigs.status, "active"))).limit(1);

    if (!activeConfig) {
      const [newConfig] = await db.insert(annualPlanningConfigs).values({
        year: input.year,
        version: "V1.0",
        versionName: `${input.year} 年度KPI配置`,
        status: "active",
        effectiveDate: new Date().toISOString(),
        creatorId: ctx.user.id,
        notes: "Auto-created for KPI input",
      }).returning();
      activeConfig = newConfig;
    }

    const configId = activeConfig.id;

    // Delete existing KPI items for this config, then re-insert
    await db.delete(annualPlanningItems)
      .where(and(eq(annualPlanningItems.configId, configId), eq(annualPlanningItems.category, "kpi" as any)));

    for (let i = 0; i < input.kpis.length; i++) {
      const kpi = input.kpis[i];
      await db.insert(annualPlanningItems).values({
        configId,
        category: "kpi" as any,
        name: kpi.name,
        description: kpi.description ?? "",
        tasks: JSON.stringify({
          kpiCategory: kpi.category,
          target: kpi.target,
          unit: kpi.unit,
          owner: kpi.owner,
          calculationMethod: kpi.calculationMethod,
          dataSource: kpi.dataSource,
          reviewFrequency: kpi.reviewFrequency,
        }),
        frequency: (kpi.reviewFrequency?.toLowerCase() ?? "monthly") as any,
        responsibleUserName: kpi.owner,
        status: "pending",
        sortOrder: i + 1,
      } as any);
    }

    // Audit log
    await db.insert(annualPlanningUpdateLogs).values({
      configId,
      updateType: "update",
      description: `Saved ${input.kpis.length} KPIs for ${input.year}`,
      afterData: JSON.stringify(input.kpis),
      operatorId: ctx.user.id,
    });

    return { success: true, message: `${input.kpis.length} KPIs saved`, configId };
  }),

  /** Load KPIs — retrieve KPI items for a year */
  getKPIs: protectedProcedure.input(z.object({
    year: z.number(),
  })).query(async ({ input }) => {
    const db = await requireDb();

    const [activeConfig] = await db.select().from(annualPlanningConfigs)
      .where(and(eq(annualPlanningConfigs.year, input.year), eq(annualPlanningConfigs.status, "active"))).limit(1);

    if (!activeConfig) return { kpis: [], configId: null };

    const items = await db.select().from(annualPlanningItems)
      .where(and(eq(annualPlanningItems.configId, activeConfig.id), eq(annualPlanningItems.category, "kpi" as any)))
      .orderBy(annualPlanningItems.sortOrder).limit(500);

    const kpis = items.map((item) => {
      let details: Record<string, unknown> = {};
      try { details = typeof item.tasks === 'string' ? JSON.parse(item.tasks) : (item.tasks ?? {}); } catch { /* ignore */ }
      return {
        id: String(item.id),
        name: item.name ?? "",
        category: (details.kpiCategory as string) ?? "Revenue",
        target: (details.target as number) ?? 0,
        unit: (details.unit as string) ?? "",
        owner: (details.owner as string) ?? "",
        description: item.description ?? "",
        calculationMethod: (details.calculationMethod as string) ?? "",
        dataSource: (details.dataSource as string) ?? "System",
        reviewFrequency: (details.reviewFrequency as string) ?? "Monthly",
      };
    });

    return { kpis, configId: activeConfig.id };
  }),

  /** AI KPI Analysis — rule-based deep analysis engine */
  analyzeKPIs: protectedProcedure.input(z.object({
    year: z.number(),
    kpis: z.array(z.object({
      name: z.string(),
      category: z.string(),
      target: z.number(),
      unit: z.string(),
      owner: z.string().optional(),
      description: z.string().optional(),
      calculationMethod: z.string().optional(),
      dataSource: z.string().optional(),
      reviewFrequency: z.string().optional(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const { year, kpis } = input;

    // ── Category distribution analysis ──
    const categoryCounts: Record<string, number> = {};
    for (const k of kpis) {
      categoryCounts[k.category] = (categoryCounts[k.category] ?? 0) + 1;
    }
    const categoryDistribution = Object.entries(categoryCounts).map(([cat, cnt]) => ({
      category: cat,
      count: cnt,
      percentage: Math.round((cnt / kpis.length) * 100),
    }));

    // ── Gap analysis ──
    const expectedCategories = ["Revenue", "Cost", "Quality", "Delivery", "Customer", "Employee", "Innovation"];
    const missingCategories = expectedCategories.filter(c => !categoryCounts[c]);
    const overloadedCategories = Object.entries(categoryCounts).filter(([_, cnt]) => cnt > kpis.length * 0.4).map(([cat]) => cat);

    // ── Risk flags ──
    const risks: Array<{ level: "high" | "medium" | "low"; message: string; kpiName?: string }> = [];

    // Check for KPIs without owners
    const unownedKPIs = kpis.filter(k => !k.owner?.trim());
    if (unownedKPIs.length > 0) {
      risks.push({
        level: "high",
        message: `${unownedKPIs.length} KPI(s) have no assigned owner — accountability gap`,
        kpiName: unownedKPIs.map(k => k.name).join(", "),
      });
    }

    // Check for KPIs without calculation method
    const noCalcMethod = kpis.filter(k => !k.calculationMethod?.trim());
    if (noCalcMethod.length > 0) {
      risks.push({
        level: "medium",
        message: `${noCalcMethod.length} KPI(s) lack calculation method — may cause measurement disputes`,
      });
    }

    // Check for missing categories
    if (missingCategories.length > 0) {
      risks.push({
        level: missingCategories.length >= 3 ? "high" : "medium",
        message: `Missing KPI categories: ${missingCategories.join(", ")} — blind spots in strategic coverage`,
      });
    }

    // Check for excessive concentration in one category
    if (overloadedCategories.length > 0) {
      risks.push({
        level: "medium",
        message: `Category imbalance: ${overloadedCategories.join(", ")} has >40% of all KPIs — may neglect other dimensions`,
      });
    }

    // Check for all-manual data sources
    const manualOnly = kpis.filter(k => k.dataSource === "Manual");
    if (manualOnly.length > kpis.length * 0.5) {
      risks.push({
        level: "medium",
        message: `${manualOnly.length}/${kpis.length} KPIs rely on manual data entry — high risk of data quality issues`,
      });
    }

    // Check for annual-only review KPIs
    const annualReview = kpis.filter(k => k.reviewFrequency === "Annual");
    if (annualReview.length > 0) {
      risks.push({
        level: "low",
        message: `${annualReview.length} KPI(s) reviewed annually only — consider more frequent checkpoints for early warning`,
      });
    }

    // ── Cross-KPI correlations ──
    const correlations: Array<{ kpi1: string; kpi2: string; relationship: string }> = [];
    const revenueKPIs = kpis.filter(k => k.category === "Revenue");
    const costKPIs = kpis.filter(k => k.category === "Cost");
    const qualityKPIs = kpis.filter(k => k.category === "Quality");
    const customerKPIs = kpis.filter(k => k.category === "Customer");
    const employeeKPIs = kpis.filter(k => k.category === "Employee");

    if (revenueKPIs.length > 0 && costKPIs.length > 0) {
      correlations.push({
        kpi1: revenueKPIs[0].name,
        kpi2: costKPIs[0].name,
        relationship: "Revenue growth must be balanced with cost control — verify margin assumptions",
      });
    }
    if (qualityKPIs.length > 0 && customerKPIs.length > 0) {
      correlations.push({
        kpi1: qualityKPIs[0].name,
        kpi2: customerKPIs[0].name,
        relationship: "Quality improvements should drive customer satisfaction — validate causal chain",
      });
    }
    if (employeeKPIs.length > 0 && revenueKPIs.length > 0) {
      correlations.push({
        kpi1: employeeKPIs[0].name,
        kpi2: revenueKPIs[0].name,
        relationship: "Employee development underpins revenue targets — ensure training budget aligns",
      });
    }

    // ── Recommendations ──
    const recommendations: string[] = [];
    if (missingCategories.includes("Innovation")) {
      recommendations.push("Add innovation KPIs (e.g., new product pipeline, R&D investment ratio) to drive long-term competitiveness");
    }
    if (missingCategories.includes("Employee")) {
      recommendations.push("Add employee engagement/retention KPIs — talent is GRT's core asset in specialized equipment manufacturing");
    }
    if (kpis.length < 5) {
      recommendations.push("Consider adding more KPIs — fewer than 5 may miss critical business dimensions");
    }
    if (kpis.length > 15) {
      recommendations.push("Consider consolidating — more than 15 KPIs dilute focus. Prioritize the top 10 by strategic impact");
    }
    if (unownedKPIs.length > 0) {
      recommendations.push("Assign owners to all KPIs before approval — accountability is the #1 driver of execution");
    }
    if (noCalcMethod.length > kpis.length * 0.3) {
      recommendations.push("Define calculation methods for all KPIs to avoid end-of-year disputes");
    }
    // GRT-specific
    recommendations.push(`Review alignment with GRT ${year} strategic priorities: overseas market expansion, digital transformation, and new product line commissioning`);

    // ── Benchmark comparison (GRT industry context) ──
    const benchmarks = [
      { metric: "KPI count", yourValue: kpis.length, industryAvg: 8, status: kpis.length >= 5 && kpis.length <= 12 ? "good" : "warning" },
      { metric: "Category coverage", yourValue: Object.keys(categoryCounts).length, industryAvg: 5, status: Object.keys(categoryCounts).length >= 4 ? "good" : "warning" },
      { metric: "System-sourced %", yourValue: Math.round(kpis.filter(k => k.dataSource === "System").length / Math.max(kpis.length, 1) * 100), industryAvg: 60, status: kpis.filter(k => k.dataSource === "System").length >= kpis.length * 0.5 ? "good" : "warning" },
      { metric: "Owner assigned %", yourValue: Math.round(kpis.filter(k => k.owner?.trim()).length / Math.max(kpis.length, 1) * 100), industryAvg: 100, status: unownedKPIs.length === 0 ? "good" : "warning" },
    ];

    // ── Overall score ──
    let score = 100;
    score -= missingCategories.length * 8;
    score -= unownedKPIs.length * 10;
    score -= noCalcMethod.length * 5;
    score -= overloadedCategories.length * 10;
    if (kpis.length < 5) score -= 15;
    if (kpis.length > 15) score -= 10;
    score = Math.max(0, Math.min(100, score));

    const overallGrade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";

    // ── Emit event ──
    try {
      const { eventBus, SANDBOX_EVENTS } = await import("../events/event-bus");
      await eventBus.publish({
        type: "planning.kpi.analyzed",
        sourceModule: "annual-planning",
        targetModules: ["performance-points", "payroll-attendance"],
        payload: { year, kpiCount: kpis.length, score, grade: overallGrade },
        userId: ctx.user.id,
        timestamp: new Date(),
      });
    } catch { /* event bus optional */ }

    return {
      success: true,
      year,
      totalKPIs: kpis.length,
      score,
      grade: overallGrade,
      categoryDistribution,
      missingCategories,
      risks,
      correlations,
      recommendations,
      benchmarks,
      analyzedAt: new Date().toISOString(),
    };
  }),

  /** Approve KPIs — mark config as approved + emit event bus */
  approveKPIs: requirePermission('strategy:agenda:manage').input(z.object({
    year: z.number(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [config] = await db.select().from(annualPlanningConfigs)
      .where(and(eq(annualPlanningConfigs.year, input.year), eq(annualPlanningConfigs.status, "active"))).limit(1);
    if (!config) return { success: false, message: "No active config found" };

    // Mark all KPI items as approved
    await db.update(annualPlanningItems)
      .set({ status: "completed" } as any)
      .where(and(eq(annualPlanningItems.configId, config.id), eq(annualPlanningItems.category, "kpi" as any)));

    // Log
    await db.insert(annualPlanningUpdateLogs).values({
      configId: config.id,
      updateType: "update",
      description: `${input.year} KPIs approved by user ${ctx.user.id}`,
      operatorId: ctx.user.id,
    });

    // Emit event bus
    try {
      const { eventBus, SANDBOX_EVENTS } = await import("../events/event-bus");
      await eventBus.publish({
        type: SANDBOX_EVENTS.PLANNING_BUDGET_APPROVED,
        sourceModule: "annual-planning",
        targetModules: ["payroll-attendance", "project-lifecycle"],
        payload: { year: input.year, configId: config.id, approvedBy: ctx.user.id },
        userId: ctx.user.id,
        timestamp: new Date(),
      });
    } catch { /* event bus optional */ }

    return { success: true, message: `${input.year} KPIs approved` };
  }),

  // ==================== Seed Sample Data ====================

  initSampleData: requirePermission('strategy:agenda:manage').mutation(async () => {
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

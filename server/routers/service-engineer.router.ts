/**
 * 售后工程师工作台 Router
 *
 * 聚合视图：我的客户项目 · 服务计划执行 · 设备服务操作 · 下次建议 · 共享设置 · 自动汇报
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, asc, sql, lte, gte, isNull, or, inArray } from "drizzle-orm";
import {
  customerEquipment,
  customerPmPlans,
  customerRepairRecords,
  customerRemoteSessions,
  customerSpareParts,
  serviceShareSettings,
  serviceAutoReports,
  servicePlanExecutions,
} from "../../drizzle/customer-equipment-schema";
import { afterSalesClients, afterSalesEquipments, afterSalesServiceLogs } from "../../drizzle/schema";

// ── 我的客户项目 ──
const myProjectsRouter = router({
  /** 当前工程师关联的客户列表（按最近服务时间排序） */
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const engineerId = ctx.user!.id;
      // 获取工程师关联的所有服务记录中的客户
      const logs = await db
        .select({
          clientId: afterSalesServiceLogs.clientId,
          clientName: afterSalesClients.name,
          tier: afterSalesClients.tier,
          contactPerson: afterSalesClients.contactPerson,
          contactPhone: afterSalesClients.contactPhone,
          region: afterSalesClients.region,
          industry: afterSalesClients.industry,
          slaLevel: afterSalesClients.slaLevel,
          lastServiceDate: sql<string>`MAX(${afterSalesServiceLogs.serviceDate})`,
          totalLogs: sql<number>`COUNT(${afterSalesServiceLogs.id})`,
          openLogs: sql<number>`COUNT(CASE WHEN ${afterSalesServiceLogs.status} != 'Completed' THEN 1 END)`,
        })
        .from(afterSalesServiceLogs)
        .innerJoin(afterSalesClients, eq(afterSalesServiceLogs.clientId, afterSalesClients.id))
        .where(eq(afterSalesServiceLogs.assignedEngineerId, engineerId))
        .groupBy(
          afterSalesServiceLogs.clientId,
          afterSalesClients.name,
          afterSalesClients.tier,
          afterSalesClients.contactPerson,
          afterSalesClients.contactPhone,
          afterSalesClients.region,
          afterSalesClients.industry,
          afterSalesClients.slaLevel,
        )
        .orderBy(desc(sql`MAX(${afterSalesServiceLogs.serviceDate})`))
        .limit(50);
      return logs;
    }),

  /** 某客户下的设备列表 */
  equipmentsByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerEquipment)
        .where(eq(customerEquipment.customerId, input.clientId))
        .orderBy(desc(customerEquipment.updatedAt))
        .limit(100);
    }),

  /** 工程师概览统计 */
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const engineerId = ctx.user!.id;
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000);

    const [logStats] = await db
      .select({
        totalClients: sql<number>`COUNT(DISTINCT ${afterSalesServiceLogs.clientId})`,
        openTickets: sql<number>`COUNT(CASE WHEN ${afterSalesServiceLogs.status} != 'Completed' THEN 1 END)`,
        completedThisMonth: sql<number>`COUNT(CASE WHEN ${afterSalesServiceLogs.status} = 'Completed' AND ${afterSalesServiceLogs.serviceDate} >= DATE_TRUNC('month', NOW()) THEN 1 END)`,
        avgRating: sql<number>`AVG(${afterSalesServiceLogs.satisfactionRating})`,
      })
      .from(afterSalesServiceLogs)
      .where(eq(afterSalesServiceLogs.assignedEngineerId, engineerId));

    // 即将到期的保养计划数
    const [pmStats] = await db
      .select({
        upcomingPm: sql<number>`COUNT(*)`,
      })
      .from(servicePlanExecutions)
      .where(
        and(
          eq(servicePlanExecutions.engineerId, engineerId),
          eq(servicePlanExecutions.status, "planned"),
          lte(servicePlanExecutions.plannedDate, thirtyDaysLater),
        ),
      );

    return {
      totalClients: logStats?.totalClients ?? 0,
      openTickets: logStats?.openTickets ?? 0,
      completedThisMonth: logStats?.completedThisMonth ?? 0,
      avgRating: logStats?.avgRating ? Number(logStats.avgRating).toFixed(1) : "N/A",
      upcomingPm: pmStats?.upcomingPm ?? 0,
    };
  }),
});

// ── 服务计划执行 ──
const planExecutionRouter = router({
  /** 我的待执行计划 */
  listMine: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        equipmentId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }).optional().default({ page: 1, pageSize: 20 }),
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [eq(servicePlanExecutions.engineerId, ctx.user!.id)];
      if (input.status) conditions.push(eq(servicePlanExecutions.status, input.status));
      if (input.equipmentId) conditions.push(eq(servicePlanExecutions.equipmentId, input.equipmentId));

      const rows = await db
        .select()
        .from(servicePlanExecutions)
        .where(and(...conditions))
        .orderBy(asc(servicePlanExecutions.plannedDate))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      return rows;
    }),

  /** 创建服务计划 */
  create: requirePermission("service:tickets:manage")
    .input(
      z.object({
        equipmentId: z.number(),
        pmPlanId: z.number().optional(),
        serviceType: z.string(),
        plannedDate: z.string().optional(),
        engineerId: z.number().optional(),
        engineerName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(servicePlanExecutions)
        .values({
          equipmentId: input.equipmentId,
          pmPlanId: input.pmPlanId,
          engineerId: input.engineerId ?? ctx.user!.id,
          engineerName: input.engineerName ?? ctx.user!.name,
          serviceType: input.serviceType,
          plannedDate: input.plannedDate ? new Date(input.plannedDate) : undefined,
          status: "planned",
        })
        .returning();
      return row;
    }),

  /** 开始执行 */
  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(servicePlanExecutions)
        .set({ status: "in_progress", actualStartAt: new Date(), updatedAt: new Date() })
        .where(eq(servicePlanExecutions.id, input.id))
        .returning();
      return row;
    }),

  /** 完成计划 — 填写完成报告 */
  complete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        completionNotes: z.string().optional(),
        checklistResultJson: z.any().optional(),
        issuesFound: z.string().optional(),
        nextServiceRecommendation: z.string().optional(),
        nextRecommendedDate: z.string().optional(),
        partsUsedJson: z.any().optional(),
        photosJson: z.any().optional(),
        customerSignedBy: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(servicePlanExecutions)
        .set({
          status: "completed",
          actualEndAt: new Date(),
          completionNotes: data.completionNotes,
          checklistResultJson: data.checklistResultJson,
          issuesFound: data.issuesFound,
          nextServiceRecommendation: data.nextServiceRecommendation,
          nextRecommendedDate: data.nextRecommendedDate ? new Date(data.nextRecommendedDate) : undefined,
          partsUsedJson: data.partsUsedJson,
          photosJson: data.photosJson,
          customerSignedBy: data.customerSignedBy,
          customerSignedAt: data.customerSignedBy ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(servicePlanExecutions.id, id))
        .returning();
      return row;
    }),

  /** 更新进度 (部分填写) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        completionNotes: z.string().optional(),
        checklistResultJson: z.any().optional(),
        issuesFound: z.string().optional(),
        nextServiceRecommendation: z.string().optional(),
        nextRecommendedDate: z.string().optional(),
        partsUsedJson: z.any().optional(),
        photosJson: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(servicePlanExecutions)
        .set({
          ...data,
          nextRecommendedDate: data.nextRecommendedDate ? new Date(data.nextRecommendedDate) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(servicePlanExecutions.id, id))
        .returning();
      return row;
    }),
});

// ── 设备服务操作 (维修) ──
const equipmentServiceRouter = router({
  /** 设备维修记录 */
  repairHistory: protectedProcedure
    .input(z.object({ equipmentId: z.number(), limit: z.number().optional().default(20) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerRepairRecords)
        .where(eq(customerRepairRecords.equipmentId, input.equipmentId))
        .orderBy(desc(customerRepairRecords.reportedAt))
        .limit(input.limit);
    }),

  /** 创建维修记录 */
  createRepair: requirePermission("service:tickets:manage")
    .input(
      z.object({
        equipmentId: z.number(),
        faultDescription: z.string(),
        faultCategory: z.string().optional(),
        severity: z.string().optional(),
        executorType: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = `REP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const [row] = await db
        .insert(customerRepairRecords)
        .values({
          equipmentId: input.equipmentId,
          repairCode: code,
          faultDescription: input.faultDescription,
          faultCategory: input.faultCategory ?? "other",
          severity: input.severity ?? "medium",
          reportedBy: ctx.user!.name ?? "unknown",
          reportedAt: new Date(),
          executor: ctx.user!.name,
          executorType: input.executorType ?? "grt_onsite",
          status: "reported",
        })
        .returning();
      return row;
    }),

  /** 完成维修 */
  completeRepair: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        rootCause: z.string().optional(),
        solution: z.string().optional(),
        preventiveMeasure: z.string().optional(),
        partsUsedJson: z.any().optional(),
        repairStepsJson: z.any().optional(),
        downtimeHours: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(customerRepairRecords)
        .set({
          ...data,
          downtimeHours: data.downtimeHours ? String(data.downtimeHours) : undefined,
          completedAt: new Date(),
          status: "completed",
        })
        .where(eq(customerRepairRecords.id, id))
        .returning();
      return row;
    }),

  /** 设备备件库存 */
  spareParts: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerSpareParts)
        .where(eq(customerSpareParts.equipmentId, input.equipmentId))
        .orderBy(asc(customerSpareParts.category))
        .limit(100);
    }),

  /** 设备健康评分 + 下次建议 */
  healthAndRecommendation: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [equipment] = await db
        .select()
        .from(customerEquipment)
        .where(eq(customerEquipment.id, input.equipmentId))
        .limit(1);

      if (!equipment) return null;

      // 最近的维修和保养记录
      const recentRepairs = await db
        .select()
        .from(customerRepairRecords)
        .where(eq(customerRepairRecords.equipmentId, input.equipmentId))
        .orderBy(desc(customerRepairRecords.reportedAt))
        .limit(3);

      const upcomingPm = await db
        .select()
        .from(customerPmPlans)
        .where(
          and(
            eq(customerPmPlans.equipmentId, input.equipmentId),
            or(eq(customerPmPlans.status, "scheduled"), eq(customerPmPlans.status, "overdue")),
          ),
        )
        .orderBy(asc(customerPmPlans.scheduledDate))
        .limit(5);

      // 基于维修历史和PM计划生成建议
      const recommendations: Array<{ type: string; message: string; priority: string; suggestedDate?: string }> = [];

      // 健康分低于85建议立即检查
      const health = Number(equipment.healthScore) || 100;
      if (health < 85) {
        recommendations.push({
          type: "inspection",
          message: `设备健康评分 ${health}，建议安排现场巡检`,
          priority: "high",
          suggestedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        });
      }

      // 过期保养
      for (const pm of upcomingPm) {
        if (pm.status === "overdue") {
          recommendations.push({
            type: "pm_overdue",
            message: `保养计划 "${pm.planName}" 已过期，请尽快安排`,
            priority: "high",
          });
        }
      }

      // 高频维修提示
      if (recentRepairs.length >= 3) {
        const categories = recentRepairs.map((r) => r.faultCategory);
        const mostCommon = categories.sort((a, b) => categories.filter((c) => c === a).length - categories.filter((c) => c === b).length).pop();
        recommendations.push({
          type: "recurring_fault",
          message: `近期维修 ${recentRepairs.length} 次，主要故障类型: ${mostCommon}，建议根因分析`,
          priority: "medium",
        });
      }

      return {
        equipment,
        healthScore: health,
        recentRepairs,
        upcomingPm,
        recommendations,
      };
    }),
});

// ── 共享设置 ──
const shareSettingsRouter = router({
  /** 获取共享人员列表 */
  list: protectedProcedure
    .input(z.object({ customerId: z.number().optional(), equipmentId: z.number().optional() }).optional().default({}))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(serviceShareSettings.isActive, true)];
      if (input.customerId) conditions.push(eq(serviceShareSettings.customerId, input.customerId));
      if (input.equipmentId) conditions.push(eq(serviceShareSettings.equipmentId, input.equipmentId));

      return db
        .select()
        .from(serviceShareSettings)
        .where(and(...conditions))
        .orderBy(desc(serviceShareSettings.createdAt))
        .limit(100);
    }),

  /** 添加共享人员 */
  add: requirePermission("service:tickets:manage")
    .input(
      z.object({
        customerId: z.number().optional(),
        equipmentId: z.number().optional(),
        sharedWithUserId: z.number(),
        sharedWithName: z.string().optional(),
        sharedWithRole: z.string().optional(),
        shareType: z.string().optional(),
        notifyChannel: z.string().optional(),
        notifyEvents: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(serviceShareSettings)
        .values({ ...input, createdBy: ctx.user!.id })
        .returning();
      return row;
    }),

  /** 移除共享 */
  remove: requirePermission("service:tickets:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(serviceShareSettings)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(serviceShareSettings.id, input.id));
      return { success: true };
    }),

  /** 获取全局默认共享人员（无客户/设备绑定） */
  getDefaults: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(serviceShareSettings)
      .where(
        and(
          eq(serviceShareSettings.isActive, true),
          isNull(serviceShareSettings.customerId),
          isNull(serviceShareSettings.equipmentId),
        ),
      )
      .limit(50);
  }),
});

// ── 自动汇报 ──
const autoReportRouter = router({
  /** 汇报配置列表 */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select()
      .from(serviceAutoReports)
      .where(eq(serviceAutoReports.createdBy, ctx.user!.id))
      .orderBy(desc(serviceAutoReports.createdAt))
      .limit(50);
  }),

  /** 创建汇报配置 */
  create: requirePermission("service:tickets:manage")
    .input(
      z.object({
        reportName: z.string(),
        groupBy: z.string().optional(),
        frequency: z.string().optional(),
        templateType: z.string().optional(),
        recipientsJson: z.any().optional(),
        filterCriteria: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(serviceAutoReports)
        .values({
          ...input,
          createdBy: ctx.user!.id,
          isActive: true,
        })
        .returning();
      return row;
    }),

  /** 更新汇报配置 */
  update: requirePermission("service:tickets:manage")
    .input(
      z.object({
        id: z.number(),
        reportName: z.string().optional(),
        groupBy: z.string().optional(),
        frequency: z.string().optional(),
        templateType: z.string().optional(),
        recipientsJson: z.any().optional(),
        filterCriteria: z.any().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(serviceAutoReports)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceAutoReports.id, id))
        .returning();
      return row;
    }),

  /** 删除汇报配置 */
  delete: requirePermission("service:tickets:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(serviceAutoReports).where(eq(serviceAutoReports.id, input.id));
      return { success: true };
    }),

  /** 立即触发汇报（预览） */
  preview: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [config] = await db
        .select()
        .from(serviceAutoReports)
        .where(eq(serviceAutoReports.id, input.id))
        .limit(1);
      if (!config) return null;

      // 根据分组维度拉取数据
      const filter = (config.filterCriteria as any) ?? {};
      const logs = await db
        .select({
          clientId: afterSalesServiceLogs.clientId,
          clientName: afterSalesClients.name,
          serviceType: afterSalesServiceLogs.serviceType,
          status: afterSalesServiceLogs.status,
          priority: afterSalesServiceLogs.priority,
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`COUNT(CASE WHEN ${afterSalesServiceLogs.status} = 'Completed' THEN 1 END)`,
        })
        .from(afterSalesServiceLogs)
        .innerJoin(afterSalesClients, eq(afterSalesServiceLogs.clientId, afterSalesClients.id))
        .groupBy(
          afterSalesServiceLogs.clientId,
          afterSalesClients.name,
          afterSalesServiceLogs.serviceType,
          afterSalesServiceLogs.status,
          afterSalesServiceLogs.priority,
        )
        .limit(100);

      return {
        config,
        generatedAt: new Date().toISOString(),
        data: logs,
      };
    }),
});

// ── 组合导出 ──
export const serviceEngineerRouter = router({
  myProjects: myProjectsRouter,
  planExecution: planExecutionRouter,
  equipmentService: equipmentServiceRouter,
  shareSettings: shareSettingsRouter,
  autoReport: autoReportRouter,
});

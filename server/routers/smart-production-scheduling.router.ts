/**
 * 智慧排程工作台 — tRPC Router
 *
 * 5 sub-routers, ~31 procedures:
 *   A: BOM工时 (8 procedures)
 *   B: 前置与物料 (6 procedures)
 *   C: 里程碑 (6 procedures)
 *   D: 智能排程 (6 procedures)
 *   E: 任务报工 (5 procedures)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  schedulingBomWorkHours,
  schedulingHistoricalBenchmarks,
  schedulingMilestoneCheckpoints,
} from "../../drizzle/smart-scheduling-schema";
import { workLogs, laborCosts } from "../../drizzle/schema";
import { eq, desc, and, sql, count, sum, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import * as svc from "../services/smart-production-scheduling.service";
import * as bmSvc from "../services/work-hours-benchmark.service";

const log = createChildLogger("smart-production-scheduling-router");

// ═══════════════════════════════════════════════════════════════
// Sub-Router A: BOM工时分解 (R1)
// ═══════════════════════════════════════════════════════════════

const bomWorkHoursRouter = router({
  /** 自动从BOM生成T1-T15工时分解 */
  generateWorkHoursFromBom: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        projectId: z.number(),
        processCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return svc.generateWorkHoursFromBom(input);
    }),

  /** 获取工时分解详情(T1-T15手风琴数据) */
  getWorkHoursBreakdown: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        processCode: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [
        eq(schedulingBomWorkHours.projectId, input.projectId),
      ];
      if (input.processCode) {
        conditions.push(eq(schedulingBomWorkHours.processCode, input.processCode));
      }
      if (input.status) {
        conditions.push(eq(schedulingBomWorkHours.status, input.status));
      }

      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(and(...conditions))
        .orderBy(schedulingBomWorkHours.processCode, schedulingBomWorkHours.sortOrder)
        .limit(500);

      // Group by processCode for accordion display
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        const key = item.processCode;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }

      return { items, grouped };
    }),

  /** 手动调整工时(±50%校验) */
  adjustWorkHours: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        id: z.number(),
        adjustedMinutes: z.number().min(1),
        adjustReason: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(eq(schedulingBomWorkHours.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work hour entry not found" });
      }

      const base = existing.baseTheoryMinutes ?? 60;
      const lower = Math.round(base * 0.5);
      const upper = Math.round(base * 1.5);

      if (input.adjustedMinutes < lower || input.adjustedMinutes > upper) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Adjusted minutes must be within ±50% of base (${lower}-${upper})`,
        });
      }

      const [updated] = await db
        .update(schedulingBomWorkHours)
        .set({
          adjustedMinutes: input.adjustedMinutes,
          adjustReason: input.adjustReason,
          adjustedBy: ctx.user!.id,
          adjustedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schedulingBomWorkHours.id, input.id))
        .returning();

      return updated;
    }),

  /** 批量确认T步骤工时 */
  batchConfirmWorkHours: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(200),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      let confirmed = 0;
      for (const id of input.ids) {
        await db
          .update(schedulingBomWorkHours)
          .set({ status: "confirmed", updatedAt: new Date().toISOString() })
          .where(eq(schedulingBomWorkHours.id, id));
        confirmed++;
      }
      return { confirmed };
    }),

  /** 项目工时汇总(理论 vs 调整) */
  getWorkHoursSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(eq(schedulingBomWorkHours.projectId, input.projectId))
        .limit(500);

      const byProcess: Record<
        string,
        { theoryMinutes: number; adjustedMinutes: number; count: number; confirmed: number }
      > = {};

      let totalTheory = 0;
      let totalAdjusted = 0;

      for (const item of items) {
        const theory = item.baseTheoryMinutes ?? 0;
        const adjusted = item.adjustedMinutes ?? theory;
        totalTheory += theory;
        totalAdjusted += adjusted;

        if (!byProcess[item.processCode]) {
          byProcess[item.processCode] = { theoryMinutes: 0, adjustedMinutes: 0, count: 0, confirmed: 0 };
        }
        byProcess[item.processCode].theoryMinutes += theory;
        byProcess[item.processCode].adjustedMinutes += adjusted;
        byProcess[item.processCode].count++;
        if (item.status === "confirmed") byProcess[item.processCode].confirmed++;
      }

      return {
        totalTheoryMinutes: totalTheory,
        totalAdjustedMinutes: totalAdjusted,
        totalTheoryHours: +(totalTheory / 60).toFixed(1),
        totalAdjustedHours: +(totalAdjusted / 60).toFixed(1),
        byProcess,
        totalItems: items.length,
      };
    }),

  /** 从SOP模板自动计算基准工时 */
  autoCalculateFromSOP: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        projectId: z.number(),
        processCode: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return svc.autoCalculateFromSOP(input.projectId, input.processCode);
    }),

  /** 从相似历史项目导入工时 */
  importHistoricalWorkHours: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        targetProjectId: z.number(),
        sourceProjectId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      return svc.importHistoricalWorkHours(input.targetProjectId, input.sourceProjectId);
    }),

  /** 当前 vs 历史均值对比 */
  getWorkHoursComparison: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(eq(schedulingBomWorkHours.projectId, input.projectId))
        .limit(500);

      // Group by process code
      const currentByProcess: Record<string, number> = {};
      for (const item of items) {
        const mins = item.adjustedMinutes ?? item.baseTheoryMinutes ?? 0;
        currentByProcess[item.processCode] =
          (currentByProcess[item.processCode] ?? 0) + mins;
      }

      // Get benchmarks
      const benchmarks = await db
        .select()
        .from(schedulingHistoricalBenchmarks)
        .limit(200);

      const benchmarkByProcess: Record<string, { avgHours: number; p50Hours: number; p80Hours: number }> = {};
      for (const b of benchmarks) {
        benchmarkByProcess[b.processCode] = {
          avgHours: Number(b.avgHours) || 0,
          p50Hours: Number(b.p50Hours) || 0,
          p80Hours: Number(b.p80Hours) || 0,
        };
      }

      const comparison = Object.entries(currentByProcess).map(([pc, mins]) => ({
        processCode: pc,
        currentHours: +(mins / 60).toFixed(1),
        historicalAvgHours: benchmarkByProcess[pc]?.avgHours ?? null,
        historicalP50Hours: benchmarkByProcess[pc]?.p50Hours ?? null,
        historicalP80Hours: benchmarkByProcess[pc]?.p80Hours ?? null,
        delta: benchmarkByProcess[pc]
          ? +((mins / 60 - benchmarkByProcess[pc].avgHours)).toFixed(1)
          : null,
      }));

      return { comparison };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Sub-Router B: 前置与物料 (R5)
// ═══════════════════════════════════════════════════════════════

const resourceMaterialRouter = router({
  /** 按工序查询可用资源(人/机/工具) */
  getResourceAvailability: protectedProcedure
    .input(
      z.object({
        processCode: z.string(),
        date: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Resource data comes from scheduling_resources (managed via scheduling.router.ts)
      // Return placeholder structure — real data populated when scheduling_resources table has data
      return {
        processCode: input.processCode,
        workers: [] as Array<{ name: string; skill: string; utilization: number }>,
        equipment: [] as Array<{ name: string; capacityHoursPerDay: number; utilization: number }>,
        tools: [] as string[],
      };
    }),

  /** 前置任务完成状态 */
  getTaskPredecessors: protectedProcedure
    .input(z.object({ workHourId: z.number() }))
    .query(async ({ input }) => {
      return svc.resolveTaskPredecessors(input.workHourId);
    }),

  /** 物料齐套+PO到货联查 */
  getMaterialReadinessWithPO: protectedProcedure
    .input(z.object({ bomStepId: z.number() }))
    .query(async ({ input }) => {
      return svc.resolveMaterialReadinessWithPO(input.bomStepId);
    }),

  /** 项目排程约束列表 */
  getSchedulingConstraints: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // Return work-hour-level constraints for the project
      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(eq(schedulingBomWorkHours.projectId, input.projectId))
        .limit(500);

      const constraints = items
        .filter((i) => i.predecessorStepIds || i.equipmentRequired || i.skillLevelRequired)
        .map((i) => ({
          workHourId: i.id,
          processCode: i.processCode,
          predecessorStepIds: i.predecessorStepIds,
          equipmentRequired: i.equipmentRequired,
          skillLevelRequired: i.skillLevelRequired,
          materialReady: i.materialReady,
          materialEarliestAvailable: i.materialEarliestAvailable,
        }));

      return { constraints };
    }),

  /** 跨项目资源负荷概览 */
  getCapacityUtilization: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async () => {
      const db = await requireDb();
      // Aggregate scheduled work hours across all active projects
      const items = await db
        .select({
          processCode: schedulingBomWorkHours.processCode,
          totalMinutes: sql<number>`SUM(COALESCE(${schedulingBomWorkHours.adjustedMinutes}, ${schedulingBomWorkHours.baseTheoryMinutes}, 0))`,
          itemCount: count(),
        })
        .from(schedulingBomWorkHours)
        .where(
          sql`${schedulingBomWorkHours.status} IN ('confirmed', 'scheduled', 'in_progress')`,
        )
        .groupBy(schedulingBomWorkHours.processCode)
        .limit(20);

      return {
        utilization: items.map((i) => ({
          processCode: i.processCode,
          totalHours: +(Number(i.totalMinutes) / 60).toFixed(1),
          taskCount: Number(i.itemCount),
        })),
      };
    }),

  /** 前置+物料+资源综合验证 */
  validateScheduleFeasibility: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        processCode: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return svc.validateScheduleFeasibility(input.projectId, input.processCode);
    }),
});

// ═══════════════════════════════════════════════════════════════
// Sub-Router C: 里程碑 (R3)
// ═══════════════════════════════════════════════════════════════

const milestoneRouter = router({
  /** 计算历史工时基准统计 */
  computeHistoricalBenchmarks: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        processCode: z.string().optional(),
        productCategory: z.string().optional(),
      }).optional(),
    )
    .mutation(async ({ input }) => {
      return svc.computeHistoricalBenchmarks(input?.processCode, input?.productCategory);
    }),

  /** 查询T步骤历史基准 */
  getHistoricalBenchmarks: protectedProcedure
    .input(
      z.object({
        processCode: z.string().optional(),
        productCategory: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.processCode) {
        conditions.push(eq(schedulingHistoricalBenchmarks.processCode, input.processCode));
      }
      if (input?.productCategory) {
        conditions.push(eq(schedulingHistoricalBenchmarks.productCategory, input.productCategory));
      }

      const items = await db
        .select()
        .from(schedulingHistoricalBenchmarks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(schedulingHistoricalBenchmarks.processCode)
        .limit(200);

      return { items };
    }),

  /** 生成里程碑目标(含来源) */
  generateMilestoneTargets: requirePermission("mfg:scheduling:run")
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      return svc.generateMilestoneTargets(input.projectId);
    }),

  /** 里程碑进度 vs 基准 */
  getMilestoneProgress: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(schedulingMilestoneCheckpoints)
        .where(eq(schedulingMilestoneCheckpoints.projectId, input.projectId))
        .orderBy(schedulingMilestoneCheckpoints.milestoneCode)
        .limit(20);
      return { items };
    }),

  /** 手动调整里程碑目标日期 */
  updateMilestoneTarget: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        id: z.number(),
        targetDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [updated] = await db
        .update(schedulingMilestoneCheckpoints)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(schedulingMilestoneCheckpoints.id, id))
        .returning();
      return updated;
    }),

  /** 里程碑风险评估(p80阈值) */
  getMilestoneRiskAssessment: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return svc.assessMilestoneRisk(input.projectId);
    }),
});

// ═══════════════════════════════════════════════════════════════
// Sub-Router D: 智能排程 (R2, R4)
// ═══════════════════════════════════════════════════════════════

const schedulingRouter = router({
  /** 构建+求解排程(调用SchedulingEngine) */
  buildProjectSchedule: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        projectId: z.number(),
        delayWeight: z.number().min(0).max(10).optional(),
        changeoverWeight: z.number().min(0).max(10).optional(),
        optimizationLevel: z.enum(["fast", "balanced", "optimal"]).optional(),
        maxTimeSeconds: z.number().min(5).max(300).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { projectId, ...config } = input;
      return svc.buildProjectScheduleInput(projectId, config);
    }),

  /** 获取排程Gantt数据 */
  getProjectGantt: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(
          and(
            eq(schedulingBomWorkHours.projectId, input.projectId),
            sql`${schedulingBomWorkHours.status} IN ('scheduled', 'in_progress', 'completed')`,
          ),
        )
        .orderBy(schedulingBomWorkHours.processCode, schedulingBomWorkHours.sortOrder)
        .limit(500);

      const milestones = await db
        .select()
        .from(schedulingMilestoneCheckpoints)
        .where(eq(schedulingMilestoneCheckpoints.projectId, input.projectId))
        .orderBy(schedulingMilestoneCheckpoints.milestoneCode)
        .limit(20);

      return {
        tasks: items.map((i) => ({
          id: i.id,
          name: i.assemblyDescription ?? `${i.processCode} Step`,
          processCode: i.processCode,
          durationMinutes: i.adjustedMinutes ?? i.baseTheoryMinutes ?? 0,
          status: i.status,
          predecessors: i.predecessorStepIds ?? [],
          materialReady: i.materialReady,
        })),
        milestones: milestones.map((m) => ({
          code: m.milestoneCode,
          name: m.milestoneName,
          targetDate: m.targetDate,
          actualDate: m.actualDate,
          status: m.status,
        })),
      };
    }),

  /** 重新优化(调整权重/约束) */
  optimizeSchedule: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        projectId: z.number(),
        delayWeight: z.number().min(0).max(10).default(1),
        changeoverWeight: z.number().min(0).max(10).default(0.5),
        optimizationLevel: z.enum(["fast", "balanced", "optimal"]).default("balanced"),
      }),
    )
    .mutation(async ({ input }) => {
      const { projectId, ...config } = input;
      return svc.buildProjectScheduleInput(projectId, config);
    }),

  /** 检测资源超配/里程碑违规/物料延迟 */
  getScheduleConflicts: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conflicts: Array<{
        type: "resource_overload" | "milestone_violation" | "material_delay";
        severity: "warning" | "critical";
        description: string;
      }> = [];

      // Check milestone violations
      const milestones = await db
        .select()
        .from(schedulingMilestoneCheckpoints)
        .where(
          and(
            eq(schedulingMilestoneCheckpoints.projectId, input.projectId),
            sql`${schedulingMilestoneCheckpoints.status} IN ('at_risk', 'delayed')`,
          ),
        )
        .limit(20);

      for (const m of milestones) {
        conflicts.push({
          type: "milestone_violation",
          severity: m.status === "delayed" ? "critical" : "warning",
          description: `${m.milestoneCode} ${m.milestoneName}: ${m.status === "delayed" ? "已延期" : "有风险"}`,
        });
      }

      // Check material delays
      const notReady = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(
          and(
            eq(schedulingBomWorkHours.projectId, input.projectId),
            eq(schedulingBomWorkHours.materialReady, false),
            sql`${schedulingBomWorkHours.status} IN ('confirmed', 'scheduled')`,
          ),
        )
        .limit(200);

      if (notReady.length > 0) {
        conflicts.push({
          type: "material_delay",
          severity: notReady.length > 5 ? "critical" : "warning",
          description: `${notReady.length}个工步物料未就绪`,
        });
      }

      return { conflicts };
    }),

  /** 排程结果写回项目工序日期 */
  applyScheduleToProject: requirePermission("mfg:scheduling:run")
    .input(
      z.object({
        projectId: z.number(),
        scheduledTasks: z.array(
          z.object({
            taskId: z.string(),
            scheduledStart: z.string(),
            scheduledEnd: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      return svc.applyScheduleToProject(
        input.projectId,
        input.scheduledTasks.map((t) => ({
          ...t,
          scheduledStart: new Date(t.scheduledStart),
          scheduledEnd: new Date(t.scheduledEnd),
        })),
      );
    }),

  /** 排程修改审计日志 */
  getScheduleChangeLog: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      // Return recent modifications (entries with adjustedAt)
      const items = await db
        .select()
        .from(schedulingBomWorkHours)
        .where(
          and(
            eq(schedulingBomWorkHours.projectId, input.projectId),
            sql`${schedulingBomWorkHours.adjustedAt} IS NOT NULL`,
          ),
        )
        .orderBy(desc(schedulingBomWorkHours.adjustedAt))
        .limit(input.limit);

      return {
        changes: items.map((i) => ({
          id: i.id,
          processCode: i.processCode,
          description: i.assemblyDescription,
          adjustedMinutes: i.adjustedMinutes,
          adjustReason: i.adjustReason,
          adjustedBy: i.adjustedBy,
          adjustedAt: i.adjustedAt,
        })),
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Sub-Router E: 任务报工 (Labor Reporting)
// ═══════════════════════════════════════════════════════════════

const LABOR_CATEGORIES = [
  "laser_cutting",          // 5.2 激光切割
  "machining",              // 5.3 机加工
  "shearing_bending",       // 5.4 剪板折弯
  "sub_assembly",           // 5.5 部件制作
  "mechanical_assembly",    // 5.6 机械装配
  "electrical_assembly",    // 5.7 电气装配
  "point_check_manual",     // 6.1 对点及手动运行
  "system_integration",     // 6.2 设备联调及跑合
  "internal_acceptance",    // 6.3 内部验收
  "pre_acceptance_rework",  // 6.4 预验收及整改
  "packaging_shipping",     // 6.5 打包发货
  "site_installation",      // 7.1 客户现场安装
  "site_commissioning",     // 7.2 客户现场调试
  "mechanical_design",      // 机械设计 (office)
  "electrical_design",      // 电气设计 (office)
  "project_management",     // 项目管理
  "other",
] as const;

const laborReportRouter = router({
  /** 提交报工 */
  submit: requirePermission("manufacturing:schedule:manage")
    .input(z.object({
      taskId: z.number(),
      projectId: z.number().optional(),
      duration: z.number().min(0.1).max(24),
      laborCategory: z.enum(LABOR_CATEGORIES).default("other"),
      logType: z.string().default("manual"),
      notes: z.string().max(500).optional(),
      location: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const logCode = `WL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const [inserted] = await db.insert(workLogs).values({
        logCode,
        taskId: input.taskId,
        workerId: ctx.user!.id,
        workerName: ctx.user!.name ?? `User-${ctx.user!.id}`,
        logType: input.logType,
        logTime: new Date(),
        duration: String(input.duration),
        laborCategory: input.laborCategory,
        projectId: input.projectId ?? null,
        approvalStatus: "pending",
        notes: input.notes ?? null,
        location: input.location ?? null,
      }).returning({ id: workLogs.id, logCode: workLogs.logCode });

      log.info({ logCode, userId: ctx.user!.id, projectId: input.projectId }, "Labor report submitted");
      return inserted;
    }),

  /** 审批报工 */
  approve: requirePermission("manufacturing:schedule:manage")
    .input(z.object({
      logId: z.number(),
      action: z.enum(["approved", "rejected"]),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [updated] = await db.update(workLogs)
        .set({
          approvalStatus: input.action,
          approvedBy: ctx.user!.id,
        })
        .where(eq(workLogs.id, input.logId))
        .returning({ id: workLogs.id, approvalStatus: workLogs.approvalStatus });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Work log not found" });
      log.info({ logId: input.logId, action: input.action, userId: ctx.user!.id }, "Labor report reviewed");
      return updated;
    }),

  /** 按项目查报工 */
  listByProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select()
        .from(workLogs)
        .where(eq(workLogs.projectId, input.projectId))
        .orderBy(desc(workLogs.logTime))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  /** 按工时类型统计 */
  statsByCategory: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(workLogs.approvalStatus, "approved")];
      if (input.projectId) conditions.push(eq(workLogs.projectId, input.projectId));

      const rows = await db.select({
        category: workLogs.laborCategory,
        totalHours: sum(workLogs.duration),
        logCount: count(),
      })
        .from(workLogs)
        .where(and(...conditions))
        .groupBy(workLogs.laborCategory)
        .limit(20);

      return rows.map(r => ({
        category: r.category ?? "other",
        totalHours: Number(r.totalHours ?? 0),
        logCount: Number(r.logCount),
      }));
    }),

  /** 项目成本汇总 (labor + material + overhead) */
  projectCostRollup: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Labor costs from labor_costs table
      const [laborResult] = await db.select({
        totalLaborCost: sum(laborCosts.totalCost),
        totalLaborHours: sum(laborCosts.hours),
      })
        .from(laborCosts)
        .where(eq(laborCosts.projectId, input.projectId));

      // Work log hours (approved only)
      const [workLogResult] = await db.select({
        reportedHours: sum(workLogs.duration),
        reportCount: count(),
      })
        .from(workLogs)
        .where(and(
          eq(workLogs.projectId, input.projectId),
          eq(workLogs.approvalStatus, "approved"),
        ));

      return {
        projectId: input.projectId,
        laborCost: Number(laborResult?.totalLaborCost ?? 0),
        laborHours: Number(laborResult?.totalLaborHours ?? 0),
        reportedHours: Number(workLogResult?.reportedHours ?? 0),
        reportCount: Number(workLogResult?.reportCount ?? 0),
        // Material and overhead would come from other modules
        materialCost: 0,
        overheadCost: 0,
        totalCost: Number(laborResult?.totalLaborCost ?? 0),
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Sub-Router F: 工序基准与学习迭代 (Benchmark & Learning)
// ═══════════════════════════════════════════════════════════════

const benchmarkLearningRouter = router({
  /** 获取 Excel↔T 工序编码映射 */
  getProcessMapping: protectedProcedure.query(() => {
    return {
      excelToT: bmSvc.EXCEL_TO_T_MAPPING,
      tToExcel: bmSvc.T_TO_EXCEL_MAPPING,
      registry: bmSvc.PROCESS_REGISTRY,
    };
  }),

  /** 获取 36 项目真实消耗率基准 */
  getRealBenchmarks: protectedProcedure.query(() => {
    return {
      benchmarks: bmSvc.REAL_BENCHMARKS,
      projectCount: bmSvc.ALL_PROJECT_CODES.length,
      projectCodes: bmSvc.ALL_PROJECT_CODES,
    };
  }),

  /** 单工序消耗率分析 (含学习曲线) */
  getConsumptionAnalysis: protectedProcedure
    .input(z.object({ excelCode: z.string() }))
    .query(({ input }) => {
      return bmSvc.analyzeProcessLearning(input.excelCode as bmSvc.ExcelProcessCode);
    }),

  /** 全工序消耗率分析总览 */
  getFullConsumptionAnalysis: protectedProcedure.query(() => {
    return bmSvc.getFullConsumptionAnalysis();
  }),

  /** 校正新项目工时估算 */
  calibrateEstimate: protectedProcedure
    .input(z.object({
      processCode: z.string(),
      plannedHours: z.number().min(0),
    }))
    .query(({ input }) => {
      return bmSvc.calibrateEstimate(
        input.processCode as bmSvc.ExcelProcessCode,
        input.plannedHours,
      );
    }),

  /** 获取 GRT-414 部件工时分解 (示例数据) */
  getComponentBreakdown: protectedProcedure
    .input(z.object({ projectCode: z.string().default("GRT-414") }))
    .query(({ input }) => {
      if (input.projectCode === "GRT-414") {
        return { components: bmSvc.GRT414_COMPONENTS };
      }
      return { components: [] };
    }),

  /** 获取逐项目工序消耗数据 */
  getProjectProcessData: protectedProcedure
    .input(z.object({
      projectCode: z.string().optional(),
      processName: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      let data = bmSvc.PROJECT_PROCESS_DATA;
      if (input?.projectCode) {
        data = data.filter((d) => d.projectCode === input.projectCode);
      }
      if (input?.processName) {
        data = data.filter((d) => d.processName.includes(input.processName!));
      }
      return { data, total: data.length };
    }),

  /** 将真实基准数据写入 DB */
  seedBenchmarks: requirePermission("mfg:scheduling:run")
    .mutation(async () => {
      return bmSvc.seedBenchmarksFromExcel();
    }),

  /** 重新校准 benchmark (含增量更新) */
  recalibrate: requirePermission("mfg:scheduling:run")
    .input(z.object({
      newData: z.array(z.object({
        projectCode: z.string(),
        processName: z.string(),
        plannedHours: z.number(),
        actualHours: z.number(),
        consumptionRate: z.number(),
      })).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return bmSvc.recalibrateBenchmarks(input?.newData);
    }),
});

// ═══════════════════════════════════════════════════════════════
// Main Router Export
// ═══════════════════════════════════════════════════════════════

export const smartProductionSchedulingRouter = router({
  bomWorkHours: bomWorkHoursRouter,
  resourceMaterial: resourceMaterialRouter,
  milestone: milestoneRouter,
  scheduling: schedulingRouter,
  laborReport: laborReportRouter,
  benchmarkLearning: benchmarkLearningRouter,
});

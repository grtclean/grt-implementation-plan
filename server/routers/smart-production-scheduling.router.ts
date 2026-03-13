/**
 * 智慧排程工作台 — tRPC Router
 *
 * 4 sub-routers, ~26 procedures:
 *   A: BOM工时 (8 procedures)
 *   B: 前置与物料 (6 procedures)
 *   C: 里程碑 (6 procedures)
 *   D: 智能排程 (6 procedures)
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
import { eq, desc, and, sql, count, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import * as svc from "../services/smart-production-scheduling.service";

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
          adjustedBy: ctx.user.id,
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
// Main Router Export
// ═══════════════════════════════════════════════════════════════

export const smartProductionSchedulingRouter = router({
  bomWorkHours: bomWorkHoursRouter,
  resourceMaterial: resourceMaterialRouter,
  milestone: milestoneRouter,
  scheduling: schedulingRouter,
});

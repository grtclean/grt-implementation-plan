/**
 * Automation Hooks Router — Management Rhythm (OKR -> Meetings closed-loop)
 *
 * Provides:
 *   - list: legacy stub
 *   - listTriggeredMeetings: list auto-triggered meetings (DB-backed)
 *   - getAutomationStats: aggregate stats (total triggered, pending, etc.)
 *   - triggerPhaseChange: M-phase change trigger → creates meeting
 *   - triggerTNodeDelay: T-node delay trigger → creates meeting
 *   - triggerOKRAtRisk: OKR at-risk trigger → creates meeting
 *   - triggerQualityEscalation: quality 8D escalation trigger → creates meeting
 *   - triggerSupplierPenalty: supplier penalty trigger → creates meeting
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { automationTriggeredMeetings } from "../../drizzle/schema";
import { eq, desc, sql, count } from "drizzle-orm";

async function createMeeting(
  title: string,
  type: "PHASE_CHANGE" | "T_NODE_DELAY" | "OKR_AT_RISK" | "QUALITY_ESCALATION" | "SUPPLIER_PENALTY",
  description: string,
  triggerSource: string,
  userId?: number | null,
) {
  const db = await requireDb();
  const now = new Date();
  const scheduled = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

  const [inserted] = await db.insert(automationTriggeredMeetings).values({
    title,
    type,
    status: "UPCOMING",
    description,
    scheduledStart: scheduled.toISOString(),
    triggerSource,
    createdBy: userId ?? null,
  }).returning();

  return inserted;
}

export const automationRouter = router({
  /** Legacy stub */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** List all auto-triggered meetings */
  listTriggeredMeetings: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select()
        .from(automationTriggeredMeetings)
        .orderBy(desc(automationTriggeredMeetings.createdAt))
        .limit(input.limit);
    }),

  /** Get automation stats */
  getAutomationStats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const [stats] = await db.select({
        totalTriggered: count(),
        pending: sql<number>`SUM(CASE WHEN status = 'UPCOMING' THEN 1 ELSE 0 END)`,
        ended: sql<number>`SUM(CASE WHEN status = 'ENDED' THEN 1 ELSE 0 END)`,
      }).from(automationTriggeredMeetings);

      return {
        totalTriggered: stats?.totalTriggered ?? 0,
        pending: Number(stats?.pending ?? 0),
        ended: Number(stats?.ended ?? 0),
        ruleCount: 5,
      };
    }),

  /** Trigger: M-phase change (e.g., M2 signed) */
  triggerPhaseChange: requirePermission('system:scheduler:manage')
    .input(z.object({
      phase: z.string(),
      projectTitle: z.string(),
      pmName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMeeting(
        `[${input.phase}] ${input.projectTitle} — 阶段启动会`,
        "PHASE_CHANGE",
        `项目「${input.projectTitle}」进入 ${input.phase} 阶段，项目经理: ${input.pmName}。自动触发阶段启动会议。`,
        `Phase: ${input.phase}`,
        ctx.user?.id,
      );
    }),

  /** Trigger: T-node delay */
  triggerTNodeDelay: requirePermission('system:scheduler:manage')
    .input(z.object({
      tNode: z.string(),
      projectTitle: z.string(),
      severity: z.enum(["WARNING", "CRITICAL"]),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMeeting(
        `[${input.tNode}延迟] ${input.projectTitle} — 异常处理会`,
        "T_NODE_DELAY",
        `项目「${input.projectTitle}」的 ${input.tNode} 节点出现 ${input.severity} 级别延迟，自动触发异常处理会议。`,
        `T-Node: ${input.tNode}`,
        ctx.user?.id,
      );
    }),

  /** Trigger: OKR at risk */
  triggerOKRAtRisk: requirePermission('system:scheduler:manage')
    .input(z.object({
      objectiveTitle: z.string(),
      progress: z.number(),
      threshold: z.number(),
      ownerName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMeeting(
        `[OKR滞后] ${input.objectiveTitle} — 复盘会`,
        "OKR_AT_RISK",
        `OKR「${input.objectiveTitle}」当前进度 ${input.progress}% 低于阈值 ${input.threshold}%，负责人: ${input.ownerName}。自动触发复盘会。`,
        `OKR: ${input.objectiveTitle}`,
        ctx.user?.id,
      );
    }),

  /** Trigger: Quality escalation (8D) */
  triggerQualityEscalation: requirePermission('system:scheduler:manage')
    .input(z.object({
      reportTitle: z.string(),
      severity: z.string(),
      productName: z.string(),
      customerName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMeeting(
        `[质量升级] ${input.reportTitle} — 紧急质量会`,
        "QUALITY_ESCALATION",
        `产品「${input.productName}」客户「${input.customerName}」报告 ${input.severity} 级质量问题: ${input.reportTitle}。自动触发紧急质量会议。`,
        `Quality: ${input.reportTitle}`,
        ctx.user?.id,
      );
    }),

  /** Trigger: Supplier penalty threshold */
  triggerSupplierPenalty: requirePermission('system:scheduler:manage')
    .input(z.object({
      supplierName: z.string(),
      penaltyCount: z.number(),
      threshold: z.number(),
      latestReason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createMeeting(
        `[供应商违约] ${input.supplierName} — 评审会`,
        "SUPPLIER_PENALTY",
        `供应商「${input.supplierName}」违约次数 ${input.penaltyCount} 次超过阈值 ${input.threshold} 次。最近原因: ${input.latestReason}。自动触发供应商评审会。`,
        `Supplier: ${input.supplierName}`,
        ctx.user?.id,
      );
    }),
});

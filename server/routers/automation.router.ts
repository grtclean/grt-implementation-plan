/**
 * Automation Hooks Router — Management Rhythm (OKR -> Meetings closed-loop)
 *
 * Provides:
 *   - list: legacy stub
 *   - listTriggeredMeetings: list auto-triggered meetings
 *   - getAutomationStats: aggregate stats (total triggered, pending, etc.)
 *   - triggerPhaseChange: simulate M-phase change trigger
 *   - triggerTNodeDelay: simulate T-node delay trigger
 *   - triggerOKRAtRisk: simulate OKR at-risk trigger
 *   - triggerQualityEscalation: simulate quality 8D escalation trigger
 *   - triggerSupplierPenalty: simulate supplier penalty trigger
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

// ── In-memory triggered meetings store ──

interface TriggeredMeeting {
  id: number;
  title: string;
  type: string;
  status: string;
  description: string;
  scheduledStart: string;
  triggerSource: string;
  createdAt: string;
}

let nextId = 1;
let triggeredMeetings: TriggeredMeeting[] = [];

function createMeeting(title: string, type: string, description: string, triggerSource: string): TriggeredMeeting {
  const now = new Date();
  const scheduled = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const meeting: TriggeredMeeting = {
    id: nextId++,
    title,
    type,
    status: "UPCOMING",
    description,
    scheduledStart: scheduled.toISOString(),
    triggerSource,
    createdAt: now.toISOString(),
  };
  triggeredMeetings.unshift(meeting);
  return meeting;
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
      return triggeredMeetings.slice(0, input.limit);
    }),

  /** Get automation stats */
  getAutomationStats: protectedProcedure
    .query(async () => {
      return {
        totalTriggered: triggeredMeetings.length,
        pending: triggeredMeetings.filter(m => m.status === "UPCOMING").length,
        ended: triggeredMeetings.filter(m => m.status === "ENDED").length,
        ruleCount: 5,
      };
    }),

  /** Trigger: M-phase change (e.g., M2 signed) */
  triggerPhaseChange: protectedProcedure
    .input(z.object({
      phase: z.string(),
      projectTitle: z.string(),
      pmName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const meeting = createMeeting(
        `[${input.phase}] ${input.projectTitle} — 阶段启动会`,
        "PHASE_CHANGE",
        `项目「${input.projectTitle}」进入 ${input.phase} 阶段，项目经理: ${input.pmName}。自动触发阶段启动会议。`,
        `Phase: ${input.phase}`
      );
      return meeting;
    }),

  /** Trigger: T-node delay */
  triggerTNodeDelay: protectedProcedure
    .input(z.object({
      tNode: z.string(),
      projectTitle: z.string(),
      severity: z.enum(["WARNING", "CRITICAL"]),
    }))
    .mutation(async ({ input }) => {
      const meeting = createMeeting(
        `[${input.tNode}延迟] ${input.projectTitle} — 异常处理会`,
        "T_NODE_DELAY",
        `项目「${input.projectTitle}」的 ${input.tNode} 节点出现 ${input.severity} 级别延迟，自动触发异常处理会议。`,
        `T-Node: ${input.tNode}`
      );
      return meeting;
    }),

  /** Trigger: OKR at risk */
  triggerOKRAtRisk: protectedProcedure
    .input(z.object({
      objectiveTitle: z.string(),
      progress: z.number(),
      threshold: z.number(),
      ownerName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const meeting = createMeeting(
        `[OKR滞后] ${input.objectiveTitle} — 复盘会`,
        "OKR_AT_RISK",
        `OKR「${input.objectiveTitle}」当前进度 ${input.progress}% 低于阈值 ${input.threshold}%，负责人: ${input.ownerName}。自动触发复盘会。`,
        `OKR: ${input.objectiveTitle}`
      );
      return meeting;
    }),

  /** Trigger: Quality escalation (8D) */
  triggerQualityEscalation: protectedProcedure
    .input(z.object({
      reportTitle: z.string(),
      severity: z.string(),
      productName: z.string(),
      customerName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const meeting = createMeeting(
        `[质量升级] ${input.reportTitle} — 紧急质量会`,
        "QUALITY_ESCALATION",
        `产品「${input.productName}」客户「${input.customerName}」报告 ${input.severity} 级质量问题: ${input.reportTitle}。自动触发紧急质量会议。`,
        `Quality: ${input.reportTitle}`
      );
      return meeting;
    }),

  /** Trigger: Supplier penalty threshold */
  triggerSupplierPenalty: protectedProcedure
    .input(z.object({
      supplierName: z.string(),
      penaltyCount: z.number(),
      threshold: z.number(),
      latestReason: z.string(),
    }))
    .mutation(async ({ input }) => {
      const meeting = createMeeting(
        `[供应商违约] ${input.supplierName} — 评审会`,
        "SUPPLIER_PENALTY",
        `供应商「${input.supplierName}」违约次数 ${input.penaltyCount} 次超过阈值 ${input.threshold} 次。最近原因: ${input.latestReason}。自动触发供应商评审会。`,
        `Supplier: ${input.supplierName}`
      );
      return meeting;
    }),
});

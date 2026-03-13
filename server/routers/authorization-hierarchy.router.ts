/**
 * Authorization Hierarchy Router (授权层级审批制度)
 *
 * 6 sub-routers, ~40 procedures:
 * - policy: 授权策略管理 (admin/director)
 * - creditTier: 信用等级管理
 * - greenChannel: 绿色通道
 * - postFacto: 事后补交
 * - integrity: 诚信激励
 * - audit: 审计追踪
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/trpc";
import * as svc from "../services/authorization-hierarchy.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("authorization-hierarchy-router");

/* ── Shared schemas ───────────────────────────────────────── */

const thresholdRuleSchema = z.object({
  level: z.number(),
  levelLabel: z.string(),
  minAmount: z.number(),
  maxAmount: z.number(),
  approverRole: z.string(),
  autoApprove: z.boolean(),
  isRequired: z.boolean(),
});

const domainSchema = z.enum([
  "travel", "procurement", "budget", "project",
  "customer", "material", "expense", "contract",
]);

const creditTierSchema = z.enum(["platinum", "gold", "silver", "bronze", "restricted"]);

/* ── Sub-routers ──────────────────────────────────────────── */

const policyRouter = router({
  /** List all active authorization policies */
  list: protectedProcedure
    .input(z.object({ domain: domainSchema.optional() }).optional())
    .query(async ({ input }) => {
      return svc.listPolicies(input?.domain);
    }),

  /** Get policy by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return svc.getPolicyById(input.id);
    }),

  /** Create or update policy (admin/director only) */
  upsert: requirePermission("admin:system:manage")
    .input(z.object({
      id: z.number().optional(),
      policyCode: z.string().min(1).max(64),
      domain: domainSchema,
      policyName: z.string().min(1).max(200),
      description: z.string().optional(),
      thresholdRules: z.array(thresholdRuleSchema),
      durationRules: z.array(z.object({
        maxDays: z.number(),
        approverLevel: z.number(),
        description: z.string(),
      })).optional(),
      buScope: z.string().max(20).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ policyCode: input.policyCode, userId: ctx.user.id }, "Policy upsert");
      return svc.upsertPolicy({ ...input, createdBy: ctx.user.name ?? undefined });
    }),

  /** Get threshold matrix for a domain (for display) */
  getThresholds: protectedProcedure
    .input(z.object({ domain: domainSchema }))
    .query(async ({ input }) => {
      const policies = await svc.listPolicies(input.domain);
      return policies.map(p => ({
        policyCode: p.policyCode,
        policyName: p.policyName,
        domain: p.domain,
        thresholds: p.thresholdRules,
        durationRules: p.durationRules,
        buScope: p.buScope,
      }));
    }),
});

const creditTierRouter = router({
  /** Get my credit tier */
  getMy: protectedProcedure.query(async ({ ctx }) => {
    return svc.getCreditTier(ctx.user.id);
  }),

  /** Get any employee's credit tier (manager+) */
  getByEmployee: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return svc.getCreditTier(input.userId);
    }),

  /** List all credit tiers (HR/admin) */
  list: protectedProcedure
    .input(z.object({
      tier: creditTierSchema.optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      return svc.listCreditTiers(input ?? undefined);
    }),

  /** Recalculate credit score for one employee */
  recalculate: requirePermission("hr:employee:manage")
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      return svc.recalculateCreditScore(input.userId);
    }),

  /** Batch recalculate all credit scores */
  batchRecalculate: requirePermission("admin:system:manage")
    .mutation(async () => {
      const tiers = await svc.listCreditTiers({ limit: 500 });
      let updated = 0;
      for (const tier of tiers) {
        await svc.recalculateCreditScore(tier.userId);
        updated++;
      }
      return { updated };
    }),

  /** Manual override (director/CEO only) */
  override: requirePermission("admin:system:manage")
    .input(z.object({
      userId: z.number(),
      creditTier: creditTierSchema,
      creditScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ targetUserId: input.userId, newTier: input.creditTier }, "Credit tier override");
      const result = await svc.overrideCreditTier(
        input.userId, input.creditTier, input.creditScore, ctx.user.id,
      );

      await svc.recordAudit({
        eventType: "credit_change",
        actorId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        targetUserId: input.userId,
        decision: `override_to_${input.creditTier}`,
        metadata: { newScore: input.creditScore },
      });

      return result;
    }),
});

const greenChannelRouter = router({
  /** Check if I can use green channel */
  checkEligibility: protectedProcedure
    .input(z.object({
      domain: domainSchema,
      amount: z.number().min(0),
    }))
    .query(async ({ input, ctx }) => {
      return svc.checkGreenChannelEligibility(ctx.user.id, input.domain, input.amount);
    }),

  /** Use green channel for a request */
  use: protectedProcedure
    .input(z.object({
      domain: domainSchema,
      amount: z.number().min(0),
      description: z.string().optional(),
      approvalInstanceId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.useGreenChannel({
        userId: ctx.user.id,
        employeeName: ctx.user.name ?? "Unknown",
        domain: input.domain,
        amount: input.amount,
        description: input.description,
        approvalInstanceId: input.approvalInstanceId,
      });
    }),

  /** My green channel usage history */
  getMyUsages: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return svc.listGreenChannelUsages(ctx.user.id, input?.limit ?? 20);
    }),

  /** All usages (admin audit) */
  listUsages: requirePermission("admin:system:manage")
    .input(z.object({
      userId: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      return svc.listGreenChannelUsages(input?.userId, input?.limit ?? 50);
    }),

  /** Get rules per domain */
  getRules: protectedProcedure
    .input(z.object({ domain: domainSchema.optional() }).optional())
    .query(async ({ input }) => {
      return svc.listGreenChannelRules(input?.domain);
    }),

  /** Update GC rule (admin) */
  updateRule: requirePermission("admin:system:manage")
    .input(z.object({
      id: z.number(),
      maxAmountAllowed: z.number().optional(),
      autoApproveThreshold: z.number().optional(),
      cooldownDays: z.number().optional(),
      monthlyUsageLimit: z.number().optional(),
      postFactoDeadlineDays: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      log.info({ ruleId: id, userId: ctx.user.id }, "GC rule updated");
      return svc.updateGreenChannelRule(id, data);
    }),
});

const postFactoRouter = router({
  /** Submit post-facto documentation */
  submit: protectedProcedure
    .input(z.object({
      domain: domainSchema,
      greenChannelUsageId: z.number().optional(),
      originalApprovalId: z.number().optional(),
      actionDate: z.string().transform(s => new Date(s)),
      reason: z.string().min(1).max(1000),
      urgencyJustification: z.string().max(1000).optional(),
      supportingDocuments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        uploadedAt: z.string(),
        docType: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.submitPostFacto({
        userId: ctx.user.id,
        employeeName: ctx.user.name ?? "Unknown",
        domain: input.domain,
        greenChannelUsageId: input.greenChannelUsageId,
        originalApprovalId: input.originalApprovalId,
        actionDate: input.actionDate,
        reason: input.reason,
        urgencyJustification: input.urgencyJustification,
        supportingDocuments: input.supportingDocuments,
      });
    }),

  /** My pending post-facto submissions */
  getMyPending: protectedProcedure.query(async ({ ctx }) => {
    return svc.getMyPendingPostFacto(ctx.user.id);
  }),

  /** Review a post-facto submission (manager+) */
  review: requirePermission("hr:employee:manage")
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.reviewPostFacto(
        input.id, ctx.user.id, ctx.user.name ?? "Unknown", input.status, input.comment,
      );
    }),

  /** List overdue post-facto submissions (HR/admin) */
  listOverdue: requirePermission("hr:employee:manage")
    .query(async () => {
      return svc.listOverduePostFacto();
    }),
});

const integrityRouter = router({
  /** My integrity score */
  getMyScore: protectedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return svc.getIntegrityScore(ctx.user.id, input?.period);
    }),

  /** Integrity leaderboard */
  getLeaderboard: protectedProcedure
    .input(z.object({
      period: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      return svc.getIntegrityLeaderboard(input?.period, input?.limit ?? 20);
    }),

  /** Publicly recognize an employee (director+) */
  recognize: requirePermission("hr:employee:manage")
    .input(z.object({
      userId: z.number(),
      employeeName: z.string(),
      period: z.string(),
      recognitionType: z.enum(["monthly_star", "quarterly_award", "integrity_champion", "transparency_award"]),
      note: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ targetUserId: input.userId, type: input.recognitionType }, "Employee recognized");
      return svc.recognizeEmployee(
        input.userId, input.employeeName, input.period,
        input.recognitionType, input.note, ctx.user.id,
      );
    }),

  /** Dashboard stats */
  getDashboard: protectedProcedure.query(async () => {
    return svc.getDashboardStats();
  }),
});

const auditRouter = router({
  /** Search audit trail */
  search: requirePermission("admin:audit:view")
    .input(z.object({
      domain: domainSchema.optional(),
      eventType: z.enum([
        "approval", "green_channel", "post_facto", "delegation",
        "escalation", "override", "credit_change", "policy_change",
      ]).optional(),
      actorId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      return svc.searchAudit({
        domain: input?.domain,
        eventType: input?.eventType,
        actorId: input?.actorId,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        limit: input?.limit ?? 100,
        offset: input?.offset ?? 0,
      });
    }),
});

/** Resolve approval chain for a given request (called by other routers) */
const resolveRouter = router({
  /** Resolve the full approval chain for a domain + amount */
  resolveChain: protectedProcedure
    .input(z.object({
      domain: domainSchema,
      amount: z.number().min(0),
      buCode: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return svc.resolveApprovalChain(
        input.domain, input.amount, ctx.user.id, input.buCode,
      );
    }),
});

/* ── Merged router ────────────────────────────────────────── */

export const authorizationHierarchyRouter = router({
  policy: policyRouter,
  creditTier: creditTierRouter,
  greenChannel: greenChannelRouter,
  postFacto: postFactoRouter,
  integrity: integrityRouter,
  audit: auditRouter,
  resolve: resolveRouter,
});

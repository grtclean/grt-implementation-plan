/**
 * Employee Points Router — 员工积分奖惩系统
 *
 * 10 sub-routers, ~48 procedures:
 *   balance    (3) — getBalance, getDetail, leaderboard
 *   rules      (2) — list, update
 *   award      (7) — award, managerAward, report, pendingApprovals, approveRequest, rejectRequest, myRequests
 *   compliance (4) — getStatus, completeMorningPlan, completeEveningSummary, completeNextDayPlan
 *   history    (2) — list, monthlyStats
 *   catalog    (3) — list, requestRedemption, myRedemptions
 *   admin      (7) — pendingRedemptions, approve, reject, observationList, runPenalties, evaluatePerformance, evaluateSalesM2
 *   suggestion (6) — submit, list, getById, evaluate, approve, stats
 *   community  (8) — listPosts, createPost, acknowledge, like, stats, listSensitiveWords, addSensitiveWord, removeSensitiveWord
 *   eliteBenefit(9) — checkEligibility, apply, approve, reject, list, runMonthlyReview, submitCommitment, reviewHistory
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import * as svc from "../services/employee-points.service";

const viewPerm = requirePermission("hr:salary:view");
const managePerm = requirePermission("system:config:manage");

const periodSchema = z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM");

// ── Balance Sub-Router ────────────────────────────────────

const balanceRouter = router({
  /** Get current point balance for logged-in user */
  getMine: protectedProcedure
    .query(async ({ ctx }) => {
      return svc.getBalanceDetail(ctx.user.id);
    }),

  /** Get point balance for any employee (HR/manager view) */
  getDetail: viewPerm
    .input(z.object({ employeeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.getBalanceDetail(input.employeeId);
    }),

  /** Company-wide points leaderboard */
  leaderboard: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ input }) => {
      return svc.getLeaderboard(input?.limit);
    }),
});

// ── Rules Sub-Router ──────────────────────────────────────

const rulesRouter = router({
  /** List all active point rules */
  list: protectedProcedure
    .query(async () => {
      return svc.getRules();
    }),

  /** Update a rule's points, multipliers, or active status (admin) */
  update: managePerm
    .input(z.object({
      code: z.string().min(1).max(80),
      points: z.number().int().optional(),
      roleMultipliers: z.record(z.string(), z.number()).optional(),
      maxPerDay: z.number().int().min(0).optional(),
      maxPerMonth: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return svc.updateRule(input);
    }),
});

// ── Award Sub-Router ──────────────────────────────────────

const awardRouter = router({
  /** Auto-award points by rule code (system use) */
  award: managePerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      ruleCode: z.string().min(1).max(80),
      description: z.string().max(500).optional(),
      sourceType: z.string().max(50).optional(),
      sourceId: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.awardPoints({ ...input, grantedBy: ctx.user.id });
    }),

  /** Manager/CEO manual award with custom points (legacy, no approval flow) */
  managerAward: managePerm
    .input(z.object({
      employeeId: z.number().int().positive(),
      ruleCode: z.enum(["manager_award", "ceo_special_award"]),
      points: z.number().int().min(-100).max(200),
      description: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.awardPoints({
        employeeId: input.employeeId,
        ruleCode: input.ruleCode,
        pointsOverride: input.points,
        description: input.description,
        grantedBy: ctx.user.id,
      });
    }),

  /**
   * Manager workspace report — ≤100 auto-execute, >100 needs superior approval.
   * All managers can use this from their workspace.
   */
  report: protectedProcedure
    .input(z.object({
      targetEmployeeId: z.number().int().positive(),
      ruleCode: z.string().max(80).optional(),
      points: z.number().int().min(-5000).max(5000),
      description: z.string().min(1).max(1000),
      sourceType: z.string().max(50).optional(),
      sourceId: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.managerReport({ requesterId: ctx.user.id, ...input });
    }),

  /** List pending approvals (for superiors to review) */
  pendingApprovals: managePerm
    .query(async () => {
      return svc.listPendingApprovals();
    }),

  /** Approve a point request */
  approveRequest: managePerm
    .input(z.object({
      requestId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.approvePointRequest({ ...input, approverId: ctx.user.id });
    }),

  /** Reject a point request */
  rejectRequest: managePerm
    .input(z.object({
      requestId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.rejectPointRequest({ ...input, approverId: ctx.user.id });
    }),

  /** My submitted requests (track status) */
  myRequests: protectedProcedure
    .query(async ({ ctx }) => {
      return svc.getMyApprovalRequests(ctx.user.id);
    }),
});

// ── Compliance Sub-Router ─────────────────────────────────

const complianceRouter = router({
  /** Get today's compliance status for current user */
  getStatus: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional())
    .query(async ({ input, ctx }) => {
      return svc.getComplianceStatus(ctx.user.id, input?.date);
    }),

  /** Mark morning plan as completed */
  completeMorningPlan: protectedProcedure
    .input(z.object({ planId: z.string().max(100).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      return svc.completeMorningPlanCheck(ctx.user.id, input?.planId);
    }),

  /** Mark evening summary as completed */
  completeEveningSummary: protectedProcedure
    .input(z.object({ logId: z.string().max(100).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      return svc.completeEveningSummaryCheck(ctx.user.id, input?.logId);
    }),

  /** Mark next-day plan as completed (awards 2 bonus points) */
  completeNextDayPlan: protectedProcedure
    .input(z.object({ planId: z.string().max(100).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      return svc.completeNextDayPlanCheck(ctx.user.id, input?.planId);
    }),
});

// ── History Sub-Router ────────────────────────────────────

const historyRouter = router({
  /** Get point transaction history */
  list: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const empId = input?.employeeId ?? ctx.user.id;
      return svc.getTransactionHistory(empId, input?.limit);
    }),

  /** Monthly statistics */
  monthlyStats: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      period: periodSchema,
    }))
    .query(async ({ input, ctx }) => {
      const empId = input.employeeId ?? ctx.user.id;
      return svc.getMonthlyStats(empId, input.period);
    }),
});

// ── Catalog Sub-Router (Redemptions) ─────────────────────

const catalogRouter = router({
  /** List available redemption items */
  list: protectedProcedure
    .query(async () => {
      return svc.getRedemptionCatalog();
    }),

  /** Request a redemption */
  redeem: protectedProcedure
    .input(z.object({
      catalogCode: z.string().min(1).max(80),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.requestRedemption({ employeeId: ctx.user.id, ...input });
    }),

  /** My redemption history */
  myRedemptions: protectedProcedure
    .query(async ({ ctx }) => {
      return svc.getMyRedemptions(ctx.user.id);
    }),
});

// ── Admin Sub-Router ─────────────────────────────────────

const adminRouter = router({
  /** List pending redemption requests */
  pendingRedemptions: managePerm
    .query(async () => {
      return svc.getPendingRedemptions();
    }),

  /** Approve a redemption */
  approve: managePerm
    .input(z.object({
      redemptionId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.approveRedemption(input.redemptionId, ctx.user.id, input.notes);
    }),

  /** Reject a redemption */
  reject: managePerm
    .input(z.object({
      redemptionId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.rejectRedemption(input.redemptionId, ctx.user.id, input.notes);
    }),

  /** View observation & suspended list */
  observationList: viewPerm
    .query(async () => {
      return svc.getObservationList();
    }),

  /** Manually run end-of-day penalties (normally by scheduler) */
  runPenalties: managePerm
    .mutation(async () => {
      return svc.runEndOfDayPenalties();
    }),

  /** Evaluate monthly performance → auto-award/deduct points (KPI≥85 +200, 3-month trend ±) */
  evaluatePerformance: managePerm
    .input(z.object({
      period: periodSchema,
    }))
    .mutation(async ({ input }) => {
      return svc.evaluateMonthlyPerformancePoints(input.period);
    }),

  /** Evaluate sales M2 pipeline — penalize sales with <3 new M2 customers */
  evaluateSalesM2: managePerm
    .input(z.object({
      period: periodSchema,
    }))
    .mutation(async ({ input }) => {
      return svc.evaluateSalesM2Pipeline(input.period);
    }),
});

// ── Suggestion Sub-Router (合理化建议通道) ──────────────────

const suggestionRouter = router({
  /** Submit a new suggestion */
  submit: protectedProcedure
    .input(z.object({
      title: z.string().min(2).max(300),
      description: z.string().min(10).max(5000),
      problemStatement: z.string().max(2000).optional(),
      expectedBenefit: z.string().max(2000).optional(),
      implementationPlan: z.string().max(2000).optional(),
      estimatedSavings: z.string().max(20).optional(),
      targetDepartment: z.string().max(100).optional(),
      category: z.enum(["process", "quality", "safety", "cost", "innovation", "management"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.submitSuggestion({ employeeId: ctx.user.id, ...input });
    }),

  /** List suggestions (own or all for managers) */
  list: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      status: z.string().max(30).optional(),
      category: z.string().max(50).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return svc.listSuggestions({ employeeId: input?.employeeId ?? ctx.user.id, ...input });
    }),

  /** Get suggestion detail */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.getSuggestion(input.id);
    }),

  /** Evaluate a suggestion (department manager) */
  evaluate: managePerm
    .input(z.object({
      id: z.number().int().positive(),
      valueTier: z.enum(["effective", "outstanding", "major", "rejected"]),
      evaluatorNotes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.evaluateSuggestion({ ...input, evaluatorId: ctx.user.id });
    }),

  /** CEO approve outstanding/major suggestion */
  approve: managePerm
    .input(z.object({
      id: z.number().int().positive(),
      approvalNotes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.approveSuggestion({ ...input, approvedBy: ctx.user.id });
    }),

  /** Stats for dashboard */
  stats: protectedProcedure
    .query(async () => {
      return svc.getSuggestionStats();
    }),
});

// ── Community Sub-Router (公司社区) ────────────────────────

const communityRouter = router({
  /** List community feed posts */
  listPosts: protectedProcedure
    .input(z.object({
      postType: z.string().max(50).optional(),
      scope: z.string().max(50).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      return svc.listCommunityPosts(input);
    }),

  /** Create a user post (with sensitive word filtering) */
  createPost: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      content: z.string().min(1).max(10000),
      postType: z.enum(["discussion", "knowledge", "achievement"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.createCommunityPost({
        authorId: ctx.user.id,
        title: input.title,
        content: input.content,
        postType: input.postType ?? "discussion",
      });
    }),

  /** Acknowledge a post (已读确认) */
  acknowledge: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      return svc.acknowledgeCommunityPost(input.postId, ctx.user.id);
    }),

  /** Like a post */
  like: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return svc.likeCommunityPost(input.postId);
    }),

  /** Community stats */
  stats: protectedProcedure
    .query(async () => {
      return svc.getCommunityStats();
    }),

  /** List sensitive words (admin) */
  listSensitiveWords: managePerm
    .query(async () => {
      return svc.listSensitiveWords();
    }),

  /** Add sensitive word (admin) */
  addSensitiveWord: managePerm
    .input(z.object({
      word: z.string().min(1).max(100),
      category: z.string().max(50).optional(),
      action: z.enum(["block", "mask", "flag"]).optional(),
      replacement: z.string().max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      return svc.addSensitiveWord(input);
    }),

  /** Remove sensitive word (admin) */
  removeSensitiveWord: managePerm
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return svc.removeSensitiveWord(input.id);
    }),
});

// ── Elite Benefit Sub-Router (精英福利) ─────────────────────

const eliteBenefitRouter = router({
  /** Check eligibility for elite benefits */
  checkEligibility: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return svc.checkEliteEligibility(input?.employeeId ?? ctx.user.id);
    }),

  /** Apply for an elite benefit */
  applyBenefit: protectedProcedure
    .input(z.object({
      benefitType: z.enum(["alternating_rest", "five_day_week"]),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.applyEliteBenefit({ employeeId: ctx.user.id, benefitType: input.benefitType });
    }),

  /** Approve an application (HR/Director) */
  approve: managePerm
    .input(z.object({
      applicationId: z.number().int().positive(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.approveEliteBenefit({ ...input, approverId: ctx.user.id });
    }),

  /** Reject an application (HR/Director) */
  reject: managePerm
    .input(z.object({
      applicationId: z.number().int().positive(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.rejectEliteBenefit({ ...input, approverId: ctx.user.id });
    }),

  /** List applications (own or all for admin) */
  list: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
      status: z.string().max(20).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return svc.listEliteBenefitApplications({ employeeId: input?.employeeId ?? ctx.user.id, ...input });
    }),

  /** Run monthly review — dynamic evaluation cycle (admin/scheduler) */
  runMonthlyReview: managePerm
    .input(z.object({ period: periodSchema }))
    .mutation(async ({ input }) => {
      return svc.runMonthlyEliteReview(input.period);
    }),

  /** Submit commitment to retain benefit (employee) */
  submitCommitment: protectedProcedure
    .input(z.object({
      commitmentContent: z.string().min(10).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      return svc.submitEliteCommitment({ employeeId: ctx.user.id, ...input });
    }),

  /** Get review history */
  reviewHistory: protectedProcedure
    .input(z.object({ employeeId: z.number().int().positive().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return svc.getEliteReviewHistory(input?.employeeId ?? ctx.user.id);
    }),
});

// ── Merged Router ────────────────────────────────────────

export const employeePointsRouter = router({
  balance: balanceRouter,
  rules: rulesRouter,
  award: awardRouter,
  compliance: complianceRouter,
  history: historyRouter,
  catalog: catalogRouter,
  admin: adminRouter,
  suggestion: suggestionRouter,
  community: communityRouter,
  eliteBenefit: eliteBenefitRouter,
});

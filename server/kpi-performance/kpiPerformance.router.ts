/**
 * KPI Performance Router - tRPC endpoints for all 6 HR/KPI performance tables
 *
 * Sub-routers:
 *   kpiPerformance.positions  — KPI Position Profiles
 *   kpiPerformance.library    — KPI Metrics Library
 *   kpiPerformance.targets    — Position KPI Targets
 *   kpiPerformance.skills     — User Skill Matrix
 *   kpiPerformance.reviews    — Monthly Performance Reviews
 *   kpiPerformance.militaryOrders — Military Orders (军令状)
 */

import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { jsonValue } from "../../shared/validators";
import { analyzeKpiPerformance } from "./kpiAiAnalysis.service";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

/** Roles allowed to view/manage other employees' KPI data */
const HR_MANAGER_ROLES = new Set(["admin", "director", "hr_manager", "hr_specialist", "dept_manager", "team_lead"]);
import {
  listKpiPositions,
  getKpiPositionById,
  createKpiPosition,
  updateKpiPosition,
  deleteKpiPosition,
  listKpiLibrary,
  getKpiLibraryById,
  createKpiLibraryItem,
  updateKpiLibraryItem,
  deleteKpiLibraryItem,
  listPositionKpiTargets,
  getPositionKpiTargetById,
  createPositionKpiTarget,
  updatePositionKpiTarget,
  deletePositionKpiTarget,
  listUserSkills,
  getUserSkillById,
  createUserSkill,
  updateUserSkill,
  deleteUserSkill,
  listMonthlyReviews,
  getMonthlyReviewById,
  createMonthlyReview,
  updateMonthlyReview,
  deleteMonthlyReview,
  listMilitaryOrders,
  getMilitaryOrderById,
  createMilitaryOrder,
  updateMilitaryOrder,
  signMilitaryOrder,
  witnessMilitaryOrder,
  deleteMilitaryOrder,
} from "./kpiPerformance.service";

// ============================================================
// Positions sub-router
// ============================================================

const positionsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          department: z.string().optional(),
          buCode: z.string().optional(),
          status: z.enum(["active", "inactive", "draft"]).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listKpiPositions(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getKpiPositionById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        positionId: z.number().optional(),
        title: z.string().min(1),
        department: z.string().min(1),
        buCode: z.string().optional(),
        responsibilities: z.string().optional(),
        hiringRequirements: z.string().optional(),
        coreCompetency: z.string().optional(),
        headcount: z.number().min(0).optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createKpiPosition({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        title: z.string().min(1).optional(),
        department: z.string().min(1).optional(),
        buCode: z.string().optional(),
        responsibilities: z.string().optional(),
        hiringRequirements: z.string().optional(),
        coreCompetency: z.string().optional(),
        headcount: z.number().min(0).optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateKpiPosition(id, data);
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteKpiPosition(input.id);
    }),
});

// ============================================================
// Library sub-router
// ============================================================

const libraryRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          kpiType: z
            .enum(["financial", "customer", "internal_process", "learning_growth"])
            .optional(),
          buCode: z.string().optional(),
          status: z.enum(["active", "inactive", "draft"]).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listKpiLibrary(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getKpiLibraryById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        unit: z.enum(["currency", "percent", "count", "days", "score", "ratio"]),
        kpiType: z.enum([
          "financial",
          "customer",
          "internal_process",
          "learning_growth",
        ]),
        category: z.string().optional(),
        calculationFormula: z.string().optional(),
        dataSource: z.string().optional(),
        buCode: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createKpiLibraryItem({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        unit: z
          .enum(["currency", "percent", "count", "days", "score", "ratio"])
          .optional(),
        kpiType: z
          .enum(["financial", "customer", "internal_process", "learning_growth"])
          .optional(),
        category: z.string().optional(),
        calculationFormula: z.string().optional(),
        dataSource: z.string().optional(),
        buCode: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateKpiLibraryItem(id, data);
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteKpiLibraryItem(input.id);
    }),
});

// ============================================================
// Targets sub-router
// ============================================================

const targetsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          positionId: z.number().optional(),
          kpiId: z.number().optional(),
          year: z.number().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listPositionKpiTargets(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getPositionKpiTargetById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
        kpiId: z.number(),
        year: z.number().min(2020).max(2100),
        targetValue: z.string(),
        challengeValue: z.string().optional(),
        minimumValue: z.string().optional(),
        weight: z.string(),
        scoringMethod: z
          .enum(["linear", "step", "binary", "threshold"])
          .optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createPositionKpiTarget({ ...input, createdBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        kpiId: z.number().optional(),
        year: z.number().min(2020).max(2100).optional(),
        targetValue: z.string().optional(),
        challengeValue: z.string().optional(),
        minimumValue: z.string().optional(),
        weight: z.string().optional(),
        scoringMethod: z
          .enum(["linear", "step", "binary", "threshold"])
          .optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updatePositionKpiTarget(id, data);
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deletePositionKpiTarget(input.id);
    }),
});

// ============================================================
// Skills sub-router
// ============================================================

const skillsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          employeeId: z.number().optional(),
          skillCategory: z
            .enum(["technical", "leadership", "domain", "soft_skill"])
            .optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const params = input ?? {};
      // Non-HR roles can only see their own skills
      if (!HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        params.userId = ctx.user.id;
      }
      return listUserSkills(params);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getUserSkillById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        employeeId: z.number().optional(),
        skillName: z.string().min(1),
        skillCategory: z
          .enum(["technical", "leadership", "domain", "soft_skill"])
          .optional(),
        currentLevel: z.number().min(1).max(5),
        targetLevel: z.number().min(1).max(5),
        assessmentDate: z.string().optional(),
        historyJson: jsonValue.optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Non-HR can only create skills for themselves
      const targetUserId = input.userId ?? ctx.user.id;
      if (targetUserId !== ctx.user.id && !HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权为他人创建技能记录" });
      }
      return createUserSkill({ ...input, userId: targetUserId, assessedBy: ctx.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        skillName: z.string().min(1).optional(),
        skillCategory: z
          .enum(["technical", "leadership", "domain", "soft_skill"])
          .optional(),
        currentLevel: z.number().min(1).max(5).optional(),
        targetLevel: z.number().min(1).max(5).optional(),
        assessmentDate: z.string().optional(),
        assessedBy: z.number().optional(),
        historyJson: jsonValue.optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateUserSkill(id, data);
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteUserSkill(input.id);
    }),
});

// ============================================================
// Reviews sub-router
// ============================================================

const reviewsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          employeeId: z.number().optional(),
          monthDate: z.string().optional(),
          status: z
            .enum(["draft", "submitted", "reviewed", "finalized"])
            .optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const params = input ?? {};
      // Non-HR roles can only see their own reviews
      if (!HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        params.userId = ctx.user.id;
      }
      return listMonthlyReviews(params);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMonthlyReviewById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        employeeId: z.number().optional(),
        positionId: z.number().optional(),
        monthDate: z.string().regex(/^\d{4}-\d{2}$/),
        overallKpiScore: z.string().optional(),
        bonusCoefficient: z.string().optional(),
        kpiDetailsJson: jsonValue.optional(),
        gapsText: z.string().optional(),
        improvementPlanText: z.string().optional(),
        reviewerComments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only HR/managers can create reviews for others; force draft status
      const targetUserId = input.userId ?? ctx.user.id;
      if (targetUserId !== ctx.user.id && !HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权为他人创建绩效评审" });
      }
      // Self-review prevention for managers
      if (targetUserId === ctx.user.id && input.overallKpiScore) {
        throw new TRPCError({ code: "FORBIDDEN", message: "不能给自己打绩效分数" });
      }
      return createMonthlyReview({
        ...input,
        userId: targetUserId,
        reviewedBy: ctx.user.id,
        createdBy: ctx.user.id,
        status: "draft", // Always start as draft — cannot skip to finalized
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        monthDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        overallKpiScore: z.string().optional(),
        bonusCoefficient: z.string().optional(),
        kpiDetailsJson: jsonValue.optional(),
        gapsText: z.string().optional(),
        improvementPlanText: z.string().optional(),
        reviewerComments: z.string().optional(),
        status: z
          .enum(["draft", "submitted", "reviewed", "finalized"])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Only HR/managers can update reviews
      if (!HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权修改绩效评审" });
      }
      return updateMonthlyReview(id, { ...data, reviewedBy: ctx.user.id });
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteMonthlyReview(input.id);
    }),
});

// ============================================================
// Military Orders sub-router
// ============================================================

const militaryOrdersRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          userId: z.number().optional(),
          year: z.number().optional(),
          signatureStatus: z
            .enum(["pending", "signed", "witnessed", "voided"])
            .optional(),
          status: z.enum(["active", "inactive", "completed"]).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const params = input ?? {};
      // Non-HR roles can only see their own military orders
      if (!HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        params.userId = ctx.user.id;
      }
      return listMilitaryOrders(params);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMilitaryOrderById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        employeeId: z.number().optional(),
        year: z.number().min(2020).max(2100),
        positionId: z.number().optional(),
        commitmentText: z.string().min(1),
        targetSummaryJson: jsonValue.optional(),
        rewardText: z.string().optional(),
        consequenceText: z.string().optional(),
        documentUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only HR/managers can create military orders for others
      const targetUserId = input.userId ?? ctx.user.id;
      if (targetUserId !== ctx.user.id && !HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权为他人创建军令状" });
      }
      return createMilitaryOrder({
        ...input,
        userId: targetUserId,
        createdBy: ctx.user.id,
        signatureStatus: "pending", // Always start as pending — cannot create pre-signed
        status: "active",
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        commitmentText: z.string().min(1).optional(),
        targetSummaryJson: jsonValue.optional(),
        rewardText: z.string().optional(),
        consequenceText: z.string().optional(),
        documentUrl: z.string().optional(),
        status: z.enum(["active", "inactive", "completed"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateMilitaryOrder(id, data);
    }),

  sign: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify the signer is the order's target user
      const order = await getMilitaryOrderById(input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: `军令状 #${input.id} 不存在` });
      if (order.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能签署自己的军令状" });
      }
      if (order.signatureStatus !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `军令状状态为 ${order.signatureStatus}，无法签署` });
      }
      return signMilitaryOrder(input.id);
    }),

  witness: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Witness must be a manager/HR role, and cannot witness their own order
      if (!HR_MANAGER_ROLES.has(ctx.user.role ?? "employee")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅管理层可见证军令状" });
      }
      const order = await getMilitaryOrderById(input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: `军令状 #${input.id} 不存在` });
      if (order.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "不能见证自己的军令状" });
      }
      if (order.signatureStatus !== "signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "军令状必须先签署才能见证" });
      }
      return witnessMilitaryOrder(input.id, ctx.user.id);
    }),

  delete: requirePermission('hr:performance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteMilitaryOrder(input.id);
    }),
});

// ============================================================
// AI Analysis sub-router
// ============================================================

const aiAnalysisRouter = router({
  analyze: requirePermission('hr:performance:manage')
    .input(
      z.object({
        buCode: z.string().optional(),
        department: z.string().optional(),
        monthDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return analyzeKpiPerformance(input);
    }),
});

// ============================================================
// Unified KPI Performance Router
// ============================================================

export const kpiPerformanceRouter = router({
  positions: positionsRouter,
  library: libraryRouter,
  targets: targetsRouter,
  skills: skillsRouter,
  reviews: reviewsRouter,
  militaryOrders: militaryOrdersRouter,
  aiAnalysis: aiAnalysisRouter,

  getDeptSummary: protectedProcedure.query(async () => {
    const db = await requireDb();
    try {
      const result = await db.execute(sql`
        SELECT
          d.name as dept,
          COUNT(e.id)::int as headcount,
          COALESCE(AVG(r.final_score), 0)::numeric(5,1) as avg_score,
          0 as budget_used,
          0 as target_rate
        FROM departments d
        LEFT JOIN company_employees e ON e.department = d.name AND e.status = 'active'
        LEFT JOIN kpi_monthly_reviews r ON r.employee_id = e.id
        WHERE d.is_active = true
        GROUP BY d.name
        HAVING COUNT(e.id) > 0
        ORDER BY avg_score DESC
        LIMIT 50
      `);
      const rows = ((result as any).rows ?? []).map((r: any) => {
        const score = Number(r.avg_score ?? 0);
        const grade = score >= 88 ? 'A' : score >= 85 ? 'A-' : score >= 82 ? 'B+' : 'B';
        return {
          dept: r.dept,
          headcount: Number(r.headcount ?? 0),
          avgScore: score,
          budgetUsed: Number(r.budget_used ?? 0),
          targetRate: Number(r.target_rate ?? 0),
          grade,
        };
      });
      return { departments: rows };
    } catch {
      return { departments: [] };
    }
  }),
});

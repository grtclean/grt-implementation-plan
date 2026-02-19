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

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
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
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createKpiPosition(input);
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

  delete: protectedProcedure
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
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createKpiLibraryItem(input);
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

  delete: protectedProcedure
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
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createPositionKpiTarget(input);
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

  delete: protectedProcedure
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
    .query(async ({ input }) => {
      return listUserSkills(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getUserSkillById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        employeeId: z.number().optional(),
        skillName: z.string().min(1),
        skillCategory: z
          .enum(["technical", "leadership", "domain", "soft_skill"])
          .optional(),
        currentLevel: z.number().min(1).max(5),
        targetLevel: z.number().min(1).max(5),
        assessmentDate: z.string().optional(),
        assessedBy: z.number().optional(),
        historyJson: z.any().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createUserSkill(input);
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
        historyJson: z.any().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateUserSkill(id, data);
    }),

  delete: protectedProcedure
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
    .query(async ({ input }) => {
      return listMonthlyReviews(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMonthlyReviewById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        employeeId: z.number().optional(),
        positionId: z.number().optional(),
        monthDate: z.string().regex(/^\d{4}-\d{2}$/),
        overallKpiScore: z.string().optional(),
        bonusCoefficient: z.string().optional(),
        kpiDetailsJson: z.any().optional(),
        gapsText: z.string().optional(),
        improvementPlanText: z.string().optional(),
        reviewerComments: z.string().optional(),
        reviewedBy: z.number().optional(),
        reviewedAt: z.string().optional(),
        status: z
          .enum(["draft", "submitted", "reviewed", "finalized"])
          .optional(),
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createMonthlyReview(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        monthDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        overallKpiScore: z.string().optional(),
        bonusCoefficient: z.string().optional(),
        kpiDetailsJson: z.any().optional(),
        gapsText: z.string().optional(),
        improvementPlanText: z.string().optional(),
        reviewerComments: z.string().optional(),
        reviewedBy: z.number().optional(),
        reviewedAt: z.string().optional(),
        status: z
          .enum(["draft", "submitted", "reviewed", "finalized"])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateMonthlyReview(id, data);
    }),

  delete: protectedProcedure
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
    .query(async ({ input }) => {
      return listMilitaryOrders(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMilitaryOrderById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        employeeId: z.number().optional(),
        year: z.number().min(2020).max(2100),
        positionId: z.number().optional(),
        commitmentText: z.string().min(1),
        targetSummaryJson: z.any().optional(),
        rewardText: z.string().optional(),
        consequenceText: z.string().optional(),
        signatureStatus: z
          .enum(["pending", "signed", "witnessed", "voided"])
          .optional(),
        documentUrl: z.string().optional(),
        status: z.enum(["active", "inactive", "completed"]).optional(),
        notes: z.string().optional(),
        createdBy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createMilitaryOrder(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        positionId: z.number().optional(),
        commitmentText: z.string().min(1).optional(),
        targetSummaryJson: z.any().optional(),
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

  sign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return signMilitaryOrder(input.id);
    }),

  witness: protectedProcedure
    .input(z.object({ id: z.number(), witnessedBy: z.number() }))
    .mutation(async ({ input }) => {
      return witnessMilitaryOrder(input.id, input.witnessedBy);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteMilitaryOrder(input.id);
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
});

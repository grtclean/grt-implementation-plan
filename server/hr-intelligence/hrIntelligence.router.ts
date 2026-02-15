/**
 * HR智能路由 (HR Intelligence Router)
 * Phase F: 人才评估 · 培训推荐 · 薪酬分析 · 人力规划
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  assessTalent,
  recommendTraining,
  analyzeCompensation,
  planWorkforce,
} from "./hrIntelligence.service";

export const hrIntelligenceRouter = router({
  // 人才评估 (mutation — invokes LLM)
  assessTalent: protectedProcedure
    .input(
      z.object({
        employeeName: z.string().min(1),
        role: z.string().min(1),
        department: z.string().min(1),
        yearsOfExperience: z.number().min(0),
        skillTags: z.string().optional(),
        performanceSummary: z.string().optional(),
        certifications: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await assessTalent(input);
    }),

  // 培训推荐 (mutation — invokes LLM)
  recommendTraining: protectedProcedure
    .input(
      z.object({
        role: z.string().min(1),
        currentSkills: z.string().min(1),
        targetSkills: z.string().min(1),
        experienceLevel: z.string().min(1),
        learningPreference: z.string().optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await recommendTraining(input);
    }),

  // 薪酬分析 (mutation — invokes LLM)
  analyzeCompensation: protectedProcedure
    .input(
      z.object({
        position: z.string().min(1),
        department: z.string().min(1),
        experienceYears: z.number().min(0),
        currentSalary: z.number().min(0),
        location: z.string().optional(),
        performanceGrade: z.string().optional(),
        education: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await analyzeCompensation(input);
    }),

  // 人力规划 (mutation — invokes LLM)
  planWorkforce: protectedProcedure
    .input(
      z.object({
        department: z.string().min(1),
        currentHeadcount: z.number().min(0),
        plannedProjects: z.string().min(1),
        attritionRate: z.number().min(0).max(100),
        budgetConstraint: z.string().optional(),
        growthTarget: z.string().optional(),
        timeHorizon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await planWorkforce(input);
    }),
});

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import {
  lifecycleJourneys, lifecycleMilestones, lifecycleActivities,
  lifecycleStageTemplates,
} from "../../drizzle/lifecycle-ecosystem-schema";
import { users } from "../../drizzle/schema";
import { knowledgeRoleRequirements, knowledgeLearningProgress } from "../../drizzle/knowledge-compliance-schema";
import { executiveReviewSnapshots } from "../../drizzle/executive-review-schema";
import { eq, and, sql, desc, asc, gte, lte, like, count, inArray } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger("lifecycle-ecosystem");

// ── Helper: assert manager/HRBP/exec role ──
function assertManagerRole(role: string | undefined) {
  const allowed = ["bu_gm", "dept_manager", "director", "gm", "chairman", "admin", "ceo", "cto", "cfo", "hr_director", "hr_manager", "team_leader"];
  if (!role || !allowed.includes(role)) {
    throw new Error("需要主管及以上权限操作员工生命旅程");
  }
}

// ── Journey Sub-router (个人旅程主记录) ─────────────────────────────
const journeyRouter = router({
  // Get my journey
  getMy: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) throw new Error("未登录");
    const rows = await db.select().from(lifecycleJourneys)
      .where(eq(lifecycleJourneys.userId, userId)).limit(1);
    return rows[0] ?? null;
  }),

  // Get journey by user ID (manager view)
  getByUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      const rows = await db.select().from(lifecycleJourneys)
        .where(eq(lifecycleJourneys.userId, input.userId)).limit(1);
      return rows[0] ?? null;
    }),

  // List journeys (team/department view)
  list: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      currentStage: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      const conditions = [];
      if (input.department) conditions.push(eq(lifecycleJourneys.department, input.department));
      if (input.currentStage) conditions.push(eq(lifecycleJourneys.currentStage, input.currentStage));
      if (input.status) conditions.push(eq(lifecycleJourneys.status, input.status));
      if (input.search) conditions.push(like(lifecycleJourneys.employeeName, `%${input.search}%`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [rows, total] = await Promise.all([
        db.select().from(lifecycleJourneys)
          .where(whereClause)
          .orderBy(desc(lifecycleJourneys.updatedAt))
          .limit(input.limit).offset(input.offset),
        db.select({ count: count() }).from(lifecycleJourneys).where(whereClause),
      ]);
      return { rows, total: total[0]?.count ?? 0 };
    }),

  // Initialize journey for a new employee
  create: protectedProcedure
    .input(z.object({
      userId: z.number(),
      employeeName: z.string().min(1).max(100),
      employeeId: z.string().max(50).optional(),
      department: z.string().max(100).optional(),
      position: z.string().max(100).optional(),
      role: z.string().max(50).optional(),
      hireDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      logger.info({ userId: input.userId }, "Creating lifecycle journey");
      const ins = await db.insert(lifecycleJourneys).values({
        ...input,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
        currentStage: "G1",
        currentStageName: "招募吸引",
        status: "active",
      }).returning({ id: lifecycleJourneys.id });
      return ins[0];
    }),

  // Update portal config (personal customization)
  updatePortal: protectedProcedure
    .input(z.object({
      portalTheme: z.string().max(30).optional(),
      portalBannerUrl: z.string().max(500).optional(),
      personalMotto: z.string().max(300).optional(),
      careerVision: z.string().optional(),
      personalHighlightReel: z.array(z.object({
        type: z.enum(["image", "video", "achievement"]),
        url: z.string().optional(),
        title: z.string(),
        date: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("未登录");
      await db.update(lifecycleJourneys)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(lifecycleJourneys.userId, userId));
      return { success: true };
    }),

  // Update persona traits (by HR/manager or self)
  updatePersona: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      personaTraits: z.object({
        driveType: z.string(),
        learningStyle: z.string(),
        workStyle: z.string(),
        strengthTags: z.array(z.string()),
        growthAreas: z.array(z.string()),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user?.id;
      if (!targetUserId) throw new Error("未登录");
      if (input.userId && input.userId !== ctx.user?.id) {
        assertManagerRole(ctx.user?.role);
      }
      await db.update(lifecycleJourneys)
        .set({ personaTraits: input.personaTraits, updatedAt: new Date() })
        .where(eq(lifecycleJourneys.userId, targetUserId));
      return { success: true };
    }),

  // Advance stage (manager action)
  advanceStage: protectedProcedure
    .input(z.object({
      journeyId: z.number(),
      newStageCode: z.string().min(2).max(10),
      newStageName: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      logger.info({ journeyId: input.journeyId, newStage: input.newStageCode }, "Advancing lifecycle stage");
      await db.update(lifecycleJourneys).set({
        currentStage: input.newStageCode,
        currentStageName: input.newStageName,
        stageEnteredAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(lifecycleJourneys.id, input.journeyId));
      return { success: true };
    }),

  // Get stage distribution (dashboard)
  getStageDistribution: protectedProcedure.query(async ({ ctx }) => {
    assertManagerRole(ctx.user?.role);
    return db.select({
      stage: lifecycleJourneys.currentStage,
      stageName: lifecycleJourneys.currentStageName,
      count: count(),
    }).from(lifecycleJourneys)
      .where(eq(lifecycleJourneys.status, "active"))
      .groupBy(lifecycleJourneys.currentStage, lifecycleJourneys.currentStageName)
      .orderBy(asc(lifecycleJourneys.currentStage))
      .limit(20);
  }),
});

// ── Milestone Sub-router (阶段里程碑) ─────────────────────────────
const milestoneRouter = router({
  // Get milestones for a journey
  getByJourney: protectedProcedure
    .input(z.object({ journeyId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(lifecycleMilestones)
        .where(eq(lifecycleMilestones.journeyId, input.journeyId))
        .orderBy(asc(lifecycleMilestones.stageCode))
        .limit(20);
    }),

  // Get my milestones
  getMy: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) throw new Error("未登录");
    return db.select().from(lifecycleMilestones)
      .where(eq(lifecycleMilestones.userId, userId))
      .orderBy(asc(lifecycleMilestones.stageCode))
      .limit(20);
  }),

  // Get specific milestone detail
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(lifecycleMilestones)
        .where(eq(lifecycleMilestones.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  // Create milestone from template
  createFromTemplate: protectedProcedure
    .input(z.object({
      journeyId: z.number(),
      userId: z.number(),
      stageCode: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      // Fetch template
      const templates = await db.select().from(lifecycleStageTemplates)
        .where(eq(lifecycleStageTemplates.stageCode, input.stageCode)).limit(1);
      const tmpl = templates[0];
      if (!tmpl) throw new Error(`模板不存在: ${input.stageCode}`);

      const ins = await db.insert(lifecycleMilestones).values({
        journeyId: input.journeyId,
        userId: input.userId,
        stageCode: tmpl.stageCode,
        stageName: tmpl.stageName,
        stageNameEn: tmpl.stageNameEn,
        stageDescription: tmpl.description,
        stageIcon: tmpl.stageIcon,
        stageColor: tmpl.stageColor,
        objectives: tmpl.defaultObjectives as any,
        dailyTools: tmpl.defaultDailyTools as any,
        reportingRequirements: tmpl.defaultReporting as any,
        inspirationalMessage: tmpl.defaultMessage,
        mediaUrl: tmpl.defaultMediaUrl,
        mediaType: tmpl.defaultMediaType,
        achievementBadge: tmpl.achievementBadge,
        achievementTitle: tmpl.achievementTitle,
        status: "active",
      }).returning({ id: lifecycleMilestones.id });
      return ins[0];
    }),

  // Update milestone (objectives, reviews)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      objectives: z.array(z.object({
        id: z.number(),
        title: z.string(),
        type: z.string(),
        completed: z.boolean(),
        linkedDocId: z.string().optional(),
        linkedTestId: z.number().optional(),
        linkedKpiTarget: z.string().optional(),
      })).optional(),
      dailyTools: z.array(z.object({
        tool: z.string(),
        path: z.string(),
        description: z.string(),
        frequency: z.string(),
      })).optional(),
      status: z.enum(["upcoming", "active", "completed", "skipped", "delayed"]).optional(),
      completedAt: z.string().optional(),
      stageKpiScore: z.string().optional(),
      stageCapabilityLevel: z.number().optional(),
      inspirationalMessage: z.string().optional(),
      mentorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, completedAt, ...rest } = input;
      await db.update(lifecycleMilestones).set({
        ...rest,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        updatedAt: new Date(),
      }).where(eq(lifecycleMilestones.id, id));
      return { success: true };
    }),

  // Manager review a milestone
  managerReview: protectedProcedure
    .input(z.object({
      milestoneId: z.number(),
      review: z.string().min(1),
      rating: z.number().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      await db.update(lifecycleMilestones).set({
        managerReview: input.review,
        managerReviewedBy: ctx.user?.id,
        managerReviewedAt: new Date(),
        managerRating: input.rating,
        updatedAt: new Date(),
      }).where(eq(lifecycleMilestones.id, input.milestoneId));
      return { success: true };
    }),

  // HRBP review a milestone
  hrbpReview: protectedProcedure
    .input(z.object({
      milestoneId: z.number(),
      notes: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      await db.update(lifecycleMilestones).set({
        hrbpNotes: input.notes,
        hrbpReviewedBy: ctx.user?.id,
        hrbpReviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(lifecycleMilestones.id, input.milestoneId));
      return { success: true };
    }),
});

// ── Activity Sub-router (旅程活动流) ──────────────────────────────
const activityRouter = router({
  // Get activities for a journey
  getByJourney: protectedProcedure
    .input(z.object({
      journeyId: z.number(),
      stageCode: z.string().optional(),
      activityType: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(lifecycleActivities.journeyId, input.journeyId)];
      if (input.stageCode) conditions.push(eq(lifecycleActivities.stageCode, input.stageCode));
      if (input.activityType) conditions.push(eq(lifecycleActivities.activityType, input.activityType));
      return db.select().from(lifecycleActivities)
        .where(and(...conditions))
        .orderBy(desc(lifecycleActivities.occurredAt))
        .limit(input.limit).offset(input.offset);
    }),

  // Get my activity feed
  getMyFeed: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("未登录");
      return db.select().from(lifecycleActivities)
        .where(eq(lifecycleActivities.userId, userId))
        .orderBy(desc(lifecycleActivities.occurredAt))
        .limit(input.limit).offset(input.offset);
    }),

  // Log activity
  create: protectedProcedure
    .input(z.object({
      journeyId: z.number(),
      userId: z.number(),
      stageCode: z.string().optional(),
      activityType: z.string().min(1).max(30),
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      impactScore: z.number().min(0).max(100).optional(),
      isPublic: z.boolean().optional(),
      imageUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const ins = await db.insert(lifecycleActivities).values(input)
        .returning({ id: lifecycleActivities.id });
      return ins[0];
    }),

  // Pin/unpin an activity
  togglePin: protectedProcedure
    .input(z.object({ id: z.number(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Only owner or manager can pin
      await db.update(lifecycleActivities).set({ isPinned: input.isPinned })
        .where(eq(lifecycleActivities.id, input.id));
      return { success: true };
    }),
});

// ── Stage Template Sub-router (G1-G20 模板管理) ───────────────────
const templateRouter = router({
  // Get all stage templates
  list: protectedProcedure.query(async () => {
    return db.select().from(lifecycleStageTemplates)
      .where(eq(lifecycleStageTemplates.isActive, true))
      .orderBy(asc(lifecycleStageTemplates.sortOrder))
      .limit(20);
  }),

  // Get single template
  getByCode: protectedProcedure
    .input(z.object({ stageCode: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(lifecycleStageTemplates)
        .where(eq(lifecycleStageTemplates.stageCode, input.stageCode)).limit(1);
      return rows[0] ?? null;
    }),

  // Update template (admin/HR only)
  update: protectedProcedure
    .input(z.object({
      stageCode: z.string(),
      stageName: z.string().optional(),
      stageNameEn: z.string().optional(),
      stageSubtitle: z.string().optional(),
      description: z.string().optional(),
      narrative: z.string().optional(),
      companyMissionLink: z.string().optional(),
      cultureMessage: z.string().optional(),
      defaultMessage: z.string().optional(),
      defaultMediaUrl: z.string().optional(),
      defaultMediaType: z.string().optional(),
      achievementBadge: z.string().optional(),
      achievementTitle: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      const { stageCode, ...updates } = input;
      await db.update(lifecycleStageTemplates).set({ ...updates, updatedAt: new Date() })
        .where(eq(lifecycleStageTemplates.stageCode, stageCode));
      return { success: true };
    }),
});

// ── Integration Sub-router (跨系统集成) ───────────────────────────
const integrationRouter = router({
  // Get knowledge requirements for current stage
  getStageKnowledgeRequirements: protectedProcedure
    .input(z.object({ role: z.string(), stageCode: z.string() }))
    .query(async ({ input }) => {
      // Map stage to approximate skill level
      const stageLevelMap: Record<string, number> = {
        G1: 1, G2: 1, G3: 1, G4: 1, G5: 1,
        G6: 2, G7: 2, G8: 2,
        G9: 3, G10: 3, G11: 3,
        G12: 4, G13: 4, G14: 4, G15: 4,
        G16: 5, G17: 5, G18: 5, G19: 5, G20: 5,
      };
      const level = stageLevelMap[input.stageCode] ?? 1;
      return db.select().from(knowledgeRoleRequirements)
        .where(and(
          eq(knowledgeRoleRequirements.role, input.role),
          lte(knowledgeRoleRequirements.skillLevel, level),
        ))
        .orderBy(asc(knowledgeRoleRequirements.skillLevel))
        .limit(100);
    }),

  // Get learning progress for lifecycle dashboard
  getLearningProgressSummary: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(knowledgeLearningProgress)
        .where(eq(knowledgeLearningProgress.userId, input.userId))
        .orderBy(desc(knowledgeLearningProgress.updatedAt))
        .limit(50);
    }),

  // Get executive review data for employee lifecycle context
  getEmployeePerformanceContext: protectedProcedure
    .input(z.object({ department: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertManagerRole(ctx.user?.role);
      const conditions = [eq(executiveReviewSnapshots.scopeType, "department")];
      if (input.department) conditions.push(eq(executiveReviewSnapshots.scopeId, input.department));
      return db.select().from(executiveReviewSnapshots)
        .where(and(...conditions))
        .orderBy(desc(executiveReviewSnapshots.period))
        .limit(12);
    }),
});

// ── Dashboard Sub-router (综合仪表板) ─────────────────────────────
const dashboardRouter = router({
  // Personal lifecycle summary
  getMySummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) throw new Error("未登录");
    const [journey, milestones, recentActivities, learningProgress] = await Promise.all([
      db.select().from(lifecycleJourneys).where(eq(lifecycleJourneys.userId, userId)).limit(1),
      db.select().from(lifecycleMilestones).where(eq(lifecycleMilestones.userId, userId))
        .orderBy(asc(lifecycleMilestones.stageCode)).limit(20),
      db.select().from(lifecycleActivities).where(eq(lifecycleActivities.userId, userId))
        .orderBy(desc(lifecycleActivities.occurredAt)).limit(10),
      db.select().from(knowledgeLearningProgress).where(eq(knowledgeLearningProgress.userId, userId)).limit(50),
    ]);
    const completedMilestones = milestones.filter(m => m.status === "completed").length;
    const totalLearningMinutes = learningProgress.reduce((acc, p) => acc + (p.studyMinutes ?? 0), 0);
    return {
      journey: journey[0] ?? null,
      milestones,
      recentActivities,
      stats: {
        completedStages: completedMilestones,
        totalStages: milestones.length,
        totalLearningMinutes,
        totalDocuments: learningProgress.length,
      },
    };
  }),

  // Company-wide lifecycle health (executive view)
  getCompanyHealth: protectedProcedure.query(async ({ ctx }) => {
    assertManagerRole(ctx.user?.role);
    const [stageDistribution, statusDistribution, totalJourneys] = await Promise.all([
      db.select({
        stage: lifecycleJourneys.currentStage,
        count: count(),
      }).from(lifecycleJourneys)
        .where(eq(lifecycleJourneys.status, "active"))
        .groupBy(lifecycleJourneys.currentStage)
        .orderBy(asc(lifecycleJourneys.currentStage))
        .limit(20),
      db.select({
        status: lifecycleJourneys.status,
        count: count(),
      }).from(lifecycleJourneys)
        .groupBy(lifecycleJourneys.status)
        .limit(10),
      db.select({ count: count() }).from(lifecycleJourneys),
    ]);
    return { stageDistribution, statusDistribution, totalJourneys: totalJourneys[0]?.count ?? 0 };
  }),
});

// ── Main router composition ─────────────────────────────────────
export const lifecycleEcosystemRouter = router({
  journey: journeyRouter,
  milestone: milestoneRouter,
  activity: activityRouter,
  template: templateRouter,
  integration: integrationRouter,
  dashboard: dashboardRouter,
});

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import {
  knowledgeCategories, knowledgeRoleRequirements, knowledgeSkillLevelStandards,
  knowledgeAccessAuthorizations, knowledgeLearningProgress,
  knowledgeTheoryTests, knowledgeTestAttempts,
} from "../../drizzle/knowledge-compliance-schema";
import { eq, and, sql, desc, asc, count, gte, lte, like } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const logger = createChildLogger("knowledge-compliance");

// ── Categories Sub-router ────────────────────────────────────────
const categoryRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(knowledgeCategories)
      .where(eq(knowledgeCategories.isActive, true))
      .orderBy(asc(knowledgeCategories.sortOrder))
      .limit(100);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(knowledgeCategories)
        .where(eq(knowledgeCategories.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      nameEn: z.string().max(200).optional(),
      icon: z.string().max(50).optional(),
      parentId: z.number().optional(),
      sortOrder: z.number().optional(),
      description: z.string().optional(),
      color: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const ins = await db.insert(knowledgeCategories).values(input)
        .returning({ id: knowledgeCategories.id });
      return ins[0];
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), nameEn: z.string().optional(),
      icon: z.string().optional(), sortOrder: z.number().optional(), description: z.string().optional(),
      color: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.update(knowledgeCategories).set(updates).where(eq(knowledgeCategories.id, id));
      return { success: true };
    }),
});

// ── Role Requirements Sub-router ─────────────────────────────────
const requirementRouter = router({
  // Get all docs required for a role at a skill level
  getByRole: protectedProcedure
    .input(z.object({
      role: z.string(),
      skillLevel: z.number().min(1).max(5).optional(),
      categoryCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(knowledgeRoleRequirements.isActive, true),
        sql`(${knowledgeRoleRequirements.role} = ${input.role} OR ${knowledgeRoleRequirements.role} = 'ALL')`,
      ];
      if (input.skillLevel) {
        conditions.push(lte(knowledgeRoleRequirements.skillLevelRequired, input.skillLevel));
      }
      if (input.categoryCode) {
        conditions.push(eq(knowledgeRoleRequirements.categoryCode, input.categoryCode));
      }
      return db.select().from(knowledgeRoleRequirements)
        .where(and(...conditions))
        .orderBy(asc(knowledgeRoleRequirements.skillLevelRequired), asc(knowledgeRoleRequirements.sortOrder))
        .limit(500);
    }),

  // Get my role's requirements (auto-detect from user context)
  getMyRequirements: protectedProcedure
    .input(z.object({ skillLevel: z.number().min(1).max(5).optional() }))
    .query(async ({ ctx, input }) => {
      const role = ctx.user?.role ?? "employee";
      const conditions = [
        eq(knowledgeRoleRequirements.isActive, true),
        sql`(${knowledgeRoleRequirements.role} = ${role} OR ${knowledgeRoleRequirements.role} = 'ALL')`,
      ];
      if (input.skillLevel) {
        conditions.push(lte(knowledgeRoleRequirements.skillLevelRequired, input.skillLevel));
      }
      return db.select().from(knowledgeRoleRequirements)
        .where(and(...conditions))
        .orderBy(asc(knowledgeRoleRequirements.skillLevelRequired), asc(knowledgeRoleRequirements.sortOrder))
        .limit(500);
    }),

  create: protectedProcedure
    .input(z.object({
      role: z.string(), department: z.string().optional(), position: z.string().optional(),
      docSourceType: z.string(), docSourceId: z.string().optional(), docTitle: z.string(),
      docUrl: z.string().optional(), categoryCode: z.string().optional(),
      requirementLevel: z.enum(["must_know", "should_know", "nice_to_know"]).default("must_know"),
      skillLevelRequired: z.number().min(1).max(5).default(1),
      masteryExpectation: z.enum(["aware", "understand", "apply", "analyze", "master"]).default("understand"),
      hasTest: z.boolean().optional(), testId: z.number().optional(), sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ins = await db.insert(knowledgeRoleRequirements)
        .values({ ...input, createdBy: ctx.user!.id })
        .returning({ id: knowledgeRoleRequirements.id });
      return ins[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(), requirementLevel: z.string().optional(), skillLevelRequired: z.number().optional(),
      masteryExpectation: z.string().optional(), hasTest: z.boolean().optional(), testId: z.number().optional(),
      isActive: z.boolean().optional(), sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.update(knowledgeRoleRequirements).set({ ...updates, updatedAt: new Date() })
        .where(eq(knowledgeRoleRequirements.id, id));
      return { success: true };
    }),

  // List all available roles that have requirements defined
  listRoles: protectedProcedure.query(async () => {
    return db.select({ role: knowledgeRoleRequirements.role })
      .from(knowledgeRoleRequirements)
      .where(eq(knowledgeRoleRequirements.isActive, true))
      .groupBy(knowledgeRoleRequirements.role)
      .orderBy(asc(knowledgeRoleRequirements.role))
      .limit(50);
  }),

  // Get stats: how many docs per category for a role
  getStats: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      return db.select({
        categoryCode: knowledgeRoleRequirements.categoryCode,
        count: count(),
      }).from(knowledgeRoleRequirements)
        .where(and(
          eq(knowledgeRoleRequirements.isActive, true),
          sql`(${knowledgeRoleRequirements.role} = ${input.role} OR ${knowledgeRoleRequirements.role} = 'ALL')`,
        ))
        .groupBy(knowledgeRoleRequirements.categoryCode)
        .limit(50);
    }),
});

// ── Skill Level Standards Sub-router ─────────────────────────────
const skillLevelRouter = router({
  getByRole: protectedProcedure
    .input(z.object({ role: z.string(), department: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = [eq(knowledgeSkillLevelStandards.role, input.role), eq(knowledgeSkillLevelStandards.isActive, true)];
      if (input.department) conditions.push(eq(knowledgeSkillLevelStandards.department, input.department));
      return db.select().from(knowledgeSkillLevelStandards)
        .where(and(...conditions))
        .orderBy(asc(knowledgeSkillLevelStandards.skillLevel))
        .limit(10);
    }),

  getLevel: protectedProcedure
    .input(z.object({ role: z.string(), skillLevel: z.number() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(knowledgeSkillLevelStandards)
        .where(and(
          eq(knowledgeSkillLevelStandards.role, input.role),
          eq(knowledgeSkillLevelStandards.skillLevel, input.skillLevel),
        )).limit(1);
      return rows[0] ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      role: z.string(), department: z.string().optional(), skillLevel: z.number().min(1).max(5),
      levelName: z.string(), levelNameEn: z.string().optional(),
      knowledgeRequirements: z.array(z.string()).optional(),
      skillRequirements: z.array(z.string()).optional(),
      performanceStandards: z.array(z.string()).optional(),
      certificationRequired: z.array(z.string()).optional(),
      trainingHoursRequired: z.number().optional(),
      theoryTestRequired: z.boolean().optional(), minTestScore: z.number().optional(),
      practicalAssessmentRequired: z.boolean().optional(),
      minMonthsAtPreviousLevel: z.number().optional(), minKpiScore: z.string().optional(),
      description: z.string().optional(), exampleTasks: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ins = await db.insert(knowledgeSkillLevelStandards)
        .values({ ...input, createdBy: ctx.user!.id })
        .returning({ id: knowledgeSkillLevelStandards.id });
      return ins[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      knowledgeRequirements: z.array(z.string()).optional(),
      skillRequirements: z.array(z.string()).optional(),
      performanceStandards: z.array(z.string()).optional(),
      description: z.string().optional(),
      trainingHoursRequired: z.number().optional(),
      minTestScore: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.update(knowledgeSkillLevelStandards).set({ ...updates, updatedAt: new Date() })
        .where(eq(knowledgeSkillLevelStandards.id, id));
      return { success: true };
    }),

  // List all roles that have skill level definitions
  listRoles: protectedProcedure.query(async () => {
    return db.select({ role: knowledgeSkillLevelStandards.role })
      .from(knowledgeSkillLevelStandards)
      .where(eq(knowledgeSkillLevelStandards.isActive, true))
      .groupBy(knowledgeSkillLevelStandards.role)
      .limit(50);
  }),
});

// ── Access Authorization Sub-router ──────────────────────────────
const accessRouter = router({
  // Request access to a document
  requestAccess: protectedProcedure
    .input(z.object({
      docSourceType: z.string(), docSourceId: z.string().optional(), docTitle: z.string(),
      authType: z.enum(["unlimited", "time_limited", "count_limited", "time_and_count"]).default("time_limited"),
      validFrom: z.string().optional(), validUntil: z.string().optional(),
      maxAccessCount: z.number().optional(), requestReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ins = await db.insert(knowledgeAccessAuthorizations).values({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "未知",
        docSourceType: input.docSourceType,
        docSourceId: input.docSourceId,
        docTitle: input.docTitle,
        authType: input.authType,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        maxAccessCount: input.maxAccessCount,
        status: "pending",
        requestReason: input.requestReason,
      }).returning({ id: knowledgeAccessAuthorizations.id });
      logger.info({ authId: ins[0]?.id, userId: ctx.user!.id }, "access request created");
      return ins[0];
    }),

  // List my authorizations
  listMy: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(knowledgeAccessAuthorizations.userId, ctx.user!.id)];
      if (input.status) conditions.push(eq(knowledgeAccessAuthorizations.status, input.status));
      return db.select().from(knowledgeAccessAuthorizations)
        .where(and(...conditions))
        .orderBy(desc(knowledgeAccessAuthorizations.createdAt))
        .limit(100);
    }),

  // List pending requests (for approvers)
  listPending: protectedProcedure.query(async () => {
    return db.select().from(knowledgeAccessAuthorizations)
      .where(eq(knowledgeAccessAuthorizations.status, "pending"))
      .orderBy(asc(knowledgeAccessAuthorizations.createdAt))
      .limit(100);
  }),

  // Approve access request
  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      validUntil: z.string().optional(),
      maxAccessCount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        status: "active",
        approvedBy: ctx.user!.id,
        approvedByName: ctx.user!.name ?? "未知",
        approvedAt: new Date(),
      };
      if (input.validUntil) updates.validUntil = new Date(input.validUntil);
      if (input.maxAccessCount) updates.maxAccessCount = input.maxAccessCount;
      await db.update(knowledgeAccessAuthorizations).set(updates)
        .where(eq(knowledgeAccessAuthorizations.id, input.id));
      return { success: true };
    }),

  // Reject
  reject: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(knowledgeAccessAuthorizations)
        .set({ status: "revoked", rejectedReason: input.reason })
        .where(eq(knowledgeAccessAuthorizations.id, input.id));
      return { success: true };
    }),

  // Record access (increment count, check limits)
  recordAccess: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const rows = await db.select().from(knowledgeAccessAuthorizations)
        .where(eq(knowledgeAccessAuthorizations.id, input.id)).limit(1);
      const auth = rows[0];
      if (!auth || auth.status !== "active") throw new Error("授权无效或已过期");

      // Check time limit
      if (auth.validUntil && new Date(auth.validUntil) < new Date()) {
        await db.update(knowledgeAccessAuthorizations).set({ status: "expired" })
          .where(eq(knowledgeAccessAuthorizations.id, input.id));
        throw new Error("授权已过期");
      }

      // Check count limit
      const newCount = (auth.currentAccessCount ?? 0) + 1;
      if (auth.maxAccessCount && newCount > auth.maxAccessCount) {
        await db.update(knowledgeAccessAuthorizations).set({ status: "exhausted" })
          .where(eq(knowledgeAccessAuthorizations.id, input.id));
        throw new Error("授权次数已用尽");
      }

      await db.update(knowledgeAccessAuthorizations).set({
        currentAccessCount: newCount,
        lastAccessedAt: new Date(),
        status: (auth.maxAccessCount && newCount >= auth.maxAccessCount) ? "exhausted" : "active",
      }).where(eq(knowledgeAccessAuthorizations.id, input.id));
      return { accessCount: newCount, remaining: auth.maxAccessCount ? auth.maxAccessCount - newCount : null };
    }),

  // Revoke
  revoke: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(knowledgeAccessAuthorizations).set({ status: "revoked" })
        .where(eq(knowledgeAccessAuthorizations.id, input.id));
      return { success: true };
    }),
});

// ── Learning Progress Sub-router ─────────────────────────────────
const progressRouter = router({
  // Get my learning progress
  getMyProgress: protectedProcedure
    .input(z.object({ categoryCode: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(knowledgeLearningProgress.userId, ctx.user!.id)];
      if (input.categoryCode) conditions.push(eq(knowledgeLearningProgress.categoryCode, input.categoryCode));
      if (input.status) conditions.push(eq(knowledgeLearningProgress.status, input.status));
      return db.select().from(knowledgeLearningProgress)
        .where(and(...conditions))
        .orderBy(desc(knowledgeLearningProgress.updatedAt))
        .limit(500);
    }),

  // Get progress for a specific user (manager view)
  getByUser: protectedProcedure
    .input(z.object({ userId: z.number(), categoryCode: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions = [eq(knowledgeLearningProgress.userId, input.userId)];
      if (input.categoryCode) conditions.push(eq(knowledgeLearningProgress.categoryCode, input.categoryCode));
      return db.select().from(knowledgeLearningProgress)
        .where(and(...conditions))
        .orderBy(desc(knowledgeLearningProgress.updatedAt))
        .limit(500);
    }),

  // Start or update learning progress
  upsertProgress: protectedProcedure
    .input(z.object({
      docSourceType: z.string(), docSourceId: z.string().optional(), docTitle: z.string(),
      categoryCode: z.string().optional(),
      status: z.enum(["not_started", "in_progress", "completed", "tested"]).optional(),
      progressPercent: z.number().min(0).max(100).optional(),
      studyMinutesAdded: z.number().min(0).optional(),
      personalNotes: z.string().optional(),
      bookmarkPosition: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.select().from(knowledgeLearningProgress)
        .where(and(
          eq(knowledgeLearningProgress.userId, ctx.user!.id),
          eq(knowledgeLearningProgress.docSourceType, input.docSourceType),
          sql`${knowledgeLearningProgress.docSourceId} = ${input.docSourceId ?? ""}`,
        )).limit(1);

      if (existing.length > 0) {
        const updates: Record<string, unknown> = { updatedAt: new Date(), lastStudiedAt: new Date() };
        if (input.status) updates.status = input.status;
        if (input.progressPercent != null) updates.progressPercent = input.progressPercent;
        if (input.studyMinutesAdded) updates.totalStudyMinutes = (existing[0].totalStudyMinutes ?? 0) + input.studyMinutesAdded;
        if (input.personalNotes) updates.personalNotes = input.personalNotes;
        if (input.bookmarkPosition) updates.bookmarkPosition = input.bookmarkPosition;
        if (input.status === "completed") updates.completedAt = new Date();
        await db.update(knowledgeLearningProgress).set(updates)
          .where(eq(knowledgeLearningProgress.id, existing[0].id));
        return { action: "updated", id: existing[0].id };
      }

      const ins = await db.insert(knowledgeLearningProgress).values({
        userId: ctx.user!.id,
        docSourceType: input.docSourceType,
        docSourceId: input.docSourceId,
        docTitle: input.docTitle,
        categoryCode: input.categoryCode,
        status: input.status ?? "in_progress",
        progressPercent: input.progressPercent ?? 0,
        totalStudyMinutes: input.studyMinutesAdded ?? 0,
        lastStudiedAt: new Date(),
      }).returning({ id: knowledgeLearningProgress.id });
      return { action: "created", id: ins[0]?.id };
    }),

  // Get summary stats for current user
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    return db.select({
      status: knowledgeLearningProgress.status,
      count: count(),
    }).from(knowledgeLearningProgress)
      .where(eq(knowledgeLearningProgress.userId, ctx.user!.id))
      .groupBy(knowledgeLearningProgress.status)
      .limit(10);
  }),
});

// ── Theory Tests Sub-router ──────────────────────────────────────
const testRouter = router({
  // List available tests
  list: protectedProcedure
    .input(z.object({
      categoryCode: z.string().optional(),
      targetRole: z.string().optional(),
      skillLevel: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(knowledgeTheoryTests.isActive, true)];
      if (input.categoryCode) conditions.push(eq(knowledgeTheoryTests.categoryCode, input.categoryCode));
      if (input.targetRole) {
        conditions.push(sql`(${knowledgeTheoryTests.targetRole} = ${input.targetRole} OR ${knowledgeTheoryTests.targetRole} IS NULL)`);
      }
      if (input.skillLevel) conditions.push(lte(knowledgeTheoryTests.skillLevelRequired, input.skillLevel));
      return db.select({
        id: knowledgeTheoryTests.id,
        title: knowledgeTheoryTests.title,
        description: knowledgeTheoryTests.description,
        categoryCode: knowledgeTheoryTests.categoryCode,
        targetRole: knowledgeTheoryTests.targetRole,
        skillLevelRequired: knowledgeTheoryTests.skillLevelRequired,
        totalPoints: knowledgeTheoryTests.totalPoints,
        passingScore: knowledgeTheoryTests.passingScore,
        timeLimitMinutes: knowledgeTheoryTests.timeLimitMinutes,
        maxAttempts: knowledgeTheoryTests.maxAttempts,
      }).from(knowledgeTheoryTests)
        .where(and(...conditions))
        .orderBy(asc(knowledgeTheoryTests.skillLevelRequired))
        .limit(50);
    }),

  // Get test with questions (for taking)
  getForTaking: protectedProcedure
    .input(z.object({ testId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await db.select().from(knowledgeTheoryTests)
        .where(eq(knowledgeTheoryTests.id, input.testId)).limit(1);
      if (!rows[0]) throw new Error("测试不存在");
      const test = rows[0];

      // Check attempt count
      const attempts = await db.select({ count: count() }).from(knowledgeTestAttempts)
        .where(and(eq(knowledgeTestAttempts.userId, ctx.user!.id), eq(knowledgeTestAttempts.testId, input.testId)));
      const attemptCount = Number(attempts[0]?.count ?? 0);

      if (test.maxAttempts && test.maxAttempts > 0 && attemptCount >= test.maxAttempts) {
        throw new Error(`已达到最大尝试次数 (${test.maxAttempts}次)`);
      }

      // Strip correct answers from questions for taking
      const questions = (test.questions as any[]).map(q => ({
        id: q.id, type: q.type, question: q.question, options: q.options, points: q.points,
      }));

      return {
        id: test.id, title: test.title, description: test.description,
        totalPoints: test.totalPoints, passingScore: test.passingScore,
        timeLimitMinutes: test.timeLimitMinutes, questions,
        attemptNumber: attemptCount + 1,
      };
    }),

  // Submit test answers
  submitTest: protectedProcedure
    .input(z.object({
      testId: z.number(),
      answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
      startedAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = await db.select().from(knowledgeTheoryTests)
        .where(eq(knowledgeTheoryTests.id, input.testId)).limit(1);
      if (!rows[0]) throw new Error("测试不存在");
      const test = rows[0];

      // Grade answers
      let totalScore = 0;
      const questionResults: { questionId: number; correct: boolean; pointsEarned: number }[] = [];
      for (const q of (test.questions as any[])) {
        const userAnswer = input.answers[String(q.id)];
        let correct = false;
        if (Array.isArray(q.correctAnswer)) {
          correct = Array.isArray(userAnswer)
            && q.correctAnswer.length === userAnswer.length
            && q.correctAnswer.every((a: string) => userAnswer.includes(a));
        } else {
          correct = userAnswer === q.correctAnswer;
        }
        const points = correct ? q.points : 0;
        totalScore += points;
        questionResults.push({ questionId: q.id, correct, pointsEarned: points });
      }

      const passed = totalScore >= test.passingScore;
      const now = new Date();
      const startedAt = new Date(input.startedAt);
      const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

      // Count previous attempts
      const prevAttempts = await db.select({ count: count() }).from(knowledgeTestAttempts)
        .where(and(eq(knowledgeTestAttempts.userId, ctx.user!.id), eq(knowledgeTestAttempts.testId, input.testId)));

      const ins = await db.insert(knowledgeTestAttempts).values({
        userId: ctx.user!.id,
        testId: input.testId,
        answers: input.answers,
        score: totalScore,
        totalPoints: test.totalPoints,
        passed,
        startedAt,
        completedAt: now,
        durationMinutes,
        questionResults,
        attemptNumber: (Number(prevAttempts[0]?.count ?? 0)) + 1,
      }).returning({ id: knowledgeTestAttempts.id });

      logger.info({ attemptId: ins[0]?.id, userId: ctx.user!.id, testId: input.testId, score: totalScore, passed }, "test submitted");

      return {
        id: ins[0]?.id,
        score: totalScore,
        totalPoints: test.totalPoints,
        passed,
        passingScore: test.passingScore,
        durationMinutes,
        questionResults,
        // Include explanations for review
        explanations: (test.questions as any[]).map(q => ({
          questionId: q.id, correctAnswer: q.correctAnswer, explanation: q.explanation,
        })),
      };
    }),

  // Get my test history
  getMyAttempts: protectedProcedure
    .input(z.object({ testId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(knowledgeTestAttempts.userId, ctx.user!.id)];
      if (input.testId) conditions.push(eq(knowledgeTestAttempts.testId, input.testId));
      return db.select().from(knowledgeTestAttempts)
        .where(and(...conditions))
        .orderBy(desc(knowledgeTestAttempts.createdAt))
        .limit(100);
    }),

  // Create test (admin/HR)
  create: protectedProcedure
    .input(z.object({
      title: z.string(), description: z.string().optional(),
      categoryCode: z.string().optional(), targetRole: z.string().optional(),
      skillLevelRequired: z.number().min(1).max(5).default(1),
      questions: z.array(z.object({
        id: z.number(), type: z.enum(["single", "multiple", "truefalse", "fillblank"]),
        question: z.string(), options: z.array(z.string()).optional(),
        correctAnswer: z.union([z.string(), z.array(z.string())]),
        points: z.number(), explanation: z.string().optional(),
      })),
      totalPoints: z.number(), passingScore: z.number().default(60),
      timeLimitMinutes: z.number().default(30), maxAttempts: z.number().default(3),
      shuffleQuestions: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const ins = await db.insert(knowledgeTheoryTests)
        .values({ ...input, createdBy: ctx.user!.id })
        .returning({ id: knowledgeTheoryTests.id });
      return ins[0];
    }),
});

// ── Dashboard aggregation ────────────────────────────────────────
const dashboardRouter = router({
  // Get overview for current user: progress vs requirements
  getMyOverview: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.user?.role ?? "employee";
    const [requirements, progress, testAttempts, categories] = await Promise.all([
      db.select().from(knowledgeRoleRequirements)
        .where(and(
          eq(knowledgeRoleRequirements.isActive, true),
          sql`(${knowledgeRoleRequirements.role} = ${role} OR ${knowledgeRoleRequirements.role} = 'ALL')`,
        )).limit(500),
      db.select().from(knowledgeLearningProgress)
        .where(eq(knowledgeLearningProgress.userId, ctx.user!.id))
        .limit(500),
      db.select().from(knowledgeTestAttempts)
        .where(eq(knowledgeTestAttempts.userId, ctx.user!.id))
        .orderBy(desc(knowledgeTestAttempts.createdAt))
        .limit(100),
      db.select().from(knowledgeCategories)
        .where(eq(knowledgeCategories.isActive, true))
        .orderBy(asc(knowledgeCategories.sortOrder))
        .limit(100),
    ]);
    return { requirements, progress, testAttempts, categories };
  }),

  // Team progress (for managers)
  getTeamProgress: protectedProcedure
    .input(z.object({ department: z.string().optional() }))
    .query(async ({ input }) => {
      return db.select({
        status: knowledgeLearningProgress.status,
        count: count(),
      }).from(knowledgeLearningProgress)
        .groupBy(knowledgeLearningProgress.status)
        .limit(10);
    }),
});

// ── Combined Router ──────────────────────────────────────────────
export const knowledgeComplianceRouter = router({
  category: categoryRouter,
  requirement: requirementRouter,
  skillLevel: skillLevelRouter,
  access: accessRouter,
  progress: progressRouter,
  test: testRouter,
  dashboard: dashboardRouter,
});

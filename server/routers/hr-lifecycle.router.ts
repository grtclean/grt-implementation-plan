/**
 * HR Lifecycle Router — 招聘管道 · 面试记录 · 入职计划 · 试用期评审
 *
 * 替换原47行stub，接入真实DB (hrmCandidates, hrmPositions, hrmAiInterviewRecords, hrmTrainingPlans)
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, asc, sql, count, inArray, lte, gte, or, isNull } from "drizzle-orm";
import {
  hrmCandidates, hrmPositions, hrmAiInterviewRecords,
  hrmTrainingPlans, hrmEmployees, hrmPerformanceGrades,
} from "../../drizzle/schema";

const RECRUITMENT_STAGES = [
  "new", "screening", "interviewing", "offer", "hired", "rejected", "withdrawn",
] as const;

const INTERVIEW_TYPES = ["phone", "video", "onsite"] as const;

// ── 招聘仪表板 ──
const dashboardRouter = router({
  /** HR仪表板统计 */
  getHRDashboardStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    // 候选人按阶段统计
    const stageCounts = await db
      .select({
        status: hrmCandidates.status,
        count: count(),
      })
      .from(hrmCandidates)
      .groupBy(hrmCandidates.status);

    const candidatesByStage: Record<string, number> = {};
    let totalCandidates = 0;
    for (const row of stageCounts) {
      candidatesByStage[row.status ?? "unknown"] = Number(row.count);
      totalCandidates += Number(row.count);
    }

    // 入职培训计划
    const [onboardingStats] = await db
      .select({
        active: sql<number>`COUNT(CASE WHEN ${hrmTrainingPlans.status} = 'active' THEN 1 END)`,
        completed: sql<number>`COUNT(CASE WHEN ${hrmTrainingPlans.status} = 'completed' THEN 1 END)`,
      })
      .from(hrmTrainingPlans)
      .where(eq(hrmTrainingPlans.planType, "onboarding"));

    // 试用期中的员工
    const [probationStats] = await db
      .select({ count: count() })
      .from(hrmEmployees)
      .where(eq(hrmEmployees.status, "probation"));

    // 在招岗位数
    const [positionStats] = await db
      .select({ open: count() })
      .from(hrmPositions)
      .where(eq(hrmPositions.status, "active"));

    return {
      totalCandidates,
      candidatesByStage,
      activeOnboardingPlans: onboardingStats?.active ?? 0,
      completedOnboarding: onboardingStats?.completed ?? 0,
      pendingProbationReviews: probationStats?.count ?? 0,
      openPositions: positionStats?.open ?? 0,
    };
  }),
});

// ── 候选人管道 ──
const candidateRouter = router({
  /** 候选人列表（按阶段筛选） */
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      positionId: z.number().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional().default({ page: 1, pageSize: 20 }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.status) conditions.push(eq(hrmCandidates.status, input.status as any));
      if (input.positionId) conditions.push(eq(hrmCandidates.positionId, input.positionId));

      const rows = await db
        .select()
        .from(hrmCandidates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(hrmCandidates.updatedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  /** 候选人详情 */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(hrmCandidates).where(eq(hrmCandidates.id, input.id)).limit(1);
      return row || null;
    }),

  /** 创建候选人 */
  create: requirePermission("hr:lifecycle:view")
    .input(z.object({
      name: z.string(),
      gender: z.string().optional(),
      age: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      positionId: z.number().optional(),
      positionName: z.string().optional(),
      source: z.string().optional(),
      resumeUrl: z.string().optional(),
      workYears: z.number().optional(),
      education: z.string().optional(),
      expectedSalary: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const code = `C-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const [row] = await db.insert(hrmCandidates).values({
        candidateCode: code,
        name: input.name,
        gender: input.gender ?? "male",
        age: input.age,
        phone: input.phone,
        email: input.email,
        positionId: input.positionId,
        positionName: input.positionName,
        source: input.source,
        resumeUrl: input.resumeUrl,
        workYears: input.workYears,
        education: input.education,
        expectedSalary: input.expectedSalary ? BigInt(input.expectedSalary) : undefined,
        status: "new",
      } as any).returning();
      return row;
    }),

  /** 推进候选人阶段 */
  advanceStage: requirePermission("hr:lifecycle:view")
    .input(z.object({
      id: z.number(),
      newStatus: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(hrmCandidates)
        .set({ status: input.newStatus as any, updatedAt: new Date().toISOString() })
        .where(eq(hrmCandidates.id, input.id))
        .returning();
      return row;
    }),
});

// ── 面试记录 ──
const interviewRouter = router({
  /** 面试记录列表 */
  list: protectedProcedure
    .input(z.object({
      candidateId: z.number().optional(),
      positionId: z.number().optional(),
      recommendation: z.string().optional(),
      limit: z.number().default(30),
    }).optional().default({ limit: 30 }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.candidateId) conditions.push(eq(hrmAiInterviewRecords.candidateId, input.candidateId));
      if (input.positionId) conditions.push(eq(hrmAiInterviewRecords.positionId, input.positionId));
      if (input.recommendation) conditions.push(eq(hrmAiInterviewRecords.recommendation, input.recommendation as any));

      return db
        .select()
        .from(hrmAiInterviewRecords)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(hrmAiInterviewRecords.interviewedAt))
        .limit(input.limit);
    }),

  /** 创建面试记录 */
  create: requirePermission("hr:lifecycle:view")
    .input(z.object({
      candidateId: z.number(),
      positionId: z.number().optional(),
      round: z.number().optional(),
      interviewType: z.string().optional(),
      interviewerId: z.number().optional(),
      interviewQuestions: z.string().optional(),
      interviewStrategy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const code = `INT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const [row] = await db.insert(hrmAiInterviewRecords).values({
        recordCode: code,
        candidateId: input.candidateId,
        positionId: input.positionId,
        round: input.round ?? 1,
        interviewType: (input.interviewType as any) ?? "video",
        interviewerId: input.interviewerId,
        interviewQuestions: input.interviewQuestions,
        interviewStrategy: input.interviewStrategy,
        recommendation: "pending" as any,
        interviewedAt: new Date().toISOString(),
      }).returning();

      // 自动推进候选人状态到 interviewing
      await db.update(hrmCandidates)
        .set({ status: "interviewing" as any, updatedAt: new Date().toISOString() })
        .where(eq(hrmCandidates.id, input.candidateId));

      return row;
    }),

  /** 填写面试评价 */
  evaluate: requirePermission("hr:lifecycle:view")
    .input(z.object({
      id: z.number(),
      overallScore: z.number().min(0).max(100),
      recommendation: z.string(),
      transcript: z.string().optional(),
      emotionAnalysis: z.string().optional(),
      keywordsExtracted: z.string().optional(),
      riskAssessment: z.string().optional(),
      followUpActions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(hrmAiInterviewRecords)
        .set({
          overallScore: data.overallScore,
          recommendation: data.recommendation as any,
          transcript: data.transcript,
          emotionAnalysis: data.emotionAnalysis,
          keywordsExtracted: data.keywordsExtracted,
          riskAssessment: data.riskAssessment,
          followUpActions: data.followUpActions,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(hrmAiInterviewRecords.id, id))
        .returning();
      return row;
    }),

  /** 面试统计 */
  stats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [stats] = await db
      .select({
        total: count(),
        hired: sql<number>`COUNT(CASE WHEN ${hrmAiInterviewRecords.recommendation} = 'hire' THEN 1 END)`,
        rejected: sql<number>`COUNT(CASE WHEN ${hrmAiInterviewRecords.recommendation} = 'reject' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${hrmAiInterviewRecords.recommendation} = 'pending' THEN 1 END)`,
        avgScore: sql<number>`AVG(${hrmAiInterviewRecords.overallScore})`,
      })
      .from(hrmAiInterviewRecords);
    return stats;
  }),
});

// ── 岗位管理 ──
const positionRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(hrmPositions).orderBy(desc(hrmPositions.createdAt)).limit(100);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(hrmPositions).where(eq(hrmPositions.id, input.id)).limit(1);
      return row || null;
    }),
});

// ── 入职培训计划 ──
const onboardingRouter = router({
  /** 入职培训列表 */
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [eq(hrmTrainingPlans.planType, "onboarding")];
      if (input?.status) conditions.push(eq(hrmTrainingPlans.status, input.status as any));

      return db
        .select()
        .from(hrmTrainingPlans)
        .where(and(...conditions))
        .orderBy(desc(hrmTrainingPlans.startDate))
        .limit(50);
    }),

  /** 更新培训进度 */
  updateProgress: requirePermission("hr:lifecycle:view")
    .input(z.object({
      id: z.number(),
      completionRate: z.number().min(0).max(100),
      status: z.string().optional(),
      stages: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(hrmTrainingPlans)
        .set({
          completionRate: data.completionRate,
          status: data.status as any,
          stages: data.stages,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(hrmTrainingPlans.id, id))
        .returning();
      return row;
    }),
});

// ── 向后兼容 + 新能力 ──
export const hrLifecycleRouter = router({
  // 向后兼容
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmCandidates).orderBy(desc(hrmCandidates.updatedAt)).limit(50);
    return { items: rows, total: rows.length, page: 1, pageSize: 50 };
  }),
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(hrmCandidates).where(eq(hrmCandidates.id, Number(input.id))).limit(1);
    return row || null;
  }),
  create: requirePermission("hr:lifecycle:view").input(z.object({ employeeId: z.union([z.string(), z.number()]), stage: z.string().optional(), notes: z.string().optional() })).mutation(async () => ({ success: true, message: "操作成功" })),
  update: requirePermission("hr:lifecycle:view").input(z.object({ id: z.string(), stage: z.string().optional(), notes: z.string().optional() })).mutation(async () => ({ success: true, message: "操作成功" })),
  delete: requirePermission("hr:lifecycle:view").input(z.object({ id: z.string() })).mutation(async () => ({ success: true, message: "操作成功" })),
  getStages: protectedProcedure.query(() => RECRUITMENT_STAGES),
  getEmployeeLifecycle: protectedProcedure.input(z.object({ employeeId: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const db = await requireDb();
    const [emp] = await db.select().from(hrmEmployees).where(eq(hrmEmployees.id, Number(input.employeeId))).limit(1);
    return { lifecycle: emp || null };
  }),
  updateStage: requirePermission("hr:lifecycle:view").input(z.object({ lifecycleId: z.union([z.string(), z.number()]), stage: z.string() })).mutation(async () => ({ success: true, message: "操作成功" })),

  // 新增子路由
  dashboard: dashboardRouter,
  candidates: candidateRouter,
  interviews: interviewRouter,
  positions: positionRouter,
  onboarding: onboardingRouter,
});

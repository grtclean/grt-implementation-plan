/**
 * Project Agent Router — AI-powered project lifecycle review engine
 *
 * Procedures:
 *  - triggerBomReview      — Create BOM review → submit AI task
 *  - triggerDrawingReview  — Create drawing review → submit AI task
 *  - getByProject          — List all reviews for a project
 *  - getById               — Single review detail
 *  - stats                 — Aggregate stats by type/status/verdict
 *  - dashboard             — High-level dashboard data
 *  - seedDemo              — Seed demo reviews for 2 sample projects
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { projectAgentReviews } from "../../drizzle/project-agent-schema";
import { projects } from "../../drizzle/schema";
import { submitTask } from "../services/task-worker.service";
import { eq, desc, sql, and, count } from "drizzle-orm";

export const projectAgentRouter = router({

  // ── Trigger BOM Review ──────────────────────────────────────
  triggerBomReview: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      bomItems: z.array(z.object({
        partName: z.string(),
        spec: z.string(),
        qty: z.number(),
        unitCost: z.number(),
      })).optional(),
      budget: z.number().optional(),
      customerRequirements: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Get project info
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1000);
      if (!project) throw new Error("项目不存在");

      // Create review record
      const [review] = await db.insert(projectAgentReviews).values({
        projectId: input.projectId,
        reviewType: "bom_review",
        triggerPhase: project.currentPhase || "M2",
        inputSummary: `BOM评审: ${(input.bomItems || []).length}项物料, 预算¥${input.budget || 0}`,
        inputPayload: input as Record<string, unknown>,
        status: "pending",
        reviewedBy: ctx.user?.name || "system",
      }).returning();

      // Submit AI task
      const { taskId } = await submitTask(
        "PROJECT_BOM_REVIEW",
        { reviewId: review.id, ...input, projectName: project.name },
        ctx.user?.name || "system",
      );

      // Link AI task ID
      await db.update(projectAgentReviews)
        .set({ aiTaskId: taskId })
        .where(eq(projectAgentReviews.id, review.id));

      return { success: true, reviewId: review.id, aiTaskId: taskId };
    }),

  // ── Trigger Drawing Review ──────────────────────────────────
  triggerDrawingReview: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      drawingList: z.array(z.object({
        name: z.string(),
        version: z.string(),
        hasGDT: z.boolean(),
        dimensions: z.number(),
      })).optional(),
      designStandards: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1000);
      if (!project) throw new Error("项目不存在");

      const [review] = await db.insert(projectAgentReviews).values({
        projectId: input.projectId,
        reviewType: "drawing_review",
        triggerPhase: project.currentPhase || "M3",
        inputSummary: `图纸评审: ${(input.drawingList || []).length}份图纸`,
        inputPayload: input as Record<string, unknown>,
        status: "pending",
        reviewedBy: ctx.user?.name || "system",
      }).returning();

      const { taskId } = await submitTask(
        "PROJECT_DRAWING_REVIEW",
        { reviewId: review.id, ...input, projectName: project.name },
        ctx.user?.name || "system",
      );

      await db.update(projectAgentReviews)
        .set({ aiTaskId: taskId })
        .where(eq(projectAgentReviews.id, review.id));

      return { success: true, reviewId: review.id, aiTaskId: taskId };
    }),

  // ── Get Reviews by Project ──────────────────────────────────
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const reviews = await db.select()
        .from(projectAgentReviews)
        .where(eq(projectAgentReviews.projectId, input.projectId))
        .orderBy(desc(projectAgentReviews.createdAt)).limit(1000);
      return reviews;
    }),

  // ── Get Single Review ───────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [review] = await db.select()
        .from(projectAgentReviews)
        .where(eq(projectAgentReviews.id, input.id)).limit(1000);
      return review || null;
    }),

  // ── Stats ───────────────────────────────────────────────────
  stats: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      const byType = await db.select({
        reviewType: projectAgentReviews.reviewType,
        count: count(),
      })
        .from(projectAgentReviews)
        .groupBy(projectAgentReviews.reviewType);

      const byStatus = await db.select({
        status: projectAgentReviews.status,
        count: count(),
      })
        .from(projectAgentReviews)
        .groupBy(projectAgentReviews.status);

      const byVerdict = await db.select({
        verdict: projectAgentReviews.verdict,
        count: count(),
      })
        .from(projectAgentReviews)
        .groupBy(projectAgentReviews.verdict);

      return { byType, byStatus, byVerdict };
    }),

  // ── Dashboard ───────────────────────────────────────────────
  dashboard: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      const [activeProjects] = await db.select({ count: count() })
        .from(projects)
        .where(eq(projects.status as any, "active"));

      const [pendingReviews] = await db.select({ count: count() })
        .from(projectAgentReviews)
        .where(eq(projectAgentReviews.status, "pending"));

      const [processingReviews] = await db.select({ count: count() })
        .from(projectAgentReviews)
        .where(eq(projectAgentReviews.status, "processing"));

      const highRisk = await db.select({
        projectId: projectAgentReviews.projectId,
        riskScore: projectAgentReviews.riskScore,
        predictedDelay: projectAgentReviews.predictedDelay,
      })
        .from(projectAgentReviews)
        .where(and(
          eq(projectAgentReviews.reviewType, "delay_prediction"),
          eq(projectAgentReviews.status, "completed"),
          sql`${projectAgentReviews.riskScore} > 50`,
        ))
        .orderBy(desc(projectAgentReviews.riskScore))
        .limit(10);

      return {
        activeProjects: activeProjects?.count ?? 0,
        pendingReviews: (pendingReviews?.count ?? 0) + (processingReviews?.count ?? 0),
        highRiskProjects: highRisk,
      };
    }),

  // ── Seed Demo ───────────────────────────────────────────────
  seedDemo: protectedProcedure
    .mutation(async () => {
      const db = await requireDb();

      // Find or create demo projects
      let [projA] = await db.select().from(projects).where(eq(projects.name, "清洗线A项目")).limit(1);
      if (!projA) {
        [projA] = await db.insert(projects).values({
          projectCode: "PRJ-DEMO-A",
          name: "清洗线A项目",
          shortName: "清洗A",
          type: "key",
          status: "active",
          priority: "high",
          currentPhase: "M5",
          budget: 2800000,
          actualCost: 2100000,
          completionPercent: 45,
          healthStatus: "yellow",
          version: 1,
        }).returning();
      }

      let [projB] = await db.select().from(projects).where(eq(projects.name, "清洗线B项目")).limit(1);
      if (!projB) {
        [projB] = await db.insert(projects).values({
          projectCode: "PRJ-DEMO-B",
          name: "清洗线B项目",
          shortName: "清洗B",
          type: "standard",
          status: "active",
          priority: "medium",
          currentPhase: "M3",
          budget: 1500000,
          actualCost: 350000,
          completionPercent: 20,
          healthStatus: "green",
          version: 1,
        }).returning();
      }

      // Seed reviews for Project A
      const now = new Date().toISOString();
      const seedReviews = [
        // Project A: Completed BOM review
        {
          projectId: projA.id,
          reviewType: "bom_review" as const,
          triggerPhase: "M2",
          inputSummary: "BOM评审: 28项物料, 预算¥2,800,000",
          status: "completed" as const,
          verdict: "conditional",
          confidence: 78,
          findings: [
            { severity: "error", category: "compliance", message: "BOM缺少防爆等级说明", recommendation: "补充防爆等级物料规格，参考ATEX标准" },
            { severity: "warning", category: "cost", message: "BOM总成本超预算15%", recommendation: "审查高成本物料，考虑国产替代方案" },
            { severity: "info", category: "completeness", message: "辅助耗材清单完整", recommendation: "无需调整" },
          ] as any,
          narrative: "BOM整体结构合理，但缺少防爆等级物料规格说明，需在M3前补充。成本超预算15%，建议审查进口物料的国产替代方案。",
          reviewedBy: "AI-Agent",
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        // Project A: Completed delay prediction
        {
          projectId: projA.id,
          reviewType: "delay_prediction" as const,
          triggerPhase: "M5",
          inputSummary: "延期预测: M5阶段, 健康状态黄色",
          status: "completed" as const,
          verdict: "at_risk",
          confidence: 72,
          riskScore: 72,
          predictedDelay: 21,
          riskFactors: [
            { factor: "预算利用率", weight: 0.25, description: "已用75%预算，进度仅45%" },
            { factor: "里程碑延期", weight: 0.3, description: "2/8个里程碑已延期" },
            { factor: "健康状态", weight: 0.3, description: "项目健康状态: yellow" },
          ] as any,
          narrative: "项目存在延期风险(72/100)，预计延期约21天。主要风险因素：预算利用率偏高(75%预算/45%进度)，2个里程碑延期。",
          reviewedBy: "AI-Agent",
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        // Project B: Processing drawing review (for skeleton demo)
        {
          projectId: projB.id,
          reviewType: "drawing_review" as const,
          triggerPhase: "M3",
          inputSummary: "图纸评审: 12份图纸",
          status: "processing" as const,
          reviewedBy: "AI-Agent",
          createdAt: now,
          updatedAt: now,
        },
        // Project B: Completed BOM review
        {
          projectId: projB.id,
          reviewType: "bom_review" as const,
          triggerPhase: "M2",
          inputSummary: "BOM评审: 15项物料, 预算¥1,500,000",
          status: "completed" as const,
          verdict: "pass",
          confidence: 85,
          findings: [
            { severity: "info", category: "completeness", message: "BOM完整，所有物料规格齐全", recommendation: "无需调整" },
            { severity: "warning", category: "lead_time", message: "2项进口物料交期较长(8周)", recommendation: "提前下单或准备国产备选" },
          ] as any,
          narrative: "BOM评审通过。15项物料规格完整，预算合理。建议关注2项进口物料的交期风险。",
          reviewedBy: "AI-Agent",
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const review of seedReviews) {
        await db.insert(projectAgentReviews).values(review);
      }

      return { success: true, message: `Seeded ${seedReviews.length} reviews for 2 demo projects`, projectIds: [projA.id, projB.id] };
    }),
});

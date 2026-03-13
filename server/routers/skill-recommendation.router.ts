/**
 * Skill Recommendation Router — GRT开发第一定律 compliant
 *
 * All LLM calls use async task queue pattern:
 *   startRecommendations → taskId → getTaskResult (poll)
 *   startLearningPath → taskId → getTaskResult (poll)
 */
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { employeeSkillMaps, aiLearningRecords } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { createChildLogger } from "../lib/logger";
import { submitTask, getTaskStatus, registerTaskHandler } from "../services/task-worker.service";

const log = createChildLogger("skill-rec");

// ── Register async task handlers ────────────────────────────

registerTaskHandler("SKILL_RECOMMEND", async (_taskId, input) => {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a professional skill development advisor. Provide personalized skill recommendations based on the user's current skills and learning history.",
      },
      { role: "user", content: input.prompt as string },
    ],
  });
  let recommendations: unknown[] = [];
  try {
    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      recommendations = parsed.recommendations || [];
    }
  } catch (error) {
    log.error({ err: error }, "failed to parse recommendations");
  }
  return { recommendations, totalCount: recommendations.length };
});

registerTaskHandler("SKILL_LEARNING_PATH", async (_taskId, input) => {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a learning path designer. Create clear, actionable learning paths with specific resources and milestones.",
      },
      { role: "user", content: input.prompt as string },
    ],
  });
  let learningPath = null;
  try {
    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      learningPath = parsed.learningPath;
    }
  } catch (error) {
    log.error({ err: error }, "failed to parse learning path");
  }
  return { learningPath };
});

// ── Router ──────────────────────────────────────────────────

export const skillRecommendationRouter = router({
  /**
   * startRecommendations — enqueue AI recommendation task, returns taskId
   * GRT开发第一定律: async task queue, never blocks
   */
  startRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const currentSkills = await db.select().from(employeeSkillMaps)
        .where(eq(employeeSkillMaps.employeeId, ctx.user.id));

      const learningRecords = await db.select().from(aiLearningRecords)
        .where(eq(aiLearningRecords.employeeId, ctx.user.id))
        .limit(10);

      const prompt = `Based on the user's current skills and learning history, recommend ${input.limit} skills to learn next.

Current skills:
${currentSkills.map(s => `- ${s.skillName}: Level ${s.currentLevel}/5`).join('\n')}

Learning history:
${learningRecords.map(r => `- ${r.contentCategory}: ${r.learningSource}`).join('\n')}

Return a JSON object with a "recommendations" array containing skill objects with: name, description, currentLevel, targetLevel, estimatedTime, priority, relatedSkills, and confidenceScore.`;

      const { taskId } = await submitTask(
        "SKILL_RECOMMEND",
        { prompt },
        ctx.user.name ?? `user-${ctx.user.id}`,
        { submittedById: ctx.user.id },
      );
      return { taskId };
    }),

  /**
   * startLearningPath — enqueue AI learning path generation, returns taskId
   */
  startLearningPath: protectedProcedure
    .input(z.object({
      skillName: z.string(),
      targetLevel: z.number().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const prompt = `Create a detailed learning path for ${input.skillName} from current level to level ${input.targetLevel}.

Return a JSON object with a "learningPath" object containing: skillName, targetLevel, stages (array of stage objects with: stage number, level, duration, resources, projects, checkpoints).`;

      const { taskId } = await submitTask(
        "SKILL_LEARNING_PATH",
        { prompt },
        ctx.user.name ?? `user-${ctx.user.id}`,
        { submittedById: ctx.user.id },
      );
      return { taskId };
    }),

  /**
   * getTaskResult — poll for async task result (recommendations or learning path)
   */
  getTaskResult: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const task = await getTaskStatus(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      return {
        status: task.status,
        result: task.resultData,
        error: task.errorMessage,
      };
    }),

  recordRecommendationFeedback: requirePermission('capability:matrix:manage')
    .input(z.object({
      skillName: z.string(),
      helpful: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      log.info({ userId: ctx.user.id, skillName: input.skillName, helpful: input.helpful }, "user provided feedback on skill recommendation");
      return { success: true, message: "Feedback recorded successfully" };
    }),

  getRecommendationStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    const skills = await db.select().from(employeeSkillMaps)
      .where(eq(employeeSkillMaps.employeeId, ctx.user.id));

    const averageLevel = skills.length > 0
      ? Math.round((skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length) * 10) / 10
      : 0;

    return {
      success: true,
      stats: {
        totalSkills: skills.length,
        averageLevel,
        masterSkills: skills.filter(s => s.currentLevel >= 4).length,
        developingSkills: skills.filter(s => s.currentLevel >= 2 && s.currentLevel < 4).length,
        beginnerSkills: skills.filter(s => s.currentLevel < 2).length,
      },
    };
  }),
});

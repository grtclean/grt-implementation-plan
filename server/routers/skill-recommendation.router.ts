import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { employeeSkillMaps, aiLearningRecords } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

export const skillRecommendationRouter = router({
  getRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const currentSkills = await db
          .select()
          .from(employeeSkillMaps)
          .where(eq(employeeSkillMaps.employeeId, ctx.user.id));

        const learningRecords = await db
          .select()
          .from(aiLearningRecords)
          .where(eq(aiLearningRecords.employeeId, ctx.user.id))
          .limit(10);

        const prompt = `Based on the user's current skills and learning history, recommend ${input.limit} skills to learn next.

Current skills:
${currentSkills.map(s => `- ${s.skillName}: Level ${s.currentLevel}/5`).join('\n')}

Learning history:
${learningRecords.map(r => `- ${r.contentCategory}: ${r.learningSource}`).join('\n')}

Return a JSON object with a "recommendations" array containing skill objects with: name, description, currentLevel, targetLevel, estimatedTime, priority, relatedSkills, and confidenceScore.`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional skill development advisor. Provide personalized skill recommendations based on the user's current skills and learning history.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        let recommendations = [];
        try {
          const content = response.choices[0].message.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content);
            recommendations = parsed.recommendations || [];
          }
        } catch (error) {
          console.error("Failed to parse recommendations:", error);
        }

        return {
          success: true,
          recommendations,
          totalCount: recommendations.length,
        };
      } catch (error) {
        console.error("Error getting recommendations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recommendations",
        });
      }
    }),

  getLearningPath: protectedProcedure
    .input(z.object({
      skillName: z.string(),
      targetLevel: z.number().min(1).max(5),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const currentSkill = await db
          .select()
          .from(employeeSkillMaps)
          .where(eq(employeeSkillMaps.employeeId, ctx.user.id));

        const prompt = `Create a detailed learning path for ${input.skillName} from current level to level ${input.targetLevel}.

Return a JSON object with a "learningPath" object containing: skillName, targetLevel, stages (array of stage objects with: stage number, level, duration, resources, projects, checkpoints).`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a learning path designer. Create clear, actionable learning paths with specific resources and milestones.",
            },
            {
              role: "user",
              content: prompt,
            },
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
          console.error("Failed to parse learning path:", error);
        }

        return {
          success: true,
          learningPath,
        };
      } catch (error) {
        console.error("Error getting learning path:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get learning path",
        });
      }
    }),

  recordRecommendationFeedback: protectedProcedure
    .input(z.object({
      skillName: z.string(),
      helpful: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`User ${ctx.user.id} provided feedback on skill recommendation:`, input);
        return {
          success: true,
          message: "Feedback recorded successfully",
        };
      } catch (error) {
        console.error("Error recording feedback:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record feedback",
        });
      }
    }),

  getRecommendationStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const skills = await db
        .select()
        .from(employeeSkillMaps)
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
    } catch (error) {
      console.error("Error getting stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get stats",
      });
    }
  }),
});

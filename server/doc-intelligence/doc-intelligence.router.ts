/**
 * 文档智能tRPC路由 (Document Intelligence Router)
 * Phase A: 工程文档AI推荐系统
 *
 * 端点：
 * - searchDocuments: 语义搜索文档
 * - getStageRecommendations: 获取阶段文档推荐
 * - getStageRequirements: 获取阶段文档需求清单
 * - getAllStageRequirements: 获取所有阶段文档需求
 * - getDocumentCompleteness: 检查文档完备性
 * - getProjectDocumentOverview: 项目文档全览
 * - embedDocument: 为文档生成嵌入
 * - rebuildIndex: 重建嵌入索引（管理员）
 * - getStats: 获取嵌入统计
 * - initRequirements: 初始化默认文档需求
 * - submitFeedback: 提交推荐反馈
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import {
  searchSimilarByText,
  findSimilarDocuments,
  embedDocument,
  embedProjectDocuments,
  embedTechnicalDocuments,
  getEmbeddingStats,
  type DocumentForEmbedding,
} from "./embedding.service";
import {
  getStageRequirements,
  getAllStageRequirements,
  checkDocumentCompleteness,
  getStageRecommendations,
  getProjectDocumentOverview,
  initDefaultRequirements,
  logRecommendation,
  updateRecommendationFeedback,
} from "./recommendation.service";

export const docIntelligenceRouter = router({
  /**
   * 语义搜索文档
   */
  searchDocuments: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        stageCode: z.string().optional(),
        projectId: z.number().optional(),
        limit: z.number().min(1).max(50).default(10),
        minSimilarity: z.number().min(0).max(1).default(0.2),
      })
    )
    .query(async ({ input }) => {
      const results = await searchSimilarByText(input.query, {
        stageCode: input.stageCode,
        projectId: input.projectId,
        limit: input.limit,
        minSimilarity: input.minSimilarity,
      });
      return { results, total: results.length };
    }),

  /**
   * 查找与指定文档相似的文档
   */
  findSimilar: protectedProcedure
    .input(
      z.object({
        sourceTable: z.string(),
        sourceId: z.number(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const results = await findSimilarDocuments(input.sourceTable, input.sourceId, {
        limit: input.limit,
      });
      return { results };
    }),

  /**
   * 获取阶段文档推荐（含AI建议）
   */
  getStageRecommendations: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        stageCode: z.string(),
        includeAiReasoning: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const recommendation = await getStageRecommendations(input.projectId, input.stageCode, {
        includeAiReasoning: input.includeAiReasoning,
      });

      // 记录推荐日志
      if (recommendation.referenceDocuments.length > 0 && ctx.user) {
        try {
          await logRecommendation({
            projectId: input.projectId,
            stageCode: input.stageCode,
            userId: ctx.user.id,
            recommendedDocIds: recommendation.referenceDocuments.map((d) => d.id),
            similarityScores: recommendation.referenceDocuments.map((d) => d.similarity),
            aiReasoning: recommendation.aiReasoning,
          });
        } catch {
          // 日志记录失败不影响主流程
        }
      }

      return recommendation;
    }),

  /**
   * 获取指定阶段的文档需求清单
   */
  getStageRequirements: protectedProcedure
    .input(z.object({ stageCode: z.string() }))
    .query(async ({ input }) => {
      return await getStageRequirements(input.stageCode);
    }),

  /**
   * 获取所有阶段的文档需求（M0-M12）
   */
  getAllStageRequirements: protectedProcedure.query(async () => {
    return await getAllStageRequirements();
  }),

  /**
   * 检查项目在指定阶段的文档完备性
   */
  getDocumentCompleteness: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        stageCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await checkDocumentCompleteness(input.projectId, input.stageCode);
    }),

  /**
   * 获取项目所有阶段的文档完备性总览
   */
  getProjectDocumentOverview: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getProjectDocumentOverview(input.projectId);
    }),

  /**
   * 为单个文档生成嵌入
   */
  embedDocument: protectedProcedure
    .input(
      z.object({
        sourceTable: z.enum(["project_documents", "technical_documents"]),
        sourceId: z.number(),
        projectId: z.number().nullable(),
        stageCode: z.string().nullable(),
        title: z.string(),
        type: z.string().nullable(),
        content: z.string().nullable(),
        description: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await embedDocument(input as DocumentForEmbedding);
      return { embeddingId: id };
    }),

  /**
   * 重建嵌入索引（管理员操作）
   */
  rebuildIndex: adminProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const projectDocsCount = await embedProjectDocuments(input.projectId);
      const techDocsCount = await embedTechnicalDocuments(input.projectId);
      return {
        projectDocumentsEmbedded: projectDocsCount,
        technicalDocumentsEmbedded: techDocsCount,
        total: projectDocsCount + techDocsCount,
      };
    }),

  /**
   * 获取嵌入统计信息
   */
  getStats: protectedProcedure.query(async () => {
    return await getEmbeddingStats();
  }),

  /**
   * 初始化默认阶段文档需求
   */
  initRequirements: adminProcedure.mutation(async () => {
    const count = await initDefaultRequirements();
    return { initialized: count };
  }),

  /**
   * 提交推荐反馈
   */
  submitFeedback: requirePermission('ai:rag:train')
    .input(
      z.object({
        logId: z.number(),
        feedback: z.enum(["helpful", "not_helpful"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRecommendationFeedback(input.logId, input.feedback, input.comment);
      return { success: true };
    }),
});

export type DocIntelligenceRouter = typeof docIntelligenceRouter;

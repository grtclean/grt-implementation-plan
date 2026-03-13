/**
 * 知识库路由 (Knowledge Base Router)
 *
 * tRPC端点，提供RAG知识库的CRUD和检索功能。
 *
 * 端点:
 *   - knowledgeBase.list             分页列表（支持多维过滤）
 *   - knowledgeBase.create           创建知识条目
 *   - knowledgeBase.search           全文搜索 + 相关性评分（RAG主端点）
 *   - knowledgeBase.getRelated       根据阶段/工序/标签查找相关文档
 *   - knowledgeBase.seed             预填充初始知识数据
 *   - knowledgeBase.incrementRelevance  提升文档使用热度
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import {
  listDocuments,
  createDocument,
  searchDocuments,
  getRelatedDocuments,
  incrementRelevance,
  seedInitialKnowledge,
  parseUploadedContent,
  ingestConfirmedSegments,
  getTrainingStats,
} from "./knowledge-base.service";

const categorySchema = z.enum([
  "technical",
  "process",
  "material",
  "standard",
  "case_study",
  "faq",
]);

const sourceSchema = z.enum([
  "manual",
  "plm_import",
  "erp_import",
  "meeting_extract",
]);

export const knowledgeBaseRouter = router({
  /**
   * 分页列表，支持 category / stageCode / processCode / keyword / tags 过滤
   */
  list: protectedProcedure
    .input(
      z.object({
        category: categorySchema.optional(),
        stageCode: z.string().optional(),
        processCode: z.string().optional(),
        keyword: z.string().optional(),
        tags: z.array(z.string()).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, ...filters } = input;
      const offset = (page - 1) * pageSize;

      const result = await listDocuments({
        ...filters,
        limit: pageSize,
        offset,
      });

      return {
        items: result.items,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      };
    }),

  /**
   * 创建知识条目
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        category: categorySchema,
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        projectId: z.number().optional(),
        stageCode: z.string().max(10).optional(),
        processCode: z.string().max(10).optional(),
        source: sourceSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const doc = await createDocument({
        ...input,
        createdBy: ctx.user?.id ?? 0,
      });

      return {
        success: true,
        document: doc,
        message: "知识条目已创建",
      };
    }),

  /**
   * **RAG主端点**: 全文搜索 + 关键词匹配 + 相关性评分
   *
   * 搜索 title、content、tags，按匹配度评分排序返回。
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        category: categorySchema.optional(),
        stageCode: z.string().optional(),
        processCode: z.string().optional(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      const { query, ...options } = input;
      const results = await searchDocuments(query, options);

      return {
        results,
        total: results.length,
        query,
      };
    }),

  /**
   * 根据上下文（stageCode / processCode / tags）查找相关文档
   */
  getRelated: protectedProcedure
    .input(
      z.object({
        stageCode: z.string().optional(),
        processCode: z.string().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      const results = await getRelatedDocuments(input);

      return {
        results,
        total: results.length,
      };
    }),

  /**
   * 预填充初始GRT技术知识数据
   */
  seed: requirePermission('ai:rag:train').mutation(async ({ ctx }) => {
    const result = await seedInitialKnowledge(ctx.user?.id ?? 0);
    return result;
  }),

  /**
   * 文档使用后提升相关性分数
   */
  incrementRelevance: requirePermission('ai:rag:train')
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await incrementRelevance(input.id);

      if (!updated) {
        return {
          success: false,
          message: `知识条目 #${input.id} 不存在`,
        };
      }

      return {
        success: true,
        document: updated,
        message: `知识条目 #${input.id} 相关性分数已提升`,
      };
    }),

  // ============================================================
  // RAG Training Center Endpoints
  // ============================================================

  /**
   * 解析上传内容，返回可编辑的段落列表
   */
  parseContent: requirePermission('ai:rag:train')
    .input(
      z.object({
        content: z.string().min(1),
        fileName: z.string().min(1),
        fileType: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const result = parseUploadedContent(
        input.content,
        input.fileName,
        input.fileType
      );
      return result;
    }),

  /**
   * 确认并批量入库段落
   */
  ingestSegments: protectedProcedure
    .input(
      z.object({
        segments: z.array(
          z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            category: z.string().min(1),
            tags: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ingestConfirmedSegments(
        input.segments,
        ctx.user?.id ?? 0
      );
      return {
        success: true,
        count: result.count,
        message: `成功入库 ${result.count} 条知识条目`,
      };
    }),

  /**
   * 获取知识库训练统计数据
   */
  getTrainingStats: protectedProcedure.query(async () => {
    return await getTrainingStats();
  }),
});

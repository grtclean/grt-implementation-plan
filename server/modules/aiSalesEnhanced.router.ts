/**
 * AI销售增强功能 - tRPC路由
 * 功能：ZOPA计算、情绪分析、谈判策略推荐
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  ZOPACalculator,
  EmotionAnalyzer,
  NegotiationStrategyRecommender,
} from "../services/ai-sales-enhanced.service";

export const aiSalesEnhancedRouter = router({
  // ==================== ZOPA计算 ====================

  // 计算ZOPA
  calculateZOPA: protectedProcedure
    .input(
      z.object({
        opportunityId: z.number().optional(),
        sellerReservationPrice: z.number().positive(),
        sellerTargetPrice: z.number().positive(),
        buyerReservationPrice: z.number().positive(),
        buyerTargetPrice: z.number().positive(),
        marketBenchmark: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { opportunityId, ...zopaParams } = input;

      // 计算ZOPA
      const result = ZOPACalculator.calculate(zopaParams);

      // 如果关联商机，保存计算结果
      if (opportunityId) {
        await (db as any).execute(
          `INSERT INTO zopa_calculations
           (opportunity_id, user_id, seller_reservation, seller_target,
            buyer_reservation, buyer_target, market_benchmark,
            zopa_exists, zopa_low, zopa_high, optimal_price, risk_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            opportunityId,
            ctx.user?.id,
            zopaParams.sellerReservationPrice,
            zopaParams.sellerTargetPrice,
            zopaParams.buyerReservationPrice,
            zopaParams.buyerTargetPrice,
            zopaParams.marketBenchmark || null,
            result.zopaExists,
            result.zopaRange?.low || null,
            result.zopaRange?.high || null,
            result.optimalPrice,
            result.riskAssessment.level,
          ]
        );
      }

      return result;
    }),

  // 获取商机的ZOPA历史
  getZOPAHistory: protectedProcedure
    .input(
      z.object({
        opportunityId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { opportunityId, limit } = input;

      const result = await (db as any).execute(
        `SELECT * FROM zopa_calculations
         WHERE opportunity_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [opportunityId, limit]
      );
      const rows = (result.rows || result[0] || []) as any[];

      return rows;
    }),

  // ==================== 情绪分析 ====================

  // 分析单条消息情绪
  analyzeEmotion: requirePermission('crm:leads:manage')
    .input(
      z.object({
        text: z.string().min(1),
        opportunityId: z.number().optional(),
        contactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { text, opportunityId, contactId } = input;

      // 执行情绪分析
      const result = await EmotionAnalyzer.analyze(text);

      // 保存分析结果
      await (db as any).execute(
        `INSERT INTO emotion_analyses
         (user_id, opportunity_id, contact_id, text_content,
          primary_emotion, emotion_score, confidence,
          signals, concerns, opportunities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ctx.user?.id,
          opportunityId || null,
          contactId || null,
          text.substring(0, 1000), // 限制存储长度
          result.primaryEmotion,
          result.emotionScore,
          result.confidence,
          JSON.stringify(result.signals),
          JSON.stringify(result.concerns),
          JSON.stringify(result.opportunities),
        ]
      );

      return result;
    }),

  // 分析沟通趋势
  analyzeEmotionTrend: protectedProcedure
    .input(
      z.object({
        opportunityId: z.number().optional(),
        contactId: z.number().optional(),
        messages: z
          .array(
            z.object({
              content: z.string(),
              timestamp: z.string(),
            })
          )
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { opportunityId, contactId, messages } = input;

      // 如果提供了消息列表，直接分析
      if (messages && messages.length > 0) {
        return EmotionAnalyzer.analyzeTrend(messages);
      }

      // 否则从数据库获取历史分析
      let query = `SELECT primary_emotion, emotion_score, created_at 
                   FROM emotion_analyses WHERE 1=1`;
      const params: unknown[] = [];

      if (opportunityId) {
        query += ` AND opportunity_id = ?`;
        params.push(opportunityId);
      }
      if (contactId) {
        query += ` AND contact_id = ?`;
        params.push(contactId);
      }

      query += ` ORDER BY created_at DESC LIMIT 20`;

      const queryResult = await (db as any).execute(query, params);
      const analyses = (queryResult.rows || queryResult[0] || []) as any[];

      if (analyses.length === 0) {
        return {
          averageScore: 50,
          trend: "stable" as const,
          dominantEmotion: "neutral",
          emotionDistribution: {},
          analysisCount: 0,
          recommendation: "暂无足够数据进行趋势分析",
        };
      }

      // 计算趋势
      const scores = analyses.map((a) => a.emotion_score);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      let trend: "improving" | "declining" | "stable" = "stable";
      if (scores.length >= 3) {
        const recentAvg = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const earlierAvg =
          scores.slice(3).reduce((a, b) => a + b, 0) /
          Math.max(scores.length - 3, 1);

        if (recentAvg - earlierAvg > 10) trend = "improving";
        else if (earlierAvg - recentAvg > 10) trend = "declining";
      }

      // 统计情绪分布
      const emotionCounts: Record<string, number> = {};
      analyses.forEach((a) => {
        emotionCounts[a.primary_emotion] =
          (emotionCounts[a.primary_emotion] || 0) + 1;
      });

      const dominantEmotion =
        Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "neutral";

      return {
        averageScore: Math.round(avgScore),
        trend,
        dominantEmotion,
        emotionDistribution: emotionCounts,
        analysisCount: analyses.length,
        recommendation:
          trend === "declining"
            ? "客户情绪呈下降趋势，建议暂停推进"
            : trend === "improving"
            ? "客户情绪正在改善，可以推进下一步"
            : "客户情绪稳定，按正常节奏推进",
      };
    }),

  // ==================== 综合谈判策略 ====================

  // 获取综合谈判策略
  getComprehensiveStrategy: protectedProcedure
    .input(
      z.object({
        zopaParams: z.object({
          sellerReservationPrice: z.number().positive(),
          sellerTargetPrice: z.number().positive(),
          buyerReservationPrice: z.number().positive(),
          buyerTargetPrice: z.number().positive(),
          marketBenchmark: z.number().positive().optional(),
        }),
        emotionText: z.string().min(1),
        context: z
          .object({
            productName: z.string().optional(),
            customerIndustry: z.string().optional(),
            stage: z.string().optional(),
            previousInteractions: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { zopaParams, emotionText, context } = input;

      // 计算ZOPA
      const zopaResult = ZOPACalculator.calculate(zopaParams);

      // 分析情绪
      const emotionResult = await EmotionAnalyzer.analyze(emotionText);

      // 生成综合策略
      const strategy = await NegotiationStrategyRecommender.recommend(
        zopaResult,
        emotionResult,
        context || {}
      );

      return {
        zopa: zopaResult,
        emotion: emotionResult,
        strategy,
      };
    }),

  // ==================== 谈判记录管理 ====================

  // 保存谈判记录
  saveNegotiationRecord: protectedProcedure
    .input(
      z.object({
        opportunityId: z.number(),
        stage: z.string(),
        ourPosition: z.number(),
        theirPosition: z.number(),
        outcome: z.enum(["progress", "stalemate", "breakthrough", "failed"]),
        notes: z.string().optional(),
        nextSteps: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const {
        opportunityId,
        stage,
        ourPosition,
        theirPosition,
        outcome,
        notes,
        nextSteps,
      } = input;

      const result = await (db as any).execute(
        `INSERT INTO negotiation_records
         (opportunity_id, user_id, stage, our_position, their_position,
          outcome, notes, next_steps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opportunityId,
          ctx.user?.id,
          stage,
          ourPosition,
          theirPosition,
          outcome,
          notes || null,
          nextSteps || null,
        ]
      );

      return { id: (result as any).insertId || (result as any).rows?.[0]?.id, success: true };
    }),

  // 获取谈判历史
  getNegotiationHistory: protectedProcedure
    .input(
      z.object({
        opportunityId: z.number(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { opportunityId, limit } = input;

      const result = await (db as any).execute(
        `SELECT nr.*, u.name as user_name
         FROM negotiation_records nr
         LEFT JOIN "user" u ON nr.user_id = u.id
         WHERE nr.opportunity_id = ?
         ORDER BY nr.created_at DESC LIMIT ?`,
        [opportunityId, limit]
      );
      const rows = (result.rows || result[0] || []) as any[];

      return rows;
    }),

  // 获取谈判统计
  getNegotiationStats: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, dateFrom, dateTo } = input;
      const targetUserId = userId || ctx.user?.id;

      let query = `SELECT 
        COUNT(*) as total_negotiations,
        COUNT(CASE WHEN outcome = 'breakthrough' THEN 1 END) as breakthroughs,
        COUNT(CASE WHEN outcome = 'progress' THEN 1 END) as progresses,
        COUNT(CASE WHEN outcome = 'stalemate' THEN 1 END) as stalemates,
        COUNT(CASE WHEN outcome = 'failed' THEN 1 END) as failures,
        AVG(our_position) as avg_our_position,
        AVG(their_position) as avg_their_position
      FROM negotiation_records WHERE 1=1`;
      const params: unknown[] = [];

      if (targetUserId) {
        query += ` AND user_id = ?`;
        params.push(targetUserId);
      }
      if (dateFrom) {
        query += ` AND created_at >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ` AND created_at <= ?`;
        params.push(dateTo);
      }

      const queryResult = await (db as any).execute(query, params);
      const statsRows = (queryResult.rows || queryResult[0] || []) as any[];
      const stats = statsRows[0];

      // 计算成功率
      const successRate =
        stats.total_negotiations > 0
          ? Math.round(
              ((stats.breakthroughs + stats.progresses) /
                stats.total_negotiations) *
                100
            )
          : 0;

      return {
        ...stats,
        successRate,
        avgGap:
          Math.round(
            Math.abs(stats.avg_our_position - stats.avg_their_position) * 100
          ) / 100,
      };
    }),
});

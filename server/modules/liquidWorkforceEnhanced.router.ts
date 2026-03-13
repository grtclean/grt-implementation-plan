/**
 * 液态用工增强功能 - tRPC路由扩展
 * 功能：ZKP技能证明、技能市场匹配
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  ZKPSkillProver,
  SkillMarketMatcher,
  aiEnhancedMatching,
} from "../services/liquid-workforce-enhanced.service";

export const liquidWorkforceEnhancedRouter = router({
  // ==================== ZKP技能证明 ====================

  // 生成ZKP技能证明
  generateZKPProof: requirePermission('hr:bu-team:manage')
    .input(
      z.object({
        skillId: z.string(),
        evidenceIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb() as any;
      const { skillId, evidenceIds } = input;

      // 获取技能信息
      const [skillRows] = await db.execute(
        `SELECT * FROM skill_capsules WHERE skill_id = ?`,
        [skillId]
      );
      if ((skillRows as any[]).length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });
      }
      const skill = (skillRows as any[])[0];

      // 验证所有权
      if (skill.owner_id !== ctx.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只能为自己的技能生成证明",
        });
      }

      // 生成盐值
      const salt = require("crypto").randomBytes(32).toString("hex");

      // 生成ZKP证明
      const proof = await ZKPSkillProver.generateProof(
        skillId,
        skill.level,
        evidenceIds,
        salt
      );

      // 保存证明到数据库
      await db.execute(
        `INSERT INTO zkp_skill_proofs 
         (skill_id, owner_id, proof_data, proof_strength, evidence_count, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          skillId,
          ctx.user?.id,
          JSON.stringify(proof),
          proof.proofStrength,
          proof.evidenceCount,
          proof.expiresAt,
        ]
      );

      // 更新技能的证明状态
      await db.execute(
        `UPDATE skill_capsules 
         SET validation_proof = ?, proof_type = 'zkp_verified', validated_at = NOW()
         WHERE skill_id = ?`,
        [proof.commitment, skillId]
      );

      return {
        success: true,
        proof,
        message: `ZKP证明生成成功，强度: ${Math.round(proof.proofStrength * 100)}%`,
      };
    }),

  // 验证ZKP技能证明
  verifyZKPProof: protectedProcedure
    .input(
      z.object({
        skillId: z.string(),
        proofId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { skillId, proofId } = input;

      // 获取证明
      let query = `SELECT * FROM zkp_skill_proofs WHERE skill_id = ?`;
      const params: unknown[] = [skillId];
      if (proofId) {
        query += ` AND id = ?`;
        params.push(proofId);
      }
      query += ` ORDER BY created_at DESC LIMIT 1`;

      const [rows] = await db.execute(query, params);
      if ((rows as any[]).length === 0) {
        return { valid: false, reason: "未找到证明" };
      }

      const proofRecord = (rows as any[])[0];
      const proof = JSON.parse(proofRecord.proof_data);

      // 获取技能信息
      const [skillRows] = await db.execute(
        `SELECT level FROM skill_capsules WHERE skill_id = ?`,
        [skillId]
      );
      if ((skillRows as any[]).length === 0) {
        return { valid: false, reason: "技能不存在" };
      }
      const skill = (skillRows as any[])[0];

      // 验证证明
      const result = ZKPSkillProver.verifyProof(proof, {
        skillId,
        level: skill.level,
      });

      return {
        ...result,
        proofStrength: proof.proofStrength,
        evidenceCount: proof.evidenceCount,
        verifiedEvidenceCount: proof.verifiedEvidenceCount,
        expiresAt: proof.expiresAt,
      };
    }),

  // 获取技能的ZKP证明历史
  getZKPProofHistory: protectedProcedure
    .input(
      z.object({
        skillId: z.string().optional(),
        ownerId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb() as any;
      const { skillId, ownerId, page, pageSize } = input;

      let query = `SELECT zsp.*, sc.name as skill_name, sc.level as skill_level
                   FROM zkp_skill_proofs zsp
                   LEFT JOIN skill_capsules sc ON zsp.skill_id = sc.skill_id
                   WHERE 1=1`;
      const params: unknown[] = [];

      if (skillId) {
        query += ` AND zsp.skill_id = ?`;
        params.push(skillId);
      }
      if (ownerId) {
        query += ` AND zsp.owner_id = ?`;
        params.push(ownerId);
      }

      query += ` ORDER BY zsp.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);

      const [rows] = await db.execute(query, params);

      return {
        items: (rows as any[]).map((row) => ({
          ...row,
          proof_data: JSON.parse(row.proof_data || "{}"),
        })),
        page,
        pageSize,
      };
    }),

  // ==================== 技能市场匹配 ====================

  // 为任务匹配技能提供者
  matchProvidersForTask: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        maxResults: z.number().default(10),
        minScore: z.number().default(0.3),
        useAI: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb() as any;
      const { taskId, maxResults, minScore, useAI } = input;

      // 获取任务信息
      const [taskRows] = await db.execute(
        `SELECT * FROM liquid_tasks WHERE id = ?`,
        [taskId]
      );
      if ((taskRows as any[]).length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "任务不存在" });
      }
      const task = (taskRows as any[])[0];

      // 执行匹配
      let matches = await SkillMarketMatcher.matchProvidersForTask(taskId, {
        maxResults,
        minScore,
      });

      // 可选：使用AI增强匹配
      if (useAI && matches.length > 0) {
        matches = await aiEnhancedMatching(task, matches);
      }

      return {
        task: {
          id: task.id,
          name: task.name,
          budget: task.budget,
          requiredSkills: JSON.parse(task.required_skills || "[]"),
        },
        matches,
        totalMatches: matches.length,
      };
    }),

  // 为技能提供者推荐任务
  recommendTasksForProvider: protectedProcedure
    .input(
      z.object({
        providerId: z.number().optional(),
        maxResults: z.number().default(10),
        minScore: z.number().default(0.3),
      })
    )
    .query(async ({ ctx, input }) => {
      const { providerId, maxResults, minScore } = input;
      const targetProviderId = providerId || ctx.user?.id;

      if (!targetProviderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "需要提供者ID" });
      }

      const recommendations = await SkillMarketMatcher.recommendTasksForProvider(
        targetProviderId,
        { maxResults, minScore }
      );

      return {
        providerId: targetProviderId,
        recommendations,
        totalRecommendations: recommendations.length,
      };
    }),

  // 获取技能市场统计
  getMarketStats: protectedProcedure.query(async () => {
    const db = await requireDb() as any;

    // 获取各项统计
    const [skillStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_skills,
        COUNT(DISTINCT owner_id) as total_providers,
        AVG(level) as avg_level,
        SUM(usage_count) as total_usage
      FROM skill_capsules WHERE is_active = 1
    `);

    const [taskStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tasks,
        SUM(budget) as total_budget,
        AVG(budget) as avg_budget
      FROM liquid_tasks
    `);

    const [bidStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_bids,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_bids,
        AVG(bid_price) as avg_bid_price
      FROM task_bids
    `);

    const [zkpStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_proofs,
        AVG(proof_strength) as avg_proof_strength
      FROM zkp_skill_proofs WHERE expires_at > NOW()
    `);

    // 热门技能领域
    const [hotDomains] = await db.execute(`
      SELECT domain, COUNT(*) as count, AVG(level) as avg_level
      FROM skill_capsules WHERE is_active = 1
      GROUP BY domain ORDER BY count DESC LIMIT 5
    `);

    return {
      skills: (skillStats as any[])[0],
      tasks: (taskStats as any[])[0],
      bids: (bidStats as any[])[0],
      zkp: (zkpStats as any[])[0],
      hotDomains: hotDomains as any[],
    };
  }),

  // 获取技能推荐（基于用户历史）
  getSkillRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb() as any;
      const { limit } = input;

      // 获取用户已有技能的领域
      const [userSkills] = await db.execute(
        `SELECT domain, level FROM skill_capsules WHERE owner_id = ?`,
        [ctx.user?.id]
      );

      // 获取热门且用户未拥有的技能
      const [recommendations] = await db.execute(
        `SELECT name, domain, AVG(level) as avg_level, COUNT(*) as provider_count
         FROM skill_capsules 
         WHERE is_active = 1 AND owner_id != ?
         GROUP BY name, domain
         ORDER BY provider_count DESC, avg_level DESC
         LIMIT ?`,
        [ctx.user?.id || 0, limit]
      );

      return {
        recommendations: recommendations as any[],
        userSkillCount: (userSkills as any[]).length,
      };
    }),
});

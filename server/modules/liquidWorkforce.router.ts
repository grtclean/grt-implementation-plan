/**
 * 液态用工与技能原子化模块 - tRPC路由
 * 模块功能：技能胶囊管理、任务竞标、智能合约支付
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("liquid-workforce-mod");

/** Raw SQL execute interface for dynamic query building */
interface RawExecutor {
  execute(query: string, params?: unknown[]): Promise<[Record<string, unknown>[], unknown]>;
}

interface InsertResult {
  insertId: number;
}

interface PromisedSla {
  deliveryDays: number;
  qualityScore: number;
  revisionCount?: number;
}

// ==================== 液态用工路由 ====================
export const liquidWorkforceRouter = router({
  // ==================== 技能胶囊管理 ====================
  
  // 获取技能胶囊列表
  getSkillCapsules: protectedProcedure
    .input(z.object({
      ownerId: z.number().optional(),
      ownerDid: z.string().optional(),
      domain: z.enum(['T', 'S', 'D', 'C', 'K', 'L']).optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { ownerId, ownerDid, domain, level, isActive, search, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT * FROM skill_capsules WHERE 1=1`;
      const params: unknown[] = [];
      
      if (ownerId) {
        query += ` AND owner_id = ?`;
        params.push(ownerId);
      }
      if (ownerDid) {
        query += ` AND owner_did = ?`;
        params.push(ownerDid);
      }
      if (domain) {
        query += ` AND domain = ?`;
        params.push(domain);
      }
      if (level) {
        query += ` AND level = ?`;
        params.push(level);
      }
      if (isActive !== undefined) {
        query += ` AND is_active = ?`;
        params.push(isActive);
      }
      if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ` ORDER BY usage_count DESC, level DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as unknown as RawExecutor).execute(query, params);
      
      return {
        items: rows as Record<string, unknown>[],
        page,
        pageSize,
      };
    }),

  // 获取单个技能胶囊详情
  getSkillCapsule: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      skillId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { id, skillId } = input;
      
      let query = `SELECT * FROM skill_capsules WHERE `;
      const params: unknown[] = [];
      
      if (id) {
        query += `id = ?`;
        params.push(id);
      } else if (skillId) {
        query += `skill_id = ?`;
        params.push(skillId);
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '需要提供id或skillId' });
      }
      
      const [rows] = await (db as unknown as RawExecutor).execute(query, params);
      
      if ((rows as Record<string, unknown>[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '技能胶囊不存在' });
      }
      
      return (rows as Record<string, unknown>[])[0];
    }),

  // 创建技能胶囊
  createSkillCapsule: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      ownerDid: z.string(),
      ownerId: z.number().optional(),
      domain: z.enum(['T', 'S', 'D', 'C', 'K', 'L']).default('T'),
      level: z.number().min(1).max(5).default(1),
      royaltyRate: z.number().min(0).max(100).default(0),
      tags: z.array(z.string()).optional(),
      evidenceIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { name, description, ownerDid, ownerId, domain, level, royaltyRate, tags, evidenceIds } = input;
      
      const skillId = `SKL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
      
      const [result] = await (db as unknown as RawExecutor).execute(
        `INSERT INTO skill_capsules 
         (skill_id, name, description, owner_did, owner_id, domain, level, royalty_rate, tags, evidence_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [skillId, name, description || null, ownerDid, ownerId || ctx.user?.id || null,
         domain, level, royaltyRate, tags ? JSON.stringify(tags) : null,
         evidenceIds ? JSON.stringify(evidenceIds) : null]
      );
      
      return { id: (result as unknown as InsertResult).insertId, skillId, success: true };
    }),

  // 更新技能胶囊
  updateSkillCapsule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      level: z.number().min(1).max(5).optional(),
      royaltyRate: z.number().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      validationProof: z.string().optional(),
      proofType: z.enum(['self_declared', 'peer_verified', 'system_verified', 'zkp_verified']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      
      const setClauses: string[] = [];
      const params: unknown[] = [];
      
      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push('description = ?');
        params.push(updates.description);
      }
      if (updates.level !== undefined) {
        setClauses.push('level = ?');
        params.push(updates.level);
      }
      if (updates.royaltyRate !== undefined) {
        setClauses.push('royalty_rate = ?');
        params.push(updates.royaltyRate);
      }
      if (updates.tags !== undefined) {
        setClauses.push('tags = ?');
        params.push(JSON.stringify(updates.tags));
      }
      if (updates.isActive !== undefined) {
        setClauses.push('is_active = ?');
        params.push(updates.isActive);
      }
      if (updates.validationProof !== undefined) {
        setClauses.push('validation_proof = ?');
        params.push(updates.validationProof);
      }
      if (updates.proofType !== undefined) {
        setClauses.push('proof_type = ?');
        params.push(updates.proofType);
      }
      
      if (setClauses.length === 0) {
        return { success: true };
      }
      
      params.push(id);
      await (db as unknown as RawExecutor).execute(
        `UPDATE skill_capsules SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );
      
      return { success: true };
    }),

  // 增加技能使用次数
  incrementSkillUsage: requirePermission('hr:bu-team:manage')
    .input(z.object({
      skillId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { skillId } = input;
      
      await (db as unknown as RawExecutor).execute(
        `UPDATE skill_capsules SET usage_count = usage_count + 1 WHERE skill_id = ?`,
        [skillId]
      );
      
      return { success: true };
    }),

  // ==================== 任务竞标管理 ====================
  
  // 获取任务竞标列表
  getTaskBids: protectedProcedure
    .input(z.object({
      taskId: z.number().optional(),
      bidderId: z.number().optional(),
      status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'expired']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { taskId, bidderId, status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT tb.*, t.name as task_name, u.name as bidder_name
                   FROM task_bids tb
                   LEFT JOIN tasks t ON tb.task_id = t.id
                   LEFT JOIN user u ON tb.bidder_id = u.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      if (taskId) {
        query += ` AND tb.task_id = ?`;
        params.push(taskId);
      }
      if (bidderId) {
        query += ` AND tb.bidder_id = ?`;
        params.push(bidderId);
      }
      if (status) {
        query += ` AND tb.status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY tb.ai_judge_score DESC, tb.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as unknown as RawExecutor).execute(query, params);
      
      return {
        items: rows as Record<string, unknown>[],
        page,
        pageSize,
      };
    }),

  // 提交竞标
  submitBid: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      bidderAgentId: z.string(),
      bidPrice: z.number().positive(),
      currency: z.string().default('CNY'),
      promisedSla: z.object({
        deliveryDays: z.number(),
        qualityScore: z.number(),
        revisionCount: z.number().optional(),
      }),
      requiredSkills: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { taskId, bidderAgentId, bidPrice, currency, promisedSla, requiredSkills } = input;
      
      // 获取竞标者信誉分（从用户表或其他来源）
      let creditScore = 80; // 默认分数
      if (ctx.user?.id) {
        const [users] = await (db as unknown as RawExecutor).execute(
          `SELECT credit_score FROM user WHERE id = ?`,
          [ctx.user.id]
        );
        if ((users as { credit_score?: number }[]).length > 0 && (users as { credit_score?: number }[])[0].credit_score) {
          creditScore = (users as { credit_score: number }[])[0].credit_score;
        }
      }
      
      // AI评估竞标
      const aiJudgeResult = await evaluateBidWithAI(taskId, bidPrice, promisedSla, creditScore, db);
      
      const [result] = await (db as unknown as RawExecutor).execute(
        `INSERT INTO task_bids 
         (task_id, bidder_agent_id, bidder_id, bid_price, currency, promised_sla, 
          credit_score_snapshot, ai_judge_score, ai_judge_reason, required_skills, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL '7 days')`,
        [taskId, bidderAgentId, ctx.user?.id || null, bidPrice, currency,
         JSON.stringify(promisedSla), creditScore, aiJudgeResult.score,
         aiJudgeResult.reason, requiredSkills ? JSON.stringify(requiredSkills) : null]
      );
      
      return { 
        id: (result as unknown as InsertResult).insertId, 
        aiScore: aiJudgeResult.score,
        aiReason: aiJudgeResult.reason,
        success: true 
      };
    }),

  // 接受竞标
  acceptBid: adminProcedure
    .input(z.object({
      bidId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { bidId } = input;
      
      // 获取竞标信息
      const [bids] = await (db as unknown as RawExecutor).execute(
        `SELECT * FROM task_bids WHERE id = ?`,
        [bidId]
      );
      
      if ((bids as Record<string, unknown>[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '竞标不存在' });
      }

      const bid = (bids as Record<string, unknown>[])[0];
      
      if (bid.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '竞标状态不允许接受' });
      }
      
      // 更新竞标状态
      await (db as unknown as RawExecutor).execute(
        `UPDATE task_bids SET status = 'accepted', accepted_at = NOW() WHERE id = ?`,
        [bidId]
      );
      
      // 拒绝同一任务的其他竞标
      await (db as unknown as RawExecutor).execute(
        `UPDATE task_bids SET status = 'rejected', rejection_reason = '其他竞标已被接受' 
         WHERE task_id = ? AND id != ? AND status = 'pending'`,
        [bid.task_id, bidId]
      );
      
      return { success: true };
    }),

  // 拒绝竞标
  rejectBid: adminProcedure
    .input(z.object({
      bidId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { bidId, reason } = input;
      
      await (db as unknown as RawExecutor).execute(
        `UPDATE task_bids SET status = 'rejected', rejection_reason = ? WHERE id = ? AND status = 'pending'`,
        [reason || '未通过审核', bidId]
      );
      
      return { success: true };
    }),

  // ==================== 智能合约管理 ====================
  
  // 获取智能合约列表
  getSmartContracts: protectedProcedure
    .input(z.object({
      payerId: z.number().optional(),
      payeeId: z.number().optional(),
      status: z.enum(['draft', 'locked', 'partial_released', 'released', 'disputed', 'cancelled']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { payerId, payeeId, status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT sc.*, tb.task_id, payer.name as payer_name, payee.name as payee_name
                   FROM smart_contracts sc
                   LEFT JOIN task_bids tb ON sc.task_bid_id = tb.id
                   LEFT JOIN user payer ON sc.payer_id = payer.id
                   LEFT JOIN user payee ON sc.payee_id = payee.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      if (payerId) {
        query += ` AND sc.payer_id = ?`;
        params.push(payerId);
      }
      if (payeeId) {
        query += ` AND sc.payee_id = ?`;
        params.push(payeeId);
      }
      if (status) {
        query += ` AND sc.execution_status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY sc.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as unknown as RawExecutor).execute(query, params);
      
      return {
        items: rows as Record<string, unknown>[],
        page,
        pageSize,
      };
    }),

  // 创建智能合约
  createSmartContract: adminProcedure
    .input(z.object({
      taskBidId: z.number(),
      payerId: z.number(),
      payeeId: z.number(),
      paymentType: z.enum(['e-CNY', 'USDT', 'G-Token', 'CNY', 'USD']).default('CNY'),
      amount: z.number().positive(),
      triggerCondition: z.object({
        qualityScore: z.number().optional(),
        deliveryDate: z.string().optional(),
        approvalRequired: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { taskBidId, payerId, payeeId, paymentType, amount, triggerCondition } = input;
      
      const [result] = await (db as unknown as RawExecutor).execute(
        `INSERT INTO smart_contracts 
         (task_bid_id, payer_id, payee_id, payment_type, amount, trigger_condition, execution_status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
        [taskBidId, payerId, payeeId, paymentType, amount, JSON.stringify(triggerCondition)]
      );
      
      return { id: (result as unknown as InsertResult).insertId, success: true };
    }),

  // 锁定合约资金
  lockContract: adminProcedure
    .input(z.object({
      contractId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { contractId } = input;
      
      await (db as unknown as RawExecutor).execute(
        `UPDATE smart_contracts SET execution_status = 'locked', locked_at = NOW() 
         WHERE id = ? AND execution_status = 'draft'`,
        [contractId]
      );
      
      return { success: true };
    }),

  // 释放合约资金
  releaseContract: adminProcedure
    .input(z.object({
      contractId: z.number(),
      partial: z.boolean().optional(),
      releaseAmount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { contractId, partial, releaseAmount } = input;
      
      const status = partial ? 'partial_released' : 'released';
      
      await (db as unknown as RawExecutor).execute(
        `UPDATE smart_contracts SET execution_status = ?, released_at = NOW() 
         WHERE id = ? AND execution_status IN ('locked', 'partial_released')`,
        [status, contractId]
      );
      
      // TODO: 实际调用支付接口
      
      return { success: true };
    }),

  // 发起争议
  disputeContract: requirePermission('hr:bu-team:manage')
    .input(z.object({
      contractId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { contractId, reason } = input;
      
      await (db as unknown as RawExecutor).execute(
        `UPDATE smart_contracts SET execution_status = 'disputed', dispute_reason = ? 
         WHERE id = ? AND execution_status IN ('locked', 'partial_released')`,
        [reason, contractId]
      );
      
      return { success: true };
    }),

  // ==================== 统计分析 ====================
  
  // 获取液态用工统计
  getStats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      
      // 技能胶囊统计
      const [skillStats] = await (db as unknown as RawExecutor).execute(
        `SELECT domain, COUNT(*) as count, AVG(level) as avg_level, SUM(usage_count) as total_usage
         FROM skill_capsules WHERE is_active = 1 GROUP BY domain`
      );
      
      // 竞标统计
      const [bidStats] = await (db as unknown as RawExecutor).execute(
        `SELECT status, COUNT(*) as count, AVG(bid_price) as avg_price, AVG(ai_judge_score) as avg_ai_score
         FROM task_bids GROUP BY status`
      );
      
      // 合约统计
      const [contractStats] = await (db as unknown as RawExecutor).execute(
        `SELECT execution_status, COUNT(*) as count, SUM(amount) as total_amount
         FROM smart_contracts GROUP BY execution_status`
      );
      
      return {
        skills: skillStats,
        bids: bidStats,
        contracts: contractStats,
      };
    }),
});

// ==================== 辅助函数 ====================

// AI评估竞标
async function evaluateBidWithAI(
  taskId: number,
  bidPrice: number,
  promisedSla: PromisedSla,
  creditScore: number,
  db: unknown
): Promise<{ score: number; reason: string }> {
  try {
    // 获取任务信息
    const [tasks] = await (db as unknown as RawExecutor).execute(
      `SELECT name, description, budget FROM tasks WHERE id = ?`,
      [taskId]
    );
    
    const task = (tasks as { name: string; description: string; budget: number }[])[0] || { name: '未知任务', description: '', budget: 0 };
    
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是GRT智能系统的AI裁决引擎，负责评估任务竞标的质量。
请根据以下因素评估竞标：
1. 报价合理性（与预算对比）
2. SLA承诺可行性
3. 竞标者信誉分
4. 整体性价比

输出JSON格式：{"score": 0-100的分数, "reason": "评估理由"}`
        },
        {
          role: 'user',
          content: `任务信息：
- 名称：${task.name}
- 描述：${task.description}
- 预算：${task.budget}

竞标信息：
- 报价：${bidPrice}
- 承诺交付天数：${promisedSla.deliveryDays}
- 承诺质量分：${promisedSla.qualityScore}
- 竞标者信誉分：${creditScore}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'bid_evaluation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              reason: { type: 'string' }
            },
            required: ['score', 'reason'],
            additionalProperties: false
          }
        }
      }
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{"score": 70, "reason": "默认评估"}');
    return result;
  } catch (error) {
    log.error({ err: error }, 'AI评估竞标失败:');
    return { score: 70, reason: '自动评估（AI服务暂时不可用）' };
  }
}

export default liquidWorkforceRouter;

/**
 * 自主销售与AI-to-AI交互模块 - tRPC路由
 * 模块功能：AI谈判会话、零知识证明验证
 */

import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ai-sales-mod");

/** Row shape returned by raw MySQL execute() for negotiation_sessions */
interface NegotiationSessionRow {
  id: number;
  session_id: string;
  opportunity_id: number | null;
  client_agent_id: string;
  client_company: string | null;
  product_id: number | null;
  product_name: string | null;
  our_offer_price: number;
  our_bottom_price: number;
  our_target_price: number;
  client_counter_offer: number | null;
  final_price: number | null;
  max_rounds: number;
  current_round: number;
  status: string;
  strategy_used: string | null;
  zopa_range: string | null;
  sentiment_analysis: string | null;
  negotiation_history: string | null;
  human_override_required: number;
  human_override_reason: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape returned by raw MySQL execute() for zkp_registry */
interface ZkpRegistryRow {
  id: number;
  proof_id: string;
  proof_type: string;
  entity_type: string;
  entity_id: number;
  entity_name: string | null;
  public_inputs: string;
  proof_hash: string;
  proof_data: string;
  verification_circuit: string;
  generated_by: string;
  verified_by_client: number;
  verifier_client_id: string | null;
  verification_count: number;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** MySQL2 insert result */
interface MysqlInsertResult {
  insertId: number;
  affectedRows: number;
}

/** Sentiment analysis result from LLM */
interface SentimentAnalysis {
  sentiment: string;
  urgency: string;
  flexibility: string;
  intent: string;
  confidence: number;
}

/** DB with raw execute method (MySQL2 compatible) */
interface DbWithExecute {
  execute(query: string, params?: unknown[]): Promise<[unknown[], unknown]>;
}

// ==================== AI销售路由 ====================
export const aiSalesRouter = router({
  // ==================== AI谈判会话管理 ====================
  
  // 获取谈判会话列表
  getNegotiationSessions: protectedProcedure
    .input(z.object({
      opportunityId: z.number().optional(),
      clientAgentId: z.string().optional(),
      status: z.enum(['initializing', 'negotiating', 'deal_reached', 'walk_away', 'paused', 'expired']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { opportunityId, clientAgentId, status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT * FROM negotiation_sessions WHERE 1=1`;
      const params: unknown[] = [];
      
      if (opportunityId) {
        query += ` AND opportunity_id = ?`;
        params.push(opportunityId);
      }
      if (clientAgentId) {
        query += ` AND client_agent_id = ?`;
        params.push(clientAgentId);
      }
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as unknown as DbWithExecute).execute(query, params);

      return {
        items: rows as NegotiationSessionRow[],
        page,
        pageSize,
      };
    }),

  // 获取单个谈判会话详情
  getNegotiationSession: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      sessionId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { id, sessionId } = input;

      let query = `SELECT * FROM negotiation_sessions WHERE `;
      const params: unknown[] = [];

      if (id) {
        query += `id = ?`;
        params.push(id);
      } else if (sessionId) {
        query += `session_id = ?`;
        params.push(sessionId);
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '需要提供id或sessionId' });
      }

      const [rows] = await (db as unknown as DbWithExecute).execute(query, params);

      if ((rows as NegotiationSessionRow[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '谈判会话不存在' });
      }

      return (rows as NegotiationSessionRow[])[0];
    }),

  // 创建谈判会话
  createNegotiationSession: protectedProcedure
    .input(z.object({
      opportunityId: z.number().optional(),
      clientAgentId: z.string(),
      clientCompany: z.string().optional(),
      productId: z.number().optional(),
      productName: z.string().optional(),
      ourBottomPrice: z.number().positive(),
      ourTargetPrice: z.number().positive(),
      maxRounds: z.number().default(10),
      strategyUsed: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { opportunityId, clientAgentId, clientCompany, productId, productName,
              ourBottomPrice, ourTargetPrice, maxRounds, strategyUsed } = input;
      
      const sessionId = `NEG-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
      
      // 初始报价为目标价
      const initialOffer = ourTargetPrice;
      
      // 计算ZOPA区间
      const zopaRange = {
        bottom: ourBottomPrice,
        target: ourTargetPrice,
        estimated_client_max: ourTargetPrice * 1.1, // 估计客户最高接受价
      };
      
      const [result] = await (db as unknown as DbWithExecute).execute(
        `INSERT INTO negotiation_sessions
         (session_id, opportunity_id, client_agent_id, client_company, product_id, product_name,
          our_offer_price, our_bottom_price, our_target_price, max_rounds, zopa_range, strategy_used, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'initializing')`,
        [sessionId, opportunityId || null, clientAgentId, clientCompany || null,
         productId || null, productName || null, initialOffer, ourBottomPrice,
         ourTargetPrice, maxRounds, JSON.stringify(zopaRange), strategyUsed || 'balanced']
      );

      return {
        id: (result as unknown as MysqlInsertResult).insertId,
        sessionId,
        initialOffer,
        success: true 
      };
    }),

  // 处理客户还价（AI-to-AI交互核心）
  processCounterOffer: requirePermission('crm:leads:manage')
    .input(z.object({
      sessionId: z.string(),
      clientCounterOffer: z.number().positive(),
      clientMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { sessionId, clientCounterOffer, clientMessage } = input;
      
      // 获取当前会话
      const [sessions] = await (db as unknown as DbWithExecute).execute(
        `SELECT * FROM negotiation_sessions WHERE session_id = ?`,
        [sessionId]
      );

      if ((sessions as NegotiationSessionRow[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '谈判会话不存在' });
      }

      const session = (sessions as NegotiationSessionRow[])[0];
      
      if (session.status !== 'initializing' && session.status !== 'negotiating') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '谈判会话已结束' });
      }
      
      const currentRound = session.current_round + 1;
      
      // 检查是否超过最大轮次
      if (currentRound > session.max_rounds) {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET status = 'expired', closed_at = NOW() WHERE session_id = ?`,
          [sessionId]
        );
        return { 
          status: 'expired', 
          message: '谈判轮次已用尽',
          success: false 
        };
      }
      
      // AI分析客户情绪和意图
      const sentimentAnalysis = await analyzeClientSentiment(clientMessage || '', clientCounterOffer, session);
      
      // AI决策下一步报价
      const decision = await makeNegotiationDecision(session, clientCounterOffer, sentimentAnalysis, currentRound);
      
      // 更新谈判历史
      const history = session.negotiation_history ? JSON.parse(session.negotiation_history) : [];
      history.push({
        round: currentRound,
        our_offer: session.our_offer_price,
        client_counter: clientCounterOffer,
        client_message: clientMessage,
        sentiment: sentimentAnalysis,
        decision: decision.action,
        timestamp: new Date().toISOString(),
      });
      
      // 根据决策更新会话
      if (decision.action === 'accept') {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'deal_reached', client_counter_offer = ?, final_price = ?,
           sentiment_analysis = ?, negotiation_history = ?, current_round = ?, closed_at = NOW()
           WHERE session_id = ?`,
          [clientCounterOffer, clientCounterOffer, JSON.stringify(sentimentAnalysis),
           JSON.stringify(history), currentRound, sessionId]
        );
        
        return {
          status: 'deal_reached',
          finalPrice: clientCounterOffer,
          message: decision.message,
          success: true,
        };
      } else if (decision.action === 'walk_away') {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'walk_away', client_counter_offer = ?,
           sentiment_analysis = ?, negotiation_history = ?, current_round = ?, closed_at = NOW()
           WHERE session_id = ?`,
          [clientCounterOffer, JSON.stringify(sentimentAnalysis),
           JSON.stringify(history), currentRound, sessionId]
        );
        
        return {
          status: 'walk_away',
          message: decision.message,
          success: false,
        };
      } else if (decision.action === 'human_override') {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'paused', client_counter_offer = ?, human_override_required = 1,
           human_override_reason = ?, sentiment_analysis = ?, negotiation_history = ?, current_round = ?
           WHERE session_id = ?`,
          [clientCounterOffer, decision.message, JSON.stringify(sentimentAnalysis),
           JSON.stringify(history), currentRound, sessionId]
        );
        
        return {
          status: 'paused',
          message: '需要人工介入: ' + decision.message,
          success: false,
        };
      } else {
        // counter_offer
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'negotiating', client_counter_offer = ?, our_offer_price = ?,
           sentiment_analysis = ?, negotiation_history = ?, current_round = ?
           WHERE session_id = ?`,
          [clientCounterOffer, decision.newOffer, JSON.stringify(sentimentAnalysis),
           JSON.stringify(history), currentRound, sessionId]
        );
        
        return {
          status: 'negotiating',
          newOffer: decision.newOffer,
          round: currentRound,
          message: decision.message,
          success: true,
        };
      }
    }),

  // 人工介入处理
  humanOverride: adminProcedure
    .input(z.object({
      sessionId: z.string(),
      action: z.enum(['accept', 'counter', 'walk_away']),
      newOffer: z.number().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { sessionId, action, newOffer, message } = input;
      
      if (action === 'accept') {
        const [sessions] = await (db as unknown as DbWithExecute).execute(
          `SELECT client_counter_offer FROM negotiation_sessions WHERE session_id = ?`,
          [sessionId]
        );
        const finalPrice = (sessions as NegotiationSessionRow[])[0]?.client_counter_offer;
        
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'deal_reached', final_price = ?, human_override_required = 0, closed_at = NOW()
           WHERE session_id = ?`,
          [finalPrice, sessionId]
        );
        
        return { status: 'deal_reached', finalPrice, success: true };
      } else if (action === 'walk_away') {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'walk_away', human_override_required = 0, closed_at = NOW()
           WHERE session_id = ?`,
          [sessionId]
        );
        
        return { status: 'walk_away', success: true };
      } else {
        await (db as unknown as DbWithExecute).execute(
          `UPDATE negotiation_sessions SET 
           status = 'negotiating', our_offer_price = ?, human_override_required = 0
           WHERE session_id = ?`,
          [newOffer, sessionId]
        );
        
        return { status: 'negotiating', newOffer, success: true };
      }
    }),

  // ==================== 零知识证明管理 ====================
  
  // 获取ZKP证明列表
  getZkpProofs: protectedProcedure
    .input(z.object({
      proofType: z.enum(['capacity', 'compliance', 'green_energy', 'quality', 'delivery', 'financial']).optional(),
      entityType: z.enum(['company', 'product', 'project', 'employee']).optional(),
      entityId: z.number().optional(),
      verifiedByClient: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { proofType, entityType, entityId, verifiedByClient, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT * FROM zkp_registry WHERE 1=1`;
      const params: unknown[] = [];
      
      if (proofType) {
        query += ` AND proof_type = ?`;
        params.push(proofType);
      }
      if (entityType) {
        query += ` AND entity_type = ?`;
        params.push(entityType);
      }
      if (entityId) {
        query += ` AND entity_id = ?`;
        params.push(entityId);
      }
      if (verifiedByClient !== undefined) {
        query += ` AND verified_by_client = ?`;
        params.push(verifiedByClient);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as unknown as DbWithExecute).execute(query, params);
      
      return {
        items: rows as ZkpRegistryRow[],
        page,
        pageSize,
      };
    }),

  // 生成ZKP证明
  generateZkpProof: adminProcedure
    .input(z.object({
      proofType: z.enum(['capacity', 'compliance', 'green_energy', 'quality', 'delivery', 'financial']),
      entityType: z.enum(['company', 'product', 'project', 'employee']),
      entityId: z.number(),
      entityName: z.string().optional(),
      publicInputs: z.record(z.string(), jsonValue),
      expiresInDays: z.number().default(365),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { proofType, entityType, entityId, entityName, publicInputs, expiresInDays } = input;
      
      const proofId = `ZKP-${proofType.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
      
      // 生成证明哈希（简化实现，实际应使用ZK-SNARK库）
      const proofData = JSON.stringify({
        type: proofType,
        entity: { type: entityType, id: entityId },
        inputs: publicInputs,
        timestamp: Date.now(),
        nonce: randomUUID(),
      });
      
      const proofHash = createHash('sha256').update(proofData).digest('hex');
      
      const [result] = await (db as unknown as DbWithExecute).execute(
        `INSERT INTO zkp_registry 
         (proof_id, proof_type, entity_type, entity_id, entity_name, public_inputs, 
          proof_hash, proof_data, verification_circuit, generated_by, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'grt-zkp-generator', NOW() + (? || ' days')::interval)`,
        [proofId, proofType, entityType, entityId, entityName || null,
         JSON.stringify(publicInputs), proofHash, proofData, `${proofType}_v1`, expiresInDays]
      );
      
      return { 
        id: (result as unknown as MysqlInsertResult).insertId,
        proofId,
        proofHash,
        success: true 
      };
    }),

  // 验证ZKP证明
  verifyZkpProof: requirePermission('crm:leads:manage')
    .input(z.object({
      proofId: z.string(),
      verifierClientId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { proofId, verifierClientId } = input;
      
      // 获取证明
      const [proofs] = await (db as unknown as DbWithExecute).execute(
        `SELECT * FROM zkp_registry WHERE proof_id = ?`,
        [proofId]
      );
      
      if ((proofs as ZkpRegistryRow[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '证明不存在' });
      }

      const proof = (proofs as ZkpRegistryRow[])[0];
      
      // 检查是否过期
      if (proof.expires_at && new Date(proof.expires_at) < new Date()) {
        return { valid: false, reason: '证明已过期' };
      }
      
      // 验证哈希（简化实现）
      const computedHash = createHash('sha256').update(proof.proof_data).digest('hex');
      
      if (computedHash !== proof.proof_hash) {
        return { valid: false, reason: '证明哈希不匹配' };
      }
      
      // 更新验证状态
      await (db as unknown as DbWithExecute).execute(
        `UPDATE zkp_registry SET 
         verified_by_client = 1, verifier_client_id = ?, verification_count = verification_count + 1, verified_at = NOW()
         WHERE proof_id = ?`,
        [verifierClientId || 'anonymous', proofId]
      );
      
      return { 
        valid: true, 
        proofType: proof.proof_type,
        entityType: proof.entity_type,
        publicInputs: JSON.parse(proof.public_inputs),
      };
    }),

  // ==================== 统计分析 ====================
  
  // 获取AI销售统计
  getStats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      
      // 谈判会话统计
      const [sessionStats] = await (db as unknown as DbWithExecute).execute(
        `SELECT status, COUNT(*) as count, 
                AVG(final_price) as avg_final_price,
                AVG(current_round) as avg_rounds
         FROM negotiation_sessions GROUP BY status`
      );
      
      // 成功率
      const [successRate] = await (db as unknown as DbWithExecute).execute(
        `SELECT 
           COUNT(CASE WHEN status = 'deal_reached' THEN 1 END) as deals,
           COUNT(*) as total
         FROM negotiation_sessions WHERE status IN ('deal_reached', 'walk_away')`
      );
      
      // ZKP统计
      const [zkpStats] = await (db as unknown as DbWithExecute).execute(
        `SELECT proof_type, COUNT(*) as count, 
                SUM(CASE WHEN verified_by_client = 1 THEN 1 ELSE 0 END) as verified_count
         FROM zkp_registry GROUP BY proof_type`
      );
      
      return {
        sessions: sessionStats,
        successRate: successRate,
        zkpProofs: zkpStats,
      };
    }),
});

// ==================== 辅助函数 ====================

// 分析客户情绪
async function analyzeClientSentiment(
  message: string,
  counterOffer: number,
  session: NegotiationSessionRow
): Promise<SentimentAnalysis> {
  try {
    const priceGap = ((session.our_offer_price - counterOffer) / session.our_offer_price) * 100;
    
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是GRT智能系统的情绪分析引擎（The Listener Agent），负责分析客户在谈判中的情绪和意图。
输出JSON格式：{
  "sentiment": "positive/neutral/negative/aggressive",
  "urgency": "low/medium/high",
  "flexibility": "low/medium/high",
  "intent": "探索/认真/最终报价/试探",
  "confidence": 0-100
}`
        },
        {
          role: 'user',
          content: `分析以下谈判情况：
- 我方报价：${session.our_offer_price}
- 客户还价：${counterOffer}
- 价格差距：${priceGap.toFixed(1)}%
- 当前轮次：${session.current_round}/${session.max_rounds}
- 客户消息：${message || '无'}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              sentiment: { type: 'string' },
              urgency: { type: 'string' },
              flexibility: { type: 'string' },
              intent: { type: 'string' },
              confidence: { type: 'number' }
            },
            required: ['sentiment', 'urgency', 'flexibility', 'intent', 'confidence'],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{}') as SentimentAnalysis;
  } catch (error) {
    log.error({ err: error }, '情绪分析失败:');
    return {
      sentiment: 'neutral',
      urgency: 'medium',
      flexibility: 'medium',
      intent: '探索',
      confidence: 50
    };
  }
}

// AI谈判决策
async function makeNegotiationDecision(
  session: NegotiationSessionRow,
  clientCounterOffer: number,
  sentiment: SentimentAnalysis,
  currentRound: number
): Promise<{ action: string; newOffer?: number; message: string }> {
  const bottomPrice = session.our_bottom_price;
  const targetPrice = session.our_target_price;
  const currentOffer = session.our_offer_price;
  const maxRounds = session.max_rounds;
  
  // 如果客户报价高于或等于目标价，直接接受
  if (clientCounterOffer >= targetPrice) {
    return { action: 'accept', message: '客户报价达到目标价，建议接受' };
  }
  
  // 如果客户报价低于底价，根据情况决定
  if (clientCounterOffer < bottomPrice) {
    // 如果是最后几轮且客户态度强硬，考虑放弃
    if (currentRound >= maxRounds - 2 && sentiment.flexibility === 'low') {
      return { action: 'walk_away', message: '客户报价低于底价且态度强硬，建议放弃' };
    }
    
    // 如果价格差距太大（超过30%），需要人工介入
    const gap = ((bottomPrice - clientCounterOffer) / bottomPrice) * 100;
    if (gap > 30) {
      return { action: 'human_override', message: `价格差距过大(${gap.toFixed(1)}%)，需要人工评估` };
    }
  }
  
  // 计算新报价（让步策略）
  const roundsLeft = maxRounds - currentRound;
  const priceRange = currentOffer - bottomPrice;
  
  // 根据剩余轮次和客户情绪调整让步幅度
  let concessionRate = 0.1; // 基础让步10%
  
  if (sentiment.urgency === 'high') {
    concessionRate *= 0.8; // 客户急迫时少让步
  } else if (sentiment.urgency === 'low') {
    concessionRate *= 1.2; // 客户不急时多让步
  }
  
  if (sentiment.flexibility === 'high') {
    concessionRate *= 0.9; // 客户灵活时少让步
  } else if (sentiment.flexibility === 'low') {
    concessionRate *= 1.1; // 客户不灵活时多让步
  }
  
  // 根据轮次调整
  if (roundsLeft <= 2) {
    concessionRate *= 1.5; // 最后几轮加大让步
  }
  
  const concession = priceRange * concessionRate;
  let newOffer = Math.max(currentOffer - concession, bottomPrice);
  
  // 如果新报价接近客户报价（差距小于5%），直接接受客户报价
  if ((newOffer - clientCounterOffer) / newOffer < 0.05 && clientCounterOffer >= bottomPrice) {
    return { action: 'accept', message: '价格差距已很小，建议接受客户报价' };
  }
  
  // 确保新报价是整数
  newOffer = Math.round(newOffer);
  
  return { 
    action: 'counter_offer', 
    newOffer,
    message: `基于客户情绪(${sentiment.sentiment})和剩余轮次(${roundsLeft})，建议报价${newOffer}`
  };
}

export default aiSalesRouter;

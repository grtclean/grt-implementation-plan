/**
 * GRT 5.0 Gemini代码整合 - 综合tRPC路由
 * 包含：液态用工、AI销售、门径管理、个人智能体、核心业务模型、社群管理
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { jsonValue } from "../../shared/validators";

// =====================================================
// 1. 液态用工模块 (Liquid Workforce)
// =====================================================
export const liquidWorkforceRouter = router({
  // 技能胶囊管理
  skillCapsules: router({
    list: protectedProcedure
      .input(z.object({
        ownerDid: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20)
      }))
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.pageSize;
        const whereClause = input.ownerDid ? sql`WHERE owner_did = ${input.ownerDid}` : sql``;
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_skill_capsules ${whereClause}
          ORDER BY usage_count DESC
          LIMIT ${input.pageSize} OFFSET ${offset}
        `);
        const countResult = await (await requireDb()).execute(sql`
          SELECT COUNT(*) as total FROM grt_skill_capsules ${whereClause}
        `);
        return {
          items: result[0] as any[],
          total: (countResult[0] as any[])[0]?.total || 0
        };
      }),

    create: protectedProcedure
      .input(z.object({
        skillId: z.string(),
        name: z.string(),
        ownerDid: z.string(),
        validationProof: z.string().optional(),
        royaltyRate: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_skill_capsules (skill_id, name, owner_did, validation_proof, royalty_rate)
          VALUES (${input.skillId}, ${input.name}, ${input.ownerDid}, ${input.validationProof || null}, ${input.royaltyRate})
        `);
        return { success: true };
      }),

    incrementUsage: protectedProcedure
      .input(z.object({ skillId: z.string() }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_skill_capsules SET usage_count = usage_count + 1 WHERE skill_id = ${input.skillId}
        `);
        return { success: true };
      })
  }),

  // 任务竞标管理
  taskBids: router({
    list: protectedProcedure
      .input(z.object({
        taskId: z.number().optional(),
        status: z.enum(['pending', 'accepted', 'rejected']).optional()
      }))
      .query(async ({ input }) => {
        let whereConditions: SQL[] = [];
        if (input.taskId) whereConditions.push(sql`task_id = ${input.taskId}`);
        if (input.status) whereConditions.push(sql`status = ${input.status}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_task_bids ${whereClause}
          ORDER BY ai_judge_score DESC, bid_price ASC
        `);
        return result[0] as any[];
      }),

    submit: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        bidderAgentId: z.string(),
        bidPrice: z.number(),
        promisedSla: jsonValue,
        creditScoreSnapshot: z.number()
      }))
      .mutation(async ({ input }) => {
        // AI评分模拟 (实际应调用AI服务)
        const aiJudgeScore = Math.min(100, input.creditScoreSnapshot * 0.8 + Math.random() * 20);
        
        await (await requireDb()).execute(sql`
          INSERT INTO grt_task_bids (task_id, bidder_agent_id, bid_price, promised_sla, credit_score_snapshot, ai_judge_score)
          VALUES (${input.taskId}, ${input.bidderAgentId}, ${input.bidPrice}, ${JSON.stringify(input.promisedSla)}, ${input.creditScoreSnapshot}, ${aiJudgeScore})
        `);
        return { success: true, aiJudgeScore };
      }),

    accept: protectedProcedure
      .input(z.object({ bidId: z.number() }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`UPDATE grt_task_bids SET status = 'accepted' WHERE id = ${input.bidId}`);
        await (await requireDb()).execute(sql`UPDATE grt_task_bids SET status = 'rejected' WHERE id != ${input.bidId} AND task_id = (SELECT task_id FROM grt_task_bids WHERE id = ${input.bidId})`);
        return { success: true };
      })
  }),

  // 智能合约管理
  smartContracts: router({
    list: protectedProcedure
      .input(z.object({
        executionStatus: z.enum(['locked', 'released', 'disputed']).optional()
      }))
      .query(async ({ input }) => {
        const whereClause = input.executionStatus 
          ? sql`WHERE execution_status = ${input.executionStatus}` 
          : sql``;
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_smart_contracts ${whereClause}
          ORDER BY created_at DESC
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        contractAddress: z.string(),
        paymentType: z.enum(['e-CNY', 'USDT', 'G-Token']),
        triggerCondition: jsonValue,
        relatedTaskId: z.number().optional(),
        amount: z.number()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_smart_contracts (contract_address, payment_type, trigger_condition, related_task_id, amount)
          VALUES (${input.contractAddress}, ${input.paymentType}, ${JSON.stringify(input.triggerCondition)}, ${input.relatedTaskId || null}, ${input.amount})
        `);
        return { success: true };
      }),

    release: protectedProcedure
      .input(z.object({ contractId: z.number() }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`UPDATE grt_smart_contracts SET execution_status = 'released' WHERE id = ${input.contractId}`);
        return { success: true };
      })
  })
});

// =====================================================
// 2. AI自主销售模块 (Autonomous Sales)
// =====================================================
export const autonomousSalesRouter = router({
  // AI谈判会话
  negotiations: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['negotiating', 'deal_reached', 'walk_away']).optional(),
        projectId: z.number().optional()
      }))
      .query(async ({ input }) => {
        let whereConditions: SQL[] = [];
        if (input.status) whereConditions.push(sql`status = ${input.status}`);
        if (input.projectId) whereConditions.push(sql`project_id = ${input.projectId}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_negotiation_sessions ${whereClause}
          ORDER BY updated_at DESC
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        clientAgentId: z.string().optional(),
        ourOfferPrice: z.number(),
        projectId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_negotiation_sessions (session_id, client_agent_id, our_offer_price, project_id)
          VALUES (${input.sessionId}, ${input.clientAgentId || null}, ${input.ourOfferPrice}, ${input.projectId || null})
        `);
        return { success: true };
      }),

    submitCounterOffer: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        clientCounterOffer: z.number(),
        sentimentAnalysis: jsonValue.optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_negotiation_sessions 
          SET client_counter_offer = ${input.clientCounterOffer},
              sentiment_analysis = ${JSON.stringify(input.sentimentAnalysis || {})},
              current_round = current_round + 1
          WHERE session_id = ${input.sessionId}
        `);
        return { success: true };
      }),

    calculateZopa: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        ourFloorPrice: z.number(),
        ourTargetPrice: z.number()
      }))
      .mutation(async ({ input }) => {
        const zopaRange = { floor: input.ourFloorPrice, target: input.ourTargetPrice };
        await (await requireDb()).execute(sql`
          UPDATE grt_negotiation_sessions 
          SET zopa_range = ${JSON.stringify(zopaRange)}
          WHERE session_id = ${input.sessionId}
        `);
        return { success: true, zopaRange };
      }),

    closeDeal: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        status: z.enum(['deal_reached', 'walk_away'])
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_negotiation_sessions SET status = ${input.status} WHERE session_id = ${input.sessionId}
        `);
        return { success: true };
      })
  }),

  // ZKP证明注册
  zkpRegistry: router({
    list: protectedProcedure
      .input(z.object({
        proofType: z.enum(['capacity', 'compliance', 'green_energy']).optional()
      }))
      .query(async ({ input }) => {
        const whereClause = input.proofType 
          ? sql`WHERE proof_type = ${input.proofType}` 
          : sql``;
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_zkp_registry ${whereClause}
          ORDER BY created_at DESC
        `);
        return result[0] as any[];
      }),

    register: protectedProcedure
      .input(z.object({
        proofId: z.string(),
        proofType: z.enum(['capacity', 'compliance', 'green_energy']),
        publicInputs: jsonValue,
        proofHash: z.string(),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_zkp_registry (proof_id, proof_type, public_inputs, proof_hash, related_entity_type, related_entity_id)
          VALUES (${input.proofId}, ${input.proofType}, ${JSON.stringify(input.publicInputs)}, ${input.proofHash}, ${input.relatedEntityType || null}, ${input.relatedEntityId || null})
        `);
        return { success: true };
      }),

    verify: protectedProcedure
      .input(z.object({ proofId: z.string() }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_zkp_registry SET verified_by_client = TRUE WHERE proof_id = ${input.proofId}
        `);
        return { success: true };
      })
  })
});

// =====================================================
// 3. 门径管理模块 (Stage Gate)
// =====================================================
export const stageGateRouter = router({
  // 门径检查项
  checklists: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        gateStage: z.enum(['M3', 'M4', 'M5', 'M7', 'M12']).optional()
      }))
      .query(async ({ input }) => {
        let whereConditions = [sql`project_id = ${input.projectId}`];
        if (input.gateStage) whereConditions.push(sql`gate_stage = ${input.gateStage}`);
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_gate_checklists 
          WHERE ${sql.join(whereConditions, sql` AND `)}
          ORDER BY gate_stage, is_mandatory DESC
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        gateStage: z.enum(['M3', 'M4', 'M5', 'M7', 'M12']),
        checkItem: z.string(),
        isMandatory: z.boolean().default(false),
        autoVerifySource: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_gate_checklists (project_id, gate_stage, check_item, is_mandatory, auto_verify_source)
          VALUES (${input.projectId}, ${input.gateStage}, ${input.checkItem}, ${input.isMandatory}, ${input.autoVerifySource || null})
        `);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        checklistId: z.number(),
        status: z.enum(['pending', 'pass', 'fail']),
      }))
      .mutation(async ({ input, ctx }) => {
        const verifiedBy = ctx.user.name ?? `User#${ctx.user.id}`;
        await (await requireDb()).execute(sql`
          UPDATE grt_gate_checklists
          SET status = ${input.status}, verified_by = ${verifiedBy}, verified_at = NOW()
          WHERE id = ${input.checklistId}
        `);
        return { success: true };
      }),

    getGateStatus: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        gateStage: z.enum(['M3', 'M4', 'M5', 'M7', 'M12'])
      }))
      .query(async ({ input }) => {
        const result = await (await requireDb()).execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN status = 'fail' AND is_mandatory = TRUE THEN 1 ELSE 0 END) as mandatory_failed
          FROM grt_gate_checklists 
          WHERE project_id = ${input.projectId} AND gate_stage = ${input.gateStage}
        `);
        const stats = (result[0] as any[])[0];
        return {
          total: stats.total || 0,
          passed: stats.passed || 0,
          mandatoryFailed: stats.mandatory_failed || 0,
          canProceed: stats.mandatory_failed === 0 && stats.passed === stats.total
        };
      })
  }),

  // 生产拉动信号
  pullSignals: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        executionStatus: z.enum(['pending', 'sent', 'acknowledged', 'failed']).optional()
      }))
      .query(async ({ input }) => {
        let whereConditions: SQL[] = [];
        if (input.projectId) whereConditions.push(sql`project_id = ${input.projectId}`);
        if (input.executionStatus) whereConditions.push(sql`execution_status = ${input.executionStatus}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_production_pull_signals ${whereClause}
          ORDER BY created_at DESC
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        signalId: z.string(),
        upstreamGate: z.string(),
        triggerEvent: z.string(),
        targetAasId: z.string(),
        actionPayload: jsonValue,
        projectId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_production_pull_signals (signal_id, upstream_gate, trigger_event, target_aas_id, action_payload, project_id)
          VALUES (${input.signalId}, ${input.upstreamGate}, ${input.triggerEvent}, ${input.targetAasId}, ${JSON.stringify(input.actionPayload)}, ${input.projectId || null})
        `);
        return { success: true };
      }),

    execute: protectedProcedure
      .input(z.object({ signalId: z.string() }))
      .mutation(async ({ input }) => {
        // 模拟发送信号到AAS设备
        await (await requireDb()).execute(sql`
          UPDATE grt_production_pull_signals 
          SET execution_status = 'sent', executed_at = NOW()
          WHERE signal_id = ${input.signalId}
        `);
        return { success: true };
      }),

    acknowledge: protectedProcedure
      .input(z.object({ signalId: z.string() }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_production_pull_signals SET execution_status = 'acknowledged' WHERE signal_id = ${input.signalId}
        `);
        return { success: true };
      })
  })
});

// =====================================================
// 4. 个人智能体模块 (Personal Agent)
// =====================================================
export const personalAgentRouter = router({
  // 行为探针日志
  behaviorLogs: router({
    record: protectedProcedure
      .input(z.object({
        userDid: z.string(),
        context: z.string(),
        actionData: jsonValue,
        impliedSkill: z.string().optional(),
        sessionId: z.string().optional(),
        pageUrl: z.string().optional(),
        eventType: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_behavior_logs (user_did, context, action_data, implied_skill, session_id, page_url, event_type)
          VALUES (${input.userDid}, ${input.context}, ${JSON.stringify(input.actionData)}, ${input.impliedSkill || null}, ${input.sessionId || null}, ${input.pageUrl || null}, ${input.eventType || null})
        `);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        userDid: z.string(),
        context: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }))
      .query(async ({ input }) => {
        let whereConditions = [sql`user_did = ${input.userDid}`];
        if (input.context) whereConditions.push(sql`context = ${input.context}`);
        if (input.startDate) whereConditions.push(sql`timestamp >= ${input.startDate}`);
        if (input.endDate) whereConditions.push(sql`timestamp <= ${input.endDate}`);
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_behavior_logs 
          WHERE ${sql.join(whereConditions, sql` AND `)}
          ORDER BY timestamp DESC
          LIMIT 100
        `);
        return result[0] as any[];
      }),

    getSkillInference: protectedProcedure
      .input(z.object({ userDid: z.string() }))
      .query(async ({ input }) => {
        const result = await (await requireDb()).execute(sql`
          SELECT implied_skill, COUNT(*) as count
          FROM grt_behavior_logs 
          WHERE user_did = ${input.userDid} AND implied_skill IS NOT NULL
          GROUP BY implied_skill
          ORDER BY count DESC
          LIMIT 10
        `);
        return result[0] as any[];
      })
  }),

  // 过程笔记
  processNotes: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        projectPhase: z.string().optional()
      }))
      .query(async ({ input }) => {
        let whereConditions: SQL[] = [];
        if (input.projectId) whereConditions.push(sql`project_id = ${input.projectId}`);
        if (input.projectPhase) whereConditions.push(sql`project_phase = ${input.projectPhase}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_process_notes ${whereClause}
          ORDER BY created_at DESC
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        noteId: z.string(),
        projectId: z.number().optional(),
        projectPhase: z.string().optional(),
        problemDesc: z.string(),
        solutionDesc: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // AI提取知识（模拟）
        const aiExtractedKnowledge = {
          keywords: input.problemDesc.split(' ').slice(0, 5),
          category: 'technical',
          confidence: 0.85
        };
        const createdBy = ctx.user.name ?? `User#${ctx.user.id}`;

        await (await requireDb()).execute(sql`
          INSERT INTO grt_process_notes (note_id, project_id, project_phase, problem_desc, solution_desc, ai_extracted_knowledge, created_by)
          VALUES (${input.noteId}, ${input.projectId || null}, ${input.projectPhase || null}, ${input.problemDesc}, ${input.solutionDesc}, ${JSON.stringify(aiExtractedKnowledge)}, ${createdBy})
        `);
        return { success: true, aiExtractedKnowledge };
      }),

    search: protectedProcedure
      .input(z.object({ keyword: z.string() }))
      .query(async ({ input }) => {
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_process_notes 
          WHERE problem_desc LIKE ${`%${input.keyword}%`} OR solution_desc LIKE ${`%${input.keyword}%`}
          ORDER BY created_at DESC
          LIMIT 20
        `);
        return result[0] as any[];
      })
  })
});

// =====================================================
// 5. 核心业务模型模块 (Core Business)
// =====================================================
export const coreBusinessRouter = router({
  // 项目管理
  projects: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).optional(),
        currentPhase: z.string().optional()
      }))
      .query(async ({ input }) => {
        let whereConditions: SQL[] = [];
        if (input.status) whereConditions.push(sql`status = ${input.status}`);
        if (input.currentPhase) whereConditions.push(sql`current_phase = ${input.currentPhase}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_projects ${whereClause}
          ORDER BY updated_at DESC
        `);
        return result[0] as any[];
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await (await requireDb()).execute(sql`SELECT * FROM grt_projects WHERE id = ${input.id}`);
        return (result[0] as any[])[0] || null;
      }),

    create: protectedProcedure
      .input(z.object({
        projectCode: z.string(),
        name: z.string(),
        managerId: z.string().optional(),
        techLeadId: z.string().optional(),
        serviceEngineerId: z.string().optional(),
        customerId: z.number().optional(),
        contractAmount: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_projects (project_code, name, manager_id, tech_lead_id, service_engineer_id, customer_id, contract_amount)
          VALUES (${input.projectCode}, ${input.name}, ${input.managerId || null}, ${input.techLeadId || null}, ${input.serviceEngineerId || null}, ${input.customerId || null}, ${input.contractAmount || null})
        `);
        return { success: true };
      }),

    advancePhase: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        newPhase: z.string()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          UPDATE grt_projects SET current_phase = ${input.newPhase} WHERE id = ${input.projectId}
        `);
        return { success: true };
      })
  }),

  // 技术需求
  requirements: router({
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const result = await (await requireDb()).execute(sql`SELECT * FROM grt_project_requirements WHERE project_id = ${input.projectId}`);
        return (result[0] as any[])[0] || null;
      }),

    upsert: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        partMaterial: z.string().optional(),
        partWeightMin: z.number().optional(),
        partWeightMax: z.number().optional(),
        contaminationType: z.array(z.string()).optional(),
        cleanlinessStandard: z.string().optional(),
        cycleTimeReqSec: z.number().optional(),
        dryingLevel: z.enum(['L0_Wet', 'L1_DripFree', 'L2_Dry1', 'L3_Dry2', 'L4_Dry3']).optional(),
        supplierConstraints: z.string().optional(),
        riskAssessment: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        // 检查是否存在
        const existing = await (await requireDb()).execute(sql`SELECT id FROM grt_project_requirements WHERE project_id = ${input.projectId}`);
        
        if ((existing[0] as any[]).length > 0) {
          await (await requireDb()).execute(sql`
            UPDATE grt_project_requirements SET
              part_material = ${input.partMaterial || null},
              part_weight_min = ${input.partWeightMin || null},
              part_weight_max = ${input.partWeightMax || null},
              contamination_type = ${JSON.stringify(input.contaminationType || [])},
              cleanliness_standard = ${input.cleanlinessStandard || null},
              cycle_time_req_sec = ${input.cycleTimeReqSec || null},
              drying_level = ${input.dryingLevel || null},
              supplier_constraints = ${input.supplierConstraints || null},
              risk_assessment = ${input.riskAssessment || null}
            WHERE project_id = ${input.projectId}
          `);
        } else {
          await (await requireDb()).execute(sql`
            INSERT INTO grt_project_requirements (project_id, part_material, part_weight_min, part_weight_max, contamination_type, cleanliness_standard, cycle_time_req_sec, drying_level, supplier_constraints, risk_assessment)
            VALUES (${input.projectId}, ${input.partMaterial || null}, ${input.partWeightMin || null}, ${input.partWeightMax || null}, ${JSON.stringify(input.contaminationType || [])}, ${input.cleanlinessStandard || null}, ${input.cycleTimeReqSec || null}, ${input.dryingLevel || null}, ${input.supplierConstraints || null}, ${input.riskAssessment || null})
          `);
        }
        return { success: true };
      })
  }),

  // 交付物管理
  deliverables: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        phase: z.string().optional(),
        status: z.enum(['draft', 'reviewing', 'approved', 'rejected']).optional()
      }))
      .query(async ({ input }) => {
        let whereConditions = [sql`project_id = ${input.projectId}`];
        if (input.phase) whereConditions.push(sql`phase = ${input.phase}`);
        if (input.status) whereConditions.push(sql`status = ${input.status}`);
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_project_deliverables 
          WHERE ${sql.join(whereConditions, sql` AND `)}
          ORDER BY phase, type
        `);
        return result[0] as any[];
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        phase: z.string(),
        type: z.enum(['Mechanical_Assembly_Drawing', 'Electrical_Schematic', 'BOM_List', 'PLC_Program', 'HMI_Config', 'SOP_Debugging', 'SOP_Maintenance', 'Checklist_PreAcceptance']),
        docUrl: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_project_deliverables (project_id, phase, type, doc_url)
          VALUES (${input.projectId}, ${input.phase}, ${input.type}, ${input.docUrl || null})
        `);
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({
        deliverableId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const approvedBy = ctx.user.name ?? `User#${ctx.user.id}`;
        await (await requireDb()).execute(sql`
          UPDATE grt_project_deliverables
          SET status = 'approved', approved_by = ${approvedBy}, approved_at = NOW()
          WHERE id = ${input.deliverableId}
        `);
        return { success: true };
      })
  }),

  // 调试记录
  commissioningLogs: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        testType: z.enum(['Toothpaste_Test', 'Cycle_Time', 'Vacuum_Test', 'Particle_Count']).optional()
      }))
      .query(async ({ input }) => {
        let whereConditions = [sql`project_id = ${input.projectId}`];
        if (input.testType) whereConditions.push(sql`test_type = ${input.testType}`);
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_commissioning_logs 
          WHERE ${sql.join(whereConditions, sql` AND `)}
          ORDER BY timestamp DESC
        `);
        return result[0] as any[];
      }),

    record: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        testType: z.enum(['Toothpaste_Test', 'Cycle_Time', 'Vacuum_Test', 'Particle_Count']),
        parameters: jsonValue,
        resultData: jsonValue,
        resultStatus: z.boolean(),
        testerId: z.string()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_commissioning_logs (project_id, test_type, parameters, result_data, result_status, tester_id)
          VALUES (${input.projectId}, ${input.testType}, ${JSON.stringify(input.parameters)}, ${JSON.stringify(input.resultData)}, ${input.resultStatus}, ${input.testerId})
        `);
        return { success: true };
      })
  })
});

// =====================================================
// 6. 社群管理模块 (Social Community)
// =====================================================
export const socialCommunityRouter = router({
  // 消息管理
  messages: router({
    list: protectedProcedure
      .input(z.object({
        groupId: z.string().optional(),
        replyStatus: z.enum(['pending', 'drafted', 'approved', 'rejected', 'sent']).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20)
      }))
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.pageSize;
        let whereConditions: SQL[] = [];
        if (input.groupId) whereConditions.push(sql`group_id = ${input.groupId}`);
        if (input.replyStatus) whereConditions.push(sql`reply_status = ${input.replyStatus}`);
        
        const whereClause = whereConditions.length > 0 
          ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` 
          : sql``;
        
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_social_messages ${whereClause}
          ORDER BY created_at DESC
          LIMIT ${input.pageSize} OFFSET ${offset}
        `);
        return result[0] as any[];
      }),

    ingest: protectedProcedure
      .input(z.object({
        messageId: z.string(),
        sourcePlatform: z.enum(['wechat', 'dingtalk', 'feishu', 'custom']),
        groupId: z.string(),
        groupName: z.string().optional(),
        senderId: z.string(),
        senderName: z.string().optional(),
        originalContent: z.string()
      }))
      .mutation(async ({ input }) => {
        // 脱敏处理（模拟）
        const sanitizedContent = input.originalContent
          .replace(/1[3-9]\d{9}/g, '***手机号***')
          .replace(/\d{6,}/g, '***数字***');
        const isSensitive = sanitizedContent !== input.originalContent;
        
        await (await requireDb()).execute(sql`
          INSERT INTO grt_social_messages (message_id, source_platform, group_id, group_name, sender_id, sender_name, original_content, sanitized_content, is_sensitive)
          VALUES (${input.messageId}, ${input.sourcePlatform}, ${input.groupId}, ${input.groupName || null}, ${input.senderId}, ${input.senderName || null}, ${input.originalContent}, ${sanitizedContent}, ${isSensitive})
        `);
        return { success: true, sanitizedContent, isSensitive };
      }),

    generateAiReply: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input }) => {
        // 模拟AI生成回复
        const aiDraftReply = "感谢您的咨询！我们的技术团队会尽快为您解答。如有紧急问题，请联系我们的客服热线。";
        
        await (await requireDb()).execute(sql`
          UPDATE grt_social_messages SET ai_draft_reply = ${aiDraftReply}, reply_status = 'drafted' WHERE id = ${input.messageId}
        `);
        
        // 添加到审核队列
        await (await requireDb()).execute(sql`
          INSERT INTO grt_social_reply_queue (message_id, ai_draft_reply, confidence_score, suggested_category)
          VALUES (${input.messageId}, ${aiDraftReply}, 0.85, 'customer_service')
        `);
        
        return { success: true, aiDraftReply };
      }),

    approveReply: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        approvedReply: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const approvedBy = ctx.user.name ?? `User#${ctx.user.id}`;
        await (await requireDb()).execute(sql`
          UPDATE grt_social_messages
          SET approved_reply = ${input.approvedReply}, reply_status = 'approved', approved_by = ${approvedBy}, approved_at = NOW()
          WHERE id = ${input.messageId}
        `);
        return { success: true };
      }),

    sendReply: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input }) => {
        // 模拟发送到Social Bridge
        await (await requireDb()).execute(sql`
          UPDATE grt_social_messages SET reply_status = 'sent', sent_at = NOW() WHERE id = ${input.messageId}
        `);
        return { success: true };
      })
  }),

  // 审核队列
  reviewQueue: router({
    list: protectedProcedure
      .input(z.object({
        reviewStatus: z.enum(['pending', 'approved', 'rejected', 'modified']).optional()
      }))
      .query(async ({ input }) => {
        const whereClause = input.reviewStatus 
          ? sql`WHERE review_status = ${input.reviewStatus}` 
          : sql``;
        const result = await (await requireDb()).execute(sql`
          SELECT q.*, m.original_content, m.sanitized_content, m.group_name, m.sender_name
          FROM grt_social_reply_queue q
          JOIN grt_social_messages m ON q.message_id = m.id
          ${whereClause}
          ORDER BY q.created_at DESC
        `);
        return result[0] as any[];
      }),

    review: protectedProcedure
      .input(z.object({
        queueId: z.number(),
        reviewStatus: z.enum(['approved', 'rejected', 'modified']),
        finalReply: z.string().optional(),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const reviewerId = String(ctx.user.id);
        await (await requireDb()).execute(sql`
          UPDATE grt_social_reply_queue
          SET review_status = ${input.reviewStatus}, final_reply = ${input.finalReply || null}, review_notes = ${input.reviewNotes || null}, reviewer_id = ${reviewerId}, reviewed_at = NOW()
          WHERE id = ${input.queueId}
        `);
        return { success: true };
      })
  })
});

// =====================================================
// 7. ERP连接管理模块
// =====================================================
export const erpConnectionRouter = router({
  connections: router({
    list: protectedProcedure.query(async () => {
      const result = await (await requireDb()).execute(sql`SELECT * FROM grt_erp_connections ORDER BY created_at DESC`);
      return result[0] as any[];
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        erpType: z.enum(['SAP', 'Oracle', 'Kingdee', 'Custom']),
        connectionUrl: z.string(),
        authConfig: jsonValue,
        syncConfig: jsonValue.optional()
      }))
      .mutation(async ({ input }) => {
        await (await requireDb()).execute(sql`
          INSERT INTO grt_erp_connections (name, erp_type, connection_url, auth_config, sync_config)
          VALUES (${input.name}, ${input.erpType}, ${input.connectionUrl}, ${JSON.stringify(input.authConfig)}, ${JSON.stringify(input.syncConfig || {})})
        `);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        connectionUrl: z.string().optional(),
        authConfig: jsonValue.optional(),
        syncConfig: jsonValue.optional(),
        isActive: z.boolean().optional()
      }))
      .mutation(async ({ input }) => {
        const updates: SQL[] = [];
        if (input.name) updates.push(sql`name = ${input.name}`);
        if (input.connectionUrl) updates.push(sql`connection_url = ${input.connectionUrl}`);
        if (input.authConfig) updates.push(sql`auth_config = ${JSON.stringify(input.authConfig)}`);
        if (input.syncConfig) updates.push(sql`sync_config = ${JSON.stringify(input.syncConfig)}`);
        if (input.isActive !== undefined) updates.push(sql`is_active = ${input.isActive}`);
        
        if (updates.length > 0) {
          await (await requireDb()).execute(sql`
            UPDATE grt_erp_connections SET ${sql.join(updates, sql`, `)} WHERE id = ${input.id}
          `);
        }
        return { success: true };
      }),

    testConnection: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // 模拟连接测试
        const success = Math.random() > 0.2;
        return { success, message: success ? '连接成功' : '连接失败：无法访问ERP服务器' };
      }),

    sync: protectedProcedure
      .input(z.object({
        connectionId: z.number(),
        syncType: z.enum(['full', 'incremental', 'manual']),
        entityType: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        // 创建同步日志
        await (await requireDb()).execute(sql`
          INSERT INTO grt_erp_sync_logs (connection_id, sync_type, entity_type)
          VALUES (${input.connectionId}, ${input.syncType}, ${input.entityType || null})
        `);
        
        // 模拟同步
        const recordsSynced = Math.floor(Math.random() * 100);
        
        await (await requireDb()).execute(sql`
          UPDATE grt_erp_sync_logs 
          SET records_synced = ${recordsSynced}, records_created = ${Math.floor(recordsSynced * 0.3)}, records_updated = ${Math.floor(recordsSynced * 0.7)}, status = 'success', completed_at = NOW()
          WHERE connection_id = ${input.connectionId} AND status = 'running'
          ORDER BY started_at DESC LIMIT 1
        `);
        
        await (await requireDb()).execute(sql`
          UPDATE grt_erp_connections SET last_sync_at = NOW(), last_sync_status = 'success' WHERE id = ${input.connectionId}
        `);
        
        return { success: true, recordsSynced };
      })
  }),

  syncLogs: router({
    list: protectedProcedure
      .input(z.object({ connectionId: z.number().optional() }))
      .query(async ({ input }) => {
        const whereClause = input.connectionId 
          ? sql`WHERE connection_id = ${input.connectionId}` 
          : sql``;
        const result = await (await requireDb()).execute(sql`
          SELECT * FROM grt_erp_sync_logs ${whereClause}
          ORDER BY started_at DESC
          LIMIT 50
        `);
        return result[0] as any[];
      })
  })
});

// 导出合并路由
export const geminiIntegrationRouter = router({
  liquidWorkforce: liquidWorkforceRouter,
  autonomousSales: autonomousSalesRouter,
  stageGate: stageGateRouter,
  personalAgent: personalAgentRouter,
  coreBusiness: coreBusinessRouter,
  socialCommunity: socialCommunityRouter,
  erpConnection: erpConnectionRouter
});

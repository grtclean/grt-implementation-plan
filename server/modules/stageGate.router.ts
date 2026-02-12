/**
 * 门径管理与生产拉动模块 - tRPC路由
 * 模块功能：M3-M12阶段门禁检查、JIT/JIS生产拉动信号
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

// ==================== 门径管理路由 ====================
export const stageGateRouter = router({
  // ==================== 门径检查项管理 ====================
  
  // 获取门径检查项列表
  getGateChecklists: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      gateStage: z.enum(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']).optional(),
      category: z.string().optional(),
      status: z.enum(['pending', 'pass', 'fail', 'waived', 'not_applicable']).optional(),
      isMandatory: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, gateStage, category, status, isMandatory, page = 1, pageSize = 50 } = input || {};
      
      let query = `SELECT gc.*, p.name as project_name
                   FROM gate_checklists gc
                   LEFT JOIN projects p ON gc.project_id = p.id
                   WHERE 1=1`;
      const params: any[] = [];
      
      if (projectId) {
        query += ` AND gc.project_id = ?`;
        params.push(projectId);
      }
      if (gateStage) {
        query += ` AND gc.gate_stage = ?`;
        params.push(gateStage);
      }
      if (category) {
        query += ` AND gc.category = ?`;
        params.push(category);
      }
      if (status) {
        query += ` AND gc.status = ?`;
        params.push(status);
      }
      if (isMandatory !== undefined) {
        query += ` AND gc.is_mandatory = ?`;
        params.push(isMandatory);
      }
      
      query += ` ORDER BY gc.gate_stage, gc.sort_order, gc.id LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as any).execute(query, params);

      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 获取项目门径概览（按阶段分组）
  getProjectGateOverview: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId } = input;
      
      const [overview] = await (db as any).execute(
        `SELECT gate_stage,
                COUNT(*) as total_items,
                SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed_items,
                SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed_items,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_items,
                SUM(CASE WHEN is_mandatory = 1 AND status = 'fail' THEN 1 ELSE 0 END) as mandatory_failures
         FROM gate_checklists
         WHERE project_id = ?
         GROUP BY gate_stage
         ORDER BY FIELD(gate_stage, 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12')`,
        [projectId]
      );
      
      return overview as any[];
    }),

  // 创建门径检查项
  createGateChecklist: adminProcedure
    .input(z.object({
      projectId: z.number(),
      gateStage: z.enum(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']),
      checkItem: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      isMandatory: z.boolean().default(false),
      autoVerifySource: z.string().optional(),
      autoVerifyQuery: z.string().optional(),
      sortOrder: z.number().default(0),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { projectId, gateStage, checkItem, description, category, isMandatory,
              autoVerifySource, autoVerifyQuery, sortOrder, dueDate } = input;
      
      const [result] = await (db as any).execute(
        `INSERT INTO gate_checklists
         (project_id, gate_stage, check_item, description, category, is_mandatory,
          auto_verify_source, auto_verify_query, sort_order, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [projectId, gateStage, checkItem, description || null, category || null,
         isMandatory, autoVerifySource || null, autoVerifyQuery || null,
         sortOrder, dueDate || null]
      );
      
      return { id: (result as any).insertId, success: true };
    }),

  // 批量创建门径检查项（从模板）
  createGateChecklistsFromTemplate: adminProcedure
    .input(z.object({
      projectId: z.number(),
      templateName: z.string().default('standard'),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { projectId, templateName } = input;
      
      // 标准门径检查模板
      const standardTemplate = [
        // M3 - 立项评审
        { stage: 'M3', item: '项目立项申请已批准', category: '立项', mandatory: true },
        { stage: 'M3', item: '初步商务条款已确认', category: '商务', mandatory: true },
        { stage: 'M3', item: '技术可行性评估完成', category: '技术', mandatory: true },
        { stage: 'M3', item: '资源需求计划已制定', category: '资源', mandatory: false },
        
        // M4 - 概念设计评审
        { stage: 'M4', item: '产品概念设计完成', category: '设计', mandatory: true },
        { stage: 'M4', item: '初步BOM清单已建立', category: '物料', mandatory: false },
        { stage: 'M4', item: '成本估算完成', category: '成本', mandatory: true },
        
        // M5 - 详细设计评审
        { stage: 'M5', item: '详细设计图纸已发布', category: '设计', mandatory: true },
        { stage: 'M5', item: 'DFMEA分析完成', category: '质量', mandatory: true },
        { stage: 'M5', item: '模具设计评审通过', category: '模具', mandatory: true },
        { stage: 'M5', item: '模具PO已下达', category: '采购', mandatory: true, autoSource: 'ERP_PO_Table' },
        
        // M7 - 样件评审
        { stage: 'M7', item: '样件制作完成', category: '生产', mandatory: true },
        { stage: 'M7', item: '样件尺寸检测合格', category: '质量', mandatory: true },
        { stage: 'M7', item: '样件功能测试通过', category: '测试', mandatory: true },
        { stage: 'M7', item: '客户样件确认', category: '客户', mandatory: true },
        
        // M10 - PPAP评审
        { stage: 'M10', item: 'PPAP文件包完成', category: 'PPAP', mandatory: true },
        { stage: 'M10', item: 'Cpk达标(≥1.33)', category: '质量', mandatory: true },
        { stage: 'M10', item: '客户PPAP批准', category: '客户', mandatory: true },
        
        // M12 - 量产评审
        { stage: 'M12', item: '量产准备就绪', category: '生产', mandatory: true },
        { stage: 'M12', item: '作业指导书已发布', category: '文档', mandatory: true },
        { stage: 'M12', item: '质量控制计划已实施', category: '质量', mandatory: true },
        { stage: 'M12', item: '客户量产批准', category: '客户', mandatory: true },
      ];
      
      let insertCount = 0;
      for (const item of standardTemplate) {
        await (db as any).execute(
          `INSERT INTO gate_checklists
           (project_id, gate_stage, check_item, category, is_mandatory, auto_verify_source, status, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [projectId, item.stage, item.item, item.category, item.mandatory,
           (item as any).autoSource || null, insertCount]
        );
        insertCount++;
      }
      
      return { insertedCount: insertCount, success: true };
    }),

  // 更新门径检查项状态
  updateGateChecklistStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'pass', 'fail', 'waived', 'not_applicable']),
      verifiedBy: z.number().optional(),
      verificationNote: z.string().optional(),
      evidenceUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, status, verifiedBy, verificationNote, evidenceUrl } = input;
      
      await (db as any).execute(
        `UPDATE gate_checklists SET
         status = ?, verified_by = ?, verified_at = NOW(),
         verification_note = ?, evidence_url = ?
         WHERE id = ?`,
        [status, verifiedBy || ctx.user?.id || null, verificationNote || null,
         evidenceUrl || null, id]
      );
      
      return { success: true };
    }),

  // 自动验证门径检查项
  autoVerifyGateChecklist: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id } = input;
      
      // 获取检查项
      const [items] = await (db as any).execute(
        `SELECT * FROM gate_checklists WHERE id = ?`,
        [id]
      );
      
      if ((items as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '检查项不存在' });
      }
      
      const item = (items as any[])[0];
      
      if (!item.auto_verify_source) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '该检查项不支持自动验证' });
      }
      
      // TODO: 实际实现与ERP/PLM系统的集成
      // 这里是模拟实现
      const verificationResult = await simulateAutoVerification(item.auto_verify_source, item.auto_verify_query);
      
      await (db as any).execute(
        `UPDATE gate_checklists SET
         status = ?, verified_at = NOW(), verification_note = ?, auto_verified = 1
         WHERE id = ?`,
        [verificationResult.passed ? 'pass' : 'fail', verificationResult.note, id]
      );
      
      return { 
        success: true, 
        passed: verificationResult.passed,
        note: verificationResult.note 
      };
    }),

  // 检查门径是否可以通过
  checkGatePassable: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      gateStage: z.enum(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, gateStage } = input;
      
      // 检查是否有强制项未通过
      const [mandatoryFailures] = await (db as any).execute(
        `SELECT * FROM gate_checklists
         WHERE project_id = ? AND gate_stage = ? AND is_mandatory = 1 AND status != 'pass' AND status != 'waived'`,
        [projectId, gateStage]
      );

      // 检查所有项的完成情况
      const [summary] = await (db as any).execute(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'pass' OR status = 'waived' OR status = 'not_applicable' THEN 1 ELSE 0 END) as completed
         FROM gate_checklists
         WHERE project_id = ? AND gate_stage = ?`,
        [projectId, gateStage]
      );
      
      const failures = mandatoryFailures as any[];
      const stats = (summary as any[])[0];
      
      return {
        passable: failures.length === 0,
        mandatoryFailures: failures,
        completionRate: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0,
        totalItems: stats.total,
        completedItems: stats.completed,
      };
    }),

  // ==================== 生产拉动信号管理 ====================
  
  // 获取生产拉动信号列表
  getPullSignals: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      upstreamGate: z.string().optional(),
      status: z.enum(['pending', 'sent', 'acknowledged', 'executed', 'failed', 'cancelled']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, upstreamGate, status, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT ps.*, p.name as project_name
                   FROM production_pull_signals ps
                   LEFT JOIN projects p ON ps.project_id = p.id
                   WHERE 1=1`;
      const params: any[] = [];
      
      if (projectId) {
        query += ` AND ps.project_id = ?`;
        params.push(projectId);
      }
      if (upstreamGate) {
        query += ` AND ps.upstream_gate = ?`;
        params.push(upstreamGate);
      }
      if (status) {
        query += ` AND ps.status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY ps.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const [rows] = await (db as any).execute(query, params);

      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 创建生产拉动信号
  createPullSignal: adminProcedure
    .input(z.object({
      projectId: z.number().optional(),
      upstreamGate: z.string(),
      triggerEvent: z.string(),
      triggerSource: z.string().optional(),
      targetAasId: z.string(),
      targetDeviceName: z.string().optional(),
      actionPayload: z.record(z.string(), z.any()),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { projectId, upstreamGate, triggerEvent, triggerSource, targetAasId,
              targetDeviceName, actionPayload, priority, scheduledAt } = input;
      
      const signalId = `PUL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
      
      const [result] = await (db as any).execute(
        `INSERT INTO production_pull_signals
         (signal_id, project_id, upstream_gate, trigger_event, trigger_source,
          target_aas_id, target_device_name, action_payload, priority, scheduled_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [signalId, projectId || null, upstreamGate, triggerEvent, triggerSource || null,
         targetAasId, targetDeviceName || null, JSON.stringify(actionPayload),
         priority, scheduledAt || null]
      );
      
      return { id: (result as any).insertId, signalId, success: true };
    }),

  // 发送拉动信号
  sendPullSignal: adminProcedure
    .input(z.object({
      signalId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { signalId } = input;
      
      // 获取信号
      const [signals] = await (db as any).execute(
        `SELECT * FROM production_pull_signals WHERE signal_id = ?`,
        [signalId]
      );

      if ((signals as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '拉动信号不存在' });
      }

      const signal = (signals as any[])[0];

      if (signal.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '信号状态不允许发送' });
      }

      // TODO: 实际发送到AAS设备
      // 这里是模拟实现
      const sendResult = await simulateSendToAAS(signal.target_aas_id, JSON.parse(signal.action_payload));

      await (db as any).execute(
        `UPDATE production_pull_signals SET
         status = ?, sent_at = NOW(), response_data = ?
         WHERE signal_id = ?`,
        [sendResult.success ? 'sent' : 'failed', JSON.stringify(sendResult), signalId]
      );
      
      return { success: sendResult.success, response: sendResult };
    }),

  // 确认信号已执行
  acknowledgePullSignal: protectedProcedure
    .input(z.object({
      signalId: z.string(),
      executionResult: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { signalId, executionResult } = input;
      
      await (db as any).execute(
        `UPDATE production_pull_signals SET
         status = 'executed', executed_at = NOW(), execution_result = ?
         WHERE signal_id = ? AND status IN ('sent', 'acknowledged')`,
        [executionResult ? JSON.stringify(executionResult) : null, signalId]
      );
      
      return { success: true };
    }),

  // ==================== 统计分析 ====================
  
  // 获取门径管理统计
  getStats: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId } = input || {};
      
      let whereClause = projectId ? `WHERE project_id = ${projectId}` : '';
      
      // 门径检查统计
      const [gateStats] = await (db as any).execute(
        `SELECT gate_stage, status, COUNT(*) as count
         FROM gate_checklists ${whereClause}
         GROUP BY gate_stage, status`
      );

      // 拉动信号统计
      const [signalStats] = await (db as any).execute(
        `SELECT status, priority, COUNT(*) as count
         FROM production_pull_signals ${whereClause}
         GROUP BY status, priority`
      );

      // 自动验证统计
      const [autoVerifyStats] = await (db as any).execute(
        `SELECT auto_verified, COUNT(*) as count
         FROM gate_checklists ${whereClause}
         GROUP BY auto_verified`
      );
      
      return {
        gates: gateStats,
        signals: signalStats,
        autoVerify: autoVerifyStats,
      };
    }),
});

// ==================== 辅助函数 ====================

// 模拟自动验证
async function simulateAutoVerification(source: string, query: string | null): Promise<{ passed: boolean; note: string }> {
  // 实际实现应该连接到ERP/PLM系统
  // 这里是模拟实现
  const random = Math.random();
  
  if (source === 'ERP_PO_Table') {
    return {
      passed: random > 0.3,
      note: random > 0.3 ? '已在ERP系统中找到对应PO记录' : 'ERP系统中未找到对应PO记录'
    };
  } else if (source === 'PLM_Drawing_Status') {
    return {
      passed: random > 0.2,
      note: random > 0.2 ? 'PLM系统显示图纸状态为"已发布"' : 'PLM系统显示图纸状态为"草稿"'
    };
  }
  
  return {
    passed: random > 0.5,
    note: `自动验证源"${source}"检查完成`
  };
}

// 模拟发送到AAS设备
async function simulateSendToAAS(aasId: string, payload: any): Promise<{ success: boolean; message: string }> {
  // 实际实现应该通过AAS协议发送
  // 这里是模拟实现
  return {
    success: true,
    message: `信号已发送到设备 ${aasId}`
  };
}

export default stageGateRouter;

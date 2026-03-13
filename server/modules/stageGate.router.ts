/**
 * 门径管理与生产拉动模块 - tRPC路由
 * 模块功能：M3-M12阶段门禁检查、M5设计评审门、JIT/JIS生产拉动信号
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { jsonValue } from "@shared/validators";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import {
  M5_DESIGN_CHECKLIST,
  M5_REVIEW_CATEGORIES,
  M5_CHECKLIST_BY_CATEGORY,
  type M5ReviewCategory,
} from "../../shared/stage-definitions";

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
      const params: unknown[] = [];
      
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
        // M3 - 立项评审（business_value - 商业价值）
        { stage: 'M3', item: '项目立项申请已批准', category: '商业价值', mandatory: true },
        { stage: 'M3', item: '初步商务条款已确认', category: '商业价值', mandatory: true },
        { stage: 'M3', item: '项目预算已分配且大于0', category: '商业价值', mandatory: true, autoSource: 'PROJECT_BUDGET_CHECK' },
        // M3 - 立项评审（scope - 范围）
        { stage: 'M3', item: '项目范围文档完整', category: '范围', mandatory: true, autoSource: 'SCOPE_DOCUMENT_COMPLETE' },
        { stage: 'M3', item: '技术可行性评估完成', category: '范围', mandatory: true },
        { stage: 'M3', item: '项目交付物清单已明确', category: '范围', mandatory: false },
        // M3 - 立项评审（resources - 资源）
        { stage: 'M3', item: '项目经理已指派', category: '资源', mandatory: true, autoSource: 'PROJECT_PM_ASSIGNED' },
        { stage: 'M3', item: '资源需求计划已制定', category: '资源', mandatory: false },
        { stage: 'M3', item: '关键资源可用性已确认', category: '资源', mandatory: true },
        // M3 - 立项评审（raci - RACI矩阵）
        { stage: 'M3', item: 'RACI矩阵已定义', category: 'RACI矩阵', mandatory: true, autoSource: 'RACI_MATRIX_DEFINED' },
        { stage: 'M3', item: '各角色职责已明确并签字确认', category: 'RACI矩阵', mandatory: true },
        // M3 - 立项评审（risks - 风险）
        { stage: 'M3', item: '风险评估文档已完成', category: '风险', mandatory: true, autoSource: 'RISK_ASSESSMENT_EXISTS' },
        { stage: 'M3', item: '高优先级风险缓解措施已制定', category: '风险', mandatory: true },
        { stage: 'M3', item: '风险责任人已分配', category: '风险', mandatory: false },
        
        // M4 - 概念设计评审
        { stage: 'M4', item: '产品概念设计完成', category: '设计', mandatory: true },
        { stage: 'M4', item: '初步BOM清单已建立', category: '物料', mandatory: false },
        { stage: 'M4', item: '成本估算完成', category: '成本', mandatory: true },
        
        // M5 - 详细设计评审（机械设计完成度）
        { stage: 'M5', item: '3D模型最终版发布', category: '机械设计完成度', mandatory: true, autoSource: 'PLM_Model_Status' },
        { stage: 'M5', item: '加工图纸及公差标注完成', category: '机械设计完成度', mandatory: true, autoSource: 'PLM_Drawing_Status' },
        { stage: 'M5', item: '装配图及装配顺序确认', category: '机械设计完成度', mandatory: true },
        { stage: 'M5', item: '关键外购件选型确认', category: '机械设计完成度', mandatory: false },
        { stage: 'M5', item: '干涉检查与运动空间校验', category: '机械设计完成度', mandatory: true },
        // M5 - 详细设计评审（电气设计完成度）
        { stage: 'M5', item: '电气原理图最终版发布', category: '电气设计完成度', mandatory: true, autoSource: 'PLM_Drawing_Status' },
        { stage: 'M5', item: 'PLC程序设计完成', category: '电气设计完成度', mandatory: true },
        { stage: 'M5', item: 'HMI界面设计完成', category: '电气设计完成度', mandatory: true },
        { stage: 'M5', item: '安全回路设计验证', category: '电气设计完成度', mandatory: true },
        { stage: 'M5', item: '接线图与线缆清单完成', category: '电气设计完成度', mandatory: false },
        // M5 - 详细设计评审（BOM准确度）
        { stage: 'M5', item: 'BOM与3D模型一致性校验', category: 'BOM准确度', mandatory: true, autoSource: 'ERP_BOM_Consistency' },
        { stage: 'M5', item: '物料编码与规格匹配', category: 'BOM准确度', mandatory: true, autoSource: 'ERP_Material_Validation' },
        { stage: 'M5', item: '长周期件提前采购确认', category: 'BOM准确度', mandatory: true, autoSource: 'ERP_PO_Table' },
        { stage: 'M5', item: '替代物料与成本确认', category: 'BOM准确度', mandatory: false },
        // M5 - 详细设计评审（设计评审记录）
        { stage: 'M5', item: '机械设计评审会议记录', category: '设计评审记录', mandatory: true },
        { stage: 'M5', item: '电气设计评审会议记录', category: '设计评审记录', mandatory: true },
        { stage: 'M5', item: '评审问题跟踪闭环', category: '设计评审记录', mandatory: true },
        { stage: 'M5', item: '设计变更记录完整', category: '设计评审记录', mandatory: true },
        // M5 - 详细设计评审（仿真验证通过）
        { stage: 'M5', item: '结构强度仿真(FEA)通过', category: '仿真验证通过', mandatory: true },
        { stage: 'M5', item: '运动仿真验证通过', category: '仿真验证通过', mandatory: false },
        { stage: 'M5', item: '流体/热仿真验证', category: '仿真验证通过', mandatory: false },
        { stage: 'M5', item: '仿真报告归档', category: '仿真验证通过', mandatory: true, autoSource: 'PLM_Document_Archive' },
        
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
  updateGateChecklistStatus: requirePermission('project:stage-gate:manage')
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

  // ==================== M5 详细设计评审门 ====================

  // 获取M5设计评审定义（五大类别及检查项）
  getM5DesignReviewDefinitions: protectedProcedure
    .query(async () => {
      return {
        categories: M5_REVIEW_CATEGORIES,
        checklist: M5_DESIGN_CHECKLIST,
        checklistByCategory: M5_CHECKLIST_BY_CATEGORY,
        totalItems: M5_DESIGN_CHECKLIST.length,
        mandatoryItems: M5_DESIGN_CHECKLIST.filter(i => i.isMandatory).length,
      };
    }),

  // 获取项目M5设计评审摘要（按类别汇总完成度）
  getM5DesignReviewSummary: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId } = input;

      // 获取该项目 M5 阶段所有检查项
      const [rows] = await (db as any).execute(
        `SELECT gc.category, gc.status, gc.is_mandatory, gc.check_item,
                gc.verified_by, gc.verified_at, gc.auto_verify_source
         FROM gate_checklists gc
         WHERE gc.project_id = ? AND gc.gate_stage = 'M5'
         ORDER BY gc.sort_order, gc.id`,
        [projectId]
      );

      const items = rows as any[];

      // 按类别汇总
      const categoryMap: Record<string, {
        total: number;
        passed: number;
        failed: number;
        pending: number;
        mandatoryTotal: number;
        mandatoryPassed: number;
        items: any[];
      }> = {};

      for (const cat of M5_REVIEW_CATEGORIES) {
        categoryMap[cat.name] = {
          total: 0, passed: 0, failed: 0, pending: 0,
          mandatoryTotal: 0, mandatoryPassed: 0, items: [],
        };
      }

      for (const item of items) {
        const catName = item.category || '未分类';
        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            total: 0, passed: 0, failed: 0, pending: 0,
            mandatoryTotal: 0, mandatoryPassed: 0, items: [],
          };
        }
        const cat = categoryMap[catName];
        cat.total++;
        cat.items.push(item);
        if (item.status === 'pass' || item.status === 'waived') cat.passed++;
        else if (item.status === 'fail') cat.failed++;
        else cat.pending++;
        if (item.is_mandatory) {
          cat.mandatoryTotal++;
          if (item.status === 'pass' || item.status === 'waived') cat.mandatoryPassed++;
        }
      }

      // 计算各类别完成率
      const categorySummary = M5_REVIEW_CATEGORIES.map(catDef => {
        const data = categoryMap[catDef.name] || { total: 0, passed: 0, failed: 0, pending: 0, mandatoryTotal: 0, mandatoryPassed: 0, items: [] };
        const completionRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        const meetsTarget = completionRate >= catDef.targetScore;
        const mandatoryAllPassed = data.mandatoryTotal === data.mandatoryPassed;
        return {
          ...catDef,
          ...data,
          completionRate,
          meetsTarget,
          mandatoryAllPassed,
        };
      });

      // 总体汇总
      const totalItems = items.length;
      const totalPassed = items.filter(i => i.status === 'pass' || i.status === 'waived').length;
      const totalFailed = items.filter(i => i.status === 'fail').length;
      const totalMandatory = items.filter(i => i.is_mandatory).length;
      const mandatoryPassed = items.filter(i => i.is_mandatory && (i.status === 'pass' || i.status === 'waived')).length;
      const overallRate = totalItems > 0 ? Math.round((totalPassed / totalItems) * 100) : 0;
      const gatePassable = mandatoryPassed === totalMandatory && totalFailed === 0;

      return {
        projectId,
        categorySummary,
        overall: {
          totalItems,
          totalPassed,
          totalFailed,
          totalPending: totalItems - totalPassed - totalFailed,
          totalMandatory,
          mandatoryPassed,
          overallRate,
          gatePassable,
        },
      };
    }),

  // 为项目初始化M5设计评审检查项（从M5模板批量创建）
  initializeM5DesignReview: requirePermission('project:stage-gate:manage')
    .input(z.object({
      projectId: z.number(),
      skipExisting: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { projectId, skipExisting } = input;

      // 检查是否已有M5检查项
      if (skipExisting) {
        const [existing] = await (db as any).execute(
          `SELECT COUNT(*) as cnt FROM gate_checklists WHERE project_id = ? AND gate_stage = 'M5'`,
          [projectId]
        );
        if ((existing as any[])[0]?.cnt > 0) {
          return {
            success: false,
            message: `该项目已有 ${(existing as any[])[0].cnt} 条M5检查项，跳过初始化`,
            insertedCount: 0,
          };
        }
      }

      let insertCount = 0;
      // 找到M5类别对应的中文名称映射
      const categoryNameMap: Record<string, string> = {};
      for (const cat of M5_REVIEW_CATEGORIES) {
        categoryNameMap[cat.id] = cat.name;
      }

      for (const item of M5_DESIGN_CHECKLIST) {
        const categoryName = categoryNameMap[item.category] || item.category;
        await (db as any).execute(
          `INSERT INTO gate_checklists
           (project_id, gate_stage, check_item, description, category, is_mandatory,
            auto_verify_source, status, sort_order)
           VALUES (?, 'M5', ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            projectId,
            item.name,
            item.description,
            categoryName,
            item.isMandatory,
            item.autoVerifySource || null,
            insertCount,
          ]
        );
        insertCount++;
      }

      return {
        success: true,
        message: `已为项目初始化 ${insertCount} 条M5设计评审检查项`,
        insertedCount: insertCount,
      };
    }),

  // 批量更新M5某类别下所有检查项状态
  batchUpdateM5CategoryStatus: requirePermission('project:stage-gate:manage')
    .input(z.object({
      projectId: z.number(),
      categoryName: z.string(),
      status: z.enum(['pending', 'pass', 'fail', 'waived', 'not_applicable']),
      verificationNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { projectId, categoryName, status, verificationNote } = input;

      const [result] = await (db as any).execute(
        `UPDATE gate_checklists SET
         status = ?, verified_by = ?, verified_at = NOW(), verification_note = ?
         WHERE project_id = ? AND gate_stage = 'M5' AND category = ?`,
        [status, ctx.user?.id || null, verificationNote || null, projectId, categoryName]
      );

      return {
        success: true,
        updatedCount: (result as any).affectedRows || 0,
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
      const params: unknown[] = [];
      
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
      actionPayload: z.record(z.string(), jsonValue),
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
  acknowledgePullSignal: requirePermission('project:stage-gate:manage')
    .input(z.object({
      signalId: z.string(),
      executionResult: z.record(z.string(), jsonValue).optional(),
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

      const params = projectId ? [projectId] : [];
      const whereClause = projectId ? 'WHERE project_id = $1' : '';

      // 门径检查统计
      const [gateStats] = await (db as any).execute(
        `SELECT gate_stage, status, COUNT(*) as count
         FROM gate_checklists ${whereClause}
         GROUP BY gate_stage, status`,
        params
      );

      // 拉动信号统计
      const [signalStats] = await (db as any).execute(
        `SELECT status, priority, COUNT(*) as count
         FROM production_pull_signals ${whereClause}
         GROUP BY status, priority`,
        params
      );

      // 自动验证统计
      const [autoVerifyStats] = await (db as any).execute(
        `SELECT auto_verified, COUNT(*) as count
         FROM gate_checklists ${whereClause}
         GROUP BY auto_verified`,
        params
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

  if (source === 'PROJECT_BUDGET_CHECK') {
    return {
      passed: random > 0.1,
      note: random > 0.1 ? '项目预算已分配，金额大于0，预算审批通过' : '项目预算未分配或金额为0，请确认预算信息'
    };
  } else if (source === 'PROJECT_PM_ASSIGNED') {
    return {
      passed: random > 0.1,
      note: random > 0.1 ? '项目经理已指派，PM信息已录入系统' : '项目经理尚未指派，请分配PM'
    };
  } else if (source === 'RISK_ASSESSMENT_EXISTS') {
    return {
      passed: random > 0.1,
      note: random > 0.1 ? '风险评估文档已存在，包含识别的风险条目' : '风险评估文档不存在或为空，请完成风险评估'
    };
  } else if (source === 'RACI_MATRIX_DEFINED') {
    return {
      passed: random > 0.1,
      note: random > 0.1 ? 'RACI矩阵已定义，角色与职责分配完整' : 'RACI矩阵未定义或角色分配不完整'
    };
  } else if (source === 'SCOPE_DOCUMENT_COMPLETE') {
    return {
      passed: random > 0.1,
      note: random > 0.1 ? '范围文档完整，包含项目边界、交付物及验收标准' : '范围文档不完整，缺少关键信息'
    };
  } else if (source === 'ERP_PO_Table') {
    return {
      passed: random > 0.3,
      note: random > 0.3 ? '已在ERP系统中找到对应PO记录' : 'ERP系统中未找到对应PO记录'
    };
  } else if (source === 'PLM_Drawing_Status') {
    return {
      passed: random > 0.2,
      note: random > 0.2 ? 'PLM系统显示图纸状态为"已发布"' : 'PLM系统显示图纸状态为"草稿"'
    };
  } else if (source === 'PLM_Model_Status') {
    return {
      passed: random > 0.2,
      note: random > 0.2 ? 'PLM系统3D模型状态为"已发布正式版"' : 'PLM系统3D模型仍为草稿状态'
    };
  } else if (source === 'ERP_BOM_Consistency') {
    return {
      passed: random > 0.25,
      note: random > 0.25 ? 'BOM与3D模型零件清单一致性校验通过' : 'BOM与3D模型存在不一致项，请核查'
    };
  } else if (source === 'ERP_Material_Validation') {
    return {
      passed: random > 0.2,
      note: random > 0.2 ? '所有物料编码与规格匹配验证通过' : '存在物料编码/规格不匹配项'
    };
  } else if (source === 'PLM_Document_Archive') {
    return {
      passed: random > 0.3,
      note: random > 0.3 ? 'PLM归档文件完整性检查通过' : '仿真报告尚未在PLM系统中归档'
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

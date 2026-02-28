/**
 * v1.7.2 薪酬审批工作流路由
 * Salary Approval Workflow Router
 */

import { z } from "zod";
import { requirePermission, router } from "../_core/trpc";

// All salary approval procedures require hrm_salary_detail permission
const salaryProcedure = requirePermission('hrm_salary_detail');
import {
  getApprovalWorkflows,
  getWorkflowById,
  createApprovalWorkflow,
  updateApprovalWorkflow,
  submitSalaryApproval,
  processApproval,
  cancelApproval,
  getApprovalRecords,
  getApprovalDetail,
  getApprovalStats,
  getPendingApprovalsForRole,
} from "./salaryApproval.service";

const workflowStepSchema = z.object({
  step: z.number(),
  role: z.string(),
  title: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
});

export const salaryApprovalRouter = router({
  // ========== 工作流定义 ==========
  
  /** 获取所有审批工作流 */
  getWorkflows: salaryProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getApprovalWorkflows(input?.activeOnly ?? true);
    }),

  /** 获取单个工作流详情 */
  getWorkflow: salaryProcedure
    .input(z.object({ workflowId: z.number() }))
    .query(async ({ input }) => {
      return getWorkflowById(input.workflowId);
    }),

  /** 创建审批工作流 */
  createWorkflow: salaryProcedure
    .input(z.object({
      workflowName: z.string().min(1).max(200),
      workflowCode: z.string().min(1).max(50),
      description: z.string().optional(),
      steps: z.array(workflowStepSchema).min(1),
      autoTrigger: z.boolean().optional(),
      triggerCondition: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createApprovalWorkflow({
        ...input,
        createdBy: ctx.user?.name || ctx.user?.openId,
      });
    }),

  /** 更新审批工作流 */
  updateWorkflow: salaryProcedure
    .input(z.object({
      workflowId: z.number(),
      workflowName: z.string().optional(),
      description: z.string().optional(),
      steps: z.array(workflowStepSchema).optional(),
      autoTrigger: z.boolean().optional(),
      triggerCondition: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { workflowId, ...params } = input;
      return updateApprovalWorkflow(workflowId, params);
    }),

  // ========== 审批操作 ==========

  /** 提交薪酬审批 */
  submit: salaryProcedure
    .input(z.object({
      workflowId: z.number(),
      bonusRecordId: z.number().optional(),
      batchTitle: z.string().min(1).max(200),
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
      totalAmount: z.number().min(0),
      workerCount: z.number().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      return submitSalaryApproval({
        ...input,
        submittedBy: ctx.user?.openId,
        submittedByName: ctx.user?.name,
      });
    }),

  /** 审批操作（批准/拒绝） */
  process: salaryProcedure
    .input(z.object({
      recordId: z.number(),
      action: z.enum(['approve', 'reject']),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return processApproval({
        recordId: input.recordId,
        action: input.action,
        approver: ctx.user?.openId || 'unknown',
        approverName: ctx.user?.name,
        comment: input.comment,
      });
    }),

  /** 取消审批 */
  cancel: salaryProcedure
    .input(z.object({
      recordId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return cancelApproval({
        recordId: input.recordId,
        cancelledBy: ctx.user?.openId || 'unknown',
        reason: input.reason,
      });
    }),

  // ========== 查询 ==========

  /** 获取审批记录列表 */
  getRecords: salaryProcedure
    .input(z.object({
      status: z.string().optional(),
      workflowId: z.number().optional(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
      limit: z.number().min(1).max(200).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      return getApprovalRecords(input || {});
    }),

  /** 获取审批详情 */
  getDetail: salaryProcedure
    .input(z.object({ recordId: z.number() }))
    .query(async ({ input }) => {
      return getApprovalDetail(input.recordId);
    }),

  /** 获取审批统计 */
  getStats: salaryProcedure
    .query(async () => {
      return getApprovalStats();
    }),

  /** 获取待审批记录（按角色） */
  getPending: salaryProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      return getPendingApprovalsForRole(input.role);
    }),
});

/**
 * 审批流程引擎API路由
 * 提供审批模板管理、审批实例操作、红蓝对抗配置等功能
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';

// ===== 审批模板管理 =====

const approvalTemplateSchema = z.object({
  templateCode: z.string().min(1).max(64),
  templateName: z.string().min(1).max(128),
  businessType: z.enum([
    'lead_assignment',
    'opportunity_proposal',
    'contract_signing',
    'purchase_order',
    'project_approval',
    'design_review',
    'production_release',
    'red_blue_config',
    'expense_claim',
    'leave_request',
    'other',
  ]),
  description: z.string().optional(),
  steps: z.array(z.object({
    stepNumber: z.number(),
    stepName: z.string(),
    approverRole: z.string(),
    approverType: z.enum(['user', 'role', 'department_head', 'supervisor', 'gm', 'auto']),
    conditions: z.any().optional(),
    timeoutHours: z.number().optional(),
  })),
  conditionRules: z.any().optional(),
  notificationConfig: z.any().optional(),
  defaultTimeoutHours: z.number().default(48),
  autoApproveOnTimeout: z.boolean().default(false),
  escalateOnTimeout: z.boolean().default(true),
});

// ===== 审批实例Schema =====

const approvalInstanceSchema = z.object({
  templateCode: z.string(),
  businessId: z.string(),
  businessTable: z.string(),
  businessTitle: z.string().optional(),
  summary: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default('CNY'),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
  })).optional(),
});

// ===== 红蓝对抗配置Schema =====

const redBlueConfigSchema = z.object({
  configName: z.string().min(1).max(128),
  projectId: z.number().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  customerTier: z.enum(['tier1', 'tier2', 'tier3', 'other']).default('other'),
  redTeamLeaderId: z.number().optional(),
  redTeamLeaderName: z.string().optional(),
  redTeamMembers: z.array(z.object({
    id: z.number(),
    name: z.string(),
    role: z.string().optional(),
  })).optional(),
  redTeamObjectives: z.string().optional(),
  redTeamScenarios: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
  })).optional(),
  blueTeamLeaderId: z.number().optional(),
  blueTeamLeaderName: z.string().optional(),
  blueTeamMembers: z.array(z.object({
    id: z.number(),
    name: z.string(),
    role: z.string().optional(),
  })).optional(),
  blueTeamObjectives: z.string().optional(),
  blueTeamResources: z.array(z.string()).optional(),
  schedule: z.array(z.object({
    phase: z.string(),
    name: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  evaluationCriteria: z.array(z.object({
    criterion: z.string(),
    weight: z.number(),
    description: z.string().optional(),
  })).optional(),
  triggerConditions: z.object({
    customerTier: z.boolean().optional(),
    projectComplexity: z.boolean().optional(),
    isNonStandard: z.boolean().optional(),
    isCrossRegional: z.boolean().optional(),
  }).optional(),
});

// ===== 模拟数据存储（后续替换为数据库） =====

let approvalTemplates: any[] = [
  {
    id: 1,
    templateCode: 'LEAD_ASSIGN_001',
    templateName: '线索分配审批',
    businessType: 'lead_assignment',
    description: '销售线索分配给销售代表的审批流程',
    steps: [
      { stepNumber: 1, stepName: '销售经理审批', approverRole: 'sales_manager', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 2, stepName: 'GM审批', approverRole: 'gm', approverType: 'gm', timeoutHours: 48 },
    ],
    defaultTimeoutHours: 48,
    isActive: true,
    version: '1.0',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    templateCode: 'OPP_PROPOSAL_001',
    templateName: '商机方案审批',
    businessType: 'opportunity_proposal',
    description: '商机技术方案的审批流程',
    steps: [
      { stepNumber: 1, stepName: '事业部部长审批', approverRole: 'dept_head', approverType: 'department_head', timeoutHours: 24 },
      { stepNumber: 2, stepName: 'GM审批', approverRole: 'gm', approverType: 'gm', timeoutHours: 48 },
    ],
    defaultTimeoutHours: 72,
    isActive: true,
    version: '1.0',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    templateCode: 'CONTRACT_SIGN_001',
    templateName: '合同签订审批',
    businessType: 'contract_signing',
    description: '合同签订前的技术协议确认审批',
    steps: [
      { stepNumber: 1, stepName: '技术确认', approverRole: 'tech_lead', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 2, stepName: '商务确认', approverRole: 'business_manager', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 3, stepName: 'GM审批', approverRole: 'gm', approverType: 'gm', timeoutHours: 48 },
    ],
    defaultTimeoutHours: 96,
    isActive: true,
    version: '1.0',
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    templateCode: 'PO_APPROVAL_001',
    templateName: '采购订单审批',
    businessType: 'purchase_order',
    description: '采购订单的多级审批流程',
    steps: [
      { stepNumber: 1, stepName: '部门负责人审批', approverRole: 'dept_head', approverType: 'department_head', timeoutHours: 24 },
      { stepNumber: 2, stepName: '采购经理审批', approverRole: 'purchase_manager', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 3, stepName: '财务审批', approverRole: 'finance', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 4, stepName: 'GM审批', approverRole: 'gm', approverType: 'gm', timeoutHours: 48, conditions: { amountThreshold: 100000 } },
    ],
    conditionRules: {
      amountThreshold: 100000,
      skipGMIfBelow: true,
    },
    defaultTimeoutHours: 120,
    isActive: true,
    version: '1.0',
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    templateCode: 'RED_BLUE_001',
    templateName: '红蓝对抗配置审批',
    businessType: 'red_blue_config',
    description: 'Tier1客户项目红蓝对抗配置审批',
    steps: [
      { stepNumber: 1, stepName: '项目经理确认', approverRole: 'project_manager', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 2, stepName: '质量经理审批', approverRole: 'quality_manager', approverType: 'role', timeoutHours: 24 },
      { stepNumber: 3, stepName: 'GM审批', approverRole: 'gm', approverType: 'gm', timeoutHours: 48 },
    ],
    defaultTimeoutHours: 96,
    isActive: true,
    version: '1.0',
    createdAt: new Date().toISOString(),
  },
];

let approvalInstances: any[] = [];
let approvalStepRecords: any[] = [];
let approvalActionLogs: any[] = [];
let redBlueConfigs: any[] = [];

let instanceIdCounter = 1;
let stepRecordIdCounter = 1;
let actionLogIdCounter = 1;
let redBlueConfigIdCounter = 1;

// 生成唯一编码
function generateCode(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const approvalRouter = router({
  // ===== 审批模板管理 =====
  
  // 获取所有审批模板
  getTemplates: publicProcedure
    .input(z.object({
      businessType: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...approvalTemplates];
      
      if (input?.businessType) {
        result = result.filter(t => t.businessType === input.businessType);
      }
      if (input?.isActive !== undefined) {
        result = result.filter(t => t.isActive === input.isActive);
      }
      
      return result;
    }),
  
  // 获取单个审批模板
  getTemplate: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      templateCode: z.string().optional(),
    }))
    .query(({ input }) => {
      const template = approvalTemplates.find(
        t => t.id === input.id || t.templateCode === input.templateCode
      );
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审批模板不存在' });
      }
      return template;
    }),
  
  // 创建审批模板
  createTemplate: protectedProcedure
    .input(approvalTemplateSchema)
    .mutation(({ input, ctx }) => {
      const existing = approvalTemplates.find(t => t.templateCode === input.templateCode);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: '模板编码已存在' });
      }
      
      const newTemplate = {
        id: approvalTemplates.length + 1,
        ...input,
        isActive: true,
        version: '1.0',
        createdBy: ctx.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      approvalTemplates.push(newTemplate);
      return newTemplate;
    }),
  
  // ===== 审批实例管理 =====
  
  // 获取审批实例列表
  getInstances: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'withdrawn', 'expired']).optional(),
      businessType: z.string().optional(),
      applicantId: z.number().optional(),
      currentApproverId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(({ input, ctx }) => {
      let result = [...approvalInstances];
      
      if (input?.status) {
        result = result.filter(i => i.status === input.status);
      }
      if (input?.businessType) {
        result = result.filter(i => i.businessType === input.businessType);
      }
      if (input?.applicantId) {
        result = result.filter(i => i.applicantId === input.applicantId);
      }
      if (input?.currentApproverId) {
        result = result.filter(i => i.currentApproverId === input.currentApproverId);
      }
      
      const total = result.length;
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const items = result.slice(start, start + pageSize);
      
      return { items, total, page, pageSize };
    }),
  
  // 获取我的待审批列表
  getMyPendingApprovals: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user?.id;
      return approvalInstances.filter(
        i => i.currentApproverId === userId && ['pending', 'in_progress'].includes(i.status)
      );
    }),
  
  // 获取我发起的审批
  getMySubmittedApprovals: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user?.id;
      return approvalInstances.filter(i => i.applicantId === userId);
    }),
  
  // 创建审批实例（提交审批）
  submitApproval: protectedProcedure
    .input(approvalInstanceSchema)
    .mutation(({ input, ctx }) => {
      const template = approvalTemplates.find(t => t.templateCode === input.templateCode);
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审批模板不存在' });
      }
      
      const instanceCode = generateCode('APR');
      const newInstance = {
        id: instanceIdCounter++,
        instanceCode,
        templateId: template.id,
        templateCode: template.templateCode,
        businessType: template.businessType,
        businessId: input.businessId,
        businessTable: input.businessTable,
        businessTitle: input.businessTitle,
        applicantId: ctx.user?.id,
        applicantName: ctx.user?.name || '未知用户',
        applicantDepartment: '',
        summary: input.summary,
        amount: input.amount,
        currency: input.currency,
        urgency: input.urgency,
        status: 'pending',
        currentStep: 1,
        totalSteps: template.steps.length,
        currentApproverId: null, // 将根据第一步配置设置
        currentApproverName: null,
        attachments: input.attachments,
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      approvalInstances.push(newInstance);
      
      // 创建第一步审批记录
      const firstStep = template.steps[0];
      const stepRecord = {
        id: stepRecordIdCounter++,
        instanceId: newInstance.id,
        instanceCode,
        stepNumber: 1,
        stepName: firstStep.stepName,
        approverRole: firstStep.approverRole,
        approverType: firstStep.approverType,
        status: 'pending',
        assignedAt: new Date().toISOString(),
      };
      approvalStepRecords.push(stepRecord);
      
      // 记录操作日志
      const actionLog = {
        id: actionLogIdCounter++,
        instanceId: newInstance.id,
        action: 'submit',
        operatorId: ctx.user?.id,
        operatorName: ctx.user?.name || '未知用户',
        previousStatus: null,
        newStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      approvalActionLogs.push(actionLog);
      
      return newInstance;
    }),
  
  // 审批操作（批准/拒绝）
  processApproval: protectedProcedure
    .input(z.object({
      instanceId: z.number(),
      action: z.enum(['approve', 'reject', 'return']),
      comment: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const instance = approvalInstances.find(i => i.id === input.instanceId);
      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审批实例不存在' });
      }
      
      const template = approvalTemplates.find(t => t.id === instance.templateId);
      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审批模板不存在' });
      }
      
      // 更新当前步骤记录
      const currentStepRecord = approvalStepRecords.find(
        s => s.instanceId === instance.id && s.stepNumber === instance.currentStep && s.status === 'pending'
      );
      
      if (currentStepRecord) {
        currentStepRecord.status = input.action === 'approve' ? 'approved' : 'rejected';
        currentStepRecord.action = input.action;
        currentStepRecord.comment = input.comment;
        currentStepRecord.approverId = ctx.user?.id;
        currentStepRecord.approverName = ctx.user?.name;
        currentStepRecord.completedAt = new Date().toISOString();
      }
      
      const previousStatus = instance.status;
      
      if (input.action === 'approve') {
        // 检查是否还有下一步
        if (instance.currentStep < instance.totalSteps) {
          // 进入下一步
          instance.currentStep += 1;
          instance.status = 'in_progress';
          
          // 创建下一步审批记录
          const nextStep = template.steps[instance.currentStep - 1];
          const nextStepRecord = {
            id: stepRecordIdCounter++,
            instanceId: instance.id,
            instanceCode: instance.instanceCode,
            stepNumber: instance.currentStep,
            stepName: nextStep.stepName,
            approverRole: nextStep.approverRole,
            approverType: nextStep.approverType,
            status: 'pending',
            assignedAt: new Date().toISOString(),
          };
          approvalStepRecords.push(nextStepRecord);
        } else {
          // 审批完成
          instance.status = 'approved';
          instance.finalResult = 'approved';
          instance.completedAt = new Date().toISOString();
        }
      } else if (input.action === 'reject') {
        instance.status = 'rejected';
        instance.finalResult = 'rejected';
        instance.finalComment = input.comment;
        instance.completedAt = new Date().toISOString();
      } else if (input.action === 'return') {
        // 退回到上一步
        if (instance.currentStep > 1) {
          instance.currentStep -= 1;
          instance.status = 'in_progress';
        } else {
          instance.status = 'draft';
        }
      }
      
      instance.updatedAt = new Date().toISOString();
      
      // 记录操作日志
      const actionLog = {
        id: actionLogIdCounter++,
        instanceId: instance.id,
        stepRecordId: currentStepRecord?.id,
        action: input.action,
        operatorId: ctx.user?.id,
        operatorName: ctx.user?.name || '未知用户',
        previousStatus,
        newStatus: instance.status,
        comment: input.comment,
        createdAt: new Date().toISOString(),
      };
      approvalActionLogs.push(actionLog);
      
      return instance;
    }),
  
  // 撤回审批
  withdrawApproval: protectedProcedure
    .input(z.object({
      instanceId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      const instance = approvalInstances.find(i => i.id === input.instanceId);
      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审批实例不存在' });
      }
      
      if (instance.applicantId !== ctx.user?.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '只能撤回自己发起的审批' });
      }
      
      if (!['pending', 'in_progress'].includes(instance.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '当前状态不允许撤回' });
      }
      
      const previousStatus = instance.status;
      instance.status = 'withdrawn';
      instance.updatedAt = new Date().toISOString();
      
      // 记录操作日志
      const actionLog = {
        id: actionLogIdCounter++,
        instanceId: instance.id,
        action: 'withdraw',
        operatorId: ctx.user?.id,
        operatorName: ctx.user?.name || '未知用户',
        previousStatus,
        newStatus: 'withdrawn',
        comment: input.reason,
        createdAt: new Date().toISOString(),
      };
      approvalActionLogs.push(actionLog);
      
      return instance;
    }),
  
  // 获取审批历史
  getApprovalHistory: publicProcedure
    .input(z.object({
      instanceId: z.number(),
    }))
    .query(({ input }) => {
      const steps = approvalStepRecords.filter(s => s.instanceId === input.instanceId);
      const logs = approvalActionLogs.filter(l => l.instanceId === input.instanceId);
      
      return { steps, logs };
    }),
  
  // ===== 红蓝对抗配置管理 =====
  
  // 获取红蓝对抗配置列表
  getRedBlueConfigs: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled']).optional(),
      projectId: z.number().optional(),
      customerId: z.number().optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...redBlueConfigs];
      
      if (input?.status) {
        result = result.filter(c => c.status === input.status);
      }
      if (input?.projectId) {
        result = result.filter(c => c.projectId === input.projectId);
      }
      if (input?.customerId) {
        result = result.filter(c => c.customerId === input.customerId);
      }
      
      return result;
    }),
  
  // 获取单个红蓝对抗配置
  getRedBlueConfig: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      configCode: z.string().optional(),
    }))
    .query(({ input }) => {
      const config = redBlueConfigs.find(
        c => c.id === input.id || c.configCode === input.configCode
      );
      if (!config) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '红蓝对抗配置不存在' });
      }
      return config;
    }),
  
  // 创建红蓝对抗配置
  createRedBlueConfig: protectedProcedure
    .input(redBlueConfigSchema)
    .mutation(({ input, ctx }) => {
      const configCode = generateCode('RB');
      
      const newConfig = {
        id: redBlueConfigIdCounter++,
        configCode,
        ...input,
        status: 'draft',
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      redBlueConfigs.push(newConfig);
      return newConfig;
    }),
  
  // 更新红蓝对抗配置
  updateRedBlueConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      ...redBlueConfigSchema.shape,
    }))
    .mutation(({ input, ctx }) => {
      const index = redBlueConfigs.findIndex(c => c.id === input.id);
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '红蓝对抗配置不存在' });
      }
      
      const config = redBlueConfigs[index];
      if (!['draft', 'pending_approval'].includes(config.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '当前状态不允许修改' });
      }
      
      redBlueConfigs[index] = {
        ...config,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      
      return redBlueConfigs[index];
    }),
  
  // 提交红蓝对抗配置审批
  submitRedBlueConfigForApproval: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(({ input, ctx }) => {
      const config = redBlueConfigs.find(c => c.id === input.id);
      if (!config) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '红蓝对抗配置不存在' });
      }
      
      if (config.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '只有草稿状态可以提交审批' });
      }
      
      config.status = 'pending_approval';
      config.updatedAt = new Date().toISOString();
      
      return config;
    }),
  
  // 删除红蓝对抗配置
  deleteRedBlueConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(({ input, ctx }) => {
      const index = redBlueConfigs.findIndex(c => c.id === input.id);
      if (index === -1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '红蓝对抗配置不存在' });
      }
      
      const config = redBlueConfigs[index];
      if (!['draft', 'cancelled'].includes(config.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '当前状态不允许删除' });
      }
      
      redBlueConfigs.splice(index, 1);
      return { success: true };
    }),
  
  // ===== 统计信息 =====
  
  // 获取审批统计
  getApprovalStats: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user?.id;
      
      return {
        pendingCount: approvalInstances.filter(
          i => i.currentApproverId === userId && ['pending', 'in_progress'].includes(i.status)
        ).length,
        submittedCount: approvalInstances.filter(i => i.applicantId === userId).length,
        approvedCount: approvalInstances.filter(
          i => i.applicantId === userId && i.status === 'approved'
        ).length,
        rejectedCount: approvalInstances.filter(
          i => i.applicantId === userId && i.status === 'rejected'
        ).length,
        redBlueConfigCount: redBlueConfigs.length,
        activeRedBlueCount: redBlueConfigs.filter(
          c => ['approved', 'in_progress'].includes(c.status)
        ).length,
      };
    }),
});

export type ApprovalRouter = typeof approvalRouter;

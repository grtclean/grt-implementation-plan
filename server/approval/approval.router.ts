/**
 * GRT 5.0 审批流程路由
 * 整合通用审批流程引擎，支持多种业务类型审批
 */

import { z } from "zod";
import {router, adminProcedure, protectedProcedure, requirePermission} from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// ===== 审批模板Schema =====
const ApprovalProcessSchema = z.object({
  processName: z.string().min(1),
  documentType: z.enum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'lead_assignment', 'opportunity_proposal', 'contract_signing', 'project_approval', 'design_review', 'production_release', 'red_blue_config', 'other']),
  approvalLevels: z.number().min(1).max(5),
  levelDefinition: z.string(), // JSON string
  description: z.string().optional(),
});

const ApprovalActionSchema = z.object({
  taskId: z.number(),
  action: z.enum(['approved', 'rejected', 'returned']),
  comments: z.string().optional(),
  actionReason: z.string().optional(),
});

// ===== 红蓝对抗配置Schema =====
const RedBlueConfigSchema = z.object({
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

// ===== 模拟数据存储 =====

// 审批模板数据
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

// 审批实例数据
let approvalInstances: any[] = [];
let approvalStepRecords: any[] = [];
let approvalActionLogs: any[] = [];

// 红蓝对抗配置数据
let redBlueConfigs: any[] = [];

// ID计数器
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
  // ===== 原有审批流程API =====
  
  /**
   * 创建审批流程
   */
  createApprovalProcess: adminProcedure
    .input(ApprovalProcessSchema)
    .mutation(async ({ input, ctx }) => {
      const processCode = `AP-${Date.now()}`;
      return {
        id: Math.floor(Math.random() * 10000),
        processCode,
        ...input,
        isActive: true,
        version: 1,
        createdBy: ctx.user?.id,
        createdAt: new Date(),
      };
    }),

  /**
   * 获取审批流程列表
   */
  getApprovalProcesses: protectedProcedure
    .input(z.object({
      documentType: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async () => {
      return {
        items: [],
        total: 0,
      };
    }),

  /**
   * 获取待审批任务
   */
  getPendingTasks: protectedProcedure
    .input(z.object({
      documentType: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 获取我的审批任务
   */
  getMyApprovalTasks: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * 批准审批任务
   */
  approveTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      return {
        taskId: input.taskId,
        action: 'approved',
        approvedBy: ctx.user?.id,
        approvedAt: new Date(),
        message: '审批已通过',
      };
    }),

  /**
   * 拒绝审批任务
   */
  rejectTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      return {
        taskId: input.taskId,
        action: 'rejected',
        rejectedBy: ctx.user?.id,
        rejectedAt: new Date(),
        reason: input.actionReason,
        message: '审批已拒绝',
      };
    }),

  /**
   * 退回审批任务
   */
  returnTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      return {
        taskId: input.taskId,
        action: 'returned',
        returnedBy: ctx.user?.id,
        returnedAt: new Date(),
        reason: input.actionReason,
        message: '审批已退回',
      };
    }),

  /**
   * 获取审批历史
   */
  getApprovalHistory: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      documentType: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        items: [],
        total: 0,
      };
    }),

  /**
   * 获取审批权限
   */
  getApprovalPermissions: protectedProcedure
    .input(z.object({
      roleId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        permissions: [],
      };
    }),

  /**
   * 设置审批权限
   */
  setApprovalPermissions: adminProcedure
    .input(z.object({
      roleId: z.number(),
      documentType: z.string(),
      approvalLevel: z.number(),
      maxApprovalAmount: z.number().optional(),
      scope: z.enum(['self', 'department', 'company']),
    }))
    .mutation(async ({ input }) => {
      return {
        roleId: input.roleId,
        ...input,
        createdAt: new Date(),
      };
    }),

  /**
   * 获取审批统计
   */
  getApprovalStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    
    return {
      pendingTasksCount: approvalInstances.filter(
        i => i.currentApproverId === userId && ['pending', 'in_progress'].includes(i.status)
      ).length,
      overdueTasksCount: 0,
      averageApprovalTime: 0,
      rejectionRate: 0,
      approverCount: 0,
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

  /**
   * 获取审批规则
   */
  getApprovalRules: protectedProcedure
    .input(z.object({
      documentType: z.string().optional(),
    }))
    .query(async () => {
      return {
        rules: [],
      };
    }),

  /**
   * 创建审批规则
   */
  createApprovalRule: adminProcedure
    .input(z.object({
      ruleName: z.string(),
      documentType: z.string(),
      condition: z.string(), // JSON string
      action: z.string(), // JSON string
      priority: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ruleCode = `RULE-${Date.now()}`;
      return {
        id: Math.floor(Math.random() * 10000),
        ruleCode,
        ...input,
        isActive: true,
        createdBy: ctx.user?.id,
        createdAt: new Date(),
      };
    }),

  /**
   * 委托审批权限
   */
  delegateApprovalAuthority: requirePermission('oa:forms:manage')
    .input(z.object({
      delegatedTo: z.number(),
      documentTypes: z.array(z.string()),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const delegationCode = `DEL-${Date.now()}`;
      return {
        id: Math.floor(Math.random() * 10000),
        delegationCode,
        delegatedFrom: ctx.user?.id,
        ...input,
        status: 'active',
        createdAt: new Date(),
      };
    }),

  /**
   * 获取我的委托记录
   */
  getMyDelegations: protectedProcedure.query(async ({ ctx }) => {
    return {
      delegations: [],
    };
  }),

  /**
   * 获取审批流程进度
   */
  getApprovalProgress: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      documentType: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        currentLevel: 0,
        totalLevels: 0,
        progress: 0,
        steps: [],
      };
    }),

  /**
   * 批量审批
   */
  batchApprove: adminProcedure
    .input(z.object({
      taskIds: z.array(z.number()),
      action: z.enum(['approved', 'rejected']),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        processedCount: input.taskIds.length,
        action: input.action,
        processedAt: new Date(),
        message: `已${input.action === 'approved' ? '批准' : '拒绝'} ${input.taskIds.length} 个审批任务`,
      };
    }),

  /**
   * 生成审批报表
   */
  generateApprovalReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      documentType: z.string().optional(),
      format: z.enum(['csv', 'excel', 'pdf']).default('excel'),
    }))
    .query(async () => {
      return {
        downloadUrl: '/api/approval/report',
        fileName: `approval-report-${new Date().toISOString()}.xlsx`,
        format: 'excel',
      };
    }),

  // ===== 通用审批流程引擎API =====
  
  /**
   * 获取所有审批模板
   */
  getTemplates: protectedProcedure
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
  
  /**
   * 获取单个审批模板
   */
  getTemplate: protectedProcedure
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
  
  /**
   * 获取审批实例列表
   */
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
  
  /**
   * 获取我的待审批列表
   */
  getMyPendingApprovals: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user?.id;
      return approvalInstances.filter(
        i => i.currentApproverId === userId && ['pending', 'in_progress'].includes(i.status)
      );
    }),
  
  /**
   * 获取我发起的审批
   */
  getMySubmittedApprovals: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user?.id;
      return approvalInstances.filter(i => i.applicantId === userId);
    }),
  
  /**
   * 提交审批
   */
  submitApproval: protectedProcedure
    .input(z.object({
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
    }))
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
        currentApproverId: null,
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
  
  /**
   * 处理审批（批准/拒绝/退回）
   */
  processApproval: requirePermission('oa:forms:manage')
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
        if (instance.currentStep < instance.totalSteps) {
          instance.currentStep += 1;
          instance.status = 'in_progress';
          
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
        if (instance.currentStep > 1) {
          instance.currentStep -= 1;
          instance.status = 'in_progress';
        } else {
          instance.status = 'draft';
        }
      }
      
      instance.updatedAt = new Date().toISOString();
      
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
  
  /**
   * 撤回审批
   */
  withdrawApproval: requirePermission('oa:forms:manage')
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
  
  /**
   * 获取审批实例历史
   */
  getInstanceHistory: protectedProcedure
    .input(z.object({
      instanceId: z.number(),
    }))
    .query(({ input }) => {
      const steps = approvalStepRecords.filter(s => s.instanceId === input.instanceId);
      const logs = approvalActionLogs.filter(l => l.instanceId === input.instanceId);
      
      return { steps, logs };
    }),
  
  // ===== 红蓝对抗配置API =====
  
  /**
   * 获取红蓝对抗配置列表
   */
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
  
  /**
   * 获取单个红蓝对抗配置
   */
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
  
  /**
   * 创建红蓝对抗配置
   */
  createRedBlueConfig: requirePermission('oa:forms:manage')
    .input(RedBlueConfigSchema)
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
  
  /**
   * 更新红蓝对抗配置
   */
  updateRedBlueConfig: requirePermission('oa:forms:manage')
    .input(z.object({
      id: z.number(),
    }).merge(RedBlueConfigSchema))
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
  
  /**
   * 提交红蓝对抗配置审批
   */
  submitRedBlueConfigForApproval: requirePermission('oa:forms:manage')
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
  
  /**
   * 删除红蓝对抗配置
   */
  deleteRedBlueConfig: requirePermission('oa:forms:manage')
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
});

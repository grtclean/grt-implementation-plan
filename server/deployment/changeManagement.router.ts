/**
 * GRT智能系统 - 变更管理路由
 * 
 * 提供变更申请、审批、执行的API端点
 */

import { z } from 'zod';
import {router, protectedProcedure, requirePermission} from '../_core/trpc';
import { 
  changeManagementService,
  type ChangeType,
  type Urgency,
  type ApplicantRole,
  type Environment,
  type ChangeStatus
} from './changeManagement.service';
import {
  getEnvironmentConfigs,
  setEnvironmentConfig,
  deleteEnvironmentConfig,
  getEnvironmentComparison,
  syncTestToProduction,
  importEnvironmentConfigs,
  exportEnvironmentConfigs,
} from './environmentConfig.service';
import {
  generateDeploymentPackageFiles,
  generateDeploymentPackageZipContent,
} from './deployment-package.service';

// ===== 输入验证Schema =====

const createChangeRequestSchema = z.object({
  title: z.string().min(5, '标题至少5个字符').max(200),
  changeType: z.enum(['feature', 'bugfix', 'performance', 'security', 'config', 'database', 'infrastructure']),
  urgency: z.enum(['normal', 'urgent', 'critical']).default('normal'),
  description: z.string().min(20, '描述至少20个字符'),
  technicalPlan: z.string().min(20, '技术方案至少20个字符'),
  impactAnalysis: z.string().min(10, '影响分析至少10个字符'),
  rollbackPlan: z.string().min(10, '回滚方案至少10个字符'),
  testPlan: z.string().min(10, '测试计划至少10个字符'),
  affectedModules: z.array(z.string()).min(1, '至少选择一个影响模块'),
  expectedFiles: z.array(z.string()).min(1, '至少声明一个预计修改的文件'),
  expectedSql: z.array(z.string()).optional(),
  expectedCommands: z.array(z.string()).optional(),
  plannedStartTime: z.string().optional(),
  plannedEndTime: z.string().optional(),
  targetEnvironment: z.enum(['test', 'production', 'both']).default('test'),
});

const reviewRequestSchema = z.object({
  requestId: z.number(),
  approved: z.boolean(),
  comment: z.string().min(5, '审核意见至少5个字符'),
});

const approveRequestSchema = z.object({
  requestId: z.number(),
  approved: z.boolean(),
  comment: z.string().min(5, '审批意见至少5个字符'),
});

const startExecutionSchema = z.object({
  requestId: z.number(),
  tokenId: z.string(),
  environment: z.enum(['test', 'production']),
});

const recordChangeSchema = z.object({
  executionId: z.number(),
  type: z.enum(['file', 'sql', 'command']),
  value: z.string(),
});

const completeExecutionSchema = z.object({
  executionId: z.number(),
  success: z.boolean(),
  summary: z.string().optional(),
});

const rollbackExecutionSchema = z.object({
  executionId: z.number(),
  reason: z.string().min(5, '回滚原因至少5个字符'),
});

const deployToProductionSchema = z.object({
  requestId: z.number(),
});

const listRequestsSchema = z.object({
  status: z.enum(['draft', 'submitted', 'reviewing', 'approved', 'rejected', 
                  'executing', 'testing', 'verified', 'deployed', 'rolled_back', 'cancelled']).optional(),
  changeType: z.enum(['feature', 'bugfix', 'performance', 'security', 'config', 'database', 'infrastructure']).optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

// ===== 变更管理路由 =====

export const changeManagementRouter = router({
  // ===== 变更申请 =====
  
  /**
   * 创建变更申请
   */
  createRequest: requirePermission('strategy:change:manage')
    .input(createChangeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      const request = changeManagementService.createChangeRequest({
        ...input,
        applicantId: user!.id,
        applicantName: user!.name || user!.openId,
        applicantRole: (user!.role === 'admin' ? 'admin' : 'developer') as ApplicantRole,
        plannedStartTime: input.plannedStartTime ? new Date(input.plannedStartTime) : undefined,
        plannedEndTime: input.plannedEndTime ? new Date(input.plannedEndTime) : undefined,
      });
      
      return {
        success: true,
        data: request,
        message: `变更申请 ${request.requestNo} 创建成功`,
      };
    }),
  
  /**
   * 获取变更申请详情
   */
  getRequest: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const request = changeManagementService.getChangeRequest(input.id);
      if (!request) {
        return { success: false, error: '变更申请不存在' };
      }
      return { success: true, data: request };
    }),
  
  /**
   * 获取变更申请列表
   */
  listRequests: protectedProcedure
    .input(listRequestsSchema)
    .query(async ({ ctx, input }) => {
      const requests = changeManagementService.listChangeRequests({
        status: input.status as ChangeStatus | undefined,
        changeType: input.changeType as ChangeType | undefined,
      });
      
      // 分页
      const start = (input.page - 1) * input.pageSize;
      const end = start + input.pageSize;
      const paginatedRequests = requests.slice(start, end);
      
      return {
        success: true,
        data: paginatedRequests,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: requests.length,
          totalPages: Math.ceil(requests.length / input.pageSize),
        },
      };
    }),
  
  /**
   * 提交变更申请
   */
  submitRequest: requirePermission('strategy:change:manage')
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const request = changeManagementService.submitChangeRequest(input.requestId);
        if (!request) {
          return { success: false, error: '无法提交申请，请检查申请状态' };
        }
        return {
          success: true,
          data: request,
          message: '变更申请已提交，等待技术审核',
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
  
  /**
   * 更新变更申请
   */
  updateRequest: requirePermission('strategy:change:manage')
    .input(z.object({
      id: z.number(),
      data: createChangeRequestSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = changeManagementService.getChangeRequest(input.id);
      if (!request) {
        return { success: false, error: '变更申请不存在' };
      }
      
      if (request.status !== 'draft') {
        return { success: false, error: '只能修改草稿状态的申请' };
      }
      
      if (request.applicantId !== ctx.user!.id && ctx.user!.role !== 'admin') {
        return { success: false, error: '无权修改此申请' };
      }
      
      // 更新申请（实际应更新数据库）
      Object.assign(request, input.data);
      
      return { success: true, data: request, message: '申请已更新' };
    }),
  
  // ===== 审批流程 =====
  
  /**
   * 技术审核
   */
  reviewRequest: requirePermission('strategy:change:manage')
    .input(reviewRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // 检查权限（需要是技术负责人或管理员）
      if (user!.role !== 'admin') {
        return { success: false, error: '无技术审核权限' };
      }
      
      const result = changeManagementService.reviewChangeRequest(
        input.requestId,
        user!.id,
        user!.name || user!.openId,
        input.approved,
        input.comment
      );
      
      if (!result) {
        return { success: false, error: '无法审核此申请，请检查申请状态' };
      }
      
      return {
        success: true,
        data: result,
        message: input.approved ? '技术审核通过，等待管理员审批' : '技术审核未通过',
      };
    }),
  
  /**
   * 管理员审批
   */
  approveRequest: requirePermission('strategy:change:manage')
    .input(approveRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // 检查权限
      if (user!.role !== 'admin') {
        return { success: false, error: '无审批权限' };
      }
      
      const result = changeManagementService.approveChangeRequest(
        input.requestId,
        user!.id,
        user!.name || user!.openId,
        input.approved,
        input.comment
      );
      
      if (!result) {
        return { success: false, error: '无法审批此申请，请检查申请状态' };
      }
      
      if (input.approved && result.token) {
        return {
          success: true,
          data: {
            request: result.request,
            executionToken: result.token.tokenId,
            tokenExpiresAt: result.token.validUntil,
          },
          message: '审批通过，已生成执行令牌（24小时有效）',
        };
      }
      
      return {
        success: true,
        data: { request: result.request },
        message: input.approved ? '审批通过' : '审批未通过',
      };
    }),
  
  // ===== 执行管理 =====
  
  /**
   * 开始执行变更
   */
  startExecution: requirePermission('strategy:change:manage')
    .input(startExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const execution = changeManagementService.startExecution(
          input.requestId,
          input.tokenId,
          input.environment,
          ctx.user!.id,
          ctx.user!.name || ctx.user!.openId
        );
        
        if (!execution) {
          return { success: false, error: '无法开始执行' };
        }
        
        return {
          success: true,
          data: execution,
          message: `变更执行已开始，执行ID: ${execution.id}`,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
  
  /**
   * 记录变更
   */
  recordChange: requirePermission('strategy:change:manage')
    .input(recordChangeSchema)
    .mutation(async ({ input }) => {
      switch (input.type) {
        case 'file':
          changeManagementService.recordFileChange(input.executionId, input.value);
          break;
        case 'sql':
          changeManagementService.recordSqlExecution(input.executionId, input.value);
          break;
        case 'command':
          changeManagementService.recordCommandExecution(input.executionId, input.value);
          break;
      }
      
      return { success: true, message: '变更已记录' };
    }),
  
  /**
   * 执行一致性检查
   */
  checkConsistency: requirePermission('strategy:change:manage')
    .input(z.object({ executionId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const checks = changeManagementService.performConsistencyCheck(input.executionId);
        const execution = changeManagementService.getExecution(input.executionId);
        
        return {
          success: true,
          data: {
            checks,
            overallResult: execution?.consistencyCheckResult,
          },
          message: execution?.consistencyCheckResult === 'passed' 
            ? '一致性检查通过' 
            : execution?.consistencyCheckResult === 'warning'
              ? '一致性检查有警告，需要人工确认'
              : '一致性检查失败，执行被阻断',
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
  
  /**
   * 完成执行
   */
  completeExecution: requirePermission('strategy:change:manage')
    .input(completeExecutionSchema)
    .mutation(async ({ input }) => {
      const execution = changeManagementService.completeExecution(
        input.executionId,
        input.success,
        input.summary
      );
      
      if (!execution) {
        return { success: false, error: '执行记录不存在' };
      }
      
      if (execution.status === 'blocked') {
        return {
          success: false,
          data: execution,
          error: '一致性检查失败，执行被阻断。请检查实际执行内容与申请内容是否一致。',
        };
      }
      
      return {
        success: true,
        data: execution,
        message: execution.status === 'completed' 
          ? '执行完成，一致性检查通过' 
          : '执行失败',
      };
    }),
  
  /**
   * 回滚执行
   */
  rollbackExecution: requirePermission('strategy:change:manage')
    .input(rollbackExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      // 检查权限
      if (ctx.user!.role !== 'admin') {
        return { success: false, error: '无回滚权限' };
      }
      
      const execution = changeManagementService.rollbackExecution(
        input.executionId,
        input.reason
      );
      
      if (!execution) {
        return { success: false, error: '执行记录不存在' };
      }
      
      return {
        success: true,
        data: execution,
        message: '执行已回滚',
      };
    }),
  
  /**
   * 获取执行记录
   */
  getExecution: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const execution = changeManagementService.getExecution(input.id);
      if (!execution) {
        return { success: false, error: '执行记录不存在' };
      }
      return { success: true, data: execution };
    }),
  
  /**
   * 获取申请的执行记录列表
   */
  listExecutions: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const executions = changeManagementService.listExecutions(input.requestId);
      return { success: true, data: executions };
    }),
  
  // ===== 部署管理 =====
  
  /**
   * 部署到正式环境
   */
  deployToProduction: requirePermission('strategy:change:manage')
    .input(deployToProductionSchema)
    .mutation(async ({ ctx, input }) => {
      // 检查权限
      if (ctx.user!.role !== 'admin') {
        return { success: false, error: '无部署权限' };
      }
      
      try {
        const success = changeManagementService.deployToProduction(
          input.requestId,
          ctx.user!.id,
          ctx.user!.name || ctx.user!.openId
        );
        
        return {
          success: true,
          message: '已成功部署到正式环境',
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
  
  /**
   * 验证执行令牌
   */
  validateToken: protectedProcedure
    .input(z.object({ tokenId: z.string() }))
    .query(async ({ input }) => {
      const result = changeManagementService.validateExecutionToken(input.tokenId);
      return {
        success: result.valid,
        data: result.token ? {
          tokenId: result.token.tokenId,
          changeRequestId: result.token.changeRequestId,
          validUntil: result.token.validUntil,
          status: result.token.status,
          scope: result.token.scope,
        } : undefined,
        error: result.reason,
      };
    }),
  
  // ===== 统计信息 =====
  
  /**
   * 获取变更管理统计
   */
  getStatistics: protectedProcedure
    .query(async () => {
      const allRequests = changeManagementService.listChangeRequests();
      
      const stats = {
        total: allRequests.length,
        byStatus: {
          draft: allRequests.filter(r => r.status === 'draft').length,
          submitted: allRequests.filter(r => r.status === 'submitted').length,
          reviewing: allRequests.filter(r => r.status === 'reviewing').length,
          approved: allRequests.filter(r => r.status === 'approved').length,
          rejected: allRequests.filter(r => r.status === 'rejected').length,
          executing: allRequests.filter(r => r.status === 'executing').length,
          testing: allRequests.filter(r => r.status === 'testing').length,
          verified: allRequests.filter(r => r.status === 'verified').length,
          deployed: allRequests.filter(r => r.status === 'deployed').length,
          rolledBack: allRequests.filter(r => r.status === 'rolled_back').length,
        },
        byType: {
          feature: allRequests.filter(r => r.changeType === 'feature').length,
          bugfix: allRequests.filter(r => r.changeType === 'bugfix').length,
          performance: allRequests.filter(r => r.changeType === 'performance').length,
          security: allRequests.filter(r => r.changeType === 'security').length,
          config: allRequests.filter(r => r.changeType === 'config').length,
          database: allRequests.filter(r => r.changeType === 'database').length,
          infrastructure: allRequests.filter(r => r.changeType === 'infrastructure').length,
        },
        byUrgency: {
          normal: allRequests.filter(r => r.urgency === 'normal').length,
          urgent: allRequests.filter(r => r.urgency === 'urgent').length,
          critical: allRequests.filter(r => r.urgency === 'critical').length,
        },
      };
      
      return { success: true, data: stats };
    }),

  // ===== 环境配置管理 =====

  /**
   * 获取指定环境的配置
   */
  getEnvironmentConfigs: protectedProcedure
    .input(z.object({
      environment: z.enum(['test', 'production']),
    }))
    .query(async ({ input }) => {
      const configs = await getEnvironmentConfigs(input.environment);
      return { success: true, data: configs };
    }),

  /**
   * 设置环境配置
   */
  setEnvironmentConfig: requirePermission('strategy:change:manage')
    .input(z.object({
      environment: z.enum(['test', 'production']),
      key: z.string().min(1),
      value: z.string(),
      description: z.string().optional(),
      isSecret: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const result = await setEnvironmentConfig(
        input.environment,
        input.key,
        input.value,
        input.description,
        input.isSecret
      );
      return { success: result };
    }),

  /**
   * 删除环境配置
   */
  deleteEnvironmentConfig: requirePermission('strategy:change:manage')
    .input(z.object({
      environment: z.enum(['test', 'production']),
      key: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const result = await deleteEnvironmentConfig(input.environment, input.key);
      return { success: result };
    }),

  /**
   * 获取双环境对比
   */
  getEnvironmentComparison: protectedProcedure
    .query(async () => {
      const comparison = await getEnvironmentComparison();
      return { success: true, data: comparison };
    }),

  /**
   * 同步测试环境到正式环境
   */
  syncTestToProduction: requirePermission('strategy:change:manage')
    .input(z.object({
      configKeys: z.array(z.string()).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const result = await syncTestToProduction(input?.configKeys);
      return result;
    }),

  /**
   * 导出环境配置
   */
  exportEnvironmentConfigs: protectedProcedure
    .input(z.object({
      environment: z.enum(['test', 'production']),
      includeSecrets: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const exportData = await exportEnvironmentConfigs(input.environment, input.includeSecrets);
      return { success: true, data: exportData };
    }),

  /**
   * 导入环境配置
   */
  importEnvironmentConfigs: protectedProcedure
    .input(z.object({
      environment: z.enum(['test', 'production']),
      configs: z.array(z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
        isSecret: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const result = await importEnvironmentConfigs(input.environment, input.configs);
      return result;
    }),

  // ===== 部署包管理 =====

  /**
   * 获取部署包文件列表
   */
  getDeploymentPackageFiles: protectedProcedure
    .query(async () => {
      const files = generateDeploymentPackageFiles();
      return {
        success: true,
        data: files,
      };
    }),

  /**
   * 下载部署包（返回JSON格式的文件内容，前端生成ZIP）
   */
  downloadDeploymentPackage: protectedProcedure
    .query(async () => {
      const packageContent = generateDeploymentPackageZipContent();
      return {
        success: true,
        data: JSON.parse(packageContent),
      };
    }),
});

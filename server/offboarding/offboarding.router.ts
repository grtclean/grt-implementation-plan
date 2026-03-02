/**
 * 员工离职数据管理路由 (Offboarding Router)
 * tRPC路由定义，提供离职管理的所有API端点
 */

import { z } from "zod";
import { jsonValue } from "@shared/validators";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  createOffboarding,
  listOffboardings,
  getOffboardingDetail,
  updateOffboarding,
  submitOffboarding,
  addHandoverItem,
  batchAddHandoverItems,
  updateHandoverItemStatus,
  getHandoverItems,
  addPerformanceAttribution,
  confirmPerformanceAttribution,
  autoAnnotatePerformanceData,
  getPerformanceAttributions,
  addAssetHandover,
  updateAssetHandoverStatus,
  getAssetHandovers,
  processApprovalDecision,
  assignApprover,
  getApprovals,
  getPendingApprovals,
  queryOffboardedEmployeeData,
  completeOffboarding,
  getOffboardingStats,
  getOffboardingDashboardStats,
  searchJiandaoyunEmployees,
} from "./offboarding.service";

export const offboardingRouter = router({
  // ============================================================
  // 离职记录管理
  // ============================================================

  /** 创建离职记录 */
  create: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      employeeName: z.string(),
      department: z.string(),
      position: z.string(),
      hireDate: z.string().optional(),
      offboardingDate: z.string(),
      lastWorkingDate: z.string(),
      reason: z.enum(['resignation', 'termination', 'retirement', 'contract_end', 'mutual_agreement', 'other']),
      reasonDetail: z.string().optional(),
      successorType: z.enum(['replacement', 'new_position', 'backup', 'none']),
      successorId: z.number().optional(),
      successorName: z.string().optional(),
      backupPersonId: z.number().optional(),
      backupPersonName: z.string().optional(),
      dataRetentionPolicy: z.enum(['permanent', 'archive_after_year', 'archive_after_3years']).optional(),
      performanceDataHandling: z.enum(['keep_under_original', 'transfer_to_successor', 'split_by_date']).optional(),
      profileHandling: z.enum(['transfer_to_successor', 'create_new_for_successor', 'archive']).optional(),
      phoneHandling: z.enum(['transfer_to_successor', 'return_to_pool', 'deactivate']).optional(),
      companyPhone: z.string().optional(),
      emailHandling: z.enum(['forward_to_successor', 'forward_to_manager', 'auto_reply_then_deactivate', 'deactivate']).optional(),
      emailForwardTo: z.string().optional(),
      emailForwardDuration: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createOffboarding({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  /** 获取离职记录列表 */
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      department: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return listOffboardings(input);
    }),

  /** 获取离职记录详情 */
  getDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getOffboardingDetail(input.id);
    }),

  /** 更新离职记录 */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      updates: z.record(z.string(), jsonValue),
    }))
    .mutation(async ({ input }) => {
      return updateOffboarding(input.id, input.updates);
    }),

  /** 提交离职申请 */
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return submitOffboarding(input.id);
    }),

  /** 完成离职流程 */
  complete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return completeOffboarding(input.id);
    }),

  /** 获取离职统计 */
  stats: protectedProcedure
    .query(async () => {
      return getOffboardingStats();
    }),

  /** 获取离职交接进度看板数据（用于首页Dashboard） */
  dashboardStats: protectedProcedure
    .query(async () => {
      return getOffboardingDashboardStats();
    }),

  /** 搜索员工信息（简道云+本地数据库）用于离职表单自动填充 */
  searchEmployees: protectedProcedure
    .input(z.object({ keyword: z.string().min(1) }))
    .query(async ({ input }) => {
      return searchJiandaoyunEmployees(input.keyword);
    }),

  // ============================================================
  // 工作交接清单
  // ============================================================

  /** 添加交接项 */
  addHandoverItem: protectedProcedure
    .input(z.object({
      offboardingId: z.number(),
      category: z.enum(['project', 'task', 'client', 'document', 'system_access', 'knowledge', 'equipment', 'other']),
      itemName: z.string(),
      description: z.string().optional(),
      priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      relatedProjectId: z.number().optional(),
      relatedClientId: z.number().optional(),
      handoverToId: z.number().optional(),
      handoverToName: z.string().optional(),
      notes: z.string().optional(),
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return addHandoverItem(input);
    }),

  /** 批量添加交接项 */
  batchAddHandoverItems: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        offboardingId: z.number(),
        category: z.enum(['project', 'task', 'client', 'document', 'system_access', 'knowledge', 'equipment', 'other']),
        itemName: z.string(),
        description: z.string().optional(),
        priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        handoverToId: z.number().optional(),
        handoverToName: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return batchAddHandoverItems(input.items);
    }),

  /** 更新交接项状态 */
  updateHandoverStatus: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed', 'verified']),
      verifiedBy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateHandoverItemStatus(input.itemId, input.status, input.verifiedBy);
    }),

  /** 获取交接清单 */
  getHandoverItems: protectedProcedure
    .input(z.object({ offboardingId: z.number() }))
    .query(async ({ input }) => {
      return getHandoverItems(input.offboardingId);
    }),

  // ============================================================
  // 绩效归属管理
  // ============================================================

  /** 添加绩效归属记录 */
  addPerformanceAttribution: protectedProcedure
    .input(z.object({
      offboardingId: z.number(),
      kpiName: z.string(),
      kpiCategory: z.string().optional(),
      period: z.string(),
      periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
      attributionType: z.enum(['pre_departure', 'post_departure', 'shared']),
      originalEmployeeId: z.number(),
      originalEmployeeName: z.string(),
      originalContributionPercent: z.number().optional(),
      successorId: z.number().optional(),
      successorName: z.string().optional(),
      successorContributionPercent: z.number().optional(),
      targetValue: z.number().optional(),
      actualValue: z.number().optional(),
      unit: z.string().optional(),
      dataSourceNote: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return addPerformanceAttribution(input);
    }),

  /** 主管确认绩效归属 */
  confirmPerformance: protectedProcedure
    .input(z.object({
      id: z.number(),
      originalContributionPercent: z.number().min(0).max(100),
      successorContributionPercent: z.number().min(0).max(100),
      confirmationNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return confirmPerformanceAttribution(
        input.id,
        ctx.user.id,
        ctx.user.name || '未知',
        input.originalContributionPercent,
        input.successorContributionPercent,
        input.confirmationNotes
      );
    }),

  /** 自动标注绩效数据 */
  autoAnnotatePerformance: protectedProcedure
    .input(z.object({ offboardingId: z.number() }))
    .mutation(async ({ input }) => {
      return autoAnnotatePerformanceData(input.offboardingId);
    }),

  /** 获取绩效归属记录 */
  getPerformanceAttributions: protectedProcedure
    .input(z.object({ offboardingId: z.number() }))
    .query(async ({ input }) => {
      return getPerformanceAttributions(input.offboardingId);
    }),

  // ============================================================
  // 资产/Profile交接
  // ============================================================

  /** 添加资产交接项 */
  addAssetHandover: protectedProcedure
    .input(z.object({
      offboardingId: z.number(),
      assetCategory: z.enum(['profile', 'email_account', 'phone_number', 'laptop', 'monitor', 'access_card', 'keys', 'software_license', 'system_account', 'cloud_storage', 'vpn_access', 'other']),
      assetName: z.string(),
      assetDescription: z.string().optional(),
      assetIdentifier: z.string().optional(),
      handlingAction: z.enum(['transfer_to_successor', 'return_to_company', 'deactivate', 'forward', 'archive', 'delete', 'keep_active_temporary']),
      transferToId: z.number().optional(),
      transferToName: z.string().optional(),
      temporaryRetainUntil: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return addAssetHandover(input);
    }),

  /** 更新资产交接状态 */
  updateAssetStatus: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed', 'verified']),
      completedBy: z.number().optional(),
      verifiedBy: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return updateAssetHandoverStatus(
        input.itemId,
        input.status,
        input.completedBy || ctx.user.id,
        input.verifiedBy
      );
    }),

  /** 获取资产交接列表 */
  getAssetHandovers: protectedProcedure
    .input(z.object({ offboardingId: z.number() }))
    .query(async ({ input }) => {
      return getAssetHandovers(input.offboardingId);
    }),

  // ============================================================
  // 审批流程
  // ============================================================

  /** 处理审批决定 */
  processApproval: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      decision: z.enum(['approved', 'rejected', 'returned']),
      comments: z.string().optional(),
      checklistItems: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      return processApprovalDecision(input);
    }),

  /** 分配审批人 */
  assignApprover: adminProcedure
    .input(z.object({
      offboardingId: z.number(),
      approvalLevel: z.enum(['supervisor', 'hr', 'finance', 'it']),
      approverId: z.number(),
      approverName: z.string(),
    }))
    .mutation(async ({ input }) => {
      return assignApprover(
        input.offboardingId,
        input.approvalLevel,
        input.approverId,
        input.approverName
      );
    }),

  /** 获取审批列表 */
  getApprovals: protectedProcedure
    .input(z.object({ offboardingId: z.number() }))
    .query(async ({ input }) => {
      return getApprovals(input.offboardingId);
    }),

  /** 获取我的待审批列表 */
  myPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      return getPendingApprovals(ctx.user.id);
    }),

  // ============================================================
  // 离职员工数据查询
  // ============================================================

  /** 查询离职员工数据（带标注） */
  queryEmployeeData: protectedProcedure
    .input(z.object({
      targetEmployeeId: z.number(),
      queryType: z.enum(['performance', 'project', 'client', 'task', 'all']),
      queryPeriod: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return queryOffboardedEmployeeData({
        ...input,
        queryUserId: ctx.user.id,
      });
    }),
});

/**
 * 数据导出审批路由
 * 敏感数据导出需BU经理(level≥6)审批
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { canExport } from "../middleware/sensitive-data.middleware";
import { createChildLogger } from "../lib/logger";
import { nanoid } from "nanoid";

const log = createChildLogger("data-export");

// In-memory store (production would use DB)
const exportRequests: Map<string, any> = new Map();

export const dataExportRouter = router({
  /**
   * 提交导出申请
   */
  requestExport: protectedProcedure
    .input(z.object({
      tableName: z.string().min(1),
      fieldNames: z.array(z.string()).min(1),
      filterConditions: z.record(z.string(), z.any()).optional(),
      purpose: z.string().min(10, '请详细描述导出目的（至少10字）'),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).userId || 0;
      const userName = (ctx as any).userName || 'unknown';
      const userLevel = (ctx as any).userLevel || 0;

      // Check export permissions
      const check = canExport(input.tableName, input.fieldNames, userLevel);

      if (!check.allowed && !check.requiresApproval) {
        return {
          success: false,
          message: `以下字段不允许导出: ${check.blockedFields.join(', ')}`,
        };
      }

      const requestId = nanoid(12);
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const request = {
        id: requestId,
        requesterId: userId,
        requesterName: userName,
        tableName: input.tableName,
        fieldNames: input.fieldNames,
        filterConditions: input.filterConditions || {},
        purpose: input.purpose,
        status: check.requiresApproval ? 'pending' : 'approved',
        downloadToken: token,
        downloadCount: 0,
        maxDownloads: 3,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      exportRequests.set(requestId, request);
      log.info({ requestId, tableName: input.tableName, requiresApproval: check.requiresApproval }, '导出申请已提交');

      return {
        success: true,
        requestId,
        status: request.status,
        message: check.requiresApproval ? '导出申请已提交，等待审批' : '导出已批准',
        downloadToken: check.requiresApproval ? undefined : token,
      };
    }),

  /**
   * BU经理审批列表
   */
  listPendingApprovals: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(({ input }) => {
      const pending = Array.from(exportRequests.values())
        .filter(r => r.status === 'pending')
        .slice(0, input.limit);
      return { requests: pending, total: pending.length };
    }),

  /**
   * 审批通过
   */
  approveExport: adminProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(({ input, ctx }) => {
      const request = exportRequests.get(input.requestId);
      if (!request) return { success: false, message: '申请不存在' };
      if (request.status !== 'pending') return { success: false, message: '申请状态不是待审批' };

      request.status = 'approved';
      request.approvedBy = (ctx as any).userId;
      request.approvedAt = new Date().toISOString();
      exportRequests.set(input.requestId, request);

      log.info({ requestId: input.requestId, approvedBy: request.approvedBy }, '导出申请已批准');
      return { success: true, message: '已批准', downloadToken: request.downloadToken };
    }),

  /**
   * 审批拒绝
   */
  rejectExport: adminProcedure
    .input(z.object({
      requestId: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(({ input, ctx }) => {
      const request = exportRequests.get(input.requestId);
      if (!request) return { success: false, message: '申请不存在' };
      if (request.status !== 'pending') return { success: false, message: '申请状态不是待审批' };

      request.status = 'rejected';
      request.rejectedReason = input.reason;
      request.approvedBy = (ctx as any).userId;
      exportRequests.set(input.requestId, request);

      return { success: true, message: '已拒绝' };
    }),

  /**
   * 下载导出数据(验证token+过期)
   */
  downloadExport: protectedProcedure
    .input(z.object({ downloadToken: z.string() }))
    .mutation(({ input }) => {
      const request = Array.from(exportRequests.values()).find(r => r.downloadToken === input.downloadToken);
      if (!request) return { success: false, message: '无效的下载令牌' };
      if (request.status !== 'approved') return { success: false, message: '导出未批准' };
      if (new Date(request.expiresAt) < new Date()) {
        request.status = 'expired';
        return { success: false, message: '下载令牌已过期' };
      }
      if (request.downloadCount >= request.maxDownloads) {
        return { success: false, message: '已达最大下载次数' };
      }

      request.downloadCount++;
      log.info({ requestId: request.id, downloadCount: request.downloadCount }, '数据已下载');

      // In production, this would generate the actual file with watermark
      return {
        success: true,
        message: '下载成功',
        data: {
          tableName: request.tableName,
          fieldNames: request.fieldNames,
          exportedAt: new Date().toISOString(),
          watermark: `Exported by ${request.requesterName} at ${new Date().toISOString()} — CONFIDENTIAL`,
        },
      };
    }),

  /**
   * 获取我的导出申请
   */
  getMyRequests: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(({ input, ctx }) => {
      const userId = (ctx as any).userId || 0;
      const myRequests = Array.from(exportRequests.values())
        .filter(r => r.requesterId === userId)
        .slice(0, input.limit);
      return { requests: myRequests, total: myRequests.length };
    }),
});

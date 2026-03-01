/**
 * v1.7.0 质量检查与工序联动 tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import {
  triggerProcessLock,
  getProcessLocks,
  isProcessLocked,
  requestUnlock,
  approveUnlock,
  getProcessLockSummary,
  createQualityAlert,
  getQualityAlerts,
  markAlertRead,
  markAlertActioned,
  markAllAlertsRead,
  getUnreadAlertCount,
  onQualityCheckCompleted,
  getBlockedByQualityTasks,
} from "./qualityInterlock.service";

export const qualityInterlockRouter = router({
  // ============ 工序锁定 ============
  triggerLock: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string(),
      checkResultId: z.number().optional(),
      defectId: z.number().optional(),
      severity: z.enum(['critical', 'major', 'minor']),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return triggerProcessLock({ ...input, lockedBy: ctx.user.openId });
    }),

  getLocks: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getProcessLocks(input.projectId, input.status);
    }),

  checkLocked: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string(),
    }))
    .query(async ({ input }) => {
      return isProcessLocked(input.projectId, input.processCode);
    }),

  requestUnlock: protectedProcedure
    .input(z.object({
      lockId: z.number(),
      unlockReason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return requestUnlock({
        lockId: input.lockId,
        requestedBy: ctx.user.name || ctx.user.openId,
        unlockReason: input.unlockReason,
      });
    }),

  approveUnlock: protectedProcedure
    .input(z.object({
      lockId: z.number(),
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return approveUnlock({
        lockId: input.lockId,
        approvedBy: ctx.user.name || ctx.user.openId,
        approved: input.approved,
        comments: input.comments,
      });
    }),

  lockSummary: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return getProcessLockSummary(input.projectId);
    }),

  // ============ 质量预警通知 ============
  getAlerts: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      unreadOnly: z.boolean().optional(),
      alertType: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getQualityAlerts(input.projectId, input);
    }),

  markRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      return markAlertRead(input.alertId);
    }),

  markActioned: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      actionTaken: z.string(),
    }))
    .mutation(async ({ input }) => {
      return markAlertActioned(input.alertId, input.actionTaken);
    }),

  markAllRead: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      return markAllAlertsRead(input.projectId);
    }),

  unreadCount: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return getUnreadAlertCount(input.projectId);
    }),

  // ============ 质量联动触发器 ============
  onCheckCompleted: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      processCode: z.string(),
      checkResultId: z.number(),
      result: z.enum(['pass', 'fail', 'conditional_pass', 'pending']),
      defects: z.array(z.object({
        id: z.number(),
        severity: z.string(),
        description: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return onQualityCheckCompleted({
        ...input,
        inspectorId: ctx.user.openId,
      });
    }),

  // ============ 质量锁定联动排程 (#45) ============
  /**
   * 获取因质量锁定而被阻塞的排程任务
   */
  getBlockedByQuality: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      processCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getBlockedByQualityTasks(input.projectId, input.processCode);
    }),

  // ============ 质量缺陷附件管理 ============
  addDefectAttachment: protectedProcedure
    .input(z.object({
      lockId: z.string(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        INSERT INTO quality_defect_attachments (lock_id, file_name, file_url, file_type, file_size, description, uploaded_by)
        VALUES (
          ${input.lockId}, ${input.fileName}, ${input.fileUrl},
          ${input.fileType ?? null},
          ${input.fileSize ?? null},
          ${input.description ?? null},
          ${ctx.user.id}
        )
        RETURNING *
      `);
      return { success: true, attachment: (result[0] as any[])[0] };
    }),

  getDefectAttachments: protectedProcedure
    .input(z.object({
      lockId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM quality_defect_attachments
        WHERE lock_id = ${input.lockId}
        ORDER BY uploaded_at DESC
      `);
      return (result[0] as any[]) || [];
    }),

  deleteDefectAttachment: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`DELETE FROM quality_defect_attachments WHERE id = ${input.id}`);
      return { success: true };
    }),
});

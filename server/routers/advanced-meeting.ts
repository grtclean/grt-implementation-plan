import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as taskAssignment from '../services/task-assignment.service';
import * as meetingTemplates from '../services/meeting-templates.service';
import * as permissions from '../services/collaboration-permissions.service';

/**
 * 高级会议功能路由器
 * 包括自动任务分配、会议模板、权限管理等高级功能
 */

export const advancedMeetingRouter = router({
  // ==================== 自动任务分配 ====================

  /**
   * 从会议行动项自动分配任务
   */
  autoAssignTasks: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        actionItems: z.array(
          z.object({
            title: z.string(),
            owner: z.string().optional(),
            dueDate: z.string().optional(),
            priority: z.enum(['high', 'medium', 'low']),
            description: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = await taskAssignment.autoAssignTasksFromMeeting(
        input.meetingId,
        input.actionItems,
        String(ctx.user.id)
      );

      return {
        success: true,
        message: `已分配 ${results.filter((r) => r.status === 'assigned').length} 个任务`,
        results,
      };
    }),

  /**
   * 获取任务统计
   */
  getTaskStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await taskAssignment.getTaskStatistics(String(ctx.user.id));
    return stats;
  }),

  /**
   * 标记任务为完成
   */
  completeTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        completionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await taskAssignment.completeTask(
        input.taskId,
        input.completionNotes
      );
      return result;
    }),

  // ==================== 会议模板 ====================

  /**
   * 获取所有会议模板
   */
  getAllTemplates: protectedProcedure.query(async () => {
    const templates = meetingTemplates.getAllTemplates();
    return templates;
  }),

  /**
   * 获取特定类型的模板
   */
  getTemplate: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          'employee_interview',
          'performance_dialogue',
          'production_weekly',
          'monthly_analysis',
          'monthly_planning',
          'annual_planning',
          'annual_summary',
          'customer_handover',
          'customer_drawing_review',
          'customer_pre_acceptance',
          'customer_final_acceptance',
          'project_solution_confirmation',
          'custom',
        ]),
      })
    )
    .query(async ({ input }) => {
      const template = meetingTemplates.getTemplate(input.type);
      if (!template) {
        throw new Error('模板不存在');
      }
      return template;
    }),

  /**
   * 根据标签搜索模板
   */
  searchTemplatesByTag: protectedProcedure
    .input(
      z.object({
        tag: z.string(),
      })
    )
    .query(async ({ input }) => {
      const templates = meetingTemplates.searchTemplatesByTag(input.tag);
      return templates;
    }),

  /**
   * 创建自定义模板
   */
  createCustomTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        agendas: z.array(
          z.object({
            title: z.string(),
            duration: z.number(),
            description: z.string().optional(),
            owner: z.string().optional(),
          })
        ),
        notesTemplate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const template = meetingTemplates.createCustomTemplate(
        input.name,
        input.agendas,
        input.notesTemplate
      );
      return template;
    }),

  // ==================== 权限管理 ====================

  /**
   * 授予用户权限
   */
  grantPermission: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        userId: z.string(),
        permissionLevel: z.enum(['owner', 'editor', 'viewer', 'none']),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await permissions.grantPermission(
        input.meetingId,
        input.userId,
        input.permissionLevel,
        String(ctx.user.id),
        input.expiresAt ? new Date(input.expiresAt) : undefined
      );
      return result;
    }),

  /**
   * 撤销用户权限
   */
  revokePermission: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        userId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await permissions.revokePermission(
        input.meetingId,
        input.userId,
        String(ctx.user.id),
        input.reason
      );
      return result;
    }),

  /**
   * 修改用户权限
   */
  modifyPermission: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        userId: z.string(),
        newPermissionLevel: z.enum(['owner', 'editor', 'viewer', 'none']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await permissions.modifyPermission(
        input.meetingId,
        input.userId,
        input.newPermissionLevel,
        String(ctx.user.id),
        input.reason
      );
      return result;
    }),

  /**
   * 获取用户权限
   */
  getUserPermission: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const permission = await permissions.getUserPermission(
        input.meetingId,
        input.userId
      );
      return permission;
    }),

  /**
   * 获取会议的所有权限
   */
  getMeetingPermissions: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const perms = await permissions.getMeetingPermissions(input.meetingId);
      return perms;
    }),

  /**
   * 批量授予权限
   */
  batchGrantPermissions: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        userIds: z.array(z.string()),
        permissionLevel: z.enum(['owner', 'editor', 'viewer', 'none']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await permissions.batchGrantPermissions(
        input.meetingId,
        input.userIds,
        input.permissionLevel,
        String(ctx.user.id)
      );
      return result;
    }),

  /**
   * 获取权限变更日志
   */
  getPermissionChangeLogs: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const logs = await permissions.getPermissionChangeLogs(
        input.meetingId,
        input.limit
      );
      return logs;
    }),

  /**
   * 清理过期权限
   */
  cleanupExpiredPermissions: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await permissions.cleanupExpiredPermissions(
        input.meetingId
      );
      return result;
    }),

  /**
   * 获取权限描述
   */
  getPermissionDescription: protectedProcedure
    .input(
      z.object({
        level: z.enum(['owner', 'editor', 'viewer', 'none']),
      })
    )
    .query(async ({ input }) => {
      const description = permissions.getPermissionDescription(input.level);
      return { level: input.level, description };
    }),
});

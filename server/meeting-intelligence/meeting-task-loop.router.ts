/**
 * 会议任务闭环管理路由
 * Meeting Task Loop Management Router
 */

import { z } from 'zod';
import {router, protectedProcedure, requirePermission} from '../_core/trpc';
import { jsonValue } from '@shared/validators';
import {
  generateMeetingMinutes,
  createActionItem,
  distributeActionItems,
  acceptTaskAssignment,
  rejectTaskAssignment,
  getPersonalTasks,
  updatePersonalTaskStatus,
  createCompletionReport,
  submitCompletionReport,
  assignMeetingOwner,
  getMeetingOwner,
  submitMeetingEffectiveness,
  getMeetingEffectivenessStats,
  createCustomTemplate,
  getCustomTemplates,
  incrementTemplateUsage,
} from './meeting-task-loop.service';
import { requireDb } from '../db';

export const meetingTaskLoopRouter = router({
  // ============================================================================
  // 会议纪要相关
  // ============================================================================
  
  generateMinutes: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      title: z.string(),
      templateId: z.string().optional(),
      agenda: z.array(jsonValue).optional(),
      participants: z.array(z.string()).optional(),
      notes: z.string().optional(),
      transcription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateMeetingMinutes(input.meetingId, input);
    }),

  getMinutes: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
    }))
    .query(async ({ input }) => {
      const [rows] = await (await requireDb() as any).execute(
        `SELECT * FROM meeting_minutes_v2 WHERE meeting_id = ? ORDER BY version DESC LIMIT 1`,
        [input.meetingId]
      ) as any;
      
      if (!rows.length) return null;
      
      const row = rows[0];
      return {
        id: row.id,
        meetingId: row.meeting_id,
        title: row.title,
        summary: row.summary,
        keyDecisions: JSON.parse(row.key_decisions || '[]'),
        discussionPoints: JSON.parse(row.discussion_points || '[]'),
        aiGenerated: row.ai_generated,
        status: row.status,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  approveMinutes: requirePermission('collab:meeting:hub')
    .input(z.object({
      minutesId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await (await requireDb() as any).execute(
        `UPDATE meeting_minutes_v2 SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [String(ctx.user.id), input.minutesId]
      );
      return { success: true };
    }),

  // ============================================================================
  // 任务管理相关
  // ============================================================================

  createActionItem: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      minutesId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      ownerId: z.string().optional(),
      ownerName: z.string(),
      supporterIds: z.array(z.string()).optional(),
      supporterNames: z.array(z.string()).optional(),
      dueDate: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    }))
    .mutation(async ({ input }) => {
      return createActionItem(input);
    }),

  getActionItems: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
    }))
    .query(async ({ input }) => {
      const [rows] = await (await requireDb() as any).execute(
        `SELECT * FROM meeting_action_items WHERE meeting_id = ? ORDER BY created_at DESC`,
        [input.meetingId]
      ) as any;
      
      return rows.map((row: any) => ({
        id: row.id,
        meetingId: row.meeting_id,
        minutesId: row.minutes_id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        supporterIds: JSON.parse(row.supporter_ids || '[]'),
        supporterNames: JSON.parse(row.supporter_names || '[]'),
        dueDate: row.due_date,
        status: row.status,
        progressPercent: row.progress_percent,
        completedAt: row.completed_at,
        completionNotes: row.completion_notes,
        evidenceUrls: JSON.parse(row.evidence_urls || '[]'),
        createdAt: row.created_at,
      }));
    }),

  distributeActionItems: requirePermission('collab:meeting:hub')
    .input(z.object({
      minutesId: z.string(),
      actionItemIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return distributeActionItems(input.minutesId, input.actionItemIds);
    }),

  // ============================================================================
  // 任务分发确认相关
  // ============================================================================

  getPendingAssignments: protectedProcedure
    .query(async ({ ctx }) => {
      const [rows] = await (await requireDb() as any).execute(
        `SELECT ta.*, mai.title as task_title, mai.description as task_description, mai.due_date, mai.priority, mr.title as meeting_title
         FROM task_assignments ta
         JOIN meeting_action_items mai ON ta.action_item_id = mai.id
         LEFT JOIN meeting_records mr ON mai.meeting_id = mr.id
         WHERE ta.assignee_id = ? AND ta.assignment_status IN ('pending', 'sent')
         ORDER BY mai.due_date ASC`,
        [String(ctx.user.id)]
      ) as any;

      return rows.map((row: any) => ({
        id: row.id,
        actionItemId: row.action_item_id,
        assigneeRole: row.assignee_role,
        assignmentStatus: row.assignment_status,
        taskTitle: row.task_title,
        taskDescription: row.task_description,
        dueDate: row.due_date,
        priority: row.priority,
        meetingTitle: row.meeting_title,
        sentAt: row.sent_at,
      }));
    }),

  acceptAssignment: requirePermission('collab:meeting:hub')
    .input(z.object({
      assignmentId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return acceptTaskAssignment(input.assignmentId, String(ctx.user.id), input.notes);
    }),

  rejectAssignment: requirePermission('collab:meeting:hub')
    .input(z.object({
      assignmentId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await rejectTaskAssignment(input.assignmentId, String(ctx.user.id), input.reason);
      return { success: true };
    }),

  // ============================================================================
  // 个人任务清单相关
  // ============================================================================

  getPersonalTasks: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      sourceType: z.string().optional(),
      dueDateFrom: z.string().optional(),
      dueDateTo: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getPersonalTasks(String(ctx.user.id), input);
    }),

  updateTaskStatus: requirePermission('collab:meeting:hub')
    .input(z.object({
      taskId: z.string(),
      status: z.enum(['todo', 'in_progress', 'blocked', 'completed', 'cancelled']),
      completionNotes: z.string().optional(),
      evidenceUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updatePersonalTaskStatus(
        input.taskId,
        String(ctx.user.id),
        input.status,
        input.completionNotes,
        input.evidenceUrls
      );
      return { success: true };
    }),

  // ============================================================================
  // 任务完成上报相关
  // ============================================================================

  createCompletionReport: protectedProcedure
    .input(z.object({
      personalTaskId: z.string(),
      reportTitle: z.string(),
      reportSummary: z.string().optional(),
      completionDetails: z.string().optional(),
      evidenceUrls: z.array(z.string()).optional(),
      targetMeetingId: z.string().optional(),
      autoUploadEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createCompletionReport({
        ...input,
        reporterId: String(ctx.user.id),
        reporterName: ctx.user.name || String(ctx.user.id),
      });
    }),

  submitCompletionReport: requirePermission('collab:meeting:hub')
    .input(z.object({
      reportId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await submitCompletionReport(input.reportId, String(ctx.user.id));
      return { success: true };
    }),

  getCompletionReports: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      targetMeetingId: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      let query = `SELECT * FROM task_completion_reports WHERE reporter_id = ?`;
      const params: unknown[] = [String(ctx.user.id)];

      if (input?.status) {
        query += ` AND status = ?`;
        params.push(input.status);
      }
      if (input?.targetMeetingId) {
        query += ` AND target_meeting_id = ?`;
        params.push(input.targetMeetingId);
      }

      query += ` ORDER BY created_at DESC`;

      const [rows] = await (await requireDb() as any).execute(query, params) as any;
      return rows.map((row: any) => ({
        id: row.id,
        personalTaskId: row.personal_task_id,
        actionItemId: row.action_item_id,
        sourceMeetingId: row.source_meeting_id,
        targetMeetingId: row.target_meeting_id,
        reportTitle: row.report_title,
        reportSummary: row.report_summary,
        completionDetails: row.completion_details,
        evidenceUrls: JSON.parse(row.evidence_urls || '[]'),
        status: row.status,
        submittedAt: row.submitted_at,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        reviewNotes: row.review_notes,
        autoUploadEnabled: row.auto_upload_enabled,
        createdAt: row.created_at,
      }));
    }),

  // MO审核报告
  reviewCompletionReport: requirePermission('collab:meeting:hub')
    .input(z.object({
      reportId: z.string(),
      approved: z.boolean(),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const status = input.approved ? 'approved' : 'rejected';
      await (await requireDb() as any).execute(
        `UPDATE task_completion_reports 
         SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
         WHERE id = ?`,
        [status, String(ctx.user.id), input.reviewNotes, input.reportId]
      );

      // 如果批准，更新个人任务的上报状态
      if (input.approved) {
        const [rows] = await (await requireDb() as any).execute(
          `SELECT personal_task_id FROM task_completion_reports WHERE id = ?`,
          [input.reportId]
        ) as any;
        
        if (rows.length) {
          await (await requireDb() as any).execute(
            `UPDATE personal_tasks SET report_status = 'confirmed' WHERE id = ?`,
            [rows[0].personal_task_id]
          );
        }
      }

      return { success: true };
    }),

  // ============================================================================
  // Meeting Owner相关
  // ============================================================================

  assignMeetingOwner: protectedProcedure
    .input(z.object({
      userId: z.string(),
      userName: z.string(),
      meetingTypeId: z.string(),
      meetingTypeName: z.string(),
      scope: z.enum(['company', 'department', 'project', 'team']),
      scopeId: z.string().optional(),
      scopeName: z.string().optional(),
      responsibilities: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      return assignMeetingOwner(input);
    }),

  getMeetingOwner: protectedProcedure
    .input(z.object({
      meetingTypeId: z.string(),
      scope: z.string(),
      scopeId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getMeetingOwner(input.meetingTypeId, input.scope, input.scopeId);
    }),

  getMeetingOwners: protectedProcedure
    .input(z.object({
      meetingTypeId: z.string().optional(),
      scope: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      let query = `SELECT * FROM meeting_owners WHERE status = 'active'`;
      const params: unknown[] = [];

      if (input?.meetingTypeId) {
        query += ` AND meeting_type_id = ?`;
        params.push(input.meetingTypeId);
      }
      if (input?.scope) {
        query += ` AND scope = ?`;
        params.push(input.scope);
      }

      query += ` ORDER BY meeting_type_name, scope`;

      const [rows] = await (await requireDb() as any).execute(query, params) as any;
      return rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        meetingTypeId: row.meeting_type_id,
        meetingTypeName: row.meeting_type_name,
        scope: row.scope,
        scopeId: row.scope_id,
        scopeName: row.scope_name,
        responsibilities: JSON.parse(row.responsibilities || '[]'),
        status: row.status,
        notificationPreferences: JSON.parse(row.notification_preferences || '{}'),
        createdAt: row.created_at,
      }));
    }),

  // ============================================================================
  // 会议效果评估相关
  // ============================================================================

  submitEffectiveness: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      evaluatorRole: z.enum(['organizer', 'participant', 'observer']).optional(),
      punctualityScore: z.number().min(1).max(5),
      agendaCompletionScore: z.number().min(1).max(5),
      decisionQualityScore: z.number().min(1).max(5),
      participationScore: z.number().min(1).max(5),
      timeEfficiencyScore: z.number().min(1).max(5),
      overallRating: z.enum(['poor', 'fair', 'good', 'excellent']),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      suggestions: z.string().optional(),
      actualStartTime: z.string().optional(),
      actualEndTime: z.string().optional(),
      agendaItemsCompleted: z.number().optional(),
      agendaItemsTotal: z.number().optional(),
      decisionsMade: z.number().optional(),
      actionItemsCreated: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return submitMeetingEffectiveness({
        ...input,
        evaluatorId: String(ctx.user.id),
        evaluatorName: ctx.user.name || String(ctx.user.id),
      });
    }),

  getEffectivenessStats: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
    }))
    .query(async ({ input }) => {
      return getMeetingEffectivenessStats(input.meetingId);
    }),

  // ============================================================================
  // 自定义模板相关
  // ============================================================================

  createCustomTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      nameEn: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['internal', 'customer', 'custom']).optional(),
      subcategory: z.string().optional(),
      visibility: z.enum(['private', 'team', 'department', 'company']).optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      defaultDuration: z.number().optional(),
      agenda: z.array(jsonValue).optional(),
      participants: z.object({
        required: z.array(z.string()),
        optional: z.array(z.string()),
      }).optional(),
      outputs: z.array(jsonValue).optional(),
      bestPractices: z.array(z.string()).optional(),
      followUpActions: z.array(z.string()).optional(),
      aiPrompts: z.record(z.string(), jsonValue).optional(),
      basedOnTemplateId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createCustomTemplate({
        ...input,
        createdBy: String(ctx.user.id),
        createdByName: ctx.user.name || undefined,
      });
      return { id };
    }),

  getCustomTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      visibility: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return getCustomTemplates(String(ctx.user.id), input);
    }),

  incrementTemplateUsage: requirePermission('collab:meeting:hub')
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await incrementTemplateUsage(input.templateId);
      return { success: true };
    }),

  deleteCustomTemplate: requirePermission('collab:meeting:hub')
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await (await requireDb() as any).execute(
        `UPDATE custom_meeting_templates SET status = 'archived' WHERE id = ? AND created_by = ?`,
        [input.templateId, String(ctx.user.id)]
      );
      return { success: true };
    }),
});

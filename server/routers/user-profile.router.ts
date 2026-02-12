/**
 * 用户Profile路由
 * v1.3.92 - 用户个人设置和任务提醒管理
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as userProfileService from "../services/user-profile.service";
import * as emailReminderService from "../services/email-reminder.service";

export const userProfileRouter = router({
  // 获取当前用户Profile
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return userProfileService.getUserProfile(ctx.user.openId);
  }),

  // 更新当前用户Profile
  updateMyProfile: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      workPlanFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
      workPlanReminderEnabled: z.boolean().optional(),
      workPlanReminderTime: z.string().optional(),
      trainingPlanEnabled: z.boolean().optional(),
      trainingReminderDaysBefore: z.number().optional(),
      projectPlanEnabled: z.boolean().optional(),
      projectMilestoneReminder: z.boolean().optional(),
      performanceReportEnabled: z.boolean().optional(),
      performanceReportFrequency: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
      taskReminderEnabled: z.boolean().optional(),
      taskReminderTime: z.string().optional(),
      taskReminderEmail: z.boolean().optional(),
      taskReminderSystem: z.boolean().optional(),
      emailNotificationsEnabled: z.boolean().optional(),
      emailDigestFrequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return userProfileService.upsertUserProfile({
        userId: ctx.user.openId,
        ...input,
      });
    }),

  // 获取我的任务列表
  getMyTasks: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      taskType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return userProfileService.getUserTasks(ctx.user.openId, input);
    }),

  // 获取今日待完成任务
  getTodayTasks: protectedProcedure.query(async ({ ctx }) => {
    return userProfileService.getTodayTasks(ctx.user.openId);
  }),

  // 创建任务
  createTask: protectedProcedure
    .input(z.object({
      taskType: z.enum(['work_plan', 'training', 'project', 'performance', 'report', 'other']),
      title: z.string(),
      description: z.string().optional(),
      dueDate: z.string(),
      dueTime: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      relatedProjectId: z.string().optional(),
      relatedTrainingId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return userProfileService.createUserTask({
        userId: ctx.user.openId,
        ...input,
        priority: input.priority || 'medium',
        status: 'pending',
      });
    }),

  // 更新任务状态
  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']),
    }))
    .mutation(async ({ input }) => {
      await userProfileService.updateTaskStatus(input.taskId, input.status);
      return { success: true };
    }),

  // 获取逾期任务
  getOverdueTasks: protectedProcedure.query(async ({ ctx }) => {
    return userProfileService.getOverdueTasks(ctx.user.openId);
  }),

  // 发送任务提醒（管理员功能）
  sendTaskReminders: protectedProcedure
    .input(z.object({
      reminderTime: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const reminderTime = input?.reminderTime || '15:00:00';
      const tasks = await userProfileService.getTasksNeedingReminder(reminderTime);
      
      let sentCount = 0;
      let failedCount = 0;
      
      for (const task of tasks) {
        try {
          // TODO: 实际发送邮件逻辑
          // await sendEmail(task.userEmail, task.title, task.description);
          
          await userProfileService.markReminderSent(task.id!);
          await userProfileService.logReminder(task.userId, task.id!, 'email', 'sent');
          sentCount++;
        } catch (error) {
          await userProfileService.logReminder(task.userId, task.id!, 'email', 'failed', String(error));
          failedCount++;
        }
      }
      
      return {
        totalTasks: tasks.length,
        sent: sentCount,
        failed: failedCount,
      };
    }),

  // 发送每日任务提醒邮件（默认下午3:00）
  sendDailyReminders: protectedProcedure.mutation(async () => {
    return emailReminderService.sendTaskReminderEmails();
  }),

  // 获取提醒统计
  getReminderStats: protectedProcedure.query(async () => {
    return emailReminderService.getReminderStats();
  }),

  // 检查是否到达提醒时间
  checkReminderTime: publicProcedure
    .input(z.object({
      targetTime: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      return {
        isReminderTime: emailReminderService.isReminderTime(input?.targetTime || '15:00'),
        currentTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        targetTime: input?.targetTime || '15:00',
      };
    }),
});

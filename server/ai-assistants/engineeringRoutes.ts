/**
 * AI Engineering Assistant tRPC Routes
 * 宸ョ▼鍔╂墜API璺敱
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { 
  engineeringAssistant, 
  PROJECT_PHASES, 
  ENGINEERING_ROLES,
  PHASE_ROLE_MATRIX,
  NOTIFICATION_CHANNELS
} from './engineeringAssistant';
import { getDb, requireDb } from '../db';
import { 
  engineeringTasks, 
  taskNotifications, 
  customerCommunications, 
  engineeringInputs,
  bomAssemblyTasks 
} from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

export const engineeringRoutes = router({
  // 鑾峰彇椤圭洰闃舵鍒楄〃
  getPhases: protectedProcedure.query(() => {
    return Object.values(PROJECT_PHASES);
  }),

  // 鑾峰彇瑙掕壊鍒楄〃
  getRoles: protectedProcedure.query(() => {
    return Object.values(ENGINEERING_ROLES);
  }),

  // 鑾峰彇闃舵-瑙掕壊鐭╅樀
  getPhaseRoleMatrix: protectedProcedure
    .input(z.object({ phaseCode: z.string() }))
    .query(({ input }) => {
      const matrix = PHASE_ROLE_MATRIX[input.phaseCode];
      if (!matrix) {
        return null;
      }
      return Object.entries(matrix)
        .filter(([_, role]) => role !== null)
        .map(([code, role]) => ({
          roleCode: code,
          roleName: ENGINEERING_ROLES[code as keyof typeof ENGINEERING_ROLES]?.name || code,
          responsibility: role
        }));
    }),

  // 鑾峰彇閫氱煡娓犻亾閰嶇疆
  getNotificationChannels: protectedProcedure.query(() => {
    return Object.entries(NOTIFICATION_CHANNELS).map(([key, value]) => ({
      channel: key,
      ...value
    }));
  }),

  // 鐢熸垚浠诲姟鍒嗛厤鏂规
  generateTaskAssignments: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectName: z.string(),
      phaseCode: z.string(),
      taskType: z.string(),
      taskDescription: z.string().optional(),
      bomItems: z.array(z.object({
        itemId: z.number(),
        itemName: z.string(),
        level: z.number(),
        assemblyType: z.enum(['mechanical', 'electrical', 'pneumatic', 'hydraulic']),
        estimatedHours: z.number().optional()
      })).optional(),
      deadline: z.string().optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional()
    }))
    .mutation(async ({ input }) => {
      const tasks = await engineeringAssistant.generateTaskAssignments({
        ...input,
        deadline: input.deadline ? new Date(input.deadline) : undefined
      });
      return tasks;
    }),

  // 淇濆瓨宸ョ▼浠诲姟
  saveEngineeringTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      projectId: z.number(),
      phaseCode: z.string(),
      taskType: z.string(),
      taskName: z.string(),
      taskDescription: z.string().optional(),
      primaryAssigneeId: z.number().optional(),
      backupAssigneeId: z.number().optional(),
      supervisorId: z.number().optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
      bomItemId: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const result = await (await requireDb())!.insert(engineeringTasks).values({
        taskId: input.taskId,
        projectId: input.projectId,
        phaseCode: input.phaseCode,
        taskType: input.taskType,
        taskName: input.taskName,
        taskDescription: input.taskDescription,
        primaryAssigneeId: input.primaryAssigneeId,
        backupAssigneeId: input.backupAssigneeId,
        supervisorId: input.supervisorId,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        priority: input.priority || 'medium',
        bomItemId: input.bomItemId
      } as any);
      return { success: true, taskId: input.taskId };
    }),

  // 鑾峰彇椤圭洰宸ョ▼浠诲姟鍒楄〃
  getProjectTasks: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      phaseCode: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional()
    }))
    .query(async ({ input }) => {
      let conditions = [eq(engineeringTasks.projectId, input.projectId)];
      
      if (input.phaseCode) {
        conditions.push(eq(engineeringTasks.phaseCode, input.phaseCode));
      }
      if (input.status) {
        conditions.push(eq(engineeringTasks.status, input.status));
      }

      const tasks = await (await requireDb())!.select()
        .from(engineeringTasks)
        .where(and(...conditions))
        .orderBy(desc(engineeringTasks.createdAt))
        .limit(1000);

      return tasks;
    }),

  // 更新任务状态
  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']),
      progress: z.number().optional(),
      actualStartDate: z.string().optional(),
      actualEndDate: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const updateData: any = { status: input.status };
      if (input.progress !== undefined) updateData.progress = input.progress;
      if (input.actualStartDate) updateData.actualStartDate = new Date(input.actualStartDate);
      if (input.actualEndDate) updateData.actualEndDate = new Date(input.actualEndDate);

      await (await requireDb())!.update(engineeringTasks)
        .set(updateData)
        .where(eq(engineeringTasks.taskId, input.taskId));

      return { success: true };
    }),

  // 鍙戦€佷换鍔￠€氱煡
  sendTaskNotification: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      recipientId: z.number(),
      channel: z.enum(['screen_popup', 'system_message', 'email', 'wechat', 'sms']),
      subject: z.string(),
      content: z.string(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
      confirmationRequired: z.boolean().optional(),
      scheduledAt: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await (await requireDb())!.insert(taskNotifications).values({
        notificationId,
        taskId: input.taskId,
        recipientId: input.recipientId,
        channel: input.channel,
        subject: input.subject,
        content: input.content,
        priority: input.priority || 'medium',
        confirmationRequired: input.confirmationRequired ? 1 : 0,
        scheduledAt: input.scheduledAt || new Date().toISOString(),
        status: input.scheduledAt ? 'scheduled' : 'pending'
      } as any);

      return { success: true, notificationId };
    }),

  // 纭閫氱煡
  confirmNotification: protectedProcedure
    .input(z.object({
      notificationId: z.string(),
      confirmedBy: z.number()
    }))
    .mutation(async ({ input }) => {
      await (await requireDb())!.update(taskNotifications)
        .set({
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          confirmedBy: input.confirmedBy
        })
        .where(eq(taskNotifications.notificationId, input.notificationId));

      return { success: true };
    }),

  // 鑾峰彇寰呯‘璁ら€氱煡
  getPendingNotifications: protectedProcedure
    .input(z.object({ recipientId: z.number() }))
    .query(async ({ input }) => {
      const notifications = await (await requireDb())!.select()
        .from(taskNotifications)
        .where(and(
          eq(taskNotifications.recipientId, input.recipientId),
          eq(taskNotifications.confirmationRequired, 1),
          eq(taskNotifications.status, 'sent')
        ))
        .orderBy(desc(taskNotifications.sentAt))
        .limit(1000);

      return notifications;
    }),

  // 分析客户沟通内容
  analyzeCustomerCommunication: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      phaseCode: z.string(),
      communicationType: z.string(),
      rawContent: z.string(),
      customerContacts: z.array(z.string()),
      internalParticipants: z.array(z.string())
    }))
    .mutation(async ({ input }) => {
      const analysis = await engineeringAssistant.analyzeCustomerCommunication(input);
      return analysis;
    }),

  // 保存客户沟通记录
  saveCustomerCommunication: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      phaseCode: z.string().optional(),
      communicationType: z.string(),
      subject: z.string(),
      summary: z.string(),
      actionItems: z.string().optional(),
      customerContacts: z.array(z.string()),
      internalParticipants: z.array(z.string()),
      communicationDate: z.string(),
      nextFollowUp: z.string().optional(),
      aiSummary: z.string().optional(),
      aiNextActions: z.string().optional(),
      createdBy: z.number()
    }))
    .mutation(async ({ input }) => {
      const communicationId = `COMM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await (await requireDb())!.insert(customerCommunications).values({
        communicationId,
        projectId: input.projectId,
        phaseCode: input.phaseCode,
        communicationType: input.communicationType,
        subject: input.subject,
        summary: input.summary,
        actionItems: input.actionItems,
        customerContacts: JSON.stringify(input.customerContacts),
        internalParticipants: JSON.stringify(input.internalParticipants),
        communicationDate: input.communicationDate,
        nextFollowUp: input.nextFollowUp,
        aiSummary: input.aiSummary,
        aiNextActions: input.aiNextActions,
        aiGeneratedAt: input.aiSummary ? new Date().toISOString() : undefined,
        createdBy: input.createdBy
      } as any);

      return { success: true, communicationId };
    }),

  // 获取项目沟通记录
  getProjectCommunications: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      const communications = await (await requireDb())!.select()
        .from(customerCommunications)
        .where(eq(customerCommunications.projectId, input.projectId))
        .orderBy(desc(customerCommunications.communicationDate))
        .limit(input.limit || 50);

      return communications;
    }),

  // 鍒嗘瀽宸ョ▼杈撳叆
  analyzeEngineeringInput: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceType: z.string(),
      inputContent: z.string()
    }))
    .mutation(async ({ input }) => {
      const analysis = await engineeringAssistant.analyzeEngineeringInput(
        input.projectId,
        input.sourceType,
        input.inputContent
      );
      return analysis;
    }),

  // 淇濆瓨宸ョ▼杈撳叆
  saveEngineeringInput: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sourceType: z.string(),
      sourceId: z.string().optional(),
      inputCategory: z.string().optional(),
      inputContent: z.string(),
      importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      aiExtractedRequirements: z.string().optional(),
      aiSuggestedTasks: z.string().optional(),
      distributedTo: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      const inputId = `INPUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await (await requireDb())!.insert(engineeringInputs).values({
        inputId,
        projectId: input.projectId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        inputCategory: input.inputCategory,
        inputContent: input.inputContent,
        importance: input.importance || 'medium',
        aiProcessed: input.aiExtractedRequirements ? 1 : 0,
        aiExtractedRequirements: input.aiExtractedRequirements,
        aiSuggestedTasks: input.aiSuggestedTasks,
        aiProcessedAt: input.aiExtractedRequirements ? new Date().toISOString() : undefined,
        distributedTo: input.distributedTo ? JSON.stringify(input.distributedTo) : undefined,
        distributionStatus: input.distributedTo ? 'distributed' : 'pending'
      } as any);

      return { success: true, inputId };
    }),

  // 淇濆瓨BOM瑁呴厤浠诲姟
  saveBomAssemblyTask: protectedProcedure
    .input(z.object({
      bomItemId: z.number(),
      bomItemName: z.string(),
      bomLevel: z.number().optional(),
      assemblyType: z.enum(['mechanical', 'electrical', 'pneumatic', 'hydraulic']),
      workstation: z.string().optional(),
      estimatedHours: z.number().optional(),
      primaryAssigneeId: z.number().optional(),
      backupAssigneeId: z.number().optional(),
      supervisorId: z.number().optional(),
      selfCheck: z.boolean().optional(),
      mutualCheck: z.boolean().optional(),
      specialCheck: z.boolean().optional(),
      assemblyInstruction: z.string().optional(),
      qualityStandard: z.string().optional(),
      safetyProcedure: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const taskId = `BOM-TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await (await requireDb())!.insert(bomAssemblyTasks).values({
        taskId,
        bomItemId: input.bomItemId,
        bomItemName: input.bomItemName,
        bomLevel: input.bomLevel || 1,
        assemblyType: input.assemblyType,
        workstation: input.workstation,
        estimatedHours: input.estimatedHours?.toString(),
        primaryAssigneeId: input.primaryAssigneeId,
        backupAssigneeId: input.backupAssigneeId,
        supervisorId: input.supervisorId,
        selfCheck: input.selfCheck ? 1 : 0,
        mutualCheck: input.mutualCheck ? 1 : 0,
        specialCheck: input.specialCheck ? 1 : 0,
        assemblyInstruction: input.assemblyInstruction,
        qualityStandard: input.qualityStandard,
        safetyProcedure: input.safetyProcedure
      } as any);

      return { success: true, taskId };
    }),

  // 鑾峰彇BOM瑁呴厤浠诲姟
  getBomAssemblyTasks: protectedProcedure
    .input(z.object({
      bomItemId: z.number().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'rework']).optional()
    }))
    .query(async ({ input }) => {
      let conditions: any[] = [];
      
      if (input.bomItemId) {
        conditions.push(eq(bomAssemblyTasks.bomItemId, input.bomItemId));
      }
      if (input.status) {
        conditions.push(eq(bomAssemblyTasks.status, input.status));
      }

      const tasks = await (await requireDb())!.select()
        .from(bomAssemblyTasks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bomAssemblyTasks.createdAt))
        .limit(1000);

      return tasks;
    }),

  // 更新BOM装配任务状态
  updateBomAssemblyTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'rework']),
      actualHours: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const updateData: any = { status: input.status };
      if (input.actualHours !== undefined) {
        updateData.actualHours = input.actualHours.toString();
      }

      await (await requireDb())!.update(bomAssemblyTasks)
        .set(updateData)
        .where(eq(bomAssemblyTasks.taskId, input.taskId));

      return { success: true };
    }),

  // 优化通知发送时间
  optimizeNotificationTiming: protectedProcedure
    .input(z.object({
      notifications: z.array(z.object({
        channel: z.string(),
        timing: z.string(),
        recipients: z.array(z.string()),
        subject: z.string(),
        contentTemplate: z.string(),
        confirmationRequired: z.boolean()
      })),
      userPreferences: z.object({
        preferredTime: z.string().optional(),
        quietHours: z.array(z.string()).optional(),
        timezone: z.string().optional()
      }).optional()
    }))
    .mutation(({ input }) => {
      const optimized = engineeringAssistant.optimizeNotificationTiming(
        input.notifications as any,
        input.userPreferences || {}
      );
      return optimized;
    })
});

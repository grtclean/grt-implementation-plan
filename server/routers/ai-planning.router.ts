/**
 * AI计划助手 tRPC路由
 * 封装 ai-planning.service.ts 的功能
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  generateWorkPlan,
  updatePlanStatus,
  getPlanExecutionReport,
  type PlanInput,
} from "../services/ai-planning.service";

export const aiPlanningRouter = router({
  // 生成智能工作计划
  generatePlan: protectedProcedure.input(z.object({
    planType: z.enum(["daily", "weekly", "monthly"]),
    companyPlans: z.array(z.object({
      id: z.string(),
      type: z.enum(["annual", "quarterly", "monthly"]),
      title: z.string(),
      objectives: z.array(z.string()),
      deadline: z.string(),
    })).optional(),
    customerFeedback: z.array(z.object({
      id: z.string(),
      customerId: z.string(),
      customerName: z.string(),
      content: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      date: z.string(),
    })).optional(),
    projectOPLs: z.array(z.object({
      id: z.string(),
      projectId: z.string(),
      projectName: z.string(),
      stage: z.string(),
      items: z.array(z.string()),
      deadline: z.string(),
    })).optional(),
    meetingMinutes: z.array(z.object({
      id: z.string(),
      meetingType: z.string(),
      date: z.string(),
      actionItems: z.array(z.object({
        description: z.string(),
        assignee: z.string(),
        deadline: z.string(),
        status: z.enum(["pending", "in_progress", "completed"]),
      })),
    })).optional(),
    supervisorAssignments: z.array(z.object({
      id: z.string(),
      from: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      deadline: z.string(),
    })).optional(),
    kpiStatus: z.object({
      currentScore: z.number(),
      targetScore: z.number(),
      gaps: z.array(z.string()),
    }).optional(),
    unfinishedPlans: z.array(z.object({
      id: z.string(),
      title: z.string(),
      originalDeadline: z.string(),
      reason: z.string(),
    })).optional(),
  })).mutation(async ({ input }) => {
    const { planType, ...rest } = input;
    const planInput: PlanInput = {
      companyPlans: rest.companyPlans,
      customerFeedback: rest.customerFeedback,
      projectOPLs: rest.projectOPLs,
      meetingMinutes: rest.meetingMinutes,
      supervisorAssignments: rest.supervisorAssignments,
      kpiStatus: rest.kpiStatus,
      unfinishedPlans: rest.unfinishedPlans,
    };
    const plan = await generateWorkPlan(planInput, planType);
    return { success: true, data: plan };
  }),

  // 更新计划任务状态
  updateTaskStatus: protectedProcedure.input(z.object({
    planId: z.string(),
    taskId: z.string(),
    status: z.enum(["pending", "in_progress", "completed"]),
  })).mutation(({ input }) => {
    const result = updatePlanStatus(input.planId, input.taskId, input.status);
    return { success: result, message: result ? "状态更新成功" : "更新失败" };
  }),

  // 获取计划执行报告
  getExecutionReport: protectedProcedure.input(z.object({
    planId: z.string(),
  })).query(async ({ input }) => {
    const report = await getPlanExecutionReport(input.planId);
    return { report };
  }),
});

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { aiProcessSuggestions, aiSuggestionExecutionLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

// Process-specific system prompts
const PROCESS_PROMPTS: Record<string, string> = {
  FMEA: "你是FMEA（失效模式与影响分析）专家。基于AIAG VDA FMEA标准，分析潜在失效模式，评估风险优先级(AP)，给出改进建议。",
  "8D": "你是8D问题解决专家。帮助团队按照8D方法论（D1-D8步骤）系统地分析和解决质量问题。",
  CAPA: "你是CAPA（纠正与预防措施）专家。帮助识别根本原因，制定纠正措施和预防措施，确保问题不再复发。",
  PPAP: "你是PPAP（生产件批准程序）专家。指导完成18项PPAP提交要素，确保供应商零件满足设计规格。",
  ControlPlan: "你是控制计划专家。帮助制定生产过程控制计划，包括控制特性、检验方法、抽样频次和反应计划。",
};

export const aiSuggestionRouter = router({
  getSuggestions: protectedProcedure.input(z.object({
    processType: z.string().optional(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiProcessSuggestions).orderBy(desc(aiProcessSuggestions.createdAt)).limit(1000);
    if (input?.processType) items = items.filter(s => s.processType === input.processType);
    if (input?.processId) items = items.filter(s => s.processId === input.processId);
    if (input?.stepCode) items = items.filter(s => s.stepCode === input.stepCode);
    return items;
  }),

  /**
   * generateSuggestion — async LLM-powered process improvement suggestion
   * Submits to task queue, returns taskId for polling via getSuggestionStatus.
   */
  generateSuggestion: requirePermission('ai:hub:access').input(z.object({
    processType: z.string(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
    context: z.string().optional(),
    question: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { processType, processId, stepCode, context, question } = input;

    const { taskId } = await submitTask(
      "AI_SUGGESTION_GENERATE",
      { processType, processId, stepCode, context, question },
      ctx.user!.name ?? `User#${ctx.user!.id}`,
    );

    return { success: true, taskId, status: "processing" as const, suggestion: null, id: null };
  }),

  /** Poll for suggestion generation status */
  getSuggestionStatus: protectedProcedure.input(z.object({
    taskId: z.number(),
  })).query(async ({ input }) => {
    const task = await getTaskStatus(input.taskId);
    if (!task) return { taskStatus: "not_found" as const, suggestion: null, id: null };

    if (task.status === "completed" && task.resultData) {
      const result = task.resultData as Record<string, unknown>;
      return {
        taskStatus: "completed" as const,
        suggestion: result.suggestion ?? null,
        id: result.id ?? null,
      };
    }

    if (task.status === "failed") {
      return { taskStatus: "failed" as const, suggestion: null, id: null, error: task.errorMessage };
    }

    return { taskStatus: task.status as "pending" | "processing", suggestion: null, id: null };
  }),

  applySuggestion: requirePermission('ai:hub:access').input(z.union([
    z.number(),
    z.string(),
    z.object({
      suggestionId: z.union([z.string(), z.number()]).optional(),
      actionId: z.string().optional(),
      actionName: z.string().optional(),
    }),
  ])).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = typeof input === "object" ? toNum(input.suggestionId || 0) : toNum(input);

    if (!numId || numId <= 0) {
      return { success: false, data: null, error: "Invalid suggestion ID" };
    }

    await db.update(aiProcessSuggestions).set({
      isApplied: 1,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProcessSuggestions.id, numId));

    const inputObj = typeof input === "object" ? input : {};
    const executorName = ctx.user!.name ?? `User#${ctx.user!.id}`;
    const [log] = await db.insert(aiSuggestionExecutionLogs).values({
      suggestionId: numId,
      actionId: (inputObj as any).actionId || `ACT-${Date.now()}`,
      actionName: (inputObj as any).actionName || "应用建议",
      executedBy: executorName,
      status: "completed",
      result: "建议已应用",
    }).returning();

    return { success: true, data: log };
  }),

  recordFeedback: requirePermission('ai:hub:access').input(z.object({
    suggestionId: z.union([z.string(), z.number()]),
    result: z.string().optional(),
    isPositive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const resultText = input.result || (input.isPositive ? "positive" : "negative");
    await db.update(aiProcessSuggestions).set({
      applyResult: resultText,
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProcessSuggestions.id, toNum(input.suggestionId)));
    return { success: true };
  }),
});

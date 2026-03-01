import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiNotebookSuggestions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const aiNotebookRouter = router({
  getSuggestions: protectedProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiNotebookSuggestions).orderBy(desc(aiNotebookSuggestions.createdAt)).limit(1000);
    if (input?.entryId) items = items.filter(s => s.entryId === toNum(input.entryId));
    if (input?.status) items = items.filter(s => s.status === input.status);
    return items;
  }),

  /**
   * analyzeEntry — async LLM-powered notebook entry analysis
   * Submits to task queue, returns taskId for polling via getAnalysisStatus.
   */
  analyzeEntry: protectedProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]),
    content: z.string().optional(),
    processType: z.string().optional(),
    processId: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { entryId, content, processType, processId } = input;

    if (!content || content.trim().length === 0) {
      return { success: true, message: "无内容可分析", suggestions: [], taskId: null };
    }

    const { taskId } = await submitTask(
      "AI_NOTEBOOK_ANALYZE",
      { entryId: toNum(entryId), content, processType, processId },
      ctx.user.name ?? `User#${ctx.user.id}`,
    );

    return { success: true, message: "分析任务已提交", suggestions: [], taskId };
  }),

  /** Poll for notebook analysis status */
  getAnalysisStatus: protectedProcedure.input(z.object({
    taskId: z.number(),
  })).query(async ({ input }) => {
    const task = await getTaskStatus(input.taskId);
    if (!task) return { taskStatus: "not_found" as const, suggestions: [] };

    if (task.status === "completed" && task.resultData) {
      const result = task.resultData as Record<string, unknown>;
      return {
        taskStatus: "completed" as const,
        suggestions: (result.suggestions as unknown[]) ?? [],
        message: result.message as string,
      };
    }

    if (task.status === "failed") {
      return { taskStatus: "failed" as const, suggestions: [], error: task.errorMessage };
    }

    return { taskStatus: task.status as "pending" | "processing", suggestions: [] };
  }),

  acceptSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
    acceptedValue: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "accepted",
      acceptedValue: input.acceptedValue,
      acceptedBy: ctx.user.id,
      acceptedAt: new Date().toISOString(),
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),

  rejectSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "rejected",
      acceptedBy: ctx.user.id,
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),
});

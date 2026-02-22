import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiProcessSuggestions, aiSuggestionExecutionLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const aiSuggestionRouter = router({
  getSuggestions: publicProcedure.input(z.object({
    processType: z.string().optional(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiProcessSuggestions).orderBy(desc(aiProcessSuggestions.createdAt));
    if (input?.processType) items = items.filter(s => s.processType === input.processType);
    if (input?.processId) items = items.filter(s => s.processId === input.processId);
    if (input?.stepCode) items = items.filter(s => s.stepCode === input.stepCode);
    return items;
  }),

  applySuggestion: protectedProcedure.input(z.union([
    z.number(),
    z.string(),
    z.object({
      suggestionId: z.union([z.string(), z.number()]).optional(),
      actionId: z.string().optional(),
      actionName: z.string().optional(),
      executedBy: z.string().optional(),
    }),
  ])).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input === "object" ? toNum(input.suggestionId || 0) : toNum(input);

    await db.update(aiProcessSuggestions).set({
      isApplied: 1,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProcessSuggestions.id, numId));

    const inputObj = typeof input === "object" ? input : {};
    const [log] = await db.insert(aiSuggestionExecutionLogs).values({
      suggestionId: numId,
      actionId: (inputObj as any).actionId || `ACT-${Date.now()}`,
      actionName: (inputObj as any).actionName || "应用建议",
      executedBy: (inputObj as any).executedBy || "system",
      status: "completed",
      result: "建议已应用",
    }).returning();

    return { success: true, data: log };
  }),

  recordFeedback: protectedProcedure.input(z.object({
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

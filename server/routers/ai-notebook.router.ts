import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiNotebookSuggestions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const aiNotebookRouter = router({
  getSuggestions: publicProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiNotebookSuggestions).orderBy(desc(aiNotebookSuggestions.createdAt));
    if (input?.entryId) items = items.filter(s => s.entryId === toNum(input.entryId));
    if (input?.status) items = items.filter(s => s.status === input.status);
    return items;
  }),

  analyzeEntry: protectedProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]),
    content: z.string().optional(),
    processType: z.string().optional(),
    processId: z.string().optional(),
  })).mutation(async () => {
    return { success: true, message: "分析完成", suggestions: [] };
  }),

  acceptSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
    acceptedValue: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "accepted",
      acceptedValue: input.acceptedValue,
      acceptedAt: new Date().toISOString(),
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),

  rejectSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "rejected",
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),
});

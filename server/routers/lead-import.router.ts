import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { leadImportLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const leadImportRouter = router({
  getImportHistory: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(leadImportLogs).orderBy(desc(leadImportLogs.createdAt)).limit(50);
  }),

  import: protectedProcedure.input(z.object({
    fileName: z.string(),
    totalRows: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [log] = await db.insert(leadImportLogs).values({
      userId: ctx.user.id,
      fileName: input.fileName,
      totalRows: input.totalRows || 0,
      successCount: 0,
      failedCount: 0,
      status: "processing",
    }).returning();
    return { success: true, data: log };
  }),

  importFromCSV: protectedProcedure.input(z.object({
    fileName: z.string(),
    data: z.array(z.record(z.string(), z.any())).optional(),
    totalRows: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [log] = await db.insert(leadImportLogs).values({
      userId: ctx.user.id,
      fileName: input.fileName,
      totalRows: input.totalRows || input.data?.length || 0,
      successCount: input.data?.length || 0,
      failedCount: 0,
      status: "completed",
    }).returning();
    return { success: true, data: log };
  }),
});

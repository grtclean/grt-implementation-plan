/**
 * AI Task Queue Router
 *
 * General-purpose async AI task management (HR_CAPABILITY_PARSING, etc.)
 * Supports: create → poll status → retrieve result
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { jsonValue } from "@shared/validators";
import { aiTasks } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ─── ensureTables ────────────────────────────────────────────
let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_tasks (
        id SERIAL PRIMARY KEY,
        task_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        input_data JSONB,
        result_data JSONB,
        error_message VARCHAR(500),
        created_by VARCHAR(50),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_tasks_type_idx ON ai_tasks (task_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_tasks_status_idx ON ai_tasks (status)`);
    tablesEnsured = true;
  } catch (err) {
    console.warn("[AI Task] ensureTables failed:", err);
  }
}

// ─── Router ──────────────────────────────────────────────────
export const aiTaskRouter = router({
  /** Create a new AI task */
  create: protectedProcedure
    .input(z.object({
      taskType: z.string().max(50),
      inputData: z.record(z.string(), jsonValue).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ensureTables();
      const db = await requireDb();
      const [row] = await db.insert(aiTasks).values({
        taskType: input.taskType,
        inputData: (input.inputData ?? {}) as Record<string, unknown>,
        status: "pending",
        createdBy: ctx.user?.name ?? "system",
      }).returning();
      return { id: row.id, status: row.status };
    }),

  /** Get task by ID (poll for status + result) */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [task] = await db.select().from(aiTasks).where(eq(aiTasks.id, input.id)).limit(1000);
      if (!task) throw new Error("Task not found");
      return task;
    }),

  /** List tasks with optional type/status filter */
  list: protectedProcedure
    .input(z.object({
      taskType: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const filters = [];
      if (input?.taskType) filters.push(eq(aiTasks.taskType, input.taskType));
      if (input?.status) filters.push(eq(aiTasks.status, input.status));

      const rows = await db.select().from(aiTasks)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(aiTasks.createdAt))
        .limit(input?.limit ?? 20);
      return rows;
    }),

  /** Mark task as processing (worker picks it up) */
  markProcessing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.update(aiTasks)
        .set({ status: "processing", startedAt: new Date().toISOString() })
        .where(and(eq(aiTasks.id, input.id), eq(aiTasks.status, "pending")));
      return { success: true };
    }),

  /** Complete task with result data */
  complete: protectedProcedure
    .input(z.object({
      id: z.number(),
      resultData: z.record(z.string(), jsonValue),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.update(aiTasks)
        .set({
          status: "completed",
          resultData: input.resultData as Record<string, unknown>,
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiTasks.id, input.id));
      return { success: true };
    }),

  /** Fail task with error message */
  fail: protectedProcedure
    .input(z.object({
      id: z.number(),
      errorMessage: z.string().max(500),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.update(aiTasks)
        .set({
          status: "failed",
          errorMessage: input.errorMessage,
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiTasks.id, input.id));
      return { success: true };
    }),

  /** Dashboard stats — count by status */
  stats: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const rows = await db.select({
      status: aiTasks.status,
      count: sql<number>`count(*)::int`,
    }).from(aiTasks).groupBy(aiTasks.status);

    const counts: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const r of rows) counts[r.status] = r.count;
    return counts;
  }),
});

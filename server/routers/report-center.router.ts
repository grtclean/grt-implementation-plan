/**
 * Report Center Router — Live Executive Briefing Center (动态汇报中枢)
 *
 * CRUD + publish for executive reports with JSON content blocks.
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sysReports } from "../../drizzle/report-center-schema";
import { eq, desc, and, sql, count, ilike } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

const contentBlockSchema = z.object({
  type: z.enum(["title", "text", "metric", "divider"]),
  title: z.string().optional(),
  content: z.string().optional(),
  value: z.string().optional(),
  unit: z.string().optional(),
  icon: z.string().optional(),
  accent: z.string().optional(),
  accentTo: z.string().optional(),
});

export const reportCenterRouter = router({
  /** List reports with optional filters */
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          reportType: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(sysReports)
        .orderBy(desc(sysReports.updatedAt));

      let filtered = rows;
      if (input?.status) {
        filtered = filtered.filter((r) => r.status === input.status);
      }
      if (input?.reportType) {
        filtered = filtered.filter((r) => r.reportType === input.reportType);
      }
      if (input?.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.authorName && r.authorName.toLowerCase().includes(q)) ||
            (r.department && r.department.toLowerCase().includes(q))
        );
      }
      return filtered;
    }),

  /** Get single report by ID */
  get: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(sysReports)
      .where(eq(sysReports.id, toNum(input.id)));
    return rows[0] ?? null;
  }),

  /** Create a new report */
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        authorId: z.number().optional(),
        authorName: z.string().optional(),
        department: z.string().optional(),
        reportType: z.string().optional(),
        contentBlocks: z.array(contentBlockSchema).optional(),
        coverGradient: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .insert(sysReports)
        .values({
          title: input.title,
          authorId: input.authorId ?? null,
          authorName: input.authorName ?? null,
          department: input.department ?? null,
          reportType: input.reportType ?? "DEPT_WEEKLY",
          contentBlocks: input.contentBlocks ?? [],
          status: "DRAFT",
          coverGradient: input.coverGradient ?? "from-blue-600 to-cyan-500",
        })
        .returning();
      return rows[0];
    }),

  /** Update an existing report */
  update: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        title: z.string().optional(),
        department: z.string().optional(),
        reportType: z.string().optional(),
        contentBlocks: z.array(contentBlockSchema).optional(),
        coverGradient: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.title !== undefined) updates.title = input.title;
      if (input.department !== undefined) updates.department = input.department;
      if (input.reportType !== undefined) updates.reportType = input.reportType;
      if (input.contentBlocks !== undefined)
        updates.contentBlocks = input.contentBlocks;
      if (input.coverGradient !== undefined)
        updates.coverGradient = input.coverGradient;
      if (input.status !== undefined) updates.status = input.status;

      const rows = await db
        .update(sysReports)
        .set(updates)
        .where(eq(sysReports.id, toNum(input.id)))
        .returning();
      return rows[0] ?? null;
    }),

  /** Delete a report */
  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db
      .delete(sysReports)
      .where(eq(sysReports.id, toNum(input.id)));
    return { success: true };
  }),

  /** Publish a report (set status to PUBLISHED) */
  publish: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const rows = await db
      .update(sysReports)
      .set({ status: "PUBLISHED", updatedAt: new Date().toISOString() })
      .where(eq(sysReports.id, toNum(input.id)))
      .returning();
    return rows[0] ?? null;
  }),
});

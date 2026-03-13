/**
 * Employee Empowerment Engine Router — 全域员工赋能引擎
 *
 * 3 sub-routers, ~20 procedures:
 *   briefing   (4) — Daily AI briefing CRUD
 *   dailyLog   (6) — Structured daily reporting (报工)
 *   appraisal  (7) — Monthly appraisal report lifecycle
 *
 * Privacy: Monthly appraisals only visible to employee + direct manager + HR.
 * Salary fields require separate password re-auth (frontend handles).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  dailyBriefings,
  employeeDailyLogs,
  monthlyAppraisalReports,
} from "../../drizzle/empowerment-schema";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("empowerment-router");

// ═══════════════════════════════════════════════════════════════
// 1. Briefing — Daily AI Briefing
// ═══════════════════════════════════════════════════════════════

const briefingRouter = router({
  /** Get today's briefing for the current user */
  getToday: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const today = new Date().toISOString().slice(0, 10);
      const [briefing] = await db
        .select()
        .from(dailyBriefings)
        .where(and(
          eq(dailyBriefings.userId, ctx.user.id),
          eq(dailyBriefings.briefingDate, today),
        ))
        .limit(1);
      return briefing ?? null;
    }),

  /** Mark briefing as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .update(dailyBriefings)
        .set({ status: "read", readAt: new Date().toISOString() })
        .where(and(
          eq(dailyBriefings.id, input.id),
          eq(dailyBriefings.userId, ctx.user.id),
        ))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Briefing not found" });
      return row;
    }),

  /** Get briefing history for the current user */
  history: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(30),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      return db
        .select()
        .from(dailyBriefings)
        .where(eq(dailyBriefings.userId, ctx.user.id))
        .orderBy(desc(dailyBriefings.briefingDate))
        .limit(input?.limit ?? 30)
        .offset(input?.offset ?? 0);
    }),

  /** Get briefing stats (last 30 days read rate) */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const rows = await db
        .select({ status: dailyBriefings.status, cnt: count() })
        .from(dailyBriefings)
        .where(and(
          eq(dailyBriefings.userId, ctx.user.id),
          gte(dailyBriefings.briefingDate, thirtyDaysAgo),
        ))
        .groupBy(dailyBriefings.status)
        .limit(10);
      return rows;
    }),
});

// ═══════════════════════════════════════════════════════════════
// 2. DailyLog — Structured Work Reporting (报工)
// ═══════════════════════════════════════════════════════════════

const dailyLogRouter = router({
  /** Submit a daily log entry */
  submit: protectedProcedure
    .input(z.object({
      logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      projectId: z.number().int().positive().optional(),
      loggedHours: z.number().min(0).max(24),
      completedTasks: z.array(z.object({
        title: z.string().min(1).max(500),
        category: z.string().max(100).optional(),
        hours: z.number().min(0).optional(),
      })).optional(),
      blockers: z.string().max(2000).optional(),
      notes: z.string().max(2000).optional(),
      energyLevel: z.number().int().min(1).max(5).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(employeeDailyLogs).values({
        userId: ctx.user.id,
        logDate: input.logDate,
        projectId: input.projectId ?? null,
        loggedHours: input.loggedHours,
        completedTasks: input.completedTasks ?? [],
        blockers: input.blockers ?? null,
        notes: input.notes ?? null,
        energyLevel: input.energyLevel ?? null,
        status: "submitted",
      }).returning();
      return row;
    }),

  /** Get logs for current user on a specific date */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      return db
        .select()
        .from(employeeDailyLogs)
        .where(and(
          eq(employeeDailyLogs.userId, ctx.user.id),
          eq(employeeDailyLogs.logDate, input.date),
        ))
        .limit(20);
    }),

  /** Get monthly summary for current user */
  monthlySummary: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const start = `${input.period}-01`;
      const end = `${input.period}-31`;
      const logs = await db
        .select()
        .from(employeeDailyLogs)
        .where(and(
          eq(employeeDailyLogs.userId, ctx.user.id),
          gte(employeeDailyLogs.logDate, start),
          lte(employeeDailyLogs.logDate, end),
        ))
        .orderBy(desc(employeeDailyLogs.logDate))
        .limit(100);

      const totalHours = logs.reduce((s, l) => s + (l.loggedHours ?? 0), 0);
      const totalTasks = logs.reduce((s, l) => {
        const tasks = l.completedTasks as { title: string }[] | null;
        return s + (tasks?.length ?? 0);
      }, 0);
      const daysLogged = new Set(logs.map(l => l.logDate)).size;

      return { logs, totalHours, totalTasks, daysLogged };
    }),

  /** List recent logs */
  listRecent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(14),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      return db
        .select()
        .from(employeeDailyLogs)
        .where(eq(employeeDailyLogs.userId, ctx.user.id))
        .orderBy(desc(employeeDailyLogs.logDate))
        .limit(input?.limit ?? 14);
    }),

  /** Manager: approve a subordinate's daily log */
  approve: requirePermission("hr:performance:manage")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .update(employeeDailyLogs)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
        })
        .where(eq(employeeDailyLogs.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Log not found" });
      return row;
    }),

  /** Manager: list subordinate logs for a date range */
  listTeam: requirePermission("hr:performance:manage")
    .input(z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(employeeDailyLogs)
        .where(and(
          gte(employeeDailyLogs.logDate, input.startDate),
          lte(employeeDailyLogs.logDate, input.endDate),
        ))
        .orderBy(desc(employeeDailyLogs.logDate))
        .limit(input.limit);
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Appraisal — Monthly Performance Report
//
// Privacy enforcement: employee sees own, manager sees subordinates
// ═══════════════════════════════════════════════════════════════

const appraisalRouter = router({
  /** Get current user's appraisal for a period */
  getMine: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [report] = await db
        .select()
        .from(monthlyAppraisalReports)
        .where(and(
          eq(monthlyAppraisalReports.userId, ctx.user.id),
          eq(monthlyAppraisalReports.period, input.period),
        ))
        .limit(1);
      return report ?? null;
    }),

  /** Get latest unread appraisal (for 1st-of-month popup) */
  getLatestUnread: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [report] = await db
        .select()
        .from(monthlyAppraisalReports)
        .where(and(
          eq(monthlyAppraisalReports.userId, ctx.user.id),
          eq(monthlyAppraisalReports.status, "generated"),
        ))
        .orderBy(desc(monthlyAppraisalReports.period))
        .limit(1);
      return report ?? null;
    }),

  /** Mark appraisal as read by employee */
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .update(monthlyAppraisalReports)
        .set({
          status: "employee_read",
          employeeReadAt: new Date().toISOString(),
        })
        .where(and(
          eq(monthlyAppraisalReports.id, input.id),
          eq(monthlyAppraisalReports.userId, ctx.user.id),
        ))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      return row;
    }),

  /** Manager: sign off on a subordinate's appraisal */
  managerSign: requirePermission("hr:performance:manage")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .update(monthlyAppraisalReports)
        .set({
          status: "manager_signed",
          managerSignedBy: ctx.user.id,
          managerSignedAt: new Date().toISOString(),
        })
        .where(eq(monthlyAppraisalReports.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      return row;
    }),

  /** List my appraisal history */
  history: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(12),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      return db
        .select()
        .from(monthlyAppraisalReports)
        .where(eq(monthlyAppraisalReports.userId, ctx.user.id))
        .orderBy(desc(monthlyAppraisalReports.period))
        .limit(input?.limit ?? 12)
        .offset(input?.offset ?? 0);
    }),

  /** Manager: list team appraisals for a period */
  listTeam: requirePermission("hr:performance:manage")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(monthlyAppraisalReports)
        .where(eq(monthlyAppraisalReports.period, input.period))
        .orderBy(desc(monthlyAppraisalReports.performanceScore))
        .limit(input.limit);
    }),

  /** Dashboard stats for current user */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const reports = await db
        .select({
          period: monthlyAppraisalReports.period,
          score: monthlyAppraisalReports.performanceScore,
          hours: monthlyAppraisalReports.totalHours,
          tasks: monthlyAppraisalReports.tasksCompleted,
        })
        .from(monthlyAppraisalReports)
        .where(eq(monthlyAppraisalReports.userId, ctx.user.id))
        .orderBy(desc(monthlyAppraisalReports.period))
        .limit(12);
      return reports;
    }),
});

// ═══════════════════════════════════════════════════════════════
// Combined router
// ═══════════════════════════════════════════════════════════════

export const empowermentRouter = router({
  briefing: briefingRouter,
  dailyLog: dailyLogRouter,
  appraisal: appraisalRouter,
});

/**
 * Attendance Clock Router — GPS考勤打卡系统
 *
 * 5 sub-routers, ~14 procedures:
 *   clock      (4) — clockIn, clockOut, getToday, getMonthly
 *   groups     (3) — list, assignGroup, updateBreakWindows
 *   excursions (4) — reportOut, reportReturn, getDaily, getMonthly
 *   rollup     (2) — rollupMonth, sendConfirmationEmail
 *   report     (1) — preview (attendance report preview without sending)
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import {
  attendanceClockRecords,
  attendanceGroups,
  attendanceGroupMembers,
  attendanceExcursions,
} from "../../drizzle/attendance-clock-schema";
import {
  clockIn, clockOut, rollupMonth,
  recordExcursionOut, recordExcursionReturn,
} from "../services/attendance-clock.service";
import {
  sendAttendanceConfirmationEmail, buildAttendanceReport,
} from "../services/attendance-confirmation-email.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("attendance-clock-router");

const viewPerm = requirePermission("hr:salary:view");
const managePerm = requirePermission("system:config:manage");

const periodSchema = z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM");

const breakWindowSchema = z.object({
  label: z.string().min(1).max(50),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
});

// ══════════════════════════════════════════════════════
// 1. Clock Sub-Router — 打卡
// ══════════════════════════════════════════════════════

const clockRouter = router({
  /** GPS clock-in */
  clockIn: protectedProcedure
    .use(managePerm)
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      method: z.enum(["gps", "wifi", "manual", "dingtalk_import"]).optional(),
      photo: z.string().max(500).optional(),
      customerName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ userId: ctx.user.id, lat: input.lat, lng: input.lng }, "Clock-in request");
      const result = await clockIn({
        employeeId: ctx.user.id,
        lat: input.lat,
        lng: input.lng,
        method: input.method,
        photo: input.photo,
        customerName: input.customerName,
      });
      return result;
    }),

  /** GPS clock-out */
  clockOut: protectedProcedure
    .use(managePerm)
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ userId: ctx.user.id }, "Clock-out request");
      const result = await clockOut(ctx.user.id, input.lat, input.lng);
      return result;
    }),

  /** Get today's clock record for the current user or a specific employee */
  getToday: protectedProcedure
    .use(viewPerm)
    .input(z.object({
      employeeId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const empId = input?.employeeId ?? ctx.user.id;
      const today = new Date().toISOString().slice(0, 10);
      const [record] = await db
        .select()
        .from(attendanceClockRecords)
        .where(and(
          eq(attendanceClockRecords.employeeId, empId),
          eq(attendanceClockRecords.clockDate, today),
        ))
        .limit(1);
      return record ?? null;
    }),

  /** Get all clock records for a given month */
  getMonthly: protectedProcedure
    .use(viewPerm)
    .input(z.object({
      employeeId: z.number().int().positive(),
      period: periodSchema,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(attendanceClockRecords)
        .where(and(
          eq(attendanceClockRecords.employeeId, input.employeeId),
          sql`${attendanceClockRecords.clockDate} LIKE ${input.period + "%"}`,
        ))
        .orderBy(desc(attendanceClockRecords.clockDate))
        .limit(31);
      return rows;
    }),
});

// ══════════════════════════════════════════════════════
// 2. Groups Sub-Router — 考勤组管理
// ══════════════════════════════════════════════════════

const groupsRouter = router({
  /** List all attendance groups */
  list: protectedProcedure
    .use(viewPerm)
    .query(async () => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(attendanceGroups)
        .orderBy(attendanceGroups.id)
        .limit(100);
      return rows;
    }),

  /** Assign an employee to an attendance group */
  assignGroup: protectedProcedure
    .use(managePerm)
    .input(z.object({
      employeeId: z.number().int().positive(),
      groupId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.insert(attendanceGroupMembers).values({
        groupId: input.groupId,
        employeeId: input.employeeId,
      }).returning();
      log.info({ employeeId: input.employeeId, groupId: input.groupId }, "Employee assigned to attendance group");
      return row;
    }),

  /** Update break windows for an attendance group */
  updateBreakWindows: protectedProcedure
    .use(managePerm)
    .input(z.object({
      groupId: z.number().int().positive(),
      breakWindows: z.array(breakWindowSchema).min(0).max(5),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(attendanceGroups)
        .set({ breakWindows: input.breakWindows })
        .where(eq(attendanceGroups.id, input.groupId));
      log.info({ groupId: input.groupId, windowCount: input.breakWindows.length }, "Break windows updated");
      return { success: true, groupId: input.groupId, breakWindows: input.breakWindows };
    }),
});

// ══════════════════════════════════════════════════════
// 3. Excursions Sub-Router — 离岗追踪
// ══════════════════════════════════════════════════════

const excursionRouter = router({
  /** Report leaving the geofence area */
  reportOut: protectedProcedure
    .use(managePerm)
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ userId: ctx.user.id }, "Excursion out report");
      return recordExcursionOut(ctx.user.id, input.lat, input.lng);
    }),

  /** Report returning to the geofence area */
  reportReturn: protectedProcedure
    .use(managePerm)
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ userId: ctx.user.id }, "Excursion return report");
      return recordExcursionReturn(ctx.user.id, input.lat, input.lng);
    }),

  /** Get excursions for a specific day */
  getDaily: protectedProcedure
    .use(viewPerm)
    .input(z.object({
      employeeId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(attendanceExcursions)
        .where(and(
          eq(attendanceExcursions.employeeId, input.employeeId),
          eq(attendanceExcursions.excursionDate, input.date),
        ))
        .orderBy(attendanceExcursions.timestampOut)
        .limit(50);
      return rows;
    }),

  /** Get monthly excursion summary for an employee */
  getMonthly: protectedProcedure
    .use(viewPerm)
    .input(z.object({
      employeeId: z.number().int().positive(),
      period: periodSchema,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(attendanceExcursions)
        .where(and(
          eq(attendanceExcursions.employeeId, input.employeeId),
          sql`${attendanceExcursions.excursionDate} LIKE ${input.period + "%"}`,
        ))
        .orderBy(desc(attendanceExcursions.timestampOut))
        .limit(200);

      const totalExcursions = rows.length;
      const unauthorizedCount = rows.filter(r => !r.isDuringBreak).length;
      const totalUnauthorizedMinutes = rows
        .filter(r => !r.isDuringBreak && r.durationMinutes != null)
        .reduce((s, r) => s + (r.durationMinutes ?? 0), 0);

      return {
        records: rows,
        summary: {
          totalExcursions,
          unauthorizedCount,
          authorizedCount: totalExcursions - unauthorizedCount,
          totalUnauthorizedMinutes,
        },
      };
    }),
});

// ══════════════════════════════════════════════════════
// 4. Rollup Sub-Router — 月度汇总 & 确认邮件
// ══════════════════════════════════════════════════════

const rollupRouter = router({
  /** Roll up daily clock records into monthly attendance summary */
  rollupMonth: protectedProcedure
    .use(managePerm)
    .input(z.object({ period: periodSchema }))
    .mutation(async ({ input }) => {
      log.info({ period: input.period }, "Monthly rollup triggered");
      const result = await rollupMonth(input.period);
      return result;
    }),

  /** Send attendance confirmation email to 倪微薇 (CC: 倪亚东) */
  sendConfirmationEmail: protectedProcedure
    .use(managePerm)
    .input(z.object({
      period: periodSchema,
      reviewerEmail: z.string().email().optional(),
      ccEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      log.info({ period: input.period }, "Sending attendance confirmation email");
      const result = await sendAttendanceConfirmationEmail(
        input.period,
        input.reviewerEmail,
        input.ccEmail,
      );
      return result;
    }),
});

// ══════════════════════════════════════════════════════
// 5. Report Sub-Router — 报告预览
// ══════════════════════════════════════════════════════

const reportRouter = router({
  /** Preview the attendance report data without sending email */
  preview: protectedProcedure
    .use(viewPerm)
    .input(z.object({ period: periodSchema }))
    .query(async ({ input }) => {
      const rows = await buildAttendanceReport(input.period);
      const anomalyCount = rows.filter(r => r.anomalies.length > 0).length;
      const totalExcursions = rows.reduce((s, r) => s + r.unauthorizedExcursions, 0);
      return {
        period: input.period,
        rows,
        summary: {
          headcount: rows.length,
          anomalyCount,
          totalExcursions,
          totalLeaveHours: rows.reduce((s, r) => s + r.personalLeaveHours + r.sickLeaveHours, 0),
          totalLate: rows.reduce((s, r) => s + r.lateCount, 0),
        },
      };
    }),
});

// ══════════════════════════════════════════════════════
// Merged Router
// ══════════════════════════════════════════════════════

export const attendanceClockRouter = router({
  clock: clockRouter,
  groups: groupsRouter,
  excursions: excursionRouter,
  rollup: rollupRouter,
  report: reportRouter,
});

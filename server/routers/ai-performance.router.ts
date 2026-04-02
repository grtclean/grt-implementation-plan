/**
 * AI Performance Engine Router — 4-dimension meeting scores
 *
 * Queries real DB tables:
 *   - hr_ai_performance: Monthly 4D scores per user
 *   - meeting_action_items: Action item completion tracking
 *   - meeting_attendance: Real meeting attendance for score calculation
 *
 * 4D Dimensions (mapped to DB columns):
 *   participation (会议参与) → breadthScore column
 *   execution (执行力)       → depthScore column
 *   collaboration (协作)     → executionScore column
 *   innovation (创新)        → disciplineScore column
 *
 * Provides:
 *   - dashboard: aggregate KPIs (avg score, completion rate, top performer)
 *   - leaderboard: ranked employee list by meeting score
 *   - actionItemStats: monthly action item completion trend
 *   - userDetail: single user's performance detail
 *   - recalculateUser: compute scores from real meeting data for one user
 *   - recalculateAll: compute scores from real meeting data for all users in a month
 *   - seedDemo: insert seed data for demos
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, sql, count, and, gte, lte } from "drizzle-orm";
import { hrAiPerformance, meetingActionItems, meetingAttendance, meetingInteractions } from "../../drizzle/smart-meetings-schema";
import { calculateMonthlyScore } from "../services/ai-performance-engine.service";

export const aiPerformanceRouter = router({
  /** Legacy stub — kept for backward compat, scoped by role */
  getScores: protectedProcedure
    .input(z.object({ meetingId: z.number().optional(), userId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const HR_ROLES = new Set(["admin", "director", "hr_manager", "dept_manager"]);
        const targetUserId = input?.userId ?? ctx.user!.id;
        // Non-HR roles can only see own data
        if (targetUserId !== ctx.user!.id && !HR_ROLES.has(ctx.user!.role ?? "employee")) {
          return { items: [], total: 0 };
        }
        const rows = await db.select().from(hrAiPerformance)
          .where(eq(hrAiPerformance.userId, targetUserId))
          .orderBy(desc(hrAiPerformance.month)).limit(1000);
        return { items: rows, total: rows.length };
      } catch {
        return { items: [], total: 0 };
      }
    }),

  /** Dashboard aggregate KPIs from hr_ai_performance (user-scoped for non-admin) */
  dashboard: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const EMPTY = {
        avgMeetingScore: 0,
        actionItemCompletionRate: 0,
        employeesEvaluated: 0,
        topPerformer: null as { name: string; score: number } | null,
      };
      try {
        const db = await requireDb();
        // Get latest month's data
        const latestMonth = await db.select({ month: hrAiPerformance.month })
          .from(hrAiPerformance)
          .orderBy(desc(hrAiPerformance.month))
          .limit(1);

        if (latestMonth.length === 0) return EMPTY;

        const targetMonth = latestMonth[0].month;

        // Non-admin roles: scope to own data only
        const role = ctx.user?.role ?? "employee";
        const GLOBAL_ROLES = new Set(["admin", "director", "hr_manager"]);
        const isGlobal = GLOBAL_ROLES.has(role);

        const conditions = [eq(hrAiPerformance.month, targetMonth)];
        if (!isGlobal && ctx.user?.id) {
          conditions.push(eq(hrAiPerformance.userId, ctx.user.id));
        }

        const monthData = await db.select().from(hrAiPerformance)
          .where(and(...conditions))
          .orderBy(desc(hrAiPerformance.meetingScore)).limit(1000);

        const avgScore = monthData.length > 0
          ? Math.round(monthData.reduce((s, r) => s + (r.meetingScore ?? 0), 0) / monthData.length)
          : 0;

        const totalItems = monthData.reduce((s, r) => s + (r.actionItemsTotal ?? 0), 0);
        const completedItems = monthData.reduce((s, r) => s + (r.actionItemsCompleted ?? 0), 0);
        const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        const top = monthData[0];

        return {
          avgMeetingScore: avgScore,
          actionItemCompletionRate: completionRate,
          employeesEvaluated: monthData.length,
          topPerformer: top ? { name: top.userName ?? `User#${top.userId}`, score: top.meetingScore ?? 0 } : null,
        };
      } catch {
        return EMPTY;
      }
    }),

  /** Leaderboard — ranked employees by meeting score (admin sees all, others see own) */
  leaderboard: protectedProcedure
    .input(z.object({ limit: z.number().default(10), month: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        let targetMonth = input.month;
        if (!targetMonth) {
          const latest = await db.select({ month: hrAiPerformance.month })
            .from(hrAiPerformance)
            .orderBy(desc(hrAiPerformance.month))
            .limit(1);
          targetMonth = latest[0]?.month;
        }
        if (!targetMonth) return [];

        const role = ctx.user?.role ?? "employee";
        const GLOBAL_ROLES = new Set(["admin", "director", "hr_manager"]);
        const conditions = [eq(hrAiPerformance.month, targetMonth)];
        if (!GLOBAL_ROLES.has(role) && ctx.user?.id) {
          conditions.push(eq(hrAiPerformance.userId, ctx.user.id));
        }

        const rows = await db.select().from(hrAiPerformance)
          .where(and(...conditions))
          .orderBy(desc(hrAiPerformance.meetingScore))
          .limit(input.limit);

        // Map DB columns to semantic 4D dimension names
        return rows.map(r => ({
          userId: r.userId,
          userName: r.userName ?? `User#${r.userId}`,
          department: "",
          meetingScore: r.meetingScore ?? 0,
          // New 4D dimension names (mapped from DB columns)
          participation: r.breadthScore ?? 0,     // 会议参与
          execution: r.depthScore ?? 0,            // 执行力
          collaboration: r.executionScore ?? 0,    // 协作
          innovation: r.disciplineScore ?? 0,      // 创新
          // Legacy aliases for backward compatibility
          breadth: r.breadthScore ?? 0,
          depth: r.depthScore ?? 0,
          actionItemRate: r.actionItemsTotal
            ? Math.round(((r.actionItemsCompleted ?? 0) / r.actionItemsTotal) * 100)
            : 0,
          meetingsAttended: r.meetingsAttended ?? 0,
          meetingsTotal: r.meetingsTotal ?? 0,
        }));
      } catch {
        return [];
      }
    }),

  /** Monthly action item completion trend from meeting_action_items */
  actionItemStats: protectedProcedure
    .input(z.object({ months: z.number().default(6) }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        // Aggregate action items by month
        const rows = await db.execute(sql`
          SELECT
            TO_CHAR(created_at, 'YYYY-MM') AS month,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
            COUNT(*) FILTER (WHERE status = 'OVERDUE')::int AS overdue
          FROM meeting_action_items
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          ORDER BY month DESC
          LIMIT ${input.months}
        `);

        const items = ((rows.rows ?? []) as any[]).reverse().map((r: any) => ({
          month: r.month,
          total: Number(r.total) || 0,
          completed: Number(r.completed) || 0,
          overdue: Number(r.overdue) || 0,
          rate: (Number(r.total) || 0) > 0
            ? Math.round(((Number(r.completed) || 0) / (Number(r.total) || 1)) * 100)
            : 0,
        }));

        return items;
      } catch {
        return [];
      }
    }),

  /** Single user performance detail — scoped by role */
  userDetail: protectedProcedure
    .input(z.object({ userId: z.number(), months: z.number().default(6) }))
    .query(async ({ input, ctx }) => {
      try {
        const HR_ROLES = new Set(["admin", "director", "hr_manager", "dept_manager"]);
        // Non-HR roles can only see own data
        if (input.userId !== ctx.user!.id && !HR_ROLES.has(ctx.user!.role ?? "employee")) {
          return { history: [], actionItems: [] };
        }
        const db = await requireDb();
        const history = await db.select().from(hrAiPerformance)
          .where(eq(hrAiPerformance.userId, input.userId))
          .orderBy(desc(hrAiPerformance.month))
          .limit(input.months);

        const actionItems = await db.select().from(meetingActionItems)
          .where(eq(meetingActionItems.assignedTo, input.userId))
          .orderBy(desc(meetingActionItems.createdAt))
          .limit(20);

        return { history: history.reverse(), actionItems };
      } catch {
        return { history: [], actionItems: [] };
      }
    }),

  /**
   * Recalculate a single user's monthly performance from real meeting data.
   * Uses the AI Performance Engine service (calculateMonthlyScore) which reads
   * meeting_attendance, meeting_interactions, meeting_action_items, and hr_penalties
   * to produce a real 4D score (participation/execution/collaboration/innovation).
   *
   * Falls back gracefully: if the user has no attendance records for the month,
   * the service will produce zero scores (no mock data injected).
   */
  recalculateUser: requirePermission('ai:effectiveness:view')
    .input(z.object({
      userId: z.number(),
      userName: z.string().default(""),
      month: z.string().regex(/^\d{4}-\d{2}$/), // "YYYY-MM"
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const HR_ROLES = new Set(["admin", "director", "hr_manager", "dept_manager"]);
        if (input.userId !== ctx.user!.id && !HR_ROLES.has(ctx.user!.role ?? "employee")) {
          return { ok: false, message: "Insufficient permissions" };
        }
        const db = await requireDb();
        const userName = input.userName || ctx.user!.name || `User#${input.userId}`;
        await calculateMonthlyScore(db as any, input.userId, userName, input.month);
        // Fetch the updated record to return
        const [updated] = await db.select().from(hrAiPerformance)
          .where(and(eq(hrAiPerformance.userId, input.userId), eq(hrAiPerformance.month, input.month)))
          .limit(1);
        return {
          ok: true,
          userId: input.userId,
          month: input.month,
          meetingScore: updated?.meetingScore ?? 0,
          participation: updated?.breadthScore ?? 0,
          execution: updated?.depthScore ?? 0,
          collaboration: updated?.executionScore ?? 0,
          innovation: updated?.disciplineScore ?? 0,
          meetingsAttended: updated?.meetingsAttended ?? 0,
          meetingsTotal: updated?.meetingsTotal ?? 0,
        };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /**
   * Recalculate ALL users' monthly performance from real meeting data.
   * Finds every user who has at least one meeting_attendance record in the given month,
   * then calls calculateMonthlyScore for each user.
   *
   * Admin/HR only.
   */
  recalculateAll: requirePermission('ai:effectiveness:view')
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/), // "YYYY-MM"
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const ADMIN_ROLES = new Set(["admin", "director", "hr_manager"]);
        if (!ADMIN_ROLES.has(ctx.user!.role ?? "employee")) {
          return { ok: false, message: "Admin/HR role required", processed: 0 };
        }
        const db = await requireDb();
        const [year, mon] = input.month.split("-").map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0, 23, 59, 59);

        // Find distinct users with attendance records in this month
        const usersWithAttendance = await db
          .selectDistinct({
            userId: meetingAttendance.userId,
            userName: meetingAttendance.userName,
          })
          .from(meetingAttendance)
          .where(
            and(
              gte(meetingAttendance.createdAt, startDate),
              lte(meetingAttendance.createdAt, endDate)
            )
          );

        let processed = 0;
        const errors: string[] = [];

        for (const u of usersWithAttendance) {
          try {
            const name = u.userName || `User#${u.userId}`;
            await calculateMonthlyScore(db as any, u.userId, name, input.month);
            processed++;
          } catch (e: any) {
            errors.push(`User#${u.userId}: ${e.message}`);
          }
        }

        return {
          ok: true,
          month: input.month,
          processed,
          totalUsers: usersWithAttendance.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (e: any) {
        return { ok: false, message: e.message, processed: 0 };
      }
    }),

  /**
   * Seed demo data into hr_ai_performance + meeting_action_items + meeting_attendance.
   *
   * Strategy:
   *   1. If real meeting_attendance data exists, use calculateMonthlyScore
   *      from the AI Performance Engine service (real 4D scoring from DB).
   *   2. Otherwise, seed realistic meeting attendance, action items, and interactions
   *      for demo users, then compute scores from that real data.
   */
  seedDemo: requirePermission('ai:effectiveness:view').mutation(async () => {
    try {
      const db = await requireDb();

      // Check if already seeded
      const [existing] = await db.select({ value: count() }).from(hrAiPerformance);
      if (Number(existing?.value ?? 0) > 0) {
        return { ok: true, message: "Demo data already exists", count: Number(existing?.value ?? 0) };
      }

      // ── Strategy 1: Try real meeting data first ──────────────────
      const [attendanceCount] = await db.select({ value: count() }).from(meetingAttendance);
      const hasRealMeetingData = Number(attendanceCount?.value ?? 0) > 0;

      if (hasRealMeetingData) {
        // Find all distinct (userId, userName) + month combinations from attendance
        const allAttendance = await db
          .selectDistinct({
            userId: meetingAttendance.userId,
            userName: meetingAttendance.userName,
          })
          .from(meetingAttendance)
          .limit(1000);

        // Determine which months have data
        const monthRows = await db.execute(sql`
          SELECT DISTINCT TO_CHAR(created_at, 'YYYY-MM') AS month
          FROM meeting_attendance
          ORDER BY month DESC
          LIMIT 12
        `);
        const months = ((monthRows.rows ?? []) as any[]).map((r: any) => r.month as string);

        let calculatedCount = 0;
        for (const u of allAttendance) {
          for (const month of months) {
            try {
              const name = u.userName || `User#${u.userId}`;
              await calculateMonthlyScore(db as any, u.userId, name, month);
              calculatedCount++;
            } catch {
              // Skip individual failures
            }
          }
        }

        if (calculatedCount > 0) {
          return {
            ok: true,
            count: calculatedCount,
            performanceRecords: calculatedCount,
            actionItems: 0,
            month: months[0] ?? "",
            source: "real_meeting_data",
          };
        }
        // If calculation produced nothing (e.g. bad data), fall through to demo
      }

      // ── Strategy 2: Seed realistic meeting data, then compute scores ──
      const demoUsers = [
        { id: 1, name: "杨勇", dept: "项目管理部" },
        { id: 2, name: "金晓锋", dept: "质量部" },
        { id: 3, name: "戴晓燕", dept: "销售部" },
        { id: 4, name: "洪小东", dept: "研发部" },
        { id: 5, name: "李大鹏", dept: "生产部" },
        { id: 6, name: "张洵", dept: "采购部" },
        { id: 7, name: "沙建梅", dept: "人力资源" },
        { id: 8, name: "王秀萍", dept: "财务部" },
      ];

      const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
      const ATTENDANCE_STATUSES = ["PRESENT_PHYSICAL", "PRESENT_PHYSICAL", "PRESENT_ONLINE", "PRESENT_PHYSICAL", "LEAVED"];
      const ACTION_STATUSES = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "OVERDUE"];

      let totalAttendance = 0;
      let totalActionItems = 0;
      let totalInteractions = 0;

      // For each month, create 3-6 meetings with attendance + action items + interactions
      for (const month of months) {
        const [yearStr, monStr] = month.split("-");
        const yr = parseInt(yearStr);
        const mo = parseInt(monStr);
        const meetingsPerMonth = 3 + Math.floor(Math.random() * 4); // 3-6 meetings

        for (let m = 0; m < meetingsPerMonth; m++) {
          // Create a meeting
          const meetingDay = 1 + Math.floor(Math.random() * 28);
          const meetingDate = new Date(yr, mo - 1, meetingDay, 9 + Math.floor(Math.random() * 8), 0, 0);

          let meetingId: number;
          try {
            const { sysMeetings } = await import("../../drizzle/smart-meetings-schema");
            const [meeting] = await db.insert(sysMeetings).values({
              title: `${month} 第${m + 1}次部门会议`,
              type: m === 0 ? "MAJOR" : "MINOR",
              status: "ENDED",
              description: `${month}月度工作会议`,
              organizerName: demoUsers[m % demoUsers.length].name,
              organizerId: demoUsers[m % demoUsers.length].id,
              scheduledStart: meetingDate,
              scheduledEnd: new Date(meetingDate.getTime() + 90 * 60000),
              actualStart: meetingDate,
              actualEnd: new Date(meetingDate.getTime() + 85 * 60000),
              expectedAttendees: 5 + Math.floor(Math.random() * 4),
              createdAt: meetingDate,
              updatedAt: meetingDate,
            }).returning();
            meetingId = meeting.id;
          } catch {
            continue; // Skip if meeting creation fails (e.g. FK constraint)
          }

          // Random subset of users attend each meeting (5-8 users)
          const attendeeCount = 5 + Math.floor(Math.random() * Math.min(4, demoUsers.length - 4));
          const shuffledUsers = [...demoUsers].sort(() => Math.random() - 0.5);
          const attendees = shuffledUsers.slice(0, attendeeCount);

          // Seed attendance records
          const attendanceRecords = attendees.map(u => {
            const statusIdx = Math.floor(Math.random() * ATTENDANCE_STATUSES.length);
            return {
              meetingId,
              userId: u.id,
              userName: u.name,
              status: ATTENDANCE_STATUSES[statusIdx],
              checkInTime: new Date(meetingDate.getTime() + Math.floor(Math.random() * 10) * 60000),
              checkInMethod: statusIdx <= 1 ? "badge" : "online",
              createdAt: meetingDate,
              updatedAt: meetingDate,
            };
          });

          try {
            await db.insert(meetingAttendance).values(attendanceRecords);
            totalAttendance += attendanceRecords.length;
          } catch { /* skip */ }

          // Seed action items (2-4 per meeting, assigned to random attendees)
          const actionItemCount = 2 + Math.floor(Math.random() * 3);
          const actionItemRecords = [];
          for (let a = 0; a < actionItemCount; a++) {
            const assignee = attendees[Math.floor(Math.random() * attendees.length)];
            const status = ACTION_STATUSES[Math.floor(Math.random() * ACTION_STATUSES.length)];
            const dueDate = new Date(meetingDate.getTime() + (7 + Math.floor(Math.random() * 14)) * 86400000);
            actionItemRecords.push({
              meetingId,
              assignedTo: assignee.id,
              assignedToName: assignee.name,
              taskDesc: `${assignee.dept}: ${["完成月度报告", "更新项目进度", "提交质量分析", "准备客户演示", "整理技术文档"][a % 5]}`,
              status,
              dueDate,
              completedAt: status === "COMPLETED" ? new Date(dueDate.getTime() - Math.floor(Math.random() * 5) * 86400000) : null,
              createdAt: meetingDate,
              updatedAt: meetingDate,
            });
          }

          try {
            await db.insert(meetingActionItems).values(actionItemRecords);
            totalActionItems += actionItemRecords.length;
          } catch { /* skip */ }

          // Seed interactions (notes + quiz scores for most attendees)
          const interactionRecords = attendees
            .filter(() => Math.random() > 0.2) // 80% of attendees have interactions
            .map(u => {
              const notesTexts = [
                "本次会议讨论了项目进度和下一步计划，需要关注交付质量",
                "重点：客户需求变更需要评估影响范围，建议增加评审环节",
                "团队协作效率有所提升，但跨部门沟通仍需改善",
                "AI质检系统部署进展顺利，下月可进入UAT阶段",
                "海外市场拓展方案已获批准，Q2开始执行",
                "绩效考核标准需要与战略目标对齐，建议增加创新指标权重",
              ];
              const reflectionTexts = [
                "通过本次会议，我认识到跨部门协作的重要性。后续需要主动与相关部门沟通需求变更。",
                "会议中提到的AI质检方案很有启发性，可以在我负责的产线先试点。",
                "需要加强对客户反馈的跟踪机制，建立闭环管理流程。",
                "",  // some users don't submit reflections
                "海外市场策略清晰，但执行层面需要更细化的行动方案。",
                "",
              ];
              return {
                meetingId,
                userId: u.id,
                userName: u.name,
                personalNotes: notesTexts[Math.floor(Math.random() * notesTexts.length)],
                aiQuizScore: 40 + Math.floor(Math.random() * 60), // 40-100
                takeawayReflection: reflectionTexts[Math.floor(Math.random() * reflectionTexts.length)] || null,
                createdAt: meetingDate,
                updatedAt: meetingDate,
              };
            });

          try {
            if (interactionRecords.length > 0) {
              await db.insert(meetingInteractions).values(interactionRecords);
              totalInteractions += interactionRecords.length;
            }
          } catch { /* skip */ }
        }
      }

      // Now compute scores from the seeded real data
      let calculatedCount = 0;
      for (const user of demoUsers) {
        for (const month of months) {
          try {
            await calculateMonthlyScore(db as any, user.id, user.name, month);
            calculatedCount++;
          } catch {
            // Skip individual failures
          }
        }
      }

      return {
        ok: true,
        count: calculatedCount,
        performanceRecords: calculatedCount,
        actionItems: totalActionItems,
        month: months[months.length - 1],
        source: "seeded_meeting_data",
        details: {
          meetings: months.length * 4, // approximate
          attendanceRecords: totalAttendance,
          interactionRecords: totalInteractions,
          actionItemRecords: totalActionItems,
        },
      };
    } catch (e: any) {
      return { ok: false, count: 0, message: e.message };
    }
  }),
});

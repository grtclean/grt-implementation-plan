/**
 * AI Performance Engine Router — 4-dimension meeting scores
 *
 * Queries real DB tables:
 *   - hr_ai_performance: Monthly 4D scores per user
 *   - meeting_action_items: Action item completion tracking
 *
 * Provides:
 *   - dashboard: aggregate KPIs (avg score, completion rate, top performer)
 *   - leaderboard: ranked employee list by meeting score
 *   - actionItemStats: monthly action item completion trend
 *   - userDetail: single user's performance detail
 *   - seedDemo: insert seed data for demos
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, sql, count, and } from "drizzle-orm";
import { hrAiPerformance, meetingActionItems } from "../../drizzle/smart-meetings-schema";

export const aiPerformanceRouter = router({
  /** Legacy stub — kept for backward compat */
  getScores: protectedProcedure
    .input(z.object({ meetingId: z.number().optional(), userId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        if (input?.userId) {
          const rows = await db.select().from(hrAiPerformance)
            .where(eq(hrAiPerformance.userId, input.userId))
            .orderBy(desc(hrAiPerformance.month));
          return { items: rows, total: rows.length };
        }
        return { items: [], total: 0 };
      } catch {
        return { items: [], total: 0 };
      }
    }),

  /** Dashboard aggregate KPIs from hr_ai_performance */
  dashboard: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        const db = await requireDb();
        // Get latest month's data
        const latestMonth = await db.select({ month: hrAiPerformance.month })
          .from(hrAiPerformance)
          .orderBy(desc(hrAiPerformance.month))
          .limit(1);

        if (latestMonth.length === 0) {
          return {
            avgMeetingScore: 0,
            actionItemCompletionRate: 0,
            employeesEvaluated: 0,
            topPerformer: null as { name: string; score: number } | null,
          };
        }

        const targetMonth = latestMonth[0].month;
        const monthData = await db.select().from(hrAiPerformance)
          .where(eq(hrAiPerformance.month, targetMonth))
          .orderBy(desc(hrAiPerformance.meetingScore));

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
        return {
          avgMeetingScore: 0,
          actionItemCompletionRate: 0,
          employeesEvaluated: 0,
          topPerformer: null as { name: string; score: number } | null,
        };
      }
    }),

  /** Leaderboard — ranked employees by meeting score */
  leaderboard: protectedProcedure
    .input(z.object({ limit: z.number().default(10), month: z.string().optional() }))
    .query(async ({ input }) => {
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

        const rows = await db.select().from(hrAiPerformance)
          .where(eq(hrAiPerformance.month, targetMonth))
          .orderBy(desc(hrAiPerformance.meetingScore))
          .limit(input.limit);

        return rows.map(r => ({
          userId: r.userId,
          userName: r.userName ?? `User#${r.userId}`,
          department: "",
          meetingScore: r.meetingScore ?? 0,
          breadth: r.breadthScore ?? 0,
          depth: r.depthScore ?? 0,
          execution: r.executionScore ?? 0,
          discipline: r.disciplineScore ?? 0,
          actionItemRate: r.actionItemsTotal
            ? Math.round(((r.actionItemsCompleted ?? 0) / r.actionItemsTotal) * 100)
            : 0,
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

  /** Single user performance detail */
  userDetail: protectedProcedure
    .input(z.object({ userId: z.number(), months: z.number().default(6) }))
    .query(async ({ input }) => {
      try {
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

  /** Seed demo data into hr_ai_performance + meeting_action_items */
  seedDemo: protectedProcedure.mutation(async () => {
    try {
      const db = await requireDb();

      // Check if already seeded
      const [existing] = await db.select({ value: count() }).from(hrAiPerformance);
      if (Number(existing?.value ?? 0) > 0) {
        return { ok: true, message: "Demo data already exists", count: Number(existing?.value ?? 0) };
      }

      const users = [
        { id: 1, name: "张三", dept: "项目管理部" },
        { id: 2, name: "李四", dept: "质量部" },
        { id: 3, name: "王五", dept: "销售部" },
        { id: 4, name: "赵六", dept: "研发部" },
        { id: 5, name: "周七", dept: "生产部" },
        { id: 6, name: "钱八", dept: "采购部" },
        { id: 7, name: "孙九", dept: "人力资源" },
        { id: 8, name: "吴十", dept: "财务部" },
      ];

      const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
      const perfRecords = [];

      for (const user of users) {
        for (const month of months) {
          const base = 60 + Math.floor(Math.random() * 30);
          const breadth = base + Math.floor(Math.random() * 10) - 5;
          const depth = base + Math.floor(Math.random() * 10) - 3;
          const execution = base + Math.floor(Math.random() * 8) - 4;
          const discipline = base + Math.floor(Math.random() * 8) - 2;
          const score = Math.round((breadth + depth + execution + discipline) / 4);
          const totalItems = 5 + Math.floor(Math.random() * 8);
          const completedItems = Math.max(1, totalItems - Math.floor(Math.random() * 3));

          perfRecords.push({
            userId: user.id,
            userName: user.name,
            month,
            breadthScore: breadth,
            depthScore: depth,
            executionScore: execution,
            disciplineScore: discipline,
            meetingScore: score,
            totalScore: score,
            meetingsAttended: 3 + Math.floor(Math.random() * 5),
            meetingsTotal: 6 + Math.floor(Math.random() * 3),
            actionItemsCompleted: completedItems,
            actionItemsTotal: totalItems,
          });
        }
      }

      await db.insert(hrAiPerformance).values(perfRecords);

      // Seed some action items
      const actionItems = [];
      const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "OVERDUE"];
      for (const user of users) {
        for (let i = 0; i < 5; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 60));
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          actionItems.push({
            meetingId: 100 + Math.floor(Math.random() * 20),
            assignedTo: user.id,
            assignedToName: user.name,
            taskDesc: `${user.dept}待办事项 #${i + 1}`,
            status,
            dueDate,
            completedAt: status === "COMPLETED" ? new Date() : null,
          });
        }
      }

      await db.insert(meetingActionItems).values(actionItems);

      return {
        ok: true,
        count: perfRecords.length,
        performanceRecords: perfRecords.length,
        actionItems: actionItems.length,
        month: months[months.length - 1],
      };
    } catch (e: any) {
      return { ok: false, count: 0, message: e.message };
    }
  }),
});

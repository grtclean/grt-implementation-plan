/**
 * AI Performance Engine Router — 4-dimension meeting scores
 *
 * Provides:
 *   - getScores: legacy stub
 *   - dashboard: aggregate KPIs (avg score, completion rate, top performer)
 *   - leaderboard: ranked employee list by meeting score
 *   - actionItemStats: monthly action item completion trend
 *   - seedDemo: insert demo data (mock in-memory)
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";

// ── In-memory demo data store ──

interface LeaderboardEntry {
  userId: number;
  userName: string;
  department: string;
  meetingScore: number;
  breadth: number;
  depth: number;
  execution: number;
  discipline: number;
  actionItemRate: number;
}

interface ActionTrend {
  month: string;
  total: number;
  completed: number;
  overdue: number;
  rate: number;
}

let demoLeaderboard: LeaderboardEntry[] = [];
let demoActionTrend: ActionTrend[] = [];
let seeded = false;

function seedDemoData() {
  demoLeaderboard = [
    { userId: 1, userName: "张三", department: "项目管理部", meetingScore: 92, breadth: 90, depth: 95, execution: 88, discipline: 94, actionItemRate: 96 },
    { userId: 2, userName: "李四", department: "质量部", meetingScore: 88, breadth: 85, depth: 90, execution: 87, discipline: 91, actionItemRate: 93 },
    { userId: 3, userName: "王五", department: "销售部", meetingScore: 85, breadth: 88, depth: 82, execution: 84, discipline: 86, actionItemRate: 90 },
    { userId: 4, userName: "赵六", department: "研发部", meetingScore: 83, breadth: 80, depth: 88, execution: 82, discipline: 81, actionItemRate: 88 },
    { userId: 5, userName: "周七", department: "生产部", meetingScore: 80, breadth: 78, depth: 82, execution: 80, discipline: 79, actionItemRate: 85 },
    { userId: 6, userName: "钱八", department: "采购部", meetingScore: 78, breadth: 75, depth: 80, execution: 78, discipline: 78, actionItemRate: 82 },
    { userId: 7, userName: "孙九", department: "人力资源", meetingScore: 76, breadth: 74, depth: 78, execution: 76, discipline: 77, actionItemRate: 80 },
    { userId: 8, userName: "吴十", department: "财务部", meetingScore: 74, breadth: 72, depth: 76, execution: 73, discipline: 75, actionItemRate: 78 },
  ];

  demoActionTrend = [
    { month: "2025-09", total: 42, completed: 38, overdue: 2, rate: 90 },
    { month: "2025-10", total: 48, completed: 44, overdue: 1, rate: 92 },
    { month: "2025-11", total: 51, completed: 47, overdue: 2, rate: 92 },
    { month: "2025-12", total: 55, completed: 52, overdue: 1, rate: 95 },
    { month: "2026-01", total: 53, completed: 50, overdue: 1, rate: 94 },
    { month: "2026-02", total: 38, completed: 35, overdue: 1, rate: 92 },
  ];

  seeded = true;
}

export const aiPerformanceRouter = router({
  /** Legacy stub */
  getScores: publicProcedure
    .input(
      z.object({
        meetingId: z.number().optional(),
        userId: z.number().optional(),
      }).optional()
    )
    .query(async () => {
      return { items: [], total: 0 };
    }),

  /** Dashboard aggregate KPIs */
  dashboard: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      if (!seeded || demoLeaderboard.length === 0) {
        return {
          avgMeetingScore: 0,
          actionItemCompletionRate: 0,
          employeesEvaluated: 0,
          topPerformer: null as { name: string; score: number } | null,
        };
      }

      const avg = Math.round(
        demoLeaderboard.reduce((s, e) => s + e.meetingScore, 0) / demoLeaderboard.length
      );
      const lastTrend = demoActionTrend[demoActionTrend.length - 1];

      return {
        avgMeetingScore: avg,
        actionItemCompletionRate: lastTrend?.rate ?? 0,
        employeesEvaluated: demoLeaderboard.length,
        topPerformer: {
          name: demoLeaderboard[0].userName,
          score: demoLeaderboard[0].meetingScore,
        },
      };
    }),

  /** Leaderboard — ranked employees by meeting score */
  leaderboard: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      if (!seeded) return [];
      return demoLeaderboard
        .sort((a, b) => b.meetingScore - a.meetingScore)
        .slice(0, input.limit);
    }),

  /** Monthly action item completion trend */
  actionItemStats: publicProcedure
    .input(z.object({ months: z.number().default(6) }))
    .query(async ({ input }) => {
      if (!seeded) return [];
      return demoActionTrend.slice(-input.months);
    }),

  /** Seed demo data for demonstration */
  seedDemo: publicProcedure.mutation(async () => {
    seedDemoData();
    return {
      ok: true,
      count: demoLeaderboard.length,
      performanceRecords: demoLeaderboard.length,
      actionItems: demoActionTrend.reduce((s, t) => s + t.total, 0),
      month: new Date().toISOString().slice(0, 7),
    };
  }),
});

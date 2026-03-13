/**
 * Battle Arena Router — 斗兽场排名 & 月度战情室
 *
 * 3 sub-routers, ~16 procedures:
 *   battleReport (6): generate, getMyReport, submitPlan, getByUser, listByPeriod, lockReport
 *   rankings (6):     computeRankings, getLeaderboard, getMyRank, getBonusGapChart, getEntityDetail, getRankHistory
 *   arena (4):        getWarRoomData, getArenaOverview, getEntityTypes, getPeriods
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import {
  monthlyBattleReports,
  globalArenaRankings,
} from "../../drizzle/battle-arena-schema";
import { users } from "../../drizzle/schema";
import { submitTask } from "../services/task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("battle-arena");

const viewArena = requirePermission("arena:rankings:view");
const manageArena = requirePermission("arena:rankings:manage");

// ── Utility: compute bonus tier from rank percentile ──
function computeBonusTier(rank: number, total: number): "S" | "A" | "B" | "C" | "D" {
  if (total === 0) return "B";
  const pct = rank / total;
  if (pct <= 0.10) return "S";  // Top 10% — 吃肉
  if (pct <= 0.30) return "A";  // 11-30% — 喝汤
  if (pct <= 0.60) return "B";  // 31-60% — 温饱
  if (pct <= 0.90) return "C";  // 61-90% — 警告
  return "D";                    // Bottom 10% — 淘汰
}

function computeBonusMultiplier(tier: string): string {
  switch (tier) {
    case "S": return "3.00";
    case "A": return "1.80";
    case "B": return "1.00";
    case "C": return "0.50";
    case "D": return "0.00";
    default: return "1.00";
  }
}

// ══════════════════════════════════════════════════════
// Battle Report Sub-Router — 月度述职战报
// ══════════════════════════════════════════════════════

const battleReportRouter = router({
  /** Trigger async AI generation of monthly battle report */
  generate: protectedProcedure
    .use(manageArena)
    .input(z.object({
      userId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Check if report already exists
      const [existing] = await db
        .select({ id: monthlyBattleReports.id })
        .from(monthlyBattleReports)
        .where(and(
          eq(monthlyBattleReports.userId, input.userId),
          eq(monthlyBattleReports.period, input.period),
        ))
        .limit(1);

      if (existing) {
        return { reportId: existing.id, taskId: null, status: "already_exists" };
      }

      // Create placeholder
      const [report] = await db
        .insert(monthlyBattleReports)
        .values({
          userId: input.userId,
          period: input.period,
          status: "ai_draft",
          buCode: input.buCode ?? null,
        })
        .returning();

      // Fire async task
      const taskId = await submitTask("BATTLE_PREP_REPORT", {
        reportId: report.id,
        userId: input.userId,
        period: input.period,
        buCode: input.buCode ?? null,
      });

      await db.update(monthlyBattleReports)
        .set({ generationTaskId: taskId })
        .where(eq(monthlyBattleReports.id, report.id));

      log.info({ userId: input.userId, period: input.period, taskId }, "Battle report generation triggered");
      return { reportId: report.id, taskId, status: "generating" };
    }),

  /** Get my battle report for a period */
  getMyReport: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(monthlyBattleReports)
        .where(and(
          eq(monthlyBattleReports.userId, ctx.user!.id),
          eq(monthlyBattleReports.period, input.period),
        ))
        .limit(1);
      return row ?? null;
    }),

  /** Submit improvement action plan */
  submitPlan: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      improvementActionPlan: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(monthlyBattleReports)
        .set({
          improvementActionPlan: input.improvementActionPlan,
          status: "user_submitted",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(monthlyBattleReports.id, input.reportId))
        .returning();
      return row ?? null;
    }),

  /** Get any user's report (manager view) */
  getByUser: protectedProcedure
    .use(viewArena)
    .input(z.object({
      userId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(monthlyBattleReports)
        .where(and(
          eq(monthlyBattleReports.userId, input.userId),
          eq(monthlyBattleReports.period, input.period),
        ))
        .limit(1);
      return row ?? null;
    }),

  /** List all reports for a period */
  listByPeriod: protectedProcedure
    .use(viewArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(monthlyBattleReports.period, input.period)];
      if (input.buCode) conditions.push(eq(monthlyBattleReports.buCode, input.buCode));

      const rows = await db
        .select()
        .from(monthlyBattleReports)
        .where(and(...conditions))
        .orderBy(desc(monthlyBattleReports.updatedAt))
        .limit(500);
      return rows;
    }),

  /** Lock report after review */
  lockReport: protectedProcedure
    .use(manageArena)
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(monthlyBattleReports)
        .set({ status: "locked", updatedAt: new Date().toISOString() })
        .where(eq(monthlyBattleReports.id, input.reportId))
        .returning();
      return row ?? null;
    }),
});

// ══════════════════════════════════════════════════════
// Rankings Sub-Router — 全局战力排行榜
// ══════════════════════════════════════════════════════

const rankingsRouter = router({
  /** Compute and store rankings for a period (admin action) */
  computeRankings: protectedProcedure
    .use(manageArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Fire async task for heavy computation
      const taskId = await submitTask("ARENA_COMPUTE_RANKINGS", {
        period: input.period,
      });

      log.info({ period: input.period, taskId }, "Arena ranking computation triggered");
      return { taskId, status: "computing" };
    }),

  /** Get leaderboard for entity type + period */
  getLeaderboard: protectedProcedure
    .use(viewArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      entityType: z.enum(["SALES", "ENGINEER", "DIVISION", "MANAGER"]),
      buCode: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [
        eq(globalArenaRankings.period, input.period),
        eq(globalArenaRankings.entityType, input.entityType),
      ];
      if (input.buCode) conditions.push(eq(globalArenaRankings.buCode, input.buCode));

      const rows = await db
        .select()
        .from(globalArenaRankings)
        .where(and(...conditions))
        .orderBy(asc(globalArenaRankings.rankPosition))
        .limit(input.limit ?? 50);
      return rows;
    }),

  /** Get my rank across all entity types */
  getMyRank: protectedProcedure
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(globalArenaRankings)
        .where(and(
          eq(globalArenaRankings.period, input.period),
          eq(globalArenaRankings.entityId, ctx.user!.id),
        ))
        .limit(10);
      return rows;
    }),

  /** Get bonus gap chart data — top vs bottom disparity */
  getBonusGapChart: protectedProcedure
    .use(viewArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      entityType: z.enum(["SALES", "ENGINEER", "DIVISION", "MANAGER"]),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Get top 3 and bottom 3
      const top = await db
        .select()
        .from(globalArenaRankings)
        .where(and(
          eq(globalArenaRankings.period, input.period),
          eq(globalArenaRankings.entityType, input.entityType),
        ))
        .orderBy(asc(globalArenaRankings.rankPosition))
        .limit(3);

      const bottom = await db
        .select()
        .from(globalArenaRankings)
        .where(and(
          eq(globalArenaRankings.period, input.period),
          eq(globalArenaRankings.entityType, input.entityType),
        ))
        .orderBy(desc(globalArenaRankings.rankPosition))
        .limit(3);

      const topMultiplier = top[0] ? parseFloat(top[0].bonusMultiplier ?? "1") : 1;
      const bottomMultiplier = bottom[0] ? parseFloat(bottom[0].bonusMultiplier ?? "1") : 1;

      return {
        top,
        bottom: bottom.reverse(),
        gapMultiplier: bottomMultiplier > 0 ? `${(topMultiplier / bottomMultiplier).toFixed(0)}x` : "∞x",
        topMultiplier,
        bottomMultiplier,
      };
    }),

  /** Get detailed entity ranking with breakdown */
  getEntityDetail: protectedProcedure
    .use(viewArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      entityType: z.enum(["SALES", "ENGINEER", "DIVISION", "MANAGER"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(globalArenaRankings)
        .where(and(
          eq(globalArenaRankings.period, input.period),
          eq(globalArenaRankings.entityType, input.entityType),
          eq(globalArenaRankings.entityId, input.entityId),
        ))
        .limit(1);
      return row ?? null;
    }),

  /** Get rank history for an entity across periods */
  getRankHistory: protectedProcedure
    .input(z.object({
      entityId: z.number(),
      entityType: z.enum(["SALES", "ENGINEER", "DIVISION", "MANAGER"]),
      limit: z.number().int().min(1).max(24).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select({
          period: globalArenaRankings.period,
          rankPosition: globalArenaRankings.rankPosition,
          comprehensiveScore: globalArenaRankings.comprehensiveScore,
          bonusTier: globalArenaRankings.bonusTier,
          rankChange: globalArenaRankings.rankChange,
        })
        .from(globalArenaRankings)
        .where(and(
          eq(globalArenaRankings.entityId, input.entityId),
          eq(globalArenaRankings.entityType, input.entityType),
        ))
        .orderBy(desc(globalArenaRankings.period))
        .limit(input.limit ?? 12);
      return rows;
    }),
});

// ══════════════════════════════════════════════════════
// Arena Overview Sub-Router
// ══════════════════════════════════════════════════════

const arenaRouter = router({
  /** Full war room data for monthly meeting */
  getWarRoomData: protectedProcedure
    .use(viewArena)
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // All four leaderboards
      const conditions = [eq(globalArenaRankings.period, input.period)];
      if (input.buCode) conditions.push(eq(globalArenaRankings.buCode, input.buCode));

      const allRankings = await db
        .select()
        .from(globalArenaRankings)
        .where(and(...conditions))
        .orderBy(asc(globalArenaRankings.rankPosition))
        .limit(500);

      // Group by entity type
      const boards: Record<string, typeof allRankings> = {
        SALES: [], ENGINEER: [], DIVISION: [], MANAGER: [],
      };
      for (const r of allRankings) {
        if (boards[r.entityType]) boards[r.entityType].push(r);
      }

      // Tier distribution
      const tierCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
      for (const r of allRankings) {
        tierCounts[r.bonusTier] = (tierCounts[r.bonusTier] ?? 0) + 1;
      }

      return { boards, tierCounts, totalEntities: allRankings.length };
    }),

  /** Arena overview stats */
  getArenaOverview: protectedProcedure
    .use(viewArena)
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [stats] = await db
        .select({
          totalRankings: count(),
        })
        .from(globalArenaRankings)
        .where(eq(globalArenaRankings.period, input.period));

      const [reportStats] = await db
        .select({ totalReports: count() })
        .from(monthlyBattleReports)
        .where(eq(monthlyBattleReports.period, input.period));

      return {
        totalRankings: stats?.totalRankings ?? 0,
        totalReports: reportStats?.totalReports ?? 0,
        period: input.period,
      };
    }),

  /** Available entity types */
  getEntityTypes: protectedProcedure
    .query(async () => {
      return [
        { type: "SALES", label: "销售虎将榜", labelEn: "Sales Warriors" },
        { type: "ENGINEER", label: "设计极客榜", labelEn: "Design Geeks" },
        { type: "DIVISION", label: "事业部利润榜", labelEn: "Division P&L" },
        { type: "MANAGER", label: "大管家榜", labelEn: "Manager Board" },
      ];
    }),

  /** Available periods with data */
  getPeriods: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT DISTINCT period FROM global_arena_rankings
        ORDER BY period DESC LIMIT 24
      `);
      return ((rows as any).rows ?? rows) as { period: string }[];
    }),
});

// ══════════════════════════════════════════════════════
// Combined Router
// ══════════════════════════════════════════════════════

export const battleArenaRouter = router({
  report: battleReportRouter,
  rankings: rankingsRouter,
  arena: arenaRouter,
});

// Export utilities for AI handler
export { computeBonusTier, computeBonusMultiplier };

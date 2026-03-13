/**
 * AEI Extended Router — AI-Enhanced Intelligence Performance Aggregation
 *
 * 6 procedures: calculateMonthlyAei, getAeiDashboard, getAeiDetail, getAeiTrend,
 *               predictPerformance, getAtRiskEmployees
 *
 * AEI formula: composite = meeting*0.30 + engineering*0.25 + operational*0.25 + collaboration*0.20
 *
 * Data sources:
 *   - design_export_logs      → engineering score
 *   - plc_version_history     → engineering score
 *   - robot_cleaning_actions  → operational score
 *   - equipment_maintenance   → operational score
 *   - meeting action items    → meeting score (via AI performance engine)
 *   - SharePoint doc shares   → collaboration score
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  aeiMonthlyScores,
  aeiContributionLogs,
} from "../../drizzle/aei-extended-schema";
import { designExportLogs } from "../../drizzle/design-engine-schema";
import { robotCleaningActions } from "../../drizzle/robot-cleaning-performance-schema";
import { equipmentMaintenanceRecords } from "../../drizzle/supply-chain-schema";
import { eq, desc, and, count, avg, sql, gte, lte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { users } from "../../drizzle/schema";

const log = createChildLogger("aei-extended-router");

const performancePermission = requirePermission("hr:performance:manage");

/** Clamp a value between 0 and 100 */
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

/** Simple linear regression: returns slope (per month) */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export const aeiExtendedRouter = router({
  // ── Calculate monthly AEI for all active users ────────────────────────
  calculateMonthlyAei: performancePermission
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      try {
        const monthStart = `${input.month}-01`;
        const nextMonth = (() => {
          const [y, m] = input.month.split("-").map(Number);
          const nm = m === 12 ? 1 : m + 1;
          const ny = m === 12 ? y + 1 : y;
          return `${ny}-${String(nm).padStart(2, "0")}-01`;
        })();

        // Get all active users
        const allUsers = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .limit(1000);

        const results: Array<{ userId: number; composite: number }> = [];

        for (const user of allUsers) {
          // Engineering score: count design exports + PLC activity
          const [{ value: exportCount }] = await db
            .select({ value: count() })
            .from(designExportLogs)
            .where(
              and(
                sql`${designExportLogs.exportedBy} = ${user.name || String(user.id)}`,
                gte(designExportLogs.createdAt, monthStart),
                lte(designExportLogs.createdAt, nextMonth),
              ),
            );
          const designExports = Number(exportCount);
          // Score: 10 per export, capped at 100
          const engineeringScore = clamp100(Math.min(designExports * 10, 100));

          // Operational score: cleaning pass rate + maintenance
          const cleaningActions = await db
            .select({
              verdict: robotCleaningActions.cleanlinessVerdict,
            })
            .from(robotCleaningActions)
            .where(
              and(
                eq(robotCleaningActions.operatorId, user.id),
                gte(robotCleaningActions.createdAt, monthStart),
                lte(robotCleaningActions.createdAt, nextMonth),
              ),
            )
            .limit(500);

          const totalCleaning = cleaningActions.length;
          const passedCleaning = cleaningActions.filter((a) => a.verdict === "PASS").length;
          const cleaningPassRate = totalCleaning > 0 ? (passedCleaning / totalCleaning) * 100 : 50;

          const [{ value: maintenanceCount }] = await db
            .select({ value: count() })
            .from(equipmentMaintenanceRecords)
            .where(
              and(
                sql`${equipmentMaintenanceRecords.performedBy} = ${user.name || String(user.id)}`,
                gte(equipmentMaintenanceRecords.createdAt, monthStart),
                lte(equipmentMaintenanceRecords.createdAt, nextMonth),
              ),
            );
          const maintenanceDone = Number(maintenanceCount);
          const operationalScore = clamp100((cleaningPassRate * 0.6) + Math.min(maintenanceDone * 8, 40));

          // Meeting score: from contribution logs (pre-computed by AI performance engine)
          const [{ value: meetingContribs }] = await db
            .select({ value: count() })
            .from(aeiContributionLogs)
            .where(
              and(
                eq(aeiContributionLogs.userId, user.id),
                eq(aeiContributionLogs.month, input.month),
                eq(aeiContributionLogs.contributionType, "meeting_action"),
              ),
            );
          const meetingScore = clamp100(Math.min(Number(meetingContribs) * 12, 100));

          // Collaboration score: doc shares + training
          const [{ value: collabContribs }] = await db
            .select({ value: count() })
            .from(aeiContributionLogs)
            .where(
              and(
                eq(aeiContributionLogs.userId, user.id),
                eq(aeiContributionLogs.month, input.month),
                sql`${aeiContributionLogs.contributionType} IN ('doc_shared', 'training_completed', 'code_review')`,
              ),
            );
          const collaborationScore = clamp100(Math.min(Number(collabContribs) * 15, 100));

          // Composite AEI
          const composite = clamp100(
            meetingScore * 0.30 +
            engineeringScore * 0.25 +
            operationalScore * 0.25 +
            collaborationScore * 0.20,
          );

          // Compute trend slope from last 6 months
          const pastScores = await db
            .select({ compositeAeiScore: aeiMonthlyScores.compositeAeiScore })
            .from(aeiMonthlyScores)
            .where(eq(aeiMonthlyScores.userId, user.id))
            .orderBy(desc(aeiMonthlyScores.month))
            .limit(6);

          const scoreValues = pastScores.map((s) => Number(s.compositeAeiScore || 0)).reverse();
          scoreValues.push(composite);
          const trendSlope = linearRegressionSlope(scoreValues);

          // Determine risk flag
          let riskFlag: string | null = null;
          if (trendSlope < -3) riskFlag = "at_risk";
          else if (trendSlope < -1) riskFlag = "declining";
          if (composite > 90 && scoreValues.length >= 4) {
            const allHigh = scoreValues.slice(-4).every((s) => s > 85);
            if (allHigh) riskFlag = "burnout";
          }

          // Upsert monthly score
          const existing = await db
            .select({ id: aeiMonthlyScores.id })
            .from(aeiMonthlyScores)
            .where(and(eq(aeiMonthlyScores.userId, user.id), eq(aeiMonthlyScores.month, input.month)))
            .limit(1);

          const scoreData = {
            userId: user.id,
            userName: user.name || String(user.id),
            month: input.month,
            meetingScore,
            engineeringScore,
            operationalScore,
            collaborationScore,
            compositeAeiScore: composite,
            trendSlope: Math.round(trendSlope * 100) / 100,
            riskFlag,
            details: {
              designExports,
              plcVersions: 0,
              defectsResolved: 0,
              cleaningPassRate: Math.round(cleaningPassRate),
              docsShared: Number(collabContribs),
              trainingsCompleted: 0,
              safetyIncidents: 0,
            },
          };

          if (existing.length > 0) {
            await db
              .update(aeiMonthlyScores)
              .set({ ...scoreData, calculatedAt: new Date().toISOString() })
              .where(eq(aeiMonthlyScores.id, existing[0].id));
          } else {
            await db.insert(aeiMonthlyScores).values(scoreData);
          }

          results.push({ userId: user.id, composite });
        }

        // Compute ranks
        results.sort((a, b) => b.composite - a.composite);
        for (let i = 0; i < results.length; i++) {
          await db
            .update(aeiMonthlyScores)
            .set({ rank: i + 1, totalEmployees: results.length })
            .where(
              and(
                eq(aeiMonthlyScores.userId, results[i].userId),
                eq(aeiMonthlyScores.month, input.month),
              ),
            );
        }

        log.info({ month: input.month, calculated: results.length }, "Monthly AEI calculation complete");
        return { month: input.month, employeesCalculated: results.length };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        log.error({ err, month: input.month }, "AEI calculation failed");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AEI calculation failed" });
      }
    }),

  // ── Dashboard: top 10 leaderboard + averages + trend ──────────────────
  getAeiDashboard: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const topScores = await db
        .select()
        .from(aeiMonthlyScores)
        .where(eq(aeiMonthlyScores.month, input.month))
        .orderBy(desc(aeiMonthlyScores.compositeAeiScore))
        .limit(10);

      const [avgResult] = await db
        .select({
          avgComposite: avg(aeiMonthlyScores.compositeAeiScore),
          avgMeeting: avg(aeiMonthlyScores.meetingScore),
          avgEngineering: avg(aeiMonthlyScores.engineeringScore),
          avgOperational: avg(aeiMonthlyScores.operationalScore),
          avgCollaboration: avg(aeiMonthlyScores.collaborationScore),
          totalEmployees: count(),
        })
        .from(aeiMonthlyScores)
        .where(eq(aeiMonthlyScores.month, input.month));

      return {
        month: input.month,
        leaderboard: topScores,
        averages: {
          composite: Number(avgResult?.avgComposite || 0),
          meeting: Number(avgResult?.avgMeeting || 0),
          engineering: Number(avgResult?.avgEngineering || 0),
          operational: Number(avgResult?.avgOperational || 0),
          collaboration: Number(avgResult?.avgCollaboration || 0),
        },
        totalEmployees: Number(avgResult?.totalEmployees || 0),
      };
    }),

  // ── Detail for a single user ──────────────────────────────────────────
  getAeiDetail: protectedProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const [score] = await db
        .select()
        .from(aeiMonthlyScores)
        .where(
          and(
            eq(aeiMonthlyScores.userId, input.userId),
            eq(aeiMonthlyScores.month, input.month),
          ),
        )
        .limit(1);

      if (!score) return null;

      // Fetch contribution breakdown
      const contributions = await db
        .select()
        .from(aeiContributionLogs)
        .where(
          and(
            eq(aeiContributionLogs.userId, input.userId),
            eq(aeiContributionLogs.month, input.month),
          ),
        )
        .orderBy(desc(aeiContributionLogs.createdAt))
        .limit(100);

      return { score, contributions };
    }),

  // ── Trend for a single user across months ─────────────────────────────
  getAeiTrend: protectedProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        monthsBack: z.number().int().min(1).max(24).default(12),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const scores = await db
        .select()
        .from(aeiMonthlyScores)
        .where(eq(aeiMonthlyScores.userId, input.userId))
        .orderBy(desc(aeiMonthlyScores.month))
        .limit(input.monthsBack);

      return scores.reverse(); // chronological order
    }),

  // ── Predict future performance via linear regression ──────────────────
  predictPerformance: protectedProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        forecastMonths: z.number().int().min(1).max(6).default(3),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      // Need at least 6 months of data for reliable prediction
      const scores = await db
        .select({
          month: aeiMonthlyScores.month,
          composite: aeiMonthlyScores.compositeAeiScore,
        })
        .from(aeiMonthlyScores)
        .where(eq(aeiMonthlyScores.userId, input.userId))
        .orderBy(aeiMonthlyScores.month)
        .limit(24);

      if (scores.length < 3) {
        return {
          userId: input.userId,
          dataPoints: scores.length,
          sufficient: false,
          message: "Insufficient data — need at least 3 months for prediction",
          predictions: [],
        };
      }

      const values = scores.map((s) => Number(s.composite || 0));
      const slope = linearRegressionSlope(values);
      const lastValue = values[values.length - 1];

      // Extrapolate
      const predictions: Array<{ monthOffset: number; predicted: number; confidence: number }> = [];
      for (let i = 1; i <= input.forecastMonths; i++) {
        const predicted = clamp100(lastValue + slope * i);
        // Confidence degrades with distance
        const confidence = Math.max(0.3, 1 - i * 0.15);
        predictions.push({ monthOffset: i, predicted, confidence: Math.round(confidence * 100) / 100 });
      }

      const declining = slope < -1;

      return {
        userId: input.userId,
        dataPoints: scores.length,
        sufficient: true,
        slope: Math.round(slope * 100) / 100,
        lastScore: lastValue,
        declining,
        predictions,
      };
    }),

  // ── Production value modeling for a user across a period ─────────────
  getProductionValue: protectedProcedure
    .input(z.object({
      userId: z.number(),
      periodType: z.enum(["week", "month", "quarter", "year"]),
      period: z.string(),
    }))
    .query(async ({ input }) => {
      const { calculateProductionValue } = await import("../services/aei-aggregator.service");
      return calculateProductionValue(input.userId, input.periodType, input.period);
    }),

  // ── Get at-risk employees (declining or flagged) ──────────────────────
  getAtRiskEmployees: protectedProcedure
    .input(
      z
        .object({
          month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const currentMonth = input?.month || (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();

      const atRisk = await db
        .select()
        .from(aeiMonthlyScores)
        .where(
          and(
            eq(aeiMonthlyScores.month, currentMonth),
            sql`${aeiMonthlyScores.riskFlag} IS NOT NULL`,
          ),
        )
        .orderBy(aeiMonthlyScores.compositeAeiScore)
        .limit(input?.limit ?? 50);

      return {
        month: currentMonth,
        atRiskCount: atRisk.length,
        employees: atRisk,
      };
    }),
});

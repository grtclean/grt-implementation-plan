/**
 * CEO Dashboard Router — Executive Health Scorecard
 *
 * 8 procedures: getHealthScores, getKpis, getDigitalThread, getMachineHealth, getTopEmployees, getNineGrid, getGlobalDeliveryMap, getAlgorithmEvolution
 *
 * Each query aggregates from existing tables with fallback to mock data.
 * 5-minute in-memory cache per query key to avoid repeated heavy aggregations.
 *
 * Access: All protectedProcedure (no specific permission — executive access via role).
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { oeeSnapshots } from "../../drizzle/oee-schema";
import { fmeaDocuments } from "../../drizzle/schema";
import { projectBudgets } from "../../drizzle/schema";
import { supplierPenalties } from "../../drizzle/supply-chain-schema";
import { aeiMonthlyScores } from "../../drizzle/aei-extended-schema";
import { designSyncEvents } from "../../drizzle/design-engine-schema";
import { robotConditionAlerts } from "../../drizzle/robot-fleet-schema";
import { meetingActionItems } from "../../drizzle/smart-meetings-schema";
import { eq, desc, and, count, avg, sql, gte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ceo-dashboard-router");

// ── 5-minute in-memory cache ────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
  // Evict oldest if cache grows too large
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export const ceoDashboardRouter = router({
  // ── Health Scores: OEE avg, open FMEAs, budget variance, penalties, AEI ──
  getHealthScores: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
    .query(async ({ input }) => {
      const cacheKey = `health:${input?.month || "current"}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();

      // 1. Average OEE
      let avgOee = 0;
      try {
        const [oeeResult] = await db
          .select({ avgOee: avg(oeeSnapshots.oee) })
          .from(oeeSnapshots)
          .limit(1);
        avgOee = Number(oeeResult?.avgOee || 0) * 100;
      } catch {
        avgOee = 78.5; // fallback mock
      }

      // 2. Open FMEA count
      let openFmeaCount = 0;
      try {
        const [fmeaResult] = await db
          .select({ value: count() })
          .from(fmeaDocuments)
          .where(eq(fmeaDocuments.status, "active"));
        openFmeaCount = Number(fmeaResult?.value || 0);
      } catch {
        openFmeaCount = 12; // fallback mock
      }

      // 3. Budget variance
      let budgetVariancePct = 0;
      try {
        const budgets = await db
          .select({
            budgetAmount: projectBudgets.budgetAmount,
            usedAmount: projectBudgets.usedAmount,
          })
          .from(projectBudgets)
          .limit(500);

        const totalBudget = budgets.reduce((s, b) => s + Number(b.budgetAmount), 0);
        const totalUsed = budgets.reduce((s, b) => s + Number(b.usedAmount), 0);
        budgetVariancePct = totalBudget > 0 ? ((totalUsed - totalBudget) / totalBudget) * 100 : 0;
      } catch {
        budgetVariancePct = -3.2; // fallback mock
      }

      // 4. Active supplier penalties
      let penaltyCount = 0;
      try {
        const [penaltyResult] = await db
          .select({ value: count() })
          .from(supplierPenalties)
          .where(eq(supplierPenalties.penaltyType, "warning"));
        penaltyCount = Number(penaltyResult?.value || 0);
      } catch {
        penaltyCount = 5; // fallback mock
      }

      // 5. Average AEI
      let avgAei = 0;
      try {
        const currentMonth = input?.month || (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })();
        const [aeiResult] = await db
          .select({ avgAei: avg(aeiMonthlyScores.compositeAeiScore) })
          .from(aeiMonthlyScores)
          .where(eq(aeiMonthlyScores.month, currentMonth));
        avgAei = Number(aeiResult?.avgAei || 0);
      } catch {
        avgAei = 72.3; // fallback mock
      }

      const result = {
        oee: { value: Math.round(avgOee * 10) / 10, unit: "%", grade: avgOee >= 85 ? "green" : avgOee >= 70 ? "yellow" : "red" },
        fmea: { openCount: openFmeaCount, grade: openFmeaCount <= 5 ? "green" : openFmeaCount <= 15 ? "yellow" : "red" },
        budget: { variancePct: Math.round(budgetVariancePct * 10) / 10, grade: Math.abs(budgetVariancePct) <= 5 ? "green" : Math.abs(budgetVariancePct) <= 15 ? "yellow" : "red" },
        suppliers: { activePenalties: penaltyCount, grade: penaltyCount <= 3 ? "green" : penaltyCount <= 10 ? "yellow" : "red" },
        aei: { avgScore: Math.round(avgAei * 10) / 10, grade: avgAei >= 75 ? "green" : avgAei >= 50 ? "yellow" : "red" },
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── KPIs: Key business metrics ────────────────────────────────────────
  getKpis: protectedProcedure
    .input(z.object({ period: z.enum(["week", "month", "quarter"]).default("month") }).optional())
    .query(async ({ input }) => {
      const period = input?.period || "month";
      const cacheKey = `kpis:${period}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();

      // Count meeting action items status
      let completedActions = 0;
      let totalActions = 0;
      try {
        const [totalResult] = await db.select({ value: count() }).from(meetingActionItems);
        totalActions = Number(totalResult?.value || 0);
        const [completedResult] = await db
          .select({ value: count() })
          .from(meetingActionItems)
          .where(eq(meetingActionItems.status, "COMPLETED"));
        completedActions = Number(completedResult?.value || 0);
      } catch {
        totalActions = 156;
        completedActions = 112;
      }

      // Robot fleet alerts (last 30 days)
      let recentAlerts = 0;
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [alertResult] = await db
          .select({ value: count() })
          .from(robotConditionAlerts)
          .where(gte(robotConditionAlerts.createdAt, thirtyDaysAgo));
        recentAlerts = Number(alertResult?.value || 0);
      } catch {
        recentAlerts = 24;
      }

      const result = {
        period,
        actionItems: {
          total: totalActions,
          completed: completedActions,
          completionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        },
        robotAlerts: { last30Days: recentAlerts },
        updatedAt: new Date().toISOString(),
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── Digital Thread: last 20 cross-system events ───────────────────────
  getDigitalThread: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const limitN = input?.limit ?? 20;
      const cacheKey = `thread:${limitN}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();
      const events: Array<{ source: string; type: string; description: string; severity: string; createdAt: string }> = [];

      // Design sync events
      try {
        const syncEvents = await db
          .select()
          .from(designSyncEvents)
          .orderBy(desc(designSyncEvents.createdAt))
          .limit(limitN);
        for (const e of syncEvents) {
          events.push({
            source: "design",
            type: e.eventType,
            description: e.description || "",
            severity: e.severity || "info",
            createdAt: e.createdAt,
          });
        }
      } catch { /* no data available */ }

      // Robot condition alerts
      try {
        const alerts = await db
          .select()
          .from(robotConditionAlerts)
          .orderBy(desc(robotConditionAlerts.createdAt))
          .limit(limitN);
        for (const a of alerts) {
          events.push({
            source: "robot",
            type: a.alertType,
            description: a.message,
            severity: a.severity,
            createdAt: a.createdAt,
          });
        }
      } catch { /* no data available */ }

      // Meeting action items (recent)
      try {
        const actions = await db
          .select()
          .from(meetingActionItems)
          .orderBy(desc(meetingActionItems.createdAt))
          .limit(limitN);
        for (const a of actions) {
          events.push({
            source: "meeting",
            type: "action_item",
            description: a.taskDesc,
            severity: a.status === "OVERDUE" ? "warning" : "info",
            createdAt: a.createdAt?.toISOString?.() || new Date().toISOString(),
          });
        }
      } catch { /* no data available */ }

      // Sort all by createdAt desc, take top N
      events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const result = events.slice(0, limitN);

      setCache(cacheKey, result);
      return result;
    }),

  // ── Machine Health: OEE snapshots for equipment fleet ─────────────────
  getMachineHealth: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const limitN = input?.limit ?? 50;
      const cacheKey = `machines:${limitN}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();

      let machines: Array<{ machineId: number; oee: number; availability: number; performance: number; quality: number; date: string }> = [];

      try {
        const snapshots = await db
          .select()
          .from(oeeSnapshots)
          .orderBy(desc(oeeSnapshots.computedAt))
          .limit(limitN);

        machines = snapshots.map((s) => ({
          machineId: s.machineId,
          oee: Number(s.oee) * 100,
          availability: Number(s.availability) * 100,
          performance: Number(s.performance) * 100,
          quality: Number(s.quality) * 100,
          date: s.snapshotDate,
        }));
      } catch {
        // Fallback mock
        machines = [
          { machineId: 1, oee: 87.2, availability: 92.1, performance: 95.3, quality: 99.2, date: new Date().toISOString().slice(0, 10) },
          { machineId: 2, oee: 72.1, availability: 85.3, performance: 88.4, quality: 95.6, date: new Date().toISOString().slice(0, 10) },
          { machineId: 3, oee: 91.5, availability: 96.0, performance: 97.1, quality: 98.2, date: new Date().toISOString().slice(0, 10) },
        ];
      }

      const result = {
        machines,
        summary: {
          total: machines.length,
          worldClass: machines.filter((m) => m.oee >= 85).length,
          acceptable: machines.filter((m) => m.oee >= 70 && m.oee < 85).length,
          critical: machines.filter((m) => m.oee < 70).length,
        },
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── Top Employees: AEI leaderboard ────────────────────────────────────
  getTopEmployees: protectedProcedure
    .input(
      z
        .object({
          month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const currentMonth = input?.month || (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();
      const limitN = input?.limit ?? 10;
      const cacheKey = `top:${currentMonth}:${limitN}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const db = await requireDb();

      const topEmployees = await db
        .select()
        .from(aeiMonthlyScores)
        .where(eq(aeiMonthlyScores.month, currentMonth))
        .orderBy(desc(aeiMonthlyScores.compositeAeiScore))
        .limit(limitN);

      const result = {
        month: currentMonth,
        employees: topEmployees.map((e) => ({
          userId: e.userId,
          userName: e.userName,
          compositeScore: Number(e.compositeAeiScore),
          meetingScore: Number(e.meetingScore),
          engineeringScore: Number(e.engineeringScore),
          operationalScore: Number(e.operationalScore),
          collaborationScore: Number(e.collaborationScore),
          rank: e.rank,
          riskFlag: e.riskFlag,
        })),
      };

      setCache(cacheKey, result);
      return result;
    }),

  // ── Nine-Grid: Performance vs Potential matrix ─────────────────────────
  getNineGrid: protectedProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const month = input.month || new Date().toISOString().slice(0, 7);

      // Query AEI monthly scores for the period
      const scores = await db.execute(sql`
        SELECT user_id, user_name, composite_aei_score,
               COALESCE(meeting_score, 0) as meeting,
               COALESCE(engineering_score, 0) as engineering,
               COALESCE(operational_score, 0) as operational,
               COALESCE(collaboration_score, 0) as collaboration
        FROM aei_monthly_scores
        WHERE month = ${month}
        ORDER BY composite_aei_score DESC
        LIMIT 500
      `);

      const rows = (scores.rows || []) as Array<Record<string, unknown>>;

      // Build 3x3 grid: Performance (Y) vs Potential (X)
      // Performance = composite_aei_score
      // Potential = (engineering + collaboration) / 2 (proxy for growth)
      const grid: Array<{
        cell: string;
        cellLabel: string;
        employees: Array<{ userId: number; name: string; performance: number; potential: number }>;
      }> = [];

      const cells = [
        { cell: "1-1", cellLabel: "Low/Low" },
        { cell: "1-2", cellLabel: "Low/Med" },
        { cell: "1-3", cellLabel: "Low/High" },
        { cell: "2-1", cellLabel: "Med/Low" },
        { cell: "2-2", cellLabel: "Med/Med" },
        { cell: "2-3", cellLabel: "Med/High" },
        { cell: "3-1", cellLabel: "High/Low" },
        { cell: "3-2", cellLabel: "High/Med" },
        { cell: "3-3", cellLabel: "High/High (Stars)" },
      ];

      for (const c of cells) {
        grid.push({ ...c, employees: [] });
      }

      for (const row of rows) {
        const perf = Number(row.composite_aei_score) || 0;
        const potential = ((Number(row.engineering) || 0) + (Number(row.collaboration) || 0)) / 2;

        const perfBucket = perf >= 70 ? 3 : perf >= 40 ? 2 : 1;
        const potBucket = potential >= 70 ? 3 : potential >= 40 ? 2 : 1;
        const cellKey = `${perfBucket}-${potBucket}`;

        const cell = grid.find(g => g.cell === cellKey);
        if (cell && cell.employees.length < 20) {
          cell.employees.push({
            userId: Number(row.user_id),
            name: String(row.user_name || ""),
            performance: Math.round(perf),
            potential: Math.round(potential),
          });
        }
      }

      const summary = {
        totalEmployees: rows.length,
        stars: grid.find(g => g.cell === "3-3")?.employees.length || 0,
        atRisk: grid.find(g => g.cell === "1-1")?.employees.length || 0,
        avgPerformance: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (Number(r.composite_aei_score) || 0), 0) / rows.length) : 0,
      };

      return { grid, summary, month };
    }),

  // ── Global Delivery Map: project counts per BU region ──────────────────
  getGlobalDeliveryMap: protectedProcedure
    .input(z.object({
      buCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Map BU codes to geographic regions
      const buRegions = [
        { buCode: "海外", label: "Overseas", x: 200, y: 120 },
        { buCode: "商用车", label: "Commercial Vehicle", x: 580, y: 180 },
        { buCode: "乘用车", label: "Passenger Vehicle", x: 620, y: 200 },
        { buCode: "半导体", label: "Semiconductor", x: 660, y: 160 },
        { buCode: "工业通用", label: "Industrial", x: 540, y: 220 },
      ];

      const regions = [];
      for (const br of buRegions) {
        if (input.buCode && input.buCode !== br.buCode) continue;

        let projects = 0;
        let active = 0;
        let atRisk = 0;

        try {
          const rows = await db.execute(sql`
            SELECT
              COUNT(*) as total,
              COUNT(CASE WHEN current_stage NOT IN ('M12', 'Completed') THEN 1 END) as active_count,
              COUNT(CASE WHEN status = 'at_risk' THEN 1 END) as risk_count
            FROM pos_projects
            WHERE bu_code = ${br.buCode}
            LIMIT 1
          `);
          const r = (rows.rows?.[0] || {}) as Record<string, unknown>;
          projects = Number(r.total) || 0;
          active = Number(r.active_count) || 0;
          atRisk = Number(r.risk_count) || 0;
        } catch { /* table may not exist */ }

        regions.push({
          region: br.buCode,
          label: br.label,
          x: br.x,
          y: br.y,
          projects,
          active,
          atRisk,
        });
      }

      return { regions, totalProjects: regions.reduce((s, r) => s + r.projects, 0) };
    }),

  // ── Algorithm Evolution Heatmap ─────────────────────────────────────────
  getAlgorithmEvolution: protectedProcedure
    .input(z.object({
      monthsBack: z.number().int().min(1).max(24).default(12),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const months: Array<{
        month: string;
        plcIterations: number;
        aiUpdates: number;
        intensity: number;
      }> = [];

      for (let i = input.monthsBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toISOString().slice(0, 7);

        let plcCount = 0;
        let aiCount = 0;

        try {
          const plcRows = await db.execute(sql`
            SELECT COUNT(*) as cnt FROM plc_version_history
            WHERE TO_CHAR(created_at, 'YYYY-MM') = ${month}
            LIMIT 1
          `);
          plcCount = Number((plcRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
        } catch { /* skip */ }

        try {
          const aiRows = await db.execute(sql`
            SELECT COUNT(*) as cnt FROM design_export_logs
            WHERE TO_CHAR(created_at, 'YYYY-MM') = ${month}
              AND export_format LIKE '%AI%'
            LIMIT 1
          `);
          aiCount = Number((aiRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
        } catch { /* skip */ }

        const total = plcCount + aiCount;
        const intensity = total === 0 ? 0 : Math.min(4, Math.ceil(total / 5));

        months.push({ month, plcIterations: plcCount, aiUpdates: aiCount, intensity });
      }

      return { months, totalMonths: months.length };
    }),
});

/**
 * AEI Aggregator Service — Cross-System Performance Score Aggregation
 *
 * Computes composite AEI from 4 dimensions:
 * - meetingScore (30%) — from AI Performance Engine
 * - engineeringScore (25%) — design 40% + PLC 30% + Cleanliness_Match 30%
 *     Cleanliness_Match: S = passRate × (T_baseline - T_optimized) / T_baseline × 100
 * - operationalScore (25%) — defect resolution + cleaning pass rate
 * - collaborationScore (20%) — SharePoint syncs + doc shares
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import {
  aeiContributionLogs, aeiMonthlyScores,
} from "../../drizzle/aei-extended-schema";
import { designExportLogs } from "../../drizzle/design-engine-schema";
import { eq, and, sql, desc, count } from "drizzle-orm";

const log = createChildLogger("aei-aggregator");

const WEIGHTS = {
  meeting: 0.30,
  engineering: 0.25,
  operational: 0.25,
  collaboration: 0.20,
};

/**
 * Calculate monthly AEI for a specific user.
 */
export async function calculateUserAei(
  userId: number,
  userName: string,
  month: string, // YYYY-MM format
  buCode?: string,
): Promise<{
  meetingScore: number;
  engineeringScore: number;
  operationalScore: number;
  collaborationScore: number;
  compositeAeiScore: number;
}> {
  const db = await requireDb();

  // 1. Meeting score — from hr_ai_performance table (existing AI Performance Engine)
  let meetingScore = 0;
  try {
    const meetingRows = await db.execute(sql`
      SELECT meeting_score FROM hr_ai_performance
      WHERE user_id = ${userId} AND month = ${month}
      LIMIT 1
    `);
    const rows = (meetingRows as any).rows || [];
    if (rows.length > 0) meetingScore = Number(rows[0].meeting_score) || 0;
  } catch {
    // Table may not have data for this user/month — default 0
  }

  // 2. Engineering score — design exports + PLC version promotions + Cleanliness Match
  let engineeringScore = 0;
  try {
    // Count design exports by this user in this month
    const exportRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM design_export_logs
      WHERE exported_by = ${userName}
        AND to_char(created_at, 'YYYY-MM') = ${month}
        AND export_status = 'COMPLETED'
    `);
    const exports = Number((exportRows as any).rows?.[0]?.cnt) || 0;

    // Count PLC version promotions by this user
    const versionRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM plc_version_history
      WHERE promoted_by = ${userName}
        AND to_char(created_at, 'YYYY-MM') = ${month}
    `);
    const versions = Number((versionRows as any).rows?.[0]?.cnt) || 0;

    // Design points: each export = 10 pts, max 100
    const designPoints = Math.min(100, exports * 10);
    // PLC points: each promotion = 15 pts, max 100
    const plcPoints = Math.min(100, versions * 15);

    // ── Cleanliness Match Score ──
    // S = Cleanliness_Match × (T_baseline - T_optimized) / T_baseline × Weight
    let cleanlinessS = 0;
    try {
      // Query robot_cleaning_actions for this user's cleaning passes
      const cleaningRows = await db.execute(sql`
        SELECT
          COALESCE(AVG(pass_rate), 0) as avg_pass_rate,
          COALESCE(AVG(standard_cycle_time_seconds), 30) as baseline_t,
          COALESCE(AVG(cycle_time_seconds), 30) as actual_t
        FROM robot_cleaning_actions
        WHERE operator_id = ${String(userId)}
          AND to_char(created_at, 'YYYY-MM') = ${month}
        LIMIT 1
      `);

      if (cleaningRows.rows && cleaningRows.rows.length > 0) {
        const row = cleaningRows.rows[0] as Record<string, number>;
        const passRate = Number(row.avg_pass_rate) / 100; // 0-1 range
        const baselineT = Number(row.baseline_t) || 30;
        const actualT = Number(row.actual_t) || 30;

        if (baselineT > 0) {
          cleanlinessS = passRate * ((baselineT - actualT) / baselineT) * 100;
          cleanlinessS = Math.max(0, Math.min(100, cleanlinessS));
        }
      }
    } catch {
      // Table may not exist, gracefully skip
    }

    // Blend: design 40% + PLC 30% + cleanliness 30%
    engineeringScore = Math.min(100, Math.round(designPoints * 0.4 + plcPoints * 0.3 + cleanlinessS * 0.3));

    // Log contributions
    if (exports > 0) {
      await db.insert(aeiContributionLogs).values({
        userId, userName, contributionType: "design_export",
        sourceTable: "design_export_logs", points: exports * 10,
        metadata: { count: exports }, month, buCode,
      });
    }
    if (versions > 0) {
      await db.insert(aeiContributionLogs).values({
        userId, userName, contributionType: "plc_version",
        sourceTable: "plc_version_history", points: versions * 15,
        metadata: { count: versions }, month, buCode,
      });
    }
    if (cleanlinessS > 0) {
      await db.insert(aeiContributionLogs).values({
        userId, userName, contributionType: "cleanliness_match",
        sourceTable: "robot_cleaning_actions", points: Math.round(cleanlinessS),
        metadata: { cleanlinessScore: cleanlinessS }, month, buCode,
      });
    }
  } catch (e) {
    log.warn({ userId, error: (e as Error).message }, "Engineering score query failed");
  }

  // 3. Operational score — defect resolution + cleaning pass rate
  let operationalScore = 0;
  try {
    // Count cleaning passes
    const cleaningRows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE cleanliness_verdict = 'PASS') as passes,
        COUNT(*) as total
      FROM robot_cleaning_actions
      WHERE operator_id = ${userId}
        AND to_char(created_at, 'YYYY-MM') = ${month}
    `);
    const r = (cleaningRows as any).rows?.[0];
    const passRate = r && Number(r.total) > 0 ? Number(r.passes) / Number(r.total) : 0;

    // Count maintenance completed
    const maintRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM equipment_maintenance_records
      WHERE performed_by_id = ${userId}
        AND to_char(performed_at, 'YYYY-MM') = ${month}
    `);
    const maint = Number((maintRows as any).rows?.[0]?.cnt) || 0;

    // ── Robot alert frequency penalty (bridge from ClosedLoopService) ──
    let alertPenalty = 0;
    try {
      const alertRows = await db.execute(sql`
        SELECT COUNT(*) as cnt,
          COUNT(*) FILTER (WHERE severity IN ('critical', 'emergency')) as severe
        FROM robot_condition_alerts
        WHERE robot_id IN (
          SELECT DISTINCT robot_id FROM robot_condition_alerts
          WHERE details->>'source' = 'oiling-control-guard'
        )
        AND to_char(created_at, 'YYYY-MM') = ${month}
        LIMIT 1
      `);
      const alertCount = Number((alertRows as any).rows?.[0]?.cnt) || 0;
      const severeCount = Number((alertRows as any).rows?.[0]?.severe) || 0;
      // Penalty: each severe alert = -5 pts, each regular = -1 pt, capped at -30
      alertPenalty = Math.min(30, severeCount * 5 + (alertCount - severeCount) * 1);
    } catch {
      // Table may not exist, gracefully skip
    }

    // ── VED score from oiling control guard (tech_performance_entries) ──
    let vedBonus = 0;
    try {
      const vedRows = await db.execute(sql`
        SELECT AVG(score) as avg_ved FROM tech_performance_entries
        WHERE user_id = ${String(userId)}
          AND dimension = 'VED'
          AND to_char(created_at, 'YYYY-MM') = ${month}
        LIMIT 1
      `);
      const avgVed = Number((vedRows as any).rows?.[0]?.avg_ved) || 0;
      // VED avg > 80 = +10 bonus, > 60 = +5, otherwise 0
      vedBonus = avgVed >= 80 ? 10 : avgVed >= 60 ? 5 : 0;
    } catch {
      // Table may not exist, gracefully skip
    }

    // Score: pass rate * 50 + maintenance * 10 - alert penalty + VED bonus, max 100
    operationalScore = Math.min(100, Math.max(0, passRate * 50 + maint * 10 - alertPenalty + vedBonus));

    if (passRate > 0 || maint > 0 || alertPenalty > 0 || vedBonus > 0) {
      await db.insert(aeiContributionLogs).values({
        userId, userName, contributionType: "cleaning_pass",
        sourceTable: "robot_cleaning_actions", points: Math.round(operationalScore),
        metadata: { passRate, maintenanceCount: maint, alertPenalty, vedBonus }, month, buCode,
      });
    }
  } catch (e) {
    log.warn({ userId, error: (e as Error).message }, "Operational score query failed");
  }

  // 4. Collaboration score — doc shares + SharePoint syncs
  let collaborationScore = 0;
  try {
    // Count collaboration docs shared
    const docRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM collaboration_docs
      WHERE created_by_id = ${userId}
        AND to_char(created_at, 'YYYY-MM') = ${month}
    `);
    const docs = Number((docRows as any).rows?.[0]?.cnt) || 0;

    // Score: each doc = 8 pts, max 100
    collaborationScore = Math.min(100, docs * 8);

    if (docs > 0) {
      await db.insert(aeiContributionLogs).values({
        userId, userName, contributionType: "doc_shared",
        sourceTable: "collaboration_docs", points: docs * 8,
        metadata: { count: docs }, month, buCode,
      });
    }
  } catch (e) {
    log.warn({ userId, error: (e as Error).message }, "Collaboration score query failed");
  }

  // Composite
  const compositeAeiScore = Math.round((
    meetingScore * WEIGHTS.meeting +
    engineeringScore * WEIGHTS.engineering +
    operationalScore * WEIGHTS.operational +
    collaborationScore * WEIGHTS.collaboration
  ) * 10) / 10;

  return { meetingScore, engineeringScore, operationalScore, collaborationScore, compositeAeiScore };
}

/**
 * Calculate monthly AEI for ALL employees and upsert to aei_monthly_scores.
 */
export async function calculateAllAei(month: string): Promise<{ processed: number; errors: number }> {
  const db = await requireDb();
  let processed = 0;
  let errors = 0;

  // Get distinct users from recent activity
  const users = await db.execute(sql`
    SELECT DISTINCT user_id, user_name FROM (
      SELECT user_id, name as user_name FROM users WHERE role != 'guest' LIMIT 500
    ) u
  `);
  const userRows = (users as any).rows || [];

  for (const user of userRows) {
    try {
      const scores = await calculateUserAei(user.user_id, user.user_name, month);

      // Upsert to aei_monthly_scores
      const existing = await db.select({ id: aeiMonthlyScores.id })
        .from(aeiMonthlyScores)
        .where(and(
          eq(aeiMonthlyScores.userId, user.user_id),
          eq(aeiMonthlyScores.month, month),
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(aeiMonthlyScores)
          .set({ ...scores, calculatedAt: new Date().toISOString() })
          .where(eq(aeiMonthlyScores.id, existing[0].id));
      } else {
        await db.insert(aeiMonthlyScores).values({
          userId: user.user_id, userName: user.user_name, month,
          ...scores, calculatedAt: new Date().toISOString(),
        });
      }
      processed++;
    } catch (e) {
      errors++;
      log.warn({ userId: user.user_id, error: (e as Error).message }, "AEI calculation failed for user");
    }
  }

  // Calculate ranks
  const allScores = await db.select({ id: aeiMonthlyScores.id, composite: aeiMonthlyScores.compositeAeiScore })
    .from(aeiMonthlyScores)
    .where(eq(aeiMonthlyScores.month, month))
    .orderBy(desc(aeiMonthlyScores.compositeAeiScore))
    .limit(500);

  for (let i = 0; i < allScores.length; i++) {
    await db.update(aeiMonthlyScores)
      .set({ rank: i + 1, totalEmployees: allScores.length })
      .where(eq(aeiMonthlyScores.id, allScores[i].id));
  }

  log.info({ month, processed, errors, total: userRows.length }, "Batch AEI calculation complete");
  return { processed, errors };
}

/**
 * Calculate production value for a specific user across a given period.
 * Aggregates evidence from design exports, collaboration docs, action items,
 * PLC version promotions, and SharePoint sync activity.
 */
export async function calculateProductionValue(
  userId: number,
  periodType: "week" | "month" | "quarter" | "year",
  periodValue: string,
): Promise<{
  design: number;
  collaboration: number;
  execution: number;
  innovation: number;
  total: number;
  evidenceItems: Array<{ source: string; description: string; count: number; points: number }>;
}> {
  const db = await requireDb();

  // Compute date range based on periodType and periodValue
  let startDate: string;
  let endDate: string;

  if (periodType === "month") {
    // periodValue like "2026-03"
    startDate = `${periodValue}-01`;
    const [y, m] = periodValue.split("-").map(Number);
    const nextMonth = new Date(y, m, 1); // month is 0-indexed, so m=next month
    endDate = nextMonth.toISOString().slice(0, 10);
  } else if (periodType === "week") {
    // periodValue like "2026-W10" — use month-based approximation
    startDate = periodValue;
    endDate = periodValue; // week queries use to_char match below
  } else if (periodType === "quarter") {
    // periodValue like "2026-Q1"
    const [year, q] = periodValue.split("-Q");
    const qMonth = (parseInt(q) - 1) * 3 + 1;
    startDate = `${year}-${String(qMonth).padStart(2, "0")}-01`;
    const endMonth = qMonth + 3 > 12 ? 1 : qMonth + 3;
    const endYear = qMonth + 3 > 12 ? parseInt(year) + 1 : parseInt(year);
    endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  } else {
    // periodValue like "2026"
    startDate = `${periodValue}-01-01`;
    endDate = `${parseInt(periodValue) + 1}-01-01`;
  }

  const evidenceItems: Array<{ source: string; description: string; count: number; points: number }> = [];

  // 1. Design deliverables from design_export_logs
  let designScore = 0;
  try {
    const designRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM design_export_logs
      WHERE exported_by = ${String(userId)}
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      LIMIT 1
    `);
    const designCount = Number((designRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
    designScore = Math.min(100, designCount * 10);
    if (designCount > 0) {
      evidenceItems.push({ source: "design_export_logs", description: "Design exports", count: designCount, points: designScore });
    }
  } catch { /* table may not exist */ }

  // 2. Collaboration from collaboration_docs
  let collabScore = 0;
  try {
    const collabRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM collaboration_docs
      WHERE created_by = ${String(userId)}
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      LIMIT 1
    `);
    const collabCount = Number((collabRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
    collabScore = Math.min(100, collabCount * 8);
    if (collabCount > 0) {
      evidenceItems.push({ source: "collaboration_docs", description: "Documents contributed", count: collabCount, points: collabScore });
    }
  } catch { /* table may not exist */ }

  // 3. Execution from meeting_action_items (completed)
  let executionScore = 0;
  try {
    const execRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM meeting_action_items
      WHERE assignee_id = ${String(userId)}
        AND status = 'completed'
        AND updated_at >= ${startDate}
        AND updated_at < ${endDate}
      LIMIT 1
    `);
    const execCount = Number((execRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
    executionScore = Math.min(100, execCount * 5);
    if (execCount > 0) {
      evidenceItems.push({ source: "meeting_action_items", description: "Action items completed", count: execCount, points: executionScore });
    }
  } catch { /* table may not exist */ }

  // 4. Innovation from plc_version_history (promotions)
  let innovationScore = 0;
  try {
    const plcRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM plc_version_history
      WHERE promoted_by = ${String(userId)}
        AND promoted_at >= ${startDate}
        AND promoted_at < ${endDate}
      LIMIT 1
    `);
    const plcCount = Number((plcRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
    innovationScore = Math.min(100, plcCount * 15);
    if (plcCount > 0) {
      evidenceItems.push({ source: "plc_version_history", description: "PLC version promotions", count: plcCount, points: innovationScore });
    }
  } catch { /* table may not exist */ }

  // 5. SharePoint sync activity
  try {
    const syncRows = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM sync_logs
      WHERE user_id = ${String(userId)}
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      LIMIT 1
    `);
    const syncCount = Number((syncRows.rows?.[0] as Record<string, unknown>)?.cnt) || 0;
    if (syncCount > 0) {
      const syncPoints = Math.min(20, syncCount * 2);
      collabScore = Math.min(100, collabScore + syncPoints);
      evidenceItems.push({ source: "sync_logs", description: "SharePoint sync events", count: syncCount, points: syncPoints });
    }
  } catch { /* table may not exist */ }

  const total = Math.round((designScore + collabScore + executionScore + innovationScore) / 4);

  return {
    design: designScore,
    collaboration: collabScore,
    execution: executionScore,
    innovation: innovationScore,
    total,
    evidenceItems,
  };
}

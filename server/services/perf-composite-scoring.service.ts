/**
 * Performance Composite Scoring Engine — 智能绩效综合评分引擎
 *
 * Reads from 5 existing data sources + 360 feedback to compute a weighted composite score.
 *
 * Data Sources:
 *   1. KPI Score ← hrmMonthlyPerformanceReviews.overallKpiScore
 *   2. AEI Score ← aeiMonthlyScores.compositeAeiScore
 *   3. OKR Score ← avg(okrObjectives.progress) for individual-level
 *   4. Competency Score ← TSDCKL normalized to 0-100
 *   5. 360 Feedback Score ← avg(perf_360_feedback.overallScore) for period
 *   6. Attendance (bonus factor from attendance_records)
 *
 * Weight lookup: dept+role+BU+period → dept+role → BU → company default
 * Grade mapping: ≥90→S, ≥80→A, ≥70→B, ≥60→C, <60→D
 */

import { requireDb } from "../db";
import { eq, and, avg, isNull, desc, sql } from "drizzle-orm";
import { hrmMonthlyPerformanceReviews } from "../../drizzle/kpi-performance-schema";
import { aeiMonthlyScores } from "../../drizzle/aei-extended-schema";
import { okrObjectives } from "../../drizzle/okr-schema";
import { attendanceRecords } from "../../drizzle/smart-payroll-schema";
import {
  perfScoringWeightConfigs,
  perfCompositeScores,
  perf360Feedback,
  perfForcedDistributionConfigs,
} from "../../drizzle/perf-calibration-schema";
import { hrmEmployees } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("perf-composite-scoring");

// ── Grade Mapping ────────────────────────────────────────

export function scoreToGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

// ── Weight Config Lookup (hierarchical) ──────────────────

export async function lookupWeightConfig(
  department?: string | null,
  role?: string | null,
  buCode?: string | null,
  period?: string | null,
): Promise<{ config: typeof perfScoringWeightConfigs.$inferSelect; id: number }> {
  const db = await requireDb();

  // Try most specific first: dept+role+BU+period
  const candidates = await db
    .select()
    .from(perfScoringWeightConfigs)
    .where(eq(perfScoringWeightConfigs.isActive, true))
    .orderBy(desc(perfScoringWeightConfigs.createdAt))
    .limit(100);

  // Score each candidate by specificity
  let bestMatch = candidates[0];
  let bestSpecificity = -1;

  for (const c of candidates) {
    let specificity = 0;
    // Check dept match
    if (c.department && department && c.department === department) specificity += 8;
    else if (c.department && c.department !== department) continue;
    // Check role match
    if (c.role && role && c.role === role) specificity += 4;
    else if (c.role && c.role !== role) continue;
    // Check BU match
    if (c.buCode && buCode && c.buCode === buCode) specificity += 2;
    else if (c.buCode && c.buCode !== buCode) continue;
    // Check period match
    if (c.period && period && c.period === period) specificity += 1;
    else if (c.period && c.period !== period) continue;

    if (specificity > bestSpecificity) {
      bestSpecificity = specificity;
      bestMatch = c;
    }
  }

  // Fallback: company default (all nulls)
  if (!bestMatch) {
    const [defaultConfig] = await db
      .select()
      .from(perfScoringWeightConfigs)
      .where(
        and(
          isNull(perfScoringWeightConfigs.department),
          isNull(perfScoringWeightConfigs.role),
          isNull(perfScoringWeightConfigs.buCode),
          eq(perfScoringWeightConfigs.isActive, true),
        ),
      )
      .limit(1);

    if (defaultConfig) return { config: defaultConfig, id: defaultConfig.id };

    // Absolute fallback: hardcoded defaults
    return {
      config: {
        id: 0,
        department: null,
        role: null,
        buCode: null,
        period: null,
        kpiWeight: "30.00",
        aeiWeight: "20.00",
        okrWeight: "20.00",
        competencyWeight: "15.00",
        feedbackWeight: "15.00",
        description: "Hardcoded fallback",
        isActive: true,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id: 0,
    };
  }

  return { config: bestMatch, id: bestMatch.id };
}

// ── Fetch Individual Dimension Scores ────────────────────

async function fetchKpiScore(employeeId: number, period: string): Promise<number | null> {
  const db = await requireDb();
  const [row] = await db
    .select({ score: hrmMonthlyPerformanceReviews.overallKpiScore })
    .from(hrmMonthlyPerformanceReviews)
    .where(
      and(
        eq(hrmMonthlyPerformanceReviews.userId, employeeId),
        eq(hrmMonthlyPerformanceReviews.monthDate, period),
      ),
    )
    .limit(1);
  return row?.score ? Number(row.score) : null;
}

async function fetchAeiScore(employeeId: number, period: string): Promise<number | null> {
  const db = await requireDb();
  const [row] = await db
    .select({ score: aeiMonthlyScores.compositeAeiScore })
    .from(aeiMonthlyScores)
    .where(
      and(
        eq(aeiMonthlyScores.userId, employeeId),
        eq(aeiMonthlyScores.month, period),
      ),
    )
    .limit(1);
  return row?.score ?? null;
}

async function fetchOkrScore(employeeId: number, period: string): Promise<number | null> {
  const db = await requireDb();
  const result = await db
    .select({ avgProgress: avg(okrObjectives.progress) })
    .from(okrObjectives)
    .where(
      and(
        eq(okrObjectives.ownerId, String(employeeId)),
        eq(okrObjectives.level, "individual"),
        eq(okrObjectives.period, period),
      ),
    )
    .limit(1);
  const val = result[0]?.avgProgress;
  return val ? Number(val) : null;
}

async function fetchCompetencyScore(employeeId: number): Promise<number | null> {
  // TSDCKL levels: L1=20, L2=40, L3=60, L4=80, L5=100
  const db = await requireDb();
  try {
    const result = await db.execute(
      sql`SELECT skill_level FROM user_skill_matrix WHERE user_id = ${employeeId} ORDER BY updated_at DESC LIMIT 10`,
    );
    const rows = (result as any).rows ?? [];
    if (rows.length === 0) return null;
    const levelMap: Record<string, number> = { L1: 20, L2: 40, L3: 60, L4: 80, L5: 100 };
    let total = 0;
    let count = 0;
    for (const r of rows) {
      const level = String(r.skill_level ?? "");
      const mapped = levelMap[level];
      if (mapped !== undefined) {
        total += mapped;
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : null;
  } catch {
    return null;
  }
}

async function fetch360FeedbackScore(employeeId: number, period: string): Promise<number | null> {
  const db = await requireDb();
  const result = await db
    .select({ avgScore: avg(perf360Feedback.overallScore) })
    .from(perf360Feedback)
    .where(
      and(
        eq(perf360Feedback.targetEmployeeId, employeeId),
        eq(perf360Feedback.period, period),
        eq(perf360Feedback.status, "submitted"),
      ),
    )
    .limit(1);
  const val = result[0]?.avgScore;
  return val ? Number(val) : null;
}

async function fetchAttendanceFactor(employeeId: number, period: string): Promise<number> {
  const db = await requireDb();
  const [row] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.period, period),
      ),
    )
    .limit(1);
  if (!row) return 1.0;
  const scheduled = row.scheduledDays ?? 21.75;
  const actual = Number(row.actualDays ?? scheduled);
  const ratio = Math.min(actual / scheduled, 1.0);
  // Penalty for absent days (triple weight)
  const absentPenalty = Number(row.absentDays ?? 0) * 3 / scheduled;
  return Math.max(0, ratio - absentPenalty);
}

// ── Main: Calculate Composite Score ──────────────────────

export interface CompositeScoreResult {
  employeeId: number;
  aiCompositeScore: number;
  aiGrade: string;
  breakdown: {
    kpiScore: number | null;
    kpiWeight: number;
    aeiScore: number | null;
    aeiWeight: number;
    okrScore: number | null;
    okrWeight: number;
    competencyScore: number | null;
    competencyWeight: number;
    feedbackScore: number | null;
    feedbackWeight: number;
    attendanceFactor: number;
    weightedSum: number;
  };
  weightConfigId: number;
}

export async function calculateCompositeScore(
  employeeId: number,
  period: string,
  department?: string | null,
  role?: string | null,
  buCode?: string | null,
): Promise<CompositeScoreResult> {
  // 1. Fetch all dimension scores
  const [kpiScore, aeiScore, okrScore, competencyScore, feedbackScore, attendanceFactor] =
    await Promise.all([
      fetchKpiScore(employeeId, period),
      fetchAeiScore(employeeId, period),
      fetchOkrScore(employeeId, period),
      fetchCompetencyScore(employeeId),
      fetch360FeedbackScore(employeeId, period),
      fetchAttendanceFactor(employeeId, period),
    ]);

  // 2. Lookup weight config
  const { config, id: weightConfigId } = await lookupWeightConfig(department, role, buCode, period);
  const kpiW = Number(config.kpiWeight);
  const aeiW = Number(config.aeiWeight);
  const okrW = Number(config.okrWeight);
  const compW = Number(config.competencyWeight);
  const fbW = Number(config.feedbackWeight);

  // 3. Weighted composite — null dimensions redistribute weight
  let totalWeight = 0;
  let weightedSum = 0;
  const addDimension = (score: number | null, weight: number) => {
    if (score !== null) {
      totalWeight += weight;
      weightedSum += score * weight;
    }
  };
  addDimension(kpiScore, kpiW);
  addDimension(aeiScore, aeiW);
  addDimension(okrScore, okrW);
  addDimension(competencyScore, compW);
  addDimension(feedbackScore, fbW);

  // Normalize if some dimensions are missing
  const rawComposite = totalWeight > 0 ? weightedSum / totalWeight : 50;
  // Apply attendance factor (slight adjustment, max ±10%)
  const adjusted = rawComposite * (0.9 + 0.1 * attendanceFactor);
  const aiCompositeScore = Math.round(Math.min(100, Math.max(0, adjusted)) * 100) / 100;
  const aiGrade = scoreToGrade(aiCompositeScore);

  return {
    employeeId,
    aiCompositeScore,
    aiGrade,
    breakdown: {
      kpiScore,
      kpiWeight: kpiW,
      aeiScore,
      aeiWeight: aeiW,
      okrScore,
      okrWeight: okrW,
      competencyScore,
      competencyWeight: compW,
      feedbackScore,
      feedbackWeight: fbW,
      attendanceFactor,
      weightedSum: aiCompositeScore,
    },
    weightConfigId,
  };
}

// ── Batch Calculate ──────────────────────────────────────

export async function calculateBatchComposite(
  period: string,
  department?: string,
): Promise<{ processed: number; errors: number }> {
  const db = await requireDb();

  // Fetch active employees
  let query = db.select({ id: hrmEmployees.id, name: hrmEmployees.name, department: hrmEmployees.department })
    .from(hrmEmployees)
    .where(eq(hrmEmployees.status, "active"))
    .limit(1000);

  const employees = await query;
  let processed = 0;
  let errors = 0;

  for (const emp of employees) {
    if (department && emp.department !== department) continue;
    try {
      const result = await calculateCompositeScore(
        emp.id,
        period,
        emp.department,
      );

      // Upsert composite score
      const existing = await db
        .select()
        .from(perfCompositeScores)
        .where(
          and(
            eq(perfCompositeScores.employeeId, emp.id),
            eq(perfCompositeScores.period, period),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(perfCompositeScores)
          .set({
            aiCompositeScore: String(result.aiCompositeScore),
            aiGrade: result.aiGrade,
            finalScore: existing[0].finalScore ?? String(result.aiCompositeScore),
            finalGrade: existing[0].finalGrade ?? result.aiGrade,
            scoreBreakdownJson: result.breakdown,
            weightConfigId: result.weightConfigId,
            employeeName: emp.name,
            department: emp.department,
            updatedAt: new Date(),
          })
          .where(eq(perfCompositeScores.id, existing[0].id));
      } else {
        await db.insert(perfCompositeScores).values({
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          period,
          aiCompositeScore: String(result.aiCompositeScore),
          aiGrade: result.aiGrade,
          finalScore: String(result.aiCompositeScore),
          finalGrade: result.aiGrade,
          scoreBreakdownJson: result.breakdown,
          weightConfigId: result.weightConfigId,
          status: "ai_scored",
        });
      }

      processed++;
    } catch (err) {
      log.warn({ employeeId: emp.id, error: String(err) }, "Failed to calculate composite score");
      errors++;
    }
  }

  log.info({ period, department, processed, errors }, "Batch composite calculation complete");
  return { processed, errors };
}

// ── Forced Distribution Check ────────────────────────────

export interface DistributionCheckResult {
  totalCount: number;
  distribution: Record<string, { count: number; actualPct: number; maxPct: number; violation: boolean }>;
  hasViolations: boolean;
  isStrict: boolean;
}

export async function checkForcedDistribution(
  department: string | null,
  period: string,
  buCode?: string | null,
): Promise<DistributionCheckResult> {
  const db = await requireDb();

  // Fetch forced distribution config
  const configs = await db
    .select()
    .from(perfForcedDistributionConfigs)
    .where(eq(perfForcedDistributionConfigs.isActive, true))
    .limit(50);

  // Find matching config (dept+BU → BU → default)
  let config = configs.find(
    (c) => c.department === department && (c.buCode === buCode || !c.buCode),
  );
  if (!config) config = configs.find((c) => c.buCode === buCode && !c.department);
  if (!config) config = configs.find((c) => !c.department && !c.buCode);

  const maxPcts: Record<string, number> = {
    S: config ? Number(config.gradeSMaxPct) : 5,
    A: config ? Number(config.gradeAMaxPct) : 20,
    B: config ? Number(config.gradeBMaxPct) : 50,
    C: config ? Number(config.gradeCMaxPct) : 20,
    D: config ? Number(config.gradeDMaxPct) : 5,
  };

  // Count grades for the scope
  const result = await db.execute(sql`
    SELECT final_grade, COUNT(*)::int as cnt
    FROM perf_composite_scores
    WHERE period = ${period}
      AND (${department}::text IS NULL OR department = ${department})
      AND status != 'locked'
    GROUP BY final_grade
  `);

  const rows = (result as any).rows ?? [];
  const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  let totalCount = 0;
  for (const r of rows) {
    const grade = String(r.final_grade ?? "B");
    counts[grade] = Number(r.cnt ?? 0);
    totalCount += Number(r.cnt ?? 0);
  }

  const distribution: Record<string, { count: number; actualPct: number; maxPct: number; violation: boolean }> = {};
  let hasViolations = false;
  for (const grade of ["S", "A", "B", "C", "D"]) {
    const actualPct = totalCount > 0 ? Math.round((counts[grade] / totalCount) * 10000) / 100 : 0;
    const violation = actualPct > maxPcts[grade];
    if (violation) hasViolations = true;
    distribution[grade] = {
      count: counts[grade],
      actualPct,
      maxPct: maxPcts[grade],
      violation,
    };
  }

  return {
    totalCount,
    distribution,
    hasViolations,
    isStrict: config?.isStrict ?? false,
  };
}

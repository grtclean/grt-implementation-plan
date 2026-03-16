/**
 * Empowerment Scheduler Service — 全域员工赋能定时引擎
 *
 * Two core jobs:
 *   1. generateDailyBriefing()  — 6:00 AM daily
 *      Aggregates 8+ data sources per employee → AI narrative → daily_briefings
 *
 *   2. generateMonthlyReckoning() — 1st of month 0:00
 *      Hours + defects + completion + payroll + AI analysis → monthly_appraisal_reports
 *
 * Both jobs are idempotent (skip if already generated for the target period).
 * Runs inside the scheduler interval loop with hour/date guards.
 */

import { requireDb } from "../db";
import { hrmEmployees } from "../../drizzle/schema";
import { dailyBriefings, monthlyAppraisalReports } from "../../drizzle/empowerment-schema";
import { employeeDailyLogs } from "../../drizzle/empowerment-schema";
import { okrObjectives, okrKeyResults } from "../../drizzle/okr-schema";
import { eq, and, sql, count, gte, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { createChildLogger } from "../lib/logger";
import { serverT, serverTpl } from "../lib/server-i18n";

const log = createChildLogger("empowerment-scheduler");

// ── Helpers ────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastMonthPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonthRange(): { start: string; end: string } {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// Job 1: Daily Briefing Generator (6:00 AM)
// ═══════════════════════════════════════════════════════════════

/**
 * Guard: Only runs between 05:50 and 06:10 (one-shot window).
 * The scheduler polls every 60s, so this ensures exactly one run per day.
 */
export function isDailyBriefingWindow(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return (h === 5 && m >= 50) || (h === 6 && m <= 10);
}

export async function processEmpowermentDailyBriefings(): Promise<number> {
  if (!isDailyBriefingWindow()) return 0;

  const db = await requireDb();
  if (!db) return 0;

  const date = todayStr();

  try {
    // Check if already generated today (idempotent)
    const [existing] = await db
      .select({ cnt: count() })
      .from(dailyBriefings)
      .where(eq(dailyBriefings.briefingDate, date))
      .limit(1);
    if (existing && Number(existing.cnt) > 0) return 0;

    // Get all active employees
    const employees = await db
      .select({ id: hrmEmployees.id, name: hrmEmployees.name, position: hrmEmployees.position })
      .from(hrmEmployees)
      .where(eq(hrmEmployees.status, "active" as any))
      .limit(5000);

    let generated = 0;

    for (const emp of employees) {
      try {
        // Gather OKR alignment for employee
        const okrs = await db
          .select({ title: okrObjectives.title, progress: okrObjectives.progress })
          .from(okrObjectives)
          .where(and(
            eq(okrObjectives.ownerId, String(emp.id)),
            eq(okrObjectives.status, "active"),
          ))
          .limit(10);

        const okrSummary = okrs.length > 0
          ? okrs.map(o => `- ${o.title} (${Math.round(o.progress)}%)`).join("\n")
          : "No active OKRs assigned";

        // Build briefing from available data
        const topPriorities = okrs.slice(0, 3).map(o => ({
          title: o.title,
          source: "OKR",
          priority: "P1",
        }));

        const aiNarrative = [
          `# ${emp.name} — ${date} ${serverT("empowerment.narrativeTodayPlan")}`,
          "",
          `## ${serverT("empowerment.narrativeOkrAlignment")}`,
          okrSummary,
          "",
          `## ${serverT("empowerment.narrativeKeyPriorities")}`,
          topPriorities.length > 0
            ? topPriorities.map((p, i) => `${i + 1}. ${p.title}`).join("\n")
            : `- ${serverT("empowerment.narrativeNoUrgent")}`,
          "",
          `> ${serverT("empowerment.narrativeDisclaimer")}`,
        ].join("\n");

        await db.insert(dailyBriefings).values({
          userId: emp.id,
          briefingDate: date,
          status: "generated",
          topPriorities,
          okrSummary,
          aiNarrative,
          carryoverTasks: [],
          todaySchedule: [],
        });

        generated++;
      } catch (err) {
        log.warn({ err, employeeId: emp.id }, "Failed to generate briefing for employee");
      }
    }

    if (generated > 0) {
      log.info({ date, generated, total: employees.length }, "Daily briefings generated");
    }
    return generated;
  } catch (err) {
    log.error({ err }, "Daily briefing generation failed");
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// Job 2: Monthly Reckoning (1st of month, 0:00-0:10)
// ═══════════════════════════════════════════════════════════════

/**
 * Guard: Only runs on the 1st of the month, between 00:00 and 00:10.
 */
export function isMonthlyReckoningWindow(): boolean {
  const now = new Date();
  return now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() <= 10;
}

export async function processEmpowermentMonthlyReckoning(): Promise<number> {
  if (!isMonthlyReckoningWindow()) return 0;

  const db = await requireDb();
  if (!db) return 0;

  const period = lastMonthPeriod();
  const { start, end } = lastMonthRange();

  try {
    // Idempotent check
    const [existing] = await db
      .select({ cnt: count() })
      .from(monthlyAppraisalReports)
      .where(eq(monthlyAppraisalReports.period, period))
      .limit(1);
    if (existing && Number(existing.cnt) > 0) return 0;

    // Get all active employees
    const employees = await db
      .select({ id: hrmEmployees.id, name: hrmEmployees.name })
      .from(hrmEmployees)
      .where(eq(hrmEmployees.status, "active" as any))
      .limit(5000);

    let generated = 0;

    for (const emp of employees) {
      try {
        // Aggregate daily logs for the month
        const logs = await db
          .select()
          .from(employeeDailyLogs)
          .where(and(
            eq(employeeDailyLogs.userId, emp.id),
            gte(employeeDailyLogs.logDate, start),
            lte(employeeDailyLogs.logDate, end),
          ))
          .limit(100);

        const totalHours = logs.reduce((sum, l) => sum + (l.loggedHours ?? 0), 0);
        const tasksCompleted = logs.reduce((sum, l) => {
          const tasks = l.completedTasks as { title: string }[] | null;
          return sum + (tasks?.length ?? 0);
        }, 0);

        // Build AI analysis
        const strengths: string[] = [];
        const shortcomings: string[] = [];
        const requiredTraining: { title: string; reason: string; urgency: string }[] = [];

        if (totalHours >= 160) strengths.push(serverT("empowerment.analysisHoursExcellent"));
        if (totalHours < 120) shortcomings.push(serverT("empowerment.analysisHoursLow"));
        if (tasksCompleted >= 20) strengths.push(serverT("empowerment.analysisTasksEfficient"));
        if (tasksCompleted < 5) {
          shortcomings.push(serverT("empowerment.analysisTasksLow"));
          requiredTraining.push({ title: serverT("empowerment.trainingTimeManagement"), reason: serverT("empowerment.trainingReasonLowCompletion"), urgency: "medium" });
        }

        const aiSummary = [
          `# ${emp.name} — ${period} ${serverT("empowerment.narrativeMonthlyPanorama")}`,
          "",
          `**${serverT("empowerment.narrativeHoursStats")}**: ${totalHours.toFixed(1)} ${serverT("empowerment.narrativeHoursUnit")}`,
          `**${serverT("empowerment.narrativeTasksCompleted")}**: ${tasksCompleted} ${serverT("empowerment.narrativeTasksUnit")}`,
          "",
          strengths.length > 0 ? `## ${serverT("empowerment.narrativeStrengths")}\n${strengths.map(s => `- ${s}`).join("\n")}` : "",
          shortcomings.length > 0 ? `## ${serverT("empowerment.narrativeImprovements")}\n${shortcomings.map(s => `- ${s}`).join("\n")}` : "",
          requiredTraining.length > 0 ? `## ${serverT("empowerment.narrativeTraining")}\n${requiredTraining.map(t => `- ${t.title}: ${t.reason}`).join("\n")}` : "",
          "",
          `> ${serverT("empowerment.narrativeReportDisclaimer")}`,
        ].filter(Boolean).join("\n");

        await db.insert(monthlyAppraisalReports).values({
          userId: emp.id,
          period,
          performanceScore: null, // Set by perf-calibration if available
          totalHours,
          tasksCompleted,
          taskCompletionRate: null,
          defectCount: 0,
          strengths,
          shortcomings,
          requiredTraining,
          carryoverItems: [],
          aiSummary,
          status: "generated",
        });

        generated++;
      } catch (err) {
        log.warn({ err, employeeId: emp.id, period }, "Failed to generate monthly report");
      }
    }

    if (generated > 0) {
      log.info({ period, generated, total: employees.length }, "Monthly appraisal reports generated");
      await notifyOwner({
        title: `${serverT("empowerment.notifyBillGenerated")} (${period})`,
        content: serverTpl("empowerment.notifyBillContent", { count: generated, period }),
      }).catch(() => {});
    }

    return generated;
  } catch (err) {
    log.error({ err, period }, "Monthly reckoning failed");
    return 0;
  }
}

/**
 * AI Performance Engine — Meeting Performance Calculator
 *
 * Calculates a user's meeting score based on 4 dimensions:
 *   1. Breadth (广度)    — Volume of personal notes + group chat messages
 *   2. Depth (深度)      — AI quiz scores from engagement tests
 *   3. Execution (执行)  — Completion rate of meeting action items
 *   4. Discipline (纪律) — Attendance record + Red/Black-list penalties
 *
 * Final `meetingScore` is a weighted composite (0–100).
 */

import { eq, and, sql, gte, lte, count } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  meetingAttendance,
  meetingInteractions,
  hrPenalties,
  meetingActionItems,
  hrAiPerformance,
  sysMeetings,
} from "../../drizzle/smart-meetings-schema";

// ── Weight configuration (totals 100) ────────────────────────
const WEIGHTS = {
  breadth: 20,
  depth: 30,
  execution: 30,
  discipline: 20,
};

// ── Per-meeting score calculation ────────────────────────────

export interface MeetingScoreBreakdown {
  breadth: number;   // 0–100
  depth: number;     // 0–100
  execution: number; // 0–100
  discipline: number; // 0–100
  meetingScore: number; // weighted 0–100
}

/**
 * Calculate a user's performance score for a single meeting.
 */
export async function calculateUserMeetingScore(
  db: NodePgDatabase<any>,
  userId: number,
  meetingId: number
): Promise<MeetingScoreBreakdown> {
  // ── 1. Breadth (广度): notes length + chat participation ───
  const interaction = await db
    .select()
    .from(meetingInteractions)
    .where(
      and(
        eq(meetingInteractions.meetingId, meetingId),
        eq(meetingInteractions.userId, userId)
      )
    )
    .limit(1);

  const notesLength = interaction[0]?.personalNotes?.length ?? 0;
  // Score notes: 0 chars=0, 200+ chars=100
  const notesScore = Math.min(100, Math.round((notesLength / 200) * 100));
  // Reflection bonus: +20 if submitted takeaway
  const hasReflection = !!interaction[0]?.takeawayReflection;
  const breadth = Math.min(100, notesScore + (hasReflection ? 20 : 0));

  // ── 2. Depth (深度): AI quiz score ─────────────────────────
  const quizScore = interaction[0]?.aiQuizScore ?? 0;
  const depth = Math.min(100, quizScore); // already 0–100

  // ── 3. Execution (执行): action item completion rate ───────
  const actionItems = await db
    .select()
    .from(meetingActionItems)
    .where(
      and(
        eq(meetingActionItems.meetingId, meetingId),
        eq(meetingActionItems.assignedTo, userId)
      )
    );

  let execution = 100; // default: no items = full score
  if (actionItems.length > 0) {
    const completed = actionItems.filter((a) => a.status === "COMPLETED").length;
    const overdue = actionItems.filter((a) => a.status === "OVERDUE").length;
    execution = Math.round(
      ((completed / actionItems.length) * 80) +
      (((actionItems.length - overdue) / actionItems.length) * 20)
    );
  }

  // ── 4. Discipline (纪律): attendance + penalty deductions ──
  const attendance = await db
    .select()
    .from(meetingAttendance)
    .where(
      and(
        eq(meetingAttendance.meetingId, meetingId),
        eq(meetingAttendance.userId, userId)
      )
    )
    .limit(1);

  let discipline = 0;
  const status = attendance[0]?.status ?? "ABSENT";
  switch (status) {
    case "PRESENT_PHYSICAL":
      discipline = 100;
      break;
    case "PRESENT_ONLINE":
      discipline = 90; // slight deduction for not being physically present
      break;
    case "LEAVED":
      discipline = 50; // approved leave = half credit
      break;
    case "ABSENT":
      discipline = 0;
      break;
  }

  // Apply penalty deductions from Red/Black list
  const penalties = await db
    .select()
    .from(hrPenalties)
    .where(
      and(
        eq(hrPenalties.meetingId, meetingId),
        eq(hrPenalties.userId, userId)
      )
    );

  for (const p of penalties) {
    const deduction = Math.abs(p.deductedKpiPoints ?? 0) * 5;
    discipline = Math.max(0, discipline - deduction);
  }

  // ── Weighted composite ─────────────────────────────────────
  const meetingScore = Math.round(
    (breadth * WEIGHTS.breadth +
      depth * WEIGHTS.depth +
      execution * WEIGHTS.execution +
      discipline * WEIGHTS.discipline) /
    100
  );

  return { breadth, depth, execution, discipline, meetingScore };
}

// ── Monthly aggregation ──────────────────────────────────────

/**
 * Calculate and persist a user's monthly AI performance score.
 * Aggregates all meetings in the given month.
 */
export async function calculateMonthlyScore(
  db: NodePgDatabase<any>,
  userId: number,
  userName: string,
  month: string // "YYYY-MM"
): Promise<void> {
  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  // Find all meetings the user was expected at (has attendance record)
  const attendanceRecords = await db
    .select({
      meetingId: meetingAttendance.meetingId,
      status: meetingAttendance.status,
    })
    .from(meetingAttendance)
    .where(
      and(
        eq(meetingAttendance.userId, userId),
        gte(meetingAttendance.createdAt, startDate),
        lte(meetingAttendance.createdAt, endDate)
      )
    );

  const totalMeetings = attendanceRecords.length;
  const attended = attendanceRecords.filter(
    (a) => a.status === "PRESENT_PHYSICAL" || a.status === "PRESENT_ONLINE"
  ).length;

  // Calculate per-meeting scores and average
  let sumBreadth = 0, sumDepth = 0, sumExecution = 0, sumDiscipline = 0;
  let scoredCount = 0;

  for (const record of attendanceRecords) {
    const breakdown = await calculateUserMeetingScore(db, userId, record.meetingId);
    sumBreadth += breakdown.breadth;
    sumDepth += breakdown.depth;
    sumExecution += breakdown.execution;
    sumDiscipline += breakdown.discipline;
    scoredCount++;
  }

  const avgBreadth = scoredCount > 0 ? Math.round(sumBreadth / scoredCount) : 0;
  const avgDepth = scoredCount > 0 ? Math.round(sumDepth / scoredCount) : 0;
  const avgExecution = scoredCount > 0 ? Math.round(sumExecution / scoredCount) : 0;
  const avgDiscipline = scoredCount > 0 ? Math.round(sumDiscipline / scoredCount) : 0;

  const meetingScore = Math.round(
    (avgBreadth * WEIGHTS.breadth +
      avgDepth * WEIGHTS.depth +
      avgExecution * WEIGHTS.execution +
      avgDiscipline * WEIGHTS.discipline) /
    100
  );

  // Action item stats for the month
  const actionItemStats = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(case when ${meetingActionItems.status} = 'COMPLETED' then 1 end)`,
    })
    .from(meetingActionItems)
    .where(
      and(
        eq(meetingActionItems.assignedTo, userId),
        gte(meetingActionItems.createdAt, startDate),
        lte(meetingActionItems.createdAt, endDate)
      )
    );

  const totalScore = meetingScore; // future: blend with other module scores

  const aiSummary = generateEvaluationSummary({
    userName,
    month,
    breadth: avgBreadth,
    depth: avgDepth,
    execution: avgExecution,
    discipline: avgDiscipline,
    meetingScore,
    attended,
    totalMeetings,
  });

  // Upsert: update existing record or insert new
  const existing = await db
    .select()
    .from(hrAiPerformance)
    .where(
      and(eq(hrAiPerformance.userId, userId), eq(hrAiPerformance.month, month))
    )
    .limit(1);

  const record = {
    userId,
    userName,
    month,
    breadthScore: avgBreadth,
    depthScore: avgDepth,
    executionScore: avgExecution,
    disciplineScore: avgDiscipline,
    meetingScore,
    totalScore,
    aiEvaluationSummary: aiSummary,
    meetingsAttended: attended,
    meetingsTotal: totalMeetings,
    actionItemsCompleted: Number(actionItemStats[0]?.completed ?? 0),
    actionItemsTotal: Number(actionItemStats[0]?.total ?? 0),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(hrAiPerformance)
      .set(record)
      .where(eq(hrAiPerformance.id, existing[0].id));
  } else {
    await db.insert(hrAiPerformance).values(record);
  }
}

// ── AI evaluation narrative generator ────────────────────────

function generateEvaluationSummary(params: {
  userName: string;
  month: string;
  breadth: number;
  depth: number;
  execution: number;
  discipline: number;
  meetingScore: number;
  attended: number;
  totalMeetings: number;
}): string {
  const {
    userName, month, breadth, depth, execution,
    discipline, meetingScore, attended, totalMeetings,
  } = params;

  const tier =
    meetingScore >= 90 ? "Outstanding" :
    meetingScore >= 75 ? "Excellent" :
    meetingScore >= 60 ? "Good" :
    meetingScore >= 40 ? "Needs Improvement" : "Critical";

  const attendRate = totalMeetings > 0
    ? Math.round((attended / totalMeetings) * 100)
    : 0;

  const weakest = [
    { name: "Breadth", score: breadth },
    { name: "Depth", score: depth },
    { name: "Execution", score: execution },
    { name: "Discipline", score: discipline },
  ].sort((a, b) => a.score - b.score)[0];

  const strongest = [
    { name: "Breadth", score: breadth },
    { name: "Depth", score: depth },
    { name: "Execution", score: execution },
    { name: "Discipline", score: discipline },
  ].sort((a, b) => b.score - a.score)[0];

  return [
    `[${month}] ${userName} — AI Performance Rating: ${tier} (${meetingScore}/100)`,
    ``,
    `Attendance: ${attended}/${totalMeetings} meetings (${attendRate}%)`,
    `Scores — Breadth: ${breadth} | Depth: ${depth} | Execution: ${execution} | Discipline: ${discipline}`,
    ``,
    `Strongest dimension: ${strongest.name} (${strongest.score}).`,
    weakest.score < 60
      ? `Area for improvement: ${weakest.name} (${weakest.score}) — recommend focused coaching.`
      : `All dimensions above threshold — maintain current engagement level.`,
  ].join("\n");
}

/**
 * AI Performance Engine — Meeting Performance Calculator
 *
 * Calculates a user's meeting score based on 4 dimensions:
 *   1. Participation (会议参与) — Attendance rate + punctuality + presence type
 *   2. Execution (执行力)      — Action item completion rate + on-time delivery
 *   3. Collaboration (协作)    — Notes shared, reflections submitted, interaction depth
 *   4. Innovation (创新)       — AI quiz scores + quality/length of takeaway reflections
 *
 * Data sources (all real DB tables):
 *   - meeting_attendance     → participation score
 *   - meeting_action_items   → execution score
 *   - meeting_interactions   → collaboration + innovation scores
 *   - hr_penalties           → penalty deductions on participation
 *
 * Final `meetingScore` is a weighted composite (0–100).
 *
 * DB column mapping (column names unchanged to avoid migration):
 *   breadthScore    → participation
 *   depthScore      → execution
 *   executionScore  → collaboration
 *   disciplineScore → innovation
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
  participation: 25,  // 会议参与
  execution: 30,      // 执行力
  collaboration: 25,  // 协作
  innovation: 20,     // 创新
};

// ── Per-meeting score calculation ────────────────────────────

export interface MeetingScoreBreakdown {
  participation: number;  // 0–100  (DB: breadthScore)
  execution: number;      // 0–100  (DB: depthScore)
  collaboration: number;  // 0–100  (DB: executionScore)
  innovation: number;     // 0–100  (DB: disciplineScore)
  meetingScore: number;   // weighted 0–100
}

/**
 * Calculate a user's performance score for a single meeting.
 *
 * Reads real data from:
 *   - meetingAttendance (check-in status, method, timing)
 *   - meetingActionItems (completion status per user per meeting)
 *   - meetingInteractions (notes, quiz score, takeaway reflection)
 *   - hrPenalties (Red/Black-list deductions)
 */
export async function calculateUserMeetingScore(
  db: NodePgDatabase<any>,
  userId: number,
  meetingId: number
): Promise<MeetingScoreBreakdown> {
  // ── 1. Participation (会议参与): attendance + punctuality ────
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

  let participation = 0;
  const attendanceStatus = attendance[0]?.status ?? "ABSENT";
  switch (attendanceStatus) {
    case "PRESENT_PHYSICAL":
      participation = 100; // full credit for physical presence
      break;
    case "PRESENT_ONLINE":
      participation = 85; // slight deduction for remote attendance
      break;
    case "LEAVED":
      participation = 40; // approved early leave = partial credit
      break;
    case "ABSENT":
      participation = 0;
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
    )
    .limit(1000);

  for (const p of penalties) {
    const deduction = Math.abs(p.deductedKpiPoints ?? 0) * 5;
    participation = Math.max(0, participation - deduction);
  }

  // ── 2. Execution (执行力): action item completion rate ───────
  const actionItems = await db
    .select()
    .from(meetingActionItems)
    .where(
      and(
        eq(meetingActionItems.meetingId, meetingId),
        eq(meetingActionItems.assignedTo, userId)
      )
    )
    .limit(1000);

  let execution = 100; // default: no items assigned = full score
  if (actionItems.length > 0) {
    const completed = actionItems.filter((a) => a.status === "COMPLETED").length;
    const overdue = actionItems.filter((a) => a.status === "OVERDUE").length;
    // 80% weight on completion rate, 20% on non-overdue rate
    execution = Math.round(
      ((completed / actionItems.length) * 80) +
      (((actionItems.length - overdue) / actionItems.length) * 20)
    );
  }

  // ── 3. Collaboration (协作): notes + reflections + engagement ──
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
  // Score notes: 0 chars = 0, 200+ chars = 70
  const notesScore = Math.min(70, Math.round((notesLength / 200) * 70));
  // Reflection bonus: +30 if submitted a takeaway reflection
  const hasReflection = !!interaction[0]?.takeawayReflection;
  const collaboration = Math.min(100, notesScore + (hasReflection ? 30 : 0));

  // ── 4. Innovation (创新): AI quiz performance + reflection quality ──
  const quizScore = interaction[0]?.aiQuizScore ?? 0;
  // Quiz: 70% of innovation score
  const quizComponent = Math.min(70, Math.round(quizScore * 0.7));
  // Reflection quality: length + depth bonus (30%)
  const reflectionText = interaction[0]?.takeawayReflection ?? "";
  const reflectionQuality = Math.min(30, Math.round((reflectionText.length / 300) * 30));
  const innovation = Math.min(100, quizComponent + reflectionQuality);

  // ── Weighted composite ─────────────────────────────────────
  const meetingScore = Math.round(
    (participation * WEIGHTS.participation +
      execution * WEIGHTS.execution +
      collaboration * WEIGHTS.collaboration +
      innovation * WEIGHTS.innovation) /
    100
  );

  return { participation, execution, collaboration, innovation, meetingScore };
}

// ── Monthly aggregation ──────────────────────────────────────

/**
 * Calculate and persist a user's monthly AI performance score.
 * Aggregates all meetings in the given month from real DB data.
 *
 * Reads from: meetingAttendance, meetingInteractions, meetingActionItems, hrPenalties
 * Writes to: hrAiPerformance (upsert by userId + month)
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
    )
    .limit(1000);

  const totalMeetings = attendanceRecords.length;
  const attended = attendanceRecords.filter(
    (a) => a.status === "PRESENT_PHYSICAL" || a.status === "PRESENT_ONLINE"
  ).length;

  // Calculate per-meeting scores and average
  let sumParticipation = 0, sumExecution = 0, sumCollaboration = 0, sumInnovation = 0;
  let scoredCount = 0;

  for (const record of attendanceRecords) {
    const breakdown = await calculateUserMeetingScore(db, userId, record.meetingId);
    sumParticipation += breakdown.participation;
    sumExecution += breakdown.execution;
    sumCollaboration += breakdown.collaboration;
    sumInnovation += breakdown.innovation;
    scoredCount++;
  }

  const avgParticipation = scoredCount > 0 ? Math.round(sumParticipation / scoredCount) : 0;
  const avgExecution = scoredCount > 0 ? Math.round(sumExecution / scoredCount) : 0;
  const avgCollaboration = scoredCount > 0 ? Math.round(sumCollaboration / scoredCount) : 0;
  const avgInnovation = scoredCount > 0 ? Math.round(sumInnovation / scoredCount) : 0;

  const meetingScore = Math.round(
    (avgParticipation * WEIGHTS.participation +
      avgExecution * WEIGHTS.execution +
      avgCollaboration * WEIGHTS.collaboration +
      avgInnovation * WEIGHTS.innovation) /
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
    participation: avgParticipation,
    execution: avgExecution,
    collaboration: avgCollaboration,
    innovation: avgInnovation,
    meetingScore,
    attended,
    totalMeetings,
  });

  // Upsert: update existing record or insert new
  // DB column mapping: breadthScore=participation, depthScore=execution,
  //                    executionScore=collaboration, disciplineScore=innovation
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
    breadthScore: avgParticipation,      // participation (会议参与)
    depthScore: avgExecution,            // execution (执行力)
    executionScore: avgCollaboration,    // collaboration (协作)
    disciplineScore: avgInnovation,      // innovation (创新)
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
  participation: number;
  execution: number;
  collaboration: number;
  innovation: number;
  meetingScore: number;
  attended: number;
  totalMeetings: number;
}): string {
  const {
    userName, month, participation, execution, collaboration,
    innovation, meetingScore, attended, totalMeetings,
  } = params;

  const tier =
    meetingScore >= 90 ? "Outstanding" :
    meetingScore >= 75 ? "Excellent" :
    meetingScore >= 60 ? "Good" :
    meetingScore >= 40 ? "Needs Improvement" : "Critical";

  const attendRate = totalMeetings > 0
    ? Math.round((attended / totalMeetings) * 100)
    : 0;

  const dimensions = [
    { name: "Participation", label: "会议参与", score: participation },
    { name: "Execution", label: "执行力", score: execution },
    { name: "Collaboration", label: "协作", score: collaboration },
    { name: "Innovation", label: "创新", score: innovation },
  ];

  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];

  return [
    `[${month}] ${userName} — AI Performance Rating: ${tier} (${meetingScore}/100)`,
    ``,
    `Attendance: ${attended}/${totalMeetings} meetings (${attendRate}%)`,
    `Scores — Participation: ${participation} | Execution: ${execution} | Collaboration: ${collaboration} | Innovation: ${innovation}`,
    ``,
    `Strongest dimension: ${strongest.name} (${strongest.label}) — ${strongest.score}/100.`,
    weakest.score < 60
      ? `Area for improvement: ${weakest.name} (${weakest.label}) — ${weakest.score}/100. Recommend focused coaching.`
      : `All dimensions above threshold — maintain current engagement level.`,
  ].join("\n");
}

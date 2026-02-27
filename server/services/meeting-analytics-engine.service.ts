/**
 * Meeting Analytics Engine — ROI Pipeline
 *
 * Aggregates data from:
 *   - Speaker Radar (voice-print diarization: talk-time distribution)
 *   - Collaboration Canvas (action items extracted from meeting notes)
 *   - Attendance records
 *   - AI quiz engagement scores
 *
 * Produces a unified MeetingROI score for executive dashboards.
 */
import { requireDb } from "../db";
import {
  sysMeetings,
  meetingSpeakers,
  meetingActionItems,
  meetingAttendance,
  meetingInteractions,
} from "../../drizzle/smart-meetings-schema";
import { eq, and, count, sql } from "drizzle-orm";

export interface SpeakerParticipation {
  speakerLabel: string;
  profileName: string | null;
  profileType: string | null;
  durationSec: number;
  pct: number; // % of total speaking time
}

export interface MeetingROI {
  meetingId: number;
  meetingTitle: string;
  // Speaker Radar metrics
  totalSpeakers: number;
  identifiedSpeakers: number;
  totalSpeakingTimeSec: number;
  participationBalance: number; // 0-100 (100 = perfectly balanced)
  speakerBreakdown: SpeakerParticipation[];
  // Canvas / Action Item metrics
  actionItemsTotal: number;
  actionItemsCompleted: number;
  actionItemsOverdue: number;
  actionItemCompletionRate: number; // 0-100
  // Attendance metrics
  attendeeCount: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number; // 0-100
  // Engagement metrics
  avgQuizScore: number | null;
  quizParticipants: number;
  // Composite ROI score (0-100)
  roiScore: number;
  roiBreakdown: {
    participationComponent: number; // 25%
    actionComponent: number;        // 30%
    attendanceComponent: number;    // 25%
    engagementComponent: number;    // 20%
  };
}

/**
 * Calculate meeting ROI by aggregating speaker radar, canvas actions,
 * attendance, and engagement quiz data.
 */
export async function calculateMeetingROI(
  meetingId: number
): Promise<MeetingROI> {
  const db = await requireDb();

  // 1. Get meeting info
  const [meeting] = await db
    .select()
    .from(sysMeetings)
    .where(eq(sysMeetings.id, meetingId));
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Speaker Radar data
  const speakers = await db
    .select()
    .from(meetingSpeakers)
    .where(eq(meetingSpeakers.meetingId, meetingId));

  const totalSpeakingTime = speakers.reduce(
    (sum, s) => sum + (s.speakingDurationSec ?? 0),
    0
  );
  const identifiedSpeakers = speakers.filter(
    (s) => s.matchedProfileId !== null
  ).length;

  const speakerBreakdown: SpeakerParticipation[] = speakers.map((s) => ({
    speakerLabel: s.speakerLabel,
    profileName: s.matchedProfileName,
    profileType: s.matchedProfileType,
    durationSec: s.speakingDurationSec ?? 0,
    pct:
      totalSpeakingTime > 0
        ? Math.round(((s.speakingDurationSec ?? 0) / totalSpeakingTime) * 100)
        : 0,
  }));

  // Participation balance: std-dev approach — lower deviation = higher balance
  let participationBalance = 0;
  if (speakers.length > 1 && totalSpeakingTime > 0) {
    const idealPct = 100 / speakers.length;
    const deviations = speakerBreakdown.map((s) =>
      Math.pow(s.pct - idealPct, 2)
    );
    const variance =
      deviations.reduce((a, b) => a + b, 0) / speakers.length;
    const stdDev = Math.sqrt(variance);
    // Map 0 stdDev → 100 balance, higher stdDev → lower balance
    participationBalance = Math.max(
      0,
      Math.round(100 - stdDev * 2)
    );
  } else if (speakers.length === 1) {
    participationBalance = 50; // single speaker = moderate balance
  }

  // 3. Action Items from Canvas
  const actionItems = await db
    .select()
    .from(meetingActionItems)
    .where(eq(meetingActionItems.meetingId, meetingId));

  const actionItemsCompleted = actionItems.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const actionItemsOverdue = actionItems.filter(
    (a) => a.status === "OVERDUE"
  ).length;
  const actionItemCompletionRate =
    actionItems.length > 0
      ? Math.round((actionItemsCompleted / actionItems.length) * 100)
      : 0;

  // 4. Attendance
  const attendance = await db
    .select()
    .from(meetingAttendance)
    .where(eq(meetingAttendance.meetingId, meetingId));

  const presentCount = attendance.filter((a) =>
    ["PRESENT_PHYSICAL", "PRESENT_ONLINE"].includes(a.status)
  ).length;
  const absentCount = attendance.filter(
    (a) => a.status === "ABSENT"
  ).length;
  const attendanceRate =
    attendance.length > 0
      ? Math.round((presentCount / attendance.length) * 100)
      : 0;

  // 5. Engagement (quiz scores)
  const interactions = await db
    .select()
    .from(meetingInteractions)
    .where(eq(meetingInteractions.meetingId, meetingId));

  const quizParticipants = interactions.filter(
    (i) => i.aiQuizScore !== null
  );
  const avgQuizScore =
    quizParticipants.length > 0
      ? Math.round(
          quizParticipants.reduce(
            (sum, i) => sum + (i.aiQuizScore ?? 0),
            0
          ) / quizParticipants.length
        )
      : null;

  // 6. Composite ROI Score (weighted)
  const participationComponent = participationBalance; // 0-100
  const actionComponent =
    actionItems.length > 0 ? actionItemCompletionRate : 50; // default 50 if no items
  const attendanceComponent =
    attendance.length > 0 ? attendanceRate : 50;
  const engagementComponent = avgQuizScore ?? 50;

  const roiScore = Math.round(
    participationComponent * 0.25 +
      actionComponent * 0.3 +
      attendanceComponent * 0.25 +
      engagementComponent * 0.2
  );

  return {
    meetingId,
    meetingTitle: meeting.title,
    totalSpeakers: speakers.length,
    identifiedSpeakers,
    totalSpeakingTimeSec: totalSpeakingTime,
    participationBalance,
    speakerBreakdown,
    actionItemsTotal: actionItems.length,
    actionItemsCompleted,
    actionItemsOverdue,
    actionItemCompletionRate,
    attendeeCount: attendance.length,
    presentCount,
    absentCount,
    attendanceRate,
    avgQuizScore,
    quizParticipants: quizParticipants.length,
    roiScore,
    roiBreakdown: {
      participationComponent,
      actionComponent,
      attendanceComponent,
      engagementComponent,
    },
  };
}

/**
 * Get aggregated ROI across all meetings (for executive dashboard).
 */
export async function getAggregatedROI(): Promise<{
  totalMeetings: number;
  avgRoiScore: number;
  avgParticipationBalance: number;
  avgActionCompletionRate: number;
  avgAttendanceRate: number;
  avgEngagementScore: number;
  meetingRois: Array<{ meetingId: number; title: string; roiScore: number }>;
}> {
  try {
    const db = await requireDb();

    const allMeetings = await db.select().from(sysMeetings);
    const rois: Array<{ meetingId: number; title: string; roiScore: number }> = [];
    let totalRoi = 0;
    let totalParticipation = 0;
    let totalAction = 0;
    let totalAttendance = 0;
    let totalEngagement = 0;
    let count = 0;

    for (const meeting of allMeetings) {
      try {
        const roi = await calculateMeetingROI(meeting.id);
        rois.push({
          meetingId: meeting.id,
          title: meeting.title,
          roiScore: roi.roiScore,
        });
        totalRoi += roi.roiScore;
        totalParticipation += roi.participationBalance;
        totalAction += roi.actionItemCompletionRate;
        totalAttendance += roi.attendanceRate;
        totalEngagement += roi.roiBreakdown.engagementComponent;
        count++;
      } catch {
        // skip meetings with errors
      }
    }

    return {
      totalMeetings: count,
      avgRoiScore: count > 0 ? Math.round(totalRoi / count) : 0,
      avgParticipationBalance:
        count > 0 ? Math.round(totalParticipation / count) : 0,
      avgActionCompletionRate:
        count > 0 ? Math.round(totalAction / count) : 0,
      avgAttendanceRate: count > 0 ? Math.round(totalAttendance / count) : 0,
      avgEngagementScore:
        count > 0 ? Math.round(totalEngagement / count) : 0,
      meetingRois: rois.sort((a, b) => b.roiScore - a.roiScore),
    };
  } catch {
    return {
      totalMeetings: 0,
      avgRoiScore: 0,
      avgParticipationBalance: 0,
      avgActionCompletionRate: 0,
      avgAttendanceRate: 0,
      avgEngagementScore: 0,
      meetingRois: [],
    };
  }
}

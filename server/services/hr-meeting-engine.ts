/**
 * HR Auto-Penalty Engine for Meeting Absences
 *
 * Business Rules (GRT Enterprise Policy):
 *
 *   MINOR meetings (departmental / optional):
 *     1st absence  → WARNING email
 *     2nd absence  → BLACK_L3 (lowest blacklist tier)
 *     3rd+ absence → BLACK_L1 (highest blacklist tier)
 *
 *   MAJOR meetings (company-wide mandatory, e.g. CEO kick-off):
 *     Any absence  → Immediate BLACK_L2
 *                  → Suggest -5 KPI points
 *                  → Auto-create "Mandatory Makeup Report" task
 *
 * Integration targets (simulated via pino structured logging):
 *   - Enterprise WeChat (企业微信) push notification
 *   - Corporate email gateway
 *   - HR KPI deduction API
 *   - OA task system (makeup report creation)
 */

import { requireDb } from "../db";
import {
  hrPenalties,
  meetingAttendance,
  sysMeetings,
} from "../../drizzle/smart-meetings-schema";
import { eq, and, count } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("hr-meeting");

// ── Types ──────────────────────────────────────────────────
type PenaltyLevel = "WARNING" | "BLACK_L3" | "BLACK_L2" | "BLACK_L1";

interface PenaltyAction {
  userId: number;
  userName: string;
  penaltyLevel: PenaltyLevel;
  reason: string;
  deductedKpiPoints: number;
  makeupTaskCreated: boolean;
  notifications: string[]; // channels that were triggered
}

// ── Main entry point ───────────────────────────────────────
/**
 * processAbsences — Scans a meeting's attendance and applies penalties
 * to every user marked as ABSENT.
 *
 * @param meetingId   - The meeting to process
 * @param meetingType - "MAJOR" or "MINOR" (determines penalty severity)
 * @returns Array of PenaltyAction records for each penalised user
 */
export async function processAbsences(
  meetingId: number,
  meetingType: "MAJOR" | "MINOR"
): Promise<PenaltyAction[]> {
  const db = await requireDb();
  const actions: PenaltyAction[] = [];

  // 1) Fetch meeting details for the penalty reason string
  const [meeting] = await db
    .select()
    .from(sysMeetings)
    .where(eq(sysMeetings.id, meetingId));

  if (!meeting) {
    log.info({ meetingId }, "meeting not found, skipping");
    return [];
  }

  // 2) Find all ABSENT attendees for this meeting
  const absentees = await db
    .select()
    .from(meetingAttendance)
    .where(
      and(
        eq(meetingAttendance.meetingId, meetingId),
        eq(meetingAttendance.status, "ABSENT")
      )
    );

  if (absentees.length === 0) {
    log.info({ meetingTitle: meeting.title }, "no absences detected");
    return [];
  }

  log.info(
    { absenteeCount: absentees.length, meetingType, meetingTitle: meeting.title },
    "processing absences for meeting"
  );

  // 3) For each absentee, determine the penalty
  for (const absentee of absentees) {
    let action: PenaltyAction;

    if (meetingType === "MAJOR") {
      // ── MAJOR meeting: immediate BLACK_L2, -5 KPI, makeup task ──
      action = applyMajorPenalty(absentee, meeting);
    } else {
      // ── MINOR meeting: escalation ladder based on cumulative count ──
      const priorCount = await countPriorAbsences(db, absentee.userId);
      action = applyMinorPenalty(absentee, meeting, priorCount);
    }

    // 4) Persist the penalty record
    await db.insert(hrPenalties).values({
      userId: absentee.userId,
      userName: absentee.userName ?? `User #${absentee.userId}`,
      penaltyLevel: action.penaltyLevel,
      reason: action.reason,
      deductedKpiPoints: action.deductedKpiPoints,
      meetingId: meetingId,
      meetingTitle: meeting.title,
      makeupTaskCreated: action.makeupTaskCreated,
      notificationSent: true,
      notificationChannel: action.notifications.join(","),
    });

    // 5) Simulate external notifications
    simulateNotifications(action);

    actions.push(action);
  }

  log.info(
    { actionCount: actions.length, meetingId },
    "processed penalty actions for meeting"
  );
  return actions;
}

// ── MINOR meeting penalty ladder ───────────────────────────
function applyMinorPenalty(
  absentee: typeof meetingAttendance.$inferSelect,
  meeting: typeof sysMeetings.$inferSelect,
  priorAbsenceCount: number
): PenaltyAction {
  const userName = absentee.userName ?? `User #${absentee.userId}`;
  // priorAbsenceCount is the number of PREVIOUS penalties; this is the next one
  const totalAbsences = priorAbsenceCount + 1;

  if (totalAbsences >= 3) {
    // 3rd+ absence → BLACK_L1 (most severe)
    return {
      userId: absentee.userId,
      userName,
      penaltyLevel: "BLACK_L1",
      reason: `第${totalAbsences}次缺席部门会议「${meeting.title}」— 触发最高级别黑名单 BLACK_L1`,
      deductedKpiPoints: -3,
      makeupTaskCreated: false,
      notifications: ["enterprise_wechat", "email", "hr_system"],
    };
  }

  if (totalAbsences === 2) {
    // 2nd absence → BLACK_L3 (lowest blacklist)
    return {
      userId: absentee.userId,
      userName,
      penaltyLevel: "BLACK_L3",
      reason: `第2次缺席部门会议「${meeting.title}」— 进入黑名单 BLACK_L3`,
      deductedKpiPoints: -1,
      makeupTaskCreated: false,
      notifications: ["enterprise_wechat", "email"],
    };
  }

  // 1st absence → WARNING email
  return {
    userId: absentee.userId,
    userName,
    penaltyLevel: "WARNING",
    reason: `首次缺席部门会议「${meeting.title}」— 发送警告通知`,
    deductedKpiPoints: 0,
    makeupTaskCreated: false,
    notifications: ["email"],
  };
}

// ── MAJOR meeting penalty (immediate escalation) ───────────
function applyMajorPenalty(
  absentee: typeof meetingAttendance.$inferSelect,
  meeting: typeof sysMeetings.$inferSelect
): PenaltyAction {
  const userName = absentee.userName ?? `User #${absentee.userId}`;

  log.warn(
    { userName, meetingTitle: meeting.title },
    "MAJOR meeting absence detected — immediate BLACK_L2 + suggest -5 KPI + Makeup Report task"
  );

  return {
    userId: absentee.userId,
    userName,
    penaltyLevel: "BLACK_L2",
    reason: `缺席全体大会「${meeting.title}」— 立即进入黑名单 BLACK_L2，建议扣除5个KPI积分，需提交补课报告`,
    deductedKpiPoints: -5,
    makeupTaskCreated: true,
    notifications: ["enterprise_wechat", "email", "hr_system", "oa_task"],
  };
}

// ── Count how many prior penalty records exist for a user ──
async function countPriorAbsences(db: any, userId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(hrPenalties)
    .where(eq(hrPenalties.userId, userId));
  return Number(result[0]?.count ?? 0);
}

// ── Simulate external API triggers ─────────────────────────
function simulateNotifications(action: PenaltyAction): void {
  for (const channel of action.notifications) {
    switch (channel) {
      case "enterprise_wechat":
        log.info(
          { channel, userName: action.userName, penaltyLevel: action.penaltyLevel },
          "pushing penalty notification via WeChat"
        );
        break;
      case "email":
        log.info(
          { channel, userName: action.userName, reason: action.reason },
          "sending penalty email"
        );
        break;
      case "hr_system":
        log.info(
          { channel, userName: action.userName, deductedKpiPoints: action.deductedKpiPoints },
          "recording KPI deduction"
        );
        break;
      case "oa_task":
        log.info(
          { channel, userName: action.userName },
          "creating mandatory makeup report task"
        );
        break;
    }
  }
}

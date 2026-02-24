/**
 * GRT Smart Meeting & AI Engagement Hub — Database Schema
 *
 * Tables:
 *   sys_meetings          — Master meeting registry (MAJOR/MINOR, lifecycle status)
 *   meeting_attendance    — Per-user check-in/leave/absent records
 *   meeting_interactions  — Private notes, AI quiz scores, takeaway reflections
 *   hr_penalties          — Red/Black-list penalty log (WARNING → BLACK_L3/L2/L1)
 *
 * Integrations (future):
 *   Enterprise WeChat push, Email gateway, KPI deduction via HR module
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  json,
  index,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────
//  sys_meetings — Core meeting entity
// ─────────────────────────────────────────────────────────────
export const sysMeetings = pgTable(
  "sys_meetings",
  {
    id: serial("id").primaryKey(),
    // Display title visible to all attendees
    title: varchar("title", { length: 500 }).notNull(),
    // MAJOR = company-wide mandatory | MINOR = departmental / optional
    type: varchar("type", { length: 20 }).notNull().default("MINOR"),
    // Lifecycle: UPCOMING → LIVE → ENDED
    status: varchar("status", { length: 20 }).notNull().default("UPCOMING"),
    // Meeting description / agenda
    description: text("description"),
    // AI-transcribed or manually entered meeting transcript
    transcript: text("transcript"),
    // Organiser info
    organizerName: varchar("organizer_name", { length: 100 }),
    organizerId: integer("organizer_id"),
    // Scheduled time window
    scheduledStart: timestamp("scheduled_start"),
    scheduledEnd: timestamp("scheduled_end"),
    // Actual start/end (set when status transitions)
    actualStart: timestamp("actual_start"),
    actualEnd: timestamp("actual_end"),
    // Total attendee count (denormalised for dashboard queries)
    expectedAttendees: integer("expected_attendees").default(0),
    // AI-generated quiz questions (JSON array) derived from transcript
    aiQuizQuestions: json("ai_quiz_questions").$type<
      Array<{
        id: number;
        question: string;
        type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
        options?: string[];
        correctAnswer: string;
      }>
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("sys_meetings_status_idx").on(table.status),
    typeIdx: index("sys_meetings_type_idx").on(table.type),
    scheduledStartIdx: index("sys_meetings_scheduled_start_idx").on(
      table.scheduledStart
    ),
  })
);

// ─────────────────────────────────────────────────────────────
//  meeting_attendance — Who showed up, how, and when
// ─────────────────────────────────────────────────────────────
export const meetingAttendance = pgTable(
  "meeting_attendance",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id").notNull(),
    userId: integer("user_id").notNull(),
    userName: varchar("user_name", { length: 100 }),
    // PRESENT_PHYSICAL — badge/NFC/manual physical check-in
    // PRESENT_ONLINE   — joined via video/WeChat stream
    // LEAVED           — requested and approved early leave
    // ABSENT           — did not attend at all
    status: varchar("status", { length: 30 })
      .notNull()
      .default("ABSENT"),
    checkInTime: timestamp("check_in_time"),
    // If LEAVED, record leave time and reason
    leaveTime: timestamp("leave_time"),
    leaveReason: text("leave_reason"),
    // Device / IP for audit trail
    checkInMethod: varchar("check_in_method", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    meetingIdx: index("meeting_attendance_meeting_idx").on(table.meetingId),
    userIdx: index("meeting_attendance_user_idx").on(table.userId),
    statusIdx: index("meeting_attendance_status_idx").on(table.status),
  })
);

// ─────────────────────────────────────────────────────────────
//  meeting_interactions — Notes, quiz, reflections per user
// ─────────────────────────────────────────────────────────────
export const meetingInteractions = pgTable(
  "meeting_interactions",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id").notNull(),
    userId: integer("user_id").notNull(),
    userName: varchar("user_name", { length: 100 }),
    // Rich-text private notes taken during the meeting
    personalNotes: text("personal_notes"),
    // Score from the AI-generated engagement quiz (0–100)
    aiQuizScore: integer("ai_quiz_score"),
    // JSON detail of each answer the user gave
    aiQuizAnswers: json("ai_quiz_answers").$type<
      Array<{
        questionId: number;
        selectedAnswer: string;
        isCorrect: boolean;
      }>
    >(),
    // Free-form takeaway reflection submitted after the meeting
    takeawayReflection: text("takeaway_reflection"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    meetingIdx: index("meeting_interactions_meeting_idx").on(table.meetingId),
    userIdx: index("meeting_interactions_user_idx").on(table.userId),
  })
);

// ─────────────────────────────────────────────────────────────
//  hr_penalties — Red/Black-list auto-penalty log
// ─────────────────────────────────────────────────────────────
export const hrPenalties = pgTable(
  "hr_penalties",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    userName: varchar("user_name", { length: 100 }),
    // Escalation ladder: WARNING → BLACK_L3 → BLACK_L2 → BLACK_L1
    penaltyLevel: varchar("penalty_level", { length: 20 }).notNull(),
    // Human-readable reason including meeting title + absence count
    reason: text("reason").notNull(),
    // KPI points deducted (negative integer, e.g. -5)
    deductedKpiPoints: integer("deducted_kpi_points").default(0),
    // Reference back to the meeting that triggered this penalty
    meetingId: integer("meeting_id"),
    meetingTitle: varchar("meeting_title", { length: 500 }),
    // Whether a makeup task was auto-created
    makeupTaskCreated: boolean("makeup_task_created").default(false),
    // Whether notification was sent (WeChat / Email)
    notificationSent: boolean("notification_sent").default(false),
    notificationChannel: varchar("notification_channel", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("hr_penalties_user_idx").on(table.userId),
    levelIdx: index("hr_penalties_level_idx").on(table.penaltyLevel),
    meetingIdx: index("hr_penalties_meeting_idx").on(table.meetingId),
    createdAtIdx: index("hr_penalties_created_at_idx").on(table.createdAt),
  })
);

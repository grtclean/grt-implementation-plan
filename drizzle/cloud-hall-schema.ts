/**
 * Digital Cloud Hall (数字云厅) — Video Conference Signaling Schema
 *
 * 2 tables:
 *   cloud_hall_sessions     — video call sessions between field sales and HQ leadership
 *   cloud_hall_session_logs — audit trail for session lifecycle events
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Types ──────────────────────────────────────────────────

export interface SlideContext {
  slideIndex: number;
  slideTitle: string;
  productId?: number;
  productName?: string;
  productCategory?: string;
  pageUrl?: string;
  customData?: Record<string, unknown>;
}

// ─── 1. Cloud Hall Sessions ─────────────────────────────────

export const cloudHallSessions = pgTable(
  "cloud_hall_sessions",
  {
    id: serial("id").primaryKey(),
    sessionCode: varchar("session_code", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("waiting").notNull(),
    // Initiator (field sales engineer)
    initiatorUserId: integer("initiator_user_id").notNull(),
    initiatorName: varchar("initiator_name", { length: 100 }),
    initiatorRole: varchar("initiator_role", { length: 30 }),
    initiatorDevice: varchar("initiator_device", { length: 30 }),
    // Leadership (HQ responder)
    leadershipUserId: integer("leadership_user_id"),
    leadershipName: varchar("leadership_name", { length: 100 }),
    leadershipRole: varchar("leadership_role", { length: 30 }),
    // Context
    buId: integer("bu_id"),
    projectId: integer("project_id"),
    customerName: varchar("customer_name", { length: 200 }),
    customerSite: varchar("customer_site", { length: 300 }),
    currentSlideContext: jsonb("current_slide_context"),
    sessionNotes: text("session_notes"),
    // Signaling & connection
    signalingState: varchar("signaling_state", { length: 30 }).default("idle").notNull(),
    connectionQuality: varchar("connection_quality", { length: 20 }),
    lastHeartbeat: timestamp("last_heartbeat", { mode: "string" }),
    videoProvider: varchar("video_provider", { length: 30 }).default("placeholder").notNull(),
    // Session lifecycle
    sessionDurationSec: integer("session_duration_sec"),
    endReason: varchar("end_reason", { length: 30 }),
    endedAt: timestamp("ended_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_cloud_hall_sessions_status").on(table.status),
    index("idx_cloud_hall_sessions_initiator").on(table.initiatorUserId),
    index("idx_cloud_hall_sessions_leadership").on(table.leadershipUserId),
    index("idx_cloud_hall_sessions_created").on(table.createdAt),
  ]
);

// ─── 2. Cloud Hall Session Logs ─────────────────────────────

export const cloudHallSessionLogs = pgTable(
  "cloud_hall_session_logs",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull(),
    action: varchar("action", { length: 30 }).notNull(),
    actorUserId: integer("actor_user_id"),
    actorName: varchar("actor_name", { length: 100 }),
    details: text("details"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_cloud_hall_session_logs_session").on(table.sessionId),
    index("idx_cloud_hall_session_logs_action").on(table.action),
  ]
);

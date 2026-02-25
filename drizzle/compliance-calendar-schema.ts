/**
 * Compliance Calendar — Reminder & Acknowledgment Schema
 * Phase 1.4 — IATF 16949 / ISO certification expiry tracking
 *
 * NOTE: The `certifications` table already exists in schema.ts (line 7864)
 * with certCode, certType, expiryDate, status.  This schema adds the
 * tiered-warning acknowledgment audit trail — NOT a duplicate cert table.
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const complianceTierEnum = pgEnum("compliance_tier", [
  "SAFE",      // ≥90 days to expiry
  "WARNING",   // 60–89 days
  "CRITICAL",  // 30–59 days
  "DANGER",    // <30 days (or already expired)
]);

export const reminderActionEnum = pgEnum("reminder_action", [
  "ACKNOWLEDGED",  // user saw the alert
  "DELEGATED",     // user delegated to another person
  "RENEWED",       // cert was renewed
  "DISMISSED",     // user dismissed (audit trail only)
]);

// ─── Compliance Reminders ────────────────────────────────────────────
// One row per tier-change or scheduled reminder for a certification.

export const complianceReminders = pgTable("compliance_reminders", {
  id: serial("id").primaryKey(),
  certificationId: integer("certification_id").notNull(),   // FK → certifications.id
  certName: varchar("cert_name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),  // ISO | CE | CUSTOMER_AUDIT | SAFETY
  tier: complianceTierEnum("tier").notNull(),
  expiryDate: date("expiry_date", { mode: "string" }).notNull(),
  daysRemaining: integer("days_remaining").notNull(),
  ownerId: integer("owner_id"),
  ownerName: varchar("owner_name", { length: 100 }),
  isAcknowledged: boolean("is_acknowledged").notNull().default(false),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),
  delegatedTo: integer("delegated_to"),
  delegatedToName: varchar("delegated_to_name", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_comp_rem_cert").on(table.certificationId),
  index("idx_comp_rem_tier").on(table.tier),
  index("idx_comp_rem_expiry").on(table.expiryDate),
  index("idx_comp_rem_ack").on(table.isAcknowledged),
]);

// ─── Compliance Reminder Actions (Audit Trail) ──────────────────────
// Every acknowledge / delegate / renew is logged for IATF 16949 audit.

export const complianceReminderActions = pgTable("compliance_reminder_actions", {
  id: serial("id").primaryKey(),
  reminderId: integer("reminder_id").notNull(),             // FK → complianceReminders.id
  action: reminderActionEnum("action").notNull(),
  performedBy: integer("performed_by").notNull(),
  performedByName: varchar("performed_by_name", { length: 100 }),
  delegatedTo: integer("delegated_to"),
  delegatedToName: varchar("delegated_to_name", { length: 100 }),
  notes: text("notes"),
  performedAt: timestamp("performed_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_comp_act_reminder").on(table.reminderId),
  index("idx_comp_act_action").on(table.action),
  index("idx_comp_act_date").on(table.performedAt),
]);

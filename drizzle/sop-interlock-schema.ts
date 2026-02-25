/**
 * SOP + Role Quality Interlock Schema
 * Phase 1.2 — Mission-critical IT/OT bridge
 *
 * Purpose: Physically block machine access if an operator:
 *   (a) lacks valid certifications for the machine's required skills, OR
 *   (b) hasn't acknowledged the latest SOP version for that machine.
 *
 * Links to existing tables:
 *   - productionEquipments  (drizzle/production-equipment-schema.ts) — machine registry
 *   - sopTemplates           (drizzle/production-process-schema.ts)   — SOP documents + versions
 *   - qualificationCertificates (drizzle/schema.ts)                   — operator certifications
 *
 * New tables introduced here:
 *   1. machine_skill_requirements — what certs + SOP a machine demands
 *   2. sop_acknowledgments        — per-user "I have read version X" audit trail
 *   3. interlock_access_log       — every GRANTED/BLOCKED decision (audit + analytics)
 */

import {
  pgTable, serial, integer, varchar, text, timestamp, boolean, index,
} from "drizzle-orm/pg-core";

// ─── 1. Machine Skill Requirements ──────────────────────────────────
// Links a machine to the certifications and SOP it requires.
// One row per (machine, certification) pair.

export const machineSkillRequirements = pgTable("machine_skill_requirements", {
  id: serial("id").primaryKey(),

  // FK → productionEquipments.id
  machineId: integer("machine_id").notNull(),

  // Certification code that must appear in qualificationCertificates
  // for the operator (matched via qualificationCertificates.certificateCode)
  certificationCode: varchar("certification_code", { length: 50 }).notNull(),

  // Human-readable skill description (e.g., "CNC Mill Operation Level 2")
  skillName: varchar("skill_name", { length: 200 }).notNull(),

  // FK → sopTemplates.id — the SOP the operator must acknowledge
  sopTemplateId: integer("sop_template_id"),

  // Minimum cert level: 'basic' | 'intermediate' | 'advanced' | 'expert'
  requiredLevel: varchar("required_level", { length: 50 }).notNull().default("basic"),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_msr_machine_id").on(table.machineId),
  index("idx_msr_cert_code").on(table.certificationCode),
  index("idx_msr_sop_template_id").on(table.sopTemplateId),
]);

// ─── 2. SOP Acknowledgments ────────────────────────────────────────
// Immutable audit log: operator X signed SOP Y at version Z.
// The interlock checks: does the latest row for (userId, sopTemplateId)
// have versionSigned == sopTemplates.version?

export const sopAcknowledgments = pgTable("sop_acknowledgments", {
  id: serial("id").primaryKey(),

  // The operator who acknowledged
  userId: integer("user_id").notNull(),

  // FK → sopTemplates.id
  sopTemplateId: integer("sop_template_id").notNull(),

  // The exact version string they signed (e.g., "2.1")
  versionSigned: varchar("version_signed", { length: 20 }).notNull(),

  // When they signed
  signedAt: timestamp("signed_at", { mode: "string" }).defaultNow().notNull(),

  // How: 'badge_scan' | 'manual' | 'digital_signature'
  signatureMethod: varchar("signature_method", { length: 50 }).notNull().default("badge_scan"),

  // Audit: device/IP that recorded the acknowledgment
  deviceInfo: varchar("device_info", { length: 200 }),
}, (table) => [
  index("idx_sop_ack_user_id").on(table.userId),
  index("idx_sop_ack_sop_template_id").on(table.sopTemplateId),
  index("idx_sop_ack_user_sop").on(table.userId, table.sopTemplateId),
]);

// ─── 3. Interlock Access Log ───────────────────────────────────────
// Every verification attempt is logged — GRANTED or BLOCKED.
// Required for ISO 9001 / IATF 16949 audit trail.

export const interlockAccessLog = pgTable("interlock_access_log", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull(),
  machineId: integer("machine_id").notNull(),

  // 'GRANTED' | 'BLOCKED'
  decision: varchar("decision", { length: 20 }).notNull(),

  // If BLOCKED, human-readable explanation
  blockReason: text("block_reason"),

  // Snapshot of what was checked (for audit replay)
  certCheckPassed: boolean("cert_check_passed").notNull(),
  sopCheckPassed: boolean("sop_check_passed").notNull(),

  // Details for troubleshooting
  missingCerts: text("missing_certs"),        // JSON array of missing cert codes
  sopVersionRequired: varchar("sop_version_required", { length: 20 }),
  sopVersionSigned: varchar("sop_version_signed", { length: 20 }),

  checkedAt: timestamp("checked_at", { mode: "string" }).defaultNow().notNull(),
  deviceInfo: varchar("device_info", { length: 200 }),
}, (table) => [
  index("idx_ial_user_id").on(table.userId),
  index("idx_ial_machine_id").on(table.machineId),
  index("idx_ial_decision").on(table.decision),
  index("idx_ial_checked_at").on(table.checkedAt),
]);

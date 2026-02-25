/**
 * AI Training Closed-Loop — Automatic Intervention Schema
 * Phase 3.1 — AI-Driven Performance → Training → Unlock Pipeline
 *
 * This schema enables the AI closed-loop:
 *   ① Detect performance drop (defects, low meeting score)
 *   ② Auto-assign corrective training module
 *   ③ Block operator/task access until training COMPLETED
 *   ④ Unlock upon completion → loop closes
 *
 * Bridges existing domains:
 *   - shop_floor_defect_logs (fmea-dynamic-schema.ts) → Quality trigger
 *   - employee_360_profiles (employee-profile-schema.ts) → Collaboration trigger
 *   - sop-interlock (sop-interlock-schema.ts) → Machine access gate
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const trainingCategoryEnum = pgEnum("ai_training_category", [
  "MACHINE_SAFETY",       // CNC, hydraulics, welding safety
  "PROCESS_QUALITY",      // SPC, defect prevention, calibration
  "EFFECTIVE_COMMUNICATION", // Meeting skills, collaboration
  "TECHNICAL_SKILLS",     // PLC programming, CAD, welding technique
  "COMPLIANCE",           // ISO, IATF 16949, regulatory
]);

export const interventionStatusEnum = pgEnum("ai_intervention_status", [
  "PENDING_TRAINING",     // Assigned, not started — BLOCKS access
  "IN_PROGRESS",          // Training started — still BLOCKS access
  "COMPLETED",            // Training finished — access UNLOCKED
  "OVERRIDDEN",           // Manager override — access UNLOCKED
  "EXPIRED",              // Auto-expired (not completed in time)
]);

export const interventionTriggerEnum = pgEnum("ai_intervention_trigger", [
  "QUALITY_DEFECT",       // >3 defects on specific machine this week
  "COLLABORATION_LOW",    // Meeting score < 60
  "SAFETY_INCIDENT",      // Safety interlock triggered
  "CERT_EXPIRING",        // Certificate about to expire
  "MANUAL",               // Manager-initiated
]);

// ─── Training Modules (corrective course catalog) ────────────────────

export const trainingModules = pgTable("ai_training_modules", {
  id: serial("id").primaryKey(),
  moduleCode: varchar("module_code", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  titleZh: varchar("title_zh", { length: 200 }),
  category: trainingCategoryEnum("category").notNull(),
  description: text("description"),
  contentUrl: varchar("content_url", { length: 500 }),
  durationMinutes: integer("duration_minutes").default(30),
  passingScore: integer("passing_score").default(80),      // min score to complete
  relatedMachineTypes: text("related_machine_types"),       // JSON array of machine codes
  relatedSkillCodes: text("related_skill_codes"),           // JSON array of cert codes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_atm_code").on(table.moduleCode),
  index("idx_atm_category").on(table.category),
]);

// ─── AI Interventions (auto-assigned corrective actions) ─────────────

export const aiInterventions = pgTable("ai_interventions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),                    // FK → users.id
  userName: varchar("user_name", { length: 100 }),
  triggerType: interventionTriggerEnum("trigger_type").notNull(),
  triggerReason: text("trigger_reason").notNull(),          // human-readable explanation
  triggerData: text("trigger_data"),                        // JSON: defect IDs, scores, etc.

  // Assigned training
  assignedModuleId: integer("assigned_module_id").notNull(), // FK → ai_training_modules.id
  assignedModuleTitle: varchar("assigned_module_title", { length: 200 }),

  // Blocked resources
  blockedMachineId: integer("blocked_machine_id"),          // specific machine, or null for all
  blockedMachineCode: varchar("blocked_machine_code", { length: 50 }),
  blockedTaskLevel: varchar("blocked_task_level", { length: 20 }), // e.g., "high", "all"

  // Status tracking
  status: interventionStatusEnum("status").default("PENDING_TRAINING").notNull(),
  progressPercent: integer("progress_percent").default(0),
  trainingScore: integer("training_score"),                 // score on completion test
  completedAt: timestamp("completed_at", { mode: "string" }),
  overriddenBy: integer("overridden_by"),
  overriddenByName: varchar("overridden_by_name", { length: 100 }),
  overrideReason: text("override_reason"),

  // Deadlines
  dueDate: timestamp("due_date", { mode: "string" }),
  escalationDate: timestamp("escalation_date", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_ai_intv_user").on(table.userId),
  index("idx_ai_intv_status").on(table.status),
  index("idx_ai_intv_trigger").on(table.triggerType),
  index("idx_ai_intv_machine").on(table.blockedMachineId),
  index("idx_ai_intv_created").on(table.createdAt),
]);

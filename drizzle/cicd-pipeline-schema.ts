// CI/CD Pipeline Matrix Schema
// Supports the GRT "Dual-AI CI/CD Pipeline" — Gemini (strategist) + Claude (executor)
// with Dev → Test → Prod progression and CEO approval gates.

import { pgTable, serial, varchar, text, timestamp, json, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── cicd_tasks: Each row is a feature/bugfix flowing through the pipeline ──
export const cicdTasks = pgTable("cicd_tasks", {
  id: serial("id").primaryKey(),

  // Human-readable title (e.g. "Optimize M6 Dashboard")
  title: varchar("title", { length: 500 }).notNull(),

  // How the task was created:
  //   AUTO_FETCH  — scraped from logs, error monitors, or user feedback
  //   MANUAL      — CEO/CTO typed it into the input box
  sourceMode: varchar("source_mode", { length: 20 }).notNull().default("MANUAL"),

  // Raw source payload (error log snippet, user feedback text, etc.)
  sourceData: text("source_data"),

  // Classification tags  (e.g. ["Frontend", "DB", "API"])
  categories: json("categories").$type<string[]>().default([]),

  // Business scope — which GRT module this targets (e.g. "M6-MES", "CRM", "HR")
  scope: varchar("scope", { length: 100 }),

  // ── Pipeline stage & per-stage status ──
  // Current position in the pipeline
  currentStage: varchar("current_stage", { length: 20 }).notNull().default("DEV"),

  // Status within each stage
  devStatus: varchar("dev_status", { length: 30 }).notNull().default("PENDING"),
  testStatus: varchar("test_status", { length: 30 }).notNull().default("PENDING"),
  prodStatus: varchar("prod_status", { length: 30 }).notNull().default("PENDING"),

  // Detailed sub-status text per stage (e.g. "Running unit tests…", "Code review passed")
  devDetail: text("dev_detail"),
  testDetail: text("test_detail"),
  prodDetail: text("prod_detail"),

  // ── Gemini Analysis (stored per stage) ──
  // JSON: { dev: { analysis, risk, suggestion }, test: { ... }, prod: { ... } }
  geminiAnalysis: json("gemini_analysis_json").$type<Record<string, unknown>>().default({}),

  // ── CEO approval tracking ──
  // Whether CEO/CTO has approved promotion to next stage
  ceoApprovedDev: boolean("ceo_approved_dev").default(false),
  ceoApprovedTest: boolean("ceo_approved_test").default(false),
  ceoApprovedProd: boolean("ceo_approved_prod").default(false),

  // Optional: who approved and when
  approvedBy: varchar("approved_by", { length: 100 }),

  // Priority (1=critical, 2=high, 3=medium, 4=low)
  priority: integer("priority").notNull().default(3),

  // Execution rules/constraints (e.g. "Response < 500ms")
  rules: text("rules"),

  // Assigned executor ("Claude", "Manual", or specific engineer)
  assignee: varchar("assignee", { length: 100 }).default("Claude"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── cicd_stage_logs: Audit trail for every stage transition ──
export const cicdStageLogs = pgTable("cicd_stage_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  fromStage: varchar("from_stage", { length: 20 }),
  toStage: varchar("to_stage", { length: 20 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // "promote", "reject", "rollback"
  actor: varchar("actor", { length: 100 }), // "CEO", "Gemini", "Claude", "Auto"
  note: text("note"),
  geminiAdvice: text("gemini_advice"), // Gemini's recommendation at this transition
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

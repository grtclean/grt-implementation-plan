/**
 * Sandbox & Go-Live Console Schema
 *
 * 5 tables + 1 join table for AI-orchestrated development control:
 *   sandbox_scenarios       — What to simulate
 *   sandbox_knowledge_links — Join to knowledge_assets
 *   sandbox_runs            — AI invocation audit trail
 *   release_gates           — Go-live approval checkpoints
 *   sandbox_change_tasks    — Approved changes → engineering tasks
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────

export const sandboxScenarioStatusEnum = pgEnum("sandbox_scenario_status", [
  "draft", "submitted", "planning", "reviewed", "approved",
  "implementing", "completed", "archived",
]);

export const sandboxPriorityEnum = pgEnum("sandbox_priority", [
  "P0", "P1", "P2", "P3",
]);

export const sandboxRunTypeEnum = pgEnum("sandbox_run_type", [
  "proposal", "implementation", "review", "dry_run",
]);

export const sandboxRunStatusEnum = pgEnum("sandbox_run_status", [
  "pending", "running", "completed", "failed", "timeout",
]);

export const releaseGateTypeEnum = pgEnum("release_gate_type", [
  "proposal_review", "red_team", "preflight", "canary", "full_deploy",
]);

export const releaseGateStatusEnum = pgEnum("release_gate_status", [
  "pending", "in_progress", "passed", "failed", "skipped", "overridden",
]);

export const changeTaskTypeEnum = pgEnum("change_task_type", [
  "code_change", "api_change", "schema_change", "config_change",
  "test", "documentation", "rollback_step",
]);

export const changeTaskStatusEnum = pgEnum("change_task_status", [
  "draft", "ai_generated", "human_reviewed", "approved",
  "implementing", "verified", "deployed", "rolled_back",
]);

// ── Table 1: sandbox_scenarios ───────────────────────────────

export const sandboxScenarios = pgTable("sandbox_scenarios", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  businessGoal: text("business_goal"),
  affectedPages: json("affected_pages").$type<string[]>(),
  referenceProjects: json("reference_projects").$type<{ projectId: number; projectName: string }[]>(),
  status: sandboxScenarioStatusEnum("status").default("draft").notNull(),
  priority: sandboxPriorityEnum("priority").default("P2").notNull(),
  createdById: integer("created_by_id"),
  tags: json("tags").$type<string[]>(),
  buCode: varchar("bu_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Table 2: sandbox_knowledge_links ─────────────────────────

export const sandboxKnowledgeLinks = pgTable("sandbox_knowledge_links", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull(),
  knowledgeAssetId: integer("knowledge_asset_id").notNull(),
  relevanceScore: integer("relevance_score").default(50),
  usageContext: varchar("usage_context", { length: 100 }),
  addedById: integer("added_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Table 3: sandbox_runs ────────────────────────────────────

export const sandboxRuns = pgTable("sandbox_runs", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull(),
  runType: sandboxRunTypeEnum("run_type").notNull(),
  aiProvider: varchar("ai_provider", { length: 30 }).notNull(),
  aiModel: varchar("ai_model", { length: 100 }),
  systemPrompt: text("system_prompt"),
  userInput: text("user_input"),
  aiOutput: json("ai_output"),
  status: sandboxRunStatusEnum("status").default("pending").notNull(),
  durationMs: integer("duration_ms"),
  tokenUsage: json("token_usage").$type<{ prompt_tokens: number; completion_tokens: number; total_tokens: number }>(),
  errorMessage: text("error_message"),
  triggeredById: integer("triggered_by_id"),
  parentRunId: integer("parent_run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Table 4: release_gates ───────────────────────────────────

export const releaseGates = pgTable("release_gates", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull(),
  gateType: releaseGateTypeEnum("gate_type").notNull(),
  gateOrder: integer("gate_order").notNull(),
  status: releaseGateStatusEnum("status").default("pending").notNull(),
  reviewerId: integer("reviewer_id"),
  reviewComment: text("review_comment"),
  redTeamReport: json("red_team_report"),
  checklist: json("checklist").$type<{ item: string; passed: boolean }[]>(),
  passedAt: timestamp("passed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Table 5: sandbox_change_tasks ────────────────────────────

export const sandboxChangeTasks = pgTable("sandbox_change_tasks", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull(),
  runId: integer("run_id"),
  taskType: changeTaskTypeEnum("task_type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  filePath: varchar("file_path", { length: 500 }),
  changeDetail: json("change_detail").$type<{ before?: string; after?: string; diff?: string }>(),
  status: changeTaskStatusEnum("status").default("draft").notNull(),
  priority: sandboxPriorityEnum("priority").default("P2").notNull(),
  assigneeId: integer("assignee_id"),
  projectTaskId: integer("project_task_id"),
  rollbackInstructions: text("rollback_instructions"),
  verificationSteps: json("verification_steps").$type<string[]>(),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Types ────────────────────────────────────────────────────

export type SandboxScenario = InferSelectModel<typeof sandboxScenarios>;
export type InsertSandboxScenario = InferInsertModel<typeof sandboxScenarios>;
export type SandboxRun = InferSelectModel<typeof sandboxRuns>;
export type InsertSandboxRun = InferInsertModel<typeof sandboxRuns>;
export type ReleaseGate = InferSelectModel<typeof releaseGates>;
export type InsertReleaseGate = InferInsertModel<typeof releaseGates>;
export type SandboxChangeTask = InferSelectModel<typeof sandboxChangeTasks>;
export type InsertSandboxChangeTask = InferInsertModel<typeof sandboxChangeTasks>;
export type SandboxKnowledgeLink = InferSelectModel<typeof sandboxKnowledgeLinks>;
export type InsertSandboxKnowledgeLink = InferInsertModel<typeof sandboxKnowledgeLinks>;

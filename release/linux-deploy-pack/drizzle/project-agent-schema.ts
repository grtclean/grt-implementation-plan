import { pgTable, pgEnum, serial, integer, varchar, text, timestamp, json, index } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { projects } from "./schema";

/**
 * Project Agent Schema — AI-assisted project lifecycle reviews
 *
 * - project_agent_reviews: BOM review, drawing review, delay prediction results
 */

// ── Enums ────────────────────────────────────────────────────
export const reviewTypeEnum = pgEnum("project_review_type", [
  "bom_review",
  "drawing_review",
  "delay_prediction",
]);

export const reviewStatusEnum = pgEnum("project_review_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ── Tables ───────────────────────────────────────────────────
export const projectAgentReviews = pgTable("project_agent_reviews", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  aiTaskId: integer("ai_task_id"),
  reviewType: reviewTypeEnum("review_type").notNull(),
  triggerPhase: varchar("trigger_phase", { length: 10 }),
  inputSummary: text("input_summary"),
  inputPayload: json("input_payload").$type<Record<string, unknown>>(),
  status: reviewStatusEnum("status").default("pending").notNull(),
  verdict: varchar("verdict", { length: 20 }),  // pass|fail|conditional|at_risk|on_track
  confidence: integer("confidence"),             // 0-100
  findings: json("findings").$type<Array<{
    severity: "critical" | "error" | "warning" | "info";
    category: string;
    message: string;
    recommendation: string;
  }>>(),
  riskScore: integer("risk_score"),              // 0-100 (delay_prediction)
  predictedDelay: integer("predicted_delay"),     // days
  riskFactors: json("risk_factors").$type<Array<{
    factor: string;
    weight: number;
    description: string;
  }>>(),
  narrative: text("narrative"),
  reviewedBy: varchar("reviewed_by", { length: 50 }),
  completedAt: timestamp("completed_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("par_project_id_idx").on(table.projectId),
  index("par_review_type_idx").on(table.reviewType),
  index("par_status_idx").on(table.status),
  index("par_ai_task_id_idx").on(table.aiTaskId),
]);

// ── Types ────────────────────────────────────────────────────
export type ProjectAgentReview = InferSelectModel<typeof projectAgentReviews>;
export type InsertProjectAgentReview = InferInsertModel<typeof projectAgentReviews>;

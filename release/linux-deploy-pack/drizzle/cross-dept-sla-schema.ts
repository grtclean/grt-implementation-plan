/**
 * Cross-Department SLA Schema
 * Tracks inter-department service level agreements and collaboration scores
 */
import { pgTable, serial, varchar, integer, timestamp, json, index, pgEnum } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const slaRequestTypeEnum = pgEnum("sla_request_type", [
  "procurement",
  "finance_approval",
  "it_support",
  "hr_request",
  "quality_review",
  "design_review",
]);

export const crossDeptSlaRecords = pgTable("cross_dept_sla_records", {
  id: serial("id").primaryKey(),
  requesterDeptCode: varchar("requester_dept_code", { length: 50 }).notNull(),
  providerDeptCode: varchar("provider_dept_code", { length: 50 }).notNull(),
  requestType: slaRequestTypeEnum("request_type").notNull(),
  requestedAt: timestamp("requested_at", { mode: "string" }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { mode: "string" }),
  responseTimeMs: integer("response_time_ms"),
  slaTargetMs: integer("sla_target_ms").notNull().default(86400000), // 24h default
  qualityScore: integer("quality_score").default(0), // 0-100
  satisfactionScore: integer("satisfaction_score").default(0), // 1-5
  buCode: varchar("bu_code", { length: 20 }),
  period: varchar("period", { length: 7 }), // YYYY-MM
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sla_requester_idx").on(table.requesterDeptCode),
  index("sla_provider_idx").on(table.providerDeptCode),
  index("sla_period_idx").on(table.period),
  index("sla_bu_idx").on(table.buCode),
]);

export type CrossDeptSlaRecord = InferSelectModel<typeof crossDeptSlaRecords>;
export type InsertCrossDeptSlaRecord = InferInsertModel<typeof crossDeptSlaRecords>;

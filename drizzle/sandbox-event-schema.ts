import { pgTable, pgEnum, serial, varchar, integer, text, timestamp, jsonb, bigint, index, unique } from "drizzle-orm/pg-core";
import { users } from "./schema";

// ── Enums ──
export const agentStatusEnum = pgEnum("agent_status_enum", ["active", "standby", "disabled", "error"]);

// ── sandbox_event_log ──
export const sandboxEventLog = pgTable("sandbox_event_log", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  sourceModule: varchar("source_module", { length: 50 }).notNull(),
  targetModules: jsonb("target_modules").$type<string[]>().default([]),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  userId: integer("user_id").references(() => users.id),
  processedAt: timestamp("processed_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sandbox_event_type_idx").on(table.eventType),
  index("sandbox_event_source_idx").on(table.sourceModule),
  index("sandbox_event_created_idx").on(table.createdAt),
]);

// ── agent_registry ──
export const agentRegistry = pgTable("agent_registry", {
  id: serial("id").primaryKey(),
  agentId: varchar("agent_id", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  sandboxId: varchar("sandbox_id", { length: 50 }), // null = global agent
  aiProvider: varchar("ai_provider", { length: 30 }).notNull(), // gemini/claude/openai
  aiModel: varchar("ai_model", { length: 100 }),
  systemPrompt: text("system_prompt"),
  status: agentStatusEnum("status").default("standby").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  lastInvokedAt: timestamp("last_invoked_at", { mode: "string" }),
  totalInvocations: integer("total_invocations").default(0).notNull(),
  totalTokensUsed: bigint("total_tokens_used", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("agent_registry_sandbox_idx").on(table.sandboxId),
  index("agent_registry_status_idx").on(table.status),
]);

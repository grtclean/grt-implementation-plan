/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT AI Open Claw — External Tool Execution Registry          ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Controlled external HTTP tool execution framework.             ║
 * ║  Zero-trust: registered tools only, role-gated, fully audited. ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. ai_tools_registry    — Registered external tool configs   ║
 * ║    2. role_tool_mappings   — Role ↔ Tool access control (M:N)  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

export const CLAW_TOOL_CATEGORIES = [
  "web_scraping",
  "api_integration",
  "translation",
  "notification",
  "search",
  "general",
] as const;

export const CLAW_RISK_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type ClawToolCategory = (typeof CLAW_TOOL_CATEGORIES)[number];
export type ClawRiskLevel = (typeof CLAW_RISK_LEVELS)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const clawToolCategoryEnum = pgEnum("claw_tool_category", CLAW_TOOL_CATEGORIES);
export const clawRiskLevelEnum = pgEnum("claw_risk_level", CLAW_RISK_LEVELS);

// ══════════════════════════════════════════════════════
// Table 1: ai_tools_registry — Registered external tools
//
// Each row describes one external HTTP endpoint that the
// AI assistant is allowed to invoke. Tools must be
// explicitly registered and activated before use.
// ══════════════════════════════════════════════════════

export const aiToolsRegistry = pgTable("ai_tools_registry", {
  id: serial("id").primaryKey(),
  toolCode: varchar("tool_code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  description: text("description"),
  category: clawToolCategoryEnum("category").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  httpMethod: varchar("http_method", { length: 10 }).notNull().default("GET"),
  defaultHeaders: json("default_headers").$type<Record<string, string>>(),
  defaultParams: json("default_params").$type<Record<string, unknown>>(),
  timeoutMs: integer("timeout_ms").default(30000),
  maxRetries: integer("max_retries").default(3),
  requiresApproval: boolean("requires_approval").default(false),
  riskLevel: clawRiskLevelEnum("risk_level").notNull().default("low"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  index("ai_tools_registry_category_idx").on(table.category),
  index("ai_tools_registry_active_idx").on(table.isActive),
]);

// ══════════════════════════════════════════════════════
// Table 2: role_tool_mappings — Role ↔ Tool access (M:N)
//
// Even with RBAC permission ai:claw:execute, a user must
// also have a mapping row for their role + tool to proceed.
// This is Layer 2 of the 6-layer security model.
// ══════════════════════════════════════════════════════

export const roleToolMappings = pgTable("role_tool_mappings", {
  id: serial("id").primaryKey(),
  roleCode: varchar("role_code", { length: 50 }).notNull(),
  toolId: integer("tool_id").notNull().references(() => aiToolsRegistry.id),
  canExecute: boolean("can_execute").default(true),
  canApprove: boolean("can_approve").default(false),
  grantedBy: integer("granted_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("role_tool_mappings_unique").on(table.roleCode, table.toolId),
  index("role_tool_mappings_tool_idx").on(table.toolId),
]);

// ══════════════════════════════════════════════════════
// Type exports
// ══════════════════════════════════════════════════════

export type AiToolRegistry = InferSelectModel<typeof aiToolsRegistry>;
export type InsertAiToolRegistry = InferInsertModel<typeof aiToolsRegistry>;
export type RoleToolMapping = InferSelectModel<typeof roleToolMappings>;
export type InsertRoleToolMapping = InferInsertModel<typeof roleToolMappings>;

// ══════════════════════════════════════════════════════
// Seed data reference (5 initial tools)
//
// toolCode                  | category        | approval | risk
// ─────────────────────────-┼─────────────────┼──────────┼─────────
// fetch_competitor_pricing  | web_scraping    | true     | high
// query_supplier_api        | api_integration | false    | medium
// translate_document        | translation     | false    | low
// web_search                | search          | false    | low
// email_notification        | notification    | true     | medium
// ══════════════════════════════════════════════════════

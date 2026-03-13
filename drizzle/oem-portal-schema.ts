/**
 * OEM Developer Portal Schema — B2B Open Gateway
 *
 * Tables:
 *   1. oem_api_keys          — API key registry (SHA-256 hashed, scope-based)
 *   2. oem_webhooks          — Webhook endpoint configs with HMAC signing
 *   3. oem_api_call_logs     — Request audit trail
 *   4. oem_webhook_deliveries — Webhook delivery queue + log
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text, timestamp, json, boolean, index, unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────

export const oemKeyStatusEnum = pgEnum("oem_key_status", ["active", "revoked", "expired"]);
export const oemWebhookStatusEnum = pgEnum("oem_webhook_status", ["active", "paused", "disabled"]);
export const oemDeliveryStatusEnum = pgEnum("oem_delivery_status", ["pending", "delivered", "failed", "retrying"]);

// ── 1. OEM API Keys ─────────────────────────────────────────

export const oemApiKeys = pgTable("oem_api_keys", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),         // FK → crm_customers
  keyName: varchar("key_name", { length: 100 }).notNull(),
  keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),  // "grt_2a7f..."
  scopes: json("scopes").$type<string[]>().notNull().default([]),
  status: oemKeyStatusEnum("status").notNull().default("active"),
  rateLimitPerHour: integer("rate_limit_per_hour").notNull().default(1000),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: integer("created_by"),                  // FK → users
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_oem_keys_client").on(table.clientId),
  index("idx_oem_keys_hash").on(table.keyHash),
]);

// ── 2. OEM Webhooks ─────────────────────────────────────────

export const oemWebhooks = pgTable("oem_webhooks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),          // FK → crm_customers
  endpointUrl: varchar("endpoint_url", { length: 500 }).notNull(),
  events: json("events").$type<string[]>().notNull().default([]),
  secretHash: varchar("secret_hash", { length: 128 }).notNull(),
  secretPrefix: varchar("secret_prefix", { length: 12 }).notNull(),
  status: oemWebhookStatusEnum("status").notNull().default("active"),
  failureCount: integer("failure_count").notNull().default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_oem_webhooks_client").on(table.clientId),
  index("idx_oem_webhooks_status").on(table.status),
]);

// ── 3. OEM API Call Logs ────────────────────────────────────

export const oemApiCallLogs = pgTable("oem_api_call_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id"),                   // FK → oem_api_keys
  clientId: integer("client_id").notNull(),          // Denormalized for fast queries
  endpoint: varchar("endpoint", { length: 200 }).notNull(),
  method: varchar("method", { length: 10 }).notNull().default("GET"),
  statusCode: integer("status_code").notNull(),
  responseTimeMs: integer("response_time_ms"),
  ipAddress: varchar("ip_address", { length: 45 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oem_calls_client_created").on(table.clientId, table.createdAt),
  index("idx_oem_calls_key").on(table.apiKeyId),
]);

// ── 4. OEM Webhook Deliveries ───────────────────────────────

export const oemWebhookDeliveries = pgTable("oem_webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull(),        // FK → oem_webhooks
  clientId: integer("client_id").notNull(),          // Denormalized
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  status: oemDeliveryStatusEnum("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),                // First 1000 chars
  nextRetryAt: timestamp("next_retry_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_oem_deliveries_status").on(table.status, table.nextRetryAt),
  index("idx_oem_deliveries_webhook").on(table.webhookId),
  index("idx_oem_deliveries_client").on(table.clientId),
]);

// ── Type exports ────────────────────────────────────────────

export type OemApiKey = InferSelectModel<typeof oemApiKeys>;
export type InsertOemApiKey = InferInsertModel<typeof oemApiKeys>;
export type OemWebhook = InferSelectModel<typeof oemWebhooks>;
export type InsertOemWebhook = InferInsertModel<typeof oemWebhooks>;
export type OemApiCallLog = InferSelectModel<typeof oemApiCallLogs>;
export type InsertOemApiCallLog = InferInsertModel<typeof oemApiCallLogs>;
export type OemWebhookDelivery = InferSelectModel<typeof oemWebhookDeliveries>;
export type InsertOemWebhookDelivery = InferInsertModel<typeof oemWebhookDeliveries>;

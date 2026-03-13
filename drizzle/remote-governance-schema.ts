/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Remote Access Governance Schema                            ║
 * ║  CEO mandate: Zero-Trust Remote Debugging Protocol          ║
 * ║  After PLC overwrite incident — all VPN access requires     ║
 * ║  time-bound tokens with full audit trail.                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────

export const remoteAccessStatusEnum = pgEnum("remote_access_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
]);

export const accessUrgencyEnum = pgEnum("access_urgency", [
  "NORMAL",
  "URGENT",
  "CRITICAL",
]);

// ── Tables ─────────────────────────────────────────────────────

export const remoteAccessRequests = pgTable(
  "remote_access_requests",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id"),
    projectName: varchar("project_name", { length: 300 }),
    engineerId: integer("engineer_id").notNull(),
    engineerName: varchar("engineer_name", { length: 100 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    equipmentId: varchar("equipment_id", { length: 100 }).notNull(),
    equipmentModel: varchar("equipment_model", { length: 200 }),
    targetIp: varchar("target_ip", { length: 50 }),
    reasonForAccess: text("reason_for_access").notNull(),
    urgency: accessUrgencyEnum("urgency").default("NORMAL").notNull(),
    requestedDurationHours: integer("requested_duration_hours").notNull(),
    status: remoteAccessStatusEnum("status").default("PENDING").notNull(),
    tempVpnToken: varchar("temp_vpn_token", { length: 50 }),
    approvedBy: integer("approved_by"),
    approverName: varchar("approver_name", { length: 100 }),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    revokedBy: integer("revoked_by"),
    revokeReason: text("revoke_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_rar_status").on(t.status),
    index("idx_rar_engineer").on(t.engineerId),
    index("idx_rar_expires").on(t.expiresAt),
  ]
);

export const remoteAccessAuditLogs = pgTable(
  "remote_access_audit_logs",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    performedBy: integer("performed_by").notNull(),
    performerName: varchar("performer_name", { length: 100 }).notNull(),
    details: text("details"),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_raal_request").on(t.requestId),
    index("idx_raal_action").on(t.action),
  ]
);

// ── Relations ──────────────────────────────────────────────────

export const remoteAccessRequestsRelations = relations(
  remoteAccessRequests,
  ({ many }) => ({
    auditLogs: many(remoteAccessAuditLogs),
  })
);

export const remoteAccessAuditLogsRelations = relations(
  remoteAccessAuditLogs,
  ({ one }) => ({
    request: one(remoteAccessRequests, {
      fields: [remoteAccessAuditLogs.requestId],
      references: [remoteAccessRequests.id],
    }),
  })
);

// ── Types ──────────────────────────────────────────────────────

export type RemoteAccessRequest = typeof remoteAccessRequests.$inferSelect;
export type NewRemoteAccessRequest = typeof remoteAccessRequests.$inferInsert;
export type RemoteAccessAuditLog = typeof remoteAccessAuditLogs.$inferSelect;
export type NewRemoteAccessAuditLog = typeof remoteAccessAuditLogs.$inferInsert;

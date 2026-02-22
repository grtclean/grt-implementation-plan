/**
 * GRT Vision — Large-Screen Dashboard Configuration Schema
 *
 * 3 tables:
 *   display_screens   — registered display hardware (lobby / shopfloor / BU / service)
 *   screen_playlists  — auto-carousel view sequence per screen
 *   screen_security_logs — audit trail for INTERNAL unlock events
 *
 * CRITICAL: Every screen defaults to EXTERNAL_DEMO on boot.
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

// ─── 1. Display Screens ─────────────────────────────────────

export const displayScreens = pgTable(
  "display_screens",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    location: varchar("location", { length: 30 }).notNull(), // LOBBY | SHOPFLOOR | BU | SERVICE
    macAddress: varchar("mac_address", { length: 20 }),
    currentMode: varchar("current_mode", { length: 20 }).default("EXTERNAL").notNull(), // EXTERNAL | INTERNAL
    modeUnlockedAt: timestamp("mode_unlocked_at", { mode: "string" }),
    modeUnlockExpiresAt: timestamp("mode_unlock_expires_at", { mode: "string" }),
    unlockedByName: varchar("unlocked_by_name", { length: 100 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_display_screens_location").on(table.location),
    index("idx_display_screens_mode").on(table.currentMode),
  ]
);

// ─── 2. Screen Playlists ────────────────────────────────────

export const screenPlaylists = pgTable(
  "screen_playlists",
  {
    id: serial("id").primaryKey(),
    screenId: integer("screen_id").notNull(),
    viewComponentName: varchar("view_component_name", { length: 100 }).notNull(),
    durationSeconds: integer("duration_seconds").default(30).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    mode: varchar("mode", { length: 20 }).default("BOTH").notNull(), // EXTERNAL | INTERNAL | BOTH
    isActive: boolean("is_active").default(true),
  },
  (table) => [
    index("idx_screen_playlists_screen").on(table.screenId),
  ]
);

// ─── 3. Screen Security Logs ────────────────────────────────

export const screenSecurityLogs = pgTable(
  "screen_security_logs",
  {
    id: serial("id").primaryKey(),
    screenId: integer("screen_id").notNull(),
    action: varchar("action", { length: 20 }).notNull(), // UNLOCK | LOCK | AUTO_REVERT
    operatorId: integer("operator_id"),
    operatorName: varchar("operator_name", { length: 100 }),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_screen_security_logs_screen").on(table.screenId),
    index("idx_screen_security_logs_created").on(table.createdAt),
  ]
);

/**
 * Spark of Hope — 星火大屏 & 奋斗者殿堂 Schema
 *
 * Tables:
 *   strivers_hall      — 奋斗者勋章记录
 *   global_live_feeds  — 全球前线实时战报
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────

export const medalLevelEnum = pgEnum("medal_level", [
  "GOLD",
  "SILVER",
  "BRONZE",
]);

// ── strivers_hall ──────────────────────────────────────────

export const striversHall = pgTable(
  "strivers_hall",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    userName: varchar("user_name", { length: 200 }).notNull(),
    achievementTitle: varchar("achievement_title", { length: 500 }).notNull(),
    medalLevel: medalLevelEnum("medal_level").notNull(),
    storySummary: text("story_summary"),
    awardedBy: varchar("awarded_by", { length: 200 }),
    awardedAt: timestamp("awarded_at", { mode: "string" }).defaultNow().notNull(),
    buCode: varchar("bu_code", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sh_user_idx").on(table.userId),
    index("sh_medal_idx").on(table.medalLevel),
    index("sh_awarded_idx").on(table.awardedAt),
  ],
);

export type StriverHallEntry = InferSelectModel<typeof striversHall>;
export type NewStriverHallEntry = InferInsertModel<typeof striversHall>;

// ── global_live_feeds ──────────────────────────────────────

export const globalLiveFeeds = pgTable(
  "global_live_feeds",
  {
    id: serial("id").primaryKey(),
    projectId: varchar("project_id", { length: 100 }),
    projectName: varchar("project_name", { length: 300 }),
    location: varchar("location", { length: 200 }).notNull(),
    feedMessage: text("feed_message").notNull(),
    feedType: varchar("feed_type", { length: 20 })
      .default("DAILY")
      .notNull(),
    reportedBy: varchar("reported_by", { length: 200 }),
    importance: varchar("importance", { length: 20 }).default("normal").notNull(),
    isLive: boolean("is_live").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("glf_project_idx").on(table.projectId),
    index("glf_location_idx").on(table.location),
    index("glf_created_idx").on(table.createdAt),
    index("glf_live_idx").on(table.isLive),
  ],
);

export type GlobalLiveFeed = InferSelectModel<typeof globalLiveFeeds>;
export type NewGlobalLiveFeed = InferInsertModel<typeof globalLiveFeeds>;

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Contextual Help System — Help Articles Schema             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Provides in-app contextual help content linked to routes and   ║
 * ║  features. Supports bilingual (EN/ZH) markdown content,        ║
 * ║  categorized articles, and searchable tags.                     ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. help_articles  — Contextual help content per route/feature║
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
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

export const HELP_CATEGORIES = [
  "GETTING_STARTED",
  "FEATURE_GUIDE",
  "FAQ",
  "TROUBLESHOOTING",
  "BEST_PRACTICE",
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const helpCategoryEnum = pgEnum("help_category", HELP_CATEGORIES);

// ══════════════════════════════════════════════════════
// Table 1: help_articles — Contextual help content
//   linked to routes and features
//
// Each article provides bilingual (English + Chinese)
// markdown content for a specific route or feature.
// Articles are categorized, tagged for search, and
// can reference related routes for cross-linking.
// ══════════════════════════════════════════════════════

export const helpArticles = pgTable("help_articles", {
  id: serial("id").primaryKey(),

  /** Route this help applies to, e.g. "/projects", "/ai-genesis" */
  routePath: varchar("route_path", { length: 200 }),

  /** Feature identifier, e.g. "project.gates", "genesis.upload" */
  featureKey: varchar("feature_key", { length: 100 }),

  /** English title */
  title: varchar("title", { length: 300 }).notNull(),

  /** Chinese title */
  titleZh: varchar("title_zh", { length: 300 }).notNull(),

  /** English help content (markdown) */
  content: text("content").notNull(),

  /** Chinese help content (markdown) */
  contentZh: text("content_zh").notNull(),

  /** Article category */
  category: helpCategoryEnum("category").notNull(),

  /** JSONB: string array of searchable tags */
  tags: json("tags").$type<string[]>(),

  /** JSONB: string array of related route paths */
  relatedRoutes: json("related_routes").$type<string[]>(),

  /** Optional tutorial video URL */
  videoUrl: varchar("video_url", { length: 500 }),

  /** Display ordering */
  sortOrder: integer("sort_order").default(0),

  /** Soft-delete / deactivation flag */
  isActive: boolean("is_active").default(true),

  /** FK -> users.id — who created this article */
  createdBy: integer("created_by").references(() => users.id),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("help_route_path_idx").on(table.routePath),
  index("help_feature_key_idx").on(table.featureKey),
  index("help_category_idx").on(table.category),
  index("help_active_idx").on(table.isActive),
]);

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type HelpArticle = InferSelectModel<typeof helpArticles>;
export type NewHelpArticle = InferInsertModel<typeof helpArticles>;

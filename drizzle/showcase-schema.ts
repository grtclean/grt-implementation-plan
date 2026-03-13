/**
 * Targeted Showcase Schema — 定向数字展厅
 *
 * Two tables:
 * 1. showcase_templates   — reusable product showcase templates (KLT, turbine, etc.)
 * 2. guest_authorizations — time-limited, token-gated guest access records
 *
 * Zero-trust: guests ONLY see data via an expiring accessToken.
 * Internal users manage templates via RBAC-protected procedures.
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: showcase_templates
// ──────────────────────────────────────────────────────────────
export const showcaseTemplates = pgTable(
  "showcase_templates",
  {
    id: serial("id").primaryKey(),

    // Classification
    productType: varchar("product_type", { length: 100 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: text("subtitle"),
    description: text("description"),

    // Digital assets (JSON arrays of { url, caption, sortOrder })
    equipmentImages: jsonb("equipment_images").default([]),
    operationVideos: jsonb("operation_videos").default([]),
    heroVideoUrl: text("hero_video_url"),

    // Technical specs
    taktTimeSeconds: decimal("takt_time_seconds", { precision: 10, scale: 2 }),
    cleaningEfficiency: varchar("cleaning_efficiency", { length: 100 }),
    cleanlinessStandard: varchar("cleanliness_standard", { length: 200 }),
    throughputPerHour: integer("throughput_per_hour"),
    powerConsumptionKw: decimal("power_consumption_kw", { precision: 8, scale: 2 }),

    // Commercial
    priceRangeMin: decimal("price_range_min", { precision: 14, scale: 2 }),
    priceRangeMax: decimal("price_range_max", { precision: 14, scale: 2 }),
    priceCurrency: varchar("price_currency", { length: 10 }).default("EUR"),
    roiMonths: integer("roi_months"),

    // Configurations (JSON array of { name, description, price, features[] })
    configurations: jsonb("configurations").default([]),

    // Additional specs (JSON key-value for flexible display)
    technicalSpecs: jsonb("technical_specs").default({}),

    // Status
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("st_product_type_idx").on(table.productType),
    index("st_is_active_idx").on(table.isActive),
    index("st_created_at_idx").on(table.createdAt),
  ],
);

export type ShowcaseTemplate = InferSelectModel<typeof showcaseTemplates>;
export type NewShowcaseTemplate = InferInsertModel<typeof showcaseTemplates>;

// ──────────────────────────────────────────────────────────────
// Table 2: guest_authorizations
// ──────────────────────────────────────────────────────────────
export const guestAuthorizations = pgTable(
  "guest_authorizations",
  {
    id: serial("id").primaryKey(),

    // Link to template
    showcaseId: integer("showcase_id").notNull(),

    // Guest info
    targetClient: varchar("target_client", { length: 200 }).notNull(),
    contactPerson: varchar("contact_person", { length: 200 }),
    contactEmail: varchar("contact_email", { length: 200 }),
    welcomeMessage: text("welcome_message"),

    // Security — unique random token, expiry-gated
    accessToken: varchar("access_token", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    maxViews: integer("max_views").default(100),

    // Tracking
    viewCount: integer("view_count").default(0).notNull(),
    firstViewedAt: timestamp("first_viewed_at", { mode: "string" }),
    lastViewedAt: timestamp("last_viewed_at", { mode: "string" }),

    // Status
    isRevoked: boolean("is_revoked").default(false),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
    revokedReason: text("revoked_reason"),

    // Audit
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ga_access_token_idx").on(table.accessToken),
    index("ga_showcase_id_idx").on(table.showcaseId),
    index("ga_target_client_idx").on(table.targetClient),
    index("ga_expires_at_idx").on(table.expiresAt),
    index("ga_is_revoked_idx").on(table.isRevoked),
  ],
);

export type GuestAuthorization = InferSelectModel<typeof guestAuthorizations>;
export type NewGuestAuthorization = InferInsertModel<typeof guestAuthorizations>;

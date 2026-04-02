/**
 * Showcase Hub Schema — GRT展示中枢
 *
 * 4 new tables covering 7 enhanced scenarios:
 * 1. showcase_content_blocks  — CMS: roadmap/patent/case-study/exhibit/ESG blocks
 * 2. equipment_health_snapshots — Strategic customer equipment health monitoring
 * 3. showcase_visitor_events   — Visitor tracking, funnel analytics, footprint heatmap
 * 4. showcase_support_tickets  — Inline guest support (no-login ticket submission)
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: showcase_content_blocks (CMS backbone)
// ──────────────────────────────────────────────────────────────
export const showcaseContentBlocks = pgTable(
  "showcase_content_blocks",
  {
    id: serial("id").primaryKey(),

    // Classification
    blockType: varchar("block_type", { length: 50 }).notNull(),
    // "roadmap" | "patent" | "case_study" | "exhibit_detail" | "esg_metric" |
    // "delivery_center" | "tech_highlight" | "video_testimonial" | "equipment_card"
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: text("subtitle"),

    // Content payload (type-specific JSON)
    content: jsonb("content").notNull().default({}),

    // Versioning + CMS
    version: integer("version").default(1).notNull(),
    language: varchar("language", { length: 10 }).default("zh"),
    tags: jsonb("tags").default([]),
    industryScope: jsonb("industry_scope").default([]),

    // Lifecycle
    isPublished: boolean("is_published").default(false),
    publishedAt: timestamp("published_at", { mode: "string" }),
    expiryDate: timestamp("expiry_date", { mode: "string" }),
    watermarkLevel: varchar("watermark_level", { length: 20 }).default("none"),
    // "none" | "light" | "heavy" | "confidential"

    // Linkage
    templateId: integer("template_id"),
    sortOrder: integer("sort_order").default(0),

    // Audit
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("scb_block_type_idx").on(table.blockType),
    index("scb_template_id_idx").on(table.templateId),
    index("scb_is_published_idx").on(table.isPublished),
    index("scb_expiry_idx").on(table.expiryDate),
    index("scb_language_idx").on(table.language),
  ],
);

export type ShowcaseContentBlock = InferSelectModel<typeof showcaseContentBlocks>;
export type NewShowcaseContentBlock = InferInsertModel<typeof showcaseContentBlocks>;

// ──────────────────────────────────────────────────────────────
// Table 2: equipment_health_snapshots
// ──────────────────────────────────────────────────────────────
export const equipmentHealthSnapshots = pgTable(
  "equipment_health_snapshots",
  {
    id: serial("id").primaryKey(),

    // Identity
    customerId: varchar("customer_id", { length: 50 }),
    equipmentId: integer("equipment_id"),
    equipmentCode: varchar("equipment_code", { length: 50 }).notNull(),
    equipmentName: varchar("equipment_name", { length: 200 }).notNull(),
    projectNumber: varchar("project_number", { length: 100 }),

    // Health metrics
    healthScore: integer("health_score").notNull(), // 0-100
    healthStatus: varchar("health_status", { length: 20 }).default("normal"),
    // "excellent" | "normal" | "attention" | "warning" | "critical"

    // Test data
    lastTestDate: timestamp("last_test_date", { mode: "string" }),
    testResults: jsonb("test_results").default({}),
    operatingHours: integer("operating_hours"),

    // Prediction
    maintenancePrediction: jsonb("maintenance_prediction").default({}),

    // Snapshot metadata
    snapshotDate: timestamp("snapshot_date", { mode: "string" }).defaultNow().notNull(),
    isLatest: boolean("is_latest").default(true),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ehs_customer_idx").on(table.customerId),
    index("ehs_equipment_idx").on(table.equipmentId),
    index("ehs_health_score_idx").on(table.healthScore),
    index("ehs_is_latest_idx").on(table.isLatest),
    index("ehs_snapshot_date_idx").on(table.snapshotDate),
  ],
);

export type EquipmentHealthSnapshot = InferSelectModel<typeof equipmentHealthSnapshots>;
export type NewEquipmentHealthSnapshot = InferInsertModel<typeof equipmentHealthSnapshots>;

// ──────────────────────────────────────────────────────────────
// Table 3: showcase_visitor_events (tracking + funnel + heatmap)
// ──────────────────────────────────────────────────────────────
export const showcaseVisitorEvents = pgTable(
  "showcase_visitor_events",
  {
    id: serial("id").primaryKey(),

    // Identity (who)
    tokenId: integer("token_id"),
    sessionId: varchar("session_id", { length: 64 }),

    // Event (what)
    eventType: varchar("event_type", { length: 30 }).notNull(),
    // "page_view" | "qr_scan" | "content_download" | "video_play" | "expert_book" |
    // "ticket_submit" | "lead_form" | "exhibit_checkin" | "brochure_request" | "cta_click"
    eventTarget: varchar("event_target", { length: 200 }),
    metadata: jsonb("metadata").default({}),

    // Context (where/how)
    deviceType: varchar("device_type", { length: 20 }),
    // "mobile" | "tablet" | "desktop" | "kiosk"
    referrer: varchar("referrer", { length: 500 }),

    // Conversion tracking (Scenario 7)
    funnelStage: varchar("funnel_stage", { length: 30 }),
    // "awareness" | "interest" | "consideration" | "intent" | "conversion"
    leadScore: integer("lead_score"),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sve_token_idx").on(table.tokenId),
    index("sve_session_idx").on(table.sessionId),
    index("sve_event_type_idx").on(table.eventType),
    index("sve_device_idx").on(table.deviceType),
    index("sve_funnel_idx").on(table.funnelStage),
    index("sve_created_idx").on(table.createdAt),
  ],
);

export type ShowcaseVisitorEvent = InferSelectModel<typeof showcaseVisitorEvents>;
export type NewShowcaseVisitorEvent = InferInsertModel<typeof showcaseVisitorEvents>;

// ──────────────────────────────────────────────────────────────
// Table 4: showcase_support_tickets (inline guest support)
// ──────────────────────────────────────────────────────────────
export const showcaseSupportTickets = pgTable(
  "showcase_support_tickets",
  {
    id: serial("id").primaryKey(),
    ticketCode: varchar("ticket_code", { length: 50 }).notNull(),

    // Identity (guest-friendly, no login required)
    tokenId: integer("token_id"),
    guestName: varchar("guest_name", { length: 100 }),
    guestEmail: varchar("guest_email", { length: 200 }),
    guestPhone: varchar("guest_phone", { length: 50 }),
    companyName: varchar("company_name", { length: 200 }),

    // Issue
    issueType: varchar("issue_type", { length: 50 }).notNull(),
    // "technical_question" | "pricing_inquiry" | "spare_parts" | "maintenance_request" |
    // "complaint" | "general_feedback" | "demo_request"
    subject: varchar("subject", { length: 300 }).notNull(),
    description: text("description"),
    attachmentUrls: jsonb("attachment_urls").default([]),

    // AI triage
    aiSuggestion: text("ai_suggestion"),
    aiConfidence: integer("ai_confidence"), // 0-100

    // Routing + resolution
    status: varchar("status", { length: 30 }).default("open").notNull(),
    // "open" | "ai_responded" | "assigned" | "in_progress" | "resolved" | "closed"
    assignedTo: integer("assigned_to"),
    assignedToName: varchar("assigned_to_name", { length: 100 }),
    resolution: text("resolution"),

    // Satisfaction
    satisfactionRating: integer("satisfaction_rating"), // 1-5
    satisfactionComment: text("satisfaction_comment"),

    // Audit
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
  },
  (table) => [
    uniqueIndex("sst_ticket_code_idx").on(table.ticketCode),
    index("sst_token_idx").on(table.tokenId),
    index("sst_issue_type_idx").on(table.issueType),
    index("sst_status_idx").on(table.status),
    index("sst_assigned_idx").on(table.assignedTo),
    index("sst_created_idx").on(table.createdAt),
  ],
);

export type ShowcaseSupportTicket = InferSelectModel<typeof showcaseSupportTickets>;
export type NewShowcaseSupportTicket = InferInsertModel<typeof showcaseSupportTickets>;

// ──────────────────────────────────────────────────────────────
// Table 5: showcase_loyalty_accounts (客户积分账户)
// ──────────────────────────────────────────────────────────────
export const showcaseLoyaltyAccounts = pgTable(
  "showcase_loyalty_accounts",
  {
    id: serial("id").primaryKey(),

    // Identity — one account per customer contact
    customerCode: varchar("customer_code", { length: 50 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    contactName: varchar("contact_name", { length: 100 }),
    contactEmail: varchar("contact_email", { length: 200 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    companyName: varchar("company_name", { length: 200 }),

    // Tier system
    tier: varchar("tier", { length: 20 }).default("bronze").notNull(),
    // "bronze" | "silver" | "gold" | "platinum" | "diamond"
    tierPoints: integer("tier_points").default(0).notNull(), // lifetime accumulated (never decrease)

    // Spendable balance
    availablePoints: integer("available_points").default(0).notNull(),
    lifetimeEarned: integer("lifetime_earned").default(0).notNull(),
    lifetimeSpent: integer("lifetime_spent").default(0).notNull(),

    // Engagement metrics
    referralCount: integer("referral_count").default(0).notNull(),
    techContributionCount: integer("tech_contribution_count").default(0).notNull(),
    communityPostCount: integer("community_post_count").default(0).notNull(),
    lastActiveAt: timestamp("last_active_at", { mode: "string" }),

    // Status
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sla_customer_code_idx").on(table.customerCode),
    index("sla_tier_idx").on(table.tier),
    index("sla_available_points_idx").on(table.availablePoints),
    index("sla_is_active_idx").on(table.isActive),
  ],
);

export type ShowcaseLoyaltyAccount = InferSelectModel<typeof showcaseLoyaltyAccounts>;
export type NewShowcaseLoyaltyAccount = InferInsertModel<typeof showcaseLoyaltyAccounts>;

// ──────────────────────────────────────────────────────────────
// Table 6: showcase_point_transactions (积分流水)
// ──────────────────────────────────────────────────────────────
export const showcasePointTransactions = pgTable(
  "showcase_point_transactions",
  {
    id: serial("id").primaryKey(),

    // Link
    accountId: integer("account_id").notNull(),
    customerCode: varchar("customer_code", { length: 50 }).notNull(),

    // Transaction
    transactionType: varchar("transaction_type", { length: 20 }).notNull(),
    // "earn" | "spend" | "expire" | "adjust" | "bonus"
    points: integer("points").notNull(), // positive=earn, negative=spend
    balanceAfter: integer("balance_after").notNull(),

    // Source — what triggered this transaction
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    // earn sources:
    //   "showcase_visit" | "content_download" | "video_watch" |
    //   "referral_signup" | "referral_conversion" | "tech_feedback" |
    //   "community_post" | "community_answer" | "ticket_resolved" |
    //   "event_checkin" | "survey_complete" | "expert_booking" |
    //   "annual_bonus" | "manual_adjust"
    // spend sources:
    //   "reward_redeem" | "priority_support" | "exclusive_content" |
    //   "expert_consultation" | "training_seat"
    sourceId: varchar("source_id", { length: 100 }), // optional FK to the triggering record
    description: varchar("description", { length: 300 }),

    // Expiry
    expiresAt: timestamp("expires_at", { mode: "string" }), // null = never expires

    // Audit
    createdBy: integer("created_by"), // null = system/auto
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("spt_account_idx").on(table.accountId),
    index("spt_customer_code_idx").on(table.customerCode),
    index("spt_transaction_type_idx").on(table.transactionType),
    index("spt_source_type_idx").on(table.sourceType),
    index("spt_created_idx").on(table.createdAt),
    index("spt_expires_idx").on(table.expiresAt),
  ],
);

export type ShowcasePointTransaction = InferSelectModel<typeof showcasePointTransactions>;
export type NewShowcasePointTransaction = InferInsertModel<typeof showcasePointTransactions>;

// ──────────────────────────────────────────────────────────────
// Table 7: showcase_rewards_catalog (积分兑换目录)
// ──────────────────────────────────────────────────────────────
export const showcaseRewardsCatalog = pgTable(
  "showcase_rewards_catalog",
  {
    id: serial("id").primaryKey(),

    // Reward definition
    rewardCode: varchar("reward_code", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(),
    // "priority_support" | "exclusive_content" | "expert_consultation" |
    // "training" | "factory_visit" | "gift" | "discount" | "co_branding"
    imageUrl: text("image_url"),

    // Cost + availability
    pointsCost: integer("points_cost").notNull(),
    minTier: varchar("min_tier", { length: 20 }).default("bronze"),
    // minimum tier required to redeem
    stockQuantity: integer("stock_quantity"), // null = unlimited
    redeemedCount: integer("redeemed_count").default(0).notNull(),

    // Validity
    isActive: boolean("is_active").default(true),
    validFrom: timestamp("valid_from", { mode: "string" }),
    validUntil: timestamp("valid_until", { mode: "string" }),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("src_reward_code_idx").on(table.rewardCode),
    index("src_category_idx").on(table.category),
    index("src_is_active_idx").on(table.isActive),
    index("src_points_cost_idx").on(table.pointsCost),
  ],
);

export type ShowcaseReward = InferSelectModel<typeof showcaseRewardsCatalog>;
export type NewShowcaseReward = InferInsertModel<typeof showcaseRewardsCatalog>;

// ──────────────────────────────────────────────────────────────
// Table 8: showcase_referrals (推荐追踪)
// ──────────────────────────────────────────────────────────────
export const showcaseReferrals = pgTable(
  "showcase_referrals",
  {
    id: serial("id").primaryKey(),

    // Referrer
    referrerAccountId: integer("referrer_account_id").notNull(),
    referrerCode: varchar("referrer_code", { length: 50 }).notNull(),

    // Referred
    referredCompany: varchar("referred_company", { length: 200 }).notNull(),
    referredContact: varchar("referred_contact", { length: 100 }),
    referredEmail: varchar("referred_email", { length: 200 }),
    referredPhone: varchar("referred_phone", { length: 50 }),
    referredIndustry: varchar("referred_industry", { length: 100 }),

    // Status
    status: varchar("status", { length: 30 }).default("pending").notNull(),
    // "pending" | "contacted" | "qualified" | "converted" | "rejected"
    qualifiedAt: timestamp("qualified_at", { mode: "string" }),
    convertedAt: timestamp("converted_at", { mode: "string" }),

    // Points awarded
    signupPoints: integer("signup_points").default(0), // awarded on referral submission
    conversionPoints: integer("conversion_points").default(0), // awarded on conversion
    conversionBonusAwarded: boolean("conversion_bonus_awarded").default(false),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"), // not visible to referrer

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sref_referrer_idx").on(table.referrerAccountId),
    index("sref_referrer_code_idx").on(table.referrerCode),
    index("sref_status_idx").on(table.status),
    index("sref_created_idx").on(table.createdAt),
  ],
);

export type ShowcaseReferral = InferSelectModel<typeof showcaseReferrals>;
export type NewShowcaseReferral = InferInsertModel<typeof showcaseReferrals>;

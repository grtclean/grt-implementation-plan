/**
 * Strategic Customer Profile Schema — 客户商业档案契约
 *
 * Stores rich customer profiles including:
 *   - Brand aesthetics (品牌视觉基因)
 *   - Standards mapping (技术商务标准映射)
 *   - Product interlock matrix (核心产品线咬合矩阵)
 *
 * 5 tables:
 *   strategic_customer_profiles   — 主档案
 *   customer_brand_aesthetics     — 品牌视觉基因
 *   customer_standards_mappings   — 技术商务标准映射
 *   customer_product_interlocks   — 核心产品线咬合矩阵
 *   customer_profile_snapshots    — 档案快照 (变更历史)
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════

export const cooperationTierEnum = pgEnum("cooperation_tier", [
  "V0_Strategic_Partner",
  "V1_Key_Account",
  "V2_Standard",
  "V3_Prospect",
  "V4_Dormant",
]);

export const visualStyleEnum = pgEnum("visual_style", [
  "Tech_Premium_Industrial",
  "Clean_Minimalist",
  "Bold_Engineering",
  "Corporate_Classic",
  "Green_Sustainability",
]);

export const interlockTimelineEnum = pgEnum("interlock_timeline", [
  "past",
  "present",
  "future",
]);

export const profileStatusEnum = pgEnum("customer_profile_status", [
  "draft",
  "active",
  "archived",
]);

// ═══════════════════════════════════════════════════════════
// 1. strategic_customer_profiles — 主档案
// ═══════════════════════════════════════════════════════════

export const strategicCustomerProfiles = pgTable("strategic_customer_profiles", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id", { length: 50 }).notNull(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  companyNameEn: varchar("company_name_en", { length: 200 }),
  cooperationTier: cooperationTierEnum("cooperation_tier").notNull().default("V2_Standard"),
  status: profileStatusEnum("status").notNull().default("draft"),

  // Contact
  primaryContact: varchar("primary_contact", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),

  // Business info
  industry: varchar("industry", { length: 100 }),
  annualRevenue: varchar("annual_revenue", { length: 50 }),
  employeeCount: integer("employee_count"),
  foundedYear: integer("founded_year"),
  websiteUrl: varchar("website_url", { length: 300 }),
  stockCode: varchar("stock_code", { length: 20 }),

  // GRT relationship
  firstProjectDate: timestamp("first_project_date"),
  totalProjectCount: integer("total_project_count").default(0),
  totalContractValue: varchar("total_contract_value", { length: 50 }),
  accountManagerId: integer("account_manager_id"),
  accountManagerName: varchar("account_manager_name", { length: 100 }),

  // Metadata
  tags: json("tags").$type<string[]>(),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_scp_customer_id").on(table.customerId),
  index("idx_scp_company_name").on(table.companyName),
  index("idx_scp_cooperation_tier").on(table.cooperationTier),
  index("idx_scp_status").on(table.status),
]);

export type StrategicCustomerProfile = InferSelectModel<typeof strategicCustomerProfiles>;
export type NewStrategicCustomerProfile = InferInsertModel<typeof strategicCustomerProfiles>;

// ═══════════════════════════════════════════════════════════
// 2. customer_brand_aesthetics — 品牌视觉基因
// ═══════════════════════════════════════════════════════════

export const customerBrandAesthetics = pgTable("customer_brand_aesthetics", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  sourceUrl: varchar("source_url", { length: 500 }),
  primaryColorHex: varchar("primary_color_hex", { length: 7 }),
  secondaryColorHex: varchar("secondary_color_hex", { length: 7 }),
  accentColorHex: varchar("accent_color_hex", { length: 7 }),
  visualStyle: visualStyleEnum("visual_style").notNull().default("Tech_Premium_Industrial"),
  fontPreference: varchar("font_preference", { length: 100 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  coreVision: json("core_vision").$type<string[]>(),
  brandKeywords: json("brand_keywords").$type<string[]>(),
  designNotes: text("design_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cba_profile_id").on(table.profileId),
]);

export type CustomerBrandAesthetic = InferSelectModel<typeof customerBrandAesthetics>;
export type NewCustomerBrandAesthetic = InferInsertModel<typeof customerBrandAesthetics>;

// ═══════════════════════════════════════════════════════════
// 3. customer_standards_mappings — 技术商务标准映射
// ═══════════════════════════════════════════════════════════

export const customerStandardsMappings = pgTable("customer_standards_mappings", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  customerStandard: text("customer_standard").notNull(),
  grtMatchedValue: text("grt_matched_value").notNull(),
  category: varchar("category", { length: 50 }),
  confidenceScore: integer("confidence_score"),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedByUserId: integer("verified_by_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_csm_profile_id").on(table.profileId),
]);

export type CustomerStandardsMapping = InferSelectModel<typeof customerStandardsMappings>;
export type NewCustomerStandardsMapping = InferInsertModel<typeof customerStandardsMappings>;

// ═══════════════════════════════════════════════════════════
// 4. customer_product_interlocks — 核心产品线咬合矩阵
// ═══════════════════════════════════════════════════════════

export const customerProductInterlocks = pgTable("customer_product_interlocks", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  timeline: interlockTimelineEnum("timeline").notNull().default("present"),
  customerProduct: text("customer_product").notNull(),
  grtMatchedSolution: text("grt_matched_solution").notNull(),
  projectRef: varchar("project_ref", { length: 100 }),
  status: varchar("status", { length: 30 }).default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cpi_profile_id").on(table.profileId),
  index("idx_cpi_timeline").on(table.timeline),
]);

export type CustomerProductInterlock = InferSelectModel<typeof customerProductInterlocks>;
export type NewCustomerProductInterlock = InferInsertModel<typeof customerProductInterlocks>;

// ═══════════════════════════════════════════════════════════
// 5. customer_profile_snapshots — 档案快照 (变更历史)
// ═══════════════════════════════════════════════════════════

export const customerProfileSnapshots = pgTable("customer_profile_snapshots", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  snapshotData: json("snapshot_data").$type<Record<string, unknown>>().notNull(),
  changeReason: text("change_reason"),
  changedByUserId: integer("changed_by_user_id"),
  changedByName: varchar("changed_by_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cps_profile_id").on(table.profileId),
  index("idx_cps_created_at").on(table.createdAt),
]);

export type CustomerProfileSnapshot = InferSelectModel<typeof customerProfileSnapshots>;
export type NewCustomerProfileSnapshot = InferInsertModel<typeof customerProfileSnapshots>;

// ═══════════════════════════════════════════════════════════
// 6. customer_reading_channels — 客户授权阅读推荐通道
// ═══════════════════════════════════════════════════════════

export const readingAccessLevelEnum = pgEnum("reading_access_level", [
  "full",
  "view_only",
  "restricted",
  "blocked",
]);

export const customerReadingChannels = pgTable("customer_reading_channels", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  docCategory: varchar("doc_category", { length: 50 }).notNull(),
  docCategoryLabel: varchar("doc_category_label", { length: 100 }),
  accessLevel: readingAccessLevelEnum("access_level").notNull().default("restricted"),
  accessTier: integer("access_tier").notNull().default(1),
  isViewable: boolean("is_viewable").notNull().default(false),
  isDownloadable: boolean("is_downloadable").notNull().default(false),
  recommendedReason: text("recommended_reason"),
  channelNotes: text("channel_notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_crc_profile_id").on(table.profileId),
  index("idx_crc_doc_category").on(table.docCategory),
  index("idx_crc_access_tier").on(table.accessTier),
]);

export type CustomerReadingChannel = InferSelectModel<typeof customerReadingChannels>;
export type NewCustomerReadingChannel = InferInsertModel<typeof customerReadingChannels>;

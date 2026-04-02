/**
 * Targeted Showcase Router — GRT展示中枢 (Showcase Hub V2)
 *
 * Zero-trust architecture:
 * - Internal (RBAC-protected): CRUD templates, content blocks, equipment health, analytics
 * - Guest (public, token-gated): validate token → return showcase data or 403
 *
 * 7 Scenarios:
 * 1. Strategic Asset Monitoring — equipment health snapshots
 * 2. Executive Deep Link (V-VIP) — role-based personalized view
 * 3. Exhibition & Community — mobile-first scan flow, footprint heatmap
 * 4. Future Strategy Showcase — roadmap, patents, ESG, delivery centers
 * 5. Dynamic Knowledge Sync — CMS content blocks with versioning + tagging
 * 6. Customer Support In-Showcase — inline ticket submission
 * 7. Leads Conversion — funnel tracking, lead scoring
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { router, protectedProcedure, publicProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  showcaseTemplates,
  guestAuthorizations,
} from "../../drizzle/showcase-schema";
import {
  showcaseContentBlocks,
  equipmentHealthSnapshots,
  showcaseVisitorEvents,
  showcaseSupportTickets,
  showcaseLoyaltyAccounts,
  showcasePointTransactions,
  showcaseRewardsCatalog,
  showcaseReferrals,
} from "../../drizzle/showcase-hub-schema";
import { eq, desc, and, sql, count, gt, lt, gte, lte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("targeted-showcase");

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Auto-create showcase tables if they don't exist.
 * Runs once on first access, then short-circuits.
 */
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_templates" (
        "id" serial PRIMARY KEY NOT NULL,
        "product_type" varchar(100) NOT NULL,
        "title" varchar(200) NOT NULL,
        "subtitle" text,
        "description" text,
        "equipment_images" jsonb DEFAULT '[]'::jsonb,
        "operation_videos" jsonb DEFAULT '[]'::jsonb,
        "hero_video_url" text,
        "takt_time_seconds" numeric(10,2),
        "cleaning_efficiency" varchar(100),
        "cleanliness_standard" varchar(200),
        "throughput_per_hour" integer,
        "power_consumption_kw" numeric(8,2),
        "price_range_min" numeric(14,2),
        "price_range_max" numeric(14,2),
        "price_currency" varchar(10) DEFAULT 'EUR',
        "roi_months" integer,
        "configurations" jsonb DEFAULT '[]'::jsonb,
        "technical_specs" jsonb DEFAULT '{}'::jsonb,
        "is_active" boolean DEFAULT true,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "guest_authorizations" (
        "id" serial PRIMARY KEY NOT NULL,
        "showcase_id" integer NOT NULL,
        "target_client" varchar(200) NOT NULL,
        "contact_person" varchar(200),
        "contact_email" varchar(200),
        "welcome_message" text,
        "access_token" varchar(64) NOT NULL,
        "expires_at" timestamp NOT NULL,
        "max_views" integer DEFAULT 100,
        "view_count" integer DEFAULT 0 NOT NULL,
        "first_viewed_at" timestamp,
        "last_viewed_at" timestamp,
        "is_revoked" boolean DEFAULT false,
        "revoked_at" timestamp,
        "revoked_reason" text,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "ga_access_token_idx" ON "guest_authorizations" ("access_token")`);

    // ── V2 Showcase Hub: extend existing tables ──
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "scenario_type" varchar(50) DEFAULT 'product'`);
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "target_industry" varchar(100)`);
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "target_year" integer`);
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "content_version" integer DEFAULT 1`);
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "vip_config" jsonb DEFAULT '{}'::jsonb`);
    await db.execute(sql`ALTER TABLE "showcase_templates" ADD COLUMN IF NOT EXISTS "content_tags" jsonb DEFAULT '[]'::jsonb`);
    await db.execute(sql`ALTER TABLE "guest_authorizations" ADD COLUMN IF NOT EXISTS "recipient_role" varchar(50)`);
    await db.execute(sql`ALTER TABLE "guest_authorizations" ADD COLUMN IF NOT EXISTS "access_level" varchar(20) DEFAULT 'standard'`);
    await db.execute(sql`ALTER TABLE "guest_authorizations" ADD COLUMN IF NOT EXISTS "personalized_config" jsonb DEFAULT '{}'::jsonb`);
    await db.execute(sql`ALTER TABLE "guest_authorizations" ADD COLUMN IF NOT EXISTS "last_device_type" varchar(30)`);

    // ── V2: 4 new tables ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_content_blocks" (
        "id" serial PRIMARY KEY NOT NULL,
        "block_type" varchar(50) NOT NULL,
        "title" varchar(200) NOT NULL,
        "subtitle" text,
        "content" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "version" integer NOT NULL DEFAULT 1,
        "language" varchar(10) DEFAULT 'zh',
        "tags" jsonb DEFAULT '[]'::jsonb,
        "industry_scope" jsonb DEFAULT '[]'::jsonb,
        "is_published" boolean DEFAULT false,
        "published_at" timestamp,
        "expiry_date" timestamp,
        "watermark_level" varchar(20) DEFAULT 'none',
        "template_id" integer,
        "sort_order" integer DEFAULT 0,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "equipment_health_snapshots" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_id" varchar(50),
        "equipment_id" integer,
        "equipment_code" varchar(50) NOT NULL,
        "equipment_name" varchar(200) NOT NULL,
        "project_number" varchar(100),
        "health_score" integer NOT NULL,
        "health_status" varchar(20) DEFAULT 'normal',
        "last_test_date" timestamp,
        "test_results" jsonb DEFAULT '{}'::jsonb,
        "operating_hours" integer,
        "maintenance_prediction" jsonb DEFAULT '{}'::jsonb,
        "snapshot_date" timestamp DEFAULT now() NOT NULL,
        "is_latest" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_visitor_events" (
        "id" serial PRIMARY KEY NOT NULL,
        "token_id" integer,
        "session_id" varchar(64),
        "event_type" varchar(30) NOT NULL,
        "event_target" varchar(200),
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "device_type" varchar(20),
        "referrer" varchar(500),
        "funnel_stage" varchar(30),
        "lead_score" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_support_tickets" (
        "id" serial PRIMARY KEY NOT NULL,
        "ticket_code" varchar(50) NOT NULL,
        "token_id" integer,
        "guest_name" varchar(100),
        "guest_email" varchar(200),
        "guest_phone" varchar(50),
        "company_name" varchar(200),
        "issue_type" varchar(50) NOT NULL,
        "subject" varchar(300) NOT NULL,
        "description" text,
        "attachment_urls" jsonb DEFAULT '[]'::jsonb,
        "ai_suggestion" text,
        "ai_confidence" integer,
        "status" varchar(30) NOT NULL DEFAULT 'open',
        "assigned_to" integer,
        "assigned_to_name" varchar(100),
        "resolution" text,
        "satisfaction_rating" integer,
        "satisfaction_comment" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "resolved_at" timestamp
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "sst_ticket_code_idx" ON "showcase_support_tickets" ("ticket_code")`);

    // ── V2.1: Loyalty & Incentive tables ──
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_loyalty_accounts" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_code" varchar(50) NOT NULL,
        "customer_name" varchar(200) NOT NULL,
        "contact_name" varchar(100),
        "contact_email" varchar(200),
        "contact_phone" varchar(50),
        "company_name" varchar(200),
        "tier" varchar(20) NOT NULL DEFAULT 'bronze',
        "tier_points" integer NOT NULL DEFAULT 0,
        "available_points" integer NOT NULL DEFAULT 0,
        "lifetime_earned" integer NOT NULL DEFAULT 0,
        "lifetime_spent" integer NOT NULL DEFAULT 0,
        "referral_count" integer NOT NULL DEFAULT 0,
        "tech_contribution_count" integer NOT NULL DEFAULT 0,
        "community_post_count" integer NOT NULL DEFAULT 0,
        "last_active_at" timestamp,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "sla_customer_code_idx" ON "showcase_loyalty_accounts" ("customer_code")`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_point_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "account_id" integer NOT NULL,
        "customer_code" varchar(50) NOT NULL,
        "transaction_type" varchar(20) NOT NULL,
        "points" integer NOT NULL,
        "balance_after" integer NOT NULL,
        "source_type" varchar(50) NOT NULL,
        "source_id" varchar(100),
        "description" varchar(300),
        "expires_at" timestamp,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_rewards_catalog" (
        "id" serial PRIMARY KEY NOT NULL,
        "reward_code" varchar(50) NOT NULL,
        "name" varchar(200) NOT NULL,
        "name_en" varchar(200),
        "description" text,
        "category" varchar(50) NOT NULL,
        "image_url" text,
        "points_cost" integer NOT NULL,
        "min_tier" varchar(20) DEFAULT 'bronze',
        "stock_quantity" integer,
        "redeemed_count" integer NOT NULL DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "valid_from" timestamp,
        "valid_until" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "src_reward_code_idx" ON "showcase_rewards_catalog" ("reward_code")`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "showcase_referrals" (
        "id" serial PRIMARY KEY NOT NULL,
        "referrer_account_id" integer NOT NULL,
        "referrer_code" varchar(50) NOT NULL,
        "referred_company" varchar(200) NOT NULL,
        "referred_contact" varchar(100),
        "referred_email" varchar(200),
        "referred_phone" varchar(50),
        "referred_industry" varchar(100),
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "qualified_at" timestamp,
        "converted_at" timestamp,
        "signup_points" integer DEFAULT 0,
        "conversion_points" integer DEFAULT 0,
        "conversion_bonus_awarded" boolean DEFAULT false,
        "notes" text,
        "internal_notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    tablesEnsured = true;
    log.info("Showcase Hub V2.1 tables ensured (8 new + 2 extended)");
  } catch (err) {
    log.warn({ err }, "Failed to ensure showcase tables (may already exist)");
    tablesEnsured = true; // Don't retry on every request
  }
}

// ──── Internal: Template Management ────

const templateRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        productType: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { productType, isActive, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (productType) conditions.push(eq(showcaseTemplates.productType, productType));
      if (isActive != null) conditions.push(eq(showcaseTemplates.isActive, isActive));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(showcaseTemplates).where(whereClause);
      const items = await db
        .select()
        .from(showcaseTemplates)
        .where(whereClause)
        .orderBy(desc(showcaseTemplates.createdAt))
        .limit(limit)
        .offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(showcaseTemplates)
        .where(eq(showcaseTemplates.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return row;
    }),

  create: protectedProcedure
    .input(
      z.object({
        productType: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        equipmentImages: z.array(z.object({ url: z.string(), caption: z.string().optional(), sortOrder: z.number().optional() })).optional(),
        operationVideos: z.array(z.object({ url: z.string(), caption: z.string().optional(), sortOrder: z.number().optional() })).optional(),
        heroVideoUrl: z.string().optional(),
        taktTimeSeconds: z.number().optional(),
        cleaningEfficiency: z.string().optional(),
        cleanlinessStandard: z.string().optional(),
        throughputPerHour: z.number().optional(),
        powerConsumptionKw: z.number().optional(),
        priceRangeMin: z.number().optional(),
        priceRangeMax: z.number().optional(),
        priceCurrency: z.string().max(10).default("EUR"),
        roiMonths: z.number().optional(),
        configurations: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          price: z.number().optional(),
          features: z.array(z.string()).optional(),
        })).optional(),
        technicalSpecs: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const [result] = await db
        .insert(showcaseTemplates)
        .values({
          ...input,
          equipmentImages: input.equipmentImages ?? [],
          operationVideos: input.operationVideos ?? [],
          configurations: input.configurations ?? [],
          technicalSpecs: input.technicalSpecs ?? {},
          taktTimeSeconds: input.taktTimeSeconds?.toString(),
          powerConsumptionKw: input.powerConsumptionKw?.toString(),
          priceRangeMin: input.priceRangeMin?.toString(),
          priceRangeMax: input.priceRangeMax?.toString(),
          createdBy: ctx.user!.id,
        })
        .returning();
      log.info({ id: result.id, productType: input.productType }, "Showcase template created");
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        equipmentImages: z.array(z.object({ url: z.string(), caption: z.string().optional(), sortOrder: z.number().optional() })).optional(),
        operationVideos: z.array(z.object({ url: z.string(), caption: z.string().optional(), sortOrder: z.number().optional() })).optional(),
        heroVideoUrl: z.string().optional(),
        taktTimeSeconds: z.number().optional(),
        cleaningEfficiency: z.string().optional(),
        cleanlinessStandard: z.string().optional(),
        throughputPerHour: z.number().optional(),
        powerConsumptionKw: z.number().optional(),
        priceRangeMin: z.number().optional(),
        priceRangeMax: z.number().optional(),
        priceCurrency: z.string().max(10).optional(),
        roiMonths: z.number().optional(),
        configurations: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          price: z.number().optional(),
          features: z.array(z.string()).optional(),
        })).optional(),
        technicalSpecs: z.record(z.string(), z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const values: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
      if (updates.taktTimeSeconds != null) values.taktTimeSeconds = updates.taktTimeSeconds.toString();
      if (updates.powerConsumptionKw != null) values.powerConsumptionKw = updates.powerConsumptionKw.toString();
      if (updates.priceRangeMin != null) values.priceRangeMin = updates.priceRangeMin.toString();
      if (updates.priceRangeMax != null) values.priceRangeMax = updates.priceRangeMax.toString();

      const [result] = await db
        .update(showcaseTemplates)
        .set(values)
        .where(eq(showcaseTemplates.id, id))
        .returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(showcaseTemplates)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(showcaseTemplates.id, input.id))
        .returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return { success: true };
    }),
});

// ──── Internal: Guest Link Management ────

const guestLinkRouter = router({
  generateGuestLink: protectedProcedure
    .input(
      z.object({
        showcaseId: z.number(),
        targetClient: z.string().min(1).max(200),
        contactPerson: z.string().max(200).optional(),
        contactEmail: z.string().max(200).optional(),
        welcomeMessage: z.string().optional(),
        expiresInHours: z.number().min(1).max(720).default(48),
        maxViews: z.number().min(1).max(10000).default(100),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      // Verify template exists
      const [template] = await db
        .select({ id: showcaseTemplates.id, title: showcaseTemplates.title })
        .from(showcaseTemplates)
        .where(and(eq(showcaseTemplates.id, input.showcaseId), eq(showcaseTemplates.isActive, true)))
        .limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found or inactive" });

      const accessToken = generateToken();
      const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString();

      const [auth] = await db
        .insert(guestAuthorizations)
        .values({
          showcaseId: input.showcaseId,
          targetClient: input.targetClient,
          contactPerson: input.contactPerson,
          contactEmail: input.contactEmail,
          welcomeMessage: input.welcomeMessage ?? `GRT Advanced Solution for ${input.targetClient}`,
          accessToken,
          expiresAt,
          maxViews: input.maxViews,
          createdBy: ctx.user!.id,
        })
        .returning();

      log.info(
        { authId: auth.id, client: input.targetClient, showcaseId: input.showcaseId, expiresAt },
        "Guest link generated",
      );

      return {
        id: auth.id,
        accessToken,
        expiresAt,
        guestUrl: `/guest/showcase/${accessToken}`,
        targetClient: input.targetClient,
      };
    }),

  listAuthorizations: protectedProcedure
    .input(
      z.object({
        showcaseId: z.number().optional(),
        targetClient: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { showcaseId, targetClient, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (showcaseId != null) conditions.push(eq(guestAuthorizations.showcaseId, showcaseId));
      if (targetClient) conditions.push(eq(guestAuthorizations.targetClient, targetClient));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(guestAuthorizations).where(whereClause);
      const items = await db
        .select()
        .from(guestAuthorizations)
        .where(whereClause)
        .orderBy(desc(guestAuthorizations.createdAt))
        .limit(limit)
        .offset(offset);

      // Strip accessToken from list results for security
      const sanitized = items.map(({ accessToken: _tok, ...rest }) => ({
        ...rest,
        tokenPreview: _tok.slice(0, 8) + "…",
      }));
      return { items: sanitized, total: totalResult?.count ?? 0 };
    }),

  revokeLink: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(guestAuthorizations)
        .set({
          isRevoked: true,
          revokedAt: new Date().toISOString(),
          revokedReason: input.reason ?? "Manually revoked",
        })
        .where(eq(guestAuthorizations.id, input.id))
        .returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Authorization not found" });
      log.info({ authId: input.id }, "Guest link revoked");
      return { success: true };
    }),

  getAnalytics: protectedProcedure
    .input(z.object({ showcaseId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.showcaseId != null) conditions.push(eq(guestAuthorizations.showcaseId, input.showcaseId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalLinks] = await db.select({ count: count() }).from(guestAuthorizations).where(whereClause);
      const [activeLinks] = await db
        .select({ count: count() })
        .from(guestAuthorizations)
        .where(and(
          ...(conditions.length ? conditions : [sql`1=1`]),
          eq(guestAuthorizations.isRevoked, false),
          gt(guestAuthorizations.expiresAt, new Date().toISOString()),
        ));
      const [totalViews] = await db
        .select({ sum: sql<number>`COALESCE(SUM(${guestAuthorizations.viewCount}), 0)` })
        .from(guestAuthorizations)
        .where(whereClause);

      return {
        totalLinks: totalLinks?.count ?? 0,
        activeLinks: activeLinks?.count ?? 0,
        totalViews: totalViews?.sum ?? 0,
      };
    }),
});

// ──── Public: Guest Access (Token-Gated) ────

const guestRouter = router({
  /**
   * Public gateway: validate token → return showcase data or FORBIDDEN.
   * Increments viewCount on each valid access.
   * NEVER exposes internal data beyond the specific template.
   */
  getShowcaseByToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // 1. Look up authorization
      const [auth] = await db
        .select()
        .from(guestAuthorizations)
        .where(eq(guestAuthorizations.accessToken, input.token))
        .limit(1);

      if (!auth) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid or expired access link" });
      }

      // 2. Check revoked
      if (auth.isRevoked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This access link has been revoked" });
      }

      // 3. Check expiry
      if (new Date(auth.expiresAt) < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This access link has expired",
        });
      }

      // 4. Check max views
      if (auth.maxViews && auth.viewCount >= auth.maxViews) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Maximum view count reached" });
      }

      // 5. Load template
      const [template] = await db
        .select()
        .from(showcaseTemplates)
        .where(eq(showcaseTemplates.id, auth.showcaseId))
        .limit(1);

      if (!template || !template.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Showcase content is no longer available" });
      }

      // 6. Increment viewCount + track timestamps
      const now = new Date().toISOString();
      await db
        .update(guestAuthorizations)
        .set({
          viewCount: auth.viewCount + 1,
          firstViewedAt: auth.firstViewedAt ?? now,
          lastViewedAt: now,
        })
        .where(eq(guestAuthorizations.id, auth.id));

      log.info({ authId: auth.id, client: auth.targetClient, views: auth.viewCount + 1 }, "Guest showcase viewed");

      // 7. Load content blocks for this template (V2)
      const blocks = await db
        .select()
        .from(showcaseContentBlocks)
        .where(and(
          eq(showcaseContentBlocks.templateId, template.id),
          eq(showcaseContentBlocks.isPublished, true),
        ))
        .orderBy(showcaseContentBlocks.sortOrder)
        .limit(50);

      // 8. Return ONLY showcase-safe data (no internal IDs, no createdBy)
      return {
        // Auth context
        targetClient: auth.targetClient,
        welcomeMessage: auth.welcomeMessage,
        expiresAt: auth.expiresAt,
        viewCount: auth.viewCount + 1,

        // V-VIP personalization (V2)
        recipientRole: auth.recipientRole,
        accessLevel: auth.accessLevel,
        personalizedConfig: auth.personalizedConfig,

        // Template content
        productType: template.productType,
        title: template.title,
        subtitle: template.subtitle,
        description: template.description,
        equipmentImages: template.equipmentImages,
        operationVideos: template.operationVideos,
        heroVideoUrl: template.heroVideoUrl,
        taktTimeSeconds: template.taktTimeSeconds,
        cleaningEfficiency: template.cleaningEfficiency,
        cleanlinessStandard: template.cleanlinessStandard,
        throughputPerHour: template.throughputPerHour,
        powerConsumptionKw: template.powerConsumptionKw,
        priceRangeMin: template.priceRangeMin,
        priceRangeMax: template.priceRangeMax,
        priceCurrency: template.priceCurrency,
        roiMonths: template.roiMonths,
        configurations: template.configurations,
        technicalSpecs: template.technicalSpecs,

        // CMS content blocks (V2)
        contentBlocks: blocks.map(b => ({
          id: b.id,
          blockType: b.blockType,
          title: b.title,
          subtitle: b.subtitle,
          content: b.content,
          tags: b.tags,
          watermarkLevel: b.watermarkLevel,
          sortOrder: b.sortOrder,
        })),

        // Template V2 metadata
        scenarioType: template.scenarioType,
        vipConfig: template.vipConfig,
        contentTags: template.contentTags,
      };
    }),
});

// ──── V2: Content Block CMS ────

function generateTicketCode(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `GRT-T-${dateStr}-${rand}`;
}

const contentBlockRouter = router({
  list: protectedProcedure
    .input(z.object({
      blockType: z.string().optional(),
      templateId: z.number().optional(),
      language: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { blockType, templateId, language, isPublished, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (blockType) conditions.push(eq(showcaseContentBlocks.blockType, blockType));
      if (templateId != null) conditions.push(eq(showcaseContentBlocks.templateId, templateId));
      if (language) conditions.push(eq(showcaseContentBlocks.language, language));
      if (isPublished != null) conditions.push(eq(showcaseContentBlocks.isPublished, isPublished));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(showcaseContentBlocks).where(whereClause);
      const items = await db.select().from(showcaseContentBlocks).where(whereClause)
        .orderBy(showcaseContentBlocks.sortOrder).limit(limit).offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(showcaseContentBlocks).where(eq(showcaseContentBlocks.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Content block not found" });
      return row;
    }),

  create: protectedProcedure
    .input(z.object({
      blockType: z.string().min(1).max(50),
      title: z.string().min(1).max(200),
      subtitle: z.string().optional(),
      content: z.record(z.string(), z.any()).default({}),
      language: z.string().max(10).default("zh"),
      tags: z.array(z.string()).default([]),
      industryScope: z.array(z.string()).default([]),
      watermarkLevel: z.string().max(20).default("none"),
      templateId: z.number().optional(),
      sortOrder: z.number().default(0),
      expiryDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const [result] = await db.insert(showcaseContentBlocks).values({
        ...input,
        createdBy: ctx.user!.id,
      }).returning();
      log.info({ id: result.id, blockType: input.blockType }, "Content block created");
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      subtitle: z.string().optional(),
      content: z.record(z.string(), z.any()).optional(),
      tags: z.array(z.string()).optional(),
      industryScope: z.array(z.string()).optional(),
      watermarkLevel: z.string().max(20).optional(),
      sortOrder: z.number().optional(),
      expiryDate: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [existing] = await db.select({ version: showcaseContentBlocks.version }).from(showcaseContentBlocks).where(eq(showcaseContentBlocks.id, id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const [result] = await db.update(showcaseContentBlocks).set({
        ...updates,
        version: (existing.version ?? 1) + 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseContentBlocks.id, id)).returning();
      return result;
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.update(showcaseContentBlocks).set({
        isPublished: true,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseContentBlocks.id, input.id)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  unpublish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.update(showcaseContentBlocks).set({
        isPublished: false,
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseContentBlocks.id, input.id)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [src] = await db.select().from(showcaseContentBlocks).where(eq(showcaseContentBlocks.id, input.id)).limit(1);
      if (!src) throw new TRPCError({ code: "NOT_FOUND" });
      const { id: _id, createdAt: _ca, updatedAt: _ua, publishedAt: _pa, ...rest } = src;
      const [result] = await db.insert(showcaseContentBlocks).values({
        ...rest,
        title: `${src.title} (Copy)`,
        isPublished: false,
        version: 1,
        createdBy: ctx.user!.id,
      }).returning();
      return result;
    }),

  listExpiring: protectedProcedure
    .input(z.object({ withinDays: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const days = input?.withinDays ?? 30;
      const cutoff = new Date(Date.now() + days * 86400000).toISOString();
      const items = await db.select().from(showcaseContentBlocks)
        .where(and(
          eq(showcaseContentBlocks.isPublished, true),
          lte(showcaseContentBlocks.expiryDate, cutoff),
        ))
        .orderBy(showcaseContentBlocks.expiryDate).limit(100);
      return items;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(showcaseContentBlocks).where(eq(showcaseContentBlocks.id, input.id));
      return { success: true };
    }),
});

// ──── V2: Equipment Health ────

const equipmentHealthRouter = router({
  createSnapshot: protectedProcedure
    .input(z.object({
      customerId: z.string().max(50).optional(),
      equipmentId: z.number().optional(),
      equipmentCode: z.string().min(1).max(50),
      equipmentName: z.string().min(1).max(200),
      projectNumber: z.string().max(100).optional(),
      healthScore: z.number().min(0).max(100),
      healthStatus: z.string().max(20).default("normal"),
      lastTestDate: z.string().optional(),
      testResults: z.record(z.string(), z.any()).default({}),
      operatingHours: z.number().optional(),
      maintenancePrediction: z.record(z.string(), z.any()).default({}),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Mark previous as not latest
      if (input.equipmentCode) {
        await db.update(equipmentHealthSnapshots).set({ isLatest: false })
          .where(and(
            eq(equipmentHealthSnapshots.equipmentCode, input.equipmentCode),
            eq(equipmentHealthSnapshots.isLatest, true),
          ));
      }
      const [result] = await db.insert(equipmentHealthSnapshots).values(input).returning();
      log.info({ id: result.id, equipment: input.equipmentCode, score: input.healthScore }, "Health snapshot created");
      return result;
    }),

  listByCustomer: protectedProcedure
    .input(z.object({
      customerId: z.string(),
      latestOnly: z.boolean().default(true),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions: SQL[] = [eq(equipmentHealthSnapshots.customerId, input.customerId)];
      if (input.latestOnly) conditions.push(eq(equipmentHealthSnapshots.isLatest, true));
      const items = await db.select().from(equipmentHealthSnapshots)
        .where(and(...conditions))
        .orderBy(desc(equipmentHealthSnapshots.snapshotDate))
        .limit(input.limit);
      return items;
    }),

  getLatest: protectedProcedure
    .input(z.object({ equipmentCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(equipmentHealthSnapshots)
        .where(and(eq(equipmentHealthSnapshots.equipmentCode, input.equipmentCode), eq(equipmentHealthSnapshots.isLatest, true)))
        .limit(1);
      return row ?? null;
    }),

  healthDashboard: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const snapshots = await db.select().from(equipmentHealthSnapshots)
        .where(eq(equipmentHealthSnapshots.isLatest, true))
        .orderBy(equipmentHealthSnapshots.healthScore).limit(200);
      const total = snapshots.length;
      const excellent = snapshots.filter(s => s.healthScore >= 90).length;
      const warning = snapshots.filter(s => s.healthScore < 70 && s.healthScore >= 50).length;
      const critical = snapshots.filter(s => s.healthScore < 50).length;
      const avgScore = total > 0 ? Math.round(snapshots.reduce((sum, s) => sum + s.healthScore, 0) / total) : 0;
      return { total, excellent, warning, critical, avgScore, snapshots };
    }),

  // Public: token-gated equipment health for guest
  getGuestEquipmentHealth: publicProcedure
    .input(z.object({ token: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [auth] = await db.select().from(guestAuthorizations)
        .where(eq(guestAuthorizations.accessToken, input.token)).limit(1);
      if (!auth || auth.isRevoked || new Date(auth.expiresAt) < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid or expired access" });
      }
      // Get customer from targetClient
      const snapshots = await db.select().from(equipmentHealthSnapshots)
        .where(and(
          eq(equipmentHealthSnapshots.customerId, auth.targetClient),
          eq(equipmentHealthSnapshots.isLatest, true),
        ))
        .orderBy(desc(equipmentHealthSnapshots.healthScore)).limit(50);
      return snapshots.map(s => ({
        equipmentCode: s.equipmentCode,
        equipmentName: s.equipmentName,
        healthScore: s.healthScore,
        healthStatus: s.healthStatus,
        lastTestDate: s.lastTestDate,
        testResults: s.testResults,
        operatingHours: s.operatingHours,
        maintenancePrediction: s.maintenancePrediction,
        snapshotDate: s.snapshotDate,
      }));
    }),
});

// ──── V2: Visitor Event Tracking ────

const LEAD_SCORE_WEIGHTS: Record<string, number> = {
  page_view: 1, qr_scan: 2, video_play: 3, content_download: 5,
  ticket_submit: 4, lead_form: 10, expert_book: 8, cta_click: 2,
  exhibit_checkin: 3, brochure_request: 5,
};

const visitorEventRouter = router({
  track: publicProcedure
    .input(z.object({
      token: z.string().max(64).optional(),
      sessionId: z.string().max(64).optional(),
      eventType: z.string().min(1).max(30),
      eventTarget: z.string().max(200).optional(),
      metadata: z.record(z.string(), z.any()).default({}),
      deviceType: z.string().max(20).optional(),
      referrer: z.string().max(500).optional(),
      funnelStage: z.string().max(30).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      let tokenId: number | undefined;
      if (input.token) {
        const [auth] = await db.select({ id: guestAuthorizations.id })
          .from(guestAuthorizations)
          .where(eq(guestAuthorizations.accessToken, input.token)).limit(1);
        tokenId = auth?.id;
      }
      const leadScore = LEAD_SCORE_WEIGHTS[input.eventType] ?? 0;
      await db.insert(showcaseVisitorEvents).values({
        tokenId,
        sessionId: input.sessionId,
        eventType: input.eventType,
        eventTarget: input.eventTarget,
        metadata: input.metadata,
        deviceType: input.deviceType,
        referrer: input.referrer,
        funnelStage: input.funnelStage,
        leadScore,
      });
      return { tracked: true };
    }),

  getHeatmap: protectedProcedure
    .input(z.object({
      templateId: z.number().optional(),
      days: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const cutoff = new Date(Date.now() - (input?.days ?? 30) * 86400000).toISOString();
      const events = await db.select({
        eventTarget: showcaseVisitorEvents.eventTarget,
        eventType: showcaseVisitorEvents.eventType,
        deviceType: showcaseVisitorEvents.deviceType,
        count: count(),
      }).from(showcaseVisitorEvents)
        .where(gte(showcaseVisitorEvents.createdAt, cutoff))
        .groupBy(showcaseVisitorEvents.eventTarget, showcaseVisitorEvents.eventType, showcaseVisitorEvents.deviceType)
        .limit(500);
      return events;
    }),

  getFunnel: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const cutoff = new Date(Date.now() - (input?.days ?? 30) * 86400000).toISOString();
      const stages = await db.select({
        funnelStage: showcaseVisitorEvents.funnelStage,
        count: count(),
      }).from(showcaseVisitorEvents)
        .where(and(
          gte(showcaseVisitorEvents.createdAt, cutoff),
          sql`${showcaseVisitorEvents.funnelStage} IS NOT NULL`,
        ))
        .groupBy(showcaseVisitorEvents.funnelStage)
        .limit(10);
      return stages;
    }),

  getDeviceBreakdown: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const cutoff = new Date(Date.now() - (input?.days ?? 30) * 86400000).toISOString();
      const breakdown = await db.select({
        deviceType: showcaseVisitorEvents.deviceType,
        count: count(),
      }).from(showcaseVisitorEvents)
        .where(gte(showcaseVisitorEvents.createdAt, cutoff))
        .groupBy(showcaseVisitorEvents.deviceType)
        .limit(10);
      return breakdown;
    }),

  getTopLeads: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const leads = await db.select({
        tokenId: showcaseVisitorEvents.tokenId,
        totalScore: sql<number>`COALESCE(SUM(${showcaseVisitorEvents.leadScore}), 0)`,
        eventCount: count(),
      }).from(showcaseVisitorEvents)
        .where(sql`${showcaseVisitorEvents.tokenId} IS NOT NULL`)
        .groupBy(showcaseVisitorEvents.tokenId)
        .orderBy(sql`COALESCE(SUM(${showcaseVisitorEvents.leadScore}), 0) DESC`)
        .limit(input?.limit ?? 20);
      return leads;
    }),
});

// ──── V2: Support Tickets ────

const supportTicketRouter = router({
  submit: publicProcedure
    .input(z.object({
      token: z.string().max(64).optional(),
      guestName: z.string().max(100).optional(),
      guestEmail: z.string().max(200).optional(),
      guestPhone: z.string().max(50).optional(),
      companyName: z.string().max(200).optional(),
      issueType: z.string().min(1).max(50),
      subject: z.string().min(1).max(300),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      let tokenId: number | undefined;
      if (input.token) {
        const [auth] = await db.select({ id: guestAuthorizations.id })
          .from(guestAuthorizations)
          .where(eq(guestAuthorizations.accessToken, input.token)).limit(1);
        tokenId = auth?.id;
      }
      const ticketCode = generateTicketCode();
      const [result] = await db.insert(showcaseSupportTickets).values({
        ticketCode,
        tokenId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        companyName: input.companyName,
        issueType: input.issueType,
        subject: input.subject,
        description: input.description,
      }).returning();
      log.info({ ticketCode, issueType: input.issueType }, "Showcase support ticket submitted");
      return { ticketCode: result.ticketCode, id: result.id };
    }),

  getByCode: publicProcedure
    .input(z.object({ ticketCode: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select({
        ticketCode: showcaseSupportTickets.ticketCode,
        issueType: showcaseSupportTickets.issueType,
        subject: showcaseSupportTickets.subject,
        status: showcaseSupportTickets.status,
        aiSuggestion: showcaseSupportTickets.aiSuggestion,
        resolution: showcaseSupportTickets.resolution,
        createdAt: showcaseSupportTickets.createdAt,
        resolvedAt: showcaseSupportTickets.resolvedAt,
      }).from(showcaseSupportTickets)
        .where(eq(showcaseSupportTickets.ticketCode, input.ticketCode)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      return row;
    }),

  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      issueType: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { status, issueType, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (status) conditions.push(eq(showcaseSupportTickets.status, status));
      if (issueType) conditions.push(eq(showcaseSupportTickets.issueType, issueType));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(showcaseSupportTickets).where(whereClause);
      const items = await db.select().from(showcaseSupportTickets).where(whereClause)
        .orderBy(desc(showcaseSupportTickets.createdAt)).limit(limit).offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  assign: protectedProcedure
    .input(z.object({
      id: z.number(),
      assignedTo: z.number(),
      assignedToName: z.string().max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.update(showcaseSupportTickets).set({
        assignedTo: input.assignedTo,
        assignedToName: input.assignedToName,
        status: "assigned",
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseSupportTickets.id, input.id)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().min(1).max(30),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const values: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date().toISOString(),
      };
      if (input.resolution) values.resolution = input.resolution;
      if (input.status === "resolved" || input.status === "closed") {
        values.resolvedAt = new Date().toISOString();
      }
      const [result] = await db.update(showcaseSupportTickets).set(values)
        .where(eq(showcaseSupportTickets.id, input.id)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return result;
    }),

  rateSatisfaction: publicProcedure
    .input(z.object({
      ticketCode: z.string().min(1).max(50),
      rating: z.number().min(1).max(5),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db.update(showcaseSupportTickets).set({
        satisfactionRating: input.rating,
        satisfactionComment: input.comment,
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseSupportTickets.ticketCode, input.ticketCode)).returning();
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  getStats: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const [total] = await db.select({ count: count() }).from(showcaseSupportTickets);
      const [open] = await db.select({ count: count() }).from(showcaseSupportTickets).where(eq(showcaseSupportTickets.status, "open"));
      const [resolved] = await db.select({ count: count() }).from(showcaseSupportTickets).where(eq(showcaseSupportTickets.status, "resolved"));
      const [avgRating] = await db.select({
        avg: sql<number>`COALESCE(AVG(${showcaseSupportTickets.satisfactionRating}), 0)`,
      }).from(showcaseSupportTickets).where(sql`${showcaseSupportTickets.satisfactionRating} IS NOT NULL`);
      return {
        total: total?.count ?? 0,
        open: open?.count ?? 0,
        resolved: resolved?.count ?? 0,
        avgSatisfaction: Math.round((avgRating?.avg ?? 0) * 10) / 10,
      };
    }),
});

// ──── V2.1: Loyalty & Incentive System (客户积分激励) ────

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 15000,
} as const;

function computeTier(tierPoints: number): string {
  if (tierPoints >= TIER_THRESHOLDS.diamond) return "diamond";
  if (tierPoints >= TIER_THRESHOLDS.platinum) return "platinum";
  if (tierPoints >= TIER_THRESHOLDS.gold) return "gold";
  if (tierPoints >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

const POINT_RULES: Record<string, { points: number; description: string }> = {
  showcase_visit: { points: 5, description: "访问展厅" },
  content_download: { points: 20, description: "下载技术资料" },
  video_watch: { points: 10, description: "观看演示视频" },
  referral_signup: { points: 100, description: "推荐新客户注册" },
  referral_conversion: { points: 500, description: "推荐客户成功转化" },
  tech_feedback: { points: 50, description: "提交技术反馈/建议" },
  community_post: { points: 15, description: "社群发帖" },
  community_answer: { points: 30, description: "解答技术问题" },
  ticket_resolved: { points: 25, description: "协助问题解决" },
  event_checkin: { points: 30, description: "展会签到" },
  survey_complete: { points: 40, description: "完成满意度调查" },
  expert_booking: { points: 20, description: "预约专家咨询" },
};

const loyaltyRouter = router({
  // ── Account management ──
  getAccount: publicProcedure
    .input(z.object({ customerCode: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [account] = await db.select().from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.customerCode, input.customerCode)).limit(1);
      return account ?? null;
    }),

  createAccount: protectedProcedure
    .input(z.object({
      customerCode: z.string().min(1).max(50),
      customerName: z.string().min(1).max(200),
      contactName: z.string().max(100).optional(),
      contactEmail: z.string().max(200).optional(),
      contactPhone: z.string().max(50).optional(),
      companyName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [existing] = await db.select({ id: showcaseLoyaltyAccounts.id }).from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.customerCode, input.customerCode)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Account already exists" });
      const [result] = await db.insert(showcaseLoyaltyAccounts).values(input).returning();
      log.info({ id: result.id, code: input.customerCode }, "Loyalty account created");
      return result;
    }),

  listAccounts: protectedProcedure
    .input(z.object({
      tier: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { tier, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [eq(showcaseLoyaltyAccounts.isActive, true)];
      if (tier) conditions.push(eq(showcaseLoyaltyAccounts.tier, tier));
      const [totalResult] = await db.select({ count: count() }).from(showcaseLoyaltyAccounts).where(and(...conditions));
      const items = await db.select().from(showcaseLoyaltyAccounts).where(and(...conditions))
        .orderBy(desc(showcaseLoyaltyAccounts.tierPoints)).limit(limit).offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  // ── Points operations ──
  earnPoints: protectedProcedure
    .input(z.object({
      customerCode: z.string().min(1).max(50),
      sourceType: z.string().min(1).max(50),
      sourceId: z.string().max(100).optional(),
      customPoints: z.number().optional(), // override default rule points
      description: z.string().max(300).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const [account] = await db.select().from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.customerCode, input.customerCode)).limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Loyalty account not found" });

      const rule = POINT_RULES[input.sourceType];
      const points = input.customPoints ?? rule?.points ?? 10;
      const desc_text = input.description ?? rule?.description ?? input.sourceType;
      const newAvailable = account.availablePoints + points;
      const newLifetimeEarned = account.lifetimeEarned + points;
      const newTierPoints = account.tierPoints + points;
      const newTier = computeTier(newTierPoints);

      // Update account
      await db.update(showcaseLoyaltyAccounts).set({
        availablePoints: newAvailable,
        lifetimeEarned: newLifetimeEarned,
        tierPoints: newTierPoints,
        tier: newTier,
        lastActiveAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(input.sourceType === "community_post" || input.sourceType === "community_answer"
          ? { communityPostCount: account.communityPostCount + 1 } : {}),
        ...(input.sourceType === "tech_feedback"
          ? { techContributionCount: account.techContributionCount + 1 } : {}),
        ...(input.sourceType.startsWith("referral")
          ? { referralCount: account.referralCount + 1 } : {}),
      }).where(eq(showcaseLoyaltyAccounts.id, account.id));

      // Record transaction
      const [tx] = await db.insert(showcasePointTransactions).values({
        accountId: account.id,
        customerCode: input.customerCode,
        transactionType: "earn",
        points,
        balanceAfter: newAvailable,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        description: desc_text,
        createdBy: ctx.user!.id,
      }).returning();

      log.info({ accountId: account.id, points, sourceType: input.sourceType, tier: newTier }, "Points earned");
      return { points, balanceAfter: newAvailable, tier: newTier, transactionId: tx.id };
    }),

  getTransactions: publicProcedure
    .input(z.object({
      customerCode: z.string().min(1).max(50),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(showcasePointTransactions)
        .where(eq(showcasePointTransactions.customerCode, input.customerCode))
        .orderBy(desc(showcasePointTransactions.createdAt))
        .limit(input.limit).offset(input.offset);
      const [totalResult] = await db.select({ count: count() }).from(showcasePointTransactions)
        .where(eq(showcasePointTransactions.customerCode, input.customerCode));
      return { items, total: totalResult?.count ?? 0 };
    }),

  // ── Rewards catalog ──
  listRewards: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      tier: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions: SQL[] = [eq(showcaseRewardsCatalog.isActive, true)];
      if (input?.category) conditions.push(eq(showcaseRewardsCatalog.category, input.category));
      const items = await db.select().from(showcaseRewardsCatalog).where(and(...conditions))
        .orderBy(showcaseRewardsCatalog.pointsCost).limit(100);
      if (input?.tier) {
        const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond"];
        const tierIdx = tierOrder.indexOf(input.tier);
        return items.filter(r => tierOrder.indexOf(r.minTier ?? "bronze") <= tierIdx);
      }
      return items;
    }),

  createReward: protectedProcedure
    .input(z.object({
      rewardCode: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      nameEn: z.string().max(200).optional(),
      description: z.string().optional(),
      category: z.string().min(1).max(50),
      imageUrl: z.string().optional(),
      pointsCost: z.number().min(1),
      minTier: z.string().max(20).default("bronze"),
      stockQuantity: z.number().optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [result] = await db.insert(showcaseRewardsCatalog).values(input).returning();
      log.info({ id: result.id, code: input.rewardCode }, "Reward created");
      return result;
    }),

  redeemReward: protectedProcedure
    .input(z.object({
      customerCode: z.string().min(1).max(50),
      rewardId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const [account] = await db.select().from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.customerCode, input.customerCode)).limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });

      const [reward] = await db.select().from(showcaseRewardsCatalog)
        .where(and(eq(showcaseRewardsCatalog.id, input.rewardId), eq(showcaseRewardsCatalog.isActive, true))).limit(1);
      if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found" });

      // Check tier
      const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond"];
      if (tierOrder.indexOf(account.tier) < tierOrder.indexOf(reward.minTier ?? "bronze")) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Requires ${reward.minTier} tier or above` });
      }
      // Check balance
      if (account.availablePoints < reward.pointsCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient points (need ${reward.pointsCost}, have ${account.availablePoints})` });
      }
      // Check stock
      if (reward.stockQuantity != null && reward.redeemedCount >= reward.stockQuantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reward out of stock" });
      }

      const newBalance = account.availablePoints - reward.pointsCost;

      await db.update(showcaseLoyaltyAccounts).set({
        availablePoints: newBalance,
        lifetimeSpent: account.lifetimeSpent + reward.pointsCost,
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseLoyaltyAccounts.id, account.id));

      await db.update(showcaseRewardsCatalog).set({
        redeemedCount: reward.redeemedCount + 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseRewardsCatalog.id, reward.id));

      const [tx] = await db.insert(showcasePointTransactions).values({
        accountId: account.id,
        customerCode: input.customerCode,
        transactionType: "spend",
        points: -reward.pointsCost,
        balanceAfter: newBalance,
        sourceType: "reward_redeem",
        sourceId: String(reward.id),
        description: `兑换: ${reward.name}`,
        createdBy: ctx.user!.id,
      }).returning();

      log.info({ accountId: account.id, rewardId: reward.id, cost: reward.pointsCost }, "Reward redeemed");
      return { success: true, balanceAfter: newBalance, transactionId: tx.id, rewardName: reward.name };
    }),

  // ── Referrals ──
  submitReferral: publicProcedure
    .input(z.object({
      referrerCode: z.string().min(1).max(50),
      referredCompany: z.string().min(1).max(200),
      referredContact: z.string().max(100).optional(),
      referredEmail: z.string().max(200).optional(),
      referredPhone: z.string().max(50).optional(),
      referredIndustry: z.string().max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [account] = await db.select().from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.customerCode, input.referrerCode)).limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Referrer account not found" });

      const [referral] = await db.insert(showcaseReferrals).values({
        referrerAccountId: account.id,
        referrerCode: input.referrerCode,
        referredCompany: input.referredCompany,
        referredContact: input.referredContact,
        referredEmail: input.referredEmail,
        referredPhone: input.referredPhone,
        referredIndustry: input.referredIndustry,
        notes: input.notes,
        signupPoints: POINT_RULES.referral_signup.points,
      }).returning();

      // Auto-award signup points
      const newBalance = account.availablePoints + POINT_RULES.referral_signup.points;
      const newTierPoints = account.tierPoints + POINT_RULES.referral_signup.points;
      await db.update(showcaseLoyaltyAccounts).set({
        availablePoints: newBalance,
        lifetimeEarned: account.lifetimeEarned + POINT_RULES.referral_signup.points,
        tierPoints: newTierPoints,
        tier: computeTier(newTierPoints),
        referralCount: account.referralCount + 1,
        lastActiveAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(showcaseLoyaltyAccounts.id, account.id));

      await db.insert(showcasePointTransactions).values({
        accountId: account.id,
        customerCode: input.referrerCode,
        transactionType: "earn",
        points: POINT_RULES.referral_signup.points,
        balanceAfter: newBalance,
        sourceType: "referral_signup",
        sourceId: String(referral.id),
        description: `推荐客户: ${input.referredCompany}`,
      });

      log.info({ referralId: referral.id, referrer: input.referrerCode, company: input.referredCompany }, "Referral submitted");
      return { referralId: referral.id, pointsAwarded: POINT_RULES.referral_signup.points };
    }),

  listReferrals: publicProcedure
    .input(z.object({
      referrerCode: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { referrerCode, status, limit = 50, offset = 0 } = input ?? {};
      const conditions: SQL[] = [];
      if (referrerCode) conditions.push(eq(showcaseReferrals.referrerCode, referrerCode));
      if (status) conditions.push(eq(showcaseReferrals.status, status));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(showcaseReferrals).where(whereClause);
      const items = await db.select().from(showcaseReferrals).where(whereClause)
        .orderBy(desc(showcaseReferrals.createdAt)).limit(limit).offset(offset);
      return { items, total: totalResult?.count ?? 0 };
    }),

  updateReferralStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().min(1).max(30),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [referral] = await db.select().from(showcaseReferrals)
        .where(eq(showcaseReferrals.id, input.id)).limit(1);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND" });

      const values: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date().toISOString(),
      };
      if (input.internalNotes) values.internalNotes = input.internalNotes;
      if (input.status === "qualified") values.qualifiedAt = new Date().toISOString();

      // Award conversion bonus when status → converted
      if (input.status === "converted" && !referral.conversionBonusAwarded) {
        values.convertedAt = new Date().toISOString();
        values.conversionBonusAwarded = true;
        values.conversionPoints = POINT_RULES.referral_conversion.points;

        const [account] = await db.select().from(showcaseLoyaltyAccounts)
          .where(eq(showcaseLoyaltyAccounts.id, referral.referrerAccountId)).limit(1);
        if (account) {
          const newBalance = account.availablePoints + POINT_RULES.referral_conversion.points;
          const newTierPoints = account.tierPoints + POINT_RULES.referral_conversion.points;
          await db.update(showcaseLoyaltyAccounts).set({
            availablePoints: newBalance,
            lifetimeEarned: account.lifetimeEarned + POINT_RULES.referral_conversion.points,
            tierPoints: newTierPoints,
            tier: computeTier(newTierPoints),
            updatedAt: new Date().toISOString(),
          }).where(eq(showcaseLoyaltyAccounts.id, account.id));

          await db.insert(showcasePointTransactions).values({
            accountId: account.id,
            customerCode: referral.referrerCode,
            transactionType: "earn",
            points: POINT_RULES.referral_conversion.points,
            balanceAfter: newBalance,
            sourceType: "referral_conversion",
            sourceId: String(referral.id),
            description: `推荐客户转化: ${referral.referredCompany}`,
            createdBy: ctx.user!.id,
          });
          log.info({ accountId: account.id, referralId: referral.id, bonus: POINT_RULES.referral_conversion.points }, "Referral conversion bonus awarded");
        }
      }

      const [result] = await db.update(showcaseReferrals).set(values)
        .where(eq(showcaseReferrals.id, input.id)).returning();
      return result;
    }),

  // ── Dashboard ──
  getDashboard: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const [totalAccounts] = await db.select({ count: count() }).from(showcaseLoyaltyAccounts).where(eq(showcaseLoyaltyAccounts.isActive, true));
      const [totalPoints] = await db.select({ sum: sql<number>`COALESCE(SUM(${showcaseLoyaltyAccounts.availablePoints}), 0)` }).from(showcaseLoyaltyAccounts);
      const [totalReferrals] = await db.select({ count: count() }).from(showcaseReferrals);
      const [convertedReferrals] = await db.select({ count: count() }).from(showcaseReferrals).where(eq(showcaseReferrals.status, "converted"));

      const tierDist = await db.select({
        tier: showcaseLoyaltyAccounts.tier,
        count: count(),
      }).from(showcaseLoyaltyAccounts).where(eq(showcaseLoyaltyAccounts.isActive, true))
        .groupBy(showcaseLoyaltyAccounts.tier).limit(10);

      const topContributors = await db.select().from(showcaseLoyaltyAccounts)
        .where(eq(showcaseLoyaltyAccounts.isActive, true))
        .orderBy(desc(showcaseLoyaltyAccounts.tierPoints)).limit(10);

      return {
        totalAccounts: totalAccounts?.count ?? 0,
        totalPointsCirculating: totalPoints?.sum ?? 0,
        totalReferrals: totalReferrals?.count ?? 0,
        convertedReferrals: convertedReferrals?.count ?? 0,
        tierDistribution: tierDist,
        topContributors,
        pointRules: POINT_RULES,
        tierThresholds: TIER_THRESHOLDS,
      };
    }),

  getPointRules: publicProcedure
    .query(() => ({ rules: POINT_RULES, tiers: TIER_THRESHOLDS })),
});

// ──── Main Router ────

export const targetedShowcaseRouter = router({
  template: templateRouter,
  guestLink: guestLinkRouter,
  guest: guestRouter,
  contentBlock: contentBlockRouter,
  equipmentHealth: equipmentHealthRouter,
  visitorEvent: visitorEventRouter,
  supportTicket: supportTicketRouter,
  loyalty: loyaltyRouter,
});

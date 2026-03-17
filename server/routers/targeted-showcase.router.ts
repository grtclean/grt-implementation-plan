/**
 * Targeted Showcase Router — 定向数字展厅
 *
 * Zero-trust architecture:
 * - Internal (RBAC-protected): CRUD templates, generate guest links, analytics
 * - Guest (public, token-gated): validate token → return showcase data or 403
 *
 * Guest access NEVER exposes internal project data. Each token is:
 * - Cryptographically random (32 bytes hex)
 * - Time-limited (default 48h)
 * - View-count tracked
 * - Revocable
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
import { eq, desc, and, sql, count, gt, type SQL } from "drizzle-orm";
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
    tablesEnsured = true;
    log.info("Showcase tables ensured");
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
  generateGuestLink: requirePermission("crm:campaigns:manage")
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

  revokeLink: requirePermission("crm:campaigns:manage")
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

      // 7. Return ONLY showcase-safe data (no internal IDs, no createdBy)
      return {
        // Auth context
        targetClient: auth.targetClient,
        welcomeMessage: auth.welcomeMessage,
        expiresAt: auth.expiresAt,
        viewCount: auth.viewCount + 1,

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
      };
    }),
});

// ──── Main Router ────

export const targetedShowcaseRouter = router({
  template: templateRouter,
  guestLink: guestLinkRouter,
  guest: guestRouter,
});

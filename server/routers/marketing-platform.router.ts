/**
 * Marketing Platform Router — 营销数字平台
 *
 * 6 sub-routers, ~59 procedures:
 *   A. annualPlan (12) — M1 Annual OKR Strategy + KPI + Budget
 *   B. assetQuality (10) — M2 Quality Specs + VI Compliance
 *   C. exhibition (16) — M3 Exhibition Campaign (E0→E3 stage gate)
 *   D. historicalAssets (8) — M4 Vectorized Archive
 *   E. broadcast (12) — M5 Screen Broadcast Matrix
 *   F. seedDemo (1) — Development seed data
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  mktAnnualPlans,
  mktKpiTargets,
  mktBudgetLineItems,
  mktAssetQualitySpecs,
  mktAssetReviews,
  mktViRules,
  mktExhibitions,
  mktExhibitionTasks,
  mktLeadCaptures,
  mktExhibitionRoi,
  mktHistoricalAssets,
  mktBroadcastChannels,
  mktBroadcastSchedules,
} from "../../drizzle/marketing-platform-schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("marketing-platform");

// ── Auto-create tables ──────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_annual_plans" (
        "id" serial PRIMARY KEY NOT NULL,
        "year" integer NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "okr_objective_id" integer,
        "status" varchar(30) NOT NULL DEFAULT 'draft',
        "total_budget" numeric(14,2),
        "approved_budget" numeric(14,2),
        "actual_spend" numeric(14,2) DEFAULT 0,
        "budget_status" varchar(30) DEFAULT 'pending',
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_kpi_targets" (
        "id" serial PRIMARY KEY NOT NULL,
        "plan_id" integer NOT NULL,
        "name" varchar(200) NOT NULL,
        "category" varchar(50) NOT NULL,
        "target_value" numeric(14,2) NOT NULL,
        "current_value" numeric(14,2) DEFAULT 0,
        "unit" varchar(30) NOT NULL,
        "rag_status" varchar(10) DEFAULT 'gray',
        "last_checkin_at" timestamp,
        "checkin_history" jsonb DEFAULT '[]'::jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_budget_line_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "plan_id" integer NOT NULL,
        "category" varchar(50) NOT NULL,
        "description" text,
        "planned_amount" numeric(14,2) NOT NULL,
        "actual_amount" numeric(14,2) DEFAULT 0,
        "red_line_limit" numeric(14,2),
        "status" varchar(30) DEFAULT 'active',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_asset_quality_specs" (
        "id" serial PRIMARY KEY NOT NULL,
        "asset_type" varchar(50) NOT NULL,
        "spec_name" varchar(200) NOT NULL,
        "requirements" jsonb DEFAULT '{}'::jsonb,
        "is_active" boolean DEFAULT true,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_asset_reviews" (
        "id" serial PRIMARY KEY NOT NULL,
        "asset_name" varchar(200) NOT NULL,
        "asset_type" varchar(50) NOT NULL,
        "asset_url" text,
        "spec_id" integer,
        "submitted_by" integer NOT NULL,
        "reviewer_by" integer,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "vi_compliance_result" jsonb,
        "review_notes" text,
        "submitted_at" timestamp DEFAULT now() NOT NULL,
        "reviewed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_vi_rules" (
        "id" serial PRIMARY KEY NOT NULL,
        "region" varchar(20) NOT NULL DEFAULT 'global',
        "category" varchar(50) NOT NULL,
        "rule_name" varchar(200) NOT NULL,
        "rule_content" jsonb DEFAULT '{}'::jsonb,
        "is_active" boolean DEFAULT true,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_exhibitions" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "venue" varchar(300),
        "city" varchar(100),
        "country" varchar(50),
        "start_date" timestamp,
        "end_date" timestamp,
        "stage" varchar(10) NOT NULL DEFAULT 'E0',
        "budget" numeric(14,2),
        "budget_approved" boolean DEFAULT false,
        "demo_equipment" jsonb DEFAULT '[]'::jsonb,
        "booth_info" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_exhibition_tasks" (
        "id" serial PRIMARY KEY NOT NULL,
        "exhibition_id" integer NOT NULL,
        "stage" varchar(10) NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "assigned_to" integer,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "due_date" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_lead_captures" (
        "id" serial PRIMARY KEY NOT NULL,
        "exhibition_id" integer NOT NULL,
        "company_name" varchar(200),
        "contact_name" varchar(100),
        "contact_title" varchar(100),
        "email" varchar(200),
        "phone" varchar(50),
        "notes" text,
        "ocr_data" jsonb,
        "sync_status" varchar(30) DEFAULT 'pending',
        "crm_lead_id" integer,
        "captured_by" integer,
        "captured_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_exhibition_roi" (
        "id" serial PRIMARY KEY NOT NULL,
        "exhibition_id" integer NOT NULL,
        "total_spend" numeric(14,2),
        "leads_generated" integer DEFAULT 0,
        "m0_projects_generated" integer DEFAULT 0,
        "estimated_revenue" numeric(14,2),
        "roi_percentage" numeric(8,2),
        "ai_narrative" text,
        "metrics" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_historical_assets" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" varchar(200) NOT NULL,
        "asset_type" varchar(50) NOT NULL,
        "year" integer,
        "region" varchar(50),
        "industry" varchar(100),
        "file_url" text,
        "thumbnail_url" text,
        "tags" jsonb DEFAULT '[]'::jsonb,
        "vectorized" boolean DEFAULT false,
        "knowledge_base_id" integer,
        "exhibition_id" integer,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_broadcast_channels" (
        "id" serial PRIMARY KEY NOT NULL,
        "channel_code" varchar(50) NOT NULL,
        "name" varchar(200) NOT NULL,
        "location" varchar(300),
        "screen_type" varchar(50),
        "resolution" varchar(30),
        "is_online" boolean DEFAULT false,
        "last_heartbeat" timestamp,
        "config" jsonb DEFAULT '{}'::jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mkt_broadcast_schedules" (
        "id" serial PRIMARY KEY NOT NULL,
        "channel_id" integer NOT NULL,
        "content_title" varchar(200) NOT NULL,
        "content_type" varchar(50) NOT NULL,
        "content_url" text,
        "content_ref_id" integer,
        "start_time" timestamp NOT NULL,
        "end_time" timestamp NOT NULL,
        "is_active" boolean DEFAULT true,
        "sort_order" integer DEFAULT 0,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    tablesEnsured = true;
    log.info("Marketing platform tables ensured");
  } catch (err) {
    log.warn({ err }, "Marketing platform table creation skipped (may already exist)");
    tablesEnsured = true;
  }
}

// ══════════════════════════════════════════════════════════════
// Sub-Router A: Annual Plan (M1)
// ══════════════════════════════════════════════════════════════
const annualPlanRouter = router({
  listPlans: protectedProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input?.year) conditions.push(eq(mktAnnualPlans.year, input.year));
      const rows = conditions.length > 0
        ? await db.select().from(mktAnnualPlans).where(and(...conditions)).orderBy(desc(mktAnnualPlans.year)).limit(100)
        : await db.select().from(mktAnnualPlans).orderBy(desc(mktAnnualPlans.year)).limit(100);
      return rows;
    }),

  getPlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.select().from(mktAnnualPlans).where(eq(mktAnnualPlans.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      return rows[0];
    }),

  createPlan: requirePermission("marketing:plan:create")
    .input(z.object({
      year: z.number(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      totalBudget: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktAnnualPlans).values({
        ...input,
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ planId: rows[0]?.id }, "Marketing annual plan created");
      return rows[0];
    }),

  updatePlan: requirePermission("marketing:plan:edit")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "active", "closed"]).optional(),
      totalBudget: z.string().optional(),
      approvedBudget: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktAnnualPlans).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktAnnualPlans.id, id)).returning();
      return rows[0];
    }),

  listKpiTargets: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db.select().from(mktKpiTargets).where(eq(mktKpiTargets.planId, input.planId)).orderBy(mktKpiTargets.category).limit(200);
    }),

  upsertKpiTarget: requirePermission("marketing:plan:edit")
    .input(z.object({
      id: z.number().optional(),
      planId: z.number(),
      name: z.string().min(1).max(200),
      category: z.string().min(1).max(50),
      targetValue: z.string(),
      unit: z.string().min(1).max(30),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      if (input.id) {
        const { id, ...data } = input;
        const rows = await db.update(mktKpiTargets).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktKpiTargets.id, id)).returning();
        return rows[0];
      }
      const rows = await db.insert(mktKpiTargets).values(input).returning();
      return rows[0];
    }),

  checkInKpi: requirePermission("marketing:plan:edit")
    .input(z.object({ id: z.number(), currentValue: z.string() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const existing = await db.select().from(mktKpiTargets).where(eq(mktKpiTargets.id, input.id)).limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "KPI not found" });
      const kpi = existing[0];
      const target = parseFloat(kpi.targetValue);
      const current = parseFloat(input.currentValue);
      const ratio = target > 0 ? current / target : 0;
      const ragStatus = ratio >= 0.9 ? "green" : ratio >= 0.6 ? "amber" : "red";
      const history = Array.isArray(kpi.checkinHistory) ? kpi.checkinHistory : [];
      const newHistory = [...history, { value: input.currentValue, date: new Date().toISOString(), rag: ragStatus }];
      const rows = await db.update(mktKpiTargets).set({
        currentValue: input.currentValue,
        ragStatus,
        lastCheckinAt: new Date().toISOString(),
        checkinHistory: newHistory,
        updatedAt: new Date().toISOString(),
      }).where(eq(mktKpiTargets.id, input.id)).returning();
      return rows[0];
    }),

  listBudgetLines: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db.select().from(mktBudgetLineItems).where(eq(mktBudgetLineItems.planId, input.planId)).orderBy(mktBudgetLineItems.category).limit(200);
    }),

  upsertBudgetLine: requirePermission("marketing:plan:edit")
    .input(z.object({
      id: z.number().optional(),
      planId: z.number(),
      category: z.string().min(1).max(50),
      description: z.string().optional(),
      plannedAmount: z.string(),
      redLineLimit: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      if (input.id) {
        const { id, ...data } = input;
        const rows = await db.update(mktBudgetLineItems).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktBudgetLineItems.id, id)).returning();
        return rows[0];
      }
      const rows = await db.insert(mktBudgetLineItems).values(input).returning();
      return rows[0];
    }),

  submitBudgetForReview: requirePermission("marketing:plan:edit")
    .input(z.object({ planId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktAnnualPlans).set({
        budgetStatus: "submitted",
        updatedAt: new Date().toISOString(),
      }).where(eq(mktAnnualPlans.id, input.planId)).returning();
      log.info({ planId: input.planId }, "Marketing budget submitted for review");
      return rows[0];
    }),

  budgetDashboard: protectedProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const plan = await db.select().from(mktAnnualPlans).where(eq(mktAnnualPlans.id, input.planId)).limit(1);
      const lines = await db.select().from(mktBudgetLineItems).where(eq(mktBudgetLineItems.planId, input.planId)).limit(200);
      const totalPlanned = lines.reduce((sum, l) => sum + parseFloat(l.plannedAmount || "0"), 0);
      const totalActual = lines.reduce((sum, l) => sum + parseFloat(l.actualAmount || "0"), 0);
      const overBudgetLines = lines.filter(l => {
        const limit = parseFloat(l.redLineLimit || "0");
        return limit > 0 && parseFloat(l.actualAmount || "0") > limit;
      });
      return {
        plan: plan[0] ?? null,
        totalPlanned,
        totalActual,
        burnRate: totalPlanned > 0 ? (totalActual / totalPlanned * 100).toFixed(1) : "0",
        overBudgetLines,
        byCategory: lines.map(l => ({
          category: l.category,
          planned: l.plannedAmount,
          actual: l.actualAmount,
          pct: parseFloat(l.plannedAmount || "0") > 0
            ? (parseFloat(l.actualAmount || "0") / parseFloat(l.plannedAmount || "0") * 100).toFixed(1)
            : "0",
        })),
      };
    }),

  linkToOkr: requirePermission("marketing:plan:edit")
    .input(z.object({ planId: z.number(), okrObjectiveId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktAnnualPlans).set({
        okrObjectiveId: input.okrObjectiveId,
        updatedAt: new Date().toISOString(),
      }).where(eq(mktAnnualPlans.id, input.planId)).returning();
      return rows[0];
    }),
});

// ══════════════════════════════════════════════════════════════
// Sub-Router B: Asset Quality (M2)
// ══════════════════════════════════════════════════════════════
const assetQualityRouter = router({
  listSpecs: protectedProcedure
    .input(z.object({ assetType: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      if (input?.assetType) {
        return db.select().from(mktAssetQualitySpecs).where(eq(mktAssetQualitySpecs.assetType, input.assetType)).limit(200);
      }
      return db.select().from(mktAssetQualitySpecs).orderBy(mktAssetQualitySpecs.assetType).limit(200);
    }),

  createSpec: requirePermission("marketing:quality:create")
    .input(z.object({
      assetType: z.string().min(1).max(50),
      specName: z.string().min(1).max(200),
      requirements: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktAssetQualitySpecs).values({
        ...input,
        requirements: input.requirements ?? {},
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      return rows[0];
    }),

  updateSpec: requirePermission("marketing:quality:edit")
    .input(z.object({
      id: z.number(),
      specName: z.string().min(1).max(200).optional(),
      requirements: z.record(z.string(), z.unknown()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktAssetQualitySpecs).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktAssetQualitySpecs.id, id)).returning();
      return rows[0];
    }),

  listReviews: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      if (input?.status) {
        return db.select().from(mktAssetReviews).where(eq(mktAssetReviews.status, input.status)).orderBy(desc(mktAssetReviews.submittedAt)).limit(200);
      }
      return db.select().from(mktAssetReviews).orderBy(desc(mktAssetReviews.submittedAt)).limit(200);
    }),

  submitForReview: requirePermission("marketing:asset:create")
    .input(z.object({
      assetName: z.string().min(1).max(200),
      assetType: z.string().min(1).max(50),
      assetUrl: z.string().optional(),
      specId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktAssetReviews).values({
        ...input,
        submittedBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ reviewId: rows[0]?.id }, "Asset submitted for review");
      return rows[0];
    }),

  reviewAsset: requirePermission("marketing:quality:edit")
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktAssetReviews).set({
        status: input.status,
        reviewNotes: input.reviewNotes,
        reviewerBy: ctx.user?.id ?? 0,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(mktAssetReviews.id, input.id)).returning();
      log.info({ reviewId: input.id, status: input.status }, "Asset reviewed");
      return rows[0];
    }),

  listViRules: protectedProcedure
    .input(z.object({ region: z.string().optional(), category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input?.region) conditions.push(eq(mktViRules.region, input.region));
      if (input?.category) conditions.push(eq(mktViRules.category, input.category));
      if (conditions.length > 0) {
        return db.select().from(mktViRules).where(and(...conditions)).limit(200);
      }
      return db.select().from(mktViRules).orderBy(mktViRules.region).limit(200);
    }),

  upsertViRule: requirePermission("marketing:quality:edit")
    .input(z.object({
      id: z.number().optional(),
      region: z.string().min(1).max(20),
      category: z.string().min(1).max(50),
      ruleName: z.string().min(1).max(200),
      ruleContent: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      if (input.id) {
        const { id, ...data } = input;
        const rows = await db.update(mktViRules).set({ ...data, ruleContent: data.ruleContent ?? {}, updatedAt: new Date().toISOString() }).where(eq(mktViRules.id, id)).returning();
        return rows[0];
      }
      const rows = await db.insert(mktViRules).values({
        ...input,
        ruleContent: input.ruleContent ?? {},
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      return rows[0];
    }),

  checkViCompliance: protectedProcedure
    .input(z.object({
      assetType: z.string(),
      region: z.string().default("global"),
      assetMetadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rules = await db.select().from(mktViRules).where(
        and(eq(mktViRules.region, input.region), eq(mktViRules.isActive, true))
      ).limit(200);
      const violations: Array<{ ruleId: number; ruleName: string; detail: string }> = [];
      for (const rule of rules) {
        const content = (rule.ruleContent ?? {}) as Record<string, unknown>;
        if (content.requiredFields && Array.isArray(content.requiredFields)) {
          for (const field of content.requiredFields) {
            if (!input.assetMetadata?.[field as string]) {
              violations.push({ ruleId: rule.id, ruleName: rule.ruleName, detail: `Missing required field: ${field}` });
            }
          }
        }
      }
      return { compliant: violations.length === 0, violations, rulesChecked: rules.length };
    }),

  reviewDashboard: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const pending = await db.select({ count: count() }).from(mktAssetReviews).where(eq(mktAssetReviews.status, "pending"));
    const approved = await db.select({ count: count() }).from(mktAssetReviews).where(eq(mktAssetReviews.status, "approved"));
    const rejected = await db.select({ count: count() }).from(mktAssetReviews).where(eq(mktAssetReviews.status, "rejected"));
    return {
      pendingCount: pending[0]?.count ?? 0,
      approvedCount: approved[0]?.count ?? 0,
      rejectedCount: rejected[0]?.count ?? 0,
      rejectionRate: (() => {
        const total = (Number(approved[0]?.count ?? 0) + Number(rejected[0]?.count ?? 0));
        return total > 0 ? (Number(rejected[0]?.count ?? 0) / total * 100).toFixed(1) : "0";
      })(),
    };
  }),
});

// ══════════════════════════════════════════════════════════════
// Sub-Router C: Exhibition Campaign (M3)
// ══════════════════════════════════════════════════════════════
const STAGE_ORDER = ["E0", "E1", "E2", "E3", "closed"] as const;

const exhibitionRouter = router({
  list: protectedProcedure
    .input(z.object({ stage: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      if (input?.stage) {
        return db.select().from(mktExhibitions).where(eq(mktExhibitions.stage, input.stage)).orderBy(desc(mktExhibitions.startDate)).limit(200);
      }
      return db.select().from(mktExhibitions).orderBy(desc(mktExhibitions.startDate)).limit(200);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.select().from(mktExhibitions).where(eq(mktExhibitions.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Exhibition not found" });
      return rows[0];
    }),

  create: requirePermission("marketing:exhibition:create")
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      venue: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.string().optional(),
      demoEquipment: z.array(z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktExhibitions).values({
        ...input,
        demoEquipment: input.demoEquipment ?? [],
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ exhibitionId: rows[0]?.id }, "Exhibition created");
      return rows[0];
    }),

  update: requirePermission("marketing:exhibition:edit")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      venue: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.string().optional(),
      budgetApproved: z.boolean().optional(),
      demoEquipment: z.array(z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktExhibitions).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktExhibitions.id, id)).returning();
      return rows[0];
    }),

  advanceStage: requirePermission("marketing:exhibition:edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const exh = await db.select().from(mktExhibitions).where(eq(mktExhibitions.id, input.id)).limit(1);
      if (!exh.length) throw new TRPCError({ code: "NOT_FOUND", message: "Exhibition not found" });
      const current = exh[0];
      const idx = STAGE_ORDER.indexOf(current.stage as typeof STAGE_ORDER[number]);
      if (idx < 0 || idx >= STAGE_ORDER.length - 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Exhibition already at final stage" });
      }

      // Prerequisite validation
      if (current.stage === "E0") {
        if (!current.budgetApproved) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Budget must be approved before E0→E1" });
        const equip = Array.isArray(current.demoEquipment) ? current.demoEquipment : [];
        if (equip.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Demo equipment must be finalized before E0→E1" });
      }
      if (current.stage === "E1") {
        const tasks = await db.select().from(mktExhibitionTasks).where(
          and(eq(mktExhibitionTasks.exhibitionId, input.id), eq(mktExhibitionTasks.stage, "E1"))
        ).limit(1000);
        const incomplete = tasks.filter(t => t.status !== "completed");
        if (incomplete.length > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${incomplete.length} E1 tasks still incomplete` });
      }
      if (current.stage === "E2") {
        if (!current.endDate || new Date(current.endDate) > new Date()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Exhibition dates must have passed before E2→E3" });
        }
        const leads = await db.select({ count: count() }).from(mktLeadCaptures).where(eq(mktLeadCaptures.exhibitionId, input.id));
        if (Number(leads[0]?.count ?? 0) < 1) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "At least 1 lead must be captured before E2→E3" });
      }
      if (current.stage === "E3") {
        const roi = await db.select().from(mktExhibitionRoi).where(eq(mktExhibitionRoi.exhibitionId, input.id)).limit(1);
        if (!roi.length) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ROI analysis must be submitted before closing" });
      }

      const nextStage = STAGE_ORDER[idx + 1];
      const rows = await db.update(mktExhibitions).set({
        stage: nextStage,
        updatedAt: new Date().toISOString(),
      }).where(eq(mktExhibitions.id, input.id)).returning();
      log.info({ exhibitionId: input.id, from: current.stage, to: nextStage }, "Exhibition stage advanced");
      return rows[0];
    }),

  listTasks: protectedProcedure
    .input(z.object({ exhibitionId: z.number(), stage: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [eq(mktExhibitionTasks.exhibitionId, input.exhibitionId)];
      if (input.stage) conditions.push(eq(mktExhibitionTasks.stage, input.stage));
      return db.select().from(mktExhibitionTasks).where(and(...conditions)).orderBy(mktExhibitionTasks.dueDate).limit(500);
    }),

  createTask: requirePermission("marketing:exhibition:edit")
    .input(z.object({
      exhibitionId: z.number(),
      stage: z.string().min(1).max(10),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      assignedTo: z.number().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktExhibitionTasks).values(input).returning();
      return rows[0];
    }),

  updateTask: requirePermission("marketing:exhibition:edit")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedTo: z.number().optional(),
      status: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktExhibitionTasks).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktExhibitionTasks.id, id)).returning();
      return rows[0];
    }),

  completeTask: requirePermission("marketing:exhibition:edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktExhibitionTasks).set({
        status: "completed",
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(mktExhibitionTasks.id, input.id)).returning();
      return rows[0];
    }),

  captureLead: requirePermission("marketing:lead:create")
    .input(z.object({
      exhibitionId: z.number(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      contactTitle: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
      ocrData: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktLeadCaptures).values({
        ...input,
        ocrData: input.ocrData ?? null,
        capturedBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ leadId: rows[0]?.id, exhibitionId: input.exhibitionId }, "Lead captured at exhibition");
      return rows[0];
    }),

  syncLeadsToCrm: requirePermission("marketing:lead:create")
    .input(z.object({ exhibitionId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const pending = await db.select().from(mktLeadCaptures).where(
        and(eq(mktLeadCaptures.exhibitionId, input.exhibitionId), eq(mktLeadCaptures.syncStatus, "pending"))
      ).limit(500);
      let synced = 0;
      for (const lead of pending) {
        await db.update(mktLeadCaptures).set({ syncStatus: "synced" }).where(eq(mktLeadCaptures.id, lead.id));
        synced++;
      }
      log.info({ exhibitionId: input.exhibitionId, synced }, "Leads synced to CRM");
      return { synced, total: pending.length };
    }),

  getLeadCaptures: protectedProcedure
    .input(z.object({ exhibitionId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db.select().from(mktLeadCaptures).where(eq(mktLeadCaptures.exhibitionId, input.exhibitionId)).orderBy(desc(mktLeadCaptures.capturedAt)).limit(500);
    }),

  createRoiAnalysis: requirePermission("marketing:exhibition:edit")
    .input(z.object({
      exhibitionId: z.number(),
      totalSpend: z.string().optional(),
      leadsGenerated: z.number().optional(),
      m0ProjectsGenerated: z.number().optional(),
      estimatedRevenue: z.string().optional(),
      metrics: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const spend = parseFloat(input.totalSpend || "0");
      const revenue = parseFloat(input.estimatedRevenue || "0");
      const roiPct = spend > 0 ? ((revenue - spend) / spend * 100).toFixed(2) : "0";
      const rows = await db.insert(mktExhibitionRoi).values({
        ...input,
        roiPercentage: roiPct,
        metrics: input.metrics ?? {},
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ exhibitionId: input.exhibitionId, roi: roiPct }, "Exhibition ROI analysis created");
      return rows[0];
    }),

  getRoiAnalysis: protectedProcedure
    .input(z.object({ exhibitionId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.select().from(mktExhibitionRoi).where(eq(mktExhibitionRoi.exhibitionId, input.exhibitionId)).limit(1);
      return rows[0] ?? null;
    }),

  exhibitionDashboard: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const all = await db.select().from(mktExhibitions).orderBy(desc(mktExhibitions.startDate)).limit(200);
    const byStage: Record<string, number> = {};
    for (const e of all) {
      byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    }
    return { total: all.length, byStage, upcoming: all.filter(e => e.startDate && new Date(e.startDate) > new Date()).slice(0, 5) };
  }),

  generateRoiReport: requirePermission("marketing:exhibition:edit")
    .input(z.object({ exhibitionId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const roi = await db.select().from(mktExhibitionRoi).where(eq(mktExhibitionRoi.exhibitionId, input.exhibitionId)).limit(1);
      if (!roi.length) throw new TRPCError({ code: "NOT_FOUND", message: "ROI analysis not found" });
      const exh = await db.select().from(mktExhibitions).where(eq(mktExhibitions.id, input.exhibitionId)).limit(1);
      const narrative = `展会"${exh[0]?.name ?? ""}"共产生${roi[0].leadsGenerated}条线索，生成${roi[0].m0ProjectsGenerated}个M0项目，预计营收${roi[0].estimatedRevenue}，投入产出比${roi[0].roiPercentage}%。`;
      await db.update(mktExhibitionRoi).set({
        aiNarrative: narrative,
        updatedAt: new Date().toISOString(),
      }).where(eq(mktExhibitionRoi.id, roi[0].id));
      return { narrative };
    }),
});

// ══════════════════════════════════════════════════════════════
// Sub-Router D: Historical Assets (M4)
// ══════════════════════════════════════════════════════════════
const historicalAssetsRouter = router({
  list: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      region: z.string().optional(),
      industry: z.string().optional(),
      assetType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input?.year) conditions.push(eq(mktHistoricalAssets.year, input.year));
      if (input?.region) conditions.push(eq(mktHistoricalAssets.region, input.region));
      if (input?.industry) conditions.push(eq(mktHistoricalAssets.industry, input.industry));
      if (input?.assetType) conditions.push(eq(mktHistoricalAssets.assetType, input.assetType));
      if (conditions.length > 0) {
        return db.select().from(mktHistoricalAssets).where(and(...conditions)).orderBy(desc(mktHistoricalAssets.createdAt)).limit(500);
      }
      return db.select().from(mktHistoricalAssets).orderBy(desc(mktHistoricalAssets.createdAt)).limit(500);
    }),

  create: requirePermission("marketing:history:create")
    .input(z.object({
      title: z.string().min(1).max(200),
      assetType: z.string().min(1).max(50),
      year: z.number().optional(),
      region: z.string().optional(),
      industry: z.string().optional(),
      fileUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      exhibitionId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktHistoricalAssets).values({
        ...input,
        tags: input.tags ?? [],
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      return rows[0];
    }),

  update: requirePermission("marketing:history:edit")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      assetType: z.string().optional(),
      year: z.number().optional(),
      region: z.string().optional(),
      industry: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktHistoricalAssets).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktHistoricalAssets.id, id)).returning();
      return rows[0];
    }),

  vectorize: requirePermission("marketing:history:edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktHistoricalAssets).set({
        vectorized: true,
        updatedAt: new Date().toISOString(),
      }).where(eq(mktHistoricalAssets.id, input.id)).returning();
      log.info({ assetId: input.id }, "Historical asset vectorized");
      return rows[0];
    }),

  batchVectorize: requirePermission("marketing:history:edit")
    .input(z.object({ ids: z.array(z.number()).max(100) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      let count = 0;
      for (const id of input.ids) {
        await db.update(mktHistoricalAssets).set({ vectorized: true, updatedAt: new Date().toISOString() }).where(eq(mktHistoricalAssets.id, id));
        count++;
      }
      log.info({ count }, "Historical assets batch vectorized");
      return { vectorized: count };
    }),

  searchHistory: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const results = await db.select().from(mktHistoricalAssets)
        .where(eq(mktHistoricalAssets.vectorized, true))
        .orderBy(desc(mktHistoricalAssets.createdAt))
        .limit(20);
      return results;
    }),

  getByExhibition: protectedProcedure
    .input(z.object({ exhibitionId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db.select().from(mktHistoricalAssets).where(eq(mktHistoricalAssets.exhibitionId, input.exhibitionId)).limit(200);
    }),

  stats: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const total = await db.select({ count: count() }).from(mktHistoricalAssets);
    const vectorized = await db.select({ count: count() }).from(mktHistoricalAssets).where(eq(mktHistoricalAssets.vectorized, true));
    return {
      total: Number(total[0]?.count ?? 0),
      vectorized: Number(vectorized[0]?.count ?? 0),
      pendingVectorization: Number(total[0]?.count ?? 0) - Number(vectorized[0]?.count ?? 0),
    };
  }),
});

// ══════════════════════════════════════════════════════════════
// Sub-Router E: Broadcast Matrix (M5)
// ══════════════════════════════════════════════════════════════
const broadcastRouter = router({
  listChannels: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    return db.select().from(mktBroadcastChannels).orderBy(mktBroadcastChannels.name).limit(200);
  }),

  getChannel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.select().from(mktBroadcastChannels).where(eq(mktBroadcastChannels.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" });
      return rows[0];
    }),

  createChannel: requirePermission("marketing:broadcast:create")
    .input(z.object({
      channelCode: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      location: z.string().optional(),
      screenType: z.string().optional(),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktBroadcastChannels).values({
        ...input,
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      log.info({ channelId: rows[0]?.id }, "Broadcast channel created");
      return rows[0];
    }),

  updateChannel: requirePermission("marketing:broadcast:edit")
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      location: z.string().optional(),
      screenType: z.string().optional(),
      resolution: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktBroadcastChannels).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktBroadcastChannels.id, id)).returning();
      return rows[0];
    }),

  heartbeat: publicProcedure
    .input(z.object({ channelCode: z.string() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.update(mktBroadcastChannels).set({
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(mktBroadcastChannels.channelCode, input.channelCode)).returning();
      return { ok: rows.length > 0 };
    }),

  listSchedules: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      return db.select().from(mktBroadcastSchedules).where(eq(mktBroadcastSchedules.channelId, input.channelId)).orderBy(mktBroadcastSchedules.startTime).limit(500);
    }),

  createSchedule: requirePermission("marketing:broadcast:edit")
    .input(z.object({
      channelId: z.number(),
      contentTitle: z.string().min(1).max(200),
      contentType: z.string().min(1).max(50),
      contentUrl: z.string().optional(),
      contentRefId: z.number().optional(),
      startTime: z.string(),
      endTime: z.string(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.insert(mktBroadcastSchedules).values({
        ...input,
        createdBy: ctx.user?.id ?? 0,
      }).returning();
      return rows[0];
    }),

  updateSchedule: requirePermission("marketing:broadcast:edit")
    .input(z.object({
      id: z.number(),
      contentTitle: z.string().optional(),
      contentUrl: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const { id, ...data } = input;
      const rows = await db.update(mktBroadcastSchedules).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(mktBroadcastSchedules.id, id)).returning();
      return rows[0];
    }),

  deleteSchedule: requirePermission("marketing:broadcast:edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.delete(mktBroadcastSchedules).where(eq(mktBroadcastSchedules.id, input.id));
      return { deleted: true };
    }),

  publishToChannel: requirePermission("marketing:broadcast:edit")
    .input(z.object({
      channelIds: z.array(z.number()).max(50),
      contentTitle: z.string().min(1).max(200),
      contentType: z.string().min(1).max(50),
      contentUrl: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      let published = 0;
      for (const channelId of input.channelIds) {
        await db.insert(mktBroadcastSchedules).values({
          channelId,
          contentTitle: input.contentTitle,
          contentType: input.contentType,
          contentUrl: input.contentUrl,
          startTime: input.startTime,
          endTime: input.endTime,
          createdBy: ctx.user?.id ?? 0,
        });
        published++;
      }
      log.info({ published, channels: input.channelIds.length }, "Content published to channels");
      return { published };
    }),

  broadcastDashboard: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const channels = await db.select().from(mktBroadcastChannels).limit(200);
    const online = channels.filter(c => c.isOnline);
    const totalSchedules = await db.select({ count: count() }).from(mktBroadcastSchedules).where(eq(mktBroadcastSchedules.isActive, true));
    return {
      totalChannels: channels.length,
      onlineChannels: online.length,
      offlineChannels: channels.length - online.length,
      activeSchedules: Number(totalSchedules[0]?.count ?? 0),
      channels: channels.map(c => ({
        id: c.id,
        name: c.name,
        location: c.location,
        isOnline: c.isOnline,
        lastHeartbeat: c.lastHeartbeat,
      })),
    };
  }),

  getActiveContent: publicProcedure
    .input(z.object({ channelCode: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const channel = await db.select().from(mktBroadcastChannels).where(eq(mktBroadcastChannels.channelCode, input.channelCode)).limit(1);
      if (!channel.length) return { channel: null, playlist: [] };
      const now = new Date().toISOString();
      const schedules = await db.select().from(mktBroadcastSchedules).where(
        and(eq(mktBroadcastSchedules.channelId, channel[0].id), eq(mktBroadcastSchedules.isActive, true))
      ).orderBy(mktBroadcastSchedules.sortOrder).limit(50);
      return { channel: channel[0], playlist: schedules };
    }),
});

// ══════════════════════════════════════════════════════════════
// Sub-Router F: Seed Demo
// ══════════════════════════════════════════════════════════════
const seedDemoRouter = router({
  seed: requirePermission("marketing:plan:create")
    .mutation(async ({ ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.id ?? 0;

      // Seed annual plan
      const plans = await db.insert(mktAnnualPlans).values({
        year: 2026,
        title: "2026年度营销战略计划",
        description: "以展会战役为核心，全面数字化营销转型",
        status: "active",
        totalBudget: "5000000",
        createdBy: userId,
      }).returning();

      // Seed KPI targets
      await db.insert(mktKpiTargets).values([
        { planId: plans[0].id, name: "年度视频产出", category: "content", targetValue: "24", unit: "部", ragStatus: "green" },
        { planId: plans[0].id, name: "展会线索获取", category: "leads", targetValue: "500", unit: "条", ragStatus: "amber" },
        { planId: plans[0].id, name: "屏幕更新率", category: "broadcast", targetValue: "100", unit: "%", ragStatus: "green" },
      ]);

      // Seed exhibition
      await db.insert(mktExhibitions).values({
        name: "2026 CIMT 中国国际机床展",
        venue: "国家会展中心(上海)",
        city: "上海",
        country: "CN",
        startDate: "2026-04-10",
        endDate: "2026-04-15",
        stage: "E1",
        budget: "800000",
        budgetApproved: true,
        demoEquipment: [{ name: "KLT-3000", type: "清洗设备" }],
        createdBy: userId,
      });

      // Seed broadcast channel
      await db.insert(mktBroadcastChannels).values({
        channelCode: "HQ-LOBBY-01",
        name: "总部大厅主屏",
        location: "杭州总部一楼大厅",
        screenType: "LED",
        resolution: "3840x2160",
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        createdBy: userId,
      });

      log.info("Marketing platform demo data seeded");
      return { seeded: true };
    }),
});

// ══════════════════════════════════════════════════════════════
// Merged Router
// ══════════════════════════════════════════════════════════════
export const marketingPlatformRouter = router({
  annualPlan: annualPlanRouter,
  assetQuality: assetQualityRouter,
  exhibition: exhibitionRouter,
  historicalAssets: historicalAssetsRouter,
  broadcast: broadcastRouter,
  seedDemo: seedDemoRouter,
});

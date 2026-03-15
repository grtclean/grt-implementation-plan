/**
 * Customer Config Sandbox Router — 客户配置与档案库沙盘
 *
 * Sub-routers:
 *   profile    — Strategic Customer Profile CRUD
 *   brand      — Brand Aesthetics management
 *   standards  — Standards Mapping CRUD
 *   interlock  — Product Interlock matrix CRUD
 *   snapshot   — Profile change history snapshots
 *   dashboard  — Aggregation & analytics
 *   reading    — Authorized reading channels
 *   portalUser — Customer portal user credential management
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, sql, and, like, SQL } from "drizzle-orm";
import {
  strategicCustomerProfiles,
  customerBrandAesthetics,
  customerStandardsMappings,
  customerProductInterlocks,
  customerProfileSnapshots,
  customerReadingChannels,
} from "../../drizzle/customer-profile-schema";
import { customerPortalUsers } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";
import crypto from "crypto";

const log = createChildLogger("customer-config-sandbox");

// ═══════════════════════════════════════════════════════════
// Input Schemas
// ═══════════════════════════════════════════════════════════

const profileInput = z.object({
  customerId: z.string().min(1).max(50),
  companyName: z.string().min(1).max(200),
  companyNameEn: z.string().max(200).optional(),
  cooperationTier: z.enum(["V0_Strategic_Partner", "V1_Key_Account", "V2_Standard", "V3_Prospect", "V4_Dormant"]).default("V2_Standard"),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  primaryContact: z.string().max(100).optional(),
  contactEmail: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  annualRevenue: z.string().max(50).optional(),
  employeeCount: z.number().int().optional(),
  foundedYear: z.number().int().optional(),
  websiteUrl: z.string().max(300).optional(),
  stockCode: z.string().max(20).optional(),
  accountManagerId: z.number().int().optional(),
  accountManagerName: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const brandInput = z.object({
  profileId: z.number().int(),
  sourceUrl: z.string().max(500).optional(),
  primaryColorHex: z.string().max(7).optional(),
  secondaryColorHex: z.string().max(7).optional(),
  accentColorHex: z.string().max(7).optional(),
  visualStyle: z.enum(["Tech_Premium_Industrial", "Clean_Minimalist", "Bold_Engineering", "Corporate_Classic", "Green_Sustainability"]).default("Tech_Premium_Industrial"),
  fontPreference: z.string().max(100).optional(),
  logoUrl: z.string().max(500).optional(),
  coreVision: z.array(z.string()).optional(),
  brandKeywords: z.array(z.string()).optional(),
  designNotes: z.string().optional(),
});

const standardMappingInput = z.object({
  profileId: z.number().int(),
  sortOrder: z.number().int().default(0),
  customerStandard: z.string().min(1),
  grtMatchedValue: z.string().min(1),
  category: z.string().max(50).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const interlockInput = z.object({
  profileId: z.number().int(),
  sortOrder: z.number().int().default(0),
  timeline: z.enum(["past", "present", "future"]).default("present"),
  customerProduct: z.string().min(1),
  grtMatchedSolution: z.string().min(1),
  projectRef: z.string().max(100).optional(),
  status: z.string().max(30).default("active"),
  notes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Profile
// ═══════════════════════════════════════════════════════════

const profileRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tier: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters: SQL[] = [];
      if (input?.search) {
        filters.push(like(strategicCustomerProfiles.companyName, `%${input.search}%`));
      }
      if (input?.tier) {
        filters.push(eq(strategicCustomerProfiles.cooperationTier, input.tier as "V0_Strategic_Partner"));
      }
      if (input?.status) {
        filters.push(eq(strategicCustomerProfiles.status, input.status as "active"));
      }
      const where = filters.length > 0 ? and(...filters) : undefined;
      const rows = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(where)
        .orderBy(desc(strategicCustomerProfiles.updatedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(strategicCustomerProfiles)
        .where(where);
      return { rows, total: count };
    }),

  getById: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      const [profile] = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(eq(strategicCustomerProfiles.id, input))
        .limit(1);
      return profile ?? null;
    }),

  getByCustomerId: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await requireDb();
      const [profile] = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(eq(strategicCustomerProfiles.customerId, input))
        .limit(1);
      return profile ?? null;
    }),

  create: protectedProcedure
    .input(profileInput)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(strategicCustomerProfiles).values({
        ...input,
        createdByUserId: ctx.user?.id,
      }).returning();
      log.info({ customerId: input.customerId }, "Profile created");
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(profileInput.partial()))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(strategicCustomerProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(strategicCustomerProfiles.id, id))
        .returning();
      log.info({ id }, "Profile updated");
      return row;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(strategicCustomerProfiles).where(eq(strategicCustomerProfiles.id, input));
      log.info({ id: input }, "Profile deleted");
      return { success: true };
    }),

  /** Get full profile with brand + standards + interlocks */
  getFull: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      const [profile] = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(eq(strategicCustomerProfiles.id, input))
        .limit(1);
      if (!profile) return null;

      const [brand] = await db
        .select()
        .from(customerBrandAesthetics)
        .where(eq(customerBrandAesthetics.profileId, input))
        .limit(1);
      const standards = await db
        .select()
        .from(customerStandardsMappings)
        .where(eq(customerStandardsMappings.profileId, input))
        .orderBy(customerStandardsMappings.sortOrder)
        .limit(50);
      const interlocks = await db
        .select()
        .from(customerProductInterlocks)
        .where(eq(customerProductInterlocks.profileId, input))
        .orderBy(customerProductInterlocks.sortOrder)
        .limit(50);

      return { profile, brand: brand ?? null, standards, interlocks };
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Brand Aesthetics
// ═══════════════════════════════════════════════════════════

const brandRouter = router({
  get: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(customerBrandAesthetics)
        .where(eq(customerBrandAesthetics.profileId, input))
        .limit(1);
      return row ?? null;
    }),

  upsert: protectedProcedure
    .input(brandInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select({ id: customerBrandAesthetics.id })
        .from(customerBrandAesthetics)
        .where(eq(customerBrandAesthetics.profileId, input.profileId))
        .limit(1);
      if (existing) {
        const [row] = await db
          .update(customerBrandAesthetics)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(customerBrandAesthetics.id, existing.id))
          .returning();
        return row;
      }
      const [row] = await db.insert(customerBrandAesthetics).values(input).returning();
      return row;
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Standards Mapping
// ═══════════════════════════════════════════════════════════

const standardsRouter = router({
  list: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerStandardsMappings)
        .where(eq(customerStandardsMappings.profileId, input))
        .orderBy(customerStandardsMappings.sortOrder)
        .limit(100);
    }),

  create: protectedProcedure
    .input(standardMappingInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.insert(customerStandardsMappings).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(standardMappingInput.partial()))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(customerStandardsMappings)
        .set(data)
        .where(eq(customerStandardsMappings.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(customerStandardsMappings).where(eq(customerStandardsMappings.id, input));
      return { success: true };
    }),

  verify: protectedProcedure
    .input(z.object({ id: z.number().int(), verified: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .update(customerStandardsMappings)
        .set({
          isVerified: input.verified,
          verifiedByUserId: input.verified ? ctx.user?.id : null,
        })
        .where(eq(customerStandardsMappings.id, input.id))
        .returning();
      return row;
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Product Interlock
// ═══════════════════════════════════════════════════════════

const interlockRouter = router({
  list: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerProductInterlocks)
        .where(eq(customerProductInterlocks.profileId, input))
        .orderBy(customerProductInterlocks.sortOrder)
        .limit(100);
    }),

  create: protectedProcedure
    .input(interlockInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.insert(customerProductInterlocks).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(interlockInput.partial()))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(customerProductInterlocks)
        .set(data)
        .where(eq(customerProductInterlocks.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(customerProductInterlocks).where(eq(customerProductInterlocks.id, input));
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Snapshots
// ═══════════════════════════════════════════════════════════

const snapshotRouter = router({
  list: protectedProcedure
    .input(z.object({
      profileId: z.number().int(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerProfileSnapshots)
        .where(eq(customerProfileSnapshots.profileId, input.profileId))
        .orderBy(desc(customerProfileSnapshots.createdAt))
        .limit(input.limit);
    }),

  create: protectedProcedure
    .input(z.object({
      profileId: z.number().int(),
      changeReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Capture current state
      const [profile] = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(eq(strategicCustomerProfiles.id, input.profileId))
        .limit(1);
      if (!profile) throw new Error("Profile not found");

      const [brand] = await db
        .select()
        .from(customerBrandAesthetics)
        .where(eq(customerBrandAesthetics.profileId, input.profileId))
        .limit(1);
      const standards = await db
        .select()
        .from(customerStandardsMappings)
        .where(eq(customerStandardsMappings.profileId, input.profileId))
        .limit(100);
      const interlocks = await db
        .select()
        .from(customerProductInterlocks)
        .where(eq(customerProductInterlocks.profileId, input.profileId))
        .limit(100);

      const [row] = await db.insert(customerProfileSnapshots).values({
        profileId: input.profileId,
        snapshotData: { profile, brand, standards, interlocks },
        changeReason: input.changeReason,
        changedByUserId: ctx.user?.id,
        changedByName: ctx.user?.name ?? "System",
      }).returning();
      log.info({ profileId: input.profileId }, "Snapshot created");
      return row;
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Dashboard
// ═══════════════════════════════════════════════════════════

const dashboardRouter = router({
  tierDistribution: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        tier: strategicCustomerProfiles.cooperationTier,
        count: sql<number>`count(*)::int`,
      })
      .from(strategicCustomerProfiles)
      .groupBy(strategicCustomerProfiles.cooperationTier)
      .limit(10);
    return rows;
  }),

  recentProfiles: protectedProcedure
    .input(z.number().int().min(1).max(20).default(5).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(strategicCustomerProfiles)
        .orderBy(desc(strategicCustomerProfiles.updatedAt))
        .limit(input ?? 5);
    }),

  stats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(strategicCustomerProfiles);
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(strategicCustomerProfiles)
      .where(eq(strategicCustomerProfiles.status, "active"));
    const [{ strategic }] = await db
      .select({ strategic: sql<number>`count(*)::int` })
      .from(strategicCustomerProfiles)
      .where(eq(strategicCustomerProfiles.cooperationTier, "V0_Strategic_Partner"));
    const [{ totalMappings }] = await db
      .select({ totalMappings: sql<number>`count(*)::int` })
      .from(customerStandardsMappings);
    const [{ totalInterlocks }] = await db
      .select({ totalInterlocks: sql<number>`count(*)::int` })
      .from(customerProductInterlocks);
    return { total, active, strategic, totalMappings, totalInterlocks };
  }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Reading Channels (授权阅读推荐通道)
// ═══════════════════════════════════════════════════════════

const readingChannelInput = z.object({
  profileId: z.number().int(),
  docCategory: z.string().min(1).max(50),
  docCategoryLabel: z.string().max(100).optional(),
  accessLevel: z.enum(["full", "view_only", "restricted", "blocked"]).default("restricted"),
  accessTier: z.number().int().min(1).max(4).default(1),
  isViewable: z.boolean().default(false),
  isDownloadable: z.boolean().default(false),
  recommendedReason: z.string().optional(),
  channelNotes: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const readingRouter = router({
  list: protectedProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerReadingChannels)
        .where(eq(customerReadingChannels.profileId, input))
        .orderBy(customerReadingChannels.sortOrder)
        .limit(100);
    }),

  create: protectedProcedure
    .input(readingChannelInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.insert(customerReadingChannels).values(input).returning();
      log.info({ profileId: input.profileId, docCategory: input.docCategory }, "Reading channel created");
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(readingChannelInput.partial()))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(customerReadingChannels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(customerReadingChannels.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(customerReadingChannels).where(eq(customerReadingChannels.id, input));
      return { success: true };
    }),

  /** Bulk set channels for a customer based on their cooperation tier */
  syncFromTier: protectedProcedure
    .input(z.object({
      profileId: z.number().int(),
      accessTier: z.number().int().min(1).max(4),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Delete existing channels for this profile
      await db.delete(customerReadingChannels)
        .where(eq(customerReadingChannels.profileId, input.profileId));

      // TIER_DOC_MATRIX categories mapped to tier access
      const categories: Array<{ key: string; label: string }> = [
        { key: "operation_manual", label: "操作手册" },
        { key: "maintenance_manual", label: "维护保养手册" },
        { key: "basic_wiring", label: "基础接线图" },
        { key: "electrical_drawing", label: "电气图纸" },
        { key: "bom", label: "BOM清单" },
        { key: "factory_params", label: "出厂参数" },
        { key: "pid_tuning", label: "PID调参" },
        { key: "plc_source_code", label: "PLC源代码" },
        { key: "hmi_variable_table", label: "HMI变量表" },
        { key: "historical_data", label: "历史数据" },
        { key: "fat_certificate", label: "FAT验收证书" },
        { key: "sat_certificate", label: "SAT验收证书" },
        { key: "design_rationale", label: "设计依据" },
      ];

      // Tier access matrix (mirrors TIER_DOC_MATRIX from customer-authorization-schema)
      const tierMatrix: Record<number, Record<string, { v: boolean; d: boolean }>> = {
        1: { operation_manual: { v: true, d: true }, basic_wiring: { v: true, d: true }, fat_certificate: { v: true, d: true } },
        2: { operation_manual: { v: true, d: true }, basic_wiring: { v: true, d: true }, fat_certificate: { v: true, d: true }, sat_certificate: { v: true, d: true }, maintenance_manual: { v: true, d: true }, electrical_drawing: { v: true, d: true }, bom: { v: true, d: true }, factory_params: { v: true, d: true } },
        3: { operation_manual: { v: true, d: true }, basic_wiring: { v: true, d: true }, fat_certificate: { v: true, d: true }, sat_certificate: { v: true, d: true }, maintenance_manual: { v: true, d: true }, electrical_drawing: { v: true, d: true }, bom: { v: true, d: true }, factory_params: { v: true, d: true }, plc_source_code: { v: true, d: false }, hmi_variable_table: { v: true, d: true }, pid_tuning: { v: true, d: true }, historical_data: { v: true, d: true } },
        4: { operation_manual: { v: true, d: true }, basic_wiring: { v: true, d: true }, fat_certificate: { v: true, d: true }, sat_certificate: { v: true, d: true }, maintenance_manual: { v: true, d: true }, electrical_drawing: { v: true, d: true }, bom: { v: true, d: true }, factory_params: { v: true, d: true }, plc_source_code: { v: true, d: true }, hmi_variable_table: { v: true, d: true }, pid_tuning: { v: true, d: true }, historical_data: { v: true, d: true }, design_rationale: { v: true, d: true } },
      };

      const matrix = tierMatrix[input.accessTier] ?? {};
      const rows = categories.map((cat, idx) => {
        const access = matrix[cat.key];
        return {
          profileId: input.profileId,
          docCategory: cat.key,
          docCategoryLabel: cat.label,
          accessLevel: access ? (access.d ? "full" as const : "view_only" as const) : "blocked" as const,
          accessTier: input.accessTier,
          isViewable: access?.v ?? false,
          isDownloadable: access?.d ?? false,
          sortOrder: idx + 1,
          isActive: true,
        };
      });

      await db.insert(customerReadingChannels).values(rows);
      log.info({ profileId: input.profileId, tier: input.accessTier, count: rows.length }, "Reading channels synced from tier");
      return { synced: rows.length };
    }),
});

// ═══════════════════════════════════════════════════════════
// Sub-router: Portal User (客户门户账户管理)
// ═══════════════════════════════════════════════════════════

/** SHA-256 hash for portal passwords (not bcrypt — lightweight for internal portal) */
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const portalUserRouter = router({
  /** List portal users, optionally filter by accountId (customerId) */
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().optional(),
      status: z.enum(["active", "suspended", "inactive"]).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters: SQL[] = [];
      if (input?.accountId) {
        filters.push(eq(customerPortalUsers.accountId, input.accountId));
      }
      if (input?.status) {
        filters.push(eq(customerPortalUsers.status, input.status as "active"));
      }
      const where = filters.length > 0 ? and(...filters) : undefined;
      const rows = await db
        .select({
          id: customerPortalUsers.id,
          portalUserId: customerPortalUsers.portalUserId,
          accountId: customerPortalUsers.accountId,
          email: customerPortalUsers.email,
          name: customerPortalUsers.name,
          role: customerPortalUsers.role,
          lastLogin: customerPortalUsers.lastLogin,
          status: customerPortalUsers.status,
          createdAt: customerPortalUsers.createdAt,
          // Deliberately exclude passwordHash from list results
        })
        .from(customerPortalUsers)
        .where(where)
        .orderBy(desc(customerPortalUsers.createdAt))
        .limit(input?.limit ?? 50);
      return rows;
    }),

  /** Create a new portal user with initial password */
  create: protectedProcedure
    .input(z.object({
      portalUserId: z.string().min(3).max(50),
      accountId: z.string().min(1).max(50),
      email: z.string().email().max(100),
      name: z.string().max(100).optional(),
      role: z.string().max(50).default("viewer"),
      password: z.string().min(6).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { password, ...userData } = input;
      const [row] = await db.insert(customerPortalUsers).values({
        ...userData,
        passwordHash: hashPassword(password),
      }).returning();
      log.info({ portalUserId: input.portalUserId, accountId: input.accountId }, "Portal user created");
      return { id: row.id, portalUserId: row.portalUserId, email: row.email, name: row.name };
    }),

  /** Reset portal user password */
  resetPassword: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      newPassword: z.string().min(6).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(customerPortalUsers)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(customerPortalUsers.id, input.id));
      log.info({ id: input.id }, "Portal user password reset");
      return { success: true };
    }),

  /** Update portal user status (active/suspended/inactive) */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["active", "suspended", "inactive"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(customerPortalUsers)
        .set({ status: input.status })
        .where(eq(customerPortalUsers.id, input.id))
        .returning();
      log.info({ id: input.id, status: input.status }, "Portal user status updated");
      return row;
    }),

  /** Update portal user info */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().max(100).optional(),
      email: z.string().email().max(100).optional(),
      role: z.string().max(50).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...data } = input;
      const [row] = await db
        .update(customerPortalUsers)
        .set(data)
        .where(eq(customerPortalUsers.id, id))
        .returning();
      return row;
    }),

  /** Delete portal user */
  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(customerPortalUsers).where(eq(customerPortalUsers.id, input));
      log.info({ id: input }, "Portal user deleted");
      return { success: true };
    }),

  /** Verify portal user credentials (for customer login — public, no auth required) */
  verifyCredentials: publicProcedure
    .input(z.object({
      portalUserId: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [user] = await db
        .select()
        .from(customerPortalUsers)
        .where(eq(customerPortalUsers.portalUserId, input.portalUserId))
        .limit(1);
      if (!user) return { valid: false, reason: "用户不存在" };
      if (user.status !== "active") return { valid: false, reason: "账户已停用" };
      if (user.passwordHash !== hashPassword(input.password)) return { valid: false, reason: "密码错误" };

      // Update lastLogin
      await db
        .update(customerPortalUsers)
        .set({ lastLogin: new Date().toISOString() })
        .where(eq(customerPortalUsers.id, user.id));

      return { valid: true, user: { id: user.id, portalUserId: user.portalUserId, name: user.name, email: user.email, accountId: user.accountId, role: user.role } };
    }),

  /** Public: get customer profile by accountId (for portal display after login) */
  portalGetProfile: publicProcedure
    .input(z.string().min(1).max(50))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [profile] = await db
        .select()
        .from(strategicCustomerProfiles)
        .where(eq(strategicCustomerProfiles.customerId, input))
        .limit(1);
      return profile ?? null;
    }),

  /** Public: get reading channels for a customer profile (for portal display) */
  portalGetReadingChannels: publicProcedure
    .input(z.number().int())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(customerReadingChannels)
        .where(eq(customerReadingChannels.profileId, input))
        .orderBy(customerReadingChannels.sortOrder)
        .limit(100);
    }),
});

// ═══════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════

export const customerConfigSandboxRouter = router({
  profile: profileRouter,
  brand: brandRouter,
  standards: standardsRouter,
  interlock: interlockRouter,
  snapshot: snapshotRouter,
  dashboard: dashboardRouter,
  reading: readingRouter,
  portalUser: portalUserRouter,
});

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Electrical Standards Governance Router                     ║
 * ║  电气规范治理平台                                            ║
 * ║  CTO: CE/UL/OEM customer standard → project lifecycle      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  electricalStandards,
  customerStandardProfiles,
  projectStandardSelections,
  complianceChecklistItems,
  electricalComplaints,
  electricalReviewRules,
} from "../../drizzle/electrical-standards-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("electrical-standards");

// ── 1. Standards Library ───────────────────────────────────────

const standardsRouter = router({
  list: protectedProcedure
    .input(z.object({
      framework: z.string().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.framework) conditions.push(eq(electricalStandards.framework, input.framework as any));
      if (input?.category) conditions.push(eq(electricalStandards.category, input.category as any));
      if (input?.search) conditions.push(ilike(electricalStandards.title, `%${input.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(electricalStandards).where(where).orderBy(electricalStandards.framework, electricalStandards.category).limit(500);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(electricalStandards).where(eq(electricalStandards.id, input.id)).limit(1);
      return row ?? null;
    }),

  create: requirePermission("electrical:standards:manage")
    .input(z.object({
      code: z.string().min(1).max(50),
      framework: z.enum(["CE", "UL", "CSA", "GB", "IEC", "NFPA", "SEMI", "OEM_CUSTOM"]),
      category: z.enum(["power_supply", "motor_drive", "plc_control", "hmi_interface", "safety_circuit", "wiring_cable", "panel_enclosure", "sensor_instrumentation", "communication", "grounding_emc", "marking_labeling", "documentation", "remote_access", "cybersecurity"]),
      title: z.string().min(1).max(500),
      titleEn: z.string().max(500).optional(),
      description: z.string().optional(),
      version: z.string().min(1).max(20),
      referenceDoc: z.string().max(300).optional(),
      referenceUrl: z.string().max(500).optional(),
      applicableRegions: z.array(z.string()).optional(),
      applicableVoltages: z.array(z.string()).optional(),
      keyRequirements: z.array(z.string()).optional(),
      testMethods: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(electricalStandards).values({ ...input, createdBy: ctx.user!.id }).returning();
      log.info({ id: row.id, code: input.code }, "Electrical standard created");
      return row;
    }),

  update: requirePermission("electrical:standards:manage")
    .input(z.object({
      id: z.number().int(),
      title: z.string().min(1).max(500).optional(),
      titleEn: z.string().max(500).optional(),
      description: z.string().optional(),
      keyRequirements: z.array(z.string()).optional(),
      status: z.enum(["draft", "under_review", "active", "superseded", "deprecated"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(electricalStandards).set({ ...data, updatedAt: new Date() }).where(eq(electricalStandards.id, id)).returning();
      return updated;
    }),

  /** Aggregate stats by framework */
  statsByFramework: protectedProcedure.query(async ({ ctx }) => {
    const rows = await (await requireDb())
      .select({ framework: electricalStandards.framework, count: sql<number>`count(*)::int` })
      .from(electricalStandards)
      .where(eq(electricalStandards.status, "active"))
      .groupBy(electricalStandards.framework);
    return rows;
  }),
});

// ── 2. Customer Profiles ───────────────────────────────────────

const customerProfileRouter = router({
  list: protectedProcedure
    .input(z.object({ region: z.string().optional(), buCode: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(customerStandardProfiles.isActive, true)];
      if (input?.region) conditions.push(eq(customerStandardProfiles.region, input.region));
      if (input?.buCode) conditions.push(eq(customerStandardProfiles.buCode, input.buCode));
      return (await requireDb()).select().from(customerStandardProfiles).where(and(...conditions)).orderBy(customerStandardProfiles.customerName).limit(200);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(customerStandardProfiles).where(eq(customerStandardProfiles.id, input.id)).limit(1);
      return row ?? null;
    }),

  create: requirePermission("electrical:customers:manage")
    .input(z.object({
      customerName: z.string().min(1).max(200),
      customerCode: z.string().max(50).optional(),
      region: z.string().min(1).max(20),
      baseFramework: z.enum(["CE", "UL", "CSA", "GB", "IEC", "NFPA", "SEMI", "OEM_CUSTOM"]),
      overlayStandards: z.array(z.string()).optional(),
      voltageSpec: z.string().max(100).optional(),
      safetyLevel: z.string().max(50).optional(),
      plcPlatform: z.string().max(100).optional(),
      hmiPlatform: z.string().max(100).optional(),
      commProtocol: z.string().max(100).optional(),
      panelIpRating: z.string().max(20).optional(),
      cableSpec: z.string().max(200).optional(),
      specialRequirements: z.string().optional(),
      documentLanguages: z.array(z.string()).optional(),
      buCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(customerStandardProfiles).values({ ...input, createdBy: ctx.user!.id }).returning();
      log.info({ id: row.id, customer: input.customerName }, "Customer standard profile created");
      return row;
    }),

  update: requirePermission("electrical:customers:manage")
    .input(z.object({
      id: z.number().int(),
      voltageSpec: z.string().max(100).optional(),
      safetyLevel: z.string().max(50).optional(),
      plcPlatform: z.string().max(100).optional(),
      specialRequirements: z.string().optional(),
      overlayStandards: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(customerStandardProfiles).set({ ...data, updatedAt: new Date() }).where(eq(customerStandardProfiles.id, id)).returning();
      return updated;
    }),
});

// ── 3. Project Standard Selections ─────────────────────────────

const projectSelectionRouter = router({
  /** Get selection for a project */
  getByProject: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(projectStandardSelections).where(eq(projectStandardSelections.projectCode, input.projectCode)).limit(1);
      return row ?? null;
    }),

  /** Create/update project standard selection (links customer profile + standards) */
  upsert: requirePermission("electrical:project:manage")
    .input(z.object({
      projectCode: z.string().min(1).max(50),
      projectName: z.string().max(300).optional(),
      customerProfileId: z.number().int().optional(),
      applicablePhases: z.array(z.string()).optional(),
      selectedStandardIds: z.array(z.number()).optional(),
      designBasis: z.object({
        voltage: z.string(),
        frequency: z.string(),
        phases: z.number(),
        safetyLevel: z.string(),
        ipRating: z.string(),
        plcPlatform: z.string(),
        hmiPlatform: z.string(),
        commProtocol: z.string(),
      }).optional(),
      notes: z.string().optional(),
      buCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(projectStandardSelections).where(eq(projectStandardSelections.projectCode, input.projectCode)).limit(1);

      if (existing.length > 0) {
        if (existing[0].lockedAt) throw new Error("Project standard selection is locked (M3 approved). Cannot modify.");
        const [updated] = await db.update(projectStandardSelections).set({ ...input, updatedAt: new Date() }).where(eq(projectStandardSelections.projectCode, input.projectCode)).returning();
        return updated;
      } else {
        const [row] = await db.insert(projectStandardSelections).values({ ...input, createdBy: ctx.user!.id }).returning();
        return row;
      }
    }),

  /** Lock selection at M3 (freeze standards for the project) */
  lock: requirePermission("electrical:project:lock")
    .input(z.object({ projectCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await (await requireDb()).update(projectStandardSelections).set({
        lockedAt: new Date(),
        lockedBy: ctx.user!.id,
        updatedAt: new Date(),
      }).where(eq(projectStandardSelections.projectCode, input.projectCode)).returning();

      if (!updated) throw new Error("Project standard selection not found");
      log.info({ projectCode: input.projectCode, lockedBy: ctx.user!.name }, "Project standards LOCKED at M3");
      return updated;
    }),

  /** List all project selections */
  list: protectedProcedure.query(async ({ ctx }) => {
    return (await requireDb()).select().from(projectStandardSelections).orderBy(desc(projectStandardSelections.createdAt)).limit(200);
  }),
});

// ── 4. Compliance Checklist ────────────────────────────────────

const checklistRouter = router({
  /** Get checklist for a project + phase */
  getByProjectPhase: protectedProcedure
    .input(z.object({ projectCode: z.string(), phase: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(complianceChecklistItems.projectCode, input.projectCode)];
      if (input.phase) conditions.push(eq(complianceChecklistItems.checkPhase, input.phase));
      return (await requireDb()).select().from(complianceChecklistItems).where(and(...conditions)).orderBy(complianceChecklistItems.checkPhase, complianceChecklistItems.id).limit(500);
    }),

  /** Auto-generate checklist from review rules + selected standards */
  generate: requirePermission("electrical:checklist:manage")
    .input(z.object({ projectCode: z.string(), phase: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      // Get project selection to find applicable framework
      const [selection] = await db.select().from(projectStandardSelections).where(eq(projectStandardSelections.projectCode, input.projectCode)).limit(1);

      // Get review rules for this phase
      const rules = await db.select().from(electricalReviewRules).where(
        and(eq(electricalReviewRules.phase, input.phase), eq(electricalReviewRules.isActive, true))
      ).limit(50);

      // Generate checklist items from rule templates
      const items: any[] = [];
      for (const rule of rules) {
        const template = (rule.checklistTemplate as string[]) ?? [];
        for (const checkItem of template) {
          items.push({
            projectCode: input.projectCode,
            standardId: 1, // Will be linked properly in production
            standardCode: rule.ruleCode,
            checkPhase: input.phase,
            checkItem,
            status: "NOT_CHECKED",
          });
        }
      }

      if (items.length === 0) return { generated: 0 };

      await db.insert(complianceChecklistItems).values(items);
      log.info({ projectCode: input.projectCode, phase: input.phase, count: items.length }, "Compliance checklist generated");
      return { generated: items.length };
    }),

  /** Update check status */
  updateStatus: requirePermission("electrical:checklist:check")
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["NOT_CHECKED", "PASS", "FAIL", "WAIVED", "N_A"]),
      evidence: z.string().max(500).optional(),
      deviationNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(complianceChecklistItems).set({
        ...data,
        checkedBy: ctx.user!.id,
        checkedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(complianceChecklistItems.id, id)).returning();
      return updated;
    }),

  /** Compliance summary for a project */
  summary: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await (await requireDb())
        .select({
          phase: complianceChecklistItems.checkPhase,
          status: complianceChecklistItems.status,
          count: sql<number>`count(*)::int`,
        })
        .from(complianceChecklistItems)
        .where(eq(complianceChecklistItems.projectCode, input.projectCode))
        .groupBy(complianceChecklistItems.checkPhase, complianceChecklistItems.status);
      return rows;
    }),
});

// ── 5. Complaints ──────────────────────────────────────────────

const complaintRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      severity: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.status) conditions.push(eq(electricalComplaints.status, input.status));
      if (input?.severity) conditions.push(eq(electricalComplaints.severity, input.severity as any));
      if (input?.category) conditions.push(eq(electricalComplaints.category, input.category as any));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return (await requireDb()).select().from(electricalComplaints).where(where).orderBy(desc(electricalComplaints.createdAt)).limit(200);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(electricalComplaints).where(eq(electricalComplaints.id, input.id)).limit(1);
      return row ?? null;
    }),

  create: requirePermission("electrical:complaints:manage")
    .input(z.object({
      complaintNumber: z.string().min(1).max(50),
      projectCode: z.string().max(50).optional(),
      customerName: z.string().min(1).max(200),
      equipmentModel: z.string().max(200).optional(),
      category: z.enum(["power_supply", "motor_drive", "plc_control", "hmi_interface", "safety_circuit", "wiring_cable", "panel_enclosure", "sensor_instrumentation", "communication", "grounding_emc", "marking_labeling", "documentation", "remote_access", "cybersecurity"]),
      severity: z.enum(["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"]),
      title: z.string().min(1).max(500),
      description: z.string().min(1),
      assigneeName: z.string().max(100).optional(),
      buCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(electricalComplaints).values(input).returning();
      log.info({ id: row.id, number: input.complaintNumber, severity: input.severity }, "Electrical complaint created");
      return row;
    }),

  updateResolution: requirePermission("electrical:complaints:manage")
    .input(z.object({
      id: z.number().int(),
      rootCause: z.string().optional(),
      correctiveAction: z.string().optional(),
      preventiveAction: z.string().optional(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const setData: any = { ...data, updatedAt: new Date() };
      if (data.status === "resolved") setData.resolvedAt = new Date();
      const [updated] = await (await requireDb()).update(electricalComplaints).set(setData).where(eq(electricalComplaints.id, id)).returning();
      return updated;
    }),

  /** Stats by severity and category */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const bySeverity = await (await requireDb())
      .select({ severity: electricalComplaints.severity, count: sql<number>`count(*)::int` })
      .from(electricalComplaints).groupBy(electricalComplaints.severity);
    const byCategory = await (await requireDb())
      .select({ category: electricalComplaints.category, count: sql<number>`count(*)::int` })
      .from(electricalComplaints).groupBy(electricalComplaints.category);
    const byStatus = await (await requireDb())
      .select({ status: electricalComplaints.status, count: sql<number>`count(*)::int` })
      .from(electricalComplaints).groupBy(electricalComplaints.status);
    return { bySeverity, byCategory, byStatus };
  }),
});

// ── 6. Review Rules ────────────────────────────────────────────

const reviewRuleRouter = router({
  list: protectedProcedure
    .input(z.object({ phase: z.string().optional(), framework: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(electricalReviewRules.isActive, true)];
      if (input?.phase) conditions.push(eq(electricalReviewRules.phase, input.phase));
      if (input?.framework) conditions.push(eq(electricalReviewRules.framework, input.framework as any));
      return (await requireDb()).select().from(electricalReviewRules).where(and(...conditions)).orderBy(electricalReviewRules.phase, electricalReviewRules.ruleCode).limit(200);
    }),

  create: requirePermission("electrical:rules:manage")
    .input(z.object({
      phase: z.string().min(1).max(10),
      framework: z.enum(["CE", "UL", "CSA", "GB", "IEC", "NFPA", "SEMI", "OEM_CUSTOM"]),
      ruleCode: z.string().min(1).max(50),
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      checklistTemplate: z.array(z.string()).optional(),
      requiredApprovers: z.array(z.string()).optional(),
      isBlocking: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(electricalReviewRules).values(input).returning();
      log.info({ id: row.id, phase: input.phase, code: input.ruleCode }, "Electrical review rule created");
      return row;
    }),

  update: requirePermission("electrical:rules:manage")
    .input(z.object({
      id: z.number().int(),
      title: z.string().max(300).optional(),
      checklistTemplate: z.array(z.string()).optional(),
      isBlocking: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(electricalReviewRules).set({ ...data, updatedAt: new Date() }).where(eq(electricalReviewRules.id, id)).returning();
      return updated;
    }),
});

// ── 7. Dashboard ───────────────────────────────────────────────

const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [stdCount] = await db.select({ count: sql<number>`count(*)::int` }).from(electricalStandards).where(eq(electricalStandards.status, "active"));
    const [custCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customerStandardProfiles).where(eq(customerStandardProfiles.isActive, true));
    const [projCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectStandardSelections);
    const [openComplaints] = await db.select({ count: sql<number>`count(*)::int` }).from(electricalComplaints).where(eq(electricalComplaints.status, "open"));
    const [criticalComplaints] = await db.select({ count: sql<number>`count(*)::int` }).from(electricalComplaints).where(eq(electricalComplaints.severity, "CRITICAL"));

    return {
      activeStandardCount: stdCount.count,
      customerProfileCount: custCount.count,
      projectSelectionCount: projCount.count,
      openComplaintCount: openComplaints.count,
      criticalComplaintCount: criticalComplaints.count,
    };
  }),
});

// ── Main Router ────────────────────────────────────────────────

export const electricalStandardsRouter = router({
  standards: standardsRouter,
  customerProfile: customerProfileRouter,
  projectSelection: projectSelectionRouter,
  checklist: checklistRouter,
  complaint: complaintRouter,
  reviewRule: reviewRuleRouter,
  dashboard: dashboardRouter,
});

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Mechanical Configuration Standards Router                  ║
 * ║  机械配置标准治理平台                                        ║
 * ║  CTO: Standards architecture + knowledge graph + quotation  ║
 * ║       compliance + customer config + acceptance tracking    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  mechanicalStandards,
  mechCustomerConfigs,
  mechConfigLineItems,
  mechStandardLinks,
  mechProjectSelections,
  mechQuotationChecks,
  mechPhaseChecklists,
  mechAcceptanceRecords,
  mechReviewRules,
} from "../../drizzle/mechanical-config-schema";
import { historicalQuotations } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("mechanical-config");

const MECH_ORIGINS = ["GRT_INTERNAL", "ISO", "DIN", "EN", "GB", "ASME", "JIS", "OEM_CUSTOMER", "INDUSTRY"] as const;
const MECH_CATEGORIES = ["structural_frame", "material_selection", "surface_treatment", "welding", "fastener", "sealing", "pneumatic_hydraulic", "piping_routing", "thermal_management", "noise_vibration", "ergonomic_access", "safety_guarding", "appearance_paint", "packaging_shipping"] as const;

// ── 1. Standards Library ───────────────────────────────────────

const standardsRouter = router({
  list: protectedProcedure
    .input(z.object({
      origin: z.string().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [];
      if (input?.origin) conditions.push(eq(mechanicalStandards.origin, input.origin as any));
      if (input?.category) conditions.push(eq(mechanicalStandards.category, input.category as any));
      if (input?.search) conditions.push(ilike(mechanicalStandards.title, `%${input.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return (await requireDb()).select().from(mechanicalStandards).where(where).orderBy(mechanicalStandards.origin, mechanicalStandards.category).limit(500);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(mechanicalStandards).where(eq(mechanicalStandards.id, input.id)).limit(1);
      return row ?? null;
    }),

  create: requirePermission("mechanical:standards:manage")
    .input(z.object({
      code: z.string().min(1).max(80),
      origin: z.enum(MECH_ORIGINS),
      category: z.enum(MECH_CATEGORIES),
      title: z.string().min(1).max(500),
      titleEn: z.string().max(500).optional(),
      description: z.string().optional(),
      version: z.string().min(1).max(30),
      referenceDoc: z.string().max(300).optional(),
      applicableRegions: z.array(z.string()).optional(),
      applicableMaterials: z.array(z.string()).optional(),
      keyRequirements: z.array(z.string()).optional(),
      inspectionMethods: z.array(z.string()).optional(),
      toleranceClass: z.string().max(50).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechanicalStandards).values({ ...input, createdBy: ctx.user!.id }).returning();
      log.info({ id: row.id, code: input.code }, "Mechanical standard created");
      return row;
    }),

  update: requirePermission("mechanical:standards:manage")
    .input(z.object({
      id: z.number().int(),
      title: z.string().max(500).optional(),
      description: z.string().optional(),
      keyRequirements: z.array(z.string()).optional(),
      status: z.enum(["draft", "under_review", "active", "superseded", "deprecated"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechanicalStandards).set({ ...data, updatedAt: new Date() }).where(eq(mechanicalStandards.id, id)).returning();
      return updated;
    }),

  statsByOrigin: protectedProcedure.query(async ({ ctx }) => {
    return (await requireDb())
      .select({ origin: mechanicalStandards.origin, count: sql<number>`count(*)::int` })
      .from(mechanicalStandards)
      .where(eq(mechanicalStandards.status, "active"))
      .groupBy(mechanicalStandards.origin);
  }),

  statsByCategory: protectedProcedure.query(async ({ ctx }) => {
    return (await requireDb())
      .select({ category: mechanicalStandards.category, count: sql<number>`count(*)::int` })
      .from(mechanicalStandards)
      .where(eq(mechanicalStandards.status, "active"))
      .groupBy(mechanicalStandards.category);
  }),
});

// ── 2. Customer Configs ────────────────────────────────────────

const customerConfigRouter = router({
  list: protectedProcedure
    .input(z.object({ region: z.string().optional(), buCode: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(mechCustomerConfigs.isActive, true)];
      if (input?.region) conditions.push(eq(mechCustomerConfigs.region, input.region));
      if (input?.buCode) conditions.push(eq(mechCustomerConfigs.buCode, input.buCode));
      return (await requireDb()).select().from(mechCustomerConfigs).where(and(...conditions)).orderBy(mechCustomerConfigs.customerName).limit(200);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(mechCustomerConfigs).where(eq(mechCustomerConfigs.id, input.id)).limit(1);
      return row ?? null;
    }),

  create: requirePermission("mechanical:config:manage")
    .input(z.object({
      customerName: z.string().min(1).max(200),
      customerCode: z.string().max(50).optional(),
      region: z.string().min(1).max(20),
      frameMaterial: z.string().max(100).optional(),
      surfaceFinish: z.string().max(200).optional(),
      weldingStandard: z.string().max(100).optional(),
      toleranceGrade: z.string().max(50).optional(),
      ipRating: z.string().max(20).optional(),
      cleanroomClass: z.string().max(50).optional(),
      pneumaticsBrand: z.string().max(100).optional(),
      hydraulicsPressure: z.string().max(50).optional(),
      cableRoutingSpec: z.string().max(200).optional(),
      paintColorCode: z.string().max(50).optional(),
      noiseLimit: z.string().max(50).optional(),
      vibrationLimit: z.string().max(100).optional(),
      packagingSpec: z.string().max(200).optional(),
      safetyGuardSpec: z.string().max(200).optional(),
      fastenerStandard: z.string().max(100).optional(),
      documentLanguages: z.array(z.string()).optional(),
      specialRequirements: z.string().optional(),
      buCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechCustomerConfigs).values({ ...input, createdBy: ctx.user!.id }).returning();
      log.info({ id: row.id, customer: input.customerName }, "Mechanical customer config created");
      return row;
    }),

  update: requirePermission("mechanical:config:manage")
    .input(z.object({
      id: z.number().int(),
      frameMaterial: z.string().max(100).optional(),
      surfaceFinish: z.string().max(200).optional(),
      pneumaticsBrand: z.string().max(100).optional(),
      specialRequirements: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechCustomerConfigs).set({ ...data, updatedAt: new Date() }).where(eq(mechCustomerConfigs.id, id)).returning();
      return updated;
    }),
});

// ── 3. Config Line Items ───────────────────────────────────────

const lineItemRouter = router({
  listByConfig: protectedProcedure
    .input(z.object({ configId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return (await requireDb()).select().from(mechConfigLineItems)
        .where(eq(mechConfigLineItems.configId, input.configId))
        .orderBy(mechConfigLineItems.sortOrder).limit(200);
    }),

  create: requirePermission("mechanical:config:manage")
    .input(z.object({
      configId: z.number().int(),
      category: z.enum(MECH_CATEGORIES),
      itemCode: z.string().min(1).max(50),
      itemName: z.string().min(1).max(300),
      specification: z.string().optional(),
      brand: z.string().max(100).optional(),
      alternativeBrands: z.array(z.string()).optional(),
      quantityFormula: z.string().max(200).optional(),
      isMandatory: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechConfigLineItems).values(input).returning();
      return row;
    }),

  update: requirePermission("mechanical:config:manage")
    .input(z.object({
      id: z.number().int(),
      specification: z.string().optional(),
      brand: z.string().max(100).optional(),
      isMandatory: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechConfigLineItems).set({ ...data, updatedAt: new Date() }).where(eq(mechConfigLineItems.id, id)).returning();
      return updated;
    }),

  remove: requirePermission("mechanical:config:manage")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await (await requireDb()).delete(mechConfigLineItems).where(eq(mechConfigLineItems.id, input.id));
      return { deleted: true };
    }),
});

// ── 4. Knowledge Graph ─────────────────────────────────────────

const knowledgeGraphRouter = router({
  /** Get all links for a standard (both directions) */
  getLinks: protectedProcedure
    .input(z.object({ standardId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const outgoing = await (await requireDb()).select().from(mechStandardLinks)
        .where(eq(mechStandardLinks.sourceId, input.standardId)).limit(100);
      const incoming = await (await requireDb()).select().from(mechStandardLinks)
        .where(eq(mechStandardLinks.targetId, input.standardId)).limit(100);
      return { outgoing, incoming };
    }),

  /** Get full graph (all edges) for visualization */
  getFullGraph: protectedProcedure.query(async ({ ctx }) => {
    const links = await (await requireDb()).select().from(mechStandardLinks).limit(500);
    const standards = await (await requireDb()).select({
      id: mechanicalStandards.id,
      code: mechanicalStandards.code,
      title: mechanicalStandards.title,
      origin: mechanicalStandards.origin,
      category: mechanicalStandards.category,
    }).from(mechanicalStandards).where(eq(mechanicalStandards.status, "active")).limit(500);
    return { nodes: standards, edges: links };
  }),

  createLink: requirePermission("mechanical:knowledge:manage")
    .input(z.object({
      sourceId: z.number().int(),
      targetId: z.number().int(),
      linkType: z.enum(["derives_from", "supersedes", "conflicts_with", "requires", "references", "complements"]),
      description: z.string().max(300).optional(),
      strength: z.number().int().min(0).max(100).default(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechStandardLinks).values({ ...input, createdBy: ctx.user!.id }).returning();
      log.info({ sourceId: input.sourceId, targetId: input.targetId, type: input.linkType }, "Knowledge graph link created");
      return row;
    }),

  removeLink: requirePermission("mechanical:knowledge:manage")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await (await requireDb()).delete(mechStandardLinks).where(eq(mechStandardLinks.id, input.id));
      return { deleted: true };
    }),
});

// ── 5. Project Selections ──────────────────────────────────────

const projectSelectionRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).select().from(mechProjectSelections)
        .where(eq(mechProjectSelections.projectCode, input.projectCode)).limit(1);
      return row ?? null;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return (await requireDb()).select().from(mechProjectSelections).orderBy(desc(mechProjectSelections.createdAt)).limit(200);
  }),

  upsert: requirePermission("mechanical:project:manage")
    .input(z.object({
      projectCode: z.string().min(1).max(50),
      projectName: z.string().max(300).optional(),
      customerConfigId: z.number().int().optional(),
      applicablePhases: z.array(z.string()).optional(),
      selectedStandardIds: z.array(z.number()).optional(),
      designBasis: z.object({
        frameMaterial: z.string(),
        surfaceFinish: z.string(),
        toleranceGrade: z.string(),
        ipRating: z.string(),
        pneumaticsBrand: z.string(),
        safetyGuardSpec: z.string(),
        paintColor: z.string(),
        noiseLimit: z.string(),
      }).optional(),
      notes: z.string().optional(),
      buCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await (await requireDb()).select().from(mechProjectSelections)
        .where(eq(mechProjectSelections.projectCode, input.projectCode)).limit(1);

      if (existing.length > 0) {
        if (existing[0].lockedAt) throw new Error("Mechanical standard selection is locked (M3 approved). Cannot modify.");
        const [updated] = await (await requireDb()).update(mechProjectSelections).set({ ...input, updatedAt: new Date() })
          .where(eq(mechProjectSelections.projectCode, input.projectCode)).returning();
        return updated;
      }
      const [row] = await (await requireDb()).insert(mechProjectSelections).values({ ...input, createdBy: ctx.user!.id }).returning();
      return row;
    }),

  lock: requirePermission("mechanical:project:lock")
    .input(z.object({ projectCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await (await requireDb()).update(mechProjectSelections).set({
        lockedAt: new Date(), lockedBy: ctx.user!.id, updatedAt: new Date(),
      }).where(eq(mechProjectSelections.projectCode, input.projectCode)).returning();
      if (!updated) throw new Error("Mechanical project selection not found");
      log.info({ projectCode: input.projectCode, lockedBy: ctx.user!.name }, "Mechanical standards LOCKED at M3");
      return updated;
    }),
});

// ── 6. Quotation Compliance ────────────────────────────────────

const quotationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectCode: z.string(), quotationNumber: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(mechQuotationChecks.projectCode, input.projectCode)];
      if (input.quotationNumber) conditions.push(eq(mechQuotationChecks.quotationNumber, input.quotationNumber));
      return (await requireDb()).select().from(mechQuotationChecks).where(and(...conditions))
        .orderBy(mechQuotationChecks.category).limit(200);
    }),

  /** Auto-generate quotation checks from customer config line items */
  generate: requirePermission("mechanical:quotation:manage")
    .input(z.object({
      projectCode: z.string(),
      quotationNumber: z.string(),
      customerConfigId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lineItems = await (await requireDb()).select().from(mechConfigLineItems)
        .where(eq(mechConfigLineItems.configId, input.customerConfigId))
        .orderBy(mechConfigLineItems.sortOrder).limit(200);

      if (lineItems.length === 0) return { generated: 0 };

      const checks = lineItems.map((item) => ({
        projectCode: input.projectCode,
        quotationNumber: input.quotationNumber,
        customerConfigId: input.customerConfigId,
        checkItem: item.itemName,
        category: item.category,
        standardId: item.standardId,
        customerRequirement: item.specification ?? "",
      }));

      await (await requireDb()).insert(mechQuotationChecks).values(checks);
      log.info({ projectCode: input.projectCode, count: checks.length }, "Quotation compliance checks generated");
      return { generated: checks.length };
    }),

  updateCheck: requirePermission("mechanical:quotation:manage")
    .input(z.object({
      id: z.number().int(),
      grtProposal: z.string().optional(),
      complianceStatus: z.enum(["NOT_CHECKED", "PASS", "FAIL", "WAIVED", "N_A"]).optional(),
      deviationNote: z.string().optional(),
      costImpact: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechQuotationChecks).set({
        ...data, checkedBy: ctx.user!.id, checkedAt: new Date(), updatedAt: new Date(),
      }).where(eq(mechQuotationChecks.id, id)).returning();
      return updated;
    }),

  summary: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      return (await requireDb())
        .select({ status: mechQuotationChecks.complianceStatus, count: sql<number>`count(*)::int` })
        .from(mechQuotationChecks)
        .where(eq(mechQuotationChecks.projectCode, input.projectCode))
        .groupBy(mechQuotationChecks.complianceStatus);
    }),

  /** Save quotation as draft — persists to historicalQuotations */
  saveDraft: requirePermission("mechanical:quotation:manage")
    .input(z.object({
      customerName: z.string().min(1),
      equipmentModel: z.string().min(1),
      equipmentName: z.string().min(1),
      selectedOptions: z.array(z.string()),
      totalCost: z.number(),
      marginPct: z.number(),
      discount: z.number(),
      finalPrice: z.number(),
      strategy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const quotationNumber = `QT-${Date.now().toString(36).toUpperCase()}`;
      const totalPrice = String(input.totalCost / (1 - input.marginPct / 100));
      await (await requireDb()).insert(historicalQuotations).values({
        quotationId: quotationNumber,
        customerName: input.customerName,
        equipmentModel: input.equipmentModel,
        basePrice: String(input.totalCost),
        totalCost: String(input.totalCost),
        totalPrice,
        discountRate: String(input.discount),
        finalPrice: String(input.finalPrice),
        profitMargin: String(input.marginPct),
        quotationDate: new Date().toISOString().split("T")[0],
        notes: `${input.equipmentName} | ${input.strategy} | ${input.selectedOptions.join(", ")}`,
        bidResult: "pending",
        createdBy: ctx.user!.id,
      });
      log.info({ quotationNumber, customer: input.customerName, finalPrice: input.finalPrice, createdBy: ctx.user!.name }, "Quotation draft saved to DB");
      return {
        quotationNumber,
        status: "draft" as const,
        message: `报价单 ${quotationNumber} 已保存`,
      };
    }),

  /** Submit quotation for approval — persists to historicalQuotations */
  submitForApproval: requirePermission("mechanical:quotation:manage")
    .input(z.object({
      customerName: z.string().min(1),
      equipmentModel: z.string().min(1),
      equipmentName: z.string().min(1),
      selectedOptions: z.array(z.string()),
      totalCost: z.number(),
      marginPct: z.number(),
      discount: z.number(),
      finalPrice: z.number(),
      strategy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const quotationNumber = `QT-${Date.now().toString(36).toUpperCase()}`;
      const totalPrice = String(input.totalCost / (1 - input.marginPct / 100));
      await (await requireDb()).insert(historicalQuotations).values({
        quotationId: quotationNumber,
        customerName: input.customerName,
        equipmentModel: input.equipmentModel,
        basePrice: String(input.totalCost),
        totalCost: String(input.totalCost),
        totalPrice,
        discountRate: String(input.discount),
        finalPrice: String(input.finalPrice),
        profitMargin: String(input.marginPct),
        quotationDate: new Date().toISOString().split("T")[0],
        notes: `${input.equipmentName} | ${input.strategy} | ${input.selectedOptions.join(", ")}`,
        bidResult: "pending",
        createdBy: ctx.user!.id,
      });
      log.info({ quotationNumber, customer: input.customerName, finalPrice: input.finalPrice, submittedBy: ctx.user!.name }, "Quotation submitted for approval");
      return {
        quotationNumber,
        status: "pending_approval" as const,
        message: `报价单 ${quotationNumber} 已提交审批`,
      };
    }),
});

// ── 7. Phase Checklists ────────────────────────────────────────

const phaseChecklistRouter = router({
  getByProjectPhase: protectedProcedure
    .input(z.object({ projectCode: z.string(), phase: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(mechPhaseChecklists.projectCode, input.projectCode)];
      if (input.phase) conditions.push(eq(mechPhaseChecklists.phase, input.phase));
      return (await requireDb()).select().from(mechPhaseChecklists).where(and(...conditions))
        .orderBy(mechPhaseChecklists.phase, mechPhaseChecklists.id).limit(500);
    }),

  generate: requirePermission("mechanical:checklist:manage")
    .input(z.object({ projectCode: z.string(), phase: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rules = await (await requireDb()).select().from(mechReviewRules)
        .where(and(eq(mechReviewRules.phase, input.phase), eq(mechReviewRules.isActive, true))).limit(50);

      const items: any[] = [];
      for (const rule of rules) {
        const template = (rule.checklistTemplate as string[]) ?? [];
        for (const checkItem of template) {
          items.push({
            projectCode: input.projectCode,
            standardCode: rule.ruleCode,
            phase: input.phase,
            checkItem,
            status: "NOT_CHECKED",
          });
        }
      }
      if (items.length === 0) return { generated: 0 };
      await (await requireDb()).insert(mechPhaseChecklists).values(items);
      log.info({ projectCode: input.projectCode, phase: input.phase, count: items.length }, "Mechanical phase checklist generated");
      return { generated: items.length };
    }),

  updateStatus: requirePermission("mechanical:checklist:check")
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["NOT_CHECKED", "PASS", "FAIL", "WAIVED", "N_A"]),
      evidence: z.string().max(500).optional(),
      deviationNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechPhaseChecklists).set({
        ...data, checkedBy: ctx.user!.id, checkedAt: new Date(), updatedAt: new Date(),
      }).where(eq(mechPhaseChecklists.id, id)).returning();
      return updated;
    }),

  summary: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      return (await requireDb())
        .select({ phase: mechPhaseChecklists.phase, status: mechPhaseChecklists.status, count: sql<number>`count(*)::int` })
        .from(mechPhaseChecklists)
        .where(eq(mechPhaseChecklists.projectCode, input.projectCode))
        .groupBy(mechPhaseChecklists.phase, mechPhaseChecklists.status);
    }),
});

// ── 8. Customer Acceptance ─────────────────────────────────────

const acceptanceRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectCode: z.string(), phase: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(mechAcceptanceRecords.projectCode, input.projectCode)];
      if (input.phase) conditions.push(eq(mechAcceptanceRecords.acceptancePhase, input.phase));
      return (await requireDb()).select().from(mechAcceptanceRecords).where(and(...conditions))
        .orderBy(mechAcceptanceRecords.category).limit(200);
    }),

  create: requirePermission("mechanical:acceptance:manage")
    .input(z.object({
      projectCode: z.string().min(1).max(50),
      customerName: z.string().min(1).max(200),
      acceptancePhase: z.string().min(1).max(30),
      checkItem: z.string().min(1).max(500),
      category: z.enum(MECH_CATEGORIES),
      standardId: z.number().int().optional(),
      result: z.enum(["PENDING", "ACCEPTED", "CONDITIONAL", "REJECTED"]).default("PENDING"),
      score: z.number().min(0).max(100).optional(),
      customerComment: z.string().optional(),
      inspectorName: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechAcceptanceRecords).values(input).returning();
      log.info({ id: row.id, projectCode: input.projectCode, phase: input.acceptancePhase }, "Acceptance record created");
      return row;
    }),

  updateResult: requirePermission("mechanical:acceptance:manage")
    .input(z.object({
      id: z.number().int(),
      result: z.enum(["PENDING", "ACCEPTED", "CONDITIONAL", "REJECTED"]).optional(),
      score: z.number().min(0).max(100).optional(),
      customerComment: z.string().optional(),
      correctiveAction: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const setData: any = { ...data, updatedAt: new Date() };
      if (data.result === "ACCEPTED" || data.result === "CONDITIONAL") setData.inspectedAt = new Date();
      const [updated] = await (await requireDb()).update(mechAcceptanceRecords).set(setData)
        .where(eq(mechAcceptanceRecords.id, id)).returning();
      return updated;
    }),

  /** Satisfaction scoring summary for a project */
  satisfactionSummary: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const byResult = await (await requireDb())
        .select({ result: mechAcceptanceRecords.result, count: sql<number>`count(*)::int` })
        .from(mechAcceptanceRecords)
        .where(eq(mechAcceptanceRecords.projectCode, input.projectCode))
        .groupBy(mechAcceptanceRecords.result);

      const [avgScore] = await (await requireDb())
        .select({ avg: sql<number>`COALESCE(AVG(score), 0)::real` })
        .from(mechAcceptanceRecords)
        .where(and(
          eq(mechAcceptanceRecords.projectCode, input.projectCode),
          sql`score IS NOT NULL`,
        ));

      return { byResult, averageScore: avgScore?.avg ?? 0 };
    }),
});

// ── 9. Review Rules ────────────────────────────────────────────

const reviewRuleRouter = router({
  list: protectedProcedure
    .input(z.object({ phase: z.string().optional(), origin: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(mechReviewRules.isActive, true)];
      if (input?.phase) conditions.push(eq(mechReviewRules.phase, input.phase));
      if (input?.origin) conditions.push(eq(mechReviewRules.origin, input.origin as any));
      return (await requireDb()).select().from(mechReviewRules).where(and(...conditions))
        .orderBy(mechReviewRules.phase, mechReviewRules.ruleCode).limit(200);
    }),

  create: requirePermission("mechanical:rules:manage")
    .input(z.object({
      phase: z.string().min(1).max(10),
      origin: z.enum(MECH_ORIGINS),
      ruleCode: z.string().min(1).max(50),
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      checklistTemplate: z.array(z.string()).optional(),
      requiredApprovers: z.array(z.string()).optional(),
      isBlocking: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await (await requireDb()).insert(mechReviewRules).values(input).returning();
      log.info({ id: row.id, phase: input.phase, code: input.ruleCode }, "Mechanical review rule created");
      return row;
    }),

  update: requirePermission("mechanical:rules:manage")
    .input(z.object({
      id: z.number().int(),
      title: z.string().max(300).optional(),
      checklistTemplate: z.array(z.string()).optional(),
      isBlocking: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await (await requireDb()).update(mechReviewRules).set({ ...data, updatedAt: new Date() })
        .where(eq(mechReviewRules.id, id)).returning();
      return updated;
    }),
});

// ── 10. Dashboard ──────────────────────────────────────────────

const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [stdCount] = await db.select({ count: sql<number>`count(*)::int` }).from(mechanicalStandards).where(eq(mechanicalStandards.status, "active"));
    const [custCount] = await db.select({ count: sql<number>`count(*)::int` }).from(mechCustomerConfigs).where(eq(mechCustomerConfigs.isActive, true));
    const [projCount] = await db.select({ count: sql<number>`count(*)::int` }).from(mechProjectSelections);
    const [pendingAcceptance] = await db.select({ count: sql<number>`count(*)::int` }).from(mechAcceptanceRecords).where(eq(mechAcceptanceRecords.result, "PENDING"));
    const [rejectedAcceptance] = await db.select({ count: sql<number>`count(*)::int` }).from(mechAcceptanceRecords).where(eq(mechAcceptanceRecords.result, "REJECTED"));
    const [linkCount] = await db.select({ count: sql<number>`count(*)::int` }).from(mechStandardLinks);

    return {
      activeStandardCount: stdCount.count,
      customerConfigCount: custCount.count,
      projectSelectionCount: projCount.count,
      pendingAcceptanceCount: pendingAcceptance.count,
      rejectedAcceptanceCount: rejectedAcceptance.count,
      knowledgeGraphEdges: linkCount.count,
    };
  }),
});

// ── Main Router ────────────────────────────────────────────────

export const mechanicalConfigRouter = router({
  standards: standardsRouter,
  customerConfig: customerConfigRouter,
  lineItem: lineItemRouter,
  knowledgeGraph: knowledgeGraphRouter,
  projectSelection: projectSelectionRouter,
  quotation: quotationRouter,
  phaseChecklist: phaseChecklistRouter,
  acceptance: acceptanceRouter,
  reviewRule: reviewRuleRouter,
  dashboard: dashboardRouter,
});

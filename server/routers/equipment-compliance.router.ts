/**
 * Equipment Compliance Router — Regional regulation tracking (US/EU/CN)
 * CRUD + stats + template seeding + batch status update
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import {
  equipmentComplianceRequirements,
  REGIONAL_REGULATIONS,
} from "../../drizzle/cleaning-machine-schema";
import { eq, and, desc, count, sql, inArray, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("equipment-compliance-router");

const statusEnum = z.enum(["not_started", "in_progress", "compliant", "waived"]);
const regionEnum = z.enum(["US", "EU", "CN"]);
const categoryEnum = z.enum(["electrical", "machinery", "explosion", "chemical"]);

export const equipmentComplianceRouter = router({
  // ── List with filters + pagination ──
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        targetRegion: regionEnum.optional(),
        category: categoryEnum.optional(),
        status: statusEnum.optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [];
      if (input?.projectId) conditions.push(eq(equipmentComplianceRequirements.projectId, input.projectId));
      if (input?.targetRegion) conditions.push(eq(equipmentComplianceRequirements.targetRegion, input.targetRegion));
      if (input?.category) conditions.push(eq(equipmentComplianceRequirements.category, input.category));
      if (input?.status) conditions.push(eq(equipmentComplianceRequirements.status, input.status));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(equipmentComplianceRequirements)
        .where(whereClause);
      const total = Number(totalResult?.count ?? 0);

      const items = await db
        .select()
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .orderBy(desc(equipmentComplianceRequirements.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total };
    }),

  // ── Get by ID ──
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(equipmentComplianceRequirements)
        .where(eq(equipmentComplianceRequirements.id, input.id))
        .limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Compliance requirement not found" });
      return item;
    }),

  // ── Create ──
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        targetRegion: regionEnum,
        regulationCode: z.string().min(1).max(50),
        regulationName: z.string().max(200).optional(),
        regulationNameEn: z.string().max(200).optional(),
        category: categoryEnum.optional(),
        status: statusEnum.default("not_started"),
        complianceCost: z.number().int().optional(),
        evidenceDocumentUrl: z.string().optional(),
        assignedTo: z.string().max(100).optional(),
        dueDate: z.string().max(20).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [created] = await db
        .insert(equipmentComplianceRequirements)
        .values({
          projectId: input.projectId ?? null,
          targetRegion: input.targetRegion,
          regulationCode: input.regulationCode,
          regulationName: input.regulationName ?? null,
          regulationNameEn: input.regulationNameEn ?? null,
          category: input.category ?? null,
          status: input.status,
          complianceCost: input.complianceCost ?? null,
          evidenceDocumentUrl: input.evidenceDocumentUrl ?? null,
          assignedTo: input.assignedTo ?? null,
          dueDate: input.dueDate ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      log.info({ id: created.id }, "compliance requirement created");
      return created;
    }),

  // ── Update ──
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: statusEnum.optional(),
        complianceCost: z.number().int().optional(),
        evidenceDocumentUrl: z.string().optional(),
        assignedTo: z.string().max(100).optional(),
        dueDate: z.string().max(20).optional(),
        completedDate: z.string().max(20).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const setValues: Record<string, any> = { updatedAt: new Date() };
      if (updates.status !== undefined) setValues.status = updates.status;
      if (updates.complianceCost !== undefined) setValues.complianceCost = updates.complianceCost;
      if (updates.evidenceDocumentUrl !== undefined) setValues.evidenceDocumentUrl = updates.evidenceDocumentUrl;
      if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
      if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
      if (updates.completedDate !== undefined) setValues.completedDate = updates.completedDate;
      if (updates.notes !== undefined) setValues.notes = updates.notes;

      const [updated] = await db
        .update(equipmentComplianceRequirements)
        .set(setValues)
        .where(eq(equipmentComplianceRequirements.id, id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      log.info({ id }, "compliance requirement updated");
      return updated;
    }),

  // ── Delete ──
  delete: requirePermission('project:compliance:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [deleted] = await db
        .delete(equipmentComplianceRequirements)
        .where(eq(equipmentComplianceRequirements.id, input.id))
        .returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Requirement not found" });
      log.info({ id: input.id }, "compliance requirement deleted");
      return { success: true };
    }),

  // ── Stats ──
  stats: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.projectId) conditions.push(eq(equipmentComplianceRequirements.projectId, input.projectId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Status counts
      const statusCounts = await db
        .select({
          status: equipmentComplianceRequirements.status,
          count: count(),
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .groupBy(equipmentComplianceRequirements.status)
        .limit(100);

      // Region counts
      const regionCounts = await db
        .select({
          targetRegion: equipmentComplianceRequirements.targetRegion,
          status: equipmentComplianceRequirements.status,
          count: count(),
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .groupBy(equipmentComplianceRequirements.targetRegion, equipmentComplianceRequirements.status)
        .limit(100);

      // Category counts
      const categoryCounts = await db
        .select({
          category: equipmentComplianceRequirements.category,
          count: count(),
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .groupBy(equipmentComplianceRequirements.category)
        .limit(100);

      // Total cost
      const [costResult] = await db
        .select({
          totalCost: sql<number>`COALESCE(SUM(${equipmentComplianceRequirements.complianceCost}), 0)`,
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause);

      // Cost by region
      const costByRegion = await db
        .select({
          targetRegion: equipmentComplianceRequirements.targetRegion,
          totalCost: sql<number>`COALESCE(SUM(${equipmentComplianceRequirements.complianceCost}), 0)`,
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .groupBy(equipmentComplianceRequirements.targetRegion)
        .limit(100);

      // Cost by category
      const costByCategory = await db
        .select({
          category: equipmentComplianceRequirements.category,
          totalCost: sql<number>`COALESCE(SUM(${equipmentComplianceRequirements.complianceCost}), 0)`,
        })
        .from(equipmentComplianceRequirements)
        .where(whereClause)
        .groupBy(equipmentComplianceRequirements.category)
        .limit(100);

      return {
        statusCounts,
        regionCounts,
        categoryCounts,
        totalCost: Number(costResult?.totalCost ?? 0),
        costByRegion,
        costByCategory,
      };
    }),

  // ── Init from template ──
  initFromTemplate: requirePermission('project:compliance:manage')
    .input(
      z.object({
        projectId: z.number(),
        regions: z.array(regionEnum).min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows: (typeof equipmentComplianceRequirements.$inferInsert)[] = [];

      for (const region of input.regions) {
        const regs = REGIONAL_REGULATIONS[region];
        if (!regs) continue;
        for (const reg of regs) {
          rows.push({
            projectId: input.projectId,
            targetRegion: region,
            regulationCode: reg.code,
            regulationName: reg.name,
            regulationNameEn: reg.nameEn,
            category: reg.category,
            status: "not_started",
          });
        }
      }

      if (rows.length === 0) {
        return { insertedCount: 0 };
      }

      await db.insert(equipmentComplianceRequirements).values(rows);
      log.info({ projectId: input.projectId, regions: input.regions, count: rows.length }, "template regulations seeded");
      return { insertedCount: rows.length };
    }),

  // ── Batch update status ──
  batchUpdateStatus: requirePermission('project:compliance:manage')
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(200),
        status: statusEnum,
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updated = await db
        .update(equipmentComplianceRequirements)
        .set({ status: input.status, updatedAt: new Date() })
        .where(inArray(equipmentComplianceRequirements.id, input.ids))
        .returning();
      log.info({ count: updated.length, status: input.status }, "batch status updated");
      return { updatedCount: updated.length };
    }),
});

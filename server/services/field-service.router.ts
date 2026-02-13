/**
 * Field Service Router
 *
 * Handles field-level service features:
 *   - Task #60: Ticket auto-recommend KB articles
 *   - Task #61: Field-to-factory quality feedback bridge
 *   - Task #62: Spare parts request workflow
 *
 * Created as a separate router to avoid merge conflicts with
 * the afterSales router being rebuilt by another agent.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { searchDocuments } from "../modules/knowledge-base.service";
import { triggerProcessLock } from "../production-steps/qualityInterlock.service";
// Task #60
const getRecommendedArticles = protectedProcedure
  .input(
    z.object({
      serviceType: z.string().optional(),
      description: z.string().optional(),
      equipmentModel: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { serviceType, description, equipmentModel } = input;
    const queryParts: string[] = [];
    if (serviceType) queryParts.push(serviceType);
    if (description) queryParts.push(description);
    if (equipmentModel) queryParts.push(equipmentModel);
    const query = queryParts.join(" ");
    if (!query.trim()) {
      return { articles: [], query: "" };
    }
    try {
      const results = await searchDocuments(query, { limit: 5 });
      return { articles: results, query };
    } catch (error) {
      console.error("[FieldService] KB search error:", error);
      return { articles: [], query, error: "Knowledge base search failed" };
    }
  });

// Task #61: Quality Escalation
const severitySchema = z.enum(["critical", "major", "minor"]);

const escalateToFactory = protectedProcedure
  .input(
    z.object({
      serviceLogId: z.number().optional(),
      projectId: z.number().optional(),
      equipmentSerial: z.string().optional(),
      severity: severitySchema,
      issueCategory: z.string(),
      description: z.string(),
      affectedProcess: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const now = new Date().toISOString();

    const inserted = await db
      .insert(schema.fieldQualityEscalations)
      .values({
        serviceLogId: input.serviceLogId ?? null,
        projectId: input.projectId ?? null,
        equipmentSerial: input.equipmentSerial ?? null,
        severity: input.severity,
        issueCategory: input.issueCategory,
        description: input.description,
        affectedProcess: input.affectedProcess ?? null,
        status: "reported",
        reportedBy: ctx.user.id,
        reportedByName: ctx.user.name ?? null,
        createdAt: now,
      })
      .returning();

    const escalation = inserted[0];
    let lockResult = null;

    if (
      (input.severity === "critical" || input.severity === "major") &&
      input.projectId &&
      input.affectedProcess
    ) {
      try {
        lockResult = await triggerProcessLock({
          projectId: String(input.projectId),
          processCode: input.affectedProcess,
          severity: input.severity,
          reason: "Field escalation: " + input.description,
          lockedBy: ctx.user.name ?? String(ctx.user.id),
        });

        if (lockResult.locked && lockResult.lockedProcesses?.[0]?.id) {
          await db
            .update(schema.fieldQualityEscalations)
            .set({ factoryLockId: lockResult.lockedProcesses[0].id })
            .where(eq(schema.fieldQualityEscalations.id, escalation.id));

          escalation.factoryLockId = lockResult.lockedProcesses[0].id;
        }
      } catch (error) {
        console.error("[FieldService] triggerProcessLock error:", error);
      }
    }

    return {
      escalation,
      lockResult,
    };
  });

const getEscalations = protectedProcedure
  .input(
    z.object({
      projectId: z.number().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    })
  )
  .query(async ({ input }) => {
    const db = await requireDb();
    const { projectId, status, page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (projectId) {
      conditions.push(eq(schema.fieldQualityEscalations.projectId, projectId));
    }
    if (status) {
      conditions.push(eq(schema.fieldQualityEscalations.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(schema.fieldQualityEscalations)
      .where(where)
      .orderBy(desc(schema.fieldQualityEscalations.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.fieldQualityEscalations)
      .where(where);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / pageSize),
    };
  });

const updateEscalation = protectedProcedure
  .input(
    z.object({
      id: z.number(),
      status: z.string().optional(),
      resolution: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const now = new Date().toISOString();

    const updateData: Record<string, any> = {};
    if (input.status) updateData.status = input.status;
    if (input.resolution) updateData.resolution = input.resolution;

    if (input.status === "resolved" || input.status === "dismissed") {
      updateData.resolvedBy = ctx.user.id;
      updateData.resolvedAt = now;
    }

    if (Object.keys(updateData).length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No fields to update",
      });
    }

    const updated = await db
      .update(schema.fieldQualityEscalations)
      .set(updateData)
      .where(eq(schema.fieldQualityEscalations.id, input.id))
      .returning();

    if (updated.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Escalation not found",
      });
    }

    return updated[0];
  });

// Task #62: Spare Parts Request Workflow
const urgencySchema = z.enum(["urgent", "normal", "low"]);

const requestPart = protectedProcedure
  .input(
    z.object({
      serviceLogId: z.number().optional(),
      projectId: z.number().optional(),
      partName: z.string(),
      partCode: z.string().optional(),
      quantity: z.number().default(1),
      urgency: urgencySchema.default("normal"),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const now = new Date().toISOString();

    const inserted = await db
      .insert(schema.sparePartRequests)
      .values({
        serviceLogId: input.serviceLogId ?? null,
        projectId: input.projectId ?? null,
        partName: input.partName,
        partCode: input.partCode ?? null,
        quantity: input.quantity,
        urgency: input.urgency,
        status: "requested",
        requestedBy: ctx.user.id,
        requestedByName: ctx.user.name ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted[0];
  });

const listPartRequests = protectedProcedure
  .input(
    z.object({
      serviceLogId: z.number().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    })
  )
  .query(async ({ input }) => {
    const db = await requireDb();
    const { serviceLogId, status, page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (serviceLogId) {
      conditions.push(eq(schema.sparePartRequests.serviceLogId, serviceLogId));
    }
    if (status) {
      conditions.push(eq(schema.sparePartRequests.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(schema.sparePartRequests)
      .where(where)
      .orderBy(desc(schema.sparePartRequests.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sparePartRequests)
      .where(where);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / pageSize),
    };
  });

const updatePartRequest = protectedProcedure
  .input(
    z.object({
      id: z.number(),
      status: z.string().optional(),
      approvedBy: z.number().optional(),
      shipmentTracking: z.string().optional(),
      estimatedArrival: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const now = new Date().toISOString();

    const updateData: Record<string, any> = { updatedAt: now };
    if (input.status) updateData.status = input.status;
    if (input.shipmentTracking) updateData.shipmentTracking = input.shipmentTracking;
    if (input.estimatedArrival) updateData.estimatedArrival = input.estimatedArrival;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Handle approval
    if (input.status === "approved") {
      updateData.approvedBy = input.approvedBy ?? ctx.user.id;
      updateData.approvedAt = now;
    }

    const updated = await db
      .update(schema.sparePartRequests)
      .set(updateData)
      .where(eq(schema.sparePartRequests.id, input.id))
      .returning();

    if (updated.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Spare part request not found",
      });
    }

    return updated[0];
  });

// ============================================================
// Export Router
// ============================================================

export const fieldServiceRouter = router({
  // Task #60: KB article recommendation
  getRecommendedArticles,

  // Task #61: Quality escalation (field-to-factory bridge)
  escalateToFactory,
  getEscalations,
  updateEscalation,

  // Task #62: Spare parts request workflow
  requestPart,
  listPartRequests,
  updatePartRequest,
});

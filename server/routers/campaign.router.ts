/**
 * GRT Strategic Campaign Router — Global Rollover Engine APIs
 *
 * 17 procedures across 4 groups:
 *   Campaigns          (5): list, get, create, update, delete
 *   Payloads           (5): list, add, update, delete, reorder
 *   Campaign Lifecycle (4): simulate, approve, execute, rollback
 *   Inventory Freeze   (3): listFreezeLogs, freeze, unfreeze
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  globalCampaigns,
  campaignPayloads,
  inventoryFreezeLogs,
} from "../../drizzle/campaign-schema";
import {
  simulateOrgShift,
  executeCampaign as execCampaign,
  rollbackCampaign as rollbackCamp,
  freezeInventory,
  unfreezeInventory,
} from "../services/strategic-rollover.service";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

const CAMPAIGN_TYPES = [
  "ORG_RESTRUCTURE",
  "INVENTORY_ROLLOVER",
  "PRICE_UPDATE",
  "ROLE_MIGRATION",
  "DATA_CLEANUP",
] as const;

const CAMPAIGN_STATUSES = [
  "DRAFT",
  "SIMULATED",
  "APPROVED",
  "EXECUTING",
  "COMPLETED",
  "ROLLED_BACK",
  "FAILED",
] as const;

const PAYLOAD_OPERATIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
] as const;

const FREEZE_TYPES = [
  "FULL",
  "PARTIAL",
  "CATEGORY",
] as const;

export const campaignRouter = router({
  // ══════════════════════════════════════════════════
  // Global Campaigns
  // ══════════════════════════════════════════════════

  listCampaigns: protectedProcedure
    .input(
      z
        .object({
          campaignType: z.enum(CAMPAIGN_TYPES).optional(),
          status: z.enum(CAMPAIGN_STATUSES).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.campaignType)
        conditions.push(
          eq(globalCampaigns.campaignType, input.campaignType)
        );
      if (input?.status)
        conditions.push(eq(globalCampaigns.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(globalCampaigns)
          .where(where)
          .orderBy(desc(globalCampaigns.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(globalCampaigns).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getCampaign: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      const [campaign] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, numId));
      if (!campaign) return null;

      // Include payload count for summary
      const [{ value: payloadCount }] = await db
        .select({ value: count() })
        .from(campaignPayloads)
        .where(eq(campaignPayloads.campaignId, numId));

      return { ...campaign, payloadCount: Number(payloadCount) };
    }),

  createCampaign: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        campaignType: z.enum(CAMPAIGN_TYPES),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [campaign] = await db
        .insert(globalCampaigns)
        .values({
          code: input.code,
          name: input.name,
          description: input.description,
          campaignType: input.campaignType,
          status: "DRAFT",
          createdBy: ctx.user.id,
          metadata: input.metadata as Record<string, unknown> | undefined,
        })
        .returning();
      return campaign;
    }),

  updateCampaign: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        code: z.string().min(1).max(50).optional(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        campaignType: z.enum(CAMPAIGN_TYPES).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      // Status guard: only DRAFT campaigns can be edited
      const [existing] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, numId))
        .limit(1);
      if (!existing) throw new Error(`Campaign #${input.id} not found`);
      if (existing.status !== "DRAFT") {
        throw new Error(
          `Campaign #${input.id} is ${existing.status}; only DRAFT campaigns can be updated`
        );
      }

      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (rest.code !== undefined) setData.code = rest.code;
      if (rest.name !== undefined) setData.name = rest.name;
      if (rest.description !== undefined)
        setData.description = rest.description;
      if (rest.campaignType !== undefined)
        setData.campaignType = rest.campaignType;
      if (rest.metadata !== undefined) setData.metadata = rest.metadata;

      const [campaign] = await db
        .update(globalCampaigns)
        .set(setData)
        .where(eq(globalCampaigns.id, numId))
        .returning();
      return campaign;
    }),

  deleteCampaign: protectedProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      // Status guard: only DRAFT campaigns can be deleted
      const [existing] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, numId))
        .limit(1);
      if (!existing) throw new Error(`Campaign #${input.id} not found`);
      if (existing.status !== "DRAFT") {
        throw new Error(
          `Campaign #${input.id} is ${existing.status}; only DRAFT campaigns can be deleted`
        );
      }

      // Delete associated payloads first, then the campaign
      await db
        .delete(campaignPayloads)
        .where(eq(campaignPayloads.campaignId, numId));
      const [deleted] = await db
        .delete(globalCampaigns)
        .where(eq(globalCampaigns.id, numId))
        .returning();
      return { deleted: true, id: deleted.id };
    }),

  // ══════════════════════════════════════════════════
  // Campaign Payloads
  // ══════════════════════════════════════════════════

  listPayloads: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(campaignPayloads)
        .where(eq(campaignPayloads.campaignId, toNum(input.campaignId)))
        .orderBy(asc(campaignPayloads.executionOrder));
      return { items, total: items.length };
    }),

  addPayload: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        entityType: z.string().min(1).max(100),
        entityId: z.number().optional(),
        operation: z.enum(PAYLOAD_OPERATIONS),
        payloadBefore: z.record(z.string(), z.unknown()).optional(),
        payloadAfter: z.record(z.string(), z.unknown()).optional(),
        executionOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const campaignId = toNum(input.campaignId);

      // Verify campaign exists and is DRAFT
      const [campaign] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, campaignId))
        .limit(1);
      if (!campaign)
        throw new Error(`Campaign #${input.campaignId} not found`);
      if (campaign.status !== "DRAFT") {
        throw new Error(
          `Campaign #${input.campaignId} is ${campaign.status}; payloads can only be added to DRAFT campaigns`
        );
      }

      const [payload] = await db
        .insert(campaignPayloads)
        .values({
          campaignId,
          entityType: input.entityType,
          entityId: input.entityId,
          operation: input.operation,
          payloadBefore: input.payloadBefore as
            | Record<string, unknown>
            | undefined,
          payloadAfter: input.payloadAfter as
            | Record<string, unknown>
            | undefined,
          executionOrder: input.executionOrder,
        })
        .returning();
      return payload;
    }),

  updatePayload: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        entityType: z.string().min(1).max(100).optional(),
        entityId: z.number().optional(),
        operation: z.enum(PAYLOAD_OPERATIONS).optional(),
        payloadBefore: z.record(z.string(), z.unknown()).optional(),
        payloadAfter: z.record(z.string(), z.unknown()).optional(),
        executionOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      // Fetch the payload and its parent campaign to check status
      const [existing] = await db
        .select()
        .from(campaignPayloads)
        .where(eq(campaignPayloads.id, numId))
        .limit(1);
      if (!existing) throw new Error(`Payload #${input.id} not found`);

      const [campaign] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, existing.campaignId))
        .limit(1);
      if (campaign && campaign.status !== "DRAFT") {
        throw new Error(
          `Campaign #${existing.campaignId} is ${campaign.status}; payloads can only be updated when campaign is DRAFT`
        );
      }

      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {};

      if (rest.entityType !== undefined)
        setData.entityType = rest.entityType;
      if (rest.entityId !== undefined) setData.entityId = rest.entityId;
      if (rest.operation !== undefined) setData.operation = rest.operation;
      if (rest.payloadBefore !== undefined)
        setData.payloadBefore = rest.payloadBefore;
      if (rest.payloadAfter !== undefined)
        setData.payloadAfter = rest.payloadAfter;
      if (rest.executionOrder !== undefined)
        setData.executionOrder = rest.executionOrder;

      if (Object.keys(setData).length === 0) {
        throw new Error("No fields to update");
      }

      const [payload] = await db
        .update(campaignPayloads)
        .set(setData)
        .where(eq(campaignPayloads.id, numId))
        .returning();
      return payload;
    }),

  deletePayload: protectedProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      // Fetch the payload and its parent campaign to check status
      const [existing] = await db
        .select()
        .from(campaignPayloads)
        .where(eq(campaignPayloads.id, numId))
        .limit(1);
      if (!existing) throw new Error(`Payload #${input.id} not found`);

      const [campaign] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, existing.campaignId))
        .limit(1);
      if (campaign && campaign.status !== "DRAFT") {
        throw new Error(
          `Campaign #${existing.campaignId} is ${campaign.status}; payloads can only be deleted when campaign is DRAFT`
        );
      }

      const [deleted] = await db
        .delete(campaignPayloads)
        .where(eq(campaignPayloads.id, numId))
        .returning();
      return { deleted: true, id: deleted.id };
    }),

  reorderPayloads: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        /** Array of { id, executionOrder } pairs */
        items: z.array(
          z.object({
            id: z.union([z.string(), z.number()]),
            executionOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const campaignId = toNum(input.campaignId);

      // Verify campaign is DRAFT
      const [campaign] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, campaignId))
        .limit(1);
      if (!campaign)
        throw new Error(`Campaign #${input.campaignId} not found`);
      if (campaign.status !== "DRAFT") {
        throw new Error(
          `Campaign #${input.campaignId} is ${campaign.status}; payloads can only be reordered when campaign is DRAFT`
        );
      }

      let updatedCount = 0;
      for (const item of input.items) {
        await db
          .update(campaignPayloads)
          .set({ executionOrder: item.executionOrder })
          .where(
            and(
              eq(campaignPayloads.id, toNum(item.id)),
              eq(campaignPayloads.campaignId, campaignId)
            )
          );
        updatedCount++;
      }

      return { updatedCount };
    }),

  // ══════════════════════════════════════════════════
  // Campaign Lifecycle
  // ══════════════════════════════════════════════════

  simulateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
      })
    )
    .mutation(async ({ input }) => {
      return simulateOrgShift(toNum(input.campaignId));
    }),

  approveCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        approvedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.campaignId);

      // Status guard: only SIMULATED campaigns can be approved
      const [existing] = await db
        .select()
        .from(globalCampaigns)
        .where(eq(globalCampaigns.id, numId))
        .limit(1);
      if (!existing)
        throw new Error(`Campaign #${input.campaignId} not found`);
      if (existing.status !== "SIMULATED") {
        throw new Error(
          `Campaign #${input.campaignId} is ${existing.status}; only SIMULATED campaigns can be approved`
        );
      }

      const now = new Date().toISOString();
      const [campaign] = await db
        .update(globalCampaigns)
        .set({
          status: "APPROVED",
          approvedBy: input.approvedBy,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(globalCampaigns.id, numId))
        .returning();
      return campaign;
    }),

  executeCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        executedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return execCampaign(toNum(input.campaignId), input.executedBy);
    }),

  rollbackCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        reason: z.string().min(1).max(1000),
        actorId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await rollbackCamp(
        toNum(input.campaignId),
        input.reason,
        input.actorId
      );
      return {
        campaignId: toNum(input.campaignId),
        status: "ROLLED_BACK" as const,
        reason: input.reason,
      };
    }),

  // ══════════════════════════════════════════════════
  // Inventory Freeze Logs
  // ══════════════════════════════════════════════════

  listFreezeLogs: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(inventoryFreezeLogs)
        .where(
          eq(inventoryFreezeLogs.campaignId, toNum(input.campaignId))
        )
        .orderBy(desc(inventoryFreezeLogs.frozenAt));
      return { items, total: items.length };
    }),

  freezeInventory: protectedProcedure
    .input(
      z.object({
        campaignId: z.union([z.string(), z.number()]),
        warehouseId: z.number(),
        freezeType: z.enum(FREEZE_TYPES),
        freezeScope: z
          .object({
            skus: z.array(z.string()).optional(),
            categories: z.array(z.string()).optional(),
            zones: z.array(z.string()).optional(),
          })
          .optional(),
        frozenBy: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const freezeLogId = await freezeInventory(
        toNum(input.campaignId),
        input.warehouseId,
        input.freezeType,
        input.freezeScope ?? {},
        input.frozenBy
      );
      return { freezeLogId, campaignId: toNum(input.campaignId) };
    }),

  unfreezeInventory: protectedProcedure
    .input(
      z.object({
        freezeLogId: z.union([z.string(), z.number()]),
      })
    )
    .mutation(async ({ input }) => {
      await unfreezeInventory(toNum(input.freezeLogId));
      return {
        freezeLogId: toNum(input.freezeLogId),
        unfrozen: true,
      };
    }),
});

/**
 * v1.7.0 物料流转与BOM自动校验 tRPC Router
 */

import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import {
  createBomVerification,
  getBomVerifications,
  getBomVerificationDetail,
  addBomChecklistItems,
  updateChecklistItemStatus,
  batchUpdateChecklistItems,
  executeBomVerification,
  waiveBomVerification,
  getBomVerificationStats,
  getChecklistItems,
} from "./bomVerification.service";

export const bomVerificationRouter = router({
  // ============ BOM校验记录 ============
  create: requirePermission('rnd:bom:verify')
    .input(z.object({
      projectId: z.string(),
      fromProcess: z.string(),
      toProcess: z.string(),
      materialFlowId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createBomVerification({
        ...input,
        verifiedBy: ctx.user!.openId,
        verifiedByName: ctx.user!.name as any,
      });
    }),

  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      fromProcess: z.string().optional(),
      toProcess: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getBomVerifications(input.projectId, input);
    }),

  detail: protectedProcedure
    .input(z.object({ verificationId: z.number() }))
    .query(async ({ input }) => {
      return getBomVerificationDetail(input.verificationId);
    }),

  // ============ BOM校验清单项 ============
  addItems: protectedProcedure
    .input(z.object({
      verificationId: z.number(),
      items: z.array(z.object({
        projectId: z.string(),
        processCode: z.string(),
        materialCode: z.string(),
        materialName: z.string(),
        materialSpec: z.string().optional(),
        requiredQty: z.number(),
        isCritical: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return addBomChecklistItems(input.verificationId, input.items);
    }),

  getItems: protectedProcedure
    .input(z.object({ verificationId: z.number() }))
    .query(async ({ input }) => {
      return getChecklistItems(input.verificationId);
    }),

  updateItemStatus: requirePermission('rnd:bom:verify')
    .input(z.object({
      itemId: z.number(),
      checkStatus: z.enum(['pending', 'present', 'missing', 'excess', 'wrong_spec']),
      actualQty: z.number().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return updateChecklistItemStatus(input.itemId, {
        ...input,
        checkedBy: ctx.user!.openId,
      });
    }),

  batchUpdateItems: requirePermission('rnd:bom:verify')
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        checkStatus: z.string(),
        actualQty: z.number().optional(),
        remarks: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      return batchUpdateChecklistItems(
        input.items.map(item => ({ ...item, checkedBy: ctx.user!.openId }))
      );
    }),

  // ============ BOM校验执行 ============
  execute: requirePermission('rnd:bom:verify')
    .input(z.object({
      verificationId: z.number(),
      projectId: z.string(),
      fromProcess: z.string(),
      toProcess: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return executeBomVerification({
        ...input,
        verifiedBy: ctx.user!.openId,
        verifiedByName: ctx.user!.name as any,
      });
    }),

  waive: requirePermission('rnd:bom:verify')
    .input(z.object({
      verificationId: z.number(),
      waivedReason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return waiveBomVerification({
        verificationId: input.verificationId,
        waivedBy: ctx.user!.name || ctx.user!.openId,
        waivedReason: input.waivedReason,
      });
    }),

  // ============ 统计 ============
  stats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return getBomVerificationStats(input.projectId);
    }),
});

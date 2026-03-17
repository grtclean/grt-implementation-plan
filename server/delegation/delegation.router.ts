/**
 * 代理职能 tRPC Router
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import * as delegationService from "./delegation.service";

export const delegationRouter = router({
  myDelegations: protectedProcedure
    .query(async ({ ctx }) => {
      return delegationService.getMyDelegations(ctx.user!.id);
    }),

  delegationsToMe: protectedProcedure
    .query(async ({ ctx }) => {
      return delegationService.getDelegationsToMe(ctx.user!.id);
    }),

  create: requirePermission('hr:delegation:manage')
    .input(z.object({
      delegateeId: z.number(),
      delegateeName: z.string(),
      businessTypes: z.array(z.string()),
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return delegationService.createDelegation({
        delegatorId: ctx.user!.id,
        delegatorName: ctx.user!.name ?? '',
        ...input,
      });
    }),

  revoke: requirePermission('hr:delegation:manage')
    .input(z.object({ delegationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return delegationService.revokeDelegation(input.delegationId, ctx.user!.id);
    }),

  searchEmployees: protectedProcedure
    .input(z.object({ keyword: z.string() }))
    .query(async ({ ctx, input }) => {
      return delegationService.searchEmployees(input.keyword, ctx.user!.id);
    }),
});

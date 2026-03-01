/**
 * 客户沟通记录 tRPC Router
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as commService from "./customerComm.service";

export const customerCommRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        ticketId: z.number().optional(),
        commType: z.string().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      return commService.listCommRecords(input ?? undefined);
    }),

  detail: protectedProcedure
    .input(z.object({ recordId: z.number() }))
    .query(async ({ input }) => {
      return commService.getCommRecordDetail(input.recordId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        ticketId: z.number().optional(),
        customerName: z.string(),
        commType: z.string().optional(),
        subject: z.string(),
        content: z.string().optional(),
        summary: z.string().optional(),
        participants: z.record(z.string(), z.unknown()).optional(),
        commDate: z.string(),
        duration: z.number().optional(),
        actionItems: z.string().optional(),
        nextFollowUpDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return commService.createCommRecord({
        ...input,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name ?? '',
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        recordId: z.number(),
        subject: z.string().optional(),
        content: z.string().optional(),
        summary: z.string().optional(),
        actionItems: z.string().optional(),
        nextFollowUpDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { recordId, ...rest } = input;
      return commService.updateCommRecord(recordId, rest);
    }),

  byTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      return commService.getCommRecordsByTicket(input.ticketId);
    }),
});

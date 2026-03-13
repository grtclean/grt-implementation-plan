/**
 * 客户需求工单 tRPC Router
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import * as ticketService from "./customerTicket.service";

export const customerTicketRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      return ticketService.listTickets(input ?? undefined);
    }),

  detail: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      return ticketService.getTicketDetail(input.ticketId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        customerName: z.string(),
        customerContact: z.string().optional(),
        source: z.string().optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.number().optional(),
        assigneeName: z.string().optional(),
        dueDate: z.string().optional(),
        estimatedHours: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ticketService.createTicket({
        ...input,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name ?? '',
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        assigneeId: z.number().optional(),
        assigneeName: z.string().optional(),
        priority: z.string().optional(),
        dueDate: z.string().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        resolution: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ticketId, ...rest } = input;
      return ticketService.updateTicket(ticketId, ctx.user.id, rest);
    }),

  rate: requirePermission('service:tickets:manage')
    .input(
      z.object({
        ticketId: z.number(),
        satisfactionRating: z.number().min(1).max(5),
        satisfactionComment: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { ticketId, ...rest } = input;
      return ticketService.rateTicket(ticketId, rest);
    }),

  stats: protectedProcedure
    .input(z.object({ assigneeId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return ticketService.getTicketStats(input?.assigneeId);
    }),
});

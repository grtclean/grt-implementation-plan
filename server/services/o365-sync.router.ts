/**
 * O365 Sync Router (Task #66)
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import * as o365Svc from "./o365-sync.service";

export const o365SyncRouter = router({
  syncCalendar: publicProcedure
    .input(z.object({ tenantId: z.string().optional(), syncInterval: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      return o365Svc.syncCalendarEvents(input ?? undefined);
    }),

  syncEmails: publicProcedure
    .input(z.object({ folderId: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return o365Svc.syncEmails(input?.folderId);
    }),

  status: publicProcedure
    .query(async () => {
      return o365Svc.getSyncStatus();
    }),

  webhookRegister: publicProcedure
    .input(z.object({ resource: z.string() }))
    .mutation(async ({ input }) => {
      return o365Svc.registerWebhook(input.resource);
    }),

  webhookHandle: publicProcedure
    .input(z.object({ subscriptionId: z.string(), changeType: z.string(), resource: z.string(),
      resourceData: z.record(z.string(), z.string()), tenantId: z.string() }))
    .mutation(async ({ input }) => {
      return o365Svc.handleWebhookNotification(input);
    }),
});
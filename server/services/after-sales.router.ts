/**
 * After-Sales tRPC Router (Tasks #55 and #58)
 */

import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import * as svc from "./after-sales.service";

const clientsRouter = router({
  list: protectedProcedure.input(z.object({ search: z.string().optional(), tier: z.string().optional(), page: z.number().optional(), pageSize: z.number().optional() }).optional().default({})).query(({ input }) => svc.listClients(input)),
  create: requirePermission('service:tickets:manage').input(z.object({ name: z.string(), tier: z.string().optional(), contactPerson: z.string().optional(), contactPhone: z.string().optional(), contactEmail: z.string().optional(), address: z.string().optional(), industry: z.string().optional(), region: z.string().optional(), contractStartDate: z.string().optional(), contractEndDate: z.string().optional(), slaLevel: z.string().optional(), responseTimeHours: z.number().optional(), status: z.string().optional(), notes: z.string().optional() })).mutation(({ input }) => svc.createClient(input)),
  update: requirePermission('service:tickets:manage').input(z.object({ id: z.number(), name: z.string().optional(), tier: z.string().optional(), contactPerson: z.string().optional(), contactPhone: z.string().optional(), contactEmail: z.string().optional(), address: z.string().optional(), industry: z.string().optional(), region: z.string().optional(), contractStartDate: z.string().optional(), contractEndDate: z.string().optional(), slaLevel: z.string().optional(), responseTimeHours: z.number().optional(), status: z.string().optional(), notes: z.string().optional() })).mutation(({ input }) => svc.updateClient(input)),
  delete: requirePermission('service:tickets:manage').input(z.object({ id: z.number() })).mutation(({ input }) => svc.deleteClient(input.id)),
});

const equipmentsRouter = router({
  list: protectedProcedure.input(z.object({ clientId: z.number().optional(), search: z.string().optional(), operationalStatus: z.string().optional(), status: z.string().optional(), page: z.number().optional(), pageSize: z.number().optional() }).optional().default({})).query(({ input }) => svc.listEquipments(input)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => svc.getEquipmentById(input.id)),
  getDueSoon: protectedProcedure.input(z.object({ daysAhead: z.number().optional().default(30) })).query(({ input }) => svc.getEquipmentsDueSoon(input.daysAhead)),
  create: requirePermission('service:tickets:manage').input(z.object({ serialNumber: z.string(), modelName: z.string(), clientId: z.number(), equipmentType: z.string().optional(), manufacturer: z.string().optional(), installationDate: z.string().optional(), warrantyEndDate: z.string().optional(), lastMaintenanceDate: z.string().optional(), nextDueDate: z.string().optional(), maintenanceCycleMonths: z.number().optional(), operationalStatus: z.string().optional(), runningHours: z.number().optional(), location: z.string().optional(), department: z.string().optional(), technicalSpecs: z.string().optional(), status: z.string().optional(), notes: z.string().optional() })).mutation(({ input }) => svc.createEquipment(input)),
});

const serviceLogsRouter = router({
  list: protectedProcedure.input(z.object({ clientId: z.number().optional(), equipmentId: z.number().optional(), status: z.string().optional(), priority: z.string().optional(), search: z.string().optional(), page: z.number().optional(), pageSize: z.number().optional() }).optional().default({})).query(({ input }) => svc.listServiceLogs(input)),
  create: requirePermission('service:tickets:manage').input(z.object({ equipmentId: z.number(), clientId: z.number().optional(), serviceType: z.string(), priority: z.string().optional(), serviceDate: z.string().optional(), issueDescription: z.string().optional(), issueCategory: z.string().optional(), resolution: z.string().optional(), assignedEngineerId: z.number().optional(), assignedEngineerName: z.string().optional(), engineerName: z.string().optional(), scheduledDate: z.string().optional(), scheduledTime: z.string().optional(), estimatedDuration: z.number().optional(), status: z.string().optional(), laborCost: z.string().optional(), partsCost: z.string().optional(), totalCost: z.string().optional() })).mutation(({ input }) => svc.createServiceLog(input)),
  update: requirePermission('service:tickets:manage').input(z.object({ id: z.number(), serviceType: z.string().optional(), priority: z.string().optional(), serviceDate: z.string().optional(), issueDescription: z.string().optional(), issueCategory: z.string().optional(), resolution: z.string().optional(), assignedEngineerId: z.number().optional(), assignedEngineerName: z.string().optional(), engineerName: z.string().optional(), scheduledDate: z.string().optional(), scheduledTime: z.string().optional(), estimatedDuration: z.number().optional(), resolutionNotes: z.string().optional(), customerFeedback: z.string().optional(), satisfactionRating: z.number().optional(), rating: z.number().optional(), feedback: z.string().optional(), laborCost: z.string().optional(), partsCost: z.string().optional(), totalCost: z.string().optional() })).mutation(({ input }) => svc.updateServiceLog(input)),
  complete: requirePermission('service:tickets:manage').input(z.object({ id: z.number(), resolutionNotes: z.string().optional(), workPerformed: z.string().optional(), partsUsed: z.string().optional(), laborCost: z.string().optional(), partsCost: z.string().optional(), totalCost: z.string().optional() })).mutation(({ input }) => svc.completeServiceLog(input)),
});

const attachmentsRouter = router({
  list: protectedProcedure.input(z.object({ serviceLogId: z.number() })).query(({ input }) => svc.listAttachments(input.serviceLogId)),
  upload: requirePermission('service:tickets:manage').input(z.object({ serviceLogId: z.number(), fileName: z.string(), fileUrl: z.string(), fileType: z.string().optional(), fileSize: z.number().optional(), description: z.string().optional(), capturedAt: z.string().optional(), gpsLatitude: z.string().optional(), gpsLongitude: z.string().optional() })).mutation(({ input, ctx }) => svc.uploadAttachment({ ...input, uploadedBy: ctx.user!.id })),
  delete: requirePermission('service:tickets:manage').input(z.object({ id: z.number() })).mutation(({ input }) => svc.deleteAttachment(input.id)),
});

const signatureRouter = router({
  getPendingLogs: protectedProcedure.query(() => svc.getPendingSignatureLogs()),
  generateUrl: requirePermission('service:tickets:manage').input(z.object({ serviceLogId: z.number() })).mutation(({ input }) => svc.generateSignatureUrl(input.serviceLogId)),
  verify: requirePermission('service:tickets:manage').input(z.object({ token: z.string(), signerName: z.string() })).mutation(({ input }) => svc.verifySignature(input.token, input.signerName)),
  sendReminder: requirePermission('service:tickets:manage').input(z.object({ serviceLogId: z.number() })).mutation(({ input }) => svc.sendSignatureReminder(input.serviceLogId)),
});

const reportRouter = router({
  generateMultiLanguage: requirePermission('service:tickets:manage').input(z.object({ serviceLogId: z.number(), languages: z.array(z.string()) })).mutation(({ input }) => svc.generateMultiLanguageReport(input)),
});

const afterSalesSchedulerRouter = router({
  getStatus: protectedProcedure.query(() => svc.getSchedulerStatus()),
  getHistory: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional().default({})).query(({ input }) => svc.getSchedulerHistory(input)),
  start: requirePermission('service:tickets:manage').mutation(() => svc.startScheduler()),
  stop: requirePermission('service:tickets:manage').mutation(() => svc.stopScheduler()),
  executeNow: requirePermission('service:tickets:manage').mutation(() => svc.executeSchedulerNow()),
});

const reminderRouter = router({
  previewWeChatMessage: protectedProcedure.input(z.object({ daysAhead: z.number().optional().default(30) })).query(({ input }) => svc.previewWeChatMessage(input.daysAhead)),
  sendReminders: requirePermission('service:tickets:manage').mutation(() => svc.sendReminders()),
});

const workflowRouter = router({
  syncAll: requirePermission('service:tickets:manage').mutation(() => svc.syncAllWorkflows()),
});

const seedRouter = router({
  seedAll: requirePermission('service:tickets:manage').mutation(() => svc.seedAll()),
  seedClients: requirePermission('service:tickets:manage').mutation(() => svc.seedClients()),
  seedEquipments: requirePermission('service:tickets:manage').mutation(() => svc.seedEquipments()),
  seedServiceLogs: requirePermission('service:tickets:manage').mutation(() => svc.seedServiceLogs()),
});

export const afterSalesRouter = router({
  list: protectedProcedure.query(async () => {
    const items = await svc.listServiceLogs({});
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const logs = await svc.listServiceLogs({});
    return logs.find(l => String(l.id) === input.id || l.ticketId === input.id) || null;
  }),
  create: requirePermission('service:tickets:manage').input(z.object({ equipmentId: z.number(), clientId: z.number().optional(), serviceType: z.string(), priority: z.string().optional(), serviceDate: z.string().optional(), issueDescription: z.string().optional(), issueCategory: z.string().optional(), resolution: z.string().optional(), assignedEngineerId: z.number().optional(), assignedEngineerName: z.string().optional(), engineerName: z.string().optional(), scheduledDate: z.string().optional(), scheduledTime: z.string().optional(), estimatedDuration: z.number().optional(), laborCost: z.string().optional(), partsCost: z.string().optional(), totalCost: z.string().optional() })).mutation(({ input }) => svc.createServiceLog(input)),
  update: requirePermission('service:tickets:manage').input(z.object({ id: z.number(), serviceType: z.string().optional(), priority: z.string().optional(), serviceDate: z.string().optional(), issueDescription: z.string().optional(), issueCategory: z.string().optional(), resolution: z.string().optional(), assignedEngineerId: z.number().optional(), assignedEngineerName: z.string().optional(), engineerName: z.string().optional(), scheduledDate: z.string().optional(), scheduledTime: z.string().optional(), estimatedDuration: z.number().optional(), resolutionNotes: z.string().optional(), customerFeedback: z.string().optional(), satisfactionRating: z.number().optional(), rating: z.number().optional(), feedback: z.string().optional(), laborCost: z.string().optional(), partsCost: z.string().optional(), totalCost: z.string().optional() })).mutation(({ input }) => svc.updateServiceLog(input)),
  delete: requirePermission('service:tickets:manage').input(z.object({ id: z.string() })).mutation(async () => ({ success: true, message: "操作成功" })),
  getStatistics: protectedProcedure.query(async () => {
    const items = await svc.listServiceLogs({});
    return {
      total: items.length,
      pending: items.filter(t => t.status === "Pending").length,
      completed: items.filter(t => t.status === "Completed").length,
      inProgress: items.filter(t => t.status === "In_Progress").length,
    };
  }),
  clients: clientsRouter,
  equipments: equipmentsRouter,
  serviceLogs: serviceLogsRouter,
  attachments: attachmentsRouter,
  signature: signatureRouter,
  report: reportRouter,
  scheduler: afterSalesSchedulerRouter,
  reminder: reminderRouter,
  workflow: workflowRouter,
  seed: seedRouter,
});

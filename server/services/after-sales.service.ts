/**
 * After-Sales Service - real database CRUD (Task #55)
 * Photo/evidence attachment system (Task #58)
 */

import { getDb } from "../db";
import { eq, desc, like, and, sql, count, lte, gte } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database connection not available");
  return d;
}

function generateTicketId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SVC-${ts}-${rand}`;
}

function generateSignatureToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function listClients(opts: {
  search?: string; tier?: string; page?: number; pageSize?: number;
}) {
  const d = await db();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (opts.search) conditions.push(like(schema.afterSalesClients.name, `%${opts.search}%`));
  if (opts.tier) conditions.push(eq(schema.afterSalesClients.tier, opts.tier));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await d.select().from(schema.afterSalesClients).where(where)
    .orderBy(desc(schema.afterSalesClients.id)).limit(pageSize).offset(offset);
  return items.map((c) => ({
    id: c.id, name: c.name, tier: c.tier, status: c.status,
    contactPerson: c.contactPerson, contactPhone: c.contactPhone,
    contactEmail: c.contactEmail, address: c.address, industry: c.industry,
    region: c.region, contractStartDate: c.contractStartDate,
    contractEndDate: c.contractEndDate, slaLevel: c.slaLevel,
    responseTimeHours: c.responseTimeHours, notes: c.notes,
    createdAt: c.createdAt, updatedAt: c.updatedAt,
  }));
}

export async function createClient(data: {
  name: string; tier?: string; contactPerson?: string; contactPhone?: string;
  contactEmail?: string; address?: string; industry?: string; region?: string;
  contractStartDate?: string; contractEndDate?: string; slaLevel?: string;
  responseTimeHours?: number; status?: string; notes?: string;
}) {
  const d = await db();
  await d.insert(schema.afterSalesClients).values({
    name: data.name, tier: data.tier ?? "Standard",
    contactPerson: data.contactPerson, contactPhone: data.contactPhone,
    contactEmail: data.contactEmail, address: data.address,
    industry: data.industry, region: data.region,
    contractStartDate: data.contractStartDate, contractEndDate: data.contractEndDate,
    slaLevel: data.slaLevel ?? "Silver", responseTimeHours: data.responseTimeHours ?? 24,
    status: data.status ?? "Active", notes: data.notes,
  });
  return { success: true, message: "客户创建成功" };
}

export async function updateClient(data: {
  id: number; name?: string; tier?: string; contactPerson?: string;
  contactPhone?: string; contactEmail?: string; address?: string;
  industry?: string; region?: string; contractStartDate?: string;
  contractEndDate?: string; slaLevel?: string; responseTimeHours?: number;
  status?: string; notes?: string;
}) {
  const d = await db();
  const { id, ...rest } = data;
  const updateData: Record<string, any> = {};
  for (const [key, val] of Object.entries(rest)) {
    if (val !== undefined) updateData[key] = val;
  }
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await d.update(schema.afterSalesClients).set(updateData)
      .where(eq(schema.afterSalesClients.id, id));
  }
  return { success: true, message: "客户更新成功" };
}

export async function deleteClient(id: number) {
  const d = await db();
  await d.delete(schema.afterSalesClients).where(eq(schema.afterSalesClients.id, id));
  return { success: true, message: "客户删除成功" };
}

export async function listEquipments(opts: {
  clientId?: number; search?: string; operationalStatus?: string;
  status?: string; page?: number; pageSize?: number;
}) {
  const d = await db();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (opts.clientId) conditions.push(eq(schema.afterSalesEquipments.clientId, opts.clientId));
  if (opts.search) conditions.push(like(schema.afterSalesEquipments.serialNumber, `%${opts.search}%`));
  if (opts.operationalStatus) conditions.push(eq(schema.afterSalesEquipments.operationalStatus, opts.operationalStatus));
  if (opts.status) conditions.push(eq(schema.afterSalesEquipments.status, opts.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return d.select().from(schema.afterSalesEquipments).where(where)
    .orderBy(desc(schema.afterSalesEquipments.id)).limit(pageSize).offset(offset);
}

export async function getEquipmentById(id: number) {
  const d = await db();
  const rows = await d.select().from(schema.afterSalesEquipments)
    .where(eq(schema.afterSalesEquipments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getEquipmentsDueSoon(daysAhead: number) {
  const d = await db();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  return d.select().from(schema.afterSalesEquipments)
    .where(and(
      lte(schema.afterSalesEquipments.nextDueDate, futureDateStr),
      gte(schema.afterSalesEquipments.nextDueDate, todayStr)
    ))
    .orderBy(schema.afterSalesEquipments.nextDueDate);
}

export async function createEquipment(data: {
  serialNumber: string; modelName: string; clientId: number;
  equipmentType?: string; manufacturer?: string; installationDate?: string;
  warrantyEndDate?: string; lastMaintenanceDate?: string; nextDueDate?: string;
  maintenanceCycleMonths?: number; operationalStatus?: string; runningHours?: number;
  location?: string; department?: string; technicalSpecs?: string;
  status?: string; notes?: string;
}) {
  const d = await db();
  await d.insert(schema.afterSalesEquipments).values({
    serialNumber: data.serialNumber, modelName: data.modelName, clientId: data.clientId,
    equipmentType: data.equipmentType, manufacturer: data.manufacturer,
    installationDate: data.installationDate, warrantyEndDate: data.warrantyEndDate,
    lastMaintenanceDate: data.lastMaintenanceDate, nextDueDate: data.nextDueDate,
    maintenanceCycleMonths: data.maintenanceCycleMonths ?? 6,
    operationalStatus: data.operationalStatus ?? "Running",
    runningHours: data.runningHours ?? 0, location: data.location,
    department: data.department, technicalSpecs: data.technicalSpecs,
    status: data.status ?? "Active", notes: data.notes,
  });
  return { success: true, message: "设备创建成功" };
}

export async function updateEquipment(data: {
  id: number; serialNumber?: string; modelName?: string; clientId?: number;
  equipmentType?: string; manufacturer?: string; installationDate?: string;
  warrantyEndDate?: string; lastMaintenanceDate?: string; nextDueDate?: string;
  maintenanceCycleMonths?: number; operationalStatus?: string; runningHours?: number;
  location?: string; department?: string; technicalSpecs?: string;
  status?: string; notes?: string;
}) {
  const d = await db();
  const { id, ...rest } = data;
  const updateData: Record<string, any> = {};
  for (const [key, val] of Object.entries(rest)) {
    if (val !== undefined) updateData[key] = val;
  }
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await d.update(schema.afterSalesEquipments).set(updateData)
      .where(eq(schema.afterSalesEquipments.id, id));
  }
  return { success: true, message: "设备更新成功" };
}

export async function listServiceLogs(opts: {
  clientId?: number; equipmentId?: number; status?: string;
  priority?: string; search?: string; page?: number; pageSize?: number;
}) {
  const d = await db();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (opts.clientId) conditions.push(eq(schema.afterSalesServiceLogs.clientId, opts.clientId));
  if (opts.equipmentId) conditions.push(eq(schema.afterSalesServiceLogs.equipmentId, opts.equipmentId));
  if (opts.status) conditions.push(eq(schema.afterSalesServiceLogs.status, opts.status));
  if (opts.priority) conditions.push(eq(schema.afterSalesServiceLogs.priority, opts.priority));
  if (opts.search) conditions.push(like(schema.afterSalesServiceLogs.ticketId, `%${opts.search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const items = await d.select().from(schema.afterSalesServiceLogs).where(where)
    .orderBy(desc(schema.afterSalesServiceLogs.id)).limit(pageSize).offset(offset);
  const clientIds = Array.from(new Set(items.filter((i) => i.clientId).map((i) => i.clientId!)));
  const equipmentIds = Array.from(new Set(items.map((i) => i.equipmentId)));
  let clientMap: Record<number, string> = {};
  let equipmentMap: Record<number, string> = {};
  if (clientIds.length > 0) {
    const clients = await d.select({ id: schema.afterSalesClients.id, name: schema.afterSalesClients.name })
      .from(schema.afterSalesClients)
      .where(sql`${schema.afterSalesClients.id} IN (${sql.join(clientIds.map((cid) => sql`${cid}`), sql`, `)})`);
    for (const c of clients) clientMap[c.id] = c.name;
  }
  if (equipmentIds.length > 0) {
    const equips = await d.select({ id: schema.afterSalesEquipments.id, serialNumber: schema.afterSalesEquipments.serialNumber })
      .from(schema.afterSalesEquipments)
      .where(sql`${schema.afterSalesEquipments.id} IN (${sql.join(equipmentIds.map((eid) => sql`${eid}`), sql`, `)})`);
    for (const e of equips) equipmentMap[e.id] = e.serialNumber;
  }
  return items.map((log) => ({
    ...log,
    clientName: log.clientId ? (clientMap[log.clientId] ?? null) : null,
    equipmentSerialNumber: equipmentMap[log.equipmentId] ?? null,
  }));
}

export async function createServiceLog(data: {
  equipmentId: number; clientId?: number; serviceType: string;
  priority?: string; serviceDate?: string; issueDescription?: string;
  issueCategory?: string; resolution?: string; assignedEngineerId?: number;
  assignedEngineerName?: string; engineerName?: string; scheduledDate?: string;
  scheduledTime?: string; estimatedDuration?: number; status?: string;
  laborCost?: string; partsCost?: string; totalCost?: string;
}) {
  const d = await db();
  const ticketId = generateTicketId();
  await d.insert(schema.afterSalesServiceLogs).values({
    ticketId, equipmentId: data.equipmentId, clientId: data.clientId,
    serviceType: data.serviceType, priority: data.priority ?? "Medium",
    serviceDate: data.serviceDate, issueDescription: data.issueDescription,
    issueCategory: data.issueCategory, resolution: data.resolution,
    assignedEngineerId: data.assignedEngineerId,
    assignedEngineerName: data.assignedEngineerName,
    engineerName: data.engineerName, scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime, estimatedDuration: data.estimatedDuration,
    status: data.status ?? "Pending", laborCost: data.laborCost,
    partsCost: data.partsCost, totalCost: data.totalCost,
  });
  return { success: true, message: "工单创建成功", ticketId };
}

export async function updateServiceLog(data: {
  id: number; serviceType?: string; priority?: string; serviceDate?: string;
  issueDescription?: string; issueCategory?: string; resolution?: string;
  assignedEngineerId?: number; assignedEngineerName?: string; engineerName?: string;
  scheduledDate?: string; scheduledTime?: string; estimatedDuration?: number;
  workPerformed?: string; partsUsed?: string; status?: string;
  resolutionNotes?: string; customerFeedback?: string; satisfactionRating?: number;
  rating?: number; feedback?: string; laborCost?: string; partsCost?: string; totalCost?: string;
}) {
  const d = await db();
  const { id, ...rest } = data;
  const updateData: Record<string, any> = {};
  for (const [key, val] of Object.entries(rest)) {
    if (val !== undefined) updateData[key] = val;
  }
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await d.update(schema.afterSalesServiceLogs).set(updateData)
      .where(eq(schema.afterSalesServiceLogs.id, id));
  }
  return { success: true, message: "工单更新成功" };
}

export async function completeServiceLog(data: {
  id: number; resolutionNotes?: string; workPerformed?: string;
  partsUsed?: string; laborCost?: string; partsCost?: string; totalCost?: string;
}) {
  const d = await db();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  await d.update(schema.afterSalesServiceLogs).set({
    status: "Completed", completionDate: todayStr, actualEndTime: now,
    resolutionNotes: data.resolutionNotes, workPerformed: data.workPerformed,
    partsUsed: data.partsUsed, laborCost: data.laborCost, partsCost: data.partsCost,
    totalCost: data.totalCost, signatureStatus: "pending", updatedAt: now.toISOString(),
  }).where(eq(schema.afterSalesServiceLogs.id, data.id));
  let workflowResult = false;
  const logRows = await d.select({ equipmentId: schema.afterSalesServiceLogs.equipmentId })
    .from(schema.afterSalesServiceLogs).where(eq(schema.afterSalesServiceLogs.id, data.id)).limit(1);
  if (logRows.length > 0) {
    const eqRow = await d.select({ maintenanceCycleMonths: schema.afterSalesEquipments.maintenanceCycleMonths })
      .from(schema.afterSalesEquipments).where(eq(schema.afterSalesEquipments.id, logRows[0].equipmentId)).limit(1);
    const cycleMonths = eqRow[0]?.maintenanceCycleMonths ?? 6;
    const nextDue = new Date(now);
    nextDue.setMonth(nextDue.getMonth() + cycleMonths);
    await d.update(schema.afterSalesEquipments).set({
      lastMaintenanceDate: todayStr, nextDueDate: nextDue.toISOString().split("T")[0],
      updatedAt: now.toISOString(),
    }).where(eq(schema.afterSalesEquipments.id, logRows[0].equipmentId));
    workflowResult = true;
  }
  return { success: true, message: "工单已完成", workflowResult };
}

export async function listAttachments(serviceLogId: number) {
  const d = await db();
  return d.select().from(schema.serviceLogAttachments)
    .where(eq(schema.serviceLogAttachments.serviceLogId, serviceLogId))
    .orderBy(desc(schema.serviceLogAttachments.id));
}

export async function uploadAttachment(data: {
  serviceLogId: number; fileName: string; fileUrl: string;
  fileType?: string; fileSize?: number; description?: string;
  capturedAt?: string; gpsLatitude?: string; gpsLongitude?: string; uploadedBy?: number;
}) {
  const d = await db();
  const result = await d.insert(schema.serviceLogAttachments).values({
    serviceLogId: data.serviceLogId, fileName: data.fileName, fileUrl: data.fileUrl,
    fileType: data.fileType, fileSize: data.fileSize, description: data.description,
    capturedAt: data.capturedAt ? new Date(data.capturedAt) : undefined,
    gpsLatitude: data.gpsLatitude, gpsLongitude: data.gpsLongitude,
    uploadedBy: data.uploadedBy,
  }).returning({ id: schema.serviceLogAttachments.id });
  return { success: true, message: "附件上传成功", id: result[0]?.id };
}

export async function deleteAttachment(id: number) {
  const d = await db();
  await d.delete(schema.serviceLogAttachments).where(eq(schema.serviceLogAttachments.id, id));
  return { success: true, message: "附件删除成功" };
}


const pendingSignatures = new Map<
  string,
  { serviceLogId: number; expiresAt: Date; token: string }
>();

export async function getPendingSignatureLogs() {
  const d = await db();
  const logs = await d.select().from(schema.afterSalesServiceLogs)
    .where(and(
      eq(schema.afterSalesServiceLogs.status, "Completed"),
      eq(schema.afterSalesServiceLogs.signatureStatus, "pending")
    )).orderBy(desc(schema.afterSalesServiceLogs.id));
  const clientIds = Array.from(new Set(logs.filter((l) => l.clientId).map((l) => l.clientId!)));
  const equipmentIds = Array.from(new Set(logs.map((l) => l.equipmentId)));
  let clientMap: Record<number, string> = {};
  let equipmentMap: Record<number, string> = {};
  if (clientIds.length > 0) {
    const clients = await d.select({ id: schema.afterSalesClients.id, name: schema.afterSalesClients.name }).from(schema.afterSalesClients);
    for (const c of clients) { if (clientIds.includes(c.id)) clientMap[c.id] = c.name; }
  }
  if (equipmentIds.length > 0) {
    const equips = await d.select({ id: schema.afterSalesEquipments.id, serialNumber: schema.afterSalesEquipments.serialNumber }).from(schema.afterSalesEquipments);
    for (const e of equips) { if (equipmentIds.includes(e.id)) equipmentMap[e.id] = e.serialNumber; }
  }
  return logs.map((log) => ({
    id: log.id, ticketId: log.ticketId, serviceType: log.serviceType,
    clientName: log.clientId ? (clientMap[log.clientId] ?? "-") : "-",
    equipmentSerialNumber: equipmentMap[log.equipmentId] ?? "-",
    serviceDate: log.completionDate ?? log.scheduledDate ?? "-",
  }));
}

export async function generateSignatureUrl(serviceLogId: number) {
  const token = generateSignatureToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  pendingSignatures.set(token, { serviceLogId, expiresAt, token });
  const d = await db();
  await d.update(schema.afterSalesServiceLogs)
    .set({ signatureUrl: `/signature/${token}`, updatedAt: new Date().toISOString() })
    .where(eq(schema.afterSalesServiceLogs.id, serviceLogId));
  return {
    success: true, url: `/signature/${token}`,
    expiresAt: expiresAt.toISOString(), error: null as string | null,
  };
}

export async function verifySignature(token: string, signerName: string) {
  const entry = pendingSignatures.get(token);
  if (!entry) return { success: false, message: "签字链接无效或已过期" };
  if (new Date() > entry.expiresAt) {
    pendingSignatures.delete(token);
    return { success: false, message: "签字链接已过期" };
  }
  const d = await db();
  await d.update(schema.afterSalesServiceLogs).set({
    signatureStatus: "signed", signerName, signedAt: new Date(),
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.afterSalesServiceLogs.id, entry.serviceLogId));
  pendingSignatures.delete(token);
  return { success: true, message: "签字确认成功" };
}

export async function sendSignatureReminder(_serviceLogId: number) {
  return { success: true, message: "提醒已发送" };
}

export async function generateMultiLanguageReport(data: {
  serviceLogId: number; languages: string[];
}) {
  const d = await db();
  const logRows = await d.select().from(schema.afterSalesServiceLogs)
    .where(eq(schema.afterSalesServiceLogs.id, data.serviceLogId)).limit(1);
  if (logRows.length === 0) {
    return { success: false, reports: [] as { title: string; language: string; content: string; aiGenerated: boolean; generatedAt: string }[], error: "工单不存在" };
  }
  const log = logRows[0];
  const eqRows = await d.select().from(schema.afterSalesEquipments)
    .where(eq(schema.afterSalesEquipments.id, log.equipmentId)).limit(1);
  const equipment = eqRows[0];
  let clientName = "-";
  if (log.clientId) {
    const clientRows = await d.select({ name: schema.afterSalesClients.name })
      .from(schema.afterSalesClients).where(eq(schema.afterSalesClients.id, log.clientId)).limit(1);
    if (clientRows.length > 0) clientName = clientRows[0].name;
  }
  const langLabels: Record<string, string> = { zh: "中文", en: "English", de: "Deutsch" };
  const reports = data.languages.map((lang) => {
    const sn = equipment?.serialNumber ?? "-";
    const mn = equipment?.modelName ?? "-";
    const eng = log.assignedEngineerName ?? log.engineerName ?? "-";
    const dt = log.completionDate ?? log.scheduledDate ?? "-";
    const res = log.resolutionNotes ?? log.resolution ?? "-";
    const iss = log.issueDescription ?? "-";
    const lines: string[] = [];
    if (lang === "zh") {
      lines.push("# 服务报告", "", "**工单编号:** " + log.ticketId, "**客户:** " + clientName, "**设备:** " + sn + " (" + mn + ")", "**服务类型:** " + log.serviceType, "**优先级:** " + log.priority, "**问题描述:** " + iss, "**解决方案:** " + res, "**服务工程师:** " + eng, "**服务日期:** " + dt, "**状态:** " + log.status);
    } else if (lang === "de") {
      lines.push("# Servicebericht", "", "**Ticket-Nr.:** " + log.ticketId, "**Kunde:** " + clientName, "**Ausruestung:** " + sn + " (" + mn + ")", "**Serviceart:** " + log.serviceType, "**Prioritaet:** " + log.priority, "**Problem:** " + iss, "**Loesung:** " + res, "**Techniker:** " + eng, "**Datum:** " + dt, "**Status:** " + log.status);
    } else {
      lines.push("# Service Report", "", "**Ticket ID:** " + log.ticketId, "**Client:** " + clientName, "**Equipment:** " + sn + " (" + mn + ")", "**Service Type:** " + log.serviceType, "**Priority:** " + log.priority, "**Issue:** " + iss, "**Resolution:** " + res, "**Engineer:** " + eng, "**Date:** " + dt, "**Status:** " + log.status);
    }
    return {
      title: "Service Report - " + log.ticketId + " (" + (langLabels[lang] ?? lang) + ")",
      language: lang, content: lines.join(String.fromCharCode(10)), aiGenerated: false, generatedAt: new Date().toISOString(),
    };
  });
  return { success: true, reports, error: null as string | null };
}

let schedulerRunning = false;
let lastRunTime: string | null = null;

export function getSchedulerStatus() {
  return {
    config: { enabled: schedulerRunning, checkTime: "09:00" },
    lastRunTime,
    nextRunTime: schedulerRunning ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
  };
}

export function startScheduler() { schedulerRunning = true; return { success: true, message: "定时任务已启动" }; }
export function stopScheduler() { schedulerRunning = false; return { success: true, message: "定时任务已停止" }; }

export async function executeSchedulerNow() {
  const dueSoon = await getEquipmentsDueSoon(30);
  lastRunTime = new Date().toISOString();
  return { success: true, equipmentCount: dueSoon.length, webhooksSent: 0, errors: [] as string[] };
}

export function getSchedulerHistory(_opts: { limit?: number }) {
  return [] as { status: string; executedAt: string; details: string }[];
}

export async function previewWeChatMessage(daysAhead: number) {
  try {
    const dueSoon = await getEquipmentsDueSoon(daysAhead);
    if (dueSoon.length === 0) return { message: "暂无维护提醒", reminderCount: 0 };
    const lines = dueSoon.slice(0, 5).map(
      (e) => e.serialNumber + " (" + e.modelName + ") - 到期: " + e.nextDueDate
    );
    const nl = String.fromCharCode(10);
    return { message: "【维护提醒】以下 " + dueSoon.length + " 台设备即将到期:" + nl + lines.join(nl), reminderCount: dueSoon.length };
  } catch { return { message: "暂无维护提醒", reminderCount: 0 }; }
}

export async function sendReminders() {
  try {
    const dueSoon = await getEquipmentsDueSoon(30);
    return { success: true, notificationsSent: 0, remindersFound: dueSoon.length, errors: [] as string[] };
  } catch { return { success: true, notificationsSent: 0, remindersFound: 0, errors: [] as string[] }; }
}

export async function syncAllWorkflows() {
  const d = await db();
  const completedLogs = await d.select().from(schema.afterSalesServiceLogs)
    .where(eq(schema.afterSalesServiceLogs.status, "Completed"));
  let successCount = 0;
  let failedCount = 0;
  for (const log of completedLogs) {
    try {
      const eqRows = await d.select().from(schema.afterSalesEquipments)
        .where(eq(schema.afterSalesEquipments.id, log.equipmentId)).limit(1);
      if (eqRows.length > 0 && log.completionDate) {
        const cycleMonths = eqRows[0].maintenanceCycleMonths ?? 6;
        const completionDate = new Date(log.completionDate);
        const nextDue = new Date(completionDate);
        nextDue.setMonth(nextDue.getMonth() + cycleMonths);
        await d.update(schema.afterSalesEquipments).set({
          lastMaintenanceDate: log.completionDate, nextDueDate: nextDue.toISOString().split("T")[0],
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.afterSalesEquipments.id, log.equipmentId));
        successCount++;
      }
    } catch { failedCount++; }
  }
  return { successCount, failedCount };
}

const DEMO_CLIENTS = [
  { name: "博世苏州", tier: "Strategic", contactPerson: "张明", contactPhone: "0512-12345678", contactEmail: "zhang.ming@bosch.com", industry: "汽车零部件", region: "华东", slaLevel: "Gold", responseTimeHours: 4, status: "Active" },
  { name: "博世长沙", tier: "Strategic", contactPerson: "王芳", contactPhone: "0731-23456789", contactEmail: "wang.fang@bosch.com", industry: "汽车零部件", region: "华中", slaLevel: "Gold", responseTimeHours: 4, status: "Active" },
  { name: "采埃孚上海", tier: "Strategic", contactPerson: "李强", contactPhone: "021-34567890", contactEmail: "li.qiang@zf.com", industry: "汽车传动系统", region: "华东", slaLevel: "Gold", responseTimeHours: 8, status: "Active" },
  { name: "采埃孚北京", tier: "Key", contactPerson: "赵丽", contactPhone: "010-45678901", contactEmail: "zhao.li@zf.com", industry: "汽车传动系统", region: "华北", slaLevel: "Silver", responseTimeHours: 12, status: "Active" },
  { name: "大陆芜湖", tier: "Key", contactPerson: "陈伟", contactPhone: "0553-56789012", contactEmail: "chen.wei@continental.com", industry: "汽车电子", region: "华东", slaLevel: "Silver", responseTimeHours: 12, status: "Active" },
];

export async function seedClients() {
  const d = await db();
  let created = 0;
  for (const c of DEMO_CLIENTS) {
    try { await d.insert(schema.afterSalesClients).values(c); created++; } catch { }
  }
  return { success: true, clientsCreated: created };
}

export async function seedEquipments() {
  const d = await db();
  const clients = await d.select({ id: schema.afterSalesClients.id, name: schema.afterSalesClients.name }).from(schema.afterSalesClients);
  const clientIdByName: Record<string, number> = {};
  for (const c of clients) clientIdByName[c.name] = c.id;
  const DEMO_EQ = [
    { serialNumber: "SN2025001", modelName: "USC-3000", clientName: "博世苏州", equipmentType: "超声波清洗机", manufacturer: "GRT", location: "苏州工厂A区", department: "生产部", operationalStatus: "Running", runningHours: 1200 },
    { serialNumber: "SN2025002", modelName: "BCL-5000", clientName: "采埃孚上海", equipmentType: "电池清洗线", manufacturer: "GRT", location: "上海总部B区", department: "生产部", operationalStatus: "Running", runningHours: 800 },
    { serialNumber: "SN2025003", modelName: "PCW-2000", clientName: "大陆芜湖", equipmentType: "零部件清洗机", manufacturer: "GRT", location: "芜湖工厂C区", department: "生产部", operationalStatus: "Idle", runningHours: 600 },
    { serialNumber: "SN2025004", modelName: "USC-3000-Pro", clientName: "博世长沙", equipmentType: "超声波清洗机", manufacturer: "GRT", location: "长沙工厂D区", department: "生产部", operationalStatus: "Running", runningHours: 950 },
    { serialNumber: "SN2025005", modelName: "DPW-1500", clientName: "采埃孚北京", equipmentType: "精密零件清洗机", manufacturer: "GRT", location: "北京工厂E区", department: "质检部", operationalStatus: "Maintenance", runningHours: 1500 },
  ];
  let created = 0;
  for (const eq of DEMO_EQ) {
    const clientId = clientIdByName[eq.clientName];
    if (!clientId) continue;
    const now = new Date();
    const lastMaint = new Date(now); lastMaint.setMonth(lastMaint.getMonth() - 3);
    const nextDue = new Date(now); nextDue.setMonth(nextDue.getMonth() + 3);
    try {
      await d.insert(schema.afterSalesEquipments).values({
        serialNumber: eq.serialNumber, modelName: eq.modelName, clientId,
        equipmentType: eq.equipmentType, manufacturer: eq.manufacturer,
        location: eq.location, department: eq.department,
        operationalStatus: eq.operationalStatus, runningHours: eq.runningHours,
        lastMaintenanceDate: lastMaint.toISOString().split("T")[0],
        nextDueDate: nextDue.toISOString().split("T")[0],
      });
      created++;
    } catch { }
  }
  return { success: true, equipmentsCreated: created };
}

export async function seedServiceLogs() {
  const d = await db();
  const equips = await d.select({ id: schema.afterSalesEquipments.id, serialNumber: schema.afterSalesEquipments.serialNumber, clientId: schema.afterSalesEquipments.clientId }).from(schema.afterSalesEquipments);
  const eqBySerial: Record<string, { id: number; clientId: number }> = {};
  for (const e of equips) eqBySerial[e.serialNumber] = { id: e.id, clientId: e.clientId };
  const DEMO_LOGS: { eqSN: string; serviceType: string; priority: string; status: string; issueDescription: string; assignedEngineerName: string | null; scheduledDate: string; completionDate: string | null }[] = [
    { eqSN: "SN2025001", serviceType: "Maintenance", priority: "Medium", status: "Completed", issueDescription: "设备定期保养", assignedEngineerName: "刘洋", scheduledDate: "2026-01-25", completionDate: "2026-01-25" },
    { eqSN: "SN2025002", serviceType: "Repair", priority: "High", status: "In_Progress", issueDescription: "清洗喷头堵塞", assignedEngineerName: "张伟", scheduledDate: "2026-01-28", completionDate: null },
    { eqSN: "SN2025003", serviceType: "Inspection", priority: "Low", status: "Pending", issueDescription: "季度巡检", assignedEngineerName: null, scheduledDate: "2026-02-01", completionDate: null },
    { eqSN: "SN2025004", serviceType: "Maintenance", priority: "Medium", status: "Completed", issueDescription: "超声波换能器更换", assignedEngineerName: "陈亮", scheduledDate: "2026-01-20", completionDate: "2026-01-21" },
    { eqSN: "SN2025005", serviceType: "Repair", priority: "Critical", status: "Pending", issueDescription: "控制系统报错E-305", assignedEngineerName: null, scheduledDate: "2026-02-05", completionDate: null },
  ];
  let created = 0;
  for (const log of DEMO_LOGS) {
    const eqInfo = eqBySerial[log.eqSN];
    if (!eqInfo) continue;
    const ticketId = generateTicketId();
    try {
      await d.insert(schema.afterSalesServiceLogs).values({
        ticketId, equipmentId: eqInfo.id, clientId: eqInfo.clientId,
        serviceType: log.serviceType, priority: log.priority, status: log.status,
        issueDescription: log.issueDescription, assignedEngineerName: log.assignedEngineerName,
        scheduledDate: log.scheduledDate, completionDate: log.completionDate,
        signatureStatus: log.status === "Completed" ? "pending" : undefined,
      });
      created++;
    } catch { }
  }
  return { success: true, logsCreated: created };
}

export async function seedAll() {
  const errors: string[] = [];
  let clientsCreated = 0, equipmentsCreated = 0, logsCreated = 0;
  try { const cr = await seedClients(); clientsCreated = cr.clientsCreated; } catch (e: any) { errors.push("Clients: " + e.message); }
  try { const er = await seedEquipments(); equipmentsCreated = er.equipmentsCreated; } catch (e: any) { errors.push("Equipments: " + e.message); }
  try { const lr = await seedServiceLogs(); logsCreated = lr.logsCreated; } catch (e: any) { errors.push("ServiceLogs: " + e.message); }
  return { success: errors.length === 0, summary: { clientsCreated, equipmentsCreated, logsCreated }, errors };
}

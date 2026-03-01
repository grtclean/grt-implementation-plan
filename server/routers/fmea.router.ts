/**
 * FMEA (Failure Mode & Effects Analysis) Router
 * IATF 16949 Core Tool — DFMEA & PFMEA with RPN calculation
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import { fmeaDocuments, fmeaItems, fmeaActions, controlPlans, controlPlanItems, projects } from "../../drizzle/schema";
import { eq, desc, and, count, sql, gte, lte, inArray } from "drizzle-orm";

/**
 * Helper: resolve project IDs visible to the current user's BU.
 * Returns undefined if user has global scope (no filter needed).
 */
async function buScopedProjectIds(ctx: any): Promise<number[] | undefined> {
  const buFilter = buScopeCondition(projects.buCode, ctx);
  if (!buFilter) return undefined; // global scope — no restriction
  const db = await requireDb();
  const rows = await db.select({ id: projects.id }).from(projects).where(buFilter);
  return rows.map(r => r.id);
}

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const fmeaRouter = router({
  // ===== FMEA Documents =====

  // 列表 (BU-scoped via project linkage)
  listDocuments: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    fmeaType: z.enum(["DFMEA", "PFMEA"]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const conditions = [];

    // BU isolation: restrict to projects visible to user's BU
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(fmeaDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }

    if (input?.projectId) conditions.push(eq(fmeaDocuments.projectId, input.projectId));
    if (input?.fmeaType) conditions.push(eq(fmeaDocuments.fmeaType, input.fmeaType));
    if (input?.status) conditions.push(eq(fmeaDocuments.status, input.status as typeof fmeaDocuments.status.enumValues[number]));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const items = await db.select().from(fmeaDocuments).where(where).orderBy(desc(fmeaDocuments.updatedAt));
    return { items, total: items.length };
  }),

  // 详情（含行项, BU-scoped）
  getDocument: protectedProcedure.input(idInput).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    // BU isolation: verify document belongs to user's BU-scoped project
    const scopedIds = await buScopedProjectIds(ctx);
    const conditions = [eq(fmeaDocuments.id, numId)];
    if (scopedIds) {
      conditions.push(inArray(fmeaDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }
    const [doc] = await db.select().from(fmeaDocuments).where(and(...conditions));
    if (!doc) return null;
    const items = await db.select().from(fmeaItems)
      .where(eq(fmeaItems.fmeaDocumentId, numId))
      .orderBy(fmeaItems.itemNumber);
    // Get actions for each item
    const itemIds = items.map(i => i.id);
    const allActions = itemIds.length > 0
      ? await db.select().from(fmeaActions)
      : [];
    const itemsWithActions = items.map(item => ({
      ...item,
      actions: allActions.filter(a => a.fmeaItemId === item.id),
    }));
    return { ...doc, items: itemsWithActions };
  }),

  // 创建FMEA文档
  createDocument: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    fmeaType: z.enum(["DFMEA", "PFMEA"]),
    title: z.string().min(1),
    scope: z.string().optional(),
    productName: z.string().optional(),
    processName: z.string().optional(),
    modelYear: z.string().optional(),
    teamMembers: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const fmeaCode = `FMEA-${input.fmeaType.charAt(0)}-${Date.now().toString(36).toUpperCase()}`;
    const [doc] = await db.insert(fmeaDocuments).values({
      fmeaCode,
      projectId: input.projectId,
      fmeaType: input.fmeaType,
      title: input.title,
      scope: input.scope,
      productName: input.productName,
      processName: input.processName,
      modelYear: input.modelYear,
      teamMembers: input.teamMembers ? JSON.stringify(input.teamMembers) : undefined,
      status: "draft",
    }).returning();
    return { success: true, message: "FMEA文档已创建", data: doc };
  }),

  // 更新FMEA文档
  updateDocument: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    scope: z.string().optional(),
    productName: z.string().optional(),
    processName: z.string().optional(),
    modelYear: z.string().optional(),
    teamMembers: z.array(z.string()).optional(),
    status: z.enum(["draft", "in_review", "approved", "active", "archived"]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, teamMembers, ...rest } = input;
    const updates: Record<string, unknown> = { ...rest, updatedAt: new Date().toISOString() };
    if (teamMembers !== undefined) updates.teamMembers = JSON.stringify(teamMembers);
    // Remove undefined values
    for (const key of Object.keys(updates)) {
      if (updates[key] === undefined) delete updates[key];
    }
    const [doc] = await db.update(fmeaDocuments)
      .set(updates)
      .where(eq(fmeaDocuments.id, toNum(id)))
      .returning();
    return { success: true, message: "FMEA文档已更新", data: doc };
  }),

  // 删除FMEA文档（级联删除）
  deleteDocument: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    // Delete actions for items in this document
    const items = await db.select({ id: fmeaItems.id }).from(fmeaItems)
      .where(eq(fmeaItems.fmeaDocumentId, numId));
    for (const item of items) {
      await db.delete(fmeaActions).where(eq(fmeaActions.fmeaItemId, item.id));
    }
    // Delete items
    await db.delete(fmeaItems).where(eq(fmeaItems.fmeaDocumentId, numId));
    // Delete document
    await db.delete(fmeaDocuments).where(eq(fmeaDocuments.id, numId));
    return { success: true, message: "FMEA文档已删除" };
  }),

  // ===== FMEA Items (失效模式) =====

  // 添加失效模式行
  addItem: protectedProcedure.input(z.object({
    fmeaDocumentId: z.number(),
    systemElement: z.string().optional(),
    functionRequirement: z.string().optional(),
    failureMode: z.string().min(1),
    failureEffect: z.string().optional(),
    failureCause: z.string().optional(),
    severity: z.number().min(1).max(10).default(1),
    occurrence: z.number().min(1).max(10).default(1),
    detection: z.number().min(1).max(10).default(1),
    currentPreventionControl: z.string().optional(),
    currentDetectionControl: z.string().optional(),
    specialCharacteristic: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    // Get next item number
    const existing = await db.select({ count: count() }).from(fmeaItems)
      .where(eq(fmeaItems.fmeaDocumentId, input.fmeaDocumentId));
    const itemNumber = (existing[0]?.count ?? 0) + 1;
    const rpn = input.severity * input.occurrence * input.detection;
    const ap = rpn >= 200 ? "H" : rpn >= 80 ? "M" : "L";

    const [item] = await db.insert(fmeaItems).values({
      fmeaDocumentId: input.fmeaDocumentId,
      itemNumber,
      systemElement: input.systemElement,
      functionRequirement: input.functionRequirement,
      failureMode: input.failureMode,
      failureEffect: input.failureEffect,
      failureCause: input.failureCause,
      severity: input.severity,
      occurrence: input.occurrence,
      detection: input.detection,
      rpn,
      actionPriority: ap,
      currentPreventionControl: input.currentPreventionControl,
      currentDetectionControl: input.currentDetectionControl,
      specialCharacteristic: input.specialCharacteristic,
      notes: input.notes,
    }).returning();
    return { success: true, message: "失效模式已添加", data: item };
  }),

  // 更新失效模式
  updateItem: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    systemElement: z.string().optional(),
    functionRequirement: z.string().optional(),
    failureMode: z.string().optional(),
    failureEffect: z.string().optional(),
    failureCause: z.string().optional(),
    severity: z.number().min(1).max(10).optional(),
    occurrence: z.number().min(1).max(10).optional(),
    detection: z.number().min(1).max(10).optional(),
    currentPreventionControl: z.string().optional(),
    currentDetectionControl: z.string().optional(),
    revisedSeverity: z.number().min(1).max(10).optional(),
    revisedOccurrence: z.number().min(1).max(10).optional(),
    revisedDetection: z.number().min(1).max(10).optional(),
    specialCharacteristic: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    // Recalculate RPN if S/O/D changed
    if (input.severity !== undefined || input.occurrence !== undefined || input.detection !== undefined) {
      const [current] = await db.select().from(fmeaItems).where(eq(fmeaItems.id, numId));
      if (current) {
        const s = input.severity ?? current.severity;
        const o = input.occurrence ?? current.occurrence;
        const d = input.detection ?? current.detection;
        updates.rpn = s * o * d;
        const rpn = s * o * d;
        updates.actionPriority = rpn >= 200 ? "H" : rpn >= 80 ? "M" : "L";
      }
    }
    // Recalculate revised RPN
    if (input.revisedSeverity !== undefined || input.revisedOccurrence !== undefined || input.revisedDetection !== undefined) {
      const [current] = await db.select().from(fmeaItems).where(eq(fmeaItems.id, numId));
      if (current) {
        const rs = input.revisedSeverity ?? current.revisedSeverity ?? current.severity;
        const ro = input.revisedOccurrence ?? current.revisedOccurrence ?? current.occurrence;
        const rd = input.revisedDetection ?? current.revisedDetection ?? current.detection;
        updates.revisedRpn = rs * ro * rd;
        const rrpn = rs * ro * rd;
        updates.revisedActionPriority = rrpn >= 200 ? "H" : rrpn >= 80 ? "M" : "L";
      }
    }
    const [item] = await db.update(fmeaItems)
      .set(updates)
      .where(eq(fmeaItems.id, numId))
      .returning();
    return { success: true, message: "失效模式已更新", data: item };
  }),

  // 删除失效模式
  deleteItem: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.delete(fmeaActions).where(eq(fmeaActions.fmeaItemId, numId));
    await db.delete(fmeaItems).where(eq(fmeaItems.id, numId));
    return { success: true, message: "失效模式已删除" };
  }),

  // ===== FMEA Actions (改进措施) =====

  addAction: protectedProcedure.input(z.object({
    fmeaItemId: z.number(),
    actionDescription: z.string().min(1),
    responsiblePerson: z.string().optional(),
    responsibleId: z.number().optional(),
    targetDate: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [action] = await db.insert(fmeaActions).values({
      fmeaItemId: input.fmeaItemId,
      actionDescription: input.actionDescription,
      responsiblePerson: input.responsiblePerson,
      responsibleId: input.responsibleId,
      targetDate: input.targetDate,
      status: "open",
    }).returning();
    return { success: true, message: "改进措施已添加", data: action };
  }),

  updateAction: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    actionDescription: z.string().optional(),
    responsiblePerson: z.string().optional(),
    responsibleId: z.number().optional(),
    targetDate: z.string().optional(),
    completionDate: z.string().optional(),
    status: z.enum(["open", "in_progress", "completed", "verified", "cancelled"]).optional(),
    verificationResult: z.string().optional(),
    evidence: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    const [action] = await db.update(fmeaActions)
      .set(updates)
      .where(eq(fmeaActions.id, toNum(input.id)))
      .returning();
    return { success: true, message: "改进措施已更新", data: action };
  }),

  deleteAction: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(fmeaActions).where(eq(fmeaActions.id, toNum(input.id)));
    return { success: true, message: "改进措施已删除" };
  }),

  // ===== Statistics & Dashboard =====

  // FMEA概览统计 (BU-scoped)
  getStats: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    // BU isolation
    const scopedIds = await buScopedProjectIds(ctx);
    const buConditions = [];
    if (scopedIds) {
      buConditions.push(inArray(fmeaDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }
    const docs = buConditions.length > 0
      ? await db.select().from(fmeaDocuments).where(and(...buConditions))
      : await db.select().from(fmeaDocuments);
    const filteredDocs = input?.projectId ? docs.filter(d => d.projectId === input.projectId) : docs;
    const docIds = filteredDocs.map(d => d.id);

    const allItems = docIds.length > 0
      ? await db.select().from(fmeaItems)
      : [];
    const filteredItems = allItems.filter(i => docIds.includes(i.fmeaDocumentId));

    const highRpnItems = filteredItems.filter(i => i.rpn >= 200);
    const mediumRpnItems = filteredItems.filter(i => i.rpn >= 80 && i.rpn < 200);

    const allActions = filteredItems.length > 0
      ? await db.select().from(fmeaActions)
      : [];
    const itemIds = filteredItems.map(i => i.id);
    const filteredActions = allActions.filter(a => itemIds.includes(a.fmeaItemId));

    return {
      totalDocuments: filteredDocs.length,
      byType: {
        DFMEA: filteredDocs.filter(d => d.fmeaType === "DFMEA").length,
        PFMEA: filteredDocs.filter(d => d.fmeaType === "PFMEA").length,
      },
      totalItems: filteredItems.length,
      highRiskItems: highRpnItems.length,
      mediumRiskItems: mediumRpnItems.length,
      avgRpn: filteredItems.length
        ? Math.round(filteredItems.reduce((s, i) => s + i.rpn, 0) / filteredItems.length)
        : 0,
      totalActions: filteredActions.length,
      openActions: filteredActions.filter(a => a.status === "open" || a.status === "in_progress").length,
      completedActions: filteredActions.filter(a => a.status === "completed" || a.status === "verified").length,
    };
  }),

  // 高风险项 Top N (BU-scoped)
  getHighRiskItems: protectedProcedure.input(z.object({
    limit: z.number().default(20),
    projectId: z.number().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();

    // BU isolation: get FMEA document IDs within user's BU scope
    const scopedIds = await buScopedProjectIds(ctx);
    let buDocIds: number[] | undefined;
    if (scopedIds) {
      const buDocs = await db.select({ id: fmeaDocuments.id }).from(fmeaDocuments)
        .where(inArray(fmeaDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
      buDocIds = buDocs.map(d => d.id);
    }

    const itemConditions = [];
    if (buDocIds) {
      itemConditions.push(inArray(fmeaItems.fmeaDocumentId, buDocIds.length > 0 ? buDocIds : [0]));
    }
    const where = itemConditions.length > 0 ? and(...itemConditions) : undefined;
    const items = await db.select().from(fmeaItems).where(where).orderBy(desc(fmeaItems.rpn)).limit(input?.limit ?? 20);

    if (!input?.projectId) return items;

    // Filter by project
    const docs = await db.select({ id: fmeaDocuments.id }).from(fmeaDocuments)
      .where(eq(fmeaDocuments.projectId, input.projectId));
    const docIds = docs.map(d => d.id);
    return items.filter(i => docIds.includes(i.fmeaDocumentId));
  }),
});

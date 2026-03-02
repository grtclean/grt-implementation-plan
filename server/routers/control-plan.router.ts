/**
 * Control Plan (控制计划) Router
 * IATF 16949 Core Tool — 工序级质量控制
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { controlPlans, controlPlanItems, fmeaDocuments, fmeaItems } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const controlPlanRouter = router({
  // 列表
  list: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    phase: z.enum(["prototype", "pre_launch", "production"]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(controlPlans).orderBy(desc(controlPlans.updatedAt)).limit(1000);
    let filtered = items;
    if (input?.projectId) filtered = filtered.filter(p => p.projectId === input.projectId);
    if (input?.phase) filtered = filtered.filter(p => p.phase === input.phase);
    if (input?.status) filtered = filtered.filter(p => p.status === input.status);
    return { items: filtered, total: filtered.length };
  }),

  // 详情（含行项）
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const [plan] = await db.select().from(controlPlans).where(eq(controlPlans.id, numId)).limit(1000);
    if (!plan) return null;
    const items = await db.select().from(controlPlanItems)
      .where(eq(controlPlanItems.controlPlanId, numId))
      .orderBy(controlPlanItems.itemNumber).limit(1000);
    return { ...plan, items };
  }),
  // 创建控制计划
  create: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    fmeaDocumentId: z.number().optional(),
    title: z.string().min(1),
    partName: z.string().optional(),
    partNumber: z.string().optional(),
    phase: z.enum(["prototype", "pre_launch", "production"]).default("prototype"),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const planCode = `CP-${Date.now().toString(36).toUpperCase()}`;
    const [plan] = await db.insert(controlPlans).values({
      planCode,
      projectId: input.projectId,
      fmeaDocumentId: input.fmeaDocumentId,
      title: input.title,
      partName: input.partName,
      partNumber: input.partNumber,
      phase: input.phase,
      status: "draft",
    }).returning();
    return { success: true, message: "控制计划已创建", data: plan };
  }),

  // 更新控制计划
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    partName: z.string().optional(),
    partNumber: z.string().optional(),
    phase: z.enum(["prototype", "pre_launch", "production"]).optional(),
    status: z.enum(["draft", "active", "superseded", "archived"]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    const [plan] = await db.update(controlPlans)
      .set(updates)
      .where(eq(controlPlans.id, toNum(input.id)))
      .returning();
    return { success: true, message: "控制计划已更新", data: plan };
  }),

  // 删除控制计划（级联）
  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.delete(controlPlanItems).where(eq(controlPlanItems.controlPlanId, numId));
    await db.delete(controlPlans).where(eq(controlPlans.id, numId));
    return { success: true, message: "控制计划已删除" };
  }),
  // ===== Control Plan Items (行项) =====

  addItem: protectedProcedure.input(z.object({
    controlPlanId: z.number(),
    processStep: z.string().optional(),
    processNumber: z.string().optional(),
    machineTool: z.string().optional(),
    characteristicName: z.string().min(1),
    characteristicNumber: z.string().optional(),
    characteristicType: z.enum(["product", "process"]).optional(),
    specialCharacteristic: z.string().optional(),
    specification: z.string().optional(),
    tolerance: z.string().optional(),
    controlMethod: z.enum(["visual", "gauge", "spc", "cmm", "test", "audit", "other"]).default("visual"),
    controlDescription: z.string().optional(),
    sampleSize: z.string().optional(),
    sampleFrequency: z.string().optional(),
    reactionPlan: z.string().optional(),
    fmeaItemId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const existing = await db.select({ count: count() }).from(controlPlanItems)
      .where(eq(controlPlanItems.controlPlanId, input.controlPlanId));
    const itemNumber = (existing[0]?.count ?? 0) + 1;
    const [item] = await db.insert(controlPlanItems).values({
      controlPlanId: input.controlPlanId,
      itemNumber,
      processStep: input.processStep,
      processNumber: input.processNumber,
      machineTool: input.machineTool,
      characteristicName: input.characteristicName,
      characteristicNumber: input.characteristicNumber,
      characteristicType: input.characteristicType,
      specialCharacteristic: input.specialCharacteristic,
      specification: input.specification,
      tolerance: input.tolerance,
      controlMethod: input.controlMethod,
      controlDescription: input.controlDescription,
      sampleSize: input.sampleSize,
      sampleFrequency: input.sampleFrequency,
      reactionPlan: input.reactionPlan,
      fmeaItemId: input.fmeaItemId,
      notes: input.notes,
    }).returning();
    return { success: true, message: "控制项已添加", data: item };
  }),
  updateItem: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    processStep: z.string().optional(),
    processNumber: z.string().optional(),
    machineTool: z.string().optional(),
    characteristicName: z.string().optional(),
    characteristicNumber: z.string().optional(),
    characteristicType: z.enum(["product", "process"]).optional(),
    specialCharacteristic: z.string().optional(),
    specification: z.string().optional(),
    tolerance: z.string().optional(),
    controlMethod: z.enum(["visual", "gauge", "spc", "cmm", "test", "audit", "other"]).optional(),
    controlDescription: z.string().optional(),
    sampleSize: z.string().optional(),
    sampleFrequency: z.string().optional(),
    reactionPlan: z.string().optional(),
    fmeaItemId: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }
    const [item] = await db.update(controlPlanItems)
      .set(updates)
      .where(eq(controlPlanItems.id, toNum(input.id)))
      .returning();
    return { success: true, message: "控制项已更新", data: item };
  }),

  deleteItem: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(controlPlanItems).where(eq(controlPlanItems.id, toNum(input.id)));
    return { success: true, message: "控制项已删除" };
  }),
  // ===== FMEA → Control Plan Auto-Generation =====

  // Auto-create control plan items from high-RPN FMEA items (RPN >= threshold)
  generateFromFMEA: protectedProcedure.input(z.object({
    controlPlanId: z.number(),
    fmeaDocumentId: z.number(),
    rpnThreshold: z.number().default(80),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    // Verify control plan exists
    const [plan] = await db.select().from(controlPlans).where(eq(controlPlans.id, input.controlPlanId)).limit(1000);
    if (!plan) return { success: false, message: "Control plan not found", created: 0 };

    // Get FMEA items above threshold
    const fItems = await db.select().from(fmeaItems)
      .where(eq(fmeaItems.fmeaDocumentId, input.fmeaDocumentId)).limit(1000);
    const highRisk = fItems.filter(i => i.rpn >= input.rpnThreshold);

    if (highRisk.length === 0) {
      return { success: true, message: `No FMEA items with RPN ≥ ${input.rpnThreshold}`, created: 0 };
    }

    // Get current item count for numbering
    const existing = await db.select({ count: count() }).from(controlPlanItems)
      .where(eq(controlPlanItems.controlPlanId, input.controlPlanId));
    let nextNum = (existing[0]?.count ?? 0) + 1;

    let created = 0;
    for (const fi of highRisk) {
      await db.insert(controlPlanItems).values({
        controlPlanId: input.controlPlanId,
        itemNumber: nextNum++,
        processStep: fi.systemElement || undefined,
        characteristicName: fi.failureMode,
        characteristicType: "process",
        specialCharacteristic: fi.rpn >= 200 ? "CC" : "SC",
        specification: fi.functionRequirement || undefined,
        controlMethod: fi.rpn >= 200 ? "spc" : "gauge",
        controlDescription: `Auto-generated from FMEA item #${fi.itemNumber} (RPN=${fi.rpn}). Failure: ${fi.failureMode}. Cause: ${fi.failureCause || "TBD"}`,
        reactionPlan: fi.failureEffect ? `If detected: ${fi.failureEffect} → containment required` : "Quarantine and notify quality",
        fmeaItemId: fi.id,
        notes: `Source: FMEA item ${fi.itemNumber}, AP=${fi.actionPriority}`,
      });
      created++;
    }

    // Link FMEA document to control plan
    await db.update(controlPlans).set({
      fmeaDocumentId: input.fmeaDocumentId,
      updatedAt: new Date().toISOString(),
    }).where(eq(controlPlans.id, input.controlPlanId));

    return {
      success: true,
      message: `${created} control plan items created from ${highRisk.length} high-risk FMEA items (RPN ≥ ${input.rpnThreshold})`,
      created,
    };
  }),

  // ===== Statistics =====

  getStats: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const plans = await db.select().from(controlPlans).limit(1000);
    const filtered = input?.projectId ? plans.filter(p => p.projectId === input.projectId) : plans;

    const planIds = filtered.map(p => p.id);
    const allItems = planIds.length > 0
      ? await db.select().from(controlPlanItems).limit(1000)
      : [];
    const filteredItems = allItems.filter(i => planIds.includes(i.controlPlanId));

    return {
      totalPlans: filtered.length,
      byPhase: {
        prototype: filtered.filter(p => p.phase === "prototype").length,
        pre_launch: filtered.filter(p => p.phase === "pre_launch").length,
        production: filtered.filter(p => p.phase === "production").length,
      },
      byStatus: {
        draft: filtered.filter(p => p.status === "draft").length,
        active: filtered.filter(p => p.status === "active").length,
        superseded: filtered.filter(p => p.status === "superseded").length,
        archived: filtered.filter(p => p.status === "archived").length,
      },
      totalItems: filteredItems.length,
      specialCharacteristics: filteredItems.filter(i => i.specialCharacteristic === "CC" || i.specialCharacteristic === "SC").length,
      byControlMethod: {
        visual: filteredItems.filter(i => i.controlMethod === "visual").length,
        gauge: filteredItems.filter(i => i.controlMethod === "gauge").length,
        spc: filteredItems.filter(i => i.controlMethod === "spc").length,
        cmm: filteredItems.filter(i => i.controlMethod === "cmm").length,
        test: filteredItems.filter(i => i.controlMethod === "test").length,
        audit: filteredItems.filter(i => i.controlMethod === "audit").length,
        other: filteredItems.filter(i => i.controlMethod === "other").length,
      },
    };
  }),
});

/**
 * MSA (Measurement System Analysis) Router
 * IATF 16949 — GR&R, Bias, Linearity, Stability studies
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { msaStudies, msaMeasurements } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const msaRouter = router({
  // 列表
  list: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    studyType: z.enum(["gage_rr", "bias", "linearity", "stability", "attribute_agreement"]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(msaStudies).orderBy(desc(msaStudies.updatedAt));
    if (input?.projectId) items = items.filter(s => s.projectId === input.projectId);
    if (input?.studyType) items = items.filter(s => s.studyType === input.studyType);
    if (input?.status) items = items.filter(s => s.status === input.status);
    return { items, total: items.length };
  }),

  // 详情（含测量数据）
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const [study] = await db.select().from(msaStudies).where(eq(msaStudies.id, numId));
    if (!study) return null;
    const measurements = await db.select().from(msaMeasurements)
      .where(eq(msaMeasurements.studyId, numId))
      .orderBy(msaMeasurements.operatorName, msaMeasurements.partNumber, msaMeasurements.trialNumber);
    return { ...study, measurements };
  }),

  // 创建MSA研究
  create: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    controlPlanItemId: z.number().optional(),
    studyType: z.enum(["gage_rr", "bias", "linearity", "stability", "attribute_agreement"]),
    gaugeName: z.string().min(1),
    gaugeId: z.string().optional(),
    gaugeResolution: z.string().optional(),
    partName: z.string().optional(),
    characteristicName: z.string().optional(),
    specification: z.string().optional(),
    tolerance: z.string().optional(),
    numOperators: z.number().default(3),
    numParts: z.number().default(10),
    numTrials: z.number().default(3),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `MSA-${input.studyType.charAt(0).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const [study] = await db.insert(msaStudies).values({
      studyCode: code,
      projectId: input.projectId,
      controlPlanItemId: input.controlPlanItemId,
      studyType: input.studyType,
      gaugeName: input.gaugeName,
      gaugeId: input.gaugeId,
      gaugeResolution: input.gaugeResolution,
      partName: input.partName,
      characteristicName: input.characteristicName,
      specification: input.specification,
      tolerance: input.tolerance,
      numOperators: input.numOperators,
      numParts: input.numParts,
      numTrials: input.numTrials,
      status: "planned",
    }).returning();
    return { success: true, message: "MSA研究已创建", data: study };
  }),

  // 更新MSA研究
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    gaugeName: z.string().optional(),
    gaugeId: z.string().optional(),
    characteristicName: z.string().optional(),
    specification: z.string().optional(),
    tolerance: z.string().optional(),
    status: z.enum(["planned", "in_progress", "completed", "failed", "archived"]).optional(),
    repeatability: z.string().optional(),
    reproducibility: z.string().optional(),
    grrPercent: z.string().optional(),
    ndc: z.number().optional(),
    conclusion: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (input.status === "completed") updates.conductedAt = new Date().toISOString();
    const [study] = await db.update(msaStudies).set(updates).where(eq(msaStudies.id, toNum(input.id))).returning();
    return { success: true, message: "MSA研究已更新", data: study };
  }),

  // 删除
  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.delete(msaMeasurements).where(eq(msaMeasurements.studyId, numId));
    await db.delete(msaStudies).where(eq(msaStudies.id, numId));
    return { success: true, message: "MSA研究已删除" };
  }),

  // 录入测量数据
  addMeasurement: protectedProcedure.input(z.object({
    studyId: z.number(),
    operatorId: z.number().optional(),
    operatorName: z.string().optional(),
    partNumber: z.number(),
    trialNumber: z.number(),
    measuredValue: z.string(),
    referenceValue: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [m] = await db.insert(msaMeasurements).values({
      studyId: input.studyId,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      partNumber: input.partNumber,
      trialNumber: input.trialNumber,
      measuredValue: input.measuredValue,
      referenceValue: input.referenceValue,
    }).returning();
    return { success: true, data: m };
  }),

  // 批量录入
  addMeasurementsBatch: protectedProcedure.input(z.object({
    studyId: z.number(),
    measurements: z.array(z.object({
      operatorName: z.string().optional(),
      partNumber: z.number(),
      trialNumber: z.number(),
      measuredValue: z.string(),
      referenceValue: z.string().optional(),
    })),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    for (const m of input.measurements) {
      await db.insert(msaMeasurements).values({
        studyId: input.studyId,
        ...m,
      });
    }
    return { success: true, message: `${input.measurements.length} 条测量数据已录入` };
  }),

  // 计算GR&R（简化版 — 基于均值-极差法）
  calculateGRR: protectedProcedure.input(z.object({
    studyId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [study] = await db.select().from(msaStudies).where(eq(msaStudies.id, input.studyId));
    if (!study) return { success: false, message: "MSA研究不存在" };

    const measurements = await db.select().from(msaMeasurements)
      .where(eq(msaMeasurements.studyId, input.studyId));
    if (measurements.length === 0) return { success: false, message: "无测量数据" };

    const values = measurements.map(m => Number(m.measuredValue));
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const totalVariation = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

    // Simplified %GR&R estimation
    const operators = [...new Set(measurements.map(m => m.operatorName))];
    const parts = [...new Set(measurements.map(m => m.partNumber))];

    // Within-operator range for repeatability
    let totalRange = 0;
    let rangeCount = 0;
    for (const op of operators) {
      for (const part of parts) {
        const trials = measurements.filter(m => m.operatorName === op && m.partNumber === part)
          .map(m => Number(m.measuredValue));
        if (trials.length > 1) {
          totalRange += Math.max(...trials) - Math.min(...trials);
          rangeCount++;
        }
      }
    }
    const avgRange = rangeCount > 0 ? totalRange / rangeCount : 0;
    const repeatability = avgRange / 1.128; // d2 for n=2

    // Operator averages for reproducibility
    const opAvgs = operators.map(op => {
      const opVals = measurements.filter(m => m.operatorName === op).map(m => Number(m.measuredValue));
      return opVals.reduce((s, v) => s + v, 0) / opVals.length;
    });
    const reproducibility = opAvgs.length > 1
      ? (Math.max(...opAvgs) - Math.min(...opAvgs)) / 1.693
      : 0;

    const grr = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const grrPercent = totalVariation > 0 ? (grr / totalVariation) * 100 : 0;
    const ndc = totalVariation > 0 ? Math.floor(1.41 * (totalVariation / grr)) : 0;
    const conclusion = grrPercent < 10 ? "acceptable" : grrPercent < 30 ? "marginal" : "unacceptable";

    await db.update(msaStudies).set({
      repeatability: repeatability.toFixed(4),
      reproducibility: reproducibility.toFixed(4),
      grrPercent: grrPercent.toFixed(4),
      ndc,
      conclusion,
      status: "completed",
      conductedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(msaStudies.id, input.studyId));

    return {
      success: true,
      message: "GR&R计算完成",
      data: {
        repeatability: Number(repeatability.toFixed(4)),
        reproducibility: Number(reproducibility.toFixed(4)),
        grrPercent: Number(grrPercent.toFixed(2)),
        ndc,
        conclusion,
        totalVariation: Number(totalVariation.toFixed(4)),
      },
    };
  }),

  // 统计
  getStats: protectedProcedure.input(z.object({ projectId: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let studies = await db.select().from(msaStudies);
    if (input?.projectId) studies = studies.filter(s => s.projectId === input.projectId);
    return {
      total: studies.length,
      byType: {
        gage_rr: studies.filter(s => s.studyType === "gage_rr").length,
        bias: studies.filter(s => s.studyType === "bias").length,
        linearity: studies.filter(s => s.studyType === "linearity").length,
        stability: studies.filter(s => s.studyType === "stability").length,
        attribute_agreement: studies.filter(s => s.studyType === "attribute_agreement").length,
      },
      byConclusion: {
        acceptable: studies.filter(s => s.conclusion === "acceptable").length,
        marginal: studies.filter(s => s.conclusion === "marginal").length,
        unacceptable: studies.filter(s => s.conclusion === "unacceptable").length,
      },
    };
  }),
});

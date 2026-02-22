/**
 * 8D Problem Solving + CAPA Router
 * IATF 16949 — D0-D8 structured problem solving & Corrective/Preventive Actions
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eightDReports, capaRecords } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const eightDCapaRouter = router({
  // ===== 8D Reports =====

  list8D: publicProcedure.input(z.object({
    projectId: z.number().optional(),
    currentStep: z.string().optional(),
    severity: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(eightDReports).orderBy(desc(eightDReports.updatedAt));
    if (input?.projectId) items = items.filter(r => r.projectId === input.projectId);
    if (input?.currentStep) items = items.filter(r => r.currentStep === input.currentStep);
    if (input?.severity) items = items.filter(r => r.severity === input.severity);
    return { items, total: items.length };
  }),

  get8D: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const [report] = await db.select().from(eightDReports).where(eq(eightDReports.id, numId));
    if (!report) return null;
    // Get linked CAPAs
    const capas = await db.select().from(capaRecords).where(eq(capaRecords.eightDReportId, numId));
    return { ...report, capas };
  }),

  create8D: publicProcedure.input(z.object({
    projectId: z.number().optional(),
    title: z.string().min(1),
    problemDescription: z.string().optional(),
    severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    source: z.string().optional(),
    customerId: z.number().optional(),
    customerName: z.string().optional(),
    partNumber: z.string().optional(),
    defectQuantity: z.number().optional(),
    dueDate: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `8D-${Date.now().toString(36).toUpperCase()}`;
    const [report] = await db.insert(eightDReports).values({
      reportCode: code,
      projectId: input.projectId,
      title: input.title,
      problemDescription: input.problemDescription,
      severity: input.severity,
      source: input.source,
      customerId: input.customerId,
      customerName: input.customerName,
      partNumber: input.partNumber,
      defectQuantity: input.defectQuantity,
      dueDate: input.dueDate,
      currentStep: "open",
    }).returning();
    return { success: true, message: "8D报告已创建", data: report };
  }),

  // 更新8D步骤 (advance through D1-D8)
  update8DStep: publicProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    currentStep: z.enum(["open", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "closed", "verified"]).optional(),
    // D1 fields
    teamLeaderId: z.number().optional(),
    teamMembers: z.array(z.string()).optional(),
    // D2 fields
    d2Description: z.string().optional(),
    d2IsWhat: z.string().optional(),
    d2IsNotWhat: z.string().optional(),
    // D3 fields
    d3ContainmentActions: z.array(z.string()).optional(),
    // D4 fields
    d4RootCauses: z.array(z.string()).optional(),
    d4AnalysisMethod: z.string().optional(),
    d4VerificationData: z.string().optional(),
    // D5 fields
    d5CorrectiveActions: z.array(z.string()).optional(),
    // D6 fields
    d6VerificationResult: z.string().optional(),
    d6EffectivenessData: z.string().optional(),
    // D7 fields
    d7PreventionActions: z.array(z.string()).optional(),
    d7SystemChanges: z.string().optional(),
    // D8 fields
    d8LessonsLearned: z.string().optional(),
    d8TeamRecognition: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.currentStep !== undefined) updates.currentStep = input.currentStep;
    if (input.teamLeaderId !== undefined) updates.teamLeaderId = input.teamLeaderId;
    if (input.teamMembers !== undefined) updates.teamMembers = JSON.stringify(input.teamMembers);
    if (input.d2Description !== undefined) updates.d2Description = input.d2Description;
    if (input.d2IsWhat !== undefined) updates.d2IsWhat = input.d2IsWhat;
    if (input.d2IsNotWhat !== undefined) updates.d2IsNotWhat = input.d2IsNotWhat;
    if (input.d3ContainmentActions !== undefined) {
      updates.d3ContainmentActions = JSON.stringify(input.d3ContainmentActions);
      updates.d3ImplementedAt = new Date().toISOString();
    }
    if (input.d4RootCauses !== undefined) updates.d4RootCauses = JSON.stringify(input.d4RootCauses);
    if (input.d4AnalysisMethod !== undefined) updates.d4AnalysisMethod = input.d4AnalysisMethod;
    if (input.d4VerificationData !== undefined) updates.d4VerificationData = input.d4VerificationData;
    if (input.d5CorrectiveActions !== undefined) updates.d5CorrectiveActions = JSON.stringify(input.d5CorrectiveActions);
    if (input.d6VerificationResult !== undefined) updates.d6VerificationResult = input.d6VerificationResult;
    if (input.d6EffectivenessData !== undefined) updates.d6EffectivenessData = input.d6EffectivenessData;
    if (input.d7PreventionActions !== undefined) updates.d7PreventionActions = JSON.stringify(input.d7PreventionActions);
    if (input.d7SystemChanges !== undefined) updates.d7SystemChanges = input.d7SystemChanges;
    if (input.d8LessonsLearned !== undefined) updates.d8LessonsLearned = input.d8LessonsLearned;
    if (input.d8TeamRecognition !== undefined) updates.d8TeamRecognition = input.d8TeamRecognition;

    if (input.currentStep === "D6") updates.d6ImplementationDate = new Date().toISOString();
    if (input.currentStep === "D8" || input.currentStep === "closed") {
      updates.d8ClosureDate = new Date().toISOString();
      updates.closedAt = new Date().toISOString();
    }

    const [report] = await db.update(eightDReports).set(updates).where(eq(eightDReports.id, toNum(input.id))).returning();
    return { success: true, message: `8D报告已更新至 ${input.currentStep || ''}`, data: report };
  }),

  delete8D: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.delete(capaRecords).where(eq(capaRecords.eightDReportId, numId));
    await db.delete(eightDReports).where(eq(eightDReports.id, numId));
    return { success: true, message: "8D报告已删除" };
  }),

  // ===== CAPA Records =====

  listCAPA: publicProcedure.input(z.object({
    projectId: z.number().optional(),
    capaType: z.enum(["corrective", "preventive"]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(capaRecords).orderBy(desc(capaRecords.updatedAt));
    if (input?.projectId) items = items.filter(c => c.projectId === input.projectId);
    if (input?.capaType) items = items.filter(c => c.capaType === input.capaType);
    if (input?.status) items = items.filter(c => c.status === input.status);
    return { items, total: items.length };
  }),

  getCAPA: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [capa] = await db.select().from(capaRecords).where(eq(capaRecords.id, toNum(input.id)));
    return capa || null;
  }),

  createCAPA: publicProcedure.input(z.object({
    eightDReportId: z.number().optional(),
    projectId: z.number().optional(),
    capaType: z.enum(["corrective", "preventive"]),
    title: z.string().min(1),
    description: z.string().optional(),
    rootCause: z.string().optional(),
    actionPlan: z.array(z.string()).optional(),
    responsibleId: z.number().optional(),
    responsibleName: z.string().optional(),
    targetDate: z.string().optional(),
    verificationMethod: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `CAPA-${input.capaType.charAt(0).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const [capa] = await db.insert(capaRecords).values({
      capaCode: code,
      eightDReportId: input.eightDReportId,
      projectId: input.projectId,
      capaType: input.capaType,
      title: input.title,
      description: input.description,
      rootCause: input.rootCause,
      actionPlan: input.actionPlan ? JSON.stringify(input.actionPlan) : undefined,
      responsibleId: input.responsibleId,
      responsibleName: input.responsibleName,
      targetDate: input.targetDate,
      verificationMethod: input.verificationMethod,
      status: "open",
    }).returning();
    return { success: true, message: "CAPA记录已创建", data: capa };
  }),

  updateCAPA: publicProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    description: z.string().optional(),
    rootCause: z.string().optional(),
    actionPlan: z.array(z.string()).optional(),
    responsibleName: z.string().optional(),
    targetDate: z.string().optional(),
    completionDate: z.string().optional(),
    verificationMethod: z.string().optional(),
    verificationResult: z.string().optional(),
    effectivenessCheck: z.string().optional(),
    status: z.enum(["open", "investigation", "action_planned", "implemented", "verified", "closed"]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, actionPlan, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (actionPlan !== undefined) updates.actionPlan = JSON.stringify(actionPlan);
    if (input.status === "closed") updates.closedAt = new Date().toISOString();
    const [capa] = await db.update(capaRecords).set(updates).where(eq(capaRecords.id, toNum(input.id))).returning();
    return { success: true, message: "CAPA已更新", data: capa };
  }),

  deleteCAPA: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(capaRecords).where(eq(capaRecords.id, toNum(input.id)));
    return { success: true, message: "CAPA已删除" };
  }),

  // ===== D5 → CAPA Auto-Suggestion =====

  // When 8D reaches D5, auto-create CAPA records from corrective actions
  suggestCapaFromD5: publicProcedure.input(z.object({
    eightDReportId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [report] = await db.select().from(eightDReports).where(eq(eightDReports.id, input.eightDReportId));
    if (!report) return { success: false, message: "8D report not found", created: 0 };

    // Parse D4 root causes and D5 corrective actions
    const rootCauses: string[] = (() => {
      try { const p = JSON.parse(report.d4RootCauses ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
    })();
    const correctiveActions: string[] = (() => {
      try { const p = JSON.parse(report.d5CorrectiveActions ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
    })();
    const preventionActions: string[] = (() => {
      try { const p = JSON.parse(report.d7PreventionActions ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
    })();

    if (correctiveActions.length === 0 && preventionActions.length === 0) {
      return { success: true, message: "No corrective/prevention actions to convert", created: 0 };
    }

    let created = 0;

    // Create Corrective CAPAs from D5
    for (const action of correctiveActions) {
      const code = `CAPA-C-${Date.now().toString(36).toUpperCase()}-${created}`;
      await db.insert(capaRecords).values({
        capaCode: code,
        eightDReportId: report.id,
        projectId: report.projectId,
        capaType: "corrective",
        title: `[Auto] ${action.slice(0, 100)}`,
        description: `Auto-generated from 8D ${report.reportCode} D5 corrective action`,
        rootCause: rootCauses.join("; ") || undefined,
        actionPlan: JSON.stringify([action]),
        status: "open",
      });
      created++;
    }

    // Create Preventive CAPAs from D7
    for (const action of preventionActions) {
      const code = `CAPA-P-${Date.now().toString(36).toUpperCase()}-${created}`;
      await db.insert(capaRecords).values({
        capaCode: code,
        eightDReportId: report.id,
        projectId: report.projectId,
        capaType: "preventive",
        title: `[Auto] ${action.slice(0, 100)}`,
        description: `Auto-generated from 8D ${report.reportCode} D7 prevention action`,
        rootCause: rootCauses.join("; ") || undefined,
        actionPlan: JSON.stringify([action]),
        status: "open",
      });
      created++;
    }

    return { success: true, message: `${created} CAPA records auto-created from 8D corrective/prevention actions`, created };
  }),

  // ===== Statistics =====

  getStats: publicProcedure.input(z.object({ projectId: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let reports = await db.select().from(eightDReports);
    let capas = await db.select().from(capaRecords);
    if (input?.projectId) {
      reports = reports.filter(r => r.projectId === input.projectId);
      capas = capas.filter(c => c.projectId === input.projectId);
    }
    return {
      eightD: {
        total: reports.length,
        open: reports.filter(r => r.currentStep !== "closed" && r.currentStep !== "verified").length,
        closed: reports.filter(r => r.currentStep === "closed" || r.currentStep === "verified").length,
        bySeverity: {
          critical: reports.filter(r => r.severity === "critical").length,
          high: reports.filter(r => r.severity === "high").length,
          medium: reports.filter(r => r.severity === "medium").length,
          low: reports.filter(r => r.severity === "low").length,
        },
      },
      capa: {
        total: capas.length,
        open: capas.filter(c => c.status !== "closed").length,
        closed: capas.filter(c => c.status === "closed").length,
        corrective: capas.filter(c => c.capaType === "corrective").length,
        preventive: capas.filter(c => c.capaType === "preventive").length,
      },
    };
  }),
});

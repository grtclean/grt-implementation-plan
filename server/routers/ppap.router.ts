/**
 * PPAP (Production Part Approval Process) Router
 * IATF 16949 — 18-element PPAP submission management
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { ppapSubmissions, ppapElements, fmeaDocuments, controlPlans, msaStudies } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

// AIAG PPAP 18 Elements
const PPAP_18_ELEMENTS = [
  { number: 1, name: "Design Records" },
  { number: 2, name: "Engineering Change Documents" },
  { number: 3, name: "Customer Engineering Approval" },
  { number: 4, name: "Design FMEA" },
  { number: 5, name: "Process Flow Diagram" },
  { number: 6, name: "Process FMEA" },
  { number: 7, name: "Control Plan" },
  { number: 8, name: "Measurement System Analysis" },
  { number: 9, name: "Dimensional Results" },
  { number: 10, name: "Material/Performance Test Results" },
  { number: 11, name: "Initial Process Studies" },
  { number: 12, name: "Qualified Laboratory Documentation" },
  { number: 13, name: "Appearance Approval Report" },
  { number: 14, name: "Sample Production Parts" },
  { number: 15, name: "Master Sample" },
  { number: 16, name: "Checking Aids" },
  { number: 17, name: "Customer-Specific Requirements" },
  { number: 18, name: "Part Submission Warrant (PSW)" },
];

// Elements required by PPAP level
const LEVEL_REQUIREMENTS: Record<string, number[]> = {
  "1": [18],
  "2": [4, 6, 7, 8, 9, 10, 11, 18],
  "3": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  "4": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  "5": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
};

export const ppapRouter = router({
  // 列表
  list: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(ppapSubmissions).orderBy(desc(ppapSubmissions.updatedAt)).limit(1000);
    if (input?.projectId) items = items.filter(s => s.projectId === input.projectId);
    if (input?.status) items = items.filter(s => s.status === input.status);
    return { items, total: items.length };
  }),

  // 详情（含18元素）
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    const [sub] = await db.select().from(ppapSubmissions).where(eq(ppapSubmissions.id, numId)).limit(1000);
    if (!sub) return null;
    const elements = await db.select().from(ppapElements)
      .where(eq(ppapElements.submissionId, numId))
      .orderBy(ppapElements.elementNumber).limit(1000);
    const completed = elements.filter(e => e.status === "completed").length;
    const total = elements.filter(e => e.required === 1).length;
    return { ...sub, elements, progress: { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 } };
  }),

  // 创建PPAP提交（自动生成18元素清单）
  create: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    partName: z.string().min(1),
    partNumber: z.string().min(1),
    revision: z.string().optional(),
    customerId: z.number().optional(),
    customerName: z.string().optional(),
    submissionLevel: z.enum(["1", "2", "3", "4", "5"]).default("3"),
    submissionReason: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = `PPAP-${Date.now().toString(36).toUpperCase()}`;
    const required = LEVEL_REQUIREMENTS[input.submissionLevel] || LEVEL_REQUIREMENTS["3"];
    const [sub] = await db.transaction(async (tx) => {
      const [submission] = await tx.insert(ppapSubmissions).values({
        submissionCode: code,
        projectId: input.projectId,
        partName: input.partName,
        partNumber: input.partNumber,
        revision: input.revision,
        customerId: input.customerId,
        customerName: input.customerName,
        submissionLevel: input.submissionLevel,
        submissionReason: input.submissionReason,
        notes: input.notes,
        status: "draft",
      }).returning();

      // Batch insert all 18 elements
      await tx.insert(ppapElements).values(
        PPAP_18_ELEMENTS.map(elem => ({
          submissionId: submission.id,
          elementNumber: elem.number,
          elementName: elem.name,
          required: required.includes(elem.number) ? 1 : 0,
          status: "not_started" as const,
        }))
      );
      return [submission];
    });
    return { success: true, message: "PPAP提交已创建（含18元素清单）", data: sub };
  }),

  // 更新提交
  update: requirePermission('mfg:ppap:manage').input(z.object({
    id: z.union([z.string(), z.number()]),
    partName: z.string().optional(),
    partNumber: z.string().optional(),
    revision: z.string().optional(),
    customerName: z.string().optional(),
    submissionReason: z.string().optional(),
    status: z.enum(["draft", "submitted", "approved", "rejected", "interim_approved"]).optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (input.status === "submitted") updates.submittedAt = new Date().toISOString();
    if (input.status === "approved") updates.approvedAt = new Date().toISOString();
    const [sub] = await db.update(ppapSubmissions).set(updates).where(eq(ppapSubmissions.id, toNum(input.id))).returning();
    return { success: true, message: "PPAP已更新", data: sub };
  }),

  // 删除
  delete: requirePermission('mfg:ppap:manage').input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id);
    await db.transaction(async (tx) => {
      await tx.delete(ppapElements).where(eq(ppapElements.submissionId, numId));
      await tx.delete(ppapSubmissions).where(eq(ppapSubmissions.id, numId));
    });
    return { success: true, message: "PPAP已删除" };
  }),

  // 更新元素状态
  updateElement: requirePermission('mfg:ppap:manage').input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.enum(["not_started", "in_progress", "completed", "not_applicable", "rejected"]),
    documentPath: z.string().optional(),
    reviewNotes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const updates: Record<string, unknown> = { status: input.status, updatedAt: new Date().toISOString() };
    if (input.documentPath !== undefined) updates.documentPath = input.documentPath;
    if (input.reviewNotes !== undefined) updates.reviewNotes = input.reviewNotes;
    if (input.status === "completed") updates.completedAt = new Date().toISOString();
    const [elem] = await db.update(ppapElements).set(updates).where(eq(ppapElements.id, toNum(input.id))).returning();
    return { success: true, message: "元素状态已更新", data: elem };
  }),

  // Auto-link PPAP elements to related FMEA, Control Plan, and MSA documents
  autoLinkDocuments: requirePermission('mfg:ppap:manage').input(z.object({
    submissionId: z.number(),
    projectId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const elements = await db.select().from(ppapElements)
      .where(eq(ppapElements.submissionId, input.submissionId)).limit(1000);
    if (elements.length === 0) return { success: false, message: "No PPAP elements found" };

    // Find related documents by project
    const fmeaDocs = await db.select().from(fmeaDocuments).limit(1000);
    const cpDocs = await db.select().from(controlPlans).limit(1000);
    const msaDocs = await db.select().from(msaStudies).limit(1000);

    const projectFilter = input.projectId
      ? (d: { projectId: number | null }) => d.projectId === input.projectId
      : () => true;

    const dfmeas = fmeaDocs.filter(d => d.fmeaType === "DFMEA" && projectFilter(d));
    const pfmeas = fmeaDocs.filter(d => d.fmeaType === "PFMEA" && projectFilter(d));
    const cps = cpDocs.filter(projectFilter);
    const msas = msaDocs.filter(projectFilter);

    let linked = 0;

    // Element 4: Design FMEA
    if (dfmeas.length > 0) {
      const elem4 = elements.find(e => e.elementNumber === 4);
      if (elem4 && elem4.status === "not_started") {
        await db.update(ppapElements).set({
          documentPath: `fmea:${dfmeas[0].id}`,
          reviewNotes: `Auto-linked to DFMEA: ${dfmeas[0].fmeaCode}`,
          status: "in_progress",
          updatedAt: new Date().toISOString(),
        }).where(eq(ppapElements.id, elem4.id));
        linked++;
      }
    }

    // Element 6: Process FMEA
    if (pfmeas.length > 0) {
      const elem6 = elements.find(e => e.elementNumber === 6);
      if (elem6 && elem6.status === "not_started") {
        await db.update(ppapElements).set({
          documentPath: `fmea:${pfmeas[0].id}`,
          reviewNotes: `Auto-linked to PFMEA: ${pfmeas[0].fmeaCode}`,
          status: "in_progress",
          updatedAt: new Date().toISOString(),
        }).where(eq(ppapElements.id, elem6.id));
        linked++;
      }
    }

    // Element 7: Control Plan
    if (cps.length > 0) {
      const elem7 = elements.find(e => e.elementNumber === 7);
      if (elem7 && elem7.status === "not_started") {
        await db.update(ppapElements).set({
          documentPath: `cp:${cps[0].id}`,
          reviewNotes: `Auto-linked to CP: ${cps[0].planCode}`,
          status: "in_progress",
          updatedAt: new Date().toISOString(),
        }).where(eq(ppapElements.id, elem7.id));
        linked++;
      }
    }

    // Element 8: MSA
    if (msas.length > 0) {
      const elem8 = elements.find(e => e.elementNumber === 8);
      if (elem8 && elem8.status === "not_started") {
        await db.update(ppapElements).set({
          documentPath: `msa:${msas[0].id}`,
          reviewNotes: `Auto-linked to MSA: ${msas[0].studyCode}`,
          status: "in_progress",
          updatedAt: new Date().toISOString(),
        }).where(eq(ppapElements.id, elem8.id));
        linked++;
      }
    }

    return { success: true, message: `${linked} PPAP elements auto-linked to existing documents`, linked };
  }),

  // 获取18元素定义
  getElementDefinitions: protectedProcedure.query(() => PPAP_18_ELEMENTS),

  // 获取等级要求
  getLevelRequirements: protectedProcedure.input(z.object({
    level: z.enum(["1", "2", "3", "4", "5"]),
  })).query(({ input }) => {
    const required = LEVEL_REQUIREMENTS[input.level] || [];
    return PPAP_18_ELEMENTS.map(e => ({ ...e, required: required.includes(e.number) }));
  }),

  // 统计
  getStats: protectedProcedure.input(z.object({ projectId: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let subs = await db.select().from(ppapSubmissions).limit(1000);
    if (input?.projectId) subs = subs.filter(s => s.projectId === input.projectId);
    return {
      total: subs.length,
      byStatus: {
        draft: subs.filter(s => s.status === "draft").length,
        submitted: subs.filter(s => s.status === "submitted").length,
        approved: subs.filter(s => s.status === "approved").length,
        rejected: subs.filter(s => s.status === "rejected").length,
        interim_approved: subs.filter(s => s.status === "interim_approved").length,
      },
    };
  }),
});

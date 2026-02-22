/**
 * GRT Light-PLM — tRPC Router
 * Document management, file versioning, and design review workflows
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  plmDocuments,
  plmDocumentVersions,
  plmDesignReviews,
} from "../../drizzle/plm-schema";
import { users } from "../../drizzle/schema";
import {
  createDocument,
  uploadNewVersion,
  promoteToMajorVersion,
  submitForReview,
  recordReviewDecision,
} from "../services/plm.service";
import { eq, and, desc, count, ilike, sql } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const plmRouter = router({

  // ══════════════════════════════════════════════════
  // Documents — CRUD
  // ══════════════════════════════════════════════════

  listDocuments: publicProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
    docType: z.string().optional(),
    currentStatus: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.projectId) {
      conditions.push(eq(plmDocuments.projectId, toNum(input.projectId)));
    }
    if (input?.docType) {
      conditions.push(eq(plmDocuments.docType, input.docType as any));
    }
    if (input?.currentStatus) {
      conditions.push(eq(plmDocuments.currentStatus, input.currentStatus as any));
    }
    if (input?.search) {
      conditions.push(ilike(plmDocuments.title, `%${input.search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(plmDocuments)
        .where(where)
        .orderBy(desc(plmDocuments.updatedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(plmDocuments).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  getDocument: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [doc] = await db.select().from(plmDocuments)
      .where(eq(plmDocuments.id, toNum(input.id)));
    if (!doc) return null;

    // Fetch version history + ALL reviews for the document in parallel
    const [versions, allReviews] = await Promise.all([
      db.select().from(plmDocumentVersions)
        .where(eq(plmDocumentVersions.documentId, doc.id))
        .orderBy(desc(plmDocumentVersions.versionMajor), desc(plmDocumentVersions.versionMinor)),
      db.select().from(plmDesignReviews)
        .where(
          sql`${plmDesignReviews.documentVersionId} IN (
            SELECT id FROM plm_document_versions WHERE document_id = ${doc.id}
          )`
        )
        .orderBy(desc(plmDesignReviews.createdAt)),
    ]);

    // Group reviews by version for the frontend
    const latestVersion = versions.find(v => v.isLatest);
    const reviews = latestVersion
      ? allReviews.filter(r => r.documentVersionId === latestVersion.id)
      : [];

    return { ...doc, versions, reviews, allReviews };
  }),

  createDocument: publicProcedure.input(z.object({
    docNumber: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    docType: z.enum(["mechanical", "electrical", "software", "manual"]),
    projectId: z.number().optional(),
    projectCode: z.string().optional(),
    ownerUserId: z.number().optional(),
    ownerName: z.string().optional(),
    fileExtension: z.string().optional(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    createdBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    return createDocument(input);
  }),

  updateDocument: publicProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    description: z.string().optional(),
    docType: z.enum(["mechanical", "electrical", "software", "manual"]).optional(),
    currentStatus: z.enum(["draft", "in_review", "released", "obsolete"]).optional(),
    ownerUserId: z.number().optional(),
    ownerName: z.string().optional(),
    tags: z.array(z.string()).optional(),
    updatedBy: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    // Validate FK references before update
    if (input.ownerUserId) {
      const [user] = await db.select({ id: users.id }).from(users)
        .where(eq(users.id, input.ownerUserId)).limit(1);
      if (!user) throw new Error(`FK violation: users.id=${input.ownerUserId} does not exist`);
    }
    if (input.updatedBy) {
      const [user] = await db.select({ id: users.id }).from(users)
        .where(eq(users.id, input.updatedBy)).limit(1);
      if (!user) throw new Error(`FK violation: users.id=${input.updatedBy} does not exist`);
    }

    const { id, ...data } = input;
    const [updated] = await db.update(plmDocuments)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(plmDocuments.id, toNum(id)))
      .returning();
    return updated;
  }),

  // ══════════════════════════════════════════════════
  // Versions — Upload & History
  // ══════════════════════════════════════════════════

  uploadVersion: publicProcedure.input(z.object({
    documentId: z.union([z.string(), z.number()]),
    fileUrlPath: z.string().min(1),
    originalFileName: z.string().optional(),
    fileSizeBytes: z.number().optional(),
    fileHash: z.string().optional(),
    changeReason: z.string().min(1),
    uploadedBy: z.number(),
    uploadedByName: z.string().optional(),
  })).mutation(async ({ input }) => {
    return uploadNewVersion({
      ...input,
      documentId: toNum(input.documentId),
    });
  }),

  promoteMajorVersion: publicProcedure.input(z.object({
    documentId: z.union([z.string(), z.number()]),
    fileUrlPath: z.string().min(1),
    uploadedBy: z.number(),
    uploadedByName: z.string().optional(),
  })).mutation(async ({ input }) => {
    return promoteToMajorVersion(
      toNum(input.documentId),
      input.fileUrlPath,
      input.uploadedBy,
      input.uploadedByName,
    );
  }),

  listVersions: publicProcedure.input(z.object({
    documentId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const items = await db.select().from(plmDocumentVersions)
      .where(eq(plmDocumentVersions.documentId, toNum(input.documentId)))
      .orderBy(desc(plmDocumentVersions.versionMajor), desc(plmDocumentVersions.versionMinor));
    return { items, total: items.length };
  }),

  // ══════════════════════════════════════════════════
  // Design Reviews — Submit & Decide
  // ══════════════════════════════════════════════════

  submitReview: publicProcedure.input(z.object({
    documentVersionId: z.union([z.string(), z.number()]),
    reviewerUserId: z.number(),
    reviewerName: z.string().optional(),
    reviewerRole: z.string().optional(),
    dueDate: z.string().optional(),
    requestedBy: z.number().optional(),
    isDesignFreezeReview: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    return submitForReview({
      ...input,
      documentVersionId: toNum(input.documentVersionId),
    });
  }),

  recordDecision: publicProcedure.input(z.object({
    reviewId: z.union([z.string(), z.number()]),
    reviewStatus: z.enum(["approved", "rejected", "revision_requested"]),
    comments: z.string().optional(),
  })).mutation(async ({ input }) => {
    return recordReviewDecision({
      ...input,
      reviewId: toNum(input.reviewId),
    });
  }),

  listReviews: publicProcedure.input(z.object({
    documentVersionId: z.union([z.string(), z.number()]).optional(),
    reviewerUserId: z.number().optional(),
    reviewStatus: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.documentVersionId) {
      conditions.push(eq(plmDesignReviews.documentVersionId, toNum(input.documentVersionId)));
    }
    if (input?.reviewerUserId) {
      conditions.push(eq(plmDesignReviews.reviewerUserId, input.reviewerUserId));
    }
    if (input?.reviewStatus) {
      conditions.push(eq(plmDesignReviews.reviewStatus, input.reviewStatus as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(plmDesignReviews)
        .where(where)
        .orderBy(desc(plmDesignReviews.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0),
      db.select({ value: count() }).from(plmDesignReviews).where(where),
    ]);

    return { items, total: Number(total) };
  }),

  // ══════════════════════════════════════════════════
  // Dashboard aggregates
  // ══════════════════════════════════════════════════

  /** Global stats (no filters) — accurate counts for stat cards */
  getStats: publicProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];

    if (input?.projectId) {
      conditions.push(eq(plmDocuments.projectId, toNum(input.projectId)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Parallel COUNT queries — always accurate regardless of filters/pagination
    const [
      [{ value: total }],
      [{ value: released }],
      [{ value: inReview }],
      [{ value: frozen }],
    ] = await Promise.all([
      db.select({ value: count() }).from(plmDocuments).where(where),
      db.select({ value: count() }).from(plmDocuments).where(
        where ? and(where, eq(plmDocuments.currentStatus, "released")) : eq(plmDocuments.currentStatus, "released")
      ),
      db.select({ value: count() }).from(plmDocuments).where(
        where ? and(where, eq(plmDocuments.currentStatus, "in_review")) : eq(plmDocuments.currentStatus, "in_review")
      ),
      db.select({ value: count() }).from(plmDocuments).where(
        where ? and(where, eq(plmDocuments.designFreezeApproved, true)) : eq(plmDocuments.designFreezeApproved, true)
      ),
    ]);

    const t = Number(total);
    const f = Number(frozen);

    return {
      total: t,
      released: Number(released),
      inReview: Number(inReview),
      frozen: f,
      freezeRate: t > 0 ? Math.round((f / t) * 100) : 0,
    };
  }),

  getProjectSummary: publicProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const projectId = toNum(input.projectId);

    const docs = await db.select().from(plmDocuments)
      .where(eq(plmDocuments.projectId, projectId));

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let frozenCount = 0;

    for (const doc of docs) {
      byType[doc.docType] = (byType[doc.docType] ?? 0) + 1;
      byStatus[doc.currentStatus] = (byStatus[doc.currentStatus] ?? 0) + 1;
      if (doc.designFreezeApproved) frozenCount++;
    }

    return {
      totalDocuments: docs.length,
      byType,
      byStatus,
      frozenCount,
      freezeRate: docs.length > 0 ? Math.round((frozenCount / docs.length) * 100) : 0,
    };
  }),
});

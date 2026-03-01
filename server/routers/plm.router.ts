/**
 * GRT Light-PLM — tRPC Router
 * Document management, file versioning, and design review workflows
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { buScopeCondition } from "../_core/gateway-bu-context.middleware";
import { requireDb } from "../db";
import {
  plmDocuments,
  plmDocumentVersions,
  plmDesignReviews,
} from "../../drizzle/plm-schema";
import { users, projects } from "../../drizzle/schema";
import {
  createDocument,
  uploadNewVersion,
  promoteToMajorVersion,
  submitForReview,
  recordReviewDecision,
} from "../services/plm.service";
import { eq, and, desc, count, ilike, sql, inArray } from "drizzle-orm";

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

export const plmRouter = router({

  // ══════════════════════════════════════════════════
  // Documents — CRUD
  // ══════════════════════════════════════════════════

  listDocuments: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
    docType: z.string().optional(),
    currentStatus: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const conditions = [];

    // BU isolation: restrict to projects visible to user's BU
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(plmDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }

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

  getDocument: protectedProcedure.input(idInput).query(async ({ input, ctx }) => {
    const db = await requireDb();
    // BU isolation: verify document belongs to user's BU-scoped project
    const scopedIds = await buScopedProjectIds(ctx);
    const conditions = [eq(plmDocuments.id, toNum(input.id))];
    if (scopedIds) {
      conditions.push(inArray(plmDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }
    const [doc] = await db.select().from(plmDocuments).where(and(...conditions));
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

  createDocument: protectedProcedure.input(z.object({
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
  })).mutation(async ({ input, ctx }) => {
    return createDocument({ ...input, createdBy: ctx.user.id });
  }),

  updateDocument: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().optional(),
    description: z.string().optional(),
    docType: z.enum(["mechanical", "electrical", "software", "manual"]).optional(),
    currentStatus: z.enum(["draft", "in_review", "released", "obsolete"]).optional(),
    ownerUserId: z.number().optional(),
    ownerName: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();

    // Validate FK references before update
    if (input.ownerUserId) {
      const [user] = await db.select({ id: users.id }).from(users)
        .where(eq(users.id, input.ownerUserId)).limit(1);
      if (!user) throw new Error(`FK violation: users.id=${input.ownerUserId} does not exist`);
    }

    const { id, ...data } = input;
    const [updated] = await db.update(plmDocuments)
      .set({ ...data, updatedBy: ctx.user.id, updatedAt: new Date().toISOString() })
      .where(eq(plmDocuments.id, toNum(id)))
      .returning();
    return updated;
  }),

  // ══════════════════════════════════════════════════
  // Versions — Upload & History
  // ══════════════════════════════════════════════════

  uploadVersion: protectedProcedure.input(z.object({
    documentId: z.union([z.string(), z.number()]),
    fileUrlPath: z.string().min(1),
    originalFileName: z.string().optional(),
    fileSizeBytes: z.number().optional(),
    fileHash: z.string().optional(),
    changeReason: z.string().min(1),
  })).mutation(async ({ input, ctx }) => {
    return uploadNewVersion({
      ...input,
      documentId: toNum(input.documentId),
      uploadedBy: ctx.user.id,
      uploadedByName: ctx.user.name ?? `User#${ctx.user.id}`,
    });
  }),

  promoteMajorVersion: protectedProcedure.input(z.object({
    documentId: z.union([z.string(), z.number()]),
    fileUrlPath: z.string().min(1),
  })).mutation(async ({ input, ctx }) => {
    return promoteToMajorVersion(
      toNum(input.documentId),
      input.fileUrlPath,
      ctx.user.id,
      ctx.user.name ?? `User#${ctx.user.id}`,
    );
  }),

  listVersions: protectedProcedure.input(z.object({
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

  submitReview: protectedProcedure.input(z.object({
    documentVersionId: z.union([z.string(), z.number()]),
    reviewerUserId: z.number(),
    reviewerName: z.string().optional(),
    reviewerRole: z.string().optional(),
    dueDate: z.string().optional(),
    isDesignFreezeReview: z.boolean().optional(),
  })).mutation(async ({ input, ctx }) => {
    return submitForReview({
      ...input,
      documentVersionId: toNum(input.documentVersionId),
      requestedBy: ctx.user.id,
    });
  }),

  recordDecision: protectedProcedure.input(z.object({
    reviewId: z.union([z.string(), z.number()]),
    reviewStatus: z.enum(["approved", "rejected", "revision_requested"]),
    comments: z.string().optional(),
  })).mutation(async ({ input }) => {
    return recordReviewDecision({
      ...input,
      reviewId: toNum(input.reviewId),
    });
  }),

  listReviews: protectedProcedure.input(z.object({
    documentVersionId: z.union([z.string(), z.number()]).optional(),
    reviewerUserId: z.number().optional(),
    reviewStatus: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  })).query(async ({ input, ctx }) => {
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

  /** Global stats (BU-scoped) — accurate counts for stat cards */
  getStats: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]).optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const conditions = [];

    // BU isolation
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds) {
      conditions.push(inArray(plmDocuments.projectId, scopedIds.length > 0 ? scopedIds : [0]));
    }

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

  getProjectSummary: protectedProcedure.input(z.object({
    projectId: z.union([z.string(), z.number()]),
  })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const projectId = toNum(input.projectId);

    // BU isolation: verify project belongs to user's BU
    const scopedIds = await buScopedProjectIds(ctx);
    if (scopedIds && !scopedIds.includes(projectId)) {
      return { totalDocuments: 0, byType: {}, byStatus: {}, frozenCount: 0, freezeRate: 0 };
    }

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

/**
 * Enterprise Document Governance Router — 企业文档治理平台
 *
 * 8 sub-routers (A–H), ~42 procedures
 * Three-layer model: Registry → Templates/Versions → Instances
 *
 * Integrates with: OA Forms (approval), PLM (versioning), Doc-Intelligence (search)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  orgDocumentRegistry,
  orgDocumentVersions,
  orgDocumentInstances,
  orgDocumentLinks,
  orgDocumentAuditLog,
  orgDocumentReviewSchedule,
} from "../../drizzle/org-document-schema";
import { eq, desc, and, sql, count, asc, lte, gte, like, or, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import * as crypto from "crypto";

const log = createChildLogger("org-document");

// ── Helpers ──────────────────────────────────────────────────

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function generateInstanceCode(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `DOC-${date}-${rand}`;
}

async function recordAudit(
  db: any,
  params: {
    documentId?: number | null;
    instanceId?: number | null;
    action: string;
    userId?: number | null;
    userName?: string | null;
    userRole?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string;
  },
) {
  try {
    await db.insert(orgDocumentAuditLog).values({
      documentId: params.documentId ?? null,
      instanceId: params.instanceId ?? null,
      action: params.action,
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      userRole: params.userRole ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    log.error({ err }, "Failed to write doc audit log");
  }
}

// ═══════════════════════════════════════════════════════════════
// Group A: Registry CRUD (7 procedures)
// ═══════════════════════════════════════════════════════════════

const registryRouter = router({
  listDocuments: requirePermission("doc:registry:view")
    .input(
      z.object({
        domain: z.string().optional(),
        subdomain: z.string().optional(),
        docType: z.string().optional(),
        status: z.string().optional(),
        buCode: z.string().optional(),
        ownerRole: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        reviewOverdue: z.boolean().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [];
      if (input.domain) conditions.push(eq(orgDocumentRegistry.domain, input.domain));
      if (input.subdomain) conditions.push(eq(orgDocumentRegistry.subdomain, input.subdomain));
      if (input.docType) conditions.push(eq(orgDocumentRegistry.docType, input.docType));
      if (input.status) conditions.push(eq(orgDocumentRegistry.status, input.status));
      if (input.buCode) conditions.push(eq(orgDocumentRegistry.buCode, input.buCode));
      if (input.ownerRole) conditions.push(eq(orgDocumentRegistry.ownerRole, input.ownerRole));
      if (input.reviewOverdue) conditions.push(eq(orgDocumentRegistry.reviewOverdue, true));
      if (input.search) {
        conditions.push(
          or(
            like(orgDocumentRegistry.title, `%${input.search}%`),
            like(orgDocumentRegistry.docCode, `%${input.search}%`),
          )!,
        );
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(orgDocumentRegistry).where(whereClause);
      const total = Number(totalResult?.count ?? 0);

      const items = await db
        .select()
        .from(orgDocumentRegistry)
        .where(whereClause)
        .orderBy(desc(orgDocumentRegistry.updatedAt))
        .limit(pageSize)
        .offset(offset);

      return { items, total, page, pageSize };
    }),

  getDocument: requirePermission("doc:registry:view")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.id))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      // Increment view count
      await db
        .update(orgDocumentRegistry)
        .set({ viewCount: doc.viewCount + 1 })
        .where(eq(orgDocumentRegistry.id, input.id));

      // Fetch versions
      const versions = await db
        .select()
        .from(orgDocumentVersions)
        .where(eq(orgDocumentVersions.documentId, input.id))
        .orderBy(desc(orgDocumentVersions.createdAt))
        .limit(100);

      // Fetch links
      const links = await db
        .select()
        .from(orgDocumentLinks)
        .where(
          or(
            eq(orgDocumentLinks.sourceDocId, input.id),
            eq(orgDocumentLinks.targetDocId, input.id),
          ),
        )
        .limit(200);

      await recordAudit(db, {
        documentId: input.id,
        action: "view",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        userRole: ctx.user?.role,
      });

      return { ...doc, versions, links };
    }),

  createDocument: requirePermission("doc:registry:manage")
    .input(
      z.object({
        docCode: z.string().min(1).max(80),
        title: z.string().min(1).max(500),
        titleEn: z.string().max(500).optional(),
        description: z.string().optional(),
        domain: z.string().min(1).max(100),
        subdomain: z.string().min(1).max(100),
        docType: z.string().min(1).max(30),
        ownerRole: z.string().max(50).optional(),
        buCode: z.string().max(50).optional(),
        reviewFrequency: z.string().max(30).optional(),
        markdownContent: z.string().optional(),
        tags: z.array(z.string()).optional(),
        systemRoutes: z.array(z.string()).optional(),
        systemRoles: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const hash = input.markdownContent ? sha256(input.markdownContent) : null;

      const [doc] = await db
        .insert(orgDocumentRegistry)
        .values({
          docCode: input.docCode.trim(),
          title: input.title.trim(),
          titleEn: input.titleEn?.trim() || null,
          description: input.description?.trim() || null,
          domain: input.domain.trim(),
          subdomain: input.subdomain.trim(),
          docType: input.docType,
          ownerRole: input.ownerRole || null,
          buCode: input.buCode || null,
          allBus: !input.buCode,
          reviewFrequency: input.reviewFrequency || null,
          markdownContent: input.markdownContent || null,
          contentHash: hash,
          tags: input.tags || null,
          systemRoutes: input.systemRoutes || null,
          systemRoles: input.systemRoles || null,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .returning();

      // Create initial V1.0 version
      await db.insert(orgDocumentVersions).values({
        documentId: doc.id,
        versionString: "V1.0",
        versionMajor: 1,
        versionMinor: 0,
        markdownContent: input.markdownContent || null,
        contentHash: hash,
        changeType: "initial",
        changeReason: "Initial document registration",
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name || null,
        isLatest: true,
        reviewStatus: "approved",
      });

      log.info({ docCode: doc.docCode, id: doc.id }, "Document registered");
      return doc;
    }),

  updateDocument: requirePermission("doc:registry:manage")
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(500).optional(),
        titleEn: z.string().max(500).optional(),
        description: z.string().optional(),
        ownerRole: z.string().max(50).optional(),
        approverRole: z.string().max(50).optional(),
        buCode: z.string().max(50).optional(),
        reviewFrequency: z.string().max(30).optional(),
        tags: z.array(z.string()).optional(),
        systemRoutes: z.array(z.string()).optional(),
        systemRoles: z.array(z.string()).optional(),
        status: z.string().max(30).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { id, ...updates } = input;

      const [existing] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const setData: Record<string, unknown> = { updatedBy: ctx.user?.id, updatedAt: new Date().toISOString() };
      if (updates.title !== undefined) setData.title = updates.title.trim();
      if (updates.titleEn !== undefined) setData.titleEn = updates.titleEn.trim() || null;
      if (updates.description !== undefined) setData.description = updates.description.trim() || null;
      if (updates.ownerRole !== undefined) setData.ownerRole = updates.ownerRole || null;
      if (updates.approverRole !== undefined) setData.approverRole = updates.approverRole || null;
      if (updates.buCode !== undefined) { setData.buCode = updates.buCode || null; setData.allBus = !updates.buCode; }
      if (updates.reviewFrequency !== undefined) setData.reviewFrequency = updates.reviewFrequency || null;
      if (updates.tags !== undefined) setData.tags = updates.tags;
      if (updates.systemRoutes !== undefined) setData.systemRoutes = updates.systemRoutes;
      if (updates.systemRoles !== undefined) setData.systemRoles = updates.systemRoles;
      if (updates.status !== undefined) setData.status = updates.status;

      const [updated] = await db
        .update(orgDocumentRegistry)
        .set(setData)
        .where(eq(orgDocumentRegistry.id, id))
        .returning();

      return updated;
    }),

  updateDocumentContent: requirePermission("doc:template:edit")
    .input(
      z.object({
        id: z.number().int(),
        markdownContent: z.string(),
        changeReason: z.string().min(1).max(500),
        isMajor: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.id))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const newHash = sha256(input.markdownContent);
      if (newHash === doc.contentHash) {
        return { ...doc, message: "No content change detected" };
      }

      // Calculate new version
      const newMajor = input.isMajor ? doc.versionMajor + 1 : doc.versionMajor;
      const newMinor = input.isMajor ? 0 : doc.versionMinor + 1;
      const versionString = `V${newMajor}.${newMinor}`;

      // Mark old versions as not latest
      await db
        .update(orgDocumentVersions)
        .set({ isLatest: false })
        .where(eq(orgDocumentVersions.documentId, input.id));

      // Create new version snapshot
      await db.insert(orgDocumentVersions).values({
        documentId: input.id,
        versionString,
        versionMajor: newMajor,
        versionMinor: newMinor,
        markdownContent: input.markdownContent,
        contentHash: newHash,
        changeType: input.isMajor ? "major" : "minor",
        changeReason: input.changeReason.trim(),
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name || null,
        isLatest: true,
        reviewStatus: input.isMajor ? "pending_review" : "approved",
      });

      // Update registry
      const [updated] = await db
        .update(orgDocumentRegistry)
        .set({
          markdownContent: input.markdownContent,
          contentHash: newHash,
          currentVersion: versionString,
          versionMajor: newMajor,
          versionMinor: newMinor,
          totalVersions: doc.totalVersions + 1,
          updatedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgDocumentRegistry.id, input.id))
        .returning();

      log.info({ docId: input.id, version: versionString }, "Document content updated");

      await recordAudit(db, {
        documentId: input.id,
        action: "create_version",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        details: { version: versionString, changeType: input.isMajor ? "major" : "minor" },
      });

      return updated;
    }),

  archiveDocument: requirePermission("doc:registry:manage")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(orgDocumentRegistry)
        .set({ status: "archived", updatedBy: ctx.user?.id, updatedAt: new Date().toISOString() })
        .where(eq(orgDocumentRegistry.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      log.info({ docId: input.id }, "Document archived");
      return updated;
    }),

  getRegistryStats: requirePermission("doc:registry:view")
    .query(async () => {
      const db = await requireDb();
      const allDocs = await db
        .select({
          domain: orgDocumentRegistry.domain,
          status: orgDocumentRegistry.status,
          reviewOverdue: orgDocumentRegistry.reviewOverdue,
          docType: orgDocumentRegistry.docType,
        })
        .from(orgDocumentRegistry)
        .limit(5000);

      const byDomain: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let overdueCount = 0;
      for (const d of allDocs) {
        byDomain[d.domain] = (byDomain[d.domain] || 0) + 1;
        byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        byType[d.docType] = (byType[d.docType] || 0) + 1;
        if (d.reviewOverdue) overdueCount++;
      }

      return { total: allDocs.length, byDomain, byStatus, byType, overdueCount };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group B: Version Management (5 procedures)
// ═══════════════════════════════════════════════════════════════

const versionRouter = router({
  listVersions: requirePermission("doc:registry:view")
    .input(z.object({ documentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(orgDocumentVersions)
        .where(eq(orgDocumentVersions.documentId, input.documentId))
        .orderBy(desc(orgDocumentVersions.createdAt))
        .limit(200);
    }),

  getVersion: requirePermission("doc:registry:view")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [v] = await db
        .select()
        .from(orgDocumentVersions)
        .where(eq(orgDocumentVersions.id, input.id))
        .limit(1);
      if (!v) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      return v;
    }),

  createMinorVersion: requirePermission("doc:template:edit")
    .input(
      z.object({
        documentId: z.number().int(),
        markdownContent: z.string(),
        changeReason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.documentId))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const newMinor = doc.versionMinor + 1;
      const versionString = `V${doc.versionMajor}.${newMinor}`;
      const hash = sha256(input.markdownContent);

      await db.update(orgDocumentVersions).set({ isLatest: false }).where(eq(orgDocumentVersions.documentId, input.documentId));

      const [version] = await db.insert(orgDocumentVersions).values({
        documentId: input.documentId,
        versionString,
        versionMajor: doc.versionMajor,
        versionMinor: newMinor,
        markdownContent: input.markdownContent,
        contentHash: hash,
        changeType: "minor",
        changeReason: input.changeReason.trim(),
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name || null,
        isLatest: true,
        reviewStatus: "approved",
      }).returning();

      await db.update(orgDocumentRegistry).set({
        markdownContent: input.markdownContent,
        contentHash: hash,
        currentVersion: versionString,
        versionMinor: newMinor,
        totalVersions: doc.totalVersions + 1,
        updatedBy: ctx.user?.id,
        updatedAt: new Date().toISOString(),
      }).where(eq(orgDocumentRegistry.id, input.documentId));

      return version;
    }),

  createMajorVersion: requirePermission("doc:template:edit")
    .input(
      z.object({
        documentId: z.number().int(),
        markdownContent: z.string(),
        changeReason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.documentId))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const newMajor = doc.versionMajor + 1;
      const versionString = `V${newMajor}.0`;
      const hash = sha256(input.markdownContent);

      await db.update(orgDocumentVersions).set({ isLatest: false }).where(eq(orgDocumentVersions.documentId, input.documentId));

      const [version] = await db.insert(orgDocumentVersions).values({
        documentId: input.documentId,
        versionString,
        versionMajor: newMajor,
        versionMinor: 0,
        markdownContent: input.markdownContent,
        contentHash: hash,
        changeType: "major",
        changeReason: input.changeReason.trim(),
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name || null,
        isLatest: true,
        reviewStatus: "pending_review",
      }).returning();

      await db.update(orgDocumentRegistry).set({
        markdownContent: input.markdownContent,
        contentHash: hash,
        currentVersion: versionString,
        versionMajor: newMajor,
        versionMinor: 0,
        totalVersions: doc.totalVersions + 1,
        updatedBy: ctx.user?.id,
        updatedAt: new Date().toISOString(),
      }).where(eq(orgDocumentRegistry.id, input.documentId));

      log.info({ docId: input.documentId, version: versionString }, "Major version created (pending review)");
      return version;
    }),

  approveVersion: requirePermission("doc:version:approve")
    .input(
      z.object({
        id: z.number().int(),
        comment: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [v] = await db
        .select()
        .from(orgDocumentVersions)
        .where(eq(orgDocumentVersions.id, input.id))
        .limit(1);
      if (!v) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      if (v.reviewStatus !== "pending_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Version is not pending review" });
      }

      const [updated] = await db.update(orgDocumentVersions).set({
        reviewStatus: "approved",
        reviewedBy: ctx.user?.id,
        reviewedAt: new Date().toISOString(),
        reviewComment: input.comment || null,
      }).where(eq(orgDocumentVersions.id, input.id)).returning();

      await recordAudit(db, {
        documentId: v.documentId,
        action: "approve",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        details: { versionId: v.id, version: v.versionString },
      });

      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group C: Document Instances (7 procedures)
// ═══════════════════════════════════════════════════════════════

const instanceRouter = router({
  listInstances: requirePermission("doc:instance:create")
    .input(
      z.object({
        templateId: z.number().int().optional(),
        projectId: z.number().int().optional(),
        buCode: z.string().optional(),
        stageCode: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [];
      if (input.templateId) conditions.push(eq(orgDocumentInstances.templateId, input.templateId));
      if (input.projectId) conditions.push(eq(orgDocumentInstances.projectId, input.projectId));
      if (input.buCode) conditions.push(eq(orgDocumentInstances.buCode, input.buCode));
      if (input.stageCode) conditions.push(eq(orgDocumentInstances.stageCode, input.stageCode));
      if (input.status) conditions.push(eq(orgDocumentInstances.status, input.status));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(orgDocumentInstances).where(whereClause);
      const total = Number(totalResult?.count ?? 0);

      const items = await db
        .select()
        .from(orgDocumentInstances)
        .where(whereClause)
        .orderBy(desc(orgDocumentInstances.createdAt))
        .limit(pageSize)
        .offset(offset);

      return { items, total, page, pageSize };
    }),

  getInstance: requirePermission("doc:instance:create")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [inst] = await db
        .select()
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.id, input.id))
        .limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      return inst;
    }),

  createInstance: requirePermission("doc:instance:create")
    .input(
      z.object({
        templateId: z.number().int(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        markdownContent: z.string().optional(),
        formData: z.record(z.string(), z.unknown()).optional(),
        projectId: z.number().int().optional(),
        projectCode: z.string().max(50).optional(),
        buCode: z.string().max(50).optional(),
        stageCode: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Validate template exists
      const [template] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.templateId))
        .limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const instanceCode = generateInstanceCode();
      const content = input.markdownContent || template.markdownContent || "";

      const [inst] = await db.insert(orgDocumentInstances).values({
        instanceCode,
        templateId: input.templateId,
        templateVersion: template.currentVersion,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        markdownContent: content,
        formData: input.formData || null,
        projectId: input.projectId || null,
        projectCode: input.projectCode?.trim() || null,
        buCode: input.buCode || null,
        stageCode: input.stageCode || null,
        createdBy: ctx.user?.id,
        createdByName: ctx.user?.name || null,
        updatedBy: ctx.user?.id,
      }).returning();

      // Increment template usage count
      await db
        .update(orgDocumentRegistry)
        .set({ usageCount: template.usageCount + 1 })
        .where(eq(orgDocumentRegistry.id, input.templateId));

      await recordAudit(db, {
        documentId: input.templateId,
        instanceId: inst.id,
        action: "create_instance",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        details: { instanceCode, templateVersion: template.currentVersion },
      });

      log.info({ instanceCode, templateId: input.templateId }, "Document instance created");
      return inst;
    }),

  updateInstance: requirePermission("doc:instance:create")
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        markdownContent: z.string().optional(),
        formData: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db
        .select()
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.id, input.id))
        .limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      if (inst.status !== "draft" && inst.status !== "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft or rejected instances can be edited" });
      }

      const setData: Record<string, unknown> = { updatedBy: ctx.user?.id, updatedAt: new Date().toISOString() };
      if (input.title) setData.title = input.title.trim();
      if (input.description !== undefined) setData.description = input.description?.trim() || null;
      if (input.markdownContent !== undefined) setData.markdownContent = input.markdownContent;
      if (input.formData !== undefined) setData.formData = input.formData;

      const [updated] = await db
        .update(orgDocumentInstances)
        .set(setData)
        .where(eq(orgDocumentInstances.id, input.id))
        .returning();

      return updated;
    }),

  submitInstance: requirePermission("doc:instance:create")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db
        .select()
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.id, input.id))
        .limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      if (inst.status !== "draft" && inst.status !== "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft or rejected instances can be submitted" });
      }

      const [updated] = await db
        .update(orgDocumentInstances)
        .set({
          status: "pending",
          currentApprovalStep: 1,
          updatedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgDocumentInstances.id, input.id))
        .returning();

      log.info({ instanceId: input.id }, "Instance submitted for approval");
      return updated;
    }),

  approveInstance: requirePermission("doc:instance:approve")
    .input(z.object({ id: z.number().int(), comment: z.string().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db
        .select()
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.id, input.id))
        .limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      if (inst.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending instances can be approved" });
      }

      const [updated] = await db
        .update(orgDocumentInstances)
        .set({
          status: "approved",
          approvedAt: new Date().toISOString(),
          updatedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgDocumentInstances.id, input.id))
        .returning();

      await recordAudit(db, {
        instanceId: input.id,
        documentId: inst.templateId,
        action: "approve",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        details: { comment: input.comment },
      });

      return updated;
    }),

  rejectInstance: requirePermission("doc:instance:approve")
    .input(z.object({ id: z.number().int(), reason: z.string().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db
        .select()
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.id, input.id))
        .limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      if (inst.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending instances can be rejected" });
      }

      const [updated] = await db
        .update(orgDocumentInstances)
        .set({
          status: "rejected",
          updatedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgDocumentInstances.id, input.id))
        .returning();

      await recordAudit(db, {
        instanceId: input.id,
        documentId: inst.templateId,
        action: "reject",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        details: { reason: input.reason },
      });

      return updated;
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group D: Cross-Links (4 procedures)
// ═══════════════════════════════════════════════════════════════

const linkRouter = router({
  listLinks: requirePermission("doc:registry:view")
    .input(z.object({ documentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(orgDocumentLinks)
        .where(
          or(
            eq(orgDocumentLinks.sourceDocId, input.documentId),
            eq(orgDocumentLinks.targetDocId, input.documentId),
          ),
        )
        .limit(500);
    }),

  createLink: requirePermission("doc:links:manage")
    .input(
      z.object({
        sourceDocId: z.number().int(),
        targetDocId: z.number().int().optional(),
        targetType: z.string().min(1).max(30),
        targetEntityId: z.number().int().optional(),
        targetPath: z.string().max(500).optional(),
        linkType: z.string().min(1).max(30),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [link] = await db.insert(orgDocumentLinks).values({
        sourceDocId: input.sourceDocId,
        targetDocId: input.targetDocId || null,
        targetType: input.targetType,
        targetEntityId: input.targetEntityId || null,
        targetPath: input.targetPath || null,
        linkType: input.linkType,
        description: input.description?.trim() || null,
        createdBy: ctx.user?.id,
      }).returning();
      return link;
    }),

  deleteLink: requirePermission("doc:links:manage")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [deleted] = await db
        .delete(orgDocumentLinks)
        .where(eq(orgDocumentLinks.id, input.id))
        .returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      return { success: true };
    }),

  getLinkedDocuments: requirePermission("doc:registry:view")
    .input(
      z.object({
        targetPath: z.string().optional(),
        targetType: z.string().optional(),
        projectId: z.number().int().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input.targetPath) conditions.push(eq(orgDocumentLinks.targetPath, input.targetPath));
      if (input.targetType) conditions.push(eq(orgDocumentLinks.targetType, input.targetType));
      if (input.projectId) conditions.push(eq(orgDocumentLinks.targetEntityId, input.projectId));
      if (conditions.length === 0) return [];

      const links = await db
        .select()
        .from(orgDocumentLinks)
        .where(and(...conditions))
        .limit(200);

      // Resolve source documents
      const docIds = [...new Set(links.map((l) => l.sourceDocId))];
      if (docIds.length === 0) return [];

      const docs = await db
        .select({
          id: orgDocumentRegistry.id,
          docCode: orgDocumentRegistry.docCode,
          title: orgDocumentRegistry.title,
          domain: orgDocumentRegistry.domain,
          docType: orgDocumentRegistry.docType,
        })
        .from(orgDocumentRegistry)
        .where(or(...docIds.map((id) => eq(orgDocumentRegistry.id, id)))!)
        .limit(200);

      return docs;
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group E: Compliance & Review (6 procedures)
// ═══════════════════════════════════════════════════════════════

const complianceRouter = router({
  getOverdueReviews: requirePermission("doc:registry:view")
    .query(async () => {
      const db = await requireDb();
      return db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.reviewOverdue, true))
        .orderBy(asc(orgDocumentRegistry.nextReviewDueAt))
        .limit(500);
    }),

  getUpcomingReviews: requirePermission("doc:registry:view")
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const now = new Date();
      const future = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
      return db
        .select()
        .from(orgDocumentRegistry)
        .where(
          and(
            eq(orgDocumentRegistry.reviewOverdue, false),
            lte(orgDocumentRegistry.nextReviewDueAt, future.toISOString()),
            gte(orgDocumentRegistry.nextReviewDueAt, now.toISOString()),
          ),
        )
        .orderBy(asc(orgDocumentRegistry.nextReviewDueAt))
        .limit(500);
    }),

  scheduleReview: requirePermission("doc:review:schedule")
    .input(
      z.object({
        documentId: z.number().int(),
        scheduledDate: z.string(),
        reviewerId: z.number().int().optional(),
        reviewerName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [schedule] = await db.insert(orgDocumentReviewSchedule).values({
        documentId: input.documentId,
        scheduledDate: input.scheduledDate,
        reviewerId: input.reviewerId || null,
        reviewerName: input.reviewerName?.trim() || null,
      }).returning();
      return schedule;
    }),

  completeReview: requirePermission("doc:review:schedule")
    .input(
      z.object({
        id: z.number().int(),
        notes: z.string().max(2000).optional(),
        resultVersionId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(orgDocumentReviewSchedule).set({
        status: "completed",
        completedAt: new Date().toISOString(),
        notes: input.notes?.trim() || null,
        resultVersionId: input.resultVersionId || null,
      }).where(eq(orgDocumentReviewSchedule.id, input.id)).returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Review schedule not found" });

      // Update the document's last reviewed date
      await db.update(orgDocumentRegistry).set({
        lastReviewedAt: new Date().toISOString(),
        reviewOverdue: false,
      }).where(eq(orgDocumentRegistry.id, updated.documentId));

      return updated;
    }),

  getComplianceDashboard: requirePermission("doc:registry:view")
    .query(async () => {
      const db = await requireDb();

      const allDocs = await db
        .select({
          domain: orgDocumentRegistry.domain,
          status: orgDocumentRegistry.status,
          reviewOverdue: orgDocumentRegistry.reviewOverdue,
          ownerRole: orgDocumentRegistry.ownerRole,
          lastReviewedAt: orgDocumentRegistry.lastReviewedAt,
        })
        .from(orgDocumentRegistry)
        .limit(5000);

      // Domain freshness
      const domainFreshness: Record<string, { total: number; overdue: number; hasOwner: number }> = {};
      for (const d of allDocs) {
        if (!domainFreshness[d.domain]) {
          domainFreshness[d.domain] = { total: 0, overdue: 0, hasOwner: 0 };
        }
        domainFreshness[d.domain].total++;
        if (d.reviewOverdue) domainFreshness[d.domain].overdue++;
        if (d.ownerRole) domainFreshness[d.domain].hasOwner++;
      }

      const totalDocs = allDocs.length;
      const overdueCount = allDocs.filter((d) => d.reviewOverdue).length;
      const withOwner = allDocs.filter((d) => d.ownerRole).length;
      const activeDocs = allDocs.filter((d) => d.status === "active").length;

      return {
        totalDocs,
        activeDocs,
        overdueCount,
        ownerCoverage: totalDocs > 0 ? Math.round((withOwner / totalDocs) * 100) : 0,
        domainFreshness,
      };
    }),

  runFreshnessCheck: requirePermission("doc:admin:import")
    .mutation(async () => {
      const db = await requireDb();
      const now = new Date().toISOString();

      // Mark documents overdue
      const overdue = await db
        .update(orgDocumentRegistry)
        .set({ reviewOverdue: true })
        .where(
          and(
            eq(orgDocumentRegistry.reviewOverdue, false),
            lte(orgDocumentRegistry.nextReviewDueAt, now),
          ),
        )
        .returning();

      // Also mark review schedules as overdue
      await db
        .update(orgDocumentReviewSchedule)
        .set({ status: "overdue" })
        .where(
          and(
            eq(orgDocumentReviewSchedule.status, "pending"),
            lte(orgDocumentReviewSchedule.scheduledDate, now),
          ),
        );

      log.info({ overdueCount: overdue.length }, "Freshness check completed");
      return { markedOverdue: overdue.length };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group F: Audit (3 procedures)
// ═══════════════════════════════════════════════════════════════

const auditRouter = router({
  logAccess: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().optional(),
        instanceId: z.number().int().optional(),
        action: z.string().min(1).max(30),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await recordAudit(db, {
        documentId: input.documentId,
        instanceId: input.instanceId,
        action: input.action,
        userId: ctx.user?.id,
        userName: ctx.user?.name,
        userRole: ctx.user?.role,
      });
      return { success: true };
    }),

  getAuditLog: requirePermission("doc:audit:view")
    .input(
      z.object({
        documentId: z.number().int().optional(),
        instanceId: z.number().int().optional(),
        action: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions: SQL[] = [];
      if (input.documentId) conditions.push(eq(orgDocumentAuditLog.documentId, input.documentId));
      if (input.instanceId) conditions.push(eq(orgDocumentAuditLog.instanceId, input.instanceId));
      if (input.action) conditions.push(eq(orgDocumentAuditLog.action, input.action));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(orgDocumentAuditLog)
        .where(whereClause)
        .orderBy(desc(orgDocumentAuditLog.createdAt))
        .limit(pageSize)
        .offset(offset);

      return items;
    }),

  getDocumentActivity: requirePermission("doc:audit:view")
    .input(z.object({ documentId: z.number().int(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(orgDocumentAuditLog)
        .where(eq(orgDocumentAuditLog.documentId, input.documentId))
        .orderBy(desc(orgDocumentAuditLog.createdAt))
        .limit(input.limit);
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group G: Search & AI (5 procedures)
// ═══════════════════════════════════════════════════════════════

const searchRouter = router({
  searchDocuments: requirePermission("doc:registry:view")
    .input(
      z.object({
        query: z.string().min(1).max(200),
        domain: z.string().optional(),
        docType: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [
        or(
          like(orgDocumentRegistry.title, `%${input.query}%`),
          like(orgDocumentRegistry.docCode, `%${input.query}%`),
          like(orgDocumentRegistry.description, `%${input.query}%`),
        )!,
      ];
      if (input.domain) conditions.push(eq(orgDocumentRegistry.domain, input.domain));
      if (input.docType) conditions.push(eq(orgDocumentRegistry.docType, input.docType));

      return db
        .select({
          id: orgDocumentRegistry.id,
          docCode: orgDocumentRegistry.docCode,
          title: orgDocumentRegistry.title,
          domain: orgDocumentRegistry.domain,
          subdomain: orgDocumentRegistry.subdomain,
          docType: orgDocumentRegistry.docType,
          status: orgDocumentRegistry.status,
          currentVersion: orgDocumentRegistry.currentVersion,
        })
        .from(orgDocumentRegistry)
        .where(and(...conditions))
        .orderBy(desc(orgDocumentRegistry.usageCount))
        .limit(input.limit);
    }),

  getRelatedBySemantics: requirePermission("doc:registry:view")
    .input(z.object({ documentId: z.number().int(), limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // Fallback: return documents in the same domain/subdomain
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.documentId))
        .limit(1);
      if (!doc) return [];

      return db
        .select({
          id: orgDocumentRegistry.id,
          docCode: orgDocumentRegistry.docCode,
          title: orgDocumentRegistry.title,
          domain: orgDocumentRegistry.domain,
          subdomain: orgDocumentRegistry.subdomain,
          docType: orgDocumentRegistry.docType,
        })
        .from(orgDocumentRegistry)
        .where(
          and(
            eq(orgDocumentRegistry.domain, doc.domain),
            eq(orgDocumentRegistry.subdomain, doc.subdomain),
          ),
        )
        .limit(input.limit + 1)
        .then((rows) => rows.filter((r) => r.id !== input.documentId).slice(0, input.limit));
    }),

  getStageDocuments: requirePermission("doc:registry:view")
    .input(z.object({ stageCode: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      // Find templates linked to a specific M0-M12 stage
      const instances = await db
        .select({ templateId: orgDocumentInstances.templateId })
        .from(orgDocumentInstances)
        .where(eq(orgDocumentInstances.stageCode, input.stageCode))
        .limit(200);

      const templateIds = [...new Set(instances.map((i) => i.templateId))];
      if (templateIds.length === 0) return [];

      return db
        .select({
          id: orgDocumentRegistry.id,
          docCode: orgDocumentRegistry.docCode,
          title: orgDocumentRegistry.title,
          domain: orgDocumentRegistry.domain,
          docType: orgDocumentRegistry.docType,
          currentVersion: orgDocumentRegistry.currentVersion,
        })
        .from(orgDocumentRegistry)
        .where(or(...templateIds.map((id) => eq(orgDocumentRegistry.id, id)))!)
        .limit(200);
    }),

  autoFillTemplate: requirePermission("doc:instance:create")
    .input(
      z.object({
        templateId: z.number().int(),
        projectId: z.number().int().optional(),
        buCode: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const [template] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.templateId))
        .limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      // Return template content with metadata for client-side filling
      return {
        templateId: template.id,
        title: template.title,
        markdownContent: template.markdownContent || "",
        currentVersion: template.currentVersion,
        projectId: input.projectId,
        buCode: input.buCode,
      };
    }),

  embedRegistryDocument: requirePermission("doc:admin:import")
    .input(z.object({ documentId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.documentId))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      // Placeholder: in production, delegate to doc-intelligence embedding service
      log.info({ docId: input.documentId, title: doc.title }, "Embedding generation requested");
      return { success: true, documentId: input.documentId, status: "queued" };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Group H: Bulk Operations (5 procedures)
// ═══════════════════════════════════════════════════════════════

const bulkRouter = router({
  importFromFilesystem: requirePermission("doc:admin:import")
    .input(
      z.object({
        basePath: z.string().default("doc/org"),
        dryRun: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // This is a placeholder — actual filesystem import is done via seed script
      log.info({ basePath: input.basePath, dryRun: input.dryRun }, "Filesystem import requested");
      return {
        success: true,
        message: "Use scripts/seed-org-documents.ts for filesystem import",
        basePath: input.basePath,
        dryRun: input.dryRun,
      };
    }),

  exportDocument: requirePermission("doc:registry:view")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.id))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      // Increment download count
      await db
        .update(orgDocumentRegistry)
        .set({ downloadCount: doc.downloadCount + 1 })
        .where(eq(orgDocumentRegistry.id, input.id));

      await recordAudit(db, {
        documentId: input.id,
        action: "download",
        userId: ctx.user?.id,
        userName: ctx.user?.name,
      });

      return {
        fileName: `${doc.docCode}.md`,
        content: doc.markdownContent || "",
        title: doc.title,
        version: doc.currentVersion,
      };
    }),

  bulkUpdateOwnership: requirePermission("doc:admin:import")
    .input(
      z.object({
        documentIds: z.array(z.number().int()).min(1).max(100),
        ownerRole: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      let updated = 0;
      for (const id of input.documentIds) {
        const result = await db
          .update(orgDocumentRegistry)
          .set({ ownerRole: input.ownerRole, updatedBy: ctx.user?.id, updatedAt: new Date().toISOString() })
          .where(eq(orgDocumentRegistry.id, id))
          .returning();
        if (result.length > 0) updated++;
      }
      log.info({ count: updated, ownerRole: input.ownerRole }, "Bulk ownership updated");
      return { updated };
    }),

  bulkScheduleReview: requirePermission("doc:review:schedule")
    .input(
      z.object({
        documentIds: z.array(z.number().int()).min(1).max(100),
        scheduledDate: z.string(),
        reviewerName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const values = input.documentIds.map((docId) => ({
        documentId: docId,
        scheduledDate: input.scheduledDate,
        reviewerName: input.reviewerName?.trim() || null,
      }));

      await db.insert(orgDocumentReviewSchedule).values(values);

      // Update next_review_due_at on registry
      for (const docId of input.documentIds) {
        await db
          .update(orgDocumentRegistry)
          .set({ nextReviewDueAt: input.scheduledDate })
          .where(eq(orgDocumentRegistry.id, docId));
      }

      log.info({ count: input.documentIds.length, date: input.scheduledDate }, "Bulk review scheduled");
      return { scheduled: input.documentIds.length };
    }),

  syncContentFromFile: requirePermission("doc:admin:import")
    .input(z.object({ id: z.number().int(), markdownContent: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [doc] = await db
        .select()
        .from(orgDocumentRegistry)
        .where(eq(orgDocumentRegistry.id, input.id))
        .limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const newHash = sha256(input.markdownContent);
      if (newHash === doc.contentHash) {
        return { changed: false, message: "Content unchanged" };
      }

      await db
        .update(orgDocumentRegistry)
        .set({
          markdownContent: input.markdownContent,
          contentHash: newHash,
          updatedBy: ctx.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgDocumentRegistry.id, input.id));

      log.info({ docId: input.id }, "Content synced from file");
      return { changed: true, newHash };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Main Router — merge all sub-routers
// ═══════════════════════════════════════════════════════════════

export const orgDocumentRouter = router({
  registry: registryRouter,
  version: versionRouter,
  instance: instanceRouter,
  link: linkRouter,
  compliance: complianceRouter,
  audit: auditRouter,
  search: searchRouter,
  bulk: bulkRouter,
});

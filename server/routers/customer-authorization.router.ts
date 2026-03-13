/**
 * Customer Authorization Router — 客户授权与文档版本有效控制
 *
 * Group A: Authorization CRUD    (customer:authorization:manage)
 * Group B: Document Management   (customer:authorization:manage)
 * Group C: NDA Management        (mixed — manage + countersign + public)
 * Group D: Customer Portal       (customer:portal:access)
 * Group E: Audit                 (customer:portal:audit)
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, sql, lt, SQL } from "drizzle-orm";
import {
  customerAuthorizations,
  customerAuthorizationDocuments,
  customerNdaAgreements,
  customerAccessAuditLogs,
  TIER_DOC_MATRIX,
  getDocRiskLevel,
  type DocCategory,
} from "../../drizzle/customer-authorization-schema";
import {
  renderNdaTemplate,
  generateSignatureToken,
  getTokenExpiry,
  generateWatermarkToken,
} from "../services/customer-nda.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("customer-authorization");

// ═══════════════════════════════════════════════════════════
// Input Schemas
// ═══════════════════════════════════════════════════════════

const createAuthorizationInput = z.object({
  projectId: z.number().optional(),
  customerId: z.number().optional(),
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(100),
  contactEmail: z.string().email().max(200),
  contactPhone: z.string().max(50).optional(),
  accessTier: z.number().int().min(1).max(4),
  ndaRequired: z.boolean().default(true),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

const addDocumentInput = z.object({
  authorizationId: z.number(),
  docCategory: z.enum([
    "operation_manual", "maintenance_manual", "basic_wiring", "electrical_drawing",
    "bom", "factory_params", "pid_tuning", "plc_source_code",
    "hmi_variable_table", "historical_data", "fat_certificate", "sat_certificate",
    "design_rationale", "custom",
  ]),
  docLabel: z.string().max(300).optional(),
  sourceType: z.string().max(50).optional(),
  sourceId: z.number().optional(),
  sourceVersion: z.string().max(50).optional(),
  filePath: z.string().optional(),
  watermarkRequired: z.boolean().default(true),
  allowDownload: z.boolean().default(false),
  allowPrint: z.boolean().default(false),
  expiryOverride: z.string().optional(),
});

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ═══════════════════════════════════════════════════════════
// Helper: Record audit log
// ═══════════════════════════════════════════════════════════

async function recordAudit(db: any, params: {
  authorizationId: number | null;
  documentId?: number | null;
  portalUserId?: number | null;
  customerCompany?: string;
  actionType: "portal_login" | "doc_view" | "doc_download" | "nda_signed" | "access_revoked" | "tier_upgraded";
  docCategory?: string;
  docLabel?: string;
  ipAddress?: string;
  userAgent?: string;
  watermarkToken?: string;
  riskLevel?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(customerAccessAuditLogs).values({
      authorizationId: params.authorizationId,
      documentId: params.documentId ?? null,
      portalUserId: params.portalUserId ?? null,
      customerCompany: params.customerCompany ?? null,
      actionType: params.actionType,
      docCategory: params.docCategory ?? null,
      docLabel: params.docLabel ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      watermarkToken: params.watermarkToken ?? null,
      riskLevel: params.riskLevel ?? "low",
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    log.error({ err }, "Failed to write customer access audit log");
  }
}

// ═══════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════

export const customerAuthorizationRouter = router({

  // ═══════════ Group A: Authorization CRUD ═══════════

  createAuthorization: requirePermission("customer:authorization:manage")
    .input(createAuthorizationInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const validFrom = input.validFrom ? new Date(input.validFrom) : new Date();
      const validUntil = input.validUntil
        ? new Date(input.validUntil)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // default 1 year

      const [auth] = await db.insert(customerAuthorizations).values({
        projectId: input.projectId ?? null,
        customerId: input.customerId ?? null,
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        accessTier: input.accessTier,
        status: input.ndaRequired ? "pending_nda" : "active",
        ndaRequired: input.ndaRequired,
        validFrom,
        validUntil,
        grantedByUserId: ctx.user.id,
        grantedByName: ctx.user.name ?? ctx.user.openId ?? "system",
      }).returning();

      log.info({ authId: auth.id, company: input.companyName, tier: input.accessTier }, "Customer authorization created");
      return auth;
    }),

  updateAuthorization: requirePermission("customer:authorization:manage")
    .input(z.object({
      id: z.number(),
      accessTier: z.number().int().min(1).max(4).optional(),
      validUntil: z.string().optional(),
      status: z.enum(["pending_nda", "active", "suspended"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.accessTier !== undefined) updates.accessTier = input.accessTier;
      if (input.validUntil !== undefined) updates.validUntil = new Date(input.validUntil);
      if (input.status !== undefined) updates.status = input.status;

      const [updated] = await db.update(customerAuthorizations)
        .set(updates)
        .where(eq(customerAuthorizations.id, input.id))
        .returning();

      if (input.accessTier !== undefined) {
        await recordAudit(db, {
          authorizationId: input.id,
          actionType: "tier_upgraded",
          metadata: { newTier: input.accessTier, updatedBy: ctx.user.id },
        });
      }
      return updated;
    }),

  revokeAuthorization: requirePermission("customer:authorization:manage")
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [revoked] = await db.update(customerAuthorizations)
        .set({
          status: "revoked",
          revokedByUserId: ctx.user.id,
          revokedReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(customerAuthorizations.id, input.id))
        .returning();

      await recordAudit(db, {
        authorizationId: input.id,
        customerCompany: revoked?.companyName,
        actionType: "access_revoked",
        metadata: { reason: input.reason, revokedBy: ctx.user.id },
      });

      log.info({ authId: input.id, reason: input.reason }, "Customer authorization revoked");
      return revoked;
    }),

  listAuthorizations: requirePermission("customer:authorization:view")
    .input(z.object({
      projectId: z.number().optional(),
      status: z.enum(["pending_nda", "active", "suspended", "revoked", "expired"]).optional(),
      accessTier: z.number().int().min(1).max(4).optional(),
      search: z.string().optional(),
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input.projectId) conditions.push(eq(customerAuthorizations.projectId, input.projectId));
      if (input.status) conditions.push(eq(customerAuthorizations.status, input.status));
      if (input.accessTier) conditions.push(eq(customerAuthorizations.accessTier, input.accessTier));
      if (input.search) {
        conditions.push(sql`(${customerAuthorizations.companyName} ILIKE ${'%' + input.search + '%'} OR ${customerAuthorizations.contactName} ILIKE ${'%' + input.search + '%'})`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;

      const [rows, countResult] = await Promise.all([
        db.select().from(customerAuthorizations)
          .where(where)
          .orderBy(desc(customerAuthorizations.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(customerAuthorizations).where(where),
      ]);

      return {
        items: rows,
        total: countResult[0]?.count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getAuthorization: requirePermission("customer:authorization:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [auth] = await db.select().from(customerAuthorizations)
        .where(eq(customerAuthorizations.id, input.id))
        .limit(1);
      if (!auth) return null;

      const docs = await db.select().from(customerAuthorizationDocuments)
        .where(eq(customerAuthorizationDocuments.authorizationId, input.id))
        .limit(500);

      const [nda] = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.authorizationId, input.id))
        .limit(1);

      return { ...auth, documents: docs, nda: nda ?? null };
    }),

  getAuthorizationStats: requirePermission("customer:authorization:view")
    .query(async () => {
      const db = await requireDb();
      const rows = await db.select({
        status: customerAuthorizations.status,
        tier: customerAuthorizations.accessTier,
        count: sql<number>`count(*)::int`,
      })
        .from(customerAuthorizations)
        .groupBy(customerAuthorizations.status, customerAuthorizations.accessTier)
        .limit(100);
      return rows;
    }),

  // ═══════════ Group B: Document Management ═══════════

  addDocument: requirePermission("customer:authorization:manage")
    .input(addDocumentInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [doc] = await db.insert(customerAuthorizationDocuments).values({
        authorizationId: input.authorizationId,
        docCategory: input.docCategory,
        docLabel: input.docLabel ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        sourceVersion: input.sourceVersion ?? null,
        filePath: input.filePath ?? null,
        watermarkRequired: input.watermarkRequired,
        allowDownload: input.allowDownload,
        allowPrint: input.allowPrint,
        expiryOverride: input.expiryOverride ? new Date(input.expiryOverride) : null,
        addedByUserId: ctx.user.id,
      }).returning();
      return doc;
    }),

  removeDocument: requirePermission("customer:authorization:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(customerAuthorizationDocuments)
        .set({ isActive: false })
        .where(eq(customerAuthorizationDocuments.id, input.id))
        .returning();
      return updated;
    }),

  listDocuments: requirePermission("customer:authorization:view")
    .input(z.object({ authorizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(customerAuthorizationDocuments)
        .where(and(
          eq(customerAuthorizationDocuments.authorizationId, input.authorizationId),
          eq(customerAuthorizationDocuments.isActive, true),
        ))
        .orderBy(customerAuthorizationDocuments.docCategory)
        .limit(500);
    }),

  updateDocument: requirePermission("customer:authorization:manage")
    .input(z.object({
      id: z.number(),
      allowDownload: z.boolean().optional(),
      allowPrint: z.boolean().optional(),
      watermarkRequired: z.boolean().optional(),
      expiryOverride: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updates: Record<string, unknown> = {};
      if (input.allowDownload !== undefined) updates.allowDownload = input.allowDownload;
      if (input.allowPrint !== undefined) updates.allowPrint = input.allowPrint;
      if (input.watermarkRequired !== undefined) updates.watermarkRequired = input.watermarkRequired;
      if (input.expiryOverride !== undefined) updates.expiryOverride = input.expiryOverride ? new Date(input.expiryOverride) : null;

      const [updated] = await db.update(customerAuthorizationDocuments)
        .set(updates)
        .where(eq(customerAuthorizationDocuments.id, input.id))
        .returning();
      return updated;
    }),

  // ═══════════ Group C: NDA Management ═══════════

  generateNdaToken: requirePermission("customer:authorization:manage")
    .input(z.object({
      authorizationId: z.number(),
      projectName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      // Get authorization
      const [auth] = await db.select().from(customerAuthorizations)
        .where(eq(customerAuthorizations.id, input.authorizationId))
        .limit(1);
      if (!auth) throw new Error("Authorization not found");

      const token = generateSignatureToken();
      const expiresAt = getTokenExpiry();

      const { html, hash } = renderNdaTemplate({
        companyName: auth.companyName,
        contactName: auth.contactName,
        contactEmail: auth.contactEmail,
        projectName: input.projectName,
        accessTier: auth.accessTier,
        validFrom: (auth.validFrom ?? new Date()).toISOString().slice(0, 10),
        validUntil: (auth.validUntil ?? new Date()).toISOString().slice(0, 10),
      });

      // Upsert NDA record
      const existing = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.authorizationId, input.authorizationId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(customerNdaAgreements)
          .set({
            signatureToken: token,
            tokenExpiresAt: expiresAt,
            fullTextHash: hash,
            status: "pending",
            updatedAt: new Date(),
          })
          .where(eq(customerNdaAgreements.authorizationId, input.authorizationId));
      } else {
        await db.insert(customerNdaAgreements).values({
          authorizationId: input.authorizationId,
          signatureToken: token,
          tokenExpiresAt: expiresAt,
          fullTextHash: hash,
          signerEmail: auth.contactEmail,
          status: "pending",
        });
      }

      log.info({ authId: input.authorizationId, tokenExpiry: expiresAt }, "NDA token generated");
      return { token, expiresAt, ndaHtml: html };
    }),

  signNda: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      signerName: z.string().min(1).max(100),
      signerTitle: z.string().max(100).optional(),
      ipAddress: z.string().max(45).optional(),
      userAgent: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [nda] = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.signatureToken, input.token))
        .limit(1);

      if (!nda) throw new Error("Invalid or unknown NDA token");
      if (nda.status !== "pending") throw new Error("NDA is not in pending status");
      if (nda.tokenExpiresAt && nda.tokenExpiresAt < new Date()) throw new Error("NDA token has expired");

      const now = new Date();
      await db.update(customerNdaAgreements)
        .set({
          signerName: input.signerName,
          signerTitle: input.signerTitle ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          signedAt: now,
          status: "signed",
          updatedAt: now,
        })
        .where(eq(customerNdaAgreements.id, nda.id));

      // Update authorization status to active if NDA was the blocker
      const [auth] = await db.select().from(customerAuthorizations)
        .where(eq(customerAuthorizations.id, nda.authorizationId))
        .limit(1);

      if (auth && auth.status === "pending_nda") {
        await db.update(customerAuthorizations)
          .set({ status: "active", ndaSignedAt: now, updatedAt: now })
          .where(eq(customerAuthorizations.id, nda.authorizationId));
      }

      await recordAudit(db, {
        authorizationId: nda.authorizationId,
        customerCompany: auth?.companyName,
        actionType: "nda_signed",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { signerName: input.signerName },
      });

      log.info({ authId: nda.authorizationId, signer: input.signerName }, "NDA signed by customer");
      return { success: true, authorizationId: nda.authorizationId };
    }),

  countersignNda: requirePermission("customer:nda:countersign")
    .input(z.object({ authorizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const [updated] = await db.update(customerNdaAgreements)
        .set({
          isCountersigned: true,
          countersignedBy: ctx.user.name ?? ctx.user.openId ?? "admin",
          countersignedAt: now,
          status: "countersigned",
          updatedAt: now,
        })
        .where(and(
          eq(customerNdaAgreements.authorizationId, input.authorizationId),
          eq(customerNdaAgreements.status, "signed"),
        ))
        .returning();
      if (!updated) throw new Error("NDA not found or not in signed status");
      log.info({ authId: input.authorizationId, countersigner: ctx.user.name }, "NDA countersigned");
      return updated;
    }),

  getNdaStatus: requirePermission("customer:authorization:view")
    .input(z.object({ authorizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [nda] = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.authorizationId, input.authorizationId))
        .limit(1);
      return nda ?? null;
    }),

  downloadNdaPdf: requirePermission("customer:authorization:view")
    .input(z.object({ authorizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [nda] = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.authorizationId, input.authorizationId))
        .limit(1);
      if (!nda) return null;

      // Re-render template for download
      const [auth] = await db.select().from(customerAuthorizations)
        .where(eq(customerAuthorizations.id, input.authorizationId))
        .limit(1);
      if (!auth) return null;

      const { html, hash } = renderNdaTemplate({
        companyName: auth.companyName,
        contactName: auth.contactName,
        contactEmail: auth.contactEmail,
        accessTier: auth.accessTier,
        validFrom: (auth.validFrom ?? new Date()).toISOString().slice(0, 10),
        validUntil: (auth.validUntil ?? new Date()).toISOString().slice(0, 10),
      });

      return { html, hash, nda };
    }),

  // ═══════════ Group D: Customer Portal ═══════════

  portalGetAuthorization: requirePermission("customer:portal:access")
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [auth] = await db.select().from(customerAuthorizations)
        .where(eq(customerAuthorizations.portalUserId, ctx.user.id))
        .limit(1);
      if (!auth) return null;

      const [nda] = await db.select().from(customerNdaAgreements)
        .where(eq(customerNdaAgreements.authorizationId, auth.id))
        .limit(1);

      return { ...auth, nda: nda ?? null };
    }),

  portalListDocuments: requirePermission("customer:portal:access")
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [auth] = await db.select().from(customerAuthorizations)
        .where(and(
          eq(customerAuthorizations.portalUserId, ctx.user.id),
          eq(customerAuthorizations.status, "active"),
        ))
        .limit(1);
      if (!auth) return [];

      const allDocs = await db.select().from(customerAuthorizationDocuments)
        .where(and(
          eq(customerAuthorizationDocuments.authorizationId, auth.id),
          eq(customerAuthorizationDocuments.isActive, true),
        ))
        .limit(500);

      // Filter by tier access matrix
      const tierMatrix = TIER_DOC_MATRIX[auth.accessTier] || TIER_DOC_MATRIX[1];
      return allDocs.filter(doc => {
        const access = tierMatrix[doc.docCategory as DocCategory];
        return access?.viewable;
      });
    }),

  portalViewDocument: requirePermission("customer:portal:access")
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      // Verify portal user has access
      const [auth] = await db.select().from(customerAuthorizations)
        .where(and(
          eq(customerAuthorizations.portalUserId, ctx.user.id),
          eq(customerAuthorizations.status, "active"),
        ))
        .limit(1);
      if (!auth) throw new Error("No active authorization found");

      // Check document belongs to this authorization
      const [doc] = await db.select().from(customerAuthorizationDocuments)
        .where(and(
          eq(customerAuthorizationDocuments.id, input.documentId),
          eq(customerAuthorizationDocuments.authorizationId, auth.id),
          eq(customerAuthorizationDocuments.isActive, true),
        ))
        .limit(1);
      if (!doc) throw new Error("Document not found or not authorized");

      // Check tier allows viewing
      const tierMatrix = TIER_DOC_MATRIX[auth.accessTier] || TIER_DOC_MATRIX[1];
      const access = tierMatrix[doc.docCategory as DocCategory];
      if (!access?.viewable) throw new Error("Document not authorized for your access tier");

      // Check expiry
      if (doc.expiryOverride && doc.expiryOverride < new Date()) throw new Error("Document access has expired");

      // Generate watermark token
      const watermarkToken = doc.watermarkRequired
        ? generateWatermarkToken(auth.id, doc.id)
        : undefined;

      // Update access count
      await db.update(customerAuthorizationDocuments)
        .set({
          accessCount: sql`${customerAuthorizationDocuments.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(customerAuthorizationDocuments.id, doc.id));

      // Record audit
      await recordAudit(db, {
        authorizationId: auth.id,
        documentId: doc.id,
        portalUserId: ctx.user.id,
        customerCompany: auth.companyName,
        actionType: "doc_view",
        docCategory: doc.docCategory,
        docLabel: doc.docLabel ?? undefined,
        watermarkToken,
        riskLevel: getDocRiskLevel(doc.docCategory as DocCategory),
      });

      return {
        document: doc,
        watermarkToken,
        allowDownload: access.downloadable && doc.allowDownload,
      };
    }),

  portalDownloadDocument: requirePermission("customer:portal:access")
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [auth] = await db.select().from(customerAuthorizations)
        .where(and(
          eq(customerAuthorizations.portalUserId, ctx.user.id),
          eq(customerAuthorizations.status, "active"),
        ))
        .limit(1);
      if (!auth) throw new Error("No active authorization found");

      const [doc] = await db.select().from(customerAuthorizationDocuments)
        .where(and(
          eq(customerAuthorizationDocuments.id, input.documentId),
          eq(customerAuthorizationDocuments.authorizationId, auth.id),
          eq(customerAuthorizationDocuments.isActive, true),
        ))
        .limit(1);
      if (!doc) throw new Error("Document not found");

      // Check tier allows downloading
      const tierMatrix = TIER_DOC_MATRIX[auth.accessTier] || TIER_DOC_MATRIX[1];
      const access = tierMatrix[doc.docCategory as DocCategory];
      if (!access?.downloadable) throw new Error("Download not permitted for your access tier");
      if (!doc.allowDownload) throw new Error("Download disabled for this document");

      // Check expiry
      if (doc.expiryOverride && doc.expiryOverride < new Date()) throw new Error("Document access has expired");
      if (auth.validUntil && auth.validUntil < new Date()) throw new Error("Authorization has expired");

      const watermarkToken = generateWatermarkToken(auth.id, doc.id);

      await recordAudit(db, {
        authorizationId: auth.id,
        documentId: doc.id,
        portalUserId: ctx.user.id,
        customerCompany: auth.companyName,
        actionType: "doc_download",
        docCategory: doc.docCategory,
        docLabel: doc.docLabel ?? undefined,
        watermarkToken,
        riskLevel: getDocRiskLevel(doc.docCategory as DocCategory),
      });

      return { filePath: doc.filePath, watermarkToken };
    }),

  portalGetHistoricalData: requirePermission("customer:portal:access")
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [auth] = await db.select().from(customerAuthorizations)
        .where(and(
          eq(customerAuthorizations.portalUserId, ctx.user.id),
          eq(customerAuthorizations.status, "active"),
        ))
        .limit(1);
      if (!auth) throw new Error("No active authorization found");
      if (auth.accessTier < 3) throw new Error("Historical data requires Tier 3+ access");

      // Return placeholder — actual historical data would come from IoT/SCADA system
      return {
        authorized: true,
        tier: auth.accessTier,
        message: "Historical data endpoint ready. Connect to SCADA/IoT data source for real-time data.",
      };
    }),

  // ═══════════ Group E: Audit ═══════════

  listAccessLogs: requirePermission("customer:portal:audit")
    .input(z.object({
      authorizationId: z.number().optional(),
      actionType: z.enum(["portal_login", "doc_view", "doc_download", "nda_signed", "access_revoked", "tier_upgraded"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      ...paginationInput.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input.authorizationId) conditions.push(eq(customerAccessAuditLogs.authorizationId, input.authorizationId));
      if (input.actionType) conditions.push(eq(customerAccessAuditLogs.actionType, input.actionType));
      if (input.startDate) conditions.push(sql`${customerAccessAuditLogs.createdAt} >= ${new Date(input.startDate)}`);
      if (input.endDate) conditions.push(sql`${customerAccessAuditLogs.createdAt} <= ${new Date(input.endDate)}`);

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;

      const [rows, countResult] = await Promise.all([
        db.select().from(customerAccessAuditLogs)
          .where(where)
          .orderBy(desc(customerAccessAuditLogs.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(customerAccessAuditLogs).where(where),
      ]);

      return {
        items: rows,
        total: countResult[0]?.count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getAccessSummary: requirePermission("customer:portal:audit")
    .input(z.object({ authorizationId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input.authorizationId
        ? eq(customerAccessAuditLogs.authorizationId, input.authorizationId)
        : undefined;

      const rows = await db.select({
        actionType: customerAccessAuditLogs.actionType,
        riskLevel: customerAccessAuditLogs.riskLevel,
        count: sql<number>`count(*)::int`,
      })
        .from(customerAccessAuditLogs)
        .where(where)
        .groupBy(customerAccessAuditLogs.actionType, customerAccessAuditLogs.riskLevel)
        .limit(100);
      return rows;
    }),

  exportAuditReport: requirePermission("customer:portal:audit")
    .input(z.object({
      authorizationId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input.authorizationId) conditions.push(eq(customerAccessAuditLogs.authorizationId, input.authorizationId));
      if (input.startDate) conditions.push(sql`${customerAccessAuditLogs.createdAt} >= ${new Date(input.startDate)}`);
      if (input.endDate) conditions.push(sql`${customerAccessAuditLogs.createdAt} <= ${new Date(input.endDate)}`);

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db.select().from(customerAccessAuditLogs)
        .where(where)
        .orderBy(desc(customerAccessAuditLogs.createdAt))
        .limit(1000);

      // Generate CSV
      const headers = ["ID", "Authorization", "Document", "Company", "Action", "Category", "Risk", "IP", "Watermark", "Timestamp"];
      const csvRows = rows.map(r => [
        r.id, r.authorizationId, r.documentId, r.customerCompany,
        r.actionType, r.docCategory, r.riskLevel, r.ipAddress,
        r.watermarkToken, r.createdAt?.toISOString(),
      ].join(","));

      return {
        csv: [headers.join(","), ...csvRows].join("\n"),
        count: rows.length,
      };
    }),
});

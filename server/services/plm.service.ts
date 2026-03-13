/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          GRT Light-PLM — File Upload & Versioning Service       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Core Logic:                                                    ║
 * ║  1. createDocument()        — Validates project+user FKs first  ║
 * ║  2. uploadNewVersion()      — Auto-increments (V1.0 → V1.1)    ║
 * ║  3. promoteToMajorVersion() — Major bump (V1.x → V2.0)         ║
 * ║  4. submitForReview()       — Creates review, validates user FK ║
 * ║  5. recordReviewDecision()  — Logs decision + timestamp         ║
 * ║                                                                 ║
 * ║  FK Validation:                                                 ║
 * ║  · Every projectId is verified against projects.id              ║
 * ║  · Every userId is verified against users.id                    ║
 * ║  · Every documentId is verified against plm_documents.id        ║
 * ║  · Every versionId is verified against plm_document_versions.id ║
 * ║                                                                 ║
 * ║  AI KPI Hooks:                                                  ║
 * ║  · Every upload logs uploaded_at for Timeliness KPI             ║
 * ║  · Every review logs requested_at + reviewed_at for Turnaround  ║
 * ║  · Version count tracks rework frequency                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { eq, and, desc } from "drizzle-orm";
import { requireDb } from "../db";
import {
  plmDocuments,
  plmDocumentVersions,
  plmDesignReviews,
} from "../../drizzle/plm-schema";
import { projects } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";

// ── Types ────────────────────────────────────────────

interface CreateDocumentInput {
  docNumber: string;
  title: string;
  description?: string;
  docType: "mechanical" | "electrical" | "software" | "manual";
  projectId?: number;
  projectCode?: string;
  ownerUserId?: number;
  ownerName?: string;
  fileExtension?: string;
  mimeType?: string;
  tags?: string[];
  createdBy?: number;
}

interface UploadVersionInput {
  documentId: number;
  fileUrlPath: string;
  originalFileName?: string;
  fileSizeBytes?: number;
  fileHash?: string;
  changeReason: string;
  uploadedBy: number;
  uploadedByName?: string;
}

interface SubmitReviewInput {
  documentVersionId: number;
  reviewerUserId: number;
  reviewerName?: string;
  reviewerRole?: string;
  dueDate?: string;
  requestedBy?: number;
  isDesignFreezeReview?: boolean;
}

interface ReviewDecisionInput {
  reviewId: number;
  reviewStatus: "approved" | "rejected" | "revision_requested";
  comments?: string;
}

// ── FK Validation Helpers ────────────────────────────

async function assertProjectExists(db: any, projectId: number) {
  const [row] = await db.select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!row) {
    throw new Error(`FK violation: projects.id=${projectId} does not exist`);
  }
}

async function assertUserExists(db: any, userId: number) {
  const [row] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) {
    throw new Error(`FK violation: users.id=${userId} does not exist`);
  }
}

async function assertDocumentExists(db: any, documentId: number) {
  const [row] = await db.select({ id: plmDocuments.id })
    .from(plmDocuments)
    .where(eq(plmDocuments.id, documentId))
    .limit(1);
  if (!row) {
    throw new Error(`FK violation: plm_documents.id=${documentId} does not exist`);
  }
  return row;
}

async function assertVersionExists(db: any, versionId: number) {
  const [row] = await db.select({ id: plmDocumentVersions.id, documentId: plmDocumentVersions.documentId })
    .from(plmDocumentVersions)
    .where(eq(plmDocumentVersions.id, versionId))
    .limit(1);
  if (!row) {
    throw new Error(`FK violation: plm_document_versions.id=${versionId} does not exist`);
  }
  return row;
}

// ── Service ──────────────────────────────────────────

/**
 * Create a new master document record (no file yet — just the metadata shell).
 *
 * Validates:
 *  - projectId exists in projects table (if provided)
 *  - ownerUserId exists in users table (if provided)
 *  - createdBy exists in users table (if provided)
 */
export async function createDocument(input: CreateDocumentInput) {
  const db = await requireDb();

  // ── Validate FK references before insert ──
  const fkChecks: Promise<void>[] = [];
  if (input.projectId) {
    fkChecks.push(assertProjectExists(db, input.projectId));
  }
  if (input.ownerUserId) {
    fkChecks.push(assertUserExists(db, input.ownerUserId));
  }
  if (input.createdBy) {
    fkChecks.push(assertUserExists(db, input.createdBy));
  }
  await Promise.all(fkChecks);

  const [doc] = await db.insert(plmDocuments).values({
    docNumber: input.docNumber,
    title: input.title,
    description: input.description,
    docType: input.docType,
    currentStatus: "draft",
    projectId: input.projectId,
    projectCode: input.projectCode,
    ownerUserId: input.ownerUserId,
    ownerName: input.ownerName,
    currentVersionString: "V0.0",
    totalVersions: 0,
    fileExtension: input.fileExtension,
    mimeType: input.mimeType,
    tags: input.tags,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  }).returning();

  return doc;
}

/**
 * Upload a new file version for an existing document.
 *
 * Auto-increments the minor version:
 *   V1.0 → V1.1 → V1.2 → ...
 *
 * Validates:
 *  - documentId exists in plm_documents
 *  - uploadedBy exists in users table
 *
 * The upload timestamp is the critical AI KPI signal:
 *   uploaded_at vs project milestone deadline → Timeliness Score
 */
export async function uploadNewVersion(input: UploadVersionInput) {
  const db = await requireDb();

  // ── Validate FK references ──
  await assertUserExists(db, input.uploadedBy);

  // 1. Fetch the document to verify it exists + get denormalized fields
  const [doc] = await db.select().from(plmDocuments)
    .where(eq(plmDocuments.id, input.documentId)).limit(1000);

  if (!doc) {
    throw new Error(`Document ID ${input.documentId} not found`);
  }

  // 2. Find the latest version to determine next version number
  const [latestVersion] = await db.select().from(plmDocumentVersions)
    .where(and(
      eq(plmDocumentVersions.documentId, input.documentId),
      eq(plmDocumentVersions.isLatest, true),
    ))
    .orderBy(desc(plmDocumentVersions.versionMajor), desc(plmDocumentVersions.versionMinor))
    .limit(1);

  // 3. Calculate next version: V1.0 → V1.1, or V0.0 → V1.0 if first upload
  let nextMajor: number;
  let nextMinor: number;

  if (!latestVersion) {
    nextMajor = 1;
    nextMinor = 0;
  } else {
    nextMajor = latestVersion.versionMajor;
    nextMinor = latestVersion.versionMinor + 1;
  }

  const versionString = `V${nextMajor}.${nextMinor}`;
  const now = new Date().toISOString();

  // 4. Mark previous latest version as not-latest
  if (latestVersion) {
    await db.update(plmDocumentVersions)
      .set({ isLatest: false })
      .where(eq(plmDocumentVersions.id, latestVersion.id));
  }

  // 5. Insert new version — uploaded_at is the AI KPI timestamp
  const [newVersion] = await db.insert(plmDocumentVersions).values({
    documentId: input.documentId,
    versionString,
    versionMajor: nextMajor,
    versionMinor: nextMinor,
    fileUrlPath: input.fileUrlPath,
    originalFileName: input.originalFileName,
    fileSizeBytes: input.fileSizeBytes,
    fileHash: input.fileHash,
    changeReason: input.changeReason,
    sourceVersionId: latestVersion?.id,
    uploadedBy: input.uploadedBy,
    uploadedByName: input.uploadedByName,
    uploadedAt: now,
    isLatest: true,
  }).returning();

  // 6. Update the document's denormalized fields
  await db.update(plmDocuments)
    .set({
      currentVersionString: versionString,
      totalVersions: (doc.totalVersions ?? 0) + 1,
      updatedAt: now,
      updatedBy: input.uploadedBy,
    })
    .where(eq(plmDocuments.id, input.documentId));

  return {
    version: newVersion,
    versionString,
    documentId: input.documentId,
    totalVersions: (doc.totalVersions ?? 0) + 1,
  };
}

/**
 * Major version promotion (on Release): V1.x → V2.0
 *
 * Called when a document transitions from in_review → released.
 * This creates a clean major version marker.
 *
 * Validates:
 *  - documentId exists in plm_documents
 *  - uploadedBy exists in users table
 */
export async function promoteToMajorVersion(
  documentId: number,
  fileUrlPath: string,
  uploadedBy: number,
  uploadedByName?: string,
) {
  const db = await requireDb();

  // ── Validate FK references ──
  await Promise.all([
    assertDocumentExists(db, documentId),
    assertUserExists(db, uploadedBy),
  ]);

  const [latestVersion] = await db.select().from(plmDocumentVersions)
    .where(and(
      eq(plmDocumentVersions.documentId, documentId),
      eq(plmDocumentVersions.isLatest, true),
    ))
    .limit(1);

  const nextMajor = latestVersion ? latestVersion.versionMajor + 1 : 1;
  const versionString = `V${nextMajor}.0`;
  const now = new Date().toISOString();

  if (latestVersion) {
    await db.update(plmDocumentVersions)
      .set({ isLatest: false })
      .where(eq(plmDocumentVersions.id, latestVersion.id));
  }

  const [newVersion] = await db.insert(plmDocumentVersions).values({
    documentId,
    versionString,
    versionMajor: nextMajor,
    versionMinor: 0,
    fileUrlPath,
    sourceVersionId: latestVersion?.id,
    uploadedBy,
    uploadedByName,
    uploadedAt: now,
    isLatest: true,
    changeReason: `Major release: ${versionString}`,
  }).returning();

  const [doc] = await db.select().from(plmDocuments)
    .where(eq(plmDocuments.id, documentId)).limit(1000);

  await db.update(plmDocuments)
    .set({
      currentVersionString: versionString,
      currentStatus: "released",
      totalVersions: (doc?.totalVersions ?? 0) + 1,
      updatedAt: now,
      updatedBy: uploadedBy,
    })
    .where(eq(plmDocuments.id, documentId));

  return newVersion;
}

/**
 * Submit a document version for design review.
 *
 * Validates:
 *  - documentVersionId exists in plm_document_versions
 *  - reviewerUserId exists in users table
 *  - requestedBy exists in users table (if provided)
 *
 * Logs requestedAt — the start of the review clock for AI turnaround KPI.
 */
export async function submitForReview(input: SubmitReviewInput) {
  const db = await requireDb();
  const now = new Date().toISOString();

  // ── Validate FK references ──
  const fkChecks: Promise<any>[] = [
    assertVersionExists(db, input.documentVersionId),
    assertUserExists(db, input.reviewerUserId),
  ];
  if (input.requestedBy) {
    fkChecks.push(assertUserExists(db, input.requestedBy));
  }
  const [versionRow] = await Promise.all(fkChecks);

  const [review] = await db.insert(plmDesignReviews).values({
    documentVersionId: input.documentVersionId,
    reviewerUserId: input.reviewerUserId,
    reviewerName: input.reviewerName,
    reviewerRole: input.reviewerRole,
    reviewStatus: "pending",
    requestedAt: now,
    dueDate: input.dueDate,
    requestedBy: input.requestedBy,
    isDesignFreezeReview: input.isDesignFreezeReview ?? false,
  }).returning();

  // Update the document status to in_review using the validated version row
  if (versionRow?.documentId) {
    await db.update(plmDocuments)
      .set({ currentStatus: "in_review", updatedAt: now })
      .where(eq(plmDocuments.id, versionRow.documentId));
  }

  return review;
}

/**
 * Record a reviewer's decision.
 *
 * Logs reviewed_at — the end of the review clock.
 * AI calculates: reviewed_at - requested_at = Review Turnaround Time
 *
 * If this is a Design Freeze review and status = approved,
 * also marks the document's designFreezeApproved flag.
 */
export async function recordReviewDecision(input: ReviewDecisionInput) {
  const db = await requireDb();
  const now = new Date().toISOString();

  const [updated] = await db.update(plmDesignReviews)
    .set({
      reviewStatus: input.reviewStatus,
      comments: input.comments,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(plmDesignReviews.id, input.reviewId))
    .returning();

  if (!updated) {
    throw new Error(`Review ID ${input.reviewId} not found`);
  }

  // Resolve the parent document ID from the version FK
  const [version] = await db.select({
    id: plmDocumentVersions.id,
    documentId: plmDocumentVersions.documentId,
  }).from(plmDocumentVersions)
    .where(eq(plmDocumentVersions.id, updated.documentVersionId))
    .limit(1);

  if (!version) {
    throw new Error(`Data integrity error: plm_document_versions.id=${updated.documentVersionId} missing`);
  }

  // If this is a Design Freeze Gate review and it was approved,
  // mark the parent document as design-freeze-approved
  if (updated.isDesignFreezeReview && input.reviewStatus === "approved") {
    await db.update(plmDocuments)
      .set({
        designFreezeApproved: true,
        designFreezeAt: now,
        designFreezeBy: updated.reviewerUserId,
        updatedAt: now,
      })
      .where(eq(plmDocuments.id, version.documentId));
  }

  // If rejected, revert document to draft
  if (input.reviewStatus === "rejected" || input.reviewStatus === "revision_requested") {
    await db.update(plmDocuments)
      .set({ currentStatus: "draft", updatedAt: now })
      .where(eq(plmDocuments.id, version.documentId));
  }

  return updated;
}

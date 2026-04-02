/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           GRT Light-PLM — Document Management Schema            ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  CEO Directive: "Unified logic, separate file handling."        ║
 * ║  - Database stores metadata, version history, approvals ONLY    ║
 * ║  - Physical files stored externally (S3/MinIO/local FS)        ║
 * ║  - Every timestamp is AI-readable for KPI evaluation            ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. plm_documents         — Master document registry          ║
 * ║    2. plm_document_versions — File version history + paths      ║
 * ║    3. plm_design_reviews    — Approval / rejection tracking     ║
 * ║                                                                 ║
 * ║  FK Constraints:                                                ║
 * ║    · plm_documents.project_id       → projects.id               ║
 * ║    · plm_documents.owner_user_id    → users.id                  ║
 * ║    · plm_documents.design_freeze_by → users.id                  ║
 * ║    · plm_documents.created_by       → users.id                  ║
 * ║    · plm_documents.updated_by       → users.id                  ║
 * ║    · plm_document_versions.document_id     → plm_documents.id   ║
 * ║    · plm_document_versions.source_version_id → (self)           ║
 * ║    · plm_document_versions.uploaded_by     → users.id           ║
 * ║    · plm_design_reviews.document_version_id → plm_doc_ver.id   ║
 * ║    · plm_design_reviews.reviewer_user_id   → users.id           ║
 * ║    · plm_design_reviews.requested_by       → users.id           ║
 * ║                                                                 ║
 * ║  AI KPI Signals:                                                ║
 * ║    · uploaded_at vs project milestone → Timeliness KPI          ║
 * ║    · rejection count per version → Quality KPI                  ║
 * ║    · reviewed_at - requested_at → Review Turnaround             ║
 * ║    · version count per document → Rework Frequency              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { projects } from "./schema";
import { users } from "./schema";

// ── Enums ────────────────────────────────────────────

/** Engineering domain of the document */
export const plmDocTypeEnum = pgEnum("plm_doc_type", [
  "mechanical",   // SolidWorks (.sldprt, .sldasm, .slddrw)
  "electrical",   // EPLAN (.elk, .elp), AutoCAD Electrical
  "software",     // PLC programs, firmware, HMI screens
  "manual",       // User manuals, maintenance guides, SOPs
]);

/** Document lifecycle state machine: Draft → In_Review → Released → Obsolete */
export const plmDocStatusEnum = pgEnum("plm_doc_status", [
  "draft",
  "in_review",
  "released",
  "obsolete",
]);

/** Design review decision */
export const plmReviewStatusEnum = pgEnum("plm_review_status", [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
]);

// ══════════════════════════════════════════════════════
// Table 1: plm_documents — Master Document Registry
// ══════════════════════════════════════════════════════

export const plmDocuments = pgTable("plm_documents", {
  id: serial("id").primaryKey(),

  /** Unique document number, e.g. "DOC-MECH-00042" */
  docNumber: varchar("doc_number", { length: 50 }).notNull().unique(),

  /** Human-readable title, e.g. "Detroit Project Main Assembly" */
  title: varchar("title", { length: 300 }).notNull(),

  description: text("description"),

  /** Engineering domain */
  docType: plmDocTypeEnum("doc_type").notNull(),

  /** Lifecycle state machine */
  currentStatus: plmDocStatusEnum("current_status").default("draft").notNull(),

  // ── Project linkage (FK → projects.id) ──

  /** FK reference to projects.id — enforced at DB level */
  projectId: integer("project_id").references(() => projects.id),

  /** Denormalized project code for quick display */
  projectCode: varchar("project_code", { length: 50 }),

  // ── Ownership (FK → users.id) ──

  /** The responsible engineer (FK → users.id) */
  ownerUserId: integer("owner_user_id").references(() => users.id),

  /** Owner's display name (denormalized for table views) */
  ownerName: varchar("owner_name", { length: 128 }),

  // ── Current version pointer (denormalized for fast queries) ──

  /** e.g. "V2.1" — matches the latest plm_document_versions.version_string */
  currentVersionString: varchar("current_version_string", { length: 20 }).default("V0.0"),

  /** Count of total versions (for AI rework frequency KPI) */
  totalVersions: integer("total_versions").default(0),

  // ── Design Freeze Gate ──

  /** Has this document passed the design freeze gate review? */
  designFreezeApproved: boolean("design_freeze_approved").default(false),

  /** When the design freeze was approved */
  designFreezeAt: timestamp("design_freeze_at", { mode: "string" }),

  /** Who approved the design freeze (FK → users.id) */
  designFreezeBy: integer("design_freeze_by").references(() => users.id),

  // ── File metadata (of the latest version, denormalized) ──

  /** Original file extension, e.g. ".sldasm", ".elk" */
  fileExtension: varchar("file_extension", { length: 20 }),

  /** MIME type for download headers */
  mimeType: varchar("mime_type", { length: 100 }),

  // ── Flexible metadata ──

  /** Searchable tags: ["Detroit", "Main Assembly", "V2"] */
  tags: json("tags").$type<string[]>(),

  /** Arbitrary metadata for AI consumption */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  // ── Audit (FK → users.id) ──
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plm_doc_project_idx").on(table.projectId),
  index("plm_doc_type_idx").on(table.docType),
  index("plm_doc_status_idx").on(table.currentStatus),
  index("plm_doc_owner_idx").on(table.ownerUserId),
  index("plm_doc_freeze_idx").on(table.designFreezeApproved),
]);

// ══════════════════════════════════════════════════════
// Table 2: plm_document_versions — File Version History
// ══════════════════════════════════════════════════════

export const plmDocumentVersions = pgTable("plm_document_versions", {
  id: serial("id").primaryKey(),

  /** FK → plm_documents.id — CASCADE: if master doc is deleted, versions go too */
  documentId: integer("document_id").references(() => plmDocuments.id).notNull(),

  // ── Version identification ──

  /** Display string: "V1.0", "V1.1", "V2.0" */
  versionString: varchar("version_string", { length: 20 }).notNull(),

  /** Numeric major for sorting/incrementing */
  versionMajor: integer("version_major").default(1).notNull(),

  /** Numeric minor for sorting/incrementing */
  versionMinor: integer("version_minor").default(0).notNull(),

  // ── Physical file reference (NO binary in DB) ──

  /**
   * URI/path to the actual file on external storage.
   * Examples:
   *   - Local:  /data/plm/projects/42/DOC-MECH-00042/v1.0/main-assembly.sldasm
   *   - S3:     s3://grt-plm/projects/42/DOC-MECH-00042/v1.0/main-assembly.sldasm
   *   - MinIO:  minio://plm-bucket/DOC-MECH-00042/v1.0/main-assembly.sldasm
   */
  fileUrlPath: varchar("file_url_path", { length: 1000 }).notNull(),

  /** Original filename as uploaded by the engineer */
  originalFileName: varchar("original_file_name", { length: 500 }),

  /** File size in bytes (bigint for >2GB assemblies) */
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),

  /** SHA-256 hash for integrity verification and deduplication */
  fileHash: varchar("file_hash", { length: 128 }),

  // ── Change tracking ──

  /** Why this version was uploaded (AI will read this) */
  changeReason: text("change_reason"),

  /** Self-reference: which version was this derived from */
  sourceVersionId: integer("source_version_id"),
  // Note: self-referencing FK declared in relations.ts to avoid circular dependency

  // ── Upload audit (critical for AI Timeliness KPI) ──

  /** Who uploaded this version (FK → users.id) */
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),

  /** Uploader display name (denormalized) */
  uploadedByName: varchar("uploaded_by_name", { length: 128 }),

  /** Exact upload timestamp — compared against milestone deadline for KPI */
  uploadedAt: timestamp("uploaded_at", { mode: "string" }).defaultNow().notNull(),

  /** Is this the latest version for its document? (denormalized flag) */
  isLatest: boolean("is_latest").default(true),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plm_ver_document_idx").on(table.documentId),
  index("plm_ver_uploaded_by_idx").on(table.uploadedBy),
  index("plm_ver_uploaded_at_idx").on(table.uploadedAt),
  index("plm_ver_latest_idx").on(table.documentId, table.isLatest),
]);

// ══════════════════════════════════════════════════════
// Table 3: plm_design_reviews — Approval / Rejection Log
// ══════════════════════════════════════════════════════

export const plmDesignReviews = pgTable("plm_design_reviews", {
  id: serial("id").primaryKey(),

  /** FK → plm_document_versions.id */
  documentVersionId: integer("document_version_id").references(() => plmDocumentVersions.id).notNull(),

  // ── Reviewer (FK → users.id) ──

  /** Who is reviewing (FK → users.id) */
  reviewerUserId: integer("reviewer_user_id").references(() => users.id).notNull(),

  /** Reviewer display name (denormalized) */
  reviewerName: varchar("reviewer_name", { length: 128 }),

  /** Reviewer's role in this review (for multi-stage approvals) */
  reviewerRole: varchar("reviewer_role", { length: 50 }),

  // ── Decision ──

  /** Approval outcome */
  reviewStatus: plmReviewStatusEnum("review_status").default("pending").notNull(),

  /** Reviewer's written feedback */
  comments: text("comments"),

  // ── Timing (critical for AI Review Turnaround KPI) ──

  /** When the review was requested */
  requestedAt: timestamp("requested_at", { mode: "string" }).defaultNow().notNull(),

  /** Deadline for completing the review */
  dueDate: timestamp("due_date", { mode: "string" }),

  /** When the reviewer actually made the decision */
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),

  /** Who requested this review (FK → users.id) */
  requestedBy: integer("requested_by").references(() => users.id),

  // ── Design Freeze gate flag ──

  /** Is this review for the design freeze gate specifically? */
  isDesignFreezeReview: boolean("is_design_freeze_review").default(false),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("plm_review_version_idx").on(table.documentVersionId),
  index("plm_review_reviewer_idx").on(table.reviewerUserId),
  index("plm_review_status_idx").on(table.reviewStatus),
  index("plm_review_requested_at_idx").on(table.requestedAt),
  index("plm_review_freeze_idx").on(table.isDesignFreezeReview),
]);

// ── Type Exports ──────────────────────────────────────

export type PlmDocument = InferSelectModel<typeof plmDocuments>;
export type InsertPlmDocument = InferInsertModel<typeof plmDocuments>;
export type PlmDocumentVersion = InferSelectModel<typeof plmDocumentVersions>;
export type InsertPlmDocumentVersion = InferInsertModel<typeof plmDocumentVersions>;
export type PlmDesignReview = InferSelectModel<typeof plmDesignReviews>;
export type InsertPlmDesignReview = InferInsertModel<typeof plmDesignReviews>;

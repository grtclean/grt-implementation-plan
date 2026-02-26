/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT AI Knowledge Assimilation & Genesis Engine Schema         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  RAG-powered document ingestion and AI-proposed system changes  ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. knowledge_documents   — Ingested company documents        ║
 * ║    2. genesis_proposals     — AI-proposed config changes         ║
 * ║    3. proposal_chat_logs    — Admin ↔ AI conversation logs      ║
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
  index,
  real,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

export const KNOWLEDGE_DOC_STATUSES = ['UPLOADED', 'PROCESSING', 'ANALYZED', 'FAILED', 'ARCHIVED'] as const;
export const KNOWLEDGE_DOC_TYPES = ['POLICY', 'SOP', 'CONTRACT', 'SPECIFICATION', 'MANUAL', 'REPORT', 'SPREADSHEET', 'OTHER'] as const;
export const PROPOSAL_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMMITTED', 'EXPIRED'] as const;
export const CHAT_ROLES = ['USER', 'AI', 'SYSTEM'] as const;

export type KnowledgeDocStatus = (typeof KNOWLEDGE_DOC_STATUSES)[number];
export type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type ChatRole = (typeof CHAT_ROLES)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const knowledgeDocStatusEnum = pgEnum('knowledge_doc_status', KNOWLEDGE_DOC_STATUSES);
export const knowledgeDocTypeEnum = pgEnum('knowledge_doc_type', KNOWLEDGE_DOC_TYPES);
export const proposalStatusEnum = pgEnum('genesis_proposal_status', PROPOSAL_STATUSES);
export const chatRoleEnum = pgEnum('genesis_chat_role', CHAT_ROLES);

// ══════════════════════════════════════════════════════
// Table 1: knowledge_documents — Ingested company documents
//
// Stores uploaded files for RAG (Retrieval-Augmented
// Generation). Each document goes through: UPLOADED →
// PROCESSING → ANALYZED (or FAILED). Extracted text,
// embeddings, and AI analysis are stored alongside.
// ══════════════════════════════════════════════════════

export const knowledgeDocuments = pgTable("ai_knowledge_documents", {
  id: serial("id").primaryKey(),

  /** Original file name as uploaded by the user */
  fileName: varchar("file_name", { length: 500 }).notNull(),

  /** Document category / type */
  fileType: knowledgeDocTypeEnum("file_type").notNull(),

  /** Server storage path (local disk or object store key) */
  filePath: text("file_path"),

  /** File size in bytes */
  fileSizeBytes: integer("file_size_bytes"),

  /** MIME type, e.g. "application/pdf", "text/plain" */
  mimeType: varchar("mime_type", { length: 100 }),

  /** Processing pipeline status */
  status: knowledgeDocStatusEnum("status").default("UPLOADED"),

  /** Full text extraction from the document */
  extractedText: text("extracted_text"),

  /** AI-generated summary of the document contents */
  summary: text("summary"),

  /** JSONB: extracted entities (people, departments, standards, etc.) */
  keyEntities: json("key_entities").$type<Record<string, unknown>>(),

  /** Serialized embedding vector (or reference to external vector store) */
  embeddingVector: text("embedding_vector"),

  /** JSONB: AI analysis output (topics, suggestions, references) */
  analysisResult: json("analysis_result").$type<Record<string, unknown>>(),

  /** JSONB: string array of searchable tags */
  tags: json("tags").$type<string[]>(),

  /** FK -> users.id — who uploaded this document */
  uploadedBy: integer("uploaded_by").references(() => users.id),

  /** When the document was fully processed (nullable) */
  processedAt: timestamp("processed_at", { mode: "string" }),

  /** Error message if processing failed */
  errorMessage: text("error_message"),

  /** Arbitrary extensible metadata */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),

  /** Whether this document has been purged via security rollback */
  isPurged: boolean("is_purged").default(false),

  /** FK → users.id — who approved this document (nullable) */
  approvedBy: integer("approved_by").references(() => users.id),

  /** Expiry timestamp for the approval (nullable) */
  approvalExpiry: timestamp("approval_expiry", { mode: "string" }),
}, (table) => [
  index("kd_file_type_idx").on(table.fileType),
  index("kd_status_idx").on(table.status),
  index("kd_uploaded_by_idx").on(table.uploadedBy),
  index("kd_created_at_idx").on(table.createdAt),
]);

// ══════════════════════════════════════════════════════
// Table 2: genesis_proposals — AI-proposed system
//   configuration changes
//
// When the AI analyzes documents, it may propose changes
// to dictionaries, workflows, policies, or schemas.
// Each proposal stores a JSON diff of the proposed change,
// the current snapshot for comparison, and an impact analysis.
// ══════════════════════════════════════════════════════

export const genesisProposals = pgTable("genesis_proposals", {
  id: serial("id").primaryKey(),

  /** Proposal title / short description */
  title: varchar("title", { length: 300 }).notNull(),

  /** Detailed description of what is being proposed */
  description: text("description"),

  /** FK -> knowledge_documents.id — which document triggered this proposal (nullable) */
  sourceDocumentId: integer("source_document_id").references(() => knowledgeDocuments.id),

  /** Type of proposed change, e.g. "DICTIONARY_UPDATE", "WORKFLOW_CHANGE", "POLICY_ADD", "SCHEMA_SUGGESTION" */
  proposalType: varchar("proposal_type", { length: 100 }),

  /** Which table or system area this change affects */
  targetEntity: varchar("target_entity", { length: 100 }),

  /** JSONB: the actual proposed change expressed as a JSON diff */
  proposedJsonDiff: json("proposed_json_diff").$type<Record<string, unknown>>().notNull(),

  /** JSONB: snapshot of current state for side-by-side comparison */
  currentSnapshot: json("current_snapshot").$type<Record<string, unknown>>(),

  /** JSONB: affected records count, risk level, dependencies */
  impactAnalysis: json("impact_analysis").$type<Record<string, unknown>>(),

  /** Proposal lifecycle status */
  status: proposalStatusEnum("status").default("DRAFT"),

  /** AI confidence score 0.0 - 1.0 */
  confidence: real("confidence"),

  /** FK -> users.id — who reviewed this proposal (nullable) */
  reviewedBy: integer("reviewed_by").references(() => users.id),

  /** When the proposal was reviewed (nullable) */
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),

  /** Reviewer's comment / reason for approval or rejection */
  reviewComment: text("review_comment"),

  /** When the proposal was committed / applied (nullable) */
  committedAt: timestamp("committed_at", { mode: "string" }),

  /** FK -> users.id — who committed/applied this proposal (nullable) */
  committedBy: integer("committed_by").references(() => users.id),

  /** FK -> users.id — who (or which AI agent) created this proposal (nullable) */
  createdBy: integer("created_by").references(() => users.id),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("gp_source_document_idx").on(table.sourceDocumentId),
  index("gp_proposal_type_idx").on(table.proposalType),
  index("gp_status_idx").on(table.status),
  index("gp_created_by_idx").on(table.createdBy),
  index("gp_target_entity_idx").on(table.targetEntity),
]);

// ══════════════════════════════════════════════════════
// Table 3: proposal_chat_logs — Conversation between
//   admin and AI about proposals
//
// Stores the full dialogue history for each proposal,
// allowing admins to ask questions, request modifications,
// and understand the AI's reasoning before approving.
// ══════════════════════════════════════════════════════

export const proposalChatLogs = pgTable("proposal_chat_logs", {
  id: serial("id").primaryKey(),

  /** FK -> genesis_proposals.id — which proposal this conversation belongs to */
  proposalId: integer("proposal_id").references(() => genesisProposals.id).notNull(),

  /** Who sent this message: USER, AI, or SYSTEM */
  role: chatRoleEnum("role").notNull(),

  /** Message content (plain text or markdown) */
  content: text("content").notNull(),

  /** JSONB: file references, screenshots, or other attachments */
  attachments: json("attachments").$type<Record<string, unknown>[]>(),

  /** JSONB: model info, token usage, latency, etc. */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("pcl_proposal_idx").on(table.proposalId),
  index("pcl_role_idx").on(table.role),
  index("pcl_created_at_idx").on(table.createdAt),
]);

// ══════════════════════════════════════════════════════
// Table 4: ai_proposal_history — Data Flywheel registry
//
// Every generated proposal is persisted here so the AI
// system can learn from past outputs and subsequent
// human edits.  Status tracks the editorial lifecycle.
// ══════════════════════════════════════════════════════

export const PROPOSAL_HISTORY_STATUSES = ['DRAFT', 'EDITED', 'FINALIZED'] as const;
export type ProposalHistoryStatus = (typeof PROPOSAL_HISTORY_STATUSES)[number];

export const proposalHistoryStatusEnum = pgEnum('proposal_history_status', PROPOSAL_HISTORY_STATUSES);

export const aiProposalHistory = pgTable("ai_proposal_history", {
  id: serial("id").primaryKey(),

  /** FK -> knowledge_documents.id — which source document triggered this generation */
  sourceDocumentId: integer("source_document_id").references(() => knowledgeDocuments.id),

  /** The prompt / context that was sent to the LLM */
  promptUsed: text("prompt_used").notNull(),

  /** The AI-generated proposal content (Markdown / plain text) */
  generatedContent: text("generated_content").notNull(),

  /** Editorial lifecycle: DRAFT -> EDITED -> FINALIZED */
  status: proposalHistoryStatusEnum("status").default("DRAFT").notNull(),

  /** Optional human feedback score (1-5) for the learning loop */
  feedbackScore: integer("feedback_score"),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("aph_source_doc_idx").on(table.sourceDocumentId),
  index("aph_status_idx").on(table.status),
  index("aph_created_at_idx").on(table.createdAt),
]);

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type KnowledgeDocument = InferSelectModel<typeof knowledgeDocuments>;
export type NewKnowledgeDocument = InferInsertModel<typeof knowledgeDocuments>;

export type GenesisProposal = InferSelectModel<typeof genesisProposals>;
export type NewGenesisProposal = InferInsertModel<typeof genesisProposals>;

export type ProposalChatLog = InferSelectModel<typeof proposalChatLogs>;
export type NewProposalChatLog = InferInsertModel<typeof proposalChatLogs>;

export type AiProposalHistory = InferSelectModel<typeof aiProposalHistory>;
export type NewAiProposalHistory = InferInsertModel<typeof aiProposalHistory>;

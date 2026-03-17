/**
 * GRT Knowledge Genesis Service — AI-Powered Document Analysis & System Configuration
 *
 * Handles:
 *   1. Document ingestion and AI analysis (text extraction, entity detection, summarization)
 *   2. Proposal generation from analyzed documents
 *   3. Admin <-> AI chat for proposal refinement
 *   4. Proposal commitment to the System Control Tower
 *
 * Design decisions:
 *   - Status guards: every state transition is validated before execution
 *   - AI analysis: runs synchronously during ingest (extractedText-based)
 *   - Chat logs: immutable append-only log per proposal
 *   - Commitment: writes to governance tables (sys_dictionaries, etc.)
 *   - DB type: `DbClient` alias avoids `any` while staying DRY
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { requireDb } from "../db";
import {
  knowledgeDocuments,
  genesisProposals,
  proposalChatLogs,
  type KnowledgeDocType,
  type ChatRole,
} from "../../drizzle/ai-genesis-schema";
import { sysAuditLogs } from "../../drizzle/governance-schema";
import { sysDictionaries } from "../../drizzle/governance-schema";
import { users } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("knowledge-genesis");

// ══════════════════════════════════════════════════════
// DB type alias (mirrors oa.service.ts pattern)
// ══════════════════════════════════════════════════════

type DbClient = NonNullable<Awaited<ReturnType<typeof requireDb>>>;

// ══════════════════════════════════════════════════════
// Interfaces
// ══════════════════════════════════════════════════════

interface IngestParams {
  fileName: string;
  fileType: KnowledgeDocType;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: number;
  extractedText?: string;
}

interface AnalysisResult {
  topicsDetected: string[];
  suggestedActions: string[];
  relatedStandards: string[];
}

interface ImpactAnalysis {
  affectedTables: string[];
  estimatedRecords: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

/** Valid proposal status transitions */
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["COMMITTED"],
};

// ══════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════

/** Regex patterns for entity extraction from document text */
const ISO_PATTERN = /ISO\s?\d{4,5}(?:[-:]\d+)?/gi;
const IATF_PATTERN = /IATF\s?\d{5}/gi;
const VDA_PATTERN = /VDA\s?\d+(?:\.\d+)?/gi;
const DEPARTMENT_PATTERN = /(?:Engineering|Quality|Production|HR|Finance|Sales|Procurement|Logistics|R&D|IT|Manufacturing)\s*(?:Department|Team|Group|Division)?/gi;

/** File type to proposal type mapping */
const FILE_TYPE_PROPOSAL_MAP: Record<string, string> = {
  POLICY: "DICTIONARY_UPDATE",
  SOP: "WORKFLOW_CHANGE",
  SPECIFICATION: "SCHEMA_SUGGESTION",
};

// ══════════════════════════════════════════════════════
// Internal Helpers
// ══════════════════════════════════════════════════════

function nowISO(): string {
  return new Date().toISOString();
}

async function resolveUserName(db: DbClient, userId: number): Promise<string> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.name ?? `User#${userId}`;
}

/**
 * Extract potential entity names from text using regex patterns.
 * Looks for ISO numbers, IATF references, VDA standards, and department names.
 */
function extractKeyEntities(text: string): string[] {
  const entities = new Set<string>();

  const isoMatches = text.match(ISO_PATTERN) ?? [];
  const iatfMatches = text.match(IATF_PATTERN) ?? [];
  const vdaMatches = text.match(VDA_PATTERN) ?? [];
  const deptMatches = text.match(DEPARTMENT_PATTERN) ?? [];

  for (const m of [...isoMatches, ...iatfMatches, ...vdaMatches, ...deptMatches]) {
    entities.add(m.trim());
  }

  return Array.from(entities);
}

/**
 * Generate a basic AI analysis from extracted text.
 * Produces topics, suggested actions, and related standards.
 */
function generateAnalysis(text: string, fileType: string): AnalysisResult {
  const keyEntities = extractKeyEntities(text);
  const lowerText = text.toLowerCase();

  // Detect topics based on keyword presence
  const topicsDetected: string[] = [];
  if (lowerText.includes("quality") || lowerText.includes("inspection"))
    topicsDetected.push("Quality Management");
  if (lowerText.includes("safety") || lowerText.includes("hazard"))
    topicsDetected.push("Safety & Compliance");
  if (lowerText.includes("process") || lowerText.includes("workflow"))
    topicsDetected.push("Process Engineering");
  if (lowerText.includes("training") || lowerText.includes("competenc"))
    topicsDetected.push("Training & Competency");
  if (lowerText.includes("customer") || lowerText.includes("requirement"))
    topicsDetected.push("Customer Requirements");
  if (lowerText.includes("supplier") || lowerText.includes("procurement"))
    topicsDetected.push("Supply Chain");
  if (lowerText.includes("cost") || lowerText.includes("budget"))
    topicsDetected.push("Cost Management");
  if (topicsDetected.length === 0)
    topicsDetected.push("General Documentation");

  // Suggest actions based on file type and content
  const suggestedActions: string[] = [];
  switch (fileType) {
    case "POLICY":
      suggestedActions.push("Update system dictionary entries");
      suggestedActions.push("Review affected workflow definitions");
      break;
    case "SOP":
      suggestedActions.push("Create or update workflow definition");
      suggestedActions.push("Notify affected departments");
      break;
    case "SPECIFICATION":
      suggestedActions.push("Validate against current schema");
      suggestedActions.push("Generate schema migration proposal");
      break;
    default:
      suggestedActions.push("Review and classify document");
      suggestedActions.push("Identify affected system areas");
  }
  if (keyEntities.length > 0) {
    suggestedActions.push(`Link to standards: ${keyEntities.slice(0, 3).join(", ")}`);
  }

  // Related standards from extracted entities
  const relatedStandards = keyEntities.filter(
    (e) => /^(ISO|IATF|VDA)/i.test(e),
  );
  if (relatedStandards.length === 0) {
    relatedStandards.push("No specific standards detected");
  }

  return { topicsDetected, suggestedActions, relatedStandards };
}

/**
 * Determine risk level based on proposal type and document analysis.
 */
function assessRiskLevel(
  proposalType: string,
  analysisResult: AnalysisResult,
): "LOW" | "MEDIUM" | "HIGH" {
  // Schema changes are highest risk
  if (proposalType === "SCHEMA_SUGGESTION") return "HIGH";
  // Workflow changes are medium risk
  if (proposalType === "WORKFLOW_CHANGE") return "MEDIUM";
  // Multiple standards detected increases risk
  if (analysisResult.relatedStandards.length > 3) return "MEDIUM";
  return "LOW";
}

/**
 * Determine which tables might be affected by a proposal type.
 */
function resolveAffectedTables(proposalType: string, targetEntity: string): string[] {
  const tables: string[] = [targetEntity];

  switch (proposalType) {
    case "DICTIONARY_UPDATE":
      tables.push("sys_dictionaries");
      break;
    case "WORKFLOW_CHANGE":
      tables.push("sys_workflow_definitions", "sys_workflow_nodes");
      break;
    case "SCHEMA_SUGGESTION":
      tables.push("drizzle_migrations");
      break;
    case "POLICY_ADD":
      tables.push("sys_data_policies");
      break;
  }

  return [...new Set(tables)];
}

// ══════════════════════════════════════════════════════
// 1. ingestAndAnalyzeDocument — Upload + analyze a document
// ══════════════════════════════════════════════════════

/**
 * Ingest a document into the knowledge base and perform AI analysis.
 *
 * Flow:
 *   1. Insert document with status UPLOADED
 *   2. If extractedText is provided, transition to PROCESSING
 *   3. Run entity extraction, topic detection, and summarization
 *   4. Transition to ANALYZED with full analysis results
 *
 * Returns the fully updated document record.
 */
export async function ingestAndAnalyzeDocument(
  params: IngestParams,
): Promise<typeof knowledgeDocuments.$inferSelect> {
  const db = await requireDb();

  // 1. Insert document with status UPLOADED
  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      fileName: params.fileName,
      fileType: params.fileType,
      filePath: params.filePath,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
      status: "UPLOADED",
    })
    .returning();

  if (!doc) throw new Error("Failed to insert document");

  // 2. If no extracted text, return as-is (awaiting OCR/extraction pipeline)
  if (!params.extractedText) {
    return doc;
  }

  // 3. Transition to PROCESSING
  await db
    .update(knowledgeDocuments)
    .set({ status: "PROCESSING" })
    .where(eq(knowledgeDocuments.id, doc.id));

  // 4. Generate analysis
  const text = params.extractedText;
  const summary =
    text.length > 500 ? text.substring(0, 500) + "..." : text;
  const keyEntities = extractKeyEntities(text);
  const analysisResult = generateAnalysis(text, params.fileType);
  const processedAt = nowISO();

  // 5. Update document with analysis results
  const [analyzedDoc] = await db
    .update(knowledgeDocuments)
    .set({
      status: "ANALYZED",
      extractedText: text,
      summary,
      keyEntities: keyEntities as unknown as Record<string, unknown>,
      analysisResult: analysisResult as unknown as Record<string, unknown>,
      processedAt,
    })
    .where(eq(knowledgeDocuments.id, doc.id))
    .returning();

  if (!analyzedDoc) throw new Error(`Document #${doc.id} not found after analysis update`);

  return analyzedDoc;
}

// ══════════════════════════════════════════════════════
// 2. generateProposalFromDocument — Create an AI proposal
// ══════════════════════════════════════════════════════

/**
 * Generate a system configuration proposal from an analyzed document.
 *
 * Logic:
 *   - Verifies the document is in ANALYZED status
 *   - Maps document type to proposal type (POLICY -> DICTIONARY_UPDATE, etc.)
 *   - Builds a proposed JSON diff from the document's analysis result
 *   - Computes impact analysis (affected tables, risk level)
 *   - Creates the proposal with status DRAFT and a default confidence of 0.7
 *   - Adds an initial SYSTEM chat log entry
 *
 * Returns the newly created proposal.
 */
export async function generateProposalFromDocument(
  documentId: number,
  createdBy: number,
): Promise<typeof genesisProposals.$inferSelect> {
  const db = await requireDb();

  // 1. Load document and verify status
  const [document] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error(`Document #${documentId} not found`);
  }

  if (document.status !== "ANALYZED") {
    throw new Error(
      `Document #${documentId} is ${document.status}; only ANALYZED documents can generate proposals`,
    );
  }

  // 2. Determine proposal type based on document file type
  const proposalType =
    FILE_TYPE_PROPOSAL_MAP[document.fileType] ?? "POLICY_ADD";

  // 3. Build proposed JSON diff from analysis result
  const analysisResult = (document.analysisResult ?? {}) as unknown as AnalysisResult;
  const proposedJsonDiff: Record<string, unknown> = {
    sourceDocumentId: documentId,
    sourceFileName: document.fileName,
    sourceFileType: document.fileType,
    topics: analysisResult.topicsDetected ?? [],
    suggestedActions: analysisResult.suggestedActions ?? [],
    relatedStandards: analysisResult.relatedStandards ?? [],
    keyEntities: document.keyEntities ?? [],
    summary: document.summary,
  };

  // 4. Build impact analysis
  const targetEntity = proposalType === "DICTIONARY_UPDATE"
    ? "sys_dictionaries"
    : proposalType === "WORKFLOW_CHANGE"
      ? "sys_workflow_definitions"
      : proposalType === "SCHEMA_SUGGESTION"
        ? "drizzle_migrations"
        : "sys_data_policies";

  const riskLevel = assessRiskLevel(proposalType, analysisResult);
  const affectedTables = resolveAffectedTables(proposalType, targetEntity);

  const impactAnalysis: ImpactAnalysis = {
    affectedTables,
    estimatedRecords: 0,
    riskLevel,
  };

  // 5. Insert proposal
  const title = `[${proposalType}] ${document.fileName}`;
  const [proposal] = await db
    .insert(genesisProposals)
    .values({
      title,
      sourceDocumentId: documentId,
      proposalType,
      targetEntity,
      proposedJsonDiff,
      impactAnalysis: impactAnalysis as unknown as Record<string, unknown>,
      status: "DRAFT" as const,
      confidence: 0.7,
      createdBy,
    })
    .returning();

  if (!proposal) throw new Error("Failed to insert proposal");

  // 6. Add initial SYSTEM chat log
  await db.insert(proposalChatLogs).values({
    proposalId: proposal.id,
    role: "SYSTEM",
    content: `Proposal generated from document: ${document.fileName}`,
    metadata: {
      documentId,
      proposalType,
      riskLevel,
      affectedTables,
    },
  });

  return proposal;
}

// ══════════════════════════════════════════════════════
// 3. addChatMessage — Add a chat message to a proposal
// ══════════════════════════════════════════════════════

/**
 * Append a chat message to a proposal's conversation log.
 *
 * Messages are immutable once created — the log is append-only.
 * Roles: USER, AI, SYSTEM.
 */
export async function addChatMessage(
  proposalId: number,
  role: ChatRole,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<typeof proposalChatLogs.$inferSelect> {
  const db = await requireDb();

  // Verify proposal exists
  const [proposal] = await db
    .select({ id: genesisProposals.id })
    .from(genesisProposals)
    .where(eq(genesisProposals.id, proposalId))
    .limit(1);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  const [message] = await db
    .insert(proposalChatLogs)
    .values({
      proposalId,
      role,
      content,
      metadata: metadata ?? null,
    })
    .returning();

  if (!message) throw new Error("Failed to insert chat message");

  return message;
}

// ══════════════════════════════════════════════════════
// 4. commitProposalToControlTower — Commit an approved proposal
// ══════════════════════════════════════════════════════

/**
 * Commit an approved proposal to the System Control Tower.
 *
 * Flow:
 *   1. Verify proposal is APPROVED
 *   2. If targeting sys_dictionaries: insert dictionary entries from the diff
 *   3. Otherwise: log the commit action for future entity-specific handlers
 *   4. Update proposal status to COMMITTED
 *   5. Log to sys_audit_logs
 *   6. Add SYSTEM chat message recording the commitment
 *
 * Returns the updated proposal.
 */
export async function commitProposalToControlTower(
  proposalId: number,
  committedBy: number,
): Promise<typeof genesisProposals.$inferSelect> {
  const db = await requireDb();

  // 1. Load proposal and verify status
  const [proposal] = await db
    .select()
    .from(genesisProposals)
    .where(eq(genesisProposals.id, proposalId))
    .limit(1);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  if (proposal.status !== "APPROVED") {
    throw new Error(
      `Proposal #${proposalId} is ${proposal.status}; only APPROVED proposals can be committed`,
    );
  }

  const now = nowISO();
  const actorName = await resolveUserName(db, committedBy);
  const diff = (proposal.proposedJsonDiff ?? {}) as Record<string, unknown>;

  // 2. Apply changes based on target entity
  if (proposal.targetEntity === "sys_dictionaries") {
    // Extract dictionary entries from the proposed diff
    const entries = (diff.dictionaryEntries ?? diff.entries ?? []) as Array<{
      category?: string;
      code?: string;
      label?: string;
      labelZh?: string;
      value?: string;
      sortOrder?: number;
    }>;

    if (entries.length > 0) {
      const rows = entries
        .filter((e) => e.category && e.code && e.label && e.labelZh)
        .map((entry) => ({
          category: entry.category!,
          code: entry.code!,
          label: entry.label!,
          labelZh: entry.labelZh!,
          value: entry.value ?? null,
          sortOrder: entry.sortOrder ?? 0,
          isActive: true,
          metadata: {
            sourceProposalId: proposalId,
            committedBy,
            committedAt: now,
          },
        }));

      if (rows.length > 0) {
        await db.insert(sysDictionaries).values(rows);
      }
    }
  } else {
    // Future entity-specific handlers: log the intended action
    log.info({ proposalId, targetEntity: proposal.targetEntity }, "Entity-specific handler not yet implemented; recording commit for audit");
  }

  // 3. Update proposal status to COMMITTED
  const [committedProposal] = await db
    .update(genesisProposals)
    .set({
      status: "COMMITTED",
      committedAt: now,
      committedBy,
    })
    .where(eq(genesisProposals.id, proposalId))
    .returning();

  if (!committedProposal) {
    throw new Error(`Proposal #${proposalId} not found after commit update`);
  }

  // 4. Log to sys_audit_logs
  await db.insert(sysAuditLogs).values({
    entityType: "genesis_proposals",
    entityId: proposalId,
    action: "APPROVE",
    actorId: committedBy,
    actorName,
    previousData: { status: "APPROVED" },
    newData: {
      status: "COMMITTED",
      committedAt: now,
      targetEntity: proposal.targetEntity,
      proposalType: proposal.proposalType,
    },
    metadata: {
      operation: "COMMIT_TO_CONTROL_TOWER",
      proposalType: proposal.proposalType,
      targetEntity: proposal.targetEntity,
    },
  });

  // 5. Add SYSTEM chat log
  await db.insert(proposalChatLogs).values({
    proposalId,
    role: "SYSTEM",
    content: `Proposal committed to Control Tower by ${actorName}`,
    metadata: {
      committedBy,
      committedAt: now,
      targetEntity: proposal.targetEntity,
    },
  });

  return committedProposal;
}

// ══════════════════════════════════════════════════════
// 5. updateProposalStatus — Transition proposal status
// ══════════════════════════════════════════════════════

/**
 * Transition a proposal through its lifecycle states.
 *
 * Valid transitions:
 *   DRAFT -> PENDING_REVIEW
 *   PENDING_REVIEW -> APPROVED | REJECTED
 *   APPROVED -> COMMITTED (use commitProposalToControlTower instead)
 *
 * Status guards prevent invalid transitions. Review comments are
 * recorded when a reviewer approves or rejects.
 */
export async function updateProposalStatus(
  proposalId: number,
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "COMMITTED" | "EXPIRED",
  reviewedBy?: number,
  reviewComment?: string,
): Promise<typeof genesisProposals.$inferSelect> {
  const db = await requireDb();

  // 1. Load current proposal
  const [proposal] = await db
    .select()
    .from(genesisProposals)
    .where(eq(genesisProposals.id, proposalId))
    .limit(1);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  // 2. Validate transition
  const allowedNextStatuses = VALID_TRANSITIONS[proposal.status as string];
  if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
    throw new Error(
      `Invalid status transition: ${proposal.status} -> ${status}. ` +
        `Allowed transitions from ${proposal.status}: [${(allowedNextStatuses ?? []).join(", ")}]`,
    );
  }

  // 3. Build update payload
  const now = nowISO();
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  if (reviewedBy !== undefined) {
    updateData.reviewedBy = reviewedBy;
    updateData.reviewedAt = now;
  }

  if (reviewComment !== undefined) {
    updateData.reviewComment = reviewComment;
  }

  // 4. Apply update
  const [updated] = await db
    .update(genesisProposals)
    .set(updateData)
    .where(eq(genesisProposals.id, proposalId))
    .returning();

  if (!updated) {
    throw new Error(`Proposal #${proposalId} not found after status update`);
  }

  // 5. Add chat log for status transition
  const actorName = reviewedBy
    ? await resolveUserName(db, reviewedBy)
    : "System";

  let chatContent = `Status changed: ${proposal.status} -> ${status}`;
  if (reviewComment) {
    chatContent += ` | Comment: ${reviewComment}`;
  }
  chatContent += ` (by ${actorName})`;

  await db.insert(proposalChatLogs).values({
    proposalId,
    role: "SYSTEM",
    content: chatContent,
    metadata: {
      previousStatus: proposal.status,
      newStatus: status,
      reviewedBy,
      reviewComment,
    },
  });

  return updated;
}

// ══════════════════════════════════════════════════════
// 6. getProposalWithChat — Load proposal + chat messages
// ══════════════════════════════════════════════════════

/**
 * Load a proposal along with all associated chat messages and the source document.
 *
 * Returns a composite object with:
 *   - proposal: the genesis proposal record
 *   - chatMessages: all chat messages ordered by createdAt ascending
 *   - document: the source knowledge document (if linked), or null
 */
export async function getProposalWithChat(
  proposalId: number,
): Promise<{
  proposal: typeof genesisProposals.$inferSelect;
  chatMessages: (typeof proposalChatLogs.$inferSelect)[];
  document: typeof knowledgeDocuments.$inferSelect | null;
}> {
  const db = await requireDb();

  // 1. Load proposal
  const [proposal] = await db
    .select()
    .from(genesisProposals)
    .where(eq(genesisProposals.id, proposalId))
    .limit(1);

  if (!proposal) {
    throw new Error(`Proposal #${proposalId} not found`);
  }

  // 2. Load chat messages (ordered chronologically)
  const chatMessages = await db
    .select()
    .from(proposalChatLogs)
    .where(eq(proposalChatLogs.proposalId, proposalId))
    .orderBy(proposalChatLogs.createdAt);

  // 3. Load source document if linked
  let document: typeof knowledgeDocuments.$inferSelect | null = null;
  if (proposal.sourceDocumentId) {
    const [doc] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, proposal.sourceDocumentId))
      .limit(1);
    document = doc ?? null;
  }

  return { proposal, chatMessages, document };
}

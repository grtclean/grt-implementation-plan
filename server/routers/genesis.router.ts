/**
 * GRT Knowledge Genesis Router — AI Document Analysis & System Configuration APIs
 *
 * 15 procedures across 4 groups:
 *   Documents  (5): listDocuments, getDocument, uploadDocument, reanalyzeDocument, archiveDocument
 *   Proposals  (6): listProposals, getProposal, generateProposal, updateProposalStatus,
 *                    commitProposal, updateProposalDiff
 *   Chat       (3): getChatMessages, sendMessage, generateAIResponse
 *   Stats      (1): getGenesisStats
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  knowledgeDocuments,
  genesisProposals,
  proposalChatLogs,
  aiProposalHistory,
} from "../../drizzle/ai-genesis-schema";
import { getDb } from "../db";
import {
  ingestAndAnalyzeDocument,
  generateProposalFromDocument,
  addChatMessage,
  commitProposalToControlTower,
  updateProposalStatus as updateProposalStatusSvc,
  getProposalWithChat,
} from "../services/knowledge-genesis.service";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

// ── In-memory fallback store for proposal history (when DB is unavailable) ────

interface MemHistoryItem {
  id: number;
  sourceDocumentId: number | null;
  sourceDocumentName: string;
  promptUsed: string;
  generatedContent: string;
  status: "DRAFT" | "EDITED" | "FINALIZED";
  feedbackScore: number | null;
  createdAt: string;
  updatedAt: string;
}

const proposalHistoryMemStore: { nextId: number; items: MemHistoryItem[] } = {
  nextId: 1,
  items: [],
};

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

const DOCUMENT_STATUSES = [
  "UPLOADED",
  "PROCESSING",
  "ANALYZED",
  "FAILED",
  "ARCHIVED",
] as const;

const DOCUMENT_FILE_TYPES = [
  "POLICY",
  "SOP",
  "CONTRACT",
  "SPECIFICATION",
  "MANUAL",
  "REPORT",
  "SPREADSHEET",
  "OTHER",
] as const;

const PROPOSAL_TYPES = [
  "DICTIONARY_UPDATE",
  "WORKFLOW_CHANGE",
  "SCHEMA_SUGGESTION",
  "POLICY_ADD",
] as const;

const PROPOSAL_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "COMMITTED",
] as const;

export const genesisRouter = router({
  // ══════════════════════════════════════════════════
  // Documents
  // ══════════════════════════════════════════════════

  listDocuments: protectedProcedure
    .input(
      z
        .object({
          fileType: z.enum(DOCUMENT_FILE_TYPES).optional(),
          status: z.enum(DOCUMENT_STATUSES).optional(),
          uploadedBy: z.union([z.string(), z.number()]).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.fileType)
        conditions.push(eq(knowledgeDocuments.fileType, input.fileType));
      if (input?.status)
        conditions.push(eq(knowledgeDocuments.status, input.status));
      if (input?.uploadedBy)
        conditions.push(
          eq(knowledgeDocuments.uploadedBy, toNum(input.uploadedBy))
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(knowledgeDocuments)
          .where(where)
          .orderBy(desc(knowledgeDocuments.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(knowledgeDocuments).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getDocument: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      const [document] = await db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, numId))
        .limit(1);

      return document ?? null;
    }),

  uploadDocument: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileType: z.enum(DOCUMENT_FILE_TYPES).optional(),
        filePath: z.string().optional(),
        fileSizeBytes: z.number().int().positive().optional(),
        mimeType: z.string().min(1).max(200).optional(),
        extractedText: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Auto-detect fileType from file extension if not provided
      let fileType = input.fileType;
      if (!fileType) {
        const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
        const extMap: Record<string, typeof DOCUMENT_FILE_TYPES[number]> = {
          pdf: "POLICY", doc: "POLICY", docx: "POLICY",
          xls: "SPREADSHEET", xlsx: "SPREADSHEET", csv: "SPREADSHEET",
          txt: "MANUAL", md: "MANUAL",
        };
        fileType = extMap[ext] ?? "OTHER";
      }
      return ingestAndAnalyzeDocument({
        fileName: input.fileName,
        fileType,
        filePath: input.filePath ?? `uploads/${Date.now()}_${input.fileName}`,
        fileSizeBytes: input.fileSizeBytes ?? 0,
        mimeType: input.mimeType ?? "application/octet-stream",
        uploadedBy: ctx.user.id,
        extractedText: input.extractedText,
      });
    }),

  reanalyzeDocument: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        extractedText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      // Load the existing document
      const [existing] = await db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, numId))
        .limit(1);

      if (!existing) throw new Error(`Document #${input.id} not found`);

      if (existing.status === "ARCHIVED") {
        throw new Error(
          `Document #${input.id} is ARCHIVED; cannot re-analyze archived documents`
        );
      }

      // Use provided text or fall back to existing extracted text
      const text = input.extractedText ?? existing.extractedText;
      if (!text) {
        throw new Error(
          `Document #${input.id} has no extracted text; provide extractedText to analyze`
        );
      }

      // Reset to PROCESSING
      await db
        .update(knowledgeDocuments)
        .set({ status: "PROCESSING" })
        .where(eq(knowledgeDocuments.id, numId));

      // Re-run analysis
      const ISO_PATTERN = /ISO\s?\d{4,5}(?:[-:]\d+)?/gi;
      const IATF_PATTERN = /IATF\s?\d{5}/gi;
      const VDA_PATTERN = /VDA\s?\d+(?:\.\d+)?/gi;
      const DEPARTMENT_PATTERN =
        /(?:Engineering|Quality|Production|HR|Finance|Sales|Procurement|Logistics|R&D|IT|Manufacturing)\s*(?:Department|Team|Group|Division)?/gi;

      const entities = new Set<string>();
      for (const m of [
        ...(text.match(ISO_PATTERN) ?? []),
        ...(text.match(IATF_PATTERN) ?? []),
        ...(text.match(VDA_PATTERN) ?? []),
        ...(text.match(DEPARTMENT_PATTERN) ?? []),
      ]) {
        entities.add(m.trim());
      }

      const keyEntities = Array.from(entities);
      const summary =
        text.length > 500 ? text.substring(0, 500) + "..." : text;
      const lowerText = text.toLowerCase();

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

      const suggestedActions: string[] = [];
      switch (existing.fileType) {
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
        suggestedActions.push(
          `Link to standards: ${keyEntities.slice(0, 3).join(", ")}`
        );
      }

      const relatedStandards = keyEntities.filter((e) =>
        /^(ISO|IATF|VDA)/i.test(e)
      );
      if (relatedStandards.length === 0) {
        relatedStandards.push("No specific standards detected");
      }

      const analysisResult = { topicsDetected, suggestedActions, relatedStandards };
      const processedAt = new Date().toISOString();

      const [updated] = await db
        .update(knowledgeDocuments)
        .set({
          status: "ANALYZED",
          extractedText: text,
          summary,
          keyEntities: keyEntities as unknown as Record<string, unknown>,
          analysisResult: analysisResult as unknown as Record<string, unknown>,
          processedAt,
        })
        .where(eq(knowledgeDocuments.id, numId))
        .returning();

      if (!updated)
        throw new Error(`Document #${input.id} not found after re-analysis`);

      return updated;
    }),

  archiveDocument: protectedProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      const [existing] = await db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, numId))
        .limit(1);

      if (!existing) throw new Error(`Document #${input.id} not found`);

      if (existing.status === "ARCHIVED") {
        throw new Error(`Document #${input.id} is already ARCHIVED`);
      }

      const [archived] = await db
        .update(knowledgeDocuments)
        .set({
          status: "ARCHIVED",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(knowledgeDocuments.id, numId))
        .returning();

      return archived;
    }),

  // ══════════════════════════════════════════════════
  // Proposals
  // ══════════════════════════════════════════════════

  listProposals: protectedProcedure
    .input(
      z
        .object({
          proposalType: z.enum(PROPOSAL_TYPES).optional(),
          status: z.enum(PROPOSAL_STATUSES).optional(),
          sourceDocumentId: z.union([z.string(), z.number()]).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.proposalType)
        conditions.push(
          eq(genesisProposals.proposalType, input.proposalType)
        );
      if (input?.status)
        conditions.push(eq(genesisProposals.status, input.status));
      if (input?.sourceDocumentId)
        conditions.push(
          eq(
            genesisProposals.sourceDocumentId,
            toNum(input.sourceDocumentId)
          )
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(genesisProposals)
          .where(where)
          .orderBy(desc(genesisProposals.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(genesisProposals).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getProposal: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      return getProposalWithChat(toNum(input.id));
    }),

  generateProposal: protectedProcedure
    .input(
      z.object({
        documentId: z.union([z.string(), z.number()]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return generateProposalFromDocument(
        toNum(input.documentId),
        ctx.user.id
      );
    }),

  updateProposalStatus: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        proposalId: z.union([z.string(), z.number()]).optional(),
        status: z.enum(PROPOSAL_STATUSES),
        reviewComment: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pid = input.id ?? input.proposalId;
      if (!pid) throw new Error("Either id or proposalId is required");
      return updateProposalStatusSvc(
        toNum(pid),
        input.status,
        ctx.user.id,
        input.reviewComment
      );
    }),

  commitProposal: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        proposalId: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pid = input.id ?? input.proposalId;
      if (!pid) throw new Error("Either id or proposalId is required");
      return commitProposalToControlTower(
        toNum(pid),
        ctx.user.id
      );
    }),

  updateProposalDiff: protectedProcedure
    .input(
      z.object({
        proposalId: z.union([z.string(), z.number()]),
        proposedJsonDiff: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.proposalId);

      // Status guard: only DRAFT or PENDING_REVIEW proposals can have their diff updated
      const [existing] = await db
        .select()
        .from(genesisProposals)
        .where(eq(genesisProposals.id, numId))
        .limit(1);

      if (!existing) throw new Error(`Proposal #${input.proposalId} not found`);

      if (existing.status !== "DRAFT" && existing.status !== "PENDING_REVIEW") {
        throw new Error(
          `Proposal #${input.proposalId} is ${existing.status}; ` +
            `proposed diff can only be updated when status is DRAFT or PENDING_REVIEW`
        );
      }

      const [updated] = await db
        .update(genesisProposals)
        .set({
          proposedJsonDiff: input.proposedJsonDiff,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(genesisProposals.id, numId))
        .returning();

      return updated;
    }),

  // ══════════════════════════════════════════════════
  // Chat
  // ══════════════════════════════════════════════════

  getChatMessages: protectedProcedure
    .input(
      z.object({
        proposalId: z.union([z.string(), z.number()]),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.proposalId);

      // Verify proposal exists
      const [proposal] = await db
        .select({ id: genesisProposals.id })
        .from(genesisProposals)
        .where(eq(genesisProposals.id, numId))
        .limit(1);

      if (!proposal)
        throw new Error(`Proposal #${input.proposalId} not found`);

      const messages = await db
        .select()
        .from(proposalChatLogs)
        .where(eq(proposalChatLogs.proposalId, numId))
        .orderBy(asc(proposalChatLogs.createdAt));

      return { messages, total: messages.length };
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        proposalId: z.union([z.string(), z.number()]),
        content: z.string().min(1).max(10000),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return addChatMessage(
        toNum(input.proposalId),
        "USER",
        input.content,
        input.metadata
      );
    }),

  generateAIResponse: protectedProcedure
    .input(
      z.object({
        proposalId: z.union([z.string(), z.number()]),
        userMessage: z.string().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.proposalId);

      // Load proposal context for generating a relevant AI response
      const [proposal] = await db
        .select()
        .from(genesisProposals)
        .where(eq(genesisProposals.id, numId))
        .limit(1);

      if (!proposal)
        throw new Error(`Proposal #${input.proposalId} not found`);

      // Load recent chat history for context
      const recentMessages = await db
        .select()
        .from(proposalChatLogs)
        .where(eq(proposalChatLogs.proposalId, numId))
        .orderBy(desc(proposalChatLogs.createdAt))
        .limit(10);

      // If the user sent a message along with the request, record it first
      if (input.userMessage) {
        await addChatMessage(numId, "USER", input.userMessage);
      }

      // Generate a simulated AI response based on proposal context
      // In production, this would call an LLM API (e.g., Claude, GPT)
      const proposalType = proposal.proposalType ?? "UNKNOWN";
      const proposalStatus = proposal.status ?? "UNKNOWN";
      const diff = (proposal.proposedJsonDiff ?? {}) as Record<string, unknown>;
      const topics = (diff.topics as string[] | undefined) ?? [];
      const messageCount = recentMessages.length;

      let aiContent: string;

      if (input.userMessage?.toLowerCase().includes("risk")) {
        const impact = (proposal.impactAnalysis ?? {}) as Record<string, unknown>;
        const riskLevel = (impact.riskLevel as string) ?? "UNKNOWN";
        const affectedTables = (impact.affectedTables as string[]) ?? [];
        aiContent =
          `Risk Assessment for Proposal #${numId}:\n\n` +
          `- Risk Level: ${riskLevel}\n` +
          `- Affected Tables: ${affectedTables.join(", ") || "None identified"}\n` +
          `- Proposal Type: ${proposalType}\n` +
          `- Current Status: ${proposalStatus}\n\n` +
          `Based on the analysis, I recommend ${
            riskLevel === "HIGH"
              ? "a thorough review by senior engineers before approval"
              : riskLevel === "MEDIUM"
                ? "standard review with department lead sign-off"
                : "proceeding with standard approval workflow"
          }.`;
      } else if (input.userMessage?.toLowerCase().includes("summary")) {
        aiContent =
          `Proposal Summary #${numId}:\n\n` +
          `- Type: ${proposalType}\n` +
          `- Status: ${proposalStatus}\n` +
          `- Target Entity: ${proposal.targetEntity ?? "N/A"}\n` +
          `- Topics: ${topics.length > 0 ? topics.join(", ") : "Not specified"}\n` +
          `- Confidence: ${proposal.confidence ?? "N/A"}\n` +
          `- Chat Messages: ${messageCount}\n\n` +
          `This proposal was generated from an analyzed document and ` +
          `${proposalStatus === "DRAFT" ? "is awaiting review submission" : `is currently ${proposalStatus}`}.`;
      } else if (input.userMessage?.toLowerCase().includes("approve")) {
        aiContent =
          proposalStatus === "PENDING_REVIEW"
            ? `Proposal #${numId} is ready for approval. Before approving, please verify:\n\n` +
              `1. The proposed changes align with organizational policies\n` +
              `2. Impact analysis has been reviewed (${((proposal.impactAnalysis as Record<string, unknown>)?.riskLevel as string) ?? "N/A"} risk)\n` +
              `3. All stakeholders have been notified\n\n` +
              `You can approve this proposal using the status update action.`
            : `Proposal #${numId} is currently ${proposalStatus} and ` +
              `${proposalStatus === "DRAFT" ? "must be submitted for review first" : "cannot be approved in its current state"}.`;
      } else {
        aiContent =
          `I've reviewed the context of Proposal #${numId} (${proposalType}).\n\n` +
          `Current status: ${proposalStatus}\n` +
          `${topics.length > 0 ? `Related topics: ${topics.join(", ")}\n` : ""}` +
          `${messageCount > 0 ? `There are ${messageCount} messages in the discussion thread.\n` : ""}` +
          `\nHow can I help you with this proposal? You can ask me about:\n` +
          `- Risk assessment and impact analysis\n` +
          `- Proposal summary and details\n` +
          `- Approval recommendations\n` +
          `- Suggested modifications to the proposed changes`;
      }

      // Store the AI response
      const aiMessage = await addChatMessage(numId, "AI", aiContent, {
        generatedAt: new Date().toISOString(),
        contextMessageCount: messageCount,
        proposalType,
        proposalStatus,
        isSimulated: true,
      });

      return aiMessage;
    }),

  // ══════════════════════════════════════════════════
  // Stats
  // ══════════════════════════════════════════════════

  getGenesisStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    // Document counts by status
    const docStatusRows = await db
      .select({
        status: knowledgeDocuments.status,
        count: count(),
      })
      .from(knowledgeDocuments)
      .groupBy(knowledgeDocuments.status);

    const documentsByStatus: Record<string, number> = {};
    for (const row of docStatusRows) {
      documentsByStatus[row.status] = Number(row.count);
    }

    // Proposal counts by status
    const proposalStatusRows = await db
      .select({
        status: genesisProposals.status,
        count: count(),
      })
      .from(genesisProposals)
      .groupBy(genesisProposals.status);

    const proposalsByStatus: Record<string, number> = {};
    for (const row of proposalStatusRows) {
      proposalsByStatus[row.status] = Number(row.count);
    }

    // Totals
    const totalDocuments = Object.values(documentsByStatus).reduce(
      (sum, v) => sum + v,
      0
    );
    const totalProposals = Object.values(proposalsByStatus).reduce(
      (sum, v) => sum + v,
      0
    );
    const committedCount = proposalsByStatus["COMMITTED"] ?? 0;

    return {
      // Flat shape expected by frontend
      documentCount: totalDocuments,
      proposalCount: totalProposals,
      committedCount,
      // Detailed breakdowns
      documents: {
        total: totalDocuments,
        byStatus: documentsByStatus,
      },
      proposals: {
        total: totalProposals,
        byStatus: proposalsByStatus,
      },
    };
  }),

  // ══════════════════════════════════════════════════
  // Data Flywheel — Proposal History
  // ══════════════════════════════════════════════════

  /**
   * simulateGeneration — Fixed generation pipeline.
   * Simulates a 2-second LLM call, persists to ai_proposal_history (DB if available,
   * in-memory fallback otherwise), and returns the generated content + history ID.
   */
  simulateGeneration: protectedProcedure
    .input(
      z.object({
        documentId: z.union([z.string(), z.number()]),
        documentName: z.string().optional(),
        userContext: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const docId = toNum(input.documentId);
      const docName = input.documentName ?? `Document #${docId}`;

      // Build the prompt that would be sent to the LLM
      const prompt =
        `Based on the ingested document "${docName}", generate a professional ` +
        `GRT Non-Standard Cleaning Line Proposal. Focus on VDA 19 / ISO 16232 ` +
        `cleanliness standards, ultrasonic cleaning parameters, conveyor design, ` +
        `and FAT/SAT acceptance criteria.` +
        (input.userContext ? `\n\nAdditional context: ${input.userContext}` : "");

      // Simulate LLM generation delay (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock LLM output — rich Markdown proposal
      const generatedContent =
`# GRT Non-Standard Cleaning Line Proposal
## Based on ${docName}

### 1. Executive Summary
This proposal outlines the design and commissioning plan for a **GRT Non-Standard Industrial Cleaning Line** compliant with **VDA 19.1** and **ISO 16232:2018** cleanliness standards. The system is optimized for automotive new-energy component cleaning with multi-stage ultrasonic, spray, and drying processes.

### 2. Cleaning Process Design
| Stage | Method | Parameters | Duration |
|-------|--------|------------|----------|
| Pre-wash | High-pressure spray | 80 bar, 60°C | 45s |
| Ultrasonic Stage 1 | 25 kHz cavitation | 40°C, DI water | 120s |
| Ultrasonic Stage 2 | 40 kHz fine clean | 45°C, surfactant | 90s |
| Rinse | Cascade DI rinse | 3-stage, 25°C | 60s |
| Drying | Hot air + vacuum | 85°C, -0.8 bar | 180s |

### 3. Cleanliness Targets (per VDA 19)
- **Particle Size Limit**: Class A — no particles > 600 μm
- **Gravimetric Residue**: ≤ 1.0 mg per component
- **Extraction Method**: Pressure rinsing per ISO 16232 Annex B

### 4. Conveyor & Material Handling
- Stainless steel 304 mesh belt conveyor, speed: 0.5-2.0 m/min
- Automatic basket loading/unloading with barcode traceability
- PLC-controlled recipe selection (Siemens S7-1500)

### 5. FAT/SAT Acceptance Criteria
- [ ] All sub-systems individually tested (FAT)
- [ ] Cleanliness verification with 5 sample parts
- [ ] PLC program validated against URS
- [ ] Safety interlocks verified (E-stop, door switches, level sensors)
- [ ] OEE baseline established (target > 85%)

### 6. Timeline & Investment
- Engineering design: 4 weeks
- Manufacturing: 8 weeks
- FAT at GRT facility: 1 week
- Shipping & SAT at customer site: 2 weeks
- **Estimated investment**: ¥1,850,000 - ¥2,200,000

---
*Generated by GRT AI Genesis Engine — Gemini/Claude dual-engine pipeline*
*Reference standards: VDA 19.1, ISO 16232:2018, IATF 16949*`;

      // Persist to ai_proposal_history
      let historyId: number;
      const now = new Date().toISOString();

      try {
        const db = await getDb();
        if (db) {
          const [row] = await db
            .insert(aiProposalHistory)
            .values({
              sourceDocumentId: docId > 0 ? docId : null,
              promptUsed: prompt,
              generatedContent,
              status: "DRAFT",
            })
            .returning();
          historyId = row.id;
        } else {
          throw new Error("no db");
        }
      } catch {
        // In-memory fallback
        const memId = proposalHistoryMemStore.nextId++;
        proposalHistoryMemStore.items.unshift({
          id: memId,
          sourceDocumentId: docId,
          sourceDocumentName: docName,
          promptUsed: prompt,
          generatedContent,
          status: "DRAFT" as const,
          feedbackScore: null,
          createdAt: now,
          updatedAt: now,
        });
        historyId = memId;
      }

      return { historyId, generatedContent, documentName: docName };
    }),

  /** List proposal history (DB with in-memory fallback) */
  listProposalHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (db) {
          const rows = await db
            .select()
            .from(aiProposalHistory)
            .orderBy(desc(aiProposalHistory.createdAt))
            .limit(input?.limit ?? 50);
          // Merge with in-memory items (in case some were created without DB)
          return [...proposalHistoryMemStore.items, ...rows];
        }
      } catch { /* fall through */ }
      return proposalHistoryMemStore.items;
    }),

  /** Update a proposal history entry (status, feedbackScore, content edits) */
  updateProposalHistory: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["DRAFT", "EDITED", "FINALIZED"]).optional(),
        feedbackScore: z.number().min(1).max(5).optional(),
        generatedContent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      // Try DB first
      try {
        const db = await getDb();
        if (db) {
          const updates: Record<string, unknown> = { updatedAt: now };
          if (input.status) updates.status = input.status;
          if (input.feedbackScore != null) updates.feedbackScore = input.feedbackScore;
          if (input.generatedContent) updates.generatedContent = input.generatedContent;
          const [row] = await db
            .update(aiProposalHistory)
            .set(updates)
            .where(eq(aiProposalHistory.id, input.id))
            .returning();
          if (row) return row;
        }
      } catch { /* fall through */ }

      // In-memory fallback
      const item = proposalHistoryMemStore.items.find((i) => i.id === input.id);
      if (!item) throw new Error(`History #${input.id} not found`);
      if (input.status) item.status = input.status;
      if (input.feedbackScore != null) item.feedbackScore = input.feedbackScore;
      if (input.generatedContent) item.generatedContent = input.generatedContent;
      item.updatedAt = now;
      return item;
    }),

  /** Feed a finalized proposal back to the knowledge base (反馈至知识炼金炉) */
  feedbackToKnowledgeBase: protectedProcedure
    .input(z.object({ historyId: z.number() }))
    .mutation(async ({ input }) => {
      // Mark as FINALIZED
      const now = new Date().toISOString();
      try {
        const db = await getDb();
        if (db) {
          const [row] = await db
            .update(aiProposalHistory)
            .set({ status: "FINALIZED", updatedAt: now })
            .where(eq(aiProposalHistory.id, input.historyId))
            .returning();
          if (row) return { success: true, message: "Proposal fed back to Knowledge Base for AI learning" };
        }
      } catch { /* fall through */ }

      const item = proposalHistoryMemStore.items.find((i) => i.id === input.historyId);
      if (!item) throw new Error(`History #${input.historyId} not found`);
      item.status = "FINALIZED";
      item.updatedAt = now;
      return { success: true, message: "Proposal fed back to Knowledge Base for AI learning" };
    }),
});

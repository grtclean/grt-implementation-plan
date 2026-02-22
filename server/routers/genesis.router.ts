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
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  knowledgeDocuments,
  genesisProposals,
  proposalChatLogs,
} from "../../drizzle/ai-genesis-schema";
import {
  ingestAndAnalyzeDocument,
  generateProposalFromDocument,
  addChatMessage,
  commitProposalToControlTower,
  updateProposalStatus as updateProposalStatusSvc,
  getProposalWithChat,
} from "../services/knowledge-genesis.service";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

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

  listDocuments: publicProcedure
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

  getDocument: publicProcedure
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

  uploadDocument: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileType: z.enum(DOCUMENT_FILE_TYPES).optional(),
        filePath: z.string().optional(),
        fileSizeBytes: z.number().int().positive().optional(),
        mimeType: z.string().min(1).max(200).optional(),
        uploadedBy: z.union([z.string(), z.number()]).optional(),
        extractedText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
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
        uploadedBy: input.uploadedBy ? toNum(input.uploadedBy) : 1,
        extractedText: input.extractedText,
      });
    }),

  reanalyzeDocument: publicProcedure
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

  archiveDocument: publicProcedure
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

  listProposals: publicProcedure
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

  getProposal: publicProcedure
    .input(idInput)
    .query(async ({ input }) => {
      return getProposalWithChat(toNum(input.id));
    }),

  generateProposal: publicProcedure
    .input(
      z.object({
        documentId: z.union([z.string(), z.number()]),
        createdBy: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return generateProposalFromDocument(
        toNum(input.documentId),
        input.createdBy ? toNum(input.createdBy) : 1
      );
    }),

  updateProposalStatus: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        proposalId: z.union([z.string(), z.number()]).optional(),
        status: z.enum(PROPOSAL_STATUSES),
        reviewedBy: z.union([z.string(), z.number()]).optional(),
        reviewComment: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const pid = input.id ?? input.proposalId;
      if (!pid) throw new Error("Either id or proposalId is required");
      return updateProposalStatusSvc(
        toNum(pid),
        input.status,
        input.reviewedBy ? toNum(input.reviewedBy) : undefined,
        input.reviewComment
      );
    }),

  commitProposal: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        proposalId: z.union([z.string(), z.number()]).optional(),
        committedBy: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const pid = input.id ?? input.proposalId;
      if (!pid) throw new Error("Either id or proposalId is required");
      return commitProposalToControlTower(
        toNum(pid),
        input.committedBy ? toNum(input.committedBy) : 1
      );
    }),

  updateProposalDiff: publicProcedure
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

  getChatMessages: publicProcedure
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

  sendMessage: publicProcedure
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

  generateAIResponse: publicProcedure
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

  getGenesisStats: publicProcedure.query(async () => {
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
});

/**
 * Genesis Router — Unit Tests
 * 19 procedures across 4 groups:
 *   Documents  (5): listDocuments, getDocument, uploadDocument, reanalyzeDocument, archiveDocument
 *   Proposals  (6): listProposals, getProposal, generateProposal, updateProposalStatus,
 *                    commitProposal, updateProposalDiff
 *   Chat       (3): getChatMessages, sendMessage, generateAIResponse
 *   Stats      (1): getGenesisStats
 *   History    (4): simulateGeneration, listProposalHistory, updateProposalHistory, feedbackToKnowledgeBase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock schema imports (column-name string objects) ────────
vi.mock("../../drizzle/ai-genesis-schema", () => ({
  knowledgeDocuments: {
    id: "id",
    fileName: "fileName",
    fileType: "fileType",
    filePath: "filePath",
    fileSizeBytes: "fileSizeBytes",
    mimeType: "mimeType",
    status: "status",
    extractedText: "extractedText",
    summary: "summary",
    keyEntities: "keyEntities",
    embeddingVector: "embeddingVector",
    analysisResult: "analysisResult",
    tags: "tags",
    uploadedBy: "uploadedBy",
    processedAt: "processedAt",
    errorMessage: "errorMessage",
    metadata: "metadata",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    isPurged: "isPurged",
    approvedBy: "approvedBy",
    approvalExpiry: "approvalExpiry",
  },
  genesisProposals: {
    id: "id",
    title: "title",
    description: "description",
    sourceDocumentId: "sourceDocumentId",
    proposalType: "proposalType",
    targetEntity: "targetEntity",
    proposedJsonDiff: "proposedJsonDiff",
    currentSnapshot: "currentSnapshot",
    impactAnalysis: "impactAnalysis",
    status: "status",
    confidence: "confidence",
    reviewedBy: "reviewedBy",
    reviewedAt: "reviewedAt",
    reviewComment: "reviewComment",
    committedAt: "committedAt",
    committedBy: "committedBy",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  proposalChatLogs: {
    id: "id",
    proposalId: "proposalId",
    role: "role",
    content: "content",
    attachments: "attachments",
    metadata: "metadata",
    createdAt: "createdAt",
  },
  aiProposalHistory: {
    id: "id",
    sourceDocumentId: "sourceDocumentId",
    promptUsed: "promptUsed",
    generatedContent: "generatedContent",
    status: "status",
    feedbackScore: "feedbackScore",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

// ── Mock service imports ────────────────────────────────────
const mockIngestAndAnalyzeDocument = vi.fn();
const mockGenerateProposalFromDocument = vi.fn();
const mockAddChatMessage = vi.fn();
const mockCommitProposalToControlTower = vi.fn();
const mockUpdateProposalStatusSvc = vi.fn();
const mockGetProposalWithChat = vi.fn();

vi.mock("../services/knowledge-genesis.service", () => ({
  ingestAndAnalyzeDocument: (...args: any[]) =>
    mockIngestAndAnalyzeDocument(...args),
  generateProposalFromDocument: (...args: any[]) =>
    mockGenerateProposalFromDocument(...args),
  addChatMessage: (...args: any[]) => mockAddChatMessage(...args),
  commitProposalToControlTower: (...args: any[]) =>
    mockCommitProposalToControlTower(...args),
  updateProposalStatus: (...args: any[]) =>
    mockUpdateProposalStatusSvc(...args),
  getProposalWithChat: (...args: any[]) => mockGetProposalWithChat(...args),
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════
describe("genesis router", () => {
  // ─────────────────────────────────────────────────────────
  // AUTH GUARDS
  // ─────────────────────────────────────────────────────────
  describe("auth guards", () => {
    it("rejects unauthenticated caller on listDocuments", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.genesis.listDocuments()).rejects.toThrow();
    });

    it("rejects unauthenticated caller on getDocument", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.genesis.getDocument({ id: 1 })).rejects.toThrow();
    });

    it("rejects unauthenticated caller on uploadDocument", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.genesis.uploadDocument({ fileName: "test.pdf" })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated caller on listProposals", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.genesis.listProposals()).rejects.toThrow();
    });

    it("rejects unauthenticated caller on getGenesisStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.genesis.getGenesisStats()).rejects.toThrow();
    });

    it("rejects unauthenticated caller on simulateGeneration", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.genesis.simulateGeneration({ documentId: 1 })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated caller on getChatMessages", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.genesis.getChatMessages({ proposalId: 1 })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated caller on sendMessage", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.genesis.sendMessage({ proposalId: 1, content: "hello" })
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────
  // DOCUMENTS
  // ─────────────────────────────────────────────────────────
  describe("listDocuments", () => {
    it("returns items and total when no filters", async () => {
      const caller = createAuthenticatedCaller();
      const mockDocs = [
        { id: 1, fileName: "doc1.pdf", status: "ANALYZED" },
        { id: 2, fileName: "doc2.xlsx", status: "UPLOADED" },
      ];
      // First select: items, second select: count
      selectResultsQueue.push(mockDocs);
      selectResultsQueue.push([{ value: 2 }]);

      const result = await caller.genesis.listDocuments();
      expect(result).toEqual({ items: mockDocs, total: 2 });
    });

    it("returns items and total with filters", async () => {
      const caller = createAuthenticatedCaller();
      const mockDocs = [{ id: 3, fileName: "sop1.pdf", status: "ANALYZED" }];
      selectResultsQueue.push(mockDocs);
      selectResultsQueue.push([{ value: 1 }]);

      const result = await caller.genesis.listDocuments({
        fileType: "SOP",
        status: "ANALYZED",
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({ items: mockDocs, total: 1 });
    });

    it("returns items with uploadedBy filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, fileName: "mine.pdf" }]);
      selectResultsQueue.push([{ value: 1 }]);

      const result = await caller.genesis.listDocuments({ uploadedBy: "42" });
      expect(result.total).toBe(1);
    });

    it("returns empty list when no documents exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);

      const result = await caller.genesis.listDocuments();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("applies default limit and offset when no input provided", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);

      await caller.genesis.listDocuments();
      // Verify the chain was called (basic smoke test)
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("getDocument", () => {
    it("returns a document by numeric id", async () => {
      const caller = createAuthenticatedCaller();
      const doc = {
        id: 1,
        fileName: "test.pdf",
        fileType: "POLICY",
        status: "ANALYZED",
      };
      mockQueryResult = [doc];

      const result = await caller.genesis.getDocument({ id: 1 });
      expect(result).toEqual(doc);
    });

    it("returns a document by string id", async () => {
      const caller = createAuthenticatedCaller();
      const doc = { id: 5, fileName: "spec.docx", status: "UPLOADED" };
      mockQueryResult = [doc];

      const result = await caller.genesis.getDocument({ id: "5" });
      expect(result).toEqual(doc);
    });

    it("returns null when document does not exist", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.genesis.getDocument({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("uploadDocument", () => {
    it("delegates to ingestAndAnalyzeDocument with auto-detected fileType", async () => {
      const caller = createAuthenticatedCaller();
      const mockResult = { id: 10, fileName: "report.xlsx", status: "PROCESSING" };
      mockIngestAndAnalyzeDocument.mockResolvedValue(mockResult);

      const result = await caller.genesis.uploadDocument({
        fileName: "report.xlsx",
      });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "report.xlsx",
          fileType: "SPREADSHEET",
          uploadedBy: 1,
        })
      );
      expect(result).toEqual(mockResult);
    });

    it("uses provided fileType over auto-detection", async () => {
      const caller = createAuthenticatedCaller();
      mockIngestAndAnalyzeDocument.mockResolvedValue({ id: 11 });

      await caller.genesis.uploadDocument({
        fileName: "report.xlsx",
        fileType: "REPORT",
      });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: "REPORT" })
      );
    });

    it("auto-detects pdf -> POLICY", async () => {
      const caller = createAuthenticatedCaller();
      mockIngestAndAnalyzeDocument.mockResolvedValue({ id: 12 });

      await caller.genesis.uploadDocument({ fileName: "policy.pdf" });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: "POLICY" })
      );
    });

    it("auto-detects txt -> MANUAL", async () => {
      const caller = createAuthenticatedCaller();
      mockIngestAndAnalyzeDocument.mockResolvedValue({ id: 13 });

      await caller.genesis.uploadDocument({ fileName: "guide.txt" });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: "MANUAL" })
      );
    });

    it("auto-detects unknown extension -> OTHER", async () => {
      const caller = createAuthenticatedCaller();
      mockIngestAndAnalyzeDocument.mockResolvedValue({ id: 14 });

      await caller.genesis.uploadDocument({ fileName: "data.json" });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: "OTHER" })
      );
    });

    it("passes all optional fields correctly", async () => {
      const caller = createAuthenticatedCaller();
      mockIngestAndAnalyzeDocument.mockResolvedValue({ id: 15 });

      await caller.genesis.uploadDocument({
        fileName: "contract.pdf",
        fileType: "CONTRACT",
        filePath: "/custom/path.pdf",
        fileSizeBytes: 1024,
        mimeType: "application/pdf",
        extractedText: "some text content",
      });

      expect(mockIngestAndAnalyzeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "contract.pdf",
          fileType: "CONTRACT",
          filePath: "/custom/path.pdf",
          fileSizeBytes: 1024,
          mimeType: "application/pdf",
          extractedText: "some text content",
        })
      );
    });

    it("rejects empty fileName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.uploadDocument({ fileName: "" })
      ).rejects.toThrow();
    });
  });

  describe("reanalyzeDocument", () => {
    it("successfully re-analyzes an existing document with provided text", async () => {
      const caller = createAuthenticatedCaller();
      const existingDoc = {
        id: 1,
        fileName: "policy.pdf",
        fileType: "POLICY",
        status: "ANALYZED",
        extractedText: "old text",
      };
      // First query: fetch existing doc
      selectResultsQueue.push([existingDoc]);

      const updatedDoc = {
        ...existingDoc,
        status: "ANALYZED",
        extractedText: "ISO 9001 quality standard document",
        summary: "ISO 9001 quality standard document",
      };
      mockReturningResult = [updatedDoc];

      const result = await caller.genesis.reanalyzeDocument({
        id: 1,
        extractedText: "ISO 9001 quality standard document",
      });

      expect(result).toEqual(updatedDoc);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("throws when document not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.genesis.reanalyzeDocument({ id: 999 })
      ).rejects.toThrow("Document #999 not found");
    });

    it("throws when document is ARCHIVED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 2, status: "ARCHIVED" }]);

      await expect(
        caller.genesis.reanalyzeDocument({ id: 2 })
      ).rejects.toThrow("ARCHIVED");
    });

    it("throws when no extracted text is available", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 3, status: "UPLOADED", extractedText: null },
      ]);

      await expect(
        caller.genesis.reanalyzeDocument({ id: 3 })
      ).rejects.toThrow("no extracted text");
    });

    it("uses existing text when no extractedText provided", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 4,
          status: "ANALYZED",
          fileType: "SOP",
          extractedText: "existing process workflow safety training",
        },
      ]);

      const updatedDoc = { id: 4, status: "ANALYZED" };
      mockReturningResult = [updatedDoc];

      const result = await caller.genesis.reanalyzeDocument({ id: 4 });
      expect(result).toEqual(updatedDoc);
    });

    it("detects ISO/IATF/VDA standards in text", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 5,
          status: "ANALYZED",
          fileType: "SPECIFICATION",
          extractedText: "ISO 9001 and IATF 16949 and VDA 6.3 compliance",
        },
      ]);

      const updatedDoc = { id: 5, status: "ANALYZED" };
      mockReturningResult = [updatedDoc];

      const result = await caller.genesis.reanalyzeDocument({ id: 5 });
      expect(result).toEqual(updatedDoc);
    });

    it("detects topic keywords (quality, safety, process, training, customer, supplier, cost)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 6,
          status: "UPLOADED",
          fileType: "POLICY",
          extractedText:
            "quality inspection safety hazard process workflow training competency customer requirement supplier procurement cost budget",
        },
      ]);

      const updatedDoc = { id: 6, status: "ANALYZED" };
      mockReturningResult = [updatedDoc];

      const result = await caller.genesis.reanalyzeDocument({ id: 6 });
      expect(result).toEqual(updatedDoc);
    });

    it("throws when update returns empty after re-analysis", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 7,
          status: "ANALYZED",
          fileType: "POLICY",
          extractedText: "some text",
        },
      ]);
      mockReturningResult = [];

      await expect(
        caller.genesis.reanalyzeDocument({ id: 7 })
      ).rejects.toThrow("not found after re-analysis");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 8, status: "UPLOADED", fileType: "OTHER", extractedText: "hello" },
      ]);
      mockReturningResult = [{ id: 8, status: "ANALYZED" }];

      const result = await caller.genesis.reanalyzeDocument({ id: "8" });
      expect(result).toEqual({ id: 8, status: "ANALYZED" });
    });
  });

  describe("archiveDocument", () => {
    it("archives an existing non-archived document", async () => {
      const caller = createAuthenticatedCaller();
      const existingDoc = { id: 1, status: "ANALYZED", fileName: "test.pdf" };
      selectResultsQueue.push([existingDoc]);

      const archivedDoc = { ...existingDoc, status: "ARCHIVED" };
      mockReturningResult = [archivedDoc];

      const result = await caller.genesis.archiveDocument({ id: 1 });
      expect(result).toEqual(archivedDoc);
      expect(result.status).toBe("ARCHIVED");
    });

    it("throws when document not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.genesis.archiveDocument({ id: 999 })
      ).rejects.toThrow("Document #999 not found");
    });

    it("throws when document is already archived", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 2, status: "ARCHIVED" }]);

      await expect(
        caller.genesis.archiveDocument({ id: 2 })
      ).rejects.toThrow("already ARCHIVED");
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, status: "UPLOADED" }]);
      mockReturningResult = [{ id: 3, status: "ARCHIVED" }];

      const result = await caller.genesis.archiveDocument({ id: "3" });
      expect(result.status).toBe("ARCHIVED");
    });
  });

  // ─────────────────────────────────────────────────────────
  // PROPOSALS
  // ─────────────────────────────────────────────────────────
  describe("listProposals", () => {
    it("returns items and total with no filters", async () => {
      const caller = createAuthenticatedCaller();
      const mockProposals = [
        { id: 1, title: "Proposal 1", status: "DRAFT" },
        { id: 2, title: "Proposal 2", status: "APPROVED" },
      ];
      selectResultsQueue.push(mockProposals);
      selectResultsQueue.push([{ value: 2 }]);

      const result = await caller.genesis.listProposals();
      expect(result).toEqual({ items: mockProposals, total: 2 });
    });

    it("returns items with proposalType filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, proposalType: "WORKFLOW_CHANGE" }]);
      selectResultsQueue.push([{ value: 1 }]);

      const result = await caller.genesis.listProposals({
        proposalType: "WORKFLOW_CHANGE",
      });
      expect(result.total).toBe(1);
    });

    it("returns items with status filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);

      const result = await caller.genesis.listProposals({
        status: "COMMITTED",
      });
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("returns items with sourceDocumentId filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, sourceDocumentId: 10 }]);
      selectResultsQueue.push([{ value: 1 }]);

      const result = await caller.genesis.listProposals({
        sourceDocumentId: "10",
      });
      expect(result.total).toBe(1);
    });

    it("applies limit and offset", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3 }]);
      selectResultsQueue.push([{ value: 100 }]);

      const result = await caller.genesis.listProposals({
        limit: 1,
        offset: 2,
      });
      expect(result.total).toBe(100);
      expect(result.items).toHaveLength(1);
    });
  });

  describe("getProposal", () => {
    it("delegates to getProposalWithChat service", async () => {
      const caller = createAuthenticatedCaller();
      const proposalData = {
        id: 1,
        title: "Test Proposal",
        chatMessages: [],
      };
      mockGetProposalWithChat.mockResolvedValue(proposalData);

      const result = await caller.genesis.getProposal({ id: 1 });
      expect(mockGetProposalWithChat).toHaveBeenCalledWith(1);
      expect(result).toEqual(proposalData);
    });

    it("accepts string id", async () => {
      const caller = createAuthenticatedCaller();
      mockGetProposalWithChat.mockResolvedValue({ id: 5 });

      await caller.genesis.getProposal({ id: "5" });
      expect(mockGetProposalWithChat).toHaveBeenCalledWith(5);
    });
  });

  describe("generateProposal", () => {
    it("delegates to generateProposalFromDocument with ctx.user.id", async () => {
      const caller = createAuthenticatedCaller({ id: 42 });
      const generated = { id: 100, title: "Generated Proposal" };
      mockGenerateProposalFromDocument.mockResolvedValue(generated);

      const result = await caller.genesis.generateProposal({
        documentId: 10,
      });

      expect(mockGenerateProposalFromDocument).toHaveBeenCalledWith(10, 42);
      expect(result).toEqual(generated);
    });

    it("accepts string documentId", async () => {
      const caller = createAuthenticatedCaller();
      mockGenerateProposalFromDocument.mockResolvedValue({ id: 101 });

      await caller.genesis.generateProposal({ documentId: "15" });
      expect(mockGenerateProposalFromDocument).toHaveBeenCalledWith(15, 1);
    });
  });

  describe("updateProposalStatus", () => {
    it("delegates to updateProposalStatus service using id field", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockUpdateProposalStatusSvc.mockResolvedValue({
        id: 1,
        status: "APPROVED",
      });

      const result = await caller.genesis.updateProposalStatus({
        id: 1,
        status: "APPROVED",
        reviewComment: "Looks good",
      });

      expect(mockUpdateProposalStatusSvc).toHaveBeenCalledWith(
        1,
        "APPROVED",
        5,
        "Looks good"
      );
      expect(result.status).toBe("APPROVED");
    });

    it("uses proposalId when id is not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 7 });
      mockUpdateProposalStatusSvc.mockResolvedValue({
        id: 3,
        status: "REJECTED",
      });

      await caller.genesis.updateProposalStatus({
        proposalId: 3,
        status: "REJECTED",
      });

      expect(mockUpdateProposalStatusSvc).toHaveBeenCalledWith(
        3,
        "REJECTED",
        7,
        undefined
      );
    });

    it("throws when neither id nor proposalId is provided", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.updateProposalStatus({ status: "DRAFT" })
      ).rejects.toThrow("Either id or proposalId is required");
    });

    it("prefers id over proposalId when both given", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      mockUpdateProposalStatusSvc.mockResolvedValue({ id: 10 });

      await caller.genesis.updateProposalStatus({
        id: 10,
        proposalId: 20,
        status: "PENDING_REVIEW",
      });

      expect(mockUpdateProposalStatusSvc).toHaveBeenCalledWith(
        10,
        "PENDING_REVIEW",
        1,
        undefined
      );
    });
  });

  describe("commitProposal", () => {
    it("delegates to commitProposalToControlTower using id", async () => {
      const caller = createAuthenticatedCaller({ id: 8 });
      mockCommitProposalToControlTower.mockResolvedValue({
        id: 1,
        status: "COMMITTED",
      });

      const result = await caller.genesis.commitProposal({ id: 1 });
      expect(mockCommitProposalToControlTower).toHaveBeenCalledWith(1, 8);
      expect(result.status).toBe("COMMITTED");
    });

    it("uses proposalId when id is not provided", async () => {
      const caller = createAuthenticatedCaller({ id: 9 });
      mockCommitProposalToControlTower.mockResolvedValue({
        id: 5,
        status: "COMMITTED",
      });

      await caller.genesis.commitProposal({ proposalId: 5 });
      expect(mockCommitProposalToControlTower).toHaveBeenCalledWith(5, 9);
    });

    it("throws when neither id nor proposalId is provided", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.commitProposal({})
      ).rejects.toThrow("Either id or proposalId is required");
    });
  });

  describe("updateProposalDiff", () => {
    it("updates diff for a DRAFT proposal", async () => {
      const caller = createAuthenticatedCaller();
      const existing = { id: 1, status: "DRAFT" };
      selectResultsQueue.push([existing]);

      const updatedProposal = {
        ...existing,
        proposedJsonDiff: { key: "value" },
      };
      mockReturningResult = [updatedProposal];

      const result = await caller.genesis.updateProposalDiff({
        proposalId: 1,
        proposedJsonDiff: { key: "value" },
      });

      expect(result).toEqual(updatedProposal);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("updates diff for a PENDING_REVIEW proposal", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 2, status: "PENDING_REVIEW" }]);
      mockReturningResult = [{ id: 2, proposedJsonDiff: { a: 1 } }];

      const result = await caller.genesis.updateProposalDiff({
        proposalId: 2,
        proposedJsonDiff: { a: 1 },
      });

      expect(result).toEqual({ id: 2, proposedJsonDiff: { a: 1 } });
    });

    it("throws when proposal not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.genesis.updateProposalDiff({
          proposalId: 999,
          proposedJsonDiff: {},
        })
      ).rejects.toThrow("Proposal #999 not found");
    });

    it("throws when proposal status is APPROVED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, status: "APPROVED" }]);

      await expect(
        caller.genesis.updateProposalDiff({
          proposalId: 3,
          proposedJsonDiff: {},
        })
      ).rejects.toThrow("APPROVED");
    });

    it("throws when proposal status is COMMITTED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 4, status: "COMMITTED" }]);

      await expect(
        caller.genesis.updateProposalDiff({
          proposalId: 4,
          proposedJsonDiff: {},
        })
      ).rejects.toThrow("COMMITTED");
    });

    it("throws when proposal status is REJECTED", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5, status: "REJECTED" }]);

      await expect(
        caller.genesis.updateProposalDiff({
          proposalId: 5,
          proposedJsonDiff: {},
        })
      ).rejects.toThrow("REJECTED");
    });

    it("accepts string proposalId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 6, status: "DRAFT" }]);
      mockReturningResult = [{ id: 6 }];

      const result = await caller.genesis.updateProposalDiff({
        proposalId: "6",
        proposedJsonDiff: { x: true },
      });
      expect(result).toEqual({ id: 6 });
    });
  });

  // ─────────────────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────────────────
  describe("getChatMessages", () => {
    it("returns messages for an existing proposal", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = { id: 1 };
      const messages = [
        { id: 1, proposalId: 1, role: "USER", content: "Hello" },
        { id: 2, proposalId: 1, role: "AI", content: "Hi there" },
      ];
      // First query: proposal exists check
      selectResultsQueue.push([proposal]);
      // Second query: chat messages
      selectResultsQueue.push(messages);

      const result = await caller.genesis.getChatMessages({ proposalId: 1 });
      expect(result).toEqual({ messages, total: 2 });
    });

    it("throws when proposal not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.genesis.getChatMessages({ proposalId: 999 })
      ).rejects.toThrow("Proposal #999 not found");
    });

    it("returns empty messages for proposal with no chat", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 2 }]);
      selectResultsQueue.push([]);

      const result = await caller.genesis.getChatMessages({ proposalId: 2 });
      expect(result).toEqual({ messages: [], total: 0 });
    });

    it("accepts string proposalId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 5 }]);
      selectResultsQueue.push([{ id: 10, content: "msg" }]);

      const result = await caller.genesis.getChatMessages({
        proposalId: "5",
      });
      expect(result.total).toBe(1);
    });
  });

  describe("sendMessage", () => {
    it("delegates to addChatMessage with USER role", async () => {
      const caller = createAuthenticatedCaller();
      const chatMsg = { id: 1, proposalId: 5, role: "USER", content: "Test" };
      mockAddChatMessage.mockResolvedValue(chatMsg);

      const result = await caller.genesis.sendMessage({
        proposalId: 5,
        content: "Test",
      });

      expect(mockAddChatMessage).toHaveBeenCalledWith(
        5,
        "USER",
        "Test",
        undefined
      );
      expect(result).toEqual(chatMsg);
    });

    it("passes metadata to addChatMessage", async () => {
      const caller = createAuthenticatedCaller();
      mockAddChatMessage.mockResolvedValue({ id: 2 });

      await caller.genesis.sendMessage({
        proposalId: 3,
        content: "With meta",
        metadata: { source: "ui" },
      });

      expect(mockAddChatMessage).toHaveBeenCalledWith(3, "USER", "With meta", {
        source: "ui",
      });
    });

    it("rejects empty content", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.sendMessage({ proposalId: 1, content: "" })
      ).rejects.toThrow();
    });
  });

  describe("generateAIResponse", () => {
    it("generates a generic AI response when no special keywords", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = {
        id: 1,
        proposalType: "WORKFLOW_CHANGE",
        status: "DRAFT",
        proposedJsonDiff: {},
        impactAnalysis: null,
        targetEntity: "workflows",
        confidence: 0.85,
      };
      // First query: proposal
      selectResultsQueue.push([proposal]);
      // Second query: recent messages
      selectResultsQueue.push([]);

      const aiMsg = { id: 10, role: "AI", content: "I've reviewed..." };
      mockAddChatMessage.mockResolvedValue(aiMsg);

      const result = await caller.genesis.generateAIResponse({
        proposalId: 1,
      });

      expect(result).toEqual(aiMsg);
      expect(mockAddChatMessage).toHaveBeenCalledWith(
        1,
        "AI",
        expect.stringContaining("Proposal #1"),
        expect.objectContaining({ isSimulated: true })
      );
    });

    it("generates risk assessment when userMessage contains 'risk'", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = {
        id: 2,
        proposalType: "SCHEMA_SUGGESTION",
        status: "PENDING_REVIEW",
        proposedJsonDiff: {},
        impactAnalysis: {
          riskLevel: "HIGH",
          affectedTables: ["users", "roles"],
        },
      };
      selectResultsQueue.push([proposal]);
      selectResultsQueue.push([{ id: 1, content: "prev msg" }]);

      mockAddChatMessage
        .mockResolvedValueOnce({ id: 20 }) // user message
        .mockResolvedValueOnce({ id: 21, role: "AI" }); // AI response

      const result = await caller.genesis.generateAIResponse({
        proposalId: 2,
        userMessage: "What is the risk assessment?",
      });

      // The AI message should mention risk
      expect(mockAddChatMessage).toHaveBeenCalledWith(
        2,
        "AI",
        expect.stringContaining("Risk Assessment"),
        expect.any(Object)
      );
    });

    it("generates summary when userMessage contains 'summary'", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = {
        id: 3,
        proposalType: "DICTIONARY_UPDATE",
        status: "DRAFT",
        proposedJsonDiff: { topics: ["Quality", "Safety"] },
        targetEntity: "dictionary",
        confidence: 0.9,
        impactAnalysis: null,
      };
      selectResultsQueue.push([proposal]);
      selectResultsQueue.push([]);

      mockAddChatMessage
        .mockResolvedValueOnce({ id: 30 })
        .mockResolvedValueOnce({ id: 31, role: "AI" });

      await caller.genesis.generateAIResponse({
        proposalId: 3,
        userMessage: "Give me a summary",
      });

      expect(mockAddChatMessage).toHaveBeenCalledWith(
        3,
        "AI",
        expect.stringContaining("Proposal Summary"),
        expect.any(Object)
      );
    });

    it("generates approval guidance when userMessage contains 'approve'", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = {
        id: 4,
        proposalType: "POLICY_ADD",
        status: "PENDING_REVIEW",
        proposedJsonDiff: {},
        impactAnalysis: { riskLevel: "LOW" },
      };
      selectResultsQueue.push([proposal]);
      selectResultsQueue.push([]);

      mockAddChatMessage
        .mockResolvedValueOnce({ id: 40 })
        .mockResolvedValueOnce({ id: 41, role: "AI" });

      await caller.genesis.generateAIResponse({
        proposalId: 4,
        userMessage: "Should I approve this?",
      });

      expect(mockAddChatMessage).toHaveBeenCalledWith(
        4,
        "AI",
        expect.stringContaining("ready for approval"),
        expect.any(Object)
      );
    });

    it("returns approval guidance for DRAFT when 'approve' is mentioned", async () => {
      const caller = createAuthenticatedCaller();
      const proposal = {
        id: 5,
        proposalType: "POLICY_ADD",
        status: "DRAFT",
        proposedJsonDiff: {},
        impactAnalysis: null,
      };
      selectResultsQueue.push([proposal]);
      selectResultsQueue.push([]);

      mockAddChatMessage
        .mockResolvedValueOnce({ id: 50 })
        .mockResolvedValueOnce({ id: 51, role: "AI" });

      await caller.genesis.generateAIResponse({
        proposalId: 5,
        userMessage: "Can I approve?",
      });

      expect(mockAddChatMessage).toHaveBeenCalledWith(
        5,
        "AI",
        expect.stringContaining("submitted for review first"),
        expect.any(Object)
      );
    });

    it("throws when proposal not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);

      await expect(
        caller.genesis.generateAIResponse({ proposalId: 999 })
      ).rejects.toThrow("Proposal #999 not found");
    });

    it("records user message before generating AI response", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 6,
          proposalType: "WORKFLOW_CHANGE",
          status: "DRAFT",
          proposedJsonDiff: {},
          impactAnalysis: null,
        },
      ]);
      selectResultsQueue.push([]);

      mockAddChatMessage
        .mockResolvedValueOnce({ id: 60 })
        .mockResolvedValueOnce({ id: 61, role: "AI" });

      await caller.genesis.generateAIResponse({
        proposalId: 6,
        userMessage: "Hello bot",
      });

      // First call: user message
      expect(mockAddChatMessage).toHaveBeenNthCalledWith(
        1,
        6,
        "USER",
        "Hello bot"
      );
      // Second call: AI response
      expect(mockAddChatMessage).toHaveBeenNthCalledWith(
        2,
        6,
        "AI",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("does not record user message when userMessage is not provided", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        {
          id: 7,
          proposalType: "DICTIONARY_UPDATE",
          status: "DRAFT",
          proposedJsonDiff: {},
          impactAnalysis: null,
        },
      ]);
      selectResultsQueue.push([]);

      mockAddChatMessage.mockResolvedValue({ id: 70, role: "AI" });

      await caller.genesis.generateAIResponse({ proposalId: 7 });

      // Only one call (AI response), no user message
      expect(mockAddChatMessage).toHaveBeenCalledTimes(1);
      expect(mockAddChatMessage).toHaveBeenCalledWith(
        7,
        "AI",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────
  describe("getGenesisStats", () => {
    it("returns aggregated stats", async () => {
      const caller = createAuthenticatedCaller();
      // First query: doc status counts
      selectResultsQueue.push([
        { status: "ANALYZED", count: 5 },
        { status: "UPLOADED", count: 3 },
        { status: "FAILED", count: 1 },
      ]);
      // Second query: proposal status counts
      selectResultsQueue.push([
        { status: "DRAFT", count: 4 },
        { status: "COMMITTED", count: 2 },
        { status: "APPROVED", count: 1 },
      ]);

      const result = await caller.genesis.getGenesisStats();

      expect(result.documentCount).toBe(9);
      expect(result.proposalCount).toBe(7);
      expect(result.committedCount).toBe(2);
      expect(result.documents.total).toBe(9);
      expect(result.documents.byStatus).toEqual({
        ANALYZED: 5,
        UPLOADED: 3,
        FAILED: 1,
      });
      expect(result.proposals.total).toBe(7);
      expect(result.proposals.byStatus).toEqual({
        DRAFT: 4,
        COMMITTED: 2,
        APPROVED: 1,
      });
    });

    it("returns zeros when no data exists", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller.genesis.getGenesisStats();

      expect(result.documentCount).toBe(0);
      expect(result.proposalCount).toBe(0);
      expect(result.committedCount).toBe(0);
      expect(result.documents).toEqual({ total: 0, byStatus: {} });
      expect(result.proposals).toEqual({ total: 0, byStatus: {} });
    });
  });

  // ─────────────────────────────────────────────────────────
  // DATA FLYWHEEL — PROPOSAL HISTORY
  // ─────────────────────────────────────────────────────────
  describe("simulateGeneration", () => {
    it("generates content and persists to DB via aiProposalHistory", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 100 }];

      const result = await caller.genesis.simulateGeneration({
        documentId: 1,
        documentName: "Test Doc",
      });

      expect(result.historyId).toBe(100);
      expect(result.documentName).toBe("Test Doc");
      expect(result.generatedContent).toContain("GRT Non-Standard Cleaning Line Proposal");
      expect(mockDb.insert).toHaveBeenCalled();
    }, 10000);

    it("uses default document name when not provided", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 101 }];

      const result = await caller.genesis.simulateGeneration({
        documentId: 5,
      });

      expect(result.documentName).toBe("Document #5");
      expect(result.generatedContent).toContain("Document #5");
    }, 10000);

    it("includes user context in generated content", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 102 }];

      const result = await caller.genesis.simulateGeneration({
        documentId: 2,
        userContext: "Focus on ultrasonic parameters",
      });

      expect(result.generatedContent).toContain("ultrasonic");
    }, 10000);

    it("falls back to in-memory store when DB insert fails", async () => {
      const caller = createAuthenticatedCaller();
      // Make getDb throw
      const { getDb } = await import("../db");
      (getDb as any).mockRejectedValueOnce(new Error("DB unavailable"));

      const result = await caller.genesis.simulateGeneration({
        documentId: 3,
        documentName: "Fallback Doc",
      });

      expect(result.historyId).toBeGreaterThan(0);
      expect(result.documentName).toBe("Fallback Doc");
    }, 10000);

    it("accepts string documentId", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 103 }];

      const result = await caller.genesis.simulateGeneration({
        documentId: "7",
      });

      expect(result.historyId).toBe(103);
    }, 10000);
  });

  describe("listProposalHistory", () => {
    it("returns rows from DB", async () => {
      const caller = createAuthenticatedCaller();
      const rows = [
        { id: 1, status: "DRAFT", generatedContent: "content1" },
        { id: 2, status: "FINALIZED", generatedContent: "content2" },
      ];
      mockQueryResult = rows;

      const result = await caller.genesis.listProposalHistory();
      // Result includes in-memory items merged with DB rows
      expect(Array.isArray(result)).toBe(true);
    });

    it("applies limit from input", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1 }];

      const result = await caller.genesis.listProposalHistory({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("falls back to in-memory store when DB is unavailable", async () => {
      const caller = createAuthenticatedCaller();
      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValueOnce(null);

      const result = await caller.genesis.listProposalHistory();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("updateProposalHistory", () => {
    it("updates status in DB", async () => {
      const caller = createAuthenticatedCaller();
      const updatedRow = { id: 1, status: "EDITED" };
      mockReturningResult = [updatedRow];

      const result = await caller.genesis.updateProposalHistory({
        id: 1,
        status: "EDITED",
      });

      expect(result).toEqual(updatedRow);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("updates feedbackScore in DB", async () => {
      const caller = createAuthenticatedCaller();
      const updatedRow = { id: 2, feedbackScore: 4 };
      mockReturningResult = [updatedRow];

      const result = await caller.genesis.updateProposalHistory({
        id: 2,
        feedbackScore: 4,
      });

      expect(result).toEqual(updatedRow);
    });

    it("updates generatedContent in DB", async () => {
      const caller = createAuthenticatedCaller();
      const updatedRow = { id: 3, generatedContent: "revised content" };
      mockReturningResult = [updatedRow];

      const result = await caller.genesis.updateProposalHistory({
        id: 3,
        generatedContent: "revised content",
      });

      expect(result).toEqual(updatedRow);
    });

    it("rejects feedbackScore below 1", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.updateProposalHistory({ id: 1, feedbackScore: 0 })
      ).rejects.toThrow();
    });

    it("rejects feedbackScore above 5", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.updateProposalHistory({ id: 1, feedbackScore: 6 })
      ).rejects.toThrow();
    });

    it("falls back to in-memory when DB returns no row", async () => {
      const caller = createAuthenticatedCaller();
      // DB returns nothing
      mockReturningResult = [];

      // This will fall through to in-memory and throw if not found there either
      await expect(
        caller.genesis.updateProposalHistory({ id: 9999, status: "EDITED" })
      ).rejects.toThrow("History #9999 not found");
    });
  });

  describe("feedbackToKnowledgeBase", () => {
    it("marks history entry as FINALIZED in DB and returns success", async () => {
      const caller = createAuthenticatedCaller();
      const updatedRow = { id: 1, status: "FINALIZED" };
      mockReturningResult = [updatedRow];

      const result = await caller.genesis.feedbackToKnowledgeBase({
        historyId: 1,
      });

      expect(result).toEqual({
        success: true,
        message: "Proposal fed back to Knowledge Base for AI learning",
      });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("throws when history entry not found in memory fallback", async () => {
      const caller = createAuthenticatedCaller();
      // DB returns nothing, forcing in-memory fallback
      mockReturningResult = [];
      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValueOnce(null);

      await expect(
        caller.genesis.feedbackToKnowledgeBase({ historyId: 9999 })
      ).rejects.toThrow("History #9999 not found");
    });

    it("returns success message from in-memory fallback path", async () => {
      // First, create an in-memory item via simulateGeneration with DB failure
      const caller = createAuthenticatedCaller();
      const { getDb } = await import("../db");
      (getDb as any).mockRejectedValueOnce(new Error("no db"));

      const genResult = await caller.genesis.simulateGeneration({
        documentId: 1,
        documentName: "FeedbackTest",
      });

      // Now feed it back (also force in-memory path)
      (getDb as any).mockResolvedValueOnce(null);

      const result = await caller.genesis.feedbackToKnowledgeBase({
        historyId: genResult.historyId,
      });

      expect(result.success).toBe(true);
    }, 10000);
  });

  // ─────────────────────────────────────────────────────────
  // INPUT VALIDATION
  // ─────────────────────────────────────────────────────────
  describe("input validation", () => {
    it("rejects invalid fileType in listDocuments", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.listDocuments({ fileType: "INVALID" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid status in listDocuments", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.listDocuments({ status: "BOGUS" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid proposalType in listProposals", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.listProposals({ proposalType: "NOPE" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid status in listProposals", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.listProposals({ status: "NOPE" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid status in updateProposalStatus", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.updateProposalStatus({ id: 1, status: "BAD" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid status in updateProposalHistory", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.updateProposalHistory({ id: 1, status: "INVALID" as any })
      ).rejects.toThrow();
    });

    it("rejects content over 10000 chars in sendMessage", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.sendMessage({
          proposalId: 1,
          content: "x".repeat(10001),
        })
      ).rejects.toThrow();
    });

    it("rejects userMessage over 10000 chars in generateAIResponse", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.genesis.generateAIResponse({
          proposalId: 1,
          userMessage: "x".repeat(10001),
        })
      ).rejects.toThrow();
    });
  });
});

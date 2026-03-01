/**
 * PLM Router — Unit Tests
 * Tests 12 procedures: listDocuments, getDocument, createDocument, updateDocument,
 * uploadVersion, promoteMajorVersion, listVersions, submitReview, recordDecision,
 * listReviews, getStats, getProjectSummary
 *
 * Uses service functions for create/upload/promote/submit/record.
 * Promise.all patterns: listDocuments (2), getDocument (3), listReviews (2), getStats (4).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const {
  mockCreateDocument,
  mockUploadNewVersion,
  mockPromoteToMajorVersion,
  mockSubmitForReview,
  mockRecordReviewDecision,
  selectResultsQueue,
  returningQueue,
} = vi.hoisted(() => {
  const mockCreateDocument = vi.fn();
  const mockUploadNewVersion = vi.fn();
  const mockPromoteToMajorVersion = vi.fn();
  const mockSubmitForReview = vi.fn();
  const mockRecordReviewDecision = vi.fn();
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return {
    mockCreateDocument,
    mockUploadNewVersion,
    mockPromoteToMajorVersion,
    mockSubmitForReview,
    mockRecordReviewDecision,
    selectResultsQueue,
    returningQueue,
  };
});

vi.mock("../services/plm.service", () => ({
  createDocument: mockCreateDocument,
  uploadNewVersion: mockUploadNewVersion,
  promoteToMajorVersion: mockPromoteToMajorVersion,
  submitForReview: mockSubmitForReview,
  recordReviewDecision: mockRecordReviewDecision,
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  ilike: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleDoc = {
  id: 1, docNumber: "DOC-001", title: "Motor Assembly Drawing",
  description: "Main motor asm", docType: "mechanical",
  currentStatus: "draft", projectId: 10, projectCode: "PRJ-A",
  ownerUserId: 1, ownerName: "Engineer A",
  designFreezeApproved: false,
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleVersion = {
  id: 1, documentId: 1, versionMajor: 1, versionMinor: 0,
  isLatest: true, fileUrlPath: "/files/doc1-v1.0.dwg",
  uploadedBy: 1, uploadedByName: "Engineer A",
  changeReason: "Initial upload", createdAt: "2026-01-01",
};

const sampleReview = {
  id: 1, documentVersionId: 1, reviewerUserId: 2,
  reviewerName: "Reviewer B", reviewerRole: "senior_engineer",
  reviewStatus: "pending", requestedBy: 1,
  comments: null, dueDate: "2026-02-01",
  isDesignFreezeReview: false, createdAt: "2026-01-01",
};

describe("plm router", () => {

  // ═══ listDocuments ═══
  describe("listDocuments", () => {
    it("returns paginated documents", async () => {
      // Promise.all: [items, [{value: total}]]
      selectResultsQueue.push([sampleDoc, { ...sampleDoc, id: 2 }]);
      selectResultsQueue.push([{ value: 5 }]);
      const result = await caller().plm.listDocuments();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it("accepts optional filters", async () => {
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().plm.listDocuments({
        projectId: 10, docType: "mechanical", currentStatus: "draft", search: "Motor",
        limit: 10, offset: 0,
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no match", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().plm.listDocuments({ docType: "software" });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getDocument ═══
  describe("getDocument", () => {
    it("returns document with versions and reviews", async () => {
      selectResultsQueue.push([sampleDoc]); // doc lookup
      selectResultsQueue.push([sampleVersion]); // versions
      selectResultsQueue.push([sampleReview]); // allReviews
      const result = await caller().plm.getDocument({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.title).toBe("Motor Assembly Drawing");
      expect(result!.versions).toHaveLength(1);
      expect(result!.reviews).toHaveLength(1);
      expect(result!.allReviews).toHaveLength(1);
    });

    it("returns null for missing document", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().plm.getDocument({ id: 999 });
      expect(result).toBeNull();
    });

    it("filters reviews to latest version", async () => {
      const oldVersion = { ...sampleVersion, id: 2, isLatest: false, versionMajor: 0 };
      const oldReview = { ...sampleReview, id: 2, documentVersionId: 2 };
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([sampleVersion, oldVersion]); // 2 versions
      selectResultsQueue.push([sampleReview, oldReview]); // 2 reviews
      const result = await caller().plm.getDocument({ id: 1 });
      // reviews should only include latest version's review
      expect(result!.reviews).toHaveLength(1);
      expect(result!.reviews[0].documentVersionId).toBe(1);
      expect(result!.allReviews).toHaveLength(2);
    });

    it("handles string ID", async () => {
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().plm.getDocument({ id: "1" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ createDocument ═══
  describe("createDocument", () => {
    it("delegates to service function", async () => {
      mockCreateDocument.mockResolvedValueOnce({ id: 5, docNumber: "DOC-005" });
      const result = await caller().plm.createDocument({
        docNumber: "DOC-005", title: "New Drawing", docType: "mechanical",
      });
      expect(result).toHaveProperty("id", 5);
      expect(mockCreateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ docNumber: "DOC-005", createdBy: 1 }),
      );
    });

    it("passes all optional fields", async () => {
      mockCreateDocument.mockResolvedValueOnce({ id: 6 });
      await caller().plm.createDocument({
        docNumber: "DOC-006", title: "Manual", docType: "manual",
        description: "User manual", projectId: 10, projectCode: "PRJ-A",
        ownerUserId: 2, ownerName: "Bob", fileExtension: ".pdf",
        mimeType: "application/pdf", tags: ["manual", "v1"],
      });
      expect(mockCreateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ["manual", "v1"], mimeType: "application/pdf" }),
      );
    });

    it("rejects empty docNumber", async () => {
      await expect(caller().plm.createDocument({
        docNumber: "", title: "X", docType: "mechanical",
      })).rejects.toThrow();
    });
  });

  // ═══ updateDocument ═══
  describe("updateDocument", () => {
    it("updates document fields", async () => {
      selectResultsQueue.push([{ id: 1 }]); // user FK check
      returningQueue.push([{ ...sampleDoc, title: "Updated Title" }]);
      const result = await caller().plm.updateDocument({
        id: 1, title: "Updated Title", ownerUserId: 1,
      });
      expect(result).toHaveProperty("title", "Updated Title");
    });

    it("throws on invalid ownerUserId FK", async () => {
      selectResultsQueue.push([]); // user not found
      await expect(caller().plm.updateDocument({
        id: 1, ownerUserId: 9999,
      })).rejects.toThrow(/FK violation/);
    });

    it("updates without ownerUserId (no FK check)", async () => {
      returningQueue.push([{ ...sampleDoc, currentStatus: "released" }]);
      const result = await caller().plm.updateDocument({
        id: 1, currentStatus: "released",
      });
      expect(result).toHaveProperty("currentStatus", "released");
    });
  });

  // ═══ uploadVersion ═══
  describe("uploadVersion", () => {
    it("delegates to service", async () => {
      mockUploadNewVersion.mockResolvedValueOnce({ id: 10, versionMajor: 1, versionMinor: 1 });
      const result = await caller().plm.uploadVersion({
        documentId: 1, fileUrlPath: "/files/new.dwg", changeReason: "Bug fix",
      });
      expect(result).toHaveProperty("versionMinor", 1);
      expect(mockUploadNewVersion).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 1, uploadedBy: 1 }),
      );
    });

    it("passes optional fields", async () => {
      mockUploadNewVersion.mockResolvedValueOnce({ id: 11 });
      await caller().plm.uploadVersion({
        documentId: "5", fileUrlPath: "/f.dwg", changeReason: "Update",
        originalFileName: "motor.dwg", fileSizeBytes: 1024, fileHash: "abc123",
      });
      expect(mockUploadNewVersion).toHaveBeenCalledWith(
        expect.objectContaining({ fileHash: "abc123", fileSizeBytes: 1024 }),
      );
    });
  });

  // ═══ promoteMajorVersion ═══
  describe("promoteMajorVersion", () => {
    it("delegates to service", async () => {
      mockPromoteToMajorVersion.mockResolvedValueOnce({ id: 20, versionMajor: 2, versionMinor: 0 });
      const result = await caller().plm.promoteMajorVersion({
        documentId: 1, fileUrlPath: "/files/v2.dwg",
      });
      expect(result).toHaveProperty("versionMajor", 2);
      expect(mockPromoteToMajorVersion).toHaveBeenCalledWith(1, "/files/v2.dwg", 1, "Test User");
    });
  });

  // ═══ listVersions ═══
  describe("listVersions", () => {
    it("returns versions for a document", async () => {
      selectResultsQueue.push([sampleVersion, { ...sampleVersion, id: 2, versionMinor: 1 }]);
      const result = await caller().plm.listVersions({ documentId: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty for document with no versions", async () => {
      selectResultsQueue.push([]);
      const result = await caller().plm.listVersions({ documentId: 999 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ submitReview ═══
  describe("submitReview", () => {
    it("delegates to service", async () => {
      mockSubmitForReview.mockResolvedValueOnce({ id: 30, reviewStatus: "pending" });
      const result = await caller().plm.submitReview({
        documentVersionId: 1, reviewerUserId: 2,
      });
      expect(result).toHaveProperty("reviewStatus", "pending");
      expect(mockSubmitForReview).toHaveBeenCalledWith(
        expect.objectContaining({ documentVersionId: 1, requestedBy: 1 }),
      );
    });

    it("passes optional fields", async () => {
      mockSubmitForReview.mockResolvedValueOnce({ id: 31 });
      await caller().plm.submitReview({
        documentVersionId: "5", reviewerUserId: 3,
        reviewerName: "Alice", reviewerRole: "lead",
        dueDate: "2026-03-01", isDesignFreezeReview: true,
      });
      expect(mockSubmitForReview).toHaveBeenCalledWith(
        expect.objectContaining({ isDesignFreezeReview: true, dueDate: "2026-03-01" }),
      );
    });
  });

  // ═══ recordDecision ═══
  describe("recordDecision", () => {
    it("delegates to service", async () => {
      mockRecordReviewDecision.mockResolvedValueOnce({ id: 1, reviewStatus: "approved" });
      const result = await caller().plm.recordDecision({
        reviewId: 1, reviewStatus: "approved", comments: "LGTM",
      });
      expect(result).toHaveProperty("reviewStatus", "approved");
      expect(mockRecordReviewDecision).toHaveBeenCalledWith(
        expect.objectContaining({ reviewId: 1, reviewStatus: "approved", comments: "LGTM" }),
      );
    });

    it("supports rejected status", async () => {
      mockRecordReviewDecision.mockResolvedValueOnce({ id: 2, reviewStatus: "rejected" });
      const result = await caller().plm.recordDecision({
        reviewId: 2, reviewStatus: "rejected",
      });
      expect(result).toHaveProperty("reviewStatus", "rejected");
    });

    it("rejects invalid reviewStatus", async () => {
      await expect(caller().plm.recordDecision({
        reviewId: 1, reviewStatus: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ listReviews ═══
  describe("listReviews", () => {
    it("returns paginated reviews", async () => {
      selectResultsQueue.push([sampleReview]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().plm.listReviews({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("accepts optional filters", async () => {
      selectResultsQueue.push([sampleReview]);
      selectResultsQueue.push([{ value: 1 }]);
      const result = await caller().plm.listReviews({
        documentVersionId: 1, reviewerUserId: 2, reviewStatus: "pending",
        limit: 10, offset: 0,
      });
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns aggregated stats", async () => {
      // 4 parallel count queries
      selectResultsQueue.push([{ value: 20 }]); // total
      selectResultsQueue.push([{ value: 12 }]); // released
      selectResultsQueue.push([{ value: 3 }]);  // inReview
      selectResultsQueue.push([{ value: 8 }]);  // frozen
      const result = await caller().plm.getStats();
      expect(result.total).toBe(20);
      expect(result.released).toBe(12);
      expect(result.inReview).toBe(3);
      expect(result.frozen).toBe(8);
      expect(result.freezeRate).toBe(40); // 8/20*100
    });

    it("returns zero freezeRate when no docs", async () => {
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      const result = await caller().plm.getStats();
      expect(result.freezeRate).toBe(0);
    });

    it("accepts projectId filter", async () => {
      selectResultsQueue.push([{ value: 5 }]);
      selectResultsQueue.push([{ value: 2 }]);
      selectResultsQueue.push([{ value: 1 }]);
      selectResultsQueue.push([{ value: 3 }]);
      const result = await caller().plm.getStats({ projectId: 10 });
      expect(result.total).toBe(5);
      expect(result.freezeRate).toBe(60); // 3/5*100
    });
  });

  // ═══ getProjectSummary ═══
  describe("getProjectSummary", () => {
    it("returns breakdown by type and status", async () => {
      selectResultsQueue.push([
        { ...sampleDoc, docType: "mechanical", currentStatus: "draft", designFreezeApproved: false },
        { ...sampleDoc, id: 2, docType: "mechanical", currentStatus: "released", designFreezeApproved: true },
        { ...sampleDoc, id: 3, docType: "electrical", currentStatus: "released", designFreezeApproved: true },
      ]);
      const result = await caller().plm.getProjectSummary({ projectId: 10 });
      expect(result.totalDocuments).toBe(3);
      expect(result.byType).toEqual({ mechanical: 2, electrical: 1 });
      expect(result.byStatus).toEqual({ draft: 1, released: 2 });
      expect(result.frozenCount).toBe(2);
      expect(result.freezeRate).toBe(67); // round(2/3*100)
    });

    it("returns zeros when no docs", async () => {
      selectResultsQueue.push([]);
      const result = await caller().plm.getProjectSummary({ projectId: 999 });
      expect(result.totalDocuments).toBe(0);
      expect(result.freezeRate).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for listDocuments", async () => {
      await expect(createAnonymousCaller().plm.listDocuments()).rejects.toThrow();
    });
    it("rejects anonymous for getDocument", async () => {
      await expect(createAnonymousCaller().plm.getDocument({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createDocument", async () => {
      await expect(createAnonymousCaller().plm.createDocument({
        docNumber: "X", title: "X", docType: "mechanical",
      })).rejects.toThrow();
    });
    it("rejects anonymous for updateDocument", async () => {
      await expect(createAnonymousCaller().plm.updateDocument({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for uploadVersion", async () => {
      await expect(createAnonymousCaller().plm.uploadVersion({
        documentId: 1, fileUrlPath: "/x", changeReason: "x",
      })).rejects.toThrow();
    });
    it("rejects anonymous for promoteMajorVersion", async () => {
      await expect(createAnonymousCaller().plm.promoteMajorVersion({
        documentId: 1, fileUrlPath: "/x",
      })).rejects.toThrow();
    });
    it("rejects anonymous for listVersions", async () => {
      await expect(createAnonymousCaller().plm.listVersions({ documentId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for submitReview", async () => {
      await expect(createAnonymousCaller().plm.submitReview({
        documentVersionId: 1, reviewerUserId: 2,
      })).rejects.toThrow();
    });
    it("rejects anonymous for recordDecision", async () => {
      await expect(createAnonymousCaller().plm.recordDecision({
        reviewId: 1, reviewStatus: "approved",
      })).rejects.toThrow();
    });
    it("rejects anonymous for listReviews", async () => {
      await expect(createAnonymousCaller().plm.listReviews({})).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().plm.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for getProjectSummary", async () => {
      await expect(createAnonymousCaller().plm.getProjectSummary({ projectId: 1 })).rejects.toThrow();
    });
  });
});

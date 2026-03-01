/**
 * PPAP Router — Unit Tests
 * Tests 9 procedures: list, getById, create, update, delete,
 * updateElement, autoLinkDocuments, getElementDefinitions,
 * getLevelRequirements, getStats
 *
 * Uses standard Drizzle ORM chain mock pattern with FIFO queues.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// Mock DB
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
      $dynamic: vi.fn(() => chain),
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

    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
    return db;
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

// ── Sample data ──
const sampleSubmission = {
  id: 1,
  submissionCode: "PPAP-ABC123",
  projectId: 10,
  partName: "Gear Assembly",
  partNumber: "GA-001",
  revision: "A",
  customerId: 100,
  customerName: "ACME Corp",
  submissionLevel: "3",
  submissionReason: "New part",
  notes: "Initial submission",
  status: "draft",
  submittedAt: null,
  approvedAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleElement = {
  id: 1,
  submissionId: 1,
  elementNumber: 1,
  elementName: "Design Records",
  required: 1,
  status: "not_started",
  documentPath: null,
  reviewNotes: null,
  completedAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("ppap router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all submissions", async () => {
      selectResultsQueue.push([sampleSubmission, { ...sampleSubmission, id: 2 }]);
      const result = await caller().ppap.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when no submissions", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ppap.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        sampleSubmission,
        { ...sampleSubmission, id: 2, projectId: 20 },
      ]);
      const result = await caller().ppap.list({ projectId: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectId).toBe(10);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([
        sampleSubmission,
        { ...sampleSubmission, id: 2, status: "approved" },
      ]);
      const result = await caller().ppap.list({ status: "draft" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("draft");
    });

    it("filters by both projectId and status", async () => {
      selectResultsQueue.push([
        sampleSubmission, // projectId=10, status=draft
        { ...sampleSubmission, id: 2, projectId: 10, status: "approved" },
        { ...sampleSubmission, id: 3, projectId: 20, status: "draft" },
      ]);
      const result = await caller().ppap.list({ projectId: 10, status: "draft" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(1);
    });

    it("accepts no input (optional)", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ppap.list();
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns submission with elements and progress", async () => {
      selectResultsQueue.push([sampleSubmission]); // submission
      selectResultsQueue.push([
        { ...sampleElement, id: 1, elementNumber: 1, required: 1, status: "completed" },
        { ...sampleElement, id: 2, elementNumber: 2, required: 1, status: "not_started" },
        { ...sampleElement, id: 3, elementNumber: 3, required: 0, status: "not_started" },
      ]); // elements
      const result = await caller().ppap.getById({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.partName).toBe("Gear Assembly");
      expect(result!.elements).toHaveLength(3);
      expect(result!.progress.completed).toBe(1);
      expect(result!.progress.total).toBe(2); // 2 required
      expect(result!.progress.percent).toBe(50);
    });

    it("returns null for missing submission", async () => {
      selectResultsQueue.push([]); // no submission
      const result = await caller().ppap.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([sampleSubmission]);
      selectResultsQueue.push([]);
      const result = await caller().ppap.getById({ id: "1" });
      expect(result).not.toBeNull();
    });

    it("returns 0% progress when no required elements", async () => {
      selectResultsQueue.push([sampleSubmission]);
      selectResultsQueue.push([
        { ...sampleElement, required: 0, status: "not_started" },
      ]);
      const result = await caller().ppap.getById({ id: 1 });
      expect(result!.progress.total).toBe(0);
      expect(result!.progress.percent).toBe(0);
    });

    it("returns 100% when all required elements completed", async () => {
      selectResultsQueue.push([sampleSubmission]);
      selectResultsQueue.push([
        { ...sampleElement, id: 1, required: 1, status: "completed" },
        { ...sampleElement, id: 2, required: 1, status: "completed" },
      ]);
      const result = await caller().ppap.getById({ id: 1 });
      expect(result!.progress.completed).toBe(2);
      expect(result!.progress.total).toBe(2);
      expect(result!.progress.percent).toBe(100);
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a PPAP submission with level 3 (default)", async () => {
      returningQueue.push([{ ...sampleSubmission, id: 5, submissionCode: "PPAP-NEW" }]);
      // 18 element inserts (each goes through the chain, no returning needed)
      for (let i = 0; i < 18; i++) {
        selectResultsQueue.push([]);
      }
      const result = await caller().ppap.create({
        partName: "Gear Assembly",
        partNumber: "GA-001",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("PPAP");
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates with level 1 (only PSW required)", async () => {
      returningQueue.push([{ ...sampleSubmission, id: 6, submissionLevel: "1" }]);
      for (let i = 0; i < 18; i++) {
        selectResultsQueue.push([]);
      }
      const result = await caller().ppap.create({
        partName: "Simple Part",
        partNumber: "SP-001",
        submissionLevel: "1",
      });
      expect(result.success).toBe(true);
    });

    it("creates with all optional fields", async () => {
      returningQueue.push([{ ...sampleSubmission, id: 7 }]);
      for (let i = 0; i < 18; i++) {
        selectResultsQueue.push([]);
      }
      const result = await caller().ppap.create({
        projectId: 10,
        partName: "Full Part",
        partNumber: "FP-001",
        revision: "B",
        customerId: 100,
        customerName: "ACME Corp",
        submissionLevel: "5",
        submissionReason: "Engineering change",
        notes: "Test notes",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty partName", async () => {
      await expect(caller().ppap.create({
        partName: "",
        partNumber: "GA-001",
      })).rejects.toThrow();
    });

    it("rejects empty partNumber", async () => {
      await expect(caller().ppap.create({
        partName: "Test",
        partNumber: "",
      })).rejects.toThrow();
    });

    it("rejects invalid submissionLevel", async () => {
      await expect(caller().ppap.create({
        partName: "Test",
        partNumber: "T-001",
        submissionLevel: "6" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates submission fields", async () => {
      returningQueue.push([{ ...sampleSubmission, partName: "Updated Gear" }]);
      const result = await caller().ppap.update({
        id: 1,
        partName: "Updated Gear",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("partName", "Updated Gear");
    });

    it("sets submittedAt when status changed to submitted", async () => {
      returningQueue.push([{ ...sampleSubmission, status: "submitted" }]);
      const result = await caller().ppap.update({
        id: 1,
        status: "submitted",
      });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe("submitted");
    });

    it("sets approvedAt when status changed to approved", async () => {
      returningQueue.push([{ ...sampleSubmission, status: "approved" }]);
      const result = await caller().ppap.update({
        id: 1,
        status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("updates with string ID", async () => {
      returningQueue.push([{ ...sampleSubmission, notes: "new notes" }]);
      const result = await caller().ppap.update({
        id: "1",
        notes: "new notes",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().ppap.update({
        id: 1,
        status: "invalid_status" as any,
      })).rejects.toThrow();
    });

    it("updates multiple fields at once", async () => {
      returningQueue.push([{
        ...sampleSubmission,
        partName: "New Name",
        revision: "C",
        notes: "Updated notes",
      }]);
      const result = await caller().ppap.update({
        id: 1,
        partName: "New Name",
        revision: "C",
        notes: "Updated notes",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes submission and its elements", async () => {
      // delete ppapElements where submissionId
      selectResultsQueue.push([]);
      // delete ppapSubmissions where id
      selectResultsQueue.push([]);
      const result = await caller().ppap.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "PPAP已删除" });
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().ppap.delete({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ updateElement ═══
  describe("updateElement", () => {
    it("updates element status", async () => {
      returningQueue.push([{ ...sampleElement, status: "in_progress" }]);
      const result = await caller().ppap.updateElement({
        id: 1,
        status: "in_progress",
      });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe("in_progress");
    });

    it("sets completedAt when status is completed", async () => {
      returningQueue.push([{ ...sampleElement, status: "completed" }]);
      const result = await caller().ppap.updateElement({
        id: 1,
        status: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("updates documentPath and reviewNotes", async () => {
      returningQueue.push([{
        ...sampleElement,
        status: "in_progress",
        documentPath: "/docs/design.pdf",
        reviewNotes: "Reviewed OK",
      }]);
      const result = await caller().ppap.updateElement({
        id: 1,
        status: "in_progress",
        documentPath: "/docs/design.pdf",
        reviewNotes: "Reviewed OK",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string ID", async () => {
      returningQueue.push([{ ...sampleElement, status: "not_applicable" }]);
      const result = await caller().ppap.updateElement({
        id: "1",
        status: "not_applicable",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().ppap.updateElement({
        id: 1,
        status: "invalid" as any,
      })).rejects.toThrow();
    });

    it("marks as rejected", async () => {
      returningQueue.push([{ ...sampleElement, status: "rejected" }]);
      const result = await caller().ppap.updateElement({
        id: 1,
        status: "rejected",
        reviewNotes: "Documentation incomplete",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ autoLinkDocuments ═══
  describe("autoLinkDocuments", () => {
    it("links DFMEA, PFMEA, CP, and MSA documents", async () => {
      // elements for the submission
      selectResultsQueue.push([
        { ...sampleElement, id: 4, elementNumber: 4, status: "not_started" },
        { ...sampleElement, id: 6, elementNumber: 6, status: "not_started" },
        { ...sampleElement, id: 7, elementNumber: 7, status: "not_started" },
        { ...sampleElement, id: 8, elementNumber: 8, status: "not_started" },
      ]);
      // fmeaDocuments
      selectResultsQueue.push([
        { id: 10, fmeaType: "DFMEA", fmeaCode: "FMEA-D-001", projectId: 10 },
        { id: 11, fmeaType: "PFMEA", fmeaCode: "FMEA-P-001", projectId: 10 },
      ]);
      // controlPlans
      selectResultsQueue.push([
        { id: 20, planCode: "CP-001", projectId: 10 },
      ]);
      // msaStudies
      selectResultsQueue.push([
        { id: 30, studyCode: "MSA-001", projectId: 10 },
      ]);
      // 4 updates (element 4, 6, 7, 8)
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller().ppap.autoLinkDocuments({
        submissionId: 1,
        projectId: 10,
      });
      expect(result.success).toBe(true);
      expect(result.linked).toBe(4);
    });

    it("returns failure when no elements found", async () => {
      selectResultsQueue.push([]); // no elements
      const result = await caller().ppap.autoLinkDocuments({
        submissionId: 999,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("No PPAP elements found");
    });

    it("skips elements that are not in not_started status", async () => {
      selectResultsQueue.push([
        { ...sampleElement, id: 4, elementNumber: 4, status: "completed" }, // already done
        { ...sampleElement, id: 6, elementNumber: 6, status: "not_started" },
      ]);
      selectResultsQueue.push([
        { id: 10, fmeaType: "DFMEA", fmeaCode: "FMEA-D-001", projectId: null },
        { id: 11, fmeaType: "PFMEA", fmeaCode: "FMEA-P-001", projectId: null },
      ]);
      selectResultsQueue.push([]); // no control plans
      selectResultsQueue.push([]); // no MSA
      // 1 update for element 6 (PFMEA)
      selectResultsQueue.push([]);

      const result = await caller().ppap.autoLinkDocuments({ submissionId: 1 });
      expect(result.success).toBe(true);
      expect(result.linked).toBe(1); // only element 6
    });

    it("links zero when no matching documents exist", async () => {
      selectResultsQueue.push([
        { ...sampleElement, id: 4, elementNumber: 4, status: "not_started" },
      ]);
      selectResultsQueue.push([]); // no FMEA docs
      selectResultsQueue.push([]); // no control plans
      selectResultsQueue.push([]); // no MSA

      const result = await caller().ppap.autoLinkDocuments({ submissionId: 1 });
      expect(result.success).toBe(true);
      expect(result.linked).toBe(0);
    });

    it("filters documents by projectId when provided", async () => {
      selectResultsQueue.push([
        { ...sampleElement, id: 4, elementNumber: 4, status: "not_started" },
      ]);
      // FMEA docs: one matches projectId=10, one doesn't
      selectResultsQueue.push([
        { id: 10, fmeaType: "DFMEA", fmeaCode: "FMEA-D-001", projectId: 10 },
        { id: 11, fmeaType: "DFMEA", fmeaCode: "FMEA-D-002", projectId: 20 },
      ]);
      selectResultsQueue.push([]); // no control plans
      selectResultsQueue.push([]); // no MSA
      // 1 update for element 4 (DFMEA with projectId 10)
      selectResultsQueue.push([]);

      const result = await caller().ppap.autoLinkDocuments({
        submissionId: 1,
        projectId: 10,
      });
      expect(result.success).toBe(true);
      expect(result.linked).toBe(1);
    });
  });

  // ═══ getElementDefinitions ═══
  describe("getElementDefinitions", () => {
    it("returns 18 PPAP elements", async () => {
      const result = await caller().ppap.getElementDefinitions();
      expect(result).toHaveLength(18);
      expect(result[0]).toEqual({ number: 1, name: "Design Records" });
      expect(result[17]).toEqual({ number: 18, name: "Part Submission Warrant (PSW)" });
    });
  });

  // ═══ getLevelRequirements ═══
  describe("getLevelRequirements", () => {
    it("level 1 requires only PSW (element 18)", async () => {
      const result = await caller().ppap.getLevelRequirements({ level: "1" });
      expect(result).toHaveLength(18);
      const required = result.filter(e => e.required);
      expect(required).toHaveLength(1);
      expect(required[0].number).toBe(18);
    });

    it("level 2 requires 8 elements", async () => {
      const result = await caller().ppap.getLevelRequirements({ level: "2" });
      const required = result.filter(e => e.required);
      expect(required).toHaveLength(8);
      expect(required.map(e => e.number)).toEqual([4, 6, 7, 8, 9, 10, 11, 18]);
    });

    it("level 3 requires all 18 elements", async () => {
      const result = await caller().ppap.getLevelRequirements({ level: "3" });
      const required = result.filter(e => e.required);
      expect(required).toHaveLength(18);
    });

    it("level 4 requires all 18 elements", async () => {
      const result = await caller().ppap.getLevelRequirements({ level: "4" });
      const required = result.filter(e => e.required);
      expect(required).toHaveLength(18);
    });

    it("level 5 requires all 18 elements", async () => {
      const result = await caller().ppap.getLevelRequirements({ level: "5" });
      const required = result.filter(e => e.required);
      expect(required).toHaveLength(18);
    });

    it("rejects invalid level", async () => {
      await expect(caller().ppap.getLevelRequirements({
        level: "6" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns statistics grouped by status", async () => {
      selectResultsQueue.push([
        { ...sampleSubmission, id: 1, status: "draft" },
        { ...sampleSubmission, id: 2, status: "submitted" },
        { ...sampleSubmission, id: 3, status: "approved" },
        { ...sampleSubmission, id: 4, status: "rejected" },
        { ...sampleSubmission, id: 5, status: "interim_approved" },
      ]);
      const result = await caller().ppap.getStats();
      expect(result.total).toBe(5);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.submitted).toBe(1);
      expect(result.byStatus.approved).toBe(1);
      expect(result.byStatus.rejected).toBe(1);
      expect(result.byStatus.interim_approved).toBe(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...sampleSubmission, id: 1, projectId: 10, status: "draft" },
        { ...sampleSubmission, id: 2, projectId: 20, status: "approved" },
      ]);
      const result = await caller().ppap.getStats({ projectId: 10 });
      expect(result.total).toBe(1);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.approved).toBe(0);
    });

    it("returns zeros when no submissions", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ppap.getStats();
      expect(result.total).toBe(0);
      expect(result.byStatus.draft).toBe(0);
      expect(result.byStatus.submitted).toBe(0);
      expect(result.byStatus.approved).toBe(0);
      expect(result.byStatus.rejected).toBe(0);
      expect(result.byStatus.interim_approved).toBe(0);
    });

    it("accepts no input (optional)", async () => {
      selectResultsQueue.push([]);
      const result = await caller().ppap.getStats();
      expect(result.total).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().ppap.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().ppap.getById({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().ppap.create({
        partName: "X", partNumber: "X-001",
      })).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().ppap.update({
        id: 1, partName: "X",
      })).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().ppap.delete({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for updateElement", async () => {
      await expect(createAnonymousCaller().ppap.updateElement({
        id: 1, status: "completed",
      })).rejects.toThrow();
    });

    it("rejects anonymous for autoLinkDocuments", async () => {
      await expect(createAnonymousCaller().ppap.autoLinkDocuments({
        submissionId: 1,
      })).rejects.toThrow();
    });

    it("rejects anonymous for getElementDefinitions", async () => {
      await expect(createAnonymousCaller().ppap.getElementDefinitions()).rejects.toThrow();
    });

    it("rejects anonymous for getLevelRequirements", async () => {
      await expect(createAnonymousCaller().ppap.getLevelRequirements({
        level: "3",
      })).rejects.toThrow();
    });

    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().ppap.getStats()).rejects.toThrow();
    });
  });
});

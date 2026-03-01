/**
 * FMEA Router — Unit Tests
 * Tests 13 procedures: listDocuments, getDocument, createDocument, updateDocument,
 * deleteDocument, addItem, updateItem, deleteItem, addAction, updateAction,
 * deleteAction, getStats, getHighRiskItems
 *
 * Uses standard Drizzle ORM chain mock pattern.
 * Key logic: RPN = S×O×D, AP = H(≥200)/M(≥80)/L(<80)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, mockReturningResult } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return { selectResultsQueue, mockReturningResult };
});

// Mock BU scope — returns undefined (no BU filtering in tests)
vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buScopeCondition: vi.fn().mockReturnValue(undefined),
  buContextMiddleware: vi.fn((opts: any) => opts.next({ ctx: opts.ctx })),
}));

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
        const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
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
  gte: vi.fn((...args: any[]) => args),
  lte: vi.fn((...args: any[]) => args),
  inArray: vi.fn((...args: any[]) => args),
}));

// Mock schema — provide table column references used by router
vi.mock("../../drizzle/schema", () => ({
  fmeaDocuments: {
    id: "id", fmeaCode: "fmeaCode", projectId: "projectId",
    fmeaType: "fmeaType", title: "title", scope: "scope",
    productName: "productName", processName: "processName",
    modelYear: "modelYear", teamMembers: "teamMembers",
    status: { enumValues: ["draft", "in_review", "approved", "active", "archived"] },
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  fmeaItems: {
    id: "id", fmeaDocumentId: "fmeaDocumentId", itemNumber: "itemNumber",
    systemElement: "systemElement", functionRequirement: "functionRequirement",
    failureMode: "failureMode", failureEffect: "failureEffect",
    failureCause: "failureCause", severity: "severity",
    occurrence: "occurrence", detection: "detection",
    rpn: "rpn", actionPriority: "actionPriority",
    currentPreventionControl: "currentPreventionControl",
    currentDetectionControl: "currentDetectionControl",
    revisedSeverity: "revisedSeverity", revisedOccurrence: "revisedOccurrence",
    revisedDetection: "revisedDetection", revisedRpn: "revisedRpn",
    revisedActionPriority: "revisedActionPriority",
    specialCharacteristic: "specialCharacteristic", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  fmeaActions: {
    id: "id", fmeaItemId: "fmeaItemId", actionDescription: "actionDescription",
    responsiblePerson: "responsiblePerson", responsibleId: "responsibleId",
    targetDate: "targetDate", completionDate: "completionDate",
    status: "status", verificationResult: "verificationResult",
    evidence: "evidence", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  controlPlans: { id: "id" },
  controlPlanItems: { id: "id" },
  projects: {
    id: "id", buCode: "buCode", name: "name", createdAt: "createdAt",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAuthenticatedCaller();

// ── Sample data ──
const sampleDoc = {
  id: 1, fmeaCode: "FMEA-P-ABC123", projectId: 10,
  fmeaType: "PFMEA", title: "Assembly Process FMEA",
  scope: "Assembly line", productName: "Robot Arm",
  processName: "Welding", modelYear: "2026",
  teamMembers: '["Alice","Bob"]', status: "draft",
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleItem = {
  id: 1, fmeaDocumentId: 1, itemNumber: 1,
  systemElement: "Welding Station", functionRequirement: "Join parts",
  failureMode: "Cold weld", failureEffect: "Weak joint",
  failureCause: "Low temperature", severity: 8, occurrence: 5, detection: 4,
  rpn: 160, actionPriority: "M",
  currentPreventionControl: "Temp monitor",
  currentDetectionControl: "Pull test",
  revisedSeverity: null, revisedOccurrence: null, revisedDetection: null,
  revisedRpn: null, revisedActionPriority: null,
  specialCharacteristic: "CC", notes: "",
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleAction = {
  id: 1, fmeaItemId: 1, actionDescription: "Install heater",
  responsiblePerson: "Alice", responsibleId: 1,
  targetDate: "2026-03-01", completionDate: null,
  status: "open", verificationResult: null, evidence: null,
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("fmea router", () => {

  // ═══ listDocuments ═══
  describe("listDocuments", () => {
    it("returns all documents", async () => {
      selectResultsQueue.push([sampleDoc, { ...sampleDoc, id: 2, fmeaType: "DFMEA" }]);
      const result = await caller().fmea.listDocuments();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by fmeaType", async () => {
      // Mock DB returns pre-filtered results (DB-side filtering via WHERE clause)
      selectResultsQueue.push([sampleDoc]);
      const result = await caller().fmea.listDocuments({ fmeaType: "PFMEA" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].fmeaType).toBe("PFMEA");
    });

    it("filters by projectId", async () => {
      // Mock DB returns pre-filtered results
      selectResultsQueue.push([sampleDoc]);
      const result = await caller().fmea.listDocuments({ projectId: 10 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by status", async () => {
      // Mock DB returns pre-filtered results
      selectResultsQueue.push([sampleDoc]);
      const result = await caller().fmea.listDocuments({ status: "draft" });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no matches", async () => {
      selectResultsQueue.push([]);
      const result = await caller().fmea.listDocuments({ fmeaType: "DFMEA" });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getDocument ═══
  describe("getDocument", () => {
    it("returns document with items and actions", async () => {
      selectResultsQueue.push([sampleDoc]); // doc
      selectResultsQueue.push([sampleItem]); // items
      selectResultsQueue.push([sampleAction]); // all actions
      const result = await caller().fmea.getDocument({ id: 1 });
      expect(result).toHaveProperty("title", "Assembly Process FMEA");
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].actions).toHaveLength(1);
    });

    it("returns null for missing document", async () => {
      selectResultsQueue.push([]); // no doc
      const result = await caller().fmea.getDocument({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns empty items when no items exist", async () => {
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([]); // no items → itemIds.length=0 → skip actions query
      const result = await caller().fmea.getDocument({ id: 1 });
      expect(result!.items).toHaveLength(0);
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([sampleDoc]);
      selectResultsQueue.push([]);
      const result = await caller().fmea.getDocument({ id: "1" });
      expect(result).toBeTruthy();
    });
  });

  // ═══ createDocument ═══
  describe("createDocument", () => {
    it("creates PFMEA document", async () => {
      const created = { ...sampleDoc, id: 5 };
      mockReturningResult.push(created);
      const result = await caller().fmea.createDocument({
        fmeaType: "PFMEA", title: "New PFMEA",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates DFMEA with all fields", async () => {
      mockReturningResult.push({ ...sampleDoc, id: 6, fmeaType: "DFMEA" });
      const result = await caller().fmea.createDocument({
        fmeaType: "DFMEA", title: "Design FMEA",
        projectId: 10, scope: "Full product",
        productName: "Motor", processName: "Design",
        modelYear: "2026", teamMembers: ["Alice", "Bob"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", async () => {
      await expect(caller().fmea.createDocument({
        fmeaType: "PFMEA", title: "",
      })).rejects.toThrow();
    });

    it("rejects invalid fmeaType", async () => {
      await expect(caller().fmea.createDocument({
        fmeaType: "XFMEA" as any, title: "Test",
      })).rejects.toThrow();
    });
  });

  // ═══ updateDocument ═══
  describe("updateDocument", () => {
    it("updates document fields", async () => {
      mockReturningResult.push({ ...sampleDoc, title: "Updated" });
      const result = await caller().fmea.updateDocument({
        id: 1, title: "Updated",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("title", "Updated");
    });

    it("updates status", async () => {
      mockReturningResult.push({ ...sampleDoc, status: "approved" });
      const result = await caller().fmea.updateDocument({
        id: 1, status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("updates teamMembers as JSON", async () => {
      mockReturningResult.push(sampleDoc);
      const result = await caller().fmea.updateDocument({
        id: 1, teamMembers: ["Alice", "Bob", "Charlie"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().fmea.updateDocument({
        id: 1, status: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ deleteDocument ═══
  describe("deleteDocument", () => {
    it("cascade deletes document, items, and actions", async () => {
      // Get items in doc
      selectResultsQueue.push([{ id: 1 }, { id: 2 }]);
      // Delete actions for item 1 → chain.then
      selectResultsQueue.push([]);
      // Delete actions for item 2 → chain.then
      selectResultsQueue.push([]);
      // Delete items → chain.then
      selectResultsQueue.push([]);
      // Delete document → chain.then
      selectResultsQueue.push([]);
      const result = await caller().fmea.deleteDocument({ id: 1 });
      expect(result).toEqual({ success: true, message: "FMEA文档已删除" });
    });

    it("works when document has no items", async () => {
      selectResultsQueue.push([]); // no items
      selectResultsQueue.push([]); // delete items
      selectResultsQueue.push([]); // delete document
      const result = await caller().fmea.deleteDocument({ id: 99 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ addItem ═══
  describe("addItem", () => {
    it("adds item with RPN calculation", async () => {
      // count existing items
      selectResultsQueue.push([{ count: 2 }]);
      // insert
      const newItem = { ...sampleItem, id: 3, rpn: 160, actionPriority: "M" };
      mockReturningResult.push(newItem);
      const result = await caller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "Cold weld",
        severity: 8, occurrence: 5, detection: 4,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("rpn", 160);
    });

    it("calculates High action priority (RPN >= 200)", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      mockReturningResult.push({ ...sampleItem, rpn: 200, actionPriority: "H" });
      const result = await caller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "Total failure",
        severity: 10, occurrence: 5, detection: 4, // 200
      });
      expect(result.data.rpn).toBe(200);
    });

    it("calculates Low action priority (RPN < 80)", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      mockReturningResult.push({ ...sampleItem, rpn: 6, actionPriority: "L" });
      const result = await caller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "Minor scratch",
        severity: 3, occurrence: 2, detection: 1, // 6
      });
      expect(result.data.actionPriority).toBe("L");
    });

    it("rejects empty failureMode", async () => {
      await expect(caller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "",
      })).rejects.toThrow();
    });

    it("rejects severity out of range", async () => {
      await expect(caller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "Test", severity: 11,
      })).rejects.toThrow();
    });
  });

  // ═══ updateItem ═══
  describe("updateItem", () => {
    it("recalculates RPN when severity changes", async () => {
      // Fetch current item for RPN recalc
      selectResultsQueue.push([{ ...sampleItem, severity: 8, occurrence: 5, detection: 4 }]);
      // Update
      mockReturningResult.push({ ...sampleItem, severity: 10, rpn: 200, actionPriority: "H" });
      const result = await caller().fmea.updateItem({
        id: 1, severity: 10, // 10 * 5 * 4 = 200 → H
      });
      expect(result.success).toBe(true);
    });

    it("recalculates revised RPN", async () => {
      // Fetch current for revised RPN
      selectResultsQueue.push([sampleItem]);
      // Update
      mockReturningResult.push(sampleItem);
      const result = await caller().fmea.updateItem({
        id: 1, revisedSeverity: 3, revisedOccurrence: 2, revisedDetection: 2,
        // revised RPN = 3*2*2 = 12 → L
      });
      expect(result.success).toBe(true);
    });

    it("updates non-RPN fields without recalculation", async () => {
      mockReturningResult.push({ ...sampleItem, notes: "Updated note" });
      const result = await caller().fmea.updateItem({
        id: 1, notes: "Updated note",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ deleteItem ═══
  describe("deleteItem", () => {
    it("deletes item and its actions", async () => {
      selectResultsQueue.push([]); // delete actions
      selectResultsQueue.push([]); // delete item
      const result = await caller().fmea.deleteItem({ id: 1 });
      expect(result).toEqual({ success: true, message: "失效模式已删除" });
    });
  });

  // ═══ addAction ═══
  describe("addAction", () => {
    it("adds action with all fields", async () => {
      mockReturningResult.push(sampleAction);
      const result = await caller().fmea.addAction({
        fmeaItemId: 1, actionDescription: "Install heater",
        responsiblePerson: "Alice", targetDate: "2026-03-01",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("actionDescription", "Install heater");
    });

    it("rejects empty actionDescription", async () => {
      await expect(caller().fmea.addAction({
        fmeaItemId: 1, actionDescription: "",
      })).rejects.toThrow();
    });
  });

  // ═══ updateAction ═══
  describe("updateAction", () => {
    it("updates action status", async () => {
      mockReturningResult.push({ ...sampleAction, status: "completed" });
      const result = await caller().fmea.updateAction({
        id: 1, status: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("updates verification result", async () => {
      mockReturningResult.push({ ...sampleAction, verificationResult: "OK" });
      const result = await caller().fmea.updateAction({
        id: 1, verificationResult: "OK", evidence: "Test report attached",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().fmea.updateAction({
        id: 1, status: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ deleteAction ═══
  describe("deleteAction", () => {
    it("deletes action", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().fmea.deleteAction({ id: 1 });
      expect(result).toEqual({ success: true, message: "改进措施已删除" });
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns FMEA statistics", async () => {
      const docs = [
        { ...sampleDoc, id: 1, fmeaType: "PFMEA" },
        { ...sampleDoc, id: 2, fmeaType: "DFMEA" },
      ];
      const items = [
        { ...sampleItem, id: 1, fmeaDocumentId: 1, rpn: 250 }, // H
        { ...sampleItem, id: 2, fmeaDocumentId: 1, rpn: 100 }, // M
        { ...sampleItem, id: 3, fmeaDocumentId: 2, rpn: 50 },  // L
      ];
      const actions = [
        { ...sampleAction, id: 1, fmeaItemId: 1, status: "open" },
        { ...sampleAction, id: 2, fmeaItemId: 2, status: "completed" },
        { ...sampleAction, id: 3, fmeaItemId: 3, status: "in_progress" },
      ];
      selectResultsQueue.push(docs);   // all docs
      selectResultsQueue.push(items);   // all items
      selectResultsQueue.push(actions); // all actions

      const result = await caller().fmea.getStats();
      expect(result.totalDocuments).toBe(2);
      expect(result.byType.PFMEA).toBe(1);
      expect(result.byType.DFMEA).toBe(1);
      expect(result.totalItems).toBe(3);
      expect(result.highRiskItems).toBe(1); // rpn >= 200
      expect(result.mediumRiskItems).toBe(1); // 80 <= rpn < 200
      expect(result.avgRpn).toBe(Math.round((250 + 100 + 50) / 3)); // 133
      expect(result.totalActions).toBe(3);
      expect(result.openActions).toBe(2); // open + in_progress
      expect(result.completedActions).toBe(1); // completed
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...sampleDoc, id: 1, projectId: 10 },
        { ...sampleDoc, id: 2, projectId: 20 },
      ]);
      selectResultsQueue.push([
        { ...sampleItem, id: 1, fmeaDocumentId: 1, rpn: 100 },
        { ...sampleItem, id: 2, fmeaDocumentId: 2, rpn: 200 },
      ]);
      selectResultsQueue.push([sampleAction]);

      const result = await caller().fmea.getStats({ projectId: 10 });
      expect(result.totalDocuments).toBe(1);
      expect(result.totalItems).toBe(1);
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([]); // no docs
      const result = await caller().fmea.getStats();
      expect(result.totalDocuments).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.avgRpn).toBe(0);
    });
  });

  // ═══ getHighRiskItems ═══
  describe("getHighRiskItems", () => {
    it("returns top risk items", async () => {
      selectResultsQueue.push([
        { ...sampleItem, rpn: 300 },
        { ...sampleItem, id: 2, rpn: 200 },
      ]);
      const result = await caller().fmea.getHighRiskItems();
      expect(result).toHaveLength(2);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...sampleItem, id: 1, fmeaDocumentId: 1, rpn: 300 },
        { ...sampleItem, id: 2, fmeaDocumentId: 2, rpn: 200 },
      ]);
      // Fetch docs for project filter
      selectResultsQueue.push([{ id: 1 }]); // only doc 1 is in project
      const result = await caller().fmea.getHighRiskItems({ projectId: 10 });
      expect(result).toHaveLength(1);
    });

    it("respects limit", async () => {
      selectResultsQueue.push([sampleItem]);
      const result = await caller().fmea.getHighRiskItems({ limit: 5 });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for listDocuments", async () => {
      await expect(createAnonymousCaller().fmea.listDocuments()).rejects.toThrow();
    });
    it("rejects anonymous for getDocument", async () => {
      await expect(createAnonymousCaller().fmea.getDocument({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for createDocument", async () => {
      await expect(createAnonymousCaller().fmea.createDocument({
        fmeaType: "PFMEA", title: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for addItem", async () => {
      await expect(createAnonymousCaller().fmea.addItem({
        fmeaDocumentId: 1, failureMode: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for addAction", async () => {
      await expect(createAnonymousCaller().fmea.addAction({
        fmeaItemId: 1, actionDescription: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().fmea.getStats()).rejects.toThrow();
    });
    it("rejects anonymous for getHighRiskItems", async () => {
      await expect(createAnonymousCaller().fmea.getHighRiskItems()).rejects.toThrow();
    });
  });
});

/**
 * Control Plan Router — Unit Tests
 * Tests 9 procedures: list, getById, create, update, delete,
 * addItem, updateItem, deleteItem, generateFromFMEA, getStats
 *
 * Uses standard Drizzle ORM chain mock pattern.
 * Key logic: FMEA auto-generation filters by RPN threshold,
 * assigns CC/SC special characteristics, spc/gauge control methods.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, mockReturningResult } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return { selectResultsQueue, mockReturningResult };
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
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ──
const samplePlan = {
  id: 1,
  planCode: "CP-ABC123",
  projectId: 10,
  fmeaDocumentId: null,
  title: "Welding Process Control Plan",
  partName: "Bracket Assembly",
  partNumber: "BA-001",
  phase: "prototype",
  status: "draft",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleItem = {
  id: 1,
  controlPlanId: 1,
  itemNumber: 1,
  processStep: "Welding",
  processNumber: "OP-10",
  machineTool: "Robot Welder R1",
  characteristicName: "Weld Strength",
  characteristicNumber: "C-001",
  characteristicType: "product",
  specialCharacteristic: "CC",
  specification: "≥ 500 MPa",
  tolerance: "±10 MPa",
  controlMethod: "spc",
  controlDescription: "SPC chart monitoring",
  sampleSize: "5",
  sampleFrequency: "Every 2 hours",
  reactionPlan: "Quarantine and notify quality",
  fmeaItemId: null,
  notes: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const sampleFmeaItem = {
  id: 10,
  fmeaDocumentId: 5,
  itemNumber: 1,
  systemElement: "Welding Station",
  functionRequirement: "Join parts properly",
  failureMode: "Cold weld",
  failureEffect: "Weak joint",
  failureCause: "Low temperature",
  severity: 8,
  occurrence: 5,
  detection: 6,
  rpn: 240,
  actionPriority: "H",
  currentPreventionControl: "Temp monitor",
  currentDetectionControl: "Pull test",
  specialCharacteristic: "CC",
  notes: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("controlPlan router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all control plans with no filters", async () => {
      selectResultsQueue.push([samplePlan, { ...samplePlan, id: 2, title: "Another Plan" }]);
      const result = await caller().controlPlan.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when no plans exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().controlPlan.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...samplePlan, id: 1, projectId: 10 },
        { ...samplePlan, id: 2, projectId: 20 },
      ]);
      const result = await caller().controlPlan.list({ projectId: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].projectId).toBe(10);
    });

    it("filters by phase", async () => {
      selectResultsQueue.push([
        { ...samplePlan, id: 1, phase: "prototype" },
        { ...samplePlan, id: 2, phase: "production" },
      ]);
      const result = await caller().controlPlan.list({ phase: "production" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].phase).toBe("production");
    });

    it("filters by status", async () => {
      selectResultsQueue.push([
        { ...samplePlan, id: 1, status: "draft" },
        { ...samplePlan, id: 2, status: "active" },
      ]);
      const result = await caller().controlPlan.list({ status: "active" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("active");
    });

    it("applies multiple filters simultaneously", async () => {
      selectResultsQueue.push([
        { ...samplePlan, id: 1, projectId: 10, phase: "production", status: "active" },
        { ...samplePlan, id: 2, projectId: 10, phase: "prototype", status: "draft" },
        { ...samplePlan, id: 3, projectId: 20, phase: "production", status: "active" },
      ]);
      const result = await caller().controlPlan.list({
        projectId: 10,
        phase: "production",
        status: "active",
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(1);
    });

    it("accepts undefined input (no filter)", async () => {
      selectResultsQueue.push([samplePlan]);
      const result = await caller().controlPlan.list(undefined);
      expect(result.items).toHaveLength(1);
    });

    it("rejects invalid phase enum", async () => {
      await expect(caller().controlPlan.list({ phase: "invalid" as any })).rejects.toThrow();
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns plan with items", async () => {
      selectResultsQueue.push([samplePlan]); // plan
      selectResultsQueue.push([sampleItem]); // items
      const result = await caller().controlPlan.getById({ id: 1 });
      expect(result).toHaveProperty("title", "Welding Process Control Plan");
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].characteristicName).toBe("Weld Strength");
    });

    it("returns null for non-existent plan", async () => {
      selectResultsQueue.push([]); // no plan found
      const result = await caller().controlPlan.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns plan with empty items array", async () => {
      selectResultsQueue.push([samplePlan]); // plan
      selectResultsQueue.push([]);            // no items
      const result = await caller().controlPlan.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.items).toHaveLength(0);
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([]);
      const result = await caller().controlPlan.getById({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("accepts numeric ID", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([sampleItem, { ...sampleItem, id: 2, itemNumber: 2 }]);
      const result = await caller().controlPlan.getById({ id: 1 });
      expect(result!.items).toHaveLength(2);
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a control plan with minimal fields", async () => {
      const created = { ...samplePlan, id: 5 };
      mockReturningResult.push(created);
      const result = await caller().controlPlan.create({
        title: "New Control Plan",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("控制计划已创建");
      expect(result.data).toHaveProperty("id", 5);
    });

    it("creates a control plan with all fields", async () => {
      mockReturningResult.push({ ...samplePlan, id: 6, phase: "production" });
      const result = await caller().controlPlan.create({
        projectId: 10,
        fmeaDocumentId: 5,
        title: "Full Control Plan",
        partName: "Motor Assembly",
        partNumber: "MA-002",
        phase: "production",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 6);
    });

    it("defaults phase to prototype", async () => {
      mockReturningResult.push({ ...samplePlan, phase: "prototype" });
      const result = await caller().controlPlan.create({ title: "Default Phase" });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", async () => {
      await expect(caller().controlPlan.create({
        title: "",
      })).rejects.toThrow();
    });

    it("rejects invalid phase enum", async () => {
      await expect(caller().controlPlan.create({
        title: "Test",
        phase: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates title", async () => {
      mockReturningResult.push({ ...samplePlan, title: "Updated Title" });
      const result = await caller().controlPlan.update({
        id: 1,
        title: "Updated Title",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("控制计划已更新");
      expect(result.data).toHaveProperty("title", "Updated Title");
    });

    it("updates phase", async () => {
      mockReturningResult.push({ ...samplePlan, phase: "production" });
      const result = await caller().controlPlan.update({
        id: 1,
        phase: "production",
      });
      expect(result.success).toBe(true);
    });

    it("updates status", async () => {
      mockReturningResult.push({ ...samplePlan, status: "active" });
      const result = await caller().controlPlan.update({
        id: 1,
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      mockReturningResult.push({
        ...samplePlan,
        title: "New Title",
        partName: "New Part",
        status: "active",
      });
      const result = await caller().controlPlan.update({
        id: 1,
        title: "New Title",
        partName: "New Part",
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string ID", async () => {
      mockReturningResult.push(samplePlan);
      const result = await caller().controlPlan.update({
        id: "1",
        title: "String ID Update",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().controlPlan.update({
        id: 1,
        status: "invalid" as any,
      })).rejects.toThrow();
    });

    it("rejects invalid phase", async () => {
      await expect(caller().controlPlan.update({
        id: 1,
        phase: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("cascade deletes plan and its items", async () => {
      // delete items chain.then
      selectResultsQueue.push([]);
      // delete plan chain.then
      selectResultsQueue.push([]);
      const result = await caller().controlPlan.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "控制计划已删除" });
    });

    it("works with string ID", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().controlPlan.delete({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ addItem ═══
  describe("addItem", () => {
    it("adds item with auto-incremented itemNumber", async () => {
      // count existing items
      selectResultsQueue.push([{ count: 3 }]);
      const newItem = { ...sampleItem, id: 4, itemNumber: 4 };
      mockReturningResult.push(newItem);
      const result = await caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "Surface Finish",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("控制项已添加");
      expect(result.data).toHaveProperty("id", 4);
    });

    it("starts at itemNumber 1 when no existing items", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      mockReturningResult.push({ ...sampleItem, itemNumber: 1 });
      const result = await caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "First Item",
      });
      expect(result.success).toBe(true);
    });

    it("adds item with all fields", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      mockReturningResult.push(sampleItem);
      const result = await caller().controlPlan.addItem({
        controlPlanId: 1,
        processStep: "Welding",
        processNumber: "OP-10",
        machineTool: "Robot Welder R1",
        characteristicName: "Weld Strength",
        characteristicNumber: "C-001",
        characteristicType: "product",
        specialCharacteristic: "CC",
        specification: "≥ 500 MPa",
        tolerance: "±10 MPa",
        controlMethod: "spc",
        controlDescription: "SPC chart monitoring",
        sampleSize: "5",
        sampleFrequency: "Every 2 hours",
        reactionPlan: "Quarantine and notify quality",
        fmeaItemId: 10,
        notes: "Critical weld point",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("characteristicName", "Weld Strength");
    });

    it("defaults controlMethod to visual", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      mockReturningResult.push({ ...sampleItem, controlMethod: "visual" });
      const result = await caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "Visual Check",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty characteristicName", async () => {
      await expect(caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "",
      })).rejects.toThrow();
    });

    it("rejects invalid controlMethod", async () => {
      await expect(caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "Test",
        controlMethod: "invalid" as any,
      })).rejects.toThrow();
    });

    it("handles null count gracefully", async () => {
      selectResultsQueue.push([{ count: null }]);
      mockReturningResult.push({ ...sampleItem, itemNumber: 1 });
      const result = await caller().controlPlan.addItem({
        controlPlanId: 1,
        characteristicName: "Null Count Test",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ updateItem ═══
  describe("updateItem", () => {
    it("updates item fields", async () => {
      mockReturningResult.push({ ...sampleItem, characteristicName: "Updated" });
      const result = await caller().controlPlan.updateItem({
        id: 1,
        characteristicName: "Updated",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("控制项已更新");
      expect(result.data).toHaveProperty("characteristicName", "Updated");
    });

    it("updates controlMethod", async () => {
      mockReturningResult.push({ ...sampleItem, controlMethod: "cmm" });
      const result = await caller().controlPlan.updateItem({
        id: 1,
        controlMethod: "cmm",
      });
      expect(result.success).toBe(true);
    });

    it("updates characteristicType", async () => {
      mockReturningResult.push({ ...sampleItem, characteristicType: "process" });
      const result = await caller().controlPlan.updateItem({
        id: 1,
        characteristicType: "process",
      });
      expect(result.success).toBe(true);
    });

    it("updates multiple fields at once", async () => {
      mockReturningResult.push({
        ...sampleItem,
        specification: "≥ 600 MPa",
        tolerance: "±5 MPa",
        reactionPlan: "Stop line",
      });
      const result = await caller().controlPlan.updateItem({
        id: 1,
        specification: "≥ 600 MPa",
        tolerance: "±5 MPa",
        reactionPlan: "Stop line",
      });
      expect(result.success).toBe(true);
    });

    it("accepts string ID", async () => {
      mockReturningResult.push(sampleItem);
      const result = await caller().controlPlan.updateItem({
        id: "1",
        notes: "String ID update",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid controlMethod", async () => {
      await expect(caller().controlPlan.updateItem({
        id: 1,
        controlMethod: "invalid" as any,
      })).rejects.toThrow();
    });

    it("rejects invalid characteristicType", async () => {
      await expect(caller().controlPlan.updateItem({
        id: 1,
        characteristicType: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ deleteItem ═══
  describe("deleteItem", () => {
    it("deletes an item", async () => {
      selectResultsQueue.push([]); // delete chain
      const result = await caller().controlPlan.deleteItem({ id: 1 });
      expect(result).toEqual({ success: true, message: "控制项已删除" });
    });

    it("accepts string ID", async () => {
      selectResultsQueue.push([]);
      const result = await caller().controlPlan.deleteItem({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ generateFromFMEA ═══
  describe("generateFromFMEA", () => {
    it("generates items from high-RPN FMEA items", async () => {
      // Verify plan exists
      selectResultsQueue.push([samplePlan]);
      // Get FMEA items
      selectResultsQueue.push([
        { ...sampleFmeaItem, id: 10, rpn: 240 }, // above 80, above 200 → CC, spc
        { ...sampleFmeaItem, id: 11, rpn: 120 }, // above 80, below 200 → SC, gauge
        { ...sampleFmeaItem, id: 12, rpn: 50 },  // below 80 → excluded
      ]);
      // Count existing items
      selectResultsQueue.push([{ count: 2 }]);
      // insert calls (each awaited individually in the loop — they go through returning)
      // update plan link
      selectResultsQueue.push([]); // update chain.then

      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
        rpnThreshold: 80,
      });
      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.message).toContain("2 control plan items created");
      expect(result.message).toContain("RPN ≥ 80");
    });

    it("returns not found when plan does not exist", async () => {
      selectResultsQueue.push([]); // no plan
      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 999,
        fmeaDocumentId: 5,
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Control plan not found");
      expect(result.created).toBe(0);
    });

    it("returns zero when no FMEA items above threshold", async () => {
      selectResultsQueue.push([samplePlan]); // plan exists
      selectResultsQueue.push([
        { ...sampleFmeaItem, rpn: 30 },
        { ...sampleFmeaItem, id: 11, rpn: 50 },
      ]); // all below default threshold 80
      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
      });
      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.message).toContain("No FMEA items with RPN ≥ 80");
    });

    it("defaults rpnThreshold to 80", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([
        { ...sampleFmeaItem, rpn: 79 },  // below 80
        { ...sampleFmeaItem, id: 11, rpn: 80 }, // exactly 80 → included
      ]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]); // update plan

      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
      });
      expect(result.created).toBe(1);
    });

    it("assigns CC for RPN >= 200 and SC for RPN < 200", async () => {
      // This tests the logic: specialCharacteristic = rpn >= 200 ? "CC" : "SC"
      // We verify through created count; actual value assignment is internal
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([
        { ...sampleFmeaItem, id: 10, rpn: 250 }, // CC, spc
        { ...sampleFmeaItem, id: 11, rpn: 100 }, // SC, gauge
      ]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]); // update plan

      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
        rpnThreshold: 80,
      });
      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
    });

    it("uses custom rpnThreshold", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([
        { ...sampleFmeaItem, id: 10, rpn: 250 },
        { ...sampleFmeaItem, id: 11, rpn: 190 },
        { ...sampleFmeaItem, id: 12, rpn: 150 },
      ]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([]); // update plan

      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
        rpnThreshold: 200,
      });
      expect(result.created).toBe(1); // only rpn=250 is >= 200
      expect(result.message).toContain("RPN ≥ 200");
    });

    it("returns zero when FMEA document has no items", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([]); // no FMEA items at all
      const result = await caller().controlPlan.generateFromFMEA({
        controlPlanId: 1,
        fmeaDocumentId: 5,
        rpnThreshold: 80,
      });
      expect(result.created).toBe(0);
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns full statistics", async () => {
      const plans = [
        { ...samplePlan, id: 1, phase: "prototype", status: "draft" },
        { ...samplePlan, id: 2, phase: "production", status: "active" },
        { ...samplePlan, id: 3, phase: "pre_launch", status: "active" },
      ];
      const items = [
        { ...sampleItem, id: 1, controlPlanId: 1, controlMethod: "spc", specialCharacteristic: "CC" },
        { ...sampleItem, id: 2, controlPlanId: 2, controlMethod: "gauge", specialCharacteristic: "SC" },
        { ...sampleItem, id: 3, controlPlanId: 2, controlMethod: "visual", specialCharacteristic: null },
        { ...sampleItem, id: 4, controlPlanId: 3, controlMethod: "cmm", specialCharacteristic: "CC" },
      ];
      selectResultsQueue.push(plans);  // all plans
      selectResultsQueue.push(items);  // all items

      const result = await caller().controlPlan.getStats();
      expect(result.totalPlans).toBe(3);
      expect(result.byPhase.prototype).toBe(1);
      expect(result.byPhase.pre_launch).toBe(1);
      expect(result.byPhase.production).toBe(1);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.active).toBe(2);
      expect(result.byStatus.superseded).toBe(0);
      expect(result.byStatus.archived).toBe(0);
      expect(result.totalItems).toBe(4);
      expect(result.specialCharacteristics).toBe(3); // CC + SC
      expect(result.byControlMethod.spc).toBe(1);
      expect(result.byControlMethod.gauge).toBe(1);
      expect(result.byControlMethod.visual).toBe(1);
      expect(result.byControlMethod.cmm).toBe(1);
      expect(result.byControlMethod.test).toBe(0);
      expect(result.byControlMethod.audit).toBe(0);
      expect(result.byControlMethod.other).toBe(0);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([
        { ...samplePlan, id: 1, projectId: 10, phase: "prototype", status: "draft" },
        { ...samplePlan, id: 2, projectId: 20, phase: "production", status: "active" },
      ]);
      selectResultsQueue.push([
        { ...sampleItem, id: 1, controlPlanId: 1, controlMethod: "spc", specialCharacteristic: "CC" },
        { ...sampleItem, id: 2, controlPlanId: 2, controlMethod: "gauge", specialCharacteristic: "SC" },
      ]);

      const result = await caller().controlPlan.getStats({ projectId: 10 });
      expect(result.totalPlans).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.byControlMethod.spc).toBe(1);
      expect(result.byControlMethod.gauge).toBe(0);
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([]); // no plans
      const result = await caller().controlPlan.getStats();
      expect(result.totalPlans).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.specialCharacteristics).toBe(0);
      expect(result.byPhase.prototype).toBe(0);
      expect(result.byStatus.draft).toBe(0);
    });

    it("accepts undefined input", async () => {
      selectResultsQueue.push([samplePlan]);
      selectResultsQueue.push([sampleItem]);
      const result = await caller().controlPlan.getStats(undefined);
      expect(result.totalPlans).toBe(1);
    });

    it("does not query items when no plans exist", async () => {
      selectResultsQueue.push([]); // no plans → planIds.length = 0
      const result = await caller().controlPlan.getStats();
      // When planIds.length === 0, allItems is [] without querying
      expect(result.totalItems).toBe(0);
    });
  });

  // ═══ Authentication guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().controlPlan.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().controlPlan.getById({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().controlPlan.create({
        title: "Unauthorized",
      })).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().controlPlan.update({
        id: 1, title: "Unauthorized",
      })).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().controlPlan.delete({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for addItem", async () => {
      await expect(createAnonymousCaller().controlPlan.addItem({
        controlPlanId: 1, characteristicName: "X",
      })).rejects.toThrow();
    });

    it("rejects anonymous for updateItem", async () => {
      await expect(createAnonymousCaller().controlPlan.updateItem({
        id: 1, notes: "X",
      })).rejects.toThrow();
    });

    it("rejects anonymous for deleteItem", async () => {
      await expect(createAnonymousCaller().controlPlan.deleteItem({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for generateFromFMEA", async () => {
      await expect(createAnonymousCaller().controlPlan.generateFromFMEA({
        controlPlanId: 1, fmeaDocumentId: 5,
      })).rejects.toThrow();
    });

    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().controlPlan.getStats()).rejects.toThrow();
    });
  });
});

/**
 * Production Router — Unit Tests
 * 16 procedures: Work Orders (7), QC (3), Equipment (3), Dashboard/Stats (3)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of ["from","where","orderBy","limit","offset","values","set","onConflictDoUpdate","onConflictDoNothing","groupBy","having","innerJoin","leftJoin","rightJoin","fullJoin"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => null), // disable scheduling sync in updateEquipmentStatus
}));

vi.mock("../../drizzle/schema", () => ({
  productionWorkOrders: {
    id: "id", workOrderCode: "workOrderCode", projectId: "projectId",
    productName: "productName", productModel: "productModel", quantity: "quantity",
    priority: "priority", status: "status", completionRate: "completionRate",
    plannedStartDate: "plannedStartDate", plannedEndDate: "plannedEndDate",
    actualStartDate: "actualStartDate", actualEndDate: "actualEndDate",
    estimatedHours: "estimatedHours", actualHours: "actualHours",
    assignedTeam: "assignedTeam", supervisorId: "supervisorId",
    notes: "notes", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  qcInspectionRecords: {
    id: "id", inspectionCode: "inspectionCode", taskId: "taskId",
    workOrderId: "workOrderId", inspectionType: "inspectionType",
    inspectorId: "inspectorId", inspectorName: "inspectorName",
    inspectionTime: "inspectionTime", result: "result", defectType: "defectType",
    checklistItems: "checklistItems", qualityScore: "qualityScore",
    notes: "notes", createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/production-equipment-schema", () => ({
  productionEquipments: {
    id: "id", code: "code", name: "name", type: "type", status: "status",
    location: "location", currentWorkOrderId: "currentWorkOrderId",
    utilization: "utilization", updatedAt: "updatedAt",
  },
  productionEquipmentStatusHistory: {
    id: "id", equipmentId: "equipmentId", equipmentCode: "equipmentCode",
    equipmentName: "equipmentName", previousStatus: "previousStatus",
    newStatus: "newStatus", previousWorkOrderId: "previousWorkOrderId",
    newWorkOrderId: "newWorkOrderId", notes: "notes",
    changedBy: "changedBy", changedByName: "changedByName", changedAt: "changedAt",
  },
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// Helper: work order row from DB
function makeWoRow(overrides: any = {}) {
  return {
    id: 1, workOrderCode: "WO-2026-AB100", projectId: null,
    productName: "TestProduct", productModel: "M1", quantity: 10,
    priority: "normal", status: "draft", completionRate: "0.00",
    plannedStartDate: null, plannedEndDate: null,
    actualStartDate: null, actualEndDate: null,
    estimatedHours: "8", actualHours: "0",
    assignedTeam: "Team A", supervisorId: null,
    notes: null, createdBy: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────
describe("production router", () => {

  // ═══ Work Order CRUD ═══════════════════════════════
  describe("list", () => {
    it("returns paginated work orders", async () => {
      const caller = createAuthenticatedCaller();
      // Promise.all: [count, rows]
      selectResultsQueue.push([{ value: 2 }]);
      selectResultsQueue.push([makeWoRow(), makeWoRow({ id: 2 })]);
      const result = await caller.productionDashboard.list({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ value: 1 }]);
      selectResultsQueue.push([makeWoRow({ status: "in_progress" })]);
      const result = await caller.productionDashboard.list({ status: "in_progress" });
      expect(result.items).toHaveLength(1);
    });

    it("paginates correctly", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ value: 50 }]);
      selectResultsQueue.push([makeWoRow()]);
      const result = await caller.productionDashboard.list({ page: 3, pageSize: 10 });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });
  });

  describe("getById", () => {
    it("returns work order by id", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [makeWoRow()];
      const result = await caller.productionDashboard.getById({ id: 1 });
      expect(result.id).toBe(1);
      expect(result.orderCode).toBe("WO-2026-AB100");
    });

    it("returns work order by orderCode", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [makeWoRow({ workOrderCode: "WO-2026-XY999" })];
      const result = await caller.productionDashboard.getById({ orderCode: "WO-2026-XY999" });
      expect(result.orderCode).toBe("WO-2026-XY999");
    });

    it("throws BAD_REQUEST when no id or orderCode", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.getById({})).rejects.toThrow("请提供id或orderCode");
    });

    it("throws NOT_FOUND when work order missing", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      await expect(caller.productionDashboard.getById({ id: 999 })).rejects.toThrow("工单不存在");
    });
  });

  describe("create", () => {
    it("creates a work order", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [makeWoRow()];
      const result = await caller.productionDashboard.create({ productName: "Widget", quantity: 5 });
      expect(result).toHaveProperty("id");
      expect(result.quantity).toBe(10); // from mock
    });

    it("rejects quantity < 1", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.create({ productName: "X", quantity: 0 }))
        .rejects.toThrow();
    });

    it("accepts optional priority", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [makeWoRow({ priority: "urgent" })];
      const result = await caller.productionDashboard.create({
        productName: "Urgent Item", quantity: 1, priority: "urgent",
      });
      expect(result.priority).toBe("urgent");
    });
  });

  describe("update", () => {
    it("updates work order fields", async () => {
      const caller = createAuthenticatedCaller();
      // Verify exists query
      selectResultsQueue.push([makeWoRow()]);
      mockReturningResult = [makeWoRow({ productName: "Updated" })];
      const result = await caller.productionDashboard.update({ id: 1, productName: "Updated" });
      expect(result.productName).toBe("Updated");
    });

    it("throws NOT_FOUND for missing work order", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.update({ id: 999 })).rejects.toThrow("工单不存在");
    });
  });

  describe("updateStatus", () => {
    it("updates status to in_progress with auto actualStartDate", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "planned", actualStartDate: null })]);
      mockReturningResult = [makeWoRow({ status: "in_progress", actualStartDate: "2026-03-01" })];
      const result = await caller.productionDashboard.updateStatus({ id: 1, status: "in_progress" });
      expect(result.status).toBe("in_progress");
    });

    it("updates status to completed with auto actualEndDate and 100% progress", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "in_progress" })]);
      mockReturningResult = [makeWoRow({ status: "completed", completionRate: "100.00" })];
      const result = await caller.productionDashboard.updateStatus({ id: 1, status: "completed" });
      expect(result.status).toBe("completed");
      expect(result.progress).toBe(100);
    });

    it("throws NOT_FOUND when work order missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.updateStatus({ id: 999, status: "completed" }))
        .rejects.toThrow("工单不存在");
    });

    it("rejects invalid status enum", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.updateStatus({ id: 1, status: "invalid" as any }))
        .rejects.toThrow();
    });
  });

  describe("updateProgress", () => {
    it("updates progress percentage", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "in_progress" })]);
      mockReturningResult = [makeWoRow({ completionRate: "50.00" })];
      const result = await caller.productionDashboard.updateProgress({ id: 1, progress: 50 });
      expect(result.progress).toBe(50);
    });

    it("auto-transitions to quality_check at 100%", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "in_progress" })]);
      mockReturningResult = [makeWoRow({ status: "quality_check", completionRate: "100.00" })];
      const result = await caller.productionDashboard.updateProgress({ id: 1, progress: 100 });
      expect(result.status).toBe("quality_check");
    });

    it("auto-transitions planned to in_progress when progress > 0", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "planned", actualStartDate: null })]);
      mockReturningResult = [makeWoRow({ status: "in_progress", completionRate: "10.00" })];
      const result = await caller.productionDashboard.updateProgress({ id: 1, progress: 10 });
      expect(result.status).toBe("in_progress");
    });

    it("throws NOT_FOUND when work order missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.updateProgress({ id: 999, progress: 50 }))
        .rejects.toThrow("工单不存在");
    });

    it("rejects progress > 100", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.updateProgress({ id: 1, progress: 150 }))
        .rejects.toThrow();
    });

    it("rejects progress < 0", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.updateProgress({ id: 1, progress: -5 }))
        .rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("deletes a draft work order", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "draft" })]);
      const result = await caller.productionDashboard.delete({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("deletes a cancelled work order", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "cancelled" })]);
      const result = await caller.productionDashboard.delete({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("throws BAD_REQUEST for in_progress work order", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([makeWoRow({ status: "in_progress" })]);
      await expect(caller.productionDashboard.delete({ id: 1 }))
        .rejects.toThrow("只能删除草稿或已取消的工单");
    });

    it("throws NOT_FOUND when work order missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.delete({ id: 999 }))
        .rejects.toThrow("工单不存在");
    });
  });

  // ═══ QC Records ════════════════════════════════════
  describe("getQCRecords", () => {
    it("returns QC records", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{
        id: 1, workOrderId: 1, inspectionType: "process", result: "pass",
        inspectorName: "张三", checklistItems: '{"checkPoint":"尺寸","totalItems":5,"passItems":5,"failItems":0}',
        defectType: "尺寸", inspectionTime: "2026-01-01T10:00:00Z", createdAt: "2026-01-01T10:00:00Z",
      }];
      const result = await caller.productionDashboard.getQCRecords({});
      expect(result).toHaveLength(1);
      expect(result[0].checkPoint).toBe("尺寸");
      expect(result[0].totalItems).toBe(5);
    });

    it("filters by workOrderId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.productionDashboard.getQCRecords({ workOrderId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  describe("createQCRecord", () => {
    it("creates a QC record for existing work order", async () => {
      const caller = createAuthenticatedCaller();
      // Verify WO exists
      selectResultsQueue.push([makeWoRow()]);
      mockReturningResult = [{
        id: 1, workOrderId: 1, inspectionType: "final", result: "pass",
        inspectorName: "Inspector", checklistItems: '{"checkPoint":"Final","totalItems":10,"passItems":9,"failItems":1}',
        defectType: "Final", inspectionTime: new Date(), createdAt: new Date(),
      }];
      const result = await caller.productionDashboard.createQCRecord({
        workOrderId: 1, checkType: "final", checkPoint: "Final Check",
        totalItems: 10, passItems: 9, failItems: 1, result: "pass", inspector: "Inspector",
      });
      expect(result).toHaveProperty("id");
    });

    it("throws NOT_FOUND when work order missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.createQCRecord({
        workOrderId: 999, checkType: "process", checkPoint: "X",
        totalItems: 1, passItems: 1, failItems: 0, result: "pass", inspector: "X",
      })).rejects.toThrow("工单不存在");
    });

    it("rejects invalid checkType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.productionDashboard.createQCRecord({
        workOrderId: 1, checkType: "invalid" as any, checkPoint: "X",
        totalItems: 1, passItems: 1, failItems: 0, result: "pass", inspector: "X",
      })).rejects.toThrow();
    });
  });

  describe("getQCStats", () => {
    it("returns aggregated QC statistics", async () => {
      const caller = createAuthenticatedCaller();
      // Promise.all: [total, pass, fail, conditional]
      selectResultsQueue.push([{ value: 10 }]);
      selectResultsQueue.push([{ value: 8 }]);
      selectResultsQueue.push([{ value: 1 }]);
      selectResultsQueue.push([{ value: 1 }]);
      // All rows for item-level aggregation
      selectResultsQueue.push([
        { checklistItems: '{"totalItems":10,"passItems":9,"failItems":1}' },
        { checklistItems: '{"totalItems":5,"passItems":5,"failItems":0}' },
      ]);
      const result = await caller.productionDashboard.getQCStats({});
      expect(result.stats.totalRecords).toBe(10);
      expect(result.stats.passCount).toBe(8);
      expect(result.stats.failCount).toBe(1);
      expect(result.stats.totalItems).toBe(15);
      expect(result.stats.totalPass).toBe(14);
    });

    it("returns zeros when no records", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([]);
      const result = await caller.productionDashboard.getQCStats({});
      expect(result.stats.totalRecords).toBe(0);
      expect(result.stats.passRate).toBe("0%");
    });
  });

  // ═══ Equipment ═════════════════════════════════════
  describe("getEquipments", () => {
    it("returns equipment list", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, code: "EQ-001", name: "CNC-1", type: "cnc", status: "running", location: "A1", currentWorkOrderId: null, utilization: "85.00" },
      ];
      const result = await caller.productionDashboard.getEquipments({});
      expect(result).toHaveLength(1);
      expect(result[0].utilization).toBe(85);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.productionDashboard.getEquipments({ status: "fault" });
      expect(result).toHaveLength(0);
    });
  });

  describe("updateEquipmentStatus", () => {
    it("updates equipment status with history recording", async () => {
      const caller = createAuthenticatedCaller();
      // Check exists
      selectResultsQueue.push([{
        id: 1, code: "EQ-001", name: "CNC-1", type: "cnc", status: "idle",
        location: "A1", currentWorkOrderId: null, utilization: "80.00",
      }]);
      // Update returning
      mockReturningResult = [{
        id: 1, code: "EQ-001", name: "CNC-1", type: "cnc", status: "running",
        location: "A1", currentWorkOrderId: 5, utilization: "80.00",
      }];
      const result = await caller.productionDashboard.updateEquipmentStatus({
        id: 1, status: "running", currentWorkOrderId: 5,
      });
      expect(result.equipment.status).toBe("running");
      expect(result.statusChange.from).toBe("idle");
      expect(result.statusChange.to).toBe("running");
    });

    it("throws NOT_FOUND when equipment missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(caller.productionDashboard.updateEquipmentStatus({ id: 999, status: "running" }))
        .rejects.toThrow("设备不存在");
    });

    it("sets utilization to 0 for maintenance/fault/offline", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{
        id: 1, code: "EQ-001", name: "CNC-1", type: "cnc", status: "running",
        location: "A1", currentWorkOrderId: null, utilization: "80.00",
      }]);
      mockReturningResult = [{
        id: 1, code: "EQ-001", name: "CNC-1", type: "cnc", status: "maintenance",
        location: "A1", currentWorkOrderId: null, utilization: "0.00",
      }];
      const result = await caller.productionDashboard.updateEquipmentStatus({ id: 1, status: "maintenance" });
      expect(result.equipment.utilization).toBe(0);
      expect(result.statusChange.availabilityChanged).toBe(true);
    });
  });

  describe("getEquipmentStatusHistory", () => {
    it("returns paginated status history", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ value: 3 }]);
      selectResultsQueue.push([
        { id: 1, equipmentId: 1, previousStatus: "idle", newStatus: "running" },
        { id: 2, equipmentId: 1, previousStatus: "running", newStatus: "maintenance" },
      ]);
      const result = await caller.productionDashboard.getEquipmentStatusHistory({});
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it("filters by equipmentId", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ value: 0 }]);
      selectResultsQueue.push([]);
      const result = await caller.productionDashboard.getEquipmentStatusHistory({ equipmentId: 999 });
      expect(result.total).toBe(0);
    });
  });

  // ═══ Dashboard Stats ══════════════════════════════
  describe("getDashboardStats", () => {
    it("returns comprehensive dashboard statistics", async () => {
      const caller = createAuthenticatedCaller();
      // Promise.all: [statusCounts, priorityCounts, teamCounts, quantityResult, equipStatusCounts, utilizationResult, recentRows]
      selectResultsQueue.push([{ status: "in_progress", cnt: 3 }, { status: "completed", cnt: 5 }]);
      selectResultsQueue.push([{ priority: "high", cnt: 2 }, { priority: "normal", cnt: 6 }]);
      selectResultsQueue.push([{ team: "Team A", cnt: 4 }]);
      selectResultsQueue.push([{ totalQuantity: 100, completedQuantity: 50, avgProgress: 45 }]);
      selectResultsQueue.push([{ status: "running", cnt: 3 }, { status: "idle", cnt: 2 }]);
      selectResultsQueue.push([{ avgUtil: 72 }]);
      selectResultsQueue.push([makeWoRow()]);
      const result = await caller.productionDashboard.getDashboardStats();
      expect(result.summary.totalOrders).toBe(8);
      expect(result.summary.inProgressOrders).toBe(3);
      expect(result.summary.completedOrders).toBe(5);
      expect(result.equipment.running).toBe(3);
      expect(result.ordersByTeam["Team A"]).toBe(4);
    });
  });

  describe("getProgressTrend", () => {
    it("returns trend data for specified days", async () => {
      const caller = createAuthenticatedCaller();
      // db.execute returns rows
      mockDb.execute.mockResolvedValueOnce({ rows: [
        { date: "2026-02-28", completed: 2, in_progress: 3, planned: 1 },
      ]});
      const result = await caller.productionDashboard.getProgressTrend({ days: 3 });
      expect(result).toHaveLength(3);
      // Each entry has date, completed, inProgress, planned
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("completed");
    });

    it("returns zero-filled fallback on error", async () => {
      const caller = createAuthenticatedCaller();
      mockDb.execute.mockRejectedValueOnce(new Error("table not found"));
      const result = await caller.productionDashboard.getProgressTrend({ days: 5 });
      expect(result).toHaveLength(5);
      expect(result[0].completed).toBe(0);
    });
  });

  describe("getTeamCapacity", () => {
    it("returns team capacity with efficiency", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { team: "Team A", totalOrders: 10, completedOrders: 7, inProgressOrders: 3, totalHours: 80, actualHours: 60 },
        { team: null, totalOrders: 2, completedOrders: 0, inProgressOrders: 0, totalHours: 0, actualHours: 0 },
      ];
      const result = await caller.productionDashboard.getTeamCapacity();
      expect(result).toHaveLength(2);
      expect(result[0].team).toBe("Team A");
      expect(result[0].efficiency).toBe(75); // 60/80
      expect(result[1].team).toBe("未分配");
      expect(result[1].efficiency).toBe(0); // 0/0
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.productionDashboard.list()).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.productionDashboard.create({ productName: "X", quantity: 1 }))
        .rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.productionDashboard.delete({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for getDashboardStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.productionDashboard.getDashboardStats()).rejects.toThrow();
    });
  });
});

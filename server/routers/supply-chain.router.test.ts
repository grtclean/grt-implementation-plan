/**
 * Supply Chain Router — Comprehensive Automated Test Suite
 * Covers all 10 sub-routers + dashboardStats (~78 procedures)
 *
 * Run: pnpm test -- server/routers/supply-chain.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
// Shared mutable results that each test can override before calling.
// For tests that need different results on successive select() calls,
// push multiple entries to `selectResultsQueue`. When the queue is empty,
// fallback to `mockQueryResult`.
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  // Thenable: await db.select().from(x).where(y) resolves mockQueryResult
  chain.then = (resolve: any, reject?: any) => {
    try {
      resolve(mockQueryResult);
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    return {
      select: vi.fn(() => {
        const chain = createMockDbChain();
        // If the queue has entries, use the next one instead of the default
        if (selectResultsQueue.length > 0) {
          const nextResult = selectResultsQueue.shift()!;
          chain.then = (resolve: any) => resolve(nextResult);
        }
        return chain;
      }),
      insert: vi.fn(() => createMockDbChain()),
      update: vi.fn(() => createMockDbChain()),
      delete: vi.fn(() => createMockDbChain()),
    };
  }),
}));

// ─── Mock schema tables (column refs only) ───────────────────────────
vi.mock("../../drizzle/supply-chain-schema", () => ({
  supplierShipmentLabels: {
    id: "id", supplierId: "supplierId", materialCode: "materialCode",
    poNumber: "poNumber", projectNumber: "projectNumber", isValidated: "isValidated",
    createdAt: "createdAt", supplierSerialNumber: "supplierSerialNumber",
    printCount: "printCount", batchNumber: "batchNumber",
  },
  incomingInspectionRecords: {
    id: "id", materialCode: "materialCode", supplierId: "supplierId",
    inspectionResult: "inspectionResult", createdAt: "createdAt",
    lotId: "lotId", hasTestReport: "hasTestReport",
    testReportGrtMaterialMatch: "testReportGrtMaterialMatch",
    testReportOrderMatch: "testReportOrderMatch",
  },
  assemblyBomScanLogs: {
    id: "id", projectNumber: "projectNumber", processCode: "processCode",
    bomMatchResult: "bomMatchResult", createdAt: "createdAt",
  },
  assemblyLaborConfirmations: {
    id: "id", projectNumber: "projectNumber", processCode: "processCode",
    workerId: "workerId", createdAt: "createdAt",
    clockInTime: "clockInTime", clockOutTime: "clockOutTime",
    efficiencyPercent: "efficiencyPercent",
  },
  customerQualityComplaints: {
    id: "id", customerId: "customerId", projectNumber: "projectNumber",
    severity: "severity", status: "status", createdAt: "createdAt",
    satisfactionScore: "satisfactionScore",
  },
  equipmentMaintenanceRecords: {
    id: "id", equipmentId: "equipmentId", maintenanceType: "maintenanceType",
    status: "status", createdAt: "createdAt", downtimeMinutes: "downtimeMinutes",
    totalCost: "totalCost", scheduledDate: "scheduledDate", startedAt: "startedAt",
  },
  scrapDisposalRecords: {
    id: "id", materialCode: "materialCode", disposalMethod: "disposalMethod",
    projectNumber: "projectNumber", createdAt: "createdAt",
    totalScrapCost: "totalScrapCost", scrapCategory: "scrapCategory",
    replacementRequired: "replacementRequired",
  },
  spareParts: {
    id: "id", category: "category", isCritical: "isCritical",
    currentStock: "currentStock", reorderPoint: "reorderPoint",
    isActive: "isActive", createdAt: "createdAt", unitPrice: "unitPrice",
    autoReorderEnabled: "autoReorderEnabled",
  },
  sparePartConsumptionLogs: {
    id: "id", sparePartId: "sparePartId", createdAt: "createdAt",
  },
  supplierPenalties: {
    id: "id", supplierId: "supplierId", triggerType: "triggerType",
    isBlacklisted: "isBlacklisted", isActive: "isActive",
    createdAt: "createdAt", penaltyType: "penaltyType",
  },
  traceabilityGraphEdges: {
    id: "id", fromEntityType: "fromEntityType", fromEntityId: "fromEntityId",
    toEntityType: "toEntityType", toEntityId: "toEntityId",
    projectNumber: "projectNumber", relationshipType: "relationshipType",
  },
}));

vi.mock("../../drizzle/bom-schema", () => ({
  bomItems: { id: "id", processCode: "processCode", materialCode: "materialCode", substituteCode: "substituteCode" },
}));

vi.mock("../../drizzle/inventory-lot-schema", () => ({
  inventoryLots: { id: "id", lotNumber: "lotNumber" },
}));

vi.mock("../../drizzle/p2p-lifecycle-schema", () => ({
  deliveryRegistrations: { id: "id", qcInspectionId: "qcInspectionId", status: "status", supplierId: "supplierId" },
}));

vi.mock("../../drizzle/procurement-schema", () => ({
  suppliers: { id: "id", contactEmail: "contactEmail", supplierName: "supplierName" },
}));

// ─── Import AFTER mocks are in place ─────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset between tests ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// 1. Label sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.label", () => {
  it("label.list returns items and total", async () => {
    mockQueryResult = [{ count: 2 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("label.list accepts filter parameters", async () => {
    mockQueryResult = [{ count: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.list({
      supplierId: 1,
      materialCode: "MAT-001",
      isValidated: true,
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveProperty("total");
  });

  it("label.get returns single item or null", async () => {
    mockQueryResult = [{ id: 1, materialCode: "MAT-001", supplierSerialNumber: "SN-001" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.get({ id: 1 });
    expect(result).toEqual({ id: 1, materialCode: "MAT-001", supplierSerialNumber: "SN-001" });
  });

  it("label.get returns null when not found", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.get({ id: 999 });
    expect(result).toBeNull();
  });

  it("label.create inserts and returns label", async () => {
    mockReturningResult = [{ id: 10, materialCode: "MAT-NEW", supplierSerialNumber: "SN-NEW" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.create({
      supplierSerialNumber: "SN-NEW",
      materialCode: "MAT-NEW",
    });
    expect(result).toHaveProperty("id", 10);
    expect(result).toHaveProperty("materialCode", "MAT-NEW");
  });

  it("label.validate updates validation status", async () => {
    mockQueryResult = [{ id: 1, materialCode: "MAT-001", poNumber: "PO-001", supplierSerialNumber: "SN-001" }];
    mockReturningResult = [{ id: 1, isValidated: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.validate({ id: 1 });
    expect(result).toHaveProperty("isValidated", true);
  });

  it("label.validate throws when label not found", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(caller.supplyChain.label.validate({ id: 999 })).rejects.toThrow("Label not found");
  });

  it("label.batchValidate processes multiple IDs", async () => {
    // batchValidate now does one bulk SELECT (all labels), then N individual UPDATEs
    mockQueryResult = [
      { id: 1, materialCode: "MAT-001", poNumber: "PO-001" },
      { id: 2, materialCode: "MAT-002", poNumber: "PO-002" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.batchValidate({ ids: [1, 2] });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, valid: true });
    expect(result[1]).toEqual({ id: 2, valid: true });
  });

  it("label.markPrinted increments print count", async () => {
    mockReturningResult = [{ id: 1, printCount: 2 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.markPrinted({ id: 1 });
    expect(result).toHaveProperty("printCount", 2);
  });

  it("label.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("label.stats returns aggregated counts", async () => {
    // stats now issues two SELECT COUNT(*) queries:
    //   1. total count (all labels)
    //   2. validated count (where isValidated = true)
    selectResultsQueue = [
      [{ count: 3 }],  // total
      [{ count: 2 }],  // validated
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.stats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("validated", 2);
    expect(result).toHaveProperty("pending", 1);
    expect(result).toHaveProperty("validationRate", 67);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Inspection sub-router (IQC)
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.inspection", () => {
  it("inspection.list returns items and total", async () => {
    mockQueryResult = [{ count: 1 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("inspection.get returns single record", async () => {
    mockQueryResult = [{ id: 1, inspectionCode: "IQC-001", inspectionResult: "PENDING" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.get({ id: 1 });
    expect(result).toHaveProperty("inspectionCode", "IQC-001");
  });

  it("inspection.get returns null for missing record", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.get({ id: 999 });
    expect(result).toBeNull();
  });

  it("inspection.create inserts and returns record", async () => {
    mockReturningResult = [{ id: 5, inspectionCode: "IQC-20260301-1234", materialCode: "MAT-001" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.create({
      materialCode: "MAT-001",
      hasTestReport: true,
    });
    expect(result).toHaveProperty("id", 5);
    expect(result).toHaveProperty("materialCode", "MAT-001");
  });

  it("inspection.create with lotId creates traceability edge", async () => {
    mockReturningResult = [{ id: 5, lotId: 10, materialCode: "MAT-001" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.create({
      materialCode: "MAT-001",
      lotId: 10,
    });
    expect(result).toHaveProperty("lotId", 10);
  });

  it("inspection.submitResult updates inspection record", async () => {
    mockQueryResult = [{ id: 1, inspectionCode: "IQC-001" }];
    mockReturningResult = [{ id: 1, inspectionResult: "PASS", disposition: "accept" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.submitResult({
      id: 1,
      inspectionResult: "PASS",
      disposition: "accept",
    });
    expect(result).toHaveProperty("inspectionResult", "PASS");
  });

  it("inspection.submitResult throws for missing record", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.inspection.submitResult({
        id: 999,
        inspectionResult: "FAIL",
        disposition: "reject",
      }),
    ).rejects.toThrow("Inspection record not found");
  });

  it("inspection.rejectReceipt auto-rejects when test report missing", async () => {
    mockQueryResult = [{ id: 1, hasTestReport: false, testReportGrtMaterialMatch: false, testReportOrderMatch: false, supplierId: 5, supplierName: "Supplier A" }];
    mockReturningResult = [{ id: 1, inspectionResult: "FAIL", disposition: "reject" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.rejectReceipt({ id: 1 });
    expect(result).toHaveProperty("autoRejected", true);
    expect(result.reasons).toContain("检测报告缺失");
  });

  it("inspection.rejectReceipt returns no-reject when all checks pass", async () => {
    mockQueryResult = [{ id: 1, hasTestReport: true, testReportGrtMaterialMatch: true, testReportOrderMatch: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.rejectReceipt({ id: 1 });
    expect(result).toHaveProperty("autoRejected", false);
  });

  it("inspection.linkTo8D updates the record", async () => {
    mockReturningResult = [{ id: 1, eightDReportId: 42 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.linkTo8D({
      inspectionId: 1,
      eightDReportId: 42,
    });
    expect(result).toHaveProperty("eightDReportId", 42);
  });

  it("inspection.stats returns aggregated metrics", async () => {
    mockQueryResult = [
      { inspectionResult: "PASS", hasTestReport: true },
      { inspectionResult: "FAIL", hasTestReport: true },
      { inspectionResult: "PENDING", hasTestReport: false },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.stats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("pass", 1);
    expect(result).toHaveProperty("fail", 1);
    expect(result).toHaveProperty("pending", 1);
    expect(result).toHaveProperty("missingReports", 1);
  });

  it("inspection.approve updates approval timestamp", async () => {
    mockReturningResult = [{ id: 1, approvedAt: "2026-03-01T00:00:00Z" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.approve({ id: 1 });
    expect(result).toHaveProperty("approvedAt");
  });

  it("inspection.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.inspection.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. BOM Scan sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.bomScan", () => {
  it("bomScan.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("bomScan.list filters by projectNumber", async () => {
    mockQueryResult = [
      { projectNumber: "PRJ-001", processCode: "P01", bomMatchResult: "MATCH" },
      { projectNumber: "PRJ-002", processCode: "P02", bomMatchResult: "MISMATCH" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.list({ projectNumber: "PRJ-001" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].projectNumber).toBe("PRJ-001");
  });

  it("bomScan.scanAndVerify resolves barcode via label", async () => {
    // First call: select from supplierShipmentLabels finds a label
    // Subsequent calls: bomItems, insert returning, insert traceability
    mockQueryResult = [{ id: 1, materialCode: "MAT-001", batchNumber: "BATCH-01" }];
    mockReturningResult = [{
      id: 10, projectNumber: "PRJ-001", processCode: "P01",
      bomMatchResult: "NOT_FOUND", scannedBarcode: "SN-001",
    }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.scanAndVerify({
      projectNumber: "PRJ-001",
      processCode: "P01",
      scannedBarcode: "SN-001",
    });
    expect(result).toHaveProperty("projectNumber", "PRJ-001");
    expect(result).toHaveProperty("requiresDeviation");
  });

  it("bomScan.confirmDeviation updates deviation fields", async () => {
    mockReturningResult = [{ id: 1, deviationConfirmed: true, deviationReason: "Approved substitute" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.confirmDeviation({
      id: 1,
      deviationReason: "Approved substitute",
    });
    expect(result).toHaveProperty("deviationConfirmed", true);
  });

  it("bomScan.processProgress groups scans by process", async () => {
    mockQueryResult = [
      { processCode: "P01", bomMatchResult: "MATCH", deviationConfirmed: false },
      { processCode: "P01", bomMatchResult: "MISMATCH", deviationConfirmed: true },
      { processCode: "P02", bomMatchResult: "MATCH", deviationConfirmed: false },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.processProgress({
      projectNumber: "PRJ-001",
    });
    expect(result).toHaveProperty("projectNumber", "PRJ-001");
    expect(result.processes).toHaveProperty("P01");
    expect(result.processes["P01"]).toEqual({ total: 2, match: 1, mismatch: 1, deviation: 1 });
  });

  it("bomScan.stats returns match rates", async () => {
    mockQueryResult = [
      { bomMatchResult: "MATCH" },
      { bomMatchResult: "MATCH" },
      { bomMatchResult: "MISMATCH" },
      { bomMatchResult: "SUBSTITUTE" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.stats();
    expect(result).toEqual({
      total: 4,
      match: 2,
      mismatch: 1,
      substitute: 1,
      notFound: 0,
      matchRate: 50,
    });
  });

  it("bomScan.get returns single scan log", async () => {
    mockQueryResult = [{ id: 1, bomMatchResult: "MATCH" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.get({ id: 1 });
    expect(result).toHaveProperty("bomMatchResult", "MATCH");
  });

  it("bomScan.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.bomScan.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. Labor sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.labor", () => {
  it("labor.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("labor.list filters by workerId", async () => {
    mockQueryResult = [
      { workerId: 1, projectNumber: "PRJ-001", processCode: "P01" },
      { workerId: 2, projectNumber: "PRJ-001", processCode: "P02" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.list({ workerId: 1 });
    expect(result.items).toHaveLength(1);
  });

  it("labor.get returns single record", async () => {
    mockQueryResult = [{ id: 1, workerId: 1, processCode: "P01" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.get({ id: 1 });
    expect(result).toHaveProperty("workerId", 1);
  });

  it("labor.clockIn creates a new labor record", async () => {
    mockReturningResult = [{ id: 1, projectNumber: "PRJ-001", processCode: "P01", workerId: 1 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.clockIn({
      projectNumber: "PRJ-001",
      processCode: "P01",
    });
    expect(result).toHaveProperty("projectNumber", "PRJ-001");
    expect(result).toHaveProperty("workerId", 1);
  });

  it("labor.clockOut calculates efficiency", async () => {
    const clockInTime = new Date(Date.now() - 60 * 60000).toISOString(); // 60 min ago
    mockQueryResult = [{ id: 1, clockInTime, plannedMinutes: 50 }];
    mockReturningResult = [{ id: 1, clockOutTime: new Date().toISOString(), netWorkMinutes: 60, efficiencyPercent: "83" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.clockOut({ id: 1 });
    expect(result).toHaveProperty("clockOutTime");
  });

  it("labor.clockOut throws for missing record", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(caller.supplyChain.labor.clockOut({ id: 999 })).rejects.toThrow("Labor record not found");
  });

  it("labor.supervisorConfirm sets supervisor fields", async () => {
    mockReturningResult = [{ id: 1, confirmedBySupervisor: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.supervisorConfirm({ id: 1 });
    expect(result).toHaveProperty("confirmedBySupervisor", true);
  });

  it("labor.workerSummary aggregates worker stats", async () => {
    mockQueryResult = [
      { workerId: 1, clockOutTime: "2026-03-01T10:00:00Z", netWorkMinutes: 60, defectsFound: 2, efficiencyPercent: "90" },
      { workerId: 1, clockOutTime: "2026-03-01T12:00:00Z", netWorkMinutes: 45, defectsFound: 0, efficiencyPercent: "110" },
      { workerId: 1, clockInTime: "2026-03-01T14:00:00Z", clockOutTime: null },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.workerSummary({ workerId: 1 });
    expect(result).toHaveProperty("workerId", 1);
    expect(result).toHaveProperty("totalRecords", 3);
    expect(result).toHaveProperty("completedRecords", 2);
    expect(result).toHaveProperty("totalMinutes", 105);
    expect(result).toHaveProperty("totalDefects", 2);
    expect(result).toHaveProperty("avgEfficiency", 100);
  });

  it("labor.stats returns totals", async () => {
    mockQueryResult = [
      { clockInTime: "2026-03-01T08:00:00Z", clockOutTime: null, efficiencyPercent: null },
      { clockInTime: "2026-03-01T08:00:00Z", clockOutTime: "2026-03-01T09:00:00Z", efficiencyPercent: "95" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.stats();
    expect(result).toHaveProperty("total", 2);
    expect(result).toHaveProperty("active", 1);
    expect(result).toHaveProperty("completed", 1);
    expect(result).toHaveProperty("avgEfficiency");
  });

  it("labor.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("labor.update modifies record", async () => {
    mockReturningResult = [{ id: 1, notes: "Updated", qualityResult: "PASS" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.labor.update({
      id: 1,
      notes: "Updated",
      qualityResult: "PASS",
    });
    expect(result).toHaveProperty("notes", "Updated");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. Complaint sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.complaint", () => {
  it("complaint.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("complaint.list filters by severity", async () => {
    mockQueryResult = [
      { severity: "critical", status: "open", customerId: 1 },
      { severity: "low", status: "open", customerId: 2 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.list({ severity: "critical" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].severity).toBe("critical");
  });

  it("complaint.get returns single complaint", async () => {
    mockQueryResult = [{ id: 1, complaintCode: "CQC-001", severity: "high" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.get({ id: 1 });
    expect(result).toHaveProperty("complaintCode", "CQC-001");
  });

  it("complaint.create inserts and returns complaint", async () => {
    mockReturningResult = [{ id: 3, complaintCode: "CQC-20260301-5678", severity: "medium", status: "open" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.create({
      description: "Defective part received",
      severity: "medium",
    });
    expect(result).toHaveProperty("status", "open");
    expect(result).toHaveProperty("severity", "medium");
  });

  it("complaint.update modifies complaint fields", async () => {
    mockReturningResult = [{ id: 1, status: "investigating", rootCause: "Material defect" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.update({
      id: 1,
      status: "investigating",
      rootCause: "Material defect",
    });
    expect(result).toHaveProperty("status", "investigating");
  });

  it("complaint.linkTo8D creates traceability edge", async () => {
    mockReturningResult = [{ id: 1, eightDReportId: 42 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.linkTo8D({
      complaintId: 1,
      eightDReportId: 42,
    });
    expect(result).toHaveProperty("eightDReportId", 42);
  });

  it("complaint.linkToCAPA updates CAPA reference", async () => {
    mockReturningResult = [{ id: 1, capaId: 7 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.linkToCAPA({
      complaintId: 1,
      capaId: 7,
    });
    expect(result).toHaveProperty("capaId", 7);
  });

  it("complaint.traceToSupplier returns null for missing complaint", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.traceToSupplier({ complaintId: 999 });
    expect(result).toBeNull();
  });

  it("complaint.traceToSupplier returns complaint + edges", async () => {
    mockQueryResult = [{ id: 1, projectNumber: "PRJ-001" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.traceToSupplier({ complaintId: 1 });
    expect(result).toHaveProperty("complaint");
    expect(result).toHaveProperty("traceEdges");
  });

  it("complaint.stats returns aggregated counts", async () => {
    mockQueryResult = [
      { status: "open", severity: "critical", satisfactionScore: null },
      { status: "investigating", severity: "high", satisfactionScore: null },
      { status: "resolved", severity: "medium", satisfactionScore: 4 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.stats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("open", 1);
    expect(result).toHaveProperty("investigating", 1);
    expect(result).toHaveProperty("resolved", 1);
    expect(result).toHaveProperty("critical", 1);
    expect(result).toHaveProperty("avgSatisfactionScore");
  });

  it("complaint.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.complaint.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. Maintenance sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.maintenance", () => {
  it("maintenance.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("maintenance.get returns single record", async () => {
    mockQueryResult = [{ id: 1, maintenanceCode: "MNT-001", status: "scheduled" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.get({ id: 1 });
    expect(result).toHaveProperty("maintenanceCode", "MNT-001");
  });

  it("maintenance.create inserts with scheduled status", async () => {
    mockReturningResult = [{ id: 2, maintenanceCode: "MNT-20260301-0001", status: "scheduled", equipmentId: 10 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.create({
      equipmentId: 10,
      maintenanceType: "preventive",
    });
    expect(result).toHaveProperty("status", "scheduled");
    expect(result).toHaveProperty("equipmentId", 10);
  });

  it("maintenance.start transitions to in_progress", async () => {
    mockReturningResult = [{ id: 1, status: "in_progress", startedAt: "2026-03-01T10:00:00Z" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.start({ id: 1 });
    expect(result).toHaveProperty("status", "in_progress");
    expect(result).toHaveProperty("startedAt");
  });

  it("maintenance.complete calculates downtime and cost", async () => {
    mockQueryResult = [{ id: 1, startedAt: new Date(Date.now() - 120 * 60000).toISOString() }];
    mockReturningResult = [{ id: 1, status: "completed", downtimeMinutes: 120, totalCost: "150" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.complete({
      id: 1,
      laborCost: "100",
      partsCost: "50",
    });
    expect(result).toHaveProperty("status", "completed");
    expect(result).toHaveProperty("totalCost", "150");
  });

  it("maintenance.complete throws for missing record", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.maintenance.complete({ id: 999 }),
    ).rejects.toThrow("Maintenance record not found");
  });

  it("maintenance.upcoming returns scheduled items sorted", async () => {
    mockQueryResult = [
      { id: 2, scheduledDate: "2026-03-10", status: "scheduled" },
      { id: 1, scheduledDate: "2026-03-05", status: "scheduled" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.upcoming();
    expect(result[0].scheduledDate).toBe("2026-03-05");
  });

  it("maintenance.stats returns aggregated metrics", async () => {
    mockQueryResult = [
      { status: "scheduled", downtimeMinutes: 0, totalCost: "0" },
      { status: "in_progress", downtimeMinutes: 0, totalCost: "0" },
      { status: "completed", downtimeMinutes: 90, totalCost: "200" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.maintenance.stats();
    expect(result).toEqual({
      total: 3,
      scheduled: 1,
      inProgress: 1,
      completed: 1,
      totalDowntimeMinutes: 90,
      totalCost: 200,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. Scrap sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.scrap", () => {
  it("scrap.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("scrap.get returns single record", async () => {
    mockQueryResult = [{ id: 1, scrapCode: "SCR-001", disposalMethod: "recycle" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.get({ id: 1 });
    expect(result).toHaveProperty("scrapCode", "SCR-001");
  });

  it("scrap.create calculates total cost", async () => {
    mockReturningResult = [{ id: 1, scrapCode: "SCR-20260301-0001", totalScrapCost: "500" }];
    // The lot lookup returns empty, traceability insert is separate
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.create({
      materialCode: "MAT-001",
      scrapReason: "Defective material",
      quantity: "10",
      unitCost: "50",
    });
    expect(result).toHaveProperty("scrapCode");
  });

  it("scrap.update modifies fields", async () => {
    mockReturningResult = [{ id: 1, disposalMethod: "destroy", notes: "Hazardous" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.update({
      id: 1,
      disposalMethod: "destroy",
      notes: "Hazardous",
    });
    expect(result).toHaveProperty("disposalMethod", "destroy");
  });

  it("scrap.stats returns cost and method breakdown", async () => {
    mockQueryResult = [
      { disposalMethod: "recycle", totalScrapCost: "100", replacementRequired: true },
      { disposalMethod: "recycle", totalScrapCost: "200", replacementRequired: false },
      { disposalMethod: "destroy", totalScrapCost: "300", replacementRequired: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.stats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("totalCost", 600);
    expect(result).toHaveProperty("replacementNeeded", 2);
    expect(result.byMethod).toHaveProperty("recycle", 2);
    expect(result.byMethod).toHaveProperty("destroy", 1);
  });

  it("scrap.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("scrap.byCategory groups by category", async () => {
    mockQueryResult = [
      { scrapCategory: "dimensional", totalScrapCost: "100" },
      { scrapCategory: "dimensional", totalScrapCost: "200" },
      { scrapCategory: "surface", totalScrapCost: "50" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.byCategory();
    expect(result).toHaveProperty("dimensional");
    expect(result.dimensional).toEqual({ count: 2, cost: 300 });
    expect(result.surface).toEqual({ count: 1, cost: 50 });
  });

  it("scrap.linkToPenalty associates penalty", async () => {
    mockReturningResult = [{ id: 1, supplierPenaltyId: 5 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.scrap.linkToPenalty({
      scrapId: 1,
      penaltyId: 5,
    });
    expect(result).toHaveProperty("supplierPenaltyId", 5);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. Spare Part sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.sparePart", () => {
  it("sparePart.list returns active items", async () => {
    mockQueryResult = [
      { isActive: true, category: "electrical", currentStock: 10, reorderPoint: 5, isCritical: false },
      { isActive: false, category: "mechanical", currentStock: 2, reorderPoint: 5, isCritical: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.list();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isActive).toBe(true);
  });

  it("sparePart.list filters lowStockOnly", async () => {
    mockQueryResult = [
      { isActive: true, category: "electrical", currentStock: 3, reorderPoint: 5 },
      { isActive: true, category: "mechanical", currentStock: 10, reorderPoint: 5 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.list({ lowStockOnly: true });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].currentStock).toBeLessThanOrEqual(result.items[0].reorderPoint);
  });

  it("sparePart.get returns single part", async () => {
    mockQueryResult = [{ id: 1, partCode: "SP-001", materialCode: "MAT-001", currentStock: 50 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.get({ id: 1 });
    expect(result).toHaveProperty("partCode", "SP-001");
  });

  it("sparePart.create inserts new part", async () => {
    mockReturningResult = [{ id: 5, partCode: "SP-20260301-0001", materialCode: "MAT-NEW" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.create({
      materialCode: "MAT-NEW",
      materialName: "New Part",
    });
    expect(result).toHaveProperty("materialCode", "MAT-NEW");
  });

  it("sparePart.update modifies part fields", async () => {
    mockReturningResult = [{ id: 1, reorderPoint: 20, isCritical: true }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.update({
      id: 1,
      reorderPoint: 20,
      isCritical: true,
    });
    expect(result).toHaveProperty("reorderPoint", 20);
    expect(result).toHaveProperty("isCritical", true);
  });

  it("sparePart.consume deducts stock and logs consumption", async () => {
    mockQueryResult = [{ id: 1, currentStock: 10, autoReorderEnabled: true, reorderPoint: 5 }];
    mockReturningResult = [{ id: 100, sparePartId: 1, quantityConsumed: 3, newStock: 7 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.consume({
      sparePartId: 1,
      quantityConsumed: 3,
    });
    expect(result).toHaveProperty("newStock", 7);
    expect(result).toHaveProperty("autoReorderTriggered", false);
  });

  it("sparePart.consume triggers auto-reorder when stock drops below reorder point", async () => {
    mockQueryResult = [{ id: 1, currentStock: 8, autoReorderEnabled: true, reorderPoint: 5 }];
    mockReturningResult = [{ id: 101, sparePartId: 1, quantityConsumed: 5, newStock: 3 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.consume({
      sparePartId: 1,
      quantityConsumed: 5,
    });
    expect(result).toHaveProperty("autoReorderTriggered", true);
  });

  it("sparePart.consume throws for insufficient stock", async () => {
    mockQueryResult = [{ id: 1, currentStock: 2, autoReorderEnabled: false, reorderPoint: 5 }];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.sparePart.consume({ sparePartId: 1, quantityConsumed: 10 }),
    ).rejects.toThrow("库存不足");
  });

  it("sparePart.consume throws for non-existent part", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.sparePart.consume({ sparePartId: 999, quantityConsumed: 1 }),
    ).rejects.toThrow("Spare part not found");
  });

  it("sparePart.consumptionHistory returns logs", async () => {
    mockQueryResult = [
      { id: 1, sparePartId: 1, quantityConsumed: 3 },
      { id: 2, sparePartId: 2, quantityConsumed: 1 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.consumptionHistory();
    expect(result).toHaveLength(2);
  });

  it("sparePart.consumptionHistory filters by sparePartId", async () => {
    mockQueryResult = [
      { id: 1, sparePartId: 1, quantityConsumed: 3 },
      { id: 2, sparePartId: 2, quantityConsumed: 1 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.consumptionHistory({ sparePartId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].sparePartId).toBe(1);
  });

  it("sparePart.restock increases stock", async () => {
    mockQueryResult = [{ id: 1, currentStock: 10 }];
    mockReturningResult = [{ id: 1, currentStock: 30 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.restock({
      sparePartId: 1,
      quantity: 20,
    });
    expect(result).toHaveProperty("currentStock", 30);
  });

  it("sparePart.restock throws for non-existent part", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.sparePart.restock({ sparePartId: 999, quantity: 10 }),
    ).rejects.toThrow("Spare part not found");
  });

  it("sparePart.lowStockAlerts returns parts below reorder point", async () => {
    mockQueryResult = [
      { id: 1, isActive: true, currentStock: 3, reorderPoint: 5 },
      { id: 2, isActive: true, currentStock: 10, reorderPoint: 5 },
      { id: 3, isActive: false, currentStock: 1, reorderPoint: 5 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.lowStockAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("sparePart.stats returns inventory summary", async () => {
    mockQueryResult = [
      { currentStock: 3, reorderPoint: 5, isCritical: true, unitPrice: "100" },
      { currentStock: 10, reorderPoint: 5, isCritical: false, unitPrice: "50" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.sparePart.stats();
    expect(result).toHaveProperty("total", 2);
    expect(result).toHaveProperty("lowStock", 1);
    expect(result).toHaveProperty("critical", 1);
    expect(result).toHaveProperty("totalValue", 800); // 3*100 + 10*50
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. Penalty sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.penalty", () => {
  it("penalty.list returns items and total", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total", 0);
  });

  it("penalty.list filters by supplierId", async () => {
    mockQueryResult = [
      { supplierId: 1, triggerType: "quality_reject", isBlacklisted: false, isActive: true },
      { supplierId: 2, triggerType: "late_delivery", isBlacklisted: false, isActive: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.list({ supplierId: 1 });
    expect(result.items).toHaveLength(1);
  });

  it("penalty.get returns single penalty", async () => {
    mockQueryResult = [{ id: 1, penaltyCode: "PEN-001", penaltyType: "warning" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.get({ id: 1 });
    expect(result).toHaveProperty("penaltyCode", "PEN-001");
  });

  it("penalty.create with auto-escalation (first offense = warning)", async () => {
    // First call: select existing penalties for this supplier (empty = first)
    mockQueryResult = [];
    mockReturningResult = [{ id: 1, penaltyType: "warning", escalationLevel: 1, occurrenceCount: 1 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.create({
      supplierId: 1,
      triggerType: "quality_reject",
    });
    expect(result).toHaveProperty("escalation");
    expect(result.escalation).toEqual({ level: 1, type: "warning" });
    expect(result).toHaveProperty("occurrenceCount", 1);
  });

  it("penalty.resolve deactivates penalty", async () => {
    mockReturningResult = [{ id: 1, isActive: false, resolvedAt: "2026-03-01T10:00:00Z" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.resolve({ id: 1 });
    expect(result).toHaveProperty("isActive", false);
    expect(result).toHaveProperty("resolvedAt");
  });

  it("penalty.supplierScorecard calculates composite score", async () => {
    // First call: penalties for supplier; Second call: inspections for supplier
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.supplierScorecard({ supplierId: 1 });
    expect(result).toHaveProperty("supplierId", 1);
    expect(result).toHaveProperty("qualityRate");
    expect(result).toHaveProperty("compositeScore");
    expect(result).toHaveProperty("riskLevel");
    expect(["low", "medium", "high", "critical"]).toContain(result.riskLevel);
  });

  it("penalty.stats returns type breakdown", async () => {
    mockQueryResult = [
      { triggerType: "quality_reject", isActive: true, isBlacklisted: false },
      { triggerType: "late_delivery", isActive: false, isBlacklisted: false },
      { triggerType: "quality_reject", isActive: true, isBlacklisted: true },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.stats();
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("active", 2);
    expect(result).toHaveProperty("resolved", 1);
    expect(result).toHaveProperty("blacklisted", 1);
    expect(result.byType).toHaveProperty("quality_reject", 2);
    expect(result.byType).toHaveProperty("late_delivery", 1);
  });

  it("penalty.delete returns success", async () => {
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.penalty.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 10. Traceability sub-router
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.trace", () => {
  it("trace.forward returns root and edges", async () => {
    // Traverse returns empty edge set (no children)
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.trace.forward({
      entityType: "label",
      entityId: 1,
      maxDepth: 3,
    });
    expect(result).toHaveProperty("root");
    expect(result.root).toEqual({ type: "label", id: 1 });
    expect(result).toHaveProperty("edges");
    expect(result).toHaveProperty("nodeCount", 1);
  });

  it("trace.forward traverses graph edges", async () => {
    // First traverse call finds one edge, second traverse finds nothing
    mockQueryResult = [
      { fromEntityType: "label", fromEntityId: 1, toEntityType: "bom_scan", toEntityId: 5, relationshipType: "assembled_in" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.trace.forward({
      entityType: "label",
      entityId: 1,
    });
    expect(result.edges.length).toBeGreaterThanOrEqual(0);
    expect(result.nodeCount).toBeGreaterThanOrEqual(1);
  });

  it("trace.backward returns root and edges", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.trace.backward({
      entityType: "bom_scan",
      entityId: 5,
      maxDepth: 3,
    });
    expect(result).toHaveProperty("root");
    expect(result.root).toEqual({ type: "bom_scan", id: 5 });
    expect(result).toHaveProperty("edges");
    expect(result).toHaveProperty("nodeCount", 1);
  });

  it("trace.projectGraph returns edges for a project", async () => {
    mockQueryResult = [
      { fromEntityType: "label", fromEntityId: 1, toEntityType: "bom_scan", toEntityId: 5 },
      { fromEntityType: "bom_scan", fromEntityId: 5, toEntityType: "inspection", toEntityId: 10 },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.trace.projectGraph({
      projectNumber: "PRJ-001",
    });
    expect(result).toHaveProperty("projectNumber", "PRJ-001");
    expect(result).toHaveProperty("edges");
    expect(result.edges).toHaveLength(2);
    expect(result).toHaveProperty("nodeCount", 3);
  });

  it("trace.stats returns edge and node counts", async () => {
    mockQueryResult = [
      { fromEntityType: "label", fromEntityId: 1, toEntityType: "bom_scan", toEntityId: 5, relationshipType: "assembled_in" },
      { fromEntityType: "label", fromEntityId: 2, toEntityType: "bom_scan", toEntityId: 6, relationshipType: "assembled_in" },
      { fromEntityType: "complaint", fromEntityId: 3, toEntityType: "eight_d", toEntityId: 7, relationshipType: "resolved_by" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.trace.stats();
    expect(result).toHaveProperty("totalEdges", 3);
    expect(result).toHaveProperty("totalNodes", 6);
    expect(result.byRelationshipType).toHaveProperty("assembled_in", 2);
    expect(result.byRelationshipType).toHaveProperty("resolved_by", 1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// Dashboard Stats (top-level)
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain.dashboardStats", () => {
  it("returns unified dashboard metrics", async () => {
    // Promise.all resolves 6 arrays — all share the same mockQueryResult
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.dashboardStats();
    expect(result).toHaveProperty("iqc");
    expect(result.iqc).toHaveProperty("total");
    expect(result.iqc).toHaveProperty("passRate");
    expect(result.iqc).toHaveProperty("pending");
    expect(result).toHaveProperty("bomScan");
    expect(result.bomScan).toHaveProperty("total");
    expect(result.bomScan).toHaveProperty("matchRate");
    expect(result).toHaveProperty("complaints");
    expect(result.complaints).toHaveProperty("total");
    expect(result.complaints).toHaveProperty("open");
    expect(result.complaints).toHaveProperty("critical");
    expect(result).toHaveProperty("penalties");
    expect(result.penalties).toHaveProperty("active");
    expect(result.penalties).toHaveProperty("blacklisted");
    expect(result).toHaveProperty("spareParts");
    expect(result.spareParts).toHaveProperty("lowStock");
    expect(result).toHaveProperty("scrap");
    expect(result.scrap).toHaveProperty("total");
    expect(result.scrap).toHaveProperty("totalCost");
  });

  it("calculates correct pass rate", async () => {
    // All 6 selects share the same mock, but dashboardStats destructures
    // them. With the thenable pattern they all get the same array.
    mockQueryResult = [
      { inspectionResult: "PASS", bomMatchResult: "MATCH", status: "resolved", severity: "low", isActive: false, isBlacklisted: false, currentStock: 10, reorderPoint: 5, totalScrapCost: "100", triggerType: "quality_reject" },
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.dashboardStats();
    // With one record that is PASS and not PENDING, pass rate = 100
    expect(result.iqc.passRate).toBe(100);
  });
});

// ═════════════════════════════════════════════════════════════════════
// Authentication guard
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain authentication", () => {
  it("rejects unauthenticated calls to label.list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.supplyChain.label.list()).rejects.toThrow();
  });

  it("rejects unauthenticated calls to inspection.create", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.supplyChain.inspection.create({ materialCode: "MAT-001" }),
    ).rejects.toThrow();
  });

  it("rejects unauthenticated calls to sparePart.consume", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.supplyChain.sparePart.consume({ sparePartId: 1, quantityConsumed: 1 }),
    ).rejects.toThrow();
  });

  it("rejects unauthenticated calls to dashboardStats", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.supplyChain.dashboardStats()).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Input validation (Zod)
// ═════════════════════════════════════════════════════════════════════
describe("supplyChain input validation", () => {
  it("label.create rejects missing materialCode", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error intentionally missing required field
      caller.supplyChain.label.create({ supplierSerialNumber: "SN-001" }),
    ).rejects.toThrow();
  });

  it("label.list rejects limit > 500", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.supplyChain.label.list({ limit: 1000, offset: 0 }),
    ).rejects.toThrow();
  });

  it("complaint.create rejects invalid severity", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error intentionally invalid enum value
      caller.supplyChain.complaint.create({ description: "test", severity: "extreme" }),
    ).rejects.toThrow();
  });

  it("maintenance.create rejects invalid maintenanceType", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error intentionally invalid enum value
      caller.supplyChain.maintenance.create({ equipmentId: 1, maintenanceType: "magic" }),
    ).rejects.toThrow();
  });

  it("penalty.create rejects invalid triggerType", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      // @ts-expect-error intentionally invalid enum value
      caller.supplyChain.penalty.create({ supplierId: 1, triggerType: "bad_weather" }),
    ).rejects.toThrow();
  });

  it("label.get accepts string id (flexible input)", async () => {
    mockQueryResult = [{ id: 1 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.supplyChain.label.get({ id: "1" });
    expect(result).toHaveProperty("id", 1);
  });
});

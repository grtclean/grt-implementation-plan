/**
 * Warehouse Router — Comprehensive Automated Test Suite
 *
 * Covers all 28 procedures across 7 domains:
 *   - Warehouses CRUD (5 procedures)
 *   - Locations management (4 procedures)
 *   - Receipts / inbound (4 procedures)
 *   - Issues / outbound (4 procedures)
 *   - Stock counts (3 procedures)
 *   - Lot tracking (5 procedures)
 *   - Serial number tracking (3 procedures)
 *   - Stats & traceability (3 procedures)
 *
 * Run: pnpm test -- server/routers/warehouse.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];

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
    const chain = createMockDbChain();
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

// ─── Mock BU scope middleware ────────────────────────────────────────
vi.mock("../_core/gateway-bu-context.middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../_core/gateway-bu-context.middleware")>();
  return {
    ...actual,
    buScopeCondition: vi.fn(() => undefined),
  };
});

// ─── Mock warehouse schema ──────────────────────────────────────────
vi.mock("../../drizzle/warehouse-schema", () => ({
  warehouses: {
    id: "id", warehouseCode: "warehouseCode", warehouseName: "warehouseName",
    warehouseType: "warehouseType", buCode: "buCode", address: "address",
    building: "building", floor: "floor", totalArea: "totalArea",
    totalCapacity: "totalCapacity", managerId: "managerId", managerName: "managerName",
    contactPhone: "contactPhone", description: "description", isActive: "isActive",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  warehouseLocations: {
    id: "id", warehouseId: "warehouseId", locationCode: "locationCode",
    zone: "zone", aisle: "aisle", shelf: "shelf", bin: "bin",
    locationType: "locationType", maxWeight: "maxWeight", maxVolume: "maxVolume",
    maxItems: "maxItems", isOccupied: "isOccupied", currentMaterialCode: "currentMaterialCode",
    currentQty: "currentQty", tempRequirement: "tempRequirement",
    isActive: "isActive", isLocked: "isLocked", lockReason: "lockReason",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  warehouseReceipts: {
    id: "id", receiptCode: "receiptCode", receiptType: "receiptType",
    sourceDocType: "sourceDocType", sourceDocId: "sourceDocId",
    sourceDocCode: "sourceDocCode", warehouseId: "warehouseId",
    locationId: "locationId", status: "status",
    receivedBy: "receivedBy", receivedByName: "receivedByName",
    receivedAt: "receivedAt", qcResult: "qcResult", qcBy: "qcBy",
    qcAt: "qcAt", qcNotes: "qcNotes", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  warehouseReceiptItems: {
    id: "id", receiptId: "receiptId", materialCode: "materialCode",
    materialName: "materialName", expectedQty: "expectedQty",
    receivedQty: "receivedQty", unit: "unit", lotNumber: "lotNumber",
    locationId: "locationId", locationCode: "locationCode",
    createdAt: "createdAt",
  },
  warehouseIssues: {
    id: "id", issueCode: "issueCode", issueType: "issueType",
    sourceDocType: "sourceDocType", sourceDocId: "sourceDocId",
    sourceDocCode: "sourceDocCode", processCode: "processCode",
    warehouseId: "warehouseId", requestDept: "requestDept",
    projectCode: "projectCode", status: "status",
    issuedBy: "issuedBy", issuedByName: "issuedByName",
    issuedAt: "issuedAt", approvedBy: "approvedBy", approvedAt: "approvedAt",
    notes: "notes", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  warehouseIssueItems: {
    id: "id", issueId: "issueId", materialCode: "materialCode",
    materialName: "materialName", requestedQty: "requestedQty",
    issuedQty: "issuedQty", unit: "unit",
    locationId: "locationId", locationCode: "locationCode",
    lotNumber: "lotNumber", createdAt: "createdAt",
  },
  stockCounts: {
    id: "id", countCode: "countCode", countType: "countType",
    warehouseId: "warehouseId", zone: "zone", status: "status",
    plannedDate: "plannedDate", startedAt: "startedAt", completedAt: "completedAt",
    countedBy: "countedBy", verifiedBy: "verifiedBy", approvedBy: "approvedBy",
    totalItems: "totalItems", matchedItems: "matchedItems",
    discrepancyItems: "discrepancyItems", totalDiscrepancyValue: "totalDiscrepancyValue",
    notes: "notes", createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ─── Mock inventory lot schema ──────────────────────────────────────
vi.mock("../../drizzle/inventory-lot-schema", () => ({
  inventoryLots: {
    id: "id", lotNumber: "lotNumber", materialCode: "materialCode",
    materialName: "materialName", initialQty: "initialQty", currentQty: "currentQty",
    reservedQty: "reservedQty", unit: "unit", sourceType: "sourceType",
    sourcePOCode: "sourcePOCode", sourceWorkOrder: "sourceWorkOrder",
    supplierLotNumber: "supplierLotNumber", supplierId: "supplierId",
    supplierName: "supplierName", warehouseId: "warehouseId",
    locationId: "locationId", locationCode: "locationCode",
    productionDate: "productionDate", receivedDate: "receivedDate",
    expiryDate: "expiryDate", warrantyDate: "warrantyDate",
    qcStatus: "qcStatus", qcCertificateNumber: "qcCertificateNumber",
    status: "status", unitCost: "unitCost", totalCost: "totalCost",
    notes: "notes", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  serialNumbers: {
    id: "id", serialNumber: "serialNumber", materialCode: "materialCode",
    materialName: "materialName", lotId: "lotId", lotNumber: "lotNumber",
    warehouseId: "warehouseId", locationId: "locationId",
    status: "status", currentProjectCode: "currentProjectCode",
    currentProcessCode: "currentProcessCode", currentHolderId: "currentHolderId",
    purchaseOrderCode: "purchaseOrderCode", supplierId: "supplierId",
    receivedDate: "receivedDate", warrantyExpiry: "warrantyExpiry",
    lifecycleEvents: "lifecycleEvents",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ─── Import callers AFTER mocks ─────────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ─── Test helpers ───────────────────────────────────────────────────
const mockWarehouse = {
  id: 1,
  warehouseCode: "WH-01",
  warehouseName: "Main Warehouse",
  warehouseType: "raw_material",
  buCode: "BU1",
  address: "Building A",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockLocation = {
  id: 1,
  warehouseId: 1,
  locationCode: "WH-01-A-01-01-01",
  zone: "A",
  aisle: "01",
  shelf: "01",
  bin: "01",
  locationType: "storage",
  isOccupied: false,
  isActive: true,
  isLocked: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockReceipt = {
  id: 1,
  receiptCode: "RCV-20260101-0001",
  receiptType: "purchase",
  warehouseId: 1,
  status: "draft",
  receivedBy: 1,
  receivedByName: "Test User",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockReceiptItem = {
  id: 1,
  receiptId: 1,
  materialCode: "MAT-001",
  materialName: "Steel Plate",
  expectedQty: "100.00",
  receivedQty: "95.00",
  unit: "个",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockIssue = {
  id: 1,
  issueCode: "ISS-20260101-0001",
  issueType: "production",
  warehouseId: 1,
  status: "draft",
  issuedBy: 1,
  issuedByName: "Test User",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockIssueItem = {
  id: 1,
  issueId: 1,
  materialCode: "MAT-001",
  materialName: "Steel Plate",
  requestedQty: "50.00",
  issuedQty: "0.00",
  unit: "个",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockStockCount = {
  id: 1,
  countCode: "CNT-20260101-0001",
  countType: "full",
  warehouseId: 1,
  status: "planned",
  totalItems: 0,
  matchedItems: 0,
  discrepancyItems: 0,
  totalDiscrepancyValue: "0.00",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockLot = {
  id: 1,
  lotNumber: "LOT-20260101-0001",
  materialCode: "MAT-001",
  materialName: "Steel Plate",
  initialQty: "100.00",
  currentQty: "100.00",
  reservedQty: "0.00",
  unit: "个",
  sourceType: "purchase",
  qcStatus: "pending",
  status: "available",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockSerial = {
  id: 1,
  serialNumber: "SN-001",
  materialCode: "MAT-001",
  materialName: "Servo Motor",
  status: "in_stock",
  lifecycleEvents: [{ date: "2026-01-01T00:00:00.000Z", event: "created", notes: "入库登记" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// =====================================================================
// TESTS
// =====================================================================

beforeEach(() => {
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
});

// ─────────────────────────────────────────────────────────────────────
// 1. Auth guards — anonymous callers rejected
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — auth guards", () => {
  it("rejects anonymous caller on getWarehouses", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.warehouse.getWarehouses({})).rejects.toThrow();
  });

  it("rejects anonymous caller on getWarehouse", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.warehouse.getWarehouse({ id: 1 })).rejects.toThrow();
  });

  it("rejects anonymous caller on createWarehouse (admin)", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createWarehouse({
        warehouseCode: "WH-01",
        warehouseName: "Test",
        warehouseType: "raw_material",
      }),
    ).rejects.toThrow();
  });

  it("rejects non-admin caller on createWarehouse", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createWarehouse({
        warehouseCode: "WH-01",
        warehouseName: "Test",
        warehouseType: "raw_material",
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createReceipt", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createReceipt({
        receiptType: "purchase",
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", expectedQty: 10 }],
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createIssue", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createIssue({
        issueType: "production",
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", requestedQty: 5 }],
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createStockCount (admin)", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createStockCount({ countType: "full", warehouseId: 1 }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createLot", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createLot({
        lotNumber: "LOT-001", materialCode: "MAT-001",
        initialQty: 100, sourceType: "purchase",
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on createSerialNumber", async () => {
    const anon = createAnonymousCaller();
    await expect(
      anon.warehouse.createSerialNumber({
        serialNumber: "SN-001", materialCode: "MAT-001",
      }),
    ).rejects.toThrow();
  });

  it("rejects anonymous caller on getWarehouseStats", async () => {
    const anon = createAnonymousCaller();
    await expect(anon.warehouse.getWarehouseStats()).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Warehouse CRUD
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — CRUD", () => {
  it("createWarehouse returns the created record", async () => {
    mockReturningResult = [mockWarehouse];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createWarehouse({
      warehouseCode: "WH-01",
      warehouseName: "Main Warehouse",
      warehouseType: "raw_material",
      buCode: "BU1",
      address: "Building A",
    });
    expect(result).toEqual(mockWarehouse);
  });

  it("createWarehouse accepts all optional fields", async () => {
    mockReturningResult = [{ ...mockWarehouse, id: 2, building: "B", floor: "3F" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createWarehouse({
      warehouseCode: "WH-02",
      warehouseName: "Secondary",
      warehouseType: "finished_goods",
      building: "B",
      floor: "3F",
      totalArea: 500,
      totalCapacity: 200,
      managerId: 10,
      managerName: "Manager Li",
      contactPhone: "13800138000",
      description: "Finished goods warehouse",
    });
    expect(result.id).toBe(2);
  });

  it("createWarehouse validates warehouseType enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createWarehouse({
        warehouseCode: "WH-X",
        warehouseName: "Bad Type",
        warehouseType: "invalid_type" as any,
      }),
    ).rejects.toThrow();
  });

  it("createWarehouse rejects empty warehouseCode", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createWarehouse({
        warehouseCode: "",
        warehouseName: "No Code",
        warehouseType: "raw_material",
      }),
    ).rejects.toThrow();
  });

  it("createWarehouse rejects empty warehouseName", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createWarehouse({
        warehouseCode: "WH-03",
        warehouseName: "",
        warehouseType: "raw_material",
      }),
    ).rejects.toThrow();
  });

  it("getWarehouses returns list", async () => {
    mockQueryResult = [mockWarehouse, { ...mockWarehouse, id: 2, warehouseCode: "WH-02" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouses({});
    expect(result).toHaveLength(2);
    expect(result[0].warehouseCode).toBe("WH-01");
  });

  it("getWarehouses filters by warehouseType", async () => {
    mockQueryResult = [mockWarehouse];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouses({ warehouseType: "raw_material" });
    expect(result).toHaveLength(1);
  });

  it("getWarehouses filters by buCode", async () => {
    mockQueryResult = [mockWarehouse];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouses({ buCode: "BU1" });
    expect(result).toHaveLength(1);
  });

  it("getWarehouses filters by isActive", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouses({ isActive: false });
    expect(result).toHaveLength(0);
  });

  it("getWarehouses filters by search term", async () => {
    mockQueryResult = [mockWarehouse];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouses({ search: "Main" });
    expect(result).toHaveLength(1);
  });

  it("getWarehouse returns warehouse with locations", async () => {
    mockQueryResult = [mockWarehouse];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouse({ id: 1 });
    expect(result).not.toBeNull();
    expect(result!.warehouseCode).toBe("WH-01");
  });

  it("getWarehouse returns null for nonexistent id", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouse({ id: 9999 });
    expect(result).toBeNull();
  });

  it("updateWarehouse returns updated record", async () => {
    mockQueryResult = [{ ...mockWarehouse, warehouseName: "Updated Name" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateWarehouse({
      id: 1,
      warehouseName: "Updated Name",
    });
    expect(result.warehouseName).toBe("Updated Name");
  });

  it("updateWarehouse partial update keeps other fields", async () => {
    mockQueryResult = [{ ...mockWarehouse, address: "New Address" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateWarehouse({
      id: 1,
      address: "New Address",
    });
    expect(result.warehouseCode).toBe("WH-01");
    expect(result.address).toBe("New Address");
  });

  it("updateWarehouse throws when warehouse not found", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.updateWarehouse({ id: 999, warehouseName: "Ghost" }),
    ).rejects.toThrow("Warehouse not found");
  });

  it("toggleWarehouseActive deactivates warehouse", async () => {
    mockQueryResult = [{ ...mockWarehouse, isActive: false }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.toggleWarehouseActive({ id: 1, isActive: false });
    expect(result.isActive).toBe(false);
  });

  it("toggleWarehouseActive reactivates warehouse", async () => {
    mockQueryResult = [{ ...mockWarehouse, isActive: true }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.toggleWarehouseActive({ id: 1, isActive: true });
    expect(result.isActive).toBe(true);
  });

  it("toggleWarehouseActive throws when warehouse not found", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.toggleWarehouseActive({ id: 999, isActive: false }),
    ).rejects.toThrow("Warehouse not found");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Location management
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — locations", () => {
  it("createLocation returns the created location", async () => {
    mockReturningResult = [mockLocation];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createLocation({
      warehouseId: 1,
      locationCode: "WH-01-A-01-01-01",
      zone: "A",
    });
    expect(result).toEqual(mockLocation);
  });

  it("createLocation accepts optional dimension fields", async () => {
    mockReturningResult = [{ ...mockLocation, maxWeight: "500.00", maxVolume: "2.50", maxItems: 10 }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createLocation({
      warehouseId: 1,
      locationCode: "WH-01-B-01-01-01",
      zone: "B",
      aisle: "01",
      shelf: "01",
      bin: "01",
      locationType: "picking",
      maxWeight: 500,
      maxVolume: 2.5,
      maxItems: 10,
      tempRequirement: "cold",
    });
    expect(result.maxWeight).toBe("500.00");
  });

  it("createLocation rejects empty locationCode", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createLocation({ warehouseId: 1, locationCode: "", zone: "A" }),
    ).rejects.toThrow();
  });

  it("createLocation rejects empty zone", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createLocation({ warehouseId: 1, locationCode: "L-01", zone: "" }),
    ).rejects.toThrow();
  });

  it("createLocation validates locationType enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createLocation({
        warehouseId: 1, locationCode: "L-02", zone: "A",
        locationType: "invalid" as any,
      }),
    ).rejects.toThrow();
  });

  it("createLocation validates tempRequirement enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createLocation({
        warehouseId: 1, locationCode: "L-03", zone: "A",
        tempRequirement: "boiling" as any,
      }),
    ).rejects.toThrow();
  });

  it("getLocations returns list filtered by warehouseId", async () => {
    mockQueryResult = [mockLocation, { ...mockLocation, id: 2, locationCode: "WH-01-A-01-01-02" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLocations({ warehouseId: 1 });
    expect(result).toHaveLength(2);
  });

  it("getLocations filters by zone", async () => {
    mockQueryResult = [mockLocation];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLocations({ warehouseId: 1, zone: "A" });
    expect(result).toHaveLength(1);
  });

  it("getLocations filters by locationType", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLocations({ warehouseId: 1, locationType: "picking" });
    expect(result).toHaveLength(0);
  });

  it("getLocations filters by isOccupied", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLocations({ warehouseId: 1, isOccupied: true });
    expect(result).toHaveLength(0);
  });

  it("batchCreateLocations creates correct count", async () => {
    mockQueryResult = [{ warehouseCode: "WH-01" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.batchCreateLocations({
      warehouseId: 1,
      zone: "C",
      aisleCount: 2,
      shelfCount: 3,
      binCount: 2,
    });
    expect(result.created).toBe(12); // 2 * 3 * 2
    expect(result.message).toContain("12");
  });

  it("batchCreateLocations throws for nonexistent warehouse", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.batchCreateLocations({
        warehouseId: 999, zone: "X", aisleCount: 1, shelfCount: 1, binCount: 1,
      }),
    ).rejects.toThrow("Warehouse not found");
  });

  it("batchCreateLocations rejects aisleCount > 99", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.batchCreateLocations({
        warehouseId: 1, zone: "X", aisleCount: 100, shelfCount: 1, binCount: 1,
      }),
    ).rejects.toThrow();
  });

  it("batchCreateLocations rejects aisleCount < 1", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.batchCreateLocations({
        warehouseId: 1, zone: "X", aisleCount: 0, shelfCount: 1, binCount: 1,
      }),
    ).rejects.toThrow();
  });

  it("lockLocation locks with reason", async () => {
    mockQueryResult = [{ ...mockLocation, isLocked: true, lockReason: "盘点中" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.lockLocation({
      id: 1, isLocked: true, lockReason: "盘点中",
    });
    expect(result.isLocked).toBe(true);
    expect(result.lockReason).toBe("盘点中");
  });

  it("lockLocation unlocks a location", async () => {
    mockQueryResult = [{ ...mockLocation, isLocked: false, lockReason: null }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.lockLocation({ id: 1, isLocked: false });
    expect(result.isLocked).toBe(false);
    expect(result.lockReason).toBeNull();
  });

  it("lockLocation throws for nonexistent location", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.lockLocation({ id: 999, isLocked: true }),
    ).rejects.toThrow("Location not found");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Receipts (inbound)
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — receipts", () => {
  it("createReceipt returns receipt with items", async () => {
    mockReturningResult = [mockReceipt];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createReceipt({
      receiptType: "purchase",
      warehouseId: 1,
      items: [
        { materialCode: "MAT-001", expectedQty: 100, receivedQty: 95, lotNumber: "LOT-001" },
      ],
    });
    expect(result.receiptType).toBe("purchase");
    expect(result.items).toBeDefined();
  });

  it("createReceipt with multiple items", async () => {
    mockReturningResult = [mockReceipt];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createReceipt({
      receiptType: "production",
      warehouseId: 1,
      sourceDocType: "WorkOrder",
      sourceDocCode: "WO-001",
      notes: "Production receipt",
      items: [
        { materialCode: "MAT-001", expectedQty: 50 },
        { materialCode: "MAT-002", expectedQty: 30, materialName: "Copper Wire" },
      ],
    });
    expect(result).toBeDefined();
  });

  it("createReceipt validates receiptType enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createReceipt({
        receiptType: "invalid" as any,
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", expectedQty: 10 }],
      }),
    ).rejects.toThrow();
  });

  it("createReceipt accepts empty items array (no min constraint)", async () => {
    mockReturningResult = [mockReceipt];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createReceipt({
      receiptType: "purchase",
      warehouseId: 1,
      items: [],
    });
    expect(result.items).toEqual([]);
  });

  it("createReceipt rejects item with empty materialCode", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createReceipt({
        receiptType: "purchase",
        warehouseId: 1,
        items: [{ materialCode: "", expectedQty: 10 }],
      }),
    ).rejects.toThrow();
  });

  it("createReceipt rejects negative expectedQty", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createReceipt({
        receiptType: "purchase",
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", expectedQty: -5 }],
      }),
    ).rejects.toThrow();
  });

  it("getReceipts returns paginated results", async () => {
    mockQueryResult = [{ value: 1 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipts({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
  });

  it("getReceipts filters by warehouseId", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipts({ warehouseId: 1 });
    expect(result.total).toBeDefined();
  });

  it("getReceipts filters by receiptType", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipts({ receiptType: "purchase" });
    expect(result).toBeDefined();
  });

  it("getReceipts filters by status", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipts({ status: "draft" });
    expect(result).toBeDefined();
  });

  it("getReceipts respects page and pageSize", async () => {
    mockQueryResult = [{ value: 50 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipts({ page: 3, pageSize: 10 });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });

  it("getReceipt returns receipt with items", async () => {
    mockQueryResult = [mockReceipt];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipt({ id: 1 });
    expect(result).not.toBeNull();
  });

  it("getReceipt returns null for nonexistent id", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getReceipt({ id: 9999 });
    expect(result).toBeNull();
  });

  it("updateReceiptStatus transitions to pending_qc", async () => {
    mockQueryResult = [{ ...mockReceipt, status: "pending_qc" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateReceiptStatus({
      id: 1, status: "pending_qc",
    });
    expect(result.status).toBe("pending_qc");
  });

  it("updateReceiptStatus transitions to qc_passed with qcNotes", async () => {
    mockQueryResult = [{ ...mockReceipt, status: "qc_passed", qcResult: "passed" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateReceiptStatus({
      id: 1, status: "qc_passed", qcNotes: "All items pass inspection",
    });
    expect(result.status).toBe("qc_passed");
  });

  it("updateReceiptStatus transitions to qc_failed", async () => {
    mockQueryResult = [{ ...mockReceipt, status: "qc_failed", qcResult: "failed" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateReceiptStatus({
      id: 1, status: "qc_failed", qcNotes: "Surface defects found",
    });
    expect(result.status).toBe("qc_failed");
  });

  it("updateReceiptStatus transitions to shelved", async () => {
    mockQueryResult = [{ ...mockReceipt, status: "shelved" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateReceiptStatus({
      id: 1, status: "shelved",
    });
    expect(result.status).toBe("shelved");
  });

  it("updateReceiptStatus transitions to cancelled", async () => {
    mockQueryResult = [{ ...mockReceipt, status: "cancelled" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateReceiptStatus({
      id: 1, status: "cancelled",
    });
    expect(result.status).toBe("cancelled");
  });

  it("updateReceiptStatus throws for nonexistent receipt", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateReceiptStatus({ id: 999, status: "shelved" }),
    ).rejects.toThrow("Receipt not found");
  });

  it("updateReceiptStatus validates status enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateReceiptStatus({ id: 1, status: "invalid" as any }),
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Issues (outbound)
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — issues", () => {
  it("createIssue returns issue with items", async () => {
    mockReturningResult = [mockIssue];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createIssue({
      issueType: "production",
      warehouseId: 1,
      items: [{ materialCode: "MAT-001", requestedQty: 50 }],
    });
    expect(result.issueType).toBe("production");
    expect(result.items).toBeDefined();
  });

  it("createIssue with full optional fields", async () => {
    mockReturningResult = [mockIssue];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createIssue({
      issueType: "sales",
      warehouseId: 1,
      sourceDocType: "SalesOrder",
      sourceDocCode: "SO-001",
      processCode: "PROC-01",
      requestDept: "Manufacturing",
      projectCode: "PRJ-001",
      notes: "Urgent production order",
      items: [
        { materialCode: "MAT-001", requestedQty: 20, lotNumber: "LOT-001", locationId: 1, locationCode: "WH-01-A-01-01-01" },
        { materialCode: "MAT-002", materialName: "Copper Wire", requestedQty: 15, unit: "米" },
      ],
    });
    expect(result).toBeDefined();
  });

  it("createIssue validates issueType enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createIssue({
        issueType: "invalid" as any,
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", requestedQty: 5 }],
      }),
    ).rejects.toThrow();
  });

  it("createIssue rejects negative requestedQty", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createIssue({
        issueType: "production",
        warehouseId: 1,
        items: [{ materialCode: "MAT-001", requestedQty: -10 }],
      }),
    ).rejects.toThrow();
  });

  it("getIssues returns paginated results", async () => {
    mockQueryResult = [{ value: 2 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
  });

  it("getIssues filters by warehouseId", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({ warehouseId: 1 });
    expect(result).toBeDefined();
  });

  it("getIssues filters by issueType", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({ issueType: "production" });
    expect(result).toBeDefined();
  });

  it("getIssues filters by status", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({ status: "draft" });
    expect(result).toBeDefined();
  });

  it("getIssues filters by projectCode", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({ projectCode: "PRJ-001" });
    expect(result).toBeDefined();
  });

  it("getIssues respects pagination params", async () => {
    mockQueryResult = [{ value: 100 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssues({ page: 5, pageSize: 10 });
    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(10);
  });

  it("getIssue returns issue with items", async () => {
    mockQueryResult = [mockIssue];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssue({ id: 1 });
    expect(result).not.toBeNull();
  });

  it("getIssue returns null for nonexistent id", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getIssue({ id: 9999 });
    expect(result).toBeNull();
  });

  it("updateIssueStatus transitions to approved", async () => {
    mockQueryResult = [{ ...mockIssue, status: "approved" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateIssueStatus({ id: 1, status: "approved" });
    expect(result.status).toBe("approved");
  });

  it("updateIssueStatus transitions to picking", async () => {
    mockQueryResult = [{ ...mockIssue, status: "picking" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateIssueStatus({ id: 1, status: "picking" });
    expect(result.status).toBe("picking");
  });

  it("updateIssueStatus transitions to issued", async () => {
    mockQueryResult = [{ ...mockIssue, status: "issued" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateIssueStatus({ id: 1, status: "issued" });
    expect(result.status).toBe("issued");
  });

  it("updateIssueStatus transitions to cancelled", async () => {
    mockQueryResult = [{ ...mockIssue, status: "cancelled" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateIssueStatus({ id: 1, status: "cancelled" });
    expect(result.status).toBe("cancelled");
  });

  it("updateIssueStatus rejects non-admin caller", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateIssueStatus({ id: 1, status: "approved" }),
    ).rejects.toThrow();
  });

  it("updateIssueStatus throws for nonexistent issue", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.updateIssueStatus({ id: 999, status: "approved" }),
    ).rejects.toThrow("Issue not found");
  });

  it("updateIssueStatus validates status enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.updateIssueStatus({ id: 1, status: "invalid" as any }),
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Stock counts
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — stock counts", () => {
  it("createStockCount returns the created record", async () => {
    mockReturningResult = [mockStockCount];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createStockCount({
      countType: "full",
      warehouseId: 1,
    });
    expect(result.countType).toBe("full");
    expect(result.status).toBe("planned");
  });

  it("createStockCount with optional fields", async () => {
    mockReturningResult = [{ ...mockStockCount, zone: "A", plannedDate: "2026-03-15" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.createStockCount({
      countType: "cycle",
      warehouseId: 1,
      zone: "A",
      plannedDate: "2026-03-15",
      notes: "Quarterly cycle count",
    });
    expect(result.zone).toBe("A");
  });

  it("createStockCount validates countType enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.createStockCount({
        countType: "invalid" as any,
        warehouseId: 1,
      }),
    ).rejects.toThrow();
  });

  it("createStockCount rejects non-admin", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createStockCount({ countType: "full", warehouseId: 1 }),
    ).rejects.toThrow();
  });

  it("getStockCounts returns paginated results", async () => {
    mockQueryResult = [{ value: 3 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getStockCounts({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getStockCounts filters by warehouseId", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getStockCounts({ warehouseId: 1 });
    expect(result).toBeDefined();
  });

  it("getStockCounts filters by status", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getStockCounts({ status: "planned" });
    expect(result).toBeDefined();
  });

  it("getStockCounts filters by countType", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getStockCounts({ countType: "annual" });
    expect(result).toBeDefined();
  });

  it("updateStockCountStatus transitions to in_progress", async () => {
    mockQueryResult = [{ ...mockStockCount, status: "in_progress" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateStockCountStatus({
      id: 1, status: "in_progress",
    });
    expect(result.status).toBe("in_progress");
  });

  it("updateStockCountStatus transitions to completed with counts", async () => {
    mockQueryResult = [{
      ...mockStockCount,
      status: "completed",
      totalItems: 100,
      matchedItems: 95,
      discrepancyItems: 5,
      totalDiscrepancyValue: "1250.00",
    }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateStockCountStatus({
      id: 1,
      status: "completed",
      totalItems: 100,
      matchedItems: 95,
      discrepancyItems: 5,
      totalDiscrepancyValue: 1250,
    });
    expect(result.status).toBe("completed");
    expect(result.totalItems).toBe(100);
    expect(result.discrepancyItems).toBe(5);
  });

  it("updateStockCountStatus transitions to approved", async () => {
    mockQueryResult = [{ ...mockStockCount, status: "approved" }];
    const admin = createAdminCaller();
    const result = await admin.warehouse.updateStockCountStatus({
      id: 1, status: "approved",
    });
    expect(result.status).toBe("approved");
  });

  it("updateStockCountStatus validates status enum", async () => {
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.updateStockCountStatus({ id: 1, status: "invalid" as any }),
    ).rejects.toThrow();
  });

  it("updateStockCountStatus throws for nonexistent stock count", async () => {
    mockQueryResult = [];
    const admin = createAdminCaller();
    await expect(
      admin.warehouse.updateStockCountStatus({ id: 999, status: "in_progress" }),
    ).rejects.toThrow("Stock count not found");
  });

  it("updateStockCountStatus rejects non-admin", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateStockCountStatus({ id: 1, status: "in_progress" }),
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7. Lot tracking
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — lot tracking", () => {
  it("createLot returns the created lot", async () => {
    mockReturningResult = [mockLot];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createLot({
      lotNumber: "LOT-20260101-0001",
      materialCode: "MAT-001",
      initialQty: 100,
      sourceType: "purchase",
    });
    expect(result.lotNumber).toBe("LOT-20260101-0001");
    expect(result.status).toBe("available");
  });

  it("createLot with full optional fields", async () => {
    mockReturningResult = [{
      ...mockLot,
      materialName: "Steel Plate",
      supplierName: "Supplier A",
      unitCost: "10.00",
      totalCost: "1000.00",
    }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createLot({
      lotNumber: "LOT-002",
      materialCode: "MAT-001",
      materialName: "Steel Plate",
      initialQty: 100,
      unit: "kg",
      sourceType: "purchase",
      sourcePOCode: "PO-001",
      supplierLotNumber: "SUP-LOT-001",
      supplierId: 5,
      supplierName: "Supplier A",
      warehouseId: 1,
      locationId: 1,
      locationCode: "WH-01-A-01-01-01",
      productionDate: "2026-01-01",
      expiryDate: "2027-01-01",
      warrantyDate: "2027-06-01",
      unitCost: 10,
      notes: "First batch from Supplier A",
    });
    expect(result).toBeDefined();
  });

  it("createLot validates sourceType enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createLot({
        lotNumber: "LOT-X",
        materialCode: "MAT-001",
        initialQty: 100,
        sourceType: "invalid" as any,
      }),
    ).rejects.toThrow();
  });

  it("createLot rejects empty lotNumber", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createLot({
        lotNumber: "",
        materialCode: "MAT-001",
        initialQty: 100,
        sourceType: "purchase",
      }),
    ).rejects.toThrow();
  });

  it("createLot rejects empty materialCode", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createLot({
        lotNumber: "LOT-Y",
        materialCode: "",
        initialQty: 100,
        sourceType: "purchase",
      }),
    ).rejects.toThrow();
  });

  it("createLot rejects negative initialQty", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createLot({
        lotNumber: "LOT-Z",
        materialCode: "MAT-001",
        initialQty: -5,
        sourceType: "purchase",
      }),
    ).rejects.toThrow();
  });

  it("getLots returns paginated results", async () => {
    mockQueryResult = [{ value: 10 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getLots filters by materialCode", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({ materialCode: "MAT-001" });
    expect(result).toBeDefined();
  });

  it("getLots filters by warehouseId", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({ warehouseId: 1 });
    expect(result).toBeDefined();
  });

  it("getLots filters by status", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({ status: "available" });
    expect(result).toBeDefined();
  });

  it("getLots filters by qcStatus", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({ qcStatus: "passed" });
    expect(result).toBeDefined();
  });

  it("getLots filters by expiringWithinDays", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLots({ expiringWithinDays: 30 });
    expect(result).toBeDefined();
  });

  it("getLot returns lot by id", async () => {
    mockQueryResult = [mockLot];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLot({ id: 1 });
    expect(result).not.toBeNull();
    expect(result!.lotNumber).toBe("LOT-20260101-0001");
  });

  it("getLot returns null for nonexistent id", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getLot({ id: 9999 });
    expect(result).toBeNull();
  });

  it("updateLotStatus transitions to reserved", async () => {
    mockQueryResult = [{ ...mockLot, status: "reserved" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotStatus({ id: 1, status: "reserved" });
    expect(result.status).toBe("reserved");
  });

  it("updateLotStatus transitions to quarantine", async () => {
    mockQueryResult = [{ ...mockLot, status: "quarantine" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotStatus({ id: 1, status: "quarantine" });
    expect(result.status).toBe("quarantine");
  });

  it("updateLotStatus transitions to expired", async () => {
    mockQueryResult = [{ ...mockLot, status: "expired" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotStatus({ id: 1, status: "expired" });
    expect(result.status).toBe("expired");
  });

  it("updateLotStatus transitions to consumed", async () => {
    mockQueryResult = [{ ...mockLot, status: "consumed" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotStatus({ id: 1, status: "consumed" });
    expect(result.status).toBe("consumed");
  });

  it("updateLotStatus transitions to scrapped", async () => {
    mockQueryResult = [{ ...mockLot, status: "scrapped" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotStatus({ id: 1, status: "scrapped" });
    expect(result.status).toBe("scrapped");
  });

  it("updateLotStatus validates status enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateLotStatus({ id: 1, status: "invalid" as any }),
    ).rejects.toThrow();
  });

  it("updateLotStatus throws for nonexistent lot", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateLotStatus({ id: 999, status: "reserved" }),
    ).rejects.toThrow("Lot not found");
  });

  it("updateLotQC sets qcStatus to passed", async () => {
    mockQueryResult = [{ ...mockLot, qcStatus: "passed" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotQC({
      id: 1,
      qcStatus: "passed",
      qcCertificateNumber: "CERT-001",
    });
    expect(result.qcStatus).toBe("passed");
  });

  it("updateLotQC sets qcStatus to failed and auto-quarantines", async () => {
    mockQueryResult = [{ ...mockLot, qcStatus: "failed", status: "quarantine" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotQC({
      id: 1,
      qcStatus: "failed",
    });
    expect(result.qcStatus).toBe("failed");
    expect(result.status).toBe("quarantine");
  });

  it("updateLotQC sets qcStatus to conditional", async () => {
    mockQueryResult = [{ ...mockLot, qcStatus: "conditional" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateLotQC({
      id: 1,
      qcStatus: "conditional",
    });
    expect(result.qcStatus).toBe("conditional");
  });

  it("updateLotQC validates qcStatus enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateLotQC({ id: 1, qcStatus: "invalid" as any }),
    ).rejects.toThrow();
  });

  it("updateLotQC throws for nonexistent lot", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateLotQC({ id: 999, qcStatus: "passed" }),
    ).rejects.toThrow("Lot not found");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 8. Serial number tracking
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — serial numbers", () => {
  it("createSerialNumber returns the created record", async () => {
    mockReturningResult = [mockSerial];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createSerialNumber({
      serialNumber: "SN-001",
      materialCode: "MAT-001",
    });
    expect(result.serialNumber).toBe("SN-001");
    expect(result.status).toBe("in_stock");
  });

  it("createSerialNumber with full optional fields", async () => {
    mockReturningResult = [{
      ...mockSerial,
      lotId: 1,
      lotNumber: "LOT-001",
      warehouseId: 1,
      locationId: 1,
    }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.createSerialNumber({
      serialNumber: "SN-002",
      materialCode: "MAT-001",
      materialName: "Servo Motor",
      lotId: 1,
      lotNumber: "LOT-001",
      warehouseId: 1,
      locationId: 1,
      purchaseOrderCode: "PO-001",
      supplierId: 5,
      warrantyExpiry: "2027-06-01",
    });
    expect(result).toBeDefined();
  });

  it("createSerialNumber rejects empty serialNumber", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createSerialNumber({
        serialNumber: "",
        materialCode: "MAT-001",
      }),
    ).rejects.toThrow();
  });

  it("createSerialNumber rejects empty materialCode", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.createSerialNumber({
        serialNumber: "SN-003",
        materialCode: "",
      }),
    ).rejects.toThrow();
  });

  it("getSerialNumbers returns paginated results", async () => {
    mockQueryResult = [{ value: 5 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
  });

  it("getSerialNumbers filters by materialCode", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({ materialCode: "MAT-001" });
    expect(result).toBeDefined();
  });

  it("getSerialNumbers filters by lotId", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({ lotId: 1 });
    expect(result).toBeDefined();
  });

  it("getSerialNumbers filters by status", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({ status: "in_stock" });
    expect(result).toBeDefined();
  });

  it("getSerialNumbers filters by search", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({ search: "SN-" });
    expect(result).toBeDefined();
  });

  it("getSerialNumbers respects pagination", async () => {
    mockQueryResult = [{ value: 50 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getSerialNumbers({ page: 2, pageSize: 10 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it("updateSerialStatus transitions to allocated", async () => {
    mockQueryResult = [{ ...mockSerial, status: "allocated" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateSerialStatus({
      id: 1, status: "allocated",
    });
    expect(result.status).toBe("allocated");
  });

  it("updateSerialStatus transitions to in_production with project/process", async () => {
    mockQueryResult = [{ ...mockSerial, status: "in_production" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateSerialStatus({
      id: 1,
      status: "in_production",
      projectCode: "PRJ-001",
      processCode: "PROC-01",
      notes: "Sent to assembly line",
    });
    expect(result.status).toBe("in_production");
  });

  it("updateSerialStatus transitions to shipped", async () => {
    mockQueryResult = [{ ...mockSerial, status: "shipped" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateSerialStatus({
      id: 1, status: "shipped",
    });
    expect(result.status).toBe("shipped");
  });

  it("updateSerialStatus transitions to returned", async () => {
    mockQueryResult = [{ ...mockSerial, status: "returned" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateSerialStatus({
      id: 1, status: "returned",
    });
    expect(result.status).toBe("returned");
  });

  it("updateSerialStatus transitions to scrapped", async () => {
    mockQueryResult = [{ ...mockSerial, status: "scrapped" }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.updateSerialStatus({
      id: 1, status: "scrapped",
    });
    expect(result.status).toBe("scrapped");
  });

  it("updateSerialStatus validates status enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateSerialStatus({ id: 1, status: "invalid" as any }),
    ).rejects.toThrow();
  });

  it("updateSerialStatus throws for nonexistent serial", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    await expect(
      caller.warehouse.updateSerialStatus({ id: 999, status: "allocated" }),
    ).rejects.toThrow("Serial number not found");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 9. Stats & dashboard
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — stats & dashboard", () => {
  it("getWarehouseStats returns all stat fields", async () => {
    mockQueryResult = [{ value: 3 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouseStats();
    expect(result).toHaveProperty("totalWarehouses");
    expect(result).toHaveProperty("totalLocations");
    expect(result).toHaveProperty("occupiedLocations");
    expect(result).toHaveProperty("locationUtilization");
    expect(result).toHaveProperty("totalLots");
    expect(result).toHaveProperty("pendingReceipts");
    expect(result).toHaveProperty("pendingIssues");
    expect(result).toHaveProperty("expiringLots");
    expect(result).toHaveProperty("quarantineLots");
  });

  it("getWarehouseStats calculates locationUtilization", async () => {
    // With the mock, totalLocations and occupiedLocations both resolve to mockQueryResult[0].value
    // The stats procedure runs 8 parallel queries; each resolves to mockQueryResult
    mockQueryResult = [{ value: 5 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouseStats();
    // locationUtilization = round(5/5 * 100) = 100
    expect(result.locationUtilization).toBe(100);
  });

  it("getWarehouseStats handles zero locations gracefully", async () => {
    mockQueryResult = [{ value: 0 }];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.getWarehouseStats();
    expect(result.locationUtilization).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 10. Traceability — forward & backward
// ─────────────────────────────────────────────────────────────────────
describe("warehouse — traceability", () => {
  it("traceForward returns lot with empty allocations for new lot", async () => {
    mockQueryResult = [mockLot];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.traceForward({ lotNumber: "LOT-20260101-0001" });
    expect(result.lot).toBeDefined();
  });

  it("traceForward returns null lot for unknown lotNumber", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.traceForward({ lotNumber: "LOT-UNKNOWN" });
    expect(result.lot).toBeNull();
    expect(result.allocations).toEqual([]);
    expect(result.serialNumbers).toEqual([]);
  });

  it("traceBackward returns results filtered by projectCode", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.traceBackward({ projectCode: "PRJ-001" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("traceBackward returns results filtered by sourceDocCode", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.traceBackward({ sourceDocCode: "PO-001" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("traceBackward returns empty array when no matches", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.warehouse.traceBackward({});
    expect(result).toEqual([]);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== procurement.list ====================

describe("pos.procurement.list", () => {
  it("returns sample data with expected structure", async () => {
    const caller = createAdminCaller();
    const result = await caller.pos.procurement.list({
      page: 1,
      pageSize: 20,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);

    const first = result.items[0];
    expect(first).toHaveProperty("poCode");
    expect(first).toHaveProperty("projectCode");
    expect(first).toHaveProperty("itemCode");
    expect(first).toHaveProperty("itemName");
    expect(first).toHaveProperty("specification");
    expect(first).toHaveProperty("leadTime");
    expect(first).toHaveProperty("quantity");
    expect(first).toHaveProperty("unit");
    expect(first).toHaveProperty("suggestedSupplier");
    expect(first).toHaveProperty("priceRange");
    expect(first).toHaveProperty("needDate");
    expect(first).toHaveProperty("riskFlags");
    expect(first).toHaveProperty("rationale");
    expect(first).toHaveProperty("status");
  });

  it("contains 5 sample items", async () => {
    const caller = createAdminCaller();
    const result = await caller.pos.procurement.list({
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(5);
  });
});

// ==================== procurement.engineerConfirm ====================

describe("pos.procurement.engineerConfirm", () => {
  it("returns success for valid confirmation (happy path)", async () => {
    const caller = createAdminCaller();
    const result = await caller.pos.procurement.engineerConfirm({
      id: 1,
      approved: true,
      notes: "规格确认无误",
    });

    expect(result.success).toBe(true);
    expect(result.engineerConfirm).toBe("Approved");
    expect(result.engineerNotes).toBe("规格确认无误");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createAnonymousCaller();

    await expect(
      caller.pos.procurement.engineerConfirm({
        id: 1,
        approved: true,
      })
    ).rejects.toThrow();
  });
});

// ==================== procurement.procurementConfirm ====================

describe("pos.procurement.procurementConfirm", () => {
  it("returns success with PO reference (happy path)", async () => {
    const caller = createAdminCaller();
    const result = await caller.pos.procurement.procurementConfirm({
      id: 1,
      approved: true,
      finalPoRef: "ERP-PO-2026-0200",
    });

    expect(result.success).toBe(true);
    expect(result.procurementConfirm).toBe("Approved");
    expect(result.finalPoRef).toBe("ERP-PO-2026-0200");
  });
});

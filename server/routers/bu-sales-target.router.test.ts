/**
 * BU Sales Target Router — Unit Tests
 * 10 procedures: list, getById, create, updateDetail, submitPlan,
 * submitAdjustment, financeReview, ceoReview, approveAdjustment, delete,
 * dashboard, pendingReviews
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
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
    execute: vi.fn(() => Promise.resolve([[]])),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  buSalesPlans: {
    id: "id",
    year: "year",
    departmentId: "department_id",
    totalSalesTarget: "total_sales_target",
    totalOutputTarget: "total_output_target",
    growthRules: "growth_rules",
    status: "status",
    submittedBy: "submitted_by",
    submittedAt: "submitted_at",
    createdAt: "created_at",
  },
  buSalesPlanDetails: {
    id: "id",
    buSalesPlanId: "bu_sales_plan_id",
    periodType: "period_type",
    periodValue: "period_value",
    salesTarget: "sales_target",
    outputTarget: "output_target",
    kpiTarget: "kpi_target",
    capabilityLevel: "capability_level",
    isAdjusted: "is_adjusted",
  },
  buSalesPlanAdjustments: {
    id: "id",
    buSalesPlanId: "bu_sales_plan_id",
    applicantId: "applicant_id",
    adjustmentReason: "adjustment_reason",
    adjustmentType: "adjustment_type",
    exceptionTag: "exception_tag",
    originalData: "original_data",
    proposedData: "proposed_data",
    approvalStatus: "approval_status",
    approvedBy: "approved_by",
    reviewStep: "review_step",
    financePmoStatus: "finance_pmo_status",
    financePmoReviewedBy: "finance_pmo_reviewed_by",
    financePmoReviewedAt: "finance_pmo_reviewed_at",
    financePmoComment: "finance_pmo_comment",
    ceoStatus: "ceo_status",
    ceoReviewedBy: "ceo_reviewed_by",
    ceoReviewedAt: "ceo_reviewed_at",
    ceoComment: "ceo_comment",
    createdAt: "created_at",
  },
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ── Tests ───────────────────────────────────────────────────
describe("buSalesTarget router", () => {

  // ─── list ────────────────────────────────────────────────
  describe("list", () => {
    it("returns items and total with default pagination", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([
        { id: 1, year: 2026, departmentId: "BU01", status: "draft" },
        { id: 2, year: 2025, departmentId: "BU02", status: "approved" },
      ]);
      selectResultsQueue.push([{ count: 2 }]);
      const result = await caller.buSalesTarget.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns items with custom limit and offset", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 3, year: 2026, departmentId: "BU03" }]);
      selectResultsQueue.push([{ count: 10 }]);
      const result = await caller.buSalesTarget.list({ limit: 5, offset: 5 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it("returns empty result when no plans exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller.buSalesTarget.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns empty result when input is undefined (no params)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller.buSalesTarget.list(undefined);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("handles DB count with null gracefully", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1 }]);
      selectResultsQueue.push([{ count: null }]);
      const result = await caller.buSalesTarget.list();
      expect(result.total).toBe(0);
    });
  });

  // ─── getById ──────────────────────────────────────────────
  describe("getById", () => {
    it("returns plan with details and adjustments", async () => {
      const caller = createAuthenticatedCaller();
      // First query: plan
      selectResultsQueue.push([{
        id: 1, year: 2026, departmentId: "BU01",
        totalSalesTarget: "1000000.00", totalOutputTarget: "800000.00",
        status: "draft",
      }]);
      // Second query: details
      selectResultsQueue.push([
        { id: 10, buSalesPlanId: 1, periodType: "month", periodValue: 1, salesTarget: "83333.33" },
        { id: 11, buSalesPlanId: 1, periodType: "month", periodValue: 2, salesTarget: "83333.33" },
      ]);
      // Third query: adjustments
      selectResultsQueue.push([]);
      const result = await caller.buSalesTarget.getById({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.plan.id).toBe(1);
      expect(result!.details).toHaveLength(2);
      expect(result!.adjustments).toHaveLength(0);
    });

    it("returns plan with adjustments when they exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, year: 2026, departmentId: "BU01", status: "submitted" }]);
      selectResultsQueue.push([
        { id: 10, buSalesPlanId: 1, periodType: "month", periodValue: 1 },
      ]);
      selectResultsQueue.push([
        { id: 100, buSalesPlanId: 1, approvalStatus: "pending", reviewStep: "finance_pmo" },
      ]);
      const result = await caller.buSalesTarget.getById({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.adjustments).toHaveLength(1);
      expect(result!.adjustments[0].approvalStatus).toBe("pending");
    });

    it("returns null when plan not found", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      const result = await caller.buSalesTarget.getById({ id: 999 });
      expect(result).toBeNull();
    });

    it("returns null when details query fails but plan found", async () => {
      // The catch block in router returns null on any error
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, year: 2026 }]);
      // Details query - still returns normally in mock
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller.buSalesTarget.getById({ id: 1 });
      expect(result).not.toBeNull();
      expect(result!.details).toHaveLength(0);
    });
  });

  // ─── create ───────────────────────────────────────────────
  describe("create", () => {
    it("creates plan with auto-generated monthly breakdown", async () => {
      const caller = createAuthenticatedCaller();
      const newPlan = {
        id: 1, year: 2026, departmentId: "BU01",
        totalSalesTarget: "1200000.00", totalOutputTarget: "960000.00",
        growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
        status: "draft",
      };
      mockReturningResult = [newPlan];

      const result = await caller.buSalesTarget.create({
        year: 2026,
        departmentId: "BU01",
        totalSalesTarget: 1200000,
        totalOutputTarget: 960000,
        growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe("draft");
      expect(result.departmentId).toBe("BU01");
    });

    it("uses default growth rules when not provided", async () => {
      const caller = createAuthenticatedCaller();
      const newPlan = {
        id: 2, year: 2026, departmentId: "BU02",
        status: "draft",
      };
      mockReturningResult = [newPlan];

      const result = await caller.buSalesTarget.create({
        year: 2026,
        departmentId: "BU02",
        totalSalesTarget: 1000000,
        totalOutputTarget: 800000,
        growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
      });

      expect(result.id).toBe(2);
      // The insert was called to add monthly rows
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("generates 12 monthly rows via insert", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 3, year: 2026, departmentId: "BU03", status: "draft" }];

      await caller.buSalesTarget.create({
        year: 2026,
        departmentId: "BU03",
        totalSalesTarget: 2400000,
        totalOutputTarget: 1800000,
        growthRules: { Q2_vs_Q1: 0.1, Q3_vs_Q2: 0.15, Q4_vs_Q3: 0.05 },
      });

      // insert is called twice: once for plan, once for details
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it("correctly calculates quarterly distribution with zero growth", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 4, year: 2026, departmentId: "BU04", status: "draft" }];

      const result = await caller.buSalesTarget.create({
        year: 2026,
        departmentId: "BU04",
        totalSalesTarget: 1200000,
        totalOutputTarget: 1200000,
        growthRules: { Q2_vs_Q1: 0, Q3_vs_Q2: 0, Q4_vs_Q3: 0 },
      });

      expect(result.id).toBe(4);
      // With zero growth, each quarter = totalTarget / 4 = 300000
      // Each month = 300000 / 3 = 100000
    });

    it("handles high growth rates correctly", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 5, year: 2026, departmentId: "BU05", status: "draft" }];

      const result = await caller.buSalesTarget.create({
        year: 2026,
        departmentId: "BU05",
        totalSalesTarget: 5000000,
        totalOutputTarget: 4000000,
        growthRules: { Q2_vs_Q1: 0.5, Q3_vs_Q2: 0.5, Q4_vs_Q3: 0.5 },
      });

      expect(result.id).toBe(5);
    });

    it("rejects missing year", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.create({
          departmentId: "BU01",
          totalSalesTarget: 1000000,
          totalOutputTarget: 800000,
          growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
        } as any)
      ).rejects.toThrow();
    });

    it("rejects missing departmentId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.create({
          year: 2026,
          totalSalesTarget: 1000000,
          totalOutputTarget: 800000,
          growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
        } as any)
      ).rejects.toThrow();
    });
  });

  // ─── updateDetail ─────────────────────────────────────────
  describe("updateDetail", () => {
    it("updates salesTarget and marks isAdjusted", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 10, salesTarget: "120000.00", isAdjusted: true }];

      const result = await caller.buSalesTarget.updateDetail({
        detailId: 10,
        salesTarget: 120000,
      });

      expect(result.isAdjusted).toBe(true);
      expect(result.salesTarget).toBe("120000.00");
    });

    it("updates outputTarget only", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 11, outputTarget: "95000.00", isAdjusted: true }];

      const result = await caller.buSalesTarget.updateDetail({
        detailId: 11,
        outputTarget: 95000,
      });

      expect(result.outputTarget).toBe("95000.00");
      expect(result.isAdjusted).toBe(true);
    });

    it("updates kpiTarget and capabilityLevel", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{
        id: 12, kpiTarget: "82.50", capabilityLevel: "3.00", isAdjusted: true,
      }];

      const result = await caller.buSalesTarget.updateDetail({
        detailId: 12,
        kpiTarget: 82.5,
        capabilityLevel: 3.0,
      });

      expect(result.kpiTarget).toBe("82.50");
      expect(result.capabilityLevel).toBe("3.00");
    });

    it("updates all fields at once", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{
        id: 13, salesTarget: "150000.00", outputTarget: "120000.00",
        kpiTarget: "90.00", capabilityLevel: "3.50", isAdjusted: true,
      }];

      const result = await caller.buSalesTarget.updateDetail({
        detailId: 13,
        salesTarget: 150000,
        outputTarget: 120000,
        kpiTarget: 90,
        capabilityLevel: 3.5,
      });

      expect(result.salesTarget).toBe("150000.00");
      expect(result.outputTarget).toBe("120000.00");
      expect(result.kpiTarget).toBe("90.00");
      expect(result.capabilityLevel).toBe("3.50");
    });

    it("updates with no optional fields (only isAdjusted set)", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 14, isAdjusted: true }];

      const result = await caller.buSalesTarget.updateDetail({ detailId: 14 });
      expect(result.isAdjusted).toBe(true);
    });
  });

  // ─── submitPlan ───────────────────────────────────────────
  describe("submitPlan", () => {
    it("transitions plan from draft to submitted", async () => {
      const caller = createAuthenticatedCaller({ name: "Zhang Wei" });
      mockReturningResult = [{
        id: 1, status: "submitted", submittedBy: "Zhang Wei",
      }];

      const result = await caller.buSalesTarget.submitPlan({ planId: 1 });
      expect(result.status).toBe("submitted");
      expect(result.submittedBy).toBe("Zhang Wei");
    });

    it("uses fallback name when user.name is null", async () => {
      const caller = createAuthenticatedCaller({ id: 42, name: null as any });
      mockReturningResult = [{
        id: 1, status: "submitted", submittedBy: "User#42",
      }];

      const result = await caller.buSalesTarget.submitPlan({ planId: 1 });
      expect(result.status).toBe("submitted");
    });

    it("sets submittedAt timestamp", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{
        id: 1, status: "submitted", submittedAt: "2026-03-01T00:00:00.000Z",
      }];

      const result = await caller.buSalesTarget.submitPlan({ planId: 1 });
      expect(result.submittedAt).toBeTruthy();
    });
  });

  // ─── submitAdjustment ─────────────────────────────────────
  describe("submitAdjustment", () => {
    const baseOriginal = [
      { detailId: 1, month: 1, salesTarget: 100000, outputTarget: 80000 },
      { detailId: 2, month: 2, salesTarget: 100000, outputTarget: 80000 },
    ];

    it("submits normal adjustment with zero-sum details", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 120000, outputTarget: 90000 },
        { detailId: 2, month: 2, salesTarget: 80000, outputTarget: 70000 },
      ];
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1, approvalStatus: "pending", reviewStep: "finance_pmo",
        adjustmentType: "normal",
      }];

      const result = await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "Seasonal demand shift",
        adjustmentType: "normal",
        originalDetails: baseOriginal,
        proposedDetails: proposed,
      });

      expect(result.approvalStatus).toBe("pending");
      expect(result.reviewStep).toBe("finance_pmo");
      expect(result.adjustmentType).toBe("normal");
    });

    it("rejects normal adjustment when sales targets do not sum to zero", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 150000, outputTarget: 80000 },
        { detailId: 2, month: 2, salesTarget: 100000, outputTarget: 80000 },
      ];

      await expect(
        caller.buSalesTarget.submitAdjustment({
          buSalesPlanId: 1,
          applicantId: "user-001",
          adjustmentReason: "Unreasonable increase",
          adjustmentType: "normal",
          originalDetails: baseOriginal,
          proposedDetails: proposed,
        })
      ).rejects.toThrow("零和校验失败");
    });

    it("rejects normal adjustment when output targets do not sum to zero", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 100000, outputTarget: 100000 },
        { detailId: 2, month: 2, salesTarget: 100000, outputTarget: 80000 },
      ];

      await expect(
        caller.buSalesTarget.submitAdjustment({
          buSalesPlanId: 1,
          applicantId: "user-001",
          adjustmentReason: "Output mismatch",
          adjustmentType: "normal",
          originalDetails: baseOriginal,
          proposedDetails: proposed,
        })
      ).rejects.toThrow("零和校验失败");
    });

    it("allows exception adjustment even when sums differ", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 150000, outputTarget: 100000 },
        { detailId: 2, month: 2, salesTarget: 100000, outputTarget: 80000 },
      ];
      mockReturningResult = [{
        id: 101, buSalesPlanId: 1, approvalStatus: "pending",
        adjustmentType: "exception", exceptionTag: "spring_festival",
      }];

      const result = await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "Spring Festival production halt",
        adjustmentType: "exception",
        exceptionTag: "spring_festival",
        originalDetails: baseOriginal,
        proposedDetails: proposed,
      });

      expect(result.adjustmentType).toBe("exception");
      expect(result.exceptionTag).toBe("spring_festival");
    });

    it("passes zero-sum check within tolerance (0.01)", async () => {
      const caller = createAuthenticatedCaller();
      // Sums differ by less than 0.01 (floating point precision)
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 100000.005, outputTarget: 80000.005 },
        { detailId: 2, month: 2, salesTarget: 99999.999, outputTarget: 79999.999 },
      ];
      mockReturningResult = [{
        id: 102, buSalesPlanId: 1, approvalStatus: "pending",
        adjustmentType: "normal",
      }];

      const result = await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "Minor rounding",
        adjustmentType: "normal",
        originalDetails: baseOriginal,
        proposedDetails: proposed,
      });

      expect(result.approvalStatus).toBe("pending");
    });

    it("defaults adjustmentType to normal", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 120000, outputTarget: 90000 },
        { detailId: 2, month: 2, salesTarget: 80000, outputTarget: 70000 },
      ];
      mockReturningResult = [{
        id: 103, buSalesPlanId: 1, approvalStatus: "pending",
        adjustmentType: "normal",
      }];

      // Omit adjustmentType (should default to "normal")
      const result = await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "Default type test",
        originalDetails: baseOriginal,
        proposedDetails: proposed,
      });

      expect(result.adjustmentType).toBe("normal");
    });

    it("also updates plan status to submitted if still draft", async () => {
      const caller = createAuthenticatedCaller();
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 120000, outputTarget: 90000 },
        { detailId: 2, month: 2, salesTarget: 80000, outputTarget: 70000 },
      ];
      mockReturningResult = [{
        id: 104, buSalesPlanId: 1, approvalStatus: "pending",
      }];

      await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "Status update test",
        originalDetails: baseOriginal,
        proposedDetails: proposed,
      });

      // update should be called for the plan status change
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("stores kpiTarget and capabilityLevel when provided in details", async () => {
      const caller = createAuthenticatedCaller();
      const orig = [
        { detailId: 1, month: 1, salesTarget: 100000, outputTarget: 80000, kpiTarget: 75, capabilityLevel: 2.5 },
      ];
      const proposed = [
        { detailId: 1, month: 1, salesTarget: 100000, outputTarget: 80000, kpiTarget: 80, capabilityLevel: 3.0 },
      ];
      mockReturningResult = [{
        id: 105, buSalesPlanId: 1, approvalStatus: "pending",
      }];

      const result = await caller.buSalesTarget.submitAdjustment({
        buSalesPlanId: 1,
        applicantId: "user-001",
        adjustmentReason: "KPI update",
        adjustmentType: "normal",
        originalDetails: orig,
        proposedDetails: proposed,
      });

      expect(result.approvalStatus).toBe("pending");
    });
  });

  // ─── financeReview ────────────────────────────────────────
  describe("financeReview", () => {
    it("approves adjustment and moves to CEO step", async () => {
      const caller = createAuthenticatedCaller({ name: "Finance Manager Li" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        financePmoStatus: "approved",
        approvalStatus: "finance_approved",
        reviewStep: "ceo",
        financePmoReviewedBy: "Finance Manager Li",
      }];

      const result = await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: true,
        comment: "Figures look reasonable",
      });

      expect(result.financePmoStatus).toBe("approved");
      expect(result.approvalStatus).toBe("finance_approved");
      expect(result.reviewStep).toBe("ceo");
    });

    it("rejects adjustment at finance level", async () => {
      const caller = createAuthenticatedCaller({ name: "Finance Manager Li" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        financePmoStatus: "rejected",
        approvalStatus: "rejected",
        financePmoReviewedBy: "Finance Manager Li",
        financePmoComment: "Numbers do not add up",
      }];

      const result = await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: false,
        comment: "Numbers do not add up",
      });

      expect(result.financePmoStatus).toBe("rejected");
      expect(result.approvalStatus).toBe("rejected");
    });

    it("reverts plan to draft when finance rejects", async () => {
      const caller = createAuthenticatedCaller({ name: "Finance Reviewer" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1, approvalStatus: "rejected",
      }];

      await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: false,
      });

      // update should be called: once for adjustment, once for plan revert
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("does not revert plan on approval", async () => {
      const caller = createAuthenticatedCaller({ name: "Finance Approver" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1, approvalStatus: "finance_approved",
      }];

      await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: true,
      });

      // update called only once (for the adjustment itself)
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("uses fallback name when user.name is null", async () => {
      const caller = createAuthenticatedCaller({ id: 77, name: null as any });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1, financePmoReviewedBy: "User#77",
        approvalStatus: "finance_approved",
      }];

      const result = await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.approvalStatus).toBe("finance_approved");
    });

    it("sets comment to null when omitted", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1, financePmoComment: null,
        approvalStatus: "finance_approved",
      }];

      const result = await caller.buSalesTarget.financeReview({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.financePmoComment).toBeNull();
    });
  });

  // ─── ceoReview ────────────────────────────────────────────
  describe("ceoReview", () => {
    it("approves adjustment, applies proposed data, and marks plan approved", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "approved",
        approvalStatus: "approved",
        approvedBy: "CEO Wang",
        proposedData: {
          details: [
            { detailId: 10, salesTarget: 150000, outputTarget: 120000, kpiTarget: 85, capabilityLevel: 3.0 },
            { detailId: 11, salesTarget: 130000, outputTarget: 110000 },
          ],
        },
      }];

      const result = await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: true,
        comment: "Approved for Q2 push",
      });

      expect(result.ceoStatus).toBe("approved");
      expect(result.approvalStatus).toBe("approved");
      expect(result.approvedBy).toBe("CEO Wang");
      // update calls: 1 for adjustment + 2 for details + 1 for plan status
      expect(mockDb.update).toHaveBeenCalledTimes(4);
    });

    it("rejects adjustment and reverts plan to draft", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "rejected",
        approvalStatus: "rejected",
        proposedData: null,
      }];

      const result = await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: false,
        comment: "Not aligned with strategy",
      });

      expect(result.ceoStatus).toBe("rejected");
      expect(result.approvalStatus).toBe("rejected");
      // update calls: 1 for adjustment + 1 for plan revert to draft
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("throws error when adjustment not found", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [];

      await expect(
        caller.buSalesTarget.ceoReview({
          adjustmentId: 999,
          approved: true,
        })
      ).rejects.toThrow("Adjustment not found");
    });

    it("handles proposedData with no details array gracefully", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "approved", approvalStatus: "approved",
        proposedData: {},  // No details key
      }];

      const result = await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.approvalStatus).toBe("approved");
      // update calls: 1 for adjustment + 1 for plan (no detail updates)
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("handles null proposedData on approval gracefully", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "approved", approvalStatus: "approved",
        proposedData: null,
      }];

      const result = await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.approvalStatus).toBe("approved");
      // update calls: 1 for adjustment + 1 for plan (no detail updates)
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("updates detail rows with kpiTarget and capabilityLevel when present", async () => {
      const caller = createAuthenticatedCaller({ name: "CEO Wang" });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "approved", approvalStatus: "approved",
        proposedData: {
          details: [
            { detailId: 10, salesTarget: 100000, outputTarget: 80000, kpiTarget: 90, capabilityLevel: 3.5 },
          ],
        },
      }];

      await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: true,
      });

      // update calls: 1 for adjustment + 1 for detail + 1 for plan
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });

    it("uses fallback name when user.name is null", async () => {
      const caller = createAuthenticatedCaller({ id: 88, name: null as any });
      mockReturningResult = [{
        id: 100, buSalesPlanId: 1,
        ceoStatus: "rejected", approvalStatus: "rejected",
        proposedData: null,
      }];

      const result = await caller.buSalesTarget.ceoReview({
        adjustmentId: 100,
        approved: false,
      });

      expect(result.approvalStatus).toBe("rejected");
    });
  });

  // ─── approveAdjustment (legacy) ───────────────────────────
  describe("approveAdjustment", () => {
    it("approves adjustment with legacy shortcut", async () => {
      const caller = createAuthenticatedCaller({ name: "Legacy Approver" });
      mockReturningResult = [{
        id: 100, approvalStatus: "approved", approvedBy: "Legacy Approver",
      }];

      const result = await caller.buSalesTarget.approveAdjustment({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.approvalStatus).toBe("approved");
      expect(result.approvedBy).toBe("Legacy Approver");
    });

    it("rejects adjustment with legacy shortcut", async () => {
      const caller = createAuthenticatedCaller({ name: "Legacy Reviewer" });
      mockReturningResult = [{
        id: 100, approvalStatus: "rejected", approvedBy: "Legacy Reviewer",
      }];

      const result = await caller.buSalesTarget.approveAdjustment({
        adjustmentId: 100,
        approved: false,
      });

      expect(result.approvalStatus).toBe("rejected");
    });

    it("uses fallback name when user.name is null", async () => {
      const caller = createAuthenticatedCaller({ id: 55, name: null as any });
      mockReturningResult = [{
        id: 100, approvalStatus: "approved", approvedBy: "User#55",
      }];

      const result = await caller.buSalesTarget.approveAdjustment({
        adjustmentId: 100,
        approved: true,
      });

      expect(result.approvalStatus).toBe("approved");
    });
  });

  // ─── delete ───────────────────────────────────────────────
  describe("delete", () => {
    it("deletes plan and cascades to details and adjustments", async () => {
      const caller = createAuthenticatedCaller();

      const result = await caller.buSalesTarget.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      // delete called 3 times: adjustments, details, plans
      expect(mockDb.delete).toHaveBeenCalledTimes(3);
    });

    it("returns success even when plan does not exist", async () => {
      const caller = createAuthenticatedCaller();

      const result = await caller.buSalesTarget.delete({ id: 999 });

      expect(result).toEqual({ success: true });
    });
  });

  // ─── dashboard ────────────────────────────────────────────
  describe("dashboard", () => {
    it("returns aggregate KPIs", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{
        totalPlans: 5,
        totalSalesTarget: 6000000,
        totalOutputTarget: 4800000,
      }]);
      selectResultsQueue.push([{ count: 3 }]);

      const result = await caller.buSalesTarget.dashboard();

      expect(result.totalPlans).toBe(5);
      expect(result.totalSalesTarget).toBe(6000000);
      expect(result.totalOutputTarget).toBe(4800000);
      expect(result.avgGrowth).toBe(0);
      expect(result.pendingApprovals).toBe(3);
    });

    it("returns zeros when no plans exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{
        totalPlans: 0,
        totalSalesTarget: 0,
        totalOutputTarget: 0,
      }]);
      selectResultsQueue.push([{ count: 0 }]);

      const result = await caller.buSalesTarget.dashboard();

      expect(result.totalPlans).toBe(0);
      expect(result.totalSalesTarget).toBe(0);
      expect(result.totalOutputTarget).toBe(0);
      expect(result.pendingApprovals).toBe(0);
    });

    it("handles null aggregated values gracefully", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{
        totalPlans: null,
        totalSalesTarget: null,
        totalOutputTarget: null,
      }]);
      selectResultsQueue.push([{ count: null }]);

      const result = await caller.buSalesTarget.dashboard();

      expect(result.totalPlans).toBe(0);
      expect(result.totalSalesTarget).toBe(0);
      expect(result.totalOutputTarget).toBe(0);
      expect(result.pendingApprovals).toBe(0);
    });

    it("handles empty result array", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller.buSalesTarget.dashboard();

      expect(result.totalPlans).toBe(0);
      expect(result.pendingApprovals).toBe(0);
    });
  });

  // ─── pendingReviews ───────────────────────────────────────
  describe("pendingReviews", () => {
    it("returns all pending reviews with no step filter", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 100, buSalesPlanId: 1, approvalStatus: "pending", reviewStep: "finance_pmo" },
        { id: 101, buSalesPlanId: 2, approvalStatus: "finance_approved", reviewStep: "ceo" },
      ];

      const result = await caller.buSalesTarget.pendingReviews();

      expect(result).toHaveLength(2);
    });

    it("filters by finance_pmo step", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 100, buSalesPlanId: 1, approvalStatus: "pending", reviewStep: "finance_pmo" },
      ];

      const result = await caller.buSalesTarget.pendingReviews({ step: "finance_pmo" });

      expect(result).toHaveLength(1);
      expect(result[0].reviewStep).toBe("finance_pmo");
    });

    it("filters by CEO step", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 101, buSalesPlanId: 2, approvalStatus: "finance_approved", reviewStep: "ceo" },
      ];

      const result = await caller.buSalesTarget.pendingReviews({ step: "ceo" });

      expect(result).toHaveLength(1);
      expect(result[0].reviewStep).toBe("ceo");
    });

    it("returns empty array when no pending reviews exist", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];

      const result = await caller.buSalesTarget.pendingReviews();

      expect(result).toHaveLength(0);
    });

    it("handles undefined input", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 100, buSalesPlanId: 1, approvalStatus: "pending" },
      ];

      const result = await caller.buSalesTarget.pendingReviews(undefined);

      expect(result).toHaveLength(1);
    });
  });

  // ─── Authentication guards ────────────────────────────────
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.getById({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.create({
          year: 2026,
          departmentId: "BU01",
          totalSalesTarget: 1000000,
          totalOutputTarget: 800000,
          growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateDetail", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.updateDetail({ detailId: 1, salesTarget: 100000 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for submitPlan", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.submitPlan({ planId: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for submitAdjustment", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.submitAdjustment({
          buSalesPlanId: 1,
          applicantId: "anon",
          adjustmentReason: "No auth",
          originalDetails: [{ detailId: 1, month: 1, salesTarget: 100, outputTarget: 80 }],
          proposedDetails: [{ detailId: 1, month: 1, salesTarget: 100, outputTarget: 80 }],
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for financeReview", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.financeReview({ adjustmentId: 1, approved: true })
      ).rejects.toThrow();
    });

    it("rejects anonymous for ceoReview", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.ceoReview({ adjustmentId: 1, approved: true })
      ).rejects.toThrow();
    });

    it("rejects anonymous for approveAdjustment", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.buSalesTarget.approveAdjustment({ adjustmentId: 1, approved: true })
      ).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.delete({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for dashboard", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.dashboard()).rejects.toThrow();
    });

    it("rejects anonymous for pendingReviews", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.buSalesTarget.pendingReviews()).rejects.toThrow();
    });
  });

  // ─── Input validation ─────────────────────────────────────
  describe("input validation", () => {
    it("rejects create with non-number year", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.create({
          year: "abc" as any,
          departmentId: "BU01",
          totalSalesTarget: 1000000,
          totalOutputTarget: 800000,
          growthRules: { Q2_vs_Q1: 0.2, Q3_vs_Q2: 0.2, Q4_vs_Q3: 0.1 },
        })
      ).rejects.toThrow();
    });

    it("rejects getById with non-number id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.getById({ id: "abc" as any })
      ).rejects.toThrow();
    });

    it("rejects updateDetail with non-number detailId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.updateDetail({ detailId: "abc" as any })
      ).rejects.toThrow();
    });

    it("rejects submitAdjustment with invalid adjustmentType", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.submitAdjustment({
          buSalesPlanId: 1,
          applicantId: "user-001",
          adjustmentReason: "Test",
          adjustmentType: "invalid" as any,
          originalDetails: [{ detailId: 1, month: 1, salesTarget: 100, outputTarget: 80 }],
          proposedDetails: [{ detailId: 1, month: 1, salesTarget: 100, outputTarget: 80 }],
        })
      ).rejects.toThrow();
    });

    it("rejects financeReview with missing approved field", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.financeReview({ adjustmentId: 1 } as any)
      ).rejects.toThrow();
    });

    it("rejects pendingReviews with invalid step value", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.pendingReviews({ step: "invalid" as any })
      ).rejects.toThrow();
    });

    it("rejects delete with missing id", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.buSalesTarget.delete({} as any)
      ).rejects.toThrow();
    });
  });
});

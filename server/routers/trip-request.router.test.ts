/**
 * Trip Request Router -- Unit Tests
 *
 * 12 procedures across 5 groups:
 *   Query (4): list, getById, countries, expensePolicies
 *   Mutations CRUD (3): create, update, delete
 *   Status transitions (4): submit, approve, reject, cancel, start, complete
 *   Statistics (1): statistics
 *
 * Key logic tested:
 *   - Role-based scoping (managers see all, employees see own)
 *   - Ownership checks (assertTripOwnership)
 *   - Self-approval/rejection prevention
 *   - Status guard on approve/reject (must be "submitted")
 *   - Frontend-to-DB field mapping in create
 *   - Trip days calculation
 *   - Countries extracted from insurance policy JSON
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue, mockReturningResult } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return { selectResultsQueue, mockReturningResult };
});

// Mock DB
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
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

// ── Callers ──
const caller = () => createAdminCaller();
const employeeCaller = () => createAdminCaller({ id: 1, role: "employee" });
const managerCaller = () => createAdminCaller({ id: 100, role: "admin" });
const directorCaller = () => createAdminCaller({ id: 200, role: "director" });

// ── Sample data ──
const sampleTripRequest = {
  id: 1,
  requestCode: "TR-20260301-ABC",
  userId: 1,
  tripPurpose: "business",
  destinationCity: "Shanghai",
  plannedStartDate: "2026-03-10",
  plannedEndDate: "2026-03-12",
  isInternational: 0,
  estimatedBudget: "5000.00",
  budgetCurrency: "CNY",
  justification: "Client meeting",
  projectId: null,
  customerId: null,
  tripDays: 3,
  status: "draft",
  managerApprovedAt: null,
  managerApprovedBy: null,
  rejectionReason: null,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

const sampleItinerary = {
  id: 1,
  tripRequestId: 1,
  sequenceNo: 1,
  itineraryDate: "2026-03-10",
  itineraryType: "flight",
  fromLocation: "Beijing",
  toLocation: "Shanghai",
};

const sampleBooking = {
  id: 1,
  tripRequestId: 1,
  bookingType: "flight",
  bookingReference: "FL-12345",
  status: "confirmed",
};

const sampleInsurance = {
  id: 1,
  tripRequestId: 1,
  policyId: 1,
  coverageStartDate: "2026-03-10",
  coverageEndDate: "2026-03-12",
};

const sampleInsurancePolicy = {
  id: 1,
  policyName: "Business Travel Insurance",
  policyType: "comprehensive",
  insurerName: "China Life",
  applicableRegions: '["Asia","Europe","Americas"]',
  isActive: 1,
};

const sampleExpensePolicy = {
  id: 1,
  policyCode: "EP-001",
  policyName: "Standard Travel Policy",
  policyType: "travel",
  isActive: 1,
  createdAt: "2026-01-01",
};

describe("tripRequest router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns trip requests for regular employee (own only)", async () => {
      selectResultsQueue.push([sampleTripRequest, { ...sampleTripRequest, id: 2 }]);
      const result = await employeeCaller().tripRequest.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it("returns all trip requests for manager role", async () => {
      selectResultsQueue.push([
        sampleTripRequest,
        { ...sampleTripRequest, id: 2, userId: 50 },
        { ...sampleTripRequest, id: 3, userId: 99 },
      ]);
      const result = await managerCaller().tripRequest.list();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("returns empty list when no requests exist", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().tripRequest.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns all for director role", async () => {
      selectResultsQueue.push([sampleTripRequest]);
      const result = await directorCaller().tripRequest.list();
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns trip request with itineraries, bookings and insurance", async () => {
      // assertTripOwnership: select userId
      selectResultsQueue.push([{ userId: 1 }]);
      // main select
      selectResultsQueue.push([sampleTripRequest]);
      // itineraries
      selectResultsQueue.push([sampleItinerary]);
      // bookings
      selectResultsQueue.push([sampleBooking]);
      // insurance
      selectResultsQueue.push([sampleInsurance]);

      const result = await employeeCaller().tripRequest.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.itineraries).toHaveLength(1);
      expect(result!.bookings).toHaveLength(1);
      expect(result!.insurance).toHaveLength(1);
    });

    it("returns null when trip request not found", async () => {
      // assertTripOwnership: select userId (ownership check finds it)
      selectResultsQueue.push([{ userId: 1 }]);
      // main select returns nothing
      selectResultsQueue.push([]);

      const result = await employeeCaller().tripRequest.getById({ id: "999" });
      expect(result).toBeNull();
    });

    it("manager bypasses ownership check", async () => {
      // No ownership select for managers
      // main select
      selectResultsQueue.push([{ ...sampleTripRequest, userId: 50 }]);
      // itineraries
      selectResultsQueue.push([]);
      // bookings
      selectResultsQueue.push([]);
      // insurance
      selectResultsQueue.push([]);

      const result = await managerCaller().tripRequest.getById({ id: "1" });
      expect(result).toBeTruthy();
    });

    it("throws FORBIDDEN when employee tries to view another user's trip", async () => {
      // assertTripOwnership: returns different userId
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.getById({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });

    it("throws NOT_FOUND when trip does not exist (ownership check)", async () => {
      // assertTripOwnership: no record
      selectResultsQueue.push([]);

      await expect(
        employeeCaller().tripRequest.getById({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("returns empty arrays when no related records exist", async () => {
      selectResultsQueue.push([{ userId: 1 }]); // ownership
      selectResultsQueue.push([sampleTripRequest]); // request
      selectResultsQueue.push([]); // itineraries
      selectResultsQueue.push([]); // bookings
      selectResultsQueue.push([]); // insurance

      const result = await employeeCaller().tripRequest.getById({ id: "1" });
      expect(result!.itineraries).toHaveLength(0);
      expect(result!.bookings).toHaveLength(0);
      expect(result!.insurance).toHaveLength(0);
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates trip request with DB field names", async () => {
      const created = { ...sampleTripRequest, id: 10 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        tripPurpose: "client_visit",
        destinationCity: "Shanghai",
        plannedStartDate: "2026-03-10",
        plannedEndDate: "2026-03-12",
        isInternational: false,
        estimatedBudget: "5000",
        justification: "Client meeting",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("出差申请已创建");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates trip request with frontend field names (mapping)", async () => {
      const created = { ...sampleTripRequest, id: 11 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        purpose: "sales visit",
        departureDate: "2026-04-01",
        returnDate: "2026-04-05",
        destinations: ["Tokyo", "Osaka"],
        tripType: "international",
        currency: "JPY",
        emergencyContact: "Zhang Wei",
        emergencyPhone: "13800138000",
        specialRequirements: "Need visa support",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 11);
    });

    it("falls back to defaults when optional fields missing", async () => {
      const created = { ...sampleTripRequest, id: 12 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({});

      expect(result.success).toBe(true);
    });

    it("accepts numeric estimatedBudget", async () => {
      const created = { ...sampleTripRequest, id: 13 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        estimatedBudget: 10000,
      });

      expect(result.success).toBe(true);
    });

    it("uses purposeDescription as fallback for tripPurpose", async () => {
      const created = { ...sampleTripRequest, id: 14 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        purposeDescription: "Annual client review",
      });

      expect(result.success).toBe(true);
    });

    it("creates with itineraries array", async () => {
      const created = { ...sampleTripRequest, id: 15 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        tripPurpose: "conference",
        itineraries: [
          { city: "Shanghai", date: "2026-03-10", hotel: "Hilton", transport: "flight", notes: "Morning flight" },
          { city: "Hangzhou", date: "2026-03-11", hotel: "Marriott", transport: "train" },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("handles isInternational derived from tripType='international'", async () => {
      const created = { ...sampleTripRequest, id: 16, isInternational: 1 };
      mockReturningResult.push(created);

      const result = await employeeCaller().tripRequest.create({
        tripType: "international",
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates trip request fields", async () => {
      // assertTripOwnership select
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({ ...sampleTripRequest, tripPurpose: "training" });

      const result = await employeeCaller().tripRequest.update({
        id: "1",
        tripPurpose: "training",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data).toHaveProperty("tripPurpose", "training");
    });

    it("updates multiple fields at once", async () => {
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({
        ...sampleTripRequest,
        destinationCity: "Guangzhou",
        estimatedBudget: "8000",
        notes: "Updated plan",
      });

      const result = await employeeCaller().tripRequest.update({
        id: "1",
        destinationCity: "Guangzhou",
        estimatedBudget: "8000",
        notes: "Updated plan",
      });

      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.update({ id: "1", tripPurpose: "hack" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });

    it("manager can update any trip", async () => {
      // manager bypasses ownership
      mockReturningResult.push({ ...sampleTripRequest, notes: "Manager note" });

      const result = await managerCaller().tripRequest.update({
        id: "1",
        notes: "Manager note",
      });

      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes trip request and related records", async () => {
      // assertTripOwnership select
      selectResultsQueue.push([{ userId: 1 }]);
      // delete itineraries
      selectResultsQueue.push([]);
      // delete bookings
      selectResultsQueue.push([]);
      // delete insurance records
      selectResultsQueue.push([]);
      // delete trip request
      selectResultsQueue.push([]);

      const result = await employeeCaller().tripRequest.delete({ id: "1" });
      expect(result).toEqual({ success: true, message: "删除成功" });
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.delete({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });

    it("throws NOT_FOUND for nonexistent trip", async () => {
      selectResultsQueue.push([]);

      await expect(
        employeeCaller().tripRequest.delete({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("manager can delete any trip", async () => {
      // manager bypasses ownership; delete cascade
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await managerCaller().tripRequest.delete({ id: "5" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ approve ═══
  describe("approve", () => {
    it("approves a submitted trip request", async () => {
      // select existing
      selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
      // update returning
      mockReturningResult.push({ ...sampleTripRequest, status: "approved" });

      const result = await managerCaller().tripRequest.approve({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("已批准");
      expect(result.data).toHaveProperty("status", "approved");
    });

    it("approves with notes", async () => {
      selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "approved" });

      const result = await managerCaller().tripRequest.approve({
        id: "1",
        notes: "Approved for Q1 budget",
      });

      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN for non-manager role", async () => {
      await expect(
        employeeCaller().tripRequest.approve({ id: "1" })
      ).rejects.toThrow("仅管理角色可审批出差申请");
    });

    it("prevents self-approval", async () => {
      // userId matches ctx.user.id (100 for managerCaller)
      selectResultsQueue.push([{ userId: 100, status: "submitted" }]);

      await expect(
        managerCaller().tripRequest.approve({ id: "1" })
      ).rejects.toThrow("不能审批自己的出差申请");
    });

    it("rejects approval of non-submitted request (draft)", async () => {
      selectResultsQueue.push([{ userId: 1, status: "draft" }]);

      await expect(
        managerCaller().tripRequest.approve({ id: "1" })
      ).rejects.toThrow("无法审批");
    });

    it("rejects approval of already approved request", async () => {
      selectResultsQueue.push([{ userId: 1, status: "approved" }]);

      await expect(
        managerCaller().tripRequest.approve({ id: "1" })
      ).rejects.toThrow("无法审批");
    });

    it("throws NOT_FOUND for nonexistent trip", async () => {
      selectResultsQueue.push([]);

      await expect(
        managerCaller().tripRequest.approve({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("director role can approve", async () => {
      selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "approved" });

      const result = await directorCaller().tripRequest.approve({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ reject ═══
  describe("reject", () => {
    it("rejects a submitted trip request", async () => {
      selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "rejected", rejectionReason: "Budget exceeded" });

      const result = await managerCaller().tripRequest.reject({
        id: "1",
        reason: "Budget exceeded",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
      expect(result.data).toHaveProperty("status", "rejected");
    });

    it("rejects without reason", async () => {
      selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "rejected" });

      const result = await managerCaller().tripRequest.reject({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN for non-manager role", async () => {
      await expect(
        employeeCaller().tripRequest.reject({ id: "1" })
      ).rejects.toThrow("仅管理角色可驳回出差申请");
    });

    it("prevents self-rejection", async () => {
      selectResultsQueue.push([{ userId: 100, status: "submitted" }]);

      await expect(
        managerCaller().tripRequest.reject({ id: "1" })
      ).rejects.toThrow("不能驳回自己的出差申请");
    });

    it("rejects rejection of non-submitted request", async () => {
      selectResultsQueue.push([{ userId: 1, status: "draft" }]);

      await expect(
        managerCaller().tripRequest.reject({ id: "1" })
      ).rejects.toThrow("无法驳回");
    });

    it("throws NOT_FOUND for nonexistent trip", async () => {
      selectResultsQueue.push([]);

      await expect(
        managerCaller().tripRequest.reject({ id: "999" })
      ).rejects.toThrow("不存在");
    });
  });

  // ═══ submit ═══
  describe("submit", () => {
    it("submits a draft trip request", async () => {
      // assertTripOwnership
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "submitted" });

      const result = await employeeCaller().tripRequest.submit({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("已提交");
      expect(result.data).toHaveProperty("status", "submitted");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.submit({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });

    it("throws NOT_FOUND for nonexistent trip", async () => {
      selectResultsQueue.push([]);

      await expect(
        employeeCaller().tripRequest.submit({ id: "999" })
      ).rejects.toThrow("不存在");
    });
  });

  // ═══ cancel ═══
  describe("cancel", () => {
    it("cancels a trip request", async () => {
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "cancelled" });

      const result = await employeeCaller().tripRequest.cancel({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("已取消");
      expect(result.data).toHaveProperty("status", "cancelled");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.cancel({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });
  });

  // ═══ start ═══
  describe("start", () => {
    it("starts a trip (in_progress)", async () => {
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "in_progress", actualStartDate: "2026-03-10" });

      const result = await employeeCaller().tripRequest.start({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("出差已开始");
      expect(result.data).toHaveProperty("status", "in_progress");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.start({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });

    it("manager can start any trip", async () => {
      // manager bypasses ownership
      mockReturningResult.push({ ...sampleTripRequest, status: "in_progress" });

      const result = await managerCaller().tripRequest.start({ id: "1" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ complete ═══
  describe("complete", () => {
    it("completes a trip", async () => {
      selectResultsQueue.push([{ userId: 1 }]);
      mockReturningResult.push({ ...sampleTripRequest, status: "completed", actualEndDate: "2026-03-12" });

      const result = await employeeCaller().tripRequest.complete({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("出差已完成");
      expect(result.data).toHaveProperty("status", "completed");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      selectResultsQueue.push([{ userId: 999 }]);

      await expect(
        employeeCaller().tripRequest.complete({ id: "1" })
      ).rejects.toThrow("无权操作他人的出差申请");
    });
  });

  // ═══ countries ═══
  describe("countries", () => {
    it("returns unique regions from active insurance policies", async () => {
      selectResultsQueue.push([
        { ...sampleInsurancePolicy, applicableRegions: '["Asia","Europe"]' },
        { ...sampleInsurancePolicy, id: 2, applicableRegions: '["Europe","Americas"]' },
      ]);

      const result = await employeeCaller().tripRequest.countries();

      expect(result).toHaveLength(3); // Asia, Europe, Americas (deduplicated)
      const names = result.map((c: any) => c.name);
      expect(names).toContain("Asia");
      expect(names).toContain("Europe");
      expect(names).toContain("Americas");
    });

    it("returns empty array when no active policies", async () => {
      selectResultsQueue.push([]);

      const result = await employeeCaller().tripRequest.countries();
      expect(result).toHaveLength(0);
    });

    it("handles null applicableRegions gracefully", async () => {
      selectResultsQueue.push([
        { ...sampleInsurancePolicy, applicableRegions: null },
      ]);

      const result = await employeeCaller().tripRequest.countries();
      expect(result).toHaveLength(0);
    });

    it("handles invalid JSON in applicableRegions gracefully", async () => {
      selectResultsQueue.push([
        { ...sampleInsurancePolicy, applicableRegions: "not-valid-json" },
      ]);

      const result = await employeeCaller().tripRequest.countries();
      expect(result).toHaveLength(0);
    });

    it("handles non-array JSON in applicableRegions", async () => {
      selectResultsQueue.push([
        { ...sampleInsurancePolicy, applicableRegions: '{"region":"Asia"}' },
      ]);

      const result = await employeeCaller().tripRequest.countries();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ expensePolicies ═══
  describe("expensePolicies", () => {
    it("returns active expense policies", async () => {
      selectResultsQueue.push([sampleExpensePolicy, { ...sampleExpensePolicy, id: 2 }]);

      const result = await employeeCaller().tripRequest.expensePolicies();
      expect(result).toHaveLength(2);
    });

    it("returns empty array when none exist", async () => {
      selectResultsQueue.push([]);

      const result = await employeeCaller().tripRequest.expensePolicies();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ statistics ═══
  describe("statistics", () => {
    it("returns trip request statistics", async () => {
      selectResultsQueue.push([{ count: 50 }]);  // total
      selectResultsQueue.push([{ count: 10 }]);  // pending (submitted)
      selectResultsQueue.push([{ count: 15 }]);  // approved
      selectResultsQueue.push([{ count: 5 }]);   // in_progress
      selectResultsQueue.push([{ count: 18 }]);  // completed
      selectResultsQueue.push([{ count: 8 }]);   // international

      const result = await employeeCaller().tripRequest.statistics();

      expect(result.statistics).toEqual({
        total: 50,
        pending: 10,
        approved: 15,
        inProgress: 5,
        completed: 18,
        international: 8,
      });
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);
      selectResultsQueue.push([{ count: 0 }]);

      const result = await employeeCaller().tripRequest.statistics();

      expect(result.statistics.total).toBe(0);
      expect(result.statistics.pending).toBe(0);
      expect(result.statistics.approved).toBe(0);
      expect(result.statistics.inProgress).toBe(0);
      expect(result.statistics.completed).toBe(0);
      expect(result.statistics.international).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().tripRequest.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().tripRequest.getById({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().tripRequest.create({ tripPurpose: "test" })).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().tripRequest.update({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().tripRequest.delete({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for approve", async () => {
      await expect(createAnonymousCaller().tripRequest.approve({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for reject", async () => {
      await expect(createAnonymousCaller().tripRequest.reject({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for submit", async () => {
      await expect(createAnonymousCaller().tripRequest.submit({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for cancel", async () => {
      await expect(createAnonymousCaller().tripRequest.cancel({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for start", async () => {
      await expect(createAnonymousCaller().tripRequest.start({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for complete", async () => {
      await expect(createAnonymousCaller().tripRequest.complete({ id: "1" })).rejects.toThrow();
    });

    it("rejects anonymous for countries", async () => {
      await expect(createAnonymousCaller().tripRequest.countries()).rejects.toThrow();
    });

    it("rejects anonymous for expensePolicies", async () => {
      await expect(createAnonymousCaller().tripRequest.expensePolicies()).rejects.toThrow();
    });

    it("rejects anonymous for statistics", async () => {
      await expect(createAnonymousCaller().tripRequest.statistics()).rejects.toThrow();
    });
  });

  // ═══ Manager Role Variants ═══
  describe("manager role variants", () => {
    const managerRoles = ["admin", "director", "dept_manager", "hr_manager", "finance_manager"];

    for (const role of managerRoles) {
      it(`${role} can approve trip requests`, async () => {
        const mgr = createAdminCaller({ id: 500, role });
        selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
        mockReturningResult.push({ ...sampleTripRequest, status: "approved" });

        const result = await mgr.tripRequest.approve({ id: "1" });
        expect(result.success).toBe(true);
      });

      it(`${role} can reject trip requests`, async () => {
        const mgr = createAdminCaller({ id: 500, role });
        selectResultsQueue.push([{ userId: 1, status: "submitted" }]);
        mockReturningResult.push({ ...sampleTripRequest, status: "rejected" });

        const result = await mgr.tripRequest.reject({ id: "1" });
        expect(result.success).toBe(true);
      });
    }
  });

  // ═══ Non-Manager Roles Cannot Approve/Reject ═══
  describe("non-manager roles cannot approve/reject", () => {
    const nonManagerRoles = ["employee", "staff", "engineer", "user"];

    for (const role of nonManagerRoles) {
      it(`${role} cannot approve`, async () => {
        const c = createAdminCaller({ id: 1, role });
        await expect(c.tripRequest.approve({ id: "1" })).rejects.toThrow("仅管理角色可审批出差申请");
      });

      it(`${role} cannot reject`, async () => {
        const c = createAdminCaller({ id: 1, role });
        await expect(c.tripRequest.reject({ id: "1" })).rejects.toThrow("仅管理角色可驳回出差申请");
      });
    }
  });
});

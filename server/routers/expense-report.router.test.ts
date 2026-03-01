/**
 * Expense Report Router — Unit Tests
 * Tests 10 procedures: list, getById, create, update, delete, submit, approve, reject,
 * generateReport, exportToExcel, getDepartmentRanking
 *
 * Key logic:
 * - FINANCE_ROLES gate for approve/reject/getDepartmentRanking
 * - Ownership checks for non-finance users (assertClaimOwnership)
 * - Optimistic locking via checkExpenseVersion
 * - Self-approval/rejection prevention
 * - Only draft claims can be deleted
 * - Role-scoped list/report/export
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

// Mock DB
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {};
    for (const m of [
      "from", "where", "orderBy", "limit", "offset", "values", "set",
      "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    ]) {
      chain[m] = vi.fn(() => chain);
    }
    chain.returning = vi.fn(() => {
      const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
      mockReturningResult.length = 0;
      return Object.assign(Promise.resolve(r), {
        then: (resolve: any) => Promise.resolve(r).then(resolve),
        catch: () => Promise.resolve(r),
      });
    });
    chain.then = (resolve: any, reject?: any) => {
      try {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return resolve(result);
      } catch (e) {
        if (reject) return reject(e);
        throw e;
      }
    };
    chain.catch = () => chain;

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
  sql: Object.assign(vi.fn((...args: any[]) => args), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

// ── Sample data ──
const sampleClaim = {
  id: 1,
  claimCode: "EC-20260301-ABC",
  submitterId: 1,
  travelRecordId: null,
  tripRequestId: null,
  projectId: 10,
  customerId: null,
  departmentId: 5,
  claimType: "travel",
  claimTitle: "北京出差报销",
  description: "差旅费用",
  totalAmount: "5000.00",
  currency: "CNY",
  status: "draft",
  version: 1,
  notes: null,
  rejectionReason: null,
  managerApprovedAt: null,
  managerApprovedBy: null,
  submittedAt: null,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

const sampleLineItem = {
  id: 1,
  expenseClaimId: 1,
  lineNumber: 1,
  expenseDate: "2026-02-28",
  expenseCategory: "transportation",
  description: "高铁票",
  vendor: "12306",
  amount: "550.00",
  currency: "CNY",
  notes: null,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

// ── Helper callers ──
const employeeCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 1, role: "employee", ...overrides });
const financeCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 99, role: "finance_manager", ...overrides });
const adminCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 100, role: "admin", ...overrides });
const directorCaller = (overrides?: Record<string, any>) =>
  createAuthenticatedCaller({ id: 101, role: "director", ...overrides });

describe("expenseReport router", () => {
  // ═══ list ═══
  describe("list", () => {
    it("returns claims scoped to user for non-finance roles", async () => {
      selectResultsQueue.push([sampleClaim, { ...sampleClaim, id: 2 }]);
      const result = await employeeCaller().expenseReport.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it("returns all claims for finance roles", async () => {
      selectResultsQueue.push([
        sampleClaim,
        { ...sampleClaim, id: 2, submitterId: 99 },
        { ...sampleClaim, id: 3, submitterId: 50 },
      ]);
      const result = await financeCaller().expenseReport.list();
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("returns all claims for admin role", async () => {
      selectResultsQueue.push([sampleClaim]);
      const result = await adminCaller().expenseReport.list();
      expect(result.items).toHaveLength(1);
    });

    it("returns empty list when no claims exist", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseReport.list();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns all claims for director role", async () => {
      selectResultsQueue.push([sampleClaim]);
      const result = await directorCaller().expenseReport.list();
      expect(result.items).toHaveLength(1);
    });

    it("returns all claims for hr_manager role", async () => {
      selectResultsQueue.push([sampleClaim]);
      const caller = createAuthenticatedCaller({ id: 50, role: "hr_manager" });
      const result = await caller.expenseReport.list();
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns claim with line items for owner", async () => {
      // assertClaimOwnership: select submitterId
      selectResultsQueue.push([{ submitterId: 1 }]);
      // select claim
      selectResultsQueue.push([sampleClaim]);
      // select lineItems
      selectResultsQueue.push([sampleLineItem, { ...sampleLineItem, id: 2, lineNumber: 2 }]);

      const result = await employeeCaller().expenseReport.getById({ id: "1" });
      expect(result).not.toBeNull();
      expect(result!.claimCode).toBe("EC-20260301-ABC");
      expect(result!.lineItems).toHaveLength(2);
    });

    it("returns null when claim does not exist (after ownership check)", async () => {
      // assertClaimOwnership passes for finance role (no query needed)
      // select claim: empty
      selectResultsQueue.push([]);
      const result = await financeCaller().expenseReport.getById({ id: "999" });
      expect(result).toBeNull();
    });

    it("returns claim with empty lineItems", async () => {
      // assertClaimOwnership: select submitterId
      selectResultsQueue.push([{ submitterId: 1 }]);
      // select claim
      selectResultsQueue.push([sampleClaim]);
      // select lineItems: empty
      selectResultsQueue.push([]);

      const result = await employeeCaller().expenseReport.getById({ id: "1" });
      expect(result).not.toBeNull();
      expect(result!.lineItems).toHaveLength(0);
    });

    it("throws FORBIDDEN for non-owner non-finance user", async () => {
      // assertClaimOwnership: claim belongs to submitterId 99, but user is id 1
      selectResultsQueue.push([{ submitterId: 99 }]);
      await expect(
        employeeCaller().expenseReport.getById({ id: "1" })
      ).rejects.toThrow("无权操作他人的报销单");
    });

    it("throws NOT_FOUND when claim does not exist during ownership check", async () => {
      // assertClaimOwnership: no claim
      selectResultsQueue.push([]);
      await expect(
        employeeCaller().expenseReport.getById({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("finance role skips ownership check", async () => {
      // No ownership query for finance role
      // select claim
      selectResultsQueue.push([{ ...sampleClaim, submitterId: 50 }]);
      // select lineItems
      selectResultsQueue.push([]);

      const result = await financeCaller().expenseReport.getById({ id: "1" });
      expect(result).not.toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates expense claim with minimal fields", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 10 });
      const result = await employeeCaller().expenseReport.create({});
      expect(result.success).toBe(true);
      expect(result.message).toBe("报销已创建");
      expect(result.data).toHaveProperty("id", 10);
    });

    it("creates expense claim with all fields", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 11 });
      const result = await employeeCaller().expenseReport.create({
        travelRecordId: 5,
        tripRequestId: 3,
        projectId: 10,
        customerId: 20,
        departmentId: 5,
        claimType: "travel",
        claimTitle: "出差报销",
        description: "北京出差费用",
        totalAmount: 5000,
        currency: "CNY",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 11);
    });

    it("uses title as fallback for claimTitle", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 12, claimTitle: "差旅费" });
      const result = await employeeCaller().expenseReport.create({
        title: "差旅费",
      });
      expect(result.success).toBe(true);
    });

    it("defaults claimType to 'other' when not specified", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 13, claimType: "other" });
      const result = await employeeCaller().expenseReport.create({});
      expect(result.success).toBe(true);
    });

    it("accepts totalAmount as string", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 14 });
      const result = await employeeCaller().expenseReport.create({
        totalAmount: "3000",
      });
      expect(result.success).toBe(true);
    });

    it("defaults totalAmount to 0 when not provided", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 15, totalAmount: "0" });
      const result = await employeeCaller().expenseReport.create({});
      expect(result.success).toBe(true);
    });

    it("defaults currency to CNY when not provided", async () => {
      mockReturningResult.push({ ...sampleClaim, id: 16, currency: "CNY" });
      const result = await employeeCaller().expenseReport.create({});
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates claim title for owner", async () => {
      // assertClaimOwnership: select submitterId
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion: skipped (no expectedVersion)
      // update returning
      mockReturningResult.push({ ...sampleClaim, claimTitle: "更新标题" });
      const result = await employeeCaller().expenseReport.update({
        id: "1",
        claimTitle: "更新标题",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
    });

    it("updates with optimistic locking (version match)", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion: version matches
      selectResultsQueue.push([{ version: 1 }]);
      // update returning
      mockReturningResult.push({ ...sampleClaim, version: 2, description: "新描述" });
      const result = await employeeCaller().expenseReport.update({
        id: 1,
        expectedVersion: 1,
        description: "新描述",
      });
      expect(result.success).toBe(true);
    });

    it("throws CONFLICT on version mismatch", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion: version mismatch
      selectResultsQueue.push([{ version: 3 }]);
      await expect(
        employeeCaller().expenseReport.update({
          id: "1",
          expectedVersion: 1,
          claimTitle: "新标题",
        })
      ).rejects.toThrow("版本冲突");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      // assertClaimOwnership: different submitter
      selectResultsQueue.push([{ submitterId: 99 }]);
      await expect(
        employeeCaller().expenseReport.update({
          id: "1",
          claimTitle: "不允许",
        })
      ).rejects.toThrow("无权操作他人的报销单");
    });

    it("finance role can update any claim", async () => {
      // assertClaimOwnership skipped for finance
      // checkExpenseVersion skipped (no expectedVersion)
      mockReturningResult.push({ ...sampleClaim, notes: "审核备注" });
      const result = await financeCaller().expenseReport.update({
        id: 1,
        notes: "审核备注",
      });
      expect(result.success).toBe(true);
    });

    it("accepts numeric id", async () => {
      // assertClaimOwnership skipped for finance
      mockReturningResult.push({ ...sampleClaim });
      const result = await financeCaller().expenseReport.update({
        id: 1,
        claimTitle: "数字ID",
      });
      expect(result.success).toBe(true);
    });

    it("updates totalAmount converting to string", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      mockReturningResult.push({ ...sampleClaim, totalAmount: "8000" });
      const result = await employeeCaller().expenseReport.update({
        id: "1",
        totalAmount: 8000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes draft claim for owner", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // select status check
      selectResultsQueue.push([{ status: "draft" }]);
      // delete lineItems (chain.then)
      selectResultsQueue.push([]);
      // delete claim (chain.then)
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseReport.delete({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("删除成功");
    });

    it("throws BAD_REQUEST when claim is not draft", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // select status: submitted
      selectResultsQueue.push([{ status: "submitted" }]);
      await expect(
        employeeCaller().expenseReport.delete({ id: "1" })
      ).rejects.toThrow("仅草稿状态的报销单可以删除");
    });

    it("throws BAD_REQUEST when claim is approved", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // select status: approved
      selectResultsQueue.push([{ status: "approved" }]);
      await expect(
        employeeCaller().expenseReport.delete({ id: "1" })
      ).rejects.toThrow("仅草稿状态的报销单可以删除");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      // assertClaimOwnership: different submitter
      selectResultsQueue.push([{ submitterId: 99 }]);
      await expect(
        employeeCaller().expenseReport.delete({ id: "1" })
      ).rejects.toThrow("无权操作他人的报销单");
    });

    it("finance role can delete any draft claim", async () => {
      // assertClaimOwnership skipped for finance
      // select status: draft
      selectResultsQueue.push([{ status: "draft" }]);
      // delete lineItems
      selectResultsQueue.push([]);
      // delete claim
      selectResultsQueue.push([]);
      const result = await financeCaller().expenseReport.delete({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("proceeds when claim has no status row (already deleted)", async () => {
      // assertClaimOwnership skipped for finance
      // select status: no result (claim not found, but status check only blocks non-draft)
      selectResultsQueue.push([]);
      // delete lineItems
      selectResultsQueue.push([]);
      // delete claim
      selectResultsQueue.push([]);
      const result = await financeCaller().expenseReport.delete({ id: "999" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ submit ═══
  describe("submit", () => {
    it("submits a claim for owner", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion skipped (no expectedVersion)
      // update returning
      mockReturningResult.push({ ...sampleClaim, status: "submitted" });
      const result = await employeeCaller().expenseReport.submit({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已提交");
      expect(result.data).toHaveProperty("status", "submitted");
    });

    it("submits with optimistic locking", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion: version matches
      selectResultsQueue.push([{ version: 1 }]);
      // update returning
      mockReturningResult.push({ ...sampleClaim, status: "submitted", version: 2 });
      const result = await employeeCaller().expenseReport.submit({
        id: 1,
        expectedVersion: 1,
      });
      expect(result.success).toBe(true);
    });

    it("throws CONFLICT on version mismatch", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 1 }]);
      // checkExpenseVersion: version mismatch
      selectResultsQueue.push([{ version: 5 }]);
      await expect(
        employeeCaller().expenseReport.submit({ id: "1", expectedVersion: 2 })
      ).rejects.toThrow("版本冲突");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      // assertClaimOwnership
      selectResultsQueue.push([{ submitterId: 99 }]);
      await expect(
        employeeCaller().expenseReport.submit({ id: "1" })
      ).rejects.toThrow("无权操作他人的报销单");
    });

    it("accepts numeric id", async () => {
      // assertClaimOwnership skipped for finance
      mockReturningResult.push({ ...sampleClaim, status: "submitted" });
      const result = await financeCaller().expenseReport.submit({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ approve ═══
  describe("approve", () => {
    it("approves a submitted claim by finance role", async () => {
      // checkExpenseVersion skipped (no expectedVersion)
      // select existing claim
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      // update returning
      mockReturningResult.push({ ...sampleClaim, status: "approved", managerApprovedBy: 99 });
      const result = await financeCaller().expenseReport.approve({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已批准");
      expect(result.data).toHaveProperty("status", "approved");
    });

    it("approves a pending_review claim", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "pending_review" }]);
      mockReturningResult.push({ ...sampleClaim, status: "approved" });
      const result = await financeCaller().expenseReport.approve({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("admin role can approve", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "approved" });
      const result = await adminCaller().expenseReport.approve({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("director role can approve", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "approved" });
      const result = await directorCaller().expenseReport.approve({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN for non-finance role", async () => {
      await expect(
        employeeCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow("仅财务/管理角色可审批报销单");
    });

    it("throws FORBIDDEN for self-approval", async () => {
      // finance user (id:99) trying to approve own claim (submitterId:99)
      selectResultsQueue.push([{ submitterId: 99, status: "submitted" }]);
      await expect(
        financeCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow("不能审批自己提交的报销单");
    });

    it("throws NOT_FOUND for non-existent claim", async () => {
      selectResultsQueue.push([]);
      await expect(
        financeCaller().expenseReport.approve({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("throws BAD_REQUEST for non-submitted status (e.g. draft)", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "draft" }]);
      await expect(
        financeCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow("无法审批");
    });

    it("throws BAD_REQUEST for already approved status", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "approved" }]);
      await expect(
        financeCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow("无法审批");
    });

    it("throws BAD_REQUEST for rejected status", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "rejected" }]);
      await expect(
        financeCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow("无法审批");
    });

    it("applies optimistic locking on approve", async () => {
      // checkExpenseVersion: version matches
      selectResultsQueue.push([{ version: 2 }]);
      // select existing claim
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "approved", version: 3 });
      const result = await financeCaller().expenseReport.approve({
        id: 1,
        expectedVersion: 2,
      });
      expect(result.success).toBe(true);
    });

    it("throws CONFLICT on approve version mismatch", async () => {
      // checkExpenseVersion: version mismatch
      selectResultsQueue.push([{ version: 5 }]);
      await expect(
        financeCaller().expenseReport.approve({ id: 1, expectedVersion: 2 })
      ).rejects.toThrow("版本冲突");
    });
  });

  // ═══ reject ═══
  describe("reject", () => {
    it("rejects a submitted claim with reason", async () => {
      // checkExpenseVersion skipped
      // select existing claim
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "rejected", rejectionReason: "发票缺失" });
      const result = await financeCaller().expenseReport.reject({
        id: "1",
        reason: "发票缺失",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("已拒绝");
    });

    it("rejects with rejectionReason field", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "rejected" });
      const result = await financeCaller().expenseReport.reject({
        id: 1,
        rejectionReason: "超出预算",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a pending_review claim", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "pending_review" }]);
      mockReturningResult.push({ ...sampleClaim, status: "rejected" });
      const result = await financeCaller().expenseReport.reject({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN for non-finance role", async () => {
      await expect(
        employeeCaller().expenseReport.reject({ id: "1" })
      ).rejects.toThrow("仅财务/管理角色可驳回报销单");
    });

    it("throws FORBIDDEN for self-rejection", async () => {
      // finance user (id:99) trying to reject own claim (submitterId:99)
      selectResultsQueue.push([{ submitterId: 99, status: "submitted" }]);
      await expect(
        financeCaller().expenseReport.reject({ id: "1" })
      ).rejects.toThrow("不能驳回自己提交的报销单");
    });

    it("throws NOT_FOUND for non-existent claim", async () => {
      selectResultsQueue.push([]);
      await expect(
        financeCaller().expenseReport.reject({ id: "999" })
      ).rejects.toThrow("不存在");
    });

    it("throws BAD_REQUEST for draft status", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "draft" }]);
      await expect(
        financeCaller().expenseReport.reject({ id: "1" })
      ).rejects.toThrow("无法驳回");
    });

    it("throws BAD_REQUEST for already rejected status", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "rejected" }]);
      await expect(
        financeCaller().expenseReport.reject({ id: "1" })
      ).rejects.toThrow("无法驳回");
    });

    it("applies optimistic locking on reject", async () => {
      // checkExpenseVersion: version matches
      selectResultsQueue.push([{ version: 1 }]);
      // select existing claim
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "rejected" });
      const result = await financeCaller().expenseReport.reject({
        id: 1,
        expectedVersion: 1,
        reason: "不符合政策",
      });
      expect(result.success).toBe(true);
    });

    it("throws CONFLICT on reject version mismatch", async () => {
      selectResultsQueue.push([{ version: 10 }]);
      await expect(
        financeCaller().expenseReport.reject({ id: 1, expectedVersion: 3 })
      ).rejects.toThrow("版本冲突");
    });

    it("admin role can reject", async () => {
      selectResultsQueue.push([{ submitterId: 1, status: "submitted" }]);
      mockReturningResult.push({ ...sampleClaim, status: "rejected" });
      const result = await adminCaller().expenseReport.reject({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ generateReport ═══
  describe("generateReport", () => {
    it("returns report with summary and breakdown for finance role", async () => {
      // items query
      selectResultsQueue.push([sampleClaim, { ...sampleClaim, id: 2, claimType: "meal", totalAmount: "3000.00" }]);
      // byType groupBy query
      selectResultsQueue.push([
        { claimType: "travel", total: "5000", count: 1 },
        { claimType: "meal", total: "3000", count: 1 },
      ]);
      // totalResult query
      selectResultsQueue.push([{ total: "8000", count: 2 }]);

      const result = await financeCaller().expenseReport.generateReport();
      expect(result.items).toHaveLength(2);
      expect(result.summary.totalAmount).toBe(8000);
      expect(result.summary.totalCount).toBe(2);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].category).toBe("travel");
      expect(result.breakdown[0].amount).toBe(5000);
      expect(result.breakdown[0].count).toBe(1);
    });

    it("returns user-scoped report for non-finance role", async () => {
      selectResultsQueue.push([sampleClaim]);
      selectResultsQueue.push([{ claimType: "travel", total: "5000", count: 1 }]);
      selectResultsQueue.push([{ total: "5000", count: 1 }]);

      const result = await employeeCaller().expenseReport.generateReport();
      expect(result.items).toHaveLength(1);
      expect(result.summary.totalAmount).toBe(5000);
    });

    it("returns zeros when no data", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: "0", count: 0 }]);

      const result = await employeeCaller().expenseReport.generateReport();
      expect(result.items).toHaveLength(0);
      expect(result.summary.totalAmount).toBe(0);
      expect(result.summary.totalCount).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it("accepts optional date range input", async () => {
      selectResultsQueue.push([sampleClaim]);
      selectResultsQueue.push([{ claimType: "travel", total: "5000", count: 1 }]);
      selectResultsQueue.push([{ total: "5000", count: 1 }]);

      const result = await financeCaller().expenseReport.generateReport({
        dateFrom: "2026-01-01",
        dateTo: "2026-03-31",
      });
      expect(result.items).toHaveLength(1);
    });

    it("works with undefined input", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: "0", count: 0 }]);

      const result = await financeCaller().expenseReport.generateReport();
      expect(result.summary.totalAmount).toBe(0);
    });

    it("handles NaN total gracefully (fallback to 0)", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ total: "not_a_number", count: 0 }]);

      const result = await employeeCaller().expenseReport.generateReport();
      expect(result.summary.totalAmount).toBe(0);
    });
  });

  // ═══ exportToExcel ═══
  describe("exportToExcel", () => {
    it("returns base64 CSV data for finance role", async () => {
      selectResultsQueue.push([
        sampleClaim,
        { ...sampleClaim, id: 2, claimCode: "EC-20260302-DEF", claimTitle: "餐费", claimType: "meal", totalAmount: "200.00" },
      ]);
      const result = await financeCaller().expenseReport.exportToExcel();
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("mimeType", "text/csv");
      // Decode and verify CSV content
      const csv = Buffer.from(result.data, "base64").toString("utf-8");
      expect(csv).toContain("报销编号");
      expect(csv).toContain("EC-20260301-ABC");
      expect(csv).toContain("EC-20260302-DEF");
    });

    it("returns user-scoped CSV for non-finance role", async () => {
      selectResultsQueue.push([sampleClaim]);
      const result = await employeeCaller().expenseReport.exportToExcel();
      const csv = Buffer.from(result.data, "base64").toString("utf-8");
      expect(csv).toContain("报销编号");
      expect(csv).toContain("EC-20260301-ABC");
    });

    it("returns header-only CSV when no data", async () => {
      selectResultsQueue.push([]);
      const result = await employeeCaller().expenseReport.exportToExcel();
      const csv = Buffer.from(result.data, "base64").toString("utf-8");
      expect(csv).toContain("报销编号,标题,类型,金额,币种,状态,提交时间");
      // Only header, no data rows
      const lines = csv.trim().split("\n");
      expect(lines).toHaveLength(1);
    });

    it("accepts optional date range", async () => {
      selectResultsQueue.push([sampleClaim]);
      const result = await employeeCaller().expenseReport.exportToExcel({
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
      });
      expect(result.mimeType).toBe("text/csv");
    });
  });

  // ═══ getDepartmentRanking ═══
  describe("getDepartmentRanking", () => {
    it("returns department ranking for finance role", async () => {
      selectResultsQueue.push([
        { departmentId: 1, total: "50000", count: 10 },
        { departmentId: 2, total: "30000", count: 8 },
        { departmentId: 3, total: "15000", count: 5 },
      ]);
      const result = await financeCaller().expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(3);
      expect(result[0].departmentId).toBe(1);
      expect(result[0].totalAmount).toBe(50000);
      expect(result[0].claimCount).toBe(10);
      expect(result[1].totalAmount).toBe(30000);
    });

    it("admin role can view ranking", async () => {
      selectResultsQueue.push([{ departmentId: 1, total: "10000", count: 3 }]);
      const result = await adminCaller().expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(1);
    });

    it("director role can view ranking", async () => {
      selectResultsQueue.push([{ departmentId: 1, total: "10000", count: 3 }]);
      const result = await directorCaller().expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(1);
    });

    it("hr_manager role can view ranking", async () => {
      selectResultsQueue.push([{ departmentId: 1, total: "10000", count: 3 }]);
      const caller = createAuthenticatedCaller({ id: 50, role: "hr_manager" });
      const result = await caller.expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(1);
    });

    it("finance_specialist role can view ranking", async () => {
      selectResultsQueue.push([{ departmentId: 1, total: "10000", count: 3 }]);
      const caller = createAuthenticatedCaller({ id: 50, role: "finance_specialist" });
      const result = await caller.expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(1);
    });

    it("throws FORBIDDEN for non-finance role", async () => {
      await expect(
        employeeCaller().expenseReport.getDepartmentRanking()
      ).rejects.toThrow("仅财务/管理角色可查看部门排名");
    });

    it("returns empty array when no departments", async () => {
      selectResultsQueue.push([]);
      const result = await financeCaller().expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(0);
    });

    it("accepts optional limit input", async () => {
      selectResultsQueue.push([{ departmentId: 1, total: "5000", count: 2 }]);
      const result = await financeCaller().expenseReport.getDepartmentRanking({ limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("works without input (undefined)", async () => {
      selectResultsQueue.push([]);
      const result = await financeCaller().expenseReport.getDepartmentRanking();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().expenseReport.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(
        createAnonymousCaller().expenseReport.getById({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().expenseReport.create({})
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().expenseReport.update({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(
        createAnonymousCaller().expenseReport.delete({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for submit", async () => {
      await expect(
        createAnonymousCaller().expenseReport.submit({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for approve", async () => {
      await expect(
        createAnonymousCaller().expenseReport.approve({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for reject", async () => {
      await expect(
        createAnonymousCaller().expenseReport.reject({ id: "1" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for generateReport", async () => {
      await expect(
        createAnonymousCaller().expenseReport.generateReport()
      ).rejects.toThrow();
    });

    it("rejects anonymous for exportToExcel", async () => {
      await expect(
        createAnonymousCaller().expenseReport.exportToExcel()
      ).rejects.toThrow();
    });

    it("rejects anonymous for getDepartmentRanking", async () => {
      await expect(
        createAnonymousCaller().expenseReport.getDepartmentRanking()
      ).rejects.toThrow();
    });
  });
});

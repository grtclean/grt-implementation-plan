/**
 * OA Dynamic Forms Router — Unit Tests
 *
 * 17 procedures across 6 groups:
 *   Template CRUD (5): listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate
 *   Submission CRUD (5): listSubmissions, getSubmission, createSubmission, withdrawSubmission, getMyPendingApprovals
 *   Approval Actions (2): approveSubmission, rejectSubmission
 *   Approval History (1): getApprovalHistory
 *   Favorites (3): listFavorites, addFavorite, removeFavorite
 *   Stats (1): getStats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

/**
 * Two-layer mock: `db` (no .then) -> `chain` (thenable).
 * This avoids the JS thenable-unwrapping issue where Promise.resolve(obj)
 * calls obj.then() if it exists, destroying the mock.
 */
function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockQueryResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock schema tables (column-name string objects) ─────────
vi.mock("../../drizzle/oa-dynamic-forms-schema", () => ({
  oaFormTemplates: {
    id: "id",
    templateCode: "templateCode",
    templateName: "templateName",
    templateNameEn: "templateNameEn",
    description: "description",
    category: "category",
    icon: "icon",
    color: "color",
    fields: "fields",
    approvalFlow: "approvalFlow",
    version: "version",
    isActive: "isActive",
    isSystem: "isSystem",
    createdBy: "createdBy",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  oaFormSubmissions: {
    id: "id",
    submissionCode: "submissionCode",
    templateId: "templateId",
    templateCode: "templateCode",
    templateName: "templateName",
    applicantId: "applicantId",
    applicantName: "applicantName",
    departmentId: "departmentId",
    departmentName: "departmentName",
    title: "title",
    formData: "formData",
    linkedProjectId: "linkedProjectId",
    linkedProjectName: "linkedProjectName",
    status: "status",
    currentApproverId: "currentApproverId",
    currentApproverName: "currentApproverName",
    currentApprovalStep: "currentApprovalStep",
    approvedAt: "approvedAt",
    rejectedAt: "rejectedAt",
    rejectionReason: "rejectionReason",
    priority: "priority",
    dueDate: "dueDate",
    dingtalkNotified: "dingtalkNotified",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  oaFormApprovalRecords: {
    id: "id",
    submissionId: "submissionId",
    stepIndex: "stepIndex",
    stepName: "stepName",
    approverId: "approverId",
    approverName: "approverName",
    action: "action",
    comment: "comment",
    delegatedToId: "delegatedToId",
    delegatedToName: "delegatedToName",
    actionAt: "actionAt",
  },
  oaFormTemplateVersions: {
    id: "id",
    templateId: "templateId",
    version: "version",
    fields: "fields",
    approvalFlow: "approvalFlow",
    changedBy: "changedBy",
    changeNotes: "changeNotes",
    createdAt: "createdAt",
  },
  oaFormFavorites: {
    id: "id",
    userId: "userId",
    templateId: "templateId",
    sortOrder: "sortOrder",
    createdAt: "createdAt",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  users: {
    id: "id",
    openId: "openId",
    name: "name",
    displayName: "displayName",
    email: "email",
    loginMethod: "loginMethod",
    role: "role",
    languagePreference: "languagePreference",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    lastSignedIn: "lastSignedIn",
  },
}));

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
});

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════
describe("oaForms router", () => {
  // ─────────────────────────────────────────────────────────
  // 1. Template CRUD
  // ─────────────────────────────────────────────────────────

  describe("listTemplates", () => {
    it("returns templates list with total count", async () => {
      const caller = createAuthenticatedCaller();
      const templates = [
        { id: 1, templateName: "出差申请", category: "hr", isActive: true },
        { id: 2, templateName: "合同审批", category: "finance", isActive: true },
      ];
      mockQueryResult = templates;
      const result = await caller.oaForms.listTemplates();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty list when no templates exist", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.listTemplates();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("accepts optional category filter", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, templateName: "报销申请", category: "finance" }];
      const result = await caller.oaForms.listTemplates({ category: "finance" });
      expect(result.items).toHaveLength(1);
    });

    it("accepts optional search filter", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, templateName: "出差申请", templateCode: "TRAVEL_REQ" }];
      const result = await caller.oaForms.listTemplates({ search: "出差" });
      expect(result.items).toHaveLength(1);
    });

    it("allows listing inactive templates with activeOnly=false", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [
        { id: 1, isActive: true },
        { id: 2, isActive: false },
      ];
      const result = await caller.oaForms.listTemplates({ activeOnly: false });
      expect(result.items).toHaveLength(2);
    });

    it("works when called with no input (optional object)", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.listTemplates();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });
  });

  describe("getTemplate", () => {
    it("returns template by numeric ID", async () => {
      const caller = createAuthenticatedCaller();
      const tpl = { id: 1, templateName: "出差申请", templateCode: "TRAVEL_REQ" };
      mockQueryResult = [tpl];
      const result = await caller.oaForms.getTemplate({ id: 1 });
      expect(result).toEqual(tpl);
    });

    it("returns template by string ID", async () => {
      const caller = createAuthenticatedCaller();
      const tpl = { id: 5, templateName: "合同审批" };
      mockQueryResult = [tpl];
      const result = await caller.oaForms.getTemplate({ id: "5" });
      expect(result).toEqual(tpl);
    });

    it("returns null when template not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.getTemplate({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("createTemplate", () => {
    it("creates a template and returns it", async () => {
      const caller = createAuthenticatedCaller();
      const created = {
        id: 1,
        templateCode: "LEAVE_REQ",
        templateName: "请假申请",
        category: "hr",
        version: 1,
      };
      mockReturningResult = [created];
      const result = await caller.oaForms.createTemplate({
        templateCode: "LEAVE_REQ",
        templateName: "请假申请",
        fields: [{ name: "reason", label: "事由", type: "textarea" }],
      });
      expect(result).toEqual(created);
    });

    it("uses default category 'general' when not specified", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 2, category: "general" }];
      const result = await caller.oaForms.createTemplate({
        templateCode: "MISC",
        templateName: "通用表单",
        fields: [{ name: "note", label: "备注", type: "text" }],
      });
      expect(result).toHaveProperty("id", 2);
      // The router passes category: input.category ?? "general"
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("accepts optional approvalFlow and isSystem", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 3, isSystem: true }];
      const result = await caller.oaForms.createTemplate({
        templateCode: "SYS_TPL",
        templateName: "系统模板",
        fields: [],
        approvalFlow: { steps: [{ stepName: "主管审批", approverType: "fixed_user", approverIds: [10] }] },
        isSystem: true,
      });
      expect(result).toHaveProperty("id", 3);
    });
  });

  describe("updateTemplate", () => {
    it("snapshots current version and updates template", async () => {
      const caller = createAuthenticatedCaller();
      const current = {
        id: 1,
        templateName: "出差申请",
        version: 2,
        fields: [{ name: "dest", label: "目的地", type: "text" }],
        approvalFlow: null,
        createdBy: 1,
      };
      // First query: fetch current template
      selectResultsQueue.push([current]);
      // Second query: insert version snapshot (resolves via chain.then)
      selectResultsQueue.push([]);
      // Third query: update returning
      mockReturningResult = [{ ...current, templateName: "差旅申请", version: 3 }];

      const result = await caller.oaForms.updateTemplate({
        id: 1,
        templateName: "差旅申请",
      });
      expect(result).toHaveProperty("templateName", "差旅申请");
      expect(result).toHaveProperty("version", 3);
      // Verify version snapshot insert was called
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when template does not exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.oaForms.updateTemplate({ id: 999, templateName: "不存在" })
      ).rejects.toThrow("Template 999 not found");
    });

    it("handles null version gracefully (defaults to 1)", async () => {
      const caller = createAuthenticatedCaller();
      const current = {
        id: 1,
        templateName: "旧表单",
        version: null,
        fields: [],
        approvalFlow: null,
        createdBy: 1,
      };
      selectResultsQueue.push([current]);
      selectResultsQueue.push([]);
      mockReturningResult = [{ ...current, version: 2 }];

      const result = await caller.oaForms.updateTemplate({
        id: 1,
        description: "新描述",
      });
      expect(result).toHaveProperty("version", 2);
    });
  });

  describe("deleteTemplate", () => {
    it("soft-deletes template (sets isActive=false)", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 1, isActive: false }];
      const result = await caller.oaForms.deleteTemplate({ id: 1 });
      expect(result).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("isActive", false);
    });

    it("returns success even if template was already inactive", async () => {
      const caller = createAuthenticatedCaller();
      mockReturningResult = [{ id: 2, isActive: false }];
      const result = await caller.oaForms.deleteTemplate({ id: 2 });
      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. Submission CRUD
  // ─────────────────────────────────────────────────────────

  describe("listSubmissions", () => {
    it("returns paginated submissions with total", async () => {
      const caller = createAuthenticatedCaller();
      const items = [
        { id: 1, title: "张三出差申请", status: "pending" },
        { id: 2, title: "李四请假", status: "approved" },
      ];
      // First: select items
      selectResultsQueue.push(items);
      // Second: select count
      selectResultsQueue.push([{ count: 50 }]);

      const result = await caller.oaForms.listSubmissions({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("defaults to page 1, pageSize 20 when no input", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ count: 0 }]);
      const result = await caller.oaForms.listSubmissions();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.total).toBe(0);
    });

    it("applies applicantId filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, applicantId: 5 }]);
      selectResultsQueue.push([{ count: 1 }]);
      const result = await caller.oaForms.listSubmissions({ applicantId: 5 });
      expect(result.items).toHaveLength(1);
    });

    it("applies templateId filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, templateId: 3 }]);
      selectResultsQueue.push([{ count: 1 }]);
      const result = await caller.oaForms.listSubmissions({ templateId: 3 });
      expect(result.items).toHaveLength(1);
    });

    it("applies status filter", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ id: 1, status: "rejected" }]);
      selectResultsQueue.push([{ count: 1 }]);
      const result = await caller.oaForms.listSubmissions({ status: "rejected" });
      expect(result.items).toHaveLength(1);
    });

    it("returns 0 total when count result is missing", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller.oaForms.listSubmissions();
      expect(result.total).toBe(0);
    });
  });

  describe("getSubmission", () => {
    it("returns submission by numeric ID", async () => {
      const caller = createAuthenticatedCaller();
      const sub = { id: 10, title: "测试提交", status: "pending" };
      mockQueryResult = [sub];
      const result = await caller.oaForms.getSubmission({ id: 10 });
      expect(result).toEqual(sub);
    });

    it("returns submission by string ID", async () => {
      const caller = createAuthenticatedCaller();
      const sub = { id: 10, title: "测试提交" };
      mockQueryResult = [sub];
      const result = await caller.oaForms.getSubmission({ id: "10" });
      expect(result).toEqual(sub);
    });

    it("returns null when submission not found", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.getSubmission({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("createSubmission", () => {
    it("creates submission with auto-approval when template has no approval flow", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "张三" });
      // First: look up template (no approval flow)
      selectResultsQueue.push([{
        id: 5,
        templateCode: "MISC_FORM",
        templateName: "通用表单",
        approvalFlow: null,
      }]);
      // Insert returning
      mockReturningResult = [{
        id: 1,
        submissionCode: "DF-20260301-1234",
        templateId: 5,
        status: "approved",
        applicantId: 1,
        applicantName: "张三",
      }];

      const result = await caller.oaForms.createSubmission({
        templateId: 5,
        title: "测试表单",
        formData: { note: "测试" },
      });
      expect(result).toHaveProperty("status", "approved");
      expect(result).toHaveProperty("applicantId", 1);
    });

    it("creates pending submission when template has approval flow with fixed_user", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "张三" });
      // First: look up template
      selectResultsQueue.push([{
        id: 10,
        templateCode: "TRAVEL_REQ",
        templateName: "出差申请",
        approvalFlow: {
          steps: [
            { stepName: "主管审批", approverType: "fixed_user", approverIds: [20] },
            { stepName: "总监审批", approverType: "fixed_user", approverIds: [30] },
          ],
        },
      }]);
      // Second: look up approver user
      selectResultsQueue.push([{ id: 20, name: "李主管" }]);
      // Insert returning
      mockReturningResult = [{
        id: 2,
        submissionCode: "DF-20260301-5678",
        templateId: 10,
        status: "pending",
        currentApprovalStep: 0,
        currentApproverId: 20,
        currentApproverName: "李主管",
      }];

      const result = await caller.oaForms.createSubmission({
        templateId: 10,
        title: "上海出差",
        formData: { destination: "上海", startDate: "2026-03-05" },
        priority: "high",
      });
      expect(result).toHaveProperty("status", "pending");
      expect(result).toHaveProperty("currentApproverId", 20);
      expect(result).toHaveProperty("currentApproverName", "李主管");
    });

    it("throws NOT_FOUND when template does not exist", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      await expect(
        caller.oaForms.createSubmission({
          templateId: 999,
          title: "test",
          formData: {},
        })
      ).rejects.toThrow("Template 999 not found");
    });

    it("creates submission with approval flow where approver has displayName but no name", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "张三" });
      selectResultsQueue.push([{
        id: 10,
        templateCode: "X",
        templateName: "表单",
        approvalFlow: {
          steps: [{ stepName: "审批", approverType: "fixed_user", approverIds: [50] }],
        },
      }]);
      // Approver has displayName but no name
      selectResultsQueue.push([{ id: 50, name: null, displayName: "王经理" }]);
      mockReturningResult = [{ id: 3, status: "pending", currentApproverName: "王经理" }];

      const result = await caller.oaForms.createSubmission({
        templateId: 10,
        title: "test",
        formData: {},
      });
      expect(result).toHaveProperty("status", "pending");
    });

    it("creates submission with non-fixed_user approval type (no approver lookup)", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "张三" });
      selectResultsQueue.push([{
        id: 10,
        templateCode: "Y",
        templateName: "表单",
        approvalFlow: {
          steps: [{ stepName: "部门主管", approverType: "department_head" }],
        },
      }]);
      mockReturningResult = [{ id: 4, status: "pending", currentApproverId: null }];

      const result = await caller.oaForms.createSubmission({
        templateId: 10,
        title: "test",
        formData: {},
      });
      expect(result).toHaveProperty("status", "pending");
    });

    it("uses fallback applicantName when ctx.user.name is null", async () => {
      const caller = createAuthenticatedCaller({ id: 7, name: undefined as any });
      selectResultsQueue.push([{
        id: 10,
        templateCode: "Z",
        templateName: "表单",
        approvalFlow: null,
      }]);
      mockReturningResult = [{ id: 5, applicantName: "User#7", status: "approved" }];

      const result = await caller.oaForms.createSubmission({
        templateId: 10,
        title: "fallback test",
        formData: {},
      });
      expect(result).toHaveProperty("status", "approved");
    });
  });

  describe("withdrawSubmission", () => {
    it("withdraws a pending submission owned by the user", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{ id: 10, applicantId: 1, status: "pending" }]);
      mockReturningResult = [{ id: 10, status: "withdrawn" }];

      const result = await caller.oaForms.withdrawSubmission({ id: 10 });
      expect(result).toHaveProperty("status", "withdrawn");
    });

    it("withdraws a draft submission owned by the user", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{ id: 11, applicantId: 1, status: "draft" }]);
      mockReturningResult = [{ id: 11, status: "withdrawn" }];

      const result = await caller.oaForms.withdrawSubmission({ id: 11 });
      expect(result).toHaveProperty("status", "withdrawn");
    });

    it("throws NOT_FOUND when submission does not exist", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([]);
      await expect(
        caller.oaForms.withdrawSubmission({ id: 999 })
      ).rejects.toThrow("Submission 999 not found");
    });

    it("throws FORBIDDEN when non-owner tries to withdraw", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([{ id: 10, applicantId: 1, status: "pending" }]);
      await expect(
        caller.oaForms.withdrawSubmission({ id: 10 })
      ).rejects.toThrow("只能撤回自己提交的表单");
    });

    it("throws BAD_REQUEST when submission is already approved", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{ id: 10, applicantId: 1, status: "approved" }]);
      await expect(
        caller.oaForms.withdrawSubmission({ id: 10 })
      ).rejects.toThrow('Cannot withdraw submission with status "approved"');
    });

    it("throws BAD_REQUEST when submission is rejected", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{ id: 10, applicantId: 1, status: "rejected" }]);
      await expect(
        caller.oaForms.withdrawSubmission({ id: 10 })
      ).rejects.toThrow('Cannot withdraw submission with status "rejected"');
    });

    it("throws BAD_REQUEST when submission is withdrawn already", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{ id: 10, applicantId: 1, status: "withdrawn" }]);
      await expect(
        caller.oaForms.withdrawSubmission({ id: 10 })
      ).rejects.toThrow('Cannot withdraw submission with status "withdrawn"');
    });
  });

  describe("getMyPendingApprovals", () => {
    it("returns pending submissions where current user is approver", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      const items = [
        { id: 1, title: "张三出差", currentApproverId: 5, status: "pending" },
        { id: 2, title: "李四请假", currentApproverId: 5, status: "pending" },
      ];
      mockQueryResult = items;
      const result = await caller.oaForms.getMyPendingApprovals();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty when no pending approvals for user", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      mockQueryResult = [];
      const result = await caller.oaForms.getMyPendingApprovals();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. Approval Actions
  // ─────────────────────────────────────────────────────────

  describe("approveSubmission", () => {
    it("approves final step and marks submission as approved", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      // 1: Fetch submission
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApproverName: "审批人",
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      // 2: Insert approval record
      selectResultsQueue.push([]);
      // 3: Fetch template (single step, so this is final)
      selectResultsQueue.push([{
        id: 100,
        approvalFlow: {
          steps: [{ stepName: "主管", approverType: "fixed_user", approverIds: [5] }],
        },
      }]);
      // 4: Update returning (approved)
      mockReturningResult = [{ id: 10, status: "approved" }];

      const result = await caller.oaForms.approveSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("status", "approved");
    });

    it("advances to next step when more steps remain", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "主管" });
      // 1: Fetch submission (at step 0 of 2)
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApproverName: "主管",
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      // 2: Insert approval record
      selectResultsQueue.push([]);
      // 3: Fetch template (2 steps)
      selectResultsQueue.push([{
        id: 100,
        approvalFlow: {
          steps: [
            { stepName: "主管审批", approverType: "fixed_user", approverIds: [5] },
            { stepName: "总监审批", approverType: "fixed_user", approverIds: [30] },
          ],
        },
      }]);
      // 4: Look up next approver
      selectResultsQueue.push([{ id: 30, name: "王总监" }]);
      // 5: Update returning (advanced to step 1)
      mockReturningResult = [{
        id: 10,
        status: "pending",
        currentApprovalStep: 1,
        currentApproverId: 30,
        currentApproverName: "王总监",
      }];

      const result = await caller.oaForms.approveSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("currentApprovalStep", 1);
      expect(result).toHaveProperty("currentApproverId", 30);
    });

    it("throws NOT_FOUND when submission does not exist", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      await expect(
        caller.oaForms.approveSubmission({ submissionId: 999 })
      ).rejects.toThrow("Submission 999 not found");
    });

    it("throws CONFLICT when submission is not pending", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "approved",
        currentApproverId: 5,
      }]);
      await expect(
        caller.oaForms.approveSubmission({ submissionId: 10 })
      ).rejects.toThrow('Submission is not pending (current status: "approved")');
    });

    it("throws FORBIDDEN for self-approval (applicant === approver)", async () => {
      const caller = createAuthenticatedCaller({ id: 1, name: "张三" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 1,
      }]);
      await expect(
        caller.oaForms.approveSubmission({ submissionId: 10 })
      ).rejects.toThrow("不能审批自己提交的表单");
    });

    it("throws FORBIDDEN when caller is not the designated approver", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 20,
        currentApproverName: "李经理",
      }]);
      await expect(
        caller.oaForms.approveSubmission({ submissionId: 10 })
      ).rejects.toThrow("当前审批人为 李经理，您无权审批");
    });

    it("throws CONFLICT when atomic update returns empty (race condition)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      // 1: Fetch submission
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      // 2: Insert approval record
      selectResultsQueue.push([]);
      // 3: Fetch template (single step - final)
      selectResultsQueue.push([{
        id: 100,
        approvalFlow: { steps: [{ stepName: "审批", approverType: "fixed_user", approverIds: [5] }] },
      }]);
      // 4: Update returns empty (race)
      mockReturningResult = [];

      await expect(
        caller.oaForms.approveSubmission({ submissionId: 10 })
      ).rejects.toThrow("表单状态已变更，请刷新后重试");
    });

    it("handles template with no approval flow (totalSteps=0, marks approved)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      selectResultsQueue.push([]);
      // Template with no approval flow
      selectResultsQueue.push([{ id: 100, approvalFlow: null }]);
      mockReturningResult = [{ id: 10, status: "approved" }];

      const result = await caller.oaForms.approveSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("status", "approved");
    });

    it("allows approval with optional comment", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ id: 100, approvalFlow: { steps: [{ stepName: "审批", approverType: "fixed_user", approverIds: [5] }] } }]);
      mockReturningResult = [{ id: 10, status: "approved" }];

      const result = await caller.oaForms.approveSubmission({
        submissionId: 10,
        comment: "同意出差",
      });
      expect(result).toHaveProperty("status", "approved");
    });

    it("handles advance to next step with non-fixed_user approver type", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "主管" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{
        id: 100,
        approvalFlow: {
          steps: [
            { stepName: "主管", approverType: "fixed_user", approverIds: [5] },
            { stepName: "部门主管", approverType: "department_head" },
          ],
        },
      }]);
      // No user lookup needed for department_head type
      mockReturningResult = [{
        id: 10,
        status: "pending",
        currentApprovalStep: 1,
        currentApproverId: null,
        currentApproverName: null,
      }];

      const result = await caller.oaForms.approveSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("currentApprovalStep", 1);
      expect(result).toHaveProperty("currentApproverId", null);
    });

    it("allows approval when currentApproverId is null (any user can approve)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: null,
        currentApprovalStep: 0,
        templateId: 100,
      }]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([{ id: 100, approvalFlow: { steps: [{ stepName: "审批", approverType: "role" }] } }]);
      mockReturningResult = [{ id: 10, status: "approved" }];

      const result = await caller.oaForms.approveSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("status", "approved");
    });
  });

  describe("rejectSubmission", () => {
    it("rejects a pending submission", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      // 1: Fetch submission
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApproverName: "审批人",
        currentApprovalStep: 0,
      }]);
      // 2: Insert rejection record
      selectResultsQueue.push([]);
      // 3: Update returning (rejected)
      mockReturningResult = [{ id: 10, status: "rejected" }];

      const result = await caller.oaForms.rejectSubmission({
        submissionId: 10,
        comment: "预算超标，请修改后重新提交",
      });
      expect(result).toHaveProperty("status", "rejected");
    });

    it("throws NOT_FOUND when submission does not exist", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([]);
      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 999 })
      ).rejects.toThrow("Submission 999 not found");
    });

    it("throws CONFLICT when submission is not pending", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "approved",
        currentApproverId: 5,
      }]);
      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 10 })
      ).rejects.toThrow('Submission is not pending (current status: "approved")');
    });

    it("throws FORBIDDEN for self-rejection (applicant === approver)", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 1,
      }]);
      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 10 })
      ).rejects.toThrow("不能驳回自己提交的表单");
    });

    it("throws FORBIDDEN when caller is not the designated approver", async () => {
      const caller = createAuthenticatedCaller({ id: 5 });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 20,
        currentApproverName: "李经理",
      }]);
      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 10 })
      ).rejects.toThrow("当前审批人为 李经理，您无权驳回");
    });

    it("throws CONFLICT when atomic update returns empty (race condition)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
      }]);
      selectResultsQueue.push([]);
      mockReturningResult = [];

      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 10 })
      ).rejects.toThrow("表单状态已变更，请刷新后重试");
    });

    it("rejects without comment (optional)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: 5,
        currentApprovalStep: 0,
      }]);
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 10, status: "rejected" }];

      const result = await caller.oaForms.rejectSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("status", "rejected");
    });

    it("allows rejection when currentApproverId is null (any user can reject)", async () => {
      const caller = createAuthenticatedCaller({ id: 5, name: "审批人" });
      selectResultsQueue.push([{
        id: 10,
        applicantId: 1,
        status: "pending",
        currentApproverId: null,
        currentApprovalStep: 0,
      }]);
      selectResultsQueue.push([]);
      mockReturningResult = [{ id: 10, status: "rejected" }];

      const result = await caller.oaForms.rejectSubmission({ submissionId: 10 });
      expect(result).toHaveProperty("status", "rejected");
    });
  });

  // ─────────────────────────────────────────────────────────
  // 4. Approval History
  // ─────────────────────────────────────────────────────────

  describe("getApprovalHistory", () => {
    it("returns approval records for a submission (numeric ID)", async () => {
      const caller = createAuthenticatedCaller();
      const records = [
        { id: 1, submissionId: 10, stepIndex: 0, action: "approve", approverName: "主管" },
        { id: 2, submissionId: 10, stepIndex: 1, action: "approve", approverName: "总监" },
      ];
      mockQueryResult = records;
      const result = await caller.oaForms.getApprovalHistory({ submissionId: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns approval records for a submission (string ID)", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1, submissionId: 10, action: "reject" }];
      const result = await caller.oaForms.getApprovalHistory({ submissionId: "10" });
      expect(result.items).toHaveLength(1);
    });

    it("returns empty when no records exist", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.getApprovalHistory({ submissionId: 999 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 5. Favorites
  // ─────────────────────────────────────────────────────────

  describe("listFavorites", () => {
    it("returns user favorites with joined template info", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      const items = [
        {
          id: 1,
          userId: 1,
          templateId: 5,
          sortOrder: 0,
          templateCode: "TRAVEL_REQ",
          templateName: "出差申请",
          category: "hr",
          isActive: true,
        },
      ];
      mockQueryResult = items;
      const result = await caller.oaForms.listFavorites();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]).toHaveProperty("templateName", "出差申请");
    });

    it("returns empty when user has no favorites", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      mockQueryResult = [];
      const result = await caller.oaForms.listFavorites();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("addFavorite", () => {
    it("adds a template to user favorites and returns success", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      mockReturningResult = [{ id: 1, userId: 1, templateId: 5, sortOrder: 0 }];
      const result = await caller.oaForms.addFavorite({ templateId: 5 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("data");
    });

    it("returns success with message when already favorited (unique constraint 23505)", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      // Simulate unique constraint violation on .returning()
      const originalReturning = mockDb.insert().returning;
      // We need to make the insert chain throw — override returning for this test
      const chain = mockDb.insert();
      chain.returning.mockImplementationOnce(() => {
        const err: any = new Error("unique_violation");
        err.code = "23505";
        return Promise.reject(err);
      });

      const result = await caller.oaForms.addFavorite({ templateId: 5 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Already in favorites");
    });

    it("throws on non-unique-constraint errors", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      const chain = mockDb.insert();
      chain.returning.mockImplementationOnce(() => {
        const err: any = new Error("connection error");
        err.code = "08006";
        return Promise.reject(err);
      });

      await expect(
        caller.oaForms.addFavorite({ templateId: 5 })
      ).rejects.toThrow("connection error");
    });
  });

  describe("removeFavorite", () => {
    it("removes a template from user favorites", async () => {
      const caller = createAuthenticatedCaller({ id: 1 });
      mockQueryResult = [];
      const result = await caller.oaForms.removeFavorite({ templateId: 5 });
      expect(result).toHaveProperty("success", true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. Stats
  // ─────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns aggregated template and submission stats", async () => {
      const caller = createAuthenticatedCaller();
      // First query: template stats
      selectResultsQueue.push([{ totalTemplates: 10, activeTemplates: 8 }]);
      // Second query: submission stats
      selectResultsQueue.push([{
        totalSubmissions: 100,
        pendingSubmissions: 15,
        approvedSubmissions: 70,
        rejectedSubmissions: 15,
      }]);

      const result = await caller.oaForms.getStats();
      expect(result).toEqual({
        totalTemplates: 10,
        activeTemplates: 8,
        totalSubmissions: 100,
        pendingSubmissions: 15,
        approvedSubmissions: 70,
        rejectedSubmissions: 15,
      });
    });

    it("returns zeros when no data exists", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);

      const result = await caller.oaForms.getStats();
      expect(result).toEqual({
        totalTemplates: 0,
        activeTemplates: 0,
        totalSubmissions: 0,
        pendingSubmissions: 0,
        approvedSubmissions: 0,
        rejectedSubmissions: 0,
      });
    });

    it("handles partial stats (only template stats available)", async () => {
      const caller = createAuthenticatedCaller();
      selectResultsQueue.push([{ totalTemplates: 5, activeTemplates: 3 }]);
      selectResultsQueue.push([]);

      const result = await caller.oaForms.getStats();
      expect(result.totalTemplates).toBe(5);
      expect(result.activeTemplates).toBe(3);
      expect(result.totalSubmissions).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Authentication Guards
  // ─────────────────────────────────────────────────────────

  describe("authentication", () => {
    it("rejects anonymous for listTemplates", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.listTemplates()).rejects.toThrow();
    });

    it("rejects anonymous for getTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.getTemplate({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for createTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.createTemplate({
          templateCode: "X",
          templateName: "X",
          fields: [],
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for updateTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.updateTemplate({ id: 1, templateName: "X" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for deleteTemplate", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.deleteTemplate({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for listSubmissions", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.listSubmissions()).rejects.toThrow();
    });

    it("rejects anonymous for getSubmission", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.getSubmission({ id: 1 })).rejects.toThrow();
    });

    it("rejects anonymous for createSubmission", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.createSubmission({
          templateId: 1,
          title: "test",
          formData: {},
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for withdrawSubmission", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.withdrawSubmission({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getMyPendingApprovals", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.getMyPendingApprovals()).rejects.toThrow();
    });

    it("rejects anonymous for approveSubmission", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.approveSubmission({ submissionId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for rejectSubmission", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.rejectSubmission({ submissionId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getApprovalHistory", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.getApprovalHistory({ submissionId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listFavorites", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.listFavorites()).rejects.toThrow();
    });

    it("rejects anonymous for addFavorite", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.addFavorite({ templateId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for removeFavorite", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.oaForms.removeFavorite({ templateId: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for getStats", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.oaForms.getStats()).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────
  // Input Validation
  // ─────────────────────────────────────────────────────────

  describe("input validation", () => {
    it("rejects createTemplate with missing templateCode", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.createTemplate as any)({
          templateName: "test",
          fields: [],
        })
      ).rejects.toThrow();
    });

    it("rejects createTemplate with missing templateName", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.createTemplate as any)({
          templateCode: "X",
          fields: [],
        })
      ).rejects.toThrow();
    });

    it("rejects createTemplate with missing fields", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.createTemplate as any)({
          templateCode: "X",
          templateName: "X",
        })
      ).rejects.toThrow();
    });

    it("rejects createSubmission with missing title", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.createSubmission as any)({
          templateId: 1,
          formData: {},
        })
      ).rejects.toThrow();
    });

    it("rejects createSubmission with missing formData", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.createSubmission as any)({
          templateId: 1,
          title: "test",
        })
      ).rejects.toThrow();
    });

    it("rejects approveSubmission with missing submissionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.approveSubmission as any)({})
      ).rejects.toThrow();
    });

    it("rejects rejectSubmission with missing submissionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        (caller.oaForms.rejectSubmission as any)({})
      ).rejects.toThrow();
    });

    it("accepts getTemplate with string id", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [{ id: 1 }];
      const result = await caller.oaForms.getTemplate({ id: "1" });
      expect(result).toHaveProperty("id", 1);
    });

    it("accepts getApprovalHistory with string submissionId", async () => {
      const caller = createAuthenticatedCaller();
      mockQueryResult = [];
      const result = await caller.oaForms.getApprovalHistory({
        submissionId: "10",
      });
      expect(result.items).toHaveLength(0);
    });
  });
});

/**
 * Workspace Router — Comprehensive Unit Tests
 *
 * Covers all 17 procedures:
 *   list, get, create, update, delete,
 *   getMembers, addMember, removeMember,
 *   getDocuments, createDocument,
 *   getTasks, createTask, updateTaskStatus,
 *   getMessages, sendMessage,
 *   getActivities, getStats,
 *   searchUsers, inviteMember, updateMemberRole
 *
 * This router uses exclusively db.execute(sql`...`) via getDb().
 *
 * Run: npx vitest run server/routers/workspace.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// ── Mock state ──────────────────────────────────────────
const mockExecuteFn = vi.fn();
const executeQueue: any[] = [];

/** Default execute result — empty rows */
const DEFAULT_EXECUTE_RESULT = [[]];

function setupExecuteMock() {
  mockExecuteFn.mockReset();
  executeQueue.length = 0;
  mockExecuteFn.mockImplementation(() => {
    if (executeQueue.length > 0) {
      return Promise.resolve(executeQueue.shift()!);
    }
    return Promise.resolve(DEFAULT_EXECUTE_RESULT);
  });
}

/** Push one or more execute results into the FIFO queue */
function queueExecute(...results: any[]) {
  executeQueue.push(...results);
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve([]));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve([]); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: mockExecuteFn,
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
  requireDb: vi.fn(async () => mockDb),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  setupExecuteMock();
});

// ── Tests ───────────────────────────────────────────────
describe("workspace router", () => {

  // ═══ Auth Guard Tests ════════════════════════════════
  describe("auth guards", () => {
    it("rejects anonymous caller on list", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.list({})).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on get", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.get({ id: 1 })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on create", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.create({ name: "Test" })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on update", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.update({ id: 1 })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on delete", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.delete({ id: 1 })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on addMember", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.addMember({ workspaceId: 1, userId: 2 })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on sendMessage", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.sendMessage({ workspaceId: 1, content: "hi" })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on createDocument", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.createDocument({ workspaceId: 1, name: "doc.pdf" })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });

    it("rejects anonymous caller on createTask", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.workspace.createTask({ workspaceId: 1, title: "Task" })).rejects.toThrow(/UNAUTHORIZED|authenticat|login/i);
    });
  });

  // ═══ list ════════════════════════════════════════════
  describe("list", () => {
    it("returns paginated workspaces with defaults", async () => {
      const caller = createAuthenticatedCaller();
      // 1st execute: COUNT query
      queueExecute([[{ total: 2 }]]);
      // 2nd execute: SELECT query
      queueExecute([[
        { id: 1, name: "WS 1", status: "active", member_count: 3, doc_count: 5, pending_tasks: 2 },
        { id: 2, name: "WS 2", status: "active", member_count: 1, doc_count: 0, pending_tasks: 0 },
      ]]);

      const result = await caller.workspace.list({});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it("returns empty list when no workspaces", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ total: 0 }]]);
      queueExecute([[]]);

      const result = await caller.workspace.list({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("supports pagination", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ total: 25 }]]);
      queueExecute([[{ id: 21, name: "WS 21" }]]);

      const result = await caller.workspace.list({ page: 2, pageSize: 20 });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(2);
    });

    it("filters by search term", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ total: 1 }]]);
      queueExecute([[{ id: 1, name: "Alpha Project" }]]);

      const result = await caller.workspace.list({ search: "Alpha" });

      expect(result.items).toHaveLength(1);
      expect(mockExecuteFn).toHaveBeenCalled();
    });

    it("filters by status='archived'", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ total: 1 }]]);
      queueExecute([[{ id: 3, name: "Old WS", status: "archived" }]]);

      const result = await caller.workspace.list({ status: "archived" });

      expect(result.items).toHaveLength(1);
    });

    it("returns all statuses when status='all'", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ total: 3 }]]);
      queueExecute([[
        { id: 1, status: "active" },
        { id: 2, status: "archived" },
        { id: 3, status: "active" },
      ]]);

      const result = await caller.workspace.list({ status: "all" });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  // ═══ get ═════════════════════════════════════════════
  describe("get", () => {
    it("returns workspace details when found", async () => {
      const caller = createAuthenticatedCaller();
      // 1st execute: workspace SELECT
      queueExecute([[{ id: 1, name: "My WS", owner_id: 1, visibility: "team", member_count: 3, doc_count: 5, task_count: 10 }]]);
      // 2nd execute: member check
      queueExecute([[{ id: 1 }]]);

      const result = await caller.workspace.get({ id: 1 });

      expect(result.id).toBe(1);
      expect(result.name).toBe("My WS");
    });

    it("throws NOT_FOUND when workspace does not exist", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      await expect(caller.workspace.get({ id: 999 })).rejects.toThrow(/不存在|NOT_FOUND/);
    });

    it("throws FORBIDDEN for private workspace when user is not member or owner", async () => {
      const caller = createAuthenticatedCaller();
      // workspace owned by someone else, private
      queueExecute([[{ id: 5, name: "Secret WS", owner_id: 999, visibility: "private" }]]);
      // member check returns empty
      queueExecute([[]]);

      await expect(caller.workspace.get({ id: 5 })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("allows access to public workspace even if not member", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 5, name: "Open WS", owner_id: 999, visibility: "public" }]]);
      queueExecute([[]]);

      const result = await caller.workspace.get({ id: 5 });
      expect(result.name).toBe("Open WS");
    });

    it("allows access to team workspace even if not member", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 6, name: "Team WS", owner_id: 999, visibility: "team" }]]);
      queueExecute([[]]);

      const result = await caller.workspace.get({ id: 6 });
      expect(result.name).toBe("Team WS");
    });
  });

  // ═══ create ══════════════════════════════════════════
  describe("create", () => {
    it("creates a workspace and returns id + success", async () => {
      const caller = createAuthenticatedCaller();
      // INSERT workspace
      queueExecute([[]]);
      // LAST_INSERT_ID
      queueExecute([[{ id: 42 }]]);
      // INSERT member (owner)
      queueExecute([[]]);
      // INSERT activity
      queueExecute([[]]);

      const result = await caller.workspace.create({ name: "New Workspace", description: "Desc" });

      expect(result.id).toBe(42);
      expect(result.success).toBe(true);
      expect(mockExecuteFn).toHaveBeenCalledTimes(4);
    });

    it("creates with default visibility of team", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]); // INSERT
      queueExecute([[{ id: 1 }]]); // LAST_INSERT_ID
      queueExecute([[]]); // INSERT member
      queueExecute([[]]); // INSERT activity

      const result = await caller.workspace.create({ name: "Default Vis" });
      expect(result.success).toBe(true);
    });

    it("creates with projectId and private visibility", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[{ id: 10 }]]);
      queueExecute([[]]);
      queueExecute([[]]);

      const result = await caller.workspace.create({
        name: "Project WS",
        projectId: 5,
        visibility: "private",
      });

      expect(result.id).toBe(10);
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.create({ name: "" })).rejects.toThrow();
    });
  });

  // ═══ update ══════════════════════════════════════════
  describe("update", () => {
    it("updates workspace when user is owner", async () => {
      const caller = createAuthenticatedCaller();
      // check ownership
      queueExecute([[{ owner_id: 1 }]]);
      // member role check
      queueExecute([[{ role: "owner" }]]);
      // UPDATE
      queueExecute([[]]);

      const result = await caller.workspace.update({ id: 1, name: "Renamed" });
      expect(result.success).toBe(true);
    });

    it("updates workspace when user is admin member", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ owner_id: 999 }]]); // different owner
      queueExecute([[{ role: "admin" }]]); // user is admin
      queueExecute([[]]);

      const result = await caller.workspace.update({ id: 1, status: "archived" });
      expect(result.success).toBe(true);
    });

    it("throws NOT_FOUND when workspace does not exist", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]); // no workspace found

      await expect(caller.workspace.update({ id: 999, name: "X" })).rejects.toThrow(/不存在|NOT_FOUND/);
    });

    it("throws FORBIDDEN when user is not owner or admin", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ owner_id: 999 }]]);
      queueExecute([[{ role: "viewer" }]]); // user is just a viewer

      await expect(caller.workspace.update({ id: 1, name: "X" })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws FORBIDDEN when user has no membership at all", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ owner_id: 999 }]]);
      queueExecute([[]]); // no membership

      await expect(caller.workspace.update({ id: 1, name: "X" })).rejects.toThrow(/无权|FORBIDDEN/);
    });
  });

  // ═══ delete ══════════════════════════════════════════
  describe("delete", () => {
    it("soft-deletes workspace when user is owner", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ owner_id: 1 }]]);
      queueExecute([]); // UPDATE (soft delete)

      const result = await caller.workspace.delete({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("throws NOT_FOUND when workspace does not exist", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      await expect(caller.workspace.delete({ id: 999 })).rejects.toThrow(/不存在|NOT_FOUND/);
    });

    it("throws FORBIDDEN when user is not owner", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ owner_id: 999 }]]);

      await expect(caller.workspace.delete({ id: 1 })).rejects.toThrow(/所有者|FORBIDDEN/);
    });
  });

  // ═══ getMembers ══════════════════════════════════════
  describe("getMembers", () => {
    it("returns members list", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 1, user_id: 1, role: "owner", user_name: "Alice" },
        { id: 2, user_id: 2, role: "editor", user_name: "Bob" },
      ]]);

      const result = await caller.workspace.getMembers({ workspaceId: 1 });

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("owner");
    });

    it("returns empty array when no members", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getMembers({ workspaceId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ addMember ═══════════════════════════════════════
  describe("addMember", () => {
    it("adds member when caller is owner", async () => {
      const caller = createAuthenticatedCaller();
      // caller role check
      queueExecute([[{ role: "owner" }]]);
      // existing member check
      queueExecute([[]]);
      // INSERT member
      queueExecute([[]]);
      // UPDATE member count
      queueExecute([[]]);

      const result = await caller.workspace.addMember({
        workspaceId: 1,
        userId: 5,
        userName: "New User",
        role: "editor",
      });

      expect(result.success).toBe(true);
    });

    it("adds member when caller is admin", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "admin" }]]);
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[]]);

      const result = await caller.workspace.addMember({ workspaceId: 1, userId: 5 });
      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN when caller is editor", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "editor" }]]);

      await expect(caller.workspace.addMember({ workspaceId: 1, userId: 5 })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws FORBIDDEN when caller is viewer", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "viewer" }]]);

      await expect(caller.workspace.addMember({ workspaceId: 1, userId: 5 })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws CONFLICT when user is already a member", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "owner" }]]);
      queueExecute([[{ id: 10 }]]); // already exists

      await expect(caller.workspace.addMember({ workspaceId: 1, userId: 5 })).rejects.toThrow(/已是|CONFLICT/);
    });

    it("defaults role to viewer", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "owner" }]]);
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[]]);

      const result = await caller.workspace.addMember({ workspaceId: 1, userId: 5 });
      expect(result.success).toBe(true);
    });
  });

  // ═══ removeMember ════════════════════════════════════
  describe("removeMember", () => {
    it("removes member when caller is owner", async () => {
      const caller = createAuthenticatedCaller();
      // caller role check
      queueExecute([[{ role: "owner" }]]);
      // target role check (not owner)
      queueExecute([[{ role: "editor" }]]);
      // DELETE
      queueExecute([[]]);
      // UPDATE member count
      queueExecute([[]]);

      const result = await caller.workspace.removeMember({ workspaceId: 1, userId: 5 });
      expect(result.success).toBe(true);
    });

    it("allows user to remove themselves even if viewer", async () => {
      const caller = createAuthenticatedCaller(); // user id = 1
      // caller role check (viewer, but removing self)
      queueExecute([[{ role: "viewer" }]]);
      // target role check
      queueExecute([[{ role: "viewer" }]]);
      // DELETE
      queueExecute([[]]);
      // UPDATE member count
      queueExecute([[]]);

      const result = await caller.workspace.removeMember({ workspaceId: 1, userId: 1 });
      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN when non-owner/admin tries to remove someone else", async () => {
      const caller = createAuthenticatedCaller(); // user id = 1
      queueExecute([[{ role: "editor" }]]); // caller is editor
      // userId 5 != currentUserId 1, and not owner/admin

      await expect(caller.workspace.removeMember({ workspaceId: 1, userId: 5 })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws FORBIDDEN when trying to remove owner", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "admin" }]]); // caller is admin
      queueExecute([[{ role: "owner" }]]); // target is owner

      await expect(caller.workspace.removeMember({ workspaceId: 1, userId: 99 })).rejects.toThrow(/所有者|FORBIDDEN/);
    });
  });

  // ═══ getDocuments ════════════════════════════════════
  describe("getDocuments", () => {
    it("returns all documents for workspace", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 1, name: "Design Spec.pdf", type: "spec", status: "published" },
        { id: 2, name: "BOM v2.xlsx", type: "bom", status: "draft" },
      ]]);

      const result = await caller.workspace.getDocuments({ workspaceId: 1 });
      expect(result).toHaveLength(2);
    });

    it("filters by type", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 1, name: "Design Spec.pdf", type: "spec" }]]);

      const result = await caller.workspace.getDocuments({ workspaceId: 1, type: "spec" });
      expect(result).toHaveLength(1);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 2, name: "Draft Doc", status: "draft" }]]);

      const result = await caller.workspace.getDocuments({ workspaceId: 1, status: "draft" });
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no documents", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getDocuments({ workspaceId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ createDocument ══════════════════════════════════
  describe("createDocument", () => {
    it("creates document and returns id", async () => {
      const caller = createAuthenticatedCaller();
      // INSERT document
      queueExecute([[]]);
      // UPDATE workspace doc count
      queueExecute([[]]);
      // LAST_INSERT_ID
      queueExecute([[{ id: 100 }]]);

      const result = await caller.workspace.createDocument({
        workspaceId: 1,
        name: "Requirements.pdf",
        type: "spec",
        content: "content here",
      });

      expect(result.id).toBe(100);
      expect(result.success).toBe(true);
    });

    it("creates document with file metadata", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 101 }]]);

      const result = await caller.workspace.createDocument({
        workspaceId: 1,
        name: "report.xlsx",
        type: "report",
        fileUrl: "/uploads/report.xlsx",
        fileSize: 204800,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      expect(result.success).toBe(true);
    });

    it("defaults type to 'other'", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 102 }]]);

      const result = await caller.workspace.createDocument({
        workspaceId: 1,
        name: "misc-file.txt",
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.createDocument({ workspaceId: 1, name: "" })).rejects.toThrow();
    });
  });

  // ═══ getTasks ════════════════════════════════════════
  describe("getTasks", () => {
    it("returns all tasks for workspace", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 1, title: "Task A", status: "pending", priority: "high" },
        { id: 2, title: "Task B", status: "in_progress", priority: "medium" },
      ]]);

      const result = await caller.workspace.getTasks({ workspaceId: 1 });
      expect(result).toHaveLength(2);
    });

    it("filters by status", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 1, title: "Done", status: "completed" }]]);

      const result = await caller.workspace.getTasks({ workspaceId: 1, status: "completed" });
      expect(result).toHaveLength(1);
    });

    it("filters by assigneeId", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 1, title: "My Task", assignee_id: 5 }]]);

      const result = await caller.workspace.getTasks({ workspaceId: 1, assigneeId: 5 });
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no tasks", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getTasks({ workspaceId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ createTask ══════════════════════════════════════
  describe("createTask", () => {
    it("creates task and returns id", async () => {
      const caller = createAuthenticatedCaller();
      // INSERT task
      queueExecute([[]]);
      // UPDATE tasks_count
      queueExecute([[]]);
      // LAST_INSERT_ID
      queueExecute([[{ id: 200 }]]);

      const result = await caller.workspace.createTask({
        workspaceId: 1,
        title: "Implement feature X",
        description: "Details here",
        priority: "high",
        dueDate: "2026-04-01",
      });

      expect(result.id).toBe(200);
      expect(result.success).toBe(true);
    });

    it("creates task with assignee and tags", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 201 }]]);

      const result = await caller.workspace.createTask({
        workspaceId: 1,
        title: "Review PR",
        assigneeId: 5,
        assigneeName: "Bob",
        tags: ["review", "urgent"],
      });

      expect(result.success).toBe(true);
    });

    it("defaults priority to medium", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 202 }]]);

      const result = await caller.workspace.createTask({
        workspaceId: 1,
        title: "Basic Task",
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty title", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.createTask({ workspaceId: 1, title: "" })).rejects.toThrow();
    });
  });

  // ═══ updateTaskStatus ════════════════════════════════
  describe("updateTaskStatus", () => {
    it("updates task status to in_progress", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.updateTaskStatus({ taskId: 1, status: "in_progress" });
      expect(result.success).toBe(true);
    });

    it("sets completed_at when status is completed", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.updateTaskStatus({ taskId: 1, status: "completed" });
      expect(result.success).toBe(true);
      // The execute call should have been made (different SQL path)
      expect(mockExecuteFn).toHaveBeenCalled();
    });

    it("updates task status to cancelled", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.updateTaskStatus({ taskId: 1, status: "cancelled" });
      expect(result.success).toBe(true);
    });

    it("updates task status to review", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.updateTaskStatus({ taskId: 1, status: "review" });
      expect(result.success).toBe(true);
    });

    it("updates task status to pending", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.updateTaskStatus({ taskId: 1, status: "pending" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getMessages ═════════════════════════════════════
  describe("getMessages", () => {
    it("returns messages in chronological order (reversed)", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 3, content: "Third", created_at: "2026-03-01T12:03:00Z" },
        { id: 2, content: "Second", created_at: "2026-03-01T12:02:00Z" },
        { id: 1, content: "First", created_at: "2026-03-01T12:01:00Z" },
      ]]);

      const result = await caller.workspace.getMessages({ workspaceId: 1 });

      // The router reverses DESC results to get chronological ASC
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[2].id).toBe(3);
    });

    it("supports beforeId for pagination", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 1, content: "Old message" }]]);

      const result = await caller.workspace.getMessages({ workspaceId: 1, beforeId: 5 });
      expect(result).toHaveLength(1);
    });

    it("supports custom limit", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getMessages({ workspaceId: 1, limit: 10 });
      expect(result).toHaveLength(0);
    });

    it("returns empty array when no messages", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getMessages({ workspaceId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ sendMessage ═════════════════════════════════════
  describe("sendMessage", () => {
    it("sends text message and returns id", async () => {
      const caller = createAuthenticatedCaller();
      // INSERT message
      queueExecute([[]]);
      // UPDATE workspace activity
      queueExecute([[]]);
      // LAST_INSERT_ID
      queueExecute([[{ id: 300 }]]);

      const result = await caller.workspace.sendMessage({
        workspaceId: 1,
        content: "Hello team!",
      });

      expect(result.id).toBe(300);
      expect(result.success).toBe(true);
    });

    it("sends message with attachments and mentions", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 301 }]]);

      const result = await caller.workspace.sendMessage({
        workspaceId: 1,
        content: "@Bob check this file",
        messageType: "mention",
        attachments: [{ name: "spec.pdf", url: "/files/spec.pdf", size: 1024, type: "application/pdf" }],
        mentions: [2, 3],
      });

      expect(result.success).toBe(true);
    });

    it("sends file message", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 302 }]]);

      const result = await caller.workspace.sendMessage({
        workspaceId: 1,
        content: "design.png",
        messageType: "file",
      });

      expect(result.success).toBe(true);
    });

    it("sends reply message", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[{ id: 303 }]]);

      const result = await caller.workspace.sendMessage({
        workspaceId: 1,
        content: "I agree",
        replyToId: 100,
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty content", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.sendMessage({ workspaceId: 1, content: "" })).rejects.toThrow();
    });
  });

  // ═══ getActivities ══════════════════════════════════
  describe("getActivities", () => {
    it("returns activity log", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 1, activity_type: "workspace_created", user_name: "Alice" },
        { id: 2, activity_type: "member_invited", user_name: "Alice" },
      ]]);

      const result = await caller.workspace.getActivities({ workspaceId: 1 });
      expect(result).toHaveLength(2);
    });

    it("respects custom limit", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 1, activity_type: "task_created" }]]);

      const result = await caller.workspace.getActivities({ workspaceId: 1, limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("returns empty array for workspace with no activities", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getActivities({ workspaceId: 999 });
      expect(result).toHaveLength(0);
    });
  });

  // ═══ getStats ════════════════════════════════════════
  describe("getStats", () => {
    it("returns workspace statistics", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{
        member_count: 5,
        document_count: 12,
        total_tasks: 20,
        completed_tasks: 8,
        pending_tasks: 12,
        message_count: 150,
      }]]);

      const result = await caller.workspace.getStats({ workspaceId: 1 });

      expect(result.member_count).toBe(5);
      expect(result.document_count).toBe(12);
      expect(result.total_tasks).toBe(20);
      expect(result.completed_tasks).toBe(8);
      expect(result.pending_tasks).toBe(12);
      expect(result.message_count).toBe(150);
    });

    it("returns empty object when no stats found", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.getStats({ workspaceId: 999 });
      expect(result).toEqual({});
    });
  });

  // ═══ searchUsers ═════════════════════════════════════
  describe("searchUsers", () => {
    it("returns matching users not already in workspace", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[
        { id: 10, name: "John", email: "john@example.com", avatar_url: null },
        { id: 11, name: "Jane", email: "jane@example.com", avatar_url: null },
      ]]);

      const result = await caller.workspace.searchUsers({ query: "j", workspaceId: 1 });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no matches", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]);

      const result = await caller.workspace.searchUsers({ query: "zzz", workspaceId: 1 });
      expect(result).toHaveLength(0);
    });

    it("respects custom limit", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ id: 10, name: "User", email: "u@x.com" }]]);

      const result = await caller.workspace.searchUsers({ query: "u", workspaceId: 1, limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("rejects empty query", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.searchUsers({ query: "", workspaceId: 1 })).rejects.toThrow();
    });
  });

  // ═══ inviteMember ════════════════════════════════════
  describe("inviteMember", () => {
    it("adds existing user directly and records activity", async () => {
      const caller = createAuthenticatedCaller();
      // caller role check
      queueExecute([[{ role: "owner" }]]);
      // find user by email
      queueExecute([[{ id: 20, name: "Bob", email: "bob@example.com" }]]);
      // existing member check
      queueExecute([[]]);
      // INSERT member
      queueExecute([[]]);
      // UPDATE workspace member count
      queueExecute([[]]);
      // INSERT activity
      queueExecute([[]]);

      const result = await caller.workspace.inviteMember({
        workspaceId: 1,
        email: "bob@example.com",
        role: "editor",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("added");
      expect(result.userId).toBe(20);
    });

    it("returns 'invited' status for non-existing user", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "owner" }]]);
      queueExecute([[]]); // user not found

      const result = await caller.workspace.inviteMember({
        workspaceId: 1,
        email: "newuser@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("invited");
      expect((result as any).email).toBe("newuser@example.com");
    });

    it("throws FORBIDDEN when caller is not owner/admin", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "viewer" }]]);

      await expect(caller.workspace.inviteMember({
        workspaceId: 1,
        email: "x@x.com",
      })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws CONFLICT when invited user is already a member", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "admin" }]]);
      queueExecute([[{ id: 20, name: "Bob", email: "bob@example.com" }]]);
      queueExecute([[{ id: 99 }]]); // already member

      await expect(caller.workspace.inviteMember({
        workspaceId: 1,
        email: "bob@example.com",
      })).rejects.toThrow(/已是|CONFLICT/);
    });

    it("rejects invalid email", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.workspace.inviteMember({
        workspaceId: 1,
        email: "not-an-email",
      })).rejects.toThrow();
    });

    it("defaults invite role to viewer", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "owner" }]]);
      queueExecute([[{ id: 30, name: "Carol", email: "carol@example.com" }]]);
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[]]);
      queueExecute([[]]);

      const result = await caller.workspace.inviteMember({
        workspaceId: 1,
        email: "carol@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("added");
    });
  });

  // ═══ updateMemberRole ════════════════════════════════
  describe("updateMemberRole", () => {
    it("updates member role when caller is owner", async () => {
      const caller = createAuthenticatedCaller();
      // caller role check
      queueExecute([[{ role: "owner" }]]);
      // target role check
      queueExecute([[{ role: "editor" }]]);
      // UPDATE
      queueExecute([[]]);

      const result = await caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 5,
        role: "admin",
      });

      expect(result.success).toBe(true);
    });

    it("updates member role when caller is admin", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "admin" }]]);
      queueExecute([[{ role: "viewer" }]]);
      queueExecute([[]]);

      const result = await caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 5,
        role: "editor",
      });

      expect(result.success).toBe(true);
    });

    it("throws FORBIDDEN when caller is editor", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "editor" }]]);

      await expect(caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 5,
        role: "admin",
      })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws FORBIDDEN when caller is viewer", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "viewer" }]]);

      await expect(caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 5,
        role: "editor",
      })).rejects.toThrow(/无权|FORBIDDEN/);
    });

    it("throws FORBIDDEN when trying to change owner's role", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[{ role: "owner" }]]); // caller is owner
      queueExecute([[{ role: "owner" }]]); // target is also owner

      await expect(caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 99,
        role: "admin",
      })).rejects.toThrow(/所有者|FORBIDDEN/);
    });

    it("throws FORBIDDEN when caller has no membership", async () => {
      const caller = createAuthenticatedCaller();
      queueExecute([[]]); // no membership found

      await expect(caller.workspace.updateMemberRole({
        workspaceId: 1,
        userId: 5,
        role: "admin",
      })).rejects.toThrow(/无权|FORBIDDEN/);
    });
  });
});

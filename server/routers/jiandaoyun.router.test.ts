/**
 * Jiandaoyun Integration Router — Unit Tests
 * Tests all procedures: sync service, user sync, scheduler, permission mapping,
 * full import, form discovery, approval viewer, knowledge base.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller, createAdminCaller } from "../_test/trpc-test-utils";

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
    execute: vi.fn((sql: any) => {
      const result = getNextResult();
      return Promise.resolve([result]);
    }),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock services ───────────────────────────────────────
const mockSyncService = {
  isConfigured: vi.fn(() => true),
  getCorpId: vi.fn(() => "corp_123"),
  getStats: vi.fn(() => ({ apps: 5, forms: 20, records: 1000 })),
  testConnection: vi.fn(() => Promise.resolve({ success: true, message: "Connected" })),
  syncApps: vi.fn(() => Promise.resolve([{ id: "app1", name: "App 1" }])),
  syncForms: vi.fn(() => Promise.resolve([{ id: "form1", name: "Form 1" }])),
  getFormFields: vi.fn(() => Promise.resolve([{ name: "field1", type: "text" }])),
  getFormData: vi.fn(() => Promise.resolve({ data: [{ _id: "1", name: "test" }] })),
  getFormStats: vi.fn(() => Promise.resolve({ count: 42 })),
  getDepartments: vi.fn(() => Promise.resolve([{ dept_no: 1, name: "Engineering" }])),
  getMembers: vi.fn(() => Promise.resolve([{ username: "user1", name: "Test User", status: 1, departments: [1] }])),
  getRoles: vi.fn(() => Promise.resolve([{ role_no: 1, role_name: "Admin" }])),
  getRoleMembers: vi.fn(() => Promise.resolve([{ username: "user1", name: "Test" }])),
  fullSync: vi.fn(() => Promise.resolve({ apps: [{ id: "app1" }], totalRecords: 100, formCounts: { form1: 50 } })),
};

const mockUserSyncService = {
  syncMembers: vi.fn(() => Promise.resolve({ created: 5, updated: 2 })),
  syncDepartments: vi.fn(() => Promise.resolve({ created: 3, updated: 1 })),
  syncRoles: vi.fn(() => Promise.resolve({ created: 2, updated: 0 })),
  getUserMappings: vi.fn(() => Promise.resolve([{ jdyUsername: "u1", grtUserId: 1 }])),
  getDeptMappings: vi.fn(() => Promise.resolve([{ jdyDeptNo: 1, grtDeptId: 10 }])),
  getRoleMappings: vi.fn(() => Promise.resolve([{ jdyRoleNo: 1, grtRoleId: "admin" }])),
  linkUserToGrt: vi.fn(() => Promise.resolve(true)),
  linkRoleToGrt: vi.fn(() => Promise.resolve(true)),
  syncRoleMembers: vi.fn(() => Promise.resolve({ synced: 10 })),
  getRoleMemberMappings: vi.fn(() => Promise.resolve([{ roleNo: 1, username: "u1" }])),
};

const mockScheduler = {
  getTasks: vi.fn(() => Promise.resolve([{ id: 1, taskName: "Sync Users" }])),
  createTask: vi.fn(() => Promise.resolve(1)),
  updateTaskStatus: vi.fn(() => Promise.resolve()),
  deleteTask: vi.fn(() => Promise.resolve()),
  executeTask: vi.fn(() => Promise.resolve({ status: "completed", records: 50 })),
  getTaskLogs: vi.fn(() => Promise.resolve([{ id: 1, status: "completed" }])),
  getStats: vi.fn(() => Promise.resolve({ totalTasks: 5, lastRun: "2026-01-01" })),
  createDefaultTasks: vi.fn(() => Promise.resolve([1, 2, 3])),
};

const mockPermissionService = {
  getRolePermissions: vi.fn(() => ["read", "write"]),
  getUserPermissions: vi.fn(() => Promise.resolve(["read", "write", "admin"])),
  checkUserPermission: vi.fn(() => Promise.resolve(true)),
  autoMapRoles: vi.fn(() => Promise.resolve({ mapped: 5, skipped: 2 })),
  getMappingStats: vi.fn(() => Promise.resolve({ total: 10, mapped: 8, unmapped: 2 })),
  suggestGrtRole: vi.fn(() => "admin"),
};

const mockFullImportService = {
  isRunning: vi.fn(() => false),
  startImport: vi.fn(() => Promise.resolve("RUN_001")),
  getProgress: vi.fn(() => Promise.resolve({ phase: "org", progress: 50, status: "running" })),
  getImportRuns: vi.fn(() => Promise.resolve([{ runCode: "RUN_001", status: "completed" }])),
  requestCancel: vi.fn(() => true),
  getVerification: vi.fn(() => Promise.resolve({ valid: true, errors: [] })),
};

const mockFormDiscoveryService = {
  discoverForms: vi.fn(() => Promise.resolve({ discovered: 10, mapped: 8 })),
  getFormMappings: vi.fn(() => Promise.resolve([{ id: 1, formId: "f1", targetEntity: "projects" }])),
  getConfirmedMappings: vi.fn(() => Promise.resolve([{ id: 1, formId: "f1", targetEntity: "projects" }])),
  updateFormMapping: vi.fn(() => Promise.resolve({ id: 1, updated: true })),
};

vi.mock("../jiandaoyun", () => ({
  getJiandaoyunSyncService: vi.fn(() => mockSyncService),
  getJiandaoyunUserSyncService: vi.fn(() => mockUserSyncService),
}));

vi.mock("../services/jiandaoyun-scheduler.service", () => ({
  getJiandaoyunScheduler: vi.fn(() => mockScheduler),
}));

vi.mock("../services/permission-mapping.service", () => ({
  getPermissionMappingService: vi.fn(() => mockPermissionService),
  GRT_ROLES: {
    admin: { id: "admin", name: "Administrator", description: "Full access", permissions: ["all"] },
    employee: { id: "employee", name: "Employee", description: "Basic access", permissions: ["read"] },
  },
  GRT_PERMISSIONS: {
    READ: "resource:read",
    WRITE: "resource:write",
    ADMIN: "resource:admin",
  },
}));

vi.mock("../services/jdy-full-import.service", () => ({
  getJdyFullImportService: vi.fn(() => mockFullImportService),
}));

vi.mock("../services/jdy-form-discovery.service", () => ({
  getJdyFormDiscoveryService: vi.fn(() => mockFormDiscoveryService),
}));

vi.mock("../services/jdy-knowledge-import.service", () => ({
  getJdyKnowledgeImportService: vi.fn(() => ({
    importKnowledge: vi.fn(() => Promise.resolve({ imported: 15, skipped: 3 })),
  })),
}));

// ── Reset ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  mockSyncService.isConfigured.mockReturnValue(true);
  mockFullImportService.isRunning.mockReturnValue(false);
});

// ── Tests ───────────────────────────────────────────────
describe("jiandaoyun router", () => {

  // ═══ Sync Service ═══════════════════════════════════

  describe("getStatus", () => {
    it("returns configured status", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getStatus();
      expect(result).toHaveProperty("configured", true);
      expect(result).toHaveProperty("corpId", "corp_123");
      expect(result).toHaveProperty("stats");
    });
  });

  describe("testConnection", () => {
    it("tests API connection", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.testConnection();
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("getApps", () => {
    it("returns app list when configured", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApps();
      expect(result.apps).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns error when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApps();
      expect(result.apps).toHaveLength(0);
      expect(result.error).toContain("未配置");
    });

    it("handles service error gracefully", async () => {
      mockSyncService.syncApps.mockRejectedValueOnce(new Error("Network error"));
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApps();
      expect(result.apps).toHaveLength(0);
      expect(result.error).toBe("Network error");
    });
  });

  describe("getForms", () => {
    it("returns form list for app", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getForms({ appId: "app1" });
      expect(result.forms).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns error when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getForms({ appId: "app1" });
      expect(result.forms).toHaveLength(0);
      expect(result.error).toContain("未配置");
    });
  });

  describe("getFormFields", () => {
    it("returns field structure", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormFields({ appId: "app1", formId: "form1" });
      expect(result.fields).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns error when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormFields({ appId: "app1", formId: "form1" });
      expect(result.fields).toHaveLength(0);
    });
  });

  describe("getFormData", () => {
    it("returns form data with pagination", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormData({ appId: "app1", formId: "form1", limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns error when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormData({ appId: "app1", formId: "form1" });
      expect(result.data).toHaveLength(0);
    });
  });

  describe("getFormStats", () => {
    it("returns count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormStats({ appId: "app1", formId: "form1" });
      expect(result.count).toBe(42);
      expect(result.error).toBeNull();
    });

    it("returns 0 when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormStats({ appId: "app1", formId: "form1" });
      expect(result.count).toBe(0);
    });
  });

  describe("getDepartments", () => {
    it("returns department list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getDepartments({ deptNo: 1 });
      expect(result.departments).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns empty when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getDepartments({});
      expect(result.departments).toHaveLength(0);
    });
  });

  describe("getMembers", () => {
    it("returns member list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMembers({ deptNo: 1 });
      expect(result.members).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns empty when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMembers({});
      expect(result.members).toHaveLength(0);
    });
  });

  describe("getRoles", () => {
    it("returns role list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoles();
      expect(result.roles).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns empty when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoles();
      expect(result.roles).toHaveLength(0);
    });
  });

  // ═══ Admin Sync ═══════════════════════════════════

  describe("fullSync", () => {
    it("executes full sync (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.fullSync();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("apps", 1);
      expect(result).toHaveProperty("totalRecords", 100);
    });

    it("returns error when not configured (admin)", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.fullSync();
      expect(result).toHaveProperty("success", false);
    });
  });

  // ═══ User Sync ═══════════════════════════════════

  describe("syncMembers", () => {
    it("syncs members (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.syncMembers();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 5);
    });
  });

  describe("syncDepartments", () => {
    it("syncs departments (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.syncDepartments();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 3);
    });
  });

  describe("syncRoles", () => {
    it("syncs roles (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.syncRoles();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("created", 2);
    });
  });

  describe("getUserMappings", () => {
    it("returns user mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getUserMappings();
      expect(result.mappings).toHaveLength(1);
    });
  });

  describe("getDeptMappings", () => {
    it("returns department mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getDeptMappings();
      expect(result.mappings).toHaveLength(1);
    });
  });

  describe("getRoleMappings", () => {
    it("returns role mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoleMappings();
      expect(result.mappings).toHaveLength(1);
    });
  });

  describe("linkUserToGrt", () => {
    it("links JDY user to GRT user (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.linkUserToGrt({
        jdyUsername: "zhang3", grtUserId: 1,
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("linkRoleToGrt", () => {
    it("links JDY role to GRT role (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.linkRoleToGrt({
        jdyRoleNo: 1, grtRoleId: "admin", grtRoleName: "Administrator",
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("syncRoleMembers", () => {
    it("syncs role members (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.syncRoleMembers();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("synced", 10);
    });
  });

  describe("getRoleMemberMappings", () => {
    it("returns role member mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoleMemberMappings({});
      expect(result.mappings).toHaveLength(1);
    });

    it("filters by roleNo", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoleMemberMappings({ roleNo: 1 });
      expect(result.mappings).toHaveLength(1);
    });
  });

  describe("getRoleMembersLive", () => {
    it("returns live role members", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoleMembersLive({ roleNo: 1 });
      expect(result.members).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("returns empty when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRoleMembersLive({ roleNo: 1 });
      expect(result.members).toHaveLength(0);
    });
  });

  // ═══ Scheduler ═══════════════════════════════════

  describe("getSyncTasks", () => {
    it("returns sync tasks", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getSyncTasks();
      expect(result.tasks).toHaveLength(1);
    });
  });

  describe("createSyncTask", () => {
    it("creates a sync task (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.createSyncTask({
        taskName: "Sync Users Daily",
        taskType: "user",
        syncDirection: "jdy_to_grt",
        isEnabled: true,
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("taskId", 1);
    });
  });

  describe("updateTaskStatus", () => {
    it("updates task enabled status (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.updateTaskStatus({ taskId: 1, enabled: false });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("deleteSyncTask", () => {
    it("deletes a sync task (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.deleteSyncTask({ taskId: 1 });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("executeSyncTask", () => {
    it("executes a sync task (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.executeSyncTask({ taskId: 1 });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("status", "completed");
    });

    it("returns failure on failed task", async () => {
      mockScheduler.executeTask.mockResolvedValueOnce({ status: "failed", error: "timeout" });
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.executeSyncTask({ taskId: 1 });
      expect(result).toHaveProperty("success", false);
    });
  });

  describe("getSyncLogs", () => {
    it("returns sync logs", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getSyncLogs({});
      expect(result.logs).toHaveLength(1);
    });

    it("filters by taskId", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getSyncLogs({ taskId: 1, limit: 10 });
      expect(result.logs).toHaveLength(1);
    });
  });

  describe("getSyncStats", () => {
    it("returns sync statistics", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getSyncStats();
      expect(result.stats).toHaveProperty("totalTasks", 5);
    });
  });

  describe("createDefaultTasks", () => {
    it("creates default sync tasks (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.createDefaultTasks();
      expect(result).toHaveProperty("success", true);
      expect(result.taskIds).toHaveLength(3);
    });
  });

  // ═══ Permission Mapping ═══════════════════════════════════

  describe("getGrtRoles", () => {
    it("returns GRT role list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getGrtRoles();
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]).toHaveProperty("name");
      expect(result.roles[0]).toHaveProperty("permissionCount");
    });
  });

  describe("getGrtPermissions", () => {
    it("returns GRT permission list", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getGrtPermissions();
      expect(result.permissions).toHaveLength(3);
      expect(result.permissions[0]).toHaveProperty("key");
      expect(result.permissions[0]).toHaveProperty("category");
      expect(result.permissions[0]).toHaveProperty("action");
    });
  });

  describe("getRolePermissions", () => {
    it("returns permissions for a role", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getRolePermissions({ roleId: "admin" });
      expect(result.permissions).toContain("read");
      expect(result.permissions).toContain("write");
    });
  });

  describe("getUserPermissions", () => {
    it("returns user permissions", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getUserPermissions({ userId: 1 });
      expect(result.permissions).toContain("admin");
    });
  });

  describe("checkUserPermission", () => {
    it("checks if user has permission", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.checkUserPermission({ userId: 1, permission: "admin" });
      expect(result).toHaveProperty("hasPermission", true);
    });
  });

  describe("autoMapRoles", () => {
    it("auto maps JDY roles to GRT (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.autoMapRoles();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("mapped", 5);
    });
  });

  describe("getMappingStats", () => {
    it("returns mapping statistics", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMappingStats();
      expect(result.stats).toHaveProperty("total", 10);
    });
  });

  describe("suggestGrtRole", () => {
    it("suggests GRT role for JDY role name", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.suggestGrtRole({ jdyRoleName: "管理员" });
      expect(result).toHaveProperty("suggestedRoleId", "admin");
      expect(result).toHaveProperty("suggestedRoleName", "Administrator");
    });
  });

  // ═══ BU Members ═══════════════════════════════════

  describe("getMembersByBU", () => {
    it("returns members grouped by BU", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMembersByBU();
      expect(result.buMembers).toHaveLength(5);
      expect(result.error).toBeNull();
    });

    it("returns empty when not configured", async () => {
      mockSyncService.isConfigured.mockReturnValue(false);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMembersByBU();
      expect(result.buMembers).toHaveLength(0);
    });
  });

  // ═══ Full Import ═══════════════════════════════════

  describe("startFullImport", () => {
    it("starts full import (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.startFullImport({
        phases: ["org", "user"],
        dryRun: false,
      });
      expect(result).toHaveProperty("runCode", "RUN_001");
    });

    it("throws when import already running", async () => {
      mockFullImportService.isRunning.mockReturnValue(true);
      const caller = createAdminCaller();
      await expect(caller.jiandaoyun.startFullImport({
        phases: ["org"],
        dryRun: false,
      })).rejects.toThrow("已有导入任务正在运行");
    });
  });

  describe("getImportProgress", () => {
    it("returns import progress", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getImportProgress({ runCode: "RUN_001" });
      expect(result).toHaveProperty("phase", "org");
      expect(result).toHaveProperty("progress", 50);
    });

    it("throws when run not found", async () => {
      mockFullImportService.getProgress.mockResolvedValueOnce(null);
      const caller = createAuthenticatedCaller();
      await expect(caller.jiandaoyun.getImportProgress({ runCode: "INVALID" })).rejects.toThrow("未找到");
    });
  });

  describe("getImportRuns", () => {
    it("returns import run history", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getImportRuns();
      expect(result).toHaveLength(1);
    });
  });

  describe("cancelImport", () => {
    it("cancels import (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.cancelImport();
      expect(result).toHaveProperty("cancelled", true);
    });
  });

  describe("isImportRunning", () => {
    it("checks if import is running", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.isImportRunning();
      expect(result).toHaveProperty("running", false);
    });
  });

  // ═══ Form Discovery ═══════════════════════════════════

  describe("discoverForms", () => {
    it("discovers forms (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.discoverForms();
      expect(result).toHaveProperty("discovered", 10);
    });
  });

  describe("getFormMappings", () => {
    it("returns form mappings", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormMappings({});
      expect(result).toHaveLength(1);
    });

    it("returns confirmed mappings only", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getFormMappings({ confirmedOnly: true });
      expect(result).toHaveLength(1);
    });
  });

  describe("updateFormMapping", () => {
    it("updates a form mapping (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.updateFormMapping({
        id: 1, targetEntity: "employees",
      });
      expect(result).toHaveProperty("updated", true);
    });
  });

  describe("getImportVerification", () => {
    it("returns verification results", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getImportVerification();
      expect(result).toHaveProperty("valid", true);
    });
  });

  // ═══ Approval Viewer ═══════════════════════════════════

  describe("getApprovalTemplates", () => {
    it("returns approval templates", async () => {
      selectResultsQueue.push([{ id: 1, template_name: "Leave", steps: "[]", instance_count: 5 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApprovalTemplates();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getApprovalInstances", () => {
    it("returns approval instances", async () => {
      // data query + count query in Promise.all
      selectResultsQueue.push([{ id: 1, status: "pending" }]);
      selectResultsQueue.push([{ cnt: 10 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApprovalInstances({});
      expect(result).toHaveProperty("instances");
      expect(result).toHaveProperty("total");
    });
  });

  describe("getApprovalStepRecords", () => {
    it("returns step records for instance", async () => {
      selectResultsQueue.push([{ id: 1, step_number: 1, status: "approved" }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApprovalStepRecords({ instanceId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getApprovalStats", () => {
    it("returns approval statistics", async () => {
      // 3 Promise.all queries
      selectResultsQueue.push([{ status: "pending", cnt: 5 }, { status: "approved", cnt: 10 }]);
      selectResultsQueue.push([{ template_name: "Leave", cnt: 8 }]);
      selectResultsQueue.push([{ avg_minutes: 30.5 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getApprovalStats();
      expect(result).toHaveProperty("statusDistribution");
      expect(result).toHaveProperty("topTemplates");
      expect(result).toHaveProperty("totalInstances");
    });
  });

  // ═══ Knowledge Base ═══════════════════════════════════

  describe("getKnowledgeDocuments", () => {
    it("returns knowledge documents", async () => {
      // 3 Promise.all queries
      selectResultsQueue.push([{ id: 1, title: "Doc 1", tags: "[]" }]);
      selectResultsQueue.push([{ cnt: 1 }]);
      selectResultsQueue.push([{ category: "SOP", cnt: 5 }]);
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getKnowledgeDocuments({});
      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("categoryStats");
    });
  });

  describe("importKnowledge", () => {
    it("imports knowledge documents (admin)", async () => {
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.importKnowledge();
      expect(result).toHaveProperty("imported", 15);
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════

  describe("authentication", () => {
    it("rejects anonymous for getStatus", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.jiandaoyun.getStatus()).rejects.toThrow();
    });

    it("rejects anonymous for fullSync", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.jiandaoyun.fullSync()).rejects.toThrow();
    });

    it("rejects anonymous for syncMembers", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.jiandaoyun.syncMembers()).rejects.toThrow();
    });

    it("rejects anonymous for startFullImport", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.jiandaoyun.startFullImport({
        phases: ["org"], dryRun: false,
      })).rejects.toThrow();
    });

    it("rejects anonymous for importKnowledge", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.jiandaoyun.importKnowledge()).rejects.toThrow();
    });

    it("rejects non-admin for fullSync", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.jiandaoyun.fullSync()).rejects.toThrow();
    });

    it("rejects non-admin for createSyncTask", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.jiandaoyun.createSyncTask({
        taskName: "T", taskType: "user", syncDirection: "jdy_to_grt", isEnabled: true,
      })).rejects.toThrow();
    });

    it("rejects non-admin for discoverForms", async () => {
      const caller = createAuthenticatedCaller();
      await expect(caller.jiandaoyun.discoverForms()).rejects.toThrow();
    });
  });

  // ═══ Service Error Handling ═══════════════════════════════════

  describe("error handling", () => {
    it("handles syncMembers error gracefully", async () => {
      mockUserSyncService.syncMembers.mockRejectedValueOnce(new Error("DB error"));
      const caller = createAdminCaller();
      const result = await caller.jiandaoyun.syncMembers();
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error", "DB error");
    });

    it("handles scheduler error gracefully", async () => {
      mockScheduler.getTasks.mockRejectedValueOnce(new Error("Connection lost"));
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getSyncTasks();
      expect(result.tasks).toHaveLength(0);
      expect(result.error).toBe("Connection lost");
    });

    it("handles getUserPermissions error", async () => {
      mockPermissionService.getUserPermissions.mockRejectedValueOnce(new Error("User not found"));
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getUserPermissions({ userId: 999 });
      expect(result.permissions).toHaveLength(0);
      expect(result.error).toBe("User not found");
    });

    it("handles getMappingStats error", async () => {
      mockPermissionService.getMappingStats.mockRejectedValueOnce(new Error("DB timeout"));
      const caller = createAuthenticatedCaller();
      const result = await caller.jiandaoyun.getMappingStats();
      expect(result.stats).toBeNull();
      expect(result.error).toBe("DB timeout");
    });
  });
});

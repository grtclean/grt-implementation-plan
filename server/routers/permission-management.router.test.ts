/**
 * Permission Management Router — Unit Tests
 * Tests 12 procedures: login, getUserPermissions, checkPermission,
 * listUsers, createUser, updateUserPermissions, listDiscussionPools,
 * createDiscussionPool, inviteExternalUser, getAuditLogs,
 * getPermissionSuggestions
 *
 * NOTE: This router has its own internal permission system (generateUserPermissions)
 * which gives admin permissions ONLY to userId===1. The tRPC test helpers set:
 *   - createAuthenticatedCaller({ id: 1 }) → user.id=1 (gets internal admin perms)
 *   - createAuthenticatedCaller({ id: 2 }) → user.id=2 (does NOT get internal admin perms)
 * So we use createAuthenticatedCaller({ id: 1 }) for admin operations and
 * createAuthenticatedCaller({ id: 2 }) for non-admin user tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller } from "../_test/trpc-test-utils";

// Mock LLM for permission suggestions
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "Suggested permissions: read:projects, write:tasks" } }],
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// Internal-admin caller: user.id=1 gets admin permissions from generateUserPermissions
const internalAdmin = () => createAuthenticatedCaller({ id: 1 });
// Non-admin caller: any user.id != 1
const nonAdmin = () => createAuthenticatedCaller({ id: 2 });

describe("permission-management router", () => {

  describe("login", () => {
    it("returns mock token and user", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.login({
        username: "testuser", password: "password123",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("token");
      expect(result.user).toHaveProperty("username", "testuser");
      expect(result.user).toHaveProperty("role", "employee");
      expect(result.user.permissions).toContain("read:dashboard");
    });

    it("rejects short username", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.login({
        username: "ab", password: "password123",
      })).rejects.toThrow();
    });

    it("rejects short password", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.login({
        username: "testuser", password: "12345",
      })).rejects.toThrow();
    });
  });

  describe("getUserPermissions", () => {
    it("returns permissions for authenticated user", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.getUserPermissions();
      expect(result).toHaveProperty("userId", 1);
      expect(result).toHaveProperty("permissions");
      expect(result).toHaveProperty("roles");
      expect(Array.isArray(result.permissions)).toBe(true);
    });

    it("user.id=1 gets admin permissions", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.getUserPermissions();
      expect(result.permissions).toContain("admin:users:read");
      expect(result.permissions).toContain("admin:permissions:write");
      expect(result.permissions).toContain("audit:read");
    });

    it("non-admin user gets basic permissions only", async () => {
      const caller = nonAdmin();
      const result = await caller.permissionManagement.getUserPermissions();
      expect(result.permissions).toContain("read:dashboard");
      expect(result.permissions).not.toContain("admin:users:read");
    });
  });

  describe("checkPermission", () => {
    it("returns true for valid permission", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.checkPermission({
        permission: "read:dashboard",
      });
      expect(result.hasPermission).toBe(true);
    });

    it("returns false for missing permission", async () => {
      const caller = nonAdmin();
      const result = await caller.permissionManagement.checkPermission({
        permission: "admin:users:read",
      });
      expect(result.hasPermission).toBe(false);
    });

    it("checks with resource ID", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.checkPermission({
        permission: "read:projects", resourceId: 42,
      });
      expect(result).toHaveProperty("hasPermission");
    });
  });

  describe("listUsers", () => {
    it("returns user list for internal admin (userId=1)", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.listUsers({});
      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("total");
      expect(result.users.length).toBeGreaterThan(0);
    });

    it("returns paginated response", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.listUsers({ page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it("non-admin gets FORBIDDEN", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.listUsers({})).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("createUser", () => {
    it("creates user as internal admin", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.createUser({
        username: "newuser", password: "password123",
        name: "New User", email: "new@example.com", role: "employee",
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("userId");
      expect(result.message).toContain("newuser");
    });

    it("creates user with department", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.createUser({
        username: "dept_user", password: "password123",
        name: "Dept User", email: "dept@example.com",
        role: "manager", department: "Engineering",
      });
      expect(result.success).toBe(true);
    });

    it("non-admin gets FORBIDDEN", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.createUser({
        username: "test", password: "password123",
        name: "Test", email: "test@example.com", role: "employee",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("rejects invalid role", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.createUser({
        username: "test", password: "password123",
        name: "Test", email: "test@example.com", role: "superadmin" as any,
      })).rejects.toThrow();
    });

    it("rejects invalid email", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.createUser({
        username: "test", password: "password123",
        name: "Test", email: "invalid-email", role: "employee",
      })).rejects.toThrow();
    });
  });

  describe("updateUserPermissions", () => {
    it("updates permissions as internal admin", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.updateUserPermissions({
        userId: 2, permissions: ["read:projects", "write:tasks"],
        roles: ["employee", "manager"],
      });
      expect(result).toHaveProperty("success", true);
      expect(result.userId).toBe(2);
      expect(result.permissions).toContain("read:projects");
    });

    it("non-admin gets FORBIDDEN", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.updateUserPermissions({
        userId: 2, permissions: ["admin:all"], roles: ["admin"],
      })).rejects.toThrow(/FORBIDDEN/);
    });
  });

  describe("listDiscussionPools", () => {
    it("returns discussion pools", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.listDiscussionPools();
      expect(result).toHaveProperty("pools");
      expect(result.pools.length).toBeGreaterThan(0);
      expect(result.pools[0]).toHaveProperty("name");
      expect(result.pools[0]).toHaveProperty("type");
      expect(result.pools[0]).toHaveProperty("memberCount");
    });
  });

  describe("createDiscussionPool", () => {
    it("non-admin gets FORBIDDEN for createDiscussionPool", async () => {
      // discussion:create is not in any user's permission list
      const caller = nonAdmin();
      await expect(caller.permissionManagement.createDiscussionPool({
        name: "Test Pool", description: "A test pool", type: "general",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("internal admin also gets FORBIDDEN (discussion:create not in permission set)", async () => {
      // Even userId=1 doesn't have 'discussion:create'
      const caller = internalAdmin();
      await expect(caller.permissionManagement.createDiscussionPool({
        name: "Test Pool", description: "A test pool", type: "general",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("rejects invalid type", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.createDiscussionPool({
        name: "Test", description: "Test", type: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  describe("inviteExternalUser", () => {
    it("non-admin gets FORBIDDEN (users:invite not in permission set)", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.inviteExternalUser({
        email: "partner@company.com", companyName: "Partner Corp",
        companyType: "partner",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("internal admin also gets FORBIDDEN (users:invite not in permission set)", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.inviteExternalUser({
        email: "partner@company.com", companyName: "Partner Corp",
        companyType: "partner",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("rejects invalid company type", async () => {
      const caller = internalAdmin();
      await expect(caller.permissionManagement.inviteExternalUser({
        email: "test@example.com", companyName: "Test",
        companyType: "government" as any,
      })).rejects.toThrow();
    });
  });

  describe("getAuditLogs", () => {
    it("returns audit logs for internal admin", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.getAuditLogs({});
      expect(result).toHaveProperty("logs");
      expect(result).toHaveProperty("total");
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs[0]).toHaveProperty("action");
      expect(result.logs[0]).toHaveProperty("module");
    });

    it("non-admin gets FORBIDDEN", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.getAuditLogs({})).rejects.toThrow(/FORBIDDEN/);
    });

    it("accepts filter parameters", async () => {
      const caller = internalAdmin();
      const result = await caller.permissionManagement.getAuditLogs({
        page: 1, limit: 10, userId: 1, action: "login",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe("startPermissionSuggestions (async task pattern)", () => {
    it("non-admin gets FORBIDDEN (admin:permissions:suggest not in set)", async () => {
      const caller = nonAdmin();
      await expect(caller.permissionManagement.startPermissionSuggestions({
        userId: 5, jobTitle: "X", department: "Y", responsibilities: "Z",
      })).rejects.toThrow(/FORBIDDEN/);
    });

    it("internal admin also gets FORBIDDEN (admin:permissions:suggest not in set)", async () => {
      // userId=1 has admin:permissions:write but not admin:permissions:suggest
      const caller = internalAdmin();
      await expect(caller.permissionManagement.startPermissionSuggestions({
        userId: 5, jobTitle: "X", department: "Y", responsibilities: "Z",
      })).rejects.toThrow(/FORBIDDEN/);
    });
  });

  // ═══ Auth Guards ═══════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous for login", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.permissionManagement.login({
        username: "test", password: "password123",
      })).rejects.toThrow();
    });

    it("rejects anonymous for getUserPermissions", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.permissionManagement.getUserPermissions()).rejects.toThrow();
    });

    it("rejects anonymous for checkPermission", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.permissionManagement.checkPermission({
        permission: "read:dashboard",
      })).rejects.toThrow();
    });

    it("rejects anonymous for listDiscussionPools", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.permissionManagement.listDiscussionPools()).rejects.toThrow();
    });
  });
});

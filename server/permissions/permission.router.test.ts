/**
 * 权限路由测试
 */

import { describe, expect, it } from "vitest";
import { 
  ROLE_PERMISSIONS, 
  HUB_PAGE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  canAccessPage,
  isRoleAtLeast,
  getUserPermissions,
} from "./config";

describe("Permission Config", () => {
  describe("ROLE_PERMISSIONS", () => {
    it("should have all four roles defined", () => {
      expect(ROLE_PERMISSIONS).toHaveProperty("admin");
      expect(ROLE_PERMISSIONS).toHaveProperty("manager");
      expect(ROLE_PERMISSIONS).toHaveProperty("user");
      expect(ROLE_PERMISSIONS).toHaveProperty("viewer");
    });

    it("admin should have the most permissions", () => {
      const adminCount = ROLE_PERMISSIONS.admin.length;
      const managerCount = ROLE_PERMISSIONS.manager.length;
      const userCount = ROLE_PERMISSIONS.user.length;
      const viewerCount = ROLE_PERMISSIONS.viewer.length;

      expect(adminCount).toBeGreaterThan(managerCount);
      expect(managerCount).toBeGreaterThan(userCount);
      expect(userCount).toBeGreaterThan(viewerCount);
    });

    it("viewer should have only view permissions", () => {
      const viewerPerms = ROLE_PERMISSIONS.viewer;
      const viewOnlyPerms = viewerPerms.filter(p => p.includes(":view"));
      expect(viewOnlyPerms.length).toBe(viewerPerms.length);
    });
  });

  describe("hasPermission", () => {
    it("admin should have system:admin permission", () => {
      expect(hasPermission("admin", "system:admin")).toBe(true);
    });

    it("viewer should not have system:admin permission", () => {
      expect(hasPermission("viewer", "system:admin")).toBe(false);
    });

    it("user should have liquid-workforce:view permission", () => {
      expect(hasPermission("user", "liquid-workforce:view")).toBe(true);
    });

    it("viewer should have liquid-workforce:view permission", () => {
      expect(hasPermission("viewer", "liquid-workforce:view")).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("admin should have all permissions", () => {
      const perms = ["system:admin", "user:manage", "project:admin"];
      expect(hasAllPermissions("admin", perms)).toBe(true);
    });

    it("user should not have all admin permissions", () => {
      const perms = ["system:admin", "user:manage"];
      expect(hasAllPermissions("user", perms)).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("user should have any of the specified permissions", () => {
      const perms = ["system:admin", "liquid-workforce:view"];
      expect(hasAnyPermission("user", perms)).toBe(true);
    });

    it("viewer should not have any admin permissions", () => {
      const perms = ["system:admin", "user:manage", "project:admin"];
      expect(hasAnyPermission("viewer", perms)).toBe(false);
    });
  });

  describe("isRoleAtLeast", () => {
    it("admin should be at least admin", () => {
      expect(isRoleAtLeast("admin", "admin")).toBe(true);
    });

    it("admin should be at least user", () => {
      expect(isRoleAtLeast("admin", "user")).toBe(true);
    });

    it("user should not be at least admin", () => {
      expect(isRoleAtLeast("user", "admin")).toBe(false);
    });

    it("manager should be at least user", () => {
      expect(isRoleAtLeast("manager", "user")).toBe(true);
    });
  });

  describe("getUserPermissions", () => {
    it("should return correct permissions for each role", () => {
      const adminPerms = getUserPermissions("admin");
      const userPerms = getUserPermissions("user");

      expect(adminPerms).toEqual(ROLE_PERMISSIONS.admin);
      expect(userPerms).toEqual(ROLE_PERMISSIONS.user);
    });
  });

  describe("HUB_PAGE_PERMISSIONS", () => {
    it("should have permissions for all major hub pages", () => {
      const hubPages = [
        "/liquid-workforce-hub",
        "/ai-sales-hub",
        "/stage-gate-hub",
        "/personal-agent-hub",
        "/project-hub",
        "/social-community-hub",
      ];

      hubPages.forEach(page => {
        expect(HUB_PAGE_PERMISSIONS).toHaveProperty(page);
      });
    });

    it("admin pages should require admin role", () => {
      const adminPages = [
        "/admin/erp-configuration",
        "/admin/webhooks",
      ];

      adminPages.forEach(page => {
        const config = HUB_PAGE_PERMISSIONS[page];
        expect(config?.minRole).toBe("admin");
      });
    });
  });

  describe("canAccessPage", () => {
    it("admin should access all pages", () => {
      const pages = Object.keys(HUB_PAGE_PERMISSIONS);
      pages.forEach(page => {
        expect(canAccessPage("admin", page)).toBe(true);
      });
    });

    it("viewer should not access admin pages", () => {
      expect(canAccessPage("viewer", "/admin/erp-configuration")).toBe(false);
      expect(canAccessPage("viewer", "/admin/webhooks")).toBe(false);
    });

    it("user should access basic hub pages", () => {
      expect(canAccessPage("user", "/liquid-workforce-hub")).toBe(true);
      expect(canAccessPage("user", "/ai-sales-hub")).toBe(true);
    });

    it("viewer should access view-only hub pages", () => {
      expect(canAccessPage("viewer", "/liquid-workforce-hub")).toBe(true);
      expect(canAccessPage("viewer", "/ai-sales-hub")).toBe(true);
    });

    it("unknown pages should be accessible by default", () => {
      expect(canAccessPage("user", "/unknown-page")).toBe(true);
    });
  });

  describe("Permission Hierarchy", () => {
    it("should maintain proper permission hierarchy", () => {
      const roles = ["viewer", "user", "manager", "admin"] as const;
      
      for (let i = 0; i < roles.length - 1; i++) {
        const lowerRole = roles[i];
        const higherRole = roles[i + 1];
        
        const lowerPerms = ROLE_PERMISSIONS[lowerRole];
        const higherPerms = ROLE_PERMISSIONS[higherRole];
        
        // Higher role should have all permissions of lower role
        lowerPerms.forEach(perm => {
          expect(higherPerms).toContain(perm);
        });
      }
    });
  });
});

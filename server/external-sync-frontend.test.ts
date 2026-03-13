/**
 * v1.3.26 外部平台集成前端完善测试
 * 测试定时任务、权限映射和同步日志功能
 */

import { describe, it, expect } from "vitest";
import { externalSyncRouter } from "./routers/external-sync.router";

describe("v1.3.26 外部平台集成前端完善", () => {
  describe("定时任务路由", () => {
    it("应该定义getSyncTasks路由", () => {
      expect(externalSyncRouter.getSyncTasks).toBeDefined();
    });

    it("应该定义createSyncTask路由", () => {
      expect(externalSyncRouter.createSyncTask).toBeDefined();
    });

    it("应该定义updateTaskStatus路由", () => {
      expect(externalSyncRouter.updateTaskStatus).toBeDefined();
    });

    it("应该定义deleteSyncTask路由", () => {
      expect(externalSyncRouter.deleteSyncTask).toBeDefined();
    });

    it("应该定义executeSyncTask路由", () => {
      expect(externalSyncRouter.executeSyncTask).toBeDefined();
    });

    it("应该定义createDefaultTasks路由", () => {
      expect(externalSyncRouter.createDefaultTasks).toBeDefined();
    });
  });

  describe("同步日志路由", () => {
    it("应该定义getSyncLogs路由", () => {
      expect(externalSyncRouter.getSyncLogs).toBeDefined();
    });

    it("应该定义getSyncStats路由", () => {
      expect(externalSyncRouter.getSyncStats).toBeDefined();
    });
  });

  describe("权限映射路由", () => {
    it("应该定义getGrtRoles路由", () => {
      expect(externalSyncRouter.getGrtRoles).toBeDefined();
    });

    it("应该定义getGrtPermissions路由", () => {
      expect(externalSyncRouter.getGrtPermissions).toBeDefined();
    });

    it("应该定义getRolePermissions路由", () => {
      expect(externalSyncRouter.getRolePermissions).toBeDefined();
    });

    it("应该定义getUserPermissions路由", () => {
      expect(externalSyncRouter.getUserPermissions).toBeDefined();
    });

    it("应该定义checkUserPermission路由", () => {
      expect(externalSyncRouter.checkUserPermission).toBeDefined();
    });

    it("应该定义autoMapRoles路由", () => {
      expect(externalSyncRouter.autoMapRoles).toBeDefined();
    });

    it("应该定义getMappingStats路由", () => {
      expect(externalSyncRouter.getMappingStats).toBeDefined();
    });

    it("应该定义suggestGrtRole路由", () => {
      expect(externalSyncRouter.suggestGrtRole).toBeDefined();
    });
  });

  describe("GRT角色定义", () => {
    it("应该导出GRT_ROLES常量", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_ROLES).toBeDefined();
    });

    it("应该定义超级管理员角色", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_ROLES.SUPER_ADMIN).toBeDefined();
      expect(module.GRT_ROLES.SUPER_ADMIN.id).toBe('super_admin');
    });

    it("应该定义系统管理员角色", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_ROLES.SYSTEM_ADMIN).toBeDefined();
      expect(module.GRT_ROLES.SYSTEM_ADMIN.id).toBe('system_admin');
    });

    it("应该定义项目经理角色", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_ROLES.PROJECT_MANAGER).toBeDefined();
      expect(module.GRT_ROLES.PROJECT_MANAGER.id).toBe('project_manager');
    });
  });

  describe("GRT权限定义", () => {
    it("应该导出GRT_PERMISSIONS常量", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_PERMISSIONS).toBeDefined();
    });

    it("应该定义用户管理权限", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_PERMISSIONS.USER_VIEW).toBeDefined();
      expect(module.GRT_PERMISSIONS.USER_CREATE).toBeDefined();
    });

    it("应该定义项目管理权限", async () => {
      const module = await import("./services/permission-mapping.service");
      expect(module.GRT_PERMISSIONS.PROJECT_VIEW).toBeDefined();
      expect(module.GRT_PERMISSIONS.PROJECT_CREATE).toBeDefined();
    });
  });

  console.log("v1.3.26 外部平台集成前端完善测试完成");
});

/**
 * Permission Management Router — admin collaboration + AI suggestions
 *
 * Registered as: appRouter.permissionManagement
 * Role: Higher-level admin features: discussion pools, external user invitations,
 *       LLM-powered permission suggestions, audit log viewing.
 *       Currently uses mock data — should delegate to permission router for real checks.
 *
 * Related routers:
 *   - permission (server/permission-management/) = DB-backed RBAC source of truth
 *   - rolePermission (server/permissions/) = fast config-based checks
 */
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

/**
 * 权限管理路由
 * 提供用户认证、权限检查、权限管理等功能
 */
export const permissionManagementRouter = router({
  /**
   * 用户登录
   * 支持用户名/密码认证
   */
  login: requirePermission('system:permissions:assign')
    .input(z.object({
      username: z.string().min(3),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      // 这里应该验证用户名和密码
      // 为了演示，我们假设验证成功
      return {
        success: true,
        token: "mock-jwt-token",
        user: {
          id: 1,
          username: input.username,
          name: "User Name",
          role: "employee",
          permissions: ["read:dashboard", "read:projects"],
        },
      };
    }),

  /**
   * 获取当前用户的权限列表
   */
  getUserPermissions: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // 根据用户ID和角色获取权限列表
      const permissions = await generateUserPermissions(ctx.user.id);
      
      return {
        userId: ctx.user.id,
        permissions,
        roles: ["employee"],
        canAccessAdmin: false,
      };
    }),

  /**
   * 检查用户是否有特定权限
   */
  checkPermission: protectedProcedure
    .input(z.object({
      permission: z.string(),
      resourceId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const hasPermission = await verifyPermission(
        ctx.user.id,
        input.permission,
        input.resourceId
      );

      return { hasPermission };
    }),

  /**
   * 获取用户列表（仅管理员）
   */
  listUsers: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查管理员权限
      const isAdmin = await verifyPermission(ctx.user!.id, "admin:users:read");
      if (!isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 返回用户列表
      return {
        users: [
          {
            id: 1,
            username: "admin",
            name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            status: "active",
            createdAt: new Date(),
          },
          {
            id: 2,
            username: "manager",
            name: "Project Manager",
            email: "manager@example.com",
            role: "manager",
            status: "active",
            createdAt: new Date(),
          },
        ],
        total: 2,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * 创建新用户（仅管理员）
   */
  createUser: requirePermission('system:permissions:assign')
    .input(z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "manager", "employee", "customer"]),
      department: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查管理员权限
      const isAdmin = await verifyPermission(ctx.user!.id, "admin:users:create");
      if (!isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 创建用户
      return {
        success: true,
        userId: Math.floor(Math.random() * 10000),
        message: `User ${input.username} created successfully`,
      };
    }),

  /**
   * 更新用户权限（仅管理员）
   */
  updateUserPermissions: requirePermission('system:permissions:assign')
    .input(z.object({
      userId: z.number(),
      permissions: z.array(z.string()),
      roles: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查管理员权限
      const isAdmin = await verifyPermission(ctx.user!.id, "admin:permissions:write");
      if (!isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // 更新权限
      return {
        success: true,
        userId: input.userId,
        permissions: input.permissions,
        roles: input.roles,
      };
    }),

  /**
   * 获取讨论池列表
   */
  listDiscussionPools: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        pools: [
          {
            id: 1,
            name: "技术讨论池",
            description: "讨论技术问题和最佳实践",
            type: "technical",
            memberCount: 15,
            topicCount: 42,
            createdAt: new Date(),
          },
          {
            id: 2,
            name: "项目A讨论",
            description: "项目A的相关讨论",
            type: "project",
            projectId: 1,
            memberCount: 8,
            topicCount: 23,
            createdAt: new Date(),
          },
        ],
      };
    }),

  /**
   * 创建讨论池
   */
  createDiscussionPool: requirePermission('system:permissions:assign')
    .input(z.object({
      name: z.string(),
      description: z.string(),
      type: z.enum(["technical", "project", "general"]),
      projectId: z.number().optional(),
      members: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查创建权限
      const canCreate = await verifyPermission(ctx.user!.id, "discussion:create");
      if (!canCreate) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return {
        success: true,
        poolId: Math.floor(Math.random() * 10000),
        name: input.name,
        type: input.type,
      };
    }),

  /**
   * 邀请外部用户
   */
  inviteExternalUser: requirePermission('system:permissions:assign')
    .input(z.object({
      email: z.string().email(),
      companyName: z.string(),
      companyType: z.enum(["customer", "supplier", "partner"]),
      poolIds: z.array(z.number()).optional(),
      projectIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查邀请权限
      const canInvite = await verifyPermission(ctx.user!.id, "users:invite");
      if (!canInvite) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return {
        success: true,
        invitationId: Math.floor(Math.random() * 10000),
        email: input.email,
        status: "pending",
        invitedAt: new Date(),
      };
    }),

  /**
   * 获取审计日志
   */
  getAuditLogs: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      userId: z.number().optional(),
      action: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查审计日志查看权限
      const canView = await verifyPermission(ctx.user!.id, "audit:read");
      if (!canView) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return {
        logs: [
          {
            id: 1,
            userId: 2,
            userName: "user@example.com",
            action: "login",
            module: "auth",
            details: "User logged in",
            ipAddress: "192.168.1.1",
            timestamp: new Date(),
            status: "success",
          },
          {
            id: 2,
            userId: 1,
            userName: "admin@example.com",
            action: "update_user",
            module: "users",
            resourceType: "user",
            resourceId: 2,
            details: "Updated user permissions",
            timestamp: new Date(),
            status: "success",
          },
        ],
        total: 2,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * startPermissionSuggestions — GRT开发第一定律: async task queue for LLM
   * Enqueues AI permission analysis, returns taskId for polling
   */
  startPermissionSuggestions: requirePermission('system:permissions:assign')
    .input(z.object({
      userId: z.number(),
      jobTitle: z.string(),
      department: z.string(),
      responsibilities: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const canSuggest = await verifyPermission(ctx.user!.id, "admin:permissions:suggest");
      if (!canSuggest) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { submitTask, registerTaskHandler } = await import("../services/task-worker.service");

      // Register handler (idempotent)
      registerTaskHandler("PERMISSION_SUGGEST", async (_taskId, taskInput) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a permission management expert. Based on the user's job title, department, and responsibilities, suggest appropriate permissions and roles.`,
            },
            {
              role: "user",
              content: `Job Title: ${taskInput.jobTitle}\nDepartment: ${taskInput.department}\nResponsibilities: ${taskInput.responsibilities}\n\nSuggest appropriate roles and permissions for this user.`,
            },
          ],
        });
        return {
          userId: taskInput.userId,
          suggestions: response.choices[0].message.content,
          confidence: 0.85,
        };
      });

      const { taskId } = await submitTask(
        "PERMISSION_SUGGEST",
        { userId: input.userId, jobTitle: input.jobTitle, department: input.department, responsibilities: input.responsibilities },
        ctx.user?.name ?? "system",
        { submittedById: ctx.user?.id },
      );
      return { taskId };
    }),

  /**
   * getPermissionSuggestionsResult — poll for async permission suggestion result
   */
  getPermissionSuggestionsResult: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const { getTaskStatus } = await import("../services/task-worker.service");
      const task = await getTaskStatus(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      return {
        status: task.status,
        result: task.resultData,
        error: task.errorMessage,
      };
    }),
});

/**
 * 生成用户权限列表
 */
async function generateUserPermissions(userId: number): Promise<string[]> {
  // 这里应该从数据库查询用户的权限
  // 为了演示，我们返回一个示例权限列表
  const permissions = [
    "read:dashboard",
    "read:projects",
    "read:profile",
    "write:profile",
    "read:discussion",
    "write:discussion:comment",
  ];

  // 如果是管理员，添加管理权限
  if (userId === 1) {
    permissions.push(
      "admin:users:read",
      "admin:users:create",
      "admin:users:update",
      "admin:permissions:read",
      "admin:permissions:write",
      "audit:read"
    );
  }

  return permissions;
}

/**
 * 验证用户权限
 */
async function verifyPermission(
  userId: number,
  permission: string,
  resourceId?: number
): Promise<boolean> {
  // 这里应该从数据库查询用户权限
  // 为了演示，我们实现一个简单的权限检查逻辑

  const userPermissions = await generateUserPermissions(userId);
  
  // 检查精确匹配
  if (userPermissions.includes(permission)) {
    return true;
  }

  // 检查通配符匹配（例如 admin:* 匹配所有admin权限）
  const permissionParts = permission.split(":");
  for (const userPerm of userPermissions) {
    const userPermParts = userPerm.split(":");
    if (userPermParts[userPermParts.length - 1] === "*") {
      if (permissionParts.slice(0, -1).join(":") === userPermParts.slice(0, -1).join(":")) {
        return true;
      }
    }
  }

  return false;
}

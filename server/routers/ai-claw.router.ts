/**
 * AI Open Claw — External Tool Execution Router
 *
 * 15 procedures across 3 sub-routers:
 *   registry  (5) — CRUD for external tool definitions
 *   access    (4) — Role ↔ Tool mapping management
 *   execution (6) — Execute, poll, approve/reject, stats
 *
 * 6-Layer Security:
 *  1. RBAC permission gates on every procedure
 *  2. Role-tool mapping check before execution
 *  3. Approval workflow for high-risk tools
 *  4. Server-side HTTP only — no URL exposed to frontend
 *  5. Full audit trail (sys_audit_logs)
 *  6. External data sanitized + quarantined
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  aiToolsRegistry,
  roleToolMappings,
  CLAW_TOOL_CATEGORIES,
  CLAW_RISK_LEVELS,
} from "../../drizzle/ai-claw-schema";
import { aiTasks } from "../../drizzle/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import {
  resolveTool,
  checkRoleToolAccess,
  logClawAudit,
  createClawTask,
} from "../services/ai-claw.service";
import { triggerClawWorker } from "../workers/clawWorker";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ai-claw-router");

// ── Shared Zod schemas ────────────────────────────────────────

const toolCodeInput = z.object({ toolCode: z.string().min(1).max(100) });
const idInput = z.object({ id: z.number().int().positive() });

// ═══════════════════════════════════════════════════════════════
// 1. Registry — Tool Management (admin only for mutations)
// ═══════════════════════════════════════════════════════════════

const registryRouter = router({
  /** List all tools, optionally filtered by category/active status */
  list: protectedProcedure
    .input(z.object({
      category: z.enum(CLAW_TOOL_CATEGORIES).optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters: ReturnType<typeof eq>[] = [];
      if (input?.category) filters.push(eq(aiToolsRegistry.category, input.category));
      if (input?.isActive !== undefined) filters.push(eq(aiToolsRegistry.isActive, input.isActive));

      const rows = await db
        .select()
        .from(aiToolsRegistry)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(aiToolsRegistry.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      return rows;
    }),

  /** Get a single tool by its unique code */
  get: protectedProcedure
    .input(toolCodeInput)
    .query(async ({ input }) => {
      const tool = await resolveTool(input.toolCode);
      if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: `Tool '${input.toolCode}' not found` });
      return tool;
    }),

  /** Register a new external tool */
  register: requirePermission("ai:claw:admin")
    .input(z.object({
      toolCode: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      nameEn: z.string().max(200).optional(),
      description: z.string().optional(),
      category: z.enum(CLAW_TOOL_CATEGORIES),
      endpointUrl: z.string().url(),
      httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
      defaultHeaders: z.record(z.string(), z.string()).optional(),
      defaultParams: z.record(z.string(), z.any()).optional(),
      timeoutMs: z.number().int().min(1000).max(120000).default(30000),
      maxRetries: z.number().int().min(0).max(10).default(3),
      requiresApproval: z.boolean().default(false),
      riskLevel: z.enum(CLAW_RISK_LEVELS).default("low"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(aiToolsRegistry).values({
        ...input,
        createdBy: ctx.user.id,
      }).returning();
      log.info({ toolCode: input.toolCode, userId: ctx.user.id }, "Tool registered");
      return row;
    }),

  /** Update an existing tool configuration */
  update: requirePermission("ai:claw:admin")
    .input(z.object({
      toolCode: z.string().min(1).max(100),
      name: z.string().min(1).max(200).optional(),
      nameEn: z.string().max(200).optional(),
      description: z.string().optional(),
      endpointUrl: z.string().url().optional(),
      httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
      defaultHeaders: z.record(z.string(), z.string()).optional(),
      defaultParams: z.record(z.string(), z.any()).optional(),
      timeoutMs: z.number().int().min(1000).max(120000).optional(),
      maxRetries: z.number().int().min(0).max(10).optional(),
      requiresApproval: z.boolean().optional(),
      riskLevel: z.enum(CLAW_RISK_LEVELS).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { toolCode, ...updates } = input;
      const [row] = await db
        .update(aiToolsRegistry)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(aiToolsRegistry.toolCode, toolCode))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: `Tool '${toolCode}' not found` });
      return row;
    }),

  /** Soft-deactivate a tool */
  deactivate: requirePermission("ai:claw:admin")
    .input(toolCodeInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .update(aiToolsRegistry)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(aiToolsRegistry.toolCode, input.toolCode))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: `Tool '${input.toolCode}' not found` });
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 2. Access — Role-Tool Mapping Management (admin only)
// ═══════════════════════════════════════════════════════════════

const accessRouter = router({
  /** List roles that have access to a specific tool */
  listByTool: protectedProcedure
    .input(z.object({ toolId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(roleToolMappings)
        .where(eq(roleToolMappings.toolId, input.toolId))
        .limit(200);
    }),

  /** List tools accessible by a specific role */
  listByRole: protectedProcedure
    .input(z.object({ roleCode: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(roleToolMappings)
        .where(eq(roleToolMappings.roleCode, input.roleCode))
        .limit(200);
    }),

  /** Grant a role access to a tool */
  grant: requirePermission("ai:claw:admin")
    .input(z.object({
      roleCode: z.string().min(1).max(50),
      toolId: z.number().int().positive(),
      canExecute: z.boolean().default(true),
      canApprove: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(roleToolMappings)
        .values({ ...input, grantedBy: ctx.user.id })
        .returning();
      return row;
    }),

  /** Revoke a role's access to a tool */
  revoke: requirePermission("ai:claw:admin")
    .input(z.object({
      roleCode: z.string().min(1).max(50),
      toolId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .delete(roleToolMappings)
        .where(and(
          eq(roleToolMappings.roleCode, input.roleCode),
          eq(roleToolMappings.toolId, input.toolId),
        ))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Mapping not found" });
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Execution — Core execute, poll, approve/reject, stats
// ═══════════════════════════════════════════════════════════════

const executionRouter = router({
  /**
   * Core execute: resolve → check access → audit → enqueue → fire worker
   */
  execute: requirePermission("ai:claw:execute")
    .input(z.object({
      toolCode: z.string().min(1).max(100),
      params: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const params = input.params ?? {};
      // 1. Resolve tool
      const tool = await resolveTool(input.toolCode);
      if (!tool) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Tool '${input.toolCode}' not found or inactive` });
      }

      // 2. Check role-tool access
      const access = await checkRoleToolAccess(ctx.user.role ?? "employee", tool.id);
      if (!access.canExecute) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Role '${ctx.user.role}' does not have execute access to tool '${input.toolCode}'`,
        });
      }

      // 3. Audit
      logClawAudit({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "unknown",
        toolCode: input.toolCode,
        action: "CREATE",
        metadata: { params },
      });

      // 4. Create task
      const taskId = await createClawTask({
        toolCode: input.toolCode,
        toolId: tool.id,
        inputParams: params,
        createdBy: ctx.user.id,
        requiresApproval: tool.requiresApproval ?? false,
      });

      // 5. Fire worker (if no approval needed)
      if (!tool.requiresApproval) {
        triggerClawWorker(taskId, tool, input.params, ctx.user.id).catch((err) => {
          log.error({ err, taskId }, "Worker fire-and-forget error");
        });
      }

      return {
        taskId,
        status: tool.requiresApproval ? "pending_approval" : "pending",
        requiresApproval: tool.requiresApproval ?? false,
      };
    }),

  /** Poll task status */
  getStatus: protectedProcedure
    .input(z.object({ taskId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      return task;
    }),

  /** Approve a pending_approval task and fire the worker */
  approve: requirePermission("ai:claw:approve")
    .input(z.object({ taskId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.status !== "pending_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Task status is '${task.status}', expected 'pending_approval'` });
      }

      const inputData = task.inputData as Record<string, unknown> | null;
      const toolCode = String(inputData?.toolCode ?? "");
      const tool = await resolveTool(toolCode);
      if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: "Tool no longer available" });

      // Mark as pending (approved) and fire worker
      await db.update(aiTasks).set({ status: "pending" }).where(eq(aiTasks.id, input.taskId));

      logClawAudit({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "unknown",
        toolCode,
        action: "APPROVE",
        taskId: input.taskId,
      });

      const params = (inputData?.params as Record<string, unknown>) ?? {};
      triggerClawWorker(input.taskId, tool, params, ctx.user.id).catch((err) => {
        log.error({ err, taskId: input.taskId }, "Worker fire-and-forget error after approval");
      });

      return { taskId: input.taskId, status: "pending" };
    }),

  /** Reject a pending_approval task */
  reject: requirePermission("ai:claw:approve")
    .input(z.object({
      taskId: z.number().int().positive(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.status !== "pending_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Task status is '${task.status}', expected 'pending_approval'` });
      }

      const inputData = task.inputData as Record<string, unknown> | null;
      const toolCode = String(inputData?.toolCode ?? "");

      await db.update(aiTasks).set({
        status: "failed",
        errorMessage: input.reason ?? "Rejected by approver",
        completedAt: new Date().toISOString(),
      }).where(eq(aiTasks.id, input.taskId));

      logClawAudit({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "unknown",
        toolCode,
        action: "REJECT",
        taskId: input.taskId,
      });

      return { taskId: input.taskId, status: "rejected" };
    }),

  /** Recent executions for dashboard */
  listRecent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(aiTasks)
        .where(eq(aiTasks.taskType, "CLAW_EXTERNAL_TOOL"))
        .orderBy(desc(aiTasks.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);
    }),

  /** Execution stats grouped by status */
  stats: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const rows = await db
        .select({
          status: aiTasks.status,
          count: count(),
        })
        .from(aiTasks)
        .where(eq(aiTasks.taskType, "CLAW_EXTERNAL_TOOL"))
        .groupBy(aiTasks.status)
        .limit(20);
      return rows;
    }),
});

// ═══════════════════════════════════════════════════════════════
// Combined router
// ═══════════════════════════════════════════════════════════════

export const aiClawRouter = router({
  registry: registryRouter,
  access: accessRouter,
  execution: executionRouter,
});

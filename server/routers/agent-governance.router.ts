/**
 * Agent治理路由 — 数字员工HR管理
 *
 * 系统管理员可:
 * - 新建/编辑/暂停/发布/下线/版本回滚
 * - 调整权限/更换提示词/更换模型/更换知识源
 * - 查看执行日志/审计追踪
 * - 沙盘测试→生产发布
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  agentGovernance,
  agentExecutionLogs,
  agentKnowledgeLinks,
} from "../../drizzle/agent-governance-schema";

const log = createChildLogger("agent-governance");

// ─── Shared Zod Schemas ────────────────────────────────────────────

const agentCategoryEnum = z.enum([
  "business",
  "hr",
  "finance",
  "project",
  "quotation",
  "compliance",
  "training",
  "meeting",
  "customer_portal",
  "audit",
]);

const riskLevelEnum = z.enum(["low", "medium", "high", "critical"]);
const environmentEnum = z.enum(["sandbox", "staging", "production"]);
const statusEnum = z.enum(["draft", "active", "paused", "disabled", "retired"]);

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ─── Router ─────────────────────────────────────────────────────────

export const agentGovernanceRouter = router({
  // ═══════════════════════════════════════════════════════════════════
  //  Agent CRUD (6)
  // ═══════════════════════════════════════════════════════════════════

  /** 新建Agent */
  createAgent: adminProcedure
    .input(
      z.object({
        agentCode: z.string().min(1).max(50),
        agentName: z.string().min(1).max(200),
        agentCategory: agentCategoryEnum,
        businessObjective: z.string().min(1),
        inputSchema: z.string().optional(),
        outputSchema: z.string().optional(),
        prerequisites: z.string().optional(),
        executionSteps: z.string().optional(),
        riskLevel: riskLevelEnum.default("medium"),
        impactScope: z.string().optional(),
        permissionBoundary: z.string().optional(),
        humanReviewRequired: z.boolean().default(true),
        humanReviewSteps: z.string().optional(),
        knowledgeSources: z.string().optional(),
        aiProvider: z.string().default("claude"),
        aiModel: z.string().optional(),
        systemPrompt: z.string().optional(),
        temperature: z.string().default("0.3"),
        rollbackStrategy: z.enum(["manual", "auto_on_error", "auto_on_threshold"]).default("manual"),
        rollbackThreshold: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;
      log.info({ agentCode: input.agentCode, userId }, "创建Agent");

      const [created] = await db
        .insert(agentGovernance)
        .values({
          ...input,
          version: 1,
          environment: "sandbox",
          status: "draft",
          changeLog: JSON.stringify([
            { version: 1, date: new Date().toISOString(), changes: "初始创建", changedBy: userId },
          ]),
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      return { success: true, agent: created };
    }),

  /** 列表查询 — 支持category/status/environment/riskLevel筛选 + 分页 */
  listAgents: protectedProcedure
    .input(
      paginationInput.extend({
        category: agentCategoryEnum.optional(),
        status: statusEnum.optional(),
        environment: environmentEnum.optional(),
        riskLevel: riskLevelEnum.optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize, category, status, environment, riskLevel } = input;

      const conditions = [];
      if (category) conditions.push(eq(agentGovernance.agentCategory, category));
      if (status) conditions.push(eq(agentGovernance.status, status));
      if (environment) conditions.push(eq(agentGovernance.environment, environment));
      if (riskLevel) conditions.push(eq(agentGovernance.riskLevel, riskLevel));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(agentGovernance)
          .where(where)
          .orderBy(desc(agentGovernance.updatedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ count: sql<number>`count(*)` })
          .from(agentGovernance)
          .where(where),
      ]);

      return { agents: rows, total: Number(countResult[0]?.count ?? 0), page, pageSize };
    }),

  /** 查询单个Agent（含知识源关联） */
  getAgent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [agent] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);

      if (!agent) return { agent: null, knowledgeLinks: [] };

      const links = await db
        .select()
        .from(agentKnowledgeLinks)
        .where(eq(agentKnowledgeLinks.agentGovernanceId, input.id))
        .limit(100);

      return { agent, knowledgeLinks: links };
    }),

  /** 更新Agent字段（自增版本 + 记录changeLog） */
  updateAgent: adminProcedure
    .input(
      z.object({
        id: z.number(),
        agentName: z.string().optional(),
        agentCategory: agentCategoryEnum.optional(),
        businessObjective: z.string().optional(),
        inputSchema: z.string().optional(),
        outputSchema: z.string().optional(),
        prerequisites: z.string().optional(),
        executionSteps: z.string().optional(),
        riskLevel: riskLevelEnum.optional(),
        impactScope: z.string().optional(),
        permissionBoundary: z.string().optional(),
        humanReviewRequired: z.boolean().optional(),
        humanReviewSteps: z.string().optional(),
        knowledgeSources: z.string().optional(),
        rollbackStrategy: z.enum(["manual", "auto_on_error", "auto_on_threshold"]).optional(),
        rollbackThreshold: z.string().optional(),
        changeSummary: z.string().default("字段更新"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;
      const { id, changeSummary, ...fields } = input;

      // Fetch current to build changelog
      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };

      const existingLog = current.changeLog ? JSON.parse(current.changeLog) : [];
      const newVersion = (current.version ?? 1) + 1;
      existingLog.push({
        version: newVersion,
        date: new Date().toISOString(),
        changes: changeSummary,
        changedBy: userId,
      });

      const [updated] = await db
        .update(agentGovernance)
        .set({
          ...fields,
          version: newVersion,
          changeLog: JSON.stringify(existingLog),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, id))
        .returning();

      log.info({ id, newVersion, userId }, "Agent已更新");
      return { success: true, agent: updated };
    }),

  /** 软删除（status→retired） */
  deleteAgent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [updated] = await db
        .update(agentGovernance)
        .set({
          status: "retired",
          retiredAt: new Date().toISOString(),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, userId }, "Agent已退役(软删除)");
      return { success: true, agent: updated };
    }),

  /** 克隆Agent到沙盘测试 */
  duplicateAgent: adminProcedure
    .input(z.object({ id: z.number(), newCode: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [source] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!source) return { success: false, error: "源Agent不存在" };

      const newCode = input.newCode || `${source.agentCode}_copy_${Date.now()}`;
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = source;

      const [cloned] = await db
        .insert(agentGovernance)
        .values({
          ...rest,
          agentCode: newCode,
          agentName: `${source.agentName} (副本)`,
          version: 1,
          environment: "sandbox",
          status: "draft",
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTimeMs: 0,
          totalTokensConsumed: 0,
          lastExecutedAt: null,
          activatedAt: null,
          activatedBy: null,
          pausedAt: null,
          pausedReason: null,
          retiredAt: null,
          previousVersionId: source.id,
          changeLog: JSON.stringify([
            { version: 1, date: new Date().toISOString(), changes: `从 ${source.agentCode} v${source.version} 克隆`, changedBy: userId },
          ]),
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // Clone knowledge links
      const sourceLinks = await db
        .select()
        .from(agentKnowledgeLinks)
        .where(eq(agentKnowledgeLinks.agentGovernanceId, input.id))
        .limit(100);

      if (sourceLinks.length > 0) {
        await db.insert(agentKnowledgeLinks).values(
          sourceLinks.map((link) => ({
            agentGovernanceId: cloned.id,
            knowledgeSourceType: link.knowledgeSourceType,
            knowledgeSourceId: link.knowledgeSourceId,
            knowledgeSourceName: link.knowledgeSourceName,
            accessLevel: link.accessLevel,
            isRequired: link.isRequired,
          })),
        );
      }

      log.info({ sourceId: input.id, clonedId: cloned.id, userId }, "Agent已克隆");
      return { success: true, agent: cloned };
    }),

  // ═══════════════════════════════════════════════════════════════════
  //  Lifecycle (6)
  // ═══════════════════════════════════════════════════════════════════

  /** draft/paused → active */
  activateAgent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };
      if (!["draft", "paused"].includes(current.status ?? ""))
        return { success: false, error: `当前状态 ${current.status} 不允许激活` };

      const [updated] = await db
        .update(agentGovernance)
        .set({
          status: "active",
          activatedAt: new Date().toISOString(),
          activatedBy: userId,
          pausedAt: null,
          pausedReason: null,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, userId }, "Agent已激活");
      return { success: true, agent: updated };
    }),

  /** active → paused (附原因) */
  pauseAgent: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };
      if (current.status !== "active")
        return { success: false, error: `当前状态 ${current.status} 不允许暂停` };

      const [updated] = await db
        .update(agentGovernance)
        .set({
          status: "paused",
          pausedAt: new Date().toISOString(),
          pausedReason: input.reason,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, reason: input.reason, userId }, "Agent已暂停");
      return { success: true, agent: updated };
    }),

  /** sandbox → staging → production（带校验） */
  publishToProduction: adminProcedure
    .input(z.object({ id: z.number(), targetEnvironment: z.enum(["staging", "production"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };

      // Validate promotion path
      const validPromotions: Record<string, string[]> = {
        sandbox: ["staging"],
        staging: ["production"],
      };
      const allowed = validPromotions[current.environment ?? "sandbox"] ?? [];
      if (!allowed.includes(input.targetEnvironment))
        return {
          success: false,
          error: `不允许从 ${current.environment} 提升到 ${input.targetEnvironment}`,
        };

      // 发布前强制校验
      if (input.targetEnvironment === "production") {
        const validationErrors: string[] = [];
        if (!current.businessObjective) validationErrors.push('缺少业务目标(businessObjective)');
        if (!current.systemPrompt) validationErrors.push('缺少系统提示词(systemPrompt)');
        if (!current.aiProvider || !current.aiModel) validationErrors.push('缺少AI模型配置');
        if ((current.riskLevel === 'high' || current.riskLevel === 'critical') && !current.humanReviewRequired) {
          validationErrors.push('高风险Agent必须设置人工确认节点(humanReviewRequired=true)');
        }
        if (current.riskLevel === 'critical' && !current.rollbackStrategy) {
          validationErrors.push('关键风险Agent必须设置回滚策略');
        }
        // Check knowledge sources
        const knowledgeLinks = await db.select().from(agentKnowledgeLinks)
          .where(eq(agentKnowledgeLinks.agentGovernanceId, input.id))
          .limit(10);
        if (knowledgeLinks.length === 0) {
          validationErrors.push('Agent未关联任何知识源(至少需要1个)');
        }

        if (validationErrors.length > 0) {
          return { success: false, message: '发布校验未通过', errors: validationErrors };
        }
      }

      const [updated] = await db
        .update(agentGovernance)
        .set({
          environment: input.targetEnvironment,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info(
        { id: input.id, from: current.environment, to: input.targetEnvironment, userId },
        "Agent环境已提升",
      );
      return { success: true, agent: updated };
    }),

  /** 版本回滚 — 创建新版本指向旧配置 */
  rollbackAgent: adminProcedure
    .input(z.object({ id: z.number(), targetVersionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [target] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.targetVersionId))
        .limit(1);
      if (!target) return { success: false, error: "回滚目标版本不存在" };

      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };

      const newVersion = (current.version ?? 1) + 1;
      const existingLog = current.changeLog ? JSON.parse(current.changeLog) : [];
      existingLog.push({
        version: newVersion,
        date: new Date().toISOString(),
        changes: `回滚到版本 ${target.version} (id=${input.targetVersionId})`,
        changedBy: userId,
      });

      const [updated] = await db
        .update(agentGovernance)
        .set({
          systemPrompt: target.systemPrompt,
          aiProvider: target.aiProvider,
          aiModel: target.aiModel,
          temperature: target.temperature,
          permissionBoundary: target.permissionBoundary,
          executionSteps: target.executionSteps,
          knowledgeSources: target.knowledgeSources,
          version: newVersion,
          previousVersionId: input.targetVersionId,
          rollbackTargetVersionId: input.targetVersionId,
          changeLog: JSON.stringify(existingLog),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, targetVersionId: input.targetVersionId, newVersion, userId }, "Agent已回滚");
      return { success: true, agent: updated };
    }),

  /** active/paused → retired */
  retireAgent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [updated] = await db
        .update(agentGovernance)
        .set({
          status: "retired",
          retiredAt: new Date().toISOString(),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, userId }, "Agent已退役");
      return { success: true, agent: updated };
    }),

  /** 版本历史列表 */
  getVersionHistory: protectedProcedure
    .input(z.object({ agentCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.agentCode, input.agentCode))
        .orderBy(desc(agentGovernance.version))
        .limit(50);

      return { versions: rows };
    }),

  // ═══════════════════════════════════════════════════════════════════
  //  Configuration (4)
  // ═══════════════════════════════════════════════════════════════════

  /** 更新系统提示词（创建新版本） */
  updateSystemPrompt: adminProcedure
    .input(z.object({ id: z.number(), systemPrompt: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [current] = await db
        .select()
        .from(agentGovernance)
        .where(eq(agentGovernance.id, input.id))
        .limit(1);
      if (!current) return { success: false, error: "Agent不存在" };

      const newVersion = (current.version ?? 1) + 1;
      const existingLog = current.changeLog ? JSON.parse(current.changeLog) : [];
      existingLog.push({
        version: newVersion,
        date: new Date().toISOString(),
        changes: "更新系统提示词",
        changedBy: userId,
      });

      const [updated] = await db
        .update(agentGovernance)
        .set({
          systemPrompt: input.systemPrompt,
          version: newVersion,
          changeLog: JSON.stringify(existingLog),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, newVersion, userId }, "系统提示词已更新");
      return { success: true, agent: updated };
    }),

  /** 更新模型配置 */
  updateModelConfig: adminProcedure
    .input(
      z.object({
        id: z.number(),
        aiProvider: z.string().optional(),
        aiModel: z.string().optional(),
        temperature: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;
      const { id, ...modelFields } = input;

      const [updated] = await db
        .update(agentGovernance)
        .set({
          ...modelFields,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, id))
        .returning();

      log.info({ id, ...modelFields, userId }, "模型配置已更新");
      return { success: true, agent: updated };
    }),

  /** 更新权限边界 */
  updatePermissions: adminProcedure
    .input(z.object({ id: z.number(), permissionBoundary: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [updated] = await db
        .update(agentGovernance)
        .set({
          permissionBoundary: input.permissionBoundary,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.id))
        .returning();

      log.info({ id: input.id, userId }, "权限边界已更新");
      return { success: true, agent: updated };
    }),

  /** 管理知识源关联 */
  updateKnowledgeSources: adminProcedure
    .input(
      z.object({
        agentGovernanceId: z.number(),
        links: z.array(
          z.object({
            knowledgeSourceType: z.string(),
            knowledgeSourceId: z.string().optional(),
            knowledgeSourceName: z.string(),
            accessLevel: z.enum(["read", "write", "execute"]).default("read"),
            isRequired: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      // Replace all: delete existing, insert new
      await db
        .delete(agentKnowledgeLinks)
        .where(eq(agentKnowledgeLinks.agentGovernanceId, input.agentGovernanceId));

      if (input.links.length > 0) {
        await db.insert(agentKnowledgeLinks).values(
          input.links.map((link) => ({
            agentGovernanceId: input.agentGovernanceId,
            ...link,
          })),
        );
      }

      // Update the agent's knowledgeSources summary field
      await db
        .update(agentGovernance)
        .set({
          knowledgeSources: JSON.stringify(input.links.map((l) => l.knowledgeSourceType)),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentGovernance.id, input.agentGovernanceId));

      log.info({ agentGovernanceId: input.agentGovernanceId, linkCount: input.links.length, userId }, "知识源已更新");
      return { success: true, linkCount: input.links.length };
    }),

  // ═══════════════════════════════════════════════════════════════════
  //  Execution & Audit (6)
  // ═══════════════════════════════════════════════════════════════════

  /** 记录执行日志 */
  logExecution: protectedProcedure
    .input(
      z.object({
        agentGovernanceId: z.number(),
        agentCode: z.string(),
        version: z.number(),
        executionId: z.string(),
        triggeredBy: z.enum(["user", "schedule", "event", "agent"]),
        triggerContext: z.string().optional(),
        inputData: z.string().optional(),
        outputData: z.string().optional(),
        status: z.enum(["started", "running", "completed", "failed", "timeout", "cancelled", "rolled_back"]),
        errorMessage: z.string().optional(),
        executionTimeMs: z.number().optional(),
        tokensUsed: z.number().optional(),
        requiresHumanReview: z.boolean().default(false),
        affectedEntities: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const triggerUserId = ctx.user?.id ? Number(ctx.user.id) : null;

      const [created] = await db
        .insert(agentExecutionLogs)
        .values({
          ...input,
          triggerUserId,
        })
        .returning();

      // Update agent execution stats
      if (input.status === "completed" || input.status === "failed") {
        await db
          .update(agentGovernance)
          .set({
            totalExecutions: sql`${agentGovernance.totalExecutions} + 1`,
            successfulExecutions:
              input.status === "completed"
                ? sql`${agentGovernance.successfulExecutions} + 1`
                : agentGovernance.successfulExecutions,
            failedExecutions:
              input.status === "failed"
                ? sql`${agentGovernance.failedExecutions} + 1`
                : agentGovernance.failedExecutions,
            totalTokensConsumed: sql`${agentGovernance.totalTokensConsumed} + ${input.tokensUsed ?? 0}`,
            lastExecutedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(agentGovernance.id, input.agentGovernanceId));
      }

      return { success: true, log: created };
    }),

  /** 执行日志列表 — 支持agent/status/日期范围筛选 + 分页 */
  listExecutionLogs: protectedProcedure
    .input(
      paginationInput.extend({
        agentGovernanceId: z.number().optional(),
        agentCode: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { page, pageSize, agentGovernanceId, agentCode, status, dateFrom, dateTo } = input;

      const conditions = [];
      if (agentGovernanceId)
        conditions.push(eq(agentExecutionLogs.agentGovernanceId, agentGovernanceId));
      if (agentCode) conditions.push(eq(agentExecutionLogs.agentCode, agentCode));
      if (status) conditions.push(eq(agentExecutionLogs.status, status));
      if (dateFrom)
        conditions.push(sql`${agentExecutionLogs.createdAt} >= ${dateFrom}`);
      if (dateTo)
        conditions.push(sql`${agentExecutionLogs.createdAt} <= ${dateTo}`);

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(agentExecutionLogs)
          .where(where)
          .orderBy(desc(agentExecutionLogs.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ count: sql<number>`count(*)` })
          .from(agentExecutionLogs)
          .where(where),
      ]);

      return { logs: rows, total: Number(countResult[0]?.count ?? 0), page, pageSize };
    }),

  /** 单条执行详情 */
  getExecutionDetail: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [detail] = await db
        .select()
        .from(agentExecutionLogs)
        .where(eq(agentExecutionLogs.executionId, input.executionId))
        .limit(1);

      return { execution: detail ?? null };
    }),

  /** 提交人工审核 */
  submitForHumanReview: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [updated] = await db
        .update(agentExecutionLogs)
        .set({
          requiresHumanReview: true,
          humanReviewStatus: "pending",
        })
        .where(eq(agentExecutionLogs.executionId, input.executionId))
        .returning();

      return { success: true, execution: updated };
    }),

  /** 审核执行结果 — approve/reject/modify */
  reviewExecution: adminProcedure
    .input(
      z.object({
        executionId: z.string(),
        decision: z.enum(["approved", "rejected", "modified"]),
        notes: z.string().optional(),
        modifiedOutput: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : null;

      const setFields: Record<string, unknown> = {
        humanReviewStatus: input.decision,
        humanReviewerId: userId,
        humanReviewedAt: new Date().toISOString(),
        humanReviewNotes: input.notes ?? null,
      };
      if (input.decision === "modified" && input.modifiedOutput) {
        setFields.outputData = input.modifiedOutput;
      }

      const [updated] = await db
        .update(agentExecutionLogs)
        .set(setFields)
        .where(eq(agentExecutionLogs.executionId, input.executionId))
        .returning();

      log.info({ executionId: input.executionId, decision: input.decision, userId }, "执行结果已审核");
      return { success: true, execution: updated };
    }),

  /** Agent执行统计 — 总数/成功率/平均时间/token消耗 */
  getAgentMetrics: protectedProcedure
    .input(z.object({ agentGovernanceId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const where = input.agentGovernanceId
        ? eq(agentGovernance.id, input.agentGovernanceId)
        : undefined;

      const rows = await db
        .select({
          id: agentGovernance.id,
          agentCode: agentGovernance.agentCode,
          agentName: agentGovernance.agentName,
          totalExecutions: agentGovernance.totalExecutions,
          successfulExecutions: agentGovernance.successfulExecutions,
          failedExecutions: agentGovernance.failedExecutions,
          averageExecutionTimeMs: agentGovernance.averageExecutionTimeMs,
          totalTokensConsumed: agentGovernance.totalTokensConsumed,
          lastExecutedAt: agentGovernance.lastExecutedAt,
        })
        .from(agentGovernance)
        .where(where)
        .orderBy(desc(agentGovernance.totalExecutions))
        .limit(100);

      const metrics = rows.map((r) => ({
        ...r,
        successRate:
          (r.totalExecutions ?? 0) > 0
            ? (((r.successfulExecutions ?? 0) / (r.totalExecutions ?? 1)) * 100).toFixed(1)
            : "N/A",
      }));

      return { metrics };
    }),

  // ═══════════════════════════════════════════════════════════════════
  //  Dashboard (3)
  // ═══════════════════════════════════════════════════════════════════

  /** 治理概览仪表盘 */
  getGovernanceDashboard: protectedProcedure.query(async () => {
    const db = await requireDb();

    const [byCategory, byStatus, byEnvironment, recentExecutions] = await Promise.all([
      db
        .select({
          category: agentGovernance.agentCategory,
          count: sql<number>`count(*)`,
        })
        .from(agentGovernance)
        .groupBy(agentGovernance.agentCategory),
      db
        .select({
          status: agentGovernance.status,
          count: sql<number>`count(*)`,
        })
        .from(agentGovernance)
        .groupBy(agentGovernance.status),
      db
        .select({
          environment: agentGovernance.environment,
          count: sql<number>`count(*)`,
        })
        .from(agentGovernance)
        .groupBy(agentGovernance.environment),
      db
        .select()
        .from(agentExecutionLogs)
        .orderBy(desc(agentExecutionLogs.createdAt))
        .limit(10),
    ]);

    return {
      byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.count) })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byEnvironment: byEnvironment.map((r) => ({ environment: r.environment, count: Number(r.count) })),
      recentExecutions,
    };
  }),

  /** Agent健康矩阵 — 成功率色阶 */
  getAgentHealthMatrix: protectedProcedure.query(async () => {
    const db = await requireDb();

    const agents = await db
      .select({
        id: agentGovernance.id,
        agentCode: agentGovernance.agentCode,
        agentName: agentGovernance.agentName,
        agentCategory: agentGovernance.agentCategory,
        status: agentGovernance.status,
        environment: agentGovernance.environment,
        riskLevel: agentGovernance.riskLevel,
        totalExecutions: agentGovernance.totalExecutions,
        successfulExecutions: agentGovernance.successfulExecutions,
        failedExecutions: agentGovernance.failedExecutions,
      })
      .from(agentGovernance)
      .where(sql`${agentGovernance.status} != 'retired'`)
      .orderBy(agentGovernance.agentCategory, agentGovernance.agentCode)
      .limit(200);

    const matrix = agents.map((a) => {
      const total = a.totalExecutions ?? 0;
      const success = a.successfulExecutions ?? 0;
      const rate = total > 0 ? (success / total) * 100 : -1; // -1 = no data
      let health: "green" | "yellow" | "red" | "gray";
      if (rate < 0) health = "gray";
      else if (rate >= 90) health = "green";
      else if (rate >= 70) health = "yellow";
      else health = "red";

      return { ...a, successRate: rate >= 0 ? rate.toFixed(1) : "N/A", health };
    });

    return { matrix };
  }),

  /** 合规报告 — 高风险无人审、生产环境无知识源 */
  getComplianceReport: protectedProcedure.query(async () => {
    const db = await requireDb();

    // High/critical risk agents without humanReviewRequired
    const highRiskNoReview = await db
      .select()
      .from(agentGovernance)
      .where(
        and(
          sql`${agentGovernance.riskLevel} IN ('high', 'critical')`,
          eq(agentGovernance.humanReviewRequired, false),
          sql`${agentGovernance.status} != 'retired'`,
        ),
      )
      .limit(50);

    // Production agents without knowledge sources
    const prodNoKnowledge = await db
      .select()
      .from(agentGovernance)
      .where(
        and(
          eq(agentGovernance.environment, "production"),
          sql`(${agentGovernance.knowledgeSources} IS NULL OR ${agentGovernance.knowledgeSources} = '[]')`,
          sql`${agentGovernance.status} != 'retired'`,
        ),
      )
      .limit(50);

    return {
      highRiskNoReview: highRiskNoReview.map((a) => ({
        id: a.id,
        agentCode: a.agentCode,
        agentName: a.agentName,
        riskLevel: a.riskLevel,
        issue: "高/关键风险但未开启人工审核",
      })),
      productionNoKnowledge: prodNoKnowledge.map((a) => ({
        id: a.id,
        agentCode: a.agentCode,
        agentName: a.agentName,
        issue: "生产环境但未配置知识源",
      })),
      totalIssues: highRiskNoReview.length + prodNoKnowledge.length,
    };
  }),
});

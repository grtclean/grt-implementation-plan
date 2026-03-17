/**
 * GRT 5.0 审批流程路由 — DB-backed implementation
 *
 * Migrated from in-memory mock arrays → real DB via Drizzle ORM
 * Schema: drizzle/approval-engine-schema.ts (7 tables)
 *
 * Sub-sections:
 *   1. 原有审批流程API (legacy compat wrappers)
 *   2. 通用审批流程引擎API (core CRUD, DB-backed)
 *   3. 红蓝对抗配置API (DB-backed)
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure, requirePermission } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import {
  approvalTemplates,
  approvalInstances,
  approvalStepRecords,
  approvalActionLogs,
  approvalDelegations,
  redBlueConfigs,
  redBlueExecutions,
} from "../../drizzle/approval-engine-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("approval-router");

// ===== Zod Schemas =====
const ApprovalProcessSchema = z.object({
  processName: z.string().min(1),
  documentType: z.enum(['purchase_request', 'purchase_order', 'material_creation', 'supplier_registration', 'inventory_adjustment', 'lead_assignment', 'opportunity_proposal', 'contract_signing', 'project_approval', 'design_review', 'production_release', 'red_blue_config', 'other']),
  approvalLevels: z.number().min(1).max(5),
  levelDefinition: z.string(),
  description: z.string().optional(),
});

const ApprovalActionSchema = z.object({
  taskId: z.number(),
  action: z.enum(['approved', 'rejected', 'returned']),
  comments: z.string().optional(),
  actionReason: z.string().optional(),
});

const RedBlueConfigSchema = z.object({
  configName: z.string().min(1).max(128),
  projectId: z.number().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  customerTier: z.enum(['tier1', 'tier2', 'tier3', 'other']).default('other'),
  redTeamLeaderId: z.number().optional(),
  redTeamLeaderName: z.string().optional(),
  redTeamMembers: z.array(z.object({ id: z.number(), name: z.string(), role: z.string().optional() })).optional(),
  redTeamObjectives: z.string().optional(),
  redTeamScenarios: z.array(z.object({ name: z.string(), description: z.string().optional(), severity: z.enum(['low', 'medium', 'high']).optional() })).optional(),
  blueTeamLeaderId: z.number().optional(),
  blueTeamLeaderName: z.string().optional(),
  blueTeamMembers: z.array(z.object({ id: z.number(), name: z.string(), role: z.string().optional() })).optional(),
  blueTeamObjectives: z.string().optional(),
  blueTeamResources: z.array(z.string()).optional(),
  schedule: z.array(z.object({ phase: z.string(), name: z.string(), startDate: z.string().optional(), endDate: z.string().optional(), description: z.string().optional() })).optional(),
  evaluationCriteria: z.array(z.object({ criterion: z.string(), weight: z.number(), description: z.string().optional() })).optional(),
  triggerConditions: z.object({ customerTier: z.boolean().optional(), projectComplexity: z.boolean().optional(), isNonStandard: z.boolean().optional(), isCrossRegional: z.boolean().optional() }).optional(),
});

// ── Helper ──
function generateCode(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const approvalRouter = router({
  // ===== Section 1: Legacy Approval API (thin DB wrappers) =====

  createApprovalProcess: adminProcedure
    .input(ApprovalProcessSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = `APT-${Date.now()}`;
      const steps = JSON.parse(input.levelDefinition);
      const [row] = await db.insert(approvalTemplates).values({
        templateCode: code,
        templateName: input.processName,
        businessType: input.documentType,
        description: input.description,
        steps,
        defaultTimeoutHours: 48,
        isActive: true,
        version: "1.0",
        createdBy: ctx.user!.id,
      }).returning();
      log.info({ id: row.id, code }, "Approval template created");
      return row;
    }),

  getApprovalProcesses: protectedProcedure
    .input(z.object({ documentType: z.string().optional(), isActive: z.boolean().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.documentType) conditions.push(eq(approvalTemplates.businessType, input.documentType));
      if (input.isActive !== undefined) conditions.push(eq(approvalTemplates.isActive, input.isActive));
      const items = await db.select().from(approvalTemplates)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(approvalTemplates.createdAt))
        .limit(100);
      return { items, total: items.length };
    }),

  getPendingTasks: protectedProcedure
    .input(z.object({ documentType: z.string().optional(), status: z.string().optional(), page: z.number().default(1), pageSize: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const conditions = [eq(approvalInstances.currentApproverId, ctx.user!.id)];
      if (input.status) conditions.push(eq(approvalInstances.status, input.status));
      else conditions.push(inArray(approvalInstances.status, ["pending", "in_progress"]));
      if (input.documentType) conditions.push(eq(approvalInstances.businessType, input.documentType));
      const items = await db.select().from(approvalInstances)
        .where(and(...conditions))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const [{ value: total }] = await db.select({ value: count() }).from(approvalInstances).where(and(...conditions)).limit(1);
      return { items, total: Number(total), page: input.page, pageSize: input.pageSize };
    }),

  getMyApprovalTasks: protectedProcedure
    .input(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional(), page: z.number().default(1), pageSize: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const conditions = [eq(approvalInstances.applicantId, ctx.user!.id)];
      if (input.status) conditions.push(eq(approvalInstances.status, input.status));
      const items = await db.select().from(approvalInstances)
        .where(and(...conditions))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const [{ value: total }] = await db.select({ value: count() }).from(approvalInstances).where(and(...conditions)).limit(1);
      return { items, total: Number(total), page: input.page, pageSize: input.pageSize };
    }),

  approveTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, input.taskId)).limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "审批实例不存在" });

      const [tpl] = await db.select().from(approvalTemplates).where(eq(approvalTemplates.id, inst.templateId)).limit(1);
      const steps = (tpl?.steps as any[]) ?? [];
      const previousStatus = inst.status;

      // Update current step record
      await db.update(approvalStepRecords)
        .set({ status: "approved", action: "approve", comment: input.comments, approverId: ctx.user!.id, approverName: ctx.user!.name ?? "审批人", completedAt: new Date() })
        .where(and(eq(approvalStepRecords.instanceId, inst.id), eq(approvalStepRecords.stepNumber, inst.currentStep!), eq(approvalStepRecords.status, "pending")));

      if ((inst.currentStep ?? 1) < (inst.totalSteps ?? 1)) {
        // Advance to next step
        const nextStep = (inst.currentStep ?? 1) + 1;
        await db.update(approvalInstances).set({ currentStep: nextStep, status: "in_progress", updatedAt: new Date() }).where(eq(approvalInstances.id, inst.id));
        const nextStepDef = steps[nextStep - 1];
        if (nextStepDef) {
          await db.insert(approvalStepRecords).values({
            instanceId: inst.id, instanceCode: inst.instanceCode, stepNumber: nextStep,
            stepName: nextStepDef.stepName ?? `步骤${nextStep}`, approverRole: nextStepDef.approverRole ?? "manager", approverType: nextStepDef.approverType ?? "role",
          });
        }
      } else {
        // Final approval
        await db.update(approvalInstances).set({ status: "approved", finalResult: "approved", completedAt: new Date(), updatedAt: new Date() }).where(eq(approvalInstances.id, inst.id));
      }

      await db.insert(approvalActionLogs).values({
        instanceId: inst.id, action: "approve", operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "审批人",
        previousStatus, newStatus: "approved", comment: input.comments,
      });

      log.info({ instanceId: inst.id, action: "approve" }, "Approval task approved");
      return { taskId: input.taskId, action: "approved", approvedBy: ctx.user!.id, approvedAt: new Date(), message: "审批已通过" };
    }),

  rejectTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await db.update(approvalInstances).set({ status: "rejected", finalResult: "rejected", finalComment: input.actionReason, completedAt: new Date(), updatedAt: new Date() }).where(eq(approvalInstances.id, input.taskId));
      await db.insert(approvalActionLogs).values({ instanceId: input.taskId, action: "reject", operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "审批人", newStatus: "rejected", comment: input.actionReason });
      return { taskId: input.taskId, action: "rejected", rejectedBy: ctx.user!.id, rejectedAt: new Date(), reason: input.actionReason, message: "审批已拒绝" };
    }),

  returnTask: requirePermission('oa:forms:manage')
    .input(ApprovalActionSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [inst] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, input.taskId)).limit(1);
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "审批实例不存在" });
      const newStep = Math.max(1, (inst.currentStep ?? 1) - 1);
      const newStatus = newStep === 1 ? "draft" : "in_progress";
      await db.update(approvalInstances).set({ currentStep: newStep, status: newStatus, updatedAt: new Date() }).where(eq(approvalInstances.id, inst.id));
      await db.insert(approvalActionLogs).values({ instanceId: inst.id, action: "return", operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "审批人", newStatus, comment: input.actionReason });
      return { taskId: input.taskId, action: "returned", returnedBy: ctx.user!.id, returnedAt: new Date(), reason: input.actionReason, message: "审批已退回" };
    }),

  getApprovalHistory: protectedProcedure
    .input(z.object({ documentId: z.number(), documentType: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const instances = await db.select().from(approvalInstances)
        .where(and(eq(approvalInstances.businessId, String(input.documentId)), eq(approvalInstances.businessType, input.documentType)))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(50);
      return { items: instances, total: instances.length };
    }),

  getApprovalPermissions: protectedProcedure
    .input(z.object({ roleId: z.number().optional() }))
    .query(async () => {
      // Permissions are managed via the central RBAC system (shared/permissions.ts)
      return { permissions: [] };
    }),

  setApprovalPermissions: adminProcedure
    .input(z.object({ roleId: z.number(), documentType: z.string(), approvalLevel: z.number(), maxApprovalAmount: z.number().optional(), scope: z.enum(['self', 'department', 'company']) }))
    .mutation(async ({ input }) => {
      // Permissions are managed via the central RBAC system
      return { ...input, createdAt: new Date() };
    }),

  getApprovalStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const userId = ctx.user!.id;

    const [pendingResult] = await db.select({ value: count() }).from(approvalInstances)
      .where(and(eq(approvalInstances.currentApproverId, userId), inArray(approvalInstances.status, ["pending", "in_progress"]))).limit(1);
    const [submittedResult] = await db.select({ value: count() }).from(approvalInstances)
      .where(eq(approvalInstances.applicantId, userId)).limit(1);
    const [approvedResult] = await db.select({ value: count() }).from(approvalInstances)
      .where(and(eq(approvalInstances.applicantId, userId), eq(approvalInstances.status, "approved"))).limit(1);
    const [rejectedResult] = await db.select({ value: count() }).from(approvalInstances)
      .where(and(eq(approvalInstances.applicantId, userId), eq(approvalInstances.status, "rejected"))).limit(1);
    const [rbTotal] = await db.select({ value: count() }).from(redBlueConfigs).limit(1);
    const [rbActive] = await db.select({ value: count() }).from(redBlueConfigs)
      .where(inArray(redBlueConfigs.status, ["approved", "in_progress"])).limit(1);

    return {
      pendingTasksCount: Number(pendingResult?.value ?? 0),
      overdueTasksCount: 0,
      averageApprovalTime: 0,
      rejectionRate: 0,
      approverCount: 0,
      submittedCount: Number(submittedResult?.value ?? 0),
      approvedCount: Number(approvedResult?.value ?? 0),
      rejectedCount: Number(rejectedResult?.value ?? 0),
      redBlueConfigCount: Number(rbTotal?.value ?? 0),
      activeRedBlueCount: Number(rbActive?.value ?? 0),
    };
  }),

  getApprovalRules: protectedProcedure
    .input(z.object({ documentType: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = input.documentType ? [eq(approvalTemplates.businessType, input.documentType)] : [];
      const items = await db.select().from(approvalTemplates)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(approvalTemplates.createdAt))
        .limit(50);
      return { rules: items };
    }),

  createApprovalRule: adminProcedure
    .input(z.object({ ruleName: z.string(), documentType: z.string(), condition: z.string(), action: z.string(), priority: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = `RULE-${Date.now()}`;
      const [row] = await db.insert(approvalTemplates).values({
        templateCode: code,
        templateName: input.ruleName,
        businessType: input.documentType,
        description: `条件: ${input.condition}; 动作: ${input.action}`,
        steps: JSON.parse(input.action),
        conditionRules: JSON.parse(input.condition),
        createdBy: ctx.user!.id,
      }).returning();
      return row;
    }),

  delegateApprovalAuthority: requirePermission('oa:forms:manage')
    .input(z.object({ delegatedTo: z.number(), documentTypes: z.array(z.string()), startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(approvalDelegations).values({
        delegatorId: ctx.user!.id,
        delegatorName: ctx.user!.name ?? "委托人",
        delegateeId: input.delegatedTo,
        delegateeName: "被委托人",
        businessTypes: input.documentTypes,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: "审批权限委托",
        status: "active",
      }).returning();
      log.info({ id: row.id, delegatorId: ctx.user!.id, delegateeId: input.delegatedTo }, "Delegation created");
      return row;
    }),

  getMyDelegations: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const delegations = await db.select().from(approvalDelegations)
      .where(eq(approvalDelegations.delegatorId, ctx.user!.id))
      .orderBy(desc(approvalDelegations.createdAt))
      .limit(50);
    return { delegations };
  }),

  getApprovalProgress: protectedProcedure
    .input(z.object({ documentId: z.number(), documentType: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [inst] = await db.select().from(approvalInstances)
        .where(and(eq(approvalInstances.businessId, String(input.documentId)), eq(approvalInstances.businessType, input.documentType)))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(1);
      if (!inst) return { currentLevel: 0, totalLevels: 0, progress: 0, steps: [] };
      const steps = await db.select().from(approvalStepRecords)
        .where(eq(approvalStepRecords.instanceId, inst.id))
        .orderBy(approvalStepRecords.stepNumber)
        .limit(20);
      const progress = inst.totalSteps ? Math.round(((inst.currentStep ?? 1) / inst.totalSteps) * 100) : 0;
      return { currentLevel: inst.currentStep ?? 1, totalLevels: inst.totalSteps ?? 1, progress, steps };
    }),

  batchApprove: adminProcedure
    .input(z.object({ taskIds: z.array(z.number()), action: z.enum(['approved', 'rejected']), comments: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const newStatus = input.action === "approved" ? "approved" : "rejected";
      for (const taskId of input.taskIds) {
        await db.update(approvalInstances).set({ status: newStatus, finalResult: newStatus, completedAt: new Date(), updatedAt: new Date() }).where(eq(approvalInstances.id, taskId));
        await db.insert(approvalActionLogs).values({ instanceId: taskId, action: input.action, operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "批量审批", newStatus, comment: input.comments });
      }
      log.info({ count: input.taskIds.length, action: input.action }, "Batch approval processed");
      return { processedCount: input.taskIds.length, action: input.action, processedAt: new Date(), message: `已${input.action === 'approved' ? '批准' : '拒绝'} ${input.taskIds.length} 个审批任务` };
    }),

  generateApprovalReport: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), documentType: z.string().optional(), format: z.enum(['csv', 'excel', 'pdf']).default('excel') }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      conditions.push(sql`${approvalInstances.createdAt} >= ${new Date(input.startDate)}`);
      conditions.push(sql`${approvalInstances.createdAt} <= ${new Date(input.endDate)}`);
      if (input.documentType) conditions.push(eq(approvalInstances.businessType, input.documentType));
      const [{ value: total }] = await db.select({ value: count() }).from(approvalInstances).where(and(...conditions)).limit(1);
      return { downloadUrl: '/api/approval/report', fileName: `approval-report-${new Date().toISOString().slice(0, 10)}.xlsx`, format: input.format, totalRecords: Number(total) };
    }),

  // ===== Section 2: 通用审批流程引擎API (DB-backed) =====

  getTemplates: protectedProcedure
    .input(z.object({ businessType: z.string().optional(), isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.businessType) conditions.push(eq(approvalTemplates.businessType, input.businessType));
      if (input?.isActive !== undefined) conditions.push(eq(approvalTemplates.isActive, input.isActive));
      const result = await db.select().from(approvalTemplates)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(approvalTemplates.createdAt))
        .limit(100);
      return result;
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.number().optional(), templateCode: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      let template;
      if (input.id) {
        [template] = await db.select().from(approvalTemplates).where(eq(approvalTemplates.id, input.id)).limit(1);
      } else if (input.templateCode) {
        [template] = await db.select().from(approvalTemplates).where(eq(approvalTemplates.templateCode, input.templateCode)).limit(1);
      }
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "审批模板不存在" });
      return template;
    }),

  getInstances: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'withdrawn', 'expired']).optional(),
      businessType: z.string().optional(),
      applicantId: z.number().optional(),
      currentApproverId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(approvalInstances.status, input.status));
      if (input?.businessType) conditions.push(eq(approvalInstances.businessType, input.businessType));
      if (input?.applicantId) conditions.push(eq(approvalInstances.applicantId, input.applicantId));
      if (input?.currentApproverId) conditions.push(eq(approvalInstances.currentApproverId, input.currentApproverId));

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const items = await db.select().from(approvalInstances)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(approvalInstances.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const [{ value: total }] = await db.select({ value: count() }).from(approvalInstances)
        .where(conditions.length ? and(...conditions) : undefined).limit(1);
      return { items, total: Number(total), page, pageSize };
    }),

  getMyPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const items = await db.select().from(approvalInstances)
        .where(and(eq(approvalInstances.currentApproverId, ctx.user!.id), inArray(approvalInstances.status, ["pending", "in_progress"])))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(50);
      return items;
    }),

  getMySubmittedApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const items = await db.select().from(approvalInstances)
        .where(eq(approvalInstances.applicantId, ctx.user!.id))
        .orderBy(desc(approvalInstances.createdAt))
        .limit(50);
      return items;
    }),

  submitApproval: protectedProcedure
    .input(z.object({
      templateCode: z.string(),
      businessId: z.string(),
      businessTable: z.string(),
      businessTitle: z.string().optional(),
      summary: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().default('CNY'),
      urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      attachments: z.array(z.object({ name: z.string(), url: z.string(), type: z.string().optional() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [template] = await db.select().from(approvalTemplates)
        .where(eq(approvalTemplates.templateCode, input.templateCode)).limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "审批模板不存在" });

      const steps = (template.steps as any[]) ?? [];
      const instanceCode = generateCode("APR");

      const [newInstance] = await db.insert(approvalInstances).values({
        instanceCode,
        templateId: template.id,
        templateCode: template.templateCode,
        businessType: template.businessType,
        businessId: input.businessId,
        businessTable: input.businessTable,
        businessTitle: input.businessTitle,
        applicantId: ctx.user!.id,
        applicantName: ctx.user!.name ?? "申请人",
        summary: input.summary,
        amount: input.amount ? String(input.amount) : undefined,
        currency: input.currency,
        urgency: input.urgency,
        status: "pending",
        currentStep: 1,
        totalSteps: steps.length || 1,
        attachments: input.attachments,
        submittedAt: new Date(),
      }).returning();

      // Create first step record
      const firstStep = steps[0];
      if (firstStep) {
        await db.insert(approvalStepRecords).values({
          instanceId: newInstance.id,
          instanceCode,
          stepNumber: 1,
          stepName: firstStep.stepName ?? "步骤1",
          approverRole: firstStep.approverRole ?? "manager",
          approverType: firstStep.approverType ?? "role",
        });
      }

      // Audit log
      await db.insert(approvalActionLogs).values({
        instanceId: newInstance.id,
        action: "submit",
        operatorId: ctx.user!.id,
        operatorName: ctx.user!.name ?? "申请人",
        newStatus: "pending",
      });

      log.info({ instanceId: newInstance.id, instanceCode, templateCode: input.templateCode }, "Approval submitted");
      return newInstance;
    }),

  processApproval: requirePermission('oa:forms:manage')
    .input(z.object({
      instanceId: z.number(),
      action: z.enum(['approve', 'reject', 'return']),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [instance] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, input.instanceId)).limit(1);
      if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "审批实例不存在" });

      const [template] = await db.select().from(approvalTemplates).where(eq(approvalTemplates.id, instance.templateId)).limit(1);
      const steps = (template?.steps as any[]) ?? [];
      const previousStatus = instance.status;

      // Update current step record
      await db.update(approvalStepRecords)
        .set({
          status: input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "returned",
          action: input.action,
          comment: input.comment,
          approverId: ctx.user!.id,
          approverName: ctx.user!.name ?? "审批人",
          completedAt: new Date(),
        })
        .where(and(
          eq(approvalStepRecords.instanceId, instance.id),
          eq(approvalStepRecords.stepNumber, instance.currentStep!),
          eq(approvalStepRecords.status, "pending"),
        ));

      let newStatus = instance.status;

      if (input.action === "approve") {
        if ((instance.currentStep ?? 1) < (instance.totalSteps ?? 1)) {
          const nextStep = (instance.currentStep ?? 1) + 1;
          newStatus = "in_progress";
          await db.update(approvalInstances).set({ currentStep: nextStep, status: newStatus, updatedAt: new Date() }).where(eq(approvalInstances.id, instance.id));
          const nextStepDef = steps[nextStep - 1];
          if (nextStepDef) {
            await db.insert(approvalStepRecords).values({
              instanceId: instance.id, instanceCode: instance.instanceCode, stepNumber: nextStep,
              stepName: nextStepDef.stepName ?? `步骤${nextStep}`, approverRole: nextStepDef.approverRole ?? "manager", approverType: nextStepDef.approverType ?? "role",
            });
          }
        } else {
          newStatus = "approved";
          await db.update(approvalInstances).set({ status: "approved", finalResult: "approved", completedAt: new Date(), updatedAt: new Date() }).where(eq(approvalInstances.id, instance.id));
        }
      } else if (input.action === "reject") {
        newStatus = "rejected";
        await db.update(approvalInstances).set({ status: "rejected", finalResult: "rejected", finalComment: input.comment, completedAt: new Date(), updatedAt: new Date() }).where(eq(approvalInstances.id, instance.id));
      } else if (input.action === "return") {
        const newStep = Math.max(1, (instance.currentStep ?? 1) - 1);
        newStatus = newStep === 1 ? "draft" : "in_progress";
        await db.update(approvalInstances).set({ currentStep: newStep, status: newStatus, updatedAt: new Date() }).where(eq(approvalInstances.id, instance.id));
      }

      await db.insert(approvalActionLogs).values({
        instanceId: instance.id, action: input.action, operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "审批人",
        previousStatus, newStatus, comment: input.comment,
      });

      log.info({ instanceId: instance.id, action: input.action, previousStatus, newStatus }, "Approval processed");
      const [updated] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, instance.id)).limit(1);
      return updated;
    }),

  withdrawApproval: requirePermission('oa:forms:manage')
    .input(z.object({ instanceId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [instance] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, input.instanceId)).limit(1);
      if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "审批实例不存在" });
      if (instance.applicantId !== ctx.user!.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能撤回自己发起的审批" });
      if (!["pending", "in_progress"].includes(instance.status ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "当前状态不允许撤回" });

      const previousStatus = instance.status;
      await db.update(approvalInstances).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(approvalInstances.id, instance.id));
      await db.insert(approvalActionLogs).values({ instanceId: instance.id, action: "withdraw", operatorId: ctx.user!.id, operatorName: ctx.user!.name ?? "申请人", previousStatus, newStatus: "withdrawn", comment: input.reason });

      const [updated] = await db.select().from(approvalInstances).where(eq(approvalInstances.id, instance.id)).limit(1);
      return updated;
    }),

  getInstanceHistory: protectedProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const steps = await db.select().from(approvalStepRecords)
        .where(eq(approvalStepRecords.instanceId, input.instanceId))
        .orderBy(approvalStepRecords.stepNumber)
        .limit(20);
      const logs = await db.select().from(approvalActionLogs)
        .where(eq(approvalActionLogs.instanceId, input.instanceId))
        .orderBy(desc(approvalActionLogs.createdAt))
        .limit(50);
      return { steps, logs };
    }),

  // ===== Section 3: 红蓝对抗配置API (DB-backed) =====

  getRedBlueConfigs: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled']).optional(),
      projectId: z.number().optional(),
      customerId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(redBlueConfigs.status, input.status));
      if (input?.projectId) conditions.push(eq(redBlueConfigs.projectId, input.projectId));
      if (input?.customerId) conditions.push(eq(redBlueConfigs.customerId, input.customerId));
      const result = await db.select().from(redBlueConfigs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(redBlueConfigs.createdAt))
        .limit(100);
      return result;
    }),

  getRedBlueConfig: protectedProcedure
    .input(z.object({ id: z.number().optional(), configCode: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      let config;
      if (input.id) {
        [config] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, input.id)).limit(1);
      } else if (input.configCode) {
        [config] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.configCode, input.configCode)).limit(1);
      }
      if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "红蓝对抗配置不存在" });
      return config;
    }),

  createRedBlueConfig: requirePermission('oa:forms:manage')
    .input(RedBlueConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const configCode = generateCode("RB");
      const [row] = await db.insert(redBlueConfigs).values({
        configCode,
        configName: input.configName,
        projectId: input.projectId,
        projectCode: input.projectCode,
        projectName: input.projectName,
        customerId: input.customerId,
        customerName: input.customerName,
        customerTier: input.customerTier,
        redTeamLeaderId: input.redTeamLeaderId,
        redTeamLeaderName: input.redTeamLeaderName,
        redTeamMembers: input.redTeamMembers,
        redTeamObjectives: input.redTeamObjectives,
        redTeamScenarios: input.redTeamScenarios,
        blueTeamLeaderId: input.blueTeamLeaderId,
        blueTeamLeaderName: input.blueTeamLeaderName,
        blueTeamMembers: input.blueTeamMembers,
        blueTeamObjectives: input.blueTeamObjectives,
        blueTeamResources: input.blueTeamResources,
        schedule: input.schedule,
        evaluationCriteria: input.evaluationCriteria,
        triggerConditions: input.triggerConditions,
        status: "draft",
        createdBy: ctx.user!.id,
        createdByName: ctx.user!.name,
      }).returning();
      log.info({ id: row.id, configCode }, "Red-blue config created");
      return row;
    }),

  updateRedBlueConfig: requirePermission('oa:forms:manage')
    .input(z.object({ id: z.number() }).merge(RedBlueConfigSchema))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "红蓝对抗配置不存在" });
      if (!["draft", "pending_approval"].includes(existing.status ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "当前状态不允许修改" });

      const { id, ...updateData } = input;
      await db.update(redBlueConfigs).set({ ...updateData, updatedAt: new Date() }).where(eq(redBlueConfigs.id, id));
      const [updated] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, id)).limit(1);
      return updated;
    }),

  submitRedBlueConfigForApproval: requirePermission('oa:forms:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [config] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, input.id)).limit(1);
      if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "红蓝对抗配置不存在" });
      if (config.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "只有草稿状态可以提交审批" });

      await db.update(redBlueConfigs).set({ status: "pending_approval", updatedAt: new Date() }).where(eq(redBlueConfigs.id, input.id));
      const [updated] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, input.id)).limit(1);
      return updated;
    }),

  deleteRedBlueConfig: requirePermission('oa:forms:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [config] = await db.select().from(redBlueConfigs).where(eq(redBlueConfigs.id, input.id)).limit(1);
      if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "红蓝对抗配置不存在" });
      if (!["draft", "cancelled"].includes(config.status ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "当前状态不允许删除" });

      await db.delete(redBlueConfigs).where(eq(redBlueConfigs.id, input.id));
      return { success: true };
    }),
});

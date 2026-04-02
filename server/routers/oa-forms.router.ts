/**
 * OA Dynamic Forms Router
 *
 * tRPC router for the OA dynamic forms system — template CRUD,
 * form submissions with multi-step approval, favorites, and stats.
 *
 * 17 procedures across 6 groups:
 *   Template CRUD (5)  |  Submission CRUD (5)  |  Approval Actions (2)
 *   Approval History (1)  |  Favorites (3)  |  Stats (1)
 */
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import {
  oaFormTemplates,
  oaFormSubmissions,
  oaFormApprovalRecords,
  oaFormTemplateVersions,
  oaFormFavorites,
} from "../../drizzle/oa-dynamic-forms-schema";
import { users, grtEmployees } from "../../drizzle/schema";
import { eq, desc, and, sql, asc, ilike, or } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────
const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number): number =>
  typeof id === "string" ? parseInt(id, 10) : id;

function generateSubmissionCode(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `DF-${dateStr}-${rand}`;
}

/**
 * 审批人自动解析 — 根据 approverType 查找正确的审批人
 * 支持: fixed_user | submitter_supervisor | department_head | role
 */
async function resolveApprover(
  db: any,
  stepConfig: { approverType: string; approverIds?: number[]; stepName?: string },
  applicantUserId: number,
): Promise<{ approverId: number | null; approverName: string | null }> {
  // 1. 固定审批人
  if (stepConfig.approverType === "fixed_user" && stepConfig.approverIds?.length) {
    const [approver] = await db.select().from(users).where(eq(users.id, stepConfig.approverIds[0])).limit(1);
    return { approverId: stepConfig.approverIds[0], approverName: (approver as any)?.name || "Unknown" };
  }

  // 2. 提交人的直接主管
  if (stepConfig.approverType === "submitter_supervisor") {
    try {
      // 通过 users.name 关联 grt_employees.name 查找主管
      const [applicantUser] = await db.select().from(users).where(eq(users.id, applicantUserId)).limit(1);
      if (applicantUser?.name) {
        const [emp] = await db.select().from(grtEmployees).where(eq(grtEmployees.name, applicantUser.name)).limit(1);
        if (emp?.supervisorId) {
          const [supervisor] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, emp.supervisorId)).limit(1);
          if (supervisor?.name) {
            // 查找主管对应的 users 记录
            const [supervisorUser] = await db.select().from(users).where(eq(users.name, supervisor.name)).limit(1);
            if (supervisorUser) {
              return { approverId: supervisorUser.id, approverName: supervisor.name };
            }
          }
        }
      }
    } catch { /* grt_employees 表可能不存在 */ }
    return { approverId: null, approverName: null };
  }

  // 3. 部门负责人 (查 grt_employees 层级向上找到 director 级别)
  if (stepConfig.approverType === "department_head") {
    try {
      const [applicantUser] = await db.select().from(users).where(eq(users.id, applicantUserId)).limit(1);
      if (applicantUser?.name) {
        // 沿 supervisor 链向上找，直到找到 department 负责人（supervisor_id 直接汇报给 CEO 的那一层）
        let current = await db.select().from(grtEmployees).where(eq(grtEmployees.name, applicantUser.name)).limit(1);
        let depth = 0;
        while (current.length > 0 && current[0].supervisorId && depth < 5) {
          const [sup] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, current[0].supervisorId)).limit(1);
          if (!sup) break;
          // 如果主管的主管是 null（CEO）或主管是部门级别，则当前 sup 就是部门负责人
          if (!sup.supervisorId) {
            // sup 是 CEO，则 current[0] 是部门负责人
            const [deptHeadUser] = await db.select().from(users).where(eq(users.name, current[0].name)).limit(1);
            if (deptHeadUser) return { approverId: deptHeadUser.id, approverName: current[0].name };
            break;
          }
          current = [sup];
          depth++;
        }
      }
    } catch { /* fallback */ }
    return { approverId: null, approverName: null };
  }

  return { approverId: null, approverName: null };
}

// ══════════════════════════════════════════════════════
// Router Definition
// ══════════════════════════════════════════════════════

export const oaFormsRouter = router({
  // ─────────────────────────────────────────────────
  // 1. Template CRUD
  // ─────────────────────────────────────────────────

  /** List templates with optional filtering */
  listTemplates: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          search: z.string().optional(),
          activeOnly: z.boolean().optional().default(true),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: ReturnType<typeof eq>[] = [];

      if (input?.activeOnly !== false) {
        conditions.push(eq(oaFormTemplates.isActive, true));
      }
      if (input?.category) {
        conditions.push(eq(oaFormTemplates.category, input.category));
      }
      if (input?.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(oaFormTemplates.templateName, pattern),
            ilike(oaFormTemplates.templateCode, pattern),
          )!,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const items = await db
        .select()
        .from(oaFormTemplates)
        .where(whereClause)
        .orderBy(desc(oaFormTemplates.createdAt))
        .limit(1000);

      return { items, total: items.length };
    }),

  /** Get single template by ID */
  getTemplate: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db
      .select()
      .from(oaFormTemplates)
      .where(eq(oaFormTemplates.id, toNum(input.id)));
    return item ?? null;
  }),

  /** Create a new form template */
  createTemplate: protectedProcedure
    .input(
      z.object({
        templateCode: z.string(),
        templateName: z.string(),
        templateNameEn: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        fields: z.array(z.record(z.string(), jsonValue)),
        approvalFlow: z.record(z.string(), jsonValue).optional(),
        isSystem: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [created] = await db
        .insert(oaFormTemplates)
        .values({
          templateCode: input.templateCode,
          templateName: input.templateName,
          templateNameEn: input.templateNameEn,
          description: input.description,
          category: input.category ?? "general",
          icon: input.icon,
          color: input.color,
          fields: input.fields as any,
          approvalFlow: (input.approvalFlow ?? null) as any,
          isSystem: input.isSystem ?? false,
          createdBy: ctx.user!.id,
          version: 1,
        })
        .returning();
      return created;
    }),

  /** Update template — saves current version as snapshot before applying changes */
  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        templateName: z.string().optional(),
        templateNameEn: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        fields: z.array(z.record(z.string(), jsonValue)).optional(),
        approvalFlow: z.record(z.string(), jsonValue).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;

      // Fetch current template to snapshot
      const [current] = await db
        .select()
        .from(oaFormTemplates)
        .where(eq(oaFormTemplates.id, id));

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template ${id} not found`,
        });
      }

      // Build update payload
      const setPayload: Record<string, unknown> = {
        version: (current.version ?? 1) + 1,
        updatedAt: new Date().toISOString(),
      };
      if (updates.templateName !== undefined) setPayload.templateName = updates.templateName;
      if (updates.templateNameEn !== undefined) setPayload.templateNameEn = updates.templateNameEn;
      if (updates.description !== undefined) setPayload.description = updates.description;
      if (updates.category !== undefined) setPayload.category = updates.category;
      if (updates.icon !== undefined) setPayload.icon = updates.icon;
      if (updates.color !== undefined) setPayload.color = updates.color;
      if (updates.fields !== undefined) setPayload.fields = updates.fields;
      if (updates.approvalFlow !== undefined) setPayload.approvalFlow = updates.approvalFlow;
      if (updates.isActive !== undefined) setPayload.isActive = updates.isActive;

      // Snapshot + update in a transaction
      const [updated] = await db.transaction(async (tx) => {
        await tx.insert(oaFormTemplateVersions).values({
          templateId: id,
          version: current.version ?? 1,
          fields: current.fields,
          approvalFlow: current.approvalFlow,
          changedBy: current.createdBy,
          changeNotes: `Auto-snapshot before update to v${(current.version ?? 1) + 1}`,
        });

        return await tx
          .update(oaFormTemplates)
          .set(setPayload)
          .where(eq(oaFormTemplates.id, id))
          .returning();
      });

      return updated;
    }),

  /** Soft-delete template (set isActive = false) */
  deleteTemplate: requirePermission('oa:forms:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db
        .update(oaFormTemplates)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(oaFormTemplates.id, input.id))
        .returning();
      return { success: true, data: updated };
    }),

  // ─────────────────────────────────────────────────
  // 2. Submission CRUD
  // ─────────────────────────────────────────────────

  /** List submissions with pagination and filtering */
  listSubmissions: protectedProcedure
    .input(
      z
        .object({
          applicantId: z.number().optional(),
          templateId: z.number().optional(),
          status: z.string().optional(),
          page: z.number().optional().default(1),
          pageSize: z.number().optional().default(20),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.applicantId) {
        conditions.push(eq(oaFormSubmissions.applicantId, input.applicantId));
      }
      if (input?.templateId) {
        conditions.push(eq(oaFormSubmissions.templateId, input.templateId));
      }
      if (input?.status) {
        conditions.push(eq(oaFormSubmissions.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(oaFormSubmissions)
        .where(whereClause)
        .orderBy(desc(oaFormSubmissions.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(oaFormSubmissions)
        .where(whereClause);

      return {
        items,
        total: totalResult?.count ?? 0,
        page,
        pageSize,
      };
    }),

  /** Get single submission by ID */
  getSubmission: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db
      .select()
      .from(oaFormSubmissions)
      .where(eq(oaFormSubmissions.id, toNum(input.id)));
    return item ?? null;
  }),

  /** Create a new form submission */
  createSubmission: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        departmentName: z.string().optional(),
        title: z.string(),
        formData: z.record(z.string(), jsonValue),
        priority: z.string().optional(),
        linkedProjectId: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const applicantId = ctx.user!.id;
      const applicantName = ctx.user!.name ?? `User#${applicantId}`;

      // Look up template
      const [template] = await db
        .select()
        .from(oaFormTemplates)
        .where(eq(oaFormTemplates.id, input.templateId));

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template ${input.templateId} not found`,
        });
      }

      const submissionCode = generateSubmissionCode();
      const approvalFlow = template.approvalFlow as
        | { steps: Array<{ approverType: string; approverIds?: number[]; stepName?: string }> }
        | null
        | undefined;

      let status = "approved";
      let currentApprovalStep = 0;
      let currentApproverId: number | null = null;
      let currentApproverName: string | null = null;

      // If template has approval flow with steps, set up first step
      if (approvalFlow?.steps && approvalFlow.steps.length > 0) {
        status = "pending";
        currentApprovalStep = 0;
        const firstStep = approvalFlow.steps[0];

        // 自动解析审批人（支持 fixed_user / submitter_supervisor / department_head）
        const resolved = await resolveApprover(db, firstStep, applicantId);
        if (resolved.approverId) {
          currentApproverId = resolved.approverId;
          currentApproverName = resolved.approverName;
        }
      }

      const [created] = await db
        .insert(oaFormSubmissions)
        .values({
          submissionCode,
          templateId: input.templateId,
          templateCode: template.templateCode,
          templateName: template.templateName,
          applicantId,
          applicantName,
          departmentName: input.departmentName,
          title: input.title,
          formData: input.formData,
          priority: input.priority ?? "normal",
          linkedProjectId: input.linkedProjectId,
          status,
          currentApprovalStep,
          currentApproverId,
          currentApproverName,
          approvedAt: status === "approved" ? new Date().toISOString() : null,
        })
        .returning();

      return created;
    }),

  /** Withdraw a submission (only if pending or draft, only by owner) */
  withdrawSubmission: requirePermission('oa:forms:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [submission] = await db
        .select()
        .from(oaFormSubmissions)
        .where(eq(oaFormSubmissions.id, input.id));

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Submission ${input.id} not found`,
        });
      }

      // Only the applicant can withdraw their own submission
      if (submission.applicantId !== ctx.user!.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "只能撤回自己提交的表单",
        });
      }

      if (submission.status !== "pending" && submission.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot withdraw submission with status "${submission.status}". Only pending or draft submissions can be withdrawn.`,
        });
      }

      const [updated] = await db
        .update(oaFormSubmissions)
        .set({
          status: "withdrawn",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oaFormSubmissions.id, input.id))
        .returning();

      return updated;
    }),

  /** Get submissions pending approval for the current user */
  /** 查询当前用户的审批链（直接主管 → 部门负责人 → CEO） */
  getMyApprovalChain: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.id ?? 0;
      const chain: { level: string; name: string; employeeId: string; position: string }[] = [];

      try {
        const [me] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!me?.name) return { chain };

        const [emp] = await db.select().from(grtEmployees).where(eq(grtEmployees.name, me.name)).limit(1);
        if (!emp) return { chain };

        // 沿 supervisor 链向上遍历
        let currentSupervisorId = emp.supervisorId;
        let depth = 0;
        const levels = ["直接主管", "部门负责人", "高管", "CEO"];
        while (currentSupervisorId && depth < 5) {
          const [sup] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, currentSupervisorId)).limit(1);
          if (!sup) break;
          chain.push({
            level: levels[Math.min(depth, levels.length - 1)],
            name: sup.name,
            employeeId: sup.employeeId,
            position: "", // could query from EMPLOYEES array
          });
          currentSupervisorId = sup.supervisorId;
          depth++;
        }
      } catch { /* grt_employees may not exist */ }

      return { chain };
    }),

  getMyPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(oaFormSubmissions)
        .where(
          and(
            eq(oaFormSubmissions.currentApproverId, ctx.user!.id),
            eq(oaFormSubmissions.status, "pending"),
          ),
        )
        .orderBy(desc(oaFormSubmissions.priority), asc(oaFormSubmissions.createdAt))
        .limit(1000);

      return { items, total: items.length };
    }),

  // ─────────────────────────────────────────────────
  // 3. Approval Actions
  // ─────────────────────────────────────────────────

  /** Approve a submission at its current step */
  approveSubmission: requirePermission('oa:forms:manage')
    .input(
      z.object({
        submissionId: z.number(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const approverId = ctx.user!.id;
      const approverName = ctx.user!.name ?? `User#${approverId}`;

      // Fetch submission
      const [submission] = await db
        .select()
        .from(oaFormSubmissions)
        .where(eq(oaFormSubmissions.id, input.submissionId));

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Submission ${input.submissionId} not found`,
        });
      }

      if (submission.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Submission is not pending (current status: "${submission.status}")`,
        });
      }

      // Self-approval prevention
      if (submission.applicantId === approverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "不能审批自己提交的表单",
        });
      }

      // Verify caller is the designated approver
      if (submission.currentApproverId && submission.currentApproverId !== approverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `当前审批人为 ${submission.currentApproverName ?? submission.currentApproverId}，您无权审批`,
        });
      }

      const currentStep = submission.currentApprovalStep ?? 0;

      // Insert approval record
      await db.insert(oaFormApprovalRecords).values({
        submissionId: input.submissionId,
        stepIndex: currentStep,
        approverId,
        approverName,
        action: "approve",
        comment: input.comment ?? null,
      });

      // Fetch template to check approval flow
      const [template] = await db
        .select()
        .from(oaFormTemplates)
        .where(eq(oaFormTemplates.id, submission.templateId));

      const approvalFlow = template?.approvalFlow as
        | { steps: Array<{ approverType: string; approverIds?: number[]; stepName?: string }> }
        | null
        | undefined;

      const totalSteps = approvalFlow?.steps?.length ?? 0;
      const nextStep = currentStep + 1;

      if (nextStep < totalSteps && approvalFlow?.steps) {
        // More steps remain — advance to next step
        const nextStepConfig = approvalFlow.steps[nextStep];

        // 自动解析下一步审批人
        const resolved = await resolveApprover(db, nextStepConfig, submission.applicantId ?? 0);
        const nextApproverId = resolved.approverId;
        const nextApproverName = resolved.approverName;

        // Atomic update — only update if still pending at current step
        const [updated] = await db
          .update(oaFormSubmissions)
          .set({
            currentApprovalStep: nextStep,
            currentApproverId: nextApproverId,
            currentApproverName: nextApproverName,
            updatedAt: new Date().toISOString(),
          })
          .where(and(
            eq(oaFormSubmissions.id, input.submissionId),
            eq(oaFormSubmissions.status, "pending"),
          ))
          .returning();

        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "表单状态已变更，请刷新后重试" });
        return updated;
      } else {
        // Last step — mark as approved (atomic)
        const [updated] = await db
          .update(oaFormSubmissions)
          .set({
            status: "approved",
            approvedAt: new Date().toISOString(),
            currentApproverId: null,
            currentApproverName: null,
            updatedAt: new Date().toISOString(),
          })
          .where(and(
            eq(oaFormSubmissions.id, input.submissionId),
            eq(oaFormSubmissions.status, "pending"),
          ))
          .returning();

        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "表单状态已变更，请刷新后重试" });
        return updated;
      }
    }),

  /** Reject a submission */
  rejectSubmission: requirePermission('oa:forms:manage')
    .input(
      z.object({
        submissionId: z.number(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const approverId = ctx.user!.id;
      const approverName = ctx.user!.name ?? `User#${approverId}`;

      // Fetch submission
      const [submission] = await db
        .select()
        .from(oaFormSubmissions)
        .where(eq(oaFormSubmissions.id, input.submissionId));

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Submission ${input.submissionId} not found`,
        });
      }

      if (submission.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Submission is not pending (current status: "${submission.status}")`,
        });
      }

      // Self-rejection prevention
      if (submission.applicantId === approverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "不能驳回自己提交的表单",
        });
      }

      // Verify caller is the designated approver
      if (submission.currentApproverId && submission.currentApproverId !== approverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `当前审批人为 ${submission.currentApproverName ?? submission.currentApproverId}，您无权驳回`,
        });
      }

      const currentStep = submission.currentApprovalStep ?? 0;

      // Insert rejection record
      await db.insert(oaFormApprovalRecords).values({
        submissionId: input.submissionId,
        stepIndex: currentStep,
        approverId,
        approverName,
        action: "reject",
        comment: input.comment ?? null,
      });

      // Atomic reject — only if still pending
      const [updated] = await db
        .update(oaFormSubmissions)
        .set({
          status: "rejected",
          rejectedAt: new Date().toISOString(),
          rejectionReason: input.comment ?? null,
          currentApproverId: null,
          currentApproverName: null,
          updatedAt: new Date().toISOString(),
        })
        .where(and(
          eq(oaFormSubmissions.id, input.submissionId),
          eq(oaFormSubmissions.status, "pending"),
        ))
        .returning();

      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "表单状态已变更，请刷新后重试" });
      return updated;
    }),

  // ─────────────────────────────────────────────────
  // 4. Approval History
  // ─────────────────────────────────────────────────

  /** Get all approval records for a submission */
  getApprovalHistory: protectedProcedure
    .input(z.object({ submissionId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(oaFormApprovalRecords)
        .where(eq(oaFormApprovalRecords.submissionId, toNum(input.submissionId)))
        .orderBy(asc(oaFormApprovalRecords.actionAt))
        .limit(1000);

      return { items, total: items.length };
    }),

  // ─────────────────────────────────────────────────
  // 5. Favorites
  // ─────────────────────────────────────────────────

  /** List current user's favorite templates */
  listFavorites: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const items = await db
        .select({
          id: oaFormFavorites.id,
          userId: oaFormFavorites.userId,
          templateId: oaFormFavorites.templateId,
          sortOrder: oaFormFavorites.sortOrder,
          createdAt: oaFormFavorites.createdAt,
          // Template fields
          templateCode: oaFormTemplates.templateCode,
          templateName: oaFormTemplates.templateName,
          templateNameEn: oaFormTemplates.templateNameEn,
          description: oaFormTemplates.description,
          category: oaFormTemplates.category,
          icon: oaFormTemplates.icon,
          color: oaFormTemplates.color,
          isActive: oaFormTemplates.isActive,
        })
        .from(oaFormFavorites)
        .innerJoin(oaFormTemplates, eq(oaFormFavorites.templateId, oaFormTemplates.id))
        .where(eq(oaFormFavorites.userId, ctx.user!.id))
        .orderBy(asc(oaFormFavorites.sortOrder))
        .limit(1000);

      return { items, total: items.length };
    }),

  /** Add a template to current user's favorites */
  addFavorite: requirePermission('oa:forms:manage')
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      try {
        const [created] = await db
          .insert(oaFormFavorites)
          .values({
            userId: ctx.user!.id,
            templateId: input.templateId,
            sortOrder: 0,
          })
          .returning();
        return { success: true, data: created };
      } catch (err: any) {
        // Unique constraint violation — already exists, treat as success
        if (err?.code === "23505") {
          return { success: true, message: "Already in favorites" };
        }
        throw err;
      }
    }),

  /** Remove a template from current user's favorites */
  removeFavorite: requirePermission('oa:forms:manage')
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await db
        .delete(oaFormFavorites)
        .where(
          and(
            eq(oaFormFavorites.userId, ctx.user!.id),
            eq(oaFormFavorites.templateId, input.templateId),
          ),
        );
      return { success: true };
    }),

  // ─────────────────────────────────────────────────
  // 6. Stats
  // ─────────────────────────────────────────────────

  /** Get aggregated stats across templates and submissions */
  getStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    const [templateStats] = await db
      .select({
        totalTemplates: sql<number>`count(*)::int`,
        activeTemplates: sql<number>`count(*) filter (where ${oaFormTemplates.isActive} = true)::int`,
      })
      .from(oaFormTemplates);

    const [submissionStats] = await db
      .select({
        totalSubmissions: sql<number>`count(*)::int`,
        pendingSubmissions: sql<number>`count(*) filter (where ${oaFormSubmissions.status} = 'pending')::int`,
        approvedSubmissions: sql<number>`count(*) filter (where ${oaFormSubmissions.status} = 'approved')::int`,
        rejectedSubmissions: sql<number>`count(*) filter (where ${oaFormSubmissions.status} = 'rejected')::int`,
      })
      .from(oaFormSubmissions);

    return {
      totalTemplates: templateStats?.totalTemplates ?? 0,
      activeTemplates: templateStats?.activeTemplates ?? 0,
      totalSubmissions: submissionStats?.totalSubmissions ?? 0,
      pendingSubmissions: submissionStats?.pendingSubmissions ?? 0,
      approvedSubmissions: submissionStats?.approvedSubmissions ?? 0,
      rejectedSubmissions: submissionStats?.rejectedSubmissions ?? 0,
    };
  }),
});

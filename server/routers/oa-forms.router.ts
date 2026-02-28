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
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import {
  oaFormTemplates,
  oaFormSubmissions,
  oaFormApprovalRecords,
  oaFormTemplateVersions,
  oaFormFavorites,
} from "../../drizzle/oa-dynamic-forms-schema";
import { users } from "../../drizzle/schema";
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
        .orderBy(desc(oaFormTemplates.createdAt));

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
        fields: z.any(),
        approvalFlow: z.any().optional(),
        isSystem: z.boolean().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
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
          fields: input.fields,
          approvalFlow: input.approvalFlow ?? null,
          isSystem: input.isSystem ?? false,
          createdBy: input.createdBy,
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
        fields: z.any().optional(),
        approvalFlow: z.any().optional(),
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

      // Save current version as snapshot
      await db.insert(oaFormTemplateVersions).values({
        templateId: id,
        version: current.version ?? 1,
        fields: current.fields,
        approvalFlow: current.approvalFlow,
        changedBy: current.createdBy,
        changeNotes: `Auto-snapshot before update to v${(current.version ?? 1) + 1}`,
      });

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

      const [updated] = await db
        .update(oaFormTemplates)
        .set(setPayload)
        .where(eq(oaFormTemplates.id, id))
        .returning();

      return updated;
    }),

  /** Soft-delete template (set isActive = false) */
  deleteTemplate: protectedProcedure
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
        applicantId: z.number(),
        applicantName: z.string(),
        departmentName: z.string().optional(),
        title: z.string(),
        formData: z.record(z.string(), z.unknown()),
        priority: z.string().optional(),
        linkedProjectId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

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

        // For fixed_user type, resolve first approver
        if (firstStep.approverType === "fixed_user" && firstStep.approverIds && firstStep.approverIds.length > 0) {
          currentApproverId = firstStep.approverIds[0];

          // Look up approver name
          const [approver] = await db
            .select()
            .from(users)
            .where(eq(users.id, currentApproverId));
          if (approver) {
            currentApproverName = (approver as any).name || (approver as any).displayName || "Unknown";
          }
        }
      }

      const [created] = await db
        .insert(oaFormSubmissions)
        .values({
          submissionCode,
          templateId: input.templateId,
          templateCode: template.templateCode,
          templateName: template.templateName,
          applicantId: input.applicantId,
          applicantName: input.applicantName,
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

  /** Withdraw a submission (only if pending or draft) */
  withdrawSubmission: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
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

  /** Get submissions pending approval for a specific approver */
  getMyPendingApprovals: protectedProcedure
    .input(z.object({ approverId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(oaFormSubmissions)
        .where(
          and(
            eq(oaFormSubmissions.currentApproverId, input.approverId),
            eq(oaFormSubmissions.status, "pending"),
          ),
        )
        .orderBy(desc(oaFormSubmissions.priority), asc(oaFormSubmissions.createdAt));

      return { items, total: items.length };
    }),

  // ─────────────────────────────────────────────────
  // 3. Approval Actions
  // ─────────────────────────────────────────────────

  /** Approve a submission at its current step */
  approveSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        approverId: z.number(),
        approverName: z.string(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

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
          code: "BAD_REQUEST",
          message: `Submission is not pending (current status: "${submission.status}")`,
        });
      }

      const currentStep = submission.currentApprovalStep ?? 0;

      // Insert approval record
      await db.insert(oaFormApprovalRecords).values({
        submissionId: input.submissionId,
        stepIndex: currentStep,
        approverId: input.approverId,
        approverName: input.approverName,
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
        let nextApproverId: number | null = null;
        let nextApproverName: string | null = null;

        if (
          nextStepConfig.approverType === "fixed_user" &&
          nextStepConfig.approverIds &&
          nextStepConfig.approverIds.length > 0
        ) {
          nextApproverId = nextStepConfig.approverIds[0];
          const [approver] = await db
            .select()
            .from(users)
            .where(eq(users.id, nextApproverId));
          if (approver) {
            nextApproverName = (approver as any).name || (approver as any).displayName || "Unknown";
          }
        }

        const [updated] = await db
          .update(oaFormSubmissions)
          .set({
            currentApprovalStep: nextStep,
            currentApproverId: nextApproverId,
            currentApproverName: nextApproverName,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(oaFormSubmissions.id, input.submissionId))
          .returning();

        return updated;
      } else {
        // Last step — mark as approved
        const [updated] = await db
          .update(oaFormSubmissions)
          .set({
            status: "approved",
            approvedAt: new Date().toISOString(),
            currentApproverId: null,
            currentApproverName: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(oaFormSubmissions.id, input.submissionId))
          .returning();

        return updated;
      }
    }),

  /** Reject a submission */
  rejectSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        approverId: z.number(),
        approverName: z.string(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

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
          code: "BAD_REQUEST",
          message: `Submission is not pending (current status: "${submission.status}")`,
        });
      }

      const currentStep = submission.currentApprovalStep ?? 0;

      // Insert rejection record
      await db.insert(oaFormApprovalRecords).values({
        submissionId: input.submissionId,
        stepIndex: currentStep,
        approverId: input.approverId,
        approverName: input.approverName,
        action: "reject",
        comment: input.comment ?? null,
      });

      // Mark submission as rejected
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
        .where(eq(oaFormSubmissions.id, input.submissionId))
        .returning();

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
        .orderBy(asc(oaFormApprovalRecords.actionAt));

      return { items, total: items.length };
    }),

  // ─────────────────────────────────────────────────
  // 5. Favorites
  // ─────────────────────────────────────────────────

  /** List a user's favorite templates */
  listFavorites: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
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
        .where(eq(oaFormFavorites.userId, input.userId))
        .orderBy(asc(oaFormFavorites.sortOrder));

      return { items, total: items.length };
    }),

  /** Add a template to user's favorites */
  addFavorite: protectedProcedure
    .input(z.object({ userId: z.number(), templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      try {
        const [created] = await db
          .insert(oaFormFavorites)
          .values({
            userId: input.userId,
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

  /** Remove a template from user's favorites */
  removeFavorite: protectedProcedure
    .input(z.object({ userId: z.number(), templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .delete(oaFormFavorites)
        .where(
          and(
            eq(oaFormFavorites.userId, input.userId),
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

/**
 * Department Procedure Router (部门规章制度)
 *
 * 9 sub-routers, ~29 procedures:
 * - categories (2): list, create (admin)
 * - procedures (8): list, getById, getByCode, create, update, publish, archive, search
 * - versions (2): list, createNewVersion (manager+)
 * - acknowledgments (4): acknowledge, myPending, getByProcedure, complianceRate
 * - exceptions (5): list, create, update, resolve, dashboard
 * - kpiLinks (3): list, link, unlink (manager+)
 * - dashboard (3): overview, deptSummary, expiringProcedures
 * - review (2): listDueForReview, submitReview (manager+)
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/trpc";
import * as svc from "../services/dept-procedure.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("dept-procedure-router");

/* ── Shared enum schemas ──────────────────────────────────── */

const procedureTypeSchema = z.enum([
  "core_procedure",
  "regulation",
  "compliance",
  "exception_handling",
]);

const procedureStatusSchema = z.enum([
  "draft",
  "under_review",
  "approved",
  "effective",
  "superseded",
  "archived",
]);

const procedurePrioritySchema = z.enum([
  "critical",
  "high",
  "standard",
  "reference",
]);

const ackMethodSchema = z.enum([
  "digital_signature",
  "checkbox",
  "quiz_pass",
]);

const exceptionSeveritySchema = z.enum(["minor", "major", "critical"]);

const exceptionStatusSchema = z.enum([
  "open",
  "investigating",
  "resolved",
  "closed",
]);

const reviewFrequencySchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "on_change",
]);

/* ── 1. Categories ────────────────────────────────────────── */

const categoriesRouter = router({
  /** List all active categories, optionally filtered by dept/type */
  list: protectedProcedure
    .input(
      z.object({
        deptCode: z.string().max(50).optional(),
        procedureType: procedureTypeSchema.optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      return svc.listCategories(input?.deptCode, input?.procedureType);
    }),

  /** Create a category (admin only) */
  create: requirePermission("admin:system:manage")
    .input(
      z.object({
        deptCode: z.string().min(1).max(50),
        deptName: z.string().min(1).max(100),
        deptNameEn: z.string().max(100).optional(),
        procedureType: procedureTypeSchema,
        parentId: z.number().int().positive().optional(),
        sortOrder: z.number().int().min(0).default(0),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      log.info({ deptCode: input.deptCode, userId: ctx.user!.id }, "Category create");
      return svc.createCategory(input);
    }),
});

/* ── 2. Procedures ────────────────────────────────────────── */

const proceduresRouter = router({
  /** Paginated list of procedures */
  list: protectedProcedure
    .input(
      z.object({
        deptCode: z.string().max(50).optional(),
        type: procedureTypeSchema.optional(),
        status: procedureStatusSchema.optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      return svc.listProcedures({
        deptCode: input?.deptCode,
        type: input?.type,
        status: input?.status,
        limit: Math.min(input?.limit ?? 100, 500),
        offset: input?.offset ?? 0,
      });
    }),

  /** Full-text search across title / code / summary */
  search: protectedProcedure
    .input(
      z.object({
        search: z.string().min(1).max(200),
        deptCode: z.string().max(50).optional(),
        type: procedureTypeSchema.optional(),
        status: procedureStatusSchema.optional(),
        limit: z.number().int().min(1).max(500).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      return svc.listProcedures({
        search: input.search,
        deptCode: input.deptCode,
        type: input.type,
        status: input.status,
        limit: Math.min(input.limit, 500),
        offset: input.offset,
      });
    }),

  /** Get single procedure by primary key */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.getProcedureById(input.id);
    }),

  /** Get single procedure by unique code */
  getByCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      return svc.getProcedureByCode(input.code);
    }),

  /** Create a new procedure (manager+) */
  create: requirePermission("hr:employee:manage")
    .input(
      z.object({
        procedureCode: z.string().min(1).max(80),
        title: z.string().min(1).max(500),
        titleEn: z.string().max(500).optional(),
        categoryId: z.number().int().positive().optional(),
        deptCode: z.string().min(1).max(50),
        procedureType: procedureTypeSchema,
        priority: procedurePrioritySchema.optional(),
        content: z.string().optional(),
        summary: z.string().max(2000).optional(),
        scope: z.string().max(2000).optional(),
        applicableRoles: z.array(z.string().max(100)).optional(),
        applicableBUs: z.array(z.string().max(50)).optional(),
        legalBasis: z.string().max(1000).optional(),
        industryStandard: z.string().max(200).optional(),
        expiryDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        reviewFrequency: reviewFrequencySchema.optional(),
        nextReviewDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        ownerUserId: z.number().int().positive().optional(),
        ownerName: z.string().max(100).optional(),
        ownerRole: z.string().max(50).optional(),
        relatedProcedureIds: z.array(z.number().int().positive()).optional(),
        penaltyRules: z.array(z.record(z.string(), z.any())).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      log.info({ code: input.procedureCode, userId: ctx.user!.id }, "Procedure create");
      return svc.createProcedure({ ...input, createdBy: ctx.user!.id });
    }),

  /** Update procedure fields (manager+) */
  update: requirePermission("hr:employee:manage")
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(500).optional(),
        titleEn: z.string().max(500).optional(),
        categoryId: z.number().int().positive().optional(),
        priority: procedurePrioritySchema.optional(),
        content: z.string().optional(),
        summary: z.string().max(2000).optional(),
        scope: z.string().max(2000).optional(),
        applicableRoles: z.array(z.string().max(100)).optional(),
        applicableBUs: z.array(z.string().max(50)).optional(),
        legalBasis: z.string().max(1000).optional(),
        industryStandard: z.string().max(200).optional(),
        expiryDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        reviewFrequency: reviewFrequencySchema.optional(),
        nextReviewDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        ownerUserId: z.number().int().positive().optional(),
        ownerName: z.string().max(100).optional(),
        ownerRole: z.string().max(50).optional(),
        relatedProcedureIds: z.array(z.number().int().positive()).optional(),
        penaltyRules: z.array(z.record(z.string(), z.any())).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      log.info({ id, userId: ctx.user!.id }, "Procedure update");
      return svc.updateProcedure(id, { ...data, updatedBy: ctx.user!.id });
    }),

  /** Publish procedure → effective (manager+) */
  publish: requirePermission("hr:employee:manage")
    .input(
      z.object({
        id: z.number().int().positive(),
        approverName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const approverName = input.approverName ?? ctx.user!.name ?? "Unknown";
      log.info({ id: input.id, approverId: ctx.user!.id }, "Procedure publish");
      return svc.publishProcedure(input.id, ctx.user!.id, approverName);
    }),

  /** Archive procedure (admin only) */
  archive: requirePermission("admin:system:manage")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      log.info({ id: input.id, userId: ctx.user!.id }, "Procedure archive");
      return svc.archiveProcedure(input.id);
    }),
});

/* ── 3. Versions ──────────────────────────────────────────── */

const versionsRouter = router({
  /** List version history for a procedure */
  list: protectedProcedure
    .input(z.object({ procedureId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.listVersions(input.procedureId);
    }),

  /** Create a new version snapshot (manager+) */
  createNewVersion: requirePermission("hr:employee:manage")
    .input(
      z.object({
        procedureId: z.number().int().positive(),
        changeType: z.enum(["major", "minor", "editorial"]),
        changeSummary: z.string().min(1).max(2000),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      log.info(
        { procedureId: input.procedureId, changeType: input.changeType, userId: ctx.user!.id },
        "Version created",
      );
      return svc.createNewVersion(
        input.procedureId,
        input.changeType,
        input.changeSummary,
        input.content,
        ctx.user!.id,
      );
    }),
});

/* ── 4. Acknowledgments ───────────────────────────────────── */

const acknowledgementsRouter = router({
  /** Acknowledge a procedure at a specific version */
  acknowledge: protectedProcedure
    .input(
      z.object({
        procedureId: z.number().int().positive(),
        version: z.string().min(1).max(20),
        method: ackMethodSchema.default("checkbox"),
        quizScore: z.number().int().min(0).max(100).optional(),
        ipAddress: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return svc.acknowledge(
        input.procedureId,
        input.version,
        ctx.user!.id,
        ctx.user!.name ?? "Unknown",
        (ctx.user as any).department ?? "",
        input.method,
        input.quizScore,
        input.ipAddress,
      );
    }),

  /** Procedures pending my acknowledgment */
  myPending: protectedProcedure.query(async ({ ctx }) => {
    const userRole = (ctx.user as any).role ?? "employee";
    const userDept = (ctx.user as any).department ?? "";
    return svc.getMyPendingAcks(ctx.user!.id, userRole, userDept);
  }),

  /** All acknowledgments for a procedure (manager+) */
  getByProcedure: requirePermission("hr:employee:manage")
    .input(z.object({ procedureId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.getAcksByProcedure(input.procedureId);
    }),

  /** Compliance rate (% acknowledged), optionally scoped to one dept */
  complianceRate: protectedProcedure
    .input(z.object({ deptCode: z.string().max(50).optional() }).optional())
    .query(async ({ input }) => {
      return svc.getComplianceRate(input?.deptCode);
    }),
});

/* ── 5. Exceptions ────────────────────────────────────────── */

const exceptionsRouter = router({
  /** List exceptions with filters */
  list: protectedProcedure
    .input(
      z.object({
        deptCode: z.string().max(50).optional(),
        procedureId: z.number().int().positive().optional(),
        severity: exceptionSeveritySchema.optional(),
        status: exceptionStatusSchema.optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      return svc.listExceptions({
        deptCode: input?.deptCode,
        procedureId: input?.procedureId,
        severity: input?.severity,
        status: input?.status,
        limit: Math.min(input?.limit ?? 100, 500),
        offset: input?.offset ?? 0,
      });
    }),

  /** Report a new exception / deviation */
  create: protectedProcedure
    .input(
      z.object({
        procedureId: z.number().int().positive(),
        exceptionCode: z.string().max(50).optional(),
        department: z.string().min(1).max(100),
        description: z.string().min(1).max(4000),
        severity: exceptionSeveritySchema.default("minor"),
        reportedByName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return svc.createException({
        procedureId: input.procedureId,
        exceptionCode: input.exceptionCode,
        reportedBy: ctx.user!.id,
        reportedByName: input.reportedByName ?? ctx.user!.name ?? "Unknown",
        department: input.department,
        description: input.description,
        severity: input.severity,
      });
    }),

  /** Add root cause / corrective action (manager+) */
  update: requirePermission("hr:employee:manage")
    .input(
      z.object({
        id: z.number().int().positive(),
        rootCause: z.string().max(4000).optional(),
        correctiveAction: z.string().max(4000).optional(),
        preventiveAction: z.string().max(4000).optional(),
        status: exceptionStatusSchema.optional(),
        severity: exceptionSeveritySchema.optional(),
        kpiImpact: z.array(
          z.object({
            kpiCode: z.string().max(80),
            impactType: z.enum(["positive", "negative"]),
            impactValue: z.number(),
          }),
        ).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      log.info({ id, userId: ctx.user!.id }, "Exception update");
      return svc.updateException(id, data);
    }),

  /** Close / resolve an exception (manager+) */
  resolve: requirePermission("hr:employee:manage")
    .input(
      z.object({
        id: z.number().int().positive(),
        resolvedByName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedByName = input.resolvedByName ?? ctx.user!.name ?? "Unknown";
      log.info({ id: input.id, userId: ctx.user!.id }, "Exception resolve");
      return svc.resolveException(input.id, ctx.user!.id, resolvedByName);
    }),

  /** Exceptions dashboard view (open/critical counts per dept) */
  dashboard: protectedProcedure
    .input(z.object({ deptCode: z.string().max(50).optional() }).optional())
    .query(async ({ input }) => {
      const exceptions = await svc.listExceptions({
        deptCode: input?.deptCode,
        limit: 500,
      });

      const byDept: Record<string, { open: number; critical: number; total: number }> = {};
      for (const ex of exceptions) {
        const dept = ex.department ?? "Unknown";
        if (!byDept[dept]) byDept[dept] = { open: 0, critical: 0, total: 0 };
        byDept[dept].total++;
        if (ex.status === "open" || ex.status === "investigating") byDept[dept].open++;
        if (ex.severity === "critical") byDept[dept].critical++;
      }

      return {
        summary: byDept,
        totalOpen: exceptions.filter(e => e.status === "open" || e.status === "investigating").length,
        totalCritical: exceptions.filter(e => e.severity === "critical").length,
        total: exceptions.length,
      };
    }),
});

/* ── 6. KPI Links ─────────────────────────────────────────── */

const kpiLinksRouter = router({
  /** Get active KPI links for a procedure */
  list: protectedProcedure
    .input(z.object({ procedureId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return svc.getKpiLinks(input.procedureId);
    }),

  /** Associate a KPI with a procedure (manager+) */
  link: requirePermission("hr:employee:manage")
    .input(
      z.object({
        procedureId: z.number().int().positive(),
        kpiCode: z.string().min(1).max(80),
        kpiName: z.string().min(1).max(200),
        kpiNameEn: z.string().max(200).optional(),
        targetValue: z.string().max(50).optional(),
        weight: z.number().min(0).max(10).optional(),
        measurementMethod: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      log.info({ procedureId: input.procedureId, kpiCode: input.kpiCode, userId: ctx.user!.id }, "KPI link");
      return svc.linkKpi(
        input.procedureId,
        input.kpiCode,
        input.kpiName,
        input.targetValue,
        input.weight,
        input.kpiNameEn,
        input.measurementMethod,
      );
    }),

  /** Remove KPI association (manager+) */
  unlink: requirePermission("hr:employee:manage")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      log.info({ id: input.id, userId: ctx.user!.id }, "KPI unlink");
      return svc.unlinkKpi(input.id);
    }),
});

/* ── 7. Dashboard ─────────────────────────────────────────── */

const dashboardRouter = router({
  /** System-wide aggregate overview stats */
  overview: protectedProcedure.query(async () => {
    return svc.getDashboardStats();
  }),

  /** Stats scoped to a single department */
  deptSummary: protectedProcedure
    .input(z.object({ deptCode: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      return svc.getDeptSummary(input.deptCode);
    }),

  /** Procedures whose nextReviewDate is within N days */
  expiringProcedures: protectedProcedure
    .input(z.object({ withinDays: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      return svc.getExpiringProcedures(input?.withinDays ?? 30);
    }),
});

/* ── 8. Review workflow ───────────────────────────────────── */

const reviewRouter = router({
  /** List procedures whose next review date has passed (manager+) */
  listDueForReview: requirePermission("hr:employee:manage")
    .input(z.object({ deptCode: z.string().max(50).optional() }).optional())
    .query(async ({ input }) => {
      return svc.listDueForReview(input?.deptCode);
    }),

  /** Submit a review outcome for a procedure (manager+) */
  submitReview: requirePermission("hr:employee:manage")
    .input(
      z.object({
        procedureId: z.number().int().positive(),
        outcome: z.enum(["approved", "needs_revision", "rejected"]),
        notes: z.string().max(4000).optional(),
        nextReviewDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        reviewerName: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const reviewerName = input.reviewerName ?? ctx.user!.name ?? "Unknown";
      log.info(
        { procedureId: input.procedureId, outcome: input.outcome, userId: ctx.user!.id },
        "Review submitted",
      );
      return svc.submitReview(
        input.procedureId,
        ctx.user!.id,
        reviewerName,
        input.outcome,
        input.notes,
        input.nextReviewDate,
      );
    }),
});

/* ── Merged router ────────────────────────────────────────── */

export const deptProcedureRouter = router({
  categories: categoriesRouter,
  procedures: proceduresRouter,
  versions: versionsRouter,
  acknowledgments: acknowledgementsRouter,
  exceptions: exceptionsRouter,
  kpiLinks: kpiLinksRouter,
  dashboard: dashboardRouter,
  review: reviewRouter,
});

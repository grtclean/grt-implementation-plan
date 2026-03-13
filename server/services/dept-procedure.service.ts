/**
 * Department Procedure Service (部门规章制度服务)
 *
 * Business logic for:
 * - Procedure categories and lifecycle management
 * - Version control and publishing workflow
 * - Employee acknowledgment tracking
 * - Exception / deviation recording
 * - KPI linkage
 * - Dashboard & compliance statistics
 */

import { eq, and, desc, sql, gte, lte, asc, like, or } from "drizzle-orm";
import { db } from "../db";
import {
  deptProcedureCategories,
  deptProcedures,
  deptProcedureVersions,
  deptProcedureAcknowledgments,
  deptProcedureExceptions,
  deptProcedureKpiLinks,
} from "../../drizzle/dept-procedures-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("dept-procedure");

/* ── Types ────────────────────────────────────────────────── */

export interface ListProcedureOpts {
  deptCode?: string;
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListExceptionOpts {
  deptCode?: string;
  procedureId?: number;
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/* ── Categories ───────────────────────────────────────────── */

export async function listCategories(deptCode?: string, procedureType?: string) {
  const conditions: ReturnType<typeof eq>[] = [
    eq(deptProcedureCategories.isActive, true),
  ];
  if (deptCode) conditions.push(eq(deptProcedureCategories.deptCode, deptCode));
  if (procedureType) {
    conditions.push(
      eq(deptProcedureCategories.procedureType, procedureType as any),
    );
  }

  return db
    .select()
    .from(deptProcedureCategories)
    .where(and(...conditions))
    .orderBy(asc(deptProcedureCategories.sortOrder), asc(deptProcedureCategories.deptName))
    .limit(500);
}

export async function createCategory(data: {
  deptCode: string;
  deptName: string;
  deptNameEn?: string;
  procedureType: string;
  parentId?: number;
  sortOrder?: number;
  description?: string;
}) {
  const [row] = await db
    .insert(deptProcedureCategories)
    .values({
      deptCode: data.deptCode,
      deptName: data.deptName,
      deptNameEn: data.deptNameEn,
      procedureType: data.procedureType as any,
      parentId: data.parentId,
      sortOrder: data.sortOrder ?? 0,
      description: data.description,
      isActive: true,
    })
    .returning();
  log.info({ id: row.id, deptCode: data.deptCode }, "Category created");
  return row;
}

/* ── Procedures ───────────────────────────────────────────── */

export async function listProcedures(opts: ListProcedureOpts) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;

  const conditions: ReturnType<typeof eq | typeof like>[] = [];
  if (opts.deptCode) conditions.push(eq(deptProcedures.deptCode, opts.deptCode));
  if (opts.type) conditions.push(eq(deptProcedures.procedureType, opts.type as any));
  if (opts.status) conditions.push(eq(deptProcedures.status, opts.status as any));
  if (opts.search) {
    conditions.push(
      or(
        like(deptProcedures.title, `%${opts.search}%`),
        like(deptProcedures.procedureCode, `%${opts.search}%`),
        like(deptProcedures.summary, `%${opts.search}%`),
      ) as any,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(deptProcedures)
    .where(where)
    .orderBy(desc(deptProcedures.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getProcedureById(id: number) {
  const [row] = await db
    .select()
    .from(deptProcedures)
    .where(eq(deptProcedures.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProcedureByCode(code: string) {
  const [row] = await db
    .select()
    .from(deptProcedures)
    .where(eq(deptProcedures.procedureCode, code))
    .limit(1);
  return row ?? null;
}

export async function createProcedure(data: {
  procedureCode: string;
  title: string;
  titleEn?: string;
  categoryId?: number;
  deptCode: string;
  procedureType: string;
  priority?: string;
  content?: string;
  summary?: string;
  scope?: string;
  applicableRoles?: string[];
  applicableBUs?: string[];
  legalBasis?: string;
  industryStandard?: string;
  expiryDate?: Date;
  reviewFrequency?: string;
  nextReviewDate?: Date;
  ownerUserId?: number;
  ownerName?: string;
  ownerRole?: string;
  relatedProcedureIds?: number[];
  penaltyRules?: any[];
  createdBy?: number;
}) {
  const [row] = await db
    .insert(deptProcedures)
    .values({
      procedureCode: data.procedureCode,
      title: data.title,
      titleEn: data.titleEn,
      categoryId: data.categoryId,
      deptCode: data.deptCode,
      procedureType: data.procedureType as any,
      priority: (data.priority as any) ?? "standard",
      status: "draft",
      currentVersion: "V1.0",
      versionMajor: 1,
      versionMinor: 0,
      content: data.content,
      summary: data.summary,
      scope: data.scope,
      applicableRoles: data.applicableRoles ?? [],
      applicableBUs: data.applicableBUs ?? [],
      legalBasis: data.legalBasis,
      industryStandard: data.industryStandard,
      expiryDate: data.expiryDate,
      reviewFrequency: (data.reviewFrequency as any) ?? "annual",
      nextReviewDate: data.nextReviewDate,
      ownerUserId: data.ownerUserId,
      ownerName: data.ownerName,
      ownerRole: data.ownerRole,
      relatedProcedureIds: data.relatedProcedureIds ?? [],
      penaltyRules: data.penaltyRules ?? [],
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    })
    .returning();
  log.info({ id: row.id, code: data.procedureCode }, "Procedure created");
  return row;
}

export async function updateProcedure(
  id: number,
  data: Partial<{
    title: string;
    titleEn: string;
    categoryId: number;
    priority: string;
    content: string;
    summary: string;
    scope: string;
    applicableRoles: string[];
    applicableBUs: string[];
    legalBasis: string;
    industryStandard: string;
    expiryDate: Date;
    reviewFrequency: string;
    nextReviewDate: Date;
    ownerUserId: number;
    ownerName: string;
    ownerRole: string;
    relatedProcedureIds: number[];
    penaltyRules: any[];
    updatedBy: number;
    status: string;
  }>,
) {
  const { status, priority, reviewFrequency, ...rest } = data;
  const [row] = await db
    .update(deptProcedures)
    .set({
      ...rest,
      ...(status !== undefined ? { status: status as any } : {}),
      ...(priority !== undefined ? { priority: priority as any } : {}),
      ...(reviewFrequency !== undefined ? { reviewFrequency: reviewFrequency as any } : {}),
      updatedAt: new Date(),
    })
    .where(eq(deptProcedures.id, id))
    .returning();
  log.info({ id }, "Procedure updated");
  return row;
}

export async function publishProcedure(
  id: number,
  approverUserId: number,
  approverName: string,
) {
  const now = new Date();
  const [row] = await db
    .update(deptProcedures)
    .set({
      status: "effective",
      effectiveDate: now,
      approverUserId,
      approverName,
      updatedAt: now,
    })
    .where(eq(deptProcedures.id, id))
    .returning();
  log.info({ id, approverUserId }, "Procedure published → effective");
  return row;
}

export async function archiveProcedure(id: number) {
  const [row] = await db
    .update(deptProcedures)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(deptProcedures.id, id))
    .returning();
  log.info({ id }, "Procedure archived");
  return row;
}

/* ── Versions ─────────────────────────────────────────────── */

export async function listVersions(procedureId: number) {
  return db
    .select()
    .from(deptProcedureVersions)
    .where(eq(deptProcedureVersions.procedureId, procedureId))
    .orderBy(desc(deptProcedureVersions.createdAt))
    .limit(500);
}

export async function createNewVersion(
  procedureId: number,
  changeType: string,
  changeSummary: string,
  content: string,
  createdBy: number,
) {
  // Determine next version number from current procedure
  const procedure = await getProcedureById(procedureId);
  if (!procedure) throw new Error("Procedure not found");

  let nextMajor = procedure.versionMajor ?? 1;
  let nextMinor = procedure.versionMinor ?? 0;

  if (changeType === "major") {
    nextMajor += 1;
    nextMinor = 0;
  } else {
    nextMinor += 1;
  }

  const nextVersionStr = `V${nextMajor}.${nextMinor}`;

  // Snapshot the new version
  const [versionRow] = await db
    .insert(deptProcedureVersions)
    .values({
      procedureId,
      version: nextVersionStr,
      versionMajor: nextMajor,
      versionMinor: nextMinor,
      changeType,
      changeSummary,
      content,
      publishedAt: new Date(),
      createdBy,
    })
    .returning();

  // Bump the procedure's current version
  await db
    .update(deptProcedures)
    .set({
      currentVersion: nextVersionStr,
      versionMajor: nextMajor,
      versionMinor: nextMinor,
      content,
      status: "under_review",
      updatedAt: new Date(),
    })
    .where(eq(deptProcedures.id, procedureId));

  log.info({ procedureId, version: nextVersionStr, changeType }, "New version created");
  return versionRow;
}

/* ── Acknowledgments ──────────────────────────────────────── */

export async function acknowledge(
  procedureId: number,
  version: string,
  userId: number,
  employeeName: string,
  department: string,
  method: string,
  quizScore?: number,
  ipAddress?: string,
) {
  // Use insert … on conflict do update to allow re-ack on same version
  const [row] = await db
    .insert(deptProcedureAcknowledgments)
    .values({
      procedureId,
      versionAcknowledged: version,
      userId,
      employeeName,
      department,
      acknowledgmentMethod: method as any,
      quizScore,
      ipAddress,
      acknowledgedAt: new Date(),
      isLatestVersion: true,
    })
    .onConflictDoUpdate({
      target: [
        deptProcedureAcknowledgments.procedureId,
        deptProcedureAcknowledgments.userId,
        deptProcedureAcknowledgments.versionAcknowledged,
      ],
      set: {
        acknowledgedAt: new Date(),
        quizScore,
        acknowledgmentMethod: method as any,
        isLatestVersion: true,
      },
    })
    .returning();
  log.info({ procedureId, userId, version }, "Acknowledgment recorded");
  return row;
}

export async function getMyPendingAcks(
  userId: number,
  userRole: string,
  userDept: string,
) {
  // Find all effective procedures applicable to this user's role/dept that
  // they have NOT yet acknowledged at the current version.
  const effective = await db
    .select()
    .from(deptProcedures)
    .where(eq(deptProcedures.status, "effective"))
    .limit(500);

  const acked = await db
    .select()
    .from(deptProcedureAcknowledgments)
    .where(
      and(
        eq(deptProcedureAcknowledgments.userId, userId),
        eq(deptProcedureAcknowledgments.isLatestVersion, true),
      ),
    )
    .limit(500);

  const ackedSet = new Set(acked.map(a => `${a.procedureId}:${a.versionAcknowledged}`));

  return effective.filter(p => {
    const key = `${p.id}:${p.currentVersion}`;
    if (ackedSet.has(key)) return false;
    // Check role applicability — if list is empty/null, applies to all
    const roles = (p.applicableRoles ?? []) as string[];
    if (roles.length > 0 && !roles.includes(userRole)) return false;
    return true;
  });
}

export async function getAcksByProcedure(procedureId: number) {
  return db
    .select()
    .from(deptProcedureAcknowledgments)
    .where(eq(deptProcedureAcknowledgments.procedureId, procedureId))
    .orderBy(desc(deptProcedureAcknowledgments.acknowledgedAt))
    .limit(500);
}

export async function getComplianceRate(deptCode?: string) {
  // Count effective procedures for scope
  const procWhere = deptCode
    ? and(eq(deptProcedures.status, "effective"), eq(deptProcedures.deptCode, deptCode))
    : eq(deptProcedures.status, "effective");

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deptProcedures)
    .where(procWhere);

  const totalProcedures = Number(totalRow?.count ?? 0);

  if (totalProcedures === 0) {
    return { rate: 100, totalProcedures: 0, totalAcks: 0, uniqueAckers: 0 };
  }

  const ackWhere = deptCode
    ? and(
        eq(deptProcedureAcknowledgments.isLatestVersion, true),
        eq(deptProcedureAcknowledgments.department, deptCode),
      )
    : eq(deptProcedureAcknowledgments.isLatestVersion, true);

  const [ackRow] = await db
    .select({
      totalAcks: sql<number>`count(*)`,
      uniqueAckers: sql<number>`count(distinct ${deptProcedureAcknowledgments.userId})`,
    })
    .from(deptProcedureAcknowledgments)
    .where(ackWhere);

  const totalAcks = Number(ackRow?.totalAcks ?? 0);
  const uniqueAckers = Number(ackRow?.uniqueAckers ?? 0);

  // Compliance rate = acks per procedure / total procedures (capped at 100)
  const rate = Math.min(
    Math.round((totalAcks / Math.max(totalProcedures, 1)) * 100),
    100,
  );

  return { rate, totalProcedures, totalAcks, uniqueAckers };
}

/* ── Exceptions ───────────────────────────────────────────── */

export async function createException(data: {
  procedureId: number;
  exceptionCode?: string;
  reportedBy: number;
  reportedByName: string;
  department: string;
  description: string;
  severity?: string;
}) {
  const [row] = await db
    .insert(deptProcedureExceptions)
    .values({
      procedureId: data.procedureId,
      exceptionCode: data.exceptionCode,
      reportedBy: data.reportedBy,
      reportedByName: data.reportedByName,
      department: data.department,
      description: data.description,
      severity: (data.severity as any) ?? "minor",
      status: "open",
      reportedAt: new Date(),
    })
    .returning();
  log.info({ id: row.id, procedureId: data.procedureId, severity: data.severity }, "Exception created");
  return row;
}

export async function updateException(
  id: number,
  data: Partial<{
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
    status: string;
    severity: string;
    kpiImpact: any[];
  }>,
) {
  const [row] = await db
    .update(deptProcedureExceptions)
    .set({
      rootCause: data.rootCause,
      correctiveAction: data.correctiveAction,
      preventiveAction: data.preventiveAction,
      status: data.status as any,
      severity: data.severity as any,
      kpiImpact: data.kpiImpact,
    })
    .where(eq(deptProcedureExceptions.id, id))
    .returning();
  log.info({ id }, "Exception updated");
  return row;
}

export async function resolveException(
  id: number,
  resolvedBy: number,
  resolvedByName: string,
) {
  const [row] = await db
    .update(deptProcedureExceptions)
    .set({
      status: "resolved",
      resolvedBy,
      resolvedByName,
      resolvedAt: new Date(),
    })
    .where(eq(deptProcedureExceptions.id, id))
    .returning();
  log.info({ id, resolvedBy }, "Exception resolved");
  return row;
}

export async function listExceptions(opts: ListExceptionOpts) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;

  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.deptCode) conditions.push(eq(deptProcedureExceptions.department, opts.deptCode));
  if (opts.procedureId) conditions.push(eq(deptProcedureExceptions.procedureId, opts.procedureId));
  if (opts.severity) conditions.push(eq(deptProcedureExceptions.severity, opts.severity as any));
  if (opts.status) conditions.push(eq(deptProcedureExceptions.status, opts.status as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(deptProcedureExceptions)
    .where(where)
    .orderBy(desc(deptProcedureExceptions.reportedAt))
    .limit(limit)
    .offset(offset);
}

/* ── KPI Links ────────────────────────────────────────────── */

export async function linkKpi(
  procedureId: number,
  kpiCode: string,
  kpiName: string,
  targetValue?: string,
  weight?: number,
  kpiNameEn?: string,
  measurementMethod?: string,
) {
  const [row] = await db
    .insert(deptProcedureKpiLinks)
    .values({
      procedureId,
      kpiCode,
      kpiName,
      kpiNameEn,
      targetValue,
      weight: weight?.toString() ?? "1.00",
      measurementMethod,
      isActive: true,
    })
    .returning();
  log.info({ procedureId, kpiCode }, "KPI link created");
  return row;
}

export async function unlinkKpi(id: number) {
  const [row] = await db
    .update(deptProcedureKpiLinks)
    .set({ isActive: false })
    .where(eq(deptProcedureKpiLinks.id, id))
    .returning();
  log.info({ id }, "KPI link deactivated");
  return row;
}

export async function getKpiLinks(procedureId: number) {
  return db
    .select()
    .from(deptProcedureKpiLinks)
    .where(
      and(
        eq(deptProcedureKpiLinks.procedureId, procedureId),
        eq(deptProcedureKpiLinks.isActive, true),
      ),
    )
    .orderBy(asc(deptProcedureKpiLinks.kpiCode))
    .limit(500);
}

/* ── Dashboard ────────────────────────────────────────────── */

export async function getDashboardStats() {
  const [procedureCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      effective: sql<number>`count(*) filter (where ${deptProcedures.status} = 'effective')`,
      draft: sql<number>`count(*) filter (where ${deptProcedures.status} = 'draft')`,
      underReview: sql<number>`count(*) filter (where ${deptProcedures.status} = 'under_review')`,
      archived: sql<number>`count(*) filter (where ${deptProcedures.status} = 'archived')`,
    })
    .from(deptProcedures);

  const [exceptionCounts] = await db
    .select({
      total: sql<number>`count(*)`,
      open: sql<number>`count(*) filter (where ${deptProcedureExceptions.status} = 'open')`,
      critical: sql<number>`count(*) filter (where ${deptProcedureExceptions.severity} = 'critical')`,
      resolvedThisMonth: sql<number>`count(*) filter (where ${deptProcedureExceptions.status} = 'resolved' and ${deptProcedureExceptions.resolvedAt} >= date_trunc('month', now()))`,
    })
    .from(deptProcedureExceptions);

  const [ackStats] = await db
    .select({
      totalAcks: sql<number>`count(*)`,
      uniqueAckers: sql<number>`count(distinct ${deptProcedureAcknowledgments.userId})`,
    })
    .from(deptProcedureAcknowledgments)
    .where(eq(deptProcedureAcknowledgments.isLatestVersion, true));

  const complianceRate = await getComplianceRate();

  return {
    procedures: {
      total: Number(procedureCounts?.total ?? 0),
      effective: Number(procedureCounts?.effective ?? 0),
      draft: Number(procedureCounts?.draft ?? 0),
      underReview: Number(procedureCounts?.underReview ?? 0),
      archived: Number(procedureCounts?.archived ?? 0),
    },
    exceptions: {
      total: Number(exceptionCounts?.total ?? 0),
      open: Number(exceptionCounts?.open ?? 0),
      critical: Number(exceptionCounts?.critical ?? 0),
      resolvedThisMonth: Number(exceptionCounts?.resolvedThisMonth ?? 0),
    },
    acknowledgments: {
      total: Number(ackStats?.totalAcks ?? 0),
      uniqueAckers: Number(ackStats?.uniqueAckers ?? 0),
    },
    complianceRate: complianceRate.rate,
  };
}

export async function getDeptSummary(deptCode: string) {
  const [procRow] = await db
    .select({
      total: sql<number>`count(*)`,
      effective: sql<number>`count(*) filter (where ${deptProcedures.status} = 'effective')`,
      draft: sql<number>`count(*) filter (where ${deptProcedures.status} = 'draft')`,
    })
    .from(deptProcedures)
    .where(eq(deptProcedures.deptCode, deptCode));

  const [excRow] = await db
    .select({
      open: sql<number>`count(*) filter (where ${deptProcedureExceptions.status} = 'open')`,
      total: sql<number>`count(*)`,
    })
    .from(deptProcedureExceptions)
    .where(eq(deptProcedureExceptions.department, deptCode));

  const complianceRate = await getComplianceRate(deptCode);

  return {
    deptCode,
    procedures: {
      total: Number(procRow?.total ?? 0),
      effective: Number(procRow?.effective ?? 0),
      draft: Number(procRow?.draft ?? 0),
    },
    exceptions: {
      open: Number(excRow?.open ?? 0),
      total: Number(excRow?.total ?? 0),
    },
    complianceRate: complianceRate.rate,
    totalAcks: complianceRate.totalAcks,
    uniqueAckers: complianceRate.uniqueAckers,
  };
}

export async function getExpiringProcedures(withinDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  return db
    .select()
    .from(deptProcedures)
    .where(
      and(
        eq(deptProcedures.status, "effective"),
        lte(deptProcedures.nextReviewDate, cutoff),
      ),
    )
    .orderBy(asc(deptProcedures.nextReviewDate))
    .limit(500);
}

/* ── Review workflow helpers ──────────────────────────────── */

export async function listDueForReview(deptCode?: string) {
  const cutoff = new Date();

  const conditions: ReturnType<typeof eq>[] = [
    eq(deptProcedures.status, "effective"),
    lte(deptProcedures.nextReviewDate, cutoff) as any,
  ];
  if (deptCode) conditions.push(eq(deptProcedures.deptCode, deptCode));

  return db
    .select()
    .from(deptProcedures)
    .where(and(...conditions))
    .orderBy(asc(deptProcedures.nextReviewDate))
    .limit(500);
}

export async function submitReview(
  procedureId: number,
  reviewerId: number,
  reviewerName: string,
  outcome: "approved" | "needs_revision" | "rejected",
  notes?: string,
  nextReviewDate?: Date,
) {
  // After a review, update status and bump review date
  const updates: Record<string, any> = {
    updatedAt: new Date(),
    updatedBy: reviewerId,
    approverUserId: reviewerId,
    approverName: reviewerName,
  };

  if (outcome === "approved") {
    updates.status = "approved";
    if (nextReviewDate) updates.nextReviewDate = nextReviewDate;
  } else if (outcome === "rejected") {
    updates.status = "draft";
  }
  // needs_revision → stays in under_review (no status change)

  const [row] = await db
    .update(deptProcedures)
    .set(updates)
    .where(eq(deptProcedures.id, procedureId))
    .returning();

  log.info({ procedureId, reviewerId, outcome }, "Procedure review submitted");
  return { procedure: row, outcome, notes };
}

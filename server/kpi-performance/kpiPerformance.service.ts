/**
 * KPI Performance Service - CRUD operations for all 6 HR/KPI performance tables
 *
 * Tables: hrmKpiPositions, hrmKpiLibrary, hrmPositionKpiTargets,
 *         hrmUserSkillMatrix, hrmMonthlyPerformanceReviews, hrmMilitaryOrders
 */

import { requireDb } from "../db";
import {
  hrmKpiPositions,
  hrmKpiLibrary,
  hrmPositionKpiTargets,
  hrmUserSkillMatrix,
  hrmMonthlyPerformanceReviews,
  hrmMilitaryOrders,
} from "../../drizzle/kpi-performance-schema";
import { eq, ilike, and, desc, sql, or } from "drizzle-orm";

// ============================================================
// hrmKpiPositions — KPI Position Profiles
// ============================================================

export async function listKpiPositions(params: {
  search?: string;
  department?: string;
  buCode?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { search, department, buCode, status, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (department) conditions.push(eq(hrmKpiPositions.department, department));
  if (buCode) conditions.push(eq(hrmKpiPositions.buCode, buCode));
  if (status) conditions.push(eq(hrmKpiPositions.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(hrmKpiPositions.title, `%${search}%`),
        ilike(hrmKpiPositions.department, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmKpiPositions)
    .where(where)
    .orderBy(desc(hrmKpiPositions.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmKpiPositions)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getKpiPositionById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmKpiPositions)
    .where(eq(hrmKpiPositions.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createKpiPosition(data: {
  positionId?: number;
  title: string;
  department: string;
  buCode?: string;
  responsibilities?: string;
  hiringRequirements?: string;
  coreCompetency?: string;
  headcount?: number;
  status?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(hrmKpiPositions).values(data).returning();
  return result[0];
}

export async function updateKpiPosition(
  id: number,
  data: {
    positionId?: number;
    title?: string;
    department?: string;
    buCode?: string;
    responsibilities?: string;
    hiringRequirements?: string;
    coreCompetency?: string;
    headcount?: number;
    status?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmKpiPositions)
    .set(updateData)
    .where(eq(hrmKpiPositions.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteKpiPosition(id: number) {
  const db = await requireDb();

  // Cascade: delete related targets first
  await db
    .delete(hrmPositionKpiTargets)
    .where(eq(hrmPositionKpiTargets.positionId, id));

  const result = await db
    .delete(hrmKpiPositions)
    .where(eq(hrmKpiPositions.id, id))
    .returning();

  return result[0] ?? null;
}

// ============================================================
// hrmKpiLibrary — KPI Metrics Library
// ============================================================

export async function listKpiLibrary(params: {
  search?: string;
  kpiType?: string;
  buCode?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { search, kpiType, buCode, status, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (kpiType) conditions.push(eq(hrmKpiLibrary.kpiType, kpiType));
  if (buCode) conditions.push(eq(hrmKpiLibrary.buCode, buCode));
  if (status) conditions.push(eq(hrmKpiLibrary.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(hrmKpiLibrary.name, `%${search}%`),
        ilike(hrmKpiLibrary.code, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmKpiLibrary)
    .where(where)
    .orderBy(desc(hrmKpiLibrary.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmKpiLibrary)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getKpiLibraryById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmKpiLibrary)
    .where(eq(hrmKpiLibrary.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createKpiLibraryItem(data: {
  name: string;
  description?: string;
  unit: string;
  kpiType: string;
  category?: string;
  calculationFormula?: string;
  dataSource?: string;
  buCode?: string;
  status?: string;
  createdBy?: number;
}) {
  const db = await requireDb();

  // Auto-generate code: KPI-{TYPE_PREFIX}-{NNN}
  const typePrefix = data.kpiType.substring(0, 3).toUpperCase();
  const prefix = `KPI-${typePrefix}-`;

  const maxCodeResult = await db
    .select({ maxCode: sql<string>`MAX(code)` })
    .from(hrmKpiLibrary)
    .where(ilike(hrmKpiLibrary.code, `${prefix}%`));

  let nextNumber = 1;
  const maxCode = maxCodeResult[0]?.maxCode;
  if (maxCode) {
    const match = maxCode.match(/KPI-[A-Z]+-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  const code = `${prefix}${String(nextNumber).padStart(3, "0")}`;

  const result = await db
    .insert(hrmKpiLibrary)
    .values({ ...data, code })
    .returning();
  return result[0];
}

export async function updateKpiLibraryItem(
  id: number,
  data: {
    name?: string;
    description?: string;
    unit?: string;
    kpiType?: string;
    category?: string;
    calculationFormula?: string;
    dataSource?: string;
    buCode?: string;
    status?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmKpiLibrary)
    .set(updateData)
    .where(eq(hrmKpiLibrary.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteKpiLibraryItem(id: number) {
  const db = await requireDb();

  // Cascade: delete related targets first
  await db
    .delete(hrmPositionKpiTargets)
    .where(eq(hrmPositionKpiTargets.kpiId, id));

  const result = await db
    .delete(hrmKpiLibrary)
    .where(eq(hrmKpiLibrary.id, id))
    .returning();

  return result[0] ?? null;
}

// ============================================================
// hrmPositionKpiTargets — Position KPI Targets
// ============================================================

export async function listPositionKpiTargets(params: {
  positionId?: number;
  kpiId?: number;
  year?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { positionId, kpiId, year, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (positionId) conditions.push(eq(hrmPositionKpiTargets.positionId, positionId));
  if (kpiId) conditions.push(eq(hrmPositionKpiTargets.kpiId, kpiId));
  if (year) conditions.push(eq(hrmPositionKpiTargets.year, year));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmPositionKpiTargets)
    .where(where)
    .orderBy(desc(hrmPositionKpiTargets.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmPositionKpiTargets)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getPositionKpiTargetById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmPositionKpiTargets)
    .where(eq(hrmPositionKpiTargets.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createPositionKpiTarget(data: {
  positionId: number;
  kpiId: number;
  year: number;
  targetValue: string;
  challengeValue?: string;
  minimumValue?: string;
  weight: string;
  scoringMethod?: string;
  notes?: string;
  status?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(hrmPositionKpiTargets).values(data).returning();
  return result[0];
}

export async function updatePositionKpiTarget(
  id: number,
  data: {
    positionId?: number;
    kpiId?: number;
    year?: number;
    targetValue?: string;
    challengeValue?: string;
    minimumValue?: string;
    weight?: string;
    scoringMethod?: string;
    notes?: string;
    status?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmPositionKpiTargets)
    .set(updateData)
    .where(eq(hrmPositionKpiTargets.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deletePositionKpiTarget(id: number) {
  const db = await requireDb();
  const result = await db
    .delete(hrmPositionKpiTargets)
    .where(eq(hrmPositionKpiTargets.id, id))
    .returning();
  return result[0] ?? null;
}

// ============================================================
// hrmUserSkillMatrix — User Skill Matrix
// ============================================================

export async function listUserSkills(params: {
  userId?: number;
  employeeId?: number;
  skillCategory?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { userId, employeeId, skillCategory, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(hrmUserSkillMatrix.userId, userId));
  if (employeeId) conditions.push(eq(hrmUserSkillMatrix.employeeId, employeeId));
  if (skillCategory) conditions.push(eq(hrmUserSkillMatrix.skillCategory, skillCategory));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmUserSkillMatrix)
    .where(where)
    .orderBy(desc(hrmUserSkillMatrix.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmUserSkillMatrix)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getUserSkillById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmUserSkillMatrix)
    .where(eq(hrmUserSkillMatrix.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createUserSkill(data: {
  userId: number;
  employeeId?: number;
  skillName: string;
  skillCategory?: string;
  currentLevel: number;
  targetLevel: number;
  assessmentDate?: string;
  assessedBy?: number;
  historyJson?: any;
  notes?: string;
}) {
  const db = await requireDb();
  const result = await db.insert(hrmUserSkillMatrix).values(data).returning();
  return result[0];
}

export async function updateUserSkill(
  id: number,
  data: {
    skillName?: string;
    skillCategory?: string;
    currentLevel?: number;
    targetLevel?: number;
    assessmentDate?: string;
    assessedBy?: number;
    historyJson?: any;
    notes?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmUserSkillMatrix)
    .set(updateData)
    .where(eq(hrmUserSkillMatrix.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteUserSkill(id: number) {
  const db = await requireDb();
  const result = await db
    .delete(hrmUserSkillMatrix)
    .where(eq(hrmUserSkillMatrix.id, id))
    .returning();
  return result[0] ?? null;
}

// ============================================================
// hrmMonthlyPerformanceReviews — Monthly Reviews
// ============================================================

export async function listMonthlyReviews(params: {
  userId?: number;
  employeeId?: number;
  monthDate?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { userId, employeeId, monthDate, status, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(hrmMonthlyPerformanceReviews.userId, userId));
  if (employeeId) conditions.push(eq(hrmMonthlyPerformanceReviews.employeeId, employeeId));
  if (monthDate) conditions.push(eq(hrmMonthlyPerformanceReviews.monthDate, monthDate));
  if (status) conditions.push(eq(hrmMonthlyPerformanceReviews.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmMonthlyPerformanceReviews)
    .where(where)
    .orderBy(desc(hrmMonthlyPerformanceReviews.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmMonthlyPerformanceReviews)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getMonthlyReviewById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmMonthlyPerformanceReviews)
    .where(eq(hrmMonthlyPerformanceReviews.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createMonthlyReview(data: {
  userId: number;
  employeeId?: number;
  positionId?: number;
  monthDate: string;
  overallKpiScore?: string;
  bonusCoefficient?: string;
  kpiDetailsJson?: any;
  gapsText?: string;
  improvementPlanText?: string;
  reviewerComments?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  status?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(hrmMonthlyPerformanceReviews).values(data).returning();
  return result[0];
}

export async function updateMonthlyReview(
  id: number,
  data: {
    positionId?: number;
    monthDate?: string;
    overallKpiScore?: string;
    bonusCoefficient?: string;
    kpiDetailsJson?: any;
    gapsText?: string;
    improvementPlanText?: string;
    reviewerComments?: string;
    reviewedBy?: number;
    reviewedAt?: string;
    status?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmMonthlyPerformanceReviews)
    .set(updateData)
    .where(eq(hrmMonthlyPerformanceReviews.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteMonthlyReview(id: number) {
  const db = await requireDb();
  const result = await db
    .delete(hrmMonthlyPerformanceReviews)
    .where(eq(hrmMonthlyPerformanceReviews.id, id))
    .returning();
  return result[0] ?? null;
}

// ============================================================
// hrmMilitaryOrders — Military Orders (军令状)
// ============================================================

export async function listMilitaryOrders(params: {
  userId?: number;
  year?: number;
  signatureStatus?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { userId, year, signatureStatus, status, limit = 20, offset = 0 } = params;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(hrmMilitaryOrders.userId, userId));
  if (year) conditions.push(eq(hrmMilitaryOrders.year, year));
  if (signatureStatus) conditions.push(eq(hrmMilitaryOrders.signatureStatus, signatureStatus));
  if (status) conditions.push(eq(hrmMilitaryOrders.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(hrmMilitaryOrders)
    .where(where)
    .orderBy(desc(hrmMilitaryOrders.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hrmMilitaryOrders)
    .where(where);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getMilitaryOrderById(id: number) {
  const db = await requireDb();
  const results = await db
    .select()
    .from(hrmMilitaryOrders)
    .where(eq(hrmMilitaryOrders.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createMilitaryOrder(data: {
  userId: number;
  employeeId?: number;
  year: number;
  positionId?: number;
  commitmentText: string;
  targetSummaryJson?: any;
  rewardText?: string;
  consequenceText?: string;
  signatureStatus?: string;
  documentUrl?: string;
  status?: string;
  notes?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(hrmMilitaryOrders).values(data).returning();
  return result[0];
}

export async function updateMilitaryOrder(
  id: number,
  data: {
    positionId?: number;
    commitmentText?: string;
    targetSummaryJson?: any;
    rewardText?: string;
    consequenceText?: string;
    documentUrl?: string;
    status?: string;
    notes?: string;
  }
) {
  const db = await requireDb();
  const updateData: any = { ...data, updatedAt: sql`now()` };
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const result = await db
    .update(hrmMilitaryOrders)
    .set(updateData)
    .where(eq(hrmMilitaryOrders.id, id))
    .returning();

  return result[0] ?? null;
}

export async function signMilitaryOrder(id: number) {
  const db = await requireDb();
  const result = await db
    .update(hrmMilitaryOrders)
    .set({
      signatureStatus: "signed",
      signedAt: sql`now()`.mapWith(String),
      updatedAt: sql`now()`,
    } as any)
    .where(eq(hrmMilitaryOrders.id, id))
    .returning();

  return result[0] ?? null;
}

export async function witnessMilitaryOrder(id: number, witnessedBy: number) {
  const db = await requireDb();
  const result = await db
    .update(hrmMilitaryOrders)
    .set({
      witnessedBy,
      witnessedAt: sql`now()`.mapWith(String),
      updatedAt: sql`now()`,
    } as any)
    .where(eq(hrmMilitaryOrders.id, id))
    .returning();

  return result[0] ?? null;
}

export async function deleteMilitaryOrder(id: number) {
  const db = await requireDb();
  const result = await db
    .delete(hrmMilitaryOrders)
    .where(eq(hrmMilitaryOrders.id, id))
    .returning();
  return result[0] ?? null;
}

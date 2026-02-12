/**
 * 事业部管理系统 - 数据库查询函数
 * Business Unit Management System - Database Query Functions
 */

import { getDb } from "../db";
import {
  businessUnits,
  buPerformance,
  buKpis,
  buPerformanceHistory,
  projectScores,
  projectMemberScores,
  buEmployees,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

/**
 * 事业部查询
 */

export async function getAllBusinessUnits() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.select().from(businessUnits).orderBy(asc(businessUnits.code));
}

export async function getBusinessUnitById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.select().from(businessUnits).where(eq(businessUnits.id, id)).limit(1);
}

export async function getBusinessUnitByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.select().from(businessUnits).where(eq(businessUnits.code, code)).limit(1);
}

export async function createBusinessUnit(data: {
  code: string;
  name: string;
  description?: string;
  managerId?: number;
  parentBuId?: number;
  fiscalYear?: number;
  status?: "active" | "inactive" | "planning";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(businessUnits).values(data).returning();
}

export async function updateBusinessUnit(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    managerId: number;
    parentBuId: number;
    fiscalYear: number;
    status: "active" | "inactive" | "planning";
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(businessUnits).set(data).where(eq(businessUnits.id, id)).returning();
}

export async function deleteBusinessUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.delete(businessUnits).where(eq(businessUnits.id, id));
}

/**
 * 绩效数据查询
 */

export async function getPerformanceByBuAndYear(buId: number, fiscalYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buPerformance)
    .where(and(eq(buPerformance.buId, buId), eq(buPerformance.fiscalYear, fiscalYear)));
}

export async function getPerformanceByBuAndQuarter(
  buId: number,
  fiscalYear: number,
  fiscalQuarter: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buPerformance)
    .where(
      and(
        eq(buPerformance.buId, buId),
        eq(buPerformance.fiscalYear, fiscalYear),
        eq(buPerformance.fiscalQuarter, fiscalQuarter)
      )
    )
    .limit(1);
}

export async function createPerformance(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(buPerformance).values(data).returning();
}

export async function updatePerformance(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(buPerformance).set(data).where(eq(buPerformance.id, id)).returning();
}

/**
 * KPI查询
 */

export async function getKpisByBu(buId: number, fiscalYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buKpis)
    .where(and(eq(buKpis.buId, buId), eq(buKpis.fiscalYear, fiscalYear)))
    .orderBy(asc(buKpis.dimension));
}

export async function getKpiByCode(kpiCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.select().from(buKpis).where(eq(buKpis.kpiCode, kpiCode)).limit(1);
}

export async function createKpi(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(buKpis).values(data).returning();
}

export async function updateKpi(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(buKpis).set(data).where(eq(buKpis.id, id)).returning();
}

/**
 * 绩效历史查询
 */

export async function getPerformanceHistory(
  buId: number,
  fiscalYear: number,
  fiscalQuarter?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const conditions = [
    eq(buPerformanceHistory.buId, buId),
    eq(buPerformanceHistory.fiscalYear, fiscalYear),
  ];

  if (fiscalQuarter) {
    conditions.push(eq(buPerformanceHistory.fiscalQuarter, fiscalQuarter));
  }

  return db
    .select()
    .from(buPerformanceHistory)
    .where(and(...conditions))
    .orderBy(desc(buPerformanceHistory.changeTimestamp));
}

export async function createPerformanceHistory(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(buPerformanceHistory).values(data).returning();
}

/**
 * 项目评分查询
 */

export async function getProjectScoresByBu(buId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(projectScores)
    .where(eq(projectScores.buId, buId))
    .orderBy(desc(projectScores.evaluationDate));
}

export async function getProjectScoresByProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(projectScores)
    .where(eq(projectScores.projectId, projectId))
    .limit(1);
}

export async function createProjectScore(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(projectScores).values(data).returning();
}

export async function updateProjectScore(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(projectScores).set(data).where(eq(projectScores.id, id)).returning();
}

/**
 * 项目成员评分查询
 */

export async function getMemberScoresByProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(projectMemberScores)
    .where(eq(projectMemberScores.projectId, projectId))
    .orderBy(desc(projectMemberScores.evaluationDate));
}

export async function getMemberScoresByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(projectMemberScores)
    .where(eq(projectMemberScores.employeeId, employeeId))
    .orderBy(desc(projectMemberScores.evaluationDate));
}

export async function createMemberScore(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(projectMemberScores).values(data).returning();
}

export async function updateMemberScore(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(projectMemberScores).set(data).where(eq(projectMemberScores.id, id)).returning();
}

/**
 * 事业部员工查询
 */

export async function getBuEmployees(buId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buEmployees)
    .where(eq(buEmployees.buId, buId))
    .orderBy(asc(buEmployees.joinDate));
}

export async function getEmployeeBus(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buEmployees)
    .where(eq(buEmployees.employeeId, employeeId))
    .orderBy(asc(buEmployees.joinDate));
}

export async function addEmployeeToBu(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.insert(buEmployees).values(data).returning();
}

export async function updateBuEmployee(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.update(buEmployees).set(data).where(eq(buEmployees.id, id)).returning();
}

export async function removeBuEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.delete(buEmployees).where(eq(buEmployees.id, id));
}

/**
 * 统计和聚合查询
 */

export async function getBuStatistics(buId: number, fiscalYear: number) {
  const performance = await getPerformanceByBuAndYear(buId, fiscalYear);
  const kpis = await getKpisByBu(buId, fiscalYear);
  const employees = await getBuEmployees(buId);
  const projectScoresList = await getProjectScoresByBu(buId);

  return {
    performance: performance[0] || null,
    kpis,
    employeeCount: employees.length,
    projectCount: projectScoresList.length,
    averageProjectScore:
      projectScoresList.length > 0
        ? projectScoresList.reduce((sum, p) => sum + (Number(p.overallScore) || 0), 0) /
          projectScoresList.length
        : 0,
  };
}

export async function getPerformanceTrend(buId: number, startYear: number, endYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db
    .select()
    .from(buPerformance)
    .where(
      and(
        eq(buPerformance.buId, buId),
        gte(buPerformance.fiscalYear, startYear),
        lte(buPerformance.fiscalYear, endYear)
      )
    )
    .orderBy(asc(buPerformance.fiscalYear), asc(buPerformance.fiscalQuarter));
}

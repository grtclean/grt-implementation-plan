/**
 * 绩效薪资自助查询服务
 * 员工查看自身绩效指标与薪资明细
 */

import { requireDb } from '../utils/db-helpers';
import { hrmEmployees, hrmPerformanceGrades, salaryCalculations } from '../../drizzle/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

/** 获取当前员工基本信息 */
export async function getMyProfile(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: hrmEmployees.id,
      employeeCode: hrmEmployees.employeeCode,
      name: hrmEmployees.name,
      department: hrmEmployees.department,
      position: hrmEmployees.position,
      level: hrmEmployees.level,
      managerId: hrmEmployees.managerId,
      hireDate: hrmEmployees.hireDate,
      status: hrmEmployees.status,
    })
    .from(hrmEmployees)
    .where(eq(hrmEmployees.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/** 获取所有绩效等级定义 */
export async function getPerformanceGrades() {
  const db = await requireDb();
  return db
    .select({
      gradeCode: hrmPerformanceGrades.gradeCode,
      gradeName: hrmPerformanceGrades.gradeName,
      scoreMin: hrmPerformanceGrades.scoreMin,
      scoreMax: hrmPerformanceGrades.scoreMax,
      coefficient: hrmPerformanceGrades.coefficient,
      description: hrmPerformanceGrades.description,
    })
    .from(hrmPerformanceGrades)
    .orderBy(asc(hrmPerformanceGrades.scoreMin));
}

/** 获取自己的薪资记录（最近12条） */
export async function getMySalaryRecords(userId: number) {
  const db = await requireDb();

  // 先找到 employeeId
  const emp = await db
    .select({ id: hrmEmployees.id })
    .from(hrmEmployees)
    .where(eq(hrmEmployees.userId, userId))
    .limit(1);

  if (emp.length === 0) return [];

  return db
    .select({
      id: salaryCalculations.id,
      calculationCode: salaryCalculations.calculationCode,
      department: salaryCalculations.department,
      positionGrade: salaryCalculations.positionGrade,
      calculationType: salaryCalculations.calculationType,
      baseSalary: salaryCalculations.baseSalary,
      performanceSalary: salaryCalculations.performanceSalary,
      bonus: salaryCalculations.bonus,
      benefits: salaryCalculations.benefits,
      monthlyTotal: salaryCalculations.monthlyTotal,
      annualTotal: salaryCalculations.annualTotal,
      salaryBreakdown: salaryCalculations.salaryBreakdown,
      marketComparison: salaryCalculations.marketComparison,
      remarks: salaryCalculations.remarks,
      createdAt: salaryCalculations.createdAt,
    })
    .from(salaryCalculations)
    .where(eq(salaryCalculations.employeeId, emp[0].id))
    .orderBy(desc(salaryCalculations.createdAt))
    .limit(12);
}

/** 获取单条薪资记录详情（含userId安全校验） */
export async function getMySalaryDetail(userId: number, calculationId: number) {
  const db = await requireDb();

  const emp = await db
    .select({ id: hrmEmployees.id })
    .from(hrmEmployees)
    .where(eq(hrmEmployees.userId, userId))
    .limit(1);

  if (emp.length === 0) return null;

  const rows = await db
    .select()
    .from(salaryCalculations)
    .where(
      and(
        eq(salaryCalculations.id, calculationId),
        eq(salaryCalculations.employeeId, emp[0].id),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** 获取绩效趋势（薪资历史摘要） */
export async function getPerformanceTrend(userId: number, periods?: number) {
  const db = await requireDb();

  const emp = await db
    .select({ id: hrmEmployees.id })
    .from(hrmEmployees)
    .where(eq(hrmEmployees.userId, userId))
    .limit(1);

  if (emp.length === 0) return [];

  return db
    .select({
      calculationType: salaryCalculations.calculationType,
      baseSalary: salaryCalculations.baseSalary,
      performanceSalary: salaryCalculations.performanceSalary,
      bonus: salaryCalculations.bonus,
      monthlyTotal: salaryCalculations.monthlyTotal,
      annualTotal: salaryCalculations.annualTotal,
      positionGrade: salaryCalculations.positionGrade,
      createdAt: salaryCalculations.createdAt,
    })
    .from(salaryCalculations)
    .where(eq(salaryCalculations.employeeId, emp[0].id))
    .orderBy(desc(salaryCalculations.createdAt))
    .limit(periods ?? 12);
}

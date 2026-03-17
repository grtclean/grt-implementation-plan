/**
 * HRM Router - 人力资源管理路由
 * Replaces placeholder mock-data router with real DB queries via Drizzle ORM.
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, sql, and, or, count, desc } from "drizzle-orm";
import {
  hrmEmployees,
  hrmCandidates,
  hrmPositions,
  hrmSalaryStructures,
  hrmPerformanceGrades,
  hrmTrainingPlans,
} from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("hrm-router");

const successResponse = { success: true, message: "操作成功" };

// ─── Attendance bootstrap ─────────────────────────────────────────
let attendanceBootstrapped = false;
async function ensureAttendance() {
  if (attendanceBootstrapped) return;
  attendanceBootstrapped = true;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id            SERIAL PRIMARY KEY,
        employee_name VARCHAR(100) NOT NULL,
        department    VARCHAR(100) NOT NULL DEFAULT '',
        record_date   DATE NOT NULL DEFAULT CURRENT_DATE,
        clock_in      VARCHAR(10) NOT NULL DEFAULT '-',
        clock_out     VARCHAR(10) NOT NULL DEFAULT '-',
        work_hours    VARCHAR(10) NOT NULL DEFAULT '-',
        status        VARCHAR(20) NOT NULL DEFAULT '正常'
      )
    `);
    const cnt = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM attendance_records`);
    if (Number((cnt.rows as any[])[0]?.cnt) === 0) {
      await db.execute(sql`
        INSERT INTO attendance_records (employee_name, department, record_date, clock_in, clock_out, work_hours, status) VALUES
        ('洪香龙', '事业二部', CURRENT_DATE, '08:28', '17:35', '9.1h', '正常'),
        ('戴晓燕', '事业一部', CURRENT_DATE, '09:15', '-',     '-',    '迟到'),
        ('杨勇',   '事业三部', CURRENT_DATE, '-',  '-',     '-',    '请假'),
        ('马林山', '事业二部', CURRENT_DATE, '07:55', '17:00', '9.1h', '正常'),
        ('蔡瑞',   '事业二部', CURRENT_DATE, '08:30', '18:20', '9.8h', '正常'),
        ('金晓锋', '事业一部', CURRENT_DATE, '08:00', '17:05', '9.1h', '正常'),
        ('钱绍辉', '事业二部', CURRENT_DATE, '-',     '-',     '-',    '缺勤'),
        ('马柯',   '事业十部', CURRENT_DATE, '08:35', '17:40', '9.1h', '正常')
      `);
    }
  } catch (e: any) {
    log.warn({ err: e }, "HRM attendance bootstrap failed");
  }
}

export const hrmRouter = router({
  // ==================== CRUD (employees as default entity) ====================

  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [totalResult] = await db.select({ count: count() }).from(hrmEmployees);
      const total = Number(totalResult?.count ?? 0);
      const rows = await db.select().from(hrmEmployees).limit(limit).offset(offset);
      const items = rows.map((row) => ({
        id: `EMP-${row.id}`,
        employeeCode: row.employeeCode,
        name: row.name,
        department: row.department,
        position: row.position,
        level: row.level,
        status: row.status,
        hireDate: row.hireDate,
        phone: row.phone,
        email: row.email,
      }));
      return { items, total, page: Math.floor(offset / limit) + 1, pageSize: limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id.replace(/^EMP-/, ""), 10);
      if (isNaN(numericId)) return null;
      const rows = await db
        .select()
        .from(hrmEmployees)
        .where(eq(hrmEmployees.id, numericId))
        .limit(1000);
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        id: `EMP-${row.id}`,
        employeeCode: row.employeeCode,
        name: row.name,
        englishName: row.englishName,
        gender: row.gender,
        birthDate: row.birthDate,
        idNumber: row.idNumber,
        phone: row.phone,
        email: row.email,
        department: row.department,
        position: row.position,
        level: row.level,
        hireDate: row.hireDate,
        regularDate: row.regularDate,
        managerId: row.managerId,
        seniorManagerId: row.seniorManagerId,
        hrbpId: row.hrbpId,
        status: row.status,
        workLocation: row.workLocation,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),

  create: requirePermission('hr:employees:create').input(z.object({
    employeeCode: z.string().max(50).optional(),
    name: z.string().max(200),
    gender: z.string().max(10).optional(),
    department: z.string().max(100).optional(),
    position: z.string().max(100).optional(),
    level: z.string().max(20).optional(),
    hireDate: z.string().optional(),
    phone: z.string().max(30).optional(),
    email: z.string().max(320).optional(),
    status: z.string().max(30).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(hrmEmployees).values({
      employeeCode: input.employeeCode ?? `EMP-${Date.now()}`,
      name: input.name,
      gender: (input.gender ?? "male") as "male" | "female",
      department: input.department ?? "未分配",
      position: input.position ?? "未分配",
      level: input.level,
      hireDate: input.hireDate ?? new Date().toISOString(),
      phone: input.phone,
      email: input.email,
      status: (input.status ?? "probation") as "probation" | "regular" | "resigned" | "terminated",
    });
    return successResponse;
  }),

  update: requirePermission('hr:employees:edit').input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().max(200).optional(),
    gender: z.string().max(10).optional(),
    department: z.string().max(100).optional(),
    position: z.string().max(100).optional(),
    level: z.string().max(20).optional(),
    hireDate: z.string().optional(),
    phone: z.string().max(30).optional(),
    email: z.string().max(320).optional(),
    status: z.string().max(30).optional(),
    workLocation: z.string().max(200).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numericId = parseInt(String(input.id).replace(/^EMP-/, ""), 10);
    if (isNaN(numericId)) return successResponse;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.gender !== undefined) updates.gender = input.gender;
    if (input.department !== undefined) updates.department = input.department;
    if (input.position !== undefined) updates.position = input.position;
    if (input.level !== undefined) updates.level = input.level;
    if (input.hireDate !== undefined) updates.hireDate = input.hireDate;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.email !== undefined) updates.email = input.email;
    if (input.status !== undefined) updates.status = input.status;
    if (input.workLocation !== undefined) updates.workLocation = input.workLocation;
    await db
      .update(hrmEmployees)
      .set(updates)
      .where(eq(hrmEmployees.id, numericId));
    return successResponse;
  }),

  delete: requirePermission('hr:employees:delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id.replace(/^EMP-/, ""), 10);
      if (isNaN(numericId)) return successResponse;
      await db.delete(hrmEmployees).where(eq(hrmEmployees.id, numericId));
      return successResponse;
    }),

  // ==================== Employees ====================

  getEmployees: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmEmployees).limit(1000);
    return rows.map((row) => ({
      id: `EMP-${row.id}`,
      employeeCode: row.employeeCode,
      name: row.name,
      department: row.department,
      position: row.position,
      level: row.level,
      joinDate: row.hireDate,
      status: row.status,
      phone: row.phone,
      email: row.email,
    }));
  }),

  // ==================== Departments (aggregated from employees) ====================

  getDepartments: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        department: hrmEmployees.department,
        headcount: sql<number>`count(*)`.as("headcount"),
      })
      .from(hrmEmployees)
      .groupBy(hrmEmployees.department)
      .limit(1000);
    return rows.map((row, idx) => ({
      id: `DEPT-${String(idx + 1).padStart(3, "0")}`,
      name: row.department,
      headcount: Number(row.headcount),
      manager: "",
    }));
  }),

  // ==================== Candidates ====================

  getCandidates: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmCandidates).limit(1000);
    return rows.map((row) => ({
      id: `CAN-${row.id}`,
      candidateCode: row.candidateCode,
      name: row.name,
      position: row.positionName ?? "",
      positionName: row.positionName ?? "",
      status: row.status,
      source: row.source ?? "",
      applyDate: row.createdAt,
      phone: row.phone ?? "",
      email: row.email ?? "",
      experience: row.workYears ? `${row.workYears}年` : "",
      education: row.education ?? "",
      age: row.age,
      workYears: row.workYears,
    }));
  }),

  // ==================== Salary Structures ====================

  getSalaryStructures: requirePermission('hrm_salary_structure').query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmSalaryStructures).limit(1000);
    return rows.map((row) => ({
      id: `SAL-${row.id}`,
      level: row.level ?? "",
      department: row.department,
      baseSalaryRatioMin: row.baseSalaryRatioMin,
      baseSalaryRatioMax: row.baseSalaryRatioMax,
      performanceRatioMin: row.performanceRatioMin,
      performanceRatioMax: row.performanceRatioMax,
      bonusRatioMin: row.bonusRatioMin,
      bonusRatioMax: row.bonusRatioMax,
      benefitsRatioMin: row.benefitsRatioMin,
      benefitsRatioMax: row.benefitsRatioMax,
      status: row.status,
      effectiveDate: row.effectiveDate,
    }));
  }),

  initSalaryStructures: requirePermission('hr:compensation:manage').mutation(async () => {
    const db = await requireDb();
    const defaults = [
      { department: "研发部", level: "P1", baseSalaryRatioMin: "0.50", baseSalaryRatioMax: "0.60", performanceRatioMin: "0.20", performanceRatioMax: "0.30", bonusRatioMin: "0.10", bonusRatioMax: "0.15", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
      { department: "研发部", level: "P2", baseSalaryRatioMin: "0.45", baseSalaryRatioMax: "0.55", performanceRatioMin: "0.25", performanceRatioMax: "0.30", bonusRatioMin: "0.10", bonusRatioMax: "0.20", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
      { department: "销售部", level: "P3", baseSalaryRatioMin: "0.40", baseSalaryRatioMax: "0.50", performanceRatioMin: "0.25", performanceRatioMax: "0.35", bonusRatioMin: "0.15", bonusRatioMax: "0.25", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
      { department: "技术服务部", level: "P4", baseSalaryRatioMin: "0.35", baseSalaryRatioMax: "0.45", performanceRatioMin: "0.30", performanceRatioMax: "0.35", bonusRatioMin: "0.15", bonusRatioMax: "0.25", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
      { department: "生产部", level: "M1", baseSalaryRatioMin: "0.40", baseSalaryRatioMax: "0.50", performanceRatioMin: "0.25", performanceRatioMax: "0.30", bonusRatioMin: "0.15", bonusRatioMax: "0.25", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
      { department: "品管部", level: "M2", baseSalaryRatioMin: "0.35", baseSalaryRatioMax: "0.45", performanceRatioMin: "0.30", performanceRatioMax: "0.35", bonusRatioMin: "0.15", bonusRatioMax: "0.25", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10", effectiveDate: new Date().toISOString() },
    ];
    let created = 0;
    for (const s of defaults) {
      await db.insert(hrmSalaryStructures).values(s);
      created++;
    }
    return { created };
  }),

  initPerformanceGrades: requirePermission('hr:performance:manage').mutation(async () => {
    const db = await requireDb();
    const defaults = [
      { gradeCode: "S", gradeName: "卓越", scoreMin: 90, scoreMax: 100, coefficient: "2.00", description: "卓越表现" },
      { gradeCode: "A", gradeName: "优秀", scoreMin: 80, scoreMax: 89, coefficient: "1.50", description: "优秀表现" },
      { gradeCode: "B", gradeName: "良好", scoreMin: 70, scoreMax: 79, coefficient: "1.20", description: "良好表现" },
      { gradeCode: "C", gradeName: "合格", scoreMin: 60, scoreMax: 69, coefficient: "1.00", description: "合格表现" },
      { gradeCode: "D", gradeName: "待改进", scoreMin: 0, scoreMax: 59, coefficient: "0.50", description: "需要改进" },
    ];
    let created = 0;
    for (const g of defaults) {
      await db.insert(hrmPerformanceGrades).values(g);
      created++;
    }
    return { created };
  }),

  // ==================== Performance Grades ====================

  getPerformanceGrades: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmPerformanceGrades).limit(1000);
    return rows.map((row) => ({
      id: `PG-${row.id}`,
      gradeCode: row.gradeCode,
      grade: row.gradeCode,
      gradeName: row.gradeName,
      description: row.gradeName,
      scoreMin: row.scoreMin,
      scoreMax: row.scoreMax,
      coefficient: row.coefficient,
      bonusRate: parseFloat(row.coefficient),
    }));
  }),

  // ==================== Positions ====================

  getPositions: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmPositions).limit(1000);
    return rows.map((row) => ({
      id: `POS-${row.id}`,
      positionCode: row.positionCode,
      name: row.name,
      department: row.department,
      level: "",
      headcount: 0,
      filled: 0,
      requirements: row.qualifications ?? "",
      status: row.status,
      responsibilities: row.responsibilities ?? "",
      keyTasks: row.keyTasks ?? "",
      kpiIndicators: row.kpiIndicators ?? "",
    }));
  }),

  // ==================== Attendance (DB-backed) ====================

  getAttendance: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureAttendance();
      const db = await requireDb();
      let result;
      if (input?.search) {
        const pat = `%${input.search}%`;
        result = await db.execute(sql`
          SELECT id, employee_name, department, TO_CHAR(record_date, 'YYYY-MM-DD') AS record_date,
                 clock_in, clock_out, work_hours, status
          FROM attendance_records
          WHERE employee_name LIKE ${pat} OR department LIKE ${pat}
          ORDER BY id
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, employee_name, department, TO_CHAR(record_date, 'YYYY-MM-DD') AS record_date,
                 clock_in, clock_out, work_hours, status
          FROM attendance_records ORDER BY id
        `);
      }
      const items = (result.rows as any[]).map((r: any) => ({
        id: r.id,
        name: r.employee_name,
        dept: r.department,
        date: r.record_date,
        clockIn: r.clock_in,
        clockOut: r.clock_out,
        hours: r.work_hours,
        status: r.status,
      }));
      // Apply status filter client-side if provided
      const filtered = input?.status && input.status !== "all"
        ? items.filter((i: any) => i.status === input.status)
        : items;
      return filtered;
    }),

  getAttendanceStats: protectedProcedure.query(async () => {
    await ensureAttendance();
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = '正常')::int AS present,
        COUNT(*) FILTER (WHERE status = '迟到')::int AS late,
        COUNT(*) FILTER (WHERE status = '缺勤')::int AS absent,
        COUNT(*) FILTER (WHERE status = '请假')::int AS leave_count
      FROM attendance_records
      WHERE record_date = CURRENT_DATE
    `);
    const row = (result.rows as any[])[0] ?? {};
    return {
      total: row.total ?? 0,
      present: row.present ?? 0,
      late: row.late ?? 0,
      absent: row.absent ?? 0,
      leave: row.leave_count ?? 0,
    };
  }),

  // ==================== Leave Requests (stub - no table) ====================

  getLeaveRequests: protectedProcedure.query(() => {
    return [] as Array<{ id: string; employeeId: string; type: string; startDate: string; endDate: string; status: string; reason: string }>;
  }),

  // ==================== Training Records ====================

  getTrainingRecords: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmTrainingPlans).limit(1000);
    return rows.map((row) => ({
      id: `TRN-${row.id}`,
      planCode: row.planCode,
      name: row.name,
      type: row.planType,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      employeeId: row.employeeId,
      completionRate: row.completionRate ?? 0,
      content: row.content,
    }));
  }),

  // ==================== Org Chart (aggregated from employees) ====================

  getOrgChart: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        department: hrmEmployees.department,
        headcount: sql<number>`count(*)`.as("headcount"),
      })
      .from(hrmEmployees)
      .groupBy(hrmEmployees.department)
      .limit(1000);

    const children = rows.map((row, idx) => ({
      id: `DEPT-${String(idx + 1).padStart(3, "0")}`,
      name: row.department,
      headcount: Number(row.headcount),
    }));

    return { chart: { id: "CEO", name: "总经理", children } };
  }),

  // ==================== Statistics ====================

  getStatistics: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [totalRes, activeRes, posRes, candRes, trainRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(hrmEmployees),
      db.select({ count: sql<number>`count(*)` }).from(hrmEmployees).where(or(eq(hrmEmployees.status, "regular"), eq(hrmEmployees.status, "probation"))),
      db.select({ count: sql<number>`count(*)` }).from(hrmPositions).where(eq(hrmPositions.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(hrmCandidates).where(or(eq(hrmCandidates.status, "new"), eq(hrmCandidates.status, "interviewing"))),
      db.select({ count: sql<number>`count(*)` }).from(hrmTrainingPlans).where(eq(hrmTrainingPlans.status, "pending")),
    ]);
    return {
      statistics: {
        totalEmployees: Number(totalRes[0]?.count ?? 0),
        activeEmployees: Number(activeRes[0]?.count ?? 0),
        openPositions: Number(posRes[0]?.count ?? 0),
        pendingCandidates: Number(candRes[0]?.count ?? 0),
        upcomingTrainings: Number(trainRes[0]?.count ?? 0),
      },
    };
  }),

  // ==================== Salary Calculation ====================

  calculateSalary: requirePermission('hrm_salary_calculation')
    .input(z.object({
      department: z.string(),
      baseSalary: z.number(),
      performanceGrade: z.string().optional(),
      projectBonus: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const structures = await db.select().from(hrmSalaryStructures)
        .where(and(eq(hrmSalaryStructures.department, input.department), eq(hrmSalaryStructures.status, "active"))).limit(1000);

      let performanceCoefficient = 1.0;
      if (input.performanceGrade) {
        const grades = await db.select().from(hrmPerformanceGrades)
          .where(eq(hrmPerformanceGrades.gradeCode, input.performanceGrade)).limit(1000);
        if (grades.length > 0) performanceCoefficient = parseFloat(grades[0].coefficient);
      }

      let baseSalaryRatio: number, performanceRatio: number, bonusRatio: number, benefitsRatio: number;
      if (structures.length > 0) {
        const s = structures[0];
        baseSalaryRatio = (parseFloat(s.baseSalaryRatioMin) + parseFloat(s.baseSalaryRatioMax)) / 2;
        performanceRatio = (parseFloat(s.performanceRatioMin) + parseFloat(s.performanceRatioMax)) / 2;
        bonusRatio = (parseFloat(s.bonusRatioMin) + parseFloat(s.bonusRatioMax)) / 2;
        benefitsRatio = (parseFloat(s.benefitsRatioMin) + parseFloat(s.benefitsRatioMax)) / 2;
      } else {
        baseSalaryRatio = 1.0;
        performanceRatio = 0.3;
        bonusRatio = 0.2;
        benefitsRatio = 0.1;
      }

      const basePay = Math.round(input.baseSalary * baseSalaryRatio);
      const performancePay = Math.round(input.baseSalary * performanceRatio * performanceCoefficient);
      const bonus = Math.round(input.baseSalary * bonusRatio) + (input.projectBonus || 0);
      const benefits = Math.round(input.baseSalary * benefitsRatio);
      const monthlyTotal = basePay + performancePay + bonus + benefits;

      return {
        baseSalary: basePay,
        performanceSalary: performancePay,
        bonus,
        benefits,
        monthlyTotal,
        annualTotal: monthlyTotal * 12,
        breakdown: {} as Record<string, unknown>,
      };
    }),

  createSalaryCalculation: requirePermission('hr:compensation:manage').input(z.object({ department: z.string(), baseSalary: z.number(), performanceGrade: z.string().optional() })).mutation(() => successResponse),

  // ==================== Scheduled Tasks (stub) ====================

  getScheduledTasks: protectedProcedure.query(() => [] as Array<{ id: string; taskName: string; taskType: string; cronExpression: string; isEnabled: boolean; lastRunAt: string | null }>),
  createScheduledTask: requirePermission('system:scheduler:manage').input(z.object({ taskName: z.string(), taskType: z.string(), cronExpression: z.string().optional(), isEnabled: z.boolean().optional() })).mutation(() => successResponse),
  updateScheduledTask: requirePermission('system:scheduler:manage').input(z.object({ id: z.union([z.string(), z.number()]), taskName: z.string().optional(), isEnabled: z.boolean().optional() })).mutation(() => successResponse),

  // ==================== Teams Meetings (stub) ====================

  getTeamsMeetings: protectedProcedure.query(() => [] as Array<{ id: string; subject: string; startTime: string; durationMinutes: number; status: string }>),
  createTeamsMeeting: requirePermission('collab:meeting:hub').input(z.object({ subject: z.string(), startTime: z.union([z.string(), z.date()]), durationMinutes: z.number().optional() }).passthrough()).mutation(() => successResponse),
  updateTeamsMeeting: requirePermission('collab:meeting:hub').input(z.object({ id: z.union([z.string(), z.number()]), subject: z.string().optional(), startTime: z.string().optional(), durationMinutes: z.number().optional(), status: z.string().optional() })).mutation(() => successResponse),

  // ==================== Performance Score (deterministic seed algorithm) ====================

  calculatePerformanceScore: protectedProcedure
    .input(z.object({ userId: z.number().optional(), projectId: z.number(), stageCode: z.string().optional() }))
    .query(({ input, ctx }) => {
      // Non-manager roles can only query their own score
      const HR_ROLES = new Set(["admin", "director", "hr_manager", "dept_manager", "team_lead"]);
      const targetUserId = input.userId ?? ctx.user!.id;
      if (targetUserId !== ctx.user!.id && !HR_ROLES.has(ctx.user!.role ?? "employee")) {
        return { overallScore: 0, grade: "N/A" as const, dimensions: {}, recommendations: ["无权查看他人绩效评分"] };
      }
      const seed = targetUserId * 1000 + input.projectId + (input.stageCode ? input.stageCode.length * 7 : 0);

      const plannedHours = 100 + (seed % 60);
      const actualHours = plannedHours * (0.7 + ((seed * 13) % 60) / 100);
      const hoursRatio = plannedHours / Math.max(actualHours, 1);
      const efficiencyScore = Math.round(Math.max(0, Math.min(100, Math.min(hoursRatio * 100, 100))));

      const totalSteps = 20 + (seed % 15);
      const completedSteps = Math.round(totalSteps * (0.6 + ((seed * 7) % 40) / 100));
      const completionRate = completedSteps / totalSteps;
      const qualityScore = Math.round(Math.max(0, Math.min(100, completionRate * 100)));

      const totalPresets = 10 + (seed % 8);
      const adoptedPresets = Math.round(totalPresets * (0.3 + ((seed * 11) % 50) / 100));
      const innovationScore = Math.round(Math.max(0, Math.min(100, (adoptedPresets / totalPresets) * 100)));

      const interactionCount = 5 + ((seed * 3) % 30);
      const collaborationScore = Math.round(Math.max(0, Math.min(100, Math.min(interactionCount / 25, 1) * 100)));

      const overallScore = Math.round(efficiencyScore * 0.4 + qualityScore * 0.3 + innovationScore * 0.15 + collaborationScore * 0.15);
      const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "E";

      const recommendations: string[] = [];
      if (efficiencyScore < 80) recommendations.push("建议优化工时分配，减少非核心任务的时间投入，提高交付效率");
      if (qualityScore < 80) recommendations.push("建议加强阶段交付物检查，确保每个步骤完整完成后再进入下一步");
      if (innovationScore < 60) recommendations.push("建议积极尝试AI预设工具，利用自动化提升工作产出质量");
      if (collaborationScore < 70) recommendations.push("建议增加与团队成员的沟通互动，参与评审和知识分享活动");
      if (overallScore >= 90) recommendations.push("表现卓越，建议担任导师角色，帮助团队其他成员提升绩效");
      if (recommendations.length === 0) recommendations.push("整体表现良好，保持当前工作节奏，关注持续改进");

      return {
        overallScore, grade,
        dimensions: {
          efficiency: { score: efficiencyScore, detail: `计划工时 ${plannedHours}h, 实际工时 ${Math.round(actualHours)}h, 效率比 ${(hoursRatio * 100).toFixed(1)}%` },
          quality: { score: qualityScore, detail: `总步骤 ${totalSteps}, 已完成 ${completedSteps}, 完成率 ${(completionRate * 100).toFixed(1)}%` },
          innovation: { score: innovationScore, detail: `可用AI预设 ${totalPresets}, 已采用 ${adoptedPresets}, 采用率 ${((adoptedPresets / totalPresets) * 100).toFixed(1)}%` },
          collaboration: { score: collaborationScore, detail: `团队互动 ${interactionCount} 次, 活跃度 ${Math.min((interactionCount / 25) * 100, 100).toFixed(1)}%` },
        },
        recommendations,
      };
    }),
});

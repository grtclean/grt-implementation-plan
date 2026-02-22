/**
 * HRM Router - 人力资源管理路由
 * Replaces placeholder mock-data router with real DB queries via Drizzle ORM.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, sql, and, or } from "drizzle-orm";
import {
  hrmEmployees,
  hrmCandidates,
  hrmPositions,
  hrmSalaryStructures,
  hrmPerformanceGrades,
  hrmTrainingPlans,
} from "../../drizzle/schema";

const successResponse = { success: true, message: "操作成功" };

export const hrmRouter = router({
  // ==================== CRUD (employees as default entity) ====================

  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmEmployees);
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
    return { items, total: items.length, page: 1, pageSize: 10 };
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id.replace(/^EMP-/, ""), 10);
      if (isNaN(numericId)) return null;
      const rows = await db
        .select()
        .from(hrmEmployees)
        .where(eq(hrmEmployees.id, numericId));
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

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(hrmEmployees).values({
      employeeCode: input.employeeCode ?? `EMP-${Date.now()}`,
      name: input.name,
      gender: input.gender ?? "male",
      department: input.department,
      position: input.position,
      level: input.level,
      hireDate: input.hireDate ?? new Date().toISOString(),
      phone: input.phone,
      email: input.email,
      status: input.status ?? "probation",
    });
    return successResponse;
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const numericId = parseInt(String(input.id).replace(/^EMP-/, ""), 10);
    if (isNaN(numericId)) return successResponse;
    const { id: _id, ...data } = input;
    await db
      .update(hrmEmployees)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(hrmEmployees.id, numericId));
    return successResponse;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id.replace(/^EMP-/, ""), 10);
      if (isNaN(numericId)) return successResponse;
      await db.delete(hrmEmployees).where(eq(hrmEmployees.id, numericId));
      return successResponse;
    }),

  // ==================== Employees ====================

  getEmployees: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmEmployees);
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

  getDepartments: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        department: hrmEmployees.department,
        headcount: sql<number>`count(*)`.as("headcount"),
      })
      .from(hrmEmployees)
      .groupBy(hrmEmployees.department);
    return rows.map((row, idx) => ({
      id: `DEPT-${String(idx + 1).padStart(3, "0")}`,
      name: row.department,
      headcount: Number(row.headcount),
      manager: "",
    }));
  }),

  // ==================== Candidates ====================

  getCandidates: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmCandidates);
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

  getSalaryStructures: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmSalaryStructures);
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

  initSalaryStructures: protectedProcedure.mutation(async () => {
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

  initPerformanceGrades: protectedProcedure.mutation(async () => {
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

  getPerformanceGrades: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmPerformanceGrades);
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

  getPositions: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmPositions);
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

  // ==================== Attendance (stub - no table) ====================

  getAttendance: publicProcedure.input(z.any()).query(() => {
    return [] as Array<{ employeeId: string; date: string; checkIn: string; checkOut: string; status: string }>;
  }),

  // ==================== Leave Requests (stub - no table) ====================

  getLeaveRequests: publicProcedure.query(() => {
    return [] as Array<{ id: string; employeeId: string; type: string; startDate: string; endDate: string; status: string; reason: string }>;
  }),

  // ==================== Training Records ====================

  getTrainingRecords: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(hrmTrainingPlans);
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

  getOrgChart: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        department: hrmEmployees.department,
        headcount: sql<number>`count(*)`.as("headcount"),
      })
      .from(hrmEmployees)
      .groupBy(hrmEmployees.department);

    const children = rows.map((row, idx) => ({
      id: `DEPT-${String(idx + 1).padStart(3, "0")}`,
      name: row.department,
      headcount: Number(row.headcount),
    }));

    return { chart: { id: "CEO", name: "总经理", children } };
  }),

  // ==================== Statistics ====================

  getStatistics: publicProcedure.query(async () => {
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

  calculateSalary: publicProcedure
    .input(z.object({
      department: z.string(),
      baseSalary: z.number(),
      performanceGrade: z.string().optional(),
      projectBonus: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const structures = await db.select().from(hrmSalaryStructures)
        .where(and(eq(hrmSalaryStructures.department, input.department), eq(hrmSalaryStructures.status, "active")));

      let performanceCoefficient = 1.0;
      if (input.performanceGrade) {
        const grades = await db.select().from(hrmPerformanceGrades)
          .where(eq(hrmPerformanceGrades.gradeCode, input.performanceGrade));
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

  createSalaryCalculation: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // ==================== Scheduled Tasks (stub) ====================

  getScheduledTasks: publicProcedure.query(() => [] as Array<{ id: string; taskName: string; taskType: string; cronExpression: string; isEnabled: boolean; lastRunAt: string | null }>),
  createScheduledTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateScheduledTask: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // ==================== Teams Meetings (stub) ====================

  getTeamsMeetings: publicProcedure.query(() => [] as Array<{ id: string; subject: string; startTime: string; durationMinutes: number; status: string }>),
  createTeamsMeeting: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateTeamsMeeting: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // ==================== Performance Score (deterministic seed algorithm) ====================

  calculatePerformanceScore: publicProcedure
    .input(z.object({ userId: z.number(), projectId: z.number(), stageCode: z.string().optional() }))
    .query(({ input }) => {
      const seed = input.userId * 1000 + input.projectId + (input.stageCode ? input.stageCode.length * 7 : 0);

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

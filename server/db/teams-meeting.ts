/**
 * Teams meeting & AI interview, performance emails, scheduled tasks, salary
 * Auto-decomposed from server/db.ts
 */
import { eq, desc } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  hrmSalaryStructures, hrmPerformanceGrades, teamsMeetingConfigs, InsertTeamsMeetingConfig,
  aiInterviewAnalytics, InsertAiInterviewAnalytic, performanceReviewEmailLogs, InsertPerformanceReviewEmailLog,
  scheduledTasks, InsertScheduledTask, salaryCalculations, InsertSalaryCalculation,
} from "../../drizzle/schema";

// ==========================================
// Teams Meeting & AI Interview Enhancement
// ==========================================

// Teams Meeting Management
export async function getTeamsMeetings(filters?: {
  candidateId?: number;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(teamsMeetingConfigs);
  
  if (filters?.candidateId) {
    query = query.where(eq(teamsMeetingConfigs.candidateId, filters.candidateId)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(teamsMeetingConfigs.status, filters.status)) as typeof query;
  }
  
  return query.orderBy(desc(teamsMeetingConfigs.startTime)).limit(1000);
}

export async function getTeamsMeetingById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(teamsMeetingConfigs).where(eq(teamsMeetingConfigs.id, id));
  return result[0] || null;
}

export async function getTeamsMeetingByCode(code: string) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(teamsMeetingConfigs).where(eq(teamsMeetingConfigs.meetingCode, code)).limit(1000);
  return result[0] || null;
}

export async function createTeamsMeeting(data: InsertTeamsMeetingConfig) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(teamsMeetingConfigs).values(data);
  return { id: (result as any)[0].insertId };
}

export async function updateTeamsMeeting(id: number, data: Partial<InsertTeamsMeetingConfig>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(teamsMeetingConfigs).set(data).where(eq(teamsMeetingConfigs.id, id));
  return getTeamsMeetingById(id);
}

// Generate meeting code
export function generateMeetingCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MTG-${timestamp}-${random}`;
}

// AI Interview Analytics
export async function getAiInterviewAnalytics(meetingId: number) {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(aiInterviewAnalytics)
    .where(eq(aiInterviewAnalytics.meetingId, meetingId))
    .orderBy(aiInterviewAnalytics.analysisTime)
    .limit(1000);
}

export async function createAiInterviewAnalytic(data: InsertAiInterviewAnalytic) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(aiInterviewAnalytics).values(data);
  return result;
}

// ==========================================
// Performance Review Email Logs
// ==========================================

export async function getPerformanceReviewEmailLogs(filters?: {
  reminderId?: number;
  employeeId?: number;
  sendStatus?: "pending" | "sent" | "failed" | "bounced";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(performanceReviewEmailLogs);
  
  if (filters?.reminderId) {
    query = query.where(eq(performanceReviewEmailLogs.reminderId, filters.reminderId)) as typeof query;
  }
  if (filters?.employeeId) {
    query = query.where(eq(performanceReviewEmailLogs.employeeId, filters.employeeId)) as typeof query;
  }
  if (filters?.sendStatus) {
    query = query.where(eq(performanceReviewEmailLogs.sendStatus, filters.sendStatus)) as typeof query;
  }
  
  return query.orderBy(desc(performanceReviewEmailLogs.createdAt)).limit(1000);
}

export async function createPerformanceReviewEmailLog(data: InsertPerformanceReviewEmailLog) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(performanceReviewEmailLogs).values(data);
  return { id: (result as any)[0].insertId };
}

export async function updatePerformanceReviewEmailLog(id: number, data: Partial<InsertPerformanceReviewEmailLog>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(performanceReviewEmailLogs).set(data).where(eq(performanceReviewEmailLogs.id, id));
  const result = await db.select().from(performanceReviewEmailLogs).where(eq(performanceReviewEmailLogs.id, id));
  return result[0] || null;
}

// ==========================================
// Scheduled Tasks Management
// ==========================================

export async function getScheduledTasks(filters?: {
  taskType?: "performance_review_reminder" | "training_reminder" | "meeting_reminder" | "custom";
  isEnabled?: boolean;
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(scheduledTasks);
  
  if (filters?.taskType) {
    query = query.where(eq(scheduledTasks.taskType, filters.taskType)) as typeof query;
  }
  if (filters?.isEnabled !== undefined) {
    query = query.where(eq(scheduledTasks.isEnabled, filters.isEnabled as any)) as typeof query;
  }
  
  return query.orderBy(scheduledTasks.nextRunAt).limit(1000);
}

export async function getScheduledTaskById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id));
  return result[0] || null;
}

export async function getScheduledTaskByCode(code: string) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(scheduledTasks).where(eq(scheduledTasks.taskCode, code)).limit(1000);
  return result[0] || null;
}

export async function createScheduledTask(data: InsertScheduledTask) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(scheduledTasks).values(data);
  return { id: (result as any)[0].insertId };
}

export async function updateScheduledTask(id: number, data: Partial<InsertScheduledTask>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(scheduledTasks).set(data).where(eq(scheduledTasks.id, id));
  return getScheduledTaskById(id);
}

// Generate task code
export function generateTaskCode(taskType: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const typePrefix = taskType.substring(0, 3).toUpperCase();
  return `TSK-${typePrefix}-${timestamp}`;
}

// ==========================================
// Salary Calculations
// ==========================================

export async function getSalaryCalculations(filters?: {
  employeeId?: number;
  candidateId?: number;
  department?: string;
  calculationType?: "offer" | "adjustment" | "promotion" | "simulation";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(salaryCalculations);
  
  if (filters?.employeeId) {
    query = query.where(eq(salaryCalculations.employeeId, filters.employeeId)) as typeof query;
  }
  if (filters?.candidateId) {
    query = query.where(eq(salaryCalculations.candidateId, filters.candidateId)) as typeof query;
  }
  if (filters?.department) {
    query = query.where(eq(salaryCalculations.department, filters.department)) as typeof query;
  }
  if (filters?.calculationType) {
    query = query.where(eq(salaryCalculations.calculationType, filters.calculationType)) as typeof query;
  }
  
  return query.orderBy(desc(salaryCalculations.createdAt)).limit(1000);
}

export async function getSalaryCalculationById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(salaryCalculations).where(eq(salaryCalculations.id, id));
  return result[0] || null;
}

export async function createSalaryCalculation(data: InsertSalaryCalculation) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(salaryCalculations).values(data);
  return { id: (result as any)[0].insertId };
}

export async function updateSalaryCalculation(id: number, data: Partial<InsertSalaryCalculation>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(salaryCalculations).set(data).where(eq(salaryCalculations.id, id));
  return getSalaryCalculationById(id);
}

// Generate calculation code
export function generateCalculationCode(calculationType: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const typePrefix = calculationType.substring(0, 3).toUpperCase();
  return `SAL-${typePrefix}-${timestamp}`;
}

// Calculate salary based on department structure and parameters
export async function calculateSalary(params: {
  department: string;
  baseSalary: number;
  performanceGrade?: string;
  salesAmount?: number;
  projectBonus?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get department salary structure
  const structures = await db.select().from(hrmSalaryStructures)
    .where(eq(hrmSalaryStructures.department, params.department))
    .limit(1000);
  const structure = structures[0];
  
  if (!structure) {
    // Use default ratios if no structure found
    return {
      baseSalary: params.baseSalary,
      performanceSalary: params.baseSalary * 0.2,
      bonus: params.projectBonus || 0,
      benefits: params.baseSalary * 0.1,
      monthlyTotal: params.baseSalary * 1.3 + (params.projectBonus || 0),
      annualTotal: params.baseSalary * 1.3 * 12 + (params.projectBonus || 0) * 12,
      breakdown: {
        baseSalaryRatio: 0.60,
        performanceRatio: 0.20,
        bonusRatio: 0.10,
        benefitsRatio: 0.10
      }
    };
  }
  
  // Get performance coefficient
  let performanceCoefficient = 1.0;
  if (params.performanceGrade) {
    const grades = await db.select().from(hrmPerformanceGrades)
      .where(eq(hrmPerformanceGrades.gradeCode, params.performanceGrade))
      .limit(1000);
    if (grades[0]) {
      performanceCoefficient = parseFloat(grades[0].coefficient);
    }
  }
  
  // Calculate salary components
  const baseSalaryRatio = (parseFloat(structure.baseSalaryRatioMin) + parseFloat(structure.baseSalaryRatioMax)) / 2;
  const performanceRatio = (parseFloat(structure.performanceRatioMin) + parseFloat(structure.performanceRatioMax)) / 2;
  const bonusRatio = (parseFloat(structure.bonusRatioMin) + parseFloat(structure.bonusRatioMax)) / 2;
  const benefitsRatio = (parseFloat(structure.benefitsRatioMin) + parseFloat(structure.benefitsRatioMax)) / 2;
  
  const performanceSalary = params.baseSalary * (performanceRatio / baseSalaryRatio) * performanceCoefficient;
  const benefits = params.baseSalary * (benefitsRatio / baseSalaryRatio);
  const bonus = params.projectBonus || (params.baseSalary * (bonusRatio / baseSalaryRatio));
  
  const monthlyTotal = params.baseSalary + performanceSalary + bonus + benefits;
  const annualTotal = monthlyTotal * 12;
  
  return {
    baseSalary: params.baseSalary,
    performanceSalary: Math.round(performanceSalary * 100) / 100,
    bonus: Math.round(bonus * 100) / 100,
    benefits: Math.round(benefits * 100) / 100,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    annualTotal: Math.round(annualTotal * 100) / 100,
    breakdown: {
      baseSalaryRatio,
      performanceRatio,
      bonusRatio,
      benefitsRatio,
      performanceCoefficient
    }
  };
}

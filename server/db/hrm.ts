/**
 * HRM intelligent system
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, or, like } from "drizzle-orm";
import { requireDb } from "./connection";
import {
  hrmEmployees, InsertHrmEmployee, hrmPositions, InsertHrmPosition,
  hrmTrainingPlans, InsertHrmTrainingPlan, hrmTrainingTests, InsertHrmTrainingTest,
  hrmPerformanceReviewReminders, InsertHrmPerformanceReviewReminder, hrmCandidates, InsertHrmCandidate,
  hrmAiInterviewRecords, InsertHrmAiInterviewRecord, hrmDigitalAgentModels, InsertHrmDigitalAgentModel,
  hrmSalaryStructures, InsertHrmSalaryStructure, hrmPerformanceGrades, InsertHrmPerformanceGrade,
  hrmDocumentFiles, InsertHrmDocumentFile,
} from "../../drizzle/schema";

// ============================================
// HRM Intelligent System Functions - v1.0
// ============================================

// Employee Management
export async function getHrmEmployees(filters?: {
  department?: string;
  status?: "probation" | "regular" | "resigned" | "terminated";
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmEmployees);
  
  if (filters?.department) {
    query = query.where(eq(hrmEmployees.department, filters.department)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(hrmEmployees.status, filters.status)) as typeof query;
  }
  if (filters?.search) {
    query = query.where(
      or(
        like(hrmEmployees.name, `%${filters.search}%`),
        like(hrmEmployees.employeeCode, `%${filters.search}%`)
      )
    ) as typeof query;
  }
  
  return query.orderBy(desc(hrmEmployees.hireDate)).limit(1000);
}

export async function getHrmEmployeeById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmEmployees).where(eq(hrmEmployees.id, id));
  return result[0] || null;
}

export async function getHrmEmployeeByCode(code: string) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmEmployees).where(eq(hrmEmployees.employeeCode, code)).limit(1000);
  return result[0] || null;
}

export async function createHrmEmployee(data: InsertHrmEmployee) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmEmployees).values(data);
  return result;
}

export async function updateHrmEmployee(id: number, data: Partial<InsertHrmEmployee>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmEmployees).set(data).where(eq(hrmEmployees.id, id));
  return getHrmEmployeeById(id);
}

// Position Management
export async function getHrmPositions(filters?: {
  department?: string;
  status?: "active" | "inactive";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmPositions);
  
  if (filters?.department) {
    query = query.where(eq(hrmPositions.department, filters.department)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(hrmPositions.status, filters.status)) as typeof query;
  }
  
  return query.orderBy(hrmPositions.department).limit(1000);
}

export async function getHrmPositionById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmPositions).where(eq(hrmPositions.id, id));
  return result[0] || null;
}

export async function createHrmPosition(data: InsertHrmPosition) {
  const db = await requireDb();
  if (!db) return null;
  await db.insert(hrmPositions).values(data);
  // 返回创建的记录
  const [created] = await db.select().from(hrmPositions).where(eq(hrmPositions.positionCode, data.positionCode)).limit(1);
  return created;
}

export async function updateHrmPosition(id: number, data: Partial<InsertHrmPosition>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmPositions).set(data).where(eq(hrmPositions.id, id));
  return getHrmPositionById(id);
}

// Training Plan Management
export async function getHrmTrainingPlans(filters?: {
  employeeId?: number;
  planType?: "onboarding" | "ongoing" | "special";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmTrainingPlans);
  
  if (filters?.employeeId) {
    query = query.where(eq(hrmTrainingPlans.employeeId, filters.employeeId)) as typeof query;
  }
  if (filters?.planType) {
    query = query.where(eq(hrmTrainingPlans.planType, filters.planType)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(hrmTrainingPlans.status, filters.status)) as typeof query;
  }
  
  return query.orderBy(desc(hrmTrainingPlans.startDate)).limit(1000);
}

export async function getHrmTrainingPlanById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmTrainingPlans).where(eq(hrmTrainingPlans.id, id));
  return result[0] || null;
}

export async function createHrmTrainingPlan(data: InsertHrmTrainingPlan) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmTrainingPlans).values(data);
  return result;
}

export async function updateHrmTrainingPlan(id: number, data: Partial<InsertHrmTrainingPlan>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmTrainingPlans).set(data).where(eq(hrmTrainingPlans.id, id));
  return getHrmTrainingPlanById(id);
}

// Training Test Management
export async function getHrmTrainingTests(filters?: {
  employeeId?: number;
  trainingPlanId?: number;
  testType?: "basic" | "skill" | "project";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmTrainingTests);
  
  if (filters?.employeeId) {
    query = query.where(eq(hrmTrainingTests.employeeId, filters.employeeId)) as typeof query;
  }
  if (filters?.trainingPlanId) {
    query = query.where(eq(hrmTrainingTests.trainingPlanId, filters.trainingPlanId)) as typeof query;
  }
  if (filters?.testType) {
    query = query.where(eq(hrmTrainingTests.testType, filters.testType)) as typeof query;
  }
  
  return query.orderBy(desc(hrmTrainingTests.createdAt)).limit(1000);
}

export async function createHrmTrainingTest(data: InsertHrmTrainingTest) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmTrainingTests).values(data);
  return result;
}

export async function updateHrmTrainingTest(id: number, data: Partial<InsertHrmTrainingTest>) {
  const db = await requireDb();
  if (!db) return;
  await db.update(hrmTrainingTests).set(data).where(eq(hrmTrainingTests.id, id));
}

// Performance Review Reminder Management
export async function getHrmPerformanceReviewReminders(filters?: {
  employeeId?: number;
  reviewType?: "3M" | "6M" | "YEAR";
  status?: "pending" | "sent" | "completed" | "cancelled";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmPerformanceReviewReminders);
  
  if (filters?.employeeId) {
    query = query.where(eq(hrmPerformanceReviewReminders.employeeId, filters.employeeId)) as typeof query;
  }
  if (filters?.reviewType) {
    query = query.where(eq(hrmPerformanceReviewReminders.reviewType, filters.reviewType)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(hrmPerformanceReviewReminders.status, filters.status)) as typeof query;
  }
  
  return query.orderBy(hrmPerformanceReviewReminders.reminderDateTime).limit(1000);
}

export async function createHrmPerformanceReviewReminder(data: InsertHrmPerformanceReviewReminder) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmPerformanceReviewReminders).values(data);
  return result;
}

export async function updateHrmPerformanceReviewReminder(id: number, data: Partial<InsertHrmPerformanceReviewReminder>) {
  const db = await requireDb();
  if (!db) return;
  await db.update(hrmPerformanceReviewReminders).set(data).where(eq(hrmPerformanceReviewReminders.id, id));
}

// Generate performance review reminders for an employee
export async function generatePerformanceReviewReminders(employeeId: number) {
  const employee = await getHrmEmployeeById(employeeId);
  if (!employee) return { created: 0 };
  
  const hireDate = new Date(employee.hireDate);
  const reminders: InsertHrmPerformanceReviewReminder[] = [];
  
  // 3-month review
  const threeMonthDate = new Date(hireDate);
  threeMonthDate.setMonth(threeMonthDate.getMonth() + 3);
  const threeMonthReminder = getReviewReminderDate(threeMonthDate);
  
  reminders.push({
    employeeId,
    reviewType: "3M",
    reviewDate: threeMonthDate.toISOString(),
    reminderDateTime: threeMonthReminder.toISOString(),
    recipients: JSON.stringify({
      employee: employee.email,
      manager: null, // Will be filled from manager lookup
      seniorManager: null,
      hrbp: null,
      fixed: ["camillia@gerrytech.com", "gerry@grtclean.ai"]
    }),
    emailSubject: `[述职提醒] ${employee.name} 3个月试用期述职报告 - ${formatDate(threeMonthDate)}`,
    status: "pending"
  });
  
  // 6-month review
  const sixMonthDate = new Date(hireDate);
  sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);
  const sixMonthReminder = getReviewReminderDate(sixMonthDate);
  
  reminders.push({
    employeeId,
    reviewType: "6M",
    reviewDate: sixMonthDate.toISOString(),
    reminderDateTime: sixMonthReminder.toISOString(),
    recipients: JSON.stringify({
      employee: employee.email,
      manager: null,
      seniorManager: null,
      hrbp: null,
      fixed: ["camillia@gerrytech.com", "gerry@grtclean.ai"]
    }),
    emailSubject: `[述职提醒] ${employee.name} 6个月试用期述职报告 - ${formatDate(sixMonthDate)}`,
    status: "pending"
  });
  
  const db = await requireDb();
  if (!db) return { created: 0 };
  let created = 0;
  for (const reminder of reminders) {
    await db.insert(hrmPerformanceReviewReminders).values(reminder);
    created++;
  }
  
  return { created };
}

// Helper function to get reminder date (1 week before, Tuesday 14:00)
function getReviewReminderDate(reviewDate: Date): Date {
  const reminderDate = new Date(reviewDate);
  reminderDate.setDate(reminderDate.getDate() - 7); // 1 week before
  
  // Find the Tuesday of that week
  const dayOfWeek = reminderDate.getDay();
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  reminderDate.setDate(reminderDate.getDate() + daysUntilTuesday);
  
  // Set time to 14:00
  reminderDate.setHours(14, 0, 0, 0);
  
  return reminderDate;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Candidate Management
export async function getHrmCandidates(filters?: {
  status?: "new" | "screening" | "interviewing" | "offer" | "hired" | "rejected" | "withdrawn";
  positionId?: number;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmCandidates);
  
  if (filters?.status) {
    query = query.where(eq(hrmCandidates.status, filters.status)) as typeof query;
  }
  if (filters?.positionId) {
    query = query.where(eq(hrmCandidates.positionId, filters.positionId)) as typeof query;
  }
  if (filters?.search) {
    query = query.where(
      or(
        like(hrmCandidates.name, `%${filters.search}%`),
        like(hrmCandidates.candidateCode, `%${filters.search}%`)
      )
    ) as typeof query;
  }
  
  return query.orderBy(desc(hrmCandidates.createdAt)).limit(1000);
}

export async function getHrmCandidateById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmCandidates).where(eq(hrmCandidates.id, id));
  return result[0] || null;
}

export async function createHrmCandidate(data: InsertHrmCandidate) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmCandidates).values(data);
  return result;
}

export async function updateHrmCandidate(id: number, data: Partial<InsertHrmCandidate>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmCandidates).set(data).where(eq(hrmCandidates.id, id));
  return getHrmCandidateById(id);
}

// AI Interview Record Management
export async function getHrmAiInterviewRecords(filters?: {
  candidateId?: number;
  recommendation?: "hire" | "pending" | "reject";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmAiInterviewRecords);
  
  if (filters?.candidateId) {
    query = query.where(eq(hrmAiInterviewRecords.candidateId, filters.candidateId)) as typeof query;
  }
  if (filters?.recommendation) {
    query = query.where(eq(hrmAiInterviewRecords.recommendation, filters.recommendation)) as typeof query;
  }
  
  return query.orderBy(desc(hrmAiInterviewRecords.interviewedAt)).limit(1000);
}

export async function getHrmAiInterviewRecordById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmAiInterviewRecords).where(eq(hrmAiInterviewRecords.id, id));
  return result[0] || null;
}

export async function createHrmAiInterviewRecord(data: InsertHrmAiInterviewRecord) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmAiInterviewRecords).values(data);
  return result;
}

export async function updateHrmAiInterviewRecord(id: number, data: Partial<InsertHrmAiInterviewRecord>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmAiInterviewRecords).set(data).where(eq(hrmAiInterviewRecords.id, id));
  return getHrmAiInterviewRecordById(id);
}

// Digital Agent Model Management
export async function getHrmDigitalAgentModels(filters?: {
  department?: string;
  currentStage?: "initial" | "assistant" | "collaboration" | "leading" | "replacement";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmDigitalAgentModels);
  
  if (filters?.department) {
    query = query.where(eq(hrmDigitalAgentModels.department, filters.department)) as typeof query;
  }
  if (filters?.currentStage) {
    query = query.where(eq(hrmDigitalAgentModels.currentStage, filters.currentStage)) as typeof query;
  }
  
  return query.orderBy(desc(hrmDigitalAgentModels.digitalizationScore)).limit(1000);
}

export async function getHrmDigitalAgentModelById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(hrmDigitalAgentModels).where(eq(hrmDigitalAgentModels.id, id));
  return result[0] || null;
}

export async function createHrmDigitalAgentModel(data: InsertHrmDigitalAgentModel) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmDigitalAgentModels).values(data);
  return result;
}

export async function updateHrmDigitalAgentModel(id: number, data: Partial<InsertHrmDigitalAgentModel>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(hrmDigitalAgentModels).set(data).where(eq(hrmDigitalAgentModels.id, id));
  return getHrmDigitalAgentModelById(id);
}

// Salary Structure Management
export async function getHrmSalaryStructures(filters?: {
  department?: string;
  status?: "active" | "inactive";
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmSalaryStructures);
  
  if (filters?.department) {
    query = query.where(eq(hrmSalaryStructures.department, filters.department)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(hrmSalaryStructures.status, filters.status)) as typeof query;
  }
  
  return query.orderBy(hrmSalaryStructures.department).limit(1000);
}

export async function createHrmSalaryStructure(data: InsertHrmSalaryStructure) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmSalaryStructures).values(data);
  return result;
}

export async function updateHrmSalaryStructure(id: number, data: Partial<InsertHrmSalaryStructure>) {
  const db = await requireDb();
  if (!db) return;
  await db.update(hrmSalaryStructures).set(data).where(eq(hrmSalaryStructures.id, id));
}

// Performance Grade Management
export async function getHrmPerformanceGrades() {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(hrmPerformanceGrades).orderBy(desc(hrmPerformanceGrades.scoreMin)).limit(1000);
}

export async function createHrmPerformanceGrade(data: InsertHrmPerformanceGrade) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmPerformanceGrades).values(data);
  return result;
}

// Document File Management
export async function getHrmDocumentFiles(filters?: {
  subjectType?: "employee" | "candidate" | "position";
  subjectId?: number;
  fileTypeCode?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  let query = db.select().from(hrmDocumentFiles);
  
  if (filters?.subjectType) {
    query = query.where(eq(hrmDocumentFiles.subjectType, filters.subjectType)) as typeof query;
  }
  if (filters?.subjectId) {
    query = query.where(eq(hrmDocumentFiles.subjectId, filters.subjectId)) as typeof query;
  }
  if (filters?.fileTypeCode) {
    query = query.where(eq(hrmDocumentFiles.fileTypeCode, filters.fileTypeCode)) as typeof query;
  }
  
  return query.orderBy(desc(hrmDocumentFiles.fileDate)).limit(1000);
}

export async function createHrmDocumentFile(data: InsertHrmDocumentFile) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(hrmDocumentFiles).values(data);
  return result;
}

export async function updateHrmDocumentFile(id: number, data: Partial<InsertHrmDocumentFile>) {
  const db = await requireDb();
  if (!db) return;
  await db.update(hrmDocumentFiles).set(data).where(eq(hrmDocumentFiles.id, id));
}

// Generate HRM document file code based on naming rules
export async function generateHrmDocumentFileCode(
  fileTypeCode: string,
  subjectType: "employee" | "candidate" | "position",
  subjectId: number,
  description: string,
  fileDate?: Date
): Promise<string> {
  let subjectCode = "";
  
  if (subjectType === "employee") {
    const employee = await getHrmEmployeeById(subjectId);
    subjectCode = employee?.employeeCode || `E${subjectId}`;
  } else if (subjectType === "candidate") {
    const candidate = await getHrmCandidateById(subjectId);
    subjectCode = candidate?.candidateCode || `C${subjectId}`;
  } else if (subjectType === "position") {
    const position = await getHrmPositionById(subjectId);
    subjectCode = position?.positionCode || `P${subjectId}`;
  }
  
  const dateStr = formatDate(fileDate || new Date()).replace(/-/g, '');
  
  // Format: [类型代码]-[主体标识]-[描述]-[日期]-V1.0
  return `${fileTypeCode}-${subjectCode}-${description}-${dateStr}-V1.0`;
}

// Initialize default salary structures based on GRT compensation plan
export async function initDefaultSalaryStructures() {
  const db = await requireDb();
  if (!db) return { created: 0 };
  
  const structures = [
    { department: "销售部", baseSalaryRatioMin: "0.30", baseSalaryRatioMax: "0.40", performanceRatioMin: "0.10", performanceRatioMax: "0.20", bonusRatioMin: "0.40", bonusRatioMax: "0.50", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
    { department: "技术服务部", baseSalaryRatioMin: "0.50", baseSalaryRatioMax: "0.60", performanceRatioMin: "0.20", performanceRatioMax: "0.25", bonusRatioMin: "0.10", bonusRatioMax: "0.20", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
    { department: "生产部", baseSalaryRatioMin: "0.50", baseSalaryRatioMax: "0.60", performanceRatioMin: "0.25", performanceRatioMax: "0.30", bonusRatioMin: "0.10", bonusRatioMax: "0.15", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
    { department: "采购部", baseSalaryRatioMin: "0.50", baseSalaryRatioMax: "0.60", performanceRatioMin: "0.20", performanceRatioMax: "0.25", bonusRatioMin: "0.10", bonusRatioMax: "0.20", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
    { department: "品管部", baseSalaryRatioMin: "0.55", baseSalaryRatioMax: "0.65", performanceRatioMin: "0.20", performanceRatioMax: "0.25", bonusRatioMin: "0.05", bonusRatioMax: "0.15", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
    { department: "财务部", baseSalaryRatioMin: "0.60", baseSalaryRatioMax: "0.70", performanceRatioMin: "0.20", performanceRatioMax: "0.25", bonusRatioMin: "0.05", bonusRatioMax: "0.10", benefitsRatioMin: "0.05", benefitsRatioMax: "0.10" },
  ];
  
  let created = 0;
  for (const structure of structures) {
    const existing = await db.select().from(hrmSalaryStructures).where(eq(hrmSalaryStructures.department, structure.department)).limit(1000);
    if (existing.length === 0) {
      await db.insert(hrmSalaryStructures).values({
        ...structure,
        effectiveDate: new Date("2026-01-01").toISOString(),
        status: "active"
      });
      created++;
    }
  }
  
  return { created };
}

// Initialize default performance grades
export async function initDefaultPerformanceGrades() {
  const db = await requireDb();
  if (!db) return { created: 0 };
  
  const grades = [
    { gradeCode: "S", gradeName: "卓越", scoreMin: 95, scoreMax: 100, coefficient: "1.30", description: "超出预期，表现卓越" },
    { gradeCode: "A", gradeName: "优秀", scoreMin: 85, scoreMax: 94, coefficient: "1.10", description: "超出预期，表现优秀" },
    { gradeCode: "B", gradeName: "良好", scoreMin: 75, scoreMax: 84, coefficient: "1.00", description: "达到预期，表现良好" },
    { gradeCode: "C", gradeName: "合格", scoreMin: 65, scoreMax: 74, coefficient: "0.80", description: "基本达到预期" },
    { gradeCode: "D", gradeName: "需改进", scoreMin: 60, scoreMax: 64, coefficient: "0.60", description: "未达预期，需要改进" },
    { gradeCode: "E", gradeName: "不合格", scoreMin: 0, scoreMax: 59, coefficient: "0.00", description: "严重不达标" },
  ];
  
  let created = 0;
  for (const grade of grades) {
    const existing = await db.select().from(hrmPerformanceGrades).where(eq(hrmPerformanceGrades.gradeCode, grade.gradeCode)).limit(1000);
    if (existing.length === 0) {
      await db.insert(hrmPerformanceGrades).values(grade);
      created++;
    }
  }
  
  return { created };
}

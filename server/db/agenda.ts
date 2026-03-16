/**
 * Enterprise agenda — meetings, training, annual plans, reminders, assessments, certificates, cost alerts
 * Auto-decomposed from server/db.ts
 */
import { eq, desc, or, and } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';
import { saveRuleVersion } from "./cost-alert-versions";
import { getProjectCostSummary } from "./cost";
import { getProjectById } from "./projects";
import { getEnabledWebhooksByEvent, logWebhookDelivery } from "./webhooks";

const log = createChildLogger("db");
import {
  feedback, Project, meetingReminders, InsertMeetingReminder,
  trainingAssessments, InsertTrainingAssessment, trainingAssessmentResults, InsertTrainingAssessmentResult,
  trainingCertificates, InsertTrainingCertificate, costAlertRules, InsertCostAlertRule,
  costAlertLogs, InsertCostAlertLog, webhookConfigs, WebhookConfig,
  meetingTypes, meetingSchedules, meetingAttendees, trainingPlans,
  trainingParticipants, annualPlans,
} from "../../drizzle/schema";

// ============================================
// 企业议程管理模块 (Enterprise Agenda Management)
// ============================================

// --- Meeting Types ---

export async function getMeetingTypes() {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(meetingTypes).orderBy(meetingTypes.sortOrder).limit(1000);
}

export async function getMeetingTypeById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(meetingTypes).where(eq(meetingTypes.id, id));
  return result[0] || null;
}

export async function createMeetingType(data: {
  name: string;
  code: string;
  level?: "company" | "department" | "project" | "team" | "personal";
  frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "adhoc";
  defaultDuration?: number;
  defaultStartTime?: string;
  defaultDayOfWeek?: number;
  description?: string;
  agendaTemplate?: string;
  sortOrder?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(meetingTypes).values(data);
  return { id: result[0].insertId };
}

export async function updateMeetingType(id: number, data: Partial<{
  name: string;
  code: string;
  level: "company" | "department" | "project" | "team" | "personal";
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "adhoc";
  defaultDuration: number;
  defaultStartTime: string;
  defaultDayOfWeek: number;
  description: string;
  agendaTemplate: string;
  isActive: boolean;
  sortOrder: number;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(meetingTypes).set(data as any).where(eq(meetingTypes.id, id));
  return { success: true };
}

// --- Meeting Schedules ---

export async function getMeetingSchedules(filters?: {
  level?: string;
  departmentId?: number;
  projectId?: number;
  organizerId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(meetingSchedules);
  const conditions = [];
  
  if (filters?.level) {
    conditions.push(eq(meetingSchedules.level, filters.level as any));
  }
  if (filters?.departmentId) {
    conditions.push(eq(meetingSchedules.departmentId, filters.departmentId));
  }
  if (filters?.projectId) {
    conditions.push(eq(meetingSchedules.projectId, filters.projectId));
  }
  if (filters?.organizerId) {
    conditions.push(eq(meetingSchedules.organizerId, filters.organizerId));
  }
  if (filters?.status) {
    conditions.push(eq(meetingSchedules.status, filters.status as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(meetingSchedules.startTime).limit(1000);
}

export async function getMeetingScheduleById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(meetingSchedules).where(eq(meetingSchedules.id, id));
  return result[0] || null;
}

export async function createMeetingSchedule(data: {
  typeId: number;
  title: string;
  description?: string;
  level?: "company" | "department" | "project" | "team" | "personal";
  departmentId?: number;
  projectId?: number;
  startTime: string;
  endTime: string;
  location?: string;
  onlineLink?: string;
  organizerId: number;
  agenda?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(meetingSchedules).values({
    ...data,
    startTime: data.startTime.slice(0, 19).replace('T', ' '),
    endTime: data.endTime.slice(0, 19).replace('T', ' '),
    isRecurring: data.isRecurring ? 1 : 0,
  });
  return { id: result[0].insertId };
}

export async function updateMeetingSchedule(id: number, data: Partial<{
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  onlineLink: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda: string;
  minutes: string;
  decisions: string;
  actionItems: string;
  reminderMinutes: number;
  reminderSent: boolean;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(meetingSchedules).set(data as any).where(eq(meetingSchedules.id, id));
  return { success: true };
}

// --- Meeting Attendees ---

export async function getMeetingAttendees(meetingId: number) {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(meetingAttendees).where(eq(meetingAttendees.meetingId, meetingId)).limit(1000);
}

export async function addMeetingAttendee(data: {
  meetingId: number;
  userId: number;
  role?: "organizer" | "required" | "optional" | "presenter";
}) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(meetingAttendees).values(data);
  return { id: result[0].insertId };
}

export async function updateMeetingAttendee(id: number, data: Partial<{
  role: "organizer" | "required" | "optional" | "presenter";
  responseStatus: "pending" | "accepted" | "declined" | "tentative";
  attendanceStatus: "unknown" | "attended" | "absent" | "late";
  remark: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(meetingAttendees).set(data).where(eq(meetingAttendees.id, id));
  return { success: true };
}

export async function removeMeetingAttendee(id: number) {
  const db = await requireDb();
  if (!db) return null;
  await db.delete(meetingAttendees).where(eq(meetingAttendees.id, id));
  return { success: true };
}

// --- Training Plans ---

export async function getTrainingPlans(filters?: {
  type?: string;
  category?: string;
  status?: string;
  trainerId?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(trainingPlans);
  const conditions = [];
  
  if (filters?.type) {
    conditions.push(eq(trainingPlans.type, filters.type as any));
  }
  if (filters?.category) {
    conditions.push(eq(trainingPlans.category, filters.category as any));
  }
  if (filters?.status) {
    conditions.push(eq(trainingPlans.status, filters.status as any));
  }
  if (filters?.trainerId) {
    conditions.push(eq(trainingPlans.trainerId, filters.trainerId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(trainingPlans.plannedStartDate).limit(1000);
}

export async function getTrainingPlanById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(trainingPlans).where(eq(trainingPlans.id, id));
  return result[0] || null;
}

export async function createTrainingPlan(data: {
  name: string;
  code?: string;
  type?: "internal" | "external" | "online" | "certification";
  category?: "technical" | "management" | "safety" | "quality" | "compliance";
  description?: string;
  objectives?: string;
  trainerId?: number;
  externalTrainer?: string;
  trainingOrg?: string;
  plannedStartDate?: Date | string;
  plannedEndDate?: Date | string;
  durationHours?: number;
  location?: string;
  budget?: number;
  maxParticipants?: number;
  materialsUrl?: string;
  assessmentMethod?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  const insertData = {
    ...data,
    plannedStartDate: data.plannedStartDate instanceof Date ? data.plannedStartDate : data.plannedStartDate,
    plannedEndDate: data.plannedEndDate instanceof Date ? data.plannedEndDate : data.plannedEndDate,
  };
  const result = await db.insert(trainingPlans).values(insertData as any) as any;
  return { id: result[0]?.insertId ?? result.insertId };
}

export async function updateTrainingPlan(id: number, data: Partial<{
  name: string;
  code: string;
  type: "internal" | "external" | "online" | "certification";
  category: "technical" | "management" | "safety" | "quality" | "compliance";
  description: string;
  objectives: string;
  trainerId: number;
  externalTrainer: string;
  trainingOrg: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  durationHours: number;
  location: string;
  budget: number;
  actualCost: number;
  maxParticipants: number;
  status: "draft" | "planned" | "in_progress" | "completed" | "cancelled";
  materialsUrl: string;
  assessmentMethod: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(trainingPlans).set(data).where(eq(trainingPlans.id, id));
  return { success: true };
}

// --- Training Participants ---

export async function getTrainingParticipants(trainingId: number) {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(trainingParticipants).where(eq(trainingParticipants.trainingId, trainingId)).limit(1000);
}

export async function addTrainingParticipant(data: {
  trainingId: number;
  userId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(trainingParticipants).values(data);
  return { id: result[0].insertId };
}

/**
 * Batch add training participants
 * @param trainingId - The training ID
 * @param userIds - Array of user IDs to add
 * @returns Results with success count and failed items
 */
export async function batchAddTrainingParticipants(trainingId: number, userIds: number[]) {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };
  
  const results: Array<{ userId: number; success: boolean; message?: string; participantId?: number }> = [];
  
  // Get existing participants to avoid duplicates
  const existingParticipants = await getTrainingParticipants(trainingId);
  const existingUserIds = new Set(existingParticipants.map(p => p.userId));
  
  for (const userId of userIds) {
    try {
      // Check if already a participant
      if (existingUserIds.has(userId)) {
        results.push({ userId, success: false, message: "该用户已是参与者" });
        continue;
      }
      
      const result = await db.insert(trainingParticipants).values({ trainingId, userId });
      results.push({ userId, success: true, participantId: result[0].insertId });
    } catch (error) {
      results.push({ userId, success: false, message: String(error) });
    }
  }
  
  return {
    success: true,
    totalRequested: userIds.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    details: results
  };
}

export async function updateTrainingParticipant(id: number, data: Partial<{
  registrationStatus: "registered" | "confirmed" | "cancelled";
  attendanceStatus: "unknown" | "attended" | "absent" | "partial";
  score: number;
  passed: boolean;
  certificateNo: string;
  certificateExpiry: string;
  feedbackRating: number;
  feedback: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(trainingParticipants).set(data as any).where(eq(trainingParticipants.id, id));
  return { success: true };
}

// --- Annual Plans ---

export async function getAnnualPlans(filters?: {
  year?: number;
  type?: string;
  departmentId?: number;
  status?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(annualPlans);
  const conditions = [];
  
  if (filters?.year) {
    conditions.push(eq(annualPlans.year, filters.year));
  }
  if (filters?.type) {
    conditions.push(eq(annualPlans.type, filters.type as any));
  }
  if (filters?.departmentId) {
    conditions.push(eq(annualPlans.departmentId, filters.departmentId));
  }
  if (filters?.status) {
    conditions.push(eq(annualPlans.status, filters.status as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(annualPlans.year).limit(1000);
}

export async function getAnnualPlanById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.select().from(annualPlans).where(eq(annualPlans.id, id));
  return result[0] || null;
}

export async function createAnnualPlan(data: {
  year: number;
  type?: "company" | "department" | "project";
  departmentId?: number;
  name: string;
  description?: string;
  revenueTarget?: number;
  profitTarget?: number;
  customerTarget?: number;
  investmentBudget?: number;
  hiringBudget?: number;
  trainingBudget?: number;
  keyInitiatives?: string;
  risksAndChallenges?: string;
  creatorId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.insert(annualPlans).values(data);
  return { id: result[0].insertId };
}

export async function updateAnnualPlan(id: number, data: Partial<{
  name: string;
  description: string;
  revenueTarget: number;
  profitTarget: number;
  customerTarget: number;
  investmentBudget: number;
  hiringBudget: number;
  trainingBudget: number;
  keyInitiatives: string;
  risksAndChallenges: string;
  status: "draft" | "submitted" | "approved" | "in_progress" | "completed";
  approverId: number;
  approvedAt: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  await db.update(annualPlans).set(data).where(eq(annualPlans.id, id));
  return { success: true };
}

// --- Initialize Default Meeting Types ---

export async function initDefaultMeetingTypes() {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };

  // Check if meeting types already exist
  const existing = await db.select().from(meetingTypes).limit(1000);
  if (existing.length > 0) {
    return { success: true, message: "Meeting types already initialized", count: existing.length };
  }

  // Default meeting types for industrial equipment company
  const defaultTypes = [
    // Company Level
    { name: "公司年度总结会", code: "COM-ANNUAL", level: "company" as const, frequency: "yearly" as const, defaultDuration: 240, description: "年度工作总结与新年规划", sortOrder: 1 },
    { name: "公司季度经营会", code: "COM-QUARTER", level: "company" as const, frequency: "quarterly" as const, defaultDuration: 180, description: "季度经营分析与目标回顾", sortOrder: 2 },
    { name: "公司月度例会", code: "COM-MONTHLY", level: "company" as const, frequency: "monthly" as const, defaultDuration: 120, defaultDayOfWeek: 1, description: "月度工作汇报与计划", sortOrder: 3 },
    { name: "公司周会", code: "COM-WEEKLY", level: "company" as const, frequency: "weekly" as const, defaultDuration: 60, defaultDayOfWeek: 1, defaultStartTime: "09:00", description: "每周工作进度同步", sortOrder: 4 },
    
    // Department Level
    { name: "部门周例会", code: "DEPT-WEEKLY", level: "department" as const, frequency: "weekly" as const, defaultDuration: 60, defaultDayOfWeek: 2, defaultStartTime: "14:00", description: "部门内部周工作汇报", sortOrder: 10 },
    { name: "部门月度总结", code: "DEPT-MONTHLY", level: "department" as const, frequency: "monthly" as const, defaultDuration: 90, description: "部门月度工作总结", sortOrder: 11 },
    { name: "销售部晨会", code: "SALES-DAILY", level: "department" as const, frequency: "daily" as const, defaultDuration: 15, defaultStartTime: "08:30", description: "销售团队每日站会", sortOrder: 12 },
    
    // Project Level
    { name: "项目启动会", code: "PROJ-KICK", level: "project" as const, frequency: "adhoc" as const, defaultDuration: 120, description: "项目启动与目标确认", sortOrder: 20 },
    { name: "项目周会", code: "PROJ-WEEKLY", level: "project" as const, frequency: "weekly" as const, defaultDuration: 60, description: "项目进度跟踪与问题解决", sortOrder: 21 },
    { name: "设计评审会", code: "PROJ-REVIEW", level: "project" as const, frequency: "adhoc" as const, defaultDuration: 90, description: "设计方案评审", sortOrder: 22 },
    { name: "项目验收会", code: "PROJ-ACCEPT", level: "project" as const, frequency: "adhoc" as const, defaultDuration: 120, description: "项目交付验收", sortOrder: 23 },
    
    // Team Level
    { name: "班组早会", code: "TEAM-DAILY", level: "team" as const, frequency: "daily" as const, defaultDuration: 10, defaultStartTime: "08:00", description: "班组每日工作安排", sortOrder: 30 },
    { name: "班组周总结", code: "TEAM-WEEKLY", level: "team" as const, frequency: "weekly" as const, defaultDuration: 30, defaultDayOfWeek: 5, description: "班组周工作总结", sortOrder: 31 },
    
    // Personal Level
    { name: "一对一面谈", code: "PERS-1ON1", level: "personal" as const, frequency: "biweekly" as const, defaultDuration: 30, description: "上下级一对一沟通", sortOrder: 40 },
    { name: "绩效面谈", code: "PERS-PERF", level: "personal" as const, frequency: "quarterly" as const, defaultDuration: 60, description: "绩效评估与反馈", sortOrder: 41 },
  ];

  // Insert meeting types
  for (const type of defaultTypes) {
    await db.insert(meetingTypes).values({
      ...type,
      isActive: 1,
    });
  }

  return { 
    success: true, 
    message: `Successfully initialized ${defaultTypes.length} meeting types`,
    count: defaultTypes.length 
  };
}


// ==================== Meeting Reminders ====================

/**
 * Create a meeting reminder
 */
export async function createMeetingReminder(data: InsertMeetingReminder) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(meetingReminders).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get reminders for a meeting
 */
export async function getMeetingReminders(meetingId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(meetingReminders).where(eq(meetingReminders.meetingId, meetingId)).limit(1000);
}

/**
 * Get pending reminders that need to be sent
 */
export async function getPendingReminders() {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(meetingReminders).where(eq(meetingReminders.isSent, 0)).limit(1000);
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(id: number, result: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(meetingReminders)
    .set({ isSent: 1, sentAt: new Date().toISOString(), sendResult: result })
    .where(eq(meetingReminders.id, id));
  return { success: true };
}

// ==================== Training Assessments ====================

/**
 * Create a training assessment
 */
export async function createTrainingAssessment(data: InsertTrainingAssessment) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(trainingAssessments).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get assessments for a training
 */
export async function getTrainingAssessments(trainingId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(trainingAssessments).where(eq(trainingAssessments.trainingId, trainingId)).limit(1000);
}

/**
 * Update training assessment
 */
export async function updateTrainingAssessment(id: number, data: Partial<InsertTrainingAssessment>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(trainingAssessments).set(data).where(eq(trainingAssessments.id, id));
  return { success: true };
}

/**
 * Submit assessment result
 */
export async function submitAssessmentResult(data: InsertTrainingAssessmentResult) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get assessment to check passing score
  const [assessment] = await db.select().from(trainingAssessments).where(eq(trainingAssessments.id, data.assessmentId));
  const isPassed = data.score >= (assessment?.passingScore || 60) ? 1 : 0;
  
  const result = await db.insert(trainingAssessmentResults).values({
    ...data,
    isPassed,
  });
  return { id: result[0].insertId, isPassed: isPassed === 1 };
}

/**
 * Get assessment results for a participant
 */
export async function getParticipantAssessmentResults(participantId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(trainingAssessmentResults).where(eq(trainingAssessmentResults.participantId, participantId)).limit(1000);
}

/**
 * Get assessment statistics
 */
export async function getAssessmentStatistics(assessmentId: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db.select().from(trainingAssessmentResults).where(eq(trainingAssessmentResults.assessmentId, assessmentId)).limit(1000);

  if (results.length === 0) {
    return { totalParticipants: 0, passedCount: 0, averageScore: 0, passRate: 0 };
  }
  
  const passedCount = results.filter(r => r.isPassed === 1).length;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  
  return {
    totalParticipants: results.length,
    passedCount,
    averageScore: Math.round(totalScore / results.length * 10) / 10,
    passRate: Math.round(passedCount / results.length * 100),
  };
}

// ==================== Training Certificates ====================

/**
 * Issue a certificate
 */
export async function issueCertificate(data: InsertTrainingCertificate) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(trainingCertificates).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get certificates for a participant
 */
export async function getParticipantCertificates(participantId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(trainingCertificates)
    .where(eq(trainingCertificates.participantId, participantId))
    .orderBy(desc(trainingCertificates.issueDate))
    .limit(1000);
}

/**
 * Get certificate by number
 */
export async function getCertificateByNumber(certificateNo: string) {
  const db = await requireDb();
  if (!db) return null;
  
  const [cert] = await db.select().from(trainingCertificates).where(eq(trainingCertificates.certificateNo, certificateNo)).limit(1000);
  return cert || null;
}

/**
 * Update certificate status
 */
export async function updateCertificateStatus(id: number, status: "active" | "expired" | "revoked") {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(trainingCertificates).set({ status }).where(eq(trainingCertificates.id, id));
  return { success: true };
}

// ==================== Cost Alert Rules ====================

/**
 * Create a cost alert rule
 */
export async function createCostAlertRule(data: InsertCostAlertRule) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(costAlertRules).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get all active cost alert rules
 */
export async function getActiveCostAlertRules() {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(costAlertRules).where(eq(costAlertRules.isActive, 1)).limit(1000);
}

/**
 * Get cost alert rules for a project
 */
export async function getProjectCostAlertRules(projectId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(costAlertRules).where(
    or(
      eq(costAlertRules.scope, "all"),
      and(eq(costAlertRules.scope, "project"), eq(costAlertRules.projectId, projectId))
    )
  ).limit(1000);
}

/**
 * Get cost alert rule by ID
 */
export async function getCostAlertRuleById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const [rule] = await db.select().from(costAlertRules).where(eq(costAlertRules.id, id));
  return rule || null;
}

/**
 * Update cost alert rule (with automatic version saving)
 */
export async function updateCostAlertRule(id: number, data: Partial<InsertCostAlertRule>, userId?: number) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get current rule state before update
  const currentRule = await getCostAlertRuleById(id);
  if (currentRule) {
    // Save current state as a version before updating
    await saveRuleVersion(id, currentRule, userId, '规则更新');
  }
  
  await db.update(costAlertRules).set(data).where(eq(costAlertRules.id, id));
  return { success: true };
}

/**
 * Delete cost alert rule
 */
export async function deleteCostAlertRule(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.delete(costAlertRules).where(eq(costAlertRules.id, id));
  return { success: true };
}

// ==================== Cost Alert Logs ====================

/**
 * Create a cost alert log
 */
export async function createCostAlertLog(data: InsertCostAlertLog) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(costAlertLogs).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get cost alert logs for a project
 */
export async function getProjectCostAlertLogs(projectId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(costAlertLogs)
    .where(eq(costAlertLogs.projectId, projectId))
    .orderBy(desc(costAlertLogs.createdAt))
    .limit(1000);
}

/**
 * Get pending cost alerts
 */
export async function getPendingCostAlerts() {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(costAlertLogs).where(eq(costAlertLogs.status, "pending")).limit(1000);
}

/**
 * Update cost alert status
 */
export async function updateCostAlertStatus(id: number, status: "pending" | "acknowledged" | "resolved" | "ignored", handlerId?: number, handleNote?: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(costAlertLogs).set({
    status,
    handlerId,
    handleNote,
    handledAt: new Date().toISOString(),
  }).where(eq(costAlertLogs.id, id));
  return { success: true };
}

/**
 * Check cost alerts for a project and create logs if thresholds are exceeded
 * Also sends webhook notifications for cost_alert event type
 */
export async function checkProjectCostAlerts(projectId: number, sendWebhook: boolean = true) {
  const db = await requireDb();
  if (!db) return [];
  
  // Get project cost summary
  const summary = await getProjectCostSummary(projectId);
  if (!summary) return [];
  
  // Get project info for webhook
  const project = await getProjectById(projectId);
  
  // Get applicable rules
  const rules = await getProjectCostAlertRules(projectId);
  const alerts: InsertCostAlertLog[] = [];
  
  for (const rule of rules) {
    let shouldAlert = false;
    let currentValue = 0;
    
    switch (rule.alertType) {
      case "budget_percent":
        currentValue = summary.budgetUtilization;
        shouldAlert = currentValue >= rule.threshold;
        break;
      case "absolute_amount":
        currentValue = summary.totalActualCost;
        shouldAlert = currentValue >= rule.threshold;
        break;
      case "cpi":
        currentValue = Math.round(summary.cpi * 100); // Store as percentage
        shouldAlert = summary.cpi < (rule.threshold / 100); // CPI below threshold is bad
        break;
    }
    
    if (shouldAlert) {
      alerts.push({
        ruleId: rule.id,
        projectId,
        alertLevel: rule.alertLevel,
        title: `成本预警: ${rule.name}`,
        content: `项目成本已触发预警规则"${rule.name}"。当前值: ${currentValue}, 阈值: ${rule.threshold}`,
        currentValue,
        thresholdValue: rule.threshold,
        status: "pending",
        isNotified: 0,
      });
    }
  }
  
  // Create alert logs and send webhooks
  for (const alert of alerts) {
    const logResult = await createCostAlertLog(alert);
    
    // Send webhook notification if enabled
    if (sendWebhook && logResult) {
      try {
        const enabledWebhooks = await getEnabledWebhooksByEvent("cost_alert");
        if (enabledWebhooks.length > 0) {
          const webhookModule = await import('../webhook');
          const sendFn = (webhookModule as any).sendCostAlertWebhook || (webhookModule as any).broadcastWebhookMessage;
          if (sendFn) await sendFn(
            enabledWebhooks.map((c: WebhookConfig) => ({
              type: c.type as 'wecom' | 'dingtalk' | 'feishu' | 'custom',
              webhookUrl: c.webhookUrl,
              enabled: c.enabled,
              name: c.name
            })),
            {
              title: alert.title,
              projectName: project?.name || `项目#${projectId}`,
              alertLevel: alert.alertLevel as 'info' | 'warning' | 'critical',
              currentValue: alert.currentValue,
              thresholdValue: alert.thresholdValue,
              ruleName: rules.find(r => r.id === alert.ruleId)?.name || '未知规则',
              content: alert.content
            }
          );
          
          // Update notification status
          if (logResult.id) {
            await db.update(costAlertLogs)
              .set({ isNotified: 1 })
              .where(eq(costAlertLogs.id, logResult.id));
          }
        }
      } catch (error) {
        log.error({ err: error }, "Cost alert webhook failed to send");
      }
    }
  }
  
  return alerts;
}

/**
 * Initialize default cost alert rules
 */
export async function initDefaultCostAlertRules() {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };
  
  // Check if rules already exist
  const existing = await db.select().from(costAlertRules).limit(1000);
  if (existing.length > 0) {
    return { success: false, message: "Cost alert rules already initialized", count: existing.length };
  }
  
  const defaultRules: InsertCostAlertRule[] = [
    {
      name: "预算使用率80%预警",
      description: "当项目成本达到预算的80%时发出警告",
      scope: "all",
      alertType: "budget_percent",
      threshold: 80,
      alertLevel: "warning",
      notifyType: "system",
      isActive: 1,
    },
    {
      name: "预算使用率95%严重预警",
      description: "当项目成本达到预算的95%时发出严重预警",
      scope: "all",
      alertType: "budget_percent",
      threshold: 95,
      alertLevel: "critical",
      notifyType: "both",
      isActive: 1,
    },
    {
      name: "预算超支紧急预警",
      description: "当项目成本超过预算时发出紧急预警",
      scope: "all",
      alertType: "budget_percent",
      threshold: 100,
      alertLevel: "emergency",
      notifyType: "both",
      isActive: 1,
    },
    {
      name: "CPI低于0.9预警",
      description: "当成本绩效指数低于0.9时发出警告",
      scope: "all",
      alertType: "cpi",
      threshold: 90, // 0.9 * 100
      alertLevel: "warning",
      notifyType: "system",
      isActive: 1,
    },
    {
      name: "CPI低于0.8严重预警",
      description: "当成本绩效指数低于0.8时发出严重预警",
      scope: "all",
      alertType: "cpi",
      threshold: 80, // 0.8 * 100
      alertLevel: "critical",
      notifyType: "both",
      isActive: 1,
    },
  ];
  
  for (const rule of defaultRules) {
    await db.insert(costAlertRules).values(rule);
  }
  
  return { success: true, message: `Successfully initialized ${defaultRules.length} cost alert rules`, count: defaultRules.length };
}


// ==================== Meeting Reminder Sending Logic ====================

/**
 * Get reminders that need to be sent (based on meeting start time and reminder minutes)
 * This function checks for reminders where:
 * 1. The reminder has not been sent yet (isSent = 0)
 * 2. The meeting start time minus reminder minutes is less than or equal to current time
 */
export async function getRemindersToSend() {
  const db = await requireDb();
  if (!db) return [];
  
  const now = new Date();
  
  // Get all pending reminders with their meeting info
  const pendingReminders = await db.select({
    reminder: meetingReminders,
    meeting: meetingSchedules
  })
  .from(meetingReminders)
  .innerJoin(meetingSchedules, eq(meetingReminders.meetingId, meetingSchedules.id))
  .where(eq(meetingReminders.isSent, 0))
  .limit(1000);
  
  // Filter reminders that should be sent now
  return pendingReminders.filter(item => {
    const meetingStart = new Date(item.meeting.startTime);
    const reminderTime = new Date(meetingStart.getTime() - (item.reminder.reminderMinutes * 60 * 1000));
    return reminderTime <= now;
  });
}

/**
 * Process and send pending meeting reminders
 * This is the main function to be called by a scheduled task
 */
export async function processMeetingReminders() {
  const remindersToSend = await getRemindersToSend();
  const results: Array<{ reminderId: number; success: boolean; message: string }> = [];
  
  for (const item of remindersToSend) {
    try {
      const { reminder, meeting } = item;
      
      // Get meeting attendees
      const attendees = await getMeetingAttendees(meeting.id);
      
      // Prepare notification content
      const notificationTitle = `会议提醒: ${meeting.title}`;
      const notificationContent = `
您有一个会议即将开始：
- 会议主题: ${meeting.title}
- 开始时间: ${new Date(meeting.startTime).toLocaleString('zh-CN')}
- 会议地点: ${meeting.location || '未指定'}
- 会议描述: ${meeting.description || '无'}
      `.trim();
      
      // Send notifications based on reminder type
      let sendResult = '';
      
      if (reminder.reminderType === 'email' || reminder.reminderType === 'both') {
        // TODO: Integrate with email service
        // For now, log the email notification
        log.info({ meetingTitle: meeting.title, attendeeCount: attendees.length }, "Email reminder queued");
        sendResult += 'email_queued;';
      }
      
      if (reminder.reminderType === 'system' || reminder.reminderType === 'both') {
        // Use the built-in notification system
        try {
          const { notifyOwner } = await import('../_core/notification');
          await notifyOwner({
            title: notificationTitle,
            content: notificationContent
          });
          sendResult += 'system_sent;';
        } catch (notifyError) {
          log.error({ err: notifyError }, "System notification failed");
          sendResult += 'system_failed;';
        }
      }
      
      // Send to configured webhooks
      try {
        const webhookConfigs = await getEnabledWebhooksByEvent('meeting_reminder');
        if (webhookConfigs.length > 0) {
          const { broadcastWebhookMessage } = await import('../webhook');
          const webhookResult = await broadcastWebhookMessage(
            webhookConfigs.map(c => ({
              type: c.type as 'wecom' | 'dingtalk' | 'feishu' | 'custom',
              webhookUrl: c.webhookUrl,
              enabled: c.enabled,
              name: c.name,
            })) as any,
            {
              title: notificationTitle,
              content: notificationContent,
            }
          );
          const whRes = webhookResult as any;
          sendResult += `webhook_sent:${whRes.successful ?? 0}/${whRes.total ?? 0};`;

          // Log webhook deliveries
          for (const result of (whRes.results || [])) {
            const config = webhookConfigs.find(c => c.name === result.name);
            if (config) {
              await logWebhookDelivery({
                webhookId: config.id,
                eventType: 'meeting_reminder',
                payload: JSON.stringify({ title: notificationTitle, content: notificationContent }),
                success: result.success ? 1 : 0,
              });
            }
          }
        }
      } catch (webhookError) {
        log.error({ err: webhookError }, "Webhook notification failed");
        sendResult += 'webhook_failed;';
      }
      
      // Mark reminder as sent
      await markReminderSent(reminder.id, sendResult);
      
      results.push({
        reminderId: reminder.id,
        success: true,
        message: sendResult
      });
    } catch (error) {
      log.error({ err: error }, "Reminder processing failed");
      results.push({
        reminderId: item.reminder.id,
        success: false,
        message: String(error)
      });
    }
  }
  
  return {
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results
  };
}

/**
 * Create reminders for a meeting based on meeting schedule
 * Called when a meeting is created with reminderMinutes set
 */
export async function createMeetingRemindersFromSchedule(meetingId: number, reminderMinutes: number, reminderType: 'email' | 'system' | 'both' = 'system') {
  const db = await requireDb();
  if (!db) return null;
  
  // Check if reminder already exists
  const existing = await db.select()
    .from(meetingReminders)
    .where(and(
      eq(meetingReminders.meetingId, meetingId),
      eq(meetingReminders.reminderMinutes, reminderMinutes)
    ))
    .limit(1000);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create new reminder
  const result = await db.insert(meetingReminders).values({
    meetingId,
    reminderMinutes,
    reminderType,
    isSent: 0
  });
  
  return { id: result[0].insertId, meetingId, reminderMinutes, reminderType };
}

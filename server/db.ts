import { eq, desc, or, like, and, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  InsertUser, users, feedback, InsertFeedback, analyticsEvents, InsertAnalyticsEvent, 
  migrationTasks, InsertMigrationTask, MigrationTask,
  // Project Management (v1.2)
  projects, InsertProject, Project,
  projectPhases, InsertProjectPhase, ProjectPhase,
  projectGates, InsertProjectGate, ProjectGate,
  projectMilestones, InsertProjectMilestone, ProjectMilestone,
  projectTasks, InsertProjectTask, ProjectTask,
  projectTeamMembers, InsertProjectTeamMember, ProjectTeamMember,
  projectDocuments, InsertProjectDocument, ProjectDocument,
  // Cost Management (v1.3)
  costCategories, InsertCostCategory, CostCategory,
  projectBudgets, InsertProjectBudget, ProjectBudget,
  costRecords, InsertCostRecord, CostRecord,
  costEstimates, InsertCostEstimate, CostEstimate,
  laborCosts, InsertLaborCost, LaborCost,
  costVarianceAnalysis, InsertCostVarianceAnalysis, CostVarianceAnalysis,
  // Meeting Reminders
  meetingReminders, InsertMeetingReminder, MeetingReminder,
  // Training Assessments & Certificates
  trainingAssessments, InsertTrainingAssessment, TrainingAssessment,
  trainingAssessmentResults, InsertTrainingAssessmentResult, TrainingAssessmentResult,
  trainingCertificates, InsertTrainingCertificate, TrainingCertificate,
  // Cost Alerts
  costAlertRules, InsertCostAlertRule, CostAlertRule,
  costAlertLogs, InsertCostAlertLog, CostAlertLog,
  // Annual Planning Management
  annualPlanningConfigs, InsertAnnualPlanningConfig, AnnualPlanningConfig,
  annualPlanningItems, InsertAnnualPlanningItem, AnnualPlanningItem,
  annualPlanningUpdateLogs, InsertAnnualPlanningUpdateLog, AnnualPlanningUpdateLog,
  // Webhook Configuration
  webhookConfigs, InsertWebhookConfig, WebhookConfig,
  webhookLogs, InsertWebhookLog, WebhookLog,
  // v1.3.9 - Webhook Conditions, Dependencies, Rule Versions
  webhookTriggerConditions, InsertWebhookTriggerCondition, WebhookTriggerCondition,
  annualPlanningDependencies, InsertAnnualPlanningDependency, AnnualPlanningDependency,
  costAlertRuleVersions, InsertCostAlertRuleVersion, CostAlertRuleVersion,
  // HRM Intelligent System
  hrmEmployees, InsertHrmEmployee, HrmEmployee,
  hrmPositions, InsertHrmPosition, HrmPosition,
  hrmTrainingPlans, InsertHrmTrainingPlan, HrmTrainingPlan,
  hrmTrainingTests, InsertHrmTrainingTest, HrmTrainingTest,
  hrmPerformanceReviewReminders, InsertHrmPerformanceReviewReminder, HrmPerformanceReviewReminder,
  hrmCandidates, InsertHrmCandidate, HrmCandidate,
  hrmAiInterviewRecords, InsertHrmAiInterviewRecord, HrmAiInterviewRecord,
  hrmDigitalAgentModels, InsertHrmDigitalAgentModel, HrmDigitalAgentModel,
  hrmSalaryStructures, InsertHrmSalaryStructure, HrmSalaryStructure,
  hrmPerformanceGrades, InsertHrmPerformanceGrade, HrmPerformanceGrade,
  hrmDocumentFiles, InsertHrmDocumentFile, HrmDocumentFile,
  // AI Assistant Dual-Layer Architecture (v2.1.0)
  employeeDigitalAssistants, InsertEmployeeDigitalAssistant, EmployeeDigitalAssistant,
  functionalAiAssistants, InsertFunctionalAiAssistant, FunctionalAiAssistant,
  aiProcessSuggestions, InsertAiProcessSuggestion, AiProcessSuggestion,
  aiSuggestionExecutionLogs, InsertAiSuggestionExecutionLog, AiSuggestionExecutionLog,
  // BU Sales Target Planning
  buSalesPlans, InsertBuSalesPlan, BuSalesPlan,
  buSalesPlanDetails, InsertBuSalesPlanDetail, BuSalesPlanDetail,
  buSalesPlanAdjustments, InsertBuSalesPlanAdjustment, BuSalesPlanAdjustment,
  aiTasks, AiTask, InsertAiTask,
} from "../drizzle/schema";

import { ENV } from './_core/env';
import { createChildLogger } from './lib/logger';

const log = createChildLogger("db");

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    const connUrl = process.env.DATABASE_URL;
    // Safety: prevent dev/test from accidentally connecting to production
    if (!ENV.isProduction && connUrl.includes("grt_prod_db")) {
      log.error({ nodeEnv: ENV.nodeEnv }, "SAFETY HALT: DATABASE_URL points to production. Refusing to connect");
      return null;
    }
    try {
      const pool = new pg.Pool({
        connectionString: connUrl,
        // Ensure UTF-8 on Windows where system code page may be GBK/CP936
        options: '-c client_encoding=UTF8',
      });
      _db = drizzle(pool);
      log.info({ nodeEnv: ENV.nodeEnv }, "PostgreSQL connected");
    } catch (error) {
      log.warn({ err: error }, "Failed to connect to database");
      _db = null;
    }
  }
  return _db;
}

// 辅助函数：获取数据库连接，如果不可用则抛出错误
export async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  return db;
}

// Synchronous db proxy — eagerly initializes on first property access.
// Allows routers to `import { db } from "../db"` and use `db.select()` directly
// without awaiting requireDb() in every procedure.
export const db: ReturnType<typeof drizzle> = new Proxy({} as any, {
  get(_target, prop) {
    if (!_db) {
      // Trigger lazy init synchronously — pool connects on first query, not on creation
      if (process.env.DATABASE_URL) {
        const pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          options: '-c client_encoding=UTF8',
        });
        _db = drizzle(pool);
      } else {
        throw new Error("Database not configured: DATABASE_URL is not set");
      }
    }
    return (_db as any)[prop];
  },
});

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await requireDb();
  if (!db) {
    log.warn("Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    log.error({ err: error }, "Failed to upsert user");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= Feedback Functions =============

export async function createFeedback(data: InsertFeedback) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot create feedback: database not available");
    return null;
  }

  try {
    const result = await db.insert(feedback).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create feedback");
    throw error;
  }
}

export async function getAllFeedback() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get feedback: database not available");
    return [];
  }

  return db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(1000);
}

export async function updateFeedbackStatus(id: number, status: "pending" | "reviewed" | "resolved") {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot update feedback: database not available");
    return null;
  }

  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
  return { success: true };
}

// ============= Analytics Functions =============

export async function trackEvent(data: InsertAnalyticsEvent) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot track event: database not available");
    return null;
  }

  try {
    await db.insert(analyticsEvents).values(data);
    return { success: true };
  } catch (error) {
    log.error({ err: error }, "Failed to track event");
    throw error;
  }
}

export async function getAnalyticsEvents(limit = 100) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get analytics: database not available");
    return [];
  }

  return db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}

// ============= Migration Tasks Functions =============

export async function createMigrationTask(data: InsertMigrationTask) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot create migration task: database not available");
    return null;
  }

  try {
    const result = await db.insert(migrationTasks).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create migration task");
    throw error;
  }
}

export async function getAllMigrationTasks() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get migration tasks: database not available");
    return [];
  }

  return db.select().from(migrationTasks).orderBy(desc(migrationTasks.createdAt)).limit(1000);
}

export async function getMigrationTaskById(id: number) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get migration task: database not available");
    return null;
  }

  const result = await db.select().from(migrationTasks).where(eq(migrationTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateMigrationTask(
  id: number,
  data: Partial<Omit<MigrationTask, "id" | "createdAt" | "updatedAt">>
) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot update migration task: database not available");
    return null;
  }

  await db.update(migrationTasks).set(data).where(eq(migrationTasks.id, id));
  return { success: true };
}

export async function deleteMigrationTask(id: number) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot delete migration task: database not available");
    return null;
  }

  await db.delete(migrationTasks).where(eq(migrationTasks.id, id));
  return { success: true };
}

export async function initDefaultMigrationTasks() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot init migration tasks: database not available");
    return null;
  }

  // Check if tasks already exist
  const existing = await db.select().from(migrationTasks).limit(1);
  if (existing.length > 0) {
    return { success: true, message: "Tasks already initialized" };
  }

  // Default migration tasks based on External Sync data
  const defaultTasks: InsertMigrationTask[] = [
    {
      moduleId: "crm_customers",
      moduleName: "客户管理",
      sourceTable: "M0-1_客户管理",
      targetTable: "customers",
      totalRecords: 350,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "crm_opportunities",
      moduleName: "商机管理",
      sourceTable: "M0-2_商机管理",
      targetTable: "opportunities",
      totalRecords: 280,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "contracts",
      moduleName: "合同管理",
      sourceTable: "M3-1_合同管理",
      targetTable: "contracts",
      totalRecords: 420,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "procurement",
      moduleName: "采购订单",
      sourceTable: "M5-1_采购订单",
      targetTable: "purchase_orders",
      totalRecords: 380,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "medium",
    },
    {
      moduleId: "employees",
      moduleName: "员工档案",
      sourceTable: "HR_员工档案",
      targetTable: "employees",
      totalRecords: 320,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "medium",
    },
  ];

  for (const task of defaultTasks) {
    await db.insert(migrationTasks).values(task);
  }

  return { success: true, message: "Default tasks initialized" };
}


// ============= CRM Module Functions =============

import { 
  crmCustomers, InsertCrmCustomer, CrmCustomer,
  crmContacts, InsertCrmContact, CrmContact,
  crmOpportunities, InsertCrmOpportunity, CrmOpportunity,
  crmBantScores, InsertCrmBantScore,
  crmFollowUps, InsertCrmFollowUp,
  devTasks, InsertDevTask, DevTask
} from "../drizzle/schema";
// --- Customers ---

export async function createCustomer(data: InsertCrmCustomer) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate customer code
    const count = await db.select({ count: sql<number>`count(*)` }).from(crmCustomers);
    const code = `CUS${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(crmCustomers).values({
      ...data,
      customerCode: code,
    });
    return { id: result[0].insertId, customerCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create customer");
    throw error;
  }
}

export async function getAllCustomers(filters?: {
  type?: string;
  level?: string;
  status?: string;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmCustomers);
  
  const conditions = [];
  if (filters?.type) {
    conditions.push(eq(crmCustomers.type, filters.type as any));
  }
  if (filters?.level) {
    conditions.push(eq(crmCustomers.level, filters.level as any));
  }
  if (filters?.status) {
    conditions.push(eq(crmCustomers.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmCustomers.name, `%${filters.search}%`),
        like(crmCustomers.customerCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmCustomers.createdAt)).limit(1000);
}

export async function getCustomerById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmCustomers).where(eq(crmCustomers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCustomer(id: number, data: Partial<Omit<CrmCustomer, "id" | "createdAt" | "updatedAt" | "customerCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmCustomers).set(data).where(eq(crmCustomers.id, id));
  return { success: true };
}

export async function deleteCustomer(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmCustomers).where(eq(crmCustomers.id, id));
  return { success: true };
}

// --- Contacts ---

export async function createContact(data: InsertCrmContact) {
  const db = await requireDb();
  if (!db) return null;

  try {
    const result = await db.insert(crmContacts).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create contact");
    throw error;
  }
}

export async function getContactsByCustomerId(customerId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(crmContacts)
    .where(eq(crmContacts.customerId, customerId))
    .orderBy(desc(crmContacts.createdAt))
    .limit(1000);
}

export async function getAllContacts(filters?: { search?: string; customerId?: number }) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmContacts);
  
  const conditions = [];
  if (filters?.customerId) {
    conditions.push(eq(crmContacts.customerId, filters.customerId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmContacts.name, `%${filters.search}%`),
        like(crmContacts.mobile, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmContacts.createdAt)).limit(1000);
}

export async function updateContact(id: number, data: Partial<Omit<CrmContact, "id" | "createdAt" | "updatedAt">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmContacts).set(data).where(eq(crmContacts.id, id));
  return { success: true };
}

export async function deleteContact(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmContacts).where(eq(crmContacts.id, id));
  return { success: true };
}

// --- Opportunities ---

export async function createOpportunity(data: InsertCrmOpportunity) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate opportunity code
    const count = await db.select({ count: sql<number>`count(*)` }).from(crmOpportunities);
    const code = `OPP${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(crmOpportunities).values({
      ...data,
      opportunityCode: code,
    });
    return { id: result[0].insertId, opportunityCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create opportunity");
    throw error;
  }
}

export async function getAllOpportunities(filters?: {
  stage?: string;
  type?: string;
  customerId?: number;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(crmOpportunities);
  
  const conditions = [];
  if (filters?.stage) {
    conditions.push(eq(crmOpportunities.stage, filters.stage as any));
  }
  if (filters?.type) {
    conditions.push(eq(crmOpportunities.type, filters.type as any));
  }
  if (filters?.customerId) {
    conditions.push(eq(crmOpportunities.customerId, filters.customerId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(crmOpportunities.name, `%${filters.search}%`),
        like(crmOpportunities.opportunityCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(crmOpportunities.createdAt)).limit(1000);
}

export async function getOpportunityById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmOpportunities).where(eq(crmOpportunities.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateOpportunity(id: number, data: Partial<Omit<CrmOpportunity, "id" | "createdAt" | "updatedAt" | "opportunityCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(crmOpportunities).set(data).where(eq(crmOpportunities.id, id));
  return { success: true };
}

export async function deleteOpportunity(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(crmOpportunities).where(eq(crmOpportunities.id, id));
  return { success: true };
}

// --- BANT Scores ---

export async function createBantScore(data: InsertCrmBantScore) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Calculate total score
    const totalScore = (data.budgetScore || 1) + (data.authorityScore || 1) + (data.needScore || 1) + (data.timelineScore || 1);
    
    const result = await db.insert(crmBantScores).values({
      ...data,
      totalScore,
    });
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create BANT score");
    throw error;
  }
}

export async function getBantScoreByOpportunityId(opportunityId: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(crmBantScores)
    .where(eq(crmBantScores.opportunityId, opportunityId))
    .orderBy(desc(crmBantScores.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateBantScore(id: number, data: Partial<InsertCrmBantScore>) {
  const db = await requireDb();
  if (!db) return null;

  // Recalculate total score if any score changed
  const totalScore = (data.budgetScore || 1) + (data.authorityScore || 1) + (data.needScore || 1) + (data.timelineScore || 1);
  
  await db.update(crmBantScores).set({ ...data, totalScore }).where(eq(crmBantScores.id, id));
  return { success: true };
}

// --- Follow-ups ---

export async function createFollowUp(data: InsertCrmFollowUp) {
  const db = await requireDb();
  if (!db) return null;

  try {
    const result = await db.insert(crmFollowUps).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create follow-up");
    throw error;
  }
}

export async function getFollowUpsByRelated(relatedType: "customer" | "opportunity", relatedId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(crmFollowUps)
    .where(and(
      eq(crmFollowUps.relatedType, relatedType),
      eq(crmFollowUps.relatedId, relatedId)
    ))
    .orderBy(desc(crmFollowUps.followedAt))
    .limit(1000);
}

// ============= Development Tasks Functions =============

export async function createDevTask(data: InsertDevTask) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate task code
    const count = await db.select({ count: sql<number>`count(*)` }).from(devTasks);
    const code = `TASK-${String(count[0].count + 1).padStart(4, '0')}`;
    
    const result = await db.insert(devTasks).values({
      ...data,
      taskCode: code,
    });
    return { id: result[0].insertId, taskCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create dev task");
    throw error;
  }
}

export async function getAllDevTasks(filters?: {
  version?: string;
  module?: string;
  status?: string;
  priority?: string;
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];

  let query = db.select().from(devTasks);
  
  const conditions = [];
  if (filters?.version) {
    conditions.push(eq(devTasks.version, filters.version));
  }
  if (filters?.module) {
    conditions.push(eq(devTasks.module, filters.module));
  }
  if (filters?.status) {
    conditions.push(eq(devTasks.status, filters.status as any));
  }
  if (filters?.priority) {
    conditions.push(eq(devTasks.priority, filters.priority as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(devTasks.title, `%${filters.search}%`),
        like(devTasks.taskCode, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(devTasks.createdAt)).limit(1000);
}

export async function getDevTaskById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(devTasks).where(eq(devTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDevTask(id: number, data: Partial<Omit<DevTask, "id" | "createdAt" | "updatedAt" | "taskCode">>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(devTasks).set(data).where(eq(devTasks.id, id));
  return { success: true };
}

export async function deleteDevTask(id: number) {
  const db = await requireDb();
  if (!db) return null;

  await db.delete(devTasks).where(eq(devTasks.id, id));
  return { success: true };
}

export async function initDefaultDevTasks() {
  const db = await requireDb();
  if (!db) return null;

  // Check if tasks already exist
  const existing = await db.select().from(devTasks).limit(1);
  if (existing.length > 0) {
    return { success: true, message: "Tasks already initialized" };
  }

  // Default development tasks based on version roadmap
  const defaultTasks: Omit<InsertDevTask, "taskCode">[] = [
    // v1.0 Core Infrastructure Tasks
    {
      title: "核心数据模型设计",
      description: "设计系统核心数据模型，包括用户、组织架构、权限等基础表",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现核心数据模型。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：
   - organizations (组织架构)
   - departments (部门)
   - roles (角色)
   - permissions (权限)
   - role_permissions (角色权限关联)

2. 执行 pnpm db:push 同步数据库

3. 在 server/db.ts 中添加基础CRUD函数

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md
- docs/GRT_Architecture_Upgrade_Plan.md

## 验收标准
- 数据库表创建成功
- 基础CRUD函数可用
- 通过 pnpm test 测试`,
      acceptanceCriteria: "1. 数据库表创建成功\n2. 基础CRUD函数可用\n3. 通过pnpm test测试",
    },
    {
      title: "基础API框架搭建",
      description: "搭建tRPC API框架，实现认证、授权、日志中间件",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 12,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中完善API框架。

## 任务要求
1. 在 server/routers.ts 中添加：
   - adminProcedure (管理员权限检查)
   - loggedProcedure (操作日志记录)
   - rateLimitedProcedure (限流保护)

2. 实现统一错误处理

3. 添加请求日志中间件

## 验收标准
- 权限检查正常工作
- 操作日志记录完整
- 错误响应格式统一`,
      acceptanceCriteria: "1. 权限检查正常工作\n2. 操作日志记录完整\n3. 错误响应格式统一",
    },
    {
      title: "前端框架搭建",
      description: "搭建前端基础框架，包括路由、状态管理、UI组件库",
      version: "v1.0",
      module: "core",
      type: "feature",
      priority: "critical",
      status: "done",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中完善前端框架。

## 任务要求
1. 在 client/src/App.tsx 中配置路由结构
2. 在 client/src/contexts/ 中添加全局状态管理
3. 在 client/src/components/ 中创建通用UI组件
4. 配置Tailwind主题和样式变量

## 验收标准
- 路由导航正常
- 主题切换可用
- 响应式布局正常`,
      acceptanceCriteria: "1. 路由导航正常\n2. 主题切换可用\n3. 响应式布局正常",
    },
    // v1.1 CRM Tasks
    {
      title: "客户管理CRUD接口",
      description: "实现客户的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM客户管理。

## 任务要求
1. 在 server/routers.ts 中添加crm路由：
   - crm.customer.create
   - crm.customer.list
   - crm.customer.getById
   - crm.customer.update
   - crm.customer.delete

2. 在 server/db.ts 中实现数据库操作

3. 支持筛选：客户类型、等级、状态

## 参考数据结构
- drizzle/schema.ts 中的 crmCustomers 表

## 验收标准
- 所有CRUD接口可用
- 筛选功能正常
- 通过 pnpm test 测试`,
      acceptanceCriteria: "1. 所有CRUD接口可用\n2. 支持按类型、等级、状态筛选\n3. 支持关键词搜索",
    },
    {
      title: "联系人管理CRUD接口",
      description: "实现联系人的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 6,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM联系人管理。

## 任务要求
1. 在 server/routers.ts 中添加contact路由：
   - crm.contact.create
   - crm.contact.list
   - crm.contact.getById
   - crm.contact.update
   - crm.contact.delete

2. 联系人必须关联客户(customerId)

3. 支持按客户筛选联系人

## 参考数据结构
- drizzle/schema.ts 中的 crmContacts 表

## 验收标准
- 联系人关联客户
- 支持按客户筛选联系人`,
      acceptanceCriteria: "1. 联系人关联客户\n2. 支持按客户筛选联系人",
    },
    {
      title: "商机管理CRUD接口",
      description: "实现商机的创建、读取、更新、删除API接口",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM商机管理。

## 任务要求
1. 在 server/routers.ts 中添加opportunity路由：
   - crm.opportunity.create
   - crm.opportunity.list
   - crm.opportunity.getById
   - crm.opportunity.update
   - crm.opportunity.updateStage (阶段流转)
   - crm.opportunity.delete

2. 实现商机阶段流转：
   - 线索 -> 商机 -> 方案 -> 报价 -> 谈判 -> 赢单/输单

3. 实现BANT评分：
   - Budget(预算) / Authority(决策权) / Need(需求) / Timeline(时间线)

## 参考数据结构
- drizzle/schema.ts 中的 crmOpportunities, crmBantScores 表

## 验收标准
- 商机关联客户和联系人
- 阶段流转正常
- BANT评分可用`,
      acceptanceCriteria: "1. 商机关联客户和联系人\n2. 支持阶段流转\n3. 支持BANT评分",
    },
    {
      title: "CRM前端页面开发",
      description: "开发客户、联系人、商机的管理页面",
      version: "v1.1",
      module: "crm",
      type: "feature",
      priority: "high",
      status: "done",
      estimatedHours: 24,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现CRM前端页面。

## 任务要求
1. 创建以下页面：
   - client/src/pages/CrmCustomers.tsx (客户列表)
   - client/src/pages/CrmContacts.tsx (联系人管理)
   - client/src/pages/CrmOpportunities.tsx (商机管道)

2. 客户列表功能：
   - 表格展示客户信息
   - 支持筛选（类型、等级、状态）
   - 支持搜索
   - 新建/编辑客户弹窗

3. 商机管道功能：
   - Kanban看板展示商机阶段
   - 支持拖拽切换阶段
   - 商机详情弹窗

4. 在 App.tsx 中添加路由
5. 在 Layout.tsx 中添加导航

## 验收标准
- 客户列表支持筛选和搜索
- 商机看板展示正常
- 响应式设计`,
      acceptanceCriteria: "1. 客户列表支持筛选和搜索\n2. 商机看板支持拖拽\n3. 响应式设计",
    },
    // v1.2 Project Tasks
    {
      title: "项目管理数据库Schema",
      description: "设计项目管理模块的数据库表结构",
      version: "v1.2",
      module: "project",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现项目管理数据库Schema。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：

### projects 项目表
- id, projectCode, name, description
- customerId (关联客户)
- opportunityId (关联商机)
- type: internal/external/rd
- status: planning/active/on_hold/completed/cancelled
- currentPhase: M0-M12
- startDate, endDate, actualEndDate
- budget, actualCost
- managerId, createdBy
- createdAt, updatedAt

### project_phases 项目阶段表
- id, projectId, phaseCode (M0-M12)
- name, description
- status: pending/in_progress/completed/skipped
- plannedStartDate, plannedEndDate
- actualStartDate, actualEndDate
- gateCheckPassed: boolean
- gateCheckDate, gateCheckBy
- notes

### project_tasks 项目任务表
- id, projectId, phaseId, taskCode
- title, description
- type: task/milestone/deliverable
- status: todo/in_progress/review/done
- priority: critical/high/medium/low
- assigneeId, estimatedHours, actualHours
- startDate, dueDate, completedDate
- dependencies (JSON)

### project_milestones 里程碑表
- id, projectId, phaseId, name
- description, dueDate, completedDate
- status: pending/completed/overdue
- deliverables (JSON)

2. 执行 pnpm db:push 同步数据库

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md 第三章 数据模型设计
- 外部数据平台项目管理结构: external_sync_extraction/project_management_structure.md

## 验收标准
- 数据库表创建成功
- 字段类型和约束正确
- 外键关系正确`,
    },
    {
      title: "M0-M12阶段门禁",
      description: "实现项目从M0到M12的阶段门禁管控",
      version: "v1.2",
      module: "project",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现M0-M12阶段门禁。

## 任务要求
1. 在 drizzle/schema.ts 中添加：
   - phase_gate_items (门禁检查项)
   - phase_gate_checks (门禁检查记录)

2. 实现门禁检查逻辑：
   - 每个阶段有预定义的检查项
   - 所有检查项通过才能进入下一阶段
   - 支持强制跳过(需管理员审批)

3. M0-M12阶段定义：
   - M0: 市场触达与线索
   - M1: 机会评估与售前方案
   - M2: 技术方案与报价
   - M3: 合同签订与项目启动
   - M4: 设计评审
   - M5: 采购与外协
   - M6: 生产制造
   - M7: 装配调试
   - M8: FAT工厂验收
   - M9: 发货与安装
   - M10: SAT现场验收
   - M11: 试运行
   - M12: 终验与移交

## 参考文档
- external_sync_extraction/project_management_structure.md

## 验收标准
- 门禁检查逻辑正确
- 支持强制跳过
- 检查记录可追溯`,
    },
    // v1.3 Cost Management Tasks
    {
      title: "成本管理数据库Schema",
      description: "设计成本管理模块的数据库表结构",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本管理数据库Schema。

## 任务要求
1. 在 drizzle/schema.ts 中设计以下表：

### cost_categories 成本科目表
- id, code, name, parentId
- type: direct_material/direct_labor/manufacturing_overhead/period_cost
- description, isActive

### cost_budgets 预算表
- id, projectId, phaseId, categoryId
- budgetAmount, currency
- startDate, endDate
- status: draft/approved/locked
- approvedBy, approvedAt
- notes

### cost_actuals 实际成本表
- id, projectId, phaseId, categoryId
- amount, currency, quantity, unitPrice
- costDate, description
- sourceType: purchase/labor/expense/other
- sourceId (关联采购单/工时单等)
- createdBy, createdAt

### cost_reports 成本报表表
- id, projectId, reportType: monthly/quarterly/final
- periodStart, periodEnd
- totalBudget, totalActual, variance
- status: draft/published
- generatedAt, generatedBy

2. 执行 pnpm db:push 同步数据库

## 参考文档
- docs/GRT_NocoBase_Development_Guide_v1.0.md 第三章

## 验收标准
- 数据库表创建成功
- 字段类型和约束正确`,
    },
    {
      title: "项目成本CRUD接口",
      description: "实现项目成本的创建、读取、更新、删除API接口",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本管理API。

## 任务要求
1. 在 server/routers.ts 中添加cost路由：

### 预算管理
- cost.budget.create
- cost.budget.list
- cost.budget.getByProject
- cost.budget.update
- cost.budget.approve
- cost.budget.lock

### 实际成本
- cost.actual.create
- cost.actual.list
- cost.actual.getByProject
- cost.actual.update
- cost.actual.delete

### 成本分析
- cost.analysis.getProjectSummary
- cost.analysis.getBudgetVsActual
- cost.analysis.getCostTrend
- cost.analysis.getCostBreakdown

2. 在 server/db.ts 中实现数据库操作

## 验收标准
- 预算CRUD可用
- 实际成本CRUD可用
- 成本分析接口返回正确数据`,
    },
    {
      title: "成本报表与可视化",
      description: "实现成本报表和图表展示",
      version: "v1.3",
      module: "cost",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: `请在 /home/ubuntu/grt-implementation-plan 项目中实现成本报表页面。

## 任务要求
1. 创建 client/src/pages/CostReports.tsx

2. 实现以下图表(使用recharts或chart.js)：
   - 预算vs实际对比柱状图
   - 成本趋势折线图(按月/周)
   - 成本结构饼图(按科目分类)
   - 项目成本排名横向条形图

3. 实现筛选功能：
   - 按项目筛选
   - 按时间范围筛选
   - 按成本科目筛选

4. 实现导出功能：
   - 导出Excel报表
   - 导出PDF报表

## 验收标准
- 图表渲染正确
- 筛选功能正常
- 导出功能可用`,
    },
    // v2.0 AI Tasks
    {
      title: "Gemini API集成",
      description: "集成Google Gemini API实现AI销售助手",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "集成Gemini API，实现销售话术推荐、客户画像分析、商机预测",
    },
    {
      title: "BANT自动评分",
      description: "基于AI分析自动生成BANT评分建议",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: "使用LLM分析商机信息，自动生成BANT评分建议",
    },
    {
      title: "AI销售助手前端界面",
      description: "创建AI销售助手的对话界面",
      version: "v2.0",
      module: "ai",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "创建AI销售助手页面，包括对话界面、历史记录、建议卡片",
    },
    // v2.1 IoT Tasks
    {
      title: "UWB定位集成",
      description: "集成UWB定位系统实现人员定位",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 24,
      claudePrompt: "集成UWB定位API，实现人员位置实时跟踪和工时自动采集",
    },
    {
      title: "CCD视觉检测集成",
      description: "集成CCD视觉检测系统实现质量检测",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "集成CCD视觉检测API，实现产品质量自动检测和缺陷识别",
    },
    {
      title: "IoT数据看板",
      description: "创建IoT数据可视化看板",
      version: "v2.1",
      module: "iot",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "创建IoT数据看板，展示设备状态、位置地图、检测结果统计",
    },
    // v2.2 HR & OA Tasks
    {
      title: "人事管理数据库Schema",
      description: "设计人事管理模块的数据库表结构",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: "设计人事管理的数据库Schema，包括employees, attendance, performance表",
    },
    {
      title: "员工档案管理",
      description: "实现员工档案的CRUD操作",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 12,
      claudePrompt: "实现员工档案管理，包括入职、转正、调动、离职流程",
    },
    {
      title: "考勤管理系统",
      description: "实现考勤打卡和请假审批",
      version: "v2.2",
      module: "hr",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "实现考勤管理，包括打卡记录、请假申请、加班申请、审批流程",
    },
    // v3.0 Supply Chain Tasks
    {
      title: "供应链数据库Schema",
      description: "设计供应链管理模块的数据库表结构",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 8,
      claudePrompt: "设计供应链的数据库Schema，包括suppliers, purchase_orders, inventory表",
    },
    {
      title: "采购管理系统",
      description: "实现采购订单的全流程管理",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 20,
      claudePrompt: "实现采购管理，包括采购申请、供应商选择、订单跟踪、到货验收",
    },
    {
      title: "库存管理系统",
      description: "实现库存的入库、出库、盘点管理",
      version: "v3.0",
      module: "scm",
      type: "feature",
      priority: "low",
      status: "backlog",
      estimatedHours: 16,
      claudePrompt: "实现库存管理，包括入库单、出库单、库存盘点、库存预警",
    },
  ];

  for (const task of defaultTasks) {
    const count = await db.select({ count: sql<number>`count(*)` }).from(devTasks);
    const code = `TASK-${String(count[0].count + 1).padStart(4, '0')}`;
    await db.insert(devTasks).values({ ...task, taskCode: code });
  }

  return { success: true, message: "Default dev tasks initialized" };
}


// ============= Project Management Functions (v1.2) =============

// --- Projects ---

export async function createProject(data: InsertProject) {
  const db = await requireDb();
  if (!db) return null;

  try {
    // Generate project code
    const count = await db.select({ count: sql<number>`count(*)` }).from(projects);
    const code = `PRJ${String(count[0].count + 1).padStart(6, '0')}`;
    
    const result = await db.insert(projects).values({ ...data, projectCode: code });
    return { id: result[0].insertId, projectCode: code };
  } catch (error) {
    log.error({ err: error }, "Failed to create project");
    throw error;
  }
}

export async function getAllProjects() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(1000);
}

export async function getProjectById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projects).set(data).where(eq(projects.id, id));
  return getProjectById(id);
}

export async function deleteProject(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projects).where(eq(projects.id, id));
  return true;
}

// --- Project Phases (M0-M12 Template) ---

export async function initDefaultProjectPhases() {
  const db = await requireDb();
  if (!db) return null;

  // Check if phases already exist
  const existing = await db.select().from(projectPhases).limit(1000);
  if (existing.length > 0) {
    return { success: false, message: "Project phases already initialized" };
  }

  const defaultPhases = [
    { phaseCode: "M0", name: "市场机会", sequence: 0, standardDuration: 14, deliverables: "市场分析报告,客户需求文档", gateChecklist: "市场规模评估,竞争分析,客户痛点确认" },
    { phaseCode: "M1", name: "立项审批", sequence: 1, standardDuration: 7, deliverables: "立项申请书,可行性分析报告", gateChecklist: "技术可行性,商业可行性,资源评估" },
    { phaseCode: "M2", name: "需求分析", sequence: 2, standardDuration: 21, deliverables: "需求规格说明书,用户故事", gateChecklist: "需求完整性,需求可追溯性,干系人确认" },
    { phaseCode: "M3", name: "概念设计", sequence: 3, standardDuration: 14, deliverables: "概念设计文档,系统架构图", gateChecklist: "设计评审通过,技术方案确认" },
    { phaseCode: "M4", name: "详细设计", sequence: 4, standardDuration: 21, deliverables: "详细设计文档,接口规格", gateChecklist: "设计评审通过,测试计划确认" },
    { phaseCode: "M5", name: "开发实施", sequence: 5, standardDuration: 60, deliverables: "源代码,单元测试报告", gateChecklist: "代码评审通过,单元测试覆盖率" },
    { phaseCode: "M6", name: "系统测试", sequence: 6, standardDuration: 21, deliverables: "测试报告,缺陷清单", gateChecklist: "测试通过率,关键缺陷修复" },
    { phaseCode: "M7", name: "用户验收", sequence: 7, standardDuration: 14, deliverables: "验收报告,用户签字", gateChecklist: "功能验收,性能验收,用户培训完成" },
    { phaseCode: "M8", name: "试运行", sequence: 8, standardDuration: 30, deliverables: "试运行报告,问题清单", gateChecklist: "系统稳定性,用户反馈处理" },
    { phaseCode: "M9", name: "正式上线", sequence: 9, standardDuration: 7, deliverables: "上线报告,运维文档", gateChecklist: "上线检查清单,回滚方案确认" },
    { phaseCode: "M10", name: "运维支持", sequence: 10, standardDuration: 90, deliverables: "运维报告,SLA达成情况", gateChecklist: "系统可用性,问题响应时间" },
    { phaseCode: "M11", name: "项目总结", sequence: 11, standardDuration: 7, deliverables: "项目总结报告,经验教训", gateChecklist: "项目目标达成,成本控制,客户满意度" },
    { phaseCode: "M12", name: "项目关闭", sequence: 12, standardDuration: 3, deliverables: "项目关闭报告,资料归档", gateChecklist: "文档归档完成,资源释放,财务结算" },
  ];

  for (const phase of defaultPhases) {
    await db.insert(projectPhases).values(phase);
  }

  return { success: true, message: "Default project phases initialized" };
}

export async function getAllProjectPhases() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectPhases).orderBy(projectPhases.sequence).limit(1000);
}

// --- Project Gates ---

export async function createProjectGate(data: InsertProjectGate) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectGates).values(data);
  return { id: result[0].insertId };
}

export async function getProjectGates(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectGates).where(eq(projectGates.projectId, projectId)).limit(1000);
}

export async function updateProjectGate(id: number, data: Partial<InsertProjectGate>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectGates).set(data).where(eq(projectGates.id, id));
  const result = await db.select().from(projectGates).where(eq(projectGates.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Initialize gates for a new project
export async function initProjectGates(projectId: number) {
  const db = await requireDb();
  if (!db) return null;

  const phases = await getAllProjectPhases();
  if (phases.length === 0) {
    await initDefaultProjectPhases();
  }

  const allPhases = await getAllProjectPhases();
  for (const phase of allPhases) {
    await db.insert(projectGates).values({
      projectId,
      phaseCode: phase.phaseCode,
      name: phase.name || `Gate ${phase.phaseCode}`,
      status: "pending",
    });
  }

  return { success: true, message: `Initialized ${allPhases.length} gates for project` };
}

// --- Project Milestones ---

export async function createProjectMilestone(data: InsertProjectMilestone) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectMilestones).values(data);
  return { id: result[0].insertId };
}

export async function getProjectMilestones(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectMilestones).where(eq(projectMilestones.projectId, projectId)).limit(1000);
}

export async function updateProjectMilestone(id: number, data: Partial<InsertProjectMilestone>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectMilestones).set(data).where(eq(projectMilestones.id, id));
  const result = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteProjectMilestone(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectMilestones).where(eq(projectMilestones.id, id));
  return true;
}

// --- Project Tasks ---

export async function createProjectTask(data: InsertProjectTask) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectTasks).values(data);
  return { id: result[0].insertId };
}

export async function getProjectTasks(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).limit(1000);
}

export async function updateProjectTask(id: number, data: Partial<InsertProjectTask>) {
  const db = await requireDb();
  if (!db) return null;

  await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
  const result = await db.select().from(projectTasks).where(eq(projectTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteProjectTask(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectTasks).where(eq(projectTasks.id, id));
  return true;
}

// --- Project Team Members ---

export async function addProjectTeamMember(data: InsertProjectTeamMember) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectTeamMembers).values(data);
  return { id: result[0].insertId };
}

export async function getProjectTeamMembers(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectTeamMembers).where(eq(projectTeamMembers.projectId, projectId)).limit(1000);
}

export async function removeProjectTeamMember(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, id));
  return true;
}

// --- Project Documents ---

export async function createProjectDocument(data: InsertProjectDocument) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectDocuments).values(data);
  return { id: result[0].insertId };
}

export async function getProjectDocuments(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectId)).limit(1000);
}

export async function deleteProjectDocument(id: number) {
  const db = await requireDb();
  if (!db) return false;

  await db.delete(projectDocuments).where(eq(projectDocuments.id, id));
  return true;
}

// --- Project Statistics ---

export async function getProjectStatistics() {
  const db = await requireDb();
  if (!db) return null;

  const allProjects = await db.select().from(projects).limit(1000);

  const stats = {
    total: allProjects.length,
    byStatus: {
      planning: allProjects.filter(p => p.status === "draft").length,
      active: allProjects.filter(p => p.status === "active").length,
      on_hold: allProjects.filter(p => p.status === "on_hold").length,
      completed: allProjects.filter(p => p.status === "completed").length,
      cancelled: allProjects.filter(p => p.status === "cancelled").length,
    },
    byType: {
      standard: allProjects.filter(p => p.type === "standard").length,
      key: allProjects.filter(p => p.type === "key").length,
      strategic: allProjects.filter(p => p.type === "strategic").length,
    },
    totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
    totalActualCost: allProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0),
  };

  return stats;
}


// ============================================
// v1.3 成本管理模块 (Cost Management Module)
// ============================================

// --- Cost Categories ---

export async function getCostCategories() {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costCategories).orderBy(costCategories.sortOrder).limit(1000);
}

export async function getCostCategoryById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(costCategories).where(eq(costCategories.id, id));
  return result[0] || null;
}

export async function createCostCategory(data: InsertCostCategory) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costCategories).values(data);
  return { id: result[0].insertId };
}

export async function updateCostCategory(id: number, data: Partial<InsertCostCategory>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(costCategories).set(data).where(eq(costCategories.id, id));
  return true;
}

// --- Project Budgets ---

export async function getProjectBudgets(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(projectBudgets).where(eq(projectBudgets.projectId, projectId)).limit(1000);
}

export async function createProjectBudget(data: InsertProjectBudget) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(projectBudgets).values(data);
  return { id: result[0].insertId };
}

export async function updateProjectBudget(id: number, data: Partial<InsertProjectBudget>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(projectBudgets).set(data).where(eq(projectBudgets.id, id));
  return true;
}

// --- Cost Records ---

export async function getCostRecords(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costRecords)
    .where(eq(costRecords.projectId, projectId))
    .orderBy(desc(costRecords.costDate))
    .limit(1000);
}

export async function getCostRecordById(id: number) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.select().from(costRecords).where(eq(costRecords.id, id));
  return result[0] || null;
}

export async function createCostRecord(data: InsertCostRecord) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costRecords).values(data);
  return { id: result[0].insertId };
}

export async function updateCostRecord(id: number, data: Partial<InsertCostRecord>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(costRecords).set(data).where(eq(costRecords.id, id));
  return true;
}

// --- Cost Estimates ---

export async function getCostEstimates(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costEstimates).where(eq(costEstimates.projectId, projectId)).limit(1000);
}

export async function createCostEstimate(data: InsertCostEstimate) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costEstimates).values(data);
  return { id: result[0].insertId };
}

// --- Labor Costs ---

export async function getLaborCosts(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(laborCosts)
    .where(eq(laborCosts.projectId, projectId))
    .orderBy(desc(laborCosts.workDate))
    .limit(1000);
}

export async function createLaborCost(data: InsertLaborCost) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(laborCosts).values(data);
  return { id: result[0].insertId };
}

export async function updateLaborCost(id: number, data: Partial<InsertLaborCost>) {
  const db = await requireDb();
  if (!db) return false;

  await db.update(laborCosts).set(data).where(eq(laborCosts.id, id));
  return true;
}

// --- Cost Variance Analysis ---

export async function getCostVarianceAnalysis(projectId: number) {
  const db = await requireDb();
  if (!db) return [];

  return db.select().from(costVarianceAnalysis)
    .where(eq(costVarianceAnalysis.projectId, projectId))
    .orderBy(desc(costVarianceAnalysis.periodStart))
    .limit(1000);
}

export async function createCostVarianceAnalysis(data: InsertCostVarianceAnalysis) {
  const db = await requireDb();
  if (!db) return null;

  const result = await db.insert(costVarianceAnalysis).values(data);
  return { id: result[0].insertId };
}

// --- Cost Summary ---

export async function getProjectCostSummary(projectId: number) {
  const db = await requireDb();
  if (!db) return null;

  // Get project
  const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
  const project = projectResult[0];
  if (!project) return null;

  // Get all cost records
  const records = await db.select().from(costRecords).where(eq(costRecords.projectId, projectId)).limit(1000);

  // Get all labor costs
  const labor = await db.select().from(laborCosts).where(eq(laborCosts.projectId, projectId)).limit(1000);

  // Get budgets
  const budgets = await db.select().from(projectBudgets).where(eq(projectBudgets.projectId, projectId)).limit(1000);

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.budgetAmount), 0);
  const totalCostRecords = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalLaborCost = labor.reduce((sum, l) => sum + Number(l.totalCost), 0);
  const totalActualCost = totalCostRecords + totalLaborCost;
  const variance = totalBudget - totalActualCost;
  const cpi = totalActualCost > 0 ? totalBudget / totalActualCost : 1;

  return {
    projectId,
    projectName: project.name,
    totalBudget,
    totalActualCost,
    costRecordsTotal: totalCostRecords,
    laborCostTotal: totalLaborCost,
    variance,
    cpi: Math.round(cpi * 100) / 100,
    budgetUtilization: totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0,
    recordsCount: records.length,
    laborEntriesCount: labor.length,
  };
}


// --- Cost Category Initialization ---

export async function initDefaultCostCategories() {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };

  // Check if categories already exist
  const existing = await db.select().from(costCategories).limit(1000);
  if (existing.length > 0) {
    return { success: true, message: "Cost categories already initialized", count: existing.length };
  }

  // Default cost categories for industrial equipment company
  const defaultCategories = [
    // Direct Costs (直接成本)
    { name: "材料费", code: "MAT", type: "direct" as const, description: "原材料、零部件、辅料等采购成本", sortOrder: 1 },
    { name: "人工费", code: "LAB", type: "direct" as const, description: "直接参与生产的人员工资、福利", sortOrder: 2 },
    { name: "设备费", code: "EQP", type: "direct" as const, description: "生产设备购置、租赁、维护费用", sortOrder: 3 },
    { name: "外协加工费", code: "OUT", type: "direct" as const, description: "外包加工、委托生产费用", sortOrder: 4 },
    { name: "运输费", code: "TRS", type: "direct" as const, description: "物流运输、仓储费用", sortOrder: 5 },
    { name: "安装调试费", code: "INS", type: "direct" as const, description: "现场安装、调试、培训费用", sortOrder: 6 },
    
    // Indirect Costs (间接成本)
    { name: "差旅费", code: "TRV", type: "indirect" as const, description: "出差交通、住宿、餐饮补贴", sortOrder: 10 },
    { name: "通讯费", code: "COM", type: "indirect" as const, description: "电话、网络、邮寄费用", sortOrder: 11 },
    { name: "办公费", code: "OFF", type: "indirect" as const, description: "办公用品、打印、复印费用", sortOrder: 12 },
    { name: "招待费", code: "ENT", type: "indirect" as const, description: "客户接待、商务宴请费用", sortOrder: 13 },
    { name: "培训费", code: "TRN", type: "indirect" as const, description: "员工培训、技能提升费用", sortOrder: 14 },
    { name: "咨询费", code: "CON", type: "indirect" as const, description: "专业咨询、法律服务费用", sortOrder: 15 },
    
    // Overhead Costs (管理费用)
    { name: "管理人员工资", code: "MGT", type: "overhead" as const, description: "管理层薪酬、奖金", sortOrder: 20 },
    { name: "租金", code: "RNT", type: "overhead" as const, description: "办公场地、厂房租金", sortOrder: 21 },
    { name: "水电费", code: "UTL", type: "overhead" as const, description: "水、电、气等公用事业费用", sortOrder: 22 },
    { name: "折旧费", code: "DEP", type: "overhead" as const, description: "固定资产折旧", sortOrder: 23 },
    { name: "保险费", code: "INR", type: "overhead" as const, description: "财产保险、责任保险费用", sortOrder: 24 },
    { name: "税费", code: "TAX", type: "overhead" as const, description: "各类税费、行政规费", sortOrder: 25 },
    { name: "其他费用", code: "OTH", type: "overhead" as const, description: "其他未分类费用", sortOrder: 99 },
  ];

  // Insert categories
  for (const category of defaultCategories) {
    await db.insert(costCategories).values({
      ...category,
      isActive: 1,
    });
  }

  return { 
    success: true, 
    message: `Successfully initialized ${defaultCategories.length} cost categories`,
    count: defaultCategories.length 
  };
}


// ============================================
// 企业议程管理模块 (Enterprise Agenda Management)
// ============================================

import { 
  meetingTypes, meetingSchedules, meetingAttendees,
  trainingPlans, trainingParticipants, annualPlans
} from "../drizzle/schema";

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
          const webhookModule = await import('./webhook');
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
          const { notifyOwner } = await import('./_core/notification');
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
          const { broadcastWebhookMessage } = await import('./webhook');
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


// ============================================
// 年度规划管理模块 (Annual Planning Management)
// ============================================

// --- Annual Planning Configs ---

/**
 * Get all annual planning configs
 */
export async function getAnnualPlanningConfigs(filters?: {
  year?: number;
  status?: "draft" | "active" | "archived";
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(annualPlanningConfigs);
  const conditions = [];
  
  if (filters?.year) {
    conditions.push(eq(annualPlanningConfigs.year, filters.year));
  }
  if (filters?.status) {
    conditions.push(eq(annualPlanningConfigs.status, filters.status));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(annualPlanningConfigs.year)).limit(1000);
}

/**
 * Get active annual planning config for a year
 */
export async function getActiveAnnualPlanningConfig(year: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(annualPlanningConfigs)
    .where(and(
      eq(annualPlanningConfigs.year, year),
      eq(annualPlanningConfigs.status, "active")
    ))
    .limit(1000);
  return result[0] || null;
}

/**
 * Get annual planning config by ID
 */
export async function getAnnualPlanningConfigById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(annualPlanningConfigs).where(eq(annualPlanningConfigs.id, id));
  return result[0] || null;
}

/**
 * Create annual planning config
 */
export async function createAnnualPlanningConfig(data: {
  year: number;
  version: string;
  versionName: string;
  status?: "draft" | "active" | "archived";
  basedOnId?: number;
  effectiveDate?: string;
  notes?: string;
  creatorId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningConfigs).values(data);
  
  // Log the creation
  await createAnnualPlanningUpdateLog({
    configId: result[0].insertId,
    updateType: "create",
    description: `创建年度规划配置: ${data.versionName}`,
    operatorId: data.creatorId
  });
  
  return { id: result[0].insertId, ...data };
}

/**
 * Update annual planning config
 */
export async function updateAnnualPlanningConfig(id: number, data: Partial<{
  version: string;
  versionName: string;
  status: "draft" | "active" | "archived";
  effectiveDate: string;
  archivedDate: string;
  notes: string;
}>, operatorId: number) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get current data for logging
  const current = await getAnnualPlanningConfigById(id);
  
  await db.update(annualPlanningConfigs).set(data).where(eq(annualPlanningConfigs.id, id));
  
  // Log the update
  await createAnnualPlanningUpdateLog({
    configId: id,
    updateType: "update",
    description: `更新年度规划配置`,
    beforeData: JSON.stringify(current),
    afterData: JSON.stringify(data),
    operatorId
  });
  
  return { success: true };
}

/**
 * Activate annual planning config (and archive previous active one)
 */
export async function activateAnnualPlanningConfig(id: number, operatorId: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const config = await getAnnualPlanningConfigById(id);
  if (!config) return { success: false, message: "Config not found" };
  
  // Archive current active config for the same year
  const currentActive = await getActiveAnnualPlanningConfig(config.year);
  if (currentActive && currentActive.id !== id) {
    await db.update(annualPlanningConfigs)
      .set({ status: "archived", archivedDate: new Date().toISOString() })
      .where(eq(annualPlanningConfigs.id, currentActive.id));
    
    await createAnnualPlanningUpdateLog({
      configId: currentActive.id,
      updateType: "archive",
      description: `归档年度规划配置: ${currentActive.versionName}`,
      operatorId
    });
  }
  
  // Activate the new config
  await db.update(annualPlanningConfigs)
    .set({ status: "active", effectiveDate: new Date().toISOString() })
    .where(eq(annualPlanningConfigs.id, id));
  
  return { success: true };
}

// --- Annual Planning Items ---

/**
 * Get annual planning items for a config
 */
export async function getAnnualPlanningItems(configId: number, filters?: {
  category?: "culture" | "training" | "meeting" | "event" | "other";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  month?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(annualPlanningItems);
  const conditions = [eq(annualPlanningItems.configId, configId)];
  
  if (filters?.category) {
    conditions.push(eq(annualPlanningItems.category, filters.category));
  }
  if (filters?.status) {
    conditions.push(eq(annualPlanningItems.status, filters.status));
  }
  if (filters?.month) {
    conditions.push(eq(annualPlanningItems.month, filters.month));
  }
  
  query = query.where(and(...conditions)) as any;
  
  return query.orderBy(annualPlanningItems.sortOrder, annualPlanningItems.startDate).limit(1000);
}

/**
 * Get annual planning item by ID
 */
export async function getAnnualPlanningItemById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(annualPlanningItems).where(eq(annualPlanningItems.id, id));
  return result[0] || null;
}

/**
 * Create annual planning item
 */
export async function createAnnualPlanningItem(data: {
  configId: number;
  category?: "culture" | "training" | "meeting" | "event" | "other";
  name: string;
  description?: string;
  tasks?: string;
  frequency?: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate?: string;
  endDate?: string;
  weekNumber?: number;
  month?: number;
  responsibleUserId?: number;
  responsibleUserName?: string;
  participantIds?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  sortOrder?: number;
  isTemplate?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningItems).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Update annual planning item
 */
export async function updateAnnualPlanningItem(id: number, data: Partial<{
  category: "culture" | "training" | "meeting" | "event" | "other";
  name: string;
  description: string;
  tasks: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  weekNumber: number;
  month: number;
  responsibleUserId: number;
  responsibleUserName: string;
  participantIds: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  sortOrder: number;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(annualPlanningItems).set(data).where(eq(annualPlanningItems.id, id));
  return { success: true };
}

/**
 * Delete annual planning item
 */
export async function deleteAnnualPlanningItem(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.delete(annualPlanningItems).where(eq(annualPlanningItems.id, id));
  return { success: true };
}

// --- Annual Planning Update Logs ---

/**
 * Create annual planning update log
 */
export async function createAnnualPlanningUpdateLog(data: {
  configId: number;
  updateType: "create" | "copy" | "update" | "archive" | "ai_update";
  description?: string;
  beforeData?: string;
  afterData?: string;
  operatorId: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(annualPlanningUpdateLogs).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Get update logs for a config
 */
export async function getAnnualPlanningUpdateLogs(configId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(annualPlanningUpdateLogs)
    .where(eq(annualPlanningUpdateLogs.configId, configId))
    .orderBy(desc(annualPlanningUpdateLogs.createdAt))
    .limit(1000);
}

// --- AI Auto-Update Functions ---

/**
 * Copy annual planning to new year
 * This is the main function for AI-driven year-over-year updates
 */
export async function copyAnnualPlanningToNewYear(
  sourceConfigId: number,
  targetYear: number,
  operatorId: number,
  options?: {
    resetStatus?: boolean;
    adjustDates?: boolean;
    newVersionName?: string;
  }
) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get source config
  const sourceConfig = await getAnnualPlanningConfigById(sourceConfigId);
  if (!sourceConfig) return { success: false, message: "Source config not found" };
  
  // Calculate year difference for date adjustment
  const yearDiff = targetYear - sourceConfig.year;
  
  // Create new config
  const newConfig = await createAnnualPlanningConfig({
    year: targetYear,
    version: "v1",
    versionName: options?.newVersionName || `${targetYear}年度规划`,
    status: "draft",
    basedOnId: sourceConfigId,
    notes: `基于${sourceConfig.year}年度规划(${sourceConfig.versionName})复制创建`,
    creatorId: operatorId
  });
  
  if (!newConfig) return { success: false, message: "Failed to create new config" };
  
  // Get source items
  const sourceItems = await getAnnualPlanningItems(sourceConfigId);
  
  // Copy items with date adjustment
  let copiedCount = 0;
  for (const item of sourceItems) {
    const newItem: any = {
      configId: newConfig.id,
      category: item.category,
      name: item.name,
      description: item.description,
      tasks: item.tasks,
      frequency: item.frequency,
      weekNumber: item.weekNumber,
      month: item.month,
      responsibleUserId: item.responsibleUserId,
      responsibleUserName: item.responsibleUserName,
      participantIds: item.participantIds,
      status: options?.resetStatus ? "pending" : item.status,
      sortOrder: item.sortOrder,
      isTemplate: item.isTemplate
    };
    
    // Adjust dates if requested
    if (options?.adjustDates && item.startDate) {
      const newStartDate = new Date(item.startDate);
      newStartDate.setFullYear(newStartDate.getFullYear() + yearDiff);
      newItem.startDate = newStartDate;
    }
    if (options?.adjustDates && item.endDate) {
      const newEndDate = new Date(item.endDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + yearDiff);
      newItem.endDate = newEndDate;
    }
    
    await createAnnualPlanningItem(newItem);
    copiedCount++;
  }
  
  // Log the copy operation
  await createAnnualPlanningUpdateLog({
    configId: newConfig.id,
    updateType: "copy",
    description: `从${sourceConfig.year}年度规划复制${copiedCount}个项目`,
    beforeData: JSON.stringify({ sourceConfigId, sourceYear: sourceConfig.year }),
    afterData: JSON.stringify({ targetYear, copiedCount, options }),
    operatorId
  });
  
  return {
    success: true,
    newConfigId: newConfig.id,
    copiedItemsCount: copiedCount,
    message: `成功创建${targetYear}年度规划，复制了${copiedCount}个项目`
  };
}

/**
 * AI-driven batch update for annual planning items
 * Updates dates, resets status, and adjusts for new year
 */
export async function aiUpdateAnnualPlanning(
  configId: number,
  operatorId: number,
  updates: {
    itemId: number;
    changes: Partial<{
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      status: "pending" | "in_progress" | "completed" | "cancelled";
      responsibleUserId: number;
      responsibleUserName: string;
    }>;
  }[]
) {
  const db = await requireDb();
  if (!db) return null;
  
  const results: Array<{ itemId: number; success: boolean; message?: string }> = [];
  
  for (const update of updates) {
    try {
      await updateAnnualPlanningItem(update.itemId, update.changes);
      results.push({ itemId: update.itemId, success: true });
    } catch (error) {
      results.push({ itemId: update.itemId, success: false, message: String(error) });
    }
  }
  
  // Log the AI update
  await createAnnualPlanningUpdateLog({
    configId,
    updateType: "ai_update",
    description: `AI批量更新${updates.length}个项目`,
    afterData: JSON.stringify(results),
    operatorId
  });
  
  return {
    success: true,
    totalUpdates: updates.length,
    successfulUpdates: results.filter(r => r.success).length,
    failedUpdates: results.filter(r => !r.success).length,
    details: results
  };
}

/**
 * Initialize sample annual planning data
 */
export async function initSampleAnnualPlanningData(creatorId: number) {
  const db = await requireDb();
  if (!db) return { success: false, message: "Database not available" };
  
  // Check if data already exists
  const existing = await getAnnualPlanningConfigs({ year: 2026 });
  if (existing.length > 0) {
    return { success: false, message: "Annual planning data already exists for 2026" };
  }
  
  // Create 2026 config
  const config = await createAnnualPlanningConfig({
    year: 2026,
    version: "v1",
    versionName: "2026年度规划-初版",
    status: "active",
    effectiveDate: new Date().toISOString(),
    notes: "GRT系统2026年度规划",
    creatorId
  });
  
  if (!config) return { success: false, message: "Failed to create config" };
  
  // Sample planning items based on JianDaoYun structure
  const sampleItems = [
    // Culture activities
    {
      category: "culture" as const,
      name: "卓越文化月度活动",
      description: "每月组织一次卓越文化主题活动，提升团队凝聚力",
      tasks: JSON.stringify([
        "1. 确定活动主题和名称",
        "2. 产出活动策划方案（预算、目标、过程、参与者、总结、资料准备）",
        "3. 申请批准",
        "4. 做抄送和outlook会议的发送"
      ]),
      frequency: "monthly" as const,
      month: 1,
      responsibleUserName: "沈迎风",
      status: "pending" as const,
      sortOrder: 1,
      isTemplate: 1
    },
    {
      category: "culture" as const,
      name: "年度团建活动",
      description: "年度大型团队建设活动",
      tasks: JSON.stringify([
        "1. 策划活动方案",
        "2. 预算审批",
        "3. 场地预订",
        "4. 活动执行",
        "5. 总结反馈"
      ]),
      frequency: "yearly" as const,
      month: 6,
      responsibleUserName: "Bonnie",
      status: "pending" as const,
      sortOrder: 2,
      isTemplate: 1
    },
    // Training activities
    {
      category: "training" as const,
      name: "新员工入职培训",
      description: "每季度新员工入职培训",
      tasks: JSON.stringify([
        "1. 准备培训材料",
        "2. 安排培训讲师",
        "3. 组织培训考核",
        "4. 收集反馈"
      ]),
      frequency: "quarterly" as const,
      month: 1,
      responsibleUserName: "刘奕运",
      status: "pending" as const,
      sortOrder: 10,
      isTemplate: 1
    },
    {
      category: "training" as const,
      name: "安全生产培训",
      description: "年度安全生产培训",
      tasks: JSON.stringify([
        "1. 更新安全培训内容",
        "2. 组织全员培训",
        "3. 培训考核",
        "4. 颁发证书"
      ]),
      frequency: "yearly" as const,
      month: 3,
      responsibleUserName: "刘坤",
      status: "pending" as const,
      sortOrder: 11,
      isTemplate: 1
    },
    // Meeting activities
    {
      category: "meeting" as const,
      name: "公司季度经营会",
      description: "季度经营分析与目标回顾",
      tasks: JSON.stringify([
        "1. 收集各部门数据",
        "2. 准备经营分析报告",
        "3. 组织会议",
        "4. 形成会议纪要"
      ]),
      frequency: "quarterly" as const,
      month: 1,
      responsibleUserName: "倪总",
      status: "pending" as const,
      sortOrder: 20,
      isTemplate: 1
    },
    {
      category: "meeting" as const,
      name: "年度总结大会",
      description: "年度工作总结与新年规划",
      tasks: JSON.stringify([
        "1. 各部门年度总结",
        "2. 优秀员工评选",
        "3. 新年度目标发布",
        "4. 年度表彰"
      ]),
      frequency: "yearly" as const,
      month: 12,
      responsibleUserName: "Camellia",
      status: "pending" as const,
      sortOrder: 21,
      isTemplate: 1
    },
    // Events
    {
      category: "event" as const,
      name: "客户答谢会",
      description: "年度客户答谢活动",
      tasks: JSON.stringify([
        "1. 确定邀请客户名单",
        "2. 策划活动内容",
        "3. 场地布置",
        "4. 活动执行",
        "5. 后续跟进"
      ]),
      frequency: "yearly" as const,
      month: 11,
      responsibleUserName: "销售部",
      status: "pending" as const,
      sortOrder: 30,
      isTemplate: 1
    }
  ];
  
  // Insert sample items
  for (const item of sampleItems) {
    await createAnnualPlanningItem({
      configId: config.id,
      ...item
    });
  }
  
  return {
    success: true,
    configId: config.id,
    itemsCount: sampleItems.length,
    message: `成功初始化2026年度规划，包含${sampleItems.length}个项目模板`
  };
}

// ============================================
// User Management Functions
// ============================================

/**
 * Get all users for selection (e.g., for adding training participants)
 */
export async function getAllUsersForSelection(): Promise<{ id: number; name: string | null; email: string | null }[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users).orderBy(users.name).limit(1000);

  return result;
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<{ id: number; name: string | null; email: string | null }[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users)
    .where(
      or(
        like(users.name, `%${query}%`),
        like(users.email, `%${query}%`)
      )
    )
    .orderBy(users.name)
    .limit(20);
  
  return result;
}


// ============================================
// Webhook Configuration Management Functions
// ============================================

/**
 * Get all webhook configurations
 */
export async function getWebhookConfigs(): Promise<WebhookConfig[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(webhookConfigs).orderBy(desc(webhookConfigs.createdAt)).limit(1000);
}

/**
 * Get enabled webhook configurations by event type
 */
export async function getEnabledWebhooksByEvent(eventType: string): Promise<WebhookConfig[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const allConfigs = await db.select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.enabled, true as any))
    .limit(1000);
  
  // Filter by event type (stored as JSON array in triggerEvents)
  return allConfigs.filter(config => {
    if (!config.triggerEvents) return true; // If no specific events, trigger for all
    try {
      const events = JSON.parse(config.triggerEvents);
      return events.includes(eventType) || events.includes('all');
    } catch {
      return true;
    }
  });
}

/**
 * Create a new webhook configuration
 */
export async function createWebhookConfig(data: InsertWebhookConfig): Promise<WebhookConfig | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookConfigs).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  const [created] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, insertId));
  return created || null;
}

/**
 * Update a webhook configuration
 */
export async function updateWebhookConfig(id: number, data: Partial<InsertWebhookConfig>): Promise<WebhookConfig | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(webhookConfigs).set(data).where(eq(webhookConfigs.id, id));
  
  const [updated] = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id));
  return updated || null;
}

/**
 * Delete a webhook configuration
 */
export async function deleteWebhookConfig(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  await db.delete(webhookConfigs).where(eq(webhookConfigs.id, id));
  return true;
}

/**
 * Log a webhook delivery attempt
 */
export async function logWebhookDelivery(data: InsertWebhookLog): Promise<WebhookLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookLogs).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  const [created] = await db.select().from(webhookLogs).where(eq(webhookLogs.id, insertId));
  return created || null;
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookLogs(webhookId?: number, limit: number = 50): Promise<WebhookLog[]> {
  const db = await requireDb();
  if (!db) return [];
  
  if (webhookId) {
    return db.select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.sentAt))
      .limit(limit);
  }
  
  return db.select()
    .from(webhookLogs)
    .orderBy(desc(webhookLogs.sentAt))
    .limit(limit);
}


// ============================================
// Webhook Template Management Functions
// ============================================

import { webhookTemplates, type WebhookTemplate, type InsertWebhookTemplate } from "../drizzle/schema";

/**
 * Get all webhook templates
 */
export async function getWebhookTemplates(): Promise<WebhookTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select().from(webhookTemplates).orderBy(desc(webhookTemplates.createdAt)).limit(1000);
}

/**
 * Get webhook templates by event type
 */
export async function getWebhookTemplatesByEvent(eventType: string): Promise<WebhookTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(webhookTemplates)
    .where(eq(webhookTemplates.eventType, eventType))
    .limit(1000);
}

/**
 * Get webhook template by ID
 */
export async function getWebhookTemplateById(id: number): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(webhookTemplates)
    .where(eq(webhookTemplates.id, id));
  
  return results[0] || null;
}

/**
 * Create a new webhook template
 */
export async function createWebhookTemplate(data: {
  name: string;
  eventType: string;
  webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom';
  titleTemplate: string;
  contentTemplate: string;
  availableVariables?: string;
  isDefault?: boolean;
  createdBy?: number;
}): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(webhookTemplates).values({
    name: data.name,
    eventType: data.eventType,
    webhookType: data.webhookType,
    titleTemplate: data.titleTemplate,
    contentTemplate: data.contentTemplate,
    availableVariables: data.availableVariables || null,
    isDefault: data.isDefault || false,
    createdBy: data.createdBy || null,
  } as any) as any;

  const insertId = result[0]?.insertId ?? result.insertId;
  return getWebhookTemplateById(insertId);
}

/**
 * Update a webhook template
 */
export async function updateWebhookTemplate(
  id: number,
  data: Partial<{
    name: string;
    eventType: string;
    webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom';
    titleTemplate: string;
    contentTemplate: string;
    availableVariables: string;
    isDefault: boolean;
  }>
): Promise<{ success: boolean }> {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.update(webhookTemplates)
    .set(data as any)
    .where(eq(webhookTemplates.id, id));
  
  return { success: true };
}

/**
 * Delete a webhook template
 */
export async function deleteWebhookTemplate(id: number): Promise<{ success: boolean }> {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(webhookTemplates).where(eq(webhookTemplates.id, id));
  return { success: true };
}

/**
 * Get default template for event type and webhook type
 */
export async function getDefaultTemplate(
  eventType: string,
  webhookType: 'wecom' | 'dingtalk' | 'feishu' | 'custom'
): Promise<WebhookTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const results = await db.select()
    .from(webhookTemplates)
    .where(
      and(
        eq(webhookTemplates.eventType, eventType),
        eq(webhookTemplates.webhookType, webhookType),
        eq(webhookTemplates.isDefault, true as any)
      )
    )
    .limit(1000);

  return results[0] || null;
}

/**
 * Initialize default webhook templates
 */
export async function initDefaultWebhookTemplates(): Promise<{ created: number }> {
  const db = await requireDb();
  if (!db) return { created: 0 };
  
  const defaultTemplates = [
    // Cost Alert Templates
    {
      name: '成本预警-企业微信',
      eventType: 'cost_alert',
      webhookType: 'wecom' as const,
      titleTemplate: '{{levelEmoji}} 成本预警: {{title}}',
      contentTemplate: `**项目**: {{projectName}}
**预警级别**: {{alertLevel}}
**当前值**: {{currentValue}}
**阈值**: {{threshold}}
**规则**: {{ruleName}}
**时间**: {{time}}`,
      availableVariables: JSON.stringify(['title', 'projectName', 'alertLevel', 'currentValue', 'threshold', 'ruleName', 'time', 'levelEmoji']),
      isDefault: true,
    },
    {
      name: '成本预警-钉钉',
      eventType: 'cost_alert',
      webhookType: 'dingtalk' as const,
      titleTemplate: '{{levelEmoji}} 成本预警: {{title}}',
      contentTemplate: `**项目**: {{projectName}}
**预警级别**: {{alertLevel}}
**当前值**: {{currentValue}}
**阈值**: {{threshold}}
**规则**: {{ruleName}}
**时间**: {{time}}`,
      availableVariables: JSON.stringify(['title', 'projectName', 'alertLevel', 'currentValue', 'threshold', 'ruleName', 'time', 'levelEmoji']),
      isDefault: true,
    },
    // Meeting Reminder Templates
    {
      name: '会议提醒-企业微信',
      eventType: 'meeting_reminder',
      webhookType: 'wecom' as const,
      titleTemplate: '📅 会议提醒: {{title}}',
      contentTemplate: `**会议主题**: {{title}}
**开始时间**: {{startTime}}
**会议地点**: {{location}}
**会议类型**: {{meetingType}}
**参与人员**: {{participants}}`,
      availableVariables: JSON.stringify(['title', 'startTime', 'location', 'meetingType', 'participants', 'description']),
      isDefault: true,
    },
    {
      name: '会议提醒-钉钉',
      eventType: 'meeting_reminder',
      webhookType: 'dingtalk' as const,
      titleTemplate: '📅 会议提醒: {{title}}',
      contentTemplate: `**会议主题**: {{title}}
**开始时间**: {{startTime}}
**会议地点**: {{location}}
**会议类型**: {{meetingType}}
**参与人员**: {{participants}}`,
      availableVariables: JSON.stringify(['title', 'startTime', 'location', 'meetingType', 'participants', 'description']),
      isDefault: true,
    },
    // Training Complete Templates
    {
      name: '培训完成-企业微信',
      eventType: 'training_complete',
      webhookType: 'wecom' as const,
      titleTemplate: '🎓 培训完成通知: {{trainingName}}',
      contentTemplate: `**培训名称**: {{trainingName}}
**培训类型**: {{trainingType}}
**完成人数**: {{completedCount}}/{{totalCount}}
**通过率**: {{passRate}}%
**平均成绩**: {{avgScore}}`,
      availableVariables: JSON.stringify(['trainingName', 'trainingType', 'completedCount', 'totalCount', 'passRate', 'avgScore']),
      isDefault: true,
    },
  ];
  
  let created = 0;
  for (const template of defaultTemplates) {
    // Check if default template already exists
    const existing = await getDefaultTemplate(template.eventType, template.webhookType);
    if (!existing) {
      await createWebhookTemplate(template);
      created++;
    }
  }
  
  return { created };
}

/**
 * Apply template to generate message content
 */
export function applyWebhookTemplate(
  template: WebhookTemplate,
  variables: Record<string, string | number>
): { title: string; content: string } {
  let title = template.titleTemplate;
  let content = template.contentTemplate;
  
  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), String(value));
    content = content.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return { title, content };
}


// ============================================
// Cost Alert Rules Batch Import (v1.3.7)
// ============================================

/**
 * Batch import cost alert rules from Excel/CSV data
 * @param rules Array of rule data to import
 * @param userId User performing the import
 * @returns Import result with success/failure counts
 */
export async function batchImportCostAlertRules(
  rules: Array<{
    name: string;
    description?: string;
    scope?: "all" | "project" | "category";
    projectId?: number;
    categoryId?: number;
    alertType: "budget_percent" | "absolute_amount" | "cpi";
    threshold: number;
    alertLevel: "warning" | "critical" | "emergency";
    notifyType?: "email" | "system" | "both";
    notifyUserIds?: string;
    isActive?: number;
  }>,
  userId: number
) {
  const db = await requireDb();
  if (!db) return { success: 0, failed: 0, errors: ["Database connection failed"] };
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    try {
      // Validate required fields
      if (!rule.name || !rule.alertType || rule.threshold === undefined) {
        throw new Error(`Row ${i + 1}: Missing required fields (name, alertType, threshold)`);
      }
      
      // Validate threshold based on alert type
      if (rule.alertType === "budget_percent" && (rule.threshold < 0 || rule.threshold > 200)) {
        throw new Error(`Row ${i + 1}: Budget percent threshold must be between 0 and 200`);
      }
      if (rule.alertType === "cpi" && (rule.threshold < 0 || rule.threshold > 2)) {
        throw new Error(`Row ${i + 1}: CPI threshold must be between 0 and 2`);
      }
      
      // Insert the rule
      await db.insert(costAlertRules).values({
        name: rule.name,
        description: rule.description || null,
        scope: rule.scope || "all",
        projectId: rule.projectId || null,
        categoryId: rule.categoryId || null,
        alertType: rule.alertType,
        threshold: rule.alertType === "cpi" ? Math.round(rule.threshold * 100) : rule.threshold,
        alertLevel: rule.alertLevel,
        notifyType: rule.notifyType || "system",
        notifyUserIds: rule.notifyUserIds || null,
        isActive: rule.isActive ?? 1,
      });
      
      success++;
    } catch (error: any) {
      failed++;
      errors.push(error.message || `Row ${i + 1}: Unknown error`);
    }
  }
  
  return { success, failed, errors };
}

/**
 * Parse CSV content to cost alert rules
 * @param csvContent CSV file content as string
 * @returns Parsed rules array
 */
export function parseCostAlertRulesFromCSV(csvContent: string): Array<{
  name: string;
  description?: string;
  scope?: "all" | "project" | "category";
  projectId?: number;
  categoryId?: number;
  alertType: "budget_percent" | "absolute_amount" | "cpi";
  threshold: number;
  alertLevel: "warning" | "critical" | "emergency";
  notifyType?: "email" | "system" | "both";
  notifyUserIds?: string;
  isActive?: number;
}> {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const rules: any[] = [];
  
  // Map column names to field names
  const columnMap: Record<string, string> = {
    "规则名称": "name",
    "name": "name",
    "描述": "description",
    "description": "description",
    "适用范围": "scope",
    "scope": "scope",
    "项目id": "projectId",
    "projectid": "projectId",
    "类别id": "categoryId",
    "categoryid": "categoryId",
    "预警类型": "alertType",
    "alerttype": "alertType",
    "阈值": "threshold",
    "threshold": "threshold",
    "预警级别": "alertLevel",
    "alertlevel": "alertLevel",
    "通知方式": "notifyType",
    "notifytype": "notifyType",
    "通知用户": "notifyUserIds",
    "notifyuserids": "notifyUserIds",
    "是否启用": "isActive",
    "isactive": "isActive",
  };
  
  // Map alert type values
  const alertTypeMap: Record<string, string> = {
    "预算百分比": "budget_percent",
    "budget_percent": "budget_percent",
    "绝对金额": "absolute_amount",
    "absolute_amount": "absolute_amount",
    "cpi指数": "cpi",
    "cpi": "cpi",
  };
  
  // Map alert level values
  const alertLevelMap: Record<string, string> = {
    "警告": "warning",
    "warning": "warning",
    "严重": "critical",
    "critical": "critical",
    "紧急": "emergency",
    "emergency": "emergency",
  };
  
  // Map scope values
  const scopeMap: Record<string, string> = {
    "所有项目": "all",
    "all": "all",
    "指定项目": "project",
    "project": "project",
    "指定类别": "category",
    "category": "category",
  };
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const rule: any = {};
    
    headers.forEach((header, index) => {
      const fieldName = columnMap[header];
      if (fieldName && values[index]) {
        let value: any = values[index];
        
        // Convert special values
        if (fieldName === "alertType") {
          value = alertTypeMap[value.toLowerCase()] || value;
        } else if (fieldName === "alertLevel") {
          value = alertLevelMap[value.toLowerCase()] || value;
        } else if (fieldName === "scope") {
          value = scopeMap[value.toLowerCase()] || value;
        } else if (fieldName === "threshold" || fieldName === "projectId" || fieldName === "categoryId") {
          value = parseFloat(value) || 0;
        } else if (fieldName === "isActive") {
          value = value === "1" || value.toLowerCase() === "true" || value === "是" ? 1 : 0;
        }
        
        rule[fieldName] = value;
      }
    });
    
    if (rule.name) {
      rules.push(rule);
    }
  }
  
  return rules;
}

/**
 * Export cost alert rules to CSV format
 * @returns CSV content string
 */
export async function exportCostAlertRulesToCSV(): Promise<string> {
  const db = await requireDb();
  if (!db) return "";
  
  const rules = await db.select().from(costAlertRules).limit(1000);

  // CSV header
  const headers = [
    "规则名称",
    "描述",
    "适用范围",
    "项目ID",
    "类别ID",
    "预警类型",
    "阈值",
    "预警级别",
    "通知方式",
    "通知用户",
    "是否启用"
  ];
  
  // Map values back to Chinese
  const alertTypeMapReverse: Record<string, string> = {
    "budget_percent": "预算百分比",
    "absolute_amount": "绝对金额",
    "cpi": "CPI指数",
  };
  
  const alertLevelMapReverse: Record<string, string> = {
    "warning": "警告",
    "critical": "严重",
    "emergency": "紧急",
  };
  
  const scopeMapReverse: Record<string, string> = {
    "all": "所有项目",
    "project": "指定项目",
    "category": "指定类别",
  };
  
  const notifyTypeMapReverse: Record<string, string> = {
    "email": "邮件",
    "system": "系统通知",
    "both": "两者",
  };
  
  // Generate CSV rows
  const rows = rules.map(rule => [
    rule.name,
    rule.description || "",
    scopeMapReverse[rule.scope] || rule.scope,
    rule.projectId || "",
    rule.categoryId || "",
    alertTypeMapReverse[rule.alertType] || rule.alertType,
    rule.alertType === "cpi" ? (rule.threshold / 100).toFixed(2) : rule.threshold,
    alertLevelMapReverse[rule.alertLevel] || rule.alertLevel,
    notifyTypeMapReverse[rule.notifyType] || rule.notifyType,
    rule.notifyUserIds || "",
    rule.isActive ? "是" : "否"
  ].join(","));
  
  return [headers.join(","), ...rows].join("\n");
}


// ============================================
// v1.3.9 - Webhook Trigger Conditions
// ============================================

export async function getWebhookConditions(webhookId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId))
    .orderBy(webhookTriggerConditions.sortOrder)
    .limit(1000);
}

export async function saveWebhookConditions(webhookId: number, conditions: InsertWebhookTriggerCondition[]) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  // Delete existing conditions
  await db.delete(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId));
  
  // Insert new conditions
  if (conditions.length > 0) {
    const conditionsWithWebhookId = conditions.map((c, index) => ({
      ...c,
      webhookId,
      sortOrder: index
    }));
    await db.insert(webhookTriggerConditions).values(conditionsWithWebhookId);
  }
  
  return { success: true };
}

export async function deleteWebhookConditions(webhookId: number) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(webhookTriggerConditions)
    .where(eq(webhookTriggerConditions.webhookId, webhookId));
  
  return { success: true };
}

// Condition evaluation engine
interface TriggerCondition {
  field: string;
  operator: string;
  value: string;
  logicOperator?: string;
}

export function evaluateCondition(condition: TriggerCondition, context: Record<string, any>): boolean {
  const fieldValue = context[condition.field];
  let conditionValue: any;
  
  try {
    conditionValue = JSON.parse(condition.value);
  } catch {
    conditionValue = condition.value;
  }
  
  switch (condition.operator) {
    case 'eq': return fieldValue === conditionValue;
    case 'ne': return fieldValue !== conditionValue;
    case 'gt': return Number(fieldValue) > Number(conditionValue);
    case 'lt': return Number(fieldValue) < Number(conditionValue);
    case 'gte': return Number(fieldValue) >= Number(conditionValue);
    case 'lte': return Number(fieldValue) <= Number(conditionValue);
    case 'in': 
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'between':
      if (Array.isArray(conditionValue) && conditionValue.length === 2) {
        const val = Number(fieldValue);
        return val >= Number(conditionValue[0]) && val <= Number(conditionValue[1]);
      }
      return false;
    case 'contains':
      return String(fieldValue).includes(String(conditionValue));
    case 'startsWith':
      return String(fieldValue).startsWith(String(conditionValue));
    case 'endsWith':
      return String(fieldValue).endsWith(String(conditionValue));
    default: 
      return true;
  }
}

export function evaluateAllConditions(conditions: TriggerCondition[], context: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  let result = evaluateCondition(conditions[0], context);
  
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateCondition(condition, context);
    
    if (condition.logicOperator === 'OR') {
      result = result || conditionResult;
    } else {
      result = result && conditionResult;
    }
  }
  
  return result;
}

// ============================================
// v1.3.9 - Annual Planning Dependencies
// ============================================

export async function getItemDependencies(configId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.configId, configId))
    .limit(1000);
}

export async function addItemDependency(data: InsertAnnualPlanningDependency) {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Check for cyclic dependency
  const hasCycle = await checkCyclicDependency(data.configId, data.sourceItemId, data.targetItemId);
  if (hasCycle) {
    return { success: false, error: "检测到循环依赖，无法添加" };
  }
  
  // Check for duplicate
  const existing = await db.select()
    .from(annualPlanningDependencies)
    .where(and(
      eq(annualPlanningDependencies.sourceItemId, data.sourceItemId),
      eq(annualPlanningDependencies.targetItemId, data.targetItemId)
    ))
    .limit(1000);

  if (existing.length > 0) {
    return { success: false, error: "该依赖关系已存在" };
  }
  
  const result = await db.insert(annualPlanningDependencies).values(data) as any;
  return { success: true, id: result[0]?.insertId ?? result.insertId };
}

export async function removeItemDependency(id: number) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  await db.delete(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.id, id));
  
  return { success: true };
}

// Cyclic dependency detection using DFS
async function checkCyclicDependency(configId: number, sourceId: number, targetId: number): Promise<boolean> {
  const dependencies = await getItemDependencies(configId);
  const graph = new Map<number, number[]>();
  
  // Build adjacency list
  for (const dep of dependencies) {
    if (!graph.has(dep.sourceItemId)) {
      graph.set(dep.sourceItemId, []);
    }
    graph.get(dep.sourceItemId)!.push(dep.targetItemId);
  }
  
  // Add the new edge
  if (!graph.has(sourceId)) {
    graph.set(sourceId, []);
  }
  graph.get(sourceId)!.push(targetId);
  
  // DFS to detect cycle
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function dfs(node: number): boolean {
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  for (const node of Array.from(graph.keys())) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// v1.3.9 - Cost Alert Rule Version Management
// ============================================

export async function saveRuleVersion(ruleId: number, ruleData: any, changedBy?: number, changeSummary?: string) {
  const db = await requireDb();
  if (!db) return { success: false };
  
  // Get current max version number
  const versions = await db.select({ versionNumber: costAlertRuleVersions.versionNumber })
    .from(costAlertRuleVersions)
    .where(eq(costAlertRuleVersions.ruleId, ruleId))
    .orderBy(desc(costAlertRuleVersions.versionNumber))
    .limit(1);
  
  const newVersionNumber = (versions[0]?.versionNumber || 0) + 1;
  
  await db.insert(costAlertRuleVersions).values({
    ruleId,
    versionNumber: newVersionNumber,
    ruleData: JSON.stringify(ruleData),
    changeSummary,
    changedBy
  });
  
  return { success: true, versionNumber: newVersionNumber };
}

export async function getRuleVersions(ruleId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select()
    .from(costAlertRuleVersions)
    .where(eq(costAlertRuleVersions.ruleId, ruleId))
    .orderBy(desc(costAlertRuleVersions.versionNumber))
    .limit(1000);
}

export async function getRuleVersion(ruleId: number, versionNumber: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const [version] = await db.select()
    .from(costAlertRuleVersions)
    .where(and(
      eq(costAlertRuleVersions.ruleId, ruleId),
      eq(costAlertRuleVersions.versionNumber, versionNumber)
    ))
    .limit(1000);

  return version || null;
}

export async function rollbackRuleToVersion(ruleId: number, versionNumber: number, userId?: number) {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const version = await getRuleVersion(ruleId, versionNumber);
  if (!version) {
    return { success: false, error: "版本不存在" };
  }
  
  const ruleData = JSON.parse(version.ruleData);
  
  // Update the rule
  await db.update(costAlertRules)
    .set({
      name: ruleData.name,
      description: ruleData.description,
      scope: ruleData.scope,
      projectId: ruleData.projectId,
      categoryId: ruleData.categoryId,
      alertType: ruleData.alertType,
      threshold: ruleData.threshold,
      alertLevel: ruleData.alertLevel,
      notifyType: ruleData.notifyType,
      notifyUserIds: ruleData.notifyUserIds,
      isActive: ruleData.isActive
    })
    .where(eq(costAlertRules.id, ruleId));
  
  // Save new version (rollback is also recorded as a new version)
  await saveRuleVersion(ruleId, ruleData, userId, `回滚到版本 ${versionNumber}`);
  
  return { success: true };
}

export function compareRuleVersions(oldVersionData: string, newVersionData: string) {
  const oldRule = JSON.parse(oldVersionData);
  const newRule = JSON.parse(newVersionData);
  
  const fieldLabels: Record<string, string> = {
    name: "规则名称",
    description: "描述",
    scope: "适用范围",
    projectId: "项目ID",
    categoryId: "类别ID",
    alertType: "预警类型",
    threshold: "阈值",
    alertLevel: "预警级别",
    notifyType: "通知方式",
    notifyUserIds: "通知用户",
    isActive: "启用状态"
  };
  
  const diffs: Array<{
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'removed' | 'modified';
  }> = [];
  
  const allKeys = new Set([...Object.keys(oldRule), ...Object.keys(newRule)]);
  
  for (const key of Array.from(allKeys)) {
    const oldValue = oldRule[key];
    const newValue = newRule[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({
        field: key,
        fieldLabel: fieldLabels[key] || key,
        oldValue,
        newValue,
        changeType: oldValue === undefined ? 'added' : 
                    newValue === undefined ? 'removed' : 'modified'
      });
    }
  }
  
  return diffs;
}


// ============================================
// v1.3.11 - Critical Path Calculation
// ============================================

export interface CriticalPathItem {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  duration: number; // days
  earliestStart: number; // days from project start
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  totalFloat: number; // total slack
  freeFloat: number; // free slack
  isCritical: boolean;
}

export interface CriticalPathResult {
  criticalPath: number[]; // item IDs on critical path
  items: CriticalPathItem[];
  projectDuration: number; // total project duration in days
  criticalPathLength: number; // critical path duration
}

/**
 * Calculate critical path for annual planning items
 * Uses Forward Pass and Backward Pass algorithm
 */
export async function calculateCriticalPath(configId: number): Promise<CriticalPathResult> {
  const db = await requireDb();
  if (!db) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Get all items for this config
  const items = await db.select()
    .from(annualPlanningItems)
    .where(eq(annualPlanningItems.configId, configId))
    .limit(1000);

  // Get all dependencies
  const dependencies = await getItemDependencies(configId);
  
  if (items.length === 0) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Calculate duration for each item (in days)
  const itemMap = new Map<number, CriticalPathItem>();
  let projectStartDate: Date | null = null;
  
  for (const item of items) {
    if (!item.startDate || !item.endDate) continue;
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (!projectStartDate || startDate < projectStartDate) {
      projectStartDate = startDate;
    }
    
    itemMap.set(item.id, {
      id: item.id,
      name: item.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false
    });
  }
  
  if (!projectStartDate) {
    return { criticalPath: [], items: [], projectDuration: 0, criticalPathLength: 0 };
  }
  
  // Calculate earliest start relative to project start
  for (const [id, item] of Array.from(itemMap.entries())) {
    const daysDiff = Math.ceil((new Date(item.startDate).getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
    item.earliestStart = daysDiff;
    item.earliestFinish = daysDiff + item.duration - 1;
  }
  
  // Build dependency graph (predecessor -> successors)
  const successors = new Map<number, number[]>();
  const predecessors = new Map<number, number[]>();
  
  for (const dep of dependencies) {
    if (!successors.has(dep.sourceItemId)) {
      successors.set(dep.sourceItemId, []);
    }
    successors.get(dep.sourceItemId)!.push(dep.targetItemId);
    
    if (!predecessors.has(dep.targetItemId)) {
      predecessors.set(dep.targetItemId, []);
    }
    predecessors.get(dep.targetItemId)!.push(dep.sourceItemId);
  }
  
  // Forward Pass - Calculate Earliest Start/Finish considering dependencies
  // Topological sort
  const inDegree = new Map<number, number>();
  for (const [id] of Array.from(itemMap.entries())) {
    inDegree.set(id, (predecessors.get(id) || []).length);
  }
  
  const queue: number[] = [];
  for (const [id, degree] of Array.from(inDegree.entries())) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = itemMap.get(currentId)!;
    
    // Update successors' earliest start based on this item's finish
    const succs = successors.get(currentId) || [];
    for (const succId of succs) {
      const succ = itemMap.get(succId)!;
      const newEarliestStart = current.earliestFinish + 1;
      if (newEarliestStart > succ.earliestStart) {
        succ.earliestStart = newEarliestStart;
        succ.earliestFinish = newEarliestStart + succ.duration - 1;
      }
      
      inDegree.set(succId, inDegree.get(succId)! - 1);
      if (inDegree.get(succId) === 0) {
        queue.push(succId);
      }
    }
  }
  
  // Find project duration (maximum earliest finish)
  let projectDuration = 0;
  for (const [, item] of Array.from(itemMap.entries())) {
    if (item.earliestFinish > projectDuration) {
      projectDuration = item.earliestFinish;
    }
  }
  
  // Backward Pass - Calculate Latest Start/Finish
  // Initialize latest finish to project duration for items with no successors
  for (const [id, item] of Array.from(itemMap.entries())) {
    const succs = successors.get(id) || [];
    if (succs.length === 0) {
      item.latestFinish = projectDuration;
      item.latestStart = item.latestFinish - item.duration + 1;
    } else {
      item.latestFinish = Infinity;
      item.latestStart = Infinity;
    }
  }
  
  // Reverse topological order
  const outDegree = new Map<number, number>();
  for (const [id] of Array.from(itemMap.entries())) {
    outDegree.set(id, (successors.get(id) || []).length);
  }
  
  const reverseQueue: number[] = [];
  for (const [id, degree] of Array.from(outDegree.entries())) {
    if (degree === 0) {
      reverseQueue.push(id);
    }
  }
  
  while (reverseQueue.length > 0) {
    const currentId = reverseQueue.shift()!;
    const current = itemMap.get(currentId)!;
    
    // Update predecessors' latest finish based on this item's start
    const preds = predecessors.get(currentId) || [];
    for (const predId of preds) {
      const pred = itemMap.get(predId)!;
      const newLatestFinish = current.latestStart - 1;
      if (newLatestFinish < pred.latestFinish) {
        pred.latestFinish = newLatestFinish;
        pred.latestStart = pred.latestFinish - pred.duration + 1;
      }
      
      outDegree.set(predId, outDegree.get(predId)! - 1);
      if (outDegree.get(predId) === 0) {
        reverseQueue.push(predId);
      }
    }
  }
  
  // Calculate Float and identify critical path
  const criticalPath: number[] = [];
  
  for (const [id, item] of Array.from(itemMap.entries())) {
    // Total Float = Latest Start - Earliest Start
    item.totalFloat = item.latestStart - item.earliestStart;
    
    // Free Float = Min(Earliest Start of successors) - Earliest Finish - 1
    const succs = successors.get(id) || [];
    if (succs.length > 0) {
      let minSuccEarliestStart = Infinity;
      for (const succId of succs) {
        const succ = itemMap.get(succId)!;
        if (succ.earliestStart < minSuccEarliestStart) {
          minSuccEarliestStart = succ.earliestStart;
        }
      }
      item.freeFloat = minSuccEarliestStart - item.earliestFinish - 1;
    } else {
      item.freeFloat = projectDuration - item.earliestFinish;
    }
    
    // Item is critical if total float is 0
    item.isCritical = item.totalFloat === 0;
    if (item.isCritical) {
      criticalPath.push(id);
    }
  }
  
  // Sort critical path by earliest start
  criticalPath.sort((a, b) => {
    const itemA = itemMap.get(a)!;
    const itemB = itemMap.get(b)!;
    return itemA.earliestStart - itemB.earliestStart;
  });
  
  // Calculate critical path length
  let criticalPathLength = 0;
  for (const id of criticalPath) {
    const item = itemMap.get(id)!;
    criticalPathLength = Math.max(criticalPathLength, item.earliestFinish);
  }
  
  return {
    criticalPath,
    items: Array.from(itemMap.values()),
    projectDuration: projectDuration + 1, // Convert to 1-based
    criticalPathLength: criticalPathLength + 1
  };
}

/**
 * Get items on the critical path
 */
export async function getCriticalPathItems(configId: number): Promise<CriticalPathItem[]> {
  const result = await calculateCriticalPath(configId);
  return result.items.filter(item => item.isCritical);
}

/**
 * Check if adding a dependency would affect the critical path
 */
export async function checkCriticalPathImpact(
  configId: number, 
  sourceItemId: number, 
  targetItemId: number
): Promise<{
  wouldAffectCriticalPath: boolean;
  currentCriticalPath: number[];
  newCriticalPath: number[];
  durationChange: number;
}> {
  // Get current critical path
  const currentResult = await calculateCriticalPath(configId);
  
  // Temporarily add the dependency and recalculate
  const db = await requireDb();
  if (!db) {
    return {
      wouldAffectCriticalPath: false,
      currentCriticalPath: [],
      newCriticalPath: [],
      durationChange: 0
    };
  }
  
  // Add temporary dependency
  const tempDep = await db.insert(annualPlanningDependencies).values({
    configId,
    sourceItemId,
    targetItemId,
    dependencyType: 'FS'
  });
  
  // Calculate new critical path
  const newResult = await calculateCriticalPath(configId);
  
  // Remove temporary dependency
  await db.delete(annualPlanningDependencies)
    .where(eq(annualPlanningDependencies.id, (tempDep as any)[0]?.insertId ?? (tempDep as any).insertId));
  
  // Compare results
  const currentSet = new Set(currentResult.criticalPath);
  const newSet = new Set(newResult.criticalPath);
  
  const wouldAffectCriticalPath = 
    currentResult.criticalPath.length !== newResult.criticalPath.length ||
    !currentResult.criticalPath.every(id => newSet.has(id));
  
  return {
    wouldAffectCriticalPath,
    currentCriticalPath: currentResult.criticalPath,
    newCriticalPath: newResult.criticalPath,
    durationChange: newResult.projectDuration - currentResult.projectDuration
  };
}


// ============================================
// v1.3.11 - Cost Alert Rule Templates
// ============================================

import { costAlertRuleTemplates, type CostAlertRuleTemplate, type InsertCostAlertRuleTemplate } from "../drizzle/schema";

/**
 * Get all alert rule templates
 */
export async function getAlertRuleTemplates(filters?: {
  category?: "budget" | "performance" | "cost" | "risk";
  templateType?: "builtin" | "custom";
}): Promise<CostAlertRuleTemplate[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const conditions = [eq(costAlertRuleTemplates.isActive, 1)];
  
  if (filters?.category) {
    conditions.push(eq(costAlertRuleTemplates.category, filters.category));
  }
  if (filters?.templateType) {
    conditions.push(eq(costAlertRuleTemplates.templateType, filters.templateType));
  }
  
  return db.select()
    .from(costAlertRuleTemplates)
    .where(and(...conditions))
    .orderBy(desc(costAlertRuleTemplates.usageCount), costAlertRuleTemplates.name)
    .limit(1000);
}

/**
 * Get template by ID
 */
export async function getAlertRuleTemplateById(id: number): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(costAlertRuleTemplates)
    .where(eq(costAlertRuleTemplates.id, id));
  
  return result[0] || null;
}

/**
 * Create a new template
 */
export async function createAlertRuleTemplate(data: InsertCostAlertRuleTemplate): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(costAlertRuleTemplates).values(data) as any;
  const insertId = result[0]?.insertId ?? result.insertId;

  return getAlertRuleTemplateById(insertId);
}

/**
 * Update a template
 */
export async function updateAlertRuleTemplate(
  id: number, 
  data: Partial<InsertCostAlertRuleTemplate>
): Promise<CostAlertRuleTemplate | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(costAlertRuleTemplates)
    .set(data)
    .where(eq(costAlertRuleTemplates.id, id));
  
  return getAlertRuleTemplateById(id);
}

/**
 * Delete a template (soft delete by setting isActive to 0)
 */
export async function deleteAlertRuleTemplate(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  await db.update(costAlertRuleTemplates)
    .set({ isActive: 0 })
    .where(eq(costAlertRuleTemplates.id, id));
  
  return true;
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  const template = await getAlertRuleTemplateById(id);
  if (template) {
    await db.update(costAlertRuleTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(costAlertRuleTemplates.id, id));
  }
}

/**
 * Create rule from template
 */
export async function createRuleFromTemplate(templateId: number, overrides?: {
  name?: string;
  projectId?: number;
  categoryId?: number;
}): Promise<{ success: boolean; ruleId?: number; error?: string }> {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const template = await getAlertRuleTemplateById(templateId);
  if (!template) {
    return { success: false, error: "Template not found" };
  }
  
  try {
    const config = JSON.parse(template.ruleConfig);
    
    const result = await db.insert(costAlertRules).values({
      name: overrides?.name || `${template.name} (从模板创建)`,
      description: template.description,
      scope: config.scope || "all",
      projectId: overrides?.projectId || config.projectId || null,
      categoryId: overrides?.categoryId || config.categoryId || null,
      alertType: config.alertType,
      threshold: config.threshold,
      alertLevel: config.alertLevel,
      notifyType: config.notifyType || "system",
      notifyUserIds: config.notifyUserIds || null,
      isActive: 1,
    } as any) as any;

    // Increment usage count
    await incrementTemplateUsage(templateId);

    return { success: true, ruleId: result[0]?.insertId ?? result.insertId };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create rule from template" };
  }
}

/**
 * Save current rule as template
 */
export async function saveRuleAsTemplate(
  ruleId: number, 
  templateName: string,
  category: "budget" | "performance" | "cost" | "risk",
  description?: string,
  userId?: number
): Promise<{ success: boolean; templateId?: number; error?: string }> {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const rule = await getCostAlertRuleById(ruleId);
  if (!rule) {
    return { success: false, error: "Rule not found" };
  }
  
  const ruleConfig = JSON.stringify({
    scope: rule.scope,
    alertType: rule.alertType,
    threshold: rule.threshold,
    alertLevel: rule.alertLevel,
    notifyType: rule.notifyType,
    notifyUserIds: rule.notifyUserIds,
  });
  
  const result = await db.insert(costAlertRuleTemplates).values({
    name: templateName,
    description: description || rule.description,
    templateType: "custom",
    category,
    ruleConfig,
    usageCount: 0,
    isActive: 1,
    createdBy: userId || null,
  } as any) as any;

  return { success: true, templateId: result[0]?.insertId ?? result.insertId };
}

/**
 * Initialize built-in templates
 */
export async function initializeBuiltinTemplates(): Promise<{ created: number; skipped: number }> {
  const db = await requireDb();
  if (!db) return { created: 0, skipped: 0 };
  
  const builtinTemplates = [
    // Budget category
    {
      name: "预算使用80%预警",
      description: "当项目预算使用达到80%时触发警告级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 80,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "预算使用95%预警",
      description: "当项目预算使用达到95%时触发严重级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 95,
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    {
      name: "预算超支预警",
      description: "当项目预算使用超过100%时触发紧急级别预警",
      templateType: "builtin" as const,
      category: "budget" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "emergency",
        notifyType: "both"
      })
    },
    // Performance category
    {
      name: "CPI低于0.9预警",
      description: "当成本绩效指数(CPI)低于0.9时触发警告，表示成本效率较低",
      templateType: "builtin" as const,
      category: "performance" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "cpi",
        threshold: 90, // stored as 90 for 0.9
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "CPI低于0.8预警",
      description: "当成本绩效指数(CPI)低于0.8时触发严重预警，表示成本严重超支",
      templateType: "builtin" as const,
      category: "performance" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "cpi",
        threshold: 80, // stored as 80 for 0.8
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    // Cost category
    {
      name: "单笔支出超10万预警",
      description: "当单笔成本支出超过10万元时触发预警",
      templateType: "builtin" as const,
      category: "cost" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "absolute_amount",
        threshold: 10000000, // 10万元 = 10000000分
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "单笔支出超50万预警",
      description: "当单笔成本支出超过50万元时触发严重预警",
      templateType: "builtin" as const,
      category: "cost" as const,
      ruleConfig: JSON.stringify({
        scope: "all",
        alertType: "absolute_amount",
        threshold: 50000000, // 50万元 = 50000000分
        alertLevel: "critical",
        notifyType: "both"
      })
    },
    // Risk category
    {
      name: "材料成本超预算预警",
      description: "当材料成本类别超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "人工成本超预算预警",
      description: "当人工成本类别超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    },
    {
      name: "差旅费超预算预警",
      description: "当差旅费用超过预算时触发预警",
      templateType: "builtin" as const,
      category: "risk" as const,
      ruleConfig: JSON.stringify({
        scope: "category",
        alertType: "budget_percent",
        threshold: 100,
        alertLevel: "warning",
        notifyType: "system"
      })
    }
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const template of builtinTemplates) {
    // Check if template already exists
    const existing = await db.select()
      .from(costAlertRuleTemplates)
      .where(and(
        eq(costAlertRuleTemplates.name, template.name),
        eq(costAlertRuleTemplates.templateType, "builtin")
      ))
      .limit(1000);

    if (existing.length > 0) {
      skipped++;
      continue;
    }
    
    await db.insert(costAlertRuleTemplates).values(template);
    created++;
  }
  
  return { created, skipped };
}



// ============================================
// Naming Rules Change Management
// ============================================

import { 
  namingRuleApprovers, InsertNamingRuleApprover, NamingRuleApprover,
  namingChangeRequests, InsertNamingChangeRequest, NamingChangeRequest,
  namingChangeImplementations, InsertNamingChangeImplementation, NamingChangeImplementation,
  namingChangeTests, InsertNamingChangeTest, NamingChangeTest,
  namingVersions, InsertNamingVersion, NamingVersion,
  equipmentModels, InsertEquipmentModel, EquipmentModel,
  equipmentNameHistory, InsertEquipmentNameHistory, EquipmentNameHistory,
  projectNumberCounters, InsertProjectNumberCounter, ProjectNumberCounter,
  projectConversionHistory, InsertProjectConversionHistory, ProjectConversionHistory
} from "../drizzle/schema";

// ============================================
// Naming Rule Approvers Management
// ============================================

/**
 * Get all naming rule approvers
 */
export async function getNamingRuleApprovers(filters?: {
  ruleType?: "equipment" | "project" | "material" | "all";
  changeType?: "add" | "modify" | "delete" | "correct" | "all";
  isActive?: boolean;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingRuleApprovers);
  
  const conditions = [];
  if (filters?.ruleType) {
    conditions.push(eq(namingRuleApprovers.ruleType, filters.ruleType));
  }
  if (filters?.changeType) {
    conditions.push(eq(namingRuleApprovers.changeType, filters.changeType));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(namingRuleApprovers.isActive, filters.isActive as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.limit(1000);
}

/**
 * Create naming rule approver
 */
export async function createNamingRuleApprover(data: {
  userId: number;
  ruleType: "equipment" | "project" | "material" | "all";
  changeType: "add" | "modify" | "delete" | "correct" | "all";
  approvalLevel?: number;
  remark?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingRuleApprovers).values(data as any) as any;
  return { id: result[0]?.insertId ?? result.insertId, ...data };
}

/**
 * Update naming rule approver
 */
export async function updateNamingRuleApprover(id: number, data: Partial<{
  ruleType: "equipment" | "project" | "material" | "all";
  changeType: "add" | "modify" | "delete" | "correct" | "all";
  approvalLevel: number;
  isActive: boolean;
  remark: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingRuleApprovers).set(data as any).where(eq(namingRuleApprovers.id, id));
  return { success: true };
}

/**
 * Delete naming rule approver
 */
export async function deleteNamingRuleApprover(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.delete(namingRuleApprovers).where(eq(namingRuleApprovers.id, id));
  return { success: true };
}

/**
 * Get approvers for a specific change request
 */
export async function getApproversForChange(
  ruleType: "equipment" | "project" | "material",
  changeType: "add" | "modify" | "delete" | "correct"
) {
  const db = await requireDb();
  if (!db) return [];
  
  // Get approvers that match the specific type or "all"
  const result = await db.select()
    .from(namingRuleApprovers)
    .where(and(
      or(
        eq(namingRuleApprovers.ruleType, ruleType),
        eq(namingRuleApprovers.ruleType, "all")
      ),
      or(
        eq(namingRuleApprovers.changeType, changeType),
        eq(namingRuleApprovers.changeType, "all")
      ),
      eq(namingRuleApprovers.isActive, true as any)
    ))
    .orderBy(namingRuleApprovers.approvalLevel)
    .limit(1000);

  return result;
}

// ============================================
// Naming Change Requests Management
// ============================================

/**
 * Generate change request code
 */
export async function generateChangeRequestCode(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  const db = await requireDb();
  if (!db) return `CR-${dateStr}-001`;
  
  // Find the max code for today
  const result = await db.select()
    .from(namingChangeRequests)
    .where(sql`${namingChangeRequests.requestCode} LIKE ${`CR-${dateStr}-%`}`)
    .orderBy(desc(namingChangeRequests.requestCode))
    .limit(1);
  
  if (result.length === 0) {
    return `CR-${dateStr}-001`;
  }
  
  const lastCode = result[0].requestCode;
  const lastSeq = parseInt(lastCode.split('-')[2], 10);
  const newSeq = (lastSeq + 1).toString().padStart(3, '0');
  
  return `CR-${dateStr}-${newSeq}`;
}

/**
 * Get all naming change requests
 */
export async function getNamingChangeRequests(filters?: {
  status?: "pending" | "approved" | "rejected" | "implementing" | "testing" | "completed" | "cancelled";
  ruleType?: "equipment" | "project" | "material";
  requestType?: "add" | "modify" | "delete" | "correct";
  requestorId?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingChangeRequests);
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(namingChangeRequests.status, filters.status));
  }
  if (filters?.ruleType) {
    conditions.push(eq(namingChangeRequests.ruleType, filters.ruleType));
  }
  if (filters?.requestType) {
    conditions.push(eq(namingChangeRequests.requestType, filters.requestType));
  }
  if (filters?.requestorId) {
    conditions.push(eq(namingChangeRequests.requestorId, filters.requestorId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(desc(namingChangeRequests.createdAt)).limit(1000);
}

/**
 * Get naming change request by ID
 */
export async function getNamingChangeRequestById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(namingChangeRequests).where(eq(namingChangeRequests.id, id));
  return result[0] || null;
}

/**
 * Create naming change request
 */
export async function createNamingChangeRequest(data: {
  requestType: "add" | "modify" | "delete" | "correct";
  ruleType: "equipment" | "project" | "material";
  title: string;
  description: string;
  reason: string;
  impactScope?: string;
  requestorId: number;
  requestorName?: string;
  oldVersion?: string;
  newVersion?: string;
  effectiveDate?: string;
  changeData?: string;
  attachments?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const requestCode = await generateChangeRequestCode();
  
  // Get first approver
  const approvers = await getApproversForChange(data.ruleType, data.requestType);
  const firstApprover = approvers.length > 0 ? approvers[0] : null;
  
  const result = await db.insert(namingChangeRequests).values({
    ...data,
    requestCode,
    currentApproverId: firstApprover?.userId,
    status: "pending"
  });
  
  return { id: result[0].insertId, requestCode, ...data };
}

/**
 * Update naming change request
 */
export async function updateNamingChangeRequest(id: number, data: Partial<{
  title: string;
  description: string;
  reason: string;
  impactScope: string;
  status: "pending" | "approved" | "rejected" | "implementing" | "testing" | "completed" | "cancelled";
  currentApproverId: number;
  approverName: string;
  approvalDate: string;
  approvalNotes: string;
  oldVersion: string;
  newVersion: string;
  effectiveDate: string;
  changeData: string;
  attachments: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set(data).where(eq(namingChangeRequests.id, id));
  return { success: true };
}

/**
 * Approve naming change request
 */
export async function approveNamingChangeRequest(id: number, approverId: number, approverName: string, notes?: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set({
    status: "approved",
    approverName,
    approvalDate: new Date().toISOString(),
    approvalNotes: notes
  }).where(eq(namingChangeRequests.id, id));
  
  return { success: true };
}

/**
 * Reject naming change request
 */
export async function rejectNamingChangeRequest(id: number, approverId: number, approverName: string, notes: string) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeRequests).set({
    status: "rejected",
    approverName,
    approvalDate: new Date().toISOString(),
    approvalNotes: notes
  }).where(eq(namingChangeRequests.id, id));
  
  return { success: true };
}

// ============================================
// Naming Change Implementations Management
// ============================================

/**
 * Get implementations for a change request
 */
export async function getNamingChangeImplementations(requestId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(namingChangeImplementations)
    .where(eq(namingChangeImplementations.requestId, requestId))
    .orderBy(namingChangeImplementations.createdAt)
    .limit(1000);
}

/**
 * Create naming change implementation record
 */
export async function createNamingChangeImplementation(data: {
  requestId: number;
  phase: "development" | "testing" | "recording" | "release";
  executorId?: number;
  executorName?: string;
  startTime?: string;
  result?: string;
  notes?: string;
  attachments?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingChangeImplementations).values({
    ...data,
    startTime: data.startTime || new Date().toISOString(),
    status: "in_progress"
  });
  
  return { id: result[0].insertId, ...data };
}

/**
 * Update naming change implementation
 */
export async function updateNamingChangeImplementation(id: number, data: Partial<{
  endTime: string;
  status: "in_progress" | "completed" | "failed";
  result: string;
  notes: string;
  attachments: string;
}>) {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(namingChangeImplementations).set(data).where(eq(namingChangeImplementations.id, id));
  return { success: true };
}

// ============================================
// Naming Change Tests Management
// ============================================

/**
 * Get tests for a change request
 */
export async function getNamingChangeTests(requestId: number) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(namingChangeTests)
    .where(eq(namingChangeTests.requestId, requestId))
    .orderBy(desc(namingChangeTests.testDate))
    .limit(1000);
}

/**
 * Create naming change test record
 */
export async function createNamingChangeTest(data: {
  requestId: number;
  testerId?: number;
  testerName?: string;
  testEnvironment?: string;
  testItems?: string;
  testResult: "pass" | "fail" | "partial";
  issues?: string;
  notes?: string;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(namingChangeTests).values(data);
  return { id: result[0].insertId, ...data };
}

// ============================================
// Naming Versions Management
// ============================================

/**
 * Get all naming versions
 */
export async function getNamingVersions(ruleType?: "equipment" | "project" | "material") {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(namingVersions);
  
  if (ruleType) {
    query = query.where(eq(namingVersions.ruleType, ruleType)) as typeof query;
  }
  
  return query.orderBy(desc(namingVersions.effectiveDate)).limit(1000);
}

/**
 * Get current naming version
 */
export async function getCurrentNamingVersion(ruleType: "equipment" | "project" | "material") {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(namingVersions)
    .where(and(
      eq(namingVersions.ruleType, ruleType),
      eq(namingVersions.isCurrent, true as any)
    ))
    .limit(1000);

  return result[0] || null;
}

/**
 * Create naming version
 */
export async function createNamingVersion(data: {
  versionCode: string;
  versionName?: string;
  ruleType: "equipment" | "project" | "material";
  effectiveDate: string;
  changeType: "major" | "minor" | "patch";
  changeDescription?: string;
  changeRequestId?: number;
  isCurrent?: boolean;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  // If this is set as current, unset other current versions
  if (data.isCurrent) {
    await db.update(namingVersions)
      .set({ isCurrent: false } as any)
      .where(eq(namingVersions.ruleType, data.ruleType));
  }
  
  const result = await db.insert(namingVersions).values(data as any) as any;
  return { id: result[0]?.insertId ?? result.insertId, ...data };
}

// ============================================
// Equipment Models Management
// ============================================

/**
 * Get all equipment models
 */
export async function getEquipmentModels(filters?: {
  categoryCode?: string;
  status?: "active" | "deprecated" | "obsolete";
  search?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(equipmentModels);
  
  const conditions = [];
  if (filters?.categoryCode) {
    conditions.push(eq(equipmentModels.categoryCode, filters.categoryCode));
  }
  if (filters?.status) {
    conditions.push(eq(equipmentModels.status, filters.status));
  }
  if (filters?.search) {
    conditions.push(or(
      sql`${equipmentModels.numericCode} LIKE ${`%${filters.search}%`}`,
      sql`${equipmentModels.fullName} LIKE ${`%${filters.search}%`}`,
      sql`${equipmentModels.chineseName} LIKE ${`%${filters.search}%`}`
    ));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(equipmentModels.numericCode).limit(1000);
}

/**
 * Get equipment model by ID
 */
export async function getEquipmentModelById(id: number) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(equipmentModels).where(eq(equipmentModels.id, id));
  return result[0] || null;
}

/**
 * Get equipment model by numeric code
 */
export async function getEquipmentModelByCode(numericCode: string) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(equipmentModels).where(eq(equipmentModels.numericCode, numericCode)).limit(1000);
  return result[0] || null;
}

/**
 * Create equipment model
 */
export async function createEquipmentModel(data: {
  numericCode: string;
  functionCode: string;
  categoryCode: string;
  fullName: string;
  chineseName: string;
  displayName?: string;
  chamberCount?: number;
  processType?: string;
  configLevel?: string;
  applicableIndustry?: string;
  namingVersion?: string;
  effectiveDate: string;
  remark?: string;
  createdBy?: number;
}) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(equipmentModels).values(data);
  return { id: result[0].insertId, ...data };
}

/**
 * Update equipment model
 */
export async function updateEquipmentModel(id: number, data: Partial<{
  fullName: string;
  chineseName: string;
  displayName: string;
  chamberCount: number;
  processType: string;
  configLevel: string;
  applicableIndustry: string;
  namingVersion: string;
  status: "active" | "deprecated" | "obsolete";
  remark: string;
}>, userId?: number, changeReason?: string) {
  const db = await requireDb();
  if (!db) return null;
  
  // Get current data for history
  const current = await getEquipmentModelById(id);
  if (!current) return null;
  
  // If name changed, record history
  if (data.fullName || data.chineseName || data.displayName) {
    await db.insert(equipmentNameHistory).values({
      equipmentId: id,
      numericCode: current.numericCode,
      oldName: current.fullName,
      newName: data.fullName || current.fullName,
      oldChineseName: current.chineseName,
      newChineseName: data.chineseName || current.chineseName,
      changeReason: changeReason || "手动调整",
      changeType: "manual",
      namingVersion: data.namingVersion || current.namingVersion,
      effectiveDate: new Date().toISOString(),
      createdBy: userId
    });
  }
  
  await db.update(equipmentModels).set(data).where(eq(equipmentModels.id, id));
  return { success: true };
}

/**
 * Get equipment name history
 */
export async function getEquipmentNameHistoryByCode(numericCode: string) {
  const db = await requireDb();
  if (!db) return [];
  
  return db.select()
    .from(equipmentNameHistory)
    .where(eq(equipmentNameHistory.numericCode, numericCode))
    .orderBy(desc(equipmentNameHistory.createdAt))
    .limit(1000);
}

// ============================================
// Project Number Management
// ============================================

/**
 * Get project number counter
 */
export async function getProjectNumberCounter(prefix: string) {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.select().from(projectNumberCounters).where(eq(projectNumberCounters.prefix, prefix)).limit(1000);
  return result[0] || null;
}

/**
 * Initialize project number counters
 */
export async function initProjectNumberCounters() {
  const db = await requireDb();
  if (!db) return null;
  
  // Initialize T counter (starting from current max ~500)
  const tCounter = await getProjectNumberCounter("T");
  if (!tCounter) {
    await db.insert(projectNumberCounters).values({
      prefix: "T",
      currentMax: 500,
      nextAvailable: 501,
      formatDigits: 3
    });
  }
  
  // Initialize GRT counter (starting from current max ~500)
  const grtCounter = await getProjectNumberCounter("GRT");
  if (!grtCounter) {
    await db.insert(projectNumberCounters).values({
      prefix: "GRT",
      currentMax: 500,
      nextAvailable: 501,
      formatDigits: 3
    });
  }
  
  return { success: true };
}

/**
 * Generate next project number
 */
export async function generateNextProjectNumber(prefix: "T" | "GRT"): Promise<string> {
  const db = await requireDb();
  if (!db) return `${prefix}001`;
  
  let counter = await getProjectNumberCounter(prefix);
  
  // Initialize if not exists
  if (!counter) {
    await initProjectNumberCounters();
    counter = await getProjectNumberCounter(prefix);
  }
  
  if (!counter) return `${prefix}001`;
  
  const nextNum = counter.nextAvailable;
  let formatDigits = counter.formatDigits;
  
  // Auto-upgrade from 3 to 4 digits when reaching 999
  if (nextNum > 999 && formatDigits === 3) {
    formatDigits = 4;
  }
  
  const paddedNum = nextNum.toString().padStart(formatDigits, '0');
  const newCode = `${prefix}${paddedNum}`;
  
  // Update counter
  await db.update(projectNumberCounters).set({
    currentMax: nextNum,
    nextAvailable: nextNum + 1,
    formatDigits
  }).where(eq(projectNumberCounters.prefix, prefix));
  
  return newCode;
}

/**
 * Convert temporary project to formal project
 */
export async function convertProjectNumber(
  tempCode: string,
  contractNo?: string,
  userId?: number,
  remark?: string
): Promise<{ formalCode: string; success: boolean }> {
  const db = await requireDb();
  if (!db) return { formalCode: "", success: false };
  
  // Generate formal GRT number
  const formalCode = await generateNextProjectNumber("GRT");
  
  // Get current version
  const currentVersion = await getCurrentNamingVersion("project");
  
  // Record conversion
  await db.insert(projectConversionHistory).values({
    tempProjectCode: tempCode,
    formalProjectCode: formalCode,
    conversionDate: new Date().toISOString(),
    contractNo,
    numberingVersion: currentVersion?.versionCode || "V1.0",
    remark,
    createdBy: userId
  });
  
  return { formalCode, success: true };
}

/**
 * Get project conversion history
 */
export async function getProjectConversionHistory(filters?: {
  tempCode?: string;
  formalCode?: string;
}) {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(projectConversionHistory);
  
  const conditions = [];
  if (filters?.tempCode) {
    conditions.push(eq(projectConversionHistory.tempProjectCode, filters.tempCode));
  }
  if (filters?.formalCode) {
    conditions.push(eq(projectConversionHistory.formalProjectCode, filters.formalCode));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return query.orderBy(desc(projectConversionHistory.conversionDate)).limit(1000);
}

// ============================================
// Initialize Default Data
// ============================================

/**
 * Initialize default naming versions
 */
export async function initDefaultNamingVersions() {
  const db = await requireDb();
  if (!db) return null;
  
  const ruleTypes: Array<"equipment" | "project" | "material"> = ["equipment", "project", "material"];
  
  for (const ruleType of ruleTypes) {
    const existing = await getCurrentNamingVersion(ruleType);
    if (!existing) {
      await createNamingVersion({
        versionCode: `${ruleType.toUpperCase()}-V1.0`,
        versionName: `${ruleType === "equipment" ? "设备" : ruleType === "project" ? "项目" : "物料"}命名规则V1.0`,
        ruleType,
        effectiveDate: new Date("2026-01-17").toISOString(),
        changeType: "major",
        changeDescription: "初始版本，建立命名体系",
        isCurrent: true
      });
    }
  }
  
  return { success: true };
}

/**
 * Initialize sample equipment models
 */
export async function initSampleEquipmentModels() {
  const db = await requireDb();
  if (!db) return null;
  
  const sampleModels = [
    // 8XX - Chamber series
    { numericCode: "801", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 801", chineseName: "超声波腔体清洗机", chamberCount: 1, processType: "超声波", configLevel: "标准" },
    { numericCode: "802", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 802", chineseName: "超声波腔体清洗机", chamberCount: 2, processType: "超声波", configLevel: "标准" },
    { numericCode: "811", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 811", chineseName: "超声波增强腔体清洗机", chamberCount: 1, processType: "超声波增强", configLevel: "增强" },
    { numericCode: "821", functionCode: "SP", categoryCode: "8", fullName: "Spray 821", chineseName: "喷淋腔体清洗机", chamberCount: 1, processType: "高压喷淋", configLevel: "标准" },
    { numericCode: "831", functionCode: "VC", categoryCode: "8", fullName: "Vacuum 831", chineseName: "真空腔体清洗机", chamberCount: 1, processType: "真空清洗", configLevel: "标准" },
    { numericCode: "851", functionCode: "US", categoryCode: "8", fullName: "Ultrasonic 851", chineseName: "大型超声波腔体清洗机", chamberCount: 1, processType: "超声波", configLevel: "大型" },
    // 5XXX - Passline series
    { numericCode: "5000", functionCode: "PL", categoryCode: "5", fullName: "Passline 5000", chineseName: "通过式清洗线", processType: "标准节拍", configLevel: "基础" },
    { numericCode: "5010", functionCode: "PL", categoryCode: "5", fullName: "Passline 5010", chineseName: "通过式清洗线", processType: "标准节拍", configLevel: "标准" },
    { numericCode: "5100", functionCode: "PL", categoryCode: "5", fullName: "Passline 5100", chineseName: "高速通过式清洗线", processType: "高速节拍", configLevel: "基础" },
    // 2XX - Standard series
    { numericCode: "200", functionCode: "US", categoryCode: "2", fullName: "Ultrasonic 200", chineseName: "超声波清洗机", processType: "超声波", configLevel: "基础" },
    { numericCode: "201", functionCode: "US", categoryCode: "2", fullName: "Ultrasonic 201", chineseName: "超声波清洗机", processType: "超声波", configLevel: "标准" },
    // 3XX - Specialized series
    { numericCode: "300", functionCode: "AU", categoryCode: "3", fullName: "Auto 300", chineseName: "汽车零部件清洗机", applicableIndustry: "汽车", processType: "综合", configLevel: "基础" },
    { numericCode: "310", functionCode: "NE", categoryCode: "3", fullName: "NEV 310", chineseName: "新能源零部件清洗机", applicableIndustry: "新能源", processType: "综合", configLevel: "基础" },
  ];
  
  let created = 0;
  for (const model of sampleModels) {
    const existing = await getEquipmentModelByCode(model.numericCode);
    if (!existing) {
      await createEquipmentModel({
        ...model,
        effectiveDate: new Date("2026-01-17").toISOString(),
        namingVersion: "V1.0"
      });
      created++;
    }
  }
  
  return { created };
}


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


// ==========================================
// Teams Meeting & AI Interview Enhancement
// ==========================================

import { 
  teamsMeetingConfigs, InsertTeamsMeetingConfig, TeamsMeetingConfig,
  aiInterviewAnalytics, InsertAiInterviewAnalytic, AiInterviewAnalytic,
  performanceReviewEmailLogs, InsertPerformanceReviewEmailLog, PerformanceReviewEmailLog,
  scheduledTasks, InsertScheduledTask, ScheduledTask,
  salaryCalculations, InsertSalaryCalculation, SalaryCalculation
} from "../drizzle/schema";

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
  return { id: result[0].insertId };
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
  return { id: result[0].insertId };
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
  return { id: result[0].insertId };
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
  return { id: result[0].insertId };
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


// ============================================
// AI助手双层体系架构 - v2.1.0
// RFC-023: AI助手双层体系架构
// ============================================

// ============================================
// 员工数字助手(DA)管理
// ============================================

/**
 * 创建员工数字助手
 * 自动生成 {employeeId}-DA 格式的助手代码
 */
export async function createEmployeeDA(data: {
  employeeId: string;
  displayName?: string;
  workHabits?: object;
  preferences?: object;
  expertise?: string[];
  communicationStyle?: string;
}): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const assistantCode = `${data.employeeId}-DA`;
  
  const result = await db.insert(employeeDigitalAssistants).values({
    employeeId: data.employeeId,
    assistantCode,
    displayName: data.displayName || `${data.employeeId}的数字助手`,
    workHabits: data.workHabits ? JSON.stringify(data.workHabits) : null,
    preferences: data.preferences ? JSON.stringify(data.preferences) : null,
    expertise: data.expertise ? JSON.stringify(data.expertise) : null,
    communicationStyle: data.communicationStyle,
  });
  
  const [created] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.assistantCode, assistantCode))
    .limit(1000);
  return created || null;
}

/**
 * 获取员工的数字助手
 */
export async function getEmployeeDAByEmployeeId(employeeId: string): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [da] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.employeeId, employeeId))
    .limit(1000);
  return da || null;
}

/**
 * 获取所有员工数字助手
 */
export async function getAllEmployeeDAs(filters?: {
  isActive?: boolean;
}): Promise<EmployeeDigitalAssistant[]> {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(employeeDigitalAssistants);
  
  if (filters?.isActive !== undefined) {
    query = query.where(eq(employeeDigitalAssistants.isActive, filters.isActive as any)) as typeof query;
  }
  
  return await query.orderBy(desc(employeeDigitalAssistants.createdAt)).limit(1000);
}

/**
 * 更新员工数字助手
 */
export async function updateEmployeeDA(
  id: number,
  data: Partial<{
    displayName: string;
    workHabits: object;
    preferences: object;
    expertise: string[];
    communicationStyle: string;
    canTaskAssist: boolean;
    canScheduleManage: boolean;
    canDocumentDraft: boolean;
    canDataAnalysis: boolean;
    canCommunicationProxy: boolean;
    isActive: boolean;
  }>
): Promise<EmployeeDigitalAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = {};
  
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.workHabits !== undefined) updateData.workHabits = JSON.stringify(data.workHabits);
  if (data.preferences !== undefined) updateData.preferences = JSON.stringify(data.preferences);
  if (data.expertise !== undefined) updateData.expertise = JSON.stringify(data.expertise);
  if (data.communicationStyle !== undefined) updateData.communicationStyle = data.communicationStyle;
  if (data.canTaskAssist !== undefined) updateData.canTaskAssist = data.canTaskAssist;
  if (data.canScheduleManage !== undefined) updateData.canScheduleManage = data.canScheduleManage;
  if (data.canDocumentDraft !== undefined) updateData.canDocumentDraft = data.canDocumentDraft;
  if (data.canDataAnalysis !== undefined) updateData.canDataAnalysis = data.canDataAnalysis;
  if (data.canCommunicationProxy !== undefined) updateData.canCommunicationProxy = data.canCommunicationProxy;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await db.update(employeeDigitalAssistants)
    .set(updateData)
    .where(eq(employeeDigitalAssistants.id, id));
  
  const [updated] = await db.select().from(employeeDigitalAssistants)
    .where(eq(employeeDigitalAssistants.id, id));
  return updated || null;
}

/**
 * 记录员工DA活动时间
 */
export async function recordEmployeeDAActivity(id: number): Promise<void> {
  const db = await requireDb();
  if (!db) return;
  
  await db.update(employeeDigitalAssistants)
    .set({ lastActiveAt: new Date().toISOString() })
    .where(eq(employeeDigitalAssistants.id, id));
}

// ============================================
// 功能型AI助手管理
// ============================================

/**
 * 获取所有功能型AI助手
 */
export async function getAllFunctionalAssistants(filters?: {
  isActive?: boolean;
  assistantType?: string;
}): Promise<FunctionalAiAssistant[]> {
  const db = await requireDb();
  if (!db) return [];
  
  let query = db.select().from(functionalAiAssistants);
  
  const conditions = [];
  if (filters?.isActive !== undefined) {
    conditions.push(eq(functionalAiAssistants.isActive, filters.isActive as any));
  }
  if (filters?.assistantType) {
    conditions.push(eq(functionalAiAssistants.assistantType, filters.assistantType as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return await query.orderBy(functionalAiAssistants.assistantType).limit(1000);
}

/**
 * 获取指定类型的功能型AI助手
 */
export async function getFunctionalAssistantByType(
  assistantType: "solution" | "quotation" | "planning" | "kpi" | "interview" | "purchase" | "engineering" | "quality"
): Promise<FunctionalAiAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [assistant] = await db.select().from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.assistantType, assistantType))
    .limit(1000);
  return assistant || null;
}

/**
 * 更新功能型AI助手配置
 */
export async function updateFunctionalAssistant(
  id: number,
  data: Partial<{
    displayName: string;
    description: string;
    systemPrompt: string;
    temperature: string;
    maxTokens: number;
    dataAccess: string[];
    actions: string[];
    integrations: string[];
    isActive: boolean;
    version: string;
  }>
): Promise<FunctionalAiAssistant | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = {};
  
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
  if (data.temperature !== undefined) updateData.temperature = data.temperature;
  if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
  if (data.dataAccess !== undefined) updateData.dataAccess = JSON.stringify(data.dataAccess);
  if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions);
  if (data.integrations !== undefined) updateData.integrations = JSON.stringify(data.integrations);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.version !== undefined) updateData.version = data.version;
  
  await db.update(functionalAiAssistants)
    .set(updateData)
    .where(eq(functionalAiAssistants.id, id));
  
  const [updated] = await db.select().from(functionalAiAssistants)
    .where(eq(functionalAiAssistants.id, id));
  return updated || null;
}

// ============================================
// AI流程建议管理
// ============================================

/**
 * 创建AI流程建议
 */
export async function createAiProcessSuggestion(data: {
  processType: string;
  processId: string;
  stepCode: string;
  stepName?: string;
  suggestionMode: "full_process" | "current_step" | "single_action";
  suggestionSummary?: string;
  suggestionDetails?: string[];
  suggestedActions?: Array<{ actionId: string; actionName: string; description: string }>;
  references?: Array<{ type: string; title: string; url: string }>;
  priority?: "high" | "medium" | "low";
  estimatedTime?: number;
  assistantId?: number;
  assistantType?: string;
}): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.insert(aiProcessSuggestions).values({
    processType: data.processType,
    processId: data.processId,
    stepCode: data.stepCode,
    stepName: data.stepName,
    suggestionMode: data.suggestionMode,
    suggestionSummary: data.suggestionSummary,
    suggestionDetails: data.suggestionDetails ? JSON.stringify(data.suggestionDetails) : null,
    suggestedActions: data.suggestedActions ? JSON.stringify(data.suggestedActions) : null,
    references: data.references ? JSON.stringify(data.references) : null,
    priority: data.priority || "medium",
    estimatedTime: data.estimatedTime,
    assistantId: data.assistantId,
    assistantType: data.assistantType,
  });
  
  const [created] = await db.select().from(aiProcessSuggestions)
    .orderBy(desc(aiProcessSuggestions.id))
    .limit(1);
  return created || null;
}

/**
 * 获取全过程AI建议
 */
export async function getFullProcessSuggestions(
  processType: string,
  processId: string
): Promise<AiProcessSuggestion[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select().from(aiProcessSuggestions)
    .where(and(
      eq(aiProcessSuggestions.processType, processType),
      eq(aiProcessSuggestions.processId, processId),
      eq(aiProcessSuggestions.suggestionMode, "full_process")
    ))
    .orderBy(aiProcessSuggestions.stepCode)
    .limit(1000);
}

/**
 * 获取当前步骤AI建议
 */
export async function getCurrentStepSuggestion(
  processType: string,
  processId: string,
  stepCode: string
): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const [suggestion] = await db.select().from(aiProcessSuggestions)
    .where(and(
      eq(aiProcessSuggestions.processType, processType),
      eq(aiProcessSuggestions.processId, processId),
      eq(aiProcessSuggestions.stepCode, stepCode),
      eq(aiProcessSuggestions.suggestionMode, "current_step")
    ))
    .orderBy(desc(aiProcessSuggestions.createdAt))
    .limit(1);
  
  return suggestion || null;
}

/**
 * 标记AI建议已应用
 */
export async function markSuggestionApplied(
  id: number,
  appliedBy: string,
  applyResult?: object
): Promise<AiProcessSuggestion | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.update(aiProcessSuggestions)
    .set({
      isApplied: true as any,
      appliedAt: new Date().toISOString(),
      appliedBy,
      applyResult: applyResult ? JSON.stringify(applyResult) : null,
    })
    .where(eq(aiProcessSuggestions.id, id));
  
  const [updated] = await db.select().from(aiProcessSuggestions)
    .where(eq(aiProcessSuggestions.id, id));
  return updated || null;
}

/**
 * 创建AI建议执行日志
 */
export async function createSuggestionExecutionLog(data: {
  suggestionId: number;
  actionId: string;
  actionName?: string;
  executedBy: string;
}): Promise<AiSuggestionExecutionLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  await db.insert(aiSuggestionExecutionLogs).values({
    suggestionId: data.suggestionId,
    actionId: data.actionId,
    actionName: data.actionName,
    executedBy: data.executedBy,
    status: "pending",
    startedAt: new Date().toISOString(),
  });
  
  const [created] = await db.select().from(aiSuggestionExecutionLogs)
    .orderBy(desc(aiSuggestionExecutionLogs.id))
    .limit(1);
  return created || null;
}

/**
 * 更新AI建议执行状态
 */
export async function updateSuggestionExecutionStatus(
  id: number,
  status: "pending" | "running" | "completed" | "failed",
  result?: object,
  errorMessage?: string,
  nextSuggestion?: string
): Promise<AiSuggestionExecutionLog | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const updateData: Record<string, any> = { status };
  
  if (result !== undefined) updateData.result = JSON.stringify(result);
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
  if (nextSuggestion !== undefined) updateData.nextSuggestion = nextSuggestion;
  
  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date().toISOString();
  }
  
  await db.update(aiSuggestionExecutionLogs)
    .set(updateData)
    .where(eq(aiSuggestionExecutionLogs.id, id));
  
  const [updated] = await db.select().from(aiSuggestionExecutionLogs)
    .where(eq(aiSuggestionExecutionLogs.id, id));
  return updated || null;
}

/**
 * 获取建议的执行日志
 */
export async function getSuggestionExecutionLogs(suggestionId: number): Promise<AiSuggestionExecutionLog[]> {
  const db = await requireDb();
  if (!db) return [];
  
  return await db.select().from(aiSuggestionExecutionLogs)
    .where(eq(aiSuggestionExecutionLogs.suggestionId, suggestionId))
    .orderBy(desc(aiSuggestionExecutionLogs.createdAt))
    .limit(1000);
}


// ==================== 用户偏好管理 ====================

export interface UserPreference {
  id: number;
  userId: number;
  language: string;
  theme: string;
  sidebarCollapsed: boolean;
  dashboardLayout: object | null;
  notificationSettings: object | null;
  timezone: string;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUserPreference {
  userId: number;
  language?: string;
  theme?: string;
  sidebarCollapsed?: boolean;
  dashboardLayout?: object;
  notificationSettings?: object;
  timezone?: string;
  dateFormat?: string;
}

/**
 * 获取用户偏好设置
 */
export async function getUserPreferences(userId: number): Promise<UserPreference | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM user_preferences WHERE user_id = ${userId} LIMIT 1`
  );
  
  const rows = result[0] as any[];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    theme: row.theme,
    sidebarCollapsed: Boolean(row.sidebar_collapsed),
    dashboardLayout: row.dashboard_layout ? JSON.parse(row.dashboard_layout) : null,
    notificationSettings: row.notification_settings ? JSON.parse(row.notification_settings) : null,
    timezone: row.timezone,
    dateFormat: row.date_format,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建或更新用户偏好设置
 */
export async function upsertUserPreferences(
  userId: number,
  preferences: Partial<InsertUserPreference>
): Promise<UserPreference | null> {
  const db = await requireDb();
  if (!db) return null;
  
  // 检查是否已存在
  const existing = await getUserPreferences(userId);
  
  if (existing) {
    // 更新现有记录
    const setParts: SQL[] = [];

    if (preferences.language !== undefined) {
      setParts.push(sql`language = ${preferences.language}`);
    }
    if (preferences.theme !== undefined) {
      setParts.push(sql`theme = ${preferences.theme}`);
    }
    if (preferences.sidebarCollapsed !== undefined) {
      setParts.push(sql`sidebar_collapsed = ${preferences.sidebarCollapsed ? 1 : 0}`);
    }
    if (preferences.dashboardLayout !== undefined) {
      setParts.push(sql`dashboard_layout = ${JSON.stringify(preferences.dashboardLayout)}`);
    }
    if (preferences.notificationSettings !== undefined) {
      setParts.push(sql`notification_settings = ${JSON.stringify(preferences.notificationSettings)}`);
    }
    if (preferences.timezone !== undefined) {
      setParts.push(sql`timezone = ${preferences.timezone}`);
    }
    if (preferences.dateFormat !== undefined) {
      setParts.push(sql`date_format = ${preferences.dateFormat}`);
    }

    if (setParts.length > 0) {
      await db.execute(
        sql`UPDATE user_preferences SET ${sql.join(setParts, sql`, `)} WHERE user_id = ${userId}`
      );
    }
  } else {
    // 创建新记录
    await db.execute(
      sql`INSERT INTO user_preferences (user_id, language, theme, sidebar_collapsed, timezone, date_format) 
          VALUES (${userId}, ${preferences.language || 'zh'}, ${preferences.theme || 'dark'}, 
                  ${preferences.sidebarCollapsed ? 1 : 0}, ${preferences.timezone || 'Asia/Shanghai'}, 
                  ${preferences.dateFormat || 'YYYY-MM-DD'})`
    );
  }
  
  return await getUserPreferences(userId);
}

/**
 * 更新用户语言偏好
 */
export async function updateUserLanguage(userId: number, language: string): Promise<UserPreference | null> {
  return await upsertUserPreferences(userId, { language });
}

/**
 * 更新用户主题偏好
 */
export async function updateUserTheme(userId: number, theme: string): Promise<UserPreference | null> {
  return await upsertUserPreferences(userId, { theme });
}


// ==================== 工人管理数据库函数 ====================

export interface Worker {
  id: number;
  employeeCode: string | null;
  name: string;
  department: string;
  position: string;
  skillLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status: 'Active' | 'Inactive' | 'OnLeave';
  phone: string | null;
  email: string | null;
  joinDate: string | null;
  leaveDate: string | null;
  uwbTagId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerEfficiencyRecord {
  id: number;
  workerId: number;
  recordDate: string;
  tasksAssigned: number;
  tasksCompleted: number;
  standardHours: string;
  actualHours: string;
  efficiency: string;
  qualityScore: string;
  defectCount: number;
  reworkCount: number;
  notes: string | null;
  createdAt: string;
}

export interface WorkHourAlert {
  id: number;
  workerId: number;
  alertType: 'overtime' | 'undertime' | 'continuous_work' | 'low_efficiency' | 'quality_issue';
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  details: string | null;
  status: 'Pending' | 'Acknowledged' | 'Resolved' | 'Ignored';
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface UserFavorite {
  id: number;
  userId: number;
  menuPath: string;
  menuName: string;
  menuNameEn: string | null;
  sortOrder: number;
  createdAt: string;
}

/**
 * 获取工人列表
 */
export async function getWorkers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  status?: string;
  skillLevel?: string;
}): Promise<{ workers: Worker[]; total: number }> {
  const db = await requireDb();
  if (!db) return { workers: [], total: 0 };
  const { page = 1, pageSize = 20, search, department, status, skillLevel } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [sql`1=1`];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`(name LIKE ${pattern} OR employee_code LIKE ${pattern} OR phone LIKE ${pattern})`);
  }
  if (department) {
    conditions.push(sql`department = ${department}`);
  }
  if (status) {
    conditions.push(sql`status = ${status}`);
  }
  if (skillLevel) {
    conditions.push(sql`skill_level = ${skillLevel}`);
  }

  const where = sql.join(conditions, sql` AND `);

  // 获取总数
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as total FROM workers WHERE ${where}`
  );
  const total = (countResult as any)[0]?.[0]?.total || 0;

  // 获取列表
  const result = await db.execute(
    sql`SELECT * FROM workers WHERE ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
  );
  
  const workers = (result[0] as any[]).map(row => ({
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skill_level,
    status: row.status,
    phone: row.phone,
    email: row.email,
    joinDate: row.join_date,
    leaveDate: row.leave_date,
    uwbTagId: row.uwb_tag_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  
  return { workers, total };
}

/**
 * 获取单个工人
 */
export async function getWorkerById(id: number): Promise<Worker | null> {
  const db = await requireDb();
  if (!db) return null;
  const result = await db.execute(
    sql`SELECT * FROM workers WHERE id = ${id}`
  );
  const rows = result[0] as any[];
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skill_level,
    status: row.status,
    phone: row.phone,
    email: row.email,
    joinDate: row.join_date,
    leaveDate: row.leave_date,
    uwbTagId: row.uwb_tag_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建工人
 */
export async function createWorker(data: {
  employeeCode?: string;
  name: string;
  department: string;
  position: string;
  skillLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status?: 'Active' | 'Inactive' | 'OnLeave';
  phone?: string;
  email?: string;
  joinDate?: string;
  uwbTagId?: string;
}): Promise<Worker> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(
    sql`INSERT INTO workers (employee_code, name, department, position, skill_level, status, phone, email, join_date, uwb_tag_id)
        VALUES (${data.employeeCode || null}, ${data.name}, ${data.department}, ${data.position}, 
                ${data.skillLevel || 'L2'}, ${data.status || 'Active'}, ${data.phone || null}, 
                ${data.email || null}, ${data.joinDate || null}, ${data.uwbTagId || null})`
  );
  
  const insertId = (result[0] as any).insertId;
  return (await getWorkerById(insertId))!;
}

/**
 * 更新工人
 */
export async function updateWorker(id: number, data: Partial<{
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  skillLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  status: 'Active' | 'Inactive' | 'OnLeave';
  phone: string;
  email: string;
  joinDate: string;
  leaveDate: string;
  uwbTagId: string;
}>): Promise<Worker | null> {
  const setParts: SQL[] = [];

  if (data.employeeCode !== undefined) { setParts.push(sql`employee_code = ${data.employeeCode}`); }
  if (data.name !== undefined) { setParts.push(sql`name = ${data.name}`); }
  if (data.department !== undefined) { setParts.push(sql`department = ${data.department}`); }
  if (data.position !== undefined) { setParts.push(sql`position = ${data.position}`); }
  if (data.skillLevel !== undefined) { setParts.push(sql`skill_level = ${data.skillLevel}`); }
  if (data.status !== undefined) { setParts.push(sql`status = ${data.status}`); }
  if (data.phone !== undefined) { setParts.push(sql`phone = ${data.phone}`); }
  if (data.email !== undefined) { setParts.push(sql`email = ${data.email}`); }
  if (data.joinDate !== undefined) { setParts.push(sql`join_date = ${data.joinDate}`); }
  if (data.leaveDate !== undefined) { setParts.push(sql`leave_date = ${data.leaveDate}`); }
  if (data.uwbTagId !== undefined) { setParts.push(sql`uwb_tag_id = ${data.uwbTagId}`); }

  if (setParts.length === 0) return await getWorkerById(id);

  const db = await requireDb();
  if (!db) return null;
  await db.execute(
    sql`UPDATE workers SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`
  );
  
  return await getWorkerById(id);
}

/**
 * 删除工人
 */
export async function deleteWorker(id: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  const result = await db.execute(
    sql`DELETE FROM workers WHERE id = ${id}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 获取工人效率排名
 */
export async function getWorkerRanking(params: {
  page?: number;
  pageSize?: number;
  department?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ rankings: any[]; total: number }> {
  const { page = 1, pageSize = 20, department, startDate, endDate } = params;
  const offset = (page - 1) * pageSize;
  
  const conditions: SQL[] = [sql`1=1`];

  if (department) {
    conditions.push(sql`w.department = ${department}`);
  }
  if (startDate) {
    conditions.push(sql`e.record_date >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`e.record_date <= ${endDate}`);
  }

  const where = sql.join(conditions, sql` AND `);

  const db = await requireDb();
  if (!db) return { rankings: [], total: 0 };

  const countResult = await db.execute(sql`
    SELECT COUNT(DISTINCT w.id) as total
    FROM workers w
    LEFT JOIN worker_efficiency_records e ON w.id = e.worker_id
    WHERE ${where}
  `);
  const total = (countResult[0] as any[])[0]?.total || 0;

  const result = await db.execute(sql`
    SELECT
      w.id,
      w.name,
      w.department,
      w.position,
      w.skill_level as skillLevel,
      COALESCE(AVG(e.efficiency), 100) as avgEfficiency,
      COALESCE(AVG(e.quality_score), 100) as avgQualityScore,
      COALESCE(SUM(e.tasks_completed), 0) as totalTasksCompleted,
      COALESCE(SUM(e.actual_hours), 0) as totalHours
    FROM workers w
    LEFT JOIN worker_efficiency_records e ON w.id = e.worker_id
    WHERE ${where}
    GROUP BY w.id, w.name, w.department, w.position, w.skill_level
    ORDER BY avgEfficiency DESC, avgQualityScore DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  const rankings = (result[0] as any[]).map((row, index) => ({
    rank: offset + index + 1,
    id: row.id,
    name: row.name,
    department: row.department,
    position: row.position,
    skillLevel: row.skillLevel,
    avgEfficiency: parseFloat(row.avgEfficiency) || 100,
    avgQualityScore: parseFloat(row.avgQualityScore) || 100,
    totalTasksCompleted: parseInt(row.totalTasksCompleted) || 0,
    totalHours: parseFloat(row.totalHours) || 0,
  }));
  
  return { rankings, total };
}

/**
 * 获取工时预警列表
 */
export async function getWorkHourAlerts(params: {
  page?: number;
  pageSize?: number;
  workerId?: number;
  alertType?: string;
  alertLevel?: string;
  status?: string;
}): Promise<{ alerts: (WorkHourAlert & { workerName?: string })[]; total: number }> {
  const { page = 1, pageSize = 20, workerId, alertType, alertLevel, status } = params;
  const offset = (page - 1) * pageSize;
  
  const conditions: SQL[] = [sql`1=1`];

  if (workerId) {
    conditions.push(sql`a.worker_id = ${workerId}`);
  }
  if (alertType) {
    conditions.push(sql`a.alert_type = ${alertType}`);
  }
  if (alertLevel) {
    conditions.push(sql`a.alert_level = ${alertLevel}`);
  }
  if (status) {
    conditions.push(sql`a.status = ${status}`);
  }

  const where = sql.join(conditions, sql` AND `);

  const db = await requireDb();
  if (!db) return { alerts: [], total: 0 };

  const countResult = await db.execute(
    sql`SELECT COUNT(*) as total FROM work_hour_alerts a WHERE ${where}`
  );
  const total = (countResult[0] as any[])[0]?.total || 0;

  const result = await db.execute(
    sql`
      SELECT a.*, w.name as worker_name
      FROM work_hour_alerts a
      LEFT JOIN workers w ON a.worker_id = w.id
      WHERE ${where}
      ORDER BY a.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `
  );
  
  const alerts = (result[0] as any[]).map(row => ({
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    alertType: row.alert_type,
    alertLevel: row.alert_level,
    message: row.message,
    details: row.details,
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    createdAt: row.created_at,
  }));
  
  return { alerts, total };
}

/**
 * 更新预警状态
 */
export async function updateAlertStatus(id: number, data: {
  status: 'Acknowledged' | 'Resolved' | 'Ignored';
  userId: number;
  resolution?: string;
}): Promise<WorkHourAlert | null> {
  const db = await requireDb();
  if (!db) return null;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (data.status === 'Acknowledged') {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status}, acknowledged_by = ${data.userId}, acknowledged_at = ${now} WHERE id = ${id}`
    );
  } else if (data.status === 'Resolved') {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status}, resolved_by = ${data.userId}, resolved_at = ${now}, resolution = ${data.resolution || null} WHERE id = ${id}`
    );
  } else {
    await db.execute(
      sql`UPDATE work_hour_alerts SET status = ${data.status} WHERE id = ${id}`
    );
  }
  
  const result = await db.execute(sql`SELECT * FROM work_hour_alerts WHERE id = ${id}`);
  const rows = result[0] as any[];
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    workerId: row.worker_id,
    alertType: row.alert_type,
    alertLevel: row.alert_level,
    message: row.message,
    details: row.details,
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    createdAt: row.created_at,
  };
}

// ==================== 用户收藏菜单函数 ====================

/**
 * 获取用户收藏菜单
 */
export async function getUserFavorites(userId: number): Promise<UserFavorite[]> {
  const db = await requireDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM user_favorites WHERE user_id = ${userId} ORDER BY sort_order ASC, created_at ASC`
  );
  
  return (result[0] as any[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    menuPath: row.menu_path,
    menuName: row.menu_name,
    menuNameEn: row.menu_name_en,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

/**
 * 添加收藏菜单
 */
export async function addUserFavorite(data: {
  userId: number;
  menuPath: string;
  menuName: string;
  menuNameEn?: string;
}): Promise<UserFavorite | null> {
  const db = await requireDb();
  if (!db) return null;
  
  // 检查是否已存在
  const existing = await db.execute(
    sql`SELECT id FROM user_favorites WHERE user_id = ${data.userId} AND menu_path = ${data.menuPath}`
  );
  
  if ((existing[0] as any[]).length > 0) {
    throw new Error('已收藏该菜单');
  }
  
  // 获取最大排序值
  const maxOrder = await db.execute(
    sql`SELECT MAX(sort_order) as max_order FROM user_favorites WHERE user_id = ${data.userId}`
  );
  const nextOrder = ((maxOrder[0] as any[])[0]?.max_order || 0) + 1;
  
  const result = await db.execute(
    sql`INSERT INTO user_favorites (user_id, menu_path, menu_name, menu_name_en, sort_order)
        VALUES (${data.userId}, ${data.menuPath}, ${data.menuName}, ${data.menuNameEn || null}, ${nextOrder})`
  );
  
  const insertId = (result[0] as any).insertId;
  
  const newFavorite = await db.execute(sql`SELECT * FROM user_favorites WHERE id = ${insertId}`);
  const row = (newFavorite[0] as any[])[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    menuPath: row.menu_path,
    menuName: row.menu_name,
    menuNameEn: row.menu_name_en,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * 移除收藏菜单
 */
export async function removeUserFavorite(userId: number, menuPath: string): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`DELETE FROM user_favorites WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 更新收藏菜单排序
 */
export async function updateFavoriteOrder(userId: number, menuPath: string, newOrder: number): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`UPDATE user_favorites SET sort_order = ${newOrder} WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any).affectedRows > 0;
}

/**
 * 检查是否已收藏
 */
export async function isFavorite(userId: number, menuPath: string): Promise<boolean> {
  const db = await requireDb();
  if (!db) return false;
  
  const result = await db.execute(
    sql`SELECT id FROM user_favorites WHERE user_id = ${userId} AND menu_path = ${menuPath}`
  );
  return (result[0] as any[]).length > 0;
}

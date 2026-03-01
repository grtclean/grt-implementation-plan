/**
 * AI Planning Assistant Service
 * 智能计划助手服务
 */

import { invokeLLM } from "../_core/llm";
import { getDb, requireDb } from "../db";
import {
  planningPlans,
  planningTasks,
  planningTrackingRecords,
  planningExecutionNotes,
  planningDataSources,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Types
export interface PlanGenerationInput {
  planType: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "training" | "visit" | "phase";
  period: string;
  ownerId: number;
  departmentId?: number;
  parentPlanId?: string;
  dataSources?: DataSourceInput[];
}

export interface DataSourceInput {
  sourceType: string;
  sourceReferenceId?: string;
  content: string;
  weight?: number;
}

export interface GeneratedPlan {
  planId: string;
  title: string;
  objectives: any[];
  tasks: any[];
  resources: any[];
  risks: any[];
  aiSummary: string;
  startDate: string;
  endDate: string;
}

export interface TrackingInput {
  taskId: string;
  trackingSource: "meeting" | "sop" | "training" | "email" | "report" | "customer" | "manual";
  sourceReference?: string;
  trackingContent: string;
  progressUpdate?: number;
  evidenceFiles?: string[];
  recordedBy: number;
}

// Helper Functions
function generatePlanId(): string {
  return `PLAN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateTaskId(): string {
  return `TASK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateTrackingId(): string {
  return `TRK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateNoteId(): string {
  return `NOTE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateSourceId(): string {
  return `SRC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function getPlanTypeName(planType: string): string {
  const names: Record<string, string> = {
    daily: "日计划", weekly: "周计划", monthly: "月计划",
    quarterly: "季度计划", annual: "年度计划", training: "培训计划",
    visit: "客户拜访计划", phase: "阶段计划",
  };
  return names[planType] || planType;
}

function getPlanPeriodDates(planType: string, period: string): { startDate: string; endDate: string } {
  const now = new Date();
  switch (planType) {
    case "daily": return { startDate: period, endDate: period };
    case "weekly": {
      const [year, week] = period.split("-W").map(Number);
      const firstDay = new Date(year, 0, 1);
      const weekStart = new Date(firstDay.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      return { startDate: weekStart.toISOString().split("T")[0], endDate: weekEnd.toISOString().split("T")[0] };
    }
    case "monthly": {
      const [year, month] = period.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return { startDate: `${period}-01`, endDate: `${period}-${lastDay}` };
    }
    default: return { startDate: now.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
  }
}

// Core Functions
export async function generatePlan(input: PlanGenerationInput): Promise<GeneratedPlan> {
  const { planType, period, dataSources } = input;
  const { startDate, endDate } = getPlanPeriodDates(planType, period);
  
  let dataSourceContext = dataSources?.map((ds, i) => `【数据源${i + 1} - ${ds.sourceType}】\n${ds.content}`).join("\n\n") || "";

  const prompt = `你是GRT公司的智能计划助手。请根据以下信息生成${getPlanTypeName(planType)}。

计划周期: ${period} (${startDate} 至 ${endDate})
数据源: ${dataSourceContext || "暂无"}

请以JSON格式返回：
{"title":"计划标题","objectives":[{"id":"OBJ-1","description":"目标","measurable":"指标"}],"tasks":[{"taskId":"TASK-1","title":"任务","description":"描述","priority":"P1","taskType":"work","sourceType":"manual","estimatedHours":8,"dueDate":"${endDate}","deliverables":[],"dependencies":[]}],"resources":[],"risks":[],"aiSummary":"摘要"}`;

  const response = await invokeLLM({
    messages: [{ role: "system", content: "你是计划助手。" }, { role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            objectives: { type: "array", items: { type: "object", properties: { id: { type: "string" }, description: { type: "string" }, measurable: { type: "string" } }, required: ["id", "description", "measurable"], additionalProperties: false } },
            tasks: { type: "array", items: { type: "object", properties: { taskId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string" }, taskType: { type: "string" }, sourceType: { type: "string" }, estimatedHours: { type: "number" }, dueDate: { type: "string" }, deliverables: { type: "array", items: { type: "string" } }, dependencies: { type: "array", items: { type: "string" } } }, required: ["taskId", "title", "description", "priority", "taskType", "sourceType", "estimatedHours", "dueDate", "deliverables", "dependencies"], additionalProperties: false } },
            resources: { type: "array", items: { type: "object", properties: { type: { type: "string" }, description: { type: "string" } }, required: ["type", "description"], additionalProperties: false } },
            risks: { type: "array", items: { type: "object", properties: { description: { type: "string" }, probability: { type: "string" }, impact: { type: "string" }, mitigation: { type: "string" } }, required: ["description", "probability", "impact", "mitigation"], additionalProperties: false } },
            aiSummary: { type: "string" }
          },
          required: ["title", "objectives", "tasks", "resources", "risks", "aiSummary"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Failed to generate plan");
  
  const generated = JSON.parse(content);
  const planId = generatePlanId();

  return {
    planId,
    title: generated.title,
    objectives: generated.objectives,
    tasks: generated.tasks.map((t: any) => ({ ...t, taskId: generateTaskId() })),
    resources: generated.resources,
    risks: generated.risks,
    aiSummary: generated.aiSummary,
    startDate,
    endDate,
  };
}

export async function savePlan(plan: GeneratedPlan, input: PlanGenerationInput, requiresApproval = true) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(planningPlans).values({
    planId: plan.planId,
    planType: input.planType,
    planPeriod: input.period,
    ownerId: input.ownerId,
    departmentId: input.departmentId,
    parentPlanId: input.parentPlanId,
    title: plan.title,
    objectives: JSON.stringify(plan.objectives),
    tasks: JSON.stringify(plan.tasks.map(t => t.taskId)),
    resources: JSON.stringify(plan.resources),
    risks: JSON.stringify(plan.risks),
    status: "draft",
    approvalStatus: requiresApproval ? "pending" : "not_required",
    startDate: plan.startDate,
    endDate: plan.endDate,
    aiSummary: plan.aiSummary,
  } as any);

  const taskIds: string[] = [];
  for (const task of plan.tasks) {
    await db.insert(planningTasks).values({
      taskId: task.taskId,
      planId: plan.planId,
      title: task.title,
      description: task.description,
      priority: task.priority as any,
      taskType: task.taskType as any,
      sourceType: task.sourceType as any,
      ownerId: input.ownerId,
      estimatedHours: String(task.estimatedHours),
      dueDate: task.dueDate,
      status: "pending",
      deliverables: JSON.stringify(task.deliverables),
      dependencies: JSON.stringify(task.dependencies),
    } as any);
    taskIds.push(task.taskId);
  }

  if (input.dataSources) {
    for (const ds of input.dataSources) {
      await db.insert(planningDataSources).values({
        sourceId: generateSourceId(),
        planId: plan.planId,
        sourceType: ds.sourceType as any,
        sourceReferenceId: ds.sourceReferenceId,
        sourceSummary: ds.content.substring(0, 500),
        weight: String(ds.weight || 1.0),
      });
    }
  }

  return { planId: plan.planId, taskIds };
}

export async function addTrackingRecord(input: TrackingInput): Promise<string> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const trackingId = generateTrackingId();

  await db.insert(planningTrackingRecords).values({
    trackingId,
    taskId: input.taskId,
    trackingSource: input.trackingSource,
    sourceReference: input.sourceReference,
    trackingContent: input.trackingContent,
    progressUpdate: input.progressUpdate,
    evidenceFiles: input.evidenceFiles ? JSON.stringify(input.evidenceFiles) : null,
    recordedBy: input.recordedBy,
  });

  if (input.progressUpdate !== undefined) {
    await db.update(planningTasks)
      .set({
        progress: input.progressUpdate,
        status: input.progressUpdate >= 100 ? "completed" : "in_progress",
        completedAt: input.progressUpdate >= 100 ? new Date().toISOString() : undefined,
      })
      .where(eq(planningTasks.taskId, input.taskId));
  }

  return trackingId;
}

export async function createExecutionNote(input: { planId: string; originalPlan: string; actualExecution: string; deviationReason?: string; lessonsLearned?: string; suggestions?: string; createdBy: number }): Promise<string> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const noteId = generateNoteId();

  await db.insert(planningExecutionNotes).values({
    noteId,
    planId: input.planId,
    originalPlan: input.originalPlan,
    actualExecution: input.actualExecution,
    deviationReason: input.deviationReason,
    lessonsLearned: input.lessonsLearned,
    suggestions: input.suggestions,
    asNewPlanInput: 1,
    createdBy: input.createdBy,
  } as any);

  return noteId;
}

export async function getPlanById(planId: string) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const plans = await db.select().from(planningPlans).where(eq(planningPlans.planId, planId));
  if (plans.length === 0) return null;

  const plan = plans[0];
  const tasks = await db.select().from(planningTasks).where(eq(planningTasks.planId, planId)).limit(1000);
  const dataSources = await db.select().from(planningDataSources).where(eq(planningDataSources.planId, planId)).limit(1000);

  return {
    ...plan,
    objectives: plan.objectives ? JSON.parse(plan.objectives) : [],
    tasks,
    resources: plan.resources ? JSON.parse(plan.resources) : [],
    risks: plan.risks ? JSON.parse(plan.risks) : [],
    dataSources,
  };
}

export async function listPlans(params: { ownerId?: number; departmentId?: number; planType?: string; status?: string; limit?: number; offset?: number }) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const conditions = [];
  if (params.ownerId) conditions.push(eq(planningPlans.ownerId, params.ownerId));
  if (params.departmentId) conditions.push(eq(planningPlans.departmentId, params.departmentId));
  if (params.planType) conditions.push(eq(planningPlans.planType, params.planType as any));
  if (params.status) conditions.push(eq(planningPlans.status, params.status as any));

  let query = db.select().from(planningPlans);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;

  return await query.orderBy(desc(planningPlans.createdAt)).limit(params.limit || 20).offset(params.offset || 0);
}

export async function updateTaskStatus(taskId: string, status: "pending" | "in_progress" | "completed" | "cancelled" | "blocked", progress?: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (progress !== undefined) updateData.progress = progress;
  if (status === "completed") updateData.completedAt = new Date();

  await db.update(planningTasks).set(updateData).where(eq(planningTasks.taskId, taskId));

  const tasks = await db.select().from(planningTasks).where(eq(planningTasks.taskId, taskId));
  if (tasks.length > 0) {
    const planId = tasks[0].planId;
    const allTasks = await db.select().from(planningTasks).where(eq(planningTasks.planId, planId)).limit(1000);
    const completedCount = allTasks.filter(t => t.status === "completed").length;
    const completionRate = (completedCount / allTasks.length) * 100;

    await db.update(planningPlans)
      .set({ completionRate: String(completionRate), status: completionRate >= 100 ? "completed" : "in_progress" })
      .where(eq(planningPlans.planId, planId));
  }
}

export async function approvePlan(planId: string, approvedBy: number, action: "approve" | "reject") {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  await db.update(planningPlans)
    .set({
      approvalStatus: action === "approve" ? "approved" : "rejected",
      approvedBy,
      approvedAt: new Date().toISOString(),
      status: action === "approve" ? "approved" : "draft",
    })
    .where(eq(planningPlans.planId, planId));
  return { success: true, action };
}

export async function getIncompleteTasks(ownerId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(planningTasks)
    .where(and(eq(planningTasks.ownerId, ownerId), sql`${planningTasks.status} IN ('pending', 'in_progress', 'blocked')`))
    .orderBy(planningTasks.priority).limit(1000);
}

export async function getExecutionNotes(planId: string) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(planningExecutionNotes)
    .where(and(eq(planningExecutionNotes.planId, planId), eq(planningExecutionNotes.asNewPlanInput, 1)))
    .orderBy(desc(planningExecutionNotes.createdAt)).limit(1000);
}

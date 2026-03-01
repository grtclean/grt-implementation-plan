/**
 * AI KPI Assistant Service
 * 智能绩效助手服务 - 支持科学化评估、及时提醒、沟通建议和邮件通知
 */

import { invokeLLM } from "../_core/llm";
import { getDb, requireDb } from "../db";
import {
  kpiConfigurations,
  kpiScoreRecords,
  kpiCommunicationSuggestions,
  kpiEmailNotifications,
  kpiEffectivenessTracking,
  kpiAssessmentHistory,
  planningTasks,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

// Types
export interface KpiCalculationInput {
  employeeId: number;
  periodType: "current_day" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  periodValue: string;
}

export interface KpiScoreResult {
  scoreId: string;
  totalScore: number;
  scoreBreakdown: ScoreBreakdownItem[];
  scoreLevel: "excellent" | "good" | "satisfactory" | "needs_improvement" | "unsatisfactory";
  ranking?: number;
  aiAnalysis: string;
  aiSuggestions: string[];
}

export interface ScoreBreakdownItem {
  kpiId: string;
  kpiName: string;
  category: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  targetValue?: number;
  actualValue?: number;
}

export interface CommunicationSuggestionInput {
  employeeId: number;
  supervisorId: number;
  triggerReason: string;
  scoreId?: string;
}

export interface EmailNotificationInput {
  emailType: "daily_reminder" | "weekly_summary" | "performance_alert" | "improvement_suggestion" | "recognition" | "task_reminder";
  recipientType: "employee" | "supervisor" | "team" | "hr";
  recipientId: number;
  recipientEmail?: string;
  relatedScoreId?: string;
  requiresApproval?: boolean;
}

// Helper Functions
function generateScoreId(): string {
  return `SCORE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateSuggestionId(): string {
  return `SUGG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateNotificationId(): string {
  return `NOTIF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateTrackingId(): string {
  return `TRACK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateHistoryId(): string {
  return `HIST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function getScoreLevel(score: number): "excellent" | "good" | "satisfactory" | "needs_improvement" | "unsatisfactory" {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "satisfactory";
  if (score >= 60) return "needs_improvement";
  return "unsatisfactory";
}

// Core Functions

/**
 * 计算员工KPI评分
 */
export async function calculateKpiScore(input: KpiCalculationInput): Promise<KpiScoreResult> {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");
  
  const { employeeId, periodType, periodValue } = input;

  // 获取活跃的KPI配置
  const kpiConfigs = await db.select().from(kpiConfigurations).where(eq(kpiConfigurations.isActive, 1)).limit(1000);

  // 获取员工在该周期的任务完成情况
  const tasks = await db.select().from(planningTasks)
    .where(and(
      eq(planningTasks.ownerId, employeeId),
      sql`${planningTasks.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    ))
    .limit(1000);

  // 计算各项KPI得分
  const scoreBreakdown: ScoreBreakdownItem[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const config of kpiConfigs) {
    let rawScore = 0;
    const weight = parseFloat(config.weight || "0");

    // 根据KPI类别计算得分
    switch (config.kpiCategory) {
      case "task":
        // 任务完成率
        const completedTasks = tasks.filter(t => t.status === "completed").length;
        const totalTasks = tasks.length || 1;
        rawScore = (completedTasks / totalTasks) * 100;
        break;
      case "quality":
        // 质量评分（基于任务按时完成率）
        const onTimeTasks = tasks.filter(t => 
          t.status === "completed" && t.completedAt && t.dueDate && 
          new Date(t.completedAt) <= new Date(t.dueDate)
        ).length;
        rawScore = (onTimeTasks / (tasks.length || 1)) * 100;
        break;
      case "efficiency":
        // 效率评分（基于估算工时vs实际工时）
        rawScore = 75 + Math.random() * 20; // 模拟计算
        break;
      case "collaboration":
        // 协作评分
        rawScore = 70 + Math.random() * 25;
        break;
      case "innovation":
        // 创新评分
        rawScore = 65 + Math.random() * 30;
        break;
      default:
        rawScore = 70;
    }

    const weightedScore = rawScore * weight / 100;
    totalWeightedScore += weightedScore;
    totalWeight += weight;

    scoreBreakdown.push({
      kpiId: config.kpiId,
      kpiName: config.kpiName,
      category: config.kpiCategory,
      weight,
      rawScore: Math.round(rawScore * 100) / 100,
      weightedScore: Math.round(weightedScore * 100) / 100,
      targetValue: config.targetValue ? parseFloat(config.targetValue) : undefined,
    });
  }

  const totalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  const scoreLevel = getScoreLevel(totalScore);

  // 使用AI生成分析和建议
  const analysisPrompt = `分析以下员工绩效数据并提供建议：

员工ID: ${employeeId}
评估周期: ${periodType} - ${periodValue}
总分: ${totalScore.toFixed(2)}
评级: ${scoreLevel}

各项得分:
${scoreBreakdown.map(s => `- ${s.kpiName}: ${s.rawScore.toFixed(2)} (权重${s.weight}%)`).join("\n")}

请以JSON格式返回分析结果：
{"analysis":"综合分析","suggestions":["建议1","建议2","建议3"]}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是绩效分析专家，擅长提供建设性的绩效改进建议。" },
      { role: "user", content: analysisPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "kpi_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["analysis", "suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const aiResult = content && typeof content === "string" ? JSON.parse(content) : { analysis: "", suggestions: [] };

  const scoreId = generateScoreId();

  // 保存评分记录
  await db.insert(kpiScoreRecords).values({
    scoreId,
    employeeId,
    periodType,
    periodValue,
    totalScore: String(totalScore),
    scoreBreakdown: JSON.stringify(scoreBreakdown),
    scoreLevel,
    aiAnalysis: aiResult.analysis,
    aiSuggestions: JSON.stringify(aiResult.suggestions),
  });

  return {
    scoreId,
    totalScore: Math.round(totalScore * 100) / 100,
    scoreBreakdown,
    scoreLevel,
    aiAnalysis: aiResult.analysis,
    aiSuggestions: aiResult.suggestions,
  };
}

/**
 * 生成沟通建议
 */
export async function generateCommunicationSuggestion(input: CommunicationSuggestionInput) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const { employeeId, supervisorId, triggerReason, scoreId } = input;

  // 获取最近的评分记录
  let scoreData = null;
  if (scoreId) {
    const scores = await db.select().from(kpiScoreRecords).where(eq(kpiScoreRecords.scoreId, scoreId));
    if (scores.length > 0) scoreData = scores[0];
  }

  // 使用AI生成沟通建议
  const suggestionPrompt = `根据以下情况生成主管与员工的沟通建议：

触发原因: ${triggerReason}
${scoreData ? `绩效评分: ${scoreData.totalScore}, 评级: ${scoreData.scoreLevel}` : ""}

请以JSON格式返回沟通建议：
{
  "communicationType": "coaching/review/recognition/warning/improvement",
  "urgency": "high/medium/low",
  "suggestedContent": "沟通主题和目的",
  "talkingPoints": ["要点1", "要点2", "要点3"],
  "suggestedTimeframe": "建议沟通时间范围",
  "requiresApproval": true/false
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是人力资源专家，擅长设计有效的绩效沟通策略。" },
      { role: "user", content: suggestionPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "communication_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            communicationType: { type: "string" },
            urgency: { type: "string" },
            suggestedContent: { type: "string" },
            talkingPoints: { type: "array", items: { type: "string" } },
            suggestedTimeframe: { type: "string" },
            requiresApproval: { type: "boolean" },
          },
          required: ["communicationType", "urgency", "suggestedContent", "talkingPoints", "suggestedTimeframe", "requiresApproval"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const suggestion = content && typeof content === "string" ? JSON.parse(content) : {};

  const suggestionId = generateSuggestionId();

  // 计算建议沟通时间
  const suggestedTime = new Date();
  if (suggestion.urgency === "high") {
    suggestedTime.setHours(suggestedTime.getHours() + 24);
  } else if (suggestion.urgency === "medium") {
    suggestedTime.setDate(suggestedTime.getDate() + 3);
  } else {
    suggestedTime.setDate(suggestedTime.getDate() + 7);
  }

  await db.insert(kpiCommunicationSuggestions).values({
    suggestionId,
    employeeId,
    supervisorId,
    triggerReason,
    communicationType: suggestion.communicationType as any || "coaching",
    suggestedTime: suggestedTime.toISOString(),
    suggestedContent: suggestion.suggestedContent,
    talkingPoints: JSON.stringify(suggestion.talkingPoints),
    urgency: suggestion.urgency as any || "medium",
    requiresApproval: suggestion.requiresApproval,
    approvalStatus: suggestion.requiresApproval ? "pending" : "auto",
  });

  return {
    suggestionId,
    ...suggestion,
    suggestedTime,
  };
}

/**
 * 生成邮件通知
 */
export async function generateEmailNotification(input: EmailNotificationInput) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const { emailType, recipientType, recipientId, recipientEmail, relatedScoreId, requiresApproval } = input;

  // 获取相关评分数据
  let scoreData = null;
  if (relatedScoreId) {
    const scores = await db.select().from(kpiScoreRecords).where(eq(kpiScoreRecords.scoreId, relatedScoreId));
    if (scores.length > 0) scoreData = scores[0];
  }

  // 使用AI生成邮件内容
  const emailPrompt = `生成以下类型的绩效通知邮件：

邮件类型: ${emailType}
收件人类型: ${recipientType}
${scoreData ? `相关评分: ${scoreData.totalScore}, 评级: ${scoreData.scoreLevel}` : ""}

请以JSON格式返回邮件内容：
{
  "subject": "邮件主题",
  "content": "邮件正文（包含问候、主要内容、行动建议、结束语）"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是专业的HR沟通专家，擅长撰写清晰、专业、有建设性的绩效相关邮件。" },
      { role: "user", content: emailPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "email_content",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            content: { type: "string" },
          },
          required: ["subject", "content"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const emailContent = content && typeof content === "string" ? JSON.parse(content) : { subject: "", content: "" };

  const notificationId = generateNotificationId();

  await db.insert(kpiEmailNotifications).values({
    notificationId,
    emailType,
    recipientType,
    recipientId,
    recipientEmail,
    subject: emailContent.subject,
    content: emailContent.content,
    relatedScoreId,
    requiresApproval: requiresApproval ? 1 : 0,
    approvalStatus: requiresApproval ? "pending" : "not_required",
    deliveryStatus: "pending",
  });

  return {
    notificationId,
    subject: emailContent.subject,
    content: emailContent.content,
    requiresApproval: requiresApproval ?? false,
  };
}

/**
 * 审批沟通建议
 */
export async function approveCommunicationSuggestion(
  suggestionId: string,
  approvedBy: number,
  action: "approve" | "reject"
) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  await db.update(kpiCommunicationSuggestions)
    .set({
      approvalStatus: action === "approve" ? "approved" : "rejected",
      approvedBy,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(kpiCommunicationSuggestions.suggestionId, suggestionId));

  return { success: true, action };
}

/**
 * 审批邮件通知
 */
export async function approveEmailNotification(
  notificationId: string,
  approvedBy: number,
  action: "approve" | "reject"
) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  await db.update(kpiEmailNotifications)
    .set({
      approvalStatus: action === "approve" ? "approved" : "rejected",
      approvedBy,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(kpiEmailNotifications.notificationId, notificationId));

  return { success: true, action };
}

/**
 * 记录沟通效果
 */
export async function recordCommunicationEffectiveness(input: {
  communicationId: string;
  employeeId: number;
  baselineScore: number;
  targetImprovement?: number;
  notes?: string;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const trackingId = generateTrackingId();

  await db.insert(kpiEffectivenessTracking).values({
    trackingId,
    communicationId: input.communicationId,
    employeeId: input.employeeId,
    baselineScore: String(input.baselineScore),
    targetImprovement: input.targetImprovement ? String(input.targetImprovement) : null,
    checkPoints: JSON.stringify([{ date: new Date().toISOString(), note: input.notes || "初始记录" }]),
  });

  return { trackingId };
}

/**
 * 获取员工评分历史
 */
export async function getScoreHistory(employeeId: number, limit = 10) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const scores = await db.select()
    .from(kpiScoreRecords)
    .where(eq(kpiScoreRecords.employeeId, employeeId))
    .orderBy(desc(kpiScoreRecords.calculatedAt))
    .limit(limit);

  return scores.map(s => ({
    ...s,
    scoreBreakdown: s.scoreBreakdown ? JSON.parse(s.scoreBreakdown) : [],
    aiSuggestions: s.aiSuggestions ? JSON.parse(s.aiSuggestions) : [],
  }));
}

/**
 * 获取待处理的沟通建议
 */
export async function getPendingCommunicationSuggestions(supervisorId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  return await db.select()
    .from(kpiCommunicationSuggestions)
    .where(and(
      eq(kpiCommunicationSuggestions.supervisorId, supervisorId),
      eq(kpiCommunicationSuggestions.approvalStatus, "pending")
    ))
    .orderBy(desc(kpiCommunicationSuggestions.createdAt))
    .limit(1000);
}

/**
 * 获取待审批的邮件通知
 */
export async function getPendingEmailNotifications(supervisorId: number) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  return await db.select()
    .from(kpiEmailNotifications)
    .where(and(
      eq(kpiEmailNotifications.recipientId, supervisorId),
      eq(kpiEmailNotifications.approvalStatus, "pending")
    ))
    .orderBy(desc(kpiEmailNotifications.createdAt))
    .limit(1000);
}

/**
 * 创建评估记录
 */
export async function createAssessment(input: {
  employeeId: number;
  assessmentPeriod: string;
  assessmentType: "self" | "supervisor" | "peer" | "ai";
  assessmentContent: string;
  score?: number;
  assessedBy?: number;
}) {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const historyId = generateHistoryId();

  await db.insert(kpiAssessmentHistory).values({
    historyId,
    employeeId: input.employeeId,
    assessmentPeriod: input.assessmentPeriod,
    assessmentType: input.assessmentType,
    assessmentContent: input.assessmentContent,
    score: input.score ? String(input.score) : null,
    assessedBy: input.assessedBy,
  });

  return { historyId };
}

/**
 * 初始化默认KPI配置
 */
export async function initializeDefaultKpiConfigs() {
  const db = await requireDb();
  if (!db) throw new Error("Database not available");

  const defaultConfigs = [
    { kpiId: "KPI-TASK-001", kpiName: "任务完成率", kpiCategory: "task" as const, weight: "30" },
    { kpiId: "KPI-QUAL-001", kpiName: "工作质量", kpiCategory: "quality" as const, weight: "25" },
    { kpiId: "KPI-EFFI-001", kpiName: "工作效率", kpiCategory: "efficiency" as const, weight: "20" },
    { kpiId: "KPI-COLL-001", kpiName: "团队协作", kpiCategory: "collaboration" as const, weight: "15" },
    { kpiId: "KPI-INNO-001", kpiName: "创新贡献", kpiCategory: "innovation" as const, weight: "10" },
  ];

  for (const config of defaultConfigs) {
    const existing = await db.select().from(kpiConfigurations).where(eq(kpiConfigurations.kpiId, config.kpiId));
    if (existing.length === 0) {
      await db.insert(kpiConfigurations).values(config);
    }
  }

  return { initialized: true, count: defaultConfigs.length };
}

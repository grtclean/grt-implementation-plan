/**
 * Employee Consultant Agent Schema
 *
 * 员工顾问智能体 — 基于"人设×组织设"理论的个性化工作管家
 * 每日/每周：情感肯定、任务指导、情绪安抚、方法建议、流程推荐、会议整理、工作计划
 */
import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, json, index, uniqueIndex } from "drizzle-orm/pg-core";

// ══════════════════════════════════════════
// 1. 员工人物画像 — 综合画像 (面试承诺+历年表现+性格特征)
// ══════════════════════════════════════════
export const employeePersonaProfiles = pgTable("employee_persona_profiles", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  employeeCode: varchar("employee_code", { length: 30 }),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  year: integer("year").notNull(),

  // ── 面试承诺 ──
  interviewCommitmentsJson: json("interview_commitments_json"),
  // [{commitment, deadline, category: "skill"|"output"|"leadership"|"culture", status}]
  hireDate: timestamp("hire_date"),
  interviewNotes: text("interview_notes"),

  // ── 人设评估 (0-100) ──
  personaScore: decimal("persona_score", { precision: 5, scale: 2 }).default("50.00"),
  // 高人设(≥70): 积极主动、团队认同高、客户好评 → 正向输入20-30%
  // 中人设(40-69): 稳定但需引导 → 中性输入
  // 低人设(<40): 消极被动、同事疏远 → 需要干预
  personaTier: varchar("persona_tier", { length: 10 }).default("mid"),
  // high | mid | low

  // ── 人设维度 (5维雷达) ──
  motivationScore: decimal("motivation_score", { precision: 5, scale: 2 }).default("50.00"),
  // 内驱力: 主动性、自我提升意愿
  teamInteractionScore: decimal("team_interaction_score", { precision: 5, scale: 2 }).default("50.00"),
  // 团队互动: 同事协作、跨部门沟通
  clientRecognitionScore: decimal("client_recognition_score", { precision: 5, scale: 2 }).default("50.00"),
  // 客户认同: 内外客户满意度
  peerApprovalScore: decimal("peer_approval_score", { precision: 5, scale: 2 }).default("50.00"),
  // 同事肯定: 360反馈、协作评价
  managerConfidenceScore: decimal("manager_confidence_score", { precision: 5, scale: 2 }).default("50.00"),
  // 主管信心: 主管对其信任度

  // ── 性格特征与沟通偏好 ──
  personalityTraitsJson: json("personality_traits_json"),
  // {disc: "D"|"I"|"S"|"C", mbti: "ENTJ", strengths: [], growthAreas: []}
  communicationStyle: varchar("communication_style", { length: 30 }).default("balanced"),
  // direct | supportive | analytical | balanced
  preferredFeedbackMode: varchar("preferred_feedback_mode", { length: 30 }).default("mixed"),
  // praise_first | direct_honest | data_driven | mixed
  emotionalResilience: varchar("emotional_resilience", { length: 20 }).default("moderate"),
  // high | moderate | low (决定Agent安抚力度)

  // ── 历年表现摘要 ──
  yearlyPerformanceSummaryJson: json("yearly_performance_summary_json"),
  // [{year, overallGrade, bonusMonths, keyAchievements[], keyGaps[], managerComment}]
  careerAspirations: text("career_aspirations"),
  longTermGoal: text("long_term_goal"),

  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("epp_employee_year_idx").on(t.employeeId, t.year),
  index("epp_persona_tier_idx").on(t.personaTier),
]);

// ══════════════════════════════════════════
// 2. 顾问Agent输出记录 — 每次推送/对话
// ══════════════════════════════════════════
export const consultantAgentOutputs = pgTable("consultant_agent_outputs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  outputType: varchar("output_type", { length: 30 }).notNull(),
  // daily_digest | weekly_plan | emotional_support | task_guidance | method_advice |
  // process_recommendation | meeting_summary | work_plan | skill_coaching |
  // milestone_celebration | risk_alert | ai_tool_guide
  channel: varchar("channel", { length: 20 }).notNull().default("in_system"),
  // in_system | email | wechat | push
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  contentStructuredJson: json("content_structured_json"),
  // {sections: [{type, title, body, priority, actionItems}]}

  // ── 上下文引用 ──
  contextSourcesJson: json("context_sources_json"),
  // [{source: "annual_goal"|"360_profile"|"meeting"|"kpi"|"persona", refId, summary}]
  relatedGoalAgreementId: integer("related_goal_agreement_id"),
  relatedCheckpointId: integer("related_checkpoint_id"),

  // ── 人设策略标记 ──
  personaTierAtTime: varchar("persona_tier_at_time", { length: 10 }),
  strategyApplied: varchar("strategy_applied", { length: 50 }),
  // positive_reinforcement | gentle_guidance | urgent_intervention | celebration | neutral_update
  toneProfile: varchar("tone_profile", { length: 30 }),
  // warm_encouraging | professional_supportive | direct_actionable | empathetic_calming

  // ── 反馈 ──
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  feedbackRating: integer("feedback_rating"), // 1-5
  feedbackNote: text("feedback_note"),
  isActionTaken: boolean("is_action_taken").default(false),

  scheduledFor: timestamp("scheduled_for"), // 预定推送时间
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("cao_employee_idx").on(t.employeeId, t.createdAt),
  index("cao_type_idx").on(t.outputType),
  index("cao_scheduled_idx").on(t.scheduledFor),
]);

// ══════════════════════════════════════════
// 3. 顾问Agent策略配置 — 按人设等级定义输出策略
// ══════════════════════════════════════════
export const consultantStrategyConfigs = pgTable("consultant_strategy_configs", {
  id: serial("id").primaryKey(),
  personaTier: varchar("persona_tier", { length: 10 }).notNull(),
  // high | mid | low
  strategyName: varchar("strategy_name", { length: 100 }).notNull(),
  description: text("description"),

  // ── 输出频率 ──
  dailyDigestEnabled: boolean("daily_digest_enabled").default(true),
  weeklyPlanEnabled: boolean("weekly_plan_enabled").default(true),
  emotionalSupportFrequency: varchar("emotional_support_frequency", { length: 20 }).default("as_needed"),
  // daily | twice_weekly | as_needed | rarely
  proactiveGuidanceLevel: varchar("proactive_guidance_level", { length: 20 }).default("moderate"),
  // aggressive | moderate | minimal

  // ── 内容策略 ──
  toneDefault: varchar("tone_default", { length: 30 }),
  contentMixJson: json("content_mix_json"),
  // {praise: 30, taskGuidance: 25, methodAdvice: 20, processRec: 15, emotionalSupport: 10}
  systemPromptOverride: text("system_prompt_override"),
  exampleOutputsJson: json("example_outputs_json"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("csc_tier_idx").on(t.personaTier),
]);

// ══════════════════════════════════════════
// 4. 顾问Agent对话会话 — 双向互动
// ══════════════════════════════════════════
export const consultantAgentSessions = pgTable("consultant_agent_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 60 }).notNull().unique(),
  employeeId: integer("employee_id").notNull(),
  topic: varchar("topic", { length: 200 }),
  // goal_planning | emotional_support | skill_development | task_help | general
  messageCount: integer("message_count").default(0),
  status: varchar("status", { length: 20 }).default("active"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("cas_employee_idx").on(t.employeeId, t.createdAt),
]);

export const consultantAgentMessages = pgTable("consultant_agent_messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 60 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // user | consultant | system
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("cam_session_idx").on(t.sessionId, t.createdAt),
]);

// ── Type exports ──
export type EmployeePersonaProfile = typeof employeePersonaProfiles.$inferSelect;
export type ConsultantAgentOutput = typeof consultantAgentOutputs.$inferSelect;
export type ConsultantStrategyConfig = typeof consultantStrategyConfigs.$inferSelect;
export type ConsultantAgentSession = typeof consultantAgentSessions.$inferSelect;

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Skill Assessment System — 岗位能力等级测评                ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  CEO指令: 给每个岗位创造可以测试能力等级专业程度，              ║
 * ║  包括人为输入题目                                               ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. skill_position_profiles   — 岗位能力模型定义               ║
 * ║    2. skill_question_bank       — 题库 (含人工输入)              ║
 * ║    3. skill_assessment_papers   — 试卷模板 (组卷)                ║
 * ║    4. skill_assessment_sessions — 考试记录                       ║
 * ║    5. skill_assessment_answers  — 答题明细                       ║
 * ║    6. skill_level_certs         — 能力等级认证                   ║
 * ║                                                                 ║
 * ║  Levels:                                                        ║
 * ║    L1 入门(60分) → L2 熟练(70分) → L3 精通(80分)               ║
 * ║    → L4 专家(85分) → L5 大师(90分)                              ║
 * ║                                                                 ║
 * ║  Integrates with:                                               ║
 * ║    - employee_points (通过考核奖积分)                            ║
 * ║    - elite_benefit (技能等级≥L3 = 精英福利资格)                  ║
 * ║    - perf_calibration (能力评估纳入绩效校准)                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  decimal,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────

export const skillLevelEnum = pgEnum("skill_level_grade", [
  "L1",  // 入门 Entry
  "L2",  // 熟练 Proficient
  "L3",  // 精通 Advanced
  "L4",  // 专家 Expert
  "L5",  // 大师 Master
]);

export const questionTypeEnum = pgEnum("skill_question_type", [
  "single_choice",   // 单选题
  "multi_choice",    // 多选题
  "true_false",      // 判断题
  "fill_blank",      // 填空题
  "short_answer",    // 简答题
  "practical",       // 实操题 (手动评分)
  "case_analysis",   // 案例分析题
]);

export const questionDifficultyEnum = pgEnum("skill_question_difficulty", [
  "basic",           // 基础 (L1-L2)
  "intermediate",    // 中级 (L2-L3)
  "advanced",        // 高级 (L3-L4)
  "expert",          // 专家 (L4-L5)
]);

export const assessmentSessionStatusEnum = pgEnum("skill_session_status", [
  "pending",         // 待开始
  "in_progress",     // 进行中
  "submitted",       // 已提交
  "grading",         // 评分中 (有主观题)
  "completed",       // 已完成
  "expired",         // 已过期
]);

export const certStatusEnum = pgEnum("skill_cert_status", [
  "active",          // 有效
  "expired",         // 已过期
  "revoked",         // 已撤销
  "superseded",      // 已被更高等级替代
]);

// ── Table 1: Position Skill Profiles — 岗位能力模型 ──────

export const skillPositionProfiles = pgTable("skill_position_profiles", {
  id: serial("id").primaryKey(),
  /** Position key (e.g., "mechanical_assembly", "electrical_engineer") */
  positionKey: varchar("position_key", { length: 80 }).notNull().unique(),
  /** Display name in Chinese */
  positionName: varchar("position_name", { length: 200 }).notNull(),
  positionNameEn: varchar("position_name_en", { length: 200 }),
  /** Department scope */
  department: varchar("department", { length: 100 }),
  /** Description of position requirements */
  description: text("description"),
  /**
   * Skill domains for this position — JSON array of domains
   * Each domain: { key, name, nameEn, weight, description }
   * e.g., [{ key: "welding_process", name: "焊接工艺", weight: 30 }, ...]
   */
  skillDomains: json("skill_domains").$type<Array<{
    key: string;
    name: string;
    nameEn?: string;
    weight: number;
    description?: string;
  }>>().notNull(),
  /**
   * Pass thresholds per level — JSON map
   * { L1: 60, L2: 70, L3: 80, L4: 85, L5: 90 }
   */
  passThresholds: json("pass_thresholds").$type<Record<string, number>>()
    .notNull()
    .default({ L1: 60, L2: 70, L3: 80, L4: 85, L5: 90 }),
  /** Time limit in minutes per level (default 60 min) */
  timeLimitMinutes: json("time_limit_minutes").$type<Record<string, number>>()
    .default({ L1: 45, L2: 60, L3: 90, L4: 90, L5: 120 }),
  /** Number of questions per assessment per level */
  questionCount: json("question_count").$type<Record<string, number>>()
    .default({ L1: 20, L2: 30, L3: 40, L4: 40, L5: 50 }),
  /** Whether this position profile is active */
  isActive: boolean("is_active").notNull().default(true),
  /** Who created this profile */
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_position_profile_key").on(table.positionKey),
  index("idx_position_profile_dept").on(table.department),
]);

// ── Table 2: Question Bank — 题库 ───────────────────────

export const skillQuestionBank = pgTable("skill_question_bank", {
  id: serial("id").primaryKey(),
  /** FK → skill_position_profiles.position_key */
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  /** Skill domain within the position (matches skillDomains[].key) */
  domainKey: varchar("domain_key", { length: 80 }).notNull(),
  /** Question type */
  questionType: questionTypeEnum("question_type").notNull(),
  /** Difficulty level — maps to which levels this question is suitable for */
  difficulty: questionDifficultyEnum("difficulty").notNull(),
  /** Target skill levels this question can appear in */
  targetLevels: json("target_levels").$type<string[]>().notNull(), // ["L1","L2"] etc.
  /** Question content (supports markdown) */
  content: text("content").notNull(),
  /** Options for choice questions — JSON array */
  options: json("options").$type<Array<{
    key: string;    // A, B, C, D...
    text: string;   // Option content
    isCorrect?: boolean; // For auto-grading
  }>>(),
  /** Correct answer (for auto-gradable questions) */
  correctAnswer: text("correct_answer"),
  /** Answer explanation */
  explanation: text("explanation"),
  /** Points value for this question (default 1) */
  points: integer("points").notNull().default(1),
  /** Whether this is a manual (人为输入) question */
  isManualEntry: boolean("is_manual_entry").notNull().default(false),
  /** Who created this question */
  createdBy: integer("created_by"),
  createdByName: varchar("created_by_name", { length: 100 }),
  /** Tags for categorization */
  tags: json("tags").$type<string[]>(),
  /** Reference material (book chapter, SOP number, etc.) */
  reference: varchar("reference", { length: 300 }),
  /** Usage statistics */
  usageCount: integer("usage_count").notNull().default(0),
  correctRate: decimal("correct_rate", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_question_position").on(table.positionKey),
  index("idx_question_domain").on(table.domainKey),
  index("idx_question_difficulty").on(table.difficulty),
  index("idx_question_type").on(table.questionType),
  index("idx_question_active").on(table.isActive),
]);

// ── Table 3: Assessment Papers — 试卷模板 ───────────────

export const skillAssessmentPapers = pgTable("skill_assessment_papers", {
  id: serial("id").primaryKey(),
  /** Paper title */
  title: varchar("title", { length: 300 }).notNull(),
  titleEn: varchar("title_en", { length: 300 }),
  /** FK → position key */
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  /** Target level this paper assesses */
  targetLevel: skillLevelEnum("target_level").notNull(),
  /** Total points (sum of all question points) */
  totalPoints: integer("total_points").notNull(),
  /** Pass score (computed from position profile threshold) */
  passScore: integer("pass_score").notNull(),
  /** Time limit in minutes */
  timeLimitMinutes: integer("time_limit_minutes").notNull().default(60),
  /**
   * Question composition — ordered list of question IDs with points
   * [{ questionId: 1, points: 2 }, ...]
   */
  questionComposition: json("question_composition").$type<Array<{
    questionId: number;
    points: number;
    order: number;
  }>>().notNull(),
  /**
   * Domain weight distribution for this paper
   * { "welding_process": 30, "safety": 20, ... }
   */
  domainWeights: json("domain_weights").$type<Record<string, number>>(),
  /** Paper version (allows multiple versions per position+level) */
  version: integer("version").notNull().default(1),
  /** Whether this paper is currently used for assessments */
  isPublished: boolean("is_published").notNull().default(false),
  /** Who composed this paper */
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_paper_position").on(table.positionKey),
  index("idx_paper_level").on(table.targetLevel),
  index("idx_paper_published").on(table.isPublished),
]);

// ── Table 4: Assessment Sessions — 考试记录 ─────────────

export const skillAssessmentSessions = pgTable("skill_assessment_sessions", {
  id: serial("id").primaryKey(),
  /** Employee taking the assessment */
  employeeId: integer("employee_id").notNull(),
  /** FK → paper used */
  paperId: integer("paper_id").notNull(),
  /** Position + level being assessed (denormalized for queries) */
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  targetLevel: skillLevelEnum("target_level").notNull(),
  /** Session status */
  status: assessmentSessionStatusEnum("status").notNull().default("pending"),
  /** Timing */
  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  /** Scoring */
  totalPoints: integer("total_points"),        // Max available
  earnedPoints: integer("earned_points"),       // Auto-graded portion
  manualPoints: integer("manual_points"),       // Manually graded portion
  finalScore: decimal("final_score", { precision: 5, scale: 2 }), // Percentage
  passed: boolean("passed"),
  /** Domain-level scores */
  domainScores: json("domain_scores").$type<Record<string, { earned: number; total: number; percentage: number }>>(),
  /** Grader for subjective questions */
  gradedBy: integer("graded_by"),
  gradedAt: timestamp("graded_at"),
  graderNotes: text("grader_notes"),
  /** Points awarded in employee points system (null = not yet awarded) */
  pointsAwarded: integer("points_awarded"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_session_employee").on(table.employeeId),
  index("idx_session_position").on(table.positionKey),
  index("idx_session_status").on(table.status),
  index("idx_session_level").on(table.targetLevel),
]);

// ── Table 5: Assessment Answers — 答题明细 ──────────────

export const skillAssessmentAnswers = pgTable("skill_assessment_answers", {
  id: serial("id").primaryKey(),
  /** FK → session */
  sessionId: integer("session_id").notNull(),
  /** FK → question */
  questionId: integer("question_id").notNull(),
  /** Question order in paper */
  questionOrder: integer("question_order").notNull(),
  /** Employee's answer */
  answer: text("answer"),
  /** For choice questions: selected option keys (["A","C"]) */
  selectedOptions: json("selected_options").$type<string[]>(),
  /** Auto-grade result */
  isCorrect: boolean("is_correct"),
  /** Points earned (auto or manual) */
  pointsEarned: integer("points_earned"),
  /** Max points for this question */
  maxPoints: integer("max_points").notNull(),
  /** Manual grading fields */
  manualScore: integer("manual_score"),
  manualFeedback: text("manual_feedback"),
  gradedBy: integer("graded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_answer_session").on(table.sessionId),
  index("idx_answer_question").on(table.questionId),
  unique("answer_session_question_uniq").on(table.sessionId, table.questionId),
]);

// ── Table 6: Skill Level Certifications — 能力等级认证 ──

export const skillLevelCerts = pgTable("skill_level_certs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  positionKey: varchar("position_key", { length: 80 }).notNull(),
  /** Certified level */
  level: skillLevelEnum("level").notNull(),
  /** Assessment session that earned this cert */
  sessionId: integer("session_id"),
  /** Score achieved */
  score: decimal("score", { precision: 5, scale: 2 }),
  /** Cert validity */
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),        // null = no expiry
  status: certStatusEnum("status").notNull().default("active"),
  /** Superseded by (if upgraded) */
  supersededBy: integer("superseded_by"),
  /** Revocation reason */
  revokedReason: text("revoked_reason"),
  /** Certificate number (auto-generated) */
  certNumber: varchar("cert_number", { length: 50 }),
  /** Approved by (manager/HR) */
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_cert_employee").on(table.employeeId),
  index("idx_cert_position").on(table.positionKey),
  index("idx_cert_level").on(table.level),
  index("idx_cert_status").on(table.status),
]);

// ── Type Exports ──────────────────────────────────────────

export type SkillPositionProfile = InferSelectModel<typeof skillPositionProfiles>;
export type InsertSkillPositionProfile = InferInsertModel<typeof skillPositionProfiles>;
export type SkillQuestion = InferSelectModel<typeof skillQuestionBank>;
export type InsertSkillQuestion = InferInsertModel<typeof skillQuestionBank>;
export type SkillAssessmentPaper = InferSelectModel<typeof skillAssessmentPapers>;
export type InsertSkillAssessmentPaper = InferInsertModel<typeof skillAssessmentPapers>;
export type SkillAssessmentSession = InferSelectModel<typeof skillAssessmentSessions>;
export type InsertSkillAssessmentSession = InferInsertModel<typeof skillAssessmentSessions>;
export type SkillAssessmentAnswer = InferSelectModel<typeof skillAssessmentAnswers>;
export type InsertSkillAssessmentAnswer = InferInsertModel<typeof skillAssessmentAnswers>;
export type SkillLevelCert = InferSelectModel<typeof skillLevelCerts>;
export type InsertSkillLevelCert = InferInsertModel<typeof skillLevelCerts>;

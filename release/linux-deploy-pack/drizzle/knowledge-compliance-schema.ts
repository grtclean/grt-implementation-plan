import { pgTable, serial, text, integer, timestamp, varchar, decimal, boolean, json, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

/* ------------------------------------------------------------------ */
/*  Enterprise Knowledge & Compliance Platform — 企业知识合规平台        */
/*  Unifies all company documents, training, SOPs, standards into a    */
/*  role-mapped, skill-level-gated, authorization-controlled hub.      */
/* ------------------------------------------------------------------ */

// ── Document Categories (文档分类树) ────────────────────────────────
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(), // e.g. "TRAIN", "SOP", "POLICY"
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("name_en", { length: 200 }),
  icon: varchar("icon", { length: 50 }), // lucide icon name
  parentId: integer("parent_id"), // self-referencing hierarchy
  sortOrder: integer("sort_order").default(0),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Role-Document Requirements (岗位文档要求) ───────────────────────
// Maps: which docs a given role/position MUST know at a given skill level
export const knowledgeRoleRequirements = pgTable("knowledge_role_requirements", {
  id: serial("id").primaryKey(),
  // Role/position scope
  role: varchar("role", { length: 50 }).notNull(), // e.g. "production_engineer", "quality_inspector"
  department: varchar("department", { length: 100 }), // null = all departments
  position: varchar("position", { length: 100 }), // null = all positions in role
  // Document reference (polymorphic — can point to any doc source)
  docSourceType: varchar("doc_source_type", { length: 30 }).notNull(), // 'org_doc' | 'sop' | 'training_material' | 'knowledge_asset' | 'external_link'
  docSourceId: varchar("doc_source_id", { length: 100 }), // FK to source table (or null for external)
  docTitle: varchar("doc_title", { length: 500 }).notNull(),
  docUrl: varchar("doc_url", { length: 1000 }), // direct link or file path
  categoryCode: varchar("category_code", { length: 50 }), // FK knowledge_categories.code
  // Requirement level
  requirementLevel: varchar("requirement_level", { length: 20 }).notNull().default("must_know"),
  // 'must_know' | 'should_know' | 'nice_to_know'
  skillLevelRequired: integer("skill_level_required").default(1), // 1-5: at which skill level this becomes required
  masteryExpectation: varchar("mastery_expectation", { length: 20 }).default("understand"),
  // 'aware' | 'understand' | 'apply' | 'analyze' | 'master'
  hasTest: boolean("has_test").default(false), // does this doc have a theory test?
  testId: integer("test_id"), // FK to knowledge_theory_tests
  // Meta
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("krr_role_idx").on(table.role),
  index("krr_category_idx").on(table.categoryCode),
  index("krr_skill_level_idx").on(table.skillLevelRequired),
]);

// ── Skill Level Standards (技能等级标准) ────────────────────────────
// Defines what each skill level (1-5) means for each role — the "should be" standard
export const knowledgeSkillLevelStandards = pgTable("knowledge_skill_level_standards", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  department: varchar("department", { length: 100 }),
  skillLevel: integer("skill_level").notNull(), // 1-5
  levelName: varchar("level_name", { length: 50 }).notNull(), // e.g. "初级", "中级", "高级", "专家", "大师"
  levelNameEn: varchar("level_name_en", { length: 50 }),
  // Standards at this level
  knowledgeRequirements: json("knowledge_requirements").$type<string[]>().default([]), // list of knowledge areas
  skillRequirements: json("skill_requirements").$type<string[]>().default([]), // list of practical skills
  performanceStandards: json("performance_standards").$type<string[]>().default([]), // measurable KPIs
  certificationRequired: json("certification_required").$type<string[]>().default([]), // required certs
  trainingHoursRequired: integer("training_hours_required").default(0),
  // Test requirement for this level
  theoryTestRequired: boolean("theory_test_required").default(false),
  minTestScore: integer("min_test_score").default(60), // 0-100
  practicalAssessmentRequired: boolean("practical_assessment_required").default(false),
  // Promotion criteria
  minMonthsAtPreviousLevel: integer("min_months_at_previous_level").default(6),
  minKpiScore: decimal("min_kpi_score", { precision: 5, scale: 2 }),
  // Description
  description: text("description"),
  exampleTasks: json("example_tasks").$type<string[]>().default([]),
  // Meta
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("ksl_role_level_idx").on(table.role, table.department, table.skillLevel),
]);

// ── Access Authorization (访问授权) ─────────────────────────────────
// Time-limited, count-limited access grants for sensitive documents
export const knowledgeAccessAuthorizations = pgTable("knowledge_access_authorizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  userName: varchar("user_name", { length: 100 }).notNull(),
  // Document reference
  docSourceType: varchar("doc_source_type", { length: 30 }).notNull(),
  docSourceId: varchar("doc_source_id", { length: 100 }),
  docTitle: varchar("doc_title", { length: 500 }).notNull(),
  // Authorization type
  authType: varchar("auth_type", { length: 20 }).notNull().default("time_limited"),
  // 'unlimited' | 'time_limited' | 'count_limited' | 'time_and_count'
  // Time limits
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  // Count limits
  maxAccessCount: integer("max_access_count"), // null = unlimited
  currentAccessCount: integer("current_access_count").default(0),
  // Status
  status: varchar("status", { length: 20 }).default("active"),
  // 'pending' | 'active' | 'expired' | 'exhausted' | 'revoked'
  // Approval workflow
  requestReason: text("request_reason"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedByName: varchar("approved_by_name", { length: 100 }),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  // Meta
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kaa_user_idx").on(table.userId),
  index("kaa_status_idx").on(table.status),
  index("kaa_doc_idx").on(table.docSourceType, table.docSourceId),
]);

// ── Learning Progress (学习进度) ────────────────────────────────────
// Tracks employee's progress on each document (view, study, complete)
export const knowledgeLearningProgress = pgTable("knowledge_learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  // Document reference
  docSourceType: varchar("doc_source_type", { length: 30 }).notNull(),
  docSourceId: varchar("doc_source_id", { length: 100 }),
  docTitle: varchar("doc_title", { length: 500 }).notNull(),
  categoryCode: varchar("category_code", { length: 50 }),
  // Progress
  status: varchar("status", { length: 20 }).default("not_started"),
  // 'not_started' | 'in_progress' | 'completed' | 'tested'
  progressPercent: integer("progress_percent").default(0), // 0-100
  totalStudyMinutes: integer("total_study_minutes").default(0),
  lastStudiedAt: timestamp("last_studied_at"),
  completedAt: timestamp("completed_at"),
  // Notes
  personalNotes: text("personal_notes"),
  bookmarkPosition: varchar("bookmark_position", { length: 200 }), // section/page to resume
  // Test results (if applicable)
  testAttempts: integer("test_attempts").default(0),
  bestTestScore: integer("best_test_score"), // 0-100
  testPassedAt: timestamp("test_passed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("klp_user_doc_idx").on(table.userId, table.docSourceType, table.docSourceId),
  index("klp_status_idx").on(table.status),
  index("klp_category_idx").on(table.categoryCode),
]);

// ── Theory Tests (理论测试) ─────────────────────────────────────────
export const knowledgeTheoryTests = pgTable("knowledge_theory_tests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  // Association
  categoryCode: varchar("category_code", { length: 50 }),
  targetRole: varchar("target_role", { length: 50 }), // null = all roles
  skillLevelRequired: integer("skill_level_required").default(1),
  // Test configuration
  questions: json("questions").$type<{
    id: number;
    type: "single" | "multiple" | "truefalse" | "fillblank";
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
    explanation?: string;
  }[]>().notNull(),
  totalPoints: integer("total_points").notNull(),
  passingScore: integer("passing_score").notNull().default(60),
  timeLimitMinutes: integer("time_limit_minutes").default(30),
  maxAttempts: integer("max_attempts").default(3), // 0 = unlimited
  shuffleQuestions: boolean("shuffle_questions").default(true),
  // Meta
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ktt_category_idx").on(table.categoryCode),
  index("ktt_role_idx").on(table.targetRole),
]);

// ── Test Attempts (测试记录) ────────────────────────────────────────
export const knowledgeTestAttempts = pgTable("knowledge_test_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  testId: integer("test_id").references(() => knowledgeTheoryTests.id).notNull(),
  // Results
  answers: json("answers").$type<Record<string, string | string[]>>(), // questionId → answer
  score: integer("score").notNull(),
  totalPoints: integer("total_points").notNull(),
  passed: boolean("passed").notNull(),
  // Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMinutes: integer("duration_minutes"),
  // Detail
  questionResults: json("question_results").$type<{
    questionId: number;
    correct: boolean;
    pointsEarned: number;
  }[]>(),
  attemptNumber: integer("attempt_number").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kta_user_idx").on(table.userId),
  index("kta_test_idx").on(table.testId),
  index("kta_passed_idx").on(table.passed),
]);

// ── Type exports ───────────────────────────────────────────────────
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type KnowledgeRoleRequirement = typeof knowledgeRoleRequirements.$inferSelect;
export type KnowledgeSkillLevelStandard = typeof knowledgeSkillLevelStandards.$inferSelect;
export type KnowledgeAccessAuthorization = typeof knowledgeAccessAuthorizations.$inferSelect;
export type KnowledgeLearningProgress = typeof knowledgeLearningProgress.$inferSelect;
export type KnowledgeTheoryTest = typeof knowledgeTheoryTests.$inferSelect;
export type KnowledgeTestAttempt = typeof knowledgeTestAttempts.$inferSelect;

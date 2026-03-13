import { pgTable, serial, text, integer, timestamp, varchar, decimal, boolean, json, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

/* ══════════════════════════════════════════════════════════════════════
   GRT Employee Lifecycle Ecosystem — 员工生命旅程生态系统 (G1–G20)

   Company Mission: 做全球最好的工业洁净系统
   Philosophy: 工程师文化为底蕴 · 公平公开学习为公司哲学基础
   Principle: 最有效的资源创造生产力

   G1  招募吸引    Attraction        Pre-hire
   G2  入职启航    Onboarding        Day 1
   G3  文化融入    Culture Immersion Week 1-2
   G4  技能筑基    Skill Foundation  Month 1
   G5  首月里程碑  First Milestone   Month 1 ✓
   G6  试用成长    Probation Growth  Month 2-3
   G7  转正蜕变    Regularization    Month 3 ✓
   G8  独立担当    Independence      Month 3-6
   G9  专业深耕    Deepening         Month 6-12
   G10 年度复盘    Annual Review     Year 1 ✓
   G11 能力跃升    Capability Leap   Year 1-2
   G12 项目引领    Project Lead      Year 2-3
   G13 团队赋能    Team Empowerment  Year 2-3
   G14 专家之路    Expert Path       Year 3-5
   G15 跨域协同    Cross-Domain      Year 3-5
   G16 战略视野    Strategic Vision  Year 5+
   G17 导师传承    Mentorship        Year 5+
   G18 行业影响    Industry Impact   Year 7+
   G19 荣誉退场    Honorable Exit    Transition
   G20 校友生态    Alumni Network    Post-GRT
   ══════════════════════════════════════════════════════════════════════ */

// ── Employee Lifecycle Journey (个人生命旅程主记录) ──────────────────
export const lifecycleJourneys = pgTable("lifecycle_journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  employeeId: varchar("employee_id", { length: 50 }),
  employeeName: varchar("employee_name", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  role: varchar("role", { length: 50 }),
  hireDate: timestamp("hire_date"),
  // Current stage
  currentStage: varchar("current_stage", { length: 10 }).notNull().default("G2"), // G1-G20
  currentStageName: varchar("current_stage_name", { length: 100 }),
  stageEnteredAt: timestamp("stage_entered_at").defaultNow(),
  // Personal portal configuration
  portalTheme: varchar("portal_theme", { length: 30 }).default("default"), // default, dark, engineer, nature
  portalBannerUrl: varchar("portal_banner_url", { length: 500 }),
  personalMotto: varchar("personal_motto", { length: 300 }), // 个人座右铭
  careerVision: text("career_vision"), // 职业愿景
  personalHighlightReel: json("personal_highlight_reel").$type<{
    type: "image" | "video" | "achievement";
    url?: string;
    title: string;
    date: string;
  }[]>().default([]),
  // Company culture integration
  companyMissionAcknowledged: boolean("company_mission_acknowledged").default(false),
  cultureValues: json("culture_values").$type<string[]>().default([]),
  // Persona / Profile portrait
  personaTraits: json("persona_traits").$type<{
    driveType: string;       // 原动力类型: growth | achievement | influence | service
    learningStyle: string;   // 学习风格: visual | auditory | kinesthetic | reading
    workStyle: string;       // 工作风格: independent | collaborative | structured | creative
    strengthTags: string[];  // 优势标签
    growthAreas: string[];   // 成长方向
  }>(),
  // Status
  status: varchar("status", { length: 20 }).default("active"), // active | on_leave | transitioning | alumni
  exitDate: timestamp("exit_date"),
  alumniStatus: varchar("alumni_status", { length: 20 }), // connected | inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("lj_user_idx").on(table.userId),
  index("lj_stage_idx").on(table.currentStage),
  index("lj_dept_idx").on(table.department),
]);

// ── Stage Milestones (阶段里程碑) ────────────────────────────────
// Each G-stage milestone for a specific employee
export const lifecycleMilestones = pgTable("lifecycle_milestones", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => lifecycleJourneys.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  // Stage identity
  stageCode: varchar("stage_code", { length: 10 }).notNull(), // G1-G20
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  stageNameEn: varchar("stage_name_en", { length: 100 }),
  stageDescription: text("stage_description"),
  stageIcon: varchar("stage_icon", { length: 50 }),
  stageColor: varchar("stage_color", { length: 20 }),
  // Timeline
  expectedDate: timestamp("expected_date"),
  actualDate: timestamp("actual_date"),
  completedAt: timestamp("completed_at"),
  // Status
  status: varchar("status", { length: 20 }).default("upcoming"),
  // 'upcoming' | 'active' | 'completed' | 'skipped' | 'delayed'
  // Stage objectives (what to achieve)
  objectives: json("objectives").$type<{
    id: number;
    title: string;
    type: "learning" | "project" | "certification" | "kpi" | "culture" | "social" | "leadership";
    completed: boolean;
    linkedDocId?: string;     // → knowledge_role_requirements
    linkedTestId?: number;    // → knowledge_theory_tests
    linkedKpiTarget?: string;
  }[]>().default([]),
  // Daily tools & activities at this stage
  dailyTools: json("daily_tools").$type<{
    tool: string;
    path: string;
    description: string;
    frequency: "daily" | "weekly" | "monthly" | "as_needed";
  }[]>().default([]),
  // Reporting requirements
  reportingRequirements: json("reporting_requirements").$type<{
    reportType: string;
    frequency: string;
    to: string;
    template?: string;
  }[]>().default([]),
  // Inspirational content
  inspirationalMessage: text("inspirational_message"), // 激励寄语
  mentorMessage: text("mentor_message"), // 导师寄语
  mediaUrl: varchar("media_url", { length: 500 }), // 阶段主题图/视频
  mediaType: varchar("media_type", { length: 20 }), // image | video
  // Achievement unlocks
  achievementBadge: varchar("achievement_badge", { length: 100 }),
  achievementTitle: varchar("achievement_title", { length: 200 }),
  // Scores & metrics at completion
  stageKpiScore: decimal("stage_kpi_score", { precision: 5, scale: 2 }),
  stageCapabilityLevel: integer("stage_capability_level"),
  // Manager review
  managerReview: text("manager_review"),
  managerReviewedBy: integer("manager_reviewed_by").references(() => users.id),
  managerReviewedAt: timestamp("manager_reviewed_at"),
  managerRating: integer("manager_rating"), // 1-5
  // HRBP notes
  hrbpNotes: text("hrbp_notes"),
  hrbpReviewedBy: integer("hrbp_reviewed_by").references(() => users.id),
  hrbpReviewedAt: timestamp("hrbp_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("lm_journey_stage_idx").on(table.journeyId, table.stageCode),
  index("lm_user_idx").on(table.userId),
  index("lm_status_idx").on(table.status),
]);

// ── Journey Activities (旅程活动流) ──────────────────────────────
// Timeline of all activities, achievements, and interactions
export const lifecycleActivities = pgTable("lifecycle_activities", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => lifecycleJourneys.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stageCode: varchar("stage_code", { length: 10 }),
  // Activity
  activityType: varchar("activity_type", { length: 30 }).notNull(),
  // 'learning_completed' | 'test_passed' | 'project_assigned' | 'kpi_review' |
  // 'reward' | 'penalty' | 'promotion' | 'certification' | 'milestone_achieved' |
  // 'culture_event' | 'mentor_session' | 'team_contribution' | 'innovation' |
  // 'manager_feedback' | 'self_reflection' | 'goal_set' | 'goal_achieved'
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  // Impact
  impactScore: integer("impact_score"), // 0-100
  // Visibility
  isPublic: boolean("is_public").default(true), // visible on personal portal
  isPinned: boolean("is_pinned").default(false), // pinned to top
  // Media
  imageUrl: varchar("image_url", { length: 500 }),
  // Timestamp
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("la_journey_idx").on(table.journeyId),
  index("la_user_idx").on(table.userId),
  index("la_type_idx").on(table.activityType),
  index("la_stage_idx").on(table.stageCode),
]);

// ── Stage Templates (G1-G20 阶段模板) ───────────────────────────
// Company-wide template for each G-stage — managers can customize per employee
export const lifecycleStageTemplates = pgTable("lifecycle_stage_templates", {
  id: serial("id").primaryKey(),
  stageCode: varchar("stage_code", { length: 10 }).unique().notNull(),
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  stageNameEn: varchar("stage_name_en", { length: 100 }),
  stageSubtitle: varchar("stage_subtitle", { length: 300 }),
  stageIcon: varchar("stage_icon", { length: 50 }),
  stageColor: varchar("stage_color", { length: 20 }),
  // Timeline placement
  typicalStartMonth: integer("typical_start_month"), // months from hire (0 = pre-hire)
  typicalEndMonth: integer("typical_end_month"),
  // Template content
  description: text("description"),
  narrative: text("narrative"), // 场景化故事叙述
  companyMissionLink: text("company_mission_link"), // how this stage connects to company mission
  cultureMessage: text("culture_message"), // 文化价值寄语
  // Default objectives per role
  defaultObjectives: json("default_objectives").$type<{
    role: string; // 'ALL' or specific role
    objectives: {
      title: string;
      type: string;
      linkedCategoryCode?: string; // → knowledge_categories
    }[];
  }[]>().default([]),
  // Default daily tools
  defaultDailyTools: json("default_daily_tools").$type<{
    tool: string;
    path: string;
    description: string;
    frequency: string;
  }[]>().default([]),
  // Default reporting
  defaultReporting: json("default_reporting").$type<{
    reportType: string;
    frequency: string;
    to: string;
  }[]>().default([]),
  // Inspirational defaults
  defaultMediaUrl: varchar("default_media_url", { length: 500 }),
  defaultMediaType: varchar("default_media_type", { length: 20 }),
  defaultMessage: text("default_message"),
  achievementBadge: varchar("achievement_badge", { length: 100 }),
  achievementTitle: varchar("achievement_title", { length: 200 }),
  // Meta
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Type exports ───────────────────────────────────────────────────
export type LifecycleJourney = typeof lifecycleJourneys.$inferSelect;
export type LifecycleMilestone = typeof lifecycleMilestones.$inferSelect;
export type LifecycleActivity = typeof lifecycleActivities.$inferSelect;
export type LifecycleStageTemplate = typeof lifecycleStageTemplates.$inferSelect;

/**
 * T1-T15 生产工序管理 Schema
 * 基于 生产与AI.txt 文档设计
 * 
 * 工序链：
 * T1 机加工 (Machining)
 * T2 冷作 (Cold Work)
 * T3 机械部件装配 (Sub-assembly)
 * T4 机械装配 (Mechanical Assembly)
 * T5 机械总装 (Final Mechanical Assembly)
 * T6 电气装配 (Electrical Assembly)
 * T7 设备调试 (System Debugging)
 * T8 跑和 (Running-in/Burn-in)
 * T9 包装 (Packaging)
 * T10 发货 (Shipping)
 * T11 卸车 (Unloading)
 * T12 就位 (Positioning)
 * T13 水电气连接 (Utility Connection)
 * T14 现场调试 (Site Debug/SAT)
 * T15 终验收 (Final Acceptance)
 */

import { pgTable, varchar, text, serial, integer, decimal, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { users } from "./schema";

// 工序类型枚举值 (使用varchar代替pgEnum，值约束在应用层实现)
export const processStepValues = [
  "T1_MACHINING",
  "T2_COLD_WORK",
  "T3_SUB_ASSEMBLY",
  "T4_MECHANICAL_ASSEMBLY",
  "T5_FINAL_MECHANICAL_ASSEMBLY",
  "T6_ELECTRICAL_ASSEMBLY",
  "T7_SYSTEM_DEBUGGING",
  "T8_RUNNING_IN",
  "T9_PACKAGING",
  "T10_SHIPPING",
  "T11_UNLOADING",
  "T12_POSITIONING",
  "T13_UTILITY_CONNECTION",
  "T14_SITE_DEBUG",
  "T15_FINAL_ACCEPTANCE"
] as const;

// 工序状态枚举值 (使用varchar代替pgEnum，值约束在应用层实现)
export const processStatusValues = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "BLOCKED"
] as const;

/**
 * 工序定义表 - 定义T1-T15工序的基本信息
 */
export const processDefinitions = pgTable("process_definitions", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(), // T1, T2, ... T15
  nameZh: varchar("name_zh", { length: 100 }).notNull(), // 中文名称
  nameEn: varchar("name_en", { length: 100 }).notNull(), // 英文名称
  description: text("description"), // 工序描述
  category: varchar("category", { length: 50 }).notNull(), // 分类：制造/物流/现场交付
  standardDurationHours: decimal("standard_duration_hours", { precision: 10, scale: 2 }), // 标准工时
  requiredCapabilityLevel: varchar("required_capability_level", { length: 50 }), // 所需能力等级
  sopTemplateId: integer("sop_template_id"), // 关联SOP模板
  checklistItems: json("checklist_items"), // 检查清单项
  riskFactors: json("risk_factors"), // 风险因素
  sortOrder: integer("sort_order").notNull().default(0), // 排序
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * 项目工序实例表 - 每个项目的工序执行记录
 */
export const projectProcessInstances = pgTable("project_process_instances", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(), // 关联项目
  workOrderId: integer("work_order_id"), // 关联工单
  processDefinitionId: integer("process_definition_id").notNull(), // 关联工序定义
  processCode: varchar("process_code", { length: 20 }).notNull(), // T1-T15
  status: varchar("status", { length: 50 }).notNull().default("NOT_STARTED"),
  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  plannedDurationHours: decimal("planned_duration_hours", { precision: 10, scale: 2 }),
  actualDurationHours: decimal("actual_duration_hours", { precision: 10, scale: 2 }),
  assignedUserId: integer("assigned_user_id").references(() => users.id), // 负责人
  assignedTeam: varchar("assigned_team", { length: 100 }), // 负责团队
  completionPercentage: integer("completion_percentage").notNull().default(0), // 完成百分比
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分
  notes: text("notes"), // 备注
  blockerDescription: text("blocker_description"), // 阻塞原因
  m2Tags: json("m2_tags"), // M2会议关联标签
  aiRecommendations: json("ai_recommendations"), // AI推荐
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * M2关键信息标签表 - AI解析会议纪要生成的结构化标签
 */
export const m2InfoTags = pgTable("m2_info_tags", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(), // 关联项目
  meetingId: integer("meeting_id"), // 关联会议记录
  tagCategory: varchar("tag_category", { length: 50 }).notNull(), // 客户要求/技术规格/交付约束/风险因素/特别关注/资源需求/时间关键
  tagName: varchar("tag_name", { length: 200 }).notNull(), // 标签名称
  tagValue: text("tag_value"), // 标签值
  relatedProcessCodes: json("related_process_codes"), // 关联的T工序代码
  priority: varchar("priority", { length: 50 }).notNull().default("MEDIUM"),
  sourceText: text("source_text"), // 原始文本来源
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // AI置信度
  isVerified: boolean("is_verified").notNull().default(false), // 是否已人工验证
  verifiedBy: integer("verified_by").references(() => users.id), // 验证人
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * SOP模板表 - 标准操作程序模板
 */
export const sopTemplates = pgTable("sop_templates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // SOP编号
  title: varchar("title", { length: 200 }).notNull(), // 标题
  processCode: varchar("process_code", { length: 20 }), // 关联工序代码
  version: varchar("version", { length: 20 }).notNull().default("1.0"),
  category: varchar("category", { length: 100 }), // 分类
  applicableProducts: json("applicable_products"), // 适用产品类型
  steps: json("steps"), // 操作步骤 [{stepNo, title, description, duration, tools, safetyNotes}]
  requiredTools: json("required_tools"), // 所需工具
  safetyPrecautions: json("safety_precautions"), // 安全注意事项
  qualityCheckpoints: json("quality_checkpoints"), // 质量检查点
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  difficultyLevel: varchar("difficulty_level", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * AI SOP推荐记录表 - 记录AI推荐的SOP
 */
export const aiSopRecommendations = pgTable("ai_sop_recommendations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  processInstanceId: integer("process_instance_id"),
  sopTemplateId: integer("sop_template_id").notNull(),
  recommendationReason: text("recommendation_reason"), // 推荐原因
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 匹配度评分
  contextFactors: json("context_factors"), // 上下文因素
  isAccepted: boolean("is_accepted"), // 是否被采纳
  acceptedBy: integer("accepted_by").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  feedback: text("feedback"), // 用户反馈
  createdAt: timestamp("created_at").defaultNow()
});

/**
 * 工序风险预警表 - 基于历史数据和M2信息的风险提示
 */
export const processRiskAlerts = pgTable("process_risk_alerts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  processInstanceId: integer("process_instance_id"),
  processCode: varchar("process_code", { length: 20 }),
  riskType: varchar("risk_type", { length: 50 }).notNull(), // 进度延迟/质量问题/资源短缺/技术难度/供应商风险/客户变更/安全隐患
  severity: varchar("severity", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  suggestedActions: json("suggested_actions"), // 建议措施
  historicalReference: json("historical_reference"), // 历史参考案例
  aiAnalysis: text("ai_analysis"), // AI分析
  status: varchar("status", { length: 50 }).notNull().default("OPEN"),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  mitigationNotes: text("mitigation_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * 工序工时记录表 - 记录每个工序的实际工时
 */
export const processTimeRecords = pgTable("process_time_records", {
  id: serial("id").primaryKey(),
  processInstanceId: integer("process_instance_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id), // 工作人员
  workDate: timestamp("work_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes").notNull(),
  workType: varchar("work_type", { length: 50 }).notNull().default("REGULAR"),
  taskDescription: text("task_description"),
  isAutoCollected: boolean("is_auto_collected").notNull().default(false), // 是否自动采集（UWB/IoT）
  deviceId: varchar("device_id", { length: 100 }), // 采集设备ID
  createdAt: timestamp("created_at").defaultNow()
});

// ============================================
// 客户需求问卷 Schema
// 基于 GRTclean_Parts_Cleaning_Questionaire_EN_V1.docx
// ============================================

/**
 * 客户需求问卷表 - 零件清洗需求调查
 */
export const customerQuestionnaires = pgTable("customer_questionnaires", {
  id: serial("id").primaryKey(),
  questionnaireNo: varchar("questionnaire_no", { length: 50 }).notNull().unique(), // 问卷编号
  status: varchar("status", { length: 50 }).notNull().default("DRAFT"),

  // 1. 一般项目信息
  contactPerson: varchar("contact_person", { length: 100 }),
  company: varchar("company", { length: 200 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  quoteType: varchar("quote_type", { length: 50 }),
  projectName: varchar("project_name", { length: 200 }),

  // 2. 零件信息
  partName: varchar("part_name", { length: 200 }), // 零件名称
  partDescription: text("part_description"), // 零件描述
  partDrawingUrl: varchar("part_drawing_url", { length: 500 }), // 零件图纸URL

  // 3. 材料类型
  materialTypes: json("material_types"), // ["STEEL", "ALUMINUM", "NON_FERROUS", "CASTING", "PLASTIC", "OTHER"]
  materialOther: varchar("material_other", { length: 200 }),

  // 4. 零件规格
  partWeightMin: decimal("part_weight_min", { precision: 10, scale: 3 }), // 最小重量(kg)
  partWeightMax: decimal("part_weight_max", { precision: 10, scale: 3 }), // 最大重量(kg)
  partLengthMin: decimal("part_length_min", { precision: 10, scale: 2 }), // 最小长度(mm)
  partLengthMax: decimal("part_length_max", { precision: 10, scale: 2 }), // 最大长度(mm)
  partWidthMin: decimal("part_width_min", { precision: 10, scale: 2 }), // 最小宽度(mm)
  partWidthMax: decimal("part_width_max", { precision: 10, scale: 2 }), // 最大宽度(mm)
  partHeightMin: decimal("part_height_min", { precision: 10, scale: 2 }), // 最小高度(mm)
  partHeightMax: decimal("part_height_max", { precision: 10, scale: 2 }), // 最大高度(mm)

  // 5. 清洗产品类型
  cleaningProductType: varchar("cleaning_product_type", { length: 50 }),
  cleaningProductOther: varchar("cleaning_product_other", { length: 200 }),

  // 6. 污染类型
  contaminationTypes: json("contamination_types"), // ["COOLANT", "CHIPS", "BURRS", "OIL", "GREASE", "DUST", "OTHER"]
  contaminationOther: varchar("contamination_other", { length: 200 }),

  // 7. 工艺和质量要求
  partTempBefore: decimal("part_temp_before", { precision: 5, scale: 1 }), // 清洗前温度(°C)
  partTempAfter: decimal("part_temp_after", { precision: 5, scale: 1 }), // 清洗后温度(°C)
  qualityControlMethods: json("quality_control_methods"), // ["SPRAY_TEST", "INK_TEST", "ULTRASONIC_TEST", "VISUAL", "OTHER"]
  dryingLevel: varchar("drying_level", { length: 50 }), // 干燥等级
  cleanlinessStandard: varchar("cleanliness_standard", { length: 200 }), // 清洁度标准

  // 8. 产能要求
  dailyPartQuantity: integer("daily_part_quantity"), // 每日零件数量
  cycleTimeSeconds: integer("cycle_time_seconds"), // 循环时间(秒)
  annualVolume: integer("annual_volume"), // 年产量
  oeeTarget: decimal("oee_target", { precision: 5, scale: 2 }), // OEE目标(%)
  shiftPattern: varchar("shift_pattern", { length: 50 }),

  // 9. 上下料方式
  loadingMethod: varchar("loading_method", { length: 50 }),
  loadingMethodOther: varchar("loading_method_other", { length: 200 }),

  // 10. 场地要求
  availableSpaceLength: decimal("available_space_length", { precision: 10, scale: 2 }), // 可用长度(mm)
  availableSpaceWidth: decimal("available_space_width", { precision: 10, scale: 2 }), // 可用宽度(mm)
  availableSpaceHeight: decimal("available_space_height", { precision: 10, scale: 2 }), // 可用高度(mm)
  noiseLimit: integer("noise_limit"), // 噪音限制(dB)

  // 11. 预算和时间
  investmentBudgetMin: decimal("investment_budget_min", { precision: 15, scale: 2 }), // 最小预算
  investmentBudgetMax: decimal("investment_budget_max", { precision: 15, scale: 2 }), // 最大预算
  budgetCurrency: varchar("budget_currency", { length: 10 }).default("CNY"),
  projectTimeline: varchar("project_timeline", { length: 100 }), // 项目周期
  expectedDeliveryDate: timestamp("expected_delivery_date"),

  // 12. 其他要求
  additionalRequirements: text("additional_requirements"),
  attachments: json("attachments"), // 附件列表

  // 关联信息
  customerId: integer("customer_id"), // 关联客户
  opportunityId: integer("opportunity_id"), // 关联商机
  assignedSalesId: integer("assigned_sales_id").references(() => users.id), // 负责销售
  convertedProjectId: integer("converted_project_id"), // 转化的项目ID

  // AI分析
  aiAnalysis: json("ai_analysis"), // AI分析结果
  aiRecommendedProducts: json("ai_recommended_products"), // AI推荐产品
  aiEstimatedPrice: decimal("ai_estimated_price", { precision: 15, scale: 2 }), // AI估价

  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/**
 * 问卷版本历史表 - 记录问卷修改历史
 */
export const questionnaireVersions = pgTable("questionnaire_versions", {
  id: serial("id").primaryKey(),
  questionnaireId: integer("questionnaire_id").notNull(),
  version: integer("version").notNull(),
  changes: json("changes"), // 变更内容
  changedBy: integer("changed_by").references(() => users.id),
  changeReason: text("change_reason"),
  snapshotData: json("snapshot_data"), // 完整快照
  createdAt: timestamp("created_at").defaultNow()
});

// 导出类型
export type ProcessDefinition = typeof processDefinitions.$inferSelect;
export type NewProcessDefinition = typeof processDefinitions.$inferInsert;
export type ProjectProcessInstance = typeof projectProcessInstances.$inferSelect;
export type NewProjectProcessInstance = typeof projectProcessInstances.$inferInsert;
export type M2InfoTag = typeof m2InfoTags.$inferSelect;
export type NewM2InfoTag = typeof m2InfoTags.$inferInsert;
export type SopTemplate = typeof sopTemplates.$inferSelect;
export type NewSopTemplate = typeof sopTemplates.$inferInsert;
export type AiSopRecommendation = typeof aiSopRecommendations.$inferSelect;
export type NewAiSopRecommendation = typeof aiSopRecommendations.$inferInsert;
export type ProcessRiskAlert = typeof processRiskAlerts.$inferSelect;
export type NewProcessRiskAlert = typeof processRiskAlerts.$inferInsert;
export type ProcessTimeRecord = typeof processTimeRecords.$inferSelect;
export type NewProcessTimeRecord = typeof processTimeRecords.$inferInsert;
export type CustomerQuestionnaire = typeof customerQuestionnaires.$inferSelect;
export type NewCustomerQuestionnaire = typeof customerQuestionnaires.$inferInsert;
export type QuestionnaireVersion = typeof questionnaireVersions.$inferSelect;
export type NewQuestionnaireVersion = typeof questionnaireVersions.$inferInsert;

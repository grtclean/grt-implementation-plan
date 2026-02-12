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

import { mysqlTable, varchar, text, int, decimal, timestamp, mysqlEnum, json, boolean } from "drizzle-orm/mysql-core";

// 工序类型枚举
export const processStepEnum = mysqlEnum("process_step", [
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
]);

// 工序状态枚举
export const processStatusEnum = mysqlEnum("process_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "BLOCKED"
]);

/**
 * 工序定义表 - 定义T1-T15工序的基本信息
 */
export const processDefinitions = mysqlTable("process_definitions", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 20 }).notNull().unique(), // T1, T2, ... T15
  nameZh: varchar("name_zh", { length: 100 }).notNull(), // 中文名称
  nameEn: varchar("name_en", { length: 100 }).notNull(), // 英文名称
  description: text("description"), // 工序描述
  category: mysqlEnum("category", ["MANUFACTURING", "LOGISTICS", "SITE_DELIVERY"]).notNull(), // 分类：制造/物流/现场交付
  standardDurationHours: decimal("standard_duration_hours", { precision: 10, scale: 2 }), // 标准工时
  requiredCapabilityLevel: mysqlEnum("required_capability_level", ["L1", "L2", "L3", "L4", "L5"]), // 所需能力等级
  sopTemplateId: int("sop_template_id"), // 关联SOP模板
  checklistItems: json("checklist_items"), // 检查清单项
  riskFactors: json("risk_factors"), // 风险因素
  sortOrder: int("sort_order").notNull().default(0), // 排序
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * 项目工序实例表 - 每个项目的工序执行记录
 */
export const projectProcessInstances = mysqlTable("project_process_instances", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(), // 关联项目
  workOrderId: int("work_order_id"), // 关联工单
  processDefinitionId: int("process_definition_id").notNull(), // 关联工序定义
  processCode: varchar("process_code", { length: 20 }).notNull(), // T1-T15
  status: mysqlEnum("status", ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "BLOCKED"]).notNull().default("NOT_STARTED"),
  plannedStartDate: timestamp("planned_start_date"),
  plannedEndDate: timestamp("planned_end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  plannedDurationHours: decimal("planned_duration_hours", { precision: 10, scale: 2 }),
  actualDurationHours: decimal("actual_duration_hours", { precision: 10, scale: 2 }),
  assignedUserId: int("assigned_user_id"), // 负责人
  assignedTeam: varchar("assigned_team", { length: 100 }), // 负责团队
  completionPercentage: int("completion_percentage").notNull().default(0), // 完成百分比
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分
  notes: text("notes"), // 备注
  blockerDescription: text("blocker_description"), // 阻塞原因
  m2Tags: json("m2_tags"), // M2会议关联标签
  aiRecommendations: json("ai_recommendations"), // AI推荐
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * M2关键信息标签表 - AI解析会议纪要生成的结构化标签
 */
export const m2InfoTags = mysqlTable("m2_info_tags", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(), // 关联项目
  meetingId: int("meeting_id"), // 关联会议记录
  tagCategory: mysqlEnum("tag_category", [
    "CUSTOMER_REQUIREMENT", // 客户要求
    "TECHNICAL_SPEC", // 技术规格
    "DELIVERY_CONSTRAINT", // 交付约束
    "RISK_FACTOR", // 风险因素
    "SPECIAL_ATTENTION", // 特别关注
    "RESOURCE_NEED", // 资源需求
    "TIMELINE_CRITICAL" // 时间关键
  ]).notNull(),
  tagName: varchar("tag_name", { length: 200 }).notNull(), // 标签名称
  tagValue: text("tag_value"), // 标签值
  relatedProcessCodes: json("related_process_codes"), // 关联的T工序代码
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull().default("MEDIUM"),
  sourceText: text("source_text"), // 原始文本来源
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // AI置信度
  isVerified: boolean("is_verified").notNull().default(false), // 是否已人工验证
  verifiedBy: int("verified_by"), // 验证人
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * SOP模板表 - 标准操作程序模板
 */
export const sopTemplates = mysqlTable("sop_templates", {
  id: int("id").primaryKey().autoincrement(),
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
  estimatedDurationMinutes: int("estimated_duration_minutes"),
  difficultyLevel: mysqlEnum("difficulty_level", ["BASIC", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * AI SOP推荐记录表 - 记录AI推荐的SOP
 */
export const aiSopRecommendations = mysqlTable("ai_sop_recommendations", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(),
  processInstanceId: int("process_instance_id"),
  sopTemplateId: int("sop_template_id").notNull(),
  recommendationReason: text("recommendation_reason"), // 推荐原因
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 匹配度评分
  contextFactors: json("context_factors"), // 上下文因素
  isAccepted: boolean("is_accepted"), // 是否被采纳
  acceptedBy: int("accepted_by"),
  acceptedAt: timestamp("accepted_at"),
  feedback: text("feedback"), // 用户反馈
  createdAt: timestamp("created_at").defaultNow()
});

/**
 * 工序风险预警表 - 基于历史数据和M2信息的风险提示
 */
export const processRiskAlerts = mysqlTable("process_risk_alerts", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull(),
  processInstanceId: int("process_instance_id"),
  processCode: varchar("process_code", { length: 20 }),
  riskType: mysqlEnum("risk_type", [
    "SCHEDULE_DELAY", // 进度延迟
    "QUALITY_ISSUE", // 质量问题
    "RESOURCE_SHORTAGE", // 资源短缺
    "TECHNICAL_DIFFICULTY", // 技术难度
    "SUPPLIER_RISK", // 供应商风险
    "CUSTOMER_CHANGE", // 客户变更
    "SAFETY_CONCERN" // 安全隐患
  ]).notNull(),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  suggestedActions: json("suggested_actions"), // 建议措施
  historicalReference: json("historical_reference"), // 历史参考案例
  aiAnalysis: text("ai_analysis"), // AI分析
  status: mysqlEnum("status", ["OPEN", "ACKNOWLEDGED", "MITIGATED", "CLOSED"]).notNull().default("OPEN"),
  acknowledgedBy: int("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  mitigationNotes: text("mitigation_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * 工序工时记录表 - 记录每个工序的实际工时
 */
export const processTimeRecords = mysqlTable("process_time_records", {
  id: int("id").primaryKey().autoincrement(),
  processInstanceId: int("process_instance_id").notNull(),
  userId: int("user_id").notNull(), // 工作人员
  workDate: timestamp("work_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: int("duration_minutes").notNull(),
  workType: mysqlEnum("work_type", ["REGULAR", "OVERTIME", "REWORK"]).notNull().default("REGULAR"),
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
export const customerQuestionnaires = mysqlTable("customer_questionnaires", {
  id: int("id").primaryKey().autoincrement(),
  questionnaireNo: varchar("questionnaire_no", { length: 50 }).notNull().unique(), // 问卷编号
  status: mysqlEnum("status", ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "CONVERTED"]).notNull().default("DRAFT"),
  
  // 1. 一般项目信息
  contactPerson: varchar("contact_person", { length: 100 }),
  company: varchar("company", { length: 200 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  quoteType: mysqlEnum("quote_type", ["NEW_PROJECT", "REPLACEMENT", "UPGRADE", "CONSULTATION"]),
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
  cleaningProductType: mysqlEnum("cleaning_product_type", [
    "WATER_BASED", // 水基
    "ACIDIC", // 酸性
    "MODIFIED_ALCOHOL", // 改性醇
    "HYDROCARBON", // 碳氢化合物
    "OTHER"
  ]),
  cleaningProductOther: varchar("cleaning_product_other", { length: 200 }),
  
  // 6. 污染类型
  contaminationTypes: json("contamination_types"), // ["COOLANT", "CHIPS", "BURRS", "OIL", "GREASE", "DUST", "OTHER"]
  contaminationOther: varchar("contamination_other", { length: 200 }),
  
  // 7. 工艺和质量要求
  partTempBefore: decimal("part_temp_before", { precision: 5, scale: 1 }), // 清洗前温度(°C)
  partTempAfter: decimal("part_temp_after", { precision: 5, scale: 1 }), // 清洗后温度(°C)
  qualityControlMethods: json("quality_control_methods"), // ["SPRAY_TEST", "INK_TEST", "ULTRASONIC_TEST", "VISUAL", "OTHER"]
  dryingLevel: mysqlEnum("drying_level", ["LEVEL_0", "LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]), // 干燥等级
  cleanlinessStandard: varchar("cleanliness_standard", { length: 200 }), // 清洁度标准
  
  // 8. 产能要求
  dailyPartQuantity: int("daily_part_quantity"), // 每日零件数量
  cycleTimeSeconds: int("cycle_time_seconds"), // 循环时间(秒)
  annualVolume: int("annual_volume"), // 年产量
  oeeTarget: decimal("oee_target", { precision: 5, scale: 2 }), // OEE目标(%)
  shiftPattern: mysqlEnum("shift_pattern", ["ONE_SHIFT", "TWO_SHIFT", "THREE_SHIFT", "CONTINUOUS"]),
  
  // 9. 上下料方式
  loadingMethod: mysqlEnum("loading_method", [
    "MANUAL", // 手动
    "AUTO_CHAIN", // 自动链条
    "ROBOT", // 机器人
    "GANTRY", // 龙门
    "CONVEYOR", // 输送带
    "OTHER"
  ]),
  loadingMethodOther: varchar("loading_method_other", { length: 200 }),
  
  // 10. 场地要求
  availableSpaceLength: decimal("available_space_length", { precision: 10, scale: 2 }), // 可用长度(mm)
  availableSpaceWidth: decimal("available_space_width", { precision: 10, scale: 2 }), // 可用宽度(mm)
  availableSpaceHeight: decimal("available_space_height", { precision: 10, scale: 2 }), // 可用高度(mm)
  noiseLimit: int("noise_limit"), // 噪音限制(dB)
  
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
  customerId: int("customer_id"), // 关联客户
  opportunityId: int("opportunity_id"), // 关联商机
  assignedSalesId: int("assigned_sales_id"), // 负责销售
  convertedProjectId: int("converted_project_id"), // 转化的项目ID
  
  // AI分析
  aiAnalysis: json("ai_analysis"), // AI分析结果
  aiRecommendedProducts: json("ai_recommended_products"), // AI推荐产品
  aiEstimatedPrice: decimal("ai_estimated_price", { precision: 15, scale: 2 }), // AI估价
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

/**
 * 问卷版本历史表 - 记录问卷修改历史
 */
export const questionnaireVersions = mysqlTable("questionnaire_versions", {
  id: int("id").primaryKey().autoincrement(),
  questionnaireId: int("questionnaire_id").notNull(),
  version: int("version").notNull(),
  changes: json("changes"), // 变更内容
  changedBy: int("changed_by"),
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

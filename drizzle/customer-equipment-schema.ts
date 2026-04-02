/**
 * Customer Equipment Service Database Schema
 *
 * 客户设备全生命周期管理 — 备品备件 · 保养计划 · 维修记录 · 远程支持 · 设备健康
 * 与GRTS 3.0联通，预留GRTS 8.0人型机器人指导接口
 */
import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, json, index, uniqueIndex } from "drizzle-orm/pg-core";

// ══════════════════════════════════════════
// 1. 客户设备台账 — 每台GRT交付设备
// ══════════════════════════════════════════
export const customerEquipment = pgTable("customer_equipment", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),           // → users.id (customer user)
  customerCompany: varchar("customer_company", { length: 200 }),
  equipmentCode: varchar("equipment_code", { length: 50 }).notNull(),  // GRT-USC-2026-001
  equipmentModel: varchar("equipment_model", { length: 100 }).notNull(), // USC-08, KLT-4200, TSL-8000
  equipmentName: varchar("equipment_name", { length: 200 }).notNull(),   // 8工位超声清洗线
  serialNumber: varchar("serial_number", { length: 100 }),
  deliveryDate: timestamp("delivery_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  installLocation: varchar("install_location", { length: 200 }),  // 客户车间位置
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).default("100.00"),
  status: varchar("status", { length: 30 }).default("running"),
  // running | maintenance | fault | offline | decommissioned
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextPmDate: timestamp("next_pm_date"),
  totalRunningHours: decimal("total_running_hours", { precision: 10, scale: 1 }).default("0.0"),
  configJson: json("config_json"),  // 设备配置参数 (清洗参数/超声频率/温度设定等)
  // ── GRTS 8.0 预留 ──
  robotGuidanceEnabled: boolean("robot_guidance_enabled").default(false),
  robotGuidanceConfigJson: json("robot_guidance_config_json"),  // 人型机器人维护指导配置
  remoteAccessEnabled: boolean("remote_access_enabled").default(true),
  cameraStreamUrl: varchar("camera_stream_url", { length: 500 }),  // 远程摄像头URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("ce_code_idx").on(t.equipmentCode),
  index("ce_customer_idx").on(t.customerId),
  index("ce_model_idx").on(t.equipmentModel),
]);

// ══════════════════════════════════════════
// 2. 备品备件库 — 交付时提供 + 客户库存 + 采购建议
// ══════════════════════════════════════════
export const customerSpareParts = pgTable("customer_spare_parts", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  partCode: varchar("part_code", { length: 50 }).notNull(),    // GRT-SP-FILTER-001
  partName: varchar("part_name", { length: 200 }).notNull(),    // 精密过滤芯 5μm
  partNameEn: varchar("part_name_en", { length: 200 }),
  category: varchar("category", { length: 50 }).notNull(),
  // filter | seal | nozzle | pump | sensor | valve | bearing | belt | heater | ultrasonic | electrical | other
  specification: varchar("specification", { length: 200 }),     // 规格型号
  deliveredQty: integer("delivered_qty").default(0),            // 交付时提供数量
  currentStock: integer("current_stock").default(0),           // 客户当前库存
  minStockLevel: integer("min_stock_level").default(2),         // 最低安全库存
  recommendedPurchaseQty: integer("recommended_purchase_qty"), // 建议采购数量
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  leadTimeDays: integer("lead_time_days").default(14),         // 采购交期(天)
  lifeExpectancyHours: integer("life_expectancy_hours"),       // 预计使用寿命(小时)
  lastReplacedDate: timestamp("last_replaced_date"),
  nextReplaceDate: timestamp("next_replace_date"),             // 预计更换日期
  supplierInfo: varchar("supplier_info", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("csp_equipment_idx").on(t.equipmentId),
  index("csp_category_idx").on(t.category),
  index("csp_stock_alert_idx").on(t.currentStock, t.minStockLevel),
]);

// ══════════════════════════════════════════
// 3. PM保养计划 — 预防性维护
// ══════════════════════════════════════════
export const customerPmPlans = pgTable("customer_pm_plans", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  planCode: varchar("plan_code", { length: 50 }).notNull(),    // PM-USC08-Q1-2026
  planName: varchar("plan_name", { length: 200 }).notNull(),
  planType: varchar("plan_type", { length: 30 }).notNull(),
  // daily | weekly | monthly | quarterly | semi_annual | annual | hour_based
  intervalHours: integer("interval_hours"),                    // 按运行小时触发
  intervalDays: integer("interval_days"),                      // 按日历天触发
  checklistJson: json("checklist_json"),
  // [{item, category, method, standard, tools, estimatedMinutes, spareParts}]
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  status: varchar("status", { length: 30 }).default("scheduled"),
  // scheduled | overdue | in_progress | completed | skipped
  assignee: varchar("assignee", { length: 100 }),              // 客户端执行人
  grtSupportRequired: boolean("grt_support_required").default(false),
  grtSupportContact: varchar("grt_support_contact", { length: 100 }),
  completionNotes: text("completion_notes"),
  photosJson: json("photos_json"),  // [{url, caption, timestamp}]
  // ── GRTS 8.0 预留 ──
  robotAssistAvailable: boolean("robot_assist_available").default(false),
  robotInstructionSetId: varchar("robot_instruction_set_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("cpm_equipment_idx").on(t.equipmentId),
  index("cpm_status_idx").on(t.status),
  index("cpm_scheduled_idx").on(t.scheduledDate),
]);

// ══════════════════════════════════════════
// 4. 维修记录 — 实际维修过程
// ══════════════════════════════════════════
export const customerRepairRecords = pgTable("customer_repair_records", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  repairCode: varchar("repair_code", { length: 50 }).notNull(),  // REP-2026-0001
  faultDescription: text("fault_description").notNull(),          // 问题描述
  faultCategory: varchar("fault_category", { length: 50 }),
  // mechanical | electrical | plumbing | software | ultrasonic | sensor | safety | other
  severity: varchar("severity", { length: 20 }).default("medium"),
  // critical | high | medium | low
  reportedBy: varchar("reported_by", { length: 100 }),            // 客户报告人
  reportedAt: timestamp("reported_at").notNull(),
  // ── 执行过程 ──
  executor: varchar("executor", { length: 100 }),                 // 实际执行人
  executorType: varchar("executor_type", { length: 20 }),
  // customer_staff | grt_onsite | grt_remote
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  downtimeHours: decimal("downtime_hours", { precision: 8, scale: 1 }),
  repairStepsJson: json("repair_steps_json"),
  // [{step, description, duration, result, photos}]
  rootCause: text("root_cause"),
  solution: text("solution"),
  preventiveMeasure: text("preventive_measure"),
  // ── 备品备件使用 ──
  partsUsedJson: json("parts_used_json"),
  // [{partId, partCode, partName, qty, fromStock}]
  // ── GRT远程支持 ──
  grtRemoteSupportUsed: boolean("grt_remote_support_used").default(false),
  grtSupportEngineer: varchar("grt_support_engineer", { length: 100 }),  // GRT维修主管
  grtSupportNotes: text("grt_support_notes"),
  cameraSessionUsed: boolean("camera_session_used").default(false),     // 是否使用摄像头远程指导
  // ── 注意事项 ──
  safetyWarningsJson: json("safety_warnings_json"),  // [{warning, severity}]
  lessonsLearned: text("lessons_learned"),
  status: varchar("status", { length: 30 }).default("reported"),
  // reported | diagnosed | in_repair | pending_parts | completed | verified
  // ── GRTS 8.0 预留 ──
  robotAssistedRepair: boolean("robot_assisted_repair").default(false),
  robotRepairLogJson: json("robot_repair_log_json"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("crr_equipment_idx").on(t.equipmentId),
  index("crr_status_idx").on(t.status),
  index("crr_reported_idx").on(t.reportedAt),
]);

// ══════════════════════════════════════════
// 5. 远程支持会话 — GRT远程诊断+摄像头
// ══════════════════════════════════════════
export const customerRemoteSessions = pgTable("customer_remote_sessions", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  sessionCode: varchar("session_code", { length: 50 }).notNull(),
  sessionType: varchar("session_type", { length: 30 }).notNull(),
  // video_call | camera_guided | remote_diagnostics | screen_share
  requestedBy: varchar("requested_by", { length: 100 }),
  grtEngineer: varchar("grt_engineer", { length: 100 }),
  grtEngineerRole: varchar("grt_engineer_role", { length: 100 }),  // 售后维修主管
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  issueDescription: text("issue_description"),
  resolutionSummary: text("resolution_summary"),
  cameraUsed: boolean("camera_used").default(false),
  recordingUrl: varchar("recording_url", { length: 500 }),
  status: varchar("status", { length: 30 }).default("requested"),
  // requested | scheduled | in_progress | completed | cancelled
  satisfactionRating: integer("satisfaction_rating"),  // 1-5
  // ── GRTS 8.0 预留 ──
  robotGuidanceUsed: boolean("robot_guidance_used").default(false),
  robotGuidanceLogJson: json("robot_guidance_log_json"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("crs_equipment_idx").on(t.equipmentId),
  index("crs_status_idx").on(t.status),
]);

// ══════════════════════════════════════════
// 6. 设备健康日志 — 自动/手动评分记录
// ══════════════════════════════════════════
export const customerEquipmentHealthLog = pgTable("customer_equipment_health_log", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).notNull(),
  source: varchar("source", { length: 30 }).notNull(),
  // auto_sensor | pm_inspection | repair_post | manual | ai_prediction
  dimensionScoresJson: json("dimension_scores_json"),
  // [{dimension, score}] — 16维度得分
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 100 }),
}, (t) => [
  index("cehl_equipment_idx").on(t.equipmentId, t.recordedAt),
]);

// ══════════════════════════════════════════
// 7. 服务共享设置 — 默认共享人员 / 自动通知
// ══════════════════════════════════════════
export const serviceShareSettings = pgTable("service_share_settings", {
  id: serial("id").primaryKey(),
  /** 关联客户 (null = 全局默认) */
  customerId: integer("customer_id"),
  /** 关联设备 (null = 客户级别) */
  equipmentId: integer("equipment_id"),
  /** 被共享人员 employeeId */
  sharedWithUserId: integer("shared_with_user_id").notNull(),
  sharedWithName: varchar("shared_with_name", { length: 100 }),
  sharedWithRole: varchar("shared_with_role", { length: 50 }),
  /** 共享类型: default_cc=默认抄送, auto_notify=自动通知, report_recipient=汇报接收 */
  shareType: varchar("share_type", { length: 30 }).notNull().default("default_cc"),
  /** 通知渠道: email | wechat | system | all */
  notifyChannel: varchar("notify_channel", { length: 20 }).default("system"),
  /** 通知事件类型: repair=维修, pm=保养, fault=故障, all=全部 */
  notifyEvents: varchar("notify_events", { length: 100 }).default("all"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("sss_customer_idx").on(t.customerId),
  index("sss_shared_user_idx").on(t.sharedWithUserId),
]);

// ══════════════════════════════════════════
// 8. 自动汇报配置 — 按客户/服务类型分组汇报
// ══════════════════════════════════════════
export const serviceAutoReports = pgTable("service_auto_reports", {
  id: serial("id").primaryKey(),
  /** 汇报名称 */
  reportName: varchar("report_name", { length: 200 }).notNull(),
  /** 分组维度: by_customer=按客户, by_service_type=按服务类型, by_equipment_model=按设备型号, by_region=按区域 */
  groupBy: varchar("group_by", { length: 30 }).notNull().default("by_customer"),
  /** 汇报频率: daily | weekly | monthly | on_completion */
  frequency: varchar("frequency", { length: 20 }).notNull().default("weekly"),
  /** 汇报内容模板: summary=摘要, detailed=详细, kpi=仅KPI */
  templateType: varchar("template_type", { length: 20 }).default("summary"),
  /** 接收人列表 JSON: [{userId, name, role, channel}] */
  recipientsJson: json("recipients_json"),
  /** 筛选条件 JSON: {customerIds[], serviceTypes[], dateRange} */
  filterCriteria: json("filter_criteria"),
  /** 最近一次发送时间 */
  lastSentAt: timestamp("last_sent_at"),
  /** 下次计划发送时间 */
  nextScheduledAt: timestamp("next_scheduled_at"),
  /** 是否启用 */
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("sar_group_idx").on(t.groupBy),
  index("sar_frequency_idx").on(t.frequency),
]);

// ══════════════════════════════════════════
// 9. 服务计划执行记录 — 工程师填写完成计划
// ══════════════════════════════════════════
export const servicePlanExecutions = pgTable("service_plan_executions", {
  id: serial("id").primaryKey(),
  /** 关联PM计划 */
  pmPlanId: integer("pm_plan_id"),
  /** 关联设备 */
  equipmentId: integer("equipment_id").notNull(),
  /** 执行工程师 */
  engineerId: integer("engineer_id").notNull(),
  engineerName: varchar("engineer_name", { length: 100 }),
  /** 服务类型: pm=保养, repair=维修, inspection=巡检, installation=安装, training=培训 */
  serviceType: varchar("service_type", { length: 30 }).notNull(),
  /** 计划日期 */
  plannedDate: timestamp("planned_date"),
  /** 实际开始/结束 */
  actualStartAt: timestamp("actual_start_at"),
  actualEndAt: timestamp("actual_end_at"),
  /** 执行状态: planned | in_progress | completed | cancelled | rescheduled */
  status: varchar("status", { length: 20 }).default("planned"),
  /** 完成报告 */
  completionNotes: text("completion_notes"),
  /** 检查项完成情况 JSON: [{item, checked, notes, photos}] */
  checklistResultJson: json("checklist_result_json"),
  /** 发现的问题 */
  issuesFound: text("issues_found"),
  /** 下次服务建议 */
  nextServiceRecommendation: text("next_service_recommendation"),
  /** 下次建议日期 */
  nextRecommendedDate: timestamp("next_recommended_date"),
  /** 使用的备件 JSON: [{partId, partCode, partName, qty}] */
  partsUsedJson: json("parts_used_json"),
  /** 现场照片 JSON: [{url, caption, timestamp}] */
  photosJson: json("photos_json"),
  /** 客户签字确认 */
  customerSignedBy: varchar("customer_signed_by", { length: 100 }),
  customerSignedAt: timestamp("customer_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("spe_equipment_idx").on(t.equipmentId),
  index("spe_engineer_idx").on(t.engineerId),
  index("spe_status_idx").on(t.status),
]);

// Type exports
export type CustomerEquipment = typeof customerEquipment.$inferSelect;
export type CustomerSparePart = typeof customerSpareParts.$inferSelect;
export type CustomerPmPlan = typeof customerPmPlans.$inferSelect;
export type CustomerRepairRecord = typeof customerRepairRecords.$inferSelect;
export type CustomerRemoteSession = typeof customerRemoteSessions.$inferSelect;
export type ServiceShareSetting = typeof serviceShareSettings.$inferSelect;
export type ServiceAutoReport = typeof serviceAutoReports.$inferSelect;
export type ServicePlanExecution = typeof servicePlanExecutions.$inferSelect;

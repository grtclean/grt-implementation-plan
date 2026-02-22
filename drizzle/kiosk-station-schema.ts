import { pgTable, serial, varchar, timestamp, boolean, jsonb, integer, text, index, unique, decimal, pgEnum } from "drizzle-orm/pg-core";

// ==========================================
// Enums — IATF 16949 / VDA standard values
// ==========================================

export const defectSeverityEnum = pgEnum("defect_severity", ["critical", "major", "minor"]);
export const inspectionResultEnum = pgEnum("inspection_result", ["PASS", "FAIL", "DEVIATION", "REWORK", "SCRAP"]);
export const certLevelEnum = pgEnum("cert_level", ["trainee", "qualified", "trainer"]);

// ==========================================
// 1. 工位与设备表 (Stations / T1-T15) - 对应"机"与"法"
// ==========================================
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),             // 例如: "T1", "T3"
  name: varchar("name", { length: 100 }).notNull(),                     // 例如: "超声波粗洗", "CCD视觉全检"
  description: text("description"),                                      // 工位描述
  processType: varchar("process_type", { length: 50 }),                  // "washing", "inspection", "assembly", "drying"
  sortOrder: integer("sort_order").default(0).notNull(),                 // 生产顺序 (T1=1, T2=2, ...)
  isQualityCheckpoint: boolean("is_quality_checkpoint").default(false),  // 是否为强制质量检验点
  sopUrl: varchar("sop_url", { length: 255 }),                           // 关联当前工位的标准作业指导书(法)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("stations_code_idx").on(table.code),
  index("stations_sort_order_idx").on(table.sortOrder),
]);

// ==========================================
// 2. 标准缺陷代码库 (Defect Codes) - 对应 VDA 标准化
// ==========================================
export const defectCodes = pgTable("defect_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),             // 例如: "E-001"
  description: varchar("description", { length: 255 }).notNull(),       // 例如: "表面残留水渍", "颗粒度超标"
  category: varchar("category", { length: 50 }),                         // "surface", "dimensional", "contamination", "functional"
  severity: defectSeverityEnum("severity").notNull(),                    // VDA标准: critical / major / minor
  applicableStations: jsonb("applicable_stations"),                      // 适用工位列表, e.g. ["T3","T5","T10"]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("defect_codes_code_idx").on(table.code),
  index("defect_codes_severity_idx").on(table.severity),
]);

// ==========================================
// 3. 生产流转与质量检验记录表 (Execution Logs) - 核心追溯表！
//    追溯维度: 人(Man) 机(Machine) 料(Material) 法(Method) 环(Environment)
// ==========================================
export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),

  // 【料 Material】
  projectNumber: varchar("project_number", { length: 100 }).notNull(),  // 项目号 / 工单号
  batchId: varchar("batch_id", { length: 100 }),                         // 批次号 (IATF 16949 lot traceability)
  materialBarcode: varchar("material_barcode", { length: 100 }).notNull(), // 零部件唯一追溯码(扫码枪录入)

  // 【人 Man】
  operatorId: varchar("operator_id", { length: 50 }).notNull(),          // 当前刷卡的员工工号

  // 【机 Machine】
  stationId: integer("station_id").references(() => stations.id).notNull(), // 关联工位 (T1-T15)
  equipmentParams: jsonb("equipment_params"),                             // 加工瞬间设备参数: { "temp_celsius": 65, "pressure_bar": 1.2 }

  // 【质量结果判定】
  aiCcdResult: varchar("ai_ccd_result", { length: 20 }),                 // AI/CCD 初始判定: "PASS", "FAIL", null
  humanFinalResult: inspectionResultEnum("human_final_result").notNull(), // 人工最终判定: PASS, FAIL, DEVIATION, REWORK, SCRAP
  cycleTimeSeconds: integer("cycle_time_seconds"),                        // 本站加工/检验耗时(秒) — OEE计算关键

  // 【异常追踪】
  defectCodeId: integer("defect_code_id").references(() => defectCodes.id), // 如果Fail,必须关联缺陷代码
  remarks: text("remarks"),                                               // 检验员手工备注（返工建议等）

  // 【环 Environment & 时间戳】
  envData: jsonb("env_data"),                                             // 车间温湿度: { "room_temp": 24, "humidity": 45 }
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("exec_logs_project_station_idx").on(table.projectNumber, table.stationId, table.createdAt),
  index("exec_logs_barcode_idx").on(table.materialBarcode),
  index("exec_logs_batch_idx").on(table.batchId),
  index("exec_logs_operator_idx").on(table.operatorId),
  index("exec_logs_result_idx").on(table.humanFinalResult),
]);

// ==========================================
// 4. 员工资质矩阵表 (Operator Certifications) - IATF 16949 审核加分项！
// ==========================================
export const operatorCertifications = pgTable("operator_certifications", {
  id: serial("id").primaryKey(),
  operatorId: varchar("operator_id", { length: 50 }).notNull(),          // 员工工号
  stationId: integer("station_id").references(() => stations.id).notNull(), // 授权操作的工位
  certLevel: certLevelEnum("cert_level").default("qualified").notNull(),  // 资质级别: trainee / qualified / trainer
  certifiedAt: timestamp("certified_at", { mode: "string" }).defaultNow().notNull(), // 认证日期
  certifiedBy: varchar("certified_by", { length: 50 }),                   // 认证审批人工号
  validUntil: timestamp("valid_until", { mode: "string" }).notNull(),    // 资质有效期
  isActive: boolean("is_active").default(true),                           // 是否有效（可在到期前撤销）
}, (table) => [
  unique("operator_station_unique").on(table.operatorId, table.stationId),
  index("op_cert_operator_idx").on(table.operatorId),
  index("op_cert_valid_until_idx").on(table.validUntil),
]);

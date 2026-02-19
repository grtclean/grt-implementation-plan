import { pgTable, serial, varchar, timestamp, boolean, jsonb, integer, text } from "drizzle-orm/pg-core";

// ==========================================
// 1. 工位与设备表 (Stations / T1-T15) - 对应"机"与"法"
// ==========================================
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 例如: "T1", "T3"
  name: varchar("name", { length: 100 }).notNull(), // 例如: "超声波粗洗", "CCD视觉全检"
  isQualityCheckpoint: boolean("is_quality_checkpoint").default(false), // 是否为强制质量检验点
  sopUrl: varchar("sop_url", { length: 255 }), // 关联当前工位的标准作业指导书(法)
  isActive: boolean("is_active").default(true),
});

// ==========================================
// 2. 标准缺陷代码库 (Defect Codes) - 对应 VDA 标准化
// ==========================================
export const defectCodes = pgTable("defect_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 例如: "E-001"
  description: varchar("description", { length: 255 }).notNull(), // 例如: "表面残留水渍", "颗粒度超标"
  severity: varchar("severity", { length: 20 }).notNull(), // 严重程度: "Critical" (致命), "Major" (严重), "Minor" (轻微)
});

// ==========================================
// 3. 生产流转与质量检验记录表 (Execution Logs) - 核心追溯表！
// ==========================================
export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),
  // 【料 Material】
  projectNumber: varchar("project_number", { length: 100 }).notNull(), // 项目号 / 工单号
  materialBarcode: varchar("material_barcode", { length: 100 }), // 零部件唯一追溯码(扫码枪录入)
  // 【人 Man】
  operatorId: varchar("operator_id", { length: 50 }).notNull(), // 当前刷卡的员工工号
  // 【机 Machine】
  stationId: integer("station_id").references(() => stations.id).notNull(), // 关联工位 (T1-T15)
  equipmentParams: jsonb("equipment_params"), // 【关键】记录加工瞬间的设备参数，如 { "temp_celsius": 65, "pressure_bar": 1.2 }
  // 【质量结果判定】
  aiCcdResult: varchar("ai_ccd_result", { length: 20 }), // AI/CCD 初始判定: "PASS", "FAIL", null
  humanFinalResult: varchar("human_final_result", { length: 20 }).notNull(), // 人工最终判定: "PASS", "FAIL", "DEVIATION"(偏差放行)
  // 【异常追踪】
  defectCodeId: integer("defect_code_id").references(() => defectCodes.id), // 如果 Fail，必须关联缺陷代码
  remarks: text("remarks"), // 检验员手工备注（比如返工建议）
  // 【环 Environment & 时间戳】
  createdAt: timestamp("created_at").defaultNow().notNull(), // 精确到秒的操作时间
  // envData: jsonb("env_data"), // 可选：记录车间当时的温湿度 { "room_temp": 24, "humidity": 45 }
});

// ==========================================
// 4. 员工资质矩阵表 (Operator Certifications) - IATF 16949 审核加分项！
// ==========================================
export const operatorCertifications = pgTable("operator_certifications", {
  id: serial("id").primaryKey(),
  operatorId: varchar("operator_id", { length: 50 }).notNull(), // 员工工号
  stationId: integer("station_id").references(() => stations.id).notNull(), // 授权操作的工位
  validUntil: timestamp("valid_until").notNull(), // 资质有效期
});

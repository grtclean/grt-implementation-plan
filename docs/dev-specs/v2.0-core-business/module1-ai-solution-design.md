# 模块1：AI方案设计系统

**模块代码**: AI-SOLUTION  
**优先级**: P0  
**预计工时**: 20-25小时  
**依赖模块**: 无  
**实施方**: Claude Code

---

## 1. 业务背景

### 1.1 业务场景

作为工业清洗设备供应商，GRT在为客户定制清洗方案时需要：

1. **参照历史案例** - 查找类似产品/零件的历史清洗方案
2. **AI智能建议** - 根据客户提供的产品信息、清洁度要求、节拍要求等，AI推荐最优方案
3. **方案整理学习** - 系统化管理历史案例，便于团队学习参考
4. **快速报价** - 基于方案配置快速生成报价

### 1.2 核心输入参数

| 参数类型 | 参数名称 | 说明 | 示例 |
|----------|----------|------|------|
| 产品信息 | 产品名称 | 客户产品名称 | 发动机缸体 |
| 产品信息 | 零件类型 | 零件分类 | 铸铁件、铝合金件 |
| 产品信息 | 零件尺寸 | 长×宽×高 | 500×300×200mm |
| 产品信息 | 零件重量 | 单件重量 | 25kg |
| 清洁度要求 | 颗粒度等级 | ISO 16232标准 | ≤500μm |
| 清洁度要求 | 残留物重量 | 单件残留物 | ≤15mg |
| 清洁度要求 | 清洁度等级 | 清洁度标准 | CCC级 |
| 生产要求 | 节拍时间 | 单件清洗时间 | 60秒/件 |
| 生产要求 | 日产量 | 每日产量要求 | 500件/天 |
| 设备要求 | 上下料形式 | 自动/手动 | 机器人上下料 |
| 设备要求 | 干燥方式 | 干燥类型 | 真空干燥 |
| 设备要求 | 特殊要求 | 其他要求 | 防锈处理 |

### 1.3 核心输出

| 输出类型 | 内容 | 说明 |
|----------|------|------|
| 推荐方案 | 设备类型 | 推荐的清洗设备型号 |
| 推荐方案 | 工艺流程 | 清洗工艺步骤 |
| 推荐方案 | 清洗介质 | 推荐的清洗液类型 |
| 推荐方案 | 设备配置 | 设备选型和配置 |
| 参考案例 | 相似案例列表 | 历史相似案例 |
| 参考案例 | 案例对比 | 与当前需求的对比 |
| 报价估算 | 设备报价 | 初步报价估算 |

---

## 2. 数据库Schema设计

### 2.1 历史案例表 (solution_cases)

```sql
-- 历史案例表 - 存储所有历史清洗方案案例
CREATE TABLE solution_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 案例基本信息
    case_code VARCHAR(32) UNIQUE NOT NULL COMMENT '案例编号，如：CASE-2024-001',
    case_name VARCHAR(200) NOT NULL COMMENT '案例名称',
    customer_id INT COMMENT '关联客户ID',
    customer_name VARCHAR(200) COMMENT '客户名称（冗余存储）',
    project_id INT COMMENT '关联项目ID',
    
    -- 产品信息
    product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
    part_type VARCHAR(100) COMMENT '零件类型：casting(铸件)/forging(锻件)/machined(机加工件)/sheet_metal(钣金件)',
    part_material VARCHAR(100) COMMENT '零件材质：cast_iron(铸铁)/aluminum(铝合金)/steel(钢)/copper(铜)',
    part_length DECIMAL(10,2) COMMENT '零件长度(mm)',
    part_width DECIMAL(10,2) COMMENT '零件宽度(mm)',
    part_height DECIMAL(10,2) COMMENT '零件高度(mm)',
    part_weight DECIMAL(10,2) COMMENT '零件重量(kg)',
    part_features TEXT COMMENT '零件特征描述（孔、槽、盲孔等）',
    
    -- 清洁度要求
    cleanliness_particle_size INT COMMENT '颗粒度要求(μm)',
    cleanliness_residue_weight DECIMAL(10,2) COMMENT '残留物重量要求(mg)',
    cleanliness_grade VARCHAR(20) COMMENT '清洁度等级：CCC/CC/C/B/A',
    cleanliness_standard VARCHAR(100) COMMENT '清洁度标准：ISO_16232/VDA_19',
    
    -- 生产要求
    cycle_time INT COMMENT '节拍时间(秒)',
    daily_output INT COMMENT '日产量(件)',
    annual_output INT COMMENT '年产量(件)',
    working_hours INT DEFAULT 8 COMMENT '日工作时长(小时)',
    
    -- 设备配置
    equipment_type VARCHAR(100) COMMENT '设备类型：spray(喷淋)/immersion(浸泡)/ultrasonic(超声波)/high_pressure(高压)',
    equipment_model VARCHAR(100) COMMENT '设备型号',
    loading_type VARCHAR(50) COMMENT '上下料方式：manual(手动)/robot(机器人)/conveyor(输送线)',
    drying_type VARCHAR(50) COMMENT '干燥方式：hot_air(热风)/vacuum(真空)/infrared(红外)',
    
    -- 工艺流程
    process_steps JSON COMMENT '工艺步骤JSON数组',
    cleaning_medium VARCHAR(100) COMMENT '清洗介质',
    cleaning_temperature INT COMMENT '清洗温度(℃)',
    cleaning_pressure DECIMAL(10,2) COMMENT '清洗压力(bar)',
    
    -- 方案结果
    solution_summary TEXT COMMENT '方案摘要',
    solution_highlights TEXT COMMENT '方案亮点',
    equipment_config JSON COMMENT '设备配置详情JSON',
    
    -- 报价信息
    quoted_price DECIMAL(15,2) COMMENT '报价金额(元)',
    final_price DECIMAL(15,2) COMMENT '成交金额(元)',
    
    -- 案例状态
    status ENUM('draft', 'active', 'archived') DEFAULT 'active' COMMENT '案例状态',
    is_reference BOOLEAN DEFAULT TRUE COMMENT '是否作为参考案例',
    success_rating INT COMMENT '成功评分(1-5)',
    
    -- 附件
    attachments JSON COMMENT '附件列表JSON',
    
    -- 元数据
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_part_type (part_type),
    INDEX idx_part_material (part_material),
    INDEX idx_equipment_type (equipment_type),
    INDEX idx_cleanliness_grade (cleanliness_grade),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='历史案例表';
```

### 2.2 方案设计请求表 (solution_requests)

```sql
-- 方案设计请求表 - 存储客户方案设计请求
CREATE TABLE solution_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 请求基本信息
    request_code VARCHAR(32) UNIQUE NOT NULL COMMENT '请求编号',
    request_name VARCHAR(200) NOT NULL COMMENT '请求名称',
    customer_id INT COMMENT '关联客户ID',
    customer_name VARCHAR(200) COMMENT '客户名称',
    contact_name VARCHAR(100) COMMENT '联系人',
    contact_phone VARCHAR(50) COMMENT '联系电话',
    
    -- 产品信息（与案例表结构一致）
    product_name VARCHAR(200) NOT NULL,
    part_type VARCHAR(100),
    part_material VARCHAR(100),
    part_length DECIMAL(10,2),
    part_width DECIMAL(10,2),
    part_height DECIMAL(10,2),
    part_weight DECIMAL(10,2),
    part_features TEXT,
    
    -- 清洁度要求
    cleanliness_particle_size INT,
    cleanliness_residue_weight DECIMAL(10,2),
    cleanliness_grade VARCHAR(20),
    cleanliness_standard VARCHAR(100),
    
    -- 生产要求
    cycle_time INT,
    daily_output INT,
    annual_output INT,
    
    -- 设备要求
    loading_type_preference VARCHAR(50) COMMENT '上下料偏好',
    drying_type_preference VARCHAR(50) COMMENT '干燥方式偏好',
    special_requirements TEXT COMMENT '特殊要求',
    budget_range VARCHAR(100) COMMENT '预算范围',
    
    -- AI推荐结果
    ai_recommendation JSON COMMENT 'AI推荐结果JSON',
    ai_confidence DECIMAL(5,2) COMMENT 'AI置信度(0-100)',
    ai_generated_at TIMESTAMP COMMENT 'AI生成时间',
    
    -- 匹配的案例
    matched_cases JSON COMMENT '匹配的历史案例ID列表',
    
    -- 状态
    status ENUM('pending', 'processing', 'completed', 'converted', 'cancelled') DEFAULT 'pending',
    assigned_to INT COMMENT '分配给的销售/工程师ID',
    
    -- 转化信息
    converted_to_project_id INT COMMENT '转化为项目的ID',
    converted_at TIMESTAMP COMMENT '转化时间',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_customer (customer_id),
    INDEX idx_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='方案设计请求表';
```

### 2.3 AI推荐日志表 (ai_recommendation_logs)

```sql
-- AI推荐日志表 - 记录所有AI推荐的详细信息
CREATE TABLE ai_recommendation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL COMMENT '关联请求ID',
    
    -- 输入参数
    input_params JSON NOT NULL COMMENT '输入参数JSON',
    
    -- 匹配结果
    matched_cases JSON COMMENT '匹配的案例及相似度',
    
    -- AI输出
    ai_model VARCHAR(100) COMMENT '使用的AI模型',
    ai_prompt TEXT COMMENT 'AI提示词',
    ai_response TEXT COMMENT 'AI原始响应',
    ai_parsed_result JSON COMMENT 'AI解析后的结果',
    
    -- 推荐内容
    recommended_equipment_type VARCHAR(100),
    recommended_equipment_model VARCHAR(100),
    recommended_process_steps JSON,
    recommended_config JSON,
    estimated_price DECIMAL(15,2),
    
    -- 性能指标
    response_time_ms INT COMMENT '响应时间(毫秒)',
    token_usage INT COMMENT 'Token使用量',
    
    -- 用户反馈
    user_feedback ENUM('accepted', 'modified', 'rejected'),
    feedback_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_request (request_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI推荐日志表';
```

### 2.4 Drizzle Schema定义

```typescript
// drizzle/schema/solution.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

/**
 * 历史案例表
 */
export const solutionCases = mysqlTable("solution_cases", {
  id: int("id").autoincrement().primaryKey(),
  caseCode: varchar("case_code", { length: 32 }).unique().notNull(),
  caseName: varchar("case_name", { length: 200 }).notNull(),
  customerId: int("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  projectId: int("project_id"),
  
  // 产品信息
  productName: varchar("product_name", { length: 200 }).notNull(),
  partType: varchar("part_type", { length: 100 }),
  partMaterial: varchar("part_material", { length: 100 }),
  partLength: decimal("part_length", { precision: 10, scale: 2 }),
  partWidth: decimal("part_width", { precision: 10, scale: 2 }),
  partHeight: decimal("part_height", { precision: 10, scale: 2 }),
  partWeight: decimal("part_weight", { precision: 10, scale: 2 }),
  partFeatures: text("part_features"),
  
  // 清洁度要求
  cleanlinessParticleSize: int("cleanliness_particle_size"),
  cleanlinessResidueWeight: decimal("cleanliness_residue_weight", { precision: 10, scale: 2 }),
  cleanlinessGrade: varchar("cleanliness_grade", { length: 20 }),
  cleanlinessStandard: varchar("cleanliness_standard", { length: 100 }),
  
  // 生产要求
  cycleTime: int("cycle_time"),
  dailyOutput: int("daily_output"),
  annualOutput: int("annual_output"),
  workingHours: int("working_hours").default(8),
  
  // 设备配置
  equipmentType: varchar("equipment_type", { length: 100 }),
  equipmentModel: varchar("equipment_model", { length: 100 }),
  loadingType: varchar("loading_type", { length: 50 }),
  dryingType: varchar("drying_type", { length: 50 }),
  
  // 工艺流程
  processSteps: json("process_steps"),
  cleaningMedium: varchar("cleaning_medium", { length: 100 }),
  cleaningTemperature: int("cleaning_temperature"),
  cleaningPressure: decimal("cleaning_pressure", { precision: 10, scale: 2 }),
  
  // 方案结果
  solutionSummary: text("solution_summary"),
  solutionHighlights: text("solution_highlights"),
  equipmentConfig: json("equipment_config"),
  
  // 报价信息
  quotedPrice: decimal("quoted_price", { precision: 15, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 15, scale: 2 }),
  
  // 案例状态
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("active"),
  isReference: boolean("is_reference").default(true),
  successRating: int("success_rating"),
  
  // 附件
  attachments: json("attachments"),
  
  // 元数据
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SolutionCase = typeof solutionCases.$inferSelect;
export type InsertSolutionCase = typeof solutionCases.$inferInsert;

/**
 * 方案设计请求表
 */
export const solutionRequests = mysqlTable("solution_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestCode: varchar("request_code", { length: 32 }).unique().notNull(),
  requestName: varchar("request_name", { length: 200 }).notNull(),
  customerId: int("customer_id"),
  customerName: varchar("customer_name", { length: 200 }),
  contactName: varchar("contact_name", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  
  // 产品信息
  productName: varchar("product_name", { length: 200 }).notNull(),
  partType: varchar("part_type", { length: 100 }),
  partMaterial: varchar("part_material", { length: 100 }),
  partLength: decimal("part_length", { precision: 10, scale: 2 }),
  partWidth: decimal("part_width", { precision: 10, scale: 2 }),
  partHeight: decimal("part_height", { precision: 10, scale: 2 }),
  partWeight: decimal("part_weight", { precision: 10, scale: 2 }),
  partFeatures: text("part_features"),
  
  // 清洁度要求
  cleanlinessParticleSize: int("cleanliness_particle_size"),
  cleanlinessResidueWeight: decimal("cleanliness_residue_weight", { precision: 10, scale: 2 }),
  cleanlinessGrade: varchar("cleanliness_grade", { length: 20 }),
  cleanlinessStandard: varchar("cleanliness_standard", { length: 100 }),
  
  // 生产要求
  cycleTime: int("cycle_time"),
  dailyOutput: int("daily_output"),
  annualOutput: int("annual_output"),
  
  // 设备要求
  loadingTypePreference: varchar("loading_type_preference", { length: 50 }),
  dryingTypePreference: varchar("drying_type_preference", { length: 50 }),
  specialRequirements: text("special_requirements"),
  budgetRange: varchar("budget_range", { length: 100 }),
  
  // AI推荐结果
  aiRecommendation: json("ai_recommendation"),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  aiGeneratedAt: timestamp("ai_generated_at"),
  
  // 匹配的案例
  matchedCases: json("matched_cases"),
  
  // 状态
  status: mysqlEnum("status", ["pending", "processing", "completed", "converted", "cancelled"]).default("pending"),
  assignedTo: int("assigned_to"),
  
  // 转化信息
  convertedToProjectId: int("converted_to_project_id"),
  convertedAt: timestamp("converted_at"),
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SolutionRequest = typeof solutionRequests.$inferSelect;
export type InsertSolutionRequest = typeof solutionRequests.$inferInsert;

/**
 * AI推荐日志表
 */
export const aiRecommendationLogs = mysqlTable("ai_recommendation_logs", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  
  inputParams: json("input_params").notNull(),
  matchedCases: json("matched_cases"),
  
  aiModel: varchar("ai_model", { length: 100 }),
  aiPrompt: text("ai_prompt"),
  aiResponse: text("ai_response"),
  aiParsedResult: json("ai_parsed_result"),
  
  recommendedEquipmentType: varchar("recommended_equipment_type", { length: 100 }),
  recommendedEquipmentModel: varchar("recommended_equipment_model", { length: 100 }),
  recommendedProcessSteps: json("recommended_process_steps"),
  recommendedConfig: json("recommended_config"),
  estimatedPrice: decimal("estimated_price", { precision: 15, scale: 2 }),
  
  responseTimeMs: int("response_time_ms"),
  tokenUsage: int("token_usage"),
  
  userFeedback: mysqlEnum("user_feedback", ["accepted", "modified", "rejected"]),
  feedbackReason: text("feedback_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiRecommendationLog = typeof aiRecommendationLogs.$inferSelect;
export type InsertAiRecommendationLog = typeof aiRecommendationLogs.$inferInsert;
```

---

## 3. API路由设计

### 3.1 历史案例管理API

```typescript
// server/routers/solution.ts

export const solutionRouter = router({
  cases: router({
    // 获取案例列表（分页+筛选）
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        partType: z.string().optional(),
        partMaterial: z.string().optional(),
        equipmentType: z.string().optional(),
        cleanlinessGrade: z.string().optional(),
        status: z.enum(["draft", "active", "archived"]).optional(),
      }))
      .query(async ({ input }) => {
        return getSolutionCases(input);
      }),

    // 获取单个案例详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSolutionCaseById(input.id);
      }),

    // 创建案例
    create: protectedProcedure
      .input(createCaseSchema)
      .mutation(async ({ input, ctx }) => {
        return createSolutionCase({ ...input, createdBy: ctx.user.id });
      }),

    // 更新案例
    update: protectedProcedure
      .input(updateCaseSchema)
      .mutation(async ({ input }) => {
        return updateSolutionCase(input);
      }),

    // 删除案例
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteSolutionCase(input.id);
      }),

    // 搜索相似案例
    searchSimilar: protectedProcedure
      .input(z.object({
        partType: z.string().optional(),
        partMaterial: z.string().optional(),
        cleanlinessGrade: z.string().optional(),
        cycleTime: z.number().optional(),
        dailyOutput: z.number().optional(),
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        return searchSimilarCases(input);
      }),
  }),

  requests: router({
    // 创建方案设计请求
    create: protectedProcedure
      .input(createRequestSchema)
      .mutation(async ({ input, ctx }) => {
        return createSolutionRequest({ ...input, createdBy: ctx.user.id });
      }),

    // 获取请求列表
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.enum(["pending", "processing", "completed", "converted", "cancelled"]).optional(),
      }))
      .query(async ({ input }) => {
        return getSolutionRequests(input);
      }),

    // 获取请求详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSolutionRequestById(input.id);
      }),

    // 生成AI推荐
    generateAiRecommendation: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return generateAiRecommendation(input.requestId, ctx.user.id);
      }),

    // 接受/修改/拒绝AI推荐
    updateAiFeedback: protectedProcedure
      .input(z.object({
        logId: z.number(),
        feedback: z.enum(["accepted", "modified", "rejected"]),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return updateAiFeedback(input);
      }),

    // 转化为项目
    convertToProject: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return convertRequestToProject(input.requestId, ctx.user.id);
      }),
  }),
});
```

### 3.2 AI推荐核心函数

```typescript
// server/ai/solutionRecommendation.ts
import { invokeLLM } from "../_core/llm";

interface RecommendationInput {
  productName: string;
  partType: string;
  partMaterial: string;
  partDimensions: { length: number; width: number; height: number };
  partWeight: number;
  partFeatures: string;
  cleanlinessRequirements: {
    particleSize: number;
    residueWeight: number;
    grade: string;
    standard: string;
  };
  productionRequirements: {
    cycleTime: number;
    dailyOutput: number;
  };
  preferences: {
    loadingType?: string;
    dryingType?: string;
    specialRequirements?: string;
    budgetRange?: string;
  };
  similarCases: SolutionCase[];
}

interface RecommendationOutput {
  equipmentType: string;
  equipmentModel: string;
  processSteps: ProcessStep[];
  cleaningMedium: string;
  cleaningTemperature: number;
  cleaningPressure: number;
  loadingType: string;
  dryingType: string;
  estimatedPrice: number;
  confidence: number;
  reasoning: string;
  highlights: string[];
}

export async function generateSolutionRecommendation(
  input: RecommendationInput
): Promise<RecommendationOutput> {
  const systemPrompt = `你是GRT工业清洗设备的技术专家，擅长根据客户需求设计清洗方案。

你需要根据以下信息推荐最优的清洗方案：
1. 产品信息：名称、类型、材质、尺寸、重量、特征
2. 清洁度要求：颗粒度、残留物重量、清洁度等级、标准
3. 生产要求：节拍时间、日产量
4. 客户偏好：上下料方式、干燥方式、特殊要求、预算

参考以下历史成功案例进行推荐：
${JSON.stringify(input.similarCases, null, 2)}

请按照JSON格式返回推荐结果。`;

  const userPrompt = `请为以下客户需求设计清洗方案：

【产品信息】
- 产品名称：${input.productName}
- 零件类型：${input.partType}
- 零件材质：${input.partMaterial}
- 零件尺寸：${input.partDimensions.length}×${input.partDimensions.width}×${input.partDimensions.height}mm
- 零件重量：${input.partWeight}kg
- 零件特征：${input.partFeatures}

【清洁度要求】
- 颗粒度要求：≤${input.cleanlinessRequirements.particleSize}μm
- 残留物重量：≤${input.cleanlinessRequirements.residueWeight}mg
- 清洁度等级：${input.cleanlinessRequirements.grade}
- 执行标准：${input.cleanlinessRequirements.standard}

【生产要求】
- 节拍时间：${input.productionRequirements.cycleTime}秒/件
- 日产量：${input.productionRequirements.dailyOutput}件/天

【客户偏好】
- 上下料方式：${input.preferences.loadingType || '不限'}
- 干燥方式：${input.preferences.dryingType || '不限'}
- 特殊要求：${input.preferences.specialRequirements || '无'}
- 预算范围：${input.preferences.budgetRange || '不限'}

请返回JSON格式的推荐方案。`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "solution_recommendation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            equipmentType: { type: "string", description: "设备类型" },
            equipmentModel: { type: "string", description: "推荐设备型号" },
            processSteps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "integer" },
                  name: { type: "string" },
                  duration: { type: "integer" },
                  description: { type: "string" },
                },
                required: ["step", "name", "duration", "description"],
              },
            },
            cleaningMedium: { type: "string" },
            cleaningTemperature: { type: "integer" },
            cleaningPressure: { type: "number" },
            loadingType: { type: "string" },
            dryingType: { type: "string" },
            estimatedPrice: { type: "number" },
            confidence: { type: "number" },
            reasoning: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
          },
          required: [
            "equipmentType", "equipmentModel", "processSteps",
            "cleaningMedium", "cleaningTemperature", "cleaningPressure",
            "loadingType", "dryingType", "estimatedPrice",
            "confidence", "reasoning", "highlights"
          ],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## 4. 前端组件设计

### 4.1 页面结构

```
client/src/pages/solution/
├── index.tsx                    # 方案设计首页
├── CaseList.tsx                 # 历史案例列表
├── CaseDetail.tsx               # 案例详情
├── CaseForm.tsx                 # 案例编辑表单
├── RequestList.tsx              # 方案请求列表
├── RequestForm.tsx              # 新建方案请求
├── AiRecommendation.tsx         # AI推荐结果展示
└── components/
    ├── CaseCard.tsx             # 案例卡片
    ├── ParameterForm.tsx        # 参数输入表单
    ├── SimilarCaseList.tsx      # 相似案例列表
    ├── ProcessStepViewer.tsx    # 工艺步骤查看器
    └── RecommendationCard.tsx   # 推荐结果卡片
```

### 4.2 核心组件示例

```tsx
// client/src/pages/solution/RequestForm.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

const PART_TYPES = [
  { value: "casting", label: "铸件" },
  { value: "forging", label: "锻件" },
  { value: "machined", label: "机加工件" },
  { value: "sheet_metal", label: "钣金件" },
];

const PART_MATERIALS = [
  { value: "cast_iron", label: "铸铁" },
  { value: "aluminum", label: "铝合金" },
  { value: "steel", label: "钢" },
  { value: "copper", label: "铜" },
];

const CLEANLINESS_GRADES = ["CCC", "CC", "C", "B", "A"];

export default function RequestForm() {
  const [formData, setFormData] = useState({
    requestName: "",
    customerName: "",
    productName: "",
    partType: "",
    partMaterial: "",
    partLength: "",
    partWidth: "",
    partHeight: "",
    partWeight: "",
    partFeatures: "",
    cleanlinessParticleSize: "",
    cleanlinessResidueWeight: "",
    cleanlinessGrade: "",
    cycleTime: "",
    dailyOutput: "",
    loadingTypePreference: "",
    dryingTypePreference: "",
    specialRequirements: "",
    budgetRange: "",
  });

  const createMutation = trpc.solution.requests.create.useMutation();
  const generateAiMutation = trpc.solution.requests.generateAiRecommendation.useMutation();

  const handleSubmit = async () => {
    const result = await createMutation.mutateAsync(formData);
    // 自动触发AI推荐
    await generateAiMutation.mutateAsync({ requestId: result.id });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">新建方案设计请求</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 产品信息 */}
        <Card>
          <CardHeader>
            <CardTitle>产品信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>产品名称 *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="如：发动机缸体"
                />
              </div>
              <div>
                <Label>零件类型</Label>
                <Select
                  value={formData.partType}
                  onValueChange={(v) => setFormData({ ...formData, partType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择零件类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PART_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* 更多字段... */}
          </CardContent>
        </Card>

        {/* 清洁度要求 */}
        <Card>
          <CardHeader>
            <CardTitle>清洁度要求</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>颗粒度要求 (μm)</Label>
                <Input
                  type="number"
                  value={formData.cleanlinessParticleSize}
                  onChange={(e) => setFormData({ ...formData, cleanlinessParticleSize: e.target.value })}
                  placeholder="如：500"
                />
              </div>
              <div>
                <Label>清洁度等级</Label>
                <Select
                  value={formData.cleanlinessGrade}
                  onValueChange={(v) => setFormData({ ...formData, cleanlinessGrade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANLINESS_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 生产要求 */}
        <Card>
          <CardHeader>
            <CardTitle>生产要求</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>节拍时间 (秒/件)</Label>
                <Input
                  type="number"
                  value={formData.cycleTime}
                  onChange={(e) => setFormData({ ...formData, cycleTime: e.target.value })}
                  placeholder="如：60"
                />
              </div>
              <div>
                <Label>日产量 (件/天)</Label>
                <Input
                  type="number"
                  value={formData.dailyOutput}
                  onChange={(e) => setFormData({ ...formData, dailyOutput: e.target.value })}
                  placeholder="如：500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 设备偏好 */}
        <Card>
          <CardHeader>
            <CardTitle>设备偏好</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>特殊要求</Label>
              <Textarea
                value={formData.specialRequirements}
                onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                placeholder="如：需要防锈处理、需要与现有产线对接等"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline">保存草稿</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          提交并获取AI推荐
        </Button>
      </div>
    </div>
  );
}
```

---

## 5. 实施步骤

### 5.1 Phase 1: 数据库和基础API（8小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1.1 | 创建 `drizzle/schema/solution.ts` | 1小时 |
| 1.2 | 运行 `pnpm db:push` 同步数据库 | 0.5小时 |
| 1.3 | 创建 `server/db/solution.ts` 数据库操作函数 | 3小时 |
| 1.4 | 创建 `server/routers/solution.ts` tRPC路由 | 2小时 |
| 1.5 | 编写单元测试 `server/solution.test.ts` | 1.5小时 |

### 5.2 Phase 2: AI推荐功能（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 2.1 | 创建 `server/ai/solutionRecommendation.ts` | 2小时 |
| 2.2 | 实现相似案例匹配算法 | 2小时 |
| 2.3 | 集成LLM调用和结果解析 | 1.5小时 |
| 2.4 | 编写AI推荐测试 | 0.5小时 |

### 5.3 Phase 3: 前端页面（8小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 3.1 | 创建历史案例列表页面 | 2小时 |
| 3.2 | 创建案例详情和编辑页面 | 2小时 |
| 3.3 | 创建方案请求表单 | 2小时 |
| 3.4 | 创建AI推荐结果展示 | 1.5小时 |
| 3.5 | 添加路由和导航 | 0.5小时 |

### 5.4 Phase 4: 测试和优化（3小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 4.1 | 端到端功能测试 | 1小时 |
| 4.2 | AI推荐效果调优 | 1小时 |
| 4.3 | 性能优化和Bug修复 | 1小时 |

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 可以创建、编辑、删除历史案例
- [ ] 可以按条件筛选和搜索案例
- [ ] 可以创建方案设计请求
- [ ] AI可以根据输入参数生成推荐方案
- [ ] AI推荐结果包含设备类型、工艺流程、报价估算
- [ ] 可以查看相似历史案例
- [ ] 可以接受/修改/拒绝AI推荐
- [ ] 可以将请求转化为项目

### 6.2 测试覆盖

- [ ] 案例CRUD操作测试通过
- [ ] 相似案例匹配算法测试通过
- [ ] AI推荐生成测试通过
- [ ] 前端表单验证测试通过

### 6.3 性能指标

- [ ] 案例列表加载时间 < 1秒
- [ ] AI推荐生成时间 < 10秒
- [ ] 相似案例匹配时间 < 2秒

---

## 7. 检查清单

### 7.1 实施前检查

- [ ] 阅读并理解本规划文档
- [ ] 确认开发环境正常
- [ ] 确认LLM API可用

### 7.2 实施中检查

- [ ] 每完成一个步骤运行 `npx tsc`
- [ ] 每完成一个Phase运行 `pnpm test`
- [ ] 及时更新 `todo.md`

### 7.3 实施后检查

- [ ] 所有测试通过
- [ ] 功能验收通过
- [ ] 代码已提交

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI

# 模块3：项目阶段AI推荐功能

**模块代码**: PROJECT-AI-RECOMMEND  
**优先级**: P1  
**预计工时**: 15-20小时  
**依赖模块**: BOM-MATERIAL, AI-SOLUTION  
**实施方**: Claude Code

---

## 1. 业务背景

### 1.1 业务场景

GRT项目采用M0-M12阶段门禁管理模式，在特定节点（如M2、M4）需要复用历史项目的成功经验：

| 阶段 | 名称 | 可复用内容 |
|------|------|------------|
| M0 | 商机立项 | 方案设计、报价模板 |
| M1 | 需求确认 | 需求规格书模板、技术协议 |
| M2 | 方案设计 | **SOP、工艺流程、BOM、设计图纸** |
| M3 | 设计评审 | 评审检查清单、评审记录模板 |
| M4 | 采购制造 | **BOM、采购清单、供应商选择** |
| M5 | 装配调试 | 调试SOP、检验标准 |
| M6 | FAT验收 | FAT检验规程、验收报告模板 |
| M7-M12 | 交付运维 | 用户手册、维护SOP |

### 1.2 AI推荐核心功能

1. **相似项目匹配** - 根据当前项目特征，AI匹配历史相似项目
2. **阶段资料推荐** - 推荐该阶段可复用的SOP、BOM、评审资料
3. **一键应用** - 支持100%采用或选择性应用推荐内容
4. **智能调整建议** - AI根据当前项目特点，给出调整建议

### 1.3 核心输入参数

| 参数类型 | 参数名称 | 说明 |
|----------|----------|------|
| 项目信息 | 项目类型 | 设备类型分类 |
| 项目信息 | 客户行业 | 客户所属行业 |
| 项目信息 | 设备规格 | 设备主要规格参数 |
| 项目信息 | 清洁度要求 | 清洁度等级和标准 |
| 阶段信息 | 当前阶段 | M0-M12 |
| 阶段信息 | 需要资料类型 | SOP/BOM/评审资料等 |

---

## 2. 数据库Schema设计

### 2.1 项目阶段资料表 (project_phase_documents)

```sql
-- 项目阶段资料表 - 存储各阶段的文档和资料
CREATE TABLE project_phase_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    project_id INT NOT NULL COMMENT '关联项目ID',
    phase_code VARCHAR(10) NOT NULL COMMENT '阶段代码：M0-M12',
    
    -- 文档信息
    document_code VARCHAR(32) UNIQUE NOT NULL COMMENT '文档编号',
    document_type ENUM(
        'sop',              -- 标准作业程序
        'bom',              -- 物料清单
        'process_flow',     -- 工艺流程
        'design_drawing',   -- 设计图纸
        'review_checklist', -- 评审检查清单
        'review_record',    -- 评审记录
        'test_report',      -- 测试报告
        'user_manual',      -- 用户手册
        'other'             -- 其他
    ) NOT NULL COMMENT '文档类型',
    
    document_name VARCHAR(200) NOT NULL COMMENT '文档名称',
    document_version VARCHAR(20) DEFAULT 'V1.0' COMMENT '文档版本',
    description TEXT COMMENT '文档描述',
    
    -- 文件信息
    file_url VARCHAR(500) COMMENT '文件URL',
    file_size INT COMMENT '文件大小(bytes)',
    file_type VARCHAR(50) COMMENT '文件类型：pdf/docx/xlsx',
    
    -- 结构化内容（用于AI分析和推荐）
    structured_content JSON COMMENT '结构化内容JSON',
    
    -- 关联BOM（如果是BOM类型）
    related_bom_id INT COMMENT '关联BOM ID',
    
    -- 状态
    status ENUM('draft', 'active', 'archived') DEFAULT 'active',
    is_template BOOLEAN DEFAULT FALSE COMMENT '是否为模板',
    
    -- 评分（用于推荐排序）
    quality_score INT DEFAULT 0 COMMENT '质量评分(0-100)',
    usage_count INT DEFAULT 0 COMMENT '被引用次数',
    
    -- 元数据
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_phase (project_id, phase_code),
    INDEX idx_type (document_type),
    INDEX idx_template (is_template)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目阶段资料表';
```

### 2.2 SOP标准作业程序表 (standard_operating_procedures)

```sql
-- SOP标准作业程序表
CREATE TABLE standard_operating_procedures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- SOP编号
    sop_code VARCHAR(32) UNIQUE NOT NULL COMMENT 'SOP编号，如：SOP-CLN-001',
    
    -- 基本信息
    sop_name VARCHAR(200) NOT NULL COMMENT 'SOP名称',
    sop_type ENUM(
        'cleaning',         -- 清洗SOP
        'assembly',         -- 装配SOP
        'testing',          -- 测试SOP
        'maintenance',      -- 维护SOP
        'quality_check',    -- 质检SOP
        'safety'            -- 安全SOP
    ) NOT NULL COMMENT 'SOP类型',
    
    version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本号',
    description TEXT COMMENT 'SOP描述',
    
    -- 适用范围
    applicable_equipment_types JSON COMMENT '适用设备类型',
    applicable_part_types JSON COMMENT '适用零件类型',
    applicable_cleanliness_grades JSON COMMENT '适用清洁度等级',
    
    -- SOP步骤（结构化）
    steps JSON NOT NULL COMMENT 'SOP步骤JSON数组',
    /*
    steps格式：
    [
      {
        "stepNumber": 1,
        "name": "预清洗",
        "description": "使用碱性清洗液进行预清洗",
        "duration": 120,
        "parameters": {
          "temperature": 50,
          "pressure": 2.5,
          "medium": "碱性清洗液"
        },
        "safetyNotes": "佩戴防护手套",
        "qualityCheckPoints": ["检查清洗液浓度", "检查温度"]
      }
    ]
    */
    
    -- 关联资源
    required_equipment JSON COMMENT '所需设备',
    required_materials JSON COMMENT '所需物料',
    required_tools JSON COMMENT '所需工具',
    
    -- 质量要求
    quality_standards JSON COMMENT '质量标准',
    inspection_points JSON COMMENT '检验点',
    
    -- 安全要求
    safety_requirements TEXT COMMENT '安全要求',
    ppe_requirements JSON COMMENT '个人防护装备要求',
    
    -- 状态
    status ENUM('draft', 'active', 'archived') DEFAULT 'active',
    is_template BOOLEAN DEFAULT TRUE COMMENT '是否为模板',
    
    -- 评分
    effectiveness_score INT DEFAULT 0 COMMENT '有效性评分(0-100)',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    
    -- 元数据
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (sop_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SOP标准作业程序表';
```

### 2.3 AI推荐记录表 (project_ai_recommendations)

```sql
-- 项目AI推荐记录表
CREATE TABLE project_ai_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- 关联信息
    project_id INT NOT NULL COMMENT '项目ID',
    phase_code VARCHAR(10) NOT NULL COMMENT '阶段代码',
    
    -- 推荐请求
    request_params JSON NOT NULL COMMENT '请求参数',
    
    -- 匹配的相似项目
    similar_projects JSON COMMENT '相似项目列表及相似度',
    
    -- 推荐结果
    recommended_documents JSON COMMENT '推荐的文档列表',
    recommended_sops JSON COMMENT '推荐的SOP列表',
    recommended_boms JSON COMMENT '推荐的BOM列表',
    
    -- AI分析
    ai_analysis TEXT COMMENT 'AI分析说明',
    ai_suggestions JSON COMMENT 'AI调整建议',
    confidence_score DECIMAL(5,2) COMMENT '置信度(0-100)',
    
    -- 用户操作
    user_action ENUM('pending', 'accepted', 'partial_accepted', 'rejected') DEFAULT 'pending',
    applied_items JSON COMMENT '用户应用的项目',
    user_feedback TEXT COMMENT '用户反馈',
    
    -- 元数据
    requested_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMP,
    
    INDEX idx_project_phase (project_id, phase_code),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目AI推荐记录表';
```

### 2.4 Drizzle Schema定义

```typescript
// drizzle/schema/projectPhase.ts
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
 * 项目阶段资料表
 */
export const projectPhaseDocuments = mysqlTable("project_phase_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  phaseCode: varchar("phase_code", { length: 10 }).notNull(),
  
  documentCode: varchar("document_code", { length: 32 }).unique().notNull(),
  documentType: mysqlEnum("document_type", [
    "sop", "bom", "process_flow", "design_drawing",
    "review_checklist", "review_record", "test_report",
    "user_manual", "other"
  ]).notNull(),
  
  documentName: varchar("document_name", { length: 200 }).notNull(),
  documentVersion: varchar("document_version", { length: 20 }).default("V1.0"),
  description: text("description"),
  
  fileUrl: varchar("file_url", { length: 500 }),
  fileSize: int("file_size"),
  fileType: varchar("file_type", { length: 50 }),
  
  structuredContent: json("structured_content"),
  relatedBomId: int("related_bom_id"),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("active"),
  isTemplate: boolean("is_template").default(false),
  
  qualityScore: int("quality_score").default(0),
  usageCount: int("usage_count").default(0),
  
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectPhaseDocument = typeof projectPhaseDocuments.$inferSelect;
export type InsertProjectPhaseDocument = typeof projectPhaseDocuments.$inferInsert;

/**
 * SOP标准作业程序表
 */
export const standardOperatingProcedures = mysqlTable("standard_operating_procedures", {
  id: int("id").autoincrement().primaryKey(),
  sopCode: varchar("sop_code", { length: 32 }).unique().notNull(),
  
  sopName: varchar("sop_name", { length: 200 }).notNull(),
  sopType: mysqlEnum("sop_type", [
    "cleaning", "assembly", "testing",
    "maintenance", "quality_check", "safety"
  ]).notNull(),
  
  version: varchar("version", { length: 20 }).default("V1.0"),
  description: text("description"),
  
  applicableEquipmentTypes: json("applicable_equipment_types"),
  applicablePartTypes: json("applicable_part_types"),
  applicableCleanlinessGrades: json("applicable_cleanliness_grades"),
  
  steps: json("steps").notNull(),
  
  requiredEquipment: json("required_equipment"),
  requiredMaterials: json("required_materials"),
  requiredTools: json("required_tools"),
  
  qualityStandards: json("quality_standards"),
  inspectionPoints: json("inspection_points"),
  
  safetyRequirements: text("safety_requirements"),
  ppeRequirements: json("ppe_requirements"),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("active"),
  isTemplate: boolean("is_template").default(true),
  
  effectivenessScore: int("effectiveness_score").default(0),
  usageCount: int("usage_count").default(0),
  
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type StandardOperatingProcedure = typeof standardOperatingProcedures.$inferSelect;
export type InsertStandardOperatingProcedure = typeof standardOperatingProcedures.$inferInsert;

/**
 * 项目AI推荐记录表
 */
export const projectAiRecommendations = mysqlTable("project_ai_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  phaseCode: varchar("phase_code", { length: 10 }).notNull(),
  
  requestParams: json("request_params").notNull(),
  
  similarProjects: json("similar_projects"),
  recommendedDocuments: json("recommended_documents"),
  recommendedSops: json("recommended_sops"),
  recommendedBoms: json("recommended_boms"),
  
  aiAnalysis: text("ai_analysis"),
  aiSuggestions: json("ai_suggestions"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  
  userAction: mysqlEnum("user_action", [
    "pending", "accepted", "partial_accepted", "rejected"
  ]).default("pending"),
  appliedItems: json("applied_items"),
  userFeedback: text("user_feedback"),
  
  requestedBy: int("requested_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  appliedAt: timestamp("applied_at"),
});

export type ProjectAiRecommendation = typeof projectAiRecommendations.$inferSelect;
export type InsertProjectAiRecommendation = typeof projectAiRecommendations.$inferInsert;
```

---

## 3. API路由设计

### 3.1 项目阶段资料API

```typescript
// server/routers/projectPhase.ts
export const projectPhaseRouter = router({
  documents: router({
    // 获取项目阶段资料列表
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        phaseCode: z.string().optional(),
        documentType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getProjectPhaseDocuments(input);
      }),

    // 获取资料详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProjectPhaseDocumentById(input.id);
      }),

    // 上传资料
    upload: protectedProcedure
      .input(uploadDocumentSchema)
      .mutation(async ({ input, ctx }) => {
        return uploadProjectPhaseDocument({ ...input, createdBy: ctx.user.id });
      }),

    // 从模板创建资料
    createFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        projectId: z.number(),
        phaseCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return createDocumentFromTemplate(input, ctx.user.id);
      }),
  }),

  sop: router({
    // 获取SOP列表
    list: protectedProcedure
      .input(z.object({
        sopType: z.string().optional(),
        equipmentType: z.string().optional(),
        isTemplate: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return getStandardOperatingProcedures(input);
      }),

    // 获取SOP详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSopById(input.id);
      }),

    // 创建SOP
    create: protectedProcedure
      .input(createSopSchema)
      .mutation(async ({ input, ctx }) => {
        return createSop({ ...input, createdBy: ctx.user.id });
      }),

    // 更新SOP
    update: protectedProcedure
      .input(updateSopSchema)
      .mutation(async ({ input }) => {
        return updateSop(input);
      }),

    // 复制SOP到项目
    copyToProject: protectedProcedure
      .input(z.object({
        sopId: z.number(),
        projectId: z.number(),
        phaseCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return copySopToProject(input, ctx.user.id);
      }),
  }),

  aiRecommend: router({
    // 获取AI推荐
    getRecommendation: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        phaseCode: z.string(),
        documentTypes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return generatePhaseAiRecommendation(input, ctx.user.id);
      }),

    // 获取推荐历史
    getHistory: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        phaseCode: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getAiRecommendationHistory(input);
      }),

    // 应用推荐
    applyRecommendation: protectedProcedure
      .input(z.object({
        recommendationId: z.number(),
        applyType: z.enum(["full", "partial"]),
        selectedItems: z.array(z.object({
          type: z.enum(["document", "sop", "bom"]),
          id: z.number(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return applyAiRecommendation(input, ctx.user.id);
      }),

    // 提交反馈
    submitFeedback: protectedProcedure
      .input(z.object({
        recommendationId: z.number(),
        feedback: z.string(),
        rating: z.number().min(1).max(5),
      }))
      .mutation(async ({ input }) => {
        return submitRecommendationFeedback(input);
      }),
  }),
});
```

### 3.2 AI推荐核心函数

```typescript
// server/ai/projectPhaseRecommendation.ts
import { invokeLLM } from "../_core/llm";

interface PhaseRecommendationInput {
  projectId: number;
  phaseCode: string;
  projectInfo: {
    projectName: string;
    equipmentType: string;
    equipmentModel: string;
    customerIndustry: string;
    cleanlinessGrade: string;
    partType: string;
    partMaterial: string;
  };
  documentTypes?: string[];
}

interface PhaseRecommendationOutput {
  similarProjects: Array<{
    projectId: number;
    projectName: string;
    similarity: number;
    matchedFeatures: string[];
  }>;
  recommendedDocuments: Array<{
    id: number;
    documentCode: string;
    documentName: string;
    documentType: string;
    relevanceScore: number;
    sourceProjectId: number;
  }>;
  recommendedSops: Array<{
    id: number;
    sopCode: string;
    sopName: string;
    sopType: string;
    relevanceScore: number;
    adjustmentSuggestions: string[];
  }>;
  recommendedBoms: Array<{
    id: number;
    bomCode: string;
    bomName: string;
    relevanceScore: number;
    adjustmentSuggestions: string[];
  }>;
  aiAnalysis: string;
  aiSuggestions: string[];
  confidence: number;
}

export async function generatePhaseRecommendation(
  input: PhaseRecommendationInput
): Promise<PhaseRecommendationOutput> {
  // 1. 查找相似项目
  const similarProjects = await findSimilarProjects(input.projectInfo);
  
  // 2. 获取相似项目的阶段资料
  const candidateDocuments = await getCandidateDocuments(
    similarProjects.map(p => p.projectId),
    input.phaseCode,
    input.documentTypes
  );
  
  // 3. 获取适用的SOP模板
  const candidateSops = await getCandidateSops(input.projectInfo);
  
  // 4. 获取相似BOM
  const candidateBoms = await getCandidateBoms(input.projectInfo);
  
  // 5. 使用AI进行智能排序和建议生成
  const systemPrompt = `你是GRT工业清洗设备的项目管理专家，擅长根据项目特点推荐合适的阶段资料。

当前项目信息：
- 项目名称：${input.projectInfo.projectName}
- 设备类型：${input.projectInfo.equipmentType}
- 设备型号：${input.projectInfo.equipmentModel}
- 客户行业：${input.projectInfo.customerIndustry}
- 清洁度等级：${input.projectInfo.cleanlinessGrade}
- 零件类型：${input.projectInfo.partType}
- 零件材质：${input.projectInfo.partMaterial}

当前阶段：${input.phaseCode}

请分析以下候选资料，并给出推荐排序和调整建议。`;

  const userPrompt = `请分析以下候选资料，为当前项目的${input.phaseCode}阶段推荐最合适的资料：

【相似项目】
${JSON.stringify(similarProjects, null, 2)}

【候选文档】
${JSON.stringify(candidateDocuments, null, 2)}

【候选SOP】
${JSON.stringify(candidateSops, null, 2)}

【候选BOM】
${JSON.stringify(candidateBoms, null, 2)}

请返回JSON格式的推荐结果，包括：
1. 推荐的文档列表（按相关性排序）
2. 推荐的SOP列表（含调整建议）
3. 推荐的BOM列表（含调整建议）
4. AI分析说明
5. 整体建议`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "phase_recommendation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendedDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  relevanceScore: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["id", "relevanceScore", "reason"],
              },
            },
            recommendedSops: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  relevanceScore: { type: "number" },
                  adjustmentSuggestions: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["id", "relevanceScore", "adjustmentSuggestions"],
              },
            },
            recommendedBoms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  relevanceScore: { type: "number" },
                  adjustmentSuggestions: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["id", "relevanceScore", "adjustmentSuggestions"],
              },
            },
            aiAnalysis: { type: "string" },
            aiSuggestions: {
              type: "array",
              items: { type: "string" },
            },
            confidence: { type: "number" },
          },
          required: [
            "recommendedDocuments", "recommendedSops", "recommendedBoms",
            "aiAnalysis", "aiSuggestions", "confidence"
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const aiResult = JSON.parse(response.choices[0].message.content);

  // 6. 组装最终结果
  return {
    similarProjects,
    recommendedDocuments: aiResult.recommendedDocuments.map((rec: any) => {
      const doc = candidateDocuments.find(d => d.id === rec.id);
      return {
        ...doc,
        relevanceScore: rec.relevanceScore,
      };
    }),
    recommendedSops: aiResult.recommendedSops.map((rec: any) => {
      const sop = candidateSops.find(s => s.id === rec.id);
      return {
        ...sop,
        relevanceScore: rec.relevanceScore,
        adjustmentSuggestions: rec.adjustmentSuggestions,
      };
    }),
    recommendedBoms: aiResult.recommendedBoms.map((rec: any) => {
      const bom = candidateBoms.find(b => b.id === rec.id);
      return {
        ...bom,
        relevanceScore: rec.relevanceScore,
        adjustmentSuggestions: rec.adjustmentSuggestions,
      };
    }),
    aiAnalysis: aiResult.aiAnalysis,
    aiSuggestions: aiResult.aiSuggestions,
    confidence: aiResult.confidence,
  };
}

// 查找相似项目
async function findSimilarProjects(projectInfo: any) {
  // 基于设备类型、客户行业、清洁度等级等特征匹配
  // 使用向量相似度或规则匹配
  // ...
}

// 获取候选文档
async function getCandidateDocuments(
  projectIds: number[],
  phaseCode: string,
  documentTypes?: string[]
) {
  // 查询相似项目在该阶段的文档
  // ...
}

// 获取候选SOP
async function getCandidateSops(projectInfo: any) {
  // 查询适用的SOP模板
  // ...
}

// 获取候选BOM
async function getCandidateBoms(projectInfo: any) {
  // 查询相似设备的BOM
  // ...
}
```

---

## 4. 前端组件设计

### 4.1 页面结构

```
client/src/pages/project/
├── [id]/
│   ├── phases/
│   │   ├── index.tsx            # 阶段概览
│   │   ├── [phaseCode]/
│   │   │   ├── index.tsx        # 阶段详情
│   │   │   ├── documents.tsx    # 阶段资料
│   │   │   └── ai-recommend.tsx # AI推荐
│   │   └── components/
│   │       ├── PhaseTimeline.tsx    # 阶段时间线
│   │       ├── DocumentList.tsx     # 资料列表
│   │       ├── SopViewer.tsx        # SOP查看器
│   │       └── AiRecommendPanel.tsx # AI推荐面板
```

### 4.2 核心组件示例

```tsx
// client/src/pages/project/[id]/phases/[phaseCode]/ai-recommend.tsx
import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Sparkles, FileText, Cog, Package, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PhaseAiRecommend() {
  const { id: projectId, phaseCode } = useParams();
  const [selectedItems, setSelectedItems] = useState<Array<{ type: string; id: number }>>([]);
  
  const { data: project } = trpc.project.get.useQuery({ id: Number(projectId) });
  
  const recommendMutation = trpc.projectPhase.aiRecommend.getRecommendation.useMutation();
  const applyMutation = trpc.projectPhase.aiRecommend.applyRecommendation.useMutation();

  const handleGetRecommendation = async () => {
    await recommendMutation.mutateAsync({
      projectId: Number(projectId),
      phaseCode: phaseCode!,
    });
  };

  const handleApply = async (applyType: "full" | "partial") => {
    if (applyType === "partial" && selectedItems.length === 0) {
      toast.error("请选择要应用的资料");
      return;
    }

    await applyMutation.mutateAsync({
      recommendationId: recommendMutation.data!.id,
      applyType,
      selectedItems: applyType === "partial" ? selectedItems : undefined,
    });

    toast.success("资料已应用到项目");
  };

  const toggleSelection = (type: string, id: number) => {
    const key = `${type}-${id}`;
    const existing = selectedItems.find(item => item.type === type && item.id === id);
    if (existing) {
      setSelectedItems(selectedItems.filter(item => !(item.type === type && item.id === id)));
    } else {
      setSelectedItems([...selectedItems, { type, id }]);
    }
  };

  const recommendation = recommendMutation.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI智能推荐</h1>
          <p className="text-muted-foreground">
            {project?.projectName} - {phaseCode}阶段
          </p>
        </div>
        <Button onClick={handleGetRecommendation} disabled={recommendMutation.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {recommendMutation.isPending ? "分析中..." : "获取AI推荐"}
        </Button>
      </div>

      {recommendation && (
        <>
          {/* AI分析概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI分析结果
              </CardTitle>
              <CardDescription>
                置信度: {recommendation.confidence}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {recommendation.aiAnalysis}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">AI建议：</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {recommendation.aiSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 相似项目 */}
          <Card>
            <CardHeader>
              <CardTitle>相似项目参考</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendation.similarProjects.map((project) => (
                  <Card key={project.projectId} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{project.projectName}</p>
                        <Badge variant="secondary">
                          {(project.similarity * 100).toFixed(0)}%相似
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {project.matchedFeatures.map((feature, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 推荐资料 */}
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                文档资料 ({recommendation.recommendedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="sops">
                <Cog className="mr-2 h-4 w-4" />
                SOP ({recommendation.recommendedSops.length})
              </TabsTrigger>
              <TabsTrigger value="boms">
                <Package className="mr-2 h-4 w-4" />
                BOM ({recommendation.recommendedBoms.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              {recommendation.recommendedDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Checkbox
                      checked={selectedItems.some(item => item.type === "document" && item.id === doc.id)}
                      onCheckedChange={() => toggleSelection("document", doc.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.documentName}</p>
                        <Badge>{doc.documentType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.documentCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">相关度</p>
                      <Progress value={doc.relevanceScore} className="w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="sops" className="space-y-4">
              {recommendation.recommendedSops.map((sop) => (
                <Card key={sop.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedItems.some(item => item.type === "sop" && item.id === sop.id)}
                        onCheckedChange={() => toggleSelection("sop", sop.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{sop.sopName}</p>
                          <Badge variant="outline">{sop.sopType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{sop.sopCode}</p>
                        
                        {sop.adjustmentSuggestions.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1 mb-1">
                              <AlertCircle className="h-4 w-4" />
                              调整建议
                            </p>
                            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                              {sop.adjustmentSuggestions.map((suggestion, i) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">相关度</p>
                        <Progress value={sop.relevanceScore} className="w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="boms" className="space-y-4">
              {recommendation.recommendedBoms.map((bom) => (
                <Card key={bom.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedItems.some(item => item.type === "bom" && item.id === bom.id)}
                        onCheckedChange={() => toggleSelection("bom", bom.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{bom.bomName}</p>
                        <p className="text-sm text-muted-foreground">{bom.bomCode}</p>
                        
                        {bom.adjustmentSuggestions.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md mt-2">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1 mb-1">
                              <AlertCircle className="h-4 w-4" />
                              调整建议
                            </p>
                            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                              {bom.adjustmentSuggestions.map((suggestion, i) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">相关度</p>
                        <Progress value={bom.relevanceScore} className="w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => handleApply("partial")}
              disabled={selectedItems.length === 0 || applyMutation.isPending}
            >
              应用选中项 ({selectedItems.length})
            </Button>
            <Button onClick={() => handleApply("full")} disabled={applyMutation.isPending}>
              <Check className="mr-2 h-4 w-4" />
              全部应用
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 5. 实施步骤

### 5.1 Phase 1: 数据库和基础API（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1.1 | 创建项目阶段相关Schema | 2小时 |
| 1.2 | 运行 `pnpm db:push` 同步数据库 | 0.5小时 |
| 1.3 | 创建数据库操作函数 | 2小时 |
| 1.4 | 创建tRPC路由 | 1.5小时 |

### 5.2 Phase 2: AI推荐功能（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 2.1 | 实现相似项目匹配算法 | 2小时 |
| 2.2 | 实现AI推荐生成函数 | 2小时 |
| 2.3 | 实现推荐应用功能 | 1.5小时 |
| 2.4 | 编写单元测试 | 0.5小时 |

### 5.3 Phase 3: 前端页面（6小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 3.1 | 创建阶段资料管理页面 | 2小时 |
| 3.2 | 创建AI推荐页面 | 2小时 |
| 3.3 | 创建SOP查看器组件 | 1.5小时 |
| 3.4 | 添加路由和导航 | 0.5小时 |

### 5.4 Phase 4: 测试和优化（2小时）

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 4.1 | 端到端功能测试 | 1小时 |
| 4.2 | AI推荐效果调优 | 1小时 |

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 可以上传和管理项目阶段资料
- [ ] 可以创建和管理SOP模板
- [ ] AI可以根据项目特征匹配相似项目
- [ ] AI可以推荐该阶段适用的文档、SOP、BOM
- [ ] 推荐结果包含调整建议
- [ ] 支持100%采用和选择性应用
- [ ] 应用后资料正确复制到当前项目

### 6.2 测试覆盖

- [ ] 阶段资料CRUD测试通过
- [ ] SOP管理测试通过
- [ ] AI推荐生成测试通过
- [ ] 推荐应用测试通过

---

## 7. 检查清单

### 7.1 实施前检查

- [ ] 阅读并理解本规划文档
- [ ] 确认BOM-MATERIAL模块已实现
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

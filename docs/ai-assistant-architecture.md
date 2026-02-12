# GRT智能系统AI助手架构设计

**版本**: 1.0  
**作者**: Manus AI  
**日期**: 2026年1月17日  
**状态**: 规划中

---

## 1. 概述

本文档定义GRT智能系统的AI助手架构体系，基于NocoBase架构设计，将企业各业务场景的AI能力模块化为专业助手。每个AI助手具有独立的Secrets配置、专业知识库和交互界面，可根据角色权限灵活组合使用。

### 1.1 设计原则

| 原则 | 描述 |
|------|------|
| **模块化设计** | 每个AI助手独立部署，可单独升级和维护 |
| **统一接口** | 所有助手遵循统一的API规范和交互模式 |
| **知识隔离** | 各助手拥有专属知识库，避免信息混淆 |
| **权限控制** | 基于角色的访问控制，敏感数据按需授权 |
| **可扩展性** | 支持快速添加新助手，满足业务扩展需求 |

### 1.2 架构层次

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI助手统一网关层                              │
│   (API路由 / 认证鉴权 / 负载均衡 / 日志审计)                         │
├─────────────────────────────────────────────────────────────────────┤
│                        AI助手服务层                                  │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐     │
│  │Interview│Solution │Quotation│   KPI   │Purchase │Planning │     │
│  │Assistant│Assistant│Assistant│Assistant│Assistant│Assistant│     │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                        知识库与数据层                                │
│   (历史案例 / 产品规格 / 报价模板 / 绩效标准 / 供应商数据)           │
├─────────────────────────────────────────────────────────────────────┤
│                        基础设施层                                    │
│   (LLM API / 向量数据库 / 文件存储 / 消息队列)                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. AI助手清单

### 2.1 核心业务助手

系统定义以下核心AI助手，覆盖GRT主要业务场景：

| 助手ID | 助手名称 | 英文名称 | 业务领域 | 优先级 |
|--------|----------|----------|----------|--------|
| interview | 面试助手 | Interview Assistant | 人力资源 | P0 |
| solution | 方案设计助手 | Solution Assistant | 销售/技术 | P0 |
| quotation | 报价助手 | Quotation Assistant | 销售/财务 | P0 |
| kpi | 绩效助手 | KPI Assistant | 人力资源 | P1 |
| purchase | 采购助手 | Purchase Assistant | 采购/供应链 | P1 |
| planning_1 | 公司计划助手 | Planning Assistant 1 | 战略规划 | P1 |
| planning_2 | 部门计划助手 | Planning Assistant 2 | 部门管理 | P1 |
| planning_3 | 事业部计划助手 | Planning Assistant 3 | 事业部管理 | P2 |
| planning_4 | 个人计划助手 | Planning Assistant 4 | 个人发展 | P2 |

### 2.2 角色数字助手

为公司各角色配置专属数字助手，提供岗位相关的AI辅助：

| 助手ID | 角色名称 | 英文名称 | 服务对象 | 核心能力 |
|--------|----------|----------|----------|----------|
| sales_agent | 销售数字助手 | Sales Agent | 销售工程师 | 客户分析、商机推荐、话术建议 |
| tech_agent | 技术数字助手 | Tech Agent | 技术工程师 | 方案参考、技术问答、故障诊断 |
| pm_agent | 项目数字助手 | PM Agent | 项目经理 | 进度预警、资源调度、风险识别 |
| qa_agent | 品质数字助手 | QA Agent | 品管人员 | 质量分析、缺陷预测、标准查询 |
| hr_agent | HR数字助手 | HR Agent | HR专员 | 简历筛选、面试安排、政策查询 |
| finance_agent | 财务数字助手 | Finance Agent | 财务人员 | 报表分析、成本预警、预算建议 |
| production_agent | 生产数字助手 | Production Agent | 生产人员 | 排产优化、设备维护、工艺指导 |
| procurement_agent | 采购数字助手 | Procurement Agent | 采购专员 | 供应商评估、价格对比、交期跟踪 |

---

## 3. AI助手详细设计

### 3.1 Interview Assistant（面试助手）

面试助手已在系统中实现基础功能，本次升级将增强其AI能力。

| 属性 | 配置 |
|------|------|
| **助手ID** | interview |
| **显示名称** | Interview Assistant |
| **中文名称** | AI面试助手 |
| **服务对象** | HR专员、部门经理、面试官 |
| **核心功能** | 简历分析、面试策略生成、候选人评估、面试问题推荐 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| INTERVIEW_AI_MODEL | AI模型选择 | 指定使用的LLM模型 |
| INTERVIEW_KNOWLEDGE_BASE | 知识库ID | 面试题库和评估标准 |
| INTERVIEW_TEAMS_ENABLED | Teams集成开关 | 是否启用视频面试 |

**API端点**:

```typescript
// 面试助手API路由
interviewAssistant: router({
  // 分析简历
  analyzeResume: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .mutation(async ({ input }) => analyzeResume(input.candidateId)),
  
  // 生成面试策略
  generateStrategy: protectedProcedure
    .input(z.object({ candidateId: z.number(), positionId: z.number() }))
    .mutation(async ({ input }) => generateInterviewStrategy(input)),
  
  // 推荐面试问题
  recommendQuestions: protectedProcedure
    .input(z.object({ candidateId: z.number(), round: z.number() }))
    .query(async ({ input }) => recommendInterviewQuestions(input)),
  
  // 评估候选人
  evaluateCandidate: protectedProcedure
    .input(z.object({ candidateId: z.number(), feedback: z.any() }))
    .mutation(async ({ input }) => evaluateCandidate(input)),
})
```

### 3.2 Solution Assistant（方案设计助手）

方案设计助手是销售和技术团队的核心AI工具，用于快速生成清洗方案。

| 属性 | 配置 |
|------|------|
| **助手ID** | solution |
| **显示名称** | Solution Assistant |
| **中文名称** | AI方案设计助手 |
| **服务对象** | 销售工程师、技术工程师、项目经理 |
| **核心功能** | 历史案例匹配、方案智能推荐、工艺流程设计、设备选型建议 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| SOLUTION_AI_MODEL | AI模型选择 | 方案生成使用的LLM |
| SOLUTION_CASE_DB | 案例库连接 | 历史案例数据库 |
| SOLUTION_EQUIPMENT_API | 设备API | 设备规格查询接口 |
| SOLUTION_VECTOR_DB | 向量数据库 | 案例相似度匹配 |

**核心能力**:

1. **案例智能匹配** - 基于产品特征、清洁度要求、生产节拍等参数，从历史案例库中检索相似案例
2. **方案自动生成** - 根据客户需求和匹配案例，AI生成完整的清洗方案
3. **工艺流程优化** - 分析清洗工艺步骤，提供优化建议
4. **设备选型推荐** - 根据方案要求推荐最优设备配置

**API端点**:

```typescript
solutionAssistant: router({
  // 搜索相似案例
  searchCases: protectedProcedure
    .input(solutionSearchSchema)
    .query(async ({ input }) => searchSimilarCases(input)),
  
  // 生成方案推荐
  generateRecommendation: protectedProcedure
    .input(solutionRequestSchema)
    .mutation(async ({ input }) => generateSolutionRecommendation(input)),
  
  // 优化工艺流程
  optimizeProcess: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .mutation(async ({ input }) => optimizeProcessSteps(input)),
  
  // 设备选型建议
  recommendEquipment: protectedProcedure
    .input(equipmentRequirementsSchema)
    .query(async ({ input }) => recommendEquipment(input)),
})
```

### 3.3 Quotation Assistant（报价助手）

报价助手协助销售团队快速生成准确的项目报价。

| 属性 | 配置 |
|------|------|
| **助手ID** | quotation |
| **显示名称** | Quotation Assistant |
| **中文名称** | AI报价助手 |
| **服务对象** | 销售工程师、销售经理、财务专员 |
| **核心功能** | 成本估算、报价生成、利润分析、竞品对比 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| QUOTATION_AI_MODEL | AI模型选择 | 报价分析使用的LLM |
| QUOTATION_COST_DB | 成本数据库 | 材料和人工成本数据 |
| QUOTATION_MARGIN_RULES | 利润规则 | 不同客户/产品的利润率规则 |
| QUOTATION_COMPETITOR_DATA | 竞品数据 | 竞争对手报价参考 |

**核心能力**:

1. **智能成本估算** - 基于方案配置自动计算材料、人工、设备成本
2. **动态报价生成** - 根据客户类型、项目规模、市场行情生成报价
3. **利润分析** - 分析不同报价方案的利润率和风险
4. **竞品价格对比** - 对比竞争对手报价，提供定价建议

### 3.4 KPI Assistant（绩效助手）

绩效助手帮助HR和管理层进行绩效评估和人才发展规划。

| 属性 | 配置 |
|------|------|
| **助手ID** | kpi |
| **显示名称** | KPI Assistant |
| **中文名称** | AI绩效助手 |
| **服务对象** | HR经理、部门经理、员工 |
| **核心功能** | 绩效分析、目标建议、发展规划、薪酬建议 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| KPI_AI_MODEL | AI模型选择 | 绩效分析使用的LLM |
| KPI_BENCHMARK_DATA | 行业基准 | 行业绩效基准数据 |
| KPI_SALARY_RULES | 薪酬规则 | 绩效与薪酬关联规则 |

**核心能力**:

1. **绩效数据分析** - 分析员工绩效数据，识别趋势和异常
2. **目标设定建议** - 基于历史数据和行业基准，建议合理的KPI目标
3. **发展规划生成** - 根据绩效表现生成个人发展规划
4. **薪酬调整建议** - 基于绩效评估结果提供薪酬调整建议

### 3.5 Purchase Assistant（采购助手）

采购助手支持采购团队进行供应商管理和采购决策。

| 属性 | 配置 |
|------|------|
| **助手ID** | purchase |
| **显示名称** | Purchase Assistant |
| **中文名称** | AI采购助手 |
| **服务对象** | 采购专员、采购经理、供应链管理 |
| **核心功能** | 供应商评估、价格分析、交期预测、风险预警 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| PURCHASE_AI_MODEL | AI模型选择 | 采购分析使用的LLM |
| PURCHASE_SUPPLIER_DB | 供应商数据库 | 供应商信息和历史记录 |
| PURCHASE_MARKET_API | 市场行情API | 原材料价格行情 |
| PURCHASE_RISK_MODEL | 风险模型 | 供应链风险评估模型 |

**核心能力**:

1. **供应商智能评估** - 综合评估供应商的质量、价格、交期、服务
2. **价格趋势分析** - 分析原材料价格趋势，提供采购时机建议
3. **交期预测** - 基于历史数据预测供应商交货时间
4. **风险预警** - 识别供应链风险，提前预警

### 3.6 Planning Assistant系列（计划助手）

计划助手系列支持不同层级的计划制定和执行跟踪。

#### Planning Assistant 1 - 公司计划助手

| 属性 | 配置 |
|------|------|
| **助手ID** | planning_1 |
| **显示名称** | Planning Assistant 1 |
| **中文名称** | 公司计划助手 |
| **服务对象** | 总经理、总监、战略规划部 |
| **核心功能** | 年度战略规划、预算编制、资源配置、目标分解 |

**Secrets配置**:

| Secret Key | 描述 | 用途 |
|------------|------|------|
| PLANNING_1_AI_MODEL | AI模型选择 | 战略规划使用的LLM |
| PLANNING_1_MARKET_DATA | 市场数据 | 行业市场分析数据 |
| PLANNING_1_FINANCE_API | 财务接口 | 财务数据查询接口 |

#### Planning Assistant 2 - 部门计划助手

| 属性 | 配置 |
|------|------|
| **助手ID** | planning_2 |
| **显示名称** | Planning Assistant 2 |
| **中文名称** | 部门计划助手 |
| **服务对象** | 部门经理、主管 |
| **核心功能** | 部门目标制定、资源申请、进度跟踪、绩效汇报 |

#### Planning Assistant 3 - 事业部计划助手

| 属性 | 配置 |
|------|------|
| **助手ID** | planning_3 |
| **显示名称** | Planning Assistant 3 |
| **中文名称** | 事业部计划助手 |
| **服务对象** | 事业部总监、业务负责人 |
| **核心功能** | 业务线规划、市场策略、产品路线图、竞争分析 |

#### Planning Assistant 4 - 个人计划助手

| 属性 | 配置 |
|------|------|
| **助手ID** | planning_4 |
| **显示名称** | Planning Assistant 4 |
| **中文名称** | 个人计划助手 |
| **服务对象** | 全体员工 |
| **核心功能** | 个人目标设定、任务管理、学习规划、职业发展 |

---

## 4. Secrets配置管理

### 4.1 Secrets配置结构

所有AI助手的Secrets统一管理，采用分层配置：

```typescript
// shared/ai-assistant-secrets.ts
export interface AiAssistantSecrets {
  // 通用配置
  common: {
    LLM_API_KEY: string;           // LLM API密钥
    LLM_API_URL: string;           // LLM API地址
    LLM_DEFAULT_MODEL: string;     // 默认模型
    VECTOR_DB_URL: string;         // 向量数据库地址
    VECTOR_DB_KEY: string;         // 向量数据库密钥
  };
  
  // 各助手专属配置
  assistants: {
    interview: InterviewAssistantSecrets;
    solution: SolutionAssistantSecrets;
    quotation: QuotationAssistantSecrets;
    kpi: KpiAssistantSecrets;
    purchase: PurchaseAssistantSecrets;
    planning_1: PlanningAssistantSecrets;
    planning_2: PlanningAssistantSecrets;
    planning_3: PlanningAssistantSecrets;
    planning_4: PlanningAssistantSecrets;
  };
  
  // 角色数字助手配置
  agents: {
    sales: AgentSecrets;
    tech: AgentSecrets;
    pm: AgentSecrets;
    qa: AgentSecrets;
    hr: AgentSecrets;
    finance: AgentSecrets;
    production: AgentSecrets;
    procurement: AgentSecrets;
  };
}
```

### 4.2 环境变量清单

| 环境变量 | 描述 | 必填 | 默认值 |
|----------|------|------|--------|
| AI_ASSISTANT_LLM_KEY | LLM API密钥 | 是 | - |
| AI_ASSISTANT_LLM_URL | LLM API地址 | 是 | - |
| AI_ASSISTANT_LLM_MODEL | 默认LLM模型 | 否 | gpt-4 |
| AI_ASSISTANT_VECTOR_DB | 向量数据库地址 | 否 | - |
| AI_INTERVIEW_ENABLED | 面试助手开关 | 否 | true |
| AI_SOLUTION_ENABLED | 方案助手开关 | 否 | true |
| AI_QUOTATION_ENABLED | 报价助手开关 | 否 | true |
| AI_KPI_ENABLED | 绩效助手开关 | 否 | true |
| AI_PURCHASE_ENABLED | 采购助手开关 | 否 | true |
| AI_PLANNING_ENABLED | 计划助手开关 | 否 | true |

---

## 5. 数据库Schema设计

### 5.1 AI助手配置表

```sql
CREATE TABLE ai_assistant_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assistant_id VARCHAR(50) UNIQUE NOT NULL COMMENT '助手ID',
    display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
    description TEXT COMMENT '助手描述',
    is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    model_config JSON COMMENT 'LLM模型配置',
    knowledge_base_id VARCHAR(100) COMMENT '知识库ID',
    system_prompt TEXT COMMENT '系统提示词',
    max_tokens INT DEFAULT 4096 COMMENT '最大Token数',
    temperature DECIMAL(3,2) DEFAULT 0.7 COMMENT '温度参数',
    allowed_roles JSON COMMENT '允许使用的角色列表',
    rate_limit INT DEFAULT 100 COMMENT '每小时请求限制',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assistant_id (assistant_id),
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI助手配置表';
```

### 5.2 AI助手调用日志表

```sql
CREATE TABLE ai_assistant_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assistant_id VARCHAR(50) NOT NULL COMMENT '助手ID',
    user_id INT NOT NULL COMMENT '用户ID',
    session_id VARCHAR(100) COMMENT '会话ID',
    request_type VARCHAR(50) COMMENT '请求类型',
    input_params JSON COMMENT '输入参数',
    output_result JSON COMMENT '输出结果',
    model_used VARCHAR(100) COMMENT '使用的模型',
    tokens_input INT COMMENT '输入Token数',
    tokens_output INT COMMENT '输出Token数',
    response_time_ms INT COMMENT '响应时间(毫秒)',
    status ENUM('success', 'error', 'timeout') DEFAULT 'success',
    error_message TEXT COMMENT '错误信息',
    user_feedback ENUM('helpful', 'not_helpful', 'incorrect') COMMENT '用户反馈',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assistant (assistant_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI助手调用日志表';
```

### 5.3 AI知识库表

```sql
CREATE TABLE ai_knowledge_bases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    knowledge_base_id VARCHAR(100) UNIQUE NOT NULL COMMENT '知识库ID',
    name VARCHAR(200) NOT NULL COMMENT '知识库名称',
    description TEXT COMMENT '知识库描述',
    assistant_ids JSON COMMENT '关联的助手ID列表',
    document_count INT DEFAULT 0 COMMENT '文档数量',
    vector_count INT DEFAULT 0 COMMENT '向量数量',
    last_sync_at TIMESTAMP COMMENT '最后同步时间',
    status ENUM('active', 'syncing', 'error') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kb_id (knowledge_base_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI知识库表';
```

---

## 6. 前端组件设计

### 6.1 AI助手统一入口

```tsx
// client/src/components/AiAssistantHub.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, FileText, Calculator, Target, 
  ShoppingCart, Calendar, User 
} from "lucide-react";

const AI_ASSISTANTS = [
  { id: "interview", name: "面试助手", icon: User, color: "blue" },
  { id: "solution", name: "方案设计助手", icon: FileText, color: "green" },
  { id: "quotation", name: "报价助手", icon: Calculator, color: "orange" },
  { id: "kpi", name: "绩效助手", icon: Target, color: "purple" },
  { id: "purchase", name: "采购助手", icon: ShoppingCart, color: "red" },
  { id: "planning", name: "计划助手", icon: Calendar, color: "cyan" },
];

export function AiAssistantHub() {
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {AI_ASSISTANTS.map((assistant) => (
        <Card 
          key={assistant.id}
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setSelectedAssistant(assistant.id)}
        >
          <CardHeader className="pb-2">
            <assistant.icon className="w-8 h-8 text-primary" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">{assistant.name}</CardTitle>
            <Badge variant="outline" className="mt-2">AI助手</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 6.2 AI助手对话界面

每个AI助手复用统一的对话组件，通过配置差异化：

```tsx
// client/src/components/AiAssistantChat.tsx
interface AiAssistantChatProps {
  assistantId: string;
  assistantName: string;
  systemPrompt?: string;
  contextData?: any;
}

export function AiAssistantChat({ 
  assistantId, 
  assistantName,
  systemPrompt,
  contextData 
}: AiAssistantChatProps) {
  // 复用AIChatBox组件，传入助手特定配置
  return (
    <AIChatBox
      title={assistantName}
      placeholder={`向${assistantName}提问...`}
      systemPrompt={systemPrompt}
      contextData={contextData}
      onSend={(message) => sendToAssistant(assistantId, message)}
    />
  );
}
```

---

## 7. 实施计划

### 7.1 阶段一：基础架构（2周）

| 任务 | 工时 | 负责方 |
|------|------|--------|
| AI助手配置表设计和实现 | 4h | Claude Code |
| AI助手调用日志表实现 | 4h | Claude Code |
| AI知识库表实现 | 4h | Claude Code |
| 统一API网关设计 | 8h | Claude Code |
| Secrets配置管理 | 4h | Claude Code |
| 单元测试 | 8h | Claude Code |

### 7.2 阶段二：核心助手（4周）

| 任务 | 工时 | 负责方 |
|------|------|--------|
| Interview Assistant增强 | 16h | Claude Code |
| Solution Assistant实现 | 24h | Claude Code |
| Quotation Assistant实现 | 20h | Claude Code |
| KPI Assistant实现 | 16h | Claude Code |
| Purchase Assistant实现 | 16h | Claude Code |
| 前端组件开发 | 24h | Claude Code |

### 7.3 阶段三：计划助手（2周）

| 任务 | 工时 | 负责方 |
|------|------|--------|
| Planning Assistant 1-4实现 | 32h | Claude Code |
| 计划模板和知识库 | 16h | Claude Code |
| 集成测试 | 8h | Claude Code |

### 7.4 阶段四：角色数字助手（2周）

| 任务 | 工时 | 负责方 |
|------|------|--------|
| 8个角色数字助手配置 | 24h | Claude Code |
| 角色专属知识库 | 16h | Claude Code |
| 权限集成 | 8h | Claude Code |

---

## 8. 附录

### 8.1 AI助手ID命名规范

- 核心助手：`{功能名称}` 如 `interview`, `solution`
- 计划助手：`planning_{序号}` 如 `planning_1`, `planning_2`
- 角色助手：`{角色}_agent` 如 `sales_agent`, `tech_agent`

### 8.2 相关文档

- [AI方案设计系统规格](./dev-specs/v2.0-core-business/module1-ai-solution-design.md)
- [权限架构设计](./permission-architecture-design.md)
- [HRM智能系统规格](./dev-specs/hrm-intelligent-system-spec.md)

---

**文档结束**

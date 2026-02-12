# Claude Code + NocoBase 技术规范

## 一、概述

本文档定义了在NocoBase架构中使用Claude Code实现GRT智能系统AI助手功能的技术规范，确保开发过程的一致性和可维护性。

**文档版本**：v2.1  
**体系编号**：GRT-SPEC-AI-2026-001  
**更新日期**：2026-01-18  
**审核状态**：已批准

---

## 二、AI助手双层体系架构

GRT智能系统采用双层AI助手体系架构，包括员工数字助手（DA）和功能型AI助手两个层面。

### 2.1 第一层：员工数字助手（DA）

每个员工可配置专属的数字助手，命名规则为 `{员工号}-DA`。

#### 2.1.1 命名规范

| 员工类型 | 员工号格式 | DA命名示例 | 说明 |
|----------|------------|------------|------|
| 普通员工 | E001, E002 | E001-DA, E002-DA | 通用员工数字助手 |
| 项目经理 | PM001, PM002 | PM001-DA, PM002-DA | 项目管理专属助手 |
| 销售人员 | SA001, SA002 | SA001-DA, SA002-DA | 销售支持专属助手 |
| 技术工程师 | TE001, TE002 | TE001-DA, TE002-DA | 技术支持专属助手 |
| 质量工程师 | QE001, QE002 | QE001-DA, QE002-DA | 质量管理专属助手 |

#### 2.1.2 DA功能配置

```typescript
interface EmployeeDigitalAssistant {
  // 基本信息
  employeeId: string;           // 员工号
  assistantCode: string;        // DA代码（自动生成：{employeeId}-DA）
  displayName: string;          // 显示名称
  
  // 个性化配置
  learningData: {
    workHabits: object;         // 工作习惯
    preferences: object;        // 偏好设置
    expertise: string[];        // 专业领域
    communicationStyle: string; // 沟通风格
  };
  
  // 能力配置
  capabilities: {
    taskAssist: boolean;        // 任务辅助
    scheduleManage: boolean;    // 日程管理
    documentDraft: boolean;     // 文档起草
    dataAnalysis: boolean;      // 数据分析
    communicationProxy: boolean;// 沟通代理
  };
  
  // 状态
  isActive: boolean;
  lastActiveAt: Date;
}
```

### 2.2 第二层：功能型AI助手

无真实员工的岗位设定功能型AI助手，按功能命名。

#### 2.2.1 命名规范

| 助手类型 | 英文标识 | 中文名称 | 功能定位 |
|----------|----------|----------|----------|
| solution | AI Solution Assistant | AI方案助手 | 方案设计和解决方案推荐 |
| quotation | AI Quotation Assistant | AI报价助手 | 报价生成和成本分析 |
| planning | AI Planning Assistant | AI规划助手 | 工作计划、培训计划、客户拜访计划 |
| kpi | AI KPI Assistant | AI绩效助手 | 绩效评估、实时评分、沟通建议 |
| interview | AI Interview Assistant | AI面试助手 | 面试评估和候选人分析 |
| purchase | AI Purchase Assistant | AI采购助手 | 采购管理和供应商协调 |
| engineering | AI Engineering Assistant | AI工程助手 | M0-M12项目全生命周期管理 |
| quality | AI Quality Assistant | AI质量助手 | 质量检验和问题分析 |

#### 2.2.2 功能型助手配置

```typescript
interface FunctionalAiAssistant {
  // 基本信息
  assistantType: AssistantType;  // 助手类型枚举
  assistantCode: string;         // 助手代码（如 AI Solution Assistant）
  displayName: string;           // 显示名称
  description: string;           // 功能描述
  
  // LLM配置
  systemPrompt: string;          // 系统提示词
  temperature: number;           // 温度参数（0-1）
  maxTokens: number;             // 最大Token数
  
  // 能力配置
  capabilities: {
    dataAccess: string[];        // 可访问的数据范围
    actions: string[];           // 可执行的动作
    integrations: string[];      // 集成的外部系统
  };
  
  // 状态
  isActive: boolean;
  version: string;
}

// 助手类型枚举
enum AssistantType {
  SOLUTION = 'solution',
  QUOTATION = 'quotation',
  PLANNING = 'planning',
  KPI = 'kpi',
  INTERVIEW = 'interview',
  PURCHASE = 'purchase',
  ENGINEERING = 'engineering',
  QUALITY = 'quality',
}
```

---

## 三、AI建议流程集成系统

在整个系统流程中集成AI建议功能，提供三种建议模式，以淡色显示不干扰主流程。

### 3.1 建议模式定义

| 模式 | 标识 | 功能说明 | 触发方式 |
|------|------|----------|----------|
| **AI全过程建议** | full_process | 显示后续所有流程的AI智能助手建议 | 点击"AI全过程建议"按钮 |
| **本过程AI建议** | current_step | 当前流程步骤的AI工作内容建议 | 自动显示或点击"本过程建议"按钮 |
| **单步AI执行** | single_action | 执行到某一步时的AI智能助手工作 | 点击"AI执行"按钮 |

### 3.2 UI组件规范

#### 3.2.1 AI建议面板样式

```css
/* AI建议面板 - 淡色显示 */
.ai-suggestion-panel {
  background-color: rgba(var(--primary-rgb), 0.05);
  border-left: 3px solid rgba(var(--primary-rgb), 0.3);
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

/* AI建议标题 */
.ai-suggestion-title {
  color: rgba(var(--primary-rgb), 0.7);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* AI建议内容 */
.ai-suggestion-content {
  color: var(--muted-foreground);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* AI建议按钮组 */
.ai-suggestion-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.ai-suggestion-button {
  background-color: rgba(var(--primary-rgb), 0.1);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  color: var(--primary);
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-suggestion-button:hover {
  background-color: rgba(var(--primary-rgb), 0.2);
}
```

#### 3.2.2 按钮布局规范

```typescript
interface AISuggestionButtonGroup {
  buttons: [
    {
      id: 'full_process',
      label: 'AI全过程建议',
      icon: 'Sparkles',
      tooltip: '查看后续所有流程的AI建议',
    },
    {
      id: 'current_step',
      label: '本过程建议',
      icon: 'Lightbulb',
      tooltip: '查看当前步骤的AI建议',
    },
    {
      id: 'single_action',
      label: 'AI执行',
      icon: 'Play',
      tooltip: '执行AI智能助手工作',
    },
  ];
}
```

### 3.3 API接口规范

```typescript
// AI流程建议路由
export const aiProcessSuggestionRouter = router({
  // 获取全过程AI建议
  getFullProcessSuggestions: protectedProcedure
    .input(z.object({
      processType: z.enum(['project', 'crm', 'hrm', 'cost', 'training']),
      processId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // 返回从当前步骤到流程结束的所有AI建议
      return {
        currentStep: string,
        suggestions: Array<{
          stepCode: string;
          stepName: string;
          assistantType: string;
          suggestionContent: string;
          priority: 'high' | 'medium' | 'low';
          estimatedTime: number; // 分钟
        }>,
      };
    }),
  
  // 获取当前步骤AI建议
  getCurrentStepSuggestion: protectedProcedure
    .input(z.object({
      processType: z.string(),
      processId: z.string(),
      stepCode: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // 返回当前步骤的详细AI建议
      return {
        stepCode: string,
        stepName: string,
        assistantType: string,
        suggestion: {
          summary: string;
          details: string[];
          actions: Array<{
            actionId: string;
            actionName: string;
            description: string;
          }>;
          references: Array<{
            type: string;
            title: string;
            url: string;
          }>;
        },
      };
    }),
  
  // 执行单步AI任务
  executeSingleAction: protectedProcedure
    .input(z.object({
      processType: z.string(),
      processId: z.string(),
      stepCode: z.string(),
      actionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 执行AI任务并返回结果
      return {
        success: boolean,
        result: object,
        nextSuggestion: string,
      };
    }),
});
```

### 3.4 AI执行模式选择

在AI建议执行过程中，用户可以选择两种执行模式：**系统内AI**和**泛互式AI**。

#### 3.4.1 执行模式定义

| 模式 | 英文标识 | 特点 | 适用场景 |
|------|----------|------|----------|
| **系统内AI** | `internal` | 轻度AI，基于现有案例库和AI化成果，快速响应，结果可预测 | 日常任务、标准流程、快速查询 |
| **泛互式AI** | `generative` | 泛化式广泛分析，深度推理，创新建议 | 复杂决策、方案设计、战略规划 |

#### 3.4.2 模式对比

| 维度 | 系统内AI (Internal) | 泛互式AI (Generative) |
|------|---------------------|----------------------|
| **知识来源** | 案例库、历史数据、SOP文档 | LLM通用知识 + 案例库 |
| **提示词策略** | 结构化模板、固定格式输出 | 开放式推理、创新建议 |
| **响应时间** | <2秒 | 5-30秒 |
| **Token消耗** | 低（500-1000） | 高（2000-8000） |
| **结果特点** | 标准化、可预测、一致性高 | 创新性、多样化、深度分析 |
| **成本** | 低 | 较高 |

#### 3.4.3 数据库Schema

```typescript
// AI执行模式配置表
export const aiExecutionModeConfigs = mysqlTable('ai_execution_mode_configs', {
  id: int().autoincrement().primaryKey(),
  assistantType: varchar({ length: 64 }).notNull(),  // 助手类型
  defaultMode: mysqlEnum(['internal', 'generative']).default('internal').notNull(),
  internalPrompt: text(),                            // 系统内AI提示词
  generativePrompt: text(),                          // 泛互式AI提示词
  internalKnowledgeSources: json(),                  // 系统内AI知识源
  generativeModelConfig: json(),                     // 泛互式AI模型配置
  isEnabled: tinyint().default(1).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().onUpdateNow().notNull(),
});

// AI执行日志表（用于效果追踪）
export const aiExecutionLogs = mysqlTable('ai_execution_logs', {
  id: int().autoincrement().primaryKey(),
  sessionId: varchar({ length: 64 }).notNull(),      // 会话ID
  assistantType: varchar({ length: 64 }).notNull(),  // 助手类型
  executionMode: mysqlEnum(['internal', 'generative']).notNull(),
  userId: int(),                                     // 用户ID
  inputContent: text(),                              // 输入内容
  outputContent: text(),                             // 输出内容
  responseTimeMs: int(),                             // 响应时间(毫秒)
  tokenUsage: json(),                                // Token使用量
  isAdopted: tinyint(),                              // 是否被采纳
  adoptionFeedback: text(),                          // 采纳反馈
  effectivenessScore: decimal({ precision: 3, scale: 2 }), // 效果评分(0-1)
  createdAt: timestamp().defaultNow().notNull(),
});
```

#### 3.4.4 API接口规范

```typescript
// AI执行模式路由
export const aiExecutionModeRouter = router({
  // 获取助手的执行模式配置
  getModeConfig: publicProcedure
    .input(z.object({ assistantType: z.string() }))
    .query(async ({ input }) => { ... }),
  
  // 执行AI请求（支持模式选择）
  execute: protectedProcedure
    .input(z.object({
      assistantType: z.string(),
      mode: z.enum(['internal', 'generative']),
      content: z.string(),
      context: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 根据模式选择不同的执行策略
      if (input.mode === 'internal') {
        // 系统内AI：使用案例库和结构化模板
        return executeInternalAI(input);
      } else {
        // 泛互式AI：使用LLM深度分析
        return executeGenerativeAI(input);
      }
    }),
  
  // 记录采纳反馈
  recordAdoption: protectedProcedure
    .input(z.object({
      executionLogId: z.number(),
      isAdopted: z.boolean(),
      feedback: z.string().optional(),
      effectivenessScore: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => { ... }),
  
  // 获取效果统计
  getEffectivenessStats: protectedProcedure
    .input(z.object({
      assistantType: z.string().optional(),
      mode: z.enum(['internal', 'generative']).optional(),
      dateRange: z.object({
        start: z.date(),
        end: z.date(),
      }).optional(),
    }))
    .query(async ({ input }) => { ... }),
});
```

#### 3.4.5 UI组件规范

```tsx
// 模式选择下拉菜单
<Select value={executionMode} onValueChange={setExecutionMode}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="选择AI模式" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="internal">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        <span>系统内AI</span>
        <Badge variant="secondary" className="text-xs">快速</Badge>
      </div>
    </SelectItem>
    <SelectItem value="generative">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <span>泛互式AI</span>
        <Badge variant="outline" className="text-xs">深度</Badge>
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

#### 3.4.6 各助手默认模式配置

| 助手类型 | 默认模式 | 系统内AI场景 | 泛互式AI场景 |
|----------|----------|--------------|---------------|
| Solution Assistant | internal | 标准方案推荐 | 创新方案设计 |
| Quotation Assistant | internal | 标准报价生成 | 复杂项目报价 |
| Planning Assistant | internal | 日常计划生成 | 战略规划制定 |
| KPI Assistant | internal | 日常绩效查询 | 深度绩效分析 |
| Interview Assistant | generative | - | 候选人深度评估 |
| Purchase Assistant | internal | 标准采购流程 | 供应商战略分析 |
| Engineering Assistant | internal | 阶段任务分配 | 技术方案评审 |
| Quality Assistant | internal | 标准质检流程 | 质量问题根因分析 |

---

## 四、功能型AI助手详细规范

### 4.1 AI方案助手（AI Solution Assistant）

#### 4.1.1 学习功能

```typescript
interface SolutionLearningConfig {
  // 优先学习GRT内部方案
  prioritySource: 'grt_internal' | 'industry' | 'competitor';
  
  // 学习数据来源
  learningSources: {
    historicalProjects: boolean;      // 历史项目
    deliveredEquipment: boolean;      // 已交付设备
    customerFeedback: boolean;        // 客户反馈
    industryBenchmarks: boolean;      // 行业基准
  };
  
  // 关联字段
  linkFields: {
    equipmentModel: string;           // 设备型号
    projectNo: string;                // 项目号
    customerName: string;             // 客户名称
  };
}
```

#### 4.1.2 推荐功能

```typescript
interface SolutionRecommendInput {
  // 必填参数
  product: string;                    // 产品/工件类型
  cleanlinessLevel: string;           // 清洁度等级
  cycleTime: number;                  // 节拍时间（秒）
  loadingUnloadingForm: string;       // 上下料形式
  
  // 可选参数
  workpieceDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  specialRequirements?: string[];     // 特殊要求
  budgetRange?: {
    min: number;
    max: number;
  };
}

interface SolutionRecommendOutput {
  recommendations: Array<{
    solutionId: string;
    solutionName: string;
    sourceType: 'grt_internal' | 'industry' | 'competitor';
    sourceNote?: string;              // 来源备注（同行方案必填）
    matchScore: number;               // 匹配度 0-100
    processFlow: string[];            // 工艺流程
    estimatedCycleTime: number;       // 预估节拍
    equipmentModels: string[];        // 推荐设备型号
    successRate: number;              // 历史成功率
  }>;
  
  analysisReport: {
    keyFactors: string[];             // 关键因素分析
    riskWarnings: string[];           // 风险提示
    optimizationSuggestions: string[];// 优化建议
  };
}
```

### 4.2 AI报价助手（AI Quotation Assistant）

#### 4.2.1 成本计算规范

```typescript
interface CostCalculationConfig {
  // 年度固定成本（管理员设置）
  annualFixedCosts: {
    laborHourRate: number;            // 工时费率
    overheadRate: number;             // 管理费率
    sharedCostRate: number;           // 共享成本费率
    lastUpdated: Date;
    updatedBy: string;
  };
  
  // 成本调整权限
  adjustmentPermissions: {
    adminCanAdjust: boolean;
    adjustmentRequiresApproval: boolean;
  };
}

interface QuotationInput {
  solutionId: string;                 // 关联方案
  customerType: 'OEM' | 'Tier1' | 'Tier2' | 'EndUser';
  quantity: number;                   // 数量
  deliveryRequirements: {
    deadline: Date;
    location: string;
    installationIncluded: boolean;
  };
}
```

### 4.3 AI规划助手（AI Planning Assistant）

#### 4.3.1 输入数据源

```typescript
interface PlanningInputSources {
  // 公司计划
  companyPlans: {
    annual: string;                   // 年度计划
    quarterly: string;                // 季度计划
    monthly: string;                  // 月度计划
  };
  
  // 客户相关
  customerData: {
    feedback: string[];               // 客户反馈
    visitHistory: object[];           // 拜访记录
  };
  
  // 项目相关
  projectData: {
    preAcceptanceOPL: object[];       // 预验收OPL清单
    acceptanceOPL: object[];          // 验收OPL清单
    executionStatus: object[];        // 执行状态
  };
  
  // 内部管理
  internalData: {
    meetingMinutes: object[];         // 会议纪要
    supervisorAssignments: object[];  // 主管分配
    kpiStatus: object[];              // KPI状态
    unfinishedPlans: object[];        // 未完成计划
  };
}
```

#### 4.3.2 计划输出格式

```typescript
interface PlanOutput {
  planType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  planCategory: 'work' | 'training' | 'customerVisit';
  
  items: Array<{
    id: string;
    title: string;
    description: string;
    assignee: string;
    deadline: Date;
    priority: 'high' | 'medium' | 'low';
    relatedInputs: string[];          // 关联的输入来源
  }>;
  
  // 实时跟踪
  tracking: {
    updateSources: string[];          // 更新来源
    lastUpdated: Date;
    completionRate: number;
  };
}
```

### 4.4 AI绩效助手（AI KPI Assistant）

#### 4.4.1 评估功能

```typescript
interface KPIAssessment {
  // 评估维度
  dimensions: {
    timeliness: number;               // 及时性
    quality: number;                  // 质量
    efficiency: number;               // 效率
    collaboration: number;            // 协作
  };
  
  // 评分周期
  scoringPeriods: {
    daily: number;
    weekly: number;
    monthly: number;
    annual: number;
    currentDay: number;
  };
  
  // 评估依据
  assessmentBasis: string[];
}
```

#### 4.4.2 沟通建议功能

```typescript
interface CommunicationSuggestion {
  targetRole: string;                 // 目标角色
  suggestedTime: Date;                // 建议沟通时间
  suggestedContent: string;           // 建议沟通内容
  
  // 邮件草稿
  emailDraft: {
    to: string[];                     // 收件人
    cc: string[];                     // 抄送（主管）
    subject: string;
    body: string;
    requiresApproval: boolean;        // 是否需要审批
  };
  
  // 跟踪
  tracking: {
    communicationRecorded: boolean;
    improvementEffect: string;
  };
}
```

#### 4.4.3 提醒功能

```typescript
interface ReminderConfig {
  // 无需审批的提醒类型
  noApprovalRequired: [
    'routine_task_reminder',          // 常规任务提醒
    'deadline_warning',               // 截止日期预警
    'meeting_reminder',               // 会议提醒
    'daily_summary'                   // 每日总结
  ];
  
  // 需要审批的提醒类型
  approvalRequired: [
    'performance_feedback',           // 绩效反馈
    'improvement_suggestion',         // 改进建议
    'escalation_notice'               // 升级通知
  ];
}
```

---

## 五、NocoBase集成规范

### 5.1 数据模型设计

#### 5.1.1 Collection命名规范

```
grt_employee_digital_assistants   # 员工数字助手
grt_functional_ai_assistants      # 功能型AI助手
grt_ai_process_suggestions        # AI流程建议
grt_ai_solutions                  # AI方案库
grt_ai_quotations                 # AI报价库
grt_ai_plans                      # AI计划库
grt_ai_kpi_assessments            # AI KPI评估
grt_ai_learning_records           # AI学习记录
grt_ai_communication_logs         # AI沟通记录
```

#### 5.1.2 字段命名规范

| 规范 | 说明 | 示例 |
|------|------|------|
| 小写字母和下划线 | 所有字段名使用snake_case | employee_id, created_at |
| 布尔字段前缀 | 以 `is_` 或 `has_` 开头 | is_active, has_permission |
| 时间字段后缀 | 以 `_at` 结尾 | created_at, updated_at |
| ID字段后缀 | 以 `_id` 结尾 | employee_id, project_id |
| 代码字段后缀 | 以 `_code` 结尾 | assistant_code, step_code |

### 5.2 工作流集成

#### 5.2.1 触发器定义

```yaml
# AI建议触发器
trigger:
  collection: grt_projects
  event: afterUpdate
  condition: "status_changed && new_status in ['M1', 'M2', 'M3', ...]"
  
action:
  type: ai_suggestion
  config:
    mode: current_step
    assistantType: engineering
```

#### 5.2.2 审批流程模板

```yaml
ai_suggestion_approval_workflow:
  name: AI建议审批流程
  steps:
    - id: ai_generate
      name: AI生成建议
      type: automatic
      
    - id: human_review
      name: 人工审核
      assignee: process_owner
      timeout: 24h
      
    - id: apply_suggestion
      name: 应用建议
      type: automatic
      condition: "approved == true"
```

### 5.3 API集成规范

#### 5.3.1 RESTful API端点

```
# 员工DA管理
POST   /api/ai/employee-da/create          # 创建员工DA
GET    /api/ai/employee-da/:employeeId     # 获取员工DA
PUT    /api/ai/employee-da/:id             # 更新员工DA
DELETE /api/ai/employee-da/:id             # 删除员工DA

# 功能型助手管理
GET    /api/ai/functional-assistants       # 获取所有功能型助手
GET    /api/ai/functional-assistants/:type # 获取指定类型助手
PUT    /api/ai/functional-assistants/:id   # 更新助手配置

# AI流程建议
GET    /api/ai/suggestions/full-process    # 获取全过程建议
GET    /api/ai/suggestions/current-step    # 获取当前步骤建议
POST   /api/ai/suggestions/execute         # 执行单步AI任务

# 原有助手API
POST   /api/ai/solutions/recommend         # 方案推荐
POST   /api/ai/solutions/learn             # 方案学习
POST   /api/ai/quotations/generate         # 生成报价
POST   /api/ai/plans/generate              # 生成计划
GET    /api/ai/kpi/assessment              # KPI评估
POST   /api/ai/kpi/communicate             # 沟通建议
```

#### 5.3.2 错误处理规范

```typescript
interface APIError {
  code: string;                       // 错误代码
  message: string;                    // 错误消息
  details?: object;                   // 详细信息
  timestamp: string;                  // 时间戳
  requestId: string;                  // 请求ID
}

// 错误代码规范
const ErrorCodes = {
  AI_001: 'LLM调用失败',
  AI_002: '方案匹配失败',
  AI_003: '数据验证失败',
  AI_004: '权限不足',
  AI_005: '资源不存在',
  AI_006: '员工DA不存在',
  AI_007: '功能型助手配置错误',
  AI_008: 'AI建议生成失败',
};
```

---

## 六、Claude Code开发规范

### 6.1 代码组织结构

```
nocobase-grt/
├── packages/
│   └── plugins/
│       └── @grt/ai-assistant/
│           ├── src/
│           │   ├── server/
│           │   │   ├── actions/           # API动作
│           │   │   │   ├── employeeDA.ts
│           │   │   │   ├── functionalAssistant.ts
│           │   │   │   └── processSuggestion.ts
│           │   │   ├── services/          # 业务服务
│           │   │   │   ├── employeeDAService.ts
│           │   │   │   ├── suggestionService.ts
│           │   │   │   └── llmService.ts
│           │   │   ├── models/            # 数据模型
│           │   │   └── utils/             # 工具函数
│           │   ├── client/
│           │   │   ├── components/        # React组件
│           │   │   │   ├── AISuggestionPanel.tsx
│           │   │   │   ├── AISuggestionButton.tsx
│           │   │   │   └── EmployeeDAConfig.tsx
│           │   │   ├── hooks/             # 自定义Hooks
│           │   │   │   └── useAISuggestion.ts
│           │   │   └── pages/             # 页面组件
│           │   └── locale/                # 国际化
│           ├── package.json
│           └── README.md
```

### 6.2 TypeScript规范

```typescript
// 1. 使用严格模式
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// 2. 接口定义规范
interface IEmployeeDAService {
  create(input: CreateEmployeeDAInput): Promise<EmployeeDigitalAssistant>;
  getByEmployee(employeeId: string): Promise<EmployeeDigitalAssistant | null>;
  update(id: number, input: UpdateEmployeeDAInput): Promise<EmployeeDigitalAssistant>;
  delete(id: number): Promise<void>;
}

interface IAISuggestionService {
  getFullProcessSuggestions(input: FullProcessInput): Promise<FullProcessOutput>;
  getCurrentStepSuggestion(input: CurrentStepInput): Promise<CurrentStepOutput>;
  executeSingleAction(input: SingleActionInput): Promise<SingleActionOutput>;
}

// 3. 错误处理规范
class AIServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: object
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
```

### 6.3 测试规范

```typescript
// 使用vitest框架
import { describe, it, expect, beforeEach } from 'vitest';

describe('EmployeeDAService', () => {
  let service: EmployeeDAService;
  
  beforeEach(() => {
    service = new EmployeeDAService();
  });
  
  describe('create', () => {
    it('should generate correct DA code from employee ID', async () => {
      const result = await service.create({
        employeeId: 'E001',
        displayName: '张三的数字助手',
      });
      
      expect(result.assistantCode).toBe('E001-DA');
    });
  });
});

describe('AISuggestionService', () => {
  let service: AISuggestionService;
  
  beforeEach(() => {
    service = new AISuggestionService();
  });
  
  describe('getFullProcessSuggestions', () => {
    it('should return suggestions for all remaining steps', async () => {
      const result = await service.getFullProcessSuggestions({
        processType: 'project',
        processId: 'GRT-2026-001',
      });
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toHaveProperty('stepCode');
      expect(result.suggestions[0]).toHaveProperty('suggestionContent');
    });
  });
});
```

---

## 七、版本控制规范

### 7.1 版本号规范

采用语义化版本号：`MAJOR.MINOR.PATCH`

| 版本类型 | 变更类型 | 示例 |
|----------|----------|------|
| **MAJOR** | 不兼容的API变更、重大架构调整 | 1.0.0 → 2.0.0 |
| **MINOR** | 向后兼容的功能新增 | 1.0.0 → 1.1.0 |
| **PATCH** | 向后兼容的问题修复 | 1.0.0 → 1.0.1 |

### 7.2 体系编号规范

```
GRT-SPEC-{模块}-{年份}-{序号}

示例：
GRT-SPEC-AI-2026-001    # AI助手技术规范第1版
GRT-SPEC-CRM-2026-001   # CRM模块技术规范第1版
GRT-SPEC-PM-2026-001    # 项目管理技术规范第1版
```

### 7.3 变更管理流程

```
需求提出 → 技术评估 → 评审确认 → 开发实现 → 测试验证 → 版本发布
    │           │           │           │           │           │
    ↓           ↓           ↓           ↓           ↓           ↓
  RFC文档    评估报告    评审记录    代码提交    测试报告    发布记录
```

---

## 八、安全规范

### 8.1 数据安全

| 安全措施 | 说明 |
|----------|------|
| 敏感数据加密 | 员工个人信息、AI学习数据加密存储 |
| API认证 | 所有API调用需要JWT认证 |
| 日志脱敏 | 日志中不记录敏感信息 |
| 数据隔离 | 员工DA数据按员工隔离访问 |

### 8.2 访问控制

```typescript
// 角色权限定义
const Permissions = {
  // 员工DA权限
  EMPLOYEE_DA_READ: 'ai:employee-da:read',
  EMPLOYEE_DA_WRITE: 'ai:employee-da:write',
  EMPLOYEE_DA_ADMIN: 'ai:employee-da:admin',
  
  // 功能型助手权限
  FUNCTIONAL_ASSISTANT_READ: 'ai:functional:read',
  FUNCTIONAL_ASSISTANT_CONFIG: 'ai:functional:config',
  
  // AI建议权限
  SUGGESTION_VIEW: 'ai:suggestion:view',
  SUGGESTION_EXECUTE: 'ai:suggestion:execute',
  
  // 原有权限
  SOLUTION_READ: 'ai:solution:read',
  SOLUTION_WRITE: 'ai:solution:write',
  SOLUTION_APPROVE: 'ai:solution:approve',
  QUOTATION_READ: 'ai:quotation:read',
  QUOTATION_WRITE: 'ai:quotation:write',
  KPI_READ: 'ai:kpi:read',
  KPI_ASSESS: 'ai:kpi:assess',
};
```

---

## 九、流程笔记系统（Process Notebook）

GRT智能系统在每个业务流程中集成笔记系统，支持多媒体内容记录和AI智能识别建议。

### 9.1 系统架构

流程笔记系统采用左右分栏布局：

| 区域 | 功能 | 说明 |
|------|------|------|
| 左侧：员工Notebook | 多媒体内容记录 | 支持文字、文件、图片、语音 |
| 右侧：AI识别建议 | 智能关联建议 | 显示确认更换按钮 |

### 9.2 左侧Notebook功能

#### 9.2.1 支持的内容类型

```typescript
type NotebookEntryType = 'text' | 'file' | 'image' | 'voice';

interface NotebookEntry {
  id: string;
  notebookId: string;
  entryType: NotebookEntryType;
  
  // 文本内容
  content?: string;           // 富文本HTML
  
  // 文件附录
  fileUrl?: string;           // S3文件路径
  fileName?: string;          // 原始文件名
  fileType?: string;          // MIME类型
  fileSize?: number;          // 文件大小
  
  // 图片
  imageUrl?: string;          // 图片URL
  ocrResult?: string;         // OCR识别结果
  
  // 语音
  voiceUrl?: string;          // 语音文件URL
  voiceDuration?: number;     // 语音时长（秒）
  voiceTranscript?: string;   // 语音转文字结果
  
  // 元数据
  createdBy: string;
  createdAt: Date;
  isAiProcessed: boolean;
}
```

#### 9.2.2 文件上传规范

| 文件类型 | 支持格式 | 大小限制 | 处理方式 |
|----------|----------|----------|----------|
| 文档 | PDF, Word, Excel, TXT | 50MB | 文本提取 |
| 图片 | JPG, PNG, GIF, WebP | 20MB | OCR识别 |
| 语音 | MP3, WAV, M4A, WebM | 50MB | ASR转写 |

### 9.3 右侧AI识别建议

#### 9.3.1 建议类型

```typescript
type SuggestionType = 
  | 'field_update'    // 字段更新建议
  | 'process_link'    // 流程关联建议
  | 'content_match';  // 已记录内容匹配

interface AiNotebookSuggestion {
  id: string;
  entryId: string;
  suggestionType: SuggestionType;
  
  // 目标信息
  targetProcessType: string;   // 目标流程类型
  targetProcessId: string;     // 目标流程ID
  targetField: string;         // 目标字段名
  
  // 建议内容
  currentValue: string;        // 当前值
  suggestedValue: string;      // 建议值
  confidenceScore: number;     // 置信度（0-1）
  reasoning: string;           // AI推理说明
  
  // 状态
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  acceptedValue?: string;      // 用户接受的值
  acceptedBy?: string;
  acceptedAt?: Date;
}
```

#### 9.3.2 确认更换按钮

右侧面板为每个AI建议显示以下操作按钮：

| 按钮 | 功能 | 说明 |
|------|------|------|
| 确认更新 | 接受AI建议 | 直接更新目标字段 |
| 编辑后更新 | 修改后接受 | 打开编辑器修改建议值 |
| 忽略 | 拒绝建议 | 记录拒绝原因 |
| 查看详情 | 查看关联内容 | 展示目标流程详情 |

### 9.4 AI内容识别引擎

#### 9.4.1 识别流程

```
员工输入笔记内容
       ↓
  内容保存到数据库
       ↓
  触发AI分析任务
       ↓
┌──────────────────────────────────────┐
│           AI内容识别引擎              │
├──────────────────────────────────────┤
│  1. 文本分析（NLP实体识别）           │
│  2. 文件解析（PDF/Word/Excel提取）    │
│  3. 图片OCR（文字识别）              │
│  4. 语音转文字（ASR）                 │
└──────────────────────────────────────┘
       ↓
  生成关联建议
       ↓
  显示在右侧面板
       ↓
  用户确认/修改
       ↓
  更新关联业务数据
```

#### 9.4.2 关联规则

| 识别内容 | 关联目标 | 示例 |
|---------|---------|------|
| 客户名称 | CRM客户档案 | "与华为沟通" → 关联华为客户 |
| 产品型号 | 项目设备配置 | "SC800W设备" → 关联设备型号 |
| 清洁度标准 | 方案技术参数 | "VDA19.1标准" → 更新清洁度要求 |
| 节拍要求 | 项目生产参数 | "60秒/件" → 更新节拍时间 |
| 金额数字 | 报价/成本字段 | "报价150万" → 更新报价金额 |
| 日期时间 | 项目里程碑 | "3月15日交付" → 更新交付日期 |
| 问题描述 | OPL问题清单 | "盲孔清洗困难" → 添加OPL条目 |

### 9.5 数据库设计

#### 9.5.1 process_notebooks表

```sql
CREATE TABLE process_notebooks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  process_type VARCHAR(50) NOT NULL,      -- 流程类型
  process_id VARCHAR(100) NOT NULL,       -- 关联流程ID
  process_step VARCHAR(50),               -- 流程步骤
  title VARCHAR(200),                     -- 笔记本标题
  created_by BIGINT NOT NULL,             -- 创建人
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  status ENUM('active', 'archived') DEFAULT 'active',
  INDEX idx_process (process_type, process_id)
);
```

#### 9.5.2 notebook_entries表

```sql
CREATE TABLE notebook_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  notebook_id BIGINT NOT NULL,
  entry_type ENUM('text', 'file', 'image', 'voice') NOT NULL,
  content TEXT,                           -- 文本内容
  file_url VARCHAR(500),                  -- 文件URL
  file_name VARCHAR(200),                 -- 文件名
  file_type VARCHAR(50),                  -- MIME类型
  file_size INT,                          -- 文件大小
  voice_duration INT,                     -- 语音时长
  voice_transcript TEXT,                  -- 语音转文字
  ocr_result TEXT,                        -- OCR结果
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_ai_processed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (notebook_id) REFERENCES process_notebooks(id)
);
```

#### 9.5.3 ai_notebook_suggestions表

```sql
CREATE TABLE ai_notebook_suggestions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  entry_id BIGINT NOT NULL,
  suggestion_type ENUM('field_update', 'process_link', 'content_match') NOT NULL,
  target_process_type VARCHAR(50),
  target_process_id VARCHAR(100),
  target_field VARCHAR(100),
  current_value TEXT,
  suggested_value TEXT,
  confidence_score DECIMAL(3,2),
  extracted_keywords JSON,
  reasoning TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'modified') DEFAULT 'pending',
  accepted_value TEXT,
  accepted_by BIGINT,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (entry_id) REFERENCES notebook_entries(id)
);
```

### 9.6 API接口规范

#### 9.6.1 笔记管理API

| 端点 | 方法 | 说明 |
|------|------|------|
| processNotebook.create | mutation | 创建流程笔记本 |
| processNotebook.getByProcess | query | 获取流程关联的笔记本 |
| processNotebook.addEntry | mutation | 添加笔记条目 |
| processNotebook.updateEntry | mutation | 更新笔记条目 |
| processNotebook.deleteEntry | mutation | 删除笔记条目 |
| processNotebook.uploadFile | mutation | 上传附件文件 |
| processNotebook.uploadVoice | mutation | 上传语音录音 |

#### 9.6.2 AI建议API

| 端点 | 方法 | 说明 |
|------|------|------|
| aiNotebook.analyzeEntry | mutation | 分析笔记条目生成建议 |
| aiNotebook.getSuggestions | query | 获取笔记的AI建议列表 |
| aiNotebook.acceptSuggestion | mutation | 接受AI建议并更新目标 |
| aiNotebook.rejectSuggestion | mutation | 拒绚AI建议 |
| aiNotebook.modifySuggestion | mutation | 修改后接受AI建议 |
| aiNotebook.getRelatedContent | query | 获取关联的已记录内容 |

### 9.7 NocoBase实现指南

在NocoBase中实现流程笔记系统时，应遵循以下指南：

1. **数据模型**：使用NocoBase Collection创建上述三个表
2. **文件存储**：集成S3存储插件处理文件上传
3. **AI集成**：通过Workflow触发AI分析任务
4. **UI组件**：使用自定义区块实现左右分栏布局
5. **权限控制**：配置角色权限控制笔记访问

### 9.8 业务页面集成规范

流程笔记组件应集成到所有核心业务页面，实现全流程笔记记录。

#### 9.8.1 集成页面清单

| 页面 | 路由 | 实体类型 | 集成方式 | 状态 |
|------|------|----------|----------|------|
| 项目管理 | /projects | project | Tab页集成 | ✅ 已完成 |
| CRM客户详情 | /crm/customers | customer | Tab页集成 | 🚧 待实现 |
| 商机管理 | /crm/opportunities | opportunity | Tab页集成 | 🚧 待实现 |
| 成本管理 | /cost-management | cost_budget | 侧边栏集成 | 🚧 待实现 |
| 报价管理 | /quotations | quotation | Tab页集成 | 🚧 待实现 |
| 方案设计 | /solutions | solution | Tab页集成 | 🚧 待实现 |

#### 9.8.2 集成代码示例

```tsx
import ProcessNotebook from '@/components/ProcessNotebook';

// 在业务页面中集成
<TabsContent value="notebook">
  <ProcessNotebook
    entityType="customer"      // 实体类型
    entityId={customerId}       // 实体ID
    processStep="客户沟通"     // 当前流程步骤
  />
</TabsContent>
```

### 9.9 AI识别规则库

AI识别规则库存储GRT业务领域的识别规则，用于提升AI内容识别的准确率。

#### 9.9.1 规则类型

| 规则类型 | 说明 | 匹配示例 | 目标字段 |
|----------|------|----------|----------|
| product_model | GRT产品型号 | GRT-SC800W, GRT-DC880W | equipment_model |
| cleanliness_standard | 清洁度标准 | VDA19.1, ISO16232, PV3349 | cleanliness_level |
| customer_name | 客户名称 | 从CRM客户库动态加载 | customer_id |
| amount | 金额数字 | ¥150万, 120万元 | quotation_amount |
| date | 日期时间 | 2026-03-15, 3月15日 | milestone_date |
| cycle_time | 节拍要求 | 60秒/件, 45s/pc | cycle_time |
| loading_method | 上下料方式 | 机器人上下料, 人工操作 | loading_unloading |

#### 9.9.2 数据库Schema

```sql
CREATE TABLE ai_recognition_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_type VARCHAR(50) NOT NULL,      -- 规则类型
  pattern VARCHAR(500) NOT NULL,        -- 匹配模式（正则/关键词）
  target_field VARCHAR(100) NOT NULL,   -- 目标字段
  target_entity VARCHAR(100),           -- 目标实体类型
  display_name VARCHAR(100),            -- 显示名称
  priority INT DEFAULT 0,               -- 优先级
  is_active TINYINT DEFAULT 1,          -- 是否启用
  metadata JSON,                        -- 扩展元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rule_type (rule_type),
  INDEX idx_active (is_active)
);
```

#### 9.9.3 预置规则数据

**产品型号规则（17种设备）**

| 型号 | 匹配模式 | 设备类型 |
|------|----------|----------|
| GRT-SC800W | SC800W\|SC-800W | 喷淋清洗机 |
| GRT-SC800W-SF | SC800W-SF\|SC800WSF | 喷淋清洗机(单工位) |
| GRT-DC880W | DC880W\|DC-880W | 浸泡清洗机 |
| GRT-MC888W | MC888W\|MC-888W | 多槽清洗机 |
| GRT-TC2100W | TC2100W\|TC-2100W | 通过式清洗机 |
| GRT-RW2000 | RW2000\|RW-2000 | 转笼式清洗机 |
| GRT-UW1500 | UW1500\|UW-1500 | 超声波清洗机 |
| GRT-VD500 | VD500\|VD-500 | 真空干燥机 |
| GRT-HD300 | HD300\|HD-300 | 热风干燥机 |

**清洁度标准规则**

| 标准 | 匹配模式 | 说明 |
|------|----------|------|
| VDA19.1 | VDA\s*19\.?1 | 德国汽车工业协会标准 |
| VDA19.2 | VDA\s*19\.?2 | VDA19技术清洁度标准 |
| ISO16232 | ISO\s*16232 | 国际标准化组织清洁度标准 |
| PV3349 | PV\s*3349 | 大众集团清洁度标准 |
| PV3370 | PV\s*3370 | 大众集团颜色清洁度标准 |
| GJB420 | GJB\s*420 | 国军标清洁度标准 |
| NAS1638 | NAS\s*1638 | 美国航空航天标准 |
| SAE AS4059 | SAE\s*AS\s*4059 | 美国汽车工程师学会标准 |

### 9.10 笔记搜索与导出

#### 9.10.1 搜索功能

支持跨项目笔记全文搜索，便于知识复用。

```typescript
interface NotebookSearchParams {
  query: string;                    // 搜索关键词
  entityTypes?: string[];           // 实体类型过滤
  dateRange?: [Date, Date];         // 时间范围
  createdBy?: string;               // 创建人
  entryTypes?: NotebookEntryType[]; // 内容类型
  sortBy?: 'relevance' | 'date' | 'updated'; // 排序方式
  page?: number;
  pageSize?: number;
}

interface NotebookSearchResult {
  total: number;
  items: {
    entryId: string;
    notebookId: string;
    entityType: string;
    entityId: string;
    entityName: string;             // 关联实体名称
    content: string;                // 内容摘要
    highlightedContent: string;     // 高亮匹配内容
    createdAt: Date;
    createdByName: string;
  }[];
}
```

#### 9.10.2 导出功能

| 导出格式 | 内容 | 用途 |
|----------|------|------|
| PDF | 笔记内容+附件列表+AI建议 | 正式文档归档 |
| Excel | 笔记列表+元数据 | 数据分析 |
| Markdown | 纯文本内容 | 知识库导入 |
| JSON | 结构化数据 | 系统集成 |

#### 9.10.3 API接口

| 端点 | 方法 | 说明 |
|------|------|------|
| processNotebook.search | query | 全文搜索笔记 |
| processNotebook.export | mutation | 导出笔记内容 |
| processNotebook.batchExport | mutation | 批量导出多个笔记 |

---

## 十一、工业安全拦截器中间件

工业安全拦截器是一个关键的中间件组件，确保AI建议的参数在进入业务流程前必须通过安全校验。

### 11.1 双层校验机制

#### 11.1.1 架构设计

```
AI建议生成 → 安全拦截器 → 静态规则库校验 → grt_ai_process_suggestions
                ↓
           校验失败 → 返回 AI_003 错误码
```

#### 11.1.2 校验流程

| 步骤 | 操作 | 失败处理 |
|------|------|----------|
| 1 | AI生成参数建议 | - |
| 2 | 安全拦截器接收建议 | - |
| 3 | 查询材质/机型安全阈值 | 返回 AI_003 |
| 4 | 比对AI建议值与安全范围 | 返回 AI_003 |
| 5 | 校验通过，继续流程 | - |

### 11.2 功能型AI助手安全配置

在功能型AI助手配置中增加 `safety_threshold_check` 属性。

```typescript
interface FunctionalAiAssistant {
  // ... 现有字段
  
  // 安全校验配置
  safety_threshold_check: {
    enabled: boolean;                    // 是否启用安全校验
    rule_categories: string[];           // 适用的规则类别
    severity_level: 'warning' | 'critical' | 'fatal';
    bypass_roles: string[];              // 可跳过校验的角色
  };
}
```

### 11.3 静态规则库

#### 11.3.1 规则库结构

```typescript
interface SafetyRule {
  id: string;
  rule_code: string;              // 规则编码
  material_type: string;          // 材质类型
  equipment_model: string;        // 设备型号
  parameter_name: string;         // 参数名称
  min_value: number;              // 最小安全值
  max_value: number;              // 最大安全值
  unit_type: string;              // 单位类型
  severity: 'warning' | 'critical' | 'fatal';
  error_message: string;          // 错误提示
  created_at: Date;
  updated_at: Date;
}
```

#### 11.3.2 预置安全规则示例

| 材质类型 | 参数 | 最小值 | 最大值 | 单位 | 严重级 |
|----------|------|--------|--------|------|--------|
| 铝合金 | 温度 | 20 | 60 | °C | critical |
| 铝合金 | 压力 | 0.5 | 3.0 | bar | critical |
| 不锈钢 | 温度 | 20 | 80 | °C | warning |
| 不锈钢 | 压力 | 0.5 | 5.0 | bar | critical |
| 铜合金 | 温度 | 20 | 70 | °C | warning |
| 碳钢 | 温度 | 20 | 90 | °C | warning |

### 11.4 错误码定义

| 错误码 | 名称 | 说明 |
|--------|------|------|
| AI_003 | 数据验证失败 | AI建议参数超出安全阈值 |
| AI_009 | 安全规则冲突 | 违反工业安全规则 |
| AI_010 | 物联网指令超时 | IoT设备通信超时 |

### 11.5 中间件实现

```typescript
// server/middleware/industrialSafetyMiddleware.ts
export async function validateSafetyThreshold(
  suggestion: AiSuggestion,
  context: SafetyContext
): Promise<SafetyValidationResult> {
  // 1. 查询适用的安全规则
  const rules = await getSafetyRules(
    context.materialType,
    context.equipmentModel
  );
  
  // 2. 逐一校验参数
  for (const param of suggestion.parameters) {
    const rule = rules.find(r => r.parameter_name === param.name);
    if (rule) {
      if (param.value < rule.min_value || param.value > rule.max_value) {
        return {
          valid: false,
          errorCode: 'AI_003',
          message: rule.error_message,
          violatedRule: rule
        };
      }
    }
  }
  
  return { valid: true };
}
```

---

## 十二、数据模型扩展（工业参数精细度）

### 12.1 字段类型标准化

所有涉及物理量的字段必须使用 `decimal(10,2)` 替代 `float`，并强制关联 `unit_type`。

#### 12.1.1 字段类型映射

| 原类型 | 新类型 | 说明 |
|--------|--------|------|
| float | decimal(10,2) | 所有物理量字段 |
| varchar | enum | unit_type字段 |

#### 12.1.2 单位类型枚举

```typescript
type UnitType = 
  | 'bar'      // 压力（巴）
  | 'MPa'      // 压力（兆帕）
  | '°C'       // 温度（摄氏度）
  | 'mm'       // 长度（毫米）
  | 'kg'       // 质量（千克）
  | 's'        // 时间（秒）
  | 'min'      // 时间（分钟）
  | 'L/min'    // 流量（升/分钟）
  | 'rpm';     // 转速（转/分钟）
```

### 12.2 硬件映射增强

在 `FunctionalAiAssistant` 接口中增加 `iot_linkage_map` 字段，用于定义业务参数与现场设备PLC寄存器地址的对应关系。

```typescript
interface FunctionalAiAssistant {
  // ... 现有字段
  
  // IoT硬件映射
  iot_linkage_map: IoTLinkageMapping[];
}

interface IoTLinkageMapping {
  parameter_name: string;           // 业务参数名称
  plc_register_address: string;     // PLC寄存器地址
  data_type: 'int16' | 'int32' | 'float32' | 'float64';
  read_write: 'read' | 'write' | 'read_write';
  scaling_factor?: number;          // 缩放系数
  offset?: number;                  // 偏移量
  description?: string;             // 描述
}
```

### 12.3 grt_ai_solutions表扩展

```sql
ALTER TABLE grt_ai_solutions
  MODIFY target_temp DECIMAL(10,2),
  MODIFY pressure DECIMAL(10,2),
  MODIFY flow_rate DECIMAL(10,2),
  MODIFY cycle_time DECIMAL(10,2),
  ADD COLUMN temp_unit ENUM('bar', 'MPa', '°C', 'mm', 'kg', 's', 'min', 'L/min', 'rpm') DEFAULT '°C',
  ADD COLUMN pressure_unit ENUM('bar', 'MPa', '°C', 'mm', 'kg', 's', 'min', 'L/min', 'rpm') DEFAULT 'bar',
  ADD COLUMN flow_unit ENUM('bar', 'MPa', '°C', 'mm', 'kg', 's', 'min', 'L/min', 'rpm') DEFAULT 'L/min',
  ADD COLUMN time_unit ENUM('bar', 'MPa', '°C', 'mm', 'kg', 's', 'min', 'L/min', 'rpm') DEFAULT 's';
```

---

## 十三、影子执行模式

### 13.1 执行模式扩展

在现有“系统内AI”和“泛互式AI”基础上，增加 `shadow`（影子模式）。

| 模式 | 代码 | 说明 | 触发确认按钮 |
|------|------|------|------------|
| 系统内AI | internal | 基于案例库，快速响应 | 是 |
| 泛互式AI | generative | 深度推理，复杂场景 | 是 |
| 影子模式 | shadow | 仅记录，不触发确认按钮 | 否 |

### 13.2 影子模式功能定位

影子模式下，AI建议会被生成并记录在 `grt_ai_learning_records` 中，但不触发“确认更换”按钮，仅用于后台比对人工操作与AI预测的偏差。

### 13.3 学习记录表结构

```typescript
interface AiLearningRecord {
  id: string;
  suggestion_id: string;            // 关联的AI建议 ID
  ai_predicted_value: object;       // AI预测值
  human_actual_value?: object;      // 人工实际值
  deviation_score?: number;         // 偏差分数 (0-100)
  deviation_analysis?: string;      // 偏差分析
  learning_status: 'pending' | 'analyzed' | 'applied';
  created_at: Date;
  analyzed_at?: Date;
}
```

### 13.4 偏差分析算法

```typescript
function calculateDeviation(
  predicted: ParameterSet,
  actual: ParameterSet
): DeviationResult {
  const deviations: ParameterDeviation[] = [];
  let totalScore = 0;
  
  for (const key of Object.keys(predicted)) {
    if (actual[key] !== undefined) {
      const diff = Math.abs(predicted[key] - actual[key]);
      const percentDiff = (diff / predicted[key]) * 100;
      deviations.push({
        parameter: key,
        predicted: predicted[key],
        actual: actual[key],
        deviation: percentDiff
      });
      totalScore += percentDiff;
    }
  }
  
  return {
    deviations,
    overallScore: totalScore / deviations.length,
    analysis: generateAnalysis(deviations)
  };
}
```

---

## 十四、流程笔记多模态关联深化

### 14.1 工业OCR规范

在 `NotebookEntry` 接口中，针对 `image` 类型增加 `industrial_ocr_spec`。

```typescript
interface NotebookEntry {
  // ... 现有字段
  
  // 工业OCR规范（仅针对image类型）
  industrial_ocr_spec?: {
    ocr_type: 'nameplate' | 'gauge_reading' | 'batch_number' | 'general';
    confidence_threshold: number;     // 置信度阈值 (0-1)
    extraction_rules: string[];       // 提取规则
    target_fields: string[];          // 目标字段
  };
}
```

### 14.2 新增识别规则

| 规则类型 | 匹配模式 | 目标字段 | 说明 |
|----------|----------|----------|------|
| 设备铭牌 | 型号/序列号/生产日期 | equipment_info | 识别设备基本信息 |
| 压力表读数 | 数值+单位 | pressure_reading | 识别压力表显示值 |
| 清洗剂批次号 | 批次格式 | cleaning_agent_batch | 识别清洗剂批次 |
| 温度计读数 | 数值+°C | temperature_reading | 识别温度显示值 |
| 流量计读数 | 数值+L/min | flow_reading | 识别流量显示值 |

### 14.3 跨流程溯源

在 `AiNotebookSuggestion` 中增加 `source_trace_id`，允许AI调取“商机管理”阶段记录的客户特殊要求，并将其作为“项目管理”阶段的工艺参考。

```typescript
interface AiNotebookSuggestion {
  // ... 现有字段
  
  // 跨流程溯源
  source_trace_id?: string;         // 源流程记录ID
  source_entity_type?: 'opportunity' | 'project' | 'customer' | 'quotation';
  source_field_path?: string;       // 源字段路径
  trace_reason?: string;            // 溯源原因
}
```

### 14.4 溯源关联示例

| 源阶段 | 源字段 | 目标阶段 | 目标字段 | 关联原因 |
|--------|--------|----------|----------|----------|
| 商机管理 | 客户特殊要求 | 项目管理 | 工艺参数 | 客户要求影响工艺设计 |
| 商机管理 | 清洁度要求 | 项目管理 | 检验标准 | 清洁度决定检验方法 |
| 报价管理 | 成本构成 | 成本管理 | 预算分配 | 报价成本作为预算基准 |

---

## 十五、工程实施约束

### 15.1 UI/UX准则

#### 15.1.1 AI建议面板要求

AI建议面板 `ai-suggestion-panel` 必须保留“一键回滚” (Undo) 按钮。

```typescript
interface AiSuggestionPanelProps {
  // ... 现有属性
  
  // 回滚功能
  enableUndo: boolean;              // 是否启用回滚
  undoHistory: UndoSnapshot[];      // 回滚历史
  maxUndoSteps: number;             // 最大回滚步数
}

interface UndoSnapshot {
  id: string;
  timestamp: Date;
  beforeState: object;              // 修改前状态
  afterState: object;               // 修改后状态
  appliedSuggestion: string;        // 应用的建议 ID
}
```

#### 15.1.2 通信日志记录

在 `grt_ai_communication_logs` 中完整记录修改前后的快照。

```typescript
interface AiCommunicationLog {
  id: string;
  suggestion_id: string;
  action_type: 'apply' | 'reject' | 'undo' | 'modify';
  before_snapshot: object;          // 修改前快照
  after_snapshot: object;           // 修改后快照
  user_id: string;
  timestamp: Date;
  reason?: string;                  // 操作原因
}
```

### 15.2 错误处理升级

#### 15.2.1 完整错误码列表

| 错误码 | 名称 | 说明 | HTTP状态码 |
|--------|------|------|------------|
| AI_001 | 请求参数错误 | 输入参数格式不正确 | 400 |
| AI_002 | 服务不可用 | AI服务暂时不可用 | 503 |
| AI_003 | 数据验证失败 | AI建议参数超出安全阈值 | 422 |
| AI_004 | 权限不足 | 用户无权执行此操作 | 403 |
| AI_005 | 资源不存在 | 请求的资源不存在 | 404 |
| AI_006 | 速率限制 | 请求频率超出限制 | 429 |
| AI_007 | 内部错误 | 服务器内部错误 | 500 |
| AI_008 | 超时 | 请求处理超时 | 504 |
| AI_009 | 安全规则冲突 | 违反工业安全规则 | 422 |
| AI_010 | 物联网指令超时 | IoT设备通信超时 | 504 |

#### 15.2.2 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;                   // 错误码
    message: string;                // 错误消息
    details?: object;               // 详细信息
    suggestion?: string;            // 建议操作
    violated_rule?: SafetyRule;     // 违反的安全规则（仅AI_003/AI_009）
  };
  timestamp: string;
  request_id: string;
}
```

---

## 十六、验证测试包

### 16.1 材质-参数冲突测试用例

```typescript
// server/tests/material-parameter-conflict.test.ts
describe('Material-Parameter Conflict Validation', () => {
  it('should reject aluminum alloy temperature above 60°C', async () => {
    const suggestion = {
      materialType: '铝合金',
      parameters: [{ name: 'temperature', value: 65, unit: '°C' }]
    };
    
    const result = await validateSafetyThreshold(suggestion, context);
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('AI_003');
  });
  
  it('should accept stainless steel temperature at 75°C', async () => {
    const suggestion = {
      materialType: '不锈钢',
      parameters: [{ name: 'temperature', value: 75, unit: '°C' }]
    };
    
    const result = await validateSafetyThreshold(suggestion, context);
    
    expect(result.valid).toBe(true);
  });
});
```

### 16.2 安全阈值校验测试用例

```typescript
// server/tests/safety-threshold.test.ts
describe('Safety Threshold Validation', () => {
  it('should return AI_009 for safety rule conflict', async () => {
    const suggestion = {
      materialType: '铝合金',
      equipmentModel: 'GRT-UC-3000',
      parameters: [
        { name: 'pressure', value: 5.0, unit: 'bar' }  // 超出3.0bar限制
      ]
    };
    
    const result = await validateSafetyThreshold(suggestion, context);
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('AI_009');
    expect(result.violatedRule.severity).toBe('critical');
  });
});
```

### 16.3 影子模式偏差记录测试用例

```typescript
// server/tests/shadow-mode-deviation.test.ts
describe('Shadow Mode Deviation Recording', () => {
  it('should record AI prediction without triggering confirmation', async () => {
    const suggestion = await generateSuggestion({
      executionMode: 'shadow',
      context: projectContext
    });
    
    // 验证建议已记录
    const record = await getLearningRecord(suggestion.id);
    expect(record).toBeDefined();
    expect(record.learning_status).toBe('pending');
    
    // 验证未触发确认按钮
    expect(suggestion.showConfirmButton).toBe(false);
  });
  
  it('should calculate deviation when human value is recorded', async () => {
    const record = await recordHumanAction({
      suggestionId: 'test-suggestion-id',
      humanValue: { temperature: 55, pressure: 2.5 }
    });
    
    expect(record.deviation_score).toBeDefined();
    expect(record.learning_status).toBe('analyzed');
  });
});
```

---

## 十七、附录

### 10.1 相关RFC文档

| RFC编号 | 标题 | 状态 |
|---------|------|------|
| RFC-023 | AI助手双层体系架构 | 已批准 |
| RFC-024 | AI助手双层体系架构实现 | 已批准 |
| RFC-025 | AI执行模式选择功能 | 待评审 |
| RFC-020 | AI方案助手多轮对话支持 | 待评审 |
| RFC-021 | 报价助手竞品分析功能 | 待评审 |
| RFC-022 | KPI助手自动评分优化 | 待评审 |
| RFC-026 | 流程笔记系统 | 已批准 |
| RFC-027 | 流程笔记系统扩展 | 已批准 |
| RFC-028 | v2.6.0架构级优化与逻辑对齐 | 已批准 |

### 10.2 参考文档

- [版本更新控制与变更管理规范](./version-control-change-management.md)
- [AI方案助理作业流程分析](./ai-solution-assistant-workflow-analysis.md)
- [NocoBase任务看板配置指南](./nocobase-task-project-board-setup-v2.md)

---

*文档版本：v2.6*  
*体系编号：GRT-SPEC-AI-2026-001*  
*更新日期：2026-01-18*  
*审核状态：已批准*  
*作者：Manus AI*

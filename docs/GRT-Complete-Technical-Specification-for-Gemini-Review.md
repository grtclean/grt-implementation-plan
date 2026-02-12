# GRT智能系统完整技术规范文档

> **文档用途**：供Gemini AI进行Double Check与优化审查
> 
> **生成日期**：2026-01-18
> 
> **当前版本**：v2.5.0
> 
> **体系编号**：GRT-SPEC-AI-2026-001

---

# 目录

1. [Claude Code + NocoBase 技术规范](#第一部分claude-code--nocobase-技术规范)
2. [版本更新控制与变更管理规范](#第二部分版本更新控制与变更管理规范)
3. [RFC评估文档汇总](#第三部分rfc评估文档汇总)
4. [审查建议清单](#第四部分审查建议清单)

---

# 第一部分：Claude Code + NocoBase 技术规范

## 一、概述

本文档定义了在NocoBase架构中使用Claude Code实现GRT智能系统AI助手功能的技术规范，确保开发过程的一致性和可维护性。

**文档版本**：v2.3  
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

### 3.3 AI执行模式选择

在AI建议执行过程中，用户可以选择两种执行模式：**系统内AI**和**泛互式AI**。

#### 3.3.1 执行模式定义

| 模式 | 英文标识 | 特点 | 适用场景 |
|------|----------|------|----------|
| **系统内AI** | `internal` | 轻度AI，基于现有案例库和AI化成果，快速响应，结果可预测 | 日常任务、标准流程、快速查询 |
| **泛互式AI** | `generative` | 泛化式广泛分析，深度推理，创新建议 | 复杂决策、方案设计、战略规划 |

#### 3.3.2 模式对比

| 维度 | 系统内AI (Internal) | 泛互式AI (Generative) |
|------|---------------------|----------------------|
| **知识来源** | 案例库、历史数据、SOP文档 | LLM通用知识 + 案例库 |
| **提示词策略** | 结构化模板、固定格式输出 | 开放式推理、创新建议 |
| **响应时间** | <2秒 | 5-30秒 |
| **Token消耗** | 低（500-1000） | 高（2000-8000） |
| **结果特点** | 标准化、可预测、一致性高 | 创新性、多样化、深度分析 |
| **成本** | 低 | 较高 |

---

## 四、功能型AI助手详细规范

### 4.1 AI方案助手（AI Solution Assistant）

#### 4.1.1 方案推荐逻辑

```typescript
interface SolutionRecommendation {
  // 输入参数
  input: {
    cleanlinessLevel: string;      // 清洁度等级
    partType: string;              // 零件类型
    contaminants: string[];        // 污染物类型
    productionVolume: number;      // 产量要求
    cycleTime: number;             // 节拍要求
  };
  
  // 推荐结果
  recommendations: Array<{
    solutionId: string;
    matchScore: number;            // 匹配度（0-100）
    processFlow: string[];         // 工艺流程
    estimatedCycleTime: number;    // 预估节拍
    equipmentModels: string[];     // 推荐设备型号
    successRate: number;           // 历史成功率
  }>;
  
  analysisReport: {
    keyFactors: string[];          // 关键因素分析
    riskWarnings: string[];        // 风险提示
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
    laborHourRate: number;         // 工时费率
    overheadRate: number;          // 管理费率
    sharedCostRate: number;        // 共享成本费率
    lastUpdated: Date;
    updatedBy: string;
  };
  
  // 成本调整权限
  adjustmentPermissions: {
    adminCanAdjust: boolean;
    adjustmentRequiresApproval: boolean;
  };
}
```

### 4.3 AI规划助手（AI Planning Assistant）

#### 4.3.1 输入数据源

```typescript
interface PlanningInputSources {
  // 公司计划
  companyPlans: {
    annual: string;                // 年度计划
    quarterly: string;             // 季度计划
    monthly: string;               // 月度计划
  };
  
  // 客户相关
  customerData: {
    feedback: string[];            // 客户反馈
    visitHistory: object[];        // 拜访记录
  };
  
  // 项目相关
  projectData: {
    preAcceptanceOPL: object[];    // 预验收OPL清单
    acceptanceOPL: object[];       // 验收OPL清单
    executionStatus: object[];     // 执行状态
  };
  
  // 内部管理
  internalData: {
    meetingMinutes: object[];      // 会议纪要
    supervisorAssignments: object[];// 主管分配
    kpiStatus: object[];           // KPI状态
    unfinishedPlans: object[];     // 未完成计划
  };
}
```

### 4.4 AI绩效助手（AI KPI Assistant）

#### 4.4.1 评估功能

```typescript
interface KPIAssessment {
  // 评估维度
  dimensions: {
    timeliness: number;            // 及时性
    quality: number;               // 质量
    efficiency: number;            // 效率
    collaboration: number;         // 协作
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

### 5.2 API集成规范

#### 5.2.1 RESTful API端点

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
```

#### 5.2.2 错误处理规范

```typescript
interface APIError {
  code: string;                    // 错误代码
  message: string;                 // 错误消息
  details?: object;                // 详细信息
  timestamp: string;               // 时间戳
  requestId: string;               // 请求ID
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
}
```

#### 9.3.2 确认更换按钮

| 按钮 | 功能 | 说明 |
|------|------|------|
| 确认更新 | 接受AI建议 | 直接更新目标字段 |
| 编辑后更新 | 修改后接受 | 打开编辑器修改建议值 |
| 忽略 | 拒绝建议 | 记录拒绝原因 |
| 查看详情 | 查看关联内容 | 展示目标流程详情 |

### 9.4 AI识别规则库

| 规则类型 | 说明 | 匹配示例 | 目标字段 |
|----------|------|----------|----------|
| product_model | GRT产品型号 | GRT-SC800W, GRT-DC880W | equipment_model |
| cleanliness_standard | 清洁度标准 | VDA19.1, ISO16232, PV3349 | cleanliness_level |
| customer_name | 客户名称 | 从CRM客户库动态加载 | customer_id |
| amount | 金额数字 | ¥150万, 120万元 | quotation_amount |
| date | 日期时间 | 2026-03-15, 3月15日 | milestone_date |
| cycle_time | 节拍要求 | 60秒/件, 45s/pc | cycle_time |

### 9.5 业务页面集成规范

| 页面 | 路由 | 实体类型 | 集成方式 | 状态 |
|------|------|----------|----------|------|
| 项目管理 | /projects | project | Tab页集成 | ✅ 已完成 |
| CRM客户详情 | /crm/customers | customer | Tab页集成 | ✅ 已完成 |
| 商机管理 | /crm/opportunities | opportunity | Tab页集成 | ✅ 已完成 |
| 成本管理 | /cost-management | cost_budget | 侧边栏集成 | ✅ 已完成 |

---

# 第二部分：版本更新控制与变更管理规范

## 一、变更管理流程

### 1.1 流程概览

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  需求提出   │ ──→ │  技术评估   │ ──→ │  评审确认   │ ──→ │  批准决策   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  版本发布   │ ←── │  测试验证   │ ←── │  开发实现   │ ←── │  版本规划   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 1.2 各阶段详细说明

| 阶段 | 输入 | 输出 | 负责人 |
|------|------|------|--------|
| 需求提出 | 用户需求、业务需求 | RFC文档 | 需求提出者 |
| 技术评估 | RFC文档 | 技术评估报告 | 技术负责人 |
| 评审确认 | RFC + 评估报告 | 评审记录 | 评审委员会 |
| 批准决策 | 评审记录 | 批准文档 | 项目负责人 |
| 版本规划 | 批准的需求列表 | 版本计划 | 项目经理 |
| 开发实现 | 版本计划 + 技术规范 | 代码提交 | 开发团队 |
| 测试验证 | 代码提交 | 测试报告 | 测试人员 |
| 版本发布 | 测试通过的代码 | 发布版本 | 发布管理员 |

## 二、评估检查清单

在批准任何变更前，必须完成以下检查：

| 检查项 | 说明 | 必须 |
|--------|------|------|
| **需求明确性** | 需求描述是否清晰完整 | ✅ |
| **技术可行性** | 技术方案是否可行 | ✅ |
| **工作量评估** | 工作量估算是否合理 | ✅ |
| **风险识别** | 是否识别主要风险 | ✅ |
| **兼容性分析** | 是否影响现有功能 | ✅ |
| **测试计划** | 是否有测试方案 | ✅ |
| **文档计划** | 是否有文档更新计划 | ⚠️ |
| **培训计划** | 是否需要用户培训 | ⚠️ |

## 三、批准权限矩阵

| 变更类型 | 影响范围 | 批准人 |
|----------|----------|--------|
| PATCH | 单一模块Bug修复 | 技术负责人 |
| MINOR | 新增功能 | 技术负责人 + 产品负责人 |
| MAJOR | 架构变更 | 技术总监 + 项目负责人 |
| 紧急修复 | 生产环境问题 | 技术负责人（事后补审） |

---

# 第三部分：RFC评估文档汇总

## RFC-023: AI助手双层体系架构

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-023 |
| 提出日期 | 2026-01-18 |
| 状态 | 已批准 ✅ |
| 目标版本 | v2.1.0 |

**功能描述**：
1. 员工数字助手（DA）：每个员工可设定专属数字助手，命名规则为 `{员工号}-DA`
2. 功能型AI助手：无真实员工的岗位设定功能型AI助手，如 AI Solution Assistant
3. AI建议流程集成：三种建议模式（全过程/本过程/单步）

---

## RFC-024: AI助手双层体系架构实现

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-024 |
| 提出日期 | 2026-01-18 |
| 状态 | 已批准 ✅ |
| 目标版本 | v2.2.0 |

**实现内容**：
1. 员工DA创建界面（/digital-assistants）
2. AI建议UI组件（AISuggestionPanel）
3. 功能型AI助手Prompt配置（8种助手）

---

## RFC-025: AI执行模式选择功能

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-025 |
| 提出日期 | 2026-01-18 |
| 状态 | 已批准 ✅ |
| 目标版本 | v2.3.0 |

**功能描述**：
- **系统内AI**：轻度AI，基于案例库，快速响应
- **泛互式AI**：泛化式广泛分析，深度推理

---

## RFC-026: 流程笔记系统

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-026 |
| 提出日期 | 2026-01-18 |
| 状态 | 已批准 ✅ |
| 目标版本 | v2.4.0 |

**功能描述**：
- 左侧员工Notebook：支持文字、文件、图片、语音
- 右侧AI识别建议：智能关联到相关流程字段
- 确认更换按钮：一键应用AI建议

---

## RFC-027: 流程笔记系统扩展

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-027 |
| 提出日期 | 2026-01-18 |
| 状态 | 已批准 ✅ |
| 目标版本 | v2.5.0 |

**扩展内容**：
1. 集成到CRM客户、商机、成本管理页面
2. AI识别规则库（32种规则）
3. 笔记搜索和导出功能

---

# 第四部分：审查建议清单

请Gemini重点审查以下方面：

## 1. 架构一致性

- [ ] AI助手双层体系架构是否合理
- [ ] 员工DA与功能型AI助手的职责划分是否清晰
- [ ] 系统内AI与泛互式AI的定位是否准确

## 2. 数据模型设计

- [ ] 数据库表结构是否规范
- [ ] 字段命名是否一致
- [ ] 关联关系是否正确

## 3. API设计

- [ ] RESTful API端点命名是否规范
- [ ] 错误处理是否完善
- [ ] 权限控制是否合理

## 4. 流程笔记系统

- [ ] 多媒体内容支持是否完整
- [ ] AI识别规则是否覆盖主要场景
- [ ] 确认更换流程是否用户友好

## 5. NocoBase集成

- [ ] Collection命名是否符合NocoBase规范
- [ ] 工作流集成是否合理
- [ ] 插件结构是否符合最佳实践

## 6. 安全性

- [ ] 数据安全措施是否充分
- [ ] 权限控制是否细粒度
- [ ] 敏感数据处理是否合规

## 7. 可扩展性

- [ ] 架构是否支持未来扩展
- [ ] 模块化设计是否合理
- [ ] 配置化程度是否足够

---

*文档生成日期：2026-01-18*
*当前版本：v2.5.0*
*体系编号：GRT-SPEC-AI-2026-001*

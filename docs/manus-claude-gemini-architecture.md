# Manus-Claude-Gemini 协作架构

## 概述

GRT智能系统采用三层AI协作架构，充分发挥各AI平台的优势：

- **Manus**：任务编排与工作流管理
- **Claude Code**：代码实现与技术开发
- **Gemini**：业务判断与智能问答

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求入口                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Manus 任务编排层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 任务分解    │  │ 资源调度    │  │ 进度监控    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Claude Code   │ │     Gemini      │ │   Internal LLM  │
│   代码执行层    │ │   判断引擎层    │ │   快速响应层    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • 代码生成      │ │ • 业务评估      │ │ • 常规问答      │
│ • Bug修复       │ │ • 风险判断      │ │ • 数据查询      │
│ • 重构优化      │ │ • 智能推荐      │ │ • 简单计算      │
│ • 测试编写      │ │ • 安全检查      │ │ • 格式转换      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 职责分工

### 1. Manus - 任务编排器

**核心职责**：
- 接收用户需求，分解为可执行任务
- 根据任务类型路由到合适的AI执行器
- 协调多个AI之间的协作
- 聚合执行结果，返回给用户

**任务类型映射**：

| 任务类型 | 路由目标 | 示例 |
|----------|----------|------|
| 代码开发 | Claude Code | 实现新功能、修复Bug |
| 业务分析 | Gemini | 风险评估、商机分析 |
| 数据查询 | Internal LLM | 查询客户信息、统计报表 |
| 复合任务 | 多AI协作 | 开发+测试+部署 |

### 2. Claude Code - 代码执行器

**核心能力**：
- 高质量代码生成
- 复杂逻辑实现
- 代码审查与优化
- 测试用例编写
- 技术文档生成

**接口规范**：

```typescript
interface ClaudeCodeRequest {
  task: 'generate' | 'fix' | 'refactor' | 'test' | 'document';
  context: {
    files: string[];
    requirements: string;
    constraints?: string[];
  };
}

interface ClaudeCodeResponse {
  success: boolean;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  explanation?: string;
}
```

### 3. Gemini - 判断引擎

**核心能力**：
- 业务逻辑评估
- 风险分析与预警
- 智能推荐生成
- 安全合规检查
- 审批决策支持

**接口规范**：

```typescript
interface GeminiJudgmentRequest {
  type: 'evaluate' | 'recommend' | 'check' | 'decide';
  context: string;
  data: Record<string, any>;
  constraints?: string[];
}

interface GeminiJudgmentResponse {
  decision: string;
  confidence: number;
  reasoning: string;
  warnings?: string[];
}
```

## 路由规则

### 关键词映射表

| 关键词类别 | 示例关键词 | 路由目标 |
|------------|------------|----------|
| 代码开发 | 代码、编程、实现、bug、调试 | Claude |
| 业务分析 | 分析、评估、判断、预测、规划 | Gemini |
| 敏感数据 | 价格、报价、配方、成本 | Internal LLM |
| 专业领域 | 清洗方案、超声波、喷淋 | Specialized |

## 安全机制

### 数据隔离

- 敏感商业数据仅通过Internal LLM处理
- 外部AI不接触客户分级价格、核心配方等信息
- 所有AI响应经过安全检查后才返回用户

### 安全规则

```typescript
const SAFETY_RULES = [
  '禁止泄露客户分级价格信息',
  '禁止泄露核心工艺配方参数',
  '禁止输出未脱敏的个人身份信息',
  '禁止暴露数据库连接字符串或API密钥',
];
```

## 配置示例

```yaml
manus:
  enabled: true
  maxConcurrentTasks: 10

claude:
  enabled: true
  model: claude-3-sonnet
  tasks: [generate, fix, refactor]

gemini:
  enabled: true
  model: gemini-2.5-flash
  tasks: [evaluate, recommend, check]

internal_llm:
  enabled: true
  endpoint: ${BUILT_IN_FORGE_API_URL}
```

---

*文档版本: v3.2.0*
*更新日期: 2026-01-23*

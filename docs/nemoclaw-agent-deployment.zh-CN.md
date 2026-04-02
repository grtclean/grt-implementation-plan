# GRT 智能系统 — AI Claw (NemoClaw) Agent 部署指南

> 版本: v4.1.0 | 更新日期: 2026-03-23

---

## 目录

1. [GRT 与 AI Claw 的关系](#1-grt-与-ai-claw-的关系)
2. [架构总览](#2-架构总览)
3. [Agent 部署方式](#3-agent-部署方式)
4. [工具注册](#4-工具注册)
5. [角色权限映射](#5-角色权限映射)
6. [任务执行流](#6-任务执行流)
7. [沙箱与工作空间隔离](#7-沙箱与工作空间隔离)
8. [关键配置项](#8-关键配置项)
9. [调试方法](#9-调试方法)
10. [故障排查](#10-故障排查)

---

## 1. GRT 与 AI Claw 的关系

GRT 智能系统内置了一套 **AI Claw (又称 NemoClaw)** 框架，它是系统的 **外部工具执行引擎**，负责:

- 将业务意图转化为可执行的工具调用
- 在安全沙箱内执行 Agent 任务
- 管理 Agent 的生命周期 (创建、激活、暂停、退役)
- 提供 L1-L4 分级安全控制
- 记录完整的审计日志

AI Claw 并非独立部署的服务，而是嵌入在 GRT 应用内部的框架层。它通过以下模块协同工作:

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| Agent 治理 | `server/routers/agent-governance.router.ts` | Agent CRUD、版本管理 |
| 安全沙箱 | `server/services/agent-security-sandbox.service.ts` | L1-L4 权限边界、SQL注入防护 |
| AI 网关 | `server/ai-assistants/gateway.ts` | 统一 LLM 调用、速率限制、审计 |
| AI 助手配置 | `server/ai-assistants/config.ts` | 17 个预配置 Agent 定义 |
| Agent Schema | `drizzle/agent-governance-schema.ts` | 数据库表结构 |

---

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRT 前端 (React 19)                       │
│  AgentControlTower.tsx ─── AgentGovernanceDashboard.tsx          │
└───────────────┬─────────────────────────────────────────────────┘
                │ tRPC 调用
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GRT API 层 (Express + tRPC)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Agent 治理    │  │ AI 网关      │  │ 安全沙箱服务         │   │
│  │ Router       │  │ gateway.ts   │  │ agent-security-      │   │
│  │ (25 CRUD)    │  │ (速率限制    │  │ sandbox.service.ts   │   │
│  │              │  │  审计日志)   │  │ (L1-L4 分级)         │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AI Claw Worker (任务执行引擎)                │    │
│  │                                                          │    │
│  │  1. 接收任务请求                                          │    │
│  │  2. 验证权限边界 (validateAgentAccess)                    │    │
│  │  3. 检查 HITL 需求 (requiresHITL)                        │    │
│  │  4. SQL 安全校验 (validateQuerySafety)                    │    │
│  │  5. 调用 LLM (invokeLLM / invokeLLMWithProvider)         │    │
│  │  6. 记录审计日志 (agent_execution_logs)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────┐  ┌──────────────────────┐     │
│  │ PostgreSQL 16               │  │ LLM API              │     │
│  │ - agent_governance          │  │ - OpenAI / Ollama /   │     │
│  │ - agent_execution_logs      │  │   DeepSeek / Gemini   │     │
│  │ - agent_knowledge_links     │  │                       │     │
│  │ - ai_assistant_configs      │  │                       │     │
│  │ - ai_assistant_logs         │  │                       │     │
│  └──────────────────────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Agent 部署方式

### 3.1 预置 Agent

GRT 系统预置了 17 个 Agent，分为三类:

**核心业务 Agent (5 个)**

| Agent ID | 名称 | 优先级 |
|----------|------|--------|
| `interview` | AI 面试助手 | P0 |
| `solution` | AI 方案设计助手 | P0 |
| `quotation` | AI 报价助手 | P0 |
| `kpi` | AI 绩效助手 | P1 |
| `purchase` | AI 采购助手 | P1 |

**计划 Agent (4 个)**

| Agent ID | 名称 | 优先级 |
|----------|------|--------|
| `planning_1` | 公司计划助手 | P1 |
| `planning_2` | 部门计划助手 | P1 |
| `planning_3` | 事业部计划助手 | P2 |
| `planning_4` | 个人计划助手 | P2 |

**角色数字 Agent (8 个)**

| Agent ID | 名称 | 适用角色 |
|----------|------|---------|
| `sales_agent` | 销售数字助手 | sales, sales_manager |
| `tech_agent` | 技术数字助手 | engineer, tech_lead |
| `pm_agent` | 项目数字助手 | pm, project_manager |
| `qa_agent` | 品质数字助手 | qa, quality_manager |
| `hr_agent` | HR 数字助手 | hr, recruiter |
| `finance_agent` | 财务数字助手 | finance, finance_manager |
| `production_agent` | 生产数字助手 | production, production_manager |
| `procurement_agent` | 采购数字助手 | procurement, procurement_manager |

### 3.2 初始化 Agent 配置

Agent 配置在应用启动时自动同步到数据库:

```typescript
// server/ai-assistants/gateway.ts
import { initializeAssistantConfigs } from "./gateway";

// 应用启动时调用
const result = await initializeAssistantConfigs();
console.log(`Agent 初始化: 新建 ${result.created}, 更新 ${result.updated}`);
```

### 3.3 DB 任务队列模型

Agent 采用 **DB-backed 轮询模型**:

1. 前端发起请求 → `ai-assistant.router.ts` 接收
2. 请求写入 `ai_assistant_logs` 表 (状态: pending)
3. AI 网关 (`gateway.ts`) 同步执行 LLM 调用
4. 结果更新到 `ai_assistant_logs` 表 (状态: success/error/timeout)
5. 前端通过 tRPC 查询结果

---

## 4. 工具注册

### 4.1 Agent 治理表 (agent_governance)

每个 Agent 在 `agent_governance` 表中注册，包含:

```sql
-- 查看已注册的 Agent
SELECT agent_code, agent_name, agent_category, risk_level,
       environment, status, version
FROM agent_governance
WHERE status = 'active'
ORDER BY agent_category;
```

关键字段:

| 字段 | 类型 | 说明 |
|------|------|------|
| `agent_code` | varchar(50) | Agent 唯一标识 |
| `agent_category` | varchar(50) | 分类: business/hr/finance/project 等 |
| `risk_level` | varchar(20) | 风险等级: low/medium/high/critical |
| `environment` | varchar(20) | 环境: sandbox/staging/production |
| `status` | varchar(20) | 状态: draft/active/paused/disabled/retired |
| `human_review_required` | boolean | 是否需要人工确认 |
| `automation_level` | - | 通过安全沙箱服务分配 L1-L4 |
| `version` | integer | 版本号 (支持多版本共存) |

### 4.2 知识源关联 (agent_knowledge_links)

```sql
-- 查看 Agent 的知识源
SELECT akl.knowledge_source_type, akl.knowledge_source_name, akl.access_level
FROM agent_knowledge_links akl
WHERE akl.agent_governance_id = 1;
```

知识源类型:
- `sop_library` — SOP 标准操作流程
- `project_history` — 历史项目数据
- `material_specs` — 物料规格
- `customer_cases` — 客户案例
- `fmea` — FMEA 分析
- `training_material` — 培训材料
- `policy_document` — 政策文件

### 4.3 注册新 Agent

通过 Agent 治理 API (tRPC) 注册:

```typescript
// 前端调用示例
const result = await trpc.agentGovernance.create.mutate({
  agentCode: "custom_agent_001",
  agentName: "自定义业务 Agent",
  agentCategory: "business",
  businessObjective: "自动分析客户需求并生成建议",
  riskLevel: "medium",
  humanReviewRequired: true,
  aiProvider: "openai",
  aiModel: "gpt-4o",
  systemPrompt: "你是一位业务分析专家...",
  environment: "sandbox",  // 先在沙盘测试
});
```

---

## 5. 角色权限映射

### 5.1 Agent 访问控制

每个 Agent 通过 `allowedRoles` 字段定义允许使用的角色:

```typescript
// server/ai-assistants/config.ts
{
  id: "solution",
  allowedRoles: ["sales", "engineer", "manager"],
  rateLimit: 100,  // 每小时请求限制
}
```

### 5.2 安全沙箱权限边界

更细粒度的数据访问控制通过安全沙箱服务实现:

```typescript
// server/services/agent-security-sandbox.service.ts
const AGENT_PERMISSIONS = {
  'quotation_assistant': {
    automationLevel: 'L2',          // 建议辅助，不能写入
    allowedReadTables: ['materials', 'project_cost_benchmarks', 'bom_masters'],
    allowedWriteTables: [],          // L2 级不允许写入
    forbiddenTables: ['payroll_ledgers', 'salary_structures', 'gl_entries'],
    maxWriteRowsPerExecution: 0,
    requireHITL: true,
    hitlTriggers: ['bom_generation', 'price_suggestion'],
  },
};
```

### 5.3 权限验证调用

```typescript
import { validateAgentAccess, requiresHITL } from "../services/agent-security-sandbox.service";

// 验证数据访问
const access = validateAgentAccess("quotation_assistant", "materials", "read");
if (!access.allowed) {
  throw new Error(`权限不足: ${access.reason}`);
}

// 检查是否需要人工确认
const needsHITL = requiresHITL("quotation_assistant", "bom_generation");
if (needsHITL) {
  // 暂停执行，等待人工审批
}
```

---

## 6. 任务执行流

Agent 任务执行遵循 **6 层安全架构**:

```
第 1 层: 认证检查
  └─ 用户必须登录，JWT token 有效

第 2 层: 角色授权
  └─ 用户角色在 allowedRoles 列表中

第 3 层: 速率限制
  └─ 未超过每小时调用限制 (默认 100 次)

第 4 层: 权限边界验证
  └─ validateAgentAccess() — 表级读写权限
  └─ forbiddenTables 绝对禁止访问

第 5 层: SQL 安全校验
  └─ validateQuerySafety() — 拦截注入攻击
  └─ 危险模式: DROP/DELETE/TRUNCATE/UNION SELECT 等

第 6 层: HITL 人工确认
  └─ 高风险操作强制等待人工审批
  └─ requiresHITL() 判断是否需要
```

### 执行流代码示例

```typescript
import { invokeAssistant } from "../ai-assistants/gateway";

const result = await invokeAssistant({
  assistantId: "solution",
  userId: ctx.user.id,
  userName: ctx.user.displayName,
  sessionId: `session_${ctx.user.id}_${Date.now()}`,
  requestType: "solution_design",
  messages: [
    { role: "user", content: "客户需要清洗半导体硅片，尺寸200mm，清洁度Class100" }
  ],
});

if (result.success) {
  console.log("AI 回复:", result.response);
  console.log("Token 消耗:", result.usage?.totalTokens);
  console.log("响应时间:", result.responseTimeMs, "ms");
}
```

---

## 7. 沙箱与工作空间隔离

### 7.1 自动化分级 (L1-L4)

| 等级 | 名称 | 数据访问 | 写入能力 | HITL |
|------|------|---------|---------|------|
| **L1** | 只读查询 | 仅读取已授权表 | 禁止 | 不需要 |
| **L2** | 建议辅助 | 读取 + 生成建议 | 禁止 (建议需人工执行) | 需要 |
| **L3** | 受控执行 | 读取 + 有限写入 | 低风险操作可自动，高风险需 HITL | 部分 |
| **L4** | 全自动 | 读取 + 写入 | 预定义安全操作可自动执行 | 不需要 |

### 7.2 典型 Agent 分级

```
L1: (无预置 Agent)
L2: quotation_assistant, finance_auditor, sop_generator
L3: payroll_calculator
L4: alert_scanner
```

### 7.3 环境隔离

Agent 支持三个环境:

```
sandbox  → 测试环境，不影响生产数据
staging  → 预发布环境，使用生产数据副本
production → 生产环境，正式执行
```

Agent 创建时默认进入 `sandbox`，需通过审批流程才能晋升到 `production`。

### 7.4 BU 数据隔离

```typescript
// 限制 Agent 只能访问特定事业部数据
{
  allowedBuCodes: ['overseas', 'semiconductor'],  // 仅海外和半导体
  // 或
  allowedBuCodes: ['*'],  // 所有事业部
}
```

---

## 8. 关键配置项

### 8.1 环境变量

```bash
# AI 提供商选择
AI_PROVIDER=openai               # openai / ollama / deepseek

# LLM API 配置
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Agent 开关 (在 .env 中控制)
AI_INTERVIEW_ENABLED=true
AI_SOLUTION_ENABLED=true
AI_QUOTATION_ENABLED=true
AI_KPI_ENABLED=true
AI_PURCHASE_ENABLED=true
AI_PLANNING_ENABLED=true
AI_ROLE_AGENTS_ENABLED=true

# Agent 日志级别
AI_ASSISTANT_LOG_LEVEL=info      # debug / info / warn / error

# 审计日志开关
AI_ASSISTANT_ENABLE_AUDIT=true
```

### 8.2 Agent 模型配置

每个 Agent 可独立配置模型参数:

```typescript
modelConfig: {
  model: "gpt-4",
  temperature: 0.7,    // 创造性 (0-1)
  maxTokens: 4096,     // 最大输出 Token 数
  topP: 0.9,           // 核采样参数
}
```

---

## 9. 调试方法

### 9.1 结构化日志

```bash
# 查看 AI 网关日志
docker compose logs grt-app 2>&1 | grep '"module":"ai-gateway"'

# 查看 Agent 安全日志
docker compose logs grt-app 2>&1 | grep '"module":"agent-security"'

# 格式化输出
docker compose logs grt-app 2>&1 | npx pino-pretty --search 'module == "ai-gateway"'
```

### 9.2 审计日志查询

```sql
-- 查看最近 Agent 执行记录
SELECT execution_id, agent_code, status, execution_time_ms,
       tokens_used, created_at
FROM agent_execution_logs
ORDER BY created_at DESC
LIMIT 20;

-- 查看失败的执行
SELECT agent_code, error_message, trigger_context, created_at
FROM agent_execution_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- 查看 Agent 调用统计
SELECT assistant_id,
       COUNT(*) as total_calls,
       AVG(response_time_ms) as avg_response_ms,
       SUM(total_tokens) as total_tokens,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM ai_assistant_logs
GROUP BY assistant_id
ORDER BY total_calls DESC;
```

### 9.3 Agent 统计 API

```typescript
import { getAssistantStats } from "../ai-assistants/gateway";

const stats = await getAssistantStats("solution");
console.log(`总调用: ${stats.totalCalls}`);
console.log(`成功率: ${stats.successRate}%`);
console.log(`平均响应: ${stats.avgResponseTime}ms`);
console.log(`总 Token: ${stats.totalTokens}`);
```

---

## 10. 故障排查

### 10.1 Agent 调用超时

**现象**: AI 响应超过 30 秒，日志显示 `status: "timeout"`

**排查步骤**:

```bash
# 1. 检查 LLM API 连通性
curl -s --max-time 10 http://localhost:11434/api/tags  # Ollama
curl -s --max-time 10 -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models  # OpenAI

# 2. 检查网络延迟
ping api.openai.com

# 3. 查看超时日志
docker compose logs grt-app 2>&1 | grep '"status":"timeout"'
```

**解决方案**:
- 切换到延迟更低的 AI 提供商 (如本地 Ollama)
- 减小 `maxTokens` 限制
- 检查系统 Prompt 是否过长

### 10.2 速率限制

**现象**: 返回 `Rate limit exceeded`

```bash
# 查看速率限制记录
docker compose logs grt-app 2>&1 | grep '"status":"rate_limited"'
```

**解决方案**: 修改 Agent 配置中的 `rateLimit` 值，或在 `config.ts` 中调整。

### 10.3 工具未找到

**现象**: `Assistant not found: xxx`

```bash
# 检查 Agent 是否已注册
docker compose exec postgres psql -U grt -d grt_db \
  -c "SELECT assistant_id, is_enabled FROM ai_assistant_configs;"
```

**解决方案**: 调用 `initializeAssistantConfigs()` 重新同步。

### 10.4 权限拒绝

**现象**: `Agent xxx 无 yyy 表的读取权限`

```bash
# 查看 Agent 权限边界
docker compose logs grt-app 2>&1 | grep "Agent尝试访问禁止表"
```

**解决方案**: 在 `agent-security-sandbox.service.ts` 的 `AGENT_PERMISSIONS` 中调整权限配置。

### 10.5 SQL 注入拦截

**现象**: `检测到危险SQL模式`

这是安全防护机制正常工作。检查 Agent 生成的查询是否包含危险模式 (`;DROP`, `UNION SELECT` 等)。

```bash
# 查看拦截日志
docker compose logs grt-app 2>&1 | grep "Agent SQL注入尝试已拦截"
```

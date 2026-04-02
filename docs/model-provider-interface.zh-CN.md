# GRT 智能系统 — 模型提供商抽象层文档

> 版本: v4.1.0 | 更新日期: 2026-03-23

---

## 目录

1. [系统模型抽象设计](#1-系统模型抽象设计)
2. [核心类型定义](#2-核心类型定义)
3. [统一 Provider 层 (server/llm/)](#3-统一-provider-层-serverllm)
4. [四个 Provider 实现](#4-四个-provider-实现)
5. [调用链说明](#5-调用链说明)
6. [新增 Provider 的方法](#6-新增-provider-的方法)
7. [错误处理策略](#7-错误处理策略)
8. [超时/重试/速率限制](#8-超时重试速率限制)
9. [区域路由](#9-区域路由)
10. [切换模型不改业务代码](#10-切换模型不改业务代码)

---

## 1. 系统模型抽象设计

GRT 的 LLM 调用采用 **双层架构**:
- **遗留层** (`server/_core/llm.ts`): 函数式 API，`invokeLLM()` / `invokeLLMWithProvider()`
- **统一 Provider 层** (`server/llm/`): 面向对象的 `LLMProvider` 接口 + `ProviderRegistry` 注册表

两层并存，业务代码可使用任一方式调用。统一 Provider 层是推荐的新代码调用方式。

```
┌──────────────────────────────────────────────────────────────┐
│                        业务代码层                             │
│  (ai-assistants, ime.service, routers...)                    │
│                                                              │
│  调用方式:                                                    │
│    invokeLLM({ messages, tools, ... })                       │
│    invokeLLMWithProvider({ provider, system, prompt })        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    LLM 抽象层 (llm.ts)                        │
│                                                              │
│  resolveApiUrl() ─── 根据 AI_PROVIDER 选择 API 地址           │
│  resolveModel()  ─── 根据 AI_PROVIDER 选择模型名称            │
│  assertApiKey()  ─── 校验 API 密钥 (Ollama 免密钥)           │
│                                                              │
│  消息标准化: normalizeMessage()                               │
│  工具调用标准化: normalizeToolChoice()                         │
│  响应格式标准化: normalizeResponseFormat()                     │
└──────────────────┬───────────────────────────────────────────┘
                   │ native fetch
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    LLM API 提供商                              │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ OpenAI  │ │ Ollama  │ │ DeepSeek │ │ Gemini       │     │
│  │ /v1/    │ │ /v1/    │ │ /v1/     │ │ OpenAI兼容   │     │
│  │ chat/   │ │ chat/   │ │ chat/    │ │ /v1beta/     │     │
│  │ compl.  │ │ compl.  │ │ compl.   │ │ openai/chat  │     │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘     │
│                                                              │
│  (均使用 OpenAI 兼容的 /v1/chat/completions 协议)             │
└──────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **协议统一**: 所有 Provider 均使用 OpenAI 兼容的 chat completions API 协议
2. **环境变量驱动**: 切换 Provider 只需修改 `AI_PROVIDER` 环境变量
3. **零业务侵入**: 业务代码调用 `invokeLLM()` 无需关心底层 Provider
4. **渐进增强**: 支持从简单调用 (`system` + `prompt`) 到复杂调用 (`tools` + `responseFormat`)

---

## 2. 核心类型定义

### 2.1 消息类型

```typescript
// server/_core/llm.ts

export type Role = "system" | "user" | "assistant" | "tool" | "function";

// 支持文本、图片、文件三种内容类型
export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;           // 函数/工具名称
  tool_call_id?: string;   // 工具调用 ID
};
```

### 2.2 工具定义

```typescript
export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;  // JSON Schema
  };
};

export type ToolChoice = "none" | "auto" | "required"
  | { name: string }
  | { type: "function"; function: { name: string } };
```

### 2.3 调用参数

```typescript
export type InvokeParams = {
  // 完整消息列表
  messages?: Message[];

  // 便捷方式: system + prompt (自动转为 messages)
  system?: string;
  prompt?: string;

  // 工具调用
  tools?: Tool[];
  toolChoice?: ToolChoice;

  // 结构化输出
  outputSchema?: JsonSchema;
  responseFormat?: ResponseFormat;

  // 便捷 JSON Schema (自动包装为 outputSchema)
  schema?: Record<string, unknown>;
};
```

### 2.4 调用结果

```typescript
export type InvokeResult = {
  id?: string;
  content?: string | null;         // 便捷字段: 第一个 choice 的内容
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: {               // 工具调用结果
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

---

## 3. 统一 Provider 层 (server/llm/)

GRT v4.1 新增了 `server/llm/` 目录，提供面向对象的 Provider 抽象:

### 3.1 文件结构

```
server/llm/
  index.ts                  # Barrel export (providerRegistry, types, logger)
  provider-interface.ts     # LLMProvider 接口定义
  provider-registry.ts      # ProviderRegistry 单例注册表
  model-call-logger.ts      # 结构化调用日志
  providers/
    openai.ts               # OpenAIProvider 实现
    ollama.ts               # OllamaProvider 实现
    gemini.ts               # GeminiProvider 实现
    deepseek.ts             # DeepSeekProvider 实现
```

### 3.2 LLMProvider 接口

```typescript
// server/llm/provider-interface.ts

export interface LLMProvider {
  readonly name: string;          // "openai" | "ollama" | "gemini" | "deepseek"

  chat(
    messages: ChatMessage[],
    options?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse>;

  healthCheck(): Promise<HealthCheckResult>;
}

export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: LLMUsage;
  duration_ms: number;
  request_id: string;
}

export interface HealthCheckResult {
  ok: boolean;
  latency_ms: number;
  model: string;
  error?: string;
}
```

### 3.3 ProviderRegistry 使用

```typescript
import { providerRegistry } from "../llm";

// 使用默认 Provider (由 AI_PROVIDER 环境变量决定)
const provider = providerRegistry.getProvider();
const response = await provider.chat([
  { role: "system", content: "你是一位工业清洗专家" },
  { role: "user", content: "分析客户需求..." },
]);

// 显式指定 Provider
const gemini = providerRegistry.getProvider("gemini");
const result = await gemini.chat(messages, { temperature: 0.3 });

// 全 Provider 健康检查
const healthResults = await providerRegistry.healthCheckAll();

// 列出已注册的 Provider
const providers = providerRegistry.listProviders();
```

### 3.4 调用日志

每次 LLM 调用均通过 `model-call-logger.ts` 记录结构化日志:

```json
{"level":30,"module":"llm","msg":"LLM call completed","request_id":"openai-1711008000-abc123","provider":"openai","model":"gpt-4o","total_tokens":1234,"duration_ms":890,"success":true}
```

---

## 4. 四个 Provider 实现

### 4.1 OpenAI

```typescript
// 环境变量
env.OPENAI_API_KEY       // API 密钥
env.OPENAI_BASE_URL      // 默认: https://api.openai.com/v1
env.OPENAI_MODEL         // 默认: gpt-4o

// API 地址解析
// → https://api.openai.com/v1/chat/completions
`${env.OPENAI_BASE_URL}/chat/completions`

// 认证方式
headers.authorization = `Bearer ${ENV.forgeApiKey}`;
```

适用场景: 生产环境，需要最高质量的 AI 输出。

### 4.2 Ollama (本地部署)

```typescript
// 环境变量
env.OLLAMA_BASE_URL      // 默认: http://localhost:11434
env.OLLAMA_MODEL         // 默认: llama3.1

// API 地址解析
// → http://localhost:11434/v1/chat/completions
`${env.OLLAMA_BASE_URL}/v1/chat/completions`

// 认证方式
// 无需 API Key
```

适用场景: 开发环境、离线环境、数据敏感场景。

### 4.3 DeepSeek

```typescript
// 环境变量
env.DEEPSEEK_API_KEY     // API 密钥

// API 地址解析 (硬编码)
"https://api.deepseek.com/v1/chat/completions"

// 模型
"deepseek-chat"

// 认证方式
headers.authorization = `Bearer ${ENV.forgeApiKey}`;
```

适用场景: 中国区域部署，高性价比选择。

### 4.4 Gemini

```typescript
// 环境变量
env.GEMINI_API_KEY       // API 密钥
env.GEMINI_BASE_URL      // 默认: https://generativelanguage.googleapis.com/v1beta/openai
env.GEMINI_MODEL         // 默认: gemini-2.0-flash

// API 地址解析
// → https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
`${env.GEMINI_BASE_URL}/chat/completions`

// 认证方式
headers.authorization = `Bearer ${apiKey}`;
```

适用场景: 需要长上下文窗口、多模态能力。

### 4.5 Anthropic (Claude)

通过 `invokeLLMWithProvider` 支持:

```typescript
// 环境变量
env.ANTHROPIC_API_KEY    // API 密钥
env.ANTHROPIC_BASE_URL   // 默认: https://api.anthropic.com/v1
env.ANTHROPIC_MODEL      // 默认: claude-sonnet-4-20250514

// API 地址 (使用原生 Anthropic API，非 OpenAI 兼容)
`${env.ANTHROPIC_BASE_URL}/messages`

// 认证方式 (Anthropic 特有)
headers["x-api-key"] = apiKey;
headers["anthropic-version"] = "2023-06-01";
```

---

## 5. 调用链说明

### 5.1 标准调用链 (invokeLLM) — 遗留层

```
业务代码
  └→ invokeLLM({ messages, tools, schema })
       └→ assertApiKey()           // 校验 API Key (Ollama 跳过)
       └→ resolveModel()           // 根据 AI_PROVIDER 选择模型
       └→ normalizeMessage()       // 标准化消息格式
       └→ normalizeToolChoice()    // 标准化工具选择
       └→ normalizeResponseFormat() // 标准化响应格式
       └→ resolveApiUrl()          // 根据 AI_PROVIDER 选择 API 地址
       └→ fetch(apiUrl, { body })  // 原生 HTTP 请求
       └→ 解析响应 → InvokeResult
```

### 5.2 多 Provider 调用链 (invokeLLMWithProvider) — 遗留层

```
业务代码
  └→ invokeLLMWithProvider({ provider: "gemini", system, prompt })
       ├→ provider === "claude"
       │    └→ 直接调用 Anthropic Messages API
       ├→ provider === "gemini"
       │    └→ 调用 Gemini OpenAI 兼容端点
       └→ provider === "openai"
            └→ 委托给 invokeLLM()
```

### 5.3 统一 Provider 层调用链 (推荐)

```
业务代码
  └→ providerRegistry.getProvider("openai")  // 按名获取或使用默认
       └→ ensureInitialized()                // 首次访问时自动注册 4 个 Provider
       └→ providers.get("openai")            // 从 Map 中取出实例
       └→ return OpenAIProvider
  └→ provider.chat(messages, options)
       └→ fetch(apiUrl, requestBody)         // 原生 HTTP 请求
       └→ logModelCall(result)               // 结构化日志
       └→ return LLMResponse
```

### 5.4 API Key 解析优先级

```
BUILT_IN_FORGE_API_KEY → LLM_API_KEY → OPENAI_API_KEY
```

### 5.5 API URL 解析优先级

```
BUILT_IN_FORGE_API_URL → LLM_API_URL → Provider 默认 URL
```

---

## 6. 新增 Provider 的方法

### 方式 A: 统一 Provider 层 (推荐)

#### 步骤 1: 创建 Provider 实现

在 `server/llm/providers/` 中创建新文件:

```typescript
// server/llm/providers/myprovider.ts
import { env } from "../../_core/env";
import type { ChatMessage, HealthCheckResult, LLMProvider, LLMProviderConfig, LLMResponse } from "../provider-interface";
import { logModelCall, logModelCallError } from "../model-call-logger";

export class MyProvider implements LLMProvider {
  readonly name = "myprovider";

  private get apiKey(): string { return env.MYPROVIDER_API_KEY; }
  private get baseUrl(): string { return env.MYPROVIDER_BASE_URL || "https://api.myprovider.com/v1"; }
  private get defaultModel(): string { return env.MYPROVIDER_MODEL || "my-model-v1"; }

  async chat(messages: ChatMessage[], options?: Partial<LLMProviderConfig>): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const requestId = `myprovider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();
    // ... 实现 fetch 调用 ...
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // ... 实现连通性检查 ...
  }
}
```

#### 步骤 2: 注册到 ProviderRegistry

在 `server/llm/provider-registry.ts` 的 `ensureInitialized()` 中添加:

```typescript
import { MyProvider } from "./providers/myprovider";
// ...
this.register(new MyProvider());
```

#### 步骤 3: 添加环境变量并更新 .env.example

```bash
MYPROVIDER_API_KEY=
MYPROVIDER_BASE_URL=https://api.myprovider.com/v1
MYPROVIDER_MODEL=my-model-v1
```

### 方式 B: 遗留层 (server/_core/llm.ts)

#### 步骤 1: 添加环境变量

在 `server/_core/env.ts` 中添加:

```typescript
export const env = {
  ...ENV,
  // 新增: MyProvider 配置
  MYPROVIDER_API_KEY: process.env.MYPROVIDER_API_KEY ?? "",
  MYPROVIDER_BASE_URL: process.env.MYPROVIDER_BASE_URL ?? "https://api.myprovider.com/v1",
  MYPROVIDER_MODEL: process.env.MYPROVIDER_MODEL ?? "my-model-v1",
};
```

#### 步骤 2: 更新 resolveApiUrl

在 `server/_core/llm.ts` 的 `resolveApiUrl()` 中添加 case:

```typescript
const resolveApiUrl = (): string => {
  // ... 现有逻辑 ...
  switch (provider) {
    case "myprovider":
      return `${env.MYPROVIDER_BASE_URL.replace(/\/$/, "")}/chat/completions`;
    // ... 其他 case ...
  }
};
```

#### 步骤 3: 更新 resolveModel

```typescript
const resolveModel = (): string => {
  switch (provider) {
    case "myprovider":
      return env.MYPROVIDER_MODEL || "my-model-v1";
    // ...
  }
};
```

#### 步骤 4: 更新 assertApiKey

```typescript
const assertApiKey = () => {
  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";
  if (provider === "ollama") return;       // Ollama 免密钥
  if (provider === "myprovider") {
    if (!env.MYPROVIDER_API_KEY) {
      throw new Error("MYPROVIDER_API_KEY not configured");
    }
    return;
  }
  // ... 现有逻辑 ...
};
```

#### 步骤 5: 更新 .env.example

```bash
# MyProvider 配置
MYPROVIDER_API_KEY=
MYPROVIDER_BASE_URL=https://api.myprovider.com/v1
MYPROVIDER_MODEL=my-model-v1
```

#### 步骤 6: 如果 API 不兼容 OpenAI 格式

需在 `invokeLLMWithProvider` 中添加专属分支:

```typescript
if (provider === "myprovider") {
  // 自定义 API 调用逻辑
  const res = await fetch(url, { /* 自定义请求体 */ });
  // 将响应转换为 MultiProviderResult 格式
  return { content, usage, model, provider };
}
```

---

## 7. 错误处理策略

### 7.1 API 错误

```typescript
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(
    `LLM invoke failed (${provider}): ${response.status} ${response.statusText} – ${errorText}`
  );
}
```

错误码对照:

| HTTP 状态码 | 含义 | 处理方式 |
|------------|------|---------|
| 400 | 请求参数错误 | 检查消息格式、工具定义 |
| 401 | API Key 无效 | 更新 API Key |
| 403 | 权限不足 | 检查 API Key 权限范围 |
| 429 | 速率限制 | 等待后重试 |
| 500 | 服务端错误 | 重试或切换 Provider |
| 503 | 服务不可用 | 重试或切换 Provider |

### 7.2 超时处理

AI 网关层 (`gateway.ts`) 内置超时检测:

```typescript
const isTimeout = error.message?.includes("timeout") || responseTimeMs > 30000;
```

### 7.3 业务层重试建议

```typescript
async function invokeWithRetry(params: InvokeParams, maxRetries = 2): Promise<InvokeResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await invokeLLM(params);
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      if (error.message?.includes("429")) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  throw new Error("Unreachable");
}
```

---

## 8. 超时/重试/速率限制

### 8.1 超时配置

统一 Provider 层通过 `LLMProviderConfig.timeout` 控制单次调用超时:

```typescript
const provider = providerRegistry.getProvider();
const result = await provider.chat(messages, {
  timeout: 30000,  // 30 秒超时 (默认无限制)
});
```

遗留层通过 AI 网关 (`gateway.ts`) 的内置检测:

```typescript
const isTimeout = error.message?.includes("timeout") || responseTimeMs > 30000;
```

.env 中的全局超时配置:

```bash
MODEL_TIMEOUT=30000    # 毫秒
```

### 8.2 重试策略

系统未内置自动重试，建议业务层按需实现:

```typescript
async function chatWithRetry(
  provider: LLMProvider,
  messages: ChatMessage[],
  maxRetries = 2,
): Promise<LLMResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await provider.chat(messages, { timeout: 30000 });
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      if (error.message?.includes("429")) {
        // 速率限制 — 指数退避
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  throw new Error("Unreachable");
}
```

### 8.3 速率限制

速率限制在 AI 网关层 (`server/ai-assistants/gateway.ts`) 实现:

- 每个 Agent 独立配置 `rateLimit` (每小时请求数，默认 100)
- 超限返回 `status: "rate_limited"`
- 可通过 `server/ai-assistants/config.ts` 调整每个 Agent 的限额

```bash
# 查看速率限制日志
docker compose logs grt-app 2>&1 | grep '"status":"rate_limited"'
```

---

## 9. 区域路由

GRT 支持基于 `APP_REGION` 环境变量的区域路由:

| 区域 | 值 | 默认 AI Provider | 说明 |
|------|---|-----------------|------|
| 美国 | `US` | OpenAI (gpt-4o) | 延迟最低 |
| 中国 | `CN` | DeepSeek | 无需翻墙 |
| 德国 | `DE` | OpenAI | GDPR 合规 |
| 离线 | `OFFLINE` | Ollama | 纯内网环境 |

### 自动路由配置

```bash
# .env
APP_REGION=CN
AI_PROVIDER=auto    # 根据区域自动选择

# auto 的路由逻辑:
# CN → deepseek
# US → openai
# DE → openai
# OFFLINE → ollama
```

### 手动覆盖

```bash
# 即使在 CN 区域，也可以强制使用 OpenAI
APP_REGION=CN
AI_PROVIDER=openai   # 手动覆盖，不用 auto

# 通过代理访问 OpenAI
OPENAI_BASE_URL=http://your-proxy:8443/v1
```

---

## 10. 切换模型不改业务代码

### 核心原理

所有业务代码只调用两个函数:

```typescript
import { invokeLLM } from "../_core/llm";
import { invokeLLMWithProvider } from "../_core/llm";
```

这两个函数内部通过环境变量动态选择 Provider，业务代码无需修改。

### 切换步骤

只需修改 `.env` 文件:

```bash
# 从 OpenAI 切换到 Ollama
# 修改前:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx

# 修改后:
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

然后重启服务:

```bash
docker compose restart grt-app
```

### 不需要改的文件

- 所有 `server/ai-assistants/*.ts` — 不需要改
- 所有 `server/routers/*.router.ts` — 不需要改
- 所有 `server/services/*.service.ts` — 不需要改
- 所有前端页面 — 不需要改

### 需要改的文件

- `.env` — 修改 `AI_PROVIDER` 及对应 Provider 的配置
- 无其他文件需要修改

### 验证切换成功

```bash
# 1. 检查环境变量
docker compose exec grt-app sh -c "echo \$AI_PROVIDER"

# 2. 查看启动日志中的 Provider 信息
docker compose logs grt-app 2>&1 | grep "Active environment"

# 3. 通过 AI 助手发送测试消息
curl -X POST http://localhost:3000/api/trpc/aiAssistant.chat \
  -H "Content-Type: application/json" \
  -d '{"json":{"assistantId":"solution","message":"测试消息"}}'

# 4. 检查日志确认使用的 Provider
docker compose logs --tail=20 grt-app 2>&1 | grep "LLM"
```

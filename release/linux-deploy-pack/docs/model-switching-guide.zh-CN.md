# GRT 智能系统 — 模型切换指南

> 版本: v4.1.0 | 更新日期: 2026-03-23

---

## 目录

1. [切换原理](#1-切换原理)
2. [从 OpenAI 切换到 Ollama](#2-从-openai-切换到-ollama)
3. [从 OpenAI 切换到 Gemini](#3-从-openai-切换到-gemini)
4. [从 OpenAI 切换到 DeepSeek](#4-从-openai-切换到-deepseek)
5. [切换前后配置对照](#5-切换前后配置对照)
6. [哪些地方不需要改代码](#6-哪些地方不需要改代码)
7. [验证切换成功](#7-验证切换成功)
8. [回滚方式](#8-回滚方式)

---

## 1. 切换原理

GRT 有两层 LLM 调用抽象:
- **遗留层** (`server/_core/llm.ts`): `invokeLLM()` / `invokeLLMWithProvider()`
- **统一 Provider 层** (`server/llm/`): `providerRegistry.getProvider().chat()`

两层都通过环境变量 `AI_PROVIDER` 动态选择 API 提供商。切换时 **只需修改环境变量，不需要改任何业务代码**。

```
.env 中的 AI_PROVIDER
       │
       ├── "openai"   → OPENAI_BASE_URL + OPENAI_API_KEY + OPENAI_MODEL
       ├── "ollama"   → OLLAMA_BASE_URL + OLLAMA_MODEL (无需 API Key)
       ├── "deepseek" → DEEPSEEK_API_KEY (地址和模型硬编码)
       └── "gemini"   → 通过 invokeLLMWithProvider 显式调用
```

---

## 2. 从 OpenAI 切换到 Ollama

### 前提条件

- 已安装 Ollama (`curl -fsSL https://ollama.com/install.sh | sh`)
- 已下载目标模型 (`ollama pull llama3.1`)

### 步骤

**第 1 步: 备份当前 `.env`**

```bash
cp .env .env.backup.openai
```

**第 2 步: 修改 `.env`**

```bash
# 修改前 (OpenAI):
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# 修改后 (Ollama):
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# OpenAI 的配置可以保留不删，不会生效
```

> **Docker 环境注意**: 如果 GRT 在 Docker 中运行而 Ollama 在宿主机上，使用 `OLLAMA_BASE_URL=http://host.docker.internal:11434`。

**第 3 步: 确认 Ollama 服务已启动**

```bash
# 检查 Ollama 运行状态
curl http://localhost:11434/api/tags
```

**第 4 步: 重启 GRT 服务**

```bash
docker compose restart grt-app
```

**第 5 步: 验证**

```bash
# 检查日志
docker compose logs --tail=20 grt-app 2>&1 | grep "Active environment"

# 发送测试请求
curl -s http://localhost:3000/api/health | jq .
```

---

## 3. 从 OpenAI 切换到 Gemini

### 前提条件

- 已获取 Gemini API Key ([Google AI Studio](https://aistudio.google.com/apikey))
- 网络可访问 `generativelanguage.googleapis.com`

### 注意

Gemini 的切换方式与 OpenAI/Ollama/DeepSeek 不同。Gemini 是通过 `invokeLLMWithProvider` 的 `provider` 参数显式选择的，**不受 `AI_PROVIDER` 环境变量控制**。

### 步骤

**第 1 步: 在 `.env` 中添加 Gemini 配置**

```bash
# 添加以下配置 (不需要改 AI_PROVIDER):
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.0-flash
```

**第 2 步: 在业务代码中显式调用 Gemini**

```typescript
import { invokeLLMWithProvider } from "../_core/llm";

// 显式指定 provider 为 "gemini"
const result = await invokeLLMWithProvider({
  provider: "gemini",
  system: "你是一位业务专家",
  prompt: "分析以下数据...",
});
```

**第 3 步: 重启服务**

```bash
docker compose restart grt-app
```

> **提示**: Gemini 可以与 OpenAI/Ollama 并存。`AI_PROVIDER` 控制默认 Provider (供 `invokeLLM` 使用)，而 Gemini 通过 `invokeLLMWithProvider` 独立调用。

---

## 4. 从 OpenAI 切换到 DeepSeek

### 前提条件

- 已获取 DeepSeek API Key ([platform.deepseek.com](https://platform.deepseek.com/))
- 账户有余额

### 步骤

**第 1 步: 备份当前 `.env`**

```bash
cp .env .env.backup.openai
```

**第 2 步: 修改 `.env`**

```bash
# 修改前 (OpenAI):
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx

# 修改后 (DeepSeek):
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

> **注意**: DeepSeek 的 API 地址和模型名在代码中硬编码 (`https://api.deepseek.com/v1/chat/completions` 和 `deepseek-chat`)，无需额外配置。

**第 3 步: 重启 GRT 服务**

```bash
docker compose restart grt-app
```

**第 4 步: 验证**

```bash
docker compose logs --tail=20 grt-app
```

---

## 5. 切换前后配置对照

### 需要修改的内容

| 项目 | OpenAI | Ollama | DeepSeek | Gemini |
|------|--------|--------|----------|--------|
| `AI_PROVIDER` | `openai` | `ollama` | `deepseek` | `gemini` |
| API Key 变量 | `OPENAI_API_KEY` | (不需要) | `DEEPSEEK_API_KEY` | `GEMINI_API_KEY` |
| API 地址 | `OPENAI_BASE_URL` | `OLLAMA_BASE_URL` | (硬编码) | (硬编码) |
| 模型名 | `OPENAI_MODEL` | `OLLAMA_MODEL` | (硬编码: deepseek-chat) | `GEMINI_MODEL` |

### 需要修改的文件

| 文件 | 是否需要修改 | 修改内容 |
|------|------------|---------|
| `.env` | 是 | `AI_PROVIDER` + 对应 Provider 的配置 |
| 业务代码 (`*.ts`) | **否** | 无需任何修改 |
| 前端代码 (`*.tsx`) | **否** | 无需任何修改 |
| `docker-compose.yml` | **否** | 无需修改 |
| `Dockerfile` | **否** | 无需修改 |

---

## 6. 哪些地方不需要改代码

### 以下文件/目录完全不受 Provider 切换影响:

```
client/                           # 整个前端 — 不需要改
server/ai-assistants/             # AI 助手 — 不需要改
server/routers/                   # 所有路由 — 不需要改
server/services/                  # 所有服务 — 不需要改
server/ime/                       # IME 服务 — 不需要改
drizzle/                          # 数据库 Schema — 不需要改
docker-compose.yml                # Docker 配置 — 不需要改
Dockerfile                        # 构建文件 — 不需要改
```

### 原因

所有业务代码只依赖两个抽象函数:

```typescript
// 默认 Provider (由 AI_PROVIDER 决定)
import { invokeLLM } from "../_core/llm";

// 多 Provider 显式调用
import { invokeLLMWithProvider } from "../_core/llm";
```

这两个函数内部根据环境变量动态路由，业务层完全解耦。

---

## 7. 验证切换成功

### 7.1 检查服务启动日志

```bash
docker compose logs --tail=50 grt-app 2>&1 | head -20
```

预期看到:

```
{"level":30,"module":"env","msg":"Active environment","environment":"PRODUCTION"}
```

### 7.2 调用健康检查

```bash
curl -s http://localhost:3000/api/health | jq .
# 预期: {"status":"ok"}
```

### 7.3 发送 AI 测试请求

通过前端页面或 API 直接测试:

```bash
# 通过 tRPC 接口测试
curl -X POST http://localhost:3000/api/trpc/aiAssistant.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"json":{"assistantId":"solution","message":"你好，请做个自我介绍"}}'
```

### 7.4 检查审计日志

```sql
-- 连接数据库查看最近的 AI 调用记录
SELECT assistant_id, status, response_time_ms, created_at
FROM ai_assistant_logs
ORDER BY created_at DESC
LIMIT 5;
```

### 7.5 检查 Token 消耗

```sql
-- 确认 Token 正常计数
SELECT assistant_id, input_tokens, output_tokens, total_tokens
FROM ai_assistant_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 8. 回滚方式

### 8.1 快速回滚 (恢复备份)

```bash
# 恢复之前的 .env 备份
cp .env.backup.openai .env

# 重启服务
docker compose restart grt-app
```

### 8.2 手动回滚

编辑 `.env`，将 `AI_PROVIDER` 改回原值:

```bash
AI_PROVIDER=openai
```

然后重启:

```bash
docker compose restart grt-app
```

### 8.3 回滚验证

```bash
# 确认 Provider 已切回
docker compose logs --tail=5 grt-app

# 发送测试请求验证
curl -s http://localhost:3000/api/health | jq .
```

> **注意**: Provider 切换和回滚不影响数据库数据。AI 调用日志会记录每次调用使用的 Provider 信息，方便事后审计。

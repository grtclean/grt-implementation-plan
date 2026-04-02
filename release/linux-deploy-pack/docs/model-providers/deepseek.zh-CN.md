# GRT 智能系统 — DeepSeek Provider 配置指南

> 更新日期: 2026-03-23

---

## 适用场景

- **中国区域** (`APP_REGION=CN`) 推荐 Provider
- 无需翻墙，国内直连
- 高性价比 (价格远低于 OpenAI)
- 中文理解能力强
- 推理能力出色 (DeepSeek-R1)

---

## 所需环境变量

```bash
# 必填
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key

# 注意: DeepSeek 的 API 地址和模型名在代码中硬编码
# API 地址: https://api.deepseek.com/v1/chat/completions
# 模型: deepseek-chat
```

---

## 配置示例

### 标准配置

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 中国区域完整配置

```bash
NODE_ENV=production
APP_REGION=CN
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 支持的模型列表

| 模型 | 上下文窗口 | 推荐用途 | 说明 |
|------|-----------|---------|------|
| `deepseek-chat` | 64K | 通用 (默认) | DeepSeek-V3 |
| `deepseek-reasoner` | 64K | 复杂推理 | DeepSeek-R1 |

> **注意**: GRT 系统中 DeepSeek 模型名硬编码为 `deepseek-chat`。如需使用 `deepseek-reasoner`，需修改 `server/_core/llm.ts` 中的 `resolveModel()` 函数。

---

## base_url 说明

DeepSeek 的 API 地址在代码中硬编码:

```typescript
// server/_core/llm.ts
case "deepseek":
  return "https://api.deepseek.com/v1/chat/completions";
```

DeepSeek API 完全兼容 OpenAI 的 chat completions 协议，无需额外适配。

---

## 功能支持

| 功能 | 是否支持 |
|------|---------|
| Streaming | DeepSeek 原生支持 (框架层未启用) |
| Tool Calling / Function Calling | 支持 |
| Structured Output (JSON) | 支持 |
| Embeddings | 需使用 DeepSeek 原生 API |
| 多模态 (图片) | deepseek-chat 不支持 |
| 中文优化 | 原生中文训练，质量高 |

---

## 统一 Provider 层调用

```typescript
import { providerRegistry } from "../llm";

const deepseek = providerRegistry.getProvider("deepseek");
const result = await deepseek.chat([
  { role: "system", content: "你是一位GRT公司的AI助手" },
  { role: "user", content: "分析本月产能数据" },
], {
  temperature: 0.5,
  maxTokens: 4096,
  timeout: 30000,
});

console.log(result.content);
console.log(result.usage?.total_tokens);

// 健康检查 (发送最小 chat 请求验证连通性)
const health = await deepseek.healthCheck();
```

---

## 切换示例

### 从 OpenAI 切换到 DeepSeek

```bash
# 修改 .env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-key

# 可选: 注释掉 OpenAI 配置
# OPENAI_API_KEY=sk-...

# 重启服务
docker compose restart grt-app
```

### 从 Ollama 切换到 DeepSeek

```bash
# 修改 .env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-key

# 重启服务
docker compose restart grt-app
```

---

## API Key 获取

1. 访问 [DeepSeek Platform](https://platform.deepseek.com/)
2. 注册账号并登录
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 充值 (按量计费)

---

## 常见报错与排查

### `401 Authentication Failed`

**原因**: API Key 无效或余额不足。

**解决**:
```bash
# 测试 API Key
curl -s https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" | jq .
```

- 检查 [DeepSeek 控制台](https://platform.deepseek.com/) 的 Key 状态和余额

### `429 Rate Limited`

**原因**: 超过并发限制。

**解决**:
- DeepSeek 免费账户有较低的并发限制
- 升级到付费账户以获得更高限额

### `400 context_length_exceeded`

**原因**: 输入内容超过 64K Token 限制。

**解决**:
- 缩短系统 Prompt 或用户消息
- 减少历史对话上下文

### 响应质量不如 OpenAI

**注意**: DeepSeek-V3 在大多数任务上接近 GPT-4 水平，但在某些英文任务或复杂逻辑推理上可能略有差距。

**建议**:
- 使用 `deepseek-reasoner` (R1) 模型处理复杂推理任务
- 优化系统 Prompt，针对中文场景调整指令

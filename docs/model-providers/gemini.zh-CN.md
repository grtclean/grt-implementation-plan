# GRT 智能系统 — Gemini Provider 配置指南

> 更新日期: 2026-03-23

---

## 适用场景

- 需要超长上下文窗口 (高达 2M tokens)
- 多模态任务 (图片、音频、视频)
- 需要 Google 生态集成
- 通过 `invokeLLMWithProvider({ provider: "gemini" })` 显式调用

> **注意**: Gemini 通过 `invokeLLMWithProvider` 多 Provider 接口调用，而非默认的 `invokeLLM`。它使用 Google 提供的 OpenAI 兼容端点。

---

## 所需环境变量

```bash
# 必填
GEMINI_API_KEY=your-gemini-api-key

# 选填 (有默认值)
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.0-flash
```

---

## 配置示例

### 标准配置

```bash
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.0-flash
```

### 使用 Gemini Pro

```bash
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-pro
```

---

## 支持的模型列表

| 模型 | 上下文窗口 | 推荐用途 | 说明 |
|------|-----------|---------|------|
| `gemini-2.0-flash` | 1M | 通用 (推荐) | 速度快、成本低 |
| `gemini-2.0-flash-lite` | 1M | 轻量任务 | 极低成本 |
| `gemini-1.5-pro` | 2M | 复杂分析 | 超长上下文 |
| `gemini-1.5-flash` | 1M | 快速推理 | 高性价比 |

---

## base_url 说明

`GEMINI_BASE_URL` 是 Google 提供的 OpenAI 兼容端点:

```
${GEMINI_BASE_URL}/chat/completions
```

默认值: `https://generativelanguage.googleapis.com/v1beta/openai`

完整请求地址: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

---

## 功能支持

| 功能 | 是否支持 |
|------|---------|
| Streaming | OpenAI 兼容层支持 |
| Tool Calling | 支持 |
| Structured Output | 支持 |
| Embeddings | 需使用原生 API |
| 多模态 (图片/音频/视频) | 支持 |
| 长上下文 (>100K) | 支持 (最大 2M) |

---

## 调用方式

### 方式 1: 统一 Provider 层 (推荐)

```typescript
import { providerRegistry } from "../llm";

// 通过 AI_PROVIDER=gemini 或显式指定
const gemini = providerRegistry.getProvider("gemini");

const result = await gemini.chat([
  { role: "system", content: "你是一位工业清洗专家" },
  { role: "user", content: "分析这个客户需求..." },
], {
  maxTokens: 16384,
});

console.log(result.content);
console.log(result.model);      // gemini-2.0-flash
console.log(result.provider);   // gemini
console.log(result.duration_ms);

// 健康检查
const health = await gemini.healthCheck();
```

> **注意**: 统一 Provider 层的 GeminiProvider 使用 Gemini 原生 `generateContent` API (非 OpenAI 兼容端点)，自动将 ChatMessage 转换为 Gemini 的 contents 格式，并将 system 消息合并到第一个 user 消息中。

### 方式 2: 遗留层

```typescript
import { invokeLLMWithProvider } from "../_core/llm";

const result = await invokeLLMWithProvider({
  provider: "gemini",
  system: "你是一位工业清洗专家",
  prompt: "分析这个客户需求...",
  maxTokens: 16384,
});
```

---

## 切换示例

### 在业务代码中使用 Gemini

```bash
# .env 中配置 Gemini 凭据
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash
```

Gemini 是通过 `provider` 参数显式选择的，不受 `AI_PROVIDER` 环境变量影响。

---

## 常见报错与排查

### `403 Forbidden`

**原因**: API Key 无效或未启用 Gemini API。

**解决**:
- 在 [Google AI Studio](https://aistudio.google.com/apikey) 检查 Key
- 确保已启用 Generative Language API

### `400 Bad Request`

**原因**: 模型名拼写错误或请求格式不兼容。

**解决**: 检查 `GEMINI_MODEL` 是否为有效模型名。

### 中国区域无法访问

**原因**: `generativelanguage.googleapis.com` 在中国大陆不可访问。

**解决**:
- 使用代理服务器
- 或切换到 DeepSeek: `AI_PROVIDER=deepseek`

### Token 计数不准确

**原因**: OpenAI 兼容层的 `usage` 字段可能与原生 API 略有差异。

**解决**: 以 Google AI Studio 的用量统计为准。

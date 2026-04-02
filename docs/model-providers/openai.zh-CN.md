# GRT 智能系统 — OpenAI Provider 配置指南

> 更新日期: 2026-03-23

---

## 适用场景

- **生产环境** 首选，模型质量最高
- 需要 Function Calling / Tool Use 能力
- 需要结构化输出 (JSON Schema)
- 需要多模态输入 (图片、文件)
- 美国区域 (`APP_REGION=US`) 默认 Provider

---

## 所需环境变量

```bash
# 必填
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key

# 选填 (有默认值)
OPENAI_BASE_URL=https://api.openai.com/v1     # API 基础地址
OPENAI_MODEL=gpt-4o                            # 默认模型
```

---

## 配置示例

### 标准 OpenAI 配置

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

### 通过代理访问 (中国区域)

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=http://your-proxy-server:8443/v1
OPENAI_MODEL=gpt-4o
```

### Azure OpenAI 配置

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-azure-api-key
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/gpt-4o/v1
OPENAI_MODEL=gpt-4o
```

---

## 支持的模型列表

| 模型 | 推荐用途 | 上下文窗口 | 说明 |
|------|---------|-----------|------|
| `gpt-4o` | 通用 (推荐) | 128K | 最佳性价比 |
| `gpt-4o-mini` | 轻量任务 | 128K | 成本更低 |
| `gpt-4-turbo` | 复杂推理 | 128K | 强推理能力 |
| `o1` | 深度思考 | 200K | 推理模型 |
| `o1-mini` | 轻量推理 | 128K | 推理模型 (快) |
| `o3-mini` | 高效推理 | 200K | 最新推理模型 |

---

## base_url 说明

`OPENAI_BASE_URL` 是 API 请求的基础地址，系统会自动拼接:

```
${OPENAI_BASE_URL}/chat/completions
```

默认值: `https://api.openai.com/v1`

完整请求地址: `https://api.openai.com/v1/chat/completions`

---

## 功能支持

| 功能 | 是否支持 |
|------|---------|
| Streaming | 框架层未启用 (可扩展) |
| Tool Calling / Function Calling | 支持 |
| Structured Output (JSON Schema) | 支持 |
| Embeddings | 需单独配置 (非 llm.ts 范围) |
| 多模态 (图片/文件) | 支持 |
| Thinking / 思考过程 | 不启用 (代码中跳过 OpenAI) |

---

## 统一 Provider 层调用

```typescript
import { providerRegistry } from "../llm";

// 方式 1: 通过 AI_PROVIDER=openai 自动选择
const provider = providerRegistry.getProvider();

// 方式 2: 显式指定
const openai = providerRegistry.getProvider("openai");

const result = await openai.chat([
  { role: "system", content: "你是一位方案设计专家" },
  { role: "user", content: "客户需要清洗200mm硅片..." },
], {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 30000,
});

console.log(result.content);      // AI 回复
console.log(result.duration_ms);  // 耗时
console.log(result.usage);        // Token 用量
```

---

## 切换示例

### 从 Ollama 切换到 OpenAI

```bash
# 修改 .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o

# 重启服务
docker compose restart grt-app
```

---

## 常见报错与排查

### `401 Unauthorized`

```
LLM invoke failed (openai): 401 Unauthorized
```

**原因**: API Key 无效或过期。

**解决**: 在 [platform.openai.com](https://platform.openai.com/api-keys) 检查 Key 状态。

### `429 Too Many Requests`

**原因**: 超过 OpenAI 的 RPM/TPM 限制。

**解决**:
- 检查 OpenAI 账户的 Usage Tier
- 降低并发请求数量
- 切换到 `gpt-4o-mini` 降低 Token 消耗

### `400 Bad Request: invalid model`

**原因**: `OPENAI_MODEL` 设置了不存在的模型名。

**解决**: 检查 `.env` 中模型名是否拼写正确。

### 网络超时 (中国区域)

**原因**: 中国大陆无法直连 `api.openai.com`。

**解决**:
- 使用代理: `OPENAI_BASE_URL=http://your-proxy:8443/v1`
- 或切换到 DeepSeek: `AI_PROVIDER=deepseek`

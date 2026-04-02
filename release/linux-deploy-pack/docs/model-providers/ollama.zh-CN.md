# GRT 智能系统 — Ollama Provider 配置指南

> 更新日期: 2026-03-23

---

## 适用场景

- **开发环境** 首选，免费无限制
- 离线 / 内网 / 气隔 (Air-Gapped) 环境
- 数据敏感场景 (数据不出本地)
- 模型实验和评估
- `APP_REGION=OFFLINE` 默认 Provider

---

## 所需环境变量

```bash
# 必填
AI_PROVIDER=ollama

# 选填 (有默认值)
OLLAMA_BASE_URL=http://localhost:11434    # Ollama 服务地址
OLLAMA_MODEL=llama3.1                     # 默认模型
```

> **注意**: Ollama 不需要 API Key。

---

## 配置示例

### 本地开发

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

### Docker 环境

```bash
# Docker 中访问宿主机的 Ollama
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1
```

### 远程 Ollama 服务器

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://192.168.1.100:11434
OLLAMA_MODEL=qwen2.5:72b
```

---

## Ollama 安装

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型
ollama pull llama3.1
ollama pull qwen2.5:7b

# 验证
ollama list
```

### 允许远程访问

```bash
# 修改 Ollama 服务配置
sudo systemctl edit ollama.service

# 添加:
[Service]
Environment="OLLAMA_HOST=0.0.0.0"

# 重启
sudo systemctl restart ollama
```

---

## 支持的模型列表

| 模型 | 参数量 | 内存需求 | 推荐用途 |
|------|-------|---------|---------|
| `llama3.1` | 8B | 8GB | 通用 (默认) |
| `llama3.1:70b` | 70B | 48GB | 高质量生成 |
| `qwen2.5:7b` | 7B | 6GB | 中文优化 |
| `qwen2.5:72b` | 72B | 48GB | 中文高质量 |
| `deepseek-r1:7b` | 7B | 6GB | 推理任务 |
| `codellama:7b` | 7B | 6GB | 代码生成 |
| `mistral:7b` | 7B | 6GB | 通用 (轻量) |
| `gemma2:9b` | 9B | 8GB | Google 开源 |

拉取模型:

```bash
ollama pull qwen2.5:7b
```

---

## base_url 说明

`OLLAMA_BASE_URL` 是 Ollama 服务的地址，系统会自动拼接:

```
${OLLAMA_BASE_URL}/v1/chat/completions
```

默认值: `http://localhost:11434`

Ollama 自 0.1.24 版本起支持 OpenAI 兼容的 `/v1/chat/completions` 端点。

---

## 功能支持

| 功能 | 是否支持 |
|------|---------|
| Streaming | 框架层未启用 (Ollama 原生支持) |
| Tool Calling | 部分模型支持 (llama3.1, qwen2.5) |
| Structured Output | 部分模型支持 |
| Embeddings | 需单独配置 (非 llm.ts 范围) |
| 多模态 (图片) | 部分模型支持 (llava, bakllava) |
| API Key | 不需要 |

---

## 统一 Provider 层调用

```typescript
import { providerRegistry } from "../llm";

const ollama = providerRegistry.getProvider("ollama");
const result = await ollama.chat([
  { role: "user", content: "你好，请介绍一下GRT公司" },
], {
  model: "qwen2.5:7b",        // 可覆盖默认模型
  temperature: 0.5,
  timeout: 60000,              // Ollama 可能较慢，建议延长超时
});

// 健康检查 (调用 Ollama /api/tags 端点)
const health = await ollama.healthCheck();
console.log(health.ok, health.latency_ms);
```

---

## 切换示例

### 从 OpenAI 切换到 Ollama

```bash
# 修改 .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# 重启服务
docker compose restart grt-app
```

---

## 常见报错与排查

### `ECONNREFUSED 127.0.0.1:11434`

**原因**: Ollama 服务未启动。

**解决**:
```bash
# 检查 Ollama 状态
systemctl status ollama

# 启动 Ollama
systemctl start ollama

# 验证
curl http://localhost:11434/api/tags
```

### `model not found`

**原因**: 指定的模型未下载。

**解决**:
```bash
# 查看已下载模型
ollama list

# 下载模型
ollama pull llama3.1
```

### Docker 中连接失败

**原因**: Docker 容器无法访问宿主机的 `localhost`。

**解决**:
```bash
# 使用 host.docker.internal
OLLAMA_BASE_URL=http://host.docker.internal:11434

# 或使用宿主机 IP
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

### 响应速度慢

**原因**: 模型太大或硬件不足。

**解决**:
- 使用更小的模型 (如 `qwen2.5:7b` 替代 `qwen2.5:72b`)
- 确保有足够 GPU 显存
- 检查: `ollama ps` 查看模型加载状态

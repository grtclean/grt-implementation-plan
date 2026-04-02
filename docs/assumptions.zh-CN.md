# GRT 智能系统 — 部署文档假设说明

> 更新日期: 2026-03-23

---

## 编写本系列部署文档时所做的假设

1. **NemoClaw 对应仓库中的 AI Claw 框架**: 文档中提到的 "NemoClaw" 即本仓库内置的 AI Agent 执行框架，由 `server/ai-assistants/gateway.ts`、`server/services/agent-security-sandbox.service.ts` 和 `drizzle/agent-governance-schema.ts` 等模块组成，并非独立的外部服务。

2. **默认使用 PostgreSQL 16 + Redis 7**: 数据库采用 `postgres:16-alpine` 镜像，缓存采用 `redis:7-alpine` 镜像，均通过 `docker-compose.yml` 管理。实际项目的 Drizzle ORM 配置和 schema 均面向 PostgreSQL (`drizzle-orm/pg-core`)。

3. **默认部署端口 3000/5432/6379**: 应用服务监听 `3000` 端口，PostgreSQL `5432`，Redis `6379`，均通过 Docker 端口映射暴露。生产环境建议通过 Nginx 反向代理，对外暴露 80/443 端口。

4. **默认 Docker Compose 方式部署**: 所有服务 (应用、数据库、Redis) 通过单个 `docker-compose.yml` 文件编排。如需 Kubernetes 部署或裸机部署，需额外适配。

5. **生产环境建议使用 Nginx 反向代理**: 文档中的 Nginx 配置为推荐方案，包含 SSL、gzip 压缩、安全头、静态资源缓存等最佳实践。

6. **日志输出使用 pino 结构化 JSON**: 所有后端模块通过 `server/lib/logger.ts` 的 `createChildLogger()` 输出结构化日志，格式为每行一个 JSON 对象。LLM 调用日志通过 `server/llm/model-call-logger.ts` 独立记录。

7. **AI Provider 默认策略**: 开发环境默认使用 `ollama` (本地免费)，生产环境推荐使用 `openai` 或 `deepseek`。通过 `.env` 中的 `AI_PROVIDER` 变量控制。

8. **双层 LLM 调用架构**: 系统存在两层 LLM 抽象:
   - **遗留层** (`server/_core/llm.ts`): 函数式 API (`invokeLLM` / `invokeLLMWithProvider`)，Anthropic Claude 通过此层显式调用
   - **统一 Provider 层** (`server/llm/`): 面向对象的 `LLMProvider` 接口 + `ProviderRegistry` 注册表，4 个 Provider (OpenAI/Ollama/Gemini/DeepSeek) 均已实现
   - 两层并存，新代码推荐使用统一 Provider 层

9. **四个 LLM Provider 均通过 AI_PROVIDER 切换**: OpenAI、Ollama、Gemini、DeepSeek 在统一 Provider 层均受 `AI_PROVIDER` 环境变量控制。遗留层中 Gemini 和 Claude 需通过 `invokeLLMWithProvider()` 显式指定 `provider` 参数。

10. **安全密钥由运维团队管理**: 文档中所有 `VAULT_INJECTED` 标记的配置项，在生产环境中应通过密钥管理系统 (如 HashiCorp Vault) 注入，不应写入版本控制。

11. **数据库迁移使用 Drizzle Kit**: 开发环境使用 `drizzle-kit push` (直接推送 schema)，生产环境建议使用 `drizzle-kit generate` + `drizzle-kit migrate` (先生成 SQL，可审查后再执行)。

12. **Redis 为可选组件**: Redis 用于缓存和会话管理，系统在 Redis 不可用时仍可正常运行 (降级为内存缓存)。

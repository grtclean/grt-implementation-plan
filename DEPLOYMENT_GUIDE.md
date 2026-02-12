# GRT 智能管理系统 - 独立部署指南

## 概述

本指南将 GRT 系统从 Manus 云平台改造为**完全独立部署**，涵盖以下四项改造：

| # | 改造内容 | 方案 |
|---|----------|------|
| 1 | 数据库 MySQL → PostgreSQL | Drizzle ORM schema 自动转换，驱动替换 |
| 2 | 实现用户登录功能 | 本地用户名/密码认证（bcrypt + JWT） |
| 3 | 脱离 Manus 平台依赖 | 替换 OAuth、LLM API、环境变量 |
| 4 | AI 大模型功能 | 支持 OpenAI / Ollama / DeepSeek 三种模式 |

---

## 前提条件

- **Node.js** 18+
- **pnpm** 包管理器
- **PostgreSQL** 14+（[下载](https://www.postgresql.org/download/windows/)）
- **AI 模型**（任选其一）：
  - OpenAI API Key，或
  - Ollama 本地部署（[安装](https://ollama.ai)），或
  - DeepSeek API Key

---

## 快速安装（自动脚本）

### 步骤 1：解压补丁包

将 `grt-standalone-patch.zip` 解压到 GRT 项目根目录：
```
D:\Projects\history\grt-implementation-plan\
```

### 步骤 2：运行部署脚本

```powershell
cd D:\Projects\history\grt-implementation-plan
.\deploy-grt-standalone.ps1
```

脚本自动完成：
- 卸载 mysql2，安装 pg + bcryptjs
- 覆盖 PostgreSQL 版 schema 和 drizzle 配置
- 修补 server/db.ts（mysql2 → node-postgres）
- 安装本地认证系统（7个文件）
- 修补 App.tsx 添加 /login 路由
- 生成 .env 配置模板

### 步骤 3：配置 PostgreSQL

```powershell
# 在 pgAdmin 或 psql 中创建数据库
psql -U postgres -c "CREATE DATABASE grt_system;"
```

### 步骤 4：编辑 .env

打开项目根目录的 `.env` 文件，修改以下关键配置：

```env
# 数据库连接（修改密码）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/grt_system

# AI 提供商（三选一）
# 方式A: OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-你的密钥
OPENAI_MODEL=gpt-4o

# 方式B: Ollama（本地免费）
# AI_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.1

# 方式C: DeepSeek
# AI_PROVIDER=deepseek
# DEEPSEEK_API_KEY=你的密钥
```

### 步骤 5：初始化数据库并启动

```powershell
# 推送表结构到 PostgreSQL
pnpm drizzle-kit push

# 启动
pnpm dev
```

### 步骤 6：注册首个管理员

访问 `http://localhost:3000`，点击"注册"：
- 第一个注册的用户自动成为 **admin（管理员）**
- 后续注册用户默认为普通用户

---

## 修改文件清单

### 数据库层（MySQL → PostgreSQL）

| 文件 | 修改 |
|------|------|
| `drizzle/schema.ts` | 全量替换：mysqlTable→pgTable, mysqlEnum→pgEnum, int→integer/serial, tinyint→smallint, datetime→timestamp, 移除 onUpdateNow() |
| `drizzle.config.ts` | dialect: "mysql" → "postgresql" |
| `server/db.ts` | import drizzle-orm/mysql2 → drizzle-orm/node-postgres; onDuplicateKeyUpdate → onConflictDoUpdate |

### 认证系统（Manus OAuth → 本地登录）

| 文件 | 修改 |
|------|------|
| `server/_core/local-auth.ts` | **新增** - REST API：注册/登录/登出/获取用户 |
| `server/_core/context.ts` | tRPC 上下文改用本地 JWT 验证 |
| `server/_core/index.ts` | 按 LOCAL_AUTH 变量选择注册本地认证路由 |
| `client/src/pages/LocalLogin.tsx` | **新增** - 登录/注册页面 |
| `client/src/main.tsx` | 未授权跳转 /login |
| `client/src/_core/hooks/useAuth.ts` | 使用 /api/auth/me 获取用户 |
| `client/src/components/RequireAuth.tsx` | 未认证跳转 /login |
| `client/src/App.tsx` | 添加 /login 路由（脚本自动修补） |
| `client/src/components/DashboardLayout.tsx` | Sign in 按钮跳转 /login（脚本自动修补） |

### AI 大模型（Manus Forge → OpenAI/Ollama）

| 文件 | 修改 |
|------|------|
| `server/_core/env.ts` | 新增 AI_PROVIDER、OPENAI_*、OLLAMA_* 环境变量 |
| `server/_core/llm.ts` | 核心 LLM 调用层重写：按 AI_PROVIDER 动态选择端点和模型 |
| `server/ai-adapter/AIServiceFactory.ts` | 无需修改 - 已原生支持 OpenAI/Ollama/DeepSeek |

---

## AI 大模型配置详解

### 方式 A：OpenAI（推荐）

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

如使用兼容 OpenAI 格式的其他 API（如 Azure OpenAI、通义千问等），修改 `OPENAI_BASE_URL` 即可。

### 方式 B：Ollama（本地免费，无需 API Key）

1. 安装 Ollama：https://ollama.ai
2. 拉取模型：
   ```powershell
   ollama pull llama3.1
   # 或使用更强的模型
   ollama pull qwen2.5:14b
   ```
3. 配置 .env：
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   ```

### 方式 C：DeepSeek

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的密钥
```

### LLM 调用链路

```
前端 AI 功能 → tRPC → server 路由
                        ↓
              server/_core/llm.ts (invokeLLM)
                        ↓
              按 AI_PROVIDER 选择:
              ├─ openai  → OpenAI API (或兼容端点)
              ├─ ollama  → Ollama 本地 /v1/chat/completions
              └─ deepseek → DeepSeek API

同时: server/ai-adapter/AIServiceFactory.ts
      按 APP_REGION + 可用 API Key 自动选择适配器
```

---

## 内网共享

修改 `package.json` 的 dev 脚本：
```json
"dev": "vite --host 0.0.0.0"
```

开放防火墙（管理员 PowerShell）：
```powershell
New-NetFirewallRule -DisplayName "GRT Port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

内网用户访问：`http://你的内网IP:3000`

---

## 常见问题

### Q: drizzle-kit push 报错？
清理旧迁移后重试：
```powershell
Remove-Item drizzle\meta -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item drizzle\*.sql -Force -ErrorAction SilentlyContinue
pnpm drizzle-kit push
```

### Q: AI 功能报错 "API key not configured"？
检查 .env 中的 AI_PROVIDER 和对应的 API Key 是否正确。Ollama 模式不需要 API Key 但需要 Ollama 服务运行中。

### Q: 如何将已有用户设为管理员？
```sql
-- 在 PostgreSQL 中执行
UPDATE users SET role = 'admin' WHERE "openId" = '用户名';
```

### Q: 如何恢复 Manus OAuth？
```env
LOCAL_AUTH=false
VITE_LOCAL_AUTH=false
VITE_APP_ID=你的Manus App ID
OAUTH_SERVER_URL=https://api.manus.im
```

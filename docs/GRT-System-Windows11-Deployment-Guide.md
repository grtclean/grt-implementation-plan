# GRT智能系统 v2.5.42 Windows 11 本地服务器部署方案

**版本**: v2.5.42  
**文档版本**: 1.0  
**作者**: Manus AI  
**日期**: 2026年1月29日

---

## 目录

1. [概述](#1-概述)
2. [系统要求](#2-系统要求)
3. [环境准备](#3-环境准备)
4. [项目部署](#4-项目部署)
5. [数据库配置](#5-数据库配置)
6. [环境变量配置](#6-环境变量配置)
7. [启动与验证](#7-启动与验证)
8. [生产环境部署](#8-生产环境部署)
9. [Claude Code 协作开发指南](#9-claude-code-协作开发指南)
10. [ChatGPT 系统优化指南](#10-chatgpt-系统优化指南)
11. [多AI协作工作流](#11-多ai协作工作流)
12. [故障排除](#12-故障排除)
13. [附录](#附录)

---

## 1. 概述

本文档提供了将GRT智能系统 v2.5.42 从 Manus 云平台迁移到 Windows 11 本地服务器的完整部署方案。该方案涵盖环境准备、项目部署、数据库配置，以及后期与 Claude Code 和 ChatGPT 协作开发的最佳实践。

### 1.1 系统架构

GRT智能系统采用现代化的全栈架构，核心技术栈包括：

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | React 19 + Tailwind CSS 4 | 响应式用户界面 |
| 后端 | Express 4 + tRPC 11 | 类型安全的API层 |
| 数据库 | MySQL 8.0 / TiDB | 关系型数据存储 |
| ORM | Drizzle ORM | 类型安全的数据库操作 |
| 认证 | JWT + OAuth 2.0 | 用户身份验证 |
| AI集成 | LLM API (Gemini) | 智能分析引擎 |

### 1.2 部署模式

本方案支持两种部署模式：

**开发模式**: 适用于功能开发和调试，支持热重载，便于与 Claude Code 协作开发。

**生产模式**: 适用于正式运行环境，优化性能和安全性，支持 PM2 进程管理。

---

## 2. 系统要求

### 2.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核心 | 8核心及以上 |
| 内存 | 8GB | 16GB及以上 |
| 硬盘 | 50GB SSD | 100GB SSD |
| 网络 | 100Mbps | 1Gbps |

### 2.2 软件要求

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Windows 11 | 22H2及以上 | 操作系统 |
| Node.js | 20.x LTS 或 22.x | JavaScript运行时 |
| pnpm | 9.x | 包管理器 |
| MySQL | 8.0+ | 数据库服务 |
| Git | 2.40+ | 版本控制 |
| VS Code | 最新版 | 代码编辑器 |

---

## 3. 环境准备

### 3.1 安装 Node.js

**步骤 1**: 下载 Node.js

访问 [Node.js 官网](https://nodejs.org/) 下载 Windows 安装包（推荐 LTS 版本 20.x 或 22.x）。

**步骤 2**: 运行安装程序

双击下载的 `.msi` 文件，按照向导完成安装。确保勾选以下选项：
- Add to PATH（添加到系统路径）
- Install npm package manager（安装npm包管理器）

**步骤 3**: 验证安装

打开 PowerShell 或命令提示符，执行以下命令：

```powershell
node --version
# 预期输出: v20.x.x 或 v22.x.x

npm --version
# 预期输出: 10.x.x
```

### 3.2 安装 pnpm

pnpm 是高性能的包管理器，GRT系统使用它管理依赖。

```powershell
# 使用 npm 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
# 预期输出: 9.x.x
```

### 3.3 安装 Git

**步骤 1**: 下载 Git for Windows

访问 [Git 官网](https://git-scm.com/download/win) 下载安装包。

**步骤 2**: 运行安装程序

安装时建议选择以下配置：
- 默认编辑器：选择 VS Code
- PATH 环境：选择 "Git from the command line and also from 3rd-party software"
- 行尾转换：选择 "Checkout as-is, commit Unix-style line endings"

**步骤 3**: 配置 Git

```powershell
# 配置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 验证配置
git config --list
```

### 3.4 安装 MySQL 8.0

**方案 A: 使用 MySQL Installer（推荐）**

**步骤 1**: 下载 MySQL Installer

访问 [MySQL 官网](https://dev.mysql.com/downloads/installer/) 下载 MySQL Installer for Windows。

**步骤 2**: 运行安装程序

选择 "Developer Default" 或 "Server only" 安装类型，按照向导完成安装。

**步骤 3**: 配置 MySQL

安装过程中需要设置：
- Root 密码（请记住此密码）
- 端口号（默认 3306）
- Windows 服务名称（默认 MySQL80）

**步骤 4**: 验证安装

```powershell
# 连接 MySQL
mysql -u root -p

# 输入密码后，执行以下命令验证
SELECT VERSION();
# 预期输出: 8.0.x
```

**方案 B: 使用 Docker（可选）**

如果您更倾向于使用容器化部署：

```powershell
# 安装 Docker Desktop for Windows
# 下载地址: https://www.docker.com/products/docker-desktop

# 拉取并运行 MySQL 容器
docker run --name grt-mysql -e MYSQL_ROOT_PASSWORD=your_password -p 3306:3306 -d mysql:8.0
```

### 3.5 安装 VS Code 及扩展

**步骤 1**: 下载 VS Code

访问 [VS Code 官网](https://code.visualstudio.com/) 下载安装包。

**步骤 2**: 安装推荐扩展

打开 VS Code，安装以下扩展：

| 扩展名称 | 扩展ID | 用途 |
|----------|--------|------|
| ESLint | dbaeumer.vscode-eslint | 代码检查 |
| Prettier | esbenp.prettier-vscode | 代码格式化 |
| Tailwind CSS IntelliSense | bradlc.vscode-tailwindcss | CSS智能提示 |
| Prisma / Drizzle | 相关扩展 | 数据库ORM支持 |
| GitLens | eamodio.gitlens | Git增强 |
| Thunder Client | rangav.vscode-thunder-client | API测试 |
| Claude Dev | Anthropic官方扩展 | Claude Code集成 |

---

## 4. 项目部署

### 4.1 获取项目代码

**方案 A: 从 GitHub 克隆（推荐）**

如果项目已推送到 GitHub：

```powershell
# 创建项目目录
mkdir D:\Projects
cd D:\Projects

# 克隆项目
git clone https://github.com/your-org/grt-implementation-plan.git

# 进入项目目录
cd grt-implementation-plan
```

**方案 B: 从 Manus 平台下载**

1. 登录 Manus 平台管理界面
2. 进入项目的 "Code" 面板
3. 点击 "Download All Files" 下载项目压缩包
4. 解压到 `D:\Projects\grt-implementation-plan`

### 4.2 安装项目依赖

```powershell
# 进入项目目录
cd D:\Projects\grt-implementation-plan

# 安装依赖
pnpm install

# 如果遇到网络问题，可以使用国内镜像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### 4.3 项目结构说明

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── contexts/      # React上下文
│   │   ├── hooks/         # 自定义Hooks
│   │   └── lib/           # 工具库
│   └── public/            # 静态资源
├── server/                 # 后端代码
│   ├── _core/             # 核心框架（勿修改）
│   ├── services/          # 业务服务
│   ├── routers.ts         # tRPC路由
│   └── db.ts              # 数据库操作
├── drizzle/               # 数据库Schema
│   ├── schema.ts          # 表定义
│   └── migrations/        # 迁移文件
├── shared/                # 前后端共享代码
├── docs/                  # 文档
├── .env                   # 环境变量（需创建）
├── package.json           # 项目配置
└── todo.md               # 任务清单
```

---

## 5. 数据库配置

### 5.1 创建数据库

```sql
-- 连接 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（可选，推荐生产环境使用）
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 5.2 运行数据库迁移

```powershell
# 确保已配置 DATABASE_URL 环境变量（见第6节）
# 然后运行迁移
pnpm db:push
```

迁移成功后，您将看到类似以下输出：

```
No config path provided, using default 'drizzle.config.ts'
Reading config file 'D:\Projects\grt-implementation-plan\drizzle.config.ts'
[✓] Changes applied
```

### 5.3 验证数据库表

```sql
-- 连接数据库
mysql -u root -p grt_system

-- 查看所有表
SHOW TABLES;

-- 预期输出应包含以下核心表：
-- users, projects, opportunities, customers, delivery_executions,
-- site_issue_tickets, design_packages, ai_agent_triggers, etc.
```

---

## 6. 环境变量配置

### 6.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```powershell
# 使用 VS Code 创建
code .env
```

### 6.2 配置环境变量

将以下内容复制到 `.env` 文件，并根据实际情况修改：

```env
# ========================================
# 数据库配置
# ========================================
DATABASE_URL=mysql://root:your_password@localhost:3306/grt_system

# ========================================
# 认证配置
# ========================================
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long

# ========================================
# Manus OAuth 配置（如需保留云端认证）
# ========================================
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# ========================================
# 应用配置
# ========================================
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# ========================================
# AI 服务配置
# ========================================
# Gemini API（用于AI Agent）
GEMINI_API_KEY=your_gemini_api_key

# 或使用 Manus 内置 Forge API
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key

# ========================================
# 简道云集成（可选）
# ========================================
JIANDAOYUN_API_KEY=your_jiandaoyun_api_key
JIANDAOYUN_CORP_ID=your_jiandaoyun_corp_id

# ========================================
# Microsoft 365 集成（可选）
# ========================================
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id

# ========================================
# 所有者信息
# ========================================
OWNER_NAME=管理员
OWNER_OPEN_ID=owner_open_id
```

### 6.3 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| DATABASE_URL | 是 | MySQL连接字符串 |
| JWT_SECRET | 是 | JWT签名密钥，至少32字符 |
| GEMINI_API_KEY | 是* | Gemini API密钥（AI功能必需） |
| VITE_APP_TITLE | 否 | 应用标题 |
| JIANDAOYUN_API_KEY | 否 | 简道云集成密钥 |

> **安全提示**: `.env` 文件包含敏感信息，请勿提交到Git仓库。项目已配置 `.gitignore` 忽略此文件。

---

## 7. 启动与验证

### 7.1 开发模式启动

```powershell
# 启动开发服务器
pnpm dev

# 预期输出：
# [Server] Listening on http://localhost:3000
# [Vite] Dev server running at http://localhost:5173
```

### 7.2 访问系统

打开浏览器，访问以下地址：

| 环境 | 地址 | 说明 |
|------|------|------|
| 开发前端 | http://localhost:5173 | Vite开发服务器 |
| API服务 | http://localhost:3000/api | tRPC API端点 |

### 7.3 运行测试

```powershell
# 运行所有测试
pnpm test

# 预期输出：
# ✓ 3572 tests passed
# Test Files  XX passed
# Duration    XX.XXs
```

### 7.4 验证核心功能

完成以下检查清单以验证系统正常运行：

- [ ] 首页正常加载，显示实时仪表盘
- [ ] 可以登录系统（如配置了OAuth）
- [ ] 项目列表页面正常显示
- [ ] AI Agent功能可用（Risk Radar、Gatekeeper等）
- [ ] 数据库读写正常

---

## 8. 生产环境部署

### 8.1 构建生产版本

```powershell
# 构建前端和后端
pnpm build

# 构建完成后，生成文件位于：
# - dist/          后端编译文件
# - client/dist/   前端静态文件
```

### 8.2 安装 PM2 进程管理器

```powershell
# 全局安装 PM2
npm install -g pm2

# Windows 下安装 PM2 服务
npm install -g pm2-windows-startup
pm2-startup install
```

### 8.3 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'grt-system',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env'
    }
  ]
};
```

### 8.4 启动生产服务

```powershell
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs grt-system

# 保存进程列表（开机自启）
pm2 save
```

### 8.5 配置 Nginx 反向代理（可选）

如果需要使用域名访问，可以配置 Nginx：

```nginx
server {
    listen 80;
    server_name grt.yourcompany.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9. Claude Code 协作开发指南

### 9.1 Claude Code 简介

Claude Code 是 Anthropic 提供的 AI 编程助手，可以直接在 VS Code 中使用，非常适合进行功能开发和代码实现。

### 9.2 安装 Claude Code 扩展

1. 打开 VS Code
2. 进入扩展市场（Ctrl+Shift+X）
3. 搜索 "Claude Dev" 或 "Anthropic"
4. 安装官方扩展
5. 配置 API 密钥

### 9.3 Claude Code 最佳实践

**9.3.1 功能开发工作流**

```
1. 在 Manus 中规划功能需求
2. 将需求描述提供给 Claude Code
3. Claude Code 实现代码
4. 运行测试验证
5. 提交代码到 Git
```

**9.3.2 推荐的 Prompt 模板**

```markdown
## 功能需求
[描述要实现的功能]

## 技术约束
- 使用 tRPC 定义 API
- 前端使用 React + Tailwind CSS
- 数据库操作使用 Drizzle ORM
- 遵循项目现有代码风格

## 相关文件
- server/routers.ts - API路由
- client/src/pages/ - 页面组件
- drizzle/schema.ts - 数据库Schema

## 预期输出
1. 后端 API 实现
2. 前端页面组件
3. 单元测试
```

**9.3.3 代码审查清单**

在 Claude Code 生成代码后，请检查：

- [ ] 代码风格与项目一致
- [ ] 类型定义完整（TypeScript）
- [ ] 错误处理完善
- [ ] 包含必要的注释
- [ ] 单元测试覆盖

### 9.4 Claude Code 与 GRT 系统集成

**9.4.1 添加新的 tRPC 路由**

```typescript
// 示例：让 Claude Code 添加新功能
// Prompt: "在 server/routers.ts 中添加一个获取项目统计的 API"

// Claude Code 生成的代码示例：
export const projectRouter = router({
  getStatistics: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stats = await getProjectStatistics(input.projectId);
      return stats;
    }),
});
```

**9.4.2 添加新的前端页面**

```typescript
// 示例：让 Claude Code 创建新页面
// Prompt: "创建一个项目统计仪表盘页面"

// Claude Code 会生成完整的 React 组件
```

---

## 10. ChatGPT 系统优化指南

### 10.1 ChatGPT 的角色定位

在 GRT 系统开发中，ChatGPT 主要用于：

| 场景 | 说明 |
|------|------|
| 系统架构优化 | 分析现有架构，提出改进建议 |
| 代码审查 | 审查代码质量，发现潜在问题 |
| 文档生成 | 生成技术文档、API文档 |
| 问题诊断 | 分析错误日志，定位问题原因 |
| 性能优化 | 分析性能瓶颈，提出优化方案 |

### 10.2 ChatGPT 最佳实践

**10.2.1 系统优化 Prompt 模板**

```markdown
## 系统背景
GRT智能系统是一个工业清洗设备项目管理系统，使用 React + tRPC + MySQL 技术栈。

## 当前问题
[描述遇到的问题或需要优化的方面]

## 相关代码/配置
[粘贴相关代码片段]

## 期望结果
[描述期望的优化效果]

## 约束条件
- 保持与现有代码风格一致
- 不破坏现有功能
- 考虑向后兼容性
```

**10.2.2 代码审查 Prompt 模板**

```markdown
请审查以下代码，关注：
1. 代码质量和可维护性
2. 潜在的安全问题
3. 性能优化机会
4. 最佳实践遵循情况

代码：
[粘贴代码]
```

### 10.3 ChatGPT 与 GRT 系统集成

**10.3.1 架构优化示例**

```markdown
## 问题
当前 AI Agent 服务的 LLM 调用没有缓存机制，相同的分析请求会重复调用 API。

## ChatGPT 建议
1. 添加 Redis 缓存层
2. 实现请求去重机制
3. 设置合理的缓存过期时间

## 实施方案
[ChatGPT 提供的详细实施步骤]
```

**10.3.2 性能优化示例**

```markdown
## 问题
项目列表页面加载缓慢，数据量大时响应时间超过 3 秒。

## ChatGPT 分析
1. 数据库查询缺少索引
2. 一次性加载所有数据
3. 没有使用分页

## 优化建议
1. 添加复合索引
2. 实现分页查询
3. 使用虚拟滚动
```

---

## 11. 多AI协作工作流

### 11.1 协作架构

GRT 系统采用多 AI 协作开发模式，各 AI 工具的职责分工如下：

```
┌─────────────────────────────────────────────────────────────┐
│                    GRT 系统开发工作流                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Manus  │───▶│ Claude Code │───▶│   ChatGPT   │         │
│  │ (规划)   │    │  (实现)      │    │   (优化)     │         │
│  └─────────┘    └─────────────┘    └─────────────┘         │
│       │               │                   │                 │
│       ▼               ▼                   ▼                 │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ 需求分析 │    │  代码实现    │    │  代码审查    │         │
│  │ 任务拆解 │    │  单元测试    │    │  性能优化    │         │
│  │ 进度跟踪 │    │  Bug修复     │    │  架构改进    │         │
│  └─────────┘    └─────────────┘    └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Gemini (内置AI引擎)                │   │
│  │  - Risk Radar 风险分析                               │   │
│  │  - Site Copilot 现场诊断                             │   │
│  │  - Technical Writer 文档生成                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 标准开发流程

**阶段 1: 需求规划（Manus）**

```markdown
1. 接收用户需求
2. 分析需求可行性
3. 拆解为具体任务
4. 更新 todo.md
5. 生成开发指令
```

**阶段 2: 代码实现（Claude Code）**

```markdown
1. 接收 Manus 的开发指令
2. 实现功能代码
3. 编写单元测试
4. 本地验证
5. 提交代码
```

**阶段 3: 代码审查与优化（ChatGPT）**

```markdown
1. 审查 Claude Code 的实现
2. 识别潜在问题
3. 提出优化建议
4. 验证优化效果
5. 更新文档
```

### 11.3 协作通信协议

为确保多 AI 协作顺畅，建议使用以下通信格式：

**Manus → Claude Code 指令格式**

```markdown
## 任务编号
TASK-2025-001

## 任务描述
[详细描述]

## 技术要求
- [要求1]
- [要求2]

## 验收标准
- [ ] 功能正常
- [ ] 测试通过
- [ ] 代码规范

## 相关文件
- file1.ts
- file2.tsx

## 截止时间
2025-01-30
```

**Claude Code → ChatGPT 审查请求格式**

```markdown
## 审查类型
代码审查 / 架构审查 / 性能审查

## 代码变更
[代码差异或完整代码]

## 实现说明
[实现思路说明]

## 关注点
- [需要重点审查的方面]
```

### 11.4 版本控制最佳实践

**Git 分支策略**

```
main          ─────────────────────────────────────▶
                    │           │           │
feature/xxx   ──────┴───────────┴───────────┴──────▶
                    ↑           ↑           ↑
               Claude Code  Claude Code  Claude Code
```

**提交信息规范**

```
<type>(<scope>): <subject>

<body>

<footer>

类型(type):
- feat: 新功能
- fix: Bug修复
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

示例:
feat(ai-agent): 添加 Risk Radar LLM 集成

- 集成 Gemini API 进行深度风险分析
- 添加风险评分算法
- 更新单元测试

Closes #123
```

---

## 12. 故障排除

### 12.1 常见问题及解决方案

**问题 1: pnpm install 失败**

```powershell
# 症状: 网络超时或依赖解析失败

# 解决方案 1: 使用国内镜像
pnpm config set registry https://registry.npmmirror.com

# 解决方案 2: 清除缓存重试
pnpm store prune
pnpm install

# 解决方案 3: 使用 npm 替代
npm install
```

**问题 2: 数据库连接失败**

```powershell
# 症状: Error: connect ECONNREFUSED 127.0.0.1:3306

# 检查 MySQL 服务状态
Get-Service MySQL80

# 启动 MySQL 服务
Start-Service MySQL80

# 验证连接
mysql -u root -p -e "SELECT 1"
```

**问题 3: 端口被占用**

```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（替换 PID）
taskkill /PID <PID> /F

# 或修改 .env 中的端口配置
PORT=3001
```

**问题 4: TypeScript 编译错误**

```powershell
# 症状: Cannot find module 'xxx'

# 解决方案 1: 重新安装依赖
rm -rf node_modules
pnpm install

# 解决方案 2: 重启 TypeScript 服务
# 在 VS Code 中按 Ctrl+Shift+P
# 输入 "TypeScript: Restart TS Server"
```

**问题 5: 数据库迁移失败**

```powershell
# 症状: Migration failed

# 检查 DATABASE_URL 配置
echo $env:DATABASE_URL

# 手动运行迁移
npx drizzle-kit generate
npx drizzle-kit migrate

# 如果表已存在，可以跳过
npx drizzle-kit push --force
```

### 12.2 日志查看

**开发模式日志**

```powershell
# 实时查看服务器日志
pnpm dev 2>&1 | Tee-Object -FilePath logs/dev.log
```

**生产模式日志**

```powershell
# 查看 PM2 日志
pm2 logs grt-system

# 查看最近 100 行
pm2 logs grt-system --lines 100

# 清除日志
pm2 flush
```

### 12.3 性能监控

```powershell
# 查看 PM2 进程状态
pm2 monit

# 查看详细信息
pm2 show grt-system

# 查看资源使用
pm2 status
```

---

## 附录

### A. 环境变量完整列表

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | string | - | MySQL连接字符串 |
| JWT_SECRET | string | - | JWT签名密钥 |
| PORT | number | 3000 | 服务端口 |
| NODE_ENV | string | development | 运行环境 |
| VITE_APP_TITLE | string | GRT System | 应用标题 |
| VITE_APP_LOGO | string | /logo.svg | 应用Logo |
| GEMINI_API_KEY | string | - | Gemini API密钥 |
| JIANDAOYUN_API_KEY | string | - | 简道云API密钥 |
| JIANDAOYUN_CORP_ID | string | - | 简道云企业ID |

### B. 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 运行数据库迁移 |
| `pm2 start` | 启动生产服务 |
| `pm2 stop` | 停止服务 |
| `pm2 restart` | 重启服务 |
| `pm2 logs` | 查看日志 |

### C. 项目文件索引

| 文件路径 | 说明 |
|----------|------|
| `server/routers.ts` | tRPC API路由定义 |
| `server/db.ts` | 数据库操作函数 |
| `server/services/ai-agents.service.ts` | AI Agent服务 |
| `drizzle/schema.ts` | 数据库表定义 |
| `client/src/App.tsx` | 前端路由配置 |
| `client/src/pages/` | 页面组件目录 |
| `todo.md` | 任务清单 |
| `.env` | 环境变量配置 |

### D. 参考资源

- [Node.js 官方文档](https://nodejs.org/docs/)
- [pnpm 官方文档](https://pnpm.io/)
- [MySQL 8.0 文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [tRPC 官方文档](https://trpc.io/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [React 官方文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [PM2 官方文档](https://pm2.keymetrics.io/docs/)

---

**文档结束**

如有任何问题，请联系技术支持或在项目 Issues 中提交问题。

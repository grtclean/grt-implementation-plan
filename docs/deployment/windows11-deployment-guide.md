# GRT智能系统 v2.5.21 Windows 11 本地服务器部署指南

> **版本**: v2.5.21  
> **作者**: Manus AI  
> **更新日期**: 2026年1月28日  
> **适用环境**: Windows 11 Professional/Enterprise

---

## 目录

1. [概述](#1-概述)
2. [系统要求](#2-系统要求)
3. [环境准备](#3-环境准备)
4. [项目部署](#4-项目部署)
5. [数据库配置](#5-数据库配置)
6. [环境变量配置](#6-环境变量配置)
7. [服务启动与验证](#7-服务启动与验证)
8. [Claude Code 集成配置](#8-claude-code-集成配置)
9. [ChatGPT 集成配置](#9-chatgpt-集成配置)
10. [开发工作流规范](#10-开发工作流规范)
11. [运维管理](#11-运维管理)
12. [故障排除](#12-故障排除)
13. [附录](#附录)

---

## 1. 概述

本文档提供将 GRT 智能系统从 Manus 云平台迁移至 Windows 11 本地服务器的完整部署方案。该系统基于现代 Web 技术栈构建，采用 React 19 + Express + tRPC + MySQL 架构，支持与 Claude Code 和 ChatGPT 的深度集成，实现功能开发与迭代优化的协同工作流。

### 1.1 技术架构概览

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 19 + TypeScript | 现代响应式UI |
| 样式系统 | Tailwind CSS 4 + shadcn/ui | 组件化设计系统 |
| API层 | tRPC 11 | 端到端类型安全 |
| 后端框架 | Express 4 + Node.js 22 | 高性能服务端 |
| 数据库 | MySQL 8.0 | 关系型数据存储 |
| ORM | Drizzle ORM | 类型安全数据库操作 |
| 构建工具 | Vite 7 + esbuild | 快速构建打包 |
| 包管理器 | pnpm 10 | 高效依赖管理 |

### 1.2 AI 协作架构

本系统设计支持多 AI 协作开发模式：

| AI 工具 | 角色定位 | 主要职责 |
|---------|----------|----------|
| **Manus** | 任务编排/规划 | 整体架构设计、任务分解、进度管理 |
| **Claude Code** | 功能实现 | 代码编写、功能开发、单元测试 |
| **ChatGPT** | 迭代优化 | 代码审查、性能优化、文档生成 |
| **Gemini** | 内部判断/问答 | 技术决策支持、知识库查询 |

---

## 2. 系统要求

### 2.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核心 | 8核心及以上 |
| 内存 | 8GB | 16GB及以上 |
| 存储 | 50GB SSD | 100GB NVMe SSD |
| 网络 | 100Mbps | 1Gbps |

### 2.2 软件要求

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Windows 11 | 22H2+ | 操作系统 |
| Node.js | 22.x LTS | JavaScript运行时 |
| MySQL | 8.0+ | 数据库服务 |
| Git | 2.40+ | 版本控制 |
| VS Code | 最新版 | 代码编辑器 |
| pnpm | 10.x | 包管理器 |

---

## 3. 环境准备

### 3.1 安装 Node.js

**步骤 1**: 下载 Node.js 22 LTS

访问 [Node.js 官网](https://nodejs.org/) 下载 Windows 安装包（推荐使用 `.msi` 安装程序）。

**步骤 2**: 运行安装程序

```powershell
# 安装完成后验证版本
node --version
# 预期输出: v22.x.x

npm --version
# 预期输出: 10.x.x
```

**步骤 3**: 安装 pnpm

```powershell
# 使用 npm 全局安装 pnpm
npm install -g pnpm@10

# 验证安装
pnpm --version
# 预期输出: 10.x.x
```

### 3.2 安装 MySQL 8.0

**步骤 1**: 下载 MySQL Installer

访问 [MySQL 官网](https://dev.mysql.com/downloads/installer/) 下载 MySQL Installer for Windows。

**步骤 2**: 运行安装向导

选择 "Developer Default" 安装类型，包含以下组件：
- MySQL Server 8.0
- MySQL Workbench
- MySQL Shell
- Connector/ODBC

**步骤 3**: 配置 MySQL Server

在安装过程中设置以下配置：

| 配置项 | 推荐值 |
|--------|--------|
| 端口 | 3306 |
| 认证方式 | caching_sha2_password |
| Root密码 | 设置强密码并记录 |
| 字符集 | utf8mb4 |
| 排序规则 | utf8mb4_unicode_ci |

**步骤 4**: 验证安装

```powershell
# 使用 MySQL Shell 连接
mysql -u root -p

# 检查版本
SELECT VERSION();
# 预期输出: 8.0.x
```

### 3.3 安装 Git

**步骤 1**: 下载 Git for Windows

访问 [Git 官网](https://git-scm.com/download/win) 下载安装程序。

**步骤 2**: 安装配置

安装时选择以下选项：
- 默认编辑器: VS Code
- PATH 环境: Git from the command line and also from 3rd-party software
- 行尾转换: Checkout as-is, commit Unix-style line endings
- 终端模拟器: Use Windows' default console window

**步骤 3**: 配置 Git

```powershell
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 验证配置
git config --list
```

### 3.4 安装 VS Code 及扩展

**步骤 1**: 下载 VS Code

访问 [VS Code 官网](https://code.visualstudio.com/) 下载安装程序。

**步骤 2**: 安装推荐扩展

```powershell
# 使用命令行安装扩展
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension prisma.prisma
code --install-extension mtxr.sqltools
code --install-extension mtxr.sqltools-driver-mysql
```

**推荐扩展列表**:

| 扩展名称 | 用途 |
|----------|------|
| ESLint | 代码质量检查 |
| Prettier | 代码格式化 |
| Tailwind CSS IntelliSense | Tailwind 智能提示 |
| TypeScript Nightly | TypeScript 支持 |
| Prisma | 数据库 Schema 支持 |
| SQLTools + MySQL Driver | 数据库管理 |
| GitLens | Git 增强 |
| Thunder Client | API 测试 |

---

## 4. 项目部署

### 4.1 获取项目代码

**方式一**: 从 Manus 平台导出

1. 登录 Manus 平台管理界面
2. 进入项目设置 → GitHub 导出
3. 将代码导出到 GitHub 仓库
4. 在本地克隆仓库

```powershell
# 创建项目目录
mkdir D:\Projects
cd D:\Projects

# 克隆仓库
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

**方式二**: 直接下载代码包

1. 从 Manus 平台下载项目 ZIP 包
2. 解压到本地目录

```powershell
# 解压后进入项目目录
cd D:\Projects\grt-implementation-plan
```

### 4.2 安装项目依赖

```powershell
# 进入项目目录
cd D:\Projects\grt-implementation-plan

# 安装依赖（使用 pnpm）
pnpm install

# 如果遇到网络问题，可设置镜像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### 4.3 项目目录结构

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── public/            # 静态资源
│   └── src/               # 源代码
│       ├── components/    # 组件
│       ├── pages/         # 页面
│       ├── hooks/         # 自定义Hooks
│       └── lib/           # 工具库
├── server/                 # 后端代码
│   ├── _core/             # 核心框架
│   ├── services/          # 业务服务
│   └── routers.ts         # API路由
├── drizzle/               # 数据库Schema
│   ├── schema.ts          # 表定义
│   └── migrations/        # 迁移文件
├── docs/                   # 文档
│   ├── deployment/        # 部署文档
│   ├── dev-specs/         # 开发规范
│   └── architecture/      # 架构文档
├── scripts/               # 脚本工具
├── package.json           # 项目配置
└── drizzle.config.ts      # 数据库配置
```

---

## 5. 数据库配置

### 5.1 创建数据库

```sql
-- 使用 MySQL Workbench 或命令行执行
CREATE DATABASE grt_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（推荐）
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5.2 数据库连接字符串

```
mysql://grt_user:your_secure_password@localhost:3306/grt_system
```

### 5.3 执行数据库迁移

```powershell
# 设置环境变量（临时）
$env:DATABASE_URL = "mysql://grt_user:your_secure_password@localhost:3306/grt_system"

# 生成并执行迁移
pnpm db:push
```

### 5.4 验证数据库结构

```sql
-- 查看已创建的表
USE grt_system;
SHOW TABLES;

-- 预期输出包含以下表:
-- users, customers, contacts, opportunities, projects, ...
```

---

## 6. 环境变量配置

### 6.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```powershell
# 创建 .env 文件
New-Item -Path ".env" -ItemType File
```

### 6.2 环境变量配置模板

```env
# ==================== 数据库配置 ====================
DATABASE_URL=mysql://grt_user:your_secure_password@localhost:3306/grt_system

# ==================== 应用配置 ====================
NODE_ENV=development
VITE_APP_ID=grt-local-dev
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# ==================== 认证配置 ====================
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# ==================== OAuth配置（可选，本地开发可跳过） ====================
# OAUTH_SERVER_URL=https://api.manus.im
# VITE_OAUTH_PORTAL_URL=https://manus.im/login

# ==================== AI服务配置 ====================
# OpenAI API（用于ChatGPT集成）
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic API（用于Claude集成）
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Google AI API（用于Gemini集成）
GEMINI_API_KEY=your-gemini-api-key

# ==================== 简道云API配置（可选） ====================
# JIANDAOYUN_API_KEY=your-jiandaoyun-api-key
# JIANDAOYUN_CORP_ID=your-corp-id

# ==================== 存储配置（可选） ====================
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_REGION=ap-northeast-1
# S3_BUCKET_NAME=your-bucket-name
```

### 6.3 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| DATABASE_URL | ✅ | MySQL连接字符串 |
| JWT_SECRET | ✅ | JWT签名密钥，至少32字符 |
| NODE_ENV | ✅ | 运行环境：development/production |
| OPENAI_API_KEY | ⚪ | OpenAI API密钥，用于ChatGPT |
| ANTHROPIC_API_KEY | ⚪ | Anthropic API密钥，用于Claude |
| GEMINI_API_KEY | ⚪ | Google AI API密钥 |

---

## 7. 服务启动与验证

### 7.1 开发模式启动

```powershell
# 启动开发服务器
pnpm dev

# 预期输出:
# [tsx] Watching for changes...
# Server running on http://localhost:3000
```

### 7.2 生产模式构建

```powershell
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 7.3 验证服务状态

**前端验证**: 访问 `http://localhost:3000`

**API验证**: 
```powershell
# 使用 curl 或 Thunder Client 测试
curl http://localhost:3000/api/trpc/health
```

### 7.4 运行单元测试

```powershell
# 运行所有测试
pnpm test

# 预期输出:
# Test Files  107 passed (107)
# Tests  2990 passed
```

---

## 8. Claude Code 集成配置

### 8.1 Claude Code 简介

Claude Code 是 Anthropic 提供的 AI 编程助手，专注于代码生成、调试和重构。在 GRT 系统开发中，Claude Code 负责功能实现和代码编写。

### 8.2 安装 Claude Code CLI

```powershell
# 安装 Claude Code CLI（如果可用）
npm install -g @anthropic-ai/claude-code

# 或使用 VS Code 扩展
code --install-extension anthropic.claude-code
```

### 8.3 配置 Claude Code

在项目根目录创建 `.claude/config.json`：

```json
{
  "version": "1.0",
  "project": {
    "name": "grt-implementation-plan",
    "type": "fullstack",
    "framework": {
      "frontend": "react",
      "backend": "express",
      "database": "mysql"
    }
  },
  "context": {
    "include": [
      "server/**/*.ts",
      "client/src/**/*.tsx",
      "drizzle/schema.ts",
      "docs/dev-specs/**/*.md"
    ],
    "exclude": [
      "node_modules",
      "dist",
      ".git"
    ]
  },
  "rules": {
    "codeStyle": "typescript-strict",
    "testRequired": true,
    "documentationRequired": true
  }
}
```

### 8.4 Claude Code 开发规范

**功能开发流程**:

1. **需求分析**: Manus 提供功能规格说明
2. **代码实现**: Claude Code 编写代码
3. **单元测试**: Claude Code 编写测试用例
4. **代码审查**: 提交前进行审查
5. **集成验证**: 运行完整测试套件

**代码提交模板**:

```markdown
## 功能描述
[简要描述实现的功能]

## 实现方案
[技术实现方案说明]

## 测试覆盖
- [ ] 单元测试
- [ ] 集成测试
- [ ] 边界条件测试

## 相关文件
- server/services/xxx.service.ts
- client/src/pages/Xxx.tsx
- server/services/xxx.test.ts
```

### 8.5 Claude Code 命令参考

```powershell
# 生成新功能
claude-code generate feature --name "用户管理" --spec docs/specs/user-management.md

# 代码审查
claude-code review --files "server/services/*.ts"

# 生成测试
claude-code test --file "server/services/user.service.ts"

# 重构代码
claude-code refactor --file "server/routers.ts" --pattern "extract-method"
```

---

## 9. ChatGPT 集成配置

### 9.1 ChatGPT 角色定位

在 GRT 系统开发中，ChatGPT 主要负责：
- 代码审查和优化建议
- 性能分析和改进
- 文档生成和维护
- 技术方案评审

### 9.2 配置 OpenAI API

```powershell
# 设置环境变量
$env:OPENAI_API_KEY = "sk-your-openai-api-key"
```

### 9.3 创建 ChatGPT 集成服务

在 `server/ai-services/` 目录下创建集成服务：

```typescript
// server/ai-services/chatgpt.service.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function reviewCode(code: string, context: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `你是一位资深的代码审查专家，专注于TypeScript/React项目。
请从以下角度审查代码：
1. 代码质量和可读性
2. 性能优化建议
3. 安全性考虑
4. 最佳实践遵循情况`
      },
      {
        role: 'user',
        content: `请审查以下代码：\n\n上下文：${context}\n\n代码：\n${code}`
      }
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content || '';
}

export async function optimizePerformance(code: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: '你是一位性能优化专家，请分析代码并提供具体的优化建议。'
      },
      {
        role: 'user',
        content: `请分析以下代码的性能问题并提供优化方案：\n\n${code}`
      }
    ],
    temperature: 0.2,
  });

  return response.choices[0].message.content || '';
}
```

### 9.4 ChatGPT 工作流集成

**代码审查流程**:

```powershell
# 1. 提交代码前运行审查
node scripts/chatgpt-review.js --files "server/services/new-feature.ts"

# 2. 查看审查报告
cat reports/code-review-report.md

# 3. 根据建议修改代码
# 4. 重新提交
```

### 9.5 ChatGPT 提示词模板

**功能优化提示词**:

```markdown
# GRT系统功能优化请求

## 当前功能
[描述当前功能实现]

## 优化目标
- 性能提升
- 代码简化
- 可维护性增强

## 约束条件
- 保持API兼容性
- 不改变数据库结构
- 测试覆盖率不降低

## 相关代码
[粘贴相关代码]
```

---

## 10. 开发工作流规范

### 10.1 Manus-Claude-ChatGPT 协作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        开发工作流                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    需求规格    ┌─────────────┐                     │
│  │  Manus  │ ────────────► │ Claude Code │                     │
│  │ (规划)  │               │  (实现)     │                     │
│  └────┬────┘               └──────┬──────┘                     │
│       │                          │                             │
│       │ 验证结果                  │ 代码提交                     │
│       │                          ▼                             │
│       │                   ┌─────────────┐                      │
│       │                   │   ChatGPT   │                      │
│       │                   │  (审查优化)  │                      │
│       │                   └──────┬──────┘                      │
│       │                          │                             │
│       │ ◄────────────────────────┘                             │
│       │        审查报告                                         │
│       ▼                                                        │
│  ┌─────────┐                                                   │
│  │  验收   │ ──► 通过 ──► 合并代码                              │
│  │  测试   │ ──► 失败 ──► 返回修改                              │
│  └─────────┘                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 功能开发检查清单

```markdown
## 功能开发检查清单

### 1. 需求分析阶段
- [ ] 需求文档已创建
- [ ] 技术方案已评审
- [ ] 数据库变更已设计

### 2. 开发实现阶段
- [ ] 数据库Schema已更新
- [ ] API接口已实现
- [ ] 前端页面已完成
- [ ] 单元测试已编写

### 3. 代码审查阶段
- [ ] Claude Code 自检通过
- [ ] ChatGPT 审查通过
- [ ] 性能测试通过

### 4. 集成验证阶段
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 变更日志已记录
```

### 10.3 版本管理规范

**分支策略**:

| 分支 | 用途 | 命名规范 |
|------|------|----------|
| main | 生产环境 | main |
| develop | 开发环境 | develop |
| feature/* | 功能开发 | feature/v2.5.22-xxx |
| hotfix/* | 紧急修复 | hotfix/issue-xxx |

**提交规范**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型说明:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

---

## 11. 运维管理

### 11.1 Windows 服务配置

使用 PM2 管理 Node.js 进程：

```powershell
# 安装 PM2
npm install -g pm2
npm install -g pm2-windows-startup

# 配置 PM2 启动脚本
pm2 start dist/index.js --name grt-system

# 设置开机自启
pm2-startup install
pm2 save
```

**PM2 配置文件** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

### 11.2 日志管理

**日志目录结构**:

```
logs/
├── app/
│   ├── access.log      # 访问日志
│   ├── error.log       # 错误日志
│   └── debug.log       # 调试日志
├── mysql/
│   └── slow-query.log  # 慢查询日志
└── pm2/
    ├── output.log      # 标准输出
    └── error.log       # 错误输出
```

**日志轮转配置**:

```powershell
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 11.3 数据库备份

**自动备份脚本** (`scripts/backup-db.ps1`):

```powershell
# 数据库备份脚本
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "D:\Backups\mysql"
$backupFile = "$backupDir\grt_system_$timestamp.sql"

# 创建备份目录
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# 执行备份
mysqldump -u grt_user -p'your_password' grt_system > $backupFile

# 压缩备份文件
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

# 清理30天前的备份
Get-ChildItem $backupDir -Filter "*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item

Write-Host "Backup completed: $backupFile.zip"
```

**设置定时任务**:

```powershell
# 创建每日备份任务
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File D:\Projects\grt-implementation-plan\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "GRT-DB-Backup" -Action $action -Trigger $trigger -Description "Daily database backup"
```

### 11.4 监控告警

**系统监控脚本** (`scripts/health-check.ps1`):

```powershell
# 健康检查脚本
$apiUrl = "http://localhost:3000/api/trpc/health"

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 10
    if ($response.status -eq "ok") {
        Write-Host "System healthy" -ForegroundColor Green
    } else {
        Write-Host "System unhealthy: $($response.message)" -ForegroundColor Red
        # 发送告警通知
    }
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
    # 发送告警通知
}
```

---

## 12. 故障排除

### 12.1 常见问题

**问题 1**: Node.js 版本不兼容

```powershell
# 检查版本
node --version

# 如果版本不对，使用 nvm-windows 管理版本
# 下载: https://github.com/coreybutler/nvm-windows
nvm install 22
nvm use 22
```

**问题 2**: MySQL 连接失败

```powershell
# 检查 MySQL 服务状态
Get-Service -Name MySQL80

# 启动服务
Start-Service -Name MySQL80

# 检查端口
netstat -an | findstr 3306
```

**问题 3**: 依赖安装失败

```powershell
# 清理缓存
pnpm store prune

# 删除 node_modules 重新安装
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
```

**问题 4**: 端口被占用

```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /PID <pid> /F
```

### 12.2 日志分析

```powershell
# 查看最近错误日志
Get-Content logs/error.log -Tail 100

# 搜索特定错误
Select-String -Path logs/*.log -Pattern "ERROR"
```

---

## 附录

### A. 环境变量完整列表

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | string | - | MySQL连接字符串 |
| JWT_SECRET | string | - | JWT签名密钥 |
| NODE_ENV | string | development | 运行环境 |
| VITE_APP_ID | string | - | 应用ID |
| VITE_APP_TITLE | string | GRT System | 应用标题 |
| OPENAI_API_KEY | string | - | OpenAI API密钥 |
| ANTHROPIC_API_KEY | string | - | Anthropic API密钥 |
| GEMINI_API_KEY | string | - | Google AI API密钥 |

### B. 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 同步数据库 |
| `pm2 status` | 查看服务状态 |
| `pm2 logs` | 查看实时日志 |
| `pm2 restart all` | 重启所有服务 |

### C. 参考资源

1. [Node.js 官方文档](https://nodejs.org/docs/)
2. [MySQL 8.0 参考手册](https://dev.mysql.com/doc/refman/8.0/en/)
3. [pnpm 文档](https://pnpm.io/)
4. [Drizzle ORM 文档](https://orm.drizzle.team/)
5. [tRPC 文档](https://trpc.io/docs)
6. [React 19 文档](https://react.dev/)
7. [Tailwind CSS 文档](https://tailwindcss.com/docs)
8. [Claude Code 文档](https://docs.anthropic.com/)
9. [OpenAI API 文档](https://platform.openai.com/docs/)

---

**文档版本**: v1.0  
**最后更新**: 2026年1月28日  
**维护者**: Manus AI

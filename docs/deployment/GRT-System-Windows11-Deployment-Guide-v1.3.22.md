# GRT智能系统 Windows 11 本地服务器部署指南

**版本**: v1.3.22  
**文档版本**: 1.0  
**作者**: Manus AI  
**日期**: 2026年2月1日  
**适用环境**: Windows 11 Professional/Enterprise

---

## 目录

1. [概述](#1-概述)
2. [系统架构](#2-系统架构)
3. [环境要求](#3-环境要求)
4. [环境准备](#4-环境准备)
5. [项目部署](#5-项目部署)
6. [数据库配置](#6-数据库配置)
7. [环境变量配置](#7-环境变量配置)
8. [启动与验证](#8-启动与验证)
9. [Manus协同开发工作流程](#9-manus协同开发工作流程)
10. [故障排除](#10-故障排除)
11. [附录](#附录)

---

## 1. 概述

### 1.1 文档目的

本文档提供GRT智能系统v1.3.22从Manus平台迁移至Windows 11本地服务器的完整部署方案。该方案涵盖环境准备、项目部署、数据库配置以及与Manus平台的协同开发工作流程，确保系统能够在本地环境稳定运行，同时保持与云端平台的同步迭代能力。

### 1.2 系统概述

GRT智能系统是一套面向工业清洗设备行业的综合管理平台，采用现代化的全栈技术架构，包含以下核心功能模块：

| 模块类别 | 功能描述 |
|---------|---------|
| **能力管理系统** | 员工能力评估、证据上传、自动升级机制 |
| **项目管理系统** | M0-M12阶段门禁管控、里程碑追踪 |
| **AI智能服务** | 方案助手、报价助手、计划助手、KPI助手 |
| **Microsoft 365集成** | Outlook日历、Teams消息同步 |
| **销售管理系统** | CRM、商机管理、客户360°视图 |
| **安全与权限系统** | 角色权限、访问控制、审计日志 |

### 1.3 协同开发模式

本部署方案支持以下AI工具协同开发模式：

| AI工具 | 角色定位 | 使用场景 |
|-------|---------|---------|
| **Manus** | 整体规划、编排、验证 | 系统架构设计、功能规划、代码审查 |
| **Claude Code** | 功能实现、代码编写 | 新功能开发、Bug修复、代码重构 |
| **ChatGPT** | 迭代优化、方案咨询 | 功能优化建议、技术方案评估 |

---

## 2. 系统架构

### 2.1 技术栈概览

GRT智能系统采用现代化的全栈JavaScript/TypeScript技术栈：

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Client)                          │
│  React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui        │
│  Vite 7 + React Query + Wouter                              │
├─────────────────────────────────────────────────────────────┤
│                      API层 (tRPC)                           │
│  tRPC 11 + Superjson + Zod                                  │
├─────────────────────────────────────────────────────────────┤
│                      后端 (Server)                          │
│  Express 4 + Node.js 22 + TypeScript                        │
├─────────────────────────────────────────────────────────────┤
│                      数据层 (Database)                      │
│  MySQL 8.0 / TiDB + Drizzle ORM                             │
├─────────────────────────────────────────────────────────────┤
│                      存储层 (Storage)                       │
│  AWS S3 兼容存储                                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
grt-implementation-plan/
├── client/                    # 前端源代码
│   ├── public/               # 静态资源
│   └── src/
│       ├── components/       # React组件
│       ├── pages/           # 页面组件
│       ├── contexts/        # React上下文
│       ├── hooks/           # 自定义Hooks
│       └── lib/             # 工具库
├── server/                    # 后端源代码
│   ├── _core/               # 核心框架
│   ├── ai-services/         # AI服务
│   ├── capability-evidence/ # 能力证据
│   ├── services/            # 外部服务集成
│   └── routers.ts           # tRPC路由
├── drizzle/                   # 数据库Schema
│   ├── schema.ts            # 表定义
│   └── migrations/          # 迁移文件
├── shared/                    # 共享类型和常量
├── docs/                      # 文档
├── scripts/                   # 脚本工具
└── docker/                    # Docker配置
```

---

## 3. 环境要求

### 3.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|-------|---------|---------|
| **CPU** | 4核心 | 8核心及以上 |
| **内存** | 8GB | 16GB及以上 |
| **硬盘** | 50GB SSD | 100GB SSD |
| **网络** | 100Mbps | 1Gbps |

### 3.2 软件要求

| 软件 | 版本要求 | 说明 |
|-----|---------|-----|
| **操作系统** | Windows 11 Pro/Enterprise | 需启用WSL2（可选） |
| **Node.js** | 22.x LTS | 推荐使用nvm-windows管理 |
| **pnpm** | 10.4.1+ | 包管理器 |
| **MySQL** | 8.0+ | 或TiDB兼容版本 |
| **Git** | 2.40+ | 版本控制 |
| **VS Code** | 最新版 | 推荐IDE |

### 3.3 网络要求

部署和运行需要访问以下外部服务：

| 服务 | 用途 | 端口 |
|-----|-----|-----|
| npm registry | 包下载 | 443 |
| GitHub | 代码同步 | 443 |
| Manus API | 协同开发 | 443 |
| Microsoft Graph API | 365集成 | 443 |
| AWS S3 | 文件存储 | 443 |

---

## 4. 环境准备

### 4.1 安装Node.js

推荐使用nvm-windows管理Node.js版本，便于多版本切换。

**步骤1**: 下载nvm-windows

访问 https://github.com/coreybutler/nvm-windows/releases 下载最新版本的 `nvm-setup.exe`。

**步骤2**: 安装nvm-windows

运行安装程序，按默认选项完成安装。安装完成后，打开新的PowerShell窗口验证安装：

```powershell
nvm version
```

**步骤3**: 安装Node.js 22

```powershell
# 安装Node.js 22 LTS
nvm install 22

# 设置为默认版本
nvm use 22

# 验证安装
node --version
# 应显示: v22.x.x

npm --version
# 应显示: 10.x.x
```

### 4.2 安装pnpm

pnpm是本项目指定的包管理器，提供更快的安装速度和更高效的磁盘空间利用。

```powershell
# 使用npm全局安装pnpm
npm install -g pnpm@10.4.1

# 验证安装
pnpm --version
# 应显示: 10.4.1
```

### 4.3 安装Git

**步骤1**: 下载Git for Windows

访问 https://git-scm.com/download/win 下载最新版本。

**步骤2**: 安装配置

运行安装程序，推荐选择以下选项：
- 默认编辑器：选择VS Code
- PATH环境：选择"Git from the command line and also from 3rd-party software"
- 行尾转换：选择"Checkout as-is, commit Unix-style line endings"

**步骤3**: 配置Git

```powershell
# 配置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 配置行尾处理
git config --global core.autocrlf input

# 验证配置
git config --list
```

### 4.4 安装MySQL 8.0

**方式一：直接安装MySQL**

**步骤1**: 下载MySQL Installer

访问 https://dev.mysql.com/downloads/installer/ 下载MySQL Installer。

**步骤2**: 安装MySQL

运行安装程序，选择"Developer Default"或"Server only"安装类型。

配置要点：
- 认证方式：选择"Use Strong Password Encryption"
- Root密码：设置强密码并妥善保存
- Windows服务：勾选"Configure MySQL Server as a Windows Service"
- 服务名称：MySQL80
- 开机自启：勾选"Start the MySQL Server at System Startup"

**步骤3**: 验证安装

```powershell
# 连接MySQL
mysql -u root -p

# 在MySQL命令行中
mysql> SELECT VERSION();
# 应显示: 8.0.x

mysql> exit
```

**方式二：使用Docker（推荐）**

如果已安装Docker Desktop，可以使用Docker运行MySQL：

```powershell
# 创建数据目录
mkdir C:\mysql-data

# 启动MySQL容器
docker run -d `
  --name grt-mysql `
  -p 3306:3306 `
  -e MYSQL_ROOT_PASSWORD=your_secure_password `
  -e MYSQL_DATABASE=grt_system `
  -v C:\mysql-data:/var/lib/mysql `
  mysql:8.0

# 验证容器运行
docker ps
```

### 4.5 创建数据库

```sql
-- 连接MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户（生产环境推荐）
CREATE USER 'grt_app'@'localhost' IDENTIFIED BY 'your_app_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_app'@'localhost';
FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
```

### 4.6 安装VS Code及扩展

**步骤1**: 下载安装VS Code

访问 https://code.visualstudio.com/ 下载并安装。

**步骤2**: 安装推荐扩展

打开VS Code，按 `Ctrl+Shift+X` 打开扩展面板，搜索并安装：

| 扩展名称 | 用途 |
|---------|-----|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| TypeScript Vue Plugin (Volar) | TypeScript支持 |
| Tailwind CSS IntelliSense | Tailwind提示 |
| Prisma / Drizzle | 数据库Schema支持 |
| GitLens | Git增强 |
| Thunder Client | API测试 |

---

## 5. 项目部署

### 5.1 获取项目代码

**方式一：从Manus平台导出**

1. 登录Manus平台，打开GRT智能系统项目
2. 进入Management UI → Settings → GitHub
3. 点击"Export to GitHub"，选择目标仓库
4. 在本地克隆仓库：

```powershell
# 创建项目目录
mkdir C:\Projects
cd C:\Projects

# 克隆仓库
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

**方式二：直接下载**

1. 在Manus平台，进入Management UI → Code
2. 点击"Download All Files"下载ZIP包
3. 解压到目标目录：

```powershell
# 解压到项目目录
Expand-Archive -Path "C:\Downloads\grt-implementation-plan.zip" -DestinationPath "C:\Projects\"
cd C:\Projects\grt-implementation-plan
```

### 5.2 安装依赖

```powershell
# 确保在项目根目录
cd C:\Projects\grt-implementation-plan

# 安装所有依赖
pnpm install

# 如果遇到网络问题，可以配置镜像
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

安装完成后，检查 `node_modules` 目录是否存在，以及是否有错误信息。

### 5.3 项目结构验证

```powershell
# 检查关键文件是否存在
Test-Path "package.json"
Test-Path "drizzle/schema.ts"
Test-Path "server/_core/index.ts"
Test-Path "client/src/App.tsx"

# 检查依赖安装
pnpm list --depth=0
```

---

## 6. 数据库配置

### 6.1 配置数据库连接

创建环境变量文件 `.env`（注意：此文件不应提交到Git）：

```powershell
# 在项目根目录创建.env文件
New-Item -Path ".env" -ItemType File
```

编辑 `.env` 文件，添加数据库连接字符串：

```env
# 数据库连接（MySQL格式）
DATABASE_URL="mysql://grt_app:your_app_password@localhost:3306/grt_system"

# 如果使用Docker
DATABASE_URL="mysql://root:your_secure_password@localhost:3306/grt_system"
```

### 6.2 执行数据库迁移

```powershell
# 生成迁移文件并执行迁移
pnpm db:push
```

迁移过程中可能会提示确认创建表，按回车确认即可。

**常见问题处理**：

如果遇到超时或交互式提示问题，可以手动执行：

```powershell
# 分步执行
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 6.3 验证数据库

```sql
-- 连接数据库
mysql -u grt_app -p grt_system

-- 查看已创建的表
SHOW TABLES;

-- 应该看到类似以下表：
-- ai_assistant_configs
-- ai_assistant_sessions
-- capability_evidences
-- users
-- ...等多个表
```

---

## 7. 环境变量配置

### 7.1 完整环境变量列表

在 `.env` 文件中配置以下环境变量：

```env
# ==================== 核心配置 ====================
NODE_ENV=development
DATABASE_URL="mysql://grt_app:your_password@localhost:3306/grt_system"
JWT_SECRET="your-secure-jwt-secret-at-least-32-characters"

# ==================== OAuth配置（本地开发可选） ====================
VITE_APP_ID="your-manus-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/login"
OWNER_OPEN_ID="your-owner-open-id"
OWNER_NAME="Your Name"

# ==================== Manus内置API ====================
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-forge-api-key"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-forge-api-key"

# ==================== Microsoft Graph API ====================
MICROSOFT_TENANT_ID="your-azure-tenant-id"
MICROSOFT_CLIENT_ID="your-azure-client-id"
MICROSOFT_CLIENT_SECRET="your-azure-client-secret"

# ==================== Gemini API ====================
GEMINI_API_KEY="your-gemini-api-key"

# ==================== 简道云API ====================
JIANDAOYUN_API_KEY="your-jiandaoyun-api-key"
JIANDAOYUN_CORP_ID="your-jiandaoyun-corp-id"

# ==================== 前端配置 ====================
VITE_APP_TITLE="GRT智能系统"
VITE_APP_LOGO="/logo.svg"
```

### 7.2 环境变量说明

| 变量名 | 必填 | 说明 |
|-------|-----|-----|
| `DATABASE_URL` | 是 | MySQL数据库连接字符串 |
| `JWT_SECRET` | 是 | JWT签名密钥，至少32字符 |
| `NODE_ENV` | 是 | 运行环境：development/production |
| `MICROSOFT_*` | 否 | Microsoft 365集成所需 |
| `GEMINI_API_KEY` | 否 | AI功能所需 |
| `JIANDAOYUN_*` | 否 | 简道云数据同步所需 |

### 7.3 生成安全密钥

```powershell
# 使用Node.js生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的密钥用于 `JWT_SECRET`。

---

## 8. 启动与验证

### 8.1 开发模式启动

```powershell
# 启动开发服务器
pnpm dev
```

成功启动后，应看到类似输出：

```
> grt-implementation-plan@1.0.0 dev
> NODE_ENV=development tsx watch server/_core/index.ts

[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

### 8.2 访问验证

打开浏览器访问 http://localhost:3000，应看到GRT智能系统首页。

**验证检查清单**：

| 检查项 | 预期结果 |
|-------|---------|
| 首页加载 | 显示系统首页，包含导航菜单 |
| 系统状态 | 左下角显示CPU/内存使用率 |
| API响应 | 访问 /api/trpc/health 返回OK |
| 数据库连接 | 页面数据正常加载 |

### 8.3 生产模式构建

```powershell
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 8.4 Windows服务配置（可选）

如需将应用配置为Windows服务，可使用 `node-windows` 或 `pm2`：

**使用PM2**：

```powershell
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name grt-system

# 配置开机自启
pm2 startup
pm2 save
```

---

## 9. Manus协同开发工作流程

### 9.1 协同开发架构

本系统采用"云-边"协同开发模式，Manus平台作为主要开发环境，本地服务器作为生产/测试环境：

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus 云端平台                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  开发环境   │  │  代码管理   │  │  AI辅助     │         │
│  │  (Sandbox)  │  │  (Git)      │  │  (Claude)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  Checkpoint│                           │
│                    │  (版本快照)│                           │
│                    └─────┬─────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   GitHub    │
                    │  (代码仓库) │
                    └──────┬──────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  git pull │                            │
│                    └─────┬─────┘                            │
│                          │                                  │
│  ┌─────────────┐  ┌─────▼─────┐  ┌─────────────┐           │
│  │  测试环境   │◄─┤  本地代码  ├─►│  生产环境   │           │
│  │  (Test)     │  │  (Local)   │  │  (Prod)     │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                              │
│                    Windows 11 本地服务器                     │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 开发工作流程

#### 阶段1：需求规划（Manus）

1. 在Manus平台创建新任务，描述功能需求
2. Manus分析需求，生成开发计划和技术方案
3. 更新 `todo.md` 记录待开发功能

#### 阶段2：功能实现（Manus + Claude）

1. Manus根据计划编写代码实现
2. 实时预览和测试功能
3. 完成后保存Checkpoint

#### 阶段3：代码同步（GitHub）

1. 在Manus平台导出代码到GitHub
2. 本地服务器拉取最新代码：

```powershell
cd C:\Projects\grt-implementation-plan

# 拉取最新代码
git pull origin main

# 安装新依赖（如有）
pnpm install

# 执行数据库迁移（如有）
pnpm db:push

# 重启服务
# 如果使用PM2
pm2 restart grt-system
```

#### 阶段4：本地验证与优化（ChatGPT）

1. 在本地环境测试新功能
2. 使用ChatGPT分析优化建议
3. 记录问题和改进点

#### 阶段5：反馈迭代

1. 将本地测试结果反馈到Manus
2. 在Manus平台进行修复和优化
3. 重复阶段2-4直到功能完善

### 9.3 版本同步脚本

创建自动化同步脚本 `scripts/sync-from-manus.ps1`：

```powershell
# sync-from-manus.ps1
# GRT系统 Manus同步脚本

param(
    [switch]$SkipMigration,
    [switch]$SkipRestart
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GRT系统 - Manus同步脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 备份当前版本
$backupDir = "C:\Backups\grt-system\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "`n[1/5] 创建备份..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -Path ".\*" -Destination $backupDir -Recurse -Exclude "node_modules"
Write-Host "  备份完成: $backupDir" -ForegroundColor Green

# 2. 拉取最新代码
Write-Host "`n[2/5] 拉取最新代码..." -ForegroundColor Yellow
git fetch origin
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "  代码拉取失败，请检查Git配置" -ForegroundColor Red
    exit 1
}
Write-Host "  代码拉取完成" -ForegroundColor Green

# 3. 安装依赖
Write-Host "`n[3/5] 安装依赖..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "  依赖安装完成" -ForegroundColor Green

# 4. 数据库迁移
if (-not $SkipMigration) {
    Write-Host "`n[4/5] 执行数据库迁移..." -ForegroundColor Yellow
    pnpm db:push
    Write-Host "  数据库迁移完成" -ForegroundColor Green
} else {
    Write-Host "`n[4/5] 跳过数据库迁移" -ForegroundColor Gray
}

# 5. 重启服务
if (-not $SkipRestart) {
    Write-Host "`n[5/5] 重启服务..." -ForegroundColor Yellow
    pm2 restart grt-system
    Write-Host "  服务重启完成" -ForegroundColor Green
} else {
    Write-Host "`n[5/5] 跳过服务重启" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  同步完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
```

使用方法：

```powershell
# 完整同步
.\scripts\sync-from-manus.ps1

# 跳过数据库迁移
.\scripts\sync-from-manus.ps1 -SkipMigration

# 跳过服务重启
.\scripts\sync-from-manus.ps1 -SkipRestart
```

### 9.4 测试/生产环境管理

按照变更管理规范，建议配置测试和生产两套环境：

| 环境 | 端口 | 数据库 | 用途 |
|-----|-----|-------|-----|
| 测试环境 | 3001 | grt_system_test | 功能验证、Bug修复 |
| 生产环境 | 3000 | grt_system | 正式使用 |

**测试环境配置**：

```powershell
# 创建测试环境目录
Copy-Item -Path "C:\Projects\grt-implementation-plan" -Destination "C:\Projects\grt-test" -Recurse

# 修改测试环境端口（在.env中）
# PORT=3001
# DATABASE_URL="mysql://grt_app:password@localhost:3306/grt_system_test"
```

### 9.5 代码审查流程

每次从Manus同步代码后，建议执行以下审查流程：

1. **代码差异审查**：
```powershell
git diff HEAD~1 --stat
git diff HEAD~1 -- server/
```

2. **运行测试**：
```powershell
pnpm test
```

3. **类型检查**：
```powershell
npx tsc --noEmit
```

4. **代码格式检查**：
```powershell
pnpm format
```

---

## 10. 故障排除

### 10.1 常见问题

#### 问题1：Node.js版本不兼容

**症状**：启动时报语法错误或模块找不到

**解决方案**：
```powershell
# 检查Node版本
node --version

# 如果不是22.x，切换版本
nvm use 22
```

#### 问题2：数据库连接失败

**症状**：启动时报 `ECONNREFUSED` 或 `Access denied`

**解决方案**：
1. 检查MySQL服务是否运行：
```powershell
Get-Service MySQL80
```

2. 验证连接字符串：
```powershell
mysql -u grt_app -p -h localhost grt_system
```

3. 检查防火墙设置

#### 问题3：端口被占用

**症状**：启动时报 `EADDRINUSE`

**解决方案**：
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（替换PID）
taskkill /PID <PID> /F
```

#### 问题4：依赖安装失败

**症状**：`pnpm install` 报错

**解决方案**：
```powershell
# 清除缓存
pnpm store prune

# 删除node_modules和lock文件
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml

# 重新安装
pnpm install
```

### 10.2 日志查看

```powershell
# 查看PM2日志
pm2 logs grt-system

# 查看实时日志
pm2 logs grt-system --lines 100

# 查看错误日志
pm2 logs grt-system --err
```

### 10.3 性能监控

```powershell
# PM2监控面板
pm2 monit

# 查看进程状态
pm2 status
```

---

## 附录

### A. 快速命令参考

| 命令 | 说明 |
|-----|-----|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 执行数据库迁移 |
| `pnpm format` | 格式化代码 |

### B. 目录权限设置

确保以下目录有正确的读写权限：

```powershell
# 项目目录
icacls "C:\Projects\grt-implementation-plan" /grant Users:F /T

# 日志目录
icacls "C:\Projects\grt-implementation-plan\logs" /grant Users:F /T
```

### C. 防火墙配置

如需外部访问，配置Windows防火墙：

```powershell
# 允许3000端口入站
New-NetFirewallRule -DisplayName "GRT System" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

### D. 相关文档

| 文档 | 路径 |
|-----|-----|
| 系统架构文档 | `docs/architecture/` |
| API文档 | `docs/dev-specs/` |
| 用户手册 | `docs/user-manual/` |
| 部署规范 | `docs/deployment/` |

### E. 联系支持

如遇到本文档未涵盖的问题，请通过以下方式获取支持：

1. 在Manus平台提交问题描述
2. 查阅项目GitHub Issues
3. 联系系统管理员

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|-----|-----|-----|---------|
| 1.0 | 2026-02-01 | Manus AI | 初始版本，基于v1.3.22 |

---

*本文档由Manus AI自动生成，如有疑问请联系系统管理员。*

# GRT智能系统快速实施方案 - Windows 11 本地服务器部署指南

**版本**: v1.3.36  
**作者**: Manus AI  
**更新日期**: 2026年1月26日  
**文档状态**: 正式发布

---

## 目录

1. [概述](#1-概述)
2. [系统要求](#2-系统要求)
3. [环境准备](#3-环境准备)
4. [项目获取与安装](#4-项目获取与安装)
5. [环境变量配置](#5-环境变量配置)
6. [数据库配置](#6-数据库配置)
7. [Claude Code 代码查验流程](#7-claude-code-代码查验流程)
8. [开发环境运行](#8-开发环境运行)
9. [生产环境部署](#9-生产环境部署)
10. [运维与监控](#10-运维与监控)
11. [故障排除](#11-故障排除)
12. [附录](#附录)

---

## 1. 概述

本文档提供GRT智能系统快速实施方案从Manus云服务器迁移到Windows 11本地服务器的完整部署流程。该系统是一个基于React 19 + Express + tRPC + MySQL的全栈Web应用，包含CRM、项目管理、成本管理、培训管理、合规监控等多个业务模块。

### 1.1 技术栈概览

| 层级 | 技术 | 版本要求 |
|------|------|----------|
| 前端框架 | React | 19.2.1 |
| 构建工具 | Vite | 7.1.7 |
| 后端框架 | Express | 4.21.2 |
| API层 | tRPC | 11.6.0 |
| 数据库 | MySQL | 8.0+ |
| ORM | Drizzle ORM | 0.44.5 |
| 运行时 | Node.js | 22.x LTS |
| 包管理器 | pnpm | 10.4.1 |
| 语言 | TypeScript | 5.9.3 |

### 1.2 部署架构

本地部署采用单机架构，所有服务运行在同一台Windows 11服务器上。生产环境建议使用PM2进行进程管理，Nginx作为反向代理。

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows 11 Server                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Nginx     │──│  Node.js    │──│      MySQL 8.0      │ │
│  │  (可选)     │  │  (PM2)      │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         ↓               ↓                    ↓              │
│    端口 80/443      端口 3000           端口 3306           │
└─────────────────────────────────────────────────────────────┘
```

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

| 软件 | 版本 | 用途 |
|------|------|------|
| Windows 11 | 22H2及以上 | 操作系统 |
| Node.js | 22.x LTS | JavaScript运行时 |
| pnpm | 10.4.1+ | 包管理器 |
| MySQL | 8.0+ | 数据库 |
| Git | 2.40+ | 版本控制 |
| Visual Studio Code | 最新版 | 代码编辑器（可选） |
| Claude Code | 最新版 | AI代码助手 |

---

## 3. 环境准备

### 3.1 安装 Node.js

Node.js是项目运行的核心依赖。请按以下步骤安装：

**步骤1**: 访问Node.js官方网站 https://nodejs.org/，下载Windows版本的22.x LTS安装包。

**步骤2**: 运行安装程序，建议选择默认安装路径 `C:\Program Files\nodejs\`。安装过程中确保勾选"Add to PATH"选项。

**步骤3**: 安装完成后，打开PowerShell或命令提示符，验证安装：

```powershell
node --version
# 应输出: v22.x.x

npm --version
# 应输出: 10.x.x
```

### 3.2 安装 pnpm

pnpm是本项目指定的包管理器，相比npm具有更快的安装速度和更小的磁盘占用。

```powershell
# 使用npm全局安装pnpm
npm install -g pnpm@10.4.1

# 验证安装
pnpm --version
# 应输出: 10.4.1
```

### 3.3 安装 Git

Git用于从代码仓库获取项目源码。

**步骤1**: 访问Git官方网站 https://git-scm.com/download/win，下载Windows版本安装包。

**步骤2**: 运行安装程序，建议使用默认配置。在"Adjusting your PATH environment"步骤选择"Git from the command line and also from 3rd-party software"。

**步骤3**: 验证安装：

```powershell
git --version
# 应输出: git version 2.4x.x
```

### 3.4 安装 MySQL 8.0

MySQL是项目的数据存储后端。

**步骤1**: 访问MySQL官方网站 https://dev.mysql.com/downloads/mysql/，下载MySQL 8.0 Windows安装包（MySQL Installer）。

**步骤2**: 运行安装程序，选择"Developer Default"或"Server only"安装类型。

**步骤3**: 在配置阶段，设置root密码并记录。建议创建专用数据库用户：

```sql
-- 连接MySQL后执行
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;
```

**步骤4**: 验证MySQL服务运行状态：

```powershell
# 检查MySQL服务状态
Get-Service -Name MySQL80

# 或使用mysql命令行
mysql -u root -p -e "SELECT VERSION();"
```

### 3.5 安装 Claude Code

Claude Code是Anthropic提供的AI编程助手，用于代码查验和开发辅助。

**步骤1**: 访问Claude官方网站或VS Code扩展市场，安装Claude Code扩展。

**步骤2**: 配置API密钥（如需要）：

```powershell
# 设置环境变量（PowerShell）
$env:ANTHROPIC_API_KEY = "your_api_key_here"

# 或在系统环境变量中永久设置
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your_api_key_here", "User")
```

---

## 4. 项目获取与安装

### 4.1 获取项目源码

有两种方式获取项目源码：

**方式一：从Git仓库克隆（推荐）**

```powershell
# 创建项目目录
mkdir C:\Projects
cd C:\Projects

# 克隆项目（替换为实际仓库地址）
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

**方式二：从Manus导出的ZIP包**

1. 在Manus管理界面，进入项目的"Code"面板
2. 点击"Download all files"下载完整项目包
3. 解压到 `C:\Projects\grt-implementation-plan`

### 4.2 安装项目依赖

```powershell
# 进入项目目录
cd C:\Projects\grt-implementation-plan

# 安装所有依赖
pnpm install

# 安装完成后，检查node_modules目录
dir node_modules
```

依赖安装过程可能需要5-10分钟，取决于网络状况。如遇到网络问题，可配置npm镜像：

```powershell
# 配置淘宝镜像（中国大陆用户）
pnpm config set registry https://registry.npmmirror.com
```

### 4.3 项目目录结构

安装完成后，项目目录结构如下：

```
grt-implementation-plan/
├── client/                 # 前端源码
│   ├── public/            # 静态资源
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # React上下文
│   │   ├── hooks/         # 自定义Hooks
│   │   └── lib/           # 工具函数
│   └── index.html
├── server/                 # 后端源码
│   ├── _core/             # 核心框架代码
│   ├── services/          # 业务服务
│   ├── routers.ts         # tRPC路由定义
│   └── db.ts              # 数据库连接
├── drizzle/               # 数据库Schema和迁移
│   ├── schema.ts          # 数据库表定义
│   └── migrations/        # 迁移文件
├── shared/                # 前后端共享代码
├── docs/                  # 文档
├── package.json           # 项目配置
├── vite.config.ts         # Vite配置
├── drizzle.config.ts      # Drizzle配置
└── tsconfig.json          # TypeScript配置
```

---

## 5. 环境变量配置

### 5.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```powershell
# 创建.env文件
New-Item -Path ".env" -ItemType File
```

### 5.2 环境变量说明

以下是项目所需的全部环境变量及其说明：

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| DATABASE_URL | 是 | MySQL连接字符串 | mysql://grt_user:password@localhost:3306/grt_system |
| JWT_SECRET | 是 | JWT签名密钥（至少32字符） | your_32_char_secret_key_here_xxx |
| NODE_ENV | 是 | 运行环境 | development 或 production |
| PORT | 否 | 服务端口（默认3000） | 3000 |
| VITE_APP_ID | 是 | 应用ID | grt-local |
| VITE_APP_TITLE | 否 | 应用标题 | GRT智能系统 |
| OAUTH_SERVER_URL | 否 | OAuth服务器地址 | （本地部署可留空） |
| VITE_OAUTH_PORTAL_URL | 否 | OAuth登录页地址 | （本地部署可留空） |
| OWNER_OPEN_ID | 否 | 系统所有者ID | admin |
| OWNER_NAME | 否 | 系统所有者名称 | 管理员 |
| GEMINI_API_KEY | 否 | Gemini API密钥 | （AI功能需要） |
| JIANDAOYUN_API_KEY | 否 | 简道云API密钥 | （简道云集成需要） |
| JIANDAOYUN_CORP_ID | 否 | 简道云企业ID | （简道云集成需要） |
| MICROSOFT_CLIENT_ID | 否 | Microsoft Graph客户端ID | （邮件功能需要） |
| MICROSOFT_CLIENT_SECRET | 否 | Microsoft Graph客户端密钥 | （邮件功能需要） |
| MICROSOFT_TENANT_ID | 否 | Microsoft租户ID | （邮件功能需要） |

### 5.3 .env 文件模板

```env
# ============================================
# GRT智能系统 - 本地部署环境变量配置
# ============================================

# 数据库配置（必填）
DATABASE_URL=mysql://grt_user:your_password@localhost:3306/grt_system

# 安全配置（必填）
JWT_SECRET=your_32_character_secret_key_here_change_this

# 运行环境（必填）
NODE_ENV=development
PORT=3000

# 应用配置（必填）
VITE_APP_ID=grt-local
VITE_APP_TITLE=GRT智能系统

# OAuth配置（本地部署可留空，使用本地认证）
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=admin
OWNER_NAME=管理员

# AI服务配置（可选，启用AI功能需要）
GEMINI_API_KEY=

# 简道云集成（可选）
JIANDAOYUN_API_KEY=
JIANDAOYUN_CORP_ID=

# Microsoft Graph（可选，邮件功能需要）
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# S3存储配置（可选，文件上传需要）
# 本地部署可使用本地文件存储替代
```

### 5.4 生成安全的JWT密钥

```powershell
# 使用Node.js生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的密钥填入 `JWT_SECRET` 环境变量。

---

## 6. 数据库配置

### 6.1 创建数据库

如果在MySQL安装时未创建数据库，请执行以下SQL：

```sql
-- 连接MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE grt_system 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER 'grt_user'@'localhost' 
  IDENTIFIED BY 'your_secure_password';

GRANT ALL PRIVILEGES ON grt_system.* 
  TO 'grt_user'@'localhost';

FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
```

### 6.2 运行数据库迁移

Drizzle ORM用于管理数据库Schema。执行以下命令初始化数据库表：

```powershell
# 确保.env文件已配置DATABASE_URL
# 生成迁移文件并执行迁移
pnpm db:push
```

该命令会：
1. 读取 `drizzle/schema.ts` 中的表定义
2. 生成SQL迁移文件到 `drizzle/migrations/`
3. 执行迁移，创建所有数据库表

### 6.3 验证数据库表

```sql
-- 连接数据库
mysql -u grt_user -p grt_system

-- 查看所有表
SHOW TABLES;

-- 应该看到类似以下表：
-- users, customers, contacts, opportunities, projects, 
-- milestones, cost_categories, cost_budgets, trainings, etc.
```

### 6.4 初始化种子数据（可选）

项目提供了多个种子数据脚本，用于填充测试数据：

```powershell
# 初始化CRM测试数据
pnpm tsx server/seed-crm.ts

# 初始化合规数据
pnpm tsx server/seed-compliance-data.ts

# 初始化命名规则示例
pnpm tsx server/seed-naming-sample.ts
```

---

## 7. Claude Code 代码查验流程

本节定义了使用Claude Code进行代码查验的标准流程，确保代码质量和系统稳定性。

### 7.1 查验流程概述

代码查验采用**Manus-Claude协作模式**，其中Manus负责任务规划和验收，Claude Code负责实现和自检。

```
┌─────────────────────────────────────────────────────────────────┐
│                    代码查验流程图                                │
│                                                                 │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │  Manus  │───▶│ Claude Code │───▶│   Manus     │            │
│  │ 任务规划 │    │  代码实现   │    │  验收检查   │            │
│  └─────────┘    └─────────────┘    └──────┬──────┘            │
│       │                                    │                   │
│       │         ┌─────────────┐           │                   │
│       │         │  不通过？    │◀──────────┘                   │
│       │         └──────┬──────┘                               │
│       │                │ 是                                    │
│       │         ┌──────▼──────┐                               │
│       │         │ 记录问题    │                               │
│       │         │ 更新设计    │                               │
│       │         └──────┬──────┘                               │
│       │                │                                       │
│       │         ┌──────▼──────┐                               │
│       └────────▶│ 重新实现    │ (最多3次)                      │
│                 └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 查验检查清单

每次代码变更前，必须完成以下检查项：

**阶段一：代码实现前检查**

| 检查项 | 说明 | 检查命令 |
|--------|------|----------|
| 依赖完整性 | 确认所有依赖已安装 | `pnpm install` |
| 环境变量 | 确认.env配置正确 | 手动检查.env文件 |
| 数据库连接 | 确认数据库可访问 | `pnpm tsx -e "require('./server/db')"` |
| 类型检查 | 确认无TypeScript错误 | `pnpm check` |

**阶段二：代码实现后检查**

| 检查项 | 说明 | 检查命令 |
|--------|------|----------|
| 类型安全 | TypeScript编译无错误 | `pnpm check` |
| 单元测试 | 所有测试通过 | `pnpm test` |
| 代码格式 | 代码格式符合规范 | `pnpm format` |
| 构建测试 | 生产构建成功 | `pnpm build` |

### 7.3 Claude Code 查验命令

在VS Code中使用Claude Code进行代码查验：

**命令1：全面代码审查**

```
@claude 请对以下文件进行代码审查，检查：
1. 类型安全性
2. 错误处理
3. 性能问题
4. 安全漏洞
5. 代码规范

文件路径：[具体文件路径]
```

**命令2：功能验证**

```
@claude 请验证以下功能实现是否符合需求：
需求描述：[功能需求]
实现文件：[文件路径]
请检查：
1. 功能完整性
2. 边界条件处理
3. 异常情况处理
```

**命令3：数据库Schema审查**

```
@claude 请审查数据库Schema变更：
文件：drizzle/schema.ts
检查：
1. 字段类型是否合适
2. 索引是否合理
3. 关联关系是否正确
4. 是否有数据完整性问题
```

### 7.4 自动化查验脚本

创建 `scripts/code-review.ps1` 脚本用于自动化查验：

```powershell
# scripts/code-review.ps1
# GRT智能系统 - 代码查验自动化脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GRT智能系统 - 代码查验流程" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 步骤1：检查依赖
Write-Host "`n[1/5] 检查依赖完整性..." -ForegroundColor Yellow
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖检查失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 依赖检查通过" -ForegroundColor Green

# 步骤2：TypeScript类型检查
Write-Host "`n[2/5] TypeScript类型检查..." -ForegroundColor Yellow
pnpm check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 类型检查失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 类型检查通过" -ForegroundColor Green

# 步骤3：代码格式检查
Write-Host "`n[3/5] 代码格式检查..." -ForegroundColor Yellow
pnpm format
Write-Host "✅ 代码格式化完成" -ForegroundColor Green

# 步骤4：运行单元测试
Write-Host "`n[4/5] 运行单元测试..." -ForegroundColor Yellow
pnpm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 单元测试失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 单元测试通过" -ForegroundColor Green

# 步骤5：构建测试
Write-Host "`n[5/5] 生产构建测试..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 构建成功" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ 所有检查通过！代码可以部署" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
```

### 7.5 问题记录与追踪

当查验发现问题时，按以下格式记录：

```markdown
## 问题记录 - [日期]

### 问题ID: BUG-001
- **发现时间**: 2026-01-26 10:30
- **发现阶段**: 单元测试
- **问题描述**: [详细描述]
- **影响范围**: [受影响的模块/功能]
- **严重程度**: 高/中/低
- **修复状态**: 待修复/修复中/已修复
- **修复方案**: [修复方案描述]
- **验证结果**: [验证通过/需要重新验证]
```

### 7.6 三次尝试规则

根据结构化开发流程要求，每个问题最多尝试修复3次：

1. **第一次尝试**：Claude Code实现修复，Manus验证
2. **第二次尝试**：如失败，分析原因，调整方案后重新实现
3. **第三次尝试**：如仍失败，执行以下步骤：
   - 保存所有调试信息到 `docs/debug-logs/`
   - 评估问题影响范围
   - 记录到问题追踪系统
   - 标记为"待后续处理"，继续其他任务

---

## 8. 开发环境运行

### 8.1 启动开发服务器

```powershell
# 进入项目目录
cd C:\Projects\grt-implementation-plan

# 启动开发服务器
pnpm dev
```

开发服务器启动后，会显示类似以下输出：

```
Server running on http://localhost:3000/
[Scheduler] 定时任务调度器已启动
```

### 8.2 访问应用

打开浏览器访问 http://localhost:3000/，应该能看到GRT智能系统首页。

### 8.3 开发模式特性

开发模式下具有以下特性：

| 特性 | 说明 |
|------|------|
| 热模块替换(HMR) | 前端代码修改后自动刷新 |
| 服务器自动重启 | 后端代码修改后自动重启 |
| 详细错误信息 | 显示完整的错误堆栈 |
| 源码映射 | 支持浏览器调试TypeScript源码 |

### 8.4 运行测试

```powershell
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test server/crm.test.ts

# 监视模式（文件变更时自动运行）
pnpm vitest --watch
```

---

## 9. 生产环境部署

### 9.1 构建生产版本

```powershell
# 设置生产环境
$env:NODE_ENV = "production"

# 构建项目
pnpm build
```

构建完成后，会在 `dist/` 目录生成：
- `dist/index.js` - 服务器端代码
- `dist/client/` - 前端静态文件

### 9.2 安装 PM2

PM2是Node.js进程管理器，用于生产环境的进程管理和监控。

```powershell
# 全局安装PM2
npm install -g pm2

# Windows下安装PM2服务
npm install -g pm2-windows-startup
pm2-startup install
```

### 9.3 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.cjs`：

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
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
    env_file: '.env',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

### 9.4 启动生产服务

```powershell
# 创建日志目录
mkdir logs

# 使用PM2启动服务
pm2 start ecosystem.config.cjs

# 查看服务状态
pm2 status

# 查看日志
pm2 logs grt-system

# 保存PM2进程列表（开机自启）
pm2 save
```

### 9.5 配置 Nginx（可选）

如需使用Nginx作为反向代理，请按以下步骤配置：

**步骤1**: 下载并安装Nginx for Windows

**步骤2**: 编辑 `nginx.conf`：

```nginx
# nginx.conf
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # 上游服务器
    upstream grt_backend {
        server 127.0.0.1:3000;
    }

    server {
        listen       80;
        server_name  localhost;

        # 静态文件缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://grt_backend;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # API请求
        location /api/ {
            proxy_pass http://grt_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
        }

        # 其他请求
        location / {
            proxy_pass http://grt_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

**步骤3**: 启动Nginx

```powershell
cd C:\nginx
start nginx
```

### 9.6 配置 Windows 防火墙

```powershell
# 允许80端口（HTTP）
New-NetFirewallRule -DisplayName "GRT System HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow

# 允许443端口（HTTPS，如配置SSL）
New-NetFirewallRule -DisplayName "GRT System HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow

# 允许3000端口（直接访问Node.js）
New-NetFirewallRule -DisplayName "GRT System Node" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

---

## 10. 运维与监控

### 10.1 日常运维命令

| 操作 | 命令 |
|------|------|
| 查看服务状态 | `pm2 status` |
| 查看实时日志 | `pm2 logs grt-system` |
| 重启服务 | `pm2 restart grt-system` |
| 停止服务 | `pm2 stop grt-system` |
| 重载配置 | `pm2 reload grt-system` |
| 查看监控面板 | `pm2 monit` |

### 10.2 日志管理

日志文件位于 `logs/` 目录：

| 文件 | 内容 |
|------|------|
| out.log | 标准输出日志 |
| error.log | 错误日志 |

配置日志轮转：

```powershell
# 安装pm2-logrotate
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 10.3 数据库备份

创建 `scripts/backup-db.ps1`：

```powershell
# scripts/backup-db.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Projects\grt-implementation-plan\backups"
$backupFile = "$backupDir\grt_system_$timestamp.sql"

# 创建备份目录
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# 执行备份
mysqldump -u grt_user -p grt_system > $backupFile

# 压缩备份文件
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

Write-Host "备份完成: $backupFile.zip"
```

### 10.4 定时备份（Windows任务计划）

```powershell
# 创建每日备份任务
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Projects\grt-implementation-plan\scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "GRT-DB-Backup" -Action $action -Trigger $trigger -Description "GRT系统数据库每日备份"
```

### 10.5 健康检查

创建 `scripts/health-check.ps1`：

```powershell
# scripts/health-check.ps1
$url = "http://localhost:3000/api/trpc/system.health"

try {
    $response = Invoke-WebRequest -Uri $url -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 系统运行正常" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 系统响应异常: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 系统无响应: $_" -ForegroundColor Red
    # 可选：自动重启服务
    # pm2 restart grt-system
}
```

---

## 11. 故障排除

### 11.1 常见问题及解决方案

**问题1：pnpm install 失败**

```
症状：安装依赖时报错
解决：
1. 清除缓存：pnpm store prune
2. 删除node_modules：Remove-Item -Recurse node_modules
3. 重新安装：pnpm install
```

**问题2：数据库连接失败**

```
症状：启动时报 "ECONNREFUSED" 或 "Access denied"
解决：
1. 检查MySQL服务是否运行：Get-Service MySQL80
2. 验证连接字符串格式
3. 检查用户权限：SHOW GRANTS FOR 'grt_user'@'localhost';
```

**问题3：端口被占用**

```
症状：启动时报 "EADDRINUSE"
解决：
1. 查找占用进程：netstat -ano | findstr :3000
2. 结束进程：taskkill /PID [进程ID] /F
3. 或修改PORT环境变量使用其他端口
```

**问题4：TypeScript编译错误**

```
症状：pnpm check 报类型错误
解决：
1. 确保TypeScript版本正确：pnpm tsc --version
2. 清除构建缓存：Remove-Item -Recurse dist
3. 重新安装依赖：pnpm install
```

**问题5：内存不足**

```
症状：Node.js报 "JavaScript heap out of memory"
解决：
1. 增加Node.js内存限制：
   $env:NODE_OPTIONS = "--max-old-space-size=4096"
2. 或在PM2配置中设置max_memory_restart
```

### 11.2 日志分析

查看错误日志定位问题：

```powershell
# 查看最近100行错误日志
Get-Content logs/error.log -Tail 100

# 搜索特定错误
Select-String -Path logs/*.log -Pattern "ERROR"

# 实时监控日志
Get-Content logs/out.log -Wait
```

### 11.3 性能调优

| 优化项 | 建议 |
|--------|------|
| Node.js实例数 | 单机建议1-2个实例 |
| MySQL连接池 | 默认10，高并发可增至50 |
| 静态文件缓存 | 启用Nginx缓存，设置30天过期 |
| 日志级别 | 生产环境设置为warn或error |

---

## 附录

### A. 环境变量完整参考

```env
# 核心配置
DATABASE_URL=mysql://user:pass@host:port/database
JWT_SECRET=your_secret_key
NODE_ENV=production
PORT=3000

# 应用配置
VITE_APP_ID=grt-local
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.png

# OAuth配置（可选）
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=admin
OWNER_NAME=管理员

# AI服务（可选）
GEMINI_API_KEY=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# 第三方集成（可选）
JIANDAOYUN_API_KEY=
JIANDAOYUN_CORP_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

### B. 常用命令速查表

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm test` | 运行测试 |
| `pnpm check` | TypeScript类型检查 |
| `pnpm format` | 格式化代码 |
| `pnpm db:push` | 数据库迁移 |
| `pm2 start` | PM2启动服务 |
| `pm2 logs` | 查看日志 |
| `pm2 monit` | 监控面板 |

### C. 项目更新流程

当需要更新到新版本时：

```powershell
# 1. 备份数据库
.\scripts\backup-db.ps1

# 2. 停止服务
pm2 stop grt-system

# 3. 拉取最新代码
git pull origin main

# 4. 安装新依赖
pnpm install

# 5. 运行数据库迁移
pnpm db:push

# 6. 构建新版本
pnpm build

# 7. 运行代码查验
.\scripts\code-review.ps1

# 8. 启动服务
pm2 start grt-system
```

### D. 联系与支持

如遇到本文档未涵盖的问题，请：

1. 查阅项目 `docs/` 目录下的其他文档
2. 检查 `CHANGELOG.md` 了解版本更新内容
3. 提交Issue到项目仓库

---

**文档结束**

*本文档由Manus AI生成，最后更新于2026年1月26日*

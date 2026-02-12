# GRT智能系统 Windows 11 本地服务器部署指南

> **系统版本**: v1.3.72  
> **文档版本**: 1.0  
> **更新日期**: 2026-02-04  
> **作者**: Manus AI

---

## 文档概述

本文档提供GRT智能系统v1.3.72从Manus平台迁移到Windows 11本地服务器的完整部署方案。文档涵盖环境准备、项目部署、数据库配置，以及Manus、Claude Code和ChatGPT三方协作开发环境的配置指南，为后续系统功能迭代和优化提供技术基础。

本指南适用于以下场景：

- 将Manus平台上的系统部署到本地Windows 11服务器
- 建立Manus（规划）+ Claude Code（实现）+ ChatGPT（优化）的协作开发环境
- 实现本地开发与云端同步的双环境架构

---

## 目录

1. [系统架构概述](#1-系统架构概述)
2. [服务器硬件要求](#2-服务器硬件要求)
3. [软件环境准备](#3-软件环境准备)
4. [项目代码获取与部署](#4-项目代码获取与部署)
5. [数据库配置](#5-数据库配置)
6. [环境变量配置](#6-环境变量配置)
7. [项目构建与启动](#7-项目构建与启动)
8. [Manus协作开发配置](#8-manus协作开发配置)
9. [Claude Code集成开发配置](#9-claude-code集成开发配置)
10. [ChatGPT迭代优化配置](#10-chatgpt迭代优化配置)
11. [三方AI协作开发工作流](#11-三方ai协作开发工作流)
12. [运维与监控](#12-运维与监控)
13. [故障排查](#13-故障排查)
14. [附录](#附录)

---

## 1. 系统架构概述

GRT智能系统采用现代化的全栈架构，前后端分离设计，支持灵活的部署方式。v1.3.72版本包含302个数据库表，涵盖CRM、项目管理、成本管理、培训管理、年度规划等核心业务模块。

### 1.1 技术栈组成

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| **前端框架** | React + TypeScript | 19.2.1 | 现代化UI框架，类型安全 |
| **样式方案** | Tailwind CSS | 4.1.14 | 原子化CSS，快速开发 |
| **UI组件库** | shadcn/ui + Radix UI | 最新 | 高质量可定制组件 |
| **后端框架** | Express + tRPC | 4.21.2 / 11.6.0 | 类型安全的API层 |
| **数据库** | MySQL + Drizzle ORM | 8.0+ / 0.44.5 | 关系型数据库，类型安全ORM |
| **构建工具** | Vite + esbuild | 7.1.7 / 0.25.0 | 快速构建，热更新 |
| **包管理器** | pnpm | 10.4.1 | 高效依赖管理 |
| **运行时** | Node.js | 22.x LTS | 长期支持版本 |

### 1.2 v1.3.72 核心功能模块

| 模块 | 功能描述 | 数据库表数量 |
|------|----------|--------------|
| **CRM客户管理** | 客户、联系人、商机、BANT评分、跟进记录 | 15+ |
| **项目管理** | M0-M12阶段门禁、里程碑、任务、甘特图 | 20+ |
| **成本管理** | 预算、实际成本、预警规则、成本分析 | 25+ |
| **培训管理** | 培训计划、参与者、评估、证书 | 15+ |
| **年度规划** | 年度日程、模板、依赖关系、关键路径 | 10+ |
| **资质管理** | OEM/Tier1/Tier2资质、里程碑、提醒 | 8+ |
| **Webhook集成** | 配置、模板、日志、条件触发 | 10+ |
| **AI助手** | 配置、会话、消息、日志 | 15+ |

### 1.3 AI开发协作架构

本系统设计支持多AI协作开发模式，明确分工如下：

| AI工具 | 角色定位 | 主要职责 | 使用场景 |
|--------|----------|----------|----------|
| **Manus** | 任务规划与管理 | 需求分析、任务拆解、进度跟踪、质量检查、文档生成 | 新功能规划、系统架构设计、部署指南编写 |
| **Claude Code** | 代码实现 | 功能开发、代码编写、单元测试、代码审查、Bug修复 | 本地开发环境中的代码实现工作 |
| **ChatGPT** | 迭代优化 | 功能优化、用户体验改进、性能调优、问题诊断 | 现有功能的迭代升级和优化 |
| **Gemini** | 内部判断与分析 | 技术决策支持、代码分析、性能优化建议 | 系统内置AI分析功能 |

---

## 2. 服务器硬件要求

### 2.1 最低配置

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **CPU** | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| **内存** | 16 GB | 32 GB 或更高 |
| **存储** | 100 GB SSD | 256 GB NVMe SSD |
| **网络** | 100 Mbps | 1 Gbps |
| **操作系统** | Windows 11 Home | Windows 11 Pro |

> **注意**：由于项目包含302个数据库表和大量依赖项，建议内存不低于16GB。构建过程中Node.js会使用最高8GB内存（通过`--max_old_space_size=8192`参数配置）。

### 2.2 生产环境推荐配置

对于生产环境部署，建议采用以下配置以确保系统稳定运行：

| 组件 | 推荐配置 | 说明 |
|------|----------|------|
| **CPU** | Intel Core i9 / AMD Ryzen 9 | 多核心，支持高并发 |
| **内存** | 64 GB | 支持大型数据库操作 |
| **存储** | 512 GB NVMe SSD | 高IOPS，快速响应 |
| **网络** | 双网卡冗余 | 网络高可用 |
| **UPS** | 在线式UPS | 电源保护 |

---

## 3. 软件环境准备

### 3.1 必需软件清单

| 软件 | 版本要求 | 下载地址 | 用途 |
|------|----------|----------|------|
| Node.js | 22.x LTS | https://nodejs.org/ | JavaScript运行时 |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/installer/ | 数据库服务 |
| Git | 最新版 | https://git-scm.com/download/win | 版本控制 |
| VS Code | 最新版 | https://code.visualstudio.com/ | 代码编辑器 |
| Windows Terminal | 最新版 | Microsoft Store | 终端工具 |

### 3.2 Node.js 安装

Node.js是系统运行的核心依赖，请按以下步骤安装：

**步骤1：下载安装包**

访问 [Node.js官网](https://nodejs.org/) 下载22.x LTS版本的Windows安装包（.msi格式）。

**步骤2：执行安装**

运行下载的安装程序，按照向导完成安装。建议保持默认安装路径（`C:\Program Files\nodejs\`）。

**步骤3：验证安装**

打开PowerShell或Windows Terminal，执行以下命令验证安装：

```powershell
# 检查Node.js版本
node --version
# 预期输出: v22.x.x

# 检查npm版本
npm --version
# 预期输出: 10.x.x
```

### 3.3 pnpm 安装

pnpm是本项目使用的包管理器，相比npm具有更快的安装速度和更高效的磁盘空间利用。

```powershell
# 全局安装pnpm（指定版本以确保兼容性）
npm install -g pnpm@10.4.1

# 验证安装
pnpm --version
# 预期输出: 10.4.1
```

### 3.4 MySQL 8.0 安装

MySQL是系统的数据存储层，请按以下步骤安装配置：

**步骤1：下载MySQL Installer**

访问 [MySQL下载页面](https://dev.mysql.com/downloads/installer/) 下载MySQL Installer。

**步骤2：选择安装类型**

运行安装程序，选择"Developer Default"安装类型，这将安装MySQL Server、MySQL Workbench等常用组件。

**步骤3：配置MySQL Server**

在配置向导中：
- 选择"Standalone MySQL Server"
- 端口保持默认3306
- 设置root密码（请记录此密码，后续配置需要）
- 配置Windows Service名称为"MySQL80"
- 字符集选择"utf8mb4"

**步骤4：验证安装**

```powershell
# 检查MySQL服务状态
Get-Service MySQL80

# 预期输出:
# Status   Name               DisplayName
# ------   ----               -----------
# Running  MySQL80            MySQL80
```

### 3.5 Git 安装

Git用于版本控制和代码管理：

**步骤1：下载安装**

访问 [Git官网](https://git-scm.com/download/win) 下载Windows版本。

**步骤2：安装配置**

运行安装程序，建议选择以下选项：
- 默认编辑器：选择VS Code
- PATH环境：选择"Git from the command line and also from 3rd-party software"
- 行尾转换：选择"Checkout as-is, commit Unix-style line endings"

**步骤3：配置Git**

```powershell
# 配置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 验证配置
git config --list
```

### 3.6 VS Code 安装与配置

VS Code是推荐的开发编辑器，配合Claude Code和ChatGPT使用效果最佳。

**步骤1：安装VS Code**

访问 [VS Code官网](https://code.visualstudio.com/) 下载并安装。

**步骤2：安装推荐扩展**

打开VS Code，安装以下扩展：

| 扩展名称 | 扩展ID | 用途 |
|----------|--------|------|
| ESLint | dbaeumer.vscode-eslint | 代码检查 |
| Prettier | esbenp.prettier-vscode | 代码格式化 |
| Tailwind CSS IntelliSense | bradlc.vscode-tailwindcss | CSS智能提示 |
| GitLens | eamodio.gitlens | Git增强 |
| Thunder Client | rangav.vscode-thunder-client | API测试 |
| Claude | anthropic.claude-vscode | Claude Code集成 |
| MySQL | cweijan.vscode-mysql-client2 | 数据库管理 |

---

## 4. 项目代码获取与部署

### 4.1 从Manus平台导出代码

**方法一：通过Manus管理界面导出**

1. 登录Manus平台，进入项目管理界面
2. 点击"Code"面板
3. 选择"Download all files"下载完整代码包
4. 将下载的压缩包保存到本地

**方法二：通过GitHub导出**

如果项目已导出到GitHub：

```powershell
# 克隆仓库
git clone https://github.com/your-org/grt-implementation-plan.git D:\Projects\grt-implementation-plan

# 进入项目目录
cd D:\Projects\grt-implementation-plan
```

### 4.2 项目目录结构

解压或克隆后，项目目录结构如下：

```
D:\Projects\grt-implementation-plan\
├── client\                    # 前端源代码
│   ├── public\               # 静态资源
│   └── src\                  # React组件和页面
│       ├── components\       # 可复用组件（200+）
│       ├── pages\           # 页面组件（50+）
│       ├── contexts\        # React上下文
│       ├── hooks\           # 自定义Hooks
│       └── lib\             # 工具库
├── server\                   # 后端源代码
│   ├── _core\               # 核心框架代码
│   ├── services\            # 业务服务层
│   ├── ai\                  # AI服务集成
│   ├── ai-assistants\       # AI助手模块
│   ├── ai-coach\            # AI教练模块
│   └── *.ts                 # tRPC路由文件（30+）
├── drizzle\                  # 数据库相关
│   ├── schema.ts            # 数据库Schema定义（302个表）
│   ├── relations.ts         # 表关系定义
│   └── migrations\          # 迁移文件
├── shared\                   # 前后端共享代码
├── docs\                     # 项目文档
│   ├── deployment\          # 部署文档
│   ├── dev-specs\           # 开发规范
│   └── guides\              # 使用指南
├── scripts\                  # 部署脚本
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript配置
├── vite.config.ts           # Vite配置
└── drizzle.config.ts        # Drizzle ORM配置
```

### 4.3 创建项目目录

```powershell
# 创建项目根目录
mkdir D:\Projects
cd D:\Projects

# 如果是压缩包，解压到此目录
# 使用7-Zip或PowerShell解压
Expand-Archive -Path grt-system-v1.3.72.zip -DestinationPath D:\Projects\grt-implementation-plan
```

---

## 5. 数据库配置

### 5.1 创建数据库和用户

打开MySQL命令行或MySQL Workbench，执行以下SQL语句：

```sql
-- 创建数据库（使用utf8mb4字符集支持中文和emoji）
CREATE DATABASE grt_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（请修改密码为强密码）
CREATE USER 'grt_user'@'localhost' 
IDENTIFIED BY 'YourSecurePassword123!';

-- 授予权限
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;

-- 验证数据库创建
SHOW DATABASES LIKE 'grt_system';
```

### 5.2 数据库连接测试

```powershell
# 测试连接
mysql -u grt_user -p -h localhost grt_system

# 成功连接后，执行简单查询验证
mysql> SELECT 1;
mysql> EXIT;
```

### 5.3 数据库Schema同步

项目使用Drizzle ORM管理数据库结构，通过以下命令同步Schema：

```powershell
cd D:\Projects\grt-implementation-plan

# 设置环境变量（临时）
$env:DATABASE_URL = "mysql://grt_user:YourSecurePassword123!@localhost:3306/grt_system"

# 生成迁移文件并执行迁移
pnpm db:push
```

此命令会：
1. 读取 `drizzle/schema.ts` 中的302个表定义
2. 生成SQL迁移脚本
3. 执行迁移，创建所有数据库表

> **注意**：首次执行可能需要几分钟时间，请耐心等待。如遇内存不足错误，确保系统有足够的可用内存。

### 5.4 验证数据库表创建

```sql
-- 连接数据库后执行
USE grt_system;

-- 查看表数量
SELECT COUNT(*) AS table_count FROM information_schema.tables 
WHERE table_schema = 'grt_system';
-- 预期输出: 302

-- 查看部分核心表
SHOW TABLES LIKE 'customers%';
SHOW TABLES LIKE 'projects%';
SHOW TABLES LIKE 'annual_%';
```

---

## 6. 环境变量配置

### 6.1 创建环境配置文件

```powershell
cd D:\Projects\grt-implementation-plan

# 创建.env文件
New-Item -Path .env -ItemType File

# 使用VS Code编辑
code .env
```

### 6.2 环境变量说明

编辑 `.env` 文件，配置以下关键变量：

```env
# ==========================================
# 数据库配置
# ==========================================
DATABASE_URL=mysql://grt_user:YourSecurePassword123!@localhost:3306/grt_system

# ==========================================
# 应用配置
# ==========================================
NODE_ENV=production
PORT=3000

# JWT密钥（使用下方命令生成）
JWT_SECRET=your-generated-jwt-secret-here

# ==========================================
# 应用信息
# ==========================================
VITE_APP_ID=grt-system-local
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# ==========================================
# OAuth配置（本地开发模式可留空）
# ==========================================
# OAUTH_SERVER_URL=
# VITE_OAUTH_PORTAL_URL=
# OWNER_OPEN_ID=
# OWNER_NAME=

# ==========================================
# AI服务配置
# ==========================================
# Gemini API（用于系统内置AI分析功能）
GEMINI_API_KEY=your-gemini-api-key

# ==========================================
# Microsoft Graph API（日历同步功能）
# ==========================================
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret

# ==========================================
# 简道云API（数据同步功能）
# ==========================================
JIANDAOYUN_API_KEY=your-jiandaoyun-api-key
JIANDAOYUN_CORP_ID=your-corp-id

# ==========================================
# 通知服务配置（可选）
# ==========================================
# 钉钉机器人
# DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx
# DINGTALK_SECRET=your-dingtalk-secret

# 企业微信
# WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx

# ==========================================
# 时区配置
# ==========================================
TZ=Asia/Shanghai
```

### 6.3 生成JWT密钥

```powershell
# 使用Node.js生成安全的JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

将生成的字符串复制到 `.env` 文件的 `JWT_SECRET` 变量中。

### 6.4 环境变量优先级说明

| 变量类型 | 必需性 | 说明 |
|----------|--------|------|
| DATABASE_URL | **必需** | 数据库连接字符串 |
| JWT_SECRET | **必需** | 会话加密密钥 |
| VITE_APP_* | **必需** | 应用基本信息 |
| GEMINI_API_KEY | 推荐 | AI分析功能 |
| MICROSOFT_* | 可选 | 日历同步功能 |
| JIANDAOYUN_* | 可选 | 简道云数据同步 |
| 通知服务 | 可选 | 钉钉/企业微信通知 |

---

## 7. 项目构建与启动

### 7.1 安装项目依赖

```powershell
cd D:\Projects\grt-implementation-plan

# 安装所有依赖（可能需要几分钟）
pnpm install

# 如果遇到问题，尝试清理缓存
pnpm store prune
pnpm install
```

### 7.2 同步数据库结构

```powershell
# 执行数据库迁移
pnpm db:push
```

### 7.3 构建项目

```powershell
# 构建前端和后端
pnpm build
```

构建成功后，会在 `dist/` 目录生成：
- `dist/public/` - 前端静态文件（HTML、CSS、JS）
- `dist/index.js` - 后端编译后的JavaScript文件

### 7.4 开发模式启动

开发模式支持热更新，适合开发调试：

```powershell
# 启动开发服务器
pnpm dev
```

> **注意**：Windows环境下需要修改package.json中的dev脚本，将`NODE_ENV=development`改为使用cross-env或直接设置环境变量。

**Windows兼容的开发启动方式**：

```powershell
# 方法1：使用PowerShell设置环境变量
$env:NODE_ENV = "development"
$env:NODE_OPTIONS = "--max_old_space_size=8192"
npx tsx watch server/_core/index.ts

# 方法2：安装cross-env后修改package.json
pnpm add -D cross-env
# 然后修改package.json中的dev脚本为：
# "dev": "cross-env NODE_ENV=development NODE_OPTIONS=--max_old_space_size=8192 tsx watch server/_core/index.ts"
```

访问 http://localhost:3000 查看系统。

### 7.5 生产模式启动

**方法一：直接启动**

```powershell
# 设置环境变量
$env:NODE_ENV = "production"

# 启动生产服务
node dist/index.js
```

**方法二：使用PM2（推荐）**

PM2是Node.js进程管理器，支持进程守护、自动重启、日志管理等功能。

```powershell
# 全局安装PM2
npm install -g pm2

# 安装Windows服务支持
npm install -g pm2-windows-startup

# 启动应用
pm2 start dist/index.js --name grt-system

# 查看运行状态
pm2 status

# 查看日志
pm2 logs grt-system

# 设置开机自启
pm2-startup install
pm2 save
```

### 7.6 验证部署

```powershell
# 检查服务状态
pm2 status

# 检查端口监听
netstat -an | findstr "3000"

# 测试API响应
Invoke-WebRequest -Uri http://localhost:3000/ -UseBasicParsing
```

打开浏览器访问 http://localhost:3000，确认系统正常运行。

---

## 8. Manus协作开发配置

Manus作为任务规划与管理的核心工具，负责需求分析、任务拆解和质量检查。

### 8.1 Manus与本地环境的协作模式

本地部署后，Manus继续承担以下职责：

| 职责 | 说明 | 交付物 |
|------|------|--------|
| **需求分析** | 分析用户需求，转化为技术规格 | 需求文档、技术规格书 |
| **任务拆解** | 将大功能拆分为可执行的小任务 | 任务清单、todo.md更新 |
| **进度跟踪** | 监控开发进度，更新任务状态 | 进度报告、checkpoint |
| **质量检查** | 审查代码实现，确保符合规范 | 代码审查报告 |
| **文档生成** | 生成部署指南、API文档等 | 技术文档 |

### 8.2 Manus任务同步流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus 任务规划流程                        │
├─────────────────────────────────────────────────────────────┤
│  1. 用户在Manus提出需求                                      │
│     ↓                                                       │
│  2. Manus分析需求，生成任务规格文档                           │
│     ↓                                                       │
│  3. Manus更新todo.md，添加新任务                             │
│     ↓                                                       │
│  4. 用户将任务规格同步到本地（复制文档或GitHub同步）            │
│     ↓                                                       │
│  5. Claude Code在本地实现功能                                │
│     ↓                                                       │
│  6. 用户将代码变更同步回Manus（GitHub或手动上传）              │
│     ↓                                                       │
│  7. Manus验证实现，更新任务状态                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 任务规格文档模板

Manus生成的任务规格文档存放在 `docs/dev-specs/` 目录，格式如下：

```markdown
# 任务名称

## 1. 需求背景
[描述业务需求和目标]

## 2. 技术规格
### 2.1 数据库Schema
[表结构定义]

### 2.2 API接口
[tRPC接口定义]

### 2.3 前端页面
[页面组件和路由]

## 3. 实现步骤
1. [ ] 步骤1
2. [ ] 步骤2
3. [ ] 步骤3

## 4. 测试要求
[单元测试和集成测试要求]

## 5. 验收标准
[功能验收标准]
```

---

## 9. Claude Code集成开发配置

Claude Code是Anthropic提供的AI编程助手，在本地环境中负责代码实现和功能开发。

### 9.1 Claude Code安装

**步骤1：安装VS Code扩展**

在VS Code中搜索并安装"Claude"扩展（扩展ID: anthropic.claude-vscode）。

**步骤2：配置API密钥**

1. 访问 [Anthropic Console](https://console.anthropic.com/) 获取API密钥
2. 在VS Code中，按 `Ctrl+Shift+P` 打开命令面板
3. 输入"Claude: Set API Key"并回车
4. 粘贴API密钥

### 9.2 项目配置文件

在项目根目录创建 `.claude/` 目录和配置文件：

```powershell
mkdir .claude
```

创建 `.claude/settings.json`：

```json
{
  "projectContext": {
    "name": "GRT智能系统",
    "version": "v1.3.72",
    "description": "工业清洗设备企业管理系统",
    "techStack": {
      "frontend": "React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui",
      "backend": "Express + tRPC 11 + Drizzle ORM",
      "database": "MySQL 8.0",
      "runtime": "Node.js 22"
    }
  },
  "codeStyle": {
    "language": "TypeScript",
    "formatting": "Prettier",
    "linting": "ESLint",
    "naming": {
      "components": "PascalCase",
      "functions": "camelCase",
      "constants": "UPPER_SNAKE_CASE",
      "files": "kebab-case"
    }
  },
  "conventions": {
    "apiRoutes": "tRPC procedures in server/routers.ts",
    "components": "shadcn/ui components in client/src/components/ui/",
    "pages": "Page components in client/src/pages/",
    "database": "Drizzle schema in drizzle/schema.ts"
  }
}
```

### 9.3 Claude Code使用规范

| 场景 | 使用方式 | 示例 |
|------|----------|------|
| **新功能开发** | 提供Manus生成的任务规格，让Claude实现 | "根据docs/dev-specs/xxx.md实现该功能" |
| **Bug修复** | 描述问题现象和相关代码位置 | "修复AnnualAgenda.tsx中的graphSyncStatus未定义错误" |
| **代码重构** | 说明重构目标和约束条件 | "将Sidebar组件拆分为更小的子组件" |
| **单元测试** | 指定要测试的模块和覆盖要求 | "为certification.ts路由添加单元测试" |

### 9.4 Claude Code工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                 Claude Code 开发流程                         │
├─────────────────────────────────────────────────────────────┤
│  1. 阅读Manus生成的任务规格文档                               │
│     ↓                                                       │
│  2. 分析现有代码结构和依赖关系                                │
│     ↓                                                       │
│  3. 实现数据库Schema（如需要）                                │
│     ↓                                                       │
│  4. 实现后端API接口                                          │
│     ↓                                                       │
│  5. 实现前端页面和组件                                        │
│     ↓                                                       │
│  6. 编写单元测试                                             │
│     ↓                                                       │
│  7. 运行测试验证功能                                          │
│     ↓                                                       │
│  8. 提交代码，更新todo.md                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. ChatGPT迭代优化配置

ChatGPT负责现有功能的迭代优化、用户体验改进和问题诊断。

### 10.1 ChatGPT使用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| **功能优化** | 改进现有功能的实现方式 | "优化甘特图的渲染性能" |
| **UX改进** | 提升用户体验和交互设计 | "改进侧边栏的滚动体验" |
| **性能调优** | 分析和优化系统性能 | "分析数据库查询性能瓶颈" |
| **问题诊断** | 排查和解决复杂问题 | "诊断内存泄漏问题" |
| **代码审查** | 审查代码质量和最佳实践 | "审查新增的API接口安全性" |

### 10.2 ChatGPT项目上下文

为了让ChatGPT更好地理解项目，建议提供以下上下文信息：

```markdown
## 项目概述
GRT智能系统是一个工业清洗设备企业管理系统，v1.3.72版本包含：
- CRM客户管理
- 项目管理（M0-M12阶段门禁）
- 成本管理
- 培训管理
- 年度规划
- 资质管理
- AI助手集成

## 技术栈
- 前端：React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- 后端：Express + tRPC 11
- 数据库：MySQL 8.0 + Drizzle ORM
- 构建：Vite 7 + esbuild

## 代码规范
- 使用TypeScript严格模式
- 遵循shadcn/ui组件规范
- API使用tRPC类型安全调用
- 数据库操作使用Drizzle ORM
```

### 10.3 ChatGPT优化工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                 ChatGPT 优化流程                             │
├─────────────────────────────────────────────────────────────┤
│  1. 识别需要优化的功能或问题                                  │
│     ↓                                                       │
│  2. 分析现有实现和性能数据                                    │
│     ↓                                                       │
│  3. 提出优化方案和改进建议                                    │
│     ↓                                                       │
│  4. 实现优化代码                                             │
│     ↓                                                       │
│  5. 测试验证优化效果                                          │
│     ↓                                                       │
│  6. 记录优化结果和最佳实践                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 三方AI协作开发工作流

### 11.1 协作分工矩阵

| 任务类型 | Manus | Claude Code | ChatGPT |
|----------|-------|-------------|---------|
| 需求分析 | ✅ 主导 | 参考 | 参考 |
| 任务规划 | ✅ 主导 | 参考 | 参考 |
| 架构设计 | ✅ 主导 | 协助 | 协助 |
| 代码实现 | 审查 | ✅ 主导 | 协助 |
| 单元测试 | 审查 | ✅ 主导 | 协助 |
| 功能优化 | 规划 | 实现 | ✅ 主导 |
| Bug修复 | 追踪 | ✅ 主导 | 诊断 |
| 文档编写 | ✅ 主导 | 协助 | 协助 |
| 代码审查 | ✅ 主导 | 自审 | 协助 |

### 11.2 完整开发流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        三方AI协作开发流程                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                        │
│  │   用户需求   │                                                        │
│  └──────┬──────┘                                                        │
│         ↓                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Manus (规划层)                            │    │
│  │  • 需求分析和任务拆解                                            │    │
│  │  • 生成任务规格文档 (docs/dev-specs/)                            │    │
│  │  • 更新todo.md任务清单                                           │    │
│  │  • 设置验收标准                                                  │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Claude Code (实现层)                         │    │
│  │  • 阅读任务规格文档                                              │    │
│  │  • 实现数据库Schema                                              │    │
│  │  • 实现API接口                                                   │    │
│  │  • 实现前端页面                                                  │    │
│  │  • 编写单元测试                                                  │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      ChatGPT (优化层)                            │    │
│  │  • 代码审查和优化建议                                            │    │
│  │  • 性能优化                                                      │    │
│  │  • UX改进                                                        │    │
│  │  • 问题诊断                                                      │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Manus (验收层)                            │    │
│  │  • 功能验收测试                                                  │    │
│  │  • 更新任务状态                                                  │    │
│  │  • 保存checkpoint                                                │    │
│  │  • 生成发布说明                                                  │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             ↓                                           │
│  ┌─────────────┐                                                        │
│  │   功能交付   │                                                        │
│  └─────────────┘                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 代码同步策略

**方案一：GitHub同步（推荐）**

```powershell
# 1. 在Manus中导出代码到GitHub
# 2. 本地克隆仓库
git clone https://github.com/your-org/grt-implementation-plan.git

# 3. 本地开发后提交
git add .
git commit -m "feat: 实现xxx功能"
git push origin main

# 4. Manus从GitHub拉取更新
```

**方案二：手动同步**

```powershell
# 1. 从Manus下载最新代码包
# 2. 解压到本地项目目录
# 3. 本地开发完成后，打包代码
# 4. 上传到Manus项目
```

### 11.4 版本管理规范

| 版本类型 | 格式 | 说明 | 示例 |
|----------|------|------|------|
| 主版本 | X.0.0 | 重大架构变更 | 2.0.0 |
| 次版本 | 1.X.0 | 新功能模块 | 1.4.0 |
| 补丁版本 | 1.3.X | Bug修复和小改进 | 1.3.72 |

---

## 12. 运维与监控

### 12.1 PM2进程管理

```powershell
# 查看所有进程
pm2 list

# 查看详细状态
pm2 show grt-system

# 查看日志
pm2 logs grt-system

# 重启应用
pm2 restart grt-system

# 停止应用
pm2 stop grt-system

# 删除应用
pm2 delete grt-system
```

### 12.2 日志管理

PM2日志默认存储在 `C:\Users\<用户名>\.pm2\logs\` 目录：

```powershell
# 查看日志文件
dir $env:USERPROFILE\.pm2\logs\

# 清理日志
pm2 flush

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 12.3 数据库备份

```powershell
# 创建备份目录
mkdir D:\Backups\mysql

# 执行备份
mysqldump -u grt_user -p grt_system > D:\Backups\mysql\grt_system_$(Get-Date -Format "yyyyMMdd").sql

# 恢复备份
mysql -u grt_user -p grt_system < D:\Backups\mysql\grt_system_20260204.sql
```

### 12.4 定时任务配置

使用Windows任务计划程序配置定时任务：

```powershell
# 创建每日备份任务
$action = New-ScheduledTaskAction -Execute "mysqldump" -Argument "-u grt_user -pYourPassword grt_system > D:\Backups\mysql\grt_system_%date:~0,4%%date:~5,2%%date:~8,2%.sql"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "GRT-MySQL-Backup" -Action $action -Trigger $trigger
```

---

## 13. 故障排查

### 13.1 常见问题及解决方案

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| pnpm install失败 | 网络问题或依赖冲突 | 使用`pnpm store prune`清理缓存后重试 |
| 数据库连接失败 | 连接字符串错误或MySQL未启动 | 检查DATABASE_URL和MySQL服务状态 |
| 构建内存不足 | Node.js内存限制 | 确保NODE_OPTIONS包含`--max_old_space_size=8192` |
| 端口被占用 | 其他程序占用3000端口 | 使用`netstat -ano | findstr :3000`查找并结束进程 |
| 页面加载空白 | 前端构建失败或路由错误 | 检查浏览器控制台错误信息 |

### 13.2 日志分析

```powershell
# 查看PM2错误日志
pm2 logs grt-system --err --lines 100

# 查看MySQL错误日志
Get-Content "C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err" -Tail 100
```

### 13.3 性能诊断

```powershell
# 查看Node.js进程内存使用
pm2 monit

# 查看MySQL连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# 查看慢查询
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query%';"
```

---

## 附录

### A. 完整环境变量模板

```env
# ==========================================
# GRT智能系统 v1.3.72 环境变量配置
# ==========================================

# 数据库配置（必需）
DATABASE_URL=mysql://grt_user:YourSecurePassword123!@localhost:3306/grt_system

# 应用配置（必需）
NODE_ENV=production
PORT=3000
JWT_SECRET=your-64-character-hex-string-here

# 应用信息（必需）
VITE_APP_ID=grt-system-local
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# AI服务配置（推荐）
GEMINI_API_KEY=your-gemini-api-key

# Microsoft Graph API（可选，日历同步）
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# 简道云API（可选，数据同步）
JIANDAOYUN_API_KEY=
JIANDAOYUN_CORP_ID=

# 通知服务（可选）
DINGTALK_WEBHOOK_URL=
DINGTALK_SECRET=
WECOM_WEBHOOK_URL=

# 时区配置
TZ=Asia/Shanghai
```

### B. 快速部署检查清单

- [ ] Node.js 22.x LTS 已安装
- [ ] pnpm 10.4.1 已安装
- [ ] MySQL 8.0 已安装并运行
- [ ] Git 已安装并配置
- [ ] VS Code 已安装并配置扩展
- [ ] 项目代码已下载/克隆
- [ ] 数据库和用户已创建
- [ ] .env文件已配置
- [ ] 依赖已安装 (pnpm install)
- [ ] 数据库已同步 (pnpm db:push)
- [ ] 项目已构建 (pnpm build)
- [ ] PM2已配置并启动
- [ ] 系统可通过浏览器访问

### C. 相关文档链接

| 文档 | 路径 | 说明 |
|------|------|------|
| 系统架构 | docs/architecture/ | 系统架构设计文档 |
| 开发规范 | docs/dev-specs/ | 功能开发规格文档 |
| API文档 | docs/guides/ | API使用指南 |
| 用户手册 | docs/user-manual/ | 用户操作手册 |
| 更新日志 | CHANGELOG.md | 版本更新记录 |

### D. 技术支持

如遇到部署问题，请按以下优先级寻求帮助：

1. 查阅本文档的故障排查章节
2. 查看项目docs目录下的相关文档
3. 在Manus平台提交问题描述
4. 联系技术支持团队

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-02-04 | Manus AI | 初始版本，基于v1.3.72系统 |

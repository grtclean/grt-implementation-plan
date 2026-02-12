# GRT智能系统 Windows 11 本地服务器部署指南

> **版本**: v2.5.31  
> **文档版本**: 1.0  
> **更新日期**: 2026-01-29  
> **作者**: Manus AI

---

## 文档概述

本文档提供GRT智能系统v2.5.31从Manus平台迁移到Windows 11本地服务器的完整部署方案。文档涵盖环境准备、项目部署、数据库配置，以及Claude Code和ChatGPT集成开发环境的配置指南，为后续系统功能迭代和优化提供技术基础。

---

## 目录

1. [系统架构概述](#1-系统架构概述)
2. [服务器硬件要求](#2-服务器硬件要求)
3. [软件环境准备](#3-软件环境准备)
4. [项目代码获取与部署](#4-项目代码获取与部署)
5. [数据库配置](#5-数据库配置)
6. [环境变量配置](#6-环境变量配置)
7. [项目构建与启动](#7-项目构建与启动)
8. [Claude Code集成开发配置](#8-claude-code集成开发配置)
9. [ChatGPT集成优化配置](#9-chatgpt集成优化配置)
10. [AI协作开发工作流](#10-ai协作开发工作流)
11. [运维与监控](#11-运维与监控)
12. [故障排查](#12-故障排查)
13. [附录](#附录)

---

## 1. 系统架构概述

GRT智能系统采用现代化的全栈架构，前后端分离设计，支持灵活的部署方式。

### 1.1 技术栈组成

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | React 19 + TypeScript | 现代化UI框架，类型安全 |
| **样式方案** | Tailwind CSS 4 | 原子化CSS，快速开发 |
| **UI组件库** | shadcn/ui + Radix UI | 高质量可定制组件 |
| **后端框架** | Express 4 + tRPC 11 | 类型安全的API层 |
| **数据库** | MySQL 8.0 + Drizzle ORM | 关系型数据库，类型安全ORM |
| **构建工具** | Vite 7 + esbuild | 快速构建，热更新 |
| **包管理器** | pnpm 10 | 高效依赖管理 |
| **运行时** | Node.js 22 LTS | 长期支持版本 |

### 1.2 AI开发协作架构

本系统设计支持多AI协作开发模式：

| AI工具 | 角色定位 | 主要职责 |
|--------|----------|----------|
| **Manus** | 任务规划与管理 | 需求分析、任务拆解、进度跟踪、质量检查 |
| **Claude Code** | 代码实现 | 功能开发、代码编写、单元测试、代码审查 |
| **ChatGPT** | 迭代优化 | 功能优化、用户体验改进、文档编写、问题诊断 |
| **Gemini** | 内部判断与分析 | 技术决策支持、代码分析、性能优化建议 |

---

## 2. 服务器硬件要求

### 2.1 最低配置

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **CPU** | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| **内存** | 8 GB | 16 GB 或更高 |
| **存储** | 50 GB SSD | 100 GB NVMe SSD |
| **网络** | 100 Mbps | 1 Gbps |
| **操作系统** | Windows 11 Home | Windows 11 Pro |

### 2.2 生产环境推荐配置

对于生产环境部署，建议采用以下配置以确保系统稳定运行：

| 组件 | 推荐配置 | 说明 |
|------|----------|------|
| **CPU** | Intel Xeon / AMD EPYC | 多核心，支持高并发 |
| **内存** | 32 GB ECC | 错误校正，数据可靠 |
| **存储** | 256 GB NVMe SSD | 高IOPS，快速响应 |
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
# 全局安装pnpm
npm install -g pnpm

# 验证安装
pnpm --version
# 预期输出: 10.x.x
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
| TypeScript Vue Plugin | Vue.volar | Vue/TS支持 |
| Tailwind CSS IntelliSense | bradlc.vscode-tailwindcss | CSS智能提示 |
| GitLens | eamodio.gitlens | Git增强 |
| Thunder Client | rangav.vscode-thunder-client | API测试 |
| Claude | anthropic.claude-vscode | Claude Code集成 |

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
│       ├── components\       # 可复用组件
│       ├── pages\           # 页面组件
│       ├── contexts\        # React上下文
│       ├── hooks\           # 自定义Hooks
│       └── lib\             # 工具库
├── server\                   # 后端源代码
│   ├── _core\               # 核心框架代码
│   ├── services\            # 业务服务层
│   └── *.ts                 # tRPC路由文件
├── drizzle\                  # 数据库相关
│   ├── schema.ts            # 数据库Schema定义
│   ├── relations.ts         # 表关系定义
│   └── migrations\          # 迁移文件
├── shared\                   # 前后端共享代码
├── docs\                     # 项目文档
├── scripts\                  # 部署脚本
├── .env.windows.example     # Windows环境变量模板
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript配置
```

### 4.3 创建项目目录

```powershell
# 创建项目根目录
mkdir D:\Projects
cd D:\Projects

# 如果是压缩包，解压到此目录
# 使用7-Zip或Git Bash解压
tar -xzvf grt-system-v2.5.31.tar.gz
```

---

## 5. 数据库配置

### 5.1 创建数据库和用户

打开MySQL命令行或MySQL Workbench，执行以下SQL语句：

```sql
-- 创建数据库
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

# 生成迁移文件并执行迁移
pnpm db:push
```

此命令会：
1. 读取 `drizzle/schema.ts` 中的表定义
2. 生成SQL迁移脚本
3. 执行迁移，创建所有数据库表

---

## 6. 环境变量配置

### 6.1 创建环境配置文件

```powershell
cd D:\Projects\grt-implementation-plan

# 复制环境变量模板
copy .env.windows.example .env

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
# OAuth配置（本地开发可选）
# ==========================================
# OAUTH_SERVER_URL=
# VITE_OAUTH_PORTAL_URL=

# ==========================================
# AI服务配置
# ==========================================
# Gemini API（用于AI分析功能）
GEMINI_API_KEY=your-gemini-api-key

# OpenAI API（用于ChatGPT集成）
OPENAI_API_KEY=your-openai-api-key

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

---

## 7. 项目构建与启动

### 7.1 安装项目依赖

```powershell
cd D:\Projects\grt-implementation-plan

# 安装所有依赖
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
- 前端静态文件（HTML、CSS、JS）
- 后端编译后的JavaScript文件

### 7.4 开发模式启动

开发模式支持热更新，适合开发调试：

```powershell
# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 查看系统。

### 7.5 生产模式启动

**方法一：直接启动**

```powershell
# 启动生产服务
pnpm start
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
curl http://localhost:3000/api/trpc/health
```

打开浏览器访问 http://localhost:3000，确认系统正常运行。

---

## 8. Claude Code集成开发配置

Claude Code是Anthropic提供的AI编程助手，可直接集成到VS Code中，用于代码实现和功能开发。

### 8.1 Claude Code安装

**步骤1：安装VS Code扩展**

在VS Code中搜索并安装"Claude"扩展（扩展ID: anthropic.claude-vscode）。

**步骤2：配置API密钥**

1. 访问 [Anthropic Console](https://console.anthropic.com/) 获取API密钥
2. 在VS Code中，按 `Ctrl+Shift+P` 打开命令面板
3. 输入"Claude: Set API Key"并回车
4. 粘贴API密钥

### 8.2 项目配置文件

在项目根目录创建 `.claude/` 目录和配置文件：

```powershell
mkdir .claude
```

创建 `.claude/settings.json`：

```json
{
  "projectContext": {
    "name": "GRT智能系统",
    "version": "2.5.31",
    "description": "工业智能管理系统，包含CRM、项目管理、生产管理、能力管理等模块",
    "techStack": {
      "frontend": "React 19 + TypeScript + Tailwind CSS 4",
      "backend": "Express + tRPC 11",
      "database": "MySQL 8.0 + Drizzle ORM",
      "runtime": "Node.js 22"
    }
  },
  "codeStyle": {
    "language": "TypeScript",
    "formatter": "Prettier",
    "linter": "ESLint",
    "testFramework": "Vitest"
  },
  "conventions": {
    "componentNaming": "PascalCase",
    "fileNaming": "kebab-case for files, PascalCase for components",
    "importOrder": ["react", "external", "internal", "relative"]
  }
}
```

### 8.3 Claude Code使用指南

**功能开发流程：**

1. **需求分析**：在Claude对话中描述需求
2. **代码生成**：Claude生成代码片段
3. **代码审查**：检查生成的代码是否符合项目规范
4. **集成测试**：将代码集成到项目中并测试

**常用命令：**

| 命令 | 功能 |
|------|------|
| `/explain` | 解释选中的代码 |
| `/refactor` | 重构选中的代码 |
| `/test` | 为选中的代码生成测试 |
| `/fix` | 修复代码中的问题 |
| `/docs` | 生成代码文档 |

### 8.4 Claude Code最佳实践

在使用Claude Code进行功能开发时，遵循以下最佳实践：

**提供充分的上下文**：在请求代码生成前，提供相关的类型定义、现有代码结构和业务需求说明。

**分步实现复杂功能**：将复杂功能拆分为多个小任务，逐步实现并验证。

**代码审查**：生成的代码需要人工审查，确保符合项目规范和安全要求。

**单元测试**：为生成的代码编写单元测试，确保功能正确性。

---

## 9. ChatGPT集成优化配置

ChatGPT适合用于系统功能的迭代优化、用户体验改进和文档编写。

### 9.1 ChatGPT API配置

**步骤1：获取API密钥**

访问 [OpenAI Platform](https://platform.openai.com/) 创建API密钥。

**步骤2：配置环境变量**

在 `.env` 文件中添加：

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
```

### 9.2 ChatGPT使用场景

| 场景 | 适用任务 | 示例 |
|------|----------|------|
| **功能优化** | 改进现有功能的用户体验 | 优化表单验证逻辑、改进错误提示 |
| **代码审查** | 检查代码质量和潜在问题 | 安全漏洞检测、性能优化建议 |
| **文档编写** | 生成技术文档和用户指南 | API文档、操作手册 |
| **问题诊断** | 分析错误日志和异常 | 调试建议、解决方案 |
| **架构设计** | 讨论系统架构和技术选型 | 模块设计、数据流分析 |

### 9.3 ChatGPT Prompt模板

**功能优化Prompt模板：**

```
你是GRT智能系统的技术顾问。系统使用React 19 + TypeScript + tRPC技术栈。

当前功能：[描述现有功能]
用户反馈：[描述用户遇到的问题或改进建议]

请提供：
1. 问题分析
2. 优化方案（包含代码示例）
3. 实施步骤
4. 测试建议
```

**代码审查Prompt模板：**

```
请审查以下代码，关注：
1. 安全性问题
2. 性能优化空间
3. 代码可读性
4. 最佳实践遵循情况

代码：
[粘贴代码]

技术栈：React 19 + TypeScript + tRPC + Drizzle ORM
```

---

## 10. AI协作开发工作流

### 10.1 工作流概述

GRT智能系统采用Manus-Claude-ChatGPT三方协作的开发模式，各AI工具承担不同职责：

```
┌─────────────────────────────────────────────────────────────┐
│                     开发工作流                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    需求分析    ┌─────────┐    代码实现         │
│  │  用户   │ ──────────────▶│  Manus  │ ──────────────▶     │
│  └─────────┘                └─────────┘                     │
│                                  │                          │
│                                  ▼                          │
│                           ┌─────────────┐                   │
│                           │ Claude Code │                   │
│                           └─────────────┘                   │
│                                  │                          │
│                                  ▼                          │
│                           ┌─────────────┐                   │
│                           │   Manus     │ ◀── 质量检查      │
│                           │  (验证)     │                   │
│                           └─────────────┘                   │
│                                  │                          │
│                    ┌─────────────┼─────────────┐            │
│                    ▼             ▼             ▼            │
│              ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│              │ 通过    │   │ 修复    │   │ ChatGPT │        │
│              │ 下一步  │   │ 重做    │   │ 优化    │        │
│              └─────────┘   └─────────┘   └─────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 结构化开发流程

**阶段1：需求分析（Manus）**

Manus负责接收用户需求，进行任务分解和优先级排序。输出包括：
- 功能需求文档
- 任务拆解清单
- 技术实现方案

**阶段2：代码实现（Claude Code）**

Claude Code根据Manus提供的技术方案进行代码实现。实现过程中：
- 遵循项目代码规范
- 编写单元测试
- 生成代码注释

**阶段3：质量检查（Manus）**

Manus对Claude Code的实现进行检查：
- 功能完整性验证
- 代码规范检查
- 测试覆盖率检查

**阶段4：迭代优化（ChatGPT）**

ChatGPT负责功能的迭代优化：
- 用户体验改进
- 性能优化
- 代码重构建议

### 10.3 Bug修复流程

当发现Bug时，遵循以下流程：

1. **问题记录**：在todo.md中记录Bug详情
2. **问题分析**：使用ChatGPT分析问题根因
3. **修复实现**：使用Claude Code实现修复
4. **验证测试**：Manus验证修复效果
5. **回归测试**：确保修复不引入新问题

### 10.4 版本管理规范

| 版本类型 | 格式 | 说明 |
|----------|------|------|
| 主版本 | X.0.0 | 重大架构变更 |
| 次版本 | X.Y.0 | 新功能添加 |
| 补丁版本 | X.Y.Z | Bug修复和小改进 |

每次功能开发完成后，更新版本号并记录到CHANGELOG.md。

---

## 11. 运维与监控

### 11.1 PM2进程管理

PM2提供完善的进程管理功能：

```powershell
# 查看所有进程
pm2 list

# 查看详细信息
pm2 show grt-system

# 查看实时日志
pm2 logs grt-system --lines 100

# 重启服务
pm2 restart grt-system

# 停止服务
pm2 stop grt-system

# 删除进程
pm2 delete grt-system
```

### 11.2 日志管理

系统日志存储在以下位置：

| 日志类型 | 路径 | 说明 |
|----------|------|------|
| PM2日志 | `C:\Users\<用户>\.pm2\logs\` | 进程输出日志 |
| 应用日志 | `D:\Projects\grt-implementation-plan\logs\` | 应用业务日志 |
| MySQL日志 | `C:\ProgramData\MySQL\MySQL Server 8.0\Data\` | 数据库日志 |

### 11.3 健康检查

创建健康检查脚本 `scripts/health-check.ps1`：

```powershell
# 健康检查脚本
$services = @(
    @{Name="Node.js"; Check={pm2 status grt-system | Select-String "online"}},
    @{Name="MySQL"; Check={Get-Service MySQL80 | Where-Object {$_.Status -eq "Running"}}},
    @{Name="API"; Check={Invoke-WebRequest -Uri "http://localhost:3000/api/trpc/health" -UseBasicParsing}}
)

foreach ($service in $services) {
    try {
        $result = & $service.Check
        if ($result) {
            Write-Host "✓ $($service.Name): OK" -ForegroundColor Green
        } else {
            Write-Host "✗ $($service.Name): FAILED" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $($service.Name): ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

### 11.4 备份策略

**数据库备份：**

```powershell
# 创建备份目录
mkdir D:\Backups\grt-system

# 执行备份
mysqldump -u grt_user -p grt_system > D:\Backups\grt-system\backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

**定时备份（使用Windows任务计划程序）：**

1. 打开"任务计划程序"
2. 创建基本任务
3. 设置触发器（如每天凌晨2点）
4. 操作选择"启动程序"
5. 程序路径填写备份脚本路径

---

## 12. 故障排查

### 12.1 常见问题及解决方案

**问题1：pnpm install失败**

```powershell
# 清理缓存
pnpm store prune

# 删除node_modules重试
Remove-Item -Recurse -Force node_modules
pnpm install
```

**问题2：数据库连接失败**

检查项：
1. MySQL服务是否运行：`Get-Service MySQL80`
2. 用户名密码是否正确
3. DATABASE_URL格式是否正确
4. 防火墙是否阻止3306端口

**问题3：端口被占用**

```powershell
# 查找占用端口的进程
netstat -ano | findstr "3000"

# 结束进程
taskkill /PID <进程ID> /F
```

**问题4：TypeScript编译错误**

```powershell
# 检查TypeScript错误
pnpm check

# 重新安装依赖
Remove-Item -Recurse -Force node_modules
pnpm install
pnpm build
```

**问题5：PM2服务无法启动**

```powershell
# 查看错误日志
pm2 logs grt-system --err --lines 50

# 检查环境变量
pm2 env grt-system

# 重新启动
pm2 delete grt-system
pm2 start dist/index.js --name grt-system
```

### 12.2 日志分析

当系统出现问题时，按以下顺序检查日志：

1. **PM2日志**：`pm2 logs grt-system`
2. **应用日志**：检查 `logs/` 目录
3. **MySQL日志**：检查MySQL错误日志
4. **Windows事件日志**：事件查看器 > Windows日志 > 应用程序

---

## 附录

### A. 环境变量完整列表

| 变量名 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| DATABASE_URL | 是 | 数据库连接字符串 | mysql://user:pass@localhost:3306/db |
| JWT_SECRET | 是 | JWT签名密钥 | 64字符随机字符串 |
| NODE_ENV | 是 | 运行环境 | production |
| PORT | 否 | 服务端口 | 3000 |
| VITE_APP_ID | 是 | 应用ID | grt-system |
| VITE_APP_TITLE | 是 | 应用标题 | GRT智能系统 |
| GEMINI_API_KEY | 否 | Gemini API密钥 | AIza... |
| OPENAI_API_KEY | 否 | OpenAI API密钥 | sk-... |

### B. 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 开发模式启动 |
| `pnpm build` | 构建项目 |
| `pnpm start` | 生产模式启动 |
| `pnpm test` | 运行测试 |
| `pnpm db:push` | 同步数据库Schema |
| `pm2 start` | PM2启动服务 |
| `pm2 status` | 查看服务状态 |
| `pm2 logs` | 查看日志 |
| `pm2 restart` | 重启服务 |

### C. 项目文件说明

| 文件/目录 | 说明 |
|-----------|------|
| `client/` | 前端React代码 |
| `server/` | 后端Express+tRPC代码 |
| `drizzle/` | 数据库Schema和迁移 |
| `shared/` | 前后端共享类型和常量 |
| `docs/` | 项目文档 |
| `scripts/` | 部署和运维脚本 |
| `package.json` | 项目配置和依赖 |
| `.env` | 环境变量（不提交到Git） |

### D. 技术支持联系方式

如遇到无法解决的问题，请通过以下方式获取支持：

1. 查阅项目文档：`docs/` 目录
2. 检查CHANGELOG.md了解版本变更
3. 查看GitHub Issues（如已导出到GitHub）

---

**文档结束**

*本文档由Manus AI生成，版本v2.5.31*

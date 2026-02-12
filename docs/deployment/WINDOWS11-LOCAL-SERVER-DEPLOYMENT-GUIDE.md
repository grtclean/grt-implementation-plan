# GRT智能系统 Windows 11 本地服务器部署方案

> **文档版本**: v1.0  
> **适用系统版本**: v1.3.95+  
> **编写日期**: 2026-02-04  
> **作者**: Manus AI

---

## 文档概述

本文档提供了将GRT智能系统从Manus云平台迁移到Windows 11本地服务器的完整部署方案。文档涵盖环境准备、系统迁移、数据库配置、AI协作开发流程等全部内容，旨在帮助技术团队顺利完成系统迁移并建立可持续的本地开发运维体系。

---

## 第一部分：系统架构概述

### 1.1 技术栈说明

GRT智能系统采用现代化的全栈JavaScript/TypeScript技术栈，前后端分离架构，具备良好的可移植性和扩展性。

| 层级 | 技术选型 | 版本要求 | 说明 |
|------|----------|----------|------|
| 前端框架 | React | 19.x | 用户界面渲染 |
| UI组件库 | shadcn/ui + Radix | 最新版 | 企业级UI组件 |
| 样式方案 | Tailwind CSS | 4.x | 原子化CSS框架 |
| 后端框架 | Express + tRPC | 4.x / 11.x | API服务层 |
| 数据库ORM | Drizzle ORM | 0.44+ | 类型安全的数据库操作 |
| 数据库 | MySQL/TiDB | 8.0+ | 关系型数据存储 |
| 运行时 | Node.js | 22.x LTS | JavaScript运行环境 |
| 包管理器 | pnpm | 10.x | 高效的依赖管理 |
| 构建工具 | Vite | 7.x | 前端构建打包 |

### 1.2 系统模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRT智能系统架构                           │
├─────────────────────────────────────────────────────────────────┤
│  前端层 (client/)                                                │
│  ├── React 19 + TypeScript                                      │
│  ├── shadcn/ui 组件库                                           │
│  ├── tRPC Client (类型安全API调用)                              │
│  └── Tailwind CSS 4 样式                                        │
├─────────────────────────────────────────────────────────────────┤
│  后端层 (server/)                                                │
│  ├── Express 4 HTTP服务器                                       │
│  ├── tRPC Server (API路由)                                      │
│  ├── Drizzle ORM (数据库操作)                                   │
│  └── 业务服务模块                                               │
├─────────────────────────────────────────────────────────────────┤
│  数据层 (drizzle/)                                               │
│  ├── MySQL 8.0 数据库                                           │
│  ├── 100+ 数据表                                                │
│  └── Drizzle Schema 定义                                        │
├─────────────────────────────────────────────────────────────────┤
│  AI集成层                                                        │
│  ├── Gemini API (智能问答)                                      │
│  ├── 简道云 API (数据同步)                                      │
│  └── Webhook 集成                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 目录结构说明

```
grt-implementation-plan/
├── client/                    # 前端源代码
│   ├── src/
│   │   ├── components/        # 可复用UI组件
│   │   ├── pages/             # 页面组件
│   │   ├── contexts/          # React上下文
│   │   ├── hooks/             # 自定义Hooks
│   │   ├── lib/               # 工具库
│   │   └── config/            # 配置文件
│   └── public/                # 静态资源
├── server/                    # 后端源代码
│   ├── _core/                 # 核心框架代码
│   ├── services/              # 业务服务
│   ├── routers.ts             # tRPC路由定义
│   └── db.ts                  # 数据库操作
├── drizzle/                   # 数据库Schema
│   ├── schema.ts              # 表结构定义
│   ├── relations.ts           # 表关系定义
│   └── migrations/            # 迁移文件
├── shared/                    # 前后端共享代码
├── docs/                      # 项目文档
├── scripts/                   # 部署脚本
└── package.json               # 项目配置
```

---

## 第二部分：Windows 11 环境准备

### 2.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 | 说明 |
|--------|----------|----------|------|
| CPU | 4核 | 8核+ | Intel i5/AMD Ryzen 5 或更高 |
| 内存 | 8GB | 16GB+ | 构建过程需要较大内存 |
| 存储 | 100GB SSD | 256GB SSD | 建议使用NVMe SSD |
| 网络 | 100Mbps | 1Gbps | 用于API调用和数据同步 |

### 2.2 软件安装清单

#### 2.2.1 Node.js 22.x LTS

Node.js是系统运行的核心环境，必须安装22.x LTS版本以确保兼容性。

**安装步骤：**

1. 访问 [Node.js官网](https://nodejs.org/) 下载Windows安装包（.msi格式）
2. 运行安装程序，选择默认安装选项
3. 安装完成后，打开PowerShell验证安装：

```powershell
# 验证Node.js版本
node --version
# 预期输出: v22.x.x

# 验证npm版本
npm --version
# 预期输出: 10.x.x
```

#### 2.2.2 pnpm 包管理器

pnpm是项目指定的包管理器，相比npm具有更快的安装速度和更高效的磁盘空间利用。

```powershell
# 全局安装pnpm
npm install -g pnpm

# 验证安装
pnpm --version
# 预期输出: 10.x.x
```

#### 2.2.3 MySQL 8.0 数据库

MySQL是系统的数据存储层，建议安装8.0或更高版本。

**安装步骤：**

1. 访问 [MySQL官网](https://dev.mysql.com/downloads/installer/) 下载MySQL Installer
2. 选择"Custom"安装类型，安装以下组件：
   - MySQL Server 8.0
   - MySQL Workbench（可选，图形化管理工具）
   - MySQL Shell（可选）
3. 配置MySQL Server：
   - 选择"Development Computer"配置类型
   - 设置root密码（请记录此密码）
   - 配置为Windows服务，开机自启动
4. 完成安装后验证：

```powershell
# 检查MySQL服务状态
Get-Service MySQL*

# 登录MySQL验证
mysql -u root -p
# 输入密码后应进入MySQL命令行
```

#### 2.2.4 Git 版本控制

Git用于代码版本管理和从Manus平台导出代码。

1. 访问 [Git官网](https://git-scm.com/download/win) 下载安装包
2. 安装时选择默认选项，建议勾选"Git Bash Here"
3. 验证安装：

```powershell
git --version
# 预期输出: git version 2.x.x
```

#### 2.2.5 Visual Studio Code（推荐）

VS Code是推荐的代码编辑器，配合Claude Code插件可实现AI辅助开发。

1. 访问 [VS Code官网](https://code.visualstudio.com/) 下载安装
2. 安装推荐扩展：
   - ESLint
   - Prettier
   - TypeScript Vue Plugin
   - Tailwind CSS IntelliSense
   - Claude Code（AI编程助手）

### 2.3 环境变量配置

建议将以下路径添加到系统PATH环境变量：

```
C:\Program Files\nodejs\
C:\Program Files\MySQL\MySQL Server 8.0\bin\
C:\Program Files\Git\cmd\
```

---

## 第三部分：从Manus平台导出系统

### 3.1 代码导出方式

Manus平台提供两种代码导出方式，根据实际情况选择：

#### 方式一：通过GitHub导出（推荐）

1. 在Manus项目管理界面，点击"Settings" → "GitHub"
2. 连接GitHub账号并授权
3. 选择目标仓库或创建新仓库
4. 点击"Export to GitHub"完成导出
5. 在本地克隆仓库：

```powershell
# 创建项目目录
mkdir D:\Projects
cd D:\Projects

# 克隆代码
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

#### 方式二：下载代码包

1. 在Manus项目管理界面，点击"Code"面板
2. 点击"Download All Files"下载完整代码包
3. 解压到本地目录：

```powershell
# 创建项目目录
mkdir D:\Projects\grt-implementation-plan
cd D:\Projects

# 解压代码包（使用7-Zip或Git Bash）
tar -xzvf grt-system-code.tar.gz -C grt-implementation-plan
```

### 3.2 数据库导出

#### 3.2.1 获取数据库连接信息

在Manus项目管理界面：
1. 点击"Database"面板
2. 点击左下角设置图标
3. 记录以下信息：
   - Host（主机地址）
   - Port（端口）
   - Database（数据库名）
   - Username（用户名）
   - Password（密码）

#### 3.2.2 导出数据库

使用MySQL Workbench或命令行导出数据：

```powershell
# 使用mysqldump导出（在Git Bash中执行）
mysqldump -h <manus-db-host> -P <port> -u <username> -p <database> > grt_backup.sql

# 或使用MySQL Workbench
# 1. 连接到Manus数据库
# 2. Server → Data Export
# 3. 选择所有表，导出为SQL文件
```

---

## 第四部分：本地数据库配置

### 4.1 创建本地数据库

```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE grt_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（生产环境建议）
CREATE USER 'grt_user'@'localhost' 
IDENTIFIED BY 'YourSecurePassword@2026';

-- 授权
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
EXIT;
```

### 4.2 导入数据（可选）

如果需要迁移现有数据：

```powershell
# 导入数据库备份
mysql -u grt_user -p grt_system < grt_backup.sql
```

### 4.3 使用Drizzle同步Schema

项目使用Drizzle ORM管理数据库结构，推荐使用Schema同步方式：

```powershell
cd D:\Projects\grt-implementation-plan

# 安装依赖
pnpm install

# 同步数据库结构
pnpm db:push
```

---

## 第五部分：环境变量配置

### 5.1 创建环境配置文件

在项目根目录创建 `.env` 文件：

```powershell
cd D:\Projects\grt-implementation-plan
notepad .env
```

### 5.2 环境变量说明

```env
# ============================================
# 数据库配置（必需）
# ============================================
DATABASE_URL=mysql://grt_user:YourSecurePassword@2026@localhost:3306/grt_system

# ============================================
# 安全配置（必需）
# ============================================
# JWT密钥 - 用于用户会话签名，必须使用强随机字符串
# 生成方式: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-at-least-64-characters-long-here

# ============================================
# 应用配置（必需）
# ============================================
NODE_ENV=production
PORT=3000
VITE_APP_TITLE=GRT智能系统
VITE_APP_ID=grt-local

# ============================================
# OAuth配置（本地开发可选）
# ============================================
# 如果使用Manus OAuth认证，配置以下变量
# OAUTH_SERVER_URL=https://api.manus.im
# VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# ============================================
# AI服务配置（可选）
# ============================================
# Gemini API - 用于AI问答功能
GEMINI_API_KEY=your-gemini-api-key

# ============================================
# 简道云集成（可选）
# ============================================
JIANDAOYUN_API_KEY=your-jiandaoyun-api-key
JIANDAOYUN_CORP_ID=your-corp-id

# ============================================
# 邮件服务配置（可选）
# ============================================
# SMTP配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_SECURE=false
EMAIL_FROM_NAME=GRT智能系统
EMAIL_FROM_ADDRESS=noreply@grt.com

# 或使用SendGrid
# SENDGRID_API_KEY=your-sendgrid-api-key

# ============================================
# 可选配置
# ============================================
# Redis缓存
# REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=info
```

### 5.3 生成JWT密钥

```powershell
# 使用Node.js生成安全的随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的64位十六进制字符串填入 `JWT_SECRET`。

---

## 第六部分：安装依赖与构建

### 6.1 安装项目依赖

```powershell
cd D:\Projects\grt-implementation-plan

# 安装所有依赖
pnpm install

# 如果遇到问题，尝试清理缓存
pnpm store prune
pnpm install
```

### 6.2 同步数据库结构

```powershell
# 生成并执行数据库迁移
pnpm db:push
```

此命令会根据 `drizzle/schema.ts` 中的定义自动创建或更新数据库表结构。

### 6.3 构建生产版本

```powershell
# 构建前端和后端
pnpm build

# 验证构建结果
dir dist
# 应看到 index.js 和其他构建产物
```

### 6.4 运行测试（可选）

```powershell
# 运行单元测试
pnpm test
```

---

## 第七部分：启动与运行

### 7.1 开发模式

开发模式支持热重载，适合开发调试：

```powershell
pnpm dev
```

访问 http://localhost:3000 查看系统。

### 7.2 生产模式

#### 7.2.1 直接启动

```powershell
pnpm start
# 或
node dist/index.js
```

#### 7.2.2 使用PM2进程管理（推荐）

PM2提供进程守护、自动重启、日志管理等功能：

```powershell
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name grt-system

# 查看状态
pm2 status

# 查看日志
pm2 logs grt-system

# 设置开机自启（需要管理员权限）
pm2 startup
pm2 save
```

#### 7.2.3 PM2配置文件

创建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '2G',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
  }]
};
```

使用配置文件启动：

```powershell
pm2 start ecosystem.config.cjs
```

### 7.3 验证安装

```powershell
# 检查服务状态
pm2 status

# 检查端口监听
netstat -an | findstr "3000"

# 访问健康检查接口
curl http://localhost:3000/api/health
```

---

## 第八部分：AI协作开发流程

本部分定义了在Windows 11本地服务器上进行系统开发时，Manus、ChatGPT、Gemini和Claude Code的协作分工和工作流程。

### 8.1 AI工具角色定义

| AI工具 | 主要职责 | 使用场景 |
|--------|----------|----------|
| **Manus** | 任务规划、整体协调、需求验证 | 新功能规划、架构设计、质量验收 |
| **Claude Code** | 代码实现、功能开发 | 编写新功能、修复Bug、代码重构 |
| **ChatGPT** | 功能迭代、系统优化 | 性能优化、代码审查、方案讨论 |
| **Gemini** | 智能问答、内部判断 | 系统内置AI功能、数据分析 |

### 8.2 开发工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI协作开发工作流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    需求规划     ┌─────────┐                       │
│  │  用户   │ ───────────────→│  Manus  │                       │
│  └─────────┘                 └────┬────┘                       │
│                                   │                             │
│                          任务分解和设计                          │
│                                   │                             │
│                                   ▼                             │
│                         ┌─────────────────┐                    │
│                         │   Claude Code   │                    │
│                         │   (代码实现)     │                    │
│                         └────────┬────────┘                    │
│                                  │                              │
│                            代码实现                              │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────┐    验证检查     ┌─────────┐                       │
│  │  Manus  │ ←───────────────│  代码   │                       │
│  └────┬────┘                 └─────────┘                       │
│       │                                                         │
│       │ 通过？                                                  │
│       │                                                         │
│  ┌────┴────┐                                                   │
│  │   是    │──────────────────────────────────→ 完成           │
│  └─────────┘                                                   │
│       │                                                         │
│       │ 否                                                      │
│       ▼                                                         │
│  ┌─────────────────┐                                           │
│  │    ChatGPT      │                                           │
│  │  (优化建议)      │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           │ 优化方案                                            │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │   Claude Code   │ ←──────── 重新实现                        │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Manus协作开发流程

#### 8.3.1 新功能开发流程

当需要添加新功能时，按以下流程与Manus协作：

1. **需求提交**：向Manus描述功能需求
2. **任务规划**：Manus分析需求，制定开发计划
3. **代码实现**：Manus指导Claude Code实现功能
4. **验证检查**：Manus验证实现是否符合需求
5. **迭代优化**：如有问题，循环修复直到通过

#### 8.3.2 与Manus同步代码

```powershell
# 1. 提交本地修改到Git
git add .
git commit -m "feat: 添加新功能描述"
git push origin main

# 2. 在Manus平台同步代码
# 通过GitHub集成自动同步，或手动上传代码包
```

#### 8.3.3 从Manus获取更新

```powershell
# 从GitHub拉取Manus的更新
git pull origin main

# 重新安装依赖（如有更新）
pnpm install

# 同步数据库结构（如有更新）
pnpm db:push

# 重新构建
pnpm build

# 重启服务
pm2 restart grt-system
```

### 8.4 Claude Code本地开发

#### 8.4.1 VS Code配置

1. 安装Claude Code扩展
2. 配置API密钥
3. 在VS Code中打开项目：

```powershell
code D:\Projects\grt-implementation-plan
```

#### 8.4.2 开发规范

使用Claude Code开发时，遵循以下规范：

```typescript
// 1. 文件命名：使用kebab-case
// 例：user-management.service.ts

// 2. 组件命名：使用PascalCase
// 例：UserManagement.tsx

// 3. 函数命名：使用camelCase
// 例：getUserById()

// 4. 常量命名：使用UPPER_SNAKE_CASE
// 例：MAX_RETRY_COUNT

// 5. 类型定义：使用PascalCase
// 例：interface UserProfile {}
```

### 8.5 ChatGPT优化流程

ChatGPT主要用于系统功能的迭代优化，使用场景包括：

1. **代码审查**：提交代码片段请求审查建议
2. **性能优化**：分析性能瓶颈，获取优化方案
3. **架构讨论**：讨论系统架构改进方案
4. **问题排查**：分析错误日志，获取解决方案

#### 8.5.1 ChatGPT提示词模板

```
# 代码审查请求
请审查以下代码，关注：
1. 代码质量和可读性
2. 潜在的性能问题
3. 安全漏洞
4. 最佳实践建议

代码：
[粘贴代码]

# 性能优化请求
系统出现以下性能问题：
[描述问题]

相关代码：
[粘贴代码]

请分析原因并提供优化方案。
```

### 8.6 Gemini集成

Gemini API已集成到系统中，用于：

1. **AI问答功能**：系统内置的智能助手
2. **数据分析**：智能数据分析和报表生成
3. **内容生成**：自动生成报告、摘要等

配置Gemini API：

```env
GEMINI_API_KEY=your-gemini-api-key
```

---

## 第九部分：测试/生产环境管理

### 9.1 环境分离策略

建议建立测试（Staging）和生产（Production）两套环境：

| 环境 | 用途 | 数据库 | 端口 |
|------|------|--------|------|
| 测试环境 | 功能测试、验收 | grt_system_test | 3001 |
| 生产环境 | 正式运行 | grt_system | 3000 |

### 9.2 测试环境配置

```powershell
# 创建测试环境目录
mkdir D:\Projects\grt-test
cd D:\Projects\grt-test

# 复制代码
xcopy /E /I D:\Projects\grt-implementation-plan\* .

# 创建测试环境配置
notepad .env.test
```

测试环境 `.env.test`：

```env
DATABASE_URL=mysql://grt_user:password@localhost:3306/grt_system_test
NODE_ENV=development
PORT=3001
```

### 9.3 变更管理流程

所有系统变更必须遵循以下流程：

```
1. 提交变更请求
   ↓
2. 管理员审批
   ↓
3. 在测试环境实施
   ↓
4. 测试验证
   ↓
5. 审批通过后部署到生产环境
   ↓
6. 生产环境验证
```

---

## 第十部分：运维管理

### 10.1 日常运维命令

```powershell
# 查看服务状态
pm2 status

# 查看日志
pm2 logs grt-system

# 重启服务
pm2 restart grt-system

# 停止服务
pm2 stop grt-system

# 查看资源使用
pm2 monit
```

### 10.2 数据库备份

```powershell
# 创建备份目录
mkdir D:\Backups\grt

# 执行备份
mysqldump -u grt_user -p grt_system > D:\Backups\grt\backup_%date:~0,4%%date:~5,2%%date:~8,2%.sql

# 压缩备份
# 使用7-Zip压缩备份文件
```

### 10.3 日志管理

```powershell
# 查看应用日志
type logs\out.log

# 查看错误日志
type logs\error.log

# 清理旧日志
pm2 flush
```

### 10.4 性能监控

```powershell
# 查看Node.js进程资源使用
pm2 monit

# 查看系统资源
taskmgr

# 查看MySQL状态
mysql -u root -p -e "SHOW STATUS LIKE 'Threads%';"
```

---

## 第十一部分：常见问题排查

### 11.1 安装问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| pnpm install失败 | 网络问题或缓存损坏 | `pnpm store prune && pnpm install` |
| node-gyp编译错误 | 缺少构建工具 | 安装Visual Studio Build Tools |
| 内存不足 | 构建需要大量内存 | 增加Node.js内存限制 |

### 11.2 运行问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 端口被占用 | 其他程序占用3000端口 | `netstat -ano \| findstr "3000"` 找到并结束进程 |
| 数据库连接失败 | 配置错误或服务未启动 | 检查DATABASE_URL和MySQL服务状态 |
| 页面白屏 | 前端构建失败 | 重新执行 `pnpm build` |

### 11.3 数据库问题

```powershell
# 检查MySQL服务
Get-Service MySQL*

# 重启MySQL服务
Restart-Service MySQL80

# 检查数据库连接
mysql -u grt_user -p -e "SELECT 1;"
```

---

## 第十二部分：安全建议

### 12.1 安全检查清单

- [ ] 使用强密码（数据库、JWT密钥）
- [ ] 定期更新依赖包
- [ ] 启用Windows防火墙
- [ ] 限制数据库远程访问
- [ ] 定期备份数据
- [ ] 监控异常访问日志

### 12.2 防火墙配置

```powershell
# 允许3000端口（仅本地访问）
netsh advfirewall firewall add rule name="GRT System" dir=in action=allow protocol=tcp localport=3000 remoteip=localsubnet
```

### 12.3 数据库安全

```sql
-- 限制root远程访问
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
FLUSH PRIVILEGES;

-- 定期更换密码
ALTER USER 'grt_user'@'localhost' IDENTIFIED BY 'NewSecurePassword@2026';
```

---

## 附录A：快速命令参考

```powershell
# 开发命令
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm test             # 运行测试
pnpm db:push          # 同步数据库结构

# PM2命令
pm2 start             # 启动服务
pm2 stop              # 停止服务
pm2 restart           # 重启服务
pm2 logs              # 查看日志
pm2 status            # 查看状态
pm2 monit             # 资源监控

# Git命令
git pull              # 拉取更新
git push              # 推送代码
git status            # 查看状态
```

---

## 附录B：环境变量完整列表

| 变量名 | 必需 | 说明 |
|--------|------|------|
| DATABASE_URL | 是 | 数据库连接字符串 |
| JWT_SECRET | 是 | JWT签名密钥 |
| NODE_ENV | 是 | 运行环境 |
| PORT | 否 | 服务端口，默认3000 |
| VITE_APP_TITLE | 否 | 应用标题 |
| GEMINI_API_KEY | 否 | Gemini API密钥 |
| JIANDAOYUN_API_KEY | 否 | 简道云API密钥 |
| SMTP_HOST | 否 | 邮件服务器地址 |
| REDIS_URL | 否 | Redis连接地址 |

---

## 附录C：联系支持

如遇到部署问题，可通过以下方式获取帮助：

1. 查看项目文档：`docs/` 目录
2. 查看日志文件：`logs/` 目录
3. 使用Manus平台反馈功能

---

**文档结束**

*本文档由Manus AI自动生成，如有更新请及时同步。*

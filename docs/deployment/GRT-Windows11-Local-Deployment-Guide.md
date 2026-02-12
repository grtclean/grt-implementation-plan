# GRT智能系统 Windows 11 本地服务器部署指南

**版本**: v1.0.0  
**更新日期**: 2026年1月25日  
**作者**: Manus AI  
**适用版本**: GRT System v4.4.0 Build

---

## 目录

1. [概述](#1-概述)
2. [系统要求](#2-系统要求)
3. [环境准备](#3-环境准备)
4. [项目部署](#4-项目部署)
5. [数据库配置](#5-数据库配置)
6. [环境变量配置](#6-环境变量配置)
7. [启动与验证](#7-启动与验证)
8. [Claude Code代码查验流程](#8-claude-code代码查验流程)
9. [生产环境部署](#9-生产环境部署)
10. [故障排除](#10-故障排除)
11. [附录](#11-附录)

---

## 1. 概述

本指南详细说明如何将GRT智能系统从Manus云服务器迁移至Windows 11本地服务器进行部署。GRT智能系统是一套完整的企业级业务管理平台，包含CRM客户管理、项目全生命周期管理、成本控制、AI智能助手等核心模块。

### 1.1 部署架构

本地部署采用以下技术栈：

| 组件 | 技术选型 | 版本要求 |
|------|----------|----------|
| 运行时 | Node.js | v22.x LTS |
| 包管理器 | pnpm | v10.4.1+ |
| 数据库 | MySQL | v8.0+ |
| 缓存 | Redis | v7.0+ (可选) |
| 前端框架 | React | v19.2.1 |
| 后端框架 | Express + tRPC | v4.21 / v11.6 |
| ORM | Drizzle ORM | v0.44.5 |
| 构建工具 | Vite | v7.1.7 |

### 1.2 部署模式

本指南支持两种部署模式：

**开发模式**: 适用于本地开发和调试，支持热重载和实时代码更新。

**生产模式**: 适用于正式环境部署，代码经过编译优化，性能更佳。

---

## 2. 系统要求

### 2.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核心 | 8核心及以上 |
| 内存 | 8GB | 16GB及以上 |
| 硬盘 | 50GB SSD | 100GB NVMe SSD |
| 网络 | 100Mbps | 1Gbps |

### 2.2 软件要求

| 软件 | 版本 | 用途 |
|------|------|------|
| Windows 11 | 22H2+ | 操作系统 |
| Node.js | v22.13.0+ | JavaScript运行时 |
| pnpm | v10.4.1+ | 包管理器 |
| MySQL | v8.0+ | 关系型数据库 |
| Git | v2.40+ | 版本控制 |
| Visual Studio Code | 最新版 | 代码编辑器 |
| Claude Code | 最新版 | AI代码助手 |

---

## 3. 环境准备

### 3.1 安装Node.js

**步骤1**: 下载Node.js安装包

访问 [Node.js官网](https://nodejs.org/) 下载Windows安装包（推荐LTS版本v22.x）。

**步骤2**: 运行安装程序

双击下载的`.msi`文件，按照安装向导完成安装。确保勾选"Add to PATH"选项。

**步骤3**: 验证安装

打开PowerShell或命令提示符，执行以下命令：

```powershell
node --version
# 预期输出: v22.13.0 或更高版本

npm --version
# 预期输出: 10.x.x
```

### 3.2 安装pnpm

pnpm是高性能的Node.js包管理器，GRT系统指定使用pnpm进行依赖管理。

```powershell
# 使用npm全局安装pnpm
npm install -g pnpm@10.4.1

# 验证安装
pnpm --version
# 预期输出: 10.4.1
```

### 3.3 安装MySQL数据库

**方式一: 独立安装MySQL Server**

1. 访问 [MySQL官网](https://dev.mysql.com/downloads/mysql/) 下载MySQL Community Server
2. 运行安装程序，选择"Developer Default"或"Server only"
3. 配置root密码并创建数据库用户
4. 确保MySQL服务已启动

**方式二: 使用Docker Desktop (推荐)**

1. 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 启用WSL 2后端
3. 使用以下命令启动MySQL容器：

```powershell
docker run -d `
  --name grt-mysql `
  -e MYSQL_ROOT_PASSWORD=your_root_password `
  -e MYSQL_DATABASE=grt_db `
  -e MYSQL_USER=grt_user `
  -e MYSQL_PASSWORD=your_password `
  -p 3306:3306 `
  mysql:8.0
```

### 3.4 安装Git

1. 访问 [Git官网](https://git-scm.com/download/win) 下载Windows安装包
2. 运行安装程序，使用默认配置
3. 验证安装：

```powershell
git --version
# 预期输出: git version 2.40.x 或更高
```

### 3.5 安装Visual Studio Code

1. 访问 [VS Code官网](https://code.visualstudio.com/) 下载安装包
2. 安装推荐扩展：
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - Tailwind CSS IntelliSense
   - MySQL (by Weijan Chen)

### 3.6 安装Claude Code

Claude Code是Anthropic提供的AI编程助手，用于代码查验和开发辅助。

1. 访问 [Claude Code官网](https://claude.ai/code) 或通过VS Code扩展市场安装
2. 使用Anthropic账户登录
3. 配置API密钥（如需要）

---

## 4. 项目部署

### 4.1 获取项目代码

**方式一: 从Manus导出**

1. 在Manus管理界面中，进入项目设置
2. 点击"导出到GitHub"或"下载代码"
3. 将代码包解压到本地目录

**方式二: 从Git仓库克隆**

```powershell
# 创建项目目录
mkdir D:\Projects\GRT
cd D:\Projects\GRT

# 克隆项目（替换为实际仓库地址）
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

### 4.2 项目目录结构

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── public/            # 静态资源
│   └── src/               # React源代码
│       ├── components/    # UI组件
│       ├── pages/         # 页面组件
│       ├── contexts/      # React上下文
│       ├── hooks/         # 自定义Hooks
│       └── lib/           # 工具库
├── server/                 # 后端代码
│   ├── _core/             # 核心框架
│   ├── services/          # 业务服务
│   ├── routers.ts         # tRPC路由
│   └── db.ts              # 数据库连接
├── drizzle/               # 数据库Schema
│   ├── schema.ts          # 表结构定义
│   └── migrations/        # 迁移文件
├── shared/                # 前后端共享代码
├── docker/                # Docker配置
├── docs/                  # 项目文档
├── package.json           # 项目配置
└── .env                   # 环境变量（需创建）
```

### 4.3 安装项目依赖

```powershell
# 进入项目目录
cd D:\Projects\GRT\grt-implementation-plan

# 安装依赖
pnpm install

# 如果遇到权限问题，以管理员身份运行PowerShell
```

依赖安装完成后，`node_modules`目录将包含所有必需的包。

---

## 5. 数据库配置

### 5.1 创建数据库

连接到MySQL服务器并创建数据库：

```sql
-- 创建数据库
CREATE DATABASE grt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授予权限
GRANT ALL PRIVILEGES ON grt_db.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5.2 配置数据库连接

数据库连接字符串格式：

```
mysql://用户名:密码@主机:端口/数据库名
```

示例：

```
mysql://grt_user:your_secure_password@localhost:3306/grt_db
```

### 5.3 执行数据库迁移

```powershell
# 设置数据库连接环境变量
$env:DATABASE_URL = "mysql://grt_user:your_password@localhost:3306/grt_db"

# 生成并执行迁移
pnpm db:push
```

此命令将自动创建所有必需的数据库表，包括：

| 表名 | 用途 |
|------|------|
| users | 用户账户 |
| leads | 商机管理 |
| customers | 客户信息 |
| projects | 项目管理 |
| cost_records | 成本记录 |
| report_templates | 报表模板 |
| import_history | 导入历史 |
| task_execution_logs | 任务执行日志 |
| alert_rules | 告警规则 |
| ... | 更多业务表 |

---

## 6. 环境变量配置

### 6.1 创建环境变量文件

在项目根目录创建`.env`文件：

```powershell
# 使用VS Code创建
code .env
```

### 6.2 环境变量配置模板

```env
# ============================================
# GRT智能系统 本地部署环境配置
# ============================================

# 运行环境
NODE_ENV=development

# 数据库配置
DATABASE_URL=mysql://grt_user:your_password@localhost:3306/grt_db

# JWT密钥（生产环境请使用强随机字符串）
JWT_SECRET=your_jwt_secret_key_here_at_least_32_characters

# 应用配置
VITE_APP_ID=grt-local
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# OAuth配置（本地开发可留空）
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=

# 所有者信息
OWNER_OPEN_ID=local-admin
OWNER_NAME=本地管理员

# AI服务配置（可选）
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# Gemini API（如使用AI功能）
GEMINI_API_KEY=

# 简道云集成（如需要）
JIANDAOYUN_API_KEY=
JIANDAOYUN_CORP_ID=

# Microsoft 365集成（如需要）
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

### 6.3 Windows环境变量设置

对于生产环境，建议将敏感配置设置为系统环境变量：

```powershell
# 设置系统环境变量（需要管理员权限）
[System.Environment]::SetEnvironmentVariable("DATABASE_URL", "mysql://...", "Machine")
[System.Environment]::SetEnvironmentVariable("JWT_SECRET", "your_secret", "Machine")
```

---

## 7. 启动与验证

### 7.1 开发模式启动

```powershell
# 启动开发服务器
pnpm dev
```

开发服务器启动后，访问 http://localhost:3000 即可看到GRT系统界面。

开发模式特性：
- 代码热重载（修改代码后自动刷新）
- 详细的错误信息
- TypeScript类型检查
- 源码映射（便于调试）

### 7.2 生产模式构建与启动

```powershell
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 7.3 验证部署

**健康检查**

访问以下端点验证服务状态：

| 端点 | 预期响应 |
|------|----------|
| http://localhost:3000 | 显示系统首页 |
| http://localhost:3000/api/trpc | tRPC端点 |

**功能验证清单**

| 功能模块 | 验证项 | 预期结果 |
|----------|--------|----------|
| 用户认证 | 登录/登出 | 正常跳转 |
| 商机管理 | 列表/新增/编辑 | 数据正常显示 |
| CRM客户 | 客户列表 | 数据正常加载 |
| 项目管理 | 项目看板 | 阶段正确显示 |
| 成本管理 | 成本录入 | 数据正常保存 |
| 任务调度 | 定时任务列表 | 任务状态正确 |

### 7.4 运行测试

```powershell
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test -- server/services/lead.service.test.ts
```

---

## 8. Claude Code代码查验流程

### 8.1 概述

Claude Code代码查验流程是GRT系统开发中的关键质量保证环节。该流程确保所有代码变更经过AI辅助审查，提高代码质量和一致性。

### 8.2 查验流程架构

```
┌─────────────────────────────────────────────────────────────┐
│                    开发与查验循环                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Manus      │───▶│ Claude Code  │───▶│   Manus      │  │
│  │  (规划/检查)  │    │  (实现/修复)  │    │  (验证/确认)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 需求分析     │    │ 代码实现     │    │ 测试验证     │  │
│  │ 任务分解     │    │ Bug修复      │    │ 质量检查     │  │
│  │ 设计规范     │    │ 重构优化     │    │ 文档更新     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 查验流程步骤

#### 步骤1: 需求确认与任务分解

在开始任何开发任务前，首先进行需求确认：

```markdown
## 任务检查清单

### 1. 需求确认
- [ ] 功能需求是否明确
- [ ] 是否与现有功能冲突
- [ ] 是否需要数据库变更
- [ ] 是否影响其他模块

### 2. 设计评审
- [ ] 技术方案是否合理
- [ ] 是否符合项目架构
- [ ] 是否考虑性能影响
- [ ] 是否需要新增依赖
```

#### 步骤2: Claude Code实现

使用Claude Code进行代码实现时，遵循以下规范：

**启动Claude Code会话**

```
# 在VS Code中打开项目
code D:\Projects\GRT\grt-implementation-plan

# 启动Claude Code扩展
# 快捷键: Ctrl+Shift+P -> "Claude: Start Session"
```

**提供上下文**

向Claude Code提供必要的上下文信息：

```markdown
## 开发任务

**功能名称**: [功能名称]
**所属模块**: [模块名称]
**优先级**: [高/中/低]

### 需求描述
[详细描述功能需求]

### 技术要求
- 使用tRPC定义API
- 遵循现有代码风格
- 添加单元测试
- 更新类型定义

### 相关文件
- server/services/xxx.service.ts
- server/xxxRoutes.ts
- client/src/components/Xxx.tsx
```

**代码实现规范**

```typescript
// 服务层示例 - server/services/example.service.ts
import { getDb } from '../db';

export async function createExample(data: CreateExampleInput) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }
  
  // 业务逻辑实现
  const result = await db.insert(examples).values(data);
  return { success: true, id: result.insertId };
}
```

#### 步骤3: Manus验证检查

实现完成后，进行以下验证：

**TypeScript类型检查**

```powershell
# 运行类型检查
pnpm check

# 预期结果: 无错误输出
```

**单元测试**

```powershell
# 运行相关测试
pnpm test -- --grep "example"

# 预期结果: 所有测试通过
```

**代码风格检查**

```powershell
# 运行格式化
pnpm format

# 检查是否有未格式化的文件
git diff --name-only
```

#### 步骤4: 迭代修复

如果验证发现问题，进入修复循环：

```
┌─────────────────────────────────────────────────────────────┐
│                    Bug修复循环                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  发现Bug ──▶ 分析原因 ──▶ Claude Code修复 ──▶ 重新验证     │
│      │                                              │       │
│      │         ◀───── 未通过 ◀──────────────────────┘       │
│      │                                                      │
│      └─────────────────▶ 通过 ──▶ 进入下一任务             │
│                                                             │
│  最大尝试次数: 3次                                          │
│  超过3次: 记录问题 ──▶ 评估影响 ──▶ 继续后续任务           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 代码查验检查清单

```markdown
## Claude Code 代码查验检查清单

### 代码质量
- [ ] 代码符合TypeScript类型规范
- [ ] 无any类型滥用
- [ ] 错误处理完整
- [ ] 日志记录适当

### 安全性
- [ ] 输入验证完整
- [ ] SQL注入防护
- [ ] XSS防护
- [ ] 敏感数据处理

### 性能
- [ ] 数据库查询优化
- [ ] 避免N+1查询
- [ ] 适当使用缓存
- [ ] 大数据分页处理

### 测试
- [ ] 单元测试覆盖
- [ ] 边界条件测试
- [ ] 错误场景测试
- [ ] 集成测试（如需要）

### 文档
- [ ] 函数注释完整
- [ ] API文档更新
- [ ] README更新（如需要）
- [ ] 变更日志记录
```

### 8.5 问题记录模板

当Bug无法在3次尝试内解决时，使用以下模板记录：

```markdown
## 未解决问题记录

**问题ID**: BUG-YYYYMMDD-XXX
**发现日期**: YYYY-MM-DD
**严重程度**: [高/中/低]
**影响范围**: [描述影响的功能模块]

### 问题描述
[详细描述问题现象]

### 复现步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

### 已尝试的解决方案
1. [方案1] - 结果: [失败原因]
2. [方案2] - 结果: [失败原因]
3. [方案3] - 结果: [失败原因]

### 影响评估
- 功能影响: [描述]
- 用户影响: [描述]
- 临时解决方案: [如有]

### 建议后续处理
- 建议处理时间: [时间点]
- 处理条件: [条件描述]
- 负责人: [指定人员]
```

### 8.6 版本控制集成

每次代码变更完成后，执行以下Git操作：

```powershell
# 查看变更文件
git status

# 添加变更
git add .

# 提交（使用规范的提交信息）
git commit -m "feat(module): 功能描述

- 具体变更1
- 具体变更2

Reviewed-by: Claude Code
Tested-by: Vitest"

# 推送到远程仓库
git push origin main
```

---

## 9. 生产环境部署

### 9.1 使用PM2进程管理

PM2是Node.js应用的生产级进程管理器。

**安装PM2**

```powershell
npm install -g pm2
```

**创建PM2配置文件**

在项目根目录创建`ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
```

**启动生产服务**

```powershell
# 构建项目
pnpm build

# 使用PM2启动
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs grt-system
```

### 9.2 使用Docker部署

**构建Docker镜像**

```powershell
# 进入docker目录
cd docker

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 9.3 配置Windows服务

使用NSSM将Node.js应用注册为Windows服务：

```powershell
# 下载NSSM: https://nssm.cc/download
# 解压后将nssm.exe添加到PATH

# 安装服务
nssm install GRT-System "C:\Program Files\nodejs\node.exe" "D:\Projects\GRT\grt-implementation-plan\dist\index.js"

# 配置服务
nssm set GRT-System AppDirectory "D:\Projects\GRT\grt-implementation-plan"
nssm set GRT-System AppEnvironmentExtra "NODE_ENV=production"

# 启动服务
nssm start GRT-System
```

### 9.4 配置Nginx反向代理

如需配置HTTPS和负载均衡，可使用Nginx：

```nginx
# nginx.conf
server {
    listen 80;
    server_name grt.local;

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

## 10. 故障排除

### 10.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| pnpm install失败 | 网络问题 | 配置npm镜像源 |
| 数据库连接失败 | 配置错误 | 检查DATABASE_URL格式 |
| 端口被占用 | 其他进程占用 | 使用netstat查找并关闭 |
| TypeScript错误 | 类型不匹配 | 运行pnpm check查看详情 |
| 页面空白 | 构建失败 | 检查浏览器控制台错误 |

### 10.2 日志查看

```powershell
# 开发模式日志
# 直接在终端查看

# PM2日志
pm2 logs grt-system --lines 100

# Docker日志
docker-compose logs -f grt-api
```

### 10.3 数据库问题排查

```sql
-- 检查数据库连接
SELECT 1;

-- 查看表结构
SHOW TABLES;
DESCRIBE users;

-- 检查数据
SELECT COUNT(*) FROM users;
```

---

## 11. 附录

### 11.1 完整环境变量参考

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| NODE_ENV | 是 | development | 运行环境 |
| DATABASE_URL | 是 | - | 数据库连接字符串 |
| JWT_SECRET | 是 | - | JWT签名密钥 |
| VITE_APP_ID | 否 | grt-local | 应用ID |
| VITE_APP_TITLE | 否 | GRT智能系统 | 应用标题 |
| OWNER_OPEN_ID | 否 | - | 所有者ID |
| GEMINI_API_KEY | 否 | - | Gemini API密钥 |

### 11.2 常用命令速查

```powershell
# 开发
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm check        # TypeScript类型检查
pnpm test         # 运行测试
pnpm format       # 代码格式化

# 数据库
pnpm db:push      # 推送数据库变更

# PM2
pm2 start         # 启动服务
pm2 stop          # 停止服务
pm2 restart       # 重启服务
pm2 logs          # 查看日志
pm2 monit         # 监控面板
```

### 11.3 项目依赖版本锁定

项目使用`pnpm-lock.yaml`锁定依赖版本，确保不同环境的一致性。如需更新依赖：

```powershell
# 更新所有依赖
pnpm update

# 更新特定依赖
pnpm update react

# 检查过时依赖
pnpm outdated
```

### 11.4 联系与支持

如在部署过程中遇到问题，可通过以下方式获取支持：

- 项目文档: `/docs`目录
- 问题追踪: GitHub Issues
- 技术支持: [support@gerrytech.com]

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0.0 | 2026-01-25 | Manus AI | 初始版本 |


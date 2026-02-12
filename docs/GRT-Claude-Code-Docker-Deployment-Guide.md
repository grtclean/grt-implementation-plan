# GRT智能系统 Claude Code + Docker 部署指南

**版本**: v3.1.7  
**作者**: Manus AI  
**更新日期**: 2026-01-19

---

## 目录

1. [概述](#1-概述)
2. [环境要求](#2-环境要求)
3. [项目获取与初始化](#3-项目获取与初始化)
4. [Claude Code开发环境配置](#4-claude-code开发环境配置)
5. [Docker部署方案](#5-docker部署方案)
6. [数据库配置与迁移](#6-数据库配置与迁移)
7. [开发工作流](#7-开发工作流)
8. [生产部署](#8-生产部署)
9. [故障排除](#9-故障排除)
10. [附录](#10-附录)

---

## 1. 概述

GRT智能系统是一套面向工业清洗设备制造企业的综合管理平台，采用现代化的全栈技术架构。本指南详细介绍如何在本地开发环境中使用Claude Code进行开发，以及如何通过Docker进行容器化部署。

### 1.1 技术栈概览

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | React 19 + TypeScript | 现代化UI框架 |
| **样式** | Tailwind CSS 4 + shadcn/ui | 原子化CSS + 组件库 |
| **后端** | Express 4 + tRPC 11 | 类型安全的API层 |
| **数据库** | MySQL 8 + Drizzle ORM | 关系型数据库 |
| **构建** | Vite + esbuild | 快速构建工具 |
| **运行时** | Node.js 22 LTS | JavaScript运行环境 |

### 1.2 项目结构

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # UI组件
│   │   ├── pages/          # 页面组件
│   │   ├── contexts/       # React上下文
│   │   └── lib/            # 工具库
│   └── public/             # 静态资源
├── server/                 # 后端代码
│   ├── _core/              # 核心框架
│   ├── ai-assistants/      # AI助手模块
│   ├── blockchain/         # 区块链集成
│   └── services/           # 业务服务
├── drizzle/                # 数据库Schema
├── shared/                 # 共享类型
├── docs/                   # 文档
├── docker/                 # Docker配置
├── Dockerfile              # Docker镜像定义
└── docker-compose.yml      # Docker编排配置
```

---

## 2. 环境要求

### 2.1 本地开发环境

在开始之前，请确保您的开发机器满足以下要求：

| 软件 | 最低版本 | 推荐版本 | 用途 |
|------|----------|----------|------|
| Node.js | 20.x | 22.x LTS | JavaScript运行时 |
| pnpm | 8.x | 10.x | 包管理器 |
| Docker | 24.x | 27.x | 容器化平台 |
| Docker Compose | 2.20+ | 2.30+ | 容器编排 |
| Git | 2.40+ | 2.45+ | 版本控制 |
| Claude Code | 最新版 | 最新版 | AI辅助开发 |

### 2.2 系统资源建议

开发环境建议配置如下系统资源，以确保流畅的开发体验：

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 4核 | 8核+ |
| 内存 | 8GB | 16GB+ |
| 磁盘 | 20GB可用 | 50GB+ SSD |
| 网络 | 稳定连接 | 10Mbps+ |

---

## 3. 项目获取与初始化

### 3.1 克隆项目

首先，从版本控制系统获取项目代码。如果您已经有项目文件，可以跳过此步骤。

```bash
# 创建工作目录
mkdir -p ~/projects
cd ~/projects

# 克隆项目（如果使用Git）
git clone <repository-url> grt-implementation-plan
cd grt-implementation-plan
```

### 3.2 安装依赖

项目使用pnpm作为包管理器，这是因为pnpm提供了更快的安装速度和更高效的磁盘空间利用。

```bash
# 启用pnpm（如果尚未安装）
corepack enable pnpm

# 安装项目依赖
pnpm install
```

依赖安装完成后，您会看到`node_modules`目录被创建，其中包含了项目所需的所有第三方包。

### 3.3 环境变量配置

项目需要配置多个环境变量才能正常运行。创建`.env`文件并配置以下变量：

```bash
# 数据库连接
DATABASE_URL=mysql://grt:grt_password@localhost:3306/grt_db

# JWT密钥（生产环境请使用强随机字符串）
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# 应用配置
VITE_APP_ID=grt-system
VITE_APP_TITLE=GRT智能系统
```

> **安全提示**: 永远不要将包含敏感信息的`.env`文件提交到版本控制系统。

---

## 4. Claude Code开发环境配置

Claude Code是Anthropic提供的AI辅助编程工具，能够显著提升开发效率。本节介绍如何配置Claude Code以最佳方式与GRT项目协作。

### 4.1 Claude Code安装与配置

Claude Code可以通过VS Code扩展或独立CLI工具使用。推荐使用VS Code扩展以获得最佳的集成体验。

```bash
# 使用VS Code扩展（推荐）
# 在VS Code中搜索并安装 "Claude Code" 扩展

# 或使用CLI工具
npm install -g @anthropic-ai/claude-code
```

### 4.2 项目上下文配置

为了让Claude Code更好地理解项目结构，建议在项目根目录创建`.claude`配置文件：

```json
{
  "projectType": "fullstack-typescript",
  "framework": {
    "frontend": "react",
    "backend": "express-trpc",
    "database": "mysql-drizzle"
  },
  "conventions": {
    "componentStyle": "functional",
    "stateManagement": "react-query",
    "styling": "tailwind-shadcn"
  },
  "importantFiles": [
    "drizzle/schema.ts",
    "server/routers.ts",
    "server/db.ts",
    "client/src/App.tsx"
  ]
}
```

### 4.3 Claude Code最佳实践

在使用Claude Code进行GRT项目开发时，遵循以下最佳实践可以获得更好的结果：

**代码生成请求模板**：

```
我需要为GRT系统添加[功能名称]功能。

技术要求：
- 数据库表：[表名和字段描述]
- API端点：[tRPC procedure名称]
- 前端页面：[页面路径和组件]

请按照以下顺序实现：
1. 更新 drizzle/schema.ts 添加数据表
2. 在 server/db.ts 添加查询函数
3. 在 server/routers.ts 添加tRPC procedure
4. 创建前端页面组件
```

**代码审查请求模板**：

```
请审查以下代码的：
1. TypeScript类型安全性
2. 错误处理完整性
3. 性能优化建议
4. 安全漏洞检查

[粘贴代码]
```

### 4.4 Manus-Claude协作工作流

GRT项目采用Manus（规划管理）+ Claude Code（实现执行）的双层协作模式：

| 角色 | 职责 | 工具 |
|------|------|------|
| **Manus** | 需求分析、任务规划、质量检查 | Manus平台 |
| **Claude Code** | 代码实现、重构优化、测试编写 | Claude Code CLI/扩展 |

**标准工作流程**：

1. **Manus规划阶段**：分析需求，拆解任务，定义验收标准
2. **Claude Code实现阶段**：根据规划编写代码
3. **Manus检查阶段**：验证实现是否符合要求
4. **迭代优化**：如有问题，返回步骤2进行修正

---

## 5. Docker部署方案

### 5.1 Docker架构概览

GRT系统的Docker部署采用多容器架构，包含以下服务：

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| 应用服务 | grt-app | 3000 | Node.js应用 |
| MySQL数据库 | grt-mysql | 3306 | 数据存储 |
| Redis缓存 | grt-redis | 6379 | 会话缓存（可选） |
| Adminer | grt-adminer | 8080 | 数据库管理（开发） |

### 5.2 快速启动

使用Docker Compose可以一键启动所有服务：

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f grt-app
```

### 5.3 开发环境启动

开发环境需要额外启动Adminer数据库管理工具：

```bash
# 启动开发环境（包含Adminer）
docker-compose --profile dev up -d

# 访问Adminer
# 打开浏览器访问 http://localhost:8080
# 服务器: mysql
# 用户名: grt
# 密码: grt_password
# 数据库: grt_db
```

### 5.4 生产环境配置

生产环境部署需要额外的安全配置：

```bash
# 创建生产环境配置文件
cat > .env.production << EOF
DATABASE_URL=mysql://grt:STRONG_PASSWORD@mysql:3306/grt_db
JWT_SECRET=VERY_LONG_RANDOM_STRING_AT_LEAST_64_CHARACTERS
MYSQL_ROOT_PASSWORD=ANOTHER_STRONG_PASSWORD
MYSQL_PASSWORD=STRONG_PASSWORD
NODE_ENV=production
EOF

# 使用生产配置启动
docker-compose --env-file .env.production up -d
```

### 5.5 Docker命令速查

| 操作 | 命令 |
|------|------|
| 启动所有服务 | `docker-compose up -d` |
| 停止所有服务 | `docker-compose down` |
| 重启单个服务 | `docker-compose restart grt-app` |
| 查看日志 | `docker-compose logs -f [service]` |
| 进入容器 | `docker-compose exec grt-app sh` |
| 重建镜像 | `docker-compose build --no-cache` |
| 清理资源 | `docker-compose down -v --rmi all` |

---

## 6. 数据库配置与迁移

### 6.1 数据库Schema管理

GRT系统使用Drizzle ORM管理数据库Schema。所有表定义位于`drizzle/schema.ts`文件中。

```bash
# 生成迁移文件并应用
pnpm db:push

# 仅生成迁移文件
pnpm drizzle-kit generate

# 仅应用迁移
pnpm drizzle-kit migrate
```

### 6.2 初始数据导入

系统提供了多个种子数据脚本用于初始化基础数据：

```bash
# 运行命名规则种子数据
npx tsx server/seed-naming-sample.ts

# 运行HRM薪资种子数据
npx tsx server/seed-hrm-salary.ts
```

### 6.3 数据库备份与恢复

在Docker环境中进行数据库备份：

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u grt -pgrt_password grt_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T mysql mysql -u grt -pgrt_password grt_db < backup_20260119.sql
```

---

## 7. 开发工作流

### 7.1 本地开发模式

本地开发时，可以选择完全本地运行或混合模式（本地应用 + Docker数据库）。

**完全本地模式**：

```bash
# 启动开发服务器
pnpm dev

# 应用将在 http://localhost:3000 运行
```

**混合模式（推荐）**：

```bash
# 仅启动数据库服务
docker-compose up -d mysql redis

# 本地启动应用（支持热重载）
pnpm dev
```

### 7.2 代码质量检查

项目配置了多种代码质量工具：

```bash
# TypeScript类型检查
pnpm check

# 代码格式化
pnpm format

# 运行测试
pnpm test
```

### 7.3 Git工作流

推荐使用功能分支工作流：

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发完成后提交
git add .
git commit -m "feat: 添加新功能描述"

# 推送并创建PR
git push origin feature/new-feature
```

---

## 8. 生产部署

### 8.1 构建生产镜像

```bash
# 构建Docker镜像
docker build -t grt-system:v3.1.7 .

# 标记镜像（用于推送到镜像仓库）
docker tag grt-system:v3.1.7 your-registry/grt-system:v3.1.7

# 推送镜像
docker push your-registry/grt-system:v3.1.7
```

### 8.2 部署检查清单

在生产部署前，请确认以下事项：

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 环境变量配置 | ☐ | 所有必需变量已设置 |
| 数据库迁移 | ☐ | Schema已同步 |
| SSL证书 | ☐ | HTTPS已配置 |
| 日志配置 | ☐ | 日志收集已设置 |
| 监控告警 | ☐ | 健康检查已配置 |
| 备份策略 | ☐ | 自动备份已启用 |

### 8.3 健康检查端点

系统提供以下健康检查端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 基础健康检查 |
| `/api/health/db` | GET | 数据库连接检查 |
| `/api/health/ready` | GET | 就绪状态检查 |

---

## 9. 故障排除

### 9.1 常见问题

**问题1：Docker容器无法启动**

```bash
# 检查容器日志
docker-compose logs grt-app

# 常见原因：
# - 端口被占用：修改docker-compose.yml中的端口映射
# - 内存不足：增加Docker内存限制
# - 依赖服务未就绪：检查mysql服务是否正常
```

**问题2：数据库连接失败**

```bash
# 检查MySQL服务状态
docker-compose exec mysql mysqladmin ping -h localhost

# 检查连接字符串
echo $DATABASE_URL

# 常见原因：
# - 密码错误：检查.env文件
# - 网络问题：确保容器在同一网络
```

**问题3：TypeScript编译错误**

```bash
# 查看详细错误
pnpm check

# 常见原因：
# - 类型定义缺失：运行 pnpm install
# - Schema不同步：运行 pnpm db:push
```

### 9.2 日志分析

```bash
# 查看应用日志
docker-compose logs -f grt-app --tail=100

# 查看数据库日志
docker-compose logs -f mysql --tail=100

# 导出日志到文件
docker-compose logs grt-app > app.log 2>&1
```

### 9.3 性能调优

| 问题 | 解决方案 |
|------|----------|
| 启动慢 | 增加Docker内存，使用SSD |
| 查询慢 | 添加数据库索引，优化查询 |
| 内存高 | 调整Node.js内存限制 |
| CPU高 | 检查是否有无限循环或重复计算 |

---

## 10. 附录

### 10.1 环境变量完整列表

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| DATABASE_URL | 是 | - | MySQL连接字符串 |
| JWT_SECRET | 是 | - | JWT签名密钥 |
| VITE_APP_ID | 是 | - | 应用ID |
| VITE_APP_TITLE | 否 | GRT智能系统 | 应用标题 |
| NODE_ENV | 否 | development | 运行环境 |
| VITE_OAUTH_PORTAL_URL | 否 | - | OAuth登录地址 |
| BUILT_IN_FORGE_API_KEY | 否 | - | Manus API密钥 |

### 10.2 端口映射表

| 服务 | 内部端口 | 外部端口 | 协议 |
|------|----------|----------|------|
| 应用 | 3000 | 3000 | HTTP |
| MySQL | 3306 | 3306 | TCP |
| Redis | 6379 | 6379 | TCP |
| Adminer | 8080 | 8080 | HTTP |

### 10.3 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| Manus命令规范 | `docs/manus-command-specification.md` | Manus命令格式 |
| 协作工作流 | `docs/manus-claude-collaboration-workflow.md` | 开发协作流程 |
| API文档 | `docs/api-specification.md` | API接口规范 |
| 数据库Schema | `drizzle/schema.ts` | 表结构定义 |

### 10.4 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v3.1.7 | 2026-01-19 | 添加Docker支持，多渠道通知 |
| v3.1.6 | 2026-01-19 | 死锁监控持久化，告警配置 |
| v3.1.0 | 2026-01-18 | 系统完整性检查，区块链集成 |
| v3.0.0 | 2026-01-18 | Gemini V3.0升级，混合验证层 |

---

**文档结束**

如有问题，请联系技术支持或查阅项目Wiki。

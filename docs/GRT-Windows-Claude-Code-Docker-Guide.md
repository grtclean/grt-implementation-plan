# GRT智能系统 Windows本地服务器部署指南

**版本**: v3.1.9  
**更新日期**: 2026-01-19  
**作者**: Manus AI  
**适用环境**: Windows 10/11 + Docker Desktop + Claude Code

---

## 目录

1. [概述](#1-概述)
2. [系统要求](#2-系统要求)
3. [环境准备](#3-环境准备)
4. [Claude Code安装与配置](#4-claude-code安装与配置)
5. [项目获取与初始化](#5-项目获取与初始化)
6. [Docker部署](#6-docker部署)
7. [开发工作流](#7-开发工作流)
8. [Claude Code与Manus协作开发](#8-claude-code与manus协作开发)
9. [生产环境部署](#9-生产环境部署)
10. [故障排除](#10-故障排除)
11. [附录](#11-附录)

---

## 1. 概述

### 1.1 文档目的

本文档提供在Windows本地服务器环境中部署和开发GRT智能系统的完整指南。通过结合Claude Code（AI编程助手）和Docker容器化技术，实现高效的本地开发和生产部署。

### 1.2 架构概览

GRT智能系统采用现代化的全栈架构，主要组件包括：

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| 前端 | React 19 + Tailwind CSS 4 | 响应式用户界面 |
| 后端 | Express 4 + tRPC 11 | 类型安全的API层 |
| 数据库 | MySQL 8.0 | 关系型数据存储 |
| 缓存 | Redis 7 | 会话和缓存管理 |
| 容器化 | Docker + Docker Compose | 环境一致性保障 |

### 1.3 开发工具链

本指南推荐的开发工具组合能够最大化开发效率：

| 工具 | 用途 | 优势 |
|------|------|------|
| Claude Code | AI编程助手 | 智能代码生成、调试、重构 |
| VS Code | 代码编辑器 | 丰富的扩展生态 |
| Docker Desktop | 容器运行时 | 简化环境配置 |
| Git | 版本控制 | 代码管理和协作 |

---

## 2. 系统要求

### 2.1 硬件要求

为确保流畅的开发体验，建议满足以下硬件配置：

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核心 | 8核心或以上 |
| 内存 | 8GB | 16GB或以上 |
| 存储 | 50GB可用空间 | 100GB SSD |
| 网络 | 稳定的互联网连接 | 10Mbps或以上 |

### 2.2 软件要求

| 软件 | 版本要求 | 下载地址 |
|------|----------|----------|
| Windows | 10 (1903+) 或 11 | - |
| Docker Desktop | 4.0+ | https://docs.docker.com/desktop/install/windows-install/ |
| Git | 2.30+ | https://git-scm.com/download/win |
| Node.js | 18.0+ (可选) | https://nodejs.org/ |
| VS Code | 最新版 | https://code.visualstudio.com/ |

### 2.3 Windows功能要求

Docker Desktop在Windows上运行需要启用以下功能：

**WSL 2（推荐）**：Windows Subsystem for Linux 2提供更好的性能和兼容性。

**Hyper-V（备选）**：如果无法使用WSL 2，可以使用Hyper-V后端。

---

## 3. 环境准备

### 3.1 启用WSL 2

以管理员身份打开PowerShell，执行以下命令启用WSL 2：

```powershell
# 启用WSL功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 启用虚拟机平台
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启计算机后，设置WSL 2为默认版本
wsl --set-default-version 2

# 安装Ubuntu发行版（可选，但推荐）
wsl --install -d Ubuntu
```

### 3.2 安装Docker Desktop

Docker Desktop是在Windows上运行容器的最简便方式。安装步骤如下：

首先，从官方网站下载Docker Desktop安装程序。运行安装程序时，确保勾选"Use WSL 2 instead of Hyper-V"选项（如果系统支持WSL 2）。安装完成后，Docker Desktop会自动启动并在系统托盘显示图标。

安装完成后，打开PowerShell验证安装：

```powershell
# 验证Docker安装
docker --version
# 输出示例: Docker version 24.0.7, build afdd53b

# 验证Docker Compose
docker compose version
# 输出示例: Docker Compose version v2.23.0

# 运行测试容器
docker run hello-world
```

### 3.3 配置Docker Desktop

为获得最佳性能，建议在Docker Desktop设置中进行以下配置：

打开Docker Desktop，点击设置图标，在Resources选项卡中调整资源分配。建议将内存设置为系统总内存的50%（至少4GB），CPU核心数设置为物理核心数的一半。

在WSL Integration选项卡中，确保启用了与已安装的Linux发行版的集成。

### 3.4 安装Git

Git是版本控制的核心工具。从官网下载安装程序后，运行安装向导。在安装过程中，建议选择以下选项：

- 默认编辑器：选择VS Code
- PATH环境：选择"Git from the command line and also from 3rd-party software"
- 行尾转换：选择"Checkout as-is, commit Unix-style line endings"

安装完成后，配置Git用户信息：

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 4. Claude Code安装与配置

### 4.1 什么是Claude Code

Claude Code是Anthropic推出的AI编程助手，能够理解代码上下文、生成高质量代码、协助调试和重构。它可以作为VS Code扩展或独立CLI工具使用。

### 4.2 安装Claude Code CLI

Claude Code CLI提供命令行界面，适合在终端中快速获取AI辅助。安装步骤如下：

```powershell
# 使用npm安装Claude Code CLI（需要先安装Node.js）
npm install -g @anthropic-ai/claude-code

# 或者使用官方安装脚本
irm https://claude.ai/install-cli.ps1 | iex

# 验证安装
claude --version
```

### 4.3 配置Claude Code

首次使用Claude Code需要进行身份验证和配置：

```powershell
# 登录Claude账户
claude login

# 配置默认模型（推荐使用claude-3-opus）
claude config set model claude-3-opus

# 配置工作目录
claude config set workspace "C:\Projects\grt-implementation-plan"
```

### 4.4 VS Code集成

在VS Code中安装Claude扩展可以获得更好的集成体验：

1. 打开VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "Claude" 或 "Anthropic"
4. 安装官方扩展
5. 重启VS Code
6. 按 `Ctrl+Shift+P`，输入 "Claude: Sign In" 完成登录

### 4.5 Claude Code基本使用

Claude Code支持多种交互方式：

**命令行模式**：
```powershell
# 询问代码问题
claude ask "如何在TypeScript中实现单例模式？"

# 生成代码
claude generate "创建一个Express中间件用于请求日志记录"

# 解释代码
claude explain ./server/db.ts

# 代码审查
claude review ./client/src/pages/Home.tsx
```

**交互式会话**：
```powershell
# 启动交互式会话
claude chat

# 在会话中可以连续对话，Claude会记住上下文
> 帮我分析这个项目的架构
> 如何添加一个新的API端点？
> 生成相应的测试代码
```

---

## 5. 项目获取与初始化

### 5.1 克隆项目

使用Git克隆GRT智能系统项目到本地：

```powershell
# 创建项目目录
mkdir C:\Projects
cd C:\Projects

# 克隆项目（替换为实际的仓库地址）
git clone https://github.com/your-org/grt-implementation-plan.git

# 进入项目目录
cd grt-implementation-plan
```

### 5.2 项目结构概览

GRT智能系统的目录结构如下：

```
grt-implementation-plan/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/    # 可复用组件
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # React上下文
│   │   ├── hooks/         # 自定义Hooks
│   │   └── lib/           # 工具库
│   └── public/            # 静态资源
├── server/                 # 后端Express服务
│   ├── _core/             # 核心框架代码
│   ├── db.ts              # 数据库操作
│   └── routers.ts         # tRPC路由
├── drizzle/               # 数据库Schema和迁移
├── shared/                # 前后端共享代码
├── docker/                # Docker配置文件
├── scripts/               # 脚本文件
├── docs/                  # 文档
├── Dockerfile             # Docker镜像定义
├── docker-compose.yml     # Docker Compose配置
└── docker-compose.windows.yml  # Windows专用配置
```

### 5.3 配置环境变量

复制环境变量模板并进行配置：

```powershell
# 复制Windows专用环境变量模板
Copy-Item .env.windows.example .env

# 使用VS Code编辑环境变量
code .env
```

在`.env`文件中，根据实际情况修改以下关键配置：

```env
# 数据库配置
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_password

# JWT密钥（生产环境必须更改）
JWT_SECRET=your-very-long-and-secure-jwt-secret

# 应用配置
VITE_APP_TITLE=GRT智能系统
```

### 5.4 使用Claude Code初始化项目

Claude Code可以帮助您快速理解和初始化项目：

```powershell
# 让Claude分析项目结构
claude analyze .

# 获取项目概览
claude ask "分析这个项目的技术栈和主要功能模块"

# 检查配置是否正确
claude review .env --check-security
```

---

## 6. Docker部署

### 6.1 快速启动

GRT智能系统提供了便捷的PowerShell脚本用于管理Docker服务：

```powershell
# 进入项目目录
cd C:\Projects\grt-implementation-plan

# 快速启动（默认模式）
.\scripts\quick-start.ps1

# 开发模式启动（包含Adminer数据库管理工具）
.\scripts\quick-start.ps1 -Dev

# 重新构建镜像并启动
.\scripts\quick-start.ps1 -Build
```

### 6.2 手动Docker Compose操作

如果需要更精细的控制，可以直接使用Docker Compose命令：

```powershell
# 使用Windows专用配置文件启动
docker compose -f docker-compose.windows.yml up -d

# 查看服务状态
docker compose -f docker-compose.windows.yml ps

# 查看日志
docker compose -f docker-compose.windows.yml logs -f grt-app

# 停止服务
docker compose -f docker-compose.windows.yml down
```

### 6.3 服务说明

Docker Compose配置中包含以下服务：

| 服务名 | 端口 | 说明 |
|--------|------|------|
| grt-app | 3000 | GRT应用主服务 |
| mysql | 3306 | MySQL数据库 |
| redis | 6379 | Redis缓存 |
| adminer | 8080 | 数据库管理工具（开发模式） |
| nginx | 80/443 | 反向代理（生产模式） |

### 6.4 验证部署

启动完成后，可以通过以下方式验证部署：

```powershell
# 检查容器状态
docker ps

# 测试应用响应
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing

# 检查数据库连接
docker exec grt-mysql mysqladmin ping -h localhost -u root -p
```

打开浏览器访问 http://localhost:3000 即可看到GRT智能系统界面。

---

## 7. 开发工作流

### 7.1 本地开发模式

对于需要频繁修改代码的开发场景，建议使用本地开发模式而非完全容器化：

```powershell
# 仅启动数据库和Redis服务
docker compose -f docker-compose.windows.yml up -d mysql redis

# 安装项目依赖
pnpm install

# 启动开发服务器（支持热重载）
pnpm dev
```

这种方式的优势在于代码修改后可以立即看到效果，无需重新构建Docker镜像。

### 7.2 数据库操作

GRT系统使用Drizzle ORM管理数据库。常用的数据库操作命令：

```powershell
# 推送Schema变更到数据库
pnpm db:push

# 生成迁移文件
pnpm drizzle-kit generate

# 执行迁移
pnpm drizzle-kit migrate

# 打开Drizzle Studio（可视化数据库管理）
pnpm drizzle-kit studio
```

### 7.3 测试

GRT系统使用Vitest作为测试框架：

```powershell
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test server/auth.logout.test.ts

# 监视模式（文件变更时自动运行）
pnpm test --watch

# 生成测试覆盖率报告
pnpm test --coverage
```

### 7.4 代码质量

保持代码质量的常用命令：

```powershell
# 代码格式化
pnpm format

# TypeScript类型检查
pnpm tsc --noEmit

# 代码检查（如果配置了ESLint）
pnpm lint
```

---

## 8. Claude Code与Manus协作开发

### 8.1 协作模式概述

GRT智能系统的开发采用Claude Code（实现）与Manus（规划/检查）的协作模式。这种模式确保了代码质量和需求一致性。

**工作流程**：

1. **需求分析**：Manus分析用户需求，制定开发计划
2. **设计评审**：Manus创建技术设计文档
3. **代码实现**：Claude Code根据设计实现功能
4. **代码检查**：Manus检查实现是否符合需求
5. **迭代优化**：如有问题，Claude Code修改后再次检查
6. **完成交付**：通过检查后，保存检查点

### 8.2 使用Claude Code开发新功能

以添加新API端点为例，展示Claude Code的使用方法：

```powershell
# 1. 分析现有代码结构
claude ask "分析server/routers.ts的结构，说明如何添加新的tRPC端点"

# 2. 生成新端点代码
claude generate "在server/routers.ts中添加一个获取用户统计信息的端点，包含总用户数、活跃用户数、新增用户数"

# 3. 生成对应的前端调用代码
claude generate "在client/src/pages/Dashboard.tsx中添加调用用户统计API的代码，使用tRPC hooks"

# 4. 生成测试代码
claude generate "为用户统计API创建Vitest测试用例"

# 5. 代码审查
claude review server/routers.ts --focus "新添加的用户统计端点"
```

### 8.3 使用Claude Code调试

当遇到问题时，Claude Code可以协助调试：

```powershell
# 分析错误信息
claude debug "TypeError: Cannot read property 'map' of undefined at Dashboard.tsx:45"

# 解释复杂代码
claude explain server/db.ts --detailed

# 查找潜在问题
claude analyze ./server --find-bugs

# 性能优化建议
claude optimize ./client/src/pages/Dashboard.tsx
```

### 8.4 最佳实践

在使用Claude Code进行开发时，建议遵循以下最佳实践：

**提供充分的上下文**：在询问或生成代码时，提供相关的文件路径、错误信息和期望结果，可以获得更准确的响应。

**分步骤进行**：复杂功能应分解为多个小步骤，每步完成后验证再继续。

**保持代码一致性**：让Claude Code参考现有代码风格，确保生成的代码与项目风格一致。

**及时测试**：每次代码变更后运行测试，确保不引入回归问题。

---

## 9. 生产环境部署

### 9.1 生产环境准备

生产环境部署需要额外的安全和性能配置：

```powershell
# 1. 生成强随机JWT密钥
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "JWT_SECRET=$jwtSecret"

# 2. 生成强数据库密码
$dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "MYSQL_PASSWORD=$dbPassword"
```

### 9.2 配置Nginx SSL

为生产环境配置HTTPS，首先创建Nginx配置目录和SSL证书目录：

```powershell
# 创建配置目录
mkdir -p docker/nginx/ssl

# 将SSL证书文件复制到ssl目录
# - fullchain.pem（证书链）
# - privkey.pem（私钥）
```

创建Nginx配置文件 `docker/nginx/nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream grt_app {
        server grt-app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://grt_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 9.3 生产模式启动

```powershell
# 使用生产模式启动（包含Nginx）
.\scripts\quick-start.ps1 -Prod -Build

# 或手动启动
docker compose -f docker-compose.windows.yml --profile prod up -d --build
```

### 9.4 数据备份

定期备份数据库是生产环境的必要操作：

```powershell
# 创建备份目录
mkdir C:\Backups\grt

# 备份数据库
docker exec grt-mysql mysqldump -u root -p grt_db > C:\Backups\grt\backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# 创建定时备份任务（使用Windows任务计划程序）
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Projects\grt-implementation-plan\scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "GRT-Backup" -Action $action -Trigger $trigger
```

---

## 10. 故障排除

### 10.1 常见问题

**问题1：Docker Desktop无法启动**

症状：Docker Desktop启动后立即退出或显示错误。

解决方案：
```powershell
# 检查WSL状态
wsl --status

# 如果WSL有问题，尝试重置
wsl --shutdown
wsl --unregister Ubuntu
wsl --install -d Ubuntu

# 重启Docker Desktop
```

**问题2：端口被占用**

症状：启动服务时提示端口已被使用。

解决方案：
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（替换PID为实际进程ID）
taskkill /PID <PID> /F

# 或修改docker-compose.windows.yml中的端口映射
```

**问题3：数据库连接失败**

症状：应用启动后无法连接数据库。

解决方案：
```powershell
# 检查MySQL容器状态
docker logs grt-mysql

# 检查网络连接
docker network inspect grt-implementation-plan_grt-network

# 验证数据库凭据
docker exec -it grt-mysql mysql -u grt -p
```

### 10.2 日志查看

```powershell
# 查看应用日志
docker logs -f grt-app

# 查看数据库日志
docker logs -f grt-mysql

# 查看所有服务日志
docker compose -f docker-compose.windows.yml logs -f

# 导出日志到文件
docker logs grt-app > app.log 2>&1
```

### 10.3 性能问题

如果遇到性能问题，可以检查以下方面：

```powershell
# 查看容器资源使用
docker stats

# 检查磁盘空间
docker system df

# 清理未使用的资源
docker system prune -a
```

### 10.4 获取帮助

如果问题无法解决，可以通过以下方式获取帮助：

1. 使用Claude Code分析问题：`claude debug "描述您的问题"`
2. 查看项目文档：`docs/` 目录
3. 检查GitHub Issues
4. 联系技术支持

---

## 11. 附录

### 11.1 常用命令速查表

| 操作 | 命令 |
|------|------|
| 启动服务 | `.\scripts\quick-start.ps1` |
| 停止服务 | `.\scripts\stop.ps1` |
| 重启服务 | `.\scripts\restart.ps1` |
| 查看日志 | `docker logs -f grt-app` |
| 进入容器 | `docker exec -it grt-app sh` |
| 数据库迁移 | `pnpm db:push` |
| 运行测试 | `pnpm test` |
| 代码格式化 | `pnpm format` |

### 11.2 环境变量参考

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接URL | mysql://grt:password@mysql:3306/grt_db |
| JWT_SECRET | JWT签名密钥 | (必须设置) |
| NODE_ENV | 运行环境 | development |
| VITE_APP_TITLE | 应用标题 | GRT智能系统 |
| TZ | 时区 | Asia/Shanghai |

### 11.3 文件清单

本指南涉及的主要配置文件：

| 文件 | 说明 |
|------|------|
| docker-compose.windows.yml | Windows专用Docker Compose配置 |
| .env.windows.example | Windows环境变量模板 |
| scripts/quick-start.ps1 | 快速启动脚本 |
| scripts/stop.ps1 | 停止服务脚本 |
| scripts/restart.ps1 | 重启服务脚本 |
| Dockerfile | Docker镜像定义 |

### 11.4 参考资源

- [Docker Desktop for Windows文档](https://docs.docker.com/desktop/install/windows-install/)
- [WSL 2安装指南](https://docs.microsoft.com/en-us/windows/wsl/install)
- [Claude Code官方文档](https://docs.anthropic.com/claude-code)
- [Drizzle ORM文档](https://orm.drizzle.team/)
- [tRPC文档](https://trpc.io/docs)

---

**文档版本历史**

| 版本 | 日期 | 说明 |
|------|------|------|
| v3.1.9 | 2026-01-19 | 初始版本，Windows本地服务器部署指南 |

---

*本文档由Manus AI生成，如有问题请联系技术支持。*

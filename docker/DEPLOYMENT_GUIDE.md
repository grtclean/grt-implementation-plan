# GRT智能系统 - Windows 11 本地部署指南

**版本**: v1.6.3  
**作者**: Manus AI  
**更新日期**: 2026年2月5日

---

## 概述

本指南详细介绍如何部署 GRT 智能系统。我们提供多种部署方式，您可以根据实际情况选择最适合的方案。

---

## 部署方式对比

在开始部署之前，请先了解不同部署方式的特点，选择最适合您的方案：

| 部署方式 | 是否需要Ubuntu | 难度 | 性能 | 适用场景 |
|----------|--------------|------|------|----------|
| **方案A: WSL 2 + Docker** | 需要 | 中等 | 最佳 | 生产环境推荐 |
| **方案B: Docker Hyper-V** | 不需要 | 中等 | 良好 | 不想装Linux的用户 |
| **方案C: 原生Windows** | 不需要 | 较高 | 良好 | 开发调试环境 |
| **方案D: Manus平台托管** | 不需要 | 最低 | 最佳 | 快速上线/演示 |

> **推荐**: 如果您追求最佳性能和完整控制，选择方案A；如果不想安装Ubuntu，选择方案B或C；如果只需快速上线，选择方案D。

---

## 系统要求

在开始部署之前，请确保您的系统满足以下要求：

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Windows 11 Home/Pro | Windows 11 Pro |
| 处理器 | 64位，支持虚拟化 | Intel i5/AMD Ryzen 5 及以上 |
| 内存 | 8 GB | 16 GB 及以上 |
| 存储空间 | 20 GB 可用空间 | 50 GB SSD |
| 网络 | 稳定的互联网连接 | 100 Mbps 及以上 |

---

## 第一部分：环境准备

### 1.1 启用 WSL 2

以管理员身份打开 PowerShell，执行以下命令启用 WSL 2：

```powershell
# 启用 WSL 功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 启用虚拟机平台
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启计算机后，设置 WSL 2 为默认版本
wsl --set-default-version 2

# 安装 Ubuntu 发行版
wsl --install -d Ubuntu-22.04
```

重启计算机后，打开 Ubuntu 终端完成初始设置（创建用户名和密码）。

### 1.2 安装 Docker Desktop

从 Docker 官网下载并安装 Docker Desktop for Windows。安装过程中，请确保勾选以下选项：

- Use WSL 2 instead of Hyper-V
- Add shortcut to desktop

安装完成后，打开 Docker Desktop，进入 Settings → Resources → WSL Integration，启用与 Ubuntu-22.04 的集成。

### 1.3 验证安装

在 Ubuntu 终端中执行以下命令验证 Docker 安装：

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version

# 运行测试容器
docker run hello-world
```

如果看到 "Hello from Docker!" 消息，说明 Docker 已正确安装。

---

## 第二部分：获取项目代码

### 2.1 从 Manus 平台导出

在 Manus 平台的 Management UI 中：

1. 点击右侧面板的 **Settings** 选项卡
2. 选择 **GitHub** 子菜单
3. 点击 **Export to GitHub** 将代码导出到您的 GitHub 仓库

### 2.2 克隆代码到本地

在 Ubuntu 终端中执行：

```bash
# 创建项目目录
mkdir -p ~/projects && cd ~/projects

# 克隆代码仓库
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git

# 进入项目目录
cd grt-implementation-plan
```

---

## 第三部分：配置环境变量

### 3.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
nano .env
```

### 3.2 必需的环境变量

根据您的实际情况填写以下环境变量：

```env
# ============================================
# 数据库配置
# ============================================
DATABASE_URL=mysql://grt:your_password@mysql:3306/grt_db
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_PASSWORD=your_password

# ============================================
# 认证配置
# ============================================
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=Your Name

# ============================================
# 应用配置
# ============================================
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=https://your-domain.com/logo.png
NODE_ENV=production

# ============================================
# AI 服务配置 (可选)
# ============================================
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_forge_api_key
GEMINI_API_KEY=your_gemini_api_key

# ============================================
# 第三方集成 (可选)
# ============================================
JIANDAOYUN_API_KEY=your_jiandaoyun_api_key
JIANDAOYUN_CORP_ID=your_jiandaoyun_corp_id
```

> **安全提示**: 请使用强密码，JWT_SECRET 至少应包含 32 个字符。切勿将 `.env` 文件提交到版本控制系统。

---

## 第四部分：启动服务

### 4.1 构建并启动容器

在项目根目录执行：

```bash
# 构建镜像并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4.2 服务端口说明

启动成功后，各服务将监听以下端口：

| 服务 | 端口 | 用途 |
|------|------|------|
| GRT 应用 | 3000 | 主应用服务 |
| MySQL | 3306 | 数据库服务 |
| Redis | 6379 | 缓存服务 |
| Adminer | 8080 | 数据库管理界面（开发模式） |

### 4.3 初始化数据库

首次启动时，需要执行数据库迁移：

```bash
# 进入应用容器
docker compose exec grt-app sh

# 执行数据库迁移
pnpm db:push

# 退出容器
exit
```

---

## 第五部分：Windows 网络配置

### 5.1 WSL 2 端口转发

如需从 Windows 主机或局域网其他设备访问服务，以管理员身份打开 PowerShell 执行：

```powershell
# 获取 WSL 2 的 IP 地址
$wslIP = (wsl hostname -I).Trim()
Write-Host "WSL IP: $wslIP"

# 添加端口转发规则
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=$wslIP

# 查看已配置的端口转发
netsh interface portproxy show all
```

### 5.2 防火墙配置

允许入站连接：

```powershell
# 允许 GRT 应用端口
New-NetFirewallRule -DisplayName "GRT System - App" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# 允许 Adminer 端口（开发环境）
New-NetFirewallRule -DisplayName "GRT System - Adminer" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### 5.3 访问应用

配置完成后，您可以通过以下地址访问：

- **GRT 应用**: http://localhost:3000
- **数据库管理**: http://localhost:8080（使用 grt/your_password 登录）

---

## 第六部分：日常运维

### 6.1 常用命令

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启特定服务
docker compose restart grt-app

# 查看实时日志
docker compose logs -f grt-app

# 进入容器执行命令
docker compose exec grt-app sh
```

### 6.2 数据备份

定期备份数据库：

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份数据库
docker compose exec mysql mysqldump -u root -p grt_db > ~/backups/grt_db_$(date +%Y%m%d).sql
```

### 6.3 更新部署

当有新版本发布时：

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build

# 执行数据库迁移（如有）
docker compose exec grt-app pnpm db:push
```

---

## 第七部分：故障排除

### 7.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 容器启动失败 | 端口被占用 | 检查并释放占用的端口 |
| 数据库连接失败 | 环境变量配置错误 | 检查 DATABASE_URL 格式 |
| 页面加载缓慢 | WSL 2 内存不足 | 增加 WSL 2 内存限制 |
| 无法访问服务 | 防火墙阻止 | 添加防火墙规则 |

### 7.2 查看容器日志

```bash
# 查看应用日志
docker compose logs grt-app

# 查看数据库日志
docker compose logs mysql

# 实时跟踪所有日志
docker compose logs -f
```

### 7.3 重置环境

如需完全重置环境：

```bash
# 停止并删除所有容器和数据卷
docker compose down -v

# 删除所有镜像
docker compose down --rmi all

# 重新构建
docker compose up -d --build
```

---

## 方案B：Docker Desktop Hyper-V 模式（无需Ubuntu）

如果您不想安装 WSL 2 和 Ubuntu，可以使用 Docker Desktop 的 Hyper-V 模式。这种方式完全在 Windows 原生环境中运行，无需安装任何 Linux 发行版。

### B.1 安装 Docker Desktop (Hyper-V 模式)

首先确保您的 Windows 11 已启用 Hyper-V 功能。以管理员身份打开 PowerShell，执行以下命令：

```powershell
# 启用 Hyper-V
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# 重启计算机后继续
Restart-Computer
```

从 Docker 官网下载 Docker Desktop for Windows，安装时选择以下选项：

- **取消勾选** "Use WSL 2 instead of Hyper-V"
- 勾选 "Add shortcut to desktop"

### B.2 配置和运行

安装完成后，打开 PowerShell（普通模式即可），执行以下命令：

```powershell
# 克隆项目代码
cd C:\Projects
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git
cd grt-implementation-plan

# 复制环境变量文件
copy .env.example .env

# 编辑 .env 文件，填写必要的配置
notepad .env

# 启动服务
docker compose up -d --build

# 查看服务状态
docker compose ps
```

启动成功后，访问 http://localhost:3000 即可使用系统。

### B.3 注意事项

Hyper-V 模式与 WSL 2 模式相比，文件系统性能略低，但对于大多数应用场景已经足够。如果遇到性能问题，建议切换到 WSL 2 模式。

---

## 方案C：原生 Windows 部署（无需Docker）

如果您不想使用 Docker，可以直接在 Windows 上安装所需的运行时环境。这种方式适合开发调试或小规模部署。

### C.1 安装依赖软件

需要安装以下软件：

| 软件 | 版本 | 下载地址 |
|------|------|----------|
| Node.js | 22 LTS | https://nodejs.org/ |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/installer/ |
| Git | 最新版 | https://git-scm.com/download/win |
| Redis (可选) | 7.0+ | https://github.com/microsoftarchive/redis/releases |

### C.2 安装步骤

安装 Node.js 时，请确保勾选 "Add to PATH" 选项。安装 MySQL 时，记住设置的 root 密码。

```powershell
# 验证 Node.js 安装
node --version  # 应显示 v22.x.x
npm --version

# 安装 pnpm 包管理器
npm install -g pnpm

# 验证 pnpm
pnpm --version
```

### C.3 配置数据库

打开 MySQL 命令行客户端或 MySQL Workbench，创建数据库和用户：

```sql
-- 创建数据库
CREATE DATABASE grt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER 'grt'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON grt_db.* TO 'grt'@'localhost';
FLUSH PRIVILEGES;
```

### C.4 运行项目

```powershell
# 克隆项目
cd C:\Projects
git clone https://github.com/YOUR_USERNAME/grt-implementation-plan.git
cd grt-implementation-plan

# 安装依赖
pnpm install

# 配置环境变量
copy .env.example .env
notepad .env
```

编辑 `.env` 文件，设置数据库连接：

```env
DATABASE_URL=mysql://grt:your_password@localhost:3306/grt_db
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
NODE_ENV=development
```

继续执行：

```powershell
# 初始化数据库
pnpm db:push

# 启动开发服务器
pnpm dev
```

启动成功后，访问 http://localhost:3000 即可使用系统。

### C.5 生产环境部署

对于生产环境，建议使用 PM2 进程管理器：

```powershell
# 安装 PM2
npm install -g pm2

# 构建生产版本
pnpm build

# 使用 PM2 启动
pm2 start dist/index.js --name grt-system

# 设置开机自启
pm2 save
pm2 startup
```

---

## 方案D：Manus 平台托管（零配置）

如果您只需要快速上线或演示系统，最简单的方式是使用 Manus 平台的内置托管服务。无需安装任何软件，无需配置服务器。

### D.1 发布步骤

在 Manus 平台的 Management UI 中：

1. 确保已保存最新的 Checkpoint
2. 点击右上角的 **Publish** 按钮
3. 等待部署完成（通常 1-3 分钟）
4. 获取自动分配的域名（如 `grtplan-xxx.manus.space`）

### D.2 自定义域名

如需使用自定义域名，在 Management UI 中：

1. 点击 **Settings** → **Domains**
2. 选择以下选项之一：
   - 修改自动生成的域名前缀
   - 在 Manus 平台内购买新域名
   - 绑定您已有的自定义域名

### D.3 优势与限制

| 优势 | 限制 |
|------|------|
| 零配置，即时上线 | 依赖 Manus 平台可用性 |
| 自动 SSL 证书 | 数据存储在平台侧 |
| 内置 CDN 加速 | 无法完全控制服务器 |
| 自动扩容 | 可能有资源限制 |

> **提示**: 对于生产环境或需要完全控制数据的场景，建议使用方案A、B或C进行本地部署。

---

## 附录：文件结构

```
grt-implementation-plan/
├── docker/
│   ├── Dockerfile           # 前端 Docker 镜像配置
│   ├── Dockerfile.backend   # 后端 Docker 镜像配置
│   ├── nginx.conf           # Nginx 主配置
│   ├── default.conf         # Nginx 站点配置
│   ├── init-db.sql          # 数据库初始化脚本
│   ├── ENV_VARIABLES.md     # 环境变量说明
│   └── DEPLOYMENT_GUIDE.md  # 本部署指南
├── docker-compose.yml       # Docker Compose 配置
├── .env.example             # 环境变量模板
├── client/                  # 前端源代码
├── server/                  # 后端源代码
└── drizzle/                 # 数据库 Schema
```

---

## 技术支持

如遇到部署问题，请通过以下渠道获取帮助：

- 提交 GitHub Issue
- 联系系统管理员
- 查阅 Manus 平台文档

---

*本文档由 Manus AI 自动生成，最后更新于 2026年2月5日*

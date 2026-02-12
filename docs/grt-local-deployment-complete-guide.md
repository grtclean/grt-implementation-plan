# GRT智能系统快速实施方案 - 本地化部署完整指南

> **版本**: 2.0  
> **更新日期**: 2026-01-18  
> **作者**: Manus AI  
> **适用系统**: Windows 10/11, macOS, Linux

---

## 概述

本文档提供GRT智能系统快速实施方案的完整本地化部署步骤，涵盖从环境准备到系统运行的全部流程。GRT系统是一套面向工业清洗设备行业的智能化管理平台，集成了CRM、项目管理、成本控制、AI助手等核心功能模块。

### 系统架构概览

GRT智能系统采用现代化的技术栈构建，主要组件包括：

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | React 19 + TypeScript | 响应式用户界面 |
| **样式系统** | Tailwind CSS 4 + shadcn/ui | 现代化UI组件库 |
| **后端框架** | Express 4 + tRPC 11 | 类型安全的API层 |
| **数据库** | MySQL/TiDB | 关系型数据存储 |
| **认证系统** | Manus OAuth | 企业级身份认证 |
| **AI集成** | LLM API | 智能助手功能 |
| **任务管理** | NocoBase（可选） | 低代码任务看板 |

---

## 第一部分：环境准备

### 1.1 系统要求

在开始部署之前，请确保您的系统满足以下最低要求：

| 操作系统 | 最低要求 | 推荐配置 |
|----------|----------|----------|
| **Windows** | Windows 10 64位 (版本2004+) | Windows 11 |
| **macOS** | macOS 12 Monterey | macOS 14 Sonoma |
| **Linux** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |

| 硬件配置 | 最低要求 | 推荐配置 |
|----------|----------|----------|
| **处理器** | 双核CPU | 四核CPU或更高 |
| **内存** | 4GB RAM | 8GB RAM或更高 |
| **磁盘空间** | 20GB可用空间 | 50GB SSD |

### 1.2 必需软件安装

#### 1.2.1 Node.js安装

GRT系统需要Node.js 18.x或更高版本。

**Windows安装步骤：**

1. 访问 [Node.js官网](https://nodejs.org/) 下载LTS版本（推荐v22.x）
2. 运行安装程序，选择默认选项
3. 打开PowerShell验证安装：

```powershell
node --version
npm --version
```

**macOS安装步骤：**

```bash
# 使用Homebrew安装
brew install node@22

# 验证安装
node --version
npm --version
```

**Linux安装步骤：**

```bash
# 使用NodeSource仓库
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 1.2.2 pnpm安装

pnpm是推荐的包管理器，提供更快的安装速度和更高效的磁盘使用。

```bash
# 全局安装pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

#### 1.2.3 Git安装

**Windows：** 访问 [Git官网](https://git-scm.com/download/win) 下载安装程序

**macOS：**
```bash
brew install git
```

**Linux：**
```bash
sudo apt-get install git
```

---

## 第二部分：GRT系统部署

### 2.1 获取项目代码

如果您已有项目代码，可以跳过此步骤。否则，请从版本控制系统克隆项目：

```bash
# 创建工作目录
mkdir -p ~/grt-projects
cd ~/grt-projects

# 克隆项目（如果有远程仓库）
# git clone <repository-url> grt-implementation-plan

# 或者解压已有的项目包
# unzip grt-implementation-plan.zip
```

### 2.2 安装项目依赖

进入项目目录并安装所有依赖：

```bash
cd grt-implementation-plan

# 安装依赖
pnpm install

# 如果遇到权限问题，使用以下命令
# sudo pnpm install
```

### 2.3 数据库配置

GRT系统使用MySQL/TiDB作为数据存储。您有以下几种选择：

#### 选项A：使用云数据库（推荐）

如果您使用Manus平台部署，数据库已自动配置。环境变量`DATABASE_URL`会自动注入。

#### 选项B：本地MySQL安装

**Windows安装MySQL：**

1. 访问 [MySQL官网](https://dev.mysql.com/downloads/installer/) 下载MySQL Installer
2. 选择"Developer Default"安装类型
3. 设置root密码（记住此密码）
4. 完成安装后，创建GRT数据库：

```sql
-- 使用MySQL命令行或Workbench
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;
```

**macOS/Linux安装MySQL：**

```bash
# macOS
brew install mysql
brew services start mysql

# Linux
sudo apt-get install mysql-server
sudo systemctl start mysql
```

#### 选项C：使用Docker运行MySQL

```bash
docker run -d \
  --name grt-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=grt_system \
  -e MYSQL_USER=grt_user \
  -e MYSQL_PASSWORD=your_secure_password \
  -p 3306:3306 \
  mysql:8.0
```

### 2.4 环境变量配置

在项目根目录创建`.env`文件（如果不存在）：

```bash
# 复制示例配置
cp .env.example .env
```

编辑`.env`文件，配置以下关键变量：

```env
# 数据库配置
DATABASE_URL=mysql://grt_user:your_secure_password@localhost:3306/grt_system

# JWT密钥（生成一个随机字符串）
JWT_SECRET=your-random-jwt-secret-key-here

# 应用配置
VITE_APP_TITLE=GRT智能系统
VITE_APP_ID=grt-system

# OAuth配置（如果使用Manus OAuth）
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# LLM API配置（AI助手功能）
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your-forge-api-key
```

### 2.5 数据库初始化

运行数据库迁移脚本，创建所有必需的表：

```bash
# 生成并执行数据库迁移
pnpm db:push
```

如果遇到错误，可以尝试手动执行：

```bash
# 生成迁移文件
npx drizzle-kit generate

# 执行迁移
npx drizzle-kit migrate
```

### 2.6 启动开发服务器

```bash
# 启动开发服务器
pnpm dev
```

服务器启动后，您可以通过以下地址访问系统：

- **本地访问**: http://localhost:3000
- **局域网访问**: http://[您的IP地址]:3000

---

## 第三部分：NocoBase任务管理系统部署（可选）

NocoBase是一个开源的低代码平台，可用于管理AI助手开发任务。

### 3.1 Docker方式部署（推荐）

#### 3.1.1 安装Docker Desktop

**Windows：**

1. 确保已启用WSL2（Windows Subsystem for Linux 2）
2. 访问 [Docker Desktop官网](https://www.docker.com/products/docker-desktop/) 下载安装程序
3. 运行安装程序，勾选"Use WSL 2 instead of Hyper-V"
4. 重启计算机完成安装

**macOS：**

```bash
brew install --cask docker
```

**Linux：**

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt-get install docker-compose-plugin
```

#### 3.1.2 创建NocoBase配置

在项目的`scripts/nocobase`目录下已有预配置的docker-compose.yml文件。您也可以创建自定义配置：

```bash
# 创建NocoBase目录
mkdir -p ~/nocobase
cd ~/nocobase

# 创建docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nocobase:
    image: nocobase/nocobase:latest
    container_name: nocobase-app
    restart: unless-stopped
    ports:
      - "13000:80"
    environment:
      - DB_DIALECT=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_DATABASE=nocobase
      - DB_USER=nocobase
      - DB_PASSWORD=nocobase_password_2026
      - APP_KEY=grt-nocobase-secret-key-2026
      - INIT_ROOT_EMAIL=admin@grt.com
      - INIT_ROOT_PASSWORD=GRT@admin2026
      - INIT_ROOT_NICKNAME=GRT管理员
    volumes:
      - nocobase_storage:/app/storage
    depends_on:
      - postgres
    networks:
      - nocobase-network

  postgres:
    image: postgres:15-alpine
    container_name: nocobase-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=nocobase
      - POSTGRES_USER=nocobase
      - POSTGRES_PASSWORD=nocobase_password_2026
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nocobase-network

volumes:
  nocobase_storage:
  postgres_data:

networks:
  nocobase-network:
    driver: bridge
EOF
```

#### 3.1.3 启动NocoBase

```bash
cd ~/nocobase
docker compose up -d

# 查看启动日志
docker compose logs -f nocobase
```

等待约2-3分钟后，访问 http://localhost:13000 即可使用NocoBase。

**默认登录凭据：**
- 用户名: admin@grt.com
- 密码: GRT@admin2026

### 3.2 导入AI助手开发任务

项目中已包含17个AI助手开发任务的JSON数据文件，位于`scripts/nocobase/ai-assistant-tasks.json`。

使用以下步骤导入任务：

1. 登录NocoBase管理界面
2. 创建新的数据表"AI助手任务"，包含以下字段：
   - 任务ID（单行文本）
   - 任务名称（单行文本）
   - 阶段（单选：Phase 1-5）
   - 优先级（单选：P0/P1/P2）
   - 状态（单选：待开始/进行中/已完成）
   - 负责人（单行文本）
   - 描述（多行文本）
3. 使用NocoBase的导入功能导入JSON数据

或者使用项目提供的导入脚本：

```bash
cd grt-implementation-plan
node scripts/nocobase/import-tasks.mjs --url http://localhost:13000
```

---

## 第四部分：简道云数据迁移

如果您之前使用简道云管理数据，可以将数据迁移到GRT系统或NocoBase。

### 4.1 获取简道云API凭据

1. 登录简道云管理后台
2. 进入 **管理后台** > **开放平台** > **API管理**
3. 创建或获取API Key
4. 记录企业ID (Corp ID)和API Key

### 4.2 运行迁移脚本

项目中包含简道云数据迁移脚本，位于`docs/jiandaoyun-migration-guide.md`。

**Windows PowerShell：**

```powershell
# 设置API凭据
$env:JIANDAOYUN_CORP_ID = "your-corp-id"
$env:JIANDAOYUN_API_KEY = "your-api-key"

# 运行迁移脚本
cd grt-implementation-plan
node scripts/migrate-jiandaoyun.mjs
```

**macOS/Linux：**

```bash
# 设置API凭据
export JIANDAOYUN_CORP_ID="your-corp-id"
export JIANDAOYUN_API_KEY="your-api-key"

# 运行迁移脚本
cd grt-implementation-plan
node scripts/migrate-jiandaoyun.mjs
```

---

## 第五部分：Claude Code安装（AI开发助手）

Claude Code是Anthropic提供的AI编程助手，可以帮助您进行GRT系统的二次开发。

### 5.1 安装Claude Code CLI

```bash
# 使用npm全局安装
npm install -g @anthropic-ai/claude-code

# 验证安装
claude --version
```

### 5.2 配置API密钥

1. 访问 [Anthropic Console](https://console.anthropic.com/) 获取API密钥
2. 配置环境变量：

**Windows PowerShell：**

```powershell
# 永久设置
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your-api-key", "User")

# 重启PowerShell后生效
```

**macOS/Linux：**

```bash
# 添加到~/.bashrc或~/.zshrc
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.bashrc
source ~/.bashrc
```

### 5.3 在项目中使用Claude Code

```bash
cd grt-implementation-plan

# 初始化Claude Code项目
claude init

# 开始交互式开发
claude chat
```

---

## 第六部分：系统验证

### 6.1 功能检查清单

完成部署后，请验证以下功能是否正常：

| 功能模块 | 验证步骤 | 预期结果 |
|----------|----------|----------|
| **首页仪表盘** | 访问 / 路径 | 显示系统负载、培训统计等 |
| **实施路径** | 点击侧边栏"实施路径" | 显示M0-M12阶段甘特图 |
| **工具推荐** | 点击侧边栏"工具推荐" | 显示工具列表和推荐 |
| **风险控制** | 点击侧边栏"风险控制" | 显示风险矩阵和预警 |
| **系统分析** | 点击侧边栏"系统分析" | 显示分析仪表盘 |
| **AI助手** | 点击侧边栏"AI助手" | 显示Solution/Quotation/Planning/KPI助手 |
| **项目管理** | 点击侧边栏"项目管理" | 显示项目列表（可能为空） |
| **成本管理** | 点击侧边栏"成本管理" | 显示成本分析界面 |

### 6.2 运行单元测试

```bash
cd grt-implementation-plan

# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm vitest run server/auth.logout.test.ts
```

### 6.3 检查服务器日志

```bash
# 查看开发服务器输出
# 日志会直接显示在运行pnpm dev的终端中

# 如果使用Docker部署NocoBase
docker compose logs -f nocobase
```

---

## 第七部分：故障排除

### 7.1 常见问题及解决方案

#### 问题1：pnpm install失败

**症状：** 安装依赖时出现网络错误或权限错误

**解决方案：**

```bash
# 清除缓存
pnpm store prune

# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

#### 问题2：数据库连接失败

**症状：** 启动时报错"Connection refused"或"Access denied"

**解决方案：**

1. 检查MySQL服务是否运行：
   ```bash
   # Windows
   net start mysql
   
   # macOS/Linux
   sudo systemctl status mysql
   ```

2. 验证数据库凭据：
   ```bash
   mysql -u grt_user -p -h localhost grt_system
   ```

3. 检查.env文件中的DATABASE_URL格式是否正确

#### 问题3：端口被占用

**症状：** 启动时报错"Port 3000 is already in use"

**解决方案：**

```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# 终止进程或使用其他端口
# 在.env中添加: PORT=3001
```

#### 问题4：TypeScript编译错误

**症状：** 启动时出现类型错误

**解决方案：**

```bash
# 清除构建缓存
rm -rf node_modules/.vite
rm -rf dist

# 重新安装依赖
pnpm install

# 重新启动
pnpm dev
```

#### 问题5：Docker容器无法启动

**症状：** NocoBase容器启动失败

**解决方案：**

```bash
# 查看详细日志
docker compose logs nocobase

# 检查端口冲突
docker ps -a

# 重新创建容器
docker compose down
docker compose up -d
```

### 7.2 获取帮助

如果遇到无法解决的问题，请：

1. 查看项目文档目录`docs/`中的相关指南
2. 检查`todo.md`文件了解已知问题
3. 联系技术支持团队

---

## 附录

### A. 项目目录结构

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── contexts/      # React上下文
│   │   ├── hooks/         # 自定义Hooks
│   │   └── lib/           # 工具库
│   └── public/            # 静态资源
├── server/                 # 后端代码
│   ├── _core/             # 核心框架
│   ├── ai-assistants/     # AI助手模块
│   ├── integrations/      # 第三方集成
│   └── routers.ts         # tRPC路由
├── drizzle/               # 数据库Schema
├── docs/                  # 项目文档
├── scripts/               # 部署脚本
│   └── nocobase/          # NocoBase相关脚本
├── shared/                # 共享类型和常量
└── todo.md                # 任务追踪
```

### B. 重要配置文件

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置 |
| `package.json` | 项目依赖和脚本 |
| `drizzle.config.ts` | 数据库配置 |
| `vite.config.ts` | 前端构建配置 |
| `tsconfig.json` | TypeScript配置 |

### C. 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm test` | 运行单元测试 |
| `pnpm db:push` | 同步数据库Schema |
| `pnpm format` | 格式化代码 |

---

**文档版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 2.0 | 2026-01-18 | 整合Windows/macOS/Linux部署指南 |
| 1.0 | 2026-01-17 | 初始版本 |

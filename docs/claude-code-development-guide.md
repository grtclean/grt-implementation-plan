# Claude Code 开发环境设置指南

**版本**: 1.0  
**日期**: 2026年1月17日  
**作者**: Manus AI  
**适用对象**: 使用Claude Code进行GRT系统开发的工程师

---

## 目录

1. [开发与部署模式选择](#1-开发与部署模式选择)
2. [推荐开发流程](#2-推荐开发流程)
3. [Claude Code基础条件设置](#3-claude-code基础条件设置)
4. [三层协作模式详解](#4-三层协作模式详解)
5. [从开发到部署的完整流程](#5-从开发到部署的完整流程)

---

## 1. 开发与部署模式选择

### 1.1 两种模式对比

| 对比维度 | 模式A: 先云端部署后开发 | 模式B: 先本地开发后部署（推荐） |
|----------|------------------------|-------------------------------|
| **开发效率** | 较低，每次修改需等待部署 | 高，本地即时预览 |
| **成本** | 高，开发期间持续产生云费用 | 低，仅上线时产生费用 |
| **调试便利性** | 困难，需要远程调试 | 方便，本地断点调试 |
| **团队协作** | 复杂，需要多套环境 | 简单，各自本地开发 |
| **风险** | 高，可能影响生产数据 | 低，隔离开发环境 |
| **适用场景** | 已有生产系统的维护 | 新系统开发 |

### 1.2 推荐方案

**对于GRT系统的开发，强烈推荐采用模式B：先本地开发，后部署到阿里云**。

开发阶段使用以下环境组合：

```
┌─────────────────────────────────────────────────────────────┐
│                    开发阶段（无需阿里云）                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   Manus     │    │ Claude Code │    │  NocoBase   │    │
│   │  (规划+UI)  │◄──►│  (核心开发) │◄──►│ (低代码配置)│    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│          │                  │                  │            │
│          ▼                  ▼                  ▼            │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              本地开发环境 / Manus沙箱                 │  │
│   │  • Docker (MySQL + Redis)                           │  │
│   │  • Node.js 22 + pnpm                                │  │
│   │  • VS Code / Cursor                                 │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 开发完成，准备上线
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    部署阶段（购买阿里云）                      │
├─────────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────────┐  │
│   │                   阿里云生产环境                      │  │
│   │  • ECS (应用服务器)                                  │  │
│   │  • RDS MySQL (数据库)                               │  │
│   │  • Redis (缓存)                                     │  │
│   │  • OSS (文件存储)                                   │  │
│   │  • SLB (负载均衡)                                   │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 推荐开发流程

### 2.1 整体流程

```
Phase 1: 规划设计（Manus）
    │
    ├── 需求分析与功能规划
    ├── 创建实施规划文档
    ├── 设计数据库Schema
    └── 生成Claude Code实施指南
    │
    ▼
Phase 2: 核心开发（Claude Code）
    │
    ├── 设置本地开发环境
    ├── 按照规划文档实施功能
    ├── 编写单元测试
    └── 本地测试验证
    │
    ▼
Phase 3: 低代码配置（NocoBase，可选）
    │
    ├── 配置业务表单
    ├── 设置工作流
    └── 自定义报表
    │
    ▼
Phase 4: 集成测试（Manus）
    │
    ├── 功能验收测试
    ├── Bug修复
    └── 性能优化
    │
    ▼
Phase 5: 部署上线（阿里云）
    │
    ├── 购买云资源
    ├── 配置生产环境
    └── 部署应用
```

### 2.2 时间节点建议

| 阶段 | 预计时间 | 是否需要阿里云 |
|------|----------|----------------|
| Phase 1: 规划设计 | 1-2周 | ❌ 不需要 |
| Phase 2: 核心开发 | 4-8周 | ❌ 不需要 |
| Phase 3: 低代码配置 | 1-2周 | ❌ 不需要 |
| Phase 4: 集成测试 | 1-2周 | ❌ 不需要 |
| Phase 5: 部署上线 | 1周 | ✅ 需要 |

**结论**：在项目的前10-14周（开发阶段），完全不需要购买阿里云资源，可以节省约3000-5000元的云费用。

---

## 3. Claude Code基础条件设置

### 3.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核 | 8核+ |
| 内存 | 8GB | 16GB+ |
| 磁盘 | 50GB SSD | 100GB+ SSD |
| 网络 | 稳定的互联网连接 | 10Mbps+ |

### 3.2 软件环境安装

#### 3.2.1 Windows环境

```powershell
# 1. 安装Chocolatey包管理器（管理员PowerShell）
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. 安装开发工具
choco install nodejs-lts git docker-desktop -y

# 3. 安装pnpm
npm install -g pnpm

# 4. 安装Claude Code（通过VS Code扩展或Cursor）
# 方式A: 安装VS Code + Claude扩展
choco install vscode -y
# 然后在VS Code中安装 "Claude" 扩展

# 方式B: 安装Cursor（内置Claude）
# 从 https://cursor.sh 下载安装

# 5. 验证安装
node -v      # 应显示 v20.x 或 v22.x
pnpm -v      # 应显示 v8.x 或 v9.x
git --version
docker --version
```

#### 3.2.2 macOS环境

```bash
# 1. 安装Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装开发工具
brew install node@22 git
brew install --cask docker

# 3. 安装pnpm
npm install -g pnpm

# 4. 安装Claude Code
# 方式A: 安装VS Code + Claude扩展
brew install --cask visual-studio-code
# 然后在VS Code中安装 "Claude" 扩展

# 方式B: 安装Cursor
brew install --cask cursor

# 5. 验证安装
node -v
pnpm -v
git --version
docker --version
```

#### 3.2.3 Linux (Ubuntu)环境

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装pnpm
sudo npm install -g pnpm

# 4. 安装Git
sudo apt install -y git

# 5. 安装Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录以生效

# 6. 安装VS Code
sudo snap install code --classic

# 7. 验证安装
node -v
pnpm -v
git --version
docker --version
```

### 3.3 项目初始化

#### 3.3.1 从Manus获取项目代码

```bash
# 方式1: 从Manus导出到GitHub后克隆
# 在Manus管理界面 → Settings → GitHub → 导出到仓库
git clone https://github.com/your-org/grt-system.git
cd grt-system

# 方式2: 直接下载Manus项目文件
# 在Manus管理界面 → Code → 下载所有文件
# 解压到本地目录
```

#### 3.3.2 安装项目依赖

```bash
# 进入项目目录
cd grt-system

# 安装依赖
pnpm install
```

#### 3.3.3 启动本地数据库

创建 `docker-compose.dev.yml` 文件：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: grt-mysql-dev
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: grt_development
      MYSQL_USER: grt_app
      MYSQL_PASSWORD: devpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    container_name: grt-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

启动数据库：

```bash
# 启动MySQL和Redis
docker-compose -f docker-compose.dev.yml up -d

# 查看状态
docker-compose -f docker-compose.dev.yml ps

# 等待MySQL完全启动（约10-15秒）
sleep 15
```

#### 3.3.4 配置环境变量

创建 `.env` 文件：

```bash
# 复制模板
cp .env.example .env

# 编辑环境变量
```

`.env` 内容：

```bash
# 数据库配置（本地Docker）
DATABASE_URL="mysql://grt_app:devpassword@localhost:3306/grt_development"

# Redis配置（本地Docker）
REDIS_URL="redis://localhost:6379"

# JWT密钥（开发环境可以使用简单值）
JWT_SECRET="dev-jwt-secret-key-for-local-development"

# 应用配置
NODE_ENV="development"
VITE_APP_TITLE="GRT智能系统(开发)"
VITE_APP_ID="grt-dev"

# OSS配置（开发阶段可以先留空，使用本地存储）
# OSS_ACCESS_KEY_ID=""
# OSS_ACCESS_KEY_SECRET=""
# OSS_BUCKET=""
# OSS_REGION=""
```

#### 3.3.5 初始化数据库

```bash
# 同步数据库Schema
pnpm db:push

# 查看数据库状态（可选）
pnpm drizzle-kit studio
```

#### 3.3.6 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 应用将在 http://localhost:3000 运行
```

### 3.4 Claude Code配置

#### 3.4.1 VS Code + Claude扩展

1. 打开VS Code
2. 按 `Ctrl+Shift+X` 打开扩展市场
3. 搜索 "Claude" 或 "Anthropic"
4. 安装官方Claude扩展
5. 配置API密钥（如果需要）

#### 3.4.2 Cursor配置

Cursor内置了Claude支持，直接使用即可：

1. 下载并安装Cursor: https://cursor.sh
2. 打开项目文件夹
3. 使用 `Ctrl+K` 或 `Cmd+K` 调用Claude

#### 3.4.3 Claude Code最佳实践

**项目上下文设置**：

在项目根目录创建 `.cursorrules` 或 `CLAUDE.md` 文件，提供项目上下文：

```markdown
# GRT智能系统开发指南

## 项目概述
GRT智能系统是一个工业清洗设备供应商的企业管理系统，包含：
- AI方案设计系统
- BOM物料管理系统
- 项目全生命周期管理
- 成本预警系统

## 技术栈
- 前端: React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- 后端: Node.js + Express + tRPC
- 数据库: MySQL 8.0 (Drizzle ORM)
- 缓存: Redis 7

## 开发规范
1. 所有API使用tRPC定义在 server/routers.ts
2. 数据库操作封装在 server/db.ts
3. 前端页面放在 client/src/pages/
4. 共享类型定义在 shared/types.ts

## 文件结构
- docs/dev-specs/ - 开发规划文档
- todo.md - 任务清单
- drizzle/schema.ts - 数据库Schema

## 开发流程
1. 阅读 docs/dev-specs/ 中的规划文档
2. 按照文档中的步骤实施
3. 编写单元测试
4. 更新 todo.md 标记完成
```

---

## 4. 三层协作模式详解

### 4.1 角色分工

```
┌────────────────────────────────────────────────────────────────┐
│                     Manus（规划层）                             │
├────────────────────────────────────────────────────────────────┤
│ 职责:                                                          │
│ • 需求分析与功能规划                                            │
│ • 创建详细的实施规划文档                                        │
│ • 设计数据库Schema和API接口                                     │
│ • UI/UX设计和原型                                              │
│ • 功能验收和Bug检查                                            │
│ • 文档维护和版本管理                                            │
│                                                                │
│ 输出物:                                                        │
│ • docs/dev-specs/vX.X.X/*.md (实施规划文档)                    │
│ • todo.md (任务清单)                                           │
│ • drizzle/schema.ts (数据库设计)                               │
│ • UI设计稿和交互说明                                            │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ 规划文档
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                   Claude Code（开发层）                         │
├────────────────────────────────────────────────────────────────┤
│ 职责:                                                          │
│ • 按照规划文档实施具体功能                                      │
│ • 编写后端API (server/routers.ts, server/db.ts)               │
│ • 编写前端组件 (client/src/pages/, client/src/components/)    │
│ • 编写单元测试 (server/*.test.ts)                             │
│ • 代码重构和性能优化                                            │
│                                                                │
│ 输入:                                                          │
│ • Manus提供的规划文档                                          │
│ • 数据库Schema设计                                             │
│ • API接口定义                                                  │
│                                                                │
│ 输出:                                                          │
│ • 可运行的代码                                                  │
│ • 单元测试                                                      │
│ • 更新后的todo.md                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ 核心功能代码
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                   NocoBase（配置层，可选）                       │
├────────────────────────────────────────────────────────────────┤
│ 职责:                                                          │
│ • 快速配置业务表单和列表                                        │
│ • 设置审批工作流                                                │
│ • 创建数据报表和仪表盘                                          │
│ • 权限和角色管理                                                │
│                                                                │
│ 适用场景:                                                       │
│ • 简单的CRUD操作                                                │
│ • 标准化的审批流程                                              │
│ • 快速原型验证                                                  │
│                                                                │
│ 不适用场景:                                                     │
│ • 复杂的业务逻辑（如AI推荐）                                    │
│ • 高性能要求的功能                                              │
│ • 深度定制的UI                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 协作流程示例

以"AI方案设计系统"为例：

```
Step 1: Manus规划
├── 创建 docs/dev-specs/v2.0-core-business/module1-ai-solution-design.md
├── 设计数据库表（historicalCases, solutionRecommendations等）
├── 定义API接口（case.create, case.list, ai.recommend等）
└── 更新 todo.md 添加任务清单

Step 2: Claude Code开发
├── 阅读规划文档
├── 实现数据库Schema (drizzle/schema.ts)
├── 实现API路由 (server/routers.ts)
├── 实现数据库操作 (server/db.ts)
├── 实现前端页面 (client/src/pages/AISolutionDesign.tsx)
├── 编写单元测试 (server/ai-solution.test.ts)
└── 更新 todo.md 标记完成

Step 3: Manus验收
├── 运行单元测试
├── 浏览器功能测试
├── Bug修复
└── 保存检查点

Step 4: NocoBase配置（可选）
├── 配置案例管理表单
├── 设置案例审批流程
└── 创建案例统计报表
```

### 4.3 文档交接规范

**Manus输出给Claude Code的文档应包含**：

1. **功能概述** - 简要说明功能目的和业务价值
2. **数据库Schema** - 完整的表结构定义，包含字段说明
3. **API设计** - 接口路径、参数、返回值定义
4. **前端组件** - 页面结构、组件列表、交互说明
5. **实施步骤** - 按顺序的开发步骤
6. **测试用例** - 需要覆盖的测试场景
7. **检查清单** - 完成标准

---

## 5. 从开发到部署的完整流程

### 5.1 开发阶段检查清单

在准备部署到阿里云之前，确保完成以下检查：

```markdown
## 开发完成检查清单

### 功能完整性
- [ ] 所有规划功能已实现
- [ ] todo.md中的任务全部标记为完成
- [ ] 单元测试全部通过

### 代码质量
- [ ] TypeScript编译无错误
- [ ] ESLint检查通过
- [ ] 代码已格式化

### 安全性
- [ ] 敏感信息未硬编码
- [ ] API接口有权限控制
- [ ] 输入验证已实现

### 性能
- [ ] 数据库查询已优化
- [ ] 前端资源已压缩
- [ ] 图片已优化

### 文档
- [ ] API文档已更新
- [ ] 部署文档已准备
- [ ] 环境变量清单已整理
```

### 5.2 部署前准备

当开发完成，准备部署到阿里云时：

```bash
# 1. 构建生产版本
pnpm build

# 2. 运行生产环境测试
NODE_ENV=production pnpm test

# 3. 检查构建产物
ls -la dist/

# 4. 准备环境变量清单
cat > .env.production.example << 'EOF'
# 必填项
DATABASE_URL=mysql://user:pass@host:3306/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret

# OSS配置
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_REGION=

# 应用配置
NODE_ENV=production
VITE_APP_TITLE=GRT智能系统
EOF
```

### 5.3 阿里云资源购买时机

| 资源 | 购买时机 | 说明 |
|------|----------|------|
| 域名 | 开发中期 | ICP备案需要15-20天 |
| SSL证书 | 域名备案后 | 可用免费证书 |
| ECS服务器 | 部署前1周 | 按需购买 |
| RDS数据库 | 部署前1周 | 按需购买 |
| Redis | 部署前1周 | 按需购买 |
| OSS存储 | 部署前1周 | 按需购买 |
| SLB负载均衡 | 部署时 | 可选 |

### 5.4 部署执行

参考 [阿里云部署实施指南](./aliyun-deployment-implementation.md) 执行部署。

---

## 总结

**推荐的开发部署流程**：

1. **现在开始** - 使用Manus + Claude Code在本地/沙箱环境开发
2. **开发期间** - 不需要购买任何阿里云资源
3. **开发中期** - 申请域名和ICP备案（需要15-20天）
4. **开发完成** - 购买阿里云资源并部署

这种方式可以：
- 节省3000-5000元的开发期云费用
- 提高开发效率（本地调试更快）
- 降低风险（不会影响生产数据）
- 灵活调整（随时修改架构设计）

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI

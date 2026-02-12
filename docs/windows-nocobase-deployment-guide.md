# Windows本地服务器NocoBase完整部署指南

> **版本**: 1.0  
> **更新日期**: 2026-01-18  
> **作者**: Manus AI  
> **适用系统**: Windows 10/11

---

## 目录

1. [系统要求](#1-系统要求)
2. [环境准备](#2-环境准备)
3. [Docker Desktop安装](#3-docker-desktop安装)
4. [NocoBase部署](#4-nocobase部署)
5. [简道云数据迁移](#5-简道云数据迁移)
6. [Claude Code安装](#6-claude-code安装)
7. [AI助手任务导入](#7-ai助手任务导入)
8. [故障排除](#8-故障排除)

---

## 1. 系统要求

在开始部署之前，请确保您的Windows系统满足以下最低要求：

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10 64位 (版本2004+) | Windows 11 |
| **处理器** | 双核CPU | 四核CPU或更高 |
| **内存** | 4GB RAM | 8GB RAM或更高 |
| **磁盘空间** | 20GB可用空间 | 50GB SSD |
| **虚拟化** | 启用Hyper-V或WSL2 | WSL2 |

### 1.1 检查系统信息

打开PowerShell（以管理员身份运行），执行以下命令检查系统配置：

```powershell
# 检查Windows版本
winver

# 检查系统信息
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"Total Physical Memory"

# 检查虚拟化是否启用
systeminfo | findstr /C:"Hyper-V"
```

### 1.2 启用WSL2（推荐）

WSL2是在Windows上运行Docker的推荐方式。执行以下命令启用WSL2：

```powershell
# 以管理员身份运行PowerShell
wsl --install

# 设置WSL2为默认版本
wsl --set-default-version 2

# 重启计算机后继续
```

---

## 2. 环境准备

### 2.1 安装Node.js

NocoBase需要Node.js 18.x或更高版本。

1. 访问 [Node.js官网](https://nodejs.org/) 下载LTS版本
2. 运行安装程序，选择默认选项
3. 验证安装：

```powershell
node --version
npm --version
```

### 2.2 安装pnpm（推荐）

```powershell
npm install -g pnpm
pnpm --version
```

### 2.3 安装Git

1. 访问 [Git官网](https://git-scm.com/download/win) 下载安装程序
2. 运行安装程序，选择默认选项
3. 验证安装：

```powershell
git --version
```

---

## 3. Docker Desktop安装

### 3.1 下载Docker Desktop

1. 访问 [Docker Desktop官网](https://www.docker.com/products/docker-desktop/)
2. 点击"Download for Windows"下载安装程序
3. 运行`Docker Desktop Installer.exe`

### 3.2 安装配置

安装过程中，确保勾选以下选项：
- ✅ Use WSL 2 instead of Hyper-V
- ✅ Add shortcut to desktop

### 3.3 启动Docker Desktop

1. 安装完成后，启动Docker Desktop
2. 等待Docker引擎启动（状态栏图标变为绿色）
3. 验证安装：

```powershell
docker --version
docker compose version
```

### 3.4 配置Docker资源

打开Docker Desktop设置（Settings）：
1. 进入 **Resources** > **WSL Integration**
2. 启用您的WSL发行版
3. 进入 **Resources** > **Advanced**
4. 设置内存限制（建议4GB以上）
5. 点击 **Apply & Restart**

---

## 4. NocoBase部署

### 4.1 方案A：Docker部署（推荐）

#### 4.1.1 创建项目目录

```powershell
# 创建NocoBase目录
mkdir C:\nocobase
cd C:\nocobase
```

#### 4.1.2 创建docker-compose.yml

创建文件 `C:\nocobase\docker-compose.yml`，内容如下：

```yaml
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
```

#### 4.1.3 启动NocoBase

```powershell
cd C:\nocobase
docker compose up -d

# 查看启动日志
docker compose logs -f nocobase
```

#### 4.1.4 访问NocoBase

等待约2-3分钟后，打开浏览器访问：
- **地址**: http://localhost:13000
- **用户名**: admin@grt.com
- **密码**: GRT@admin2026

### 4.2 方案B：源码部署（无Docker）

如果无法使用Docker，可以使用源码方式部署。

#### 4.2.1 安装PostgreSQL

1. 访问 [PostgreSQL官网](https://www.postgresql.org/download/windows/) 下载安装程序
2. 安装时设置：
   - 端口：5432
   - 用户名：postgres
   - 密码：postgres_password_2026
3. 创建数据库：

```powershell
# 使用psql连接
psql -U postgres

# 创建数据库和用户
CREATE DATABASE nocobase;
CREATE USER nocobase WITH PASSWORD 'nocobase_password_2026';
GRANT ALL PRIVILEGES ON DATABASE nocobase TO nocobase;
\q
```

#### 4.2.2 克隆NocoBase

```powershell
cd C:\
git clone https://github.com/nocobase/nocobase.git
cd nocobase
```

#### 4.2.3 安装依赖

```powershell
pnpm install
```

#### 4.2.4 配置环境变量

创建文件 `C:\nocobase\.env`：

```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=nocobase
DB_USER=nocobase
DB_PASSWORD=nocobase_password_2026
APP_KEY=grt-nocobase-secret-key-2026
```

#### 4.2.5 初始化并启动

```powershell
# 初始化数据库
pnpm nocobase install

# 启动开发服务器
pnpm dev
```

---

## 5. 简道云数据迁移

### 5.1 迁移概述

简道云数据迁移包括以下内容：
- 用户账户和权限
- 应用和表单结构
- 表单数据
- 工作流程

### 5.2 获取简道云API凭据

1. 登录简道云管理后台
2. 进入 **管理后台** > **开放平台** > **API管理**
3. 创建或获取API Key
4. 记录以下信息：
   - 企业ID (Corp ID)
   - API Key

### 5.3 运行迁移脚本

将以下脚本保存为 `C:\nocobase\migrate-jiandaoyun.ps1`：

```powershell
# 简道云数据迁移脚本
# 使用方法: .\migrate-jiandaoyun.ps1 -CorpId "YOUR_CORP_ID" -ApiKey "YOUR_API_KEY"

param(
    [Parameter(Mandatory=$true)]
    [string]$CorpId,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$NocoBaseUrl = "http://localhost:13000"
)

Write-Host "=== 简道云数据迁移工具 ===" -ForegroundColor Cyan
Write-Host "企业ID: $CorpId"
Write-Host "NocoBase地址: $NocoBaseUrl"

# 步骤1: 获取简道云应用列表
Write-Host "`n[1/4] 获取简道云应用列表..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

try {
    $appsResponse = Invoke-RestMethod -Uri "https://api.jiandaoyun.com/api/v5/corp/$CorpId/apps" -Headers $headers -Method Get
    Write-Host "找到 $($appsResponse.data.Count) 个应用" -ForegroundColor Green
} catch {
    Write-Host "获取应用列表失败: $_" -ForegroundColor Red
    exit 1
}

# 步骤2: 导出用户列表
Write-Host "`n[2/4] 导出用户列表..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-RestMethod -Uri "https://api.jiandaoyun.com/api/v5/corp/$CorpId/members" -Headers $headers -Method Get
    $usersJson = $usersResponse | ConvertTo-Json -Depth 10
    $usersJson | Out-File -FilePath "C:\nocobase\jiandaoyun-users.json" -Encoding UTF8
    Write-Host "导出 $($usersResponse.data.Count) 个用户到 jiandaoyun-users.json" -ForegroundColor Green
} catch {
    Write-Host "导出用户失败: $_" -ForegroundColor Red
}

# 步骤3: 导出表单结构
Write-Host "`n[3/4] 导出表单结构..." -ForegroundColor Yellow
$formsData = @()
foreach ($app in $appsResponse.data) {
    try {
        $formsResponse = Invoke-RestMethod -Uri "https://api.jiandaoyun.com/api/v5/app/$($app._id)/entry_forms" -Headers $headers -Method Get
        $formsData += @{
            appId = $app._id
            appName = $app.name
            forms = $formsResponse.data
        }
        Write-Host "  - $($app.name): $($formsResponse.data.Count) 个表单" -ForegroundColor Gray
    } catch {
        Write-Host "  - $($app.name): 获取表单失败" -ForegroundColor Red
    }
}
$formsData | ConvertTo-Json -Depth 10 | Out-File -FilePath "C:\nocobase\jiandaoyun-forms.json" -Encoding UTF8
Write-Host "表单结构已导出到 jiandaoyun-forms.json" -ForegroundColor Green

# 步骤4: 生成NocoBase导入脚本
Write-Host "`n[4/4] 生成NocoBase导入配置..." -ForegroundColor Yellow
$importConfig = @{
    source = "jiandaoyun"
    corpId = $CorpId
    exportDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    users = "jiandaoyun-users.json"
    forms = "jiandaoyun-forms.json"
    nocobaseUrl = $NocoBaseUrl
}
$importConfig | ConvertTo-Json | Out-File -FilePath "C:\nocobase\import-config.json" -Encoding UTF8

Write-Host "`n=== 迁移准备完成 ===" -ForegroundColor Cyan
Write-Host "导出文件位置: C:\nocobase\"
Write-Host "  - jiandaoyun-users.json (用户数据)"
Write-Host "  - jiandaoyun-forms.json (表单结构)"
Write-Host "  - import-config.json (导入配置)"
Write-Host "`n下一步: 在NocoBase中导入这些数据"
```

### 5.4 执行迁移

```powershell
cd C:\nocobase
.\migrate-jiandaoyun.ps1 -CorpId "YOUR_CORP_ID" -ApiKey "YOUR_API_KEY"
```

---

## 6. Claude Code安装

### 6.1 安装Claude Code CLI

Claude Code是Anthropic提供的AI编程助手。安装步骤如下：

```powershell
# 使用npm全局安装
npm install -g @anthropic-ai/claude-code

# 验证安装
claude --version
```

### 6.2 配置API密钥

1. 访问 [Anthropic Console](https://console.anthropic.com/) 获取API密钥
2. 设置环境变量：

```powershell
# 临时设置（当前会话）
$env:ANTHROPIC_API_KEY = "your-api-key-here"

# 永久设置（推荐）
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your-api-key-here", "User")
```

### 6.3 验证Claude Code

```powershell
# 测试Claude Code
claude "Hello, can you help me with NocoBase development?"
```

### 6.4 在项目中使用Claude Code

```powershell
cd C:\nocobase

# 初始化Claude Code项目
claude init

# 开始交互式开发
claude chat
```

---

## 7. AI助手任务导入

### 7.1 任务列表

以下是需要导入NocoBase的17个AI助手开发任务：

| 阶段 | 任务ID | 任务名称 | 优先级 |
|------|--------|----------|--------|
| Phase 1 | T001 | Solution Assistant基础架构 | P0 |
| Phase 1 | T002 | Quotation Assistant基础架构 | P0 |
| Phase 1 | T003 | Planning Assistant基础架构 | P0 |
| Phase 1 | T004 | KPI Assistant基础架构 | P0 |
| Phase 2 | T005 | 历史案例学习模块 | P1 |
| Phase 2 | T006 | 方案推荐引擎 | P1 |
| Phase 2 | T007 | 报价优化算法 | P1 |
| Phase 2 | T008 | 计划生成器 | P1 |
| Phase 3 | T009 | 多源数据集成 | P1 |
| Phase 3 | T010 | 实时追踪模块 | P1 |
| Phase 3 | T011 | KPI评分系统 | P1 |
| Phase 3 | T012 | 通知调度器 | P1 |
| Phase 4 | T013 | AI对话界面 | P2 |
| Phase 4 | T014 | 反馈学习系统 | P2 |
| Phase 4 | T015 | 报告生成器 | P2 |
| Phase 5 | T016 | 系统集成测试 | P2 |
| Phase 5 | T017 | 用户培训材料 | P2 |

### 7.2 导入任务脚本

将以下脚本保存为 `C:\nocobase\import-tasks.ps1`：

```powershell
# AI助手任务导入脚本
param(
    [string]$NocoBaseUrl = "http://localhost:13000",
    [string]$AdminEmail = "admin@grt.com",
    [string]$AdminPassword = "GRT@admin2026"
)

Write-Host "=== AI助手任务导入工具 ===" -ForegroundColor Cyan

# 任务数据
$tasks = @(
    @{ id="T001"; phase="Phase 1"; name="Solution Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队" },
    @{ id="T002"; phase="Phase 1"; name="Quotation Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队" },
    @{ id="T003"; phase="Phase 1"; name="Planning Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队" },
    @{ id="T004"; phase="Phase 1"; name="KPI Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队" },
    @{ id="T005"; phase="Phase 2"; name="历史案例学习模块"; priority="P1"; status="待开始"; assignee="AI团队" },
    @{ id="T006"; phase="Phase 2"; name="方案推荐引擎"; priority="P1"; status="待开始"; assignee="AI团队" },
    @{ id="T007"; phase="Phase 2"; name="报价优化算法"; priority="P1"; status="待开始"; assignee="AI团队" },
    @{ id="T008"; phase="Phase 2"; name="计划生成器"; priority="P1"; status="待开始"; assignee="AI团队" },
    @{ id="T009"; phase="Phase 3"; name="多源数据集成"; priority="P1"; status="待开始"; assignee="后端团队" },
    @{ id="T010"; phase="Phase 3"; name="实时追踪模块"; priority="P1"; status="待开始"; assignee="后端团队" },
    @{ id="T011"; phase="Phase 3"; name="KPI评分系统"; priority="P1"; status="待开始"; assignee="后端团队" },
    @{ id="T012"; phase="Phase 3"; name="通知调度器"; priority="P1"; status="待开始"; assignee="后端团队" },
    @{ id="T013"; phase="Phase 4"; name="AI对话界面"; priority="P2"; status="待开始"; assignee="前端团队" },
    @{ id="T014"; phase="Phase 4"; name="反馈学习系统"; priority="P2"; status="待开始"; assignee="AI团队" },
    @{ id="T015"; phase="Phase 4"; name="报告生成器"; priority="P2"; status="待开始"; assignee="前端团队" },
    @{ id="T016"; phase="Phase 5"; name="系统集成测试"; priority="P2"; status="待开始"; assignee="测试团队" },
    @{ id="T017"; phase="Phase 5"; name="用户培训材料"; priority="P2"; status="待开始"; assignee="产品团队" }
)

# 导出为JSON文件
$tasksJson = $tasks | ConvertTo-Json -Depth 5
$tasksJson | Out-File -FilePath "C:\nocobase\ai-assistant-tasks.json" -Encoding UTF8

Write-Host "`n已生成 $($tasks.Count) 个任务到 ai-assistant-tasks.json" -ForegroundColor Green
Write-Host "`n请在NocoBase中手动导入这些任务，或使用NocoBase API进行批量导入。"
Write-Host "`n导入步骤："
Write-Host "1. 登录NocoBase管理界面 ($NocoBaseUrl)"
Write-Host "2. 创建'AI助手任务'数据表"
Write-Host "3. 添加字段: 任务ID, 阶段, 名称, 优先级, 状态, 负责人"
Write-Host "4. 导入 ai-assistant-tasks.json 数据"
```

### 7.3 执行导入

```powershell
cd C:\nocobase
.\import-tasks.ps1
```

---

## 8. 故障排除

### 8.1 Docker启动失败

**问题**: Docker Desktop无法启动

**解决方案**:
1. 确保WSL2已正确安装
2. 检查Hyper-V是否启用
3. 重启计算机后再试

```powershell
# 检查WSL状态
wsl --status

# 更新WSL
wsl --update
```

### 8.2 NocoBase无法访问

**问题**: 浏览器无法访问 http://localhost:13000

**解决方案**:
1. 检查容器是否运行

```powershell
docker ps
docker compose logs nocobase
```

2. 检查端口是否被占用

```powershell
netstat -ano | findstr :13000
```

### 8.3 数据库连接失败

**问题**: NocoBase报数据库连接错误

**解决方案**:
1. 检查PostgreSQL容器状态

```powershell
docker compose logs postgres
```

2. 重启数据库容器

```powershell
docker compose restart postgres
docker compose restart nocobase
```

### 8.4 简道云API调用失败

**问题**: 迁移脚本报API错误

**解决方案**:
1. 检查API Key是否正确
2. 检查企业ID是否正确
3. 确认API权限已开启

---

## 参考资料

1. [NocoBase官方文档](https://docs.nocobase.com/)
2. [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
3. [简道云API文档](https://hc.jiandaoyun.com/open/12049)
4. [Claude Code文档](https://docs.anthropic.com/claude/docs/claude-code)
5. [PostgreSQL官方文档](https://www.postgresql.org/docs/)

---

> **提示**: 如果在部署过程中遇到问题，请查看故障排除章节或联系技术支持。

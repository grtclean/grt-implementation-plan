# NocoBase Windows 一键部署脚本
# 使用方法: .\deploy-windows.ps1 [-Mode docker|source] [-SkipDocker] [-ImportTasks]

param(
    [ValidateSet("docker", "source")]
    [string]$Mode = "docker",
    
    [switch]$SkipDocker,
    [switch]$ImportTasks,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# 显示帮助
if ($Help) {
    Write-Host @"
NocoBase Windows 部署脚本

用法:
    .\deploy-windows.ps1 [选项]

选项:
    -Mode <docker|source>   部署模式 (默认: docker)
    -SkipDocker            跳过Docker检查
    -ImportTasks           部署后导入AI助手任务
    -Help                  显示帮助信息

示例:
    .\deploy-windows.ps1                    # Docker模式部署
    .\deploy-windows.ps1 -Mode source       # 源码模式部署
    .\deploy-windows.ps1 -ImportTasks       # 部署并导入任务
"@
    exit 0
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           NocoBase Windows 一键部署脚本 v1.0                 ║" -ForegroundColor Cyan
Write-Host "║                   GRT智能系统专用版                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 配置变量
$NOCOBASE_DIR = "C:\nocobase"
$NOCOBASE_PORT = 13000
$DB_PORT = 5432
$DB_NAME = "nocobase"
$DB_USER = "nocobase"
$DB_PASSWORD = "nocobase_password_2026"
$ADMIN_EMAIL = "admin@grt.com"
$ADMIN_PASSWORD = "GRT@admin2026"
$APP_KEY = "grt-nocobase-secret-key-2026"

# ==================== 环境检查 ====================

Write-Info "开始环境检查..."

# 检查Node.js
Write-Info "检查Node.js..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js版本: $nodeVersion"
} catch {
    Write-Error "Node.js未安装，请先安装Node.js 18.x或更高版本"
    Write-Host "下载地址: https://nodejs.org/"
    exit 1
}

# 检查npm
Write-Info "检查npm..."
try {
    $npmVersion = npm --version
    Write-Success "npm版本: $npmVersion"
} catch {
    Write-Error "npm未找到"
    exit 1
}

# 检查Docker (如果是docker模式)
if ($Mode -eq "docker" -and -not $SkipDocker) {
    Write-Info "检查Docker..."
    try {
        $dockerVersion = docker --version
        Write-Success "Docker版本: $dockerVersion"
        
        # 检查Docker是否运行
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Docker未运行，请启动Docker Desktop"
            Write-Host "提示: 启动Docker Desktop后重新运行此脚本"
            exit 1
        }
        Write-Success "Docker运行正常"
    } catch {
        Write-Error "Docker未安装"
        Write-Host "请先安装Docker Desktop: https://www.docker.com/products/docker-desktop/"
        Write-Host "或使用源码模式: .\deploy-windows.ps1 -Mode source"
        exit 1
    }
}

# 检查端口
Write-Info "检查端口占用..."
$portCheck = netstat -ano | findstr ":$NOCOBASE_PORT"
if ($portCheck) {
    Write-Warning "端口 $NOCOBASE_PORT 已被占用"
    Write-Host "占用情况: $portCheck"
    $continue = Read-Host "是否继续? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# ==================== 创建目录 ====================

Write-Info "创建部署目录..."
if (-not (Test-Path $NOCOBASE_DIR)) {
    New-Item -ItemType Directory -Path $NOCOBASE_DIR -Force | Out-Null
    Write-Success "创建目录: $NOCOBASE_DIR"
} else {
    Write-Warning "目录已存在: $NOCOBASE_DIR"
}

Set-Location $NOCOBASE_DIR

# ==================== Docker模式部署 ====================

if ($Mode -eq "docker") {
    Write-Info "使用Docker模式部署..."
    
    # 创建docker-compose.yml
    $dockerCompose = @"
version: '3.8'

services:
  nocobase:
    image: nocobase/nocobase:latest
    container_name: nocobase-app
    restart: unless-stopped
    ports:
      - "${NOCOBASE_PORT}:80"
    environment:
      - DB_DIALECT=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_DATABASE=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - APP_KEY=${APP_KEY}
      - INIT_ROOT_EMAIL=${ADMIN_EMAIL}
      - INIT_ROOT_PASSWORD=${ADMIN_PASSWORD}
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
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
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
"@
    
    $dockerCompose | Out-File -FilePath "docker-compose.yml" -Encoding UTF8
    Write-Success "创建docker-compose.yml"
    
    # 拉取镜像
    Write-Info "拉取Docker镜像（可能需要几分钟）..."
    docker compose pull
    
    # 启动服务
    Write-Info "启动NocoBase服务..."
    docker compose up -d
    
    # 等待服务启动
    Write-Info "等待服务启动..."
    $maxRetries = 30
    $retryCount = 0
    while ($retryCount -lt $maxRetries) {
        Start-Sleep -Seconds 5
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$NOCOBASE_PORT" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "NocoBase服务已启动"
                break
            }
        } catch {
            $retryCount++
            Write-Host "." -NoNewline
        }
    }
    Write-Host ""
    
    if ($retryCount -ge $maxRetries) {
        Write-Warning "服务启动超时，请检查日志"
        docker compose logs nocobase
    }
}

# ==================== 源码模式部署 ====================

if ($Mode -eq "source") {
    Write-Info "使用源码模式部署..."
    
    # 检查PostgreSQL
    Write-Info "检查PostgreSQL..."
    try {
        $pgVersion = psql --version
        Write-Success "PostgreSQL版本: $pgVersion"
    } catch {
        Write-Error "PostgreSQL未安装"
        Write-Host "请先安装PostgreSQL: https://www.postgresql.org/download/windows/"
        exit 1
    }
    
    # 克隆NocoBase
    if (-not (Test-Path "$NOCOBASE_DIR\nocobase")) {
        Write-Info "克隆NocoBase仓库..."
        git clone https://github.com/nocobase/nocobase.git
    } else {
        Write-Warning "NocoBase仓库已存在"
    }
    
    Set-Location "$NOCOBASE_DIR\nocobase"
    
    # 创建.env文件
    $envContent = @"
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=$DB_PORT
DB_DATABASE=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
APP_KEY=$APP_KEY
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "创建.env配置文件"
    
    # 安装依赖
    Write-Info "安装依赖（可能需要几分钟）..."
    pnpm install
    
    # 初始化数据库
    Write-Info "初始化数据库..."
    pnpm nocobase install
    
    # 启动服务
    Write-Info "启动NocoBase服务..."
    Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow
    
    Write-Success "NocoBase服务已启动（开发模式）"
}

# ==================== 导入AI助手任务 ====================

if ($ImportTasks) {
    Write-Info "导入AI助手任务..."
    
    # 任务数据
    $tasks = @(
        @{ id="T001"; phase="Phase 1"; name="Solution Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队"; description="实现方案助手的基础对话功能和知识库集成" },
        @{ id="T002"; phase="Phase 1"; name="Quotation Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队"; description="实现报价助手的成本计算和报价生成功能" },
        @{ id="T003"; phase="Phase 1"; name="Planning Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队"; description="实现计划助手的任务分解和进度规划功能" },
        @{ id="T004"; phase="Phase 1"; name="KPI Assistant基础架构"; priority="P0"; status="待开始"; assignee="开发团队"; description="实现KPI助手的绩效分析和评分功能" },
        @{ id="T005"; phase="Phase 2"; name="历史案例学习模块"; priority="P1"; status="待开始"; assignee="AI团队"; description="实现从历史项目中学习的机器学习模块" },
        @{ id="T006"; phase="Phase 2"; name="方案推荐引擎"; priority="P1"; status="待开始"; assignee="AI团队"; description="基于客户需求的智能方案推荐算法" },
        @{ id="T007"; phase="Phase 2"; name="报价优化算法"; priority="P1"; status="待开始"; assignee="AI团队"; description="成本优化和竞争力分析的报价算法" },
        @{ id="T008"; phase="Phase 2"; name="计划生成器"; priority="P1"; status="待开始"; assignee="AI团队"; description="自动生成项目计划和里程碑的模块" },
        @{ id="T009"; phase="Phase 3"; name="多源数据集成"; priority="P1"; status="待开始"; assignee="后端团队"; description="集成ERP、CRM等多个数据源" },
        @{ id="T010"; phase="Phase 3"; name="实时追踪模块"; priority="P1"; status="待开始"; assignee="后端团队"; description="项目进度和任务状态的实时追踪" },
        @{ id="T011"; phase="Phase 3"; name="KPI评分系统"; priority="P1"; status="待开始"; assignee="后端团队"; description="多维度KPI评分和趋势分析系统" },
        @{ id="T012"; phase="Phase 3"; name="通知调度器"; priority="P1"; status="待开始"; assignee="后端团队"; description="智能通知时间优化和多渠道分发" },
        @{ id="T013"; phase="Phase 4"; name="AI对话界面"; priority="P2"; status="待开始"; assignee="前端团队"; description="统一的AI助手对话界面和交互设计" },
        @{ id="T014"; phase="Phase 4"; name="反馈学习系统"; priority="P2"; status="待开始"; assignee="AI团队"; description="用户反馈收集和模型持续优化" },
        @{ id="T015"; phase="Phase 4"; name="报告生成器"; priority="P2"; status="待开始"; assignee="前端团队"; description="自动生成分析报告和可视化图表" },
        @{ id="T016"; phase="Phase 5"; name="系统集成测试"; priority="P2"; status="待开始"; assignee="测试团队"; description="端到端测试和性能压力测试" },
        @{ id="T017"; phase="Phase 5"; name="用户培训材料"; priority="P2"; status="待开始"; assignee="产品团队"; description="用户手册、视频教程和培训文档" }
    )
    
    # 保存任务JSON
    $tasksJson = $tasks | ConvertTo-Json -Depth 5
    $tasksJson | Out-File -FilePath "$NOCOBASE_DIR\ai-assistant-tasks.json" -Encoding UTF8
    
    Write-Success "已生成 $($tasks.Count) 个AI助手任务到 ai-assistant-tasks.json"
    Write-Host ""
    Write-Host "任务导入说明:" -ForegroundColor Yellow
    Write-Host "1. 登录NocoBase管理界面 (http://localhost:$NOCOBASE_PORT)"
    Write-Host "2. 创建'AI助手任务'数据表，包含以下字段:"
    Write-Host "   - 任务ID (text)"
    Write-Host "   - 阶段 (select: Phase 1-5)"
    Write-Host "   - 名称 (text)"
    Write-Host "   - 优先级 (select: P0/P1/P2)"
    Write-Host "   - 状态 (select: 待开始/进行中/已完成)"
    Write-Host "   - 负责人 (text)"
    Write-Host "   - 描述 (textarea)"
    Write-Host "3. 使用数据导入功能导入 ai-assistant-tasks.json"
}

# ==================== 完成 ====================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    部署完成!                                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址: http://localhost:$NOCOBASE_PORT" -ForegroundColor Cyan
Write-Host "管理员邮箱: $ADMIN_EMAIL" -ForegroundColor Cyan
Write-Host "管理员密码: $ADMIN_PASSWORD" -ForegroundColor Cyan
Write-Host ""
Write-Host "常用命令:" -ForegroundColor Yellow
if ($Mode -eq "docker") {
    Write-Host "  查看日志: docker compose logs -f nocobase"
    Write-Host "  停止服务: docker compose down"
    Write-Host "  重启服务: docker compose restart"
} else {
    Write-Host "  启动服务: pnpm dev"
    Write-Host "  构建生产: pnpm build"
}
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 访问 http://localhost:$NOCOBASE_PORT 登录系统"
Write-Host "2. 配置用户和权限"
Write-Host "3. 导入简道云数据（如需要）"
Write-Host "4. 创建AI助手任务看板"
Write-Host ""

# GRT智能系统 Windows 11 快速部署脚本
# 版本: v2.5.21
# 作者: Manus AI

param(
    [string]$ProjectPath = "D:\Projects\grt-implementation-plan",
    [string]$MySQLUser = "grt_user",
    [string]$MySQLPassword = "",
    [string]$MySQLDatabase = "grt_system"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GRT智能系统 Windows 11 部署脚本" -ForegroundColor Cyan
Write-Host "  版本: v2.5.21" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[错误] 请以管理员身份运行此脚本" -ForegroundColor Red
    exit 1
}

# 函数：检查命令是否存在
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# 函数：显示步骤
function Show-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[步骤] $Message" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

# 步骤1: 检查Node.js
Show-Step "检查 Node.js 安装状态"
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "  Node.js 已安装: $nodeVersion" -ForegroundColor Green
    
    # 检查版本是否满足要求
    $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNum -lt 22) {
        Write-Host "  [警告] 建议使用 Node.js 22.x 或更高版本" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [错误] Node.js 未安装" -ForegroundColor Red
    Write-Host "  请访问 https://nodejs.org/ 下载安装 Node.js 22 LTS" -ForegroundColor Yellow
    exit 1
}

# 步骤2: 检查pnpm
Show-Step "检查 pnpm 安装状态"
if (Test-Command "pnpm") {
    $pnpmVersion = pnpm --version
    Write-Host "  pnpm 已安装: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "  pnpm 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g pnpm@10
    if ($?) {
        Write-Host "  pnpm 安装成功" -ForegroundColor Green
    } else {
        Write-Host "  [错误] pnpm 安装失败" -ForegroundColor Red
        exit 1
    }
}

# 步骤3: 检查MySQL
Show-Step "检查 MySQL 服务状态"
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService) {
    Write-Host "  MySQL 服务: $($mysqlService.DisplayName)" -ForegroundColor Green
    if ($mysqlService.Status -ne "Running") {
        Write-Host "  正在启动 MySQL 服务..." -ForegroundColor Yellow
        Start-Service -Name $mysqlService.Name
    }
    Write-Host "  MySQL 服务状态: $($mysqlService.Status)" -ForegroundColor Green
} else {
    Write-Host "  [警告] 未检测到 MySQL 服务" -ForegroundColor Yellow
    Write-Host "  请确保 MySQL 8.0 已正确安装" -ForegroundColor Yellow
}

# 步骤4: 检查Git
Show-Step "检查 Git 安装状态"
if (Test-Command "git") {
    $gitVersion = git --version
    Write-Host "  $gitVersion" -ForegroundColor Green
} else {
    Write-Host "  [错误] Git 未安装" -ForegroundColor Red
    Write-Host "  请访问 https://git-scm.com/ 下载安装 Git" -ForegroundColor Yellow
    exit 1
}

# 步骤5: 进入项目目录
Show-Step "检查项目目录"
if (Test-Path $ProjectPath) {
    Set-Location $ProjectPath
    Write-Host "  项目目录: $ProjectPath" -ForegroundColor Green
} else {
    Write-Host "  [错误] 项目目录不存在: $ProjectPath" -ForegroundColor Red
    Write-Host "  请先克隆或解压项目代码到指定目录" -ForegroundColor Yellow
    exit 1
}

# 步骤6: 安装依赖
Show-Step "安装项目依赖"
Write-Host "  正在安装依赖，这可能需要几分钟..." -ForegroundColor Yellow
pnpm install
if ($?) {
    Write-Host "  依赖安装成功" -ForegroundColor Green
} else {
    Write-Host "  [错误] 依赖安装失败" -ForegroundColor Red
    exit 1
}

# 步骤7: 检查环境变量文件
Show-Step "检查环境变量配置"
$envFile = Join-Path $ProjectPath ".env"
if (Test-Path $envFile) {
    Write-Host "  .env 文件已存在" -ForegroundColor Green
} else {
    Write-Host "  创建 .env 文件模板..." -ForegroundColor Yellow
    
    # 生成随机JWT密钥
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $envContent = @"
# GRT智能系统环境变量配置
# 生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ==================== 数据库配置 ====================
DATABASE_URL=mysql://${MySQLUser}:${MySQLPassword}@localhost:3306/${MySQLDatabase}

# ==================== 应用配置 ====================
NODE_ENV=development
VITE_APP_ID=grt-local-dev
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=/logo.svg

# ==================== 认证配置 ====================
JWT_SECRET=$jwtSecret

# ==================== AI服务配置（按需配置） ====================
# OPENAI_API_KEY=sk-your-openai-api-key
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
# GEMINI_API_KEY=your-gemini-api-key
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "  .env 文件已创建，请编辑配置数据库密码和API密钥" -ForegroundColor Yellow
}

# 步骤8: 数据库初始化提示
Show-Step "数据库初始化"
Write-Host "  请确保已完成以下操作:" -ForegroundColor Yellow
Write-Host "  1. 创建数据库: CREATE DATABASE $MySQLDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Gray
Write-Host "  2. 创建用户并授权" -ForegroundColor Gray
Write-Host "  3. 更新 .env 文件中的 DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "  完成后运行: pnpm db:push" -ForegroundColor Cyan

# 步骤9: 显示后续步骤
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  环境检查完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "后续步骤:" -ForegroundColor Yellow
Write-Host "  1. 编辑 .env 文件，配置数据库密码和API密钥" -ForegroundColor White
Write-Host "  2. 运行 'pnpm db:push' 初始化数据库" -ForegroundColor White
Write-Host "  3. 运行 'pnpm dev' 启动开发服务器" -ForegroundColor White
Write-Host "  4. 访问 http://localhost:3000 验证系统" -ForegroundColor White
Write-Host ""
Write-Host "常用命令:" -ForegroundColor Yellow
Write-Host "  pnpm dev      - 启动开发服务器" -ForegroundColor Gray
Write-Host "  pnpm build    - 构建生产版本" -ForegroundColor Gray
Write-Host "  pnpm start    - 启动生产服务" -ForegroundColor Gray
Write-Host "  pnpm test     - 运行测试" -ForegroundColor Gray
Write-Host "  pnpm db:push  - 同步数据库" -ForegroundColor Gray
Write-Host ""

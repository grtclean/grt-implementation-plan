# GRT智能系统 - Windows 11本地开发环境自动设置脚本
# 用法: .\setup-local-dev.ps1
# 需要: PowerShell 5.0+ 和管理员权限

param(
    [switch]$SkipNodeCheck = $false,
    [switch]$SkipDatabaseSetup = $false,
    [string]$DatabaseUrl = "",
    [string]$AppId = "",
    [string]$OAuthPortalUrl = "https://api.manus.im"
)

# 颜色定义
$colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $colors[$Type] ?? "White"
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $color
}

function Test-Command {
    param([string]$Command)
    try {
        $null = & $Command --version 2>&1
        return $true
    } catch {
        return $false
    }
}

# ============================================
# 第1步：检查系统要求
# ============================================
Write-Status "========================================" "Info"
Write-Status "GRT智能系统 - 本地开发环境设置" "Info"
Write-Status "========================================" "Info"
Write-Status ""

Write-Status "第1步：检查系统要求..." "Info"

# 检查Node.js
if (-not $SkipNodeCheck) {
    if (Test-Command "node") {
        $nodeVersion = & node --version
        Write-Status "✓ Node.js已安装: $nodeVersion" "Success"
    } else {
        Write-Status "✗ Node.js未安装" "Error"
        Write-Status "请从 https://nodejs.org/ 下载并安装 Node.js v18.0.0+" "Warning"
        exit 1
    }
}

# 检查pnpm
if (Test-Command "pnpm") {
    $pnpmVersion = & pnpm --version
    Write-Status "✓ pnpm已安装: $pnpmVersion" "Success"
} else {
    Write-Status "✗ pnpm未安装，正在安装..." "Warning"
    npm install -g pnpm
    if (Test-Command "pnpm") {
        Write-Status "✓ pnpm安装成功" "Success"
    } else {
        Write-Status "✗ pnpm安装失败" "Error"
        exit 1
    }
}

# 检查Git
if (Test-Command "git") {
    $gitVersion = & git --version
    Write-Status "✓ Git已安装: $gitVersion" "Success"
} else {
    Write-Status "⚠ Git未安装（可选）" "Warning"
}

Write-Status ""

# ============================================
# 第2步：检查项目目录
# ============================================
Write-Status "第2步：检查项目目录..." "Info"

$projectRoot = Get-Location
$packageJsonPath = Join-Path $projectRoot "package.json"

if (-not (Test-Path $packageJsonPath)) {
    Write-Status "✗ 未找到package.json，请在项目根目录运行此脚本" "Error"
    exit 1
}

Write-Status "✓ 项目目录: $projectRoot" "Success"
Write-Status ""

# ============================================
# 第3步：清除旧的依赖和缓存
# ============================================
Write-Status "第3步：清除旧的依赖和缓存..." "Info"

$nodeModulesPath = Join-Path $projectRoot "node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Status "正在删除node_modules目录..." "Warning"
    Remove-Item -Path $nodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Status "✓ node_modules已删除" "Success"
}

$pnpmLockPath = Join-Path $projectRoot "pnpm-lock.yaml"
if (Test-Path $pnpmLockPath) {
    Write-Status "正在删除pnpm-lock.yaml..." "Warning"
    Remove-Item -Path $pnpmLockPath -Force -ErrorAction SilentlyContinue
    Write-Status "✓ pnpm-lock.yaml已删除" "Success"
}

Write-Status "正在清除pnpm存储..." "Warning"
& pnpm store prune
Write-Status "✓ pnpm缓存已清除" "Success"
Write-Status ""

# ============================================
# 第4步：安装依赖
# ============================================
Write-Status "第4步：安装项目依赖..." "Info"
Write-Status "这可能需要5-10分钟，请耐心等待..." "Warning"

& pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Status "✗ 依赖安装失败" "Error"
    exit 1
}

Write-Status "✓ 依赖安装成功" "Success"
Write-Status ""

# ============================================
# 第5步：创建.env.local配置文件
# ============================================
Write-Status "第5步：创建环境配置文件..." "Info"

$envLocalPath = Join-Path $projectRoot ".env.local"
$envExamplePath = Join-Path $projectRoot ".env.local.example"

if (-not (Test-Path $envLocalPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item -Path $envExamplePath -Destination $envLocalPath
        Write-Status "✓ .env.local已创建（从.env.local.example复制）" "Success"
    } else {
        Write-Status "⚠ .env.local.example不存在，跳过自动创建" "Warning"
    }
} else {
    Write-Status "✓ .env.local已存在" "Success"
}

# 更新环境变量
$envContent = Get-Content $envLocalPath -Raw

# 更新VITE_OAUTH_PORTAL_URL
if ($OAuthPortalUrl) {
    $envContent = $envContent -replace 'VITE_OAUTH_PORTAL_URL=.*', "VITE_OAUTH_PORTAL_URL=$OAuthPortalUrl"
}

# 更新VITE_APP_ID
if ($AppId) {
    $envContent = $envContent -replace 'VITE_APP_ID=.*', "VITE_APP_ID=$AppId"
}

# 更新DATABASE_URL
if ($DatabaseUrl) {
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$DatabaseUrl"
}

# 添加WebSocket HMR配置
if ($envContent -notmatch "VITE_HMR_HOST") {
    $envContent += "`n`n# WebSocket HMR配置`nVITE_HMR_HOST=localhost`nVITE_HMR_PORT=3000`nVITE_HMR_PROTOCOL=ws"
}

Set-Content -Path $envLocalPath -Value $envContent
Write-Status "✓ 环境变量已更新" "Success"
Write-Status ""

# ============================================
# 第6步：数据库初始化（可选）
# ============================================
if (-not $SkipDatabaseSetup) {
    Write-Status "第6步：初始化数据库..." "Info"
    
    Write-Status "正在执行数据库迁移..." "Warning"
    & pnpm db:push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ 数据库初始化成功" "Success"
    } else {
        Write-Status "⚠ 数据库初始化失败，请检查DATABASE_URL配置" "Warning"
        Write-Status "您可以稍后手动运行: pnpm db:push" "Info"
    }
} else {
    Write-Status "第6步：跳过数据库初始化（使用--SkipDatabaseSetup参数）" "Info"
}

Write-Status ""

# ============================================
# 第7步：启动开发服务器
# ============================================
Write-Status "========================================" "Info"
Write-Status "✓ 设置完成！" "Success"
Write-Status "========================================" "Info"
Write-Status ""

Write-Status "下一步：启动开发服务器" "Info"
Write-Status "运行以下命令：" "Info"
Write-Status "  pnpm dev" "Cyan"
Write-Status ""

Write-Status "然后在浏览器中打开：" "Info"
Write-Status "  http://localhost:3000" "Cyan"
Write-Status ""

Write-Status "常见问题排查：" "Info"
Write-Status "1. 如果出现WebSocket错误，检查.env.local中的HMR配置" "Warning"
Write-Status "2. 如果出现数据库错误，检查DATABASE_URL是否正确" "Warning"
Write-Status "3. 如果出现OAuth错误，检查VITE_APP_ID和VITE_OAUTH_PORTAL_URL" "Warning"
Write-Status ""

Write-Status "完整文档：docs/WINDOWS_LOCAL_DEPLOYMENT_GUIDE.md" "Info"

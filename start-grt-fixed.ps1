# ============================================================================
# GRT System Quick Start Script (HMR Fixed)
# Windows 11 快速启动脚本 - 已修复HMR问题
# ============================================================================

param(
    [switch]$SkipFix = $false,
    [switch]$DisableHMR = $false,
    [string]$ProjectPath = "D:\Projects\grt-implementation-plan"
)

# 颜色定义
$colors = @{
    "Success" = "Green"
    "Error"   = "Red"
    "Warning" = "Yellow"
    "Info"    = "Cyan"
    "Header"  = "Magenta"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $colors[$Type]
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $color
}

function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                   GRT System - Quick Start                      ║" -ForegroundColor Cyan
    Write-Host "║                  (HMR Fixed Version)                           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Write-Host ""
    Write-Host "请选择启动模式:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. 标准模式 (WebSocket HMR)" -ForegroundColor Green
    Write-Host "  2. HTTP轮询模式 (如果WebSocket失败)" -ForegroundColor Green
    Write-Host "  3. 禁用HMR模式 (最稳定)" -ForegroundColor Green
    Write-Host "  4. 完全修复 + 启动 (清除所有缓存)" -ForegroundColor Yellow
    Write-Host "  5. 退出" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "请输入选项 (1-5)"
    return $choice
}

function Setup-Environment {
    param([string]$HmrProtocol = "ws", [bool]$DisableHmr = $false)
    
    Write-Status "配置环境变量..." "Info"
    
    $envPath = "$ProjectPath\.env.local"
    
    $envContent = @"
# ============================================================================
# GRT System Environment Variables
# Windows 11 Local Development - HMR Fixed
# ============================================================================

# Database Configuration
DATABASE_URL=mysql://root:Gerry123456@localhost:3306/grt_dev

# Vite HMR Configuration
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
VITE_HMR_PROTOCOL=$HmrProtocol
"@
    
    if ($DisableHmr) {
        $envContent += "`nVITE_HMR_DISABLED=true"
    }
    
    $envContent += @"

# OAuth Configuration (Demo Mode)
VITE_APP_ID=demo-app-id
VITE_OAUTH_PORTAL_URL=http://localhost:3000/login
OAUTH_SERVER_URL=http://localhost:3000/api/oauth

# JWT Secret
JWT_SECRET=grt-local-dev-secret

# Node Environment
NODE_ENV=development
PORT=3000
"@
    
    Set-Content $envPath $envContent -Encoding UTF8
    Write-Status "✓ 环境变量已配置" "Success"
}

function Start-DevServer {
    Write-Status "启动开发服务器..." "Info"
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "访问地址: http://localhost:3000" -ForegroundColor Green
    Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    Push-Location $ProjectPath
    try {
        pnpm dev
    } catch {
        Write-Status "✗ 启动失败: $_" "Error"
        Pop-Location
        exit 1
    }
    Pop-Location
}

function Run-FullFix {
    Write-Status "执行完全修复..." "Info"
    
    # 停止现有服务器
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Status "✓ 开发服务器已停止" "Success"
    }
    
    # 清除缓存
    Write-Status "清除缓存..." "Info"
    $cachePaths = @(
        "$ProjectPath\node_modules\.vite",
        "$ProjectPath\node_modules\.esbuild",
        "$ProjectPath\.vite",
        "$ProjectPath\dist"
    )
    
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        }
    }
    Write-Status "✓ 缓存已清除" "Success"
    
    # 重新安装依赖
    Write-Status "重新安装依赖..." "Info"
    Push-Location $ProjectPath
    try {
        pnpm install
        Write-Status "✓ 依赖已安装" "Success"
    } catch {
        Write-Status "✗ 依赖安装失败: $_" "Error"
        Pop-Location
        exit 1
    }
    Pop-Location
    
    # 配置环境变量
    Setup-Environment -HmrProtocol "ws" -DisableHmr $false
}

# ============================================================================
# Main Execution
# ============================================================================

Show-Banner

# 检查项目路径
if (-not (Test-Path "$ProjectPath\package.json")) {
    Write-Status "✗ 项目路径不存在或无效: $ProjectPath" "Error"
    exit 1
}

# 如果指定了参数，直接使用
if ($SkipFix) {
    Write-Status "跳过修复，直接启动..." "Warning"
    Setup-Environment -HmrProtocol $(if ($DisableHMR) { "http" } else { "ws" }) -DisableHmr $DisableHMR
    Start-DevServer
    exit 0
}

# 交互式菜单
while ($true) {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" {
            Write-Status "选择: 标准模式 (WebSocket HMR)" "Info"
            Setup-Environment -HmrProtocol "ws" -DisableHmr $false
            Start-DevServer
            break
        }
        "2" {
            Write-Status "选择: HTTP轮询模式" "Info"
            Setup-Environment -HmrProtocol "http" -DisableHmr $false
            Start-DevServer
            break
        }
        "3" {
            Write-Status "选择: 禁用HMR模式" "Info"
            Setup-Environment -HmrProtocol "ws" -DisableHmr $true
            Start-DevServer
            break
        }
        "4" {
            Write-Status "选择: 完全修复 + 启动" "Warning"
            Run-FullFix
            Setup-Environment -HmrProtocol "ws" -DisableHmr $false
            Start-DevServer
            break
        }
        "5" {
            Write-Status "退出" "Info"
            exit 0
        }
        default {
            Write-Status "无效选项，请重试" "Error"
        }
    }
}

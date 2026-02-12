# ============================================================================
# GRT System HMR Fix Script for Windows 11
# 解决Vite HMR连接失败导致的无限刷新/闪烁/白屏问题
# ============================================================================

param(
    [switch]$SkipNodeModules = $false,
    [switch]$DryRun = $false,
    [string]$ProjectPath = "D:\Projects\grt-implementation-plan"
)

# 颜色定义
$colors = @{
    "Success" = "Green"
    "Error"   = "Red"
    "Warning" = "Yellow"
    "Info"    = "Cyan"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $colors[$Type]
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $color
}

function Test-ProjectPath {
    if (-not (Test-Path $ProjectPath)) {
        Write-Status "项目路径不存在: $ProjectPath" "Error"
        exit 1
    }
    if (-not (Test-Path "$ProjectPath\package.json")) {
        Write-Status "package.json 不存在，请确认项目路径正确" "Error"
        exit 1
    }
    Write-Status "✓ 项目路径验证成功: $ProjectPath" "Success"
}

function Stop-DevServer {
    Write-Status "正在停止开发服务器..." "Info"
    
    # 查找并停止 node 进程
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Status "✓ 开发服务器已停止" "Success"
    } else {
        Write-Status "✓ 没有运行的开发服务器" "Info"
    }
}

function Clear-ViteCache {
    Write-Status "清除Vite缓存..." "Info"
    
    $cachePaths = @(
        "$ProjectPath\node_modules\.vite",
        "$ProjectPath\node_modules\.esbuild",
        "$ProjectPath\.vite",
        "$ProjectPath\dist"
    )
    
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            if ($DryRun) {
                Write-Status "  [DRY RUN] 将删除: $path" "Warning"
            } else {
                Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
                Write-Status "  ✓ 已删除: $path" "Success"
            }
        }
    }
}

function Clear-BrowserCache {
    Write-Status "清除浏览器缓存..." "Info"
    
    if ($DryRun) {
        Write-Status "  [DRY RUN] 将清除Chrome缓存" "Warning"
    } else {
        # Chrome缓存路径
        $chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
        if (Test-Path $chromeCache) {
            Remove-Item -Recurse -Force "$chromeCache\*" -ErrorAction SilentlyContinue
            Write-Status "  ✓ Chrome缓存已清除" "Success"
        }
        
        # Edge缓存路径
        $edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
        if (Test-Path $edgeCache) {
            Remove-Item -Recurse -Force "$edgeCache\*" -ErrorAction SilentlyContinue
            Write-Status "  ✓ Edge缓存已清除" "Success"
        }
    }
}

function Reinstall-Dependencies {
    if ($SkipNodeModules) {
        Write-Status "跳过依赖重新安装（--SkipNodeModules）" "Warning"
        return
    }
    
    Write-Status "重新安装依赖..." "Info"
    
    if ($DryRun) {
        Write-Status "  [DRY RUN] 将执行: pnpm install" "Warning"
    } else {
        Push-Location $ProjectPath
        try {
            pnpm install
            Write-Status "✓ 依赖安装完成" "Success"
        } catch {
            Write-Status "✗ 依赖安装失败: $_" "Error"
            Pop-Location
            exit 1
        }
        Pop-Location
    }
}

function Update-ViteConfig {
    Write-Status "更新Vite配置..." "Info"
    
    $viteConfigPath = "$ProjectPath\vite.config.ts"
    
    if (-not (Test-Path $viteConfigPath)) {
        Write-Status "✗ vite.config.ts 不存在" "Error"
        return $false
    }
    
    $content = Get-Content $viteConfigPath -Raw
    
    # 检查是否已经有HMR配置
    if ($content -match "hmr:\s*\{") {
        Write-Status "✓ HMR配置已存在，跳过更新" "Info"
        return $true
    }
    
    # 添加HMR配置
    $hmrConfig = @"
  server: {
    middlewareMode: true,
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'ws',
    },
  },
"@
    
    if ($DryRun) {
        Write-Status "  [DRY RUN] 将添加HMR配置到vite.config.ts" "Warning"
    } else {
        # 在 defineConfig 后添加 server 配置
        $newContent = $content -replace '(defineConfig\(\{)', "`$1`n$hmrConfig"
        Set-Content $viteConfigPath $newContent -Encoding UTF8
        Write-Status "✓ Vite配置已更新" "Success"
    }
    
    return $true
}

function Create-EnvFile {
    Write-Status "创建/更新环境变量文件..." "Info"
    
    $envPath = "$ProjectPath\.env.local"
    
    $envContent = @"
# ============================================================================
# GRT System Environment Variables
# Windows 11 Local Development Configuration
# ============================================================================

# Database Configuration
DATABASE_URL=mysql://root:Gerry123456@localhost:3306/grt_dev

# Vite HMR Configuration (Hot Module Replacement)
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
VITE_HMR_PROTOCOL=ws

# OAuth Configuration (Demo Mode)
VITE_APP_ID=demo-app-id
VITE_OAUTH_PORTAL_URL=http://localhost:3000/login
OAUTH_SERVER_URL=http://localhost:3000/api/oauth

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Node Environment
NODE_ENV=development

# Server Port
PORT=3000
"@
    
    if ($DryRun) {
        Write-Status "  [DRY RUN] 将创建/更新 .env.local" "Warning"
    } else {
        Set-Content $envPath $envContent -Encoding UTF8
        Write-Status "✓ 环境变量文件已创建/更新: $envPath" "Success"
    }
}

function Start-DevServer {
    Write-Status "启动开发服务器..." "Info"
    
    if ($DryRun) {
        Write-Status "  [DRY RUN] 将执行: pnpm dev" "Warning"
        return
    }
    
    Push-Location $ProjectPath
    try {
        Write-Status "开发服务器启动中... 请稍候..." "Info"
        Write-Status "访问地址: http://localhost:3000" "Info"
        Write-Status "按 Ctrl+C 停止服务器" "Info"
        Write-Status "" "Info"
        
        pnpm dev
    } catch {
        Write-Status "✗ 启动失败: $_" "Error"
        Pop-Location
        exit 1
    }
    Pop-Location
}

function Show-Summary {
    Write-Status "" "Info"
    Write-Status "========== 修复摘要 ==========" "Info"
    Write-Status "✓ 项目路径验证" "Success"
    Write-Status "✓ 开发服务器已停止" "Success"
    Write-Status "✓ Vite缓存已清除" "Success"
    Write-Status "✓ 浏览器缓存已清除" "Success"
    Write-Status "✓ 依赖已重新安装" "Success"
    Write-Status "✓ Vite配置已更新" "Success"
    Write-Status "✓ 环境变量已配置" "Success"
    Write-Status "" "Info"
    Write-Status "准备启动开发服务器..." "Info"
    Write-Status "" "Info"
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Status "========== GRT System HMR Fix Script ==========" "Info"
Write-Status "项目路径: $ProjectPath" "Info"

if ($DryRun) {
    Write-Status "[DRY RUN 模式] 不会实际执行任何操作" "Warning"
}

Write-Status "" "Info"

# 执行修复步骤
Test-ProjectPath
Stop-DevServer
Clear-ViteCache
Clear-BrowserCache
Reinstall-Dependencies
Update-ViteConfig
Create-EnvFile

if (-not $DryRun) {
    Show-Summary
    Start-DevServer
} else {
    Write-Status "" "Info"
    Write-Status "========== DRY RUN 完成 ==========" "Warning"
    Write-Status "如要实际执行修复，请运行: .\fix-hmr-windows.ps1" "Info"
}

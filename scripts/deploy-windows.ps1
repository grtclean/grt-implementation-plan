<#
.SYNOPSIS
    GRT智能系统 Windows 11 一键部署脚本
.DESCRIPTION
    自动化环境检查、依赖安装、项目配置和服务启动
.NOTES
    版本: 1.0.0
    作者: GRT Team
    日期: 2026-01-25
#>

param(
    [switch]$SkipEnvCheck,
    [switch]$SkipDbSetup,
    [switch]$DevMode,
    [string]$GitRepo = "https://github.com/your-org/grt-implementation-plan.git",
    [string]$InstallPath = "C:\GRT-System"
)

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { Write-ColorOutput $args[0] "Green" }
function Write-Warning { Write-ColorOutput $args[0] "Yellow" }
function Write-Error { Write-ColorOutput $args[0] "Red" }
function Write-Info { Write-ColorOutput $args[0] "Cyan" }

# 显示横幅
function Show-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "║     GRT智能系统 - Windows 11 一键部署脚本                    ║" -ForegroundColor Cyan
    Write-Host "║     版本: 1.0.0                                              ║" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# 获取版本号
function Get-VersionNumber {
    param([string]$VersionString)
    if ($VersionString -match '(\d+\.\d+\.\d+)') {
        return $Matches[1]
    }
    return "0.0.0"
}

# 比较版本号
function Compare-Version {
    param([string]$Current, [string]$Required)
    $currentParts = $Current.Split('.') | ForEach-Object { [int]$_ }
    $requiredParts = $Required.Split('.') | ForEach-Object { [int]$_ }
    
    for ($i = 0; $i -lt 3; $i++) {
        if ($currentParts[$i] -gt $requiredParts[$i]) { return 1 }
        if ($currentParts[$i] -lt $requiredParts[$i]) { return -1 }
    }
    return 0
}

# ========================================
# 环境检查
# ========================================

function Test-Environment {
    Write-Info "=========================================="
    Write-Info "步骤 1/6: 环境检查"
    Write-Info "=========================================="
    
    $checks = @{
        "Node.js" = @{ Command = "node"; MinVersion = "18.0.0"; GetVersion = { node --version } }
        "pnpm" = @{ Command = "pnpm"; MinVersion = "8.0.0"; GetVersion = { pnpm --version } }
        "Git" = @{ Command = "git"; MinVersion = "2.0.0"; GetVersion = { git --version } }
        "MySQL" = @{ Command = "mysql"; MinVersion = "8.0.0"; GetVersion = { mysql --version } }
    }
    
    $allPassed = $true
    $missingDeps = @()
    
    foreach ($name in $checks.Keys) {
        $check = $checks[$name]
        Write-Host "检查 $name... " -NoNewline
        
        if (Test-Command $check.Command) {
            $versionOutput = & $check.GetVersion 2>&1
            $version = Get-VersionNumber $versionOutput
            $comparison = Compare-Version $version $check.MinVersion
            
            if ($comparison -ge 0) {
                Write-Success "✓ $version"
            } else {
                Write-Warning "⚠ $version (需要 >= $($check.MinVersion))"
                $missingDeps += $name
                $allPassed = $false
            }
        } else {
            Write-Error "✗ 未安装"
            $missingDeps += $name
            $allPassed = $false
        }
    }
    
    if (-not $allPassed) {
        Write-Host ""
        Write-Warning "以下依赖需要安装或更新:"
        foreach ($dep in $missingDeps) {
            Write-Warning "  - $dep"
        }
        Write-Host ""
        
        $install = Read-Host "是否自动安装缺失的依赖? (Y/N)"
        if ($install -eq 'Y' -or $install -eq 'y') {
            Install-Dependencies $missingDeps
        } else {
            Write-Error "请手动安装缺失的依赖后重新运行此脚本"
            exit 1
        }
    }
    
    Write-Success "环境检查通过!"
    return $true
}

# ========================================
# 依赖安装
# ========================================

function Install-Dependencies {
    param([string[]]$Dependencies)
    
    Write-Info "=========================================="
    Write-Info "步骤 2/6: 安装依赖"
    Write-Info "=========================================="
    
    # 检查 Chocolatey
    if (-not (Test-Command "choco")) {
        Write-Info "安装 Chocolatey 包管理器..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    foreach ($dep in $Dependencies) {
        Write-Info "安装 $dep..."
        
        switch ($dep) {
            "Node.js" {
                choco install nodejs-lts -y
                # 安装 pnpm
                npm install -g pnpm
            }
            "pnpm" {
                npm install -g pnpm
            }
            "Git" {
                choco install git -y
            }
            "MySQL" {
                choco install mysql -y
                Write-Warning "MySQL 已安装，请记得设置 root 密码"
            }
        }
    }
    
    # 刷新环境变量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "依赖安装完成!"
}

# ========================================
# 项目克隆
# ========================================

function Clone-Project {
    Write-Info "=========================================="
    Write-Info "步骤 3/6: 克隆项目"
    Write-Info "=========================================="
    
    if (Test-Path $InstallPath) {
        Write-Warning "目录 $InstallPath 已存在"
        $overwrite = Read-Host "是否删除并重新克隆? (Y/N)"
        if ($overwrite -eq 'Y' -or $overwrite -eq 'y') {
            Remove-Item -Recurse -Force $InstallPath
        } else {
            Write-Info "使用现有目录"
            return
        }
    }
    
    Write-Info "克隆项目到 $InstallPath..."
    git clone $GitRepo $InstallPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "项目克隆失败!"
        exit 1
    }
    
    Write-Success "项目克隆完成!"
}

# ========================================
# 数据库配置
# ========================================

function Setup-Database {
    Write-Info "=========================================="
    Write-Info "步骤 4/6: 数据库配置"
    Write-Info "=========================================="
    
    $dbHost = Read-Host "MySQL 主机 (默认: localhost)"
    if ([string]::IsNullOrEmpty($dbHost)) { $dbHost = "localhost" }
    
    $dbPort = Read-Host "MySQL 端口 (默认: 3306)"
    if ([string]::IsNullOrEmpty($dbPort)) { $dbPort = "3306" }
    
    $dbUser = Read-Host "MySQL 用户名 (默认: root)"
    if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "root" }
    
    $dbPassword = Read-Host "MySQL 密码" -AsSecureString
    $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
    
    $dbName = Read-Host "数据库名称 (默认: grt_system)"
    if ([string]::IsNullOrEmpty($dbName)) { $dbName = "grt_system" }
    
    # 创建数据库
    Write-Info "创建数据库 $dbName..."
    
    $createDbSql = "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    try {
        mysql -h $dbHost -P $dbPort -u $dbUser -p"$dbPasswordPlain" -e $createDbSql
        Write-Success "数据库创建成功!"
    } catch {
        Write-Error "数据库创建失败: $_"
        exit 1
    }
    
    # 生成 DATABASE_URL
    $databaseUrl = "mysql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"
    
    # 保存到环境变量文件
    $envFile = Join-Path $InstallPath ".env"
    Add-Content -Path $envFile -Value "DATABASE_URL=$databaseUrl"
    
    Write-Success "数据库配置完成!"
    return $databaseUrl
}

# ========================================
# 环境变量配置
# ========================================

function Setup-Environment {
    Write-Info "=========================================="
    Write-Info "步骤 5/6: 环境变量配置"
    Write-Info "=========================================="
    
    $envFile = Join-Path $InstallPath ".env"
    $envTemplate = Join-Path $InstallPath "docker" "config.env.template"
    
    # 如果模板存在，复制模板
    if (Test-Path $envTemplate) {
        Copy-Item $envTemplate $envFile -Force
    }
    
    # 生成 JWT_SECRET
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    # 配置环境变量
    $envVars = @{
        "NODE_ENV" = if ($DevMode) { "development" } else { "production" }
        "PORT" = "3000"
        "JWT_SECRET" = $jwtSecret
        "VITE_APP_TITLE" = "GRT智能系统"
    }
    
    Write-Info "配置环境变量..."
    
    foreach ($key in $envVars.Keys) {
        $value = $envVars[$key]
        
        # 检查是否已存在
        $content = Get-Content $envFile -ErrorAction SilentlyContinue
        if ($content -match "^$key=") {
            # 更新现有值
            $content = $content -replace "^$key=.*", "$key=$value"
            Set-Content -Path $envFile -Value $content
        } else {
            # 添加新值
            Add-Content -Path $envFile -Value "$key=$value"
        }
    }
    
    Write-Host ""
    Write-Warning "请配置以下可选环境变量 (在 .env 文件中):"
    Write-Warning "  - JIANDAOYUN_API_KEY: 简道云 API 密钥"
    Write-Warning "  - JIANDAOYUN_CORP_ID: 简道云企业 ID"
    Write-Warning "  - GEMINI_API_KEY: Google Gemini API 密钥"
    Write-Warning "  - MICROSOFT_CLIENT_ID: Microsoft OAuth 客户端 ID"
    Write-Warning "  - MICROSOFT_CLIENT_SECRET: Microsoft OAuth 客户端密钥"
    Write-Host ""
    
    Write-Success "环境变量配置完成!"
}

# ========================================
# 项目初始化和启动
# ========================================

function Initialize-Project {
    Write-Info "=========================================="
    Write-Info "步骤 6/6: 项目初始化和启动"
    Write-Info "=========================================="
    
    Set-Location $InstallPath
    
    # 安装依赖
    Write-Info "安装项目依赖..."
    pnpm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败!"
        exit 1
    }
    
    # 推送数据库 Schema
    Write-Info "初始化数据库结构..."
    pnpm db:push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "数据库初始化可能失败，请检查数据库连接"
    }
    
    # 构建项目 (生产模式)
    if (-not $DevMode) {
        Write-Info "构建生产版本..."
        pnpm build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "项目构建失败!"
            exit 1
        }
    }
    
    Write-Success "项目初始化完成!"
    
    # 启动服务
    Write-Host ""
    $startNow = Read-Host "是否立即启动服务? (Y/N)"
    if ($startNow -eq 'Y' -or $startNow -eq 'y') {
        if ($DevMode) {
            Write-Info "启动开发服务器..."
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$InstallPath'; pnpm dev"
        } else {
            Write-Info "启动生产服务器..."
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$InstallPath'; node dist/index.js"
        }
        
        Write-Success "服务已启动!"
        Write-Info "访问地址: http://localhost:3000"
    }
}

# ========================================
# 健康检查
# ========================================

function Test-Health {
    Write-Info "=========================================="
    Write-Info "健康检查"
    Write-Info "=========================================="
    
    Write-Info "等待服务启动..."
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "✓ 服务运行正常"
            Write-Success "✓ 访问地址: http://localhost:3000"
        } else {
            Write-Warning "⚠ 服务响应异常: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "⚠ 无法连接到服务，请检查日志"
    }
}

# ========================================
# 主函数
# ========================================

function Main {
    Show-Banner
    
    # 检查管理员权限
    if (-not (Test-Administrator)) {
        Write-Warning "建议以管理员身份运行此脚本以获得完整功能"
        $continue = Read-Host "是否继续? (Y/N)"
        if ($continue -ne 'Y' -and $continue -ne 'y') {
            exit 0
        }
    }
    
    # 执行部署步骤
    if (-not $SkipEnvCheck) {
        Test-Environment
    }
    
    Clone-Project
    
    if (-not $SkipDbSetup) {
        Setup-Database
    }
    
    Setup-Environment
    Initialize-Project
    Test-Health
    
    Write-Host ""
    Write-Success "╔══════════════════════════════════════════════════════════════╗"
    Write-Success "║                                                              ║"
    Write-Success "║     GRT智能系统部署完成!                                     ║"
    Write-Success "║                                                              ║"
    Write-Success "║     访问地址: http://localhost:3000                          ║"
    Write-Success "║     安装目录: $InstallPath                                   ║"
    Write-Success "║                                                              ║"
    Write-Success "╚══════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    Write-Info "常用命令:"
    Write-Info "  启动开发服务器: pnpm dev"
    Write-Info "  启动生产服务器: node dist/index.js"
    Write-Info "  运行测试: pnpm test"
    Write-Info "  数据库迁移: pnpm db:push"
}

# 运行主函数
Main

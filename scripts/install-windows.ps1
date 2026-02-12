# ============================================================
# GRT智能系统 Windows 11 一键安装脚本
# 版本: v1.3.22
# 作者: Manus AI
# 日期: 2026-02-01
# ============================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "cloud", "docker")]
    [string]$Environment = "local",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipNodeInstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMySQLInstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$Interactive
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param(
        [int]$Step,
        [int]$Total,
        [string]$Message
    )
    Write-Host "[$Step/$Total] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  → $Message" -ForegroundColor Gray
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查命令是否存在
function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# 主菜单
function Show-MainMenu {
    Clear-Host
    Write-Header "GRT智能系统 安装向导"
    
    Write-Host "请选择安装环境:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1] 本地开发环境 (Windows 11)" -ForegroundColor Yellow
    Write-Host "  [2] Docker容器环境" -ForegroundColor Yellow
    Write-Host "  [3] 云服务器环境 (Linux)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [Q] 退出安装" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "请输入选项 (1-3)"
    
    switch ($choice) {
        "1" { return "local" }
        "2" { return "docker" }
        "3" { return "cloud" }
        "Q" { exit 0 }
        "q" { exit 0 }
        default { 
            Write-Error "无效选项，请重新选择"
            Start-Sleep -Seconds 2
            return Show-MainMenu
        }
    }
}

# 检查系统要求
function Test-SystemRequirements {
    Write-Step 1 8 "检查系统要求..."
    
    # 检查操作系统
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os.Caption -notlike "*Windows 11*" -and $os.Caption -notlike "*Windows 10*") {
        Write-Error "需要 Windows 10 或 Windows 11 操作系统"
        return $false
    }
    Write-Success "操作系统: $($os.Caption)"
    
    # 检查内存
    $totalMemory = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    if ($totalMemory -lt 8) {
        Write-Error "内存不足，需要至少 8GB (当前: ${totalMemory}GB)"
        return $false
    }
    Write-Success "内存: ${totalMemory}GB"
    
    # 检查磁盘空间
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 2)
    if ($freeSpace -lt 20) {
        Write-Error "磁盘空间不足，需要至少 20GB (当前: ${freeSpace}GB)"
        return $false
    }
    Write-Success "可用磁盘空间: ${freeSpace}GB"
    
    return $true
}

# 安装Node.js
function Install-NodeJS {
    Write-Step 2 8 "检查/安装 Node.js..."
    
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        if ($nodeVersion -match "v22\.") {
            Write-Success "Node.js 已安装: $nodeVersion"
            return $true
        } else {
            Write-Info "当前版本: $nodeVersion，需要 v22.x"
        }
    }
    
    if ($SkipNodeInstall) {
        Write-Info "跳过 Node.js 安装"
        return $true
    }
    
    Write-Info "正在下载 Node.js 22 LTS..."
    
    # 下载Node.js安装包
    $nodeUrl = "https://nodejs.org/dist/v22.13.0/node-v22.13.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-v22.13.0-x64.msi"
    
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Info "正在安装 Node.js..."
        Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/quiet", "/norestart" -Wait
        
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        if (Test-CommandExists "node") {
            $nodeVersion = node --version
            Write-Success "Node.js 安装成功: $nodeVersion"
            return $true
        } else {
            Write-Error "Node.js 安装失败，请手动安装"
            return $false
        }
    } catch {
        Write-Error "下载/安装失败: $_"
        return $false
    }
}

# 安装pnpm
function Install-Pnpm {
    Write-Step 3 8 "检查/安装 pnpm..."
    
    if (Test-CommandExists "pnpm") {
        $pnpmVersion = pnpm --version
        Write-Success "pnpm 已安装: $pnpmVersion"
        return $true
    }
    
    Write-Info "正在安装 pnpm..."
    
    try {
        npm install -g pnpm@10.4.1
        
        if (Test-CommandExists "pnpm") {
            $pnpmVersion = pnpm --version
            Write-Success "pnpm 安装成功: $pnpmVersion"
            return $true
        } else {
            Write-Error "pnpm 安装失败"
            return $false
        }
    } catch {
        Write-Error "安装失败: $_"
        return $false
    }
}

# 安装Git
function Install-Git {
    Write-Step 4 8 "检查/安装 Git..."
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Success "Git 已安装: $gitVersion"
        return $true
    }
    
    Write-Info "请手动安装 Git: https://git-scm.com/download/win"
    Write-Info "安装完成后重新运行此脚本"
    return $false
}

# 配置MySQL
function Install-MySQL {
    Write-Step 5 8 "检查/配置 MySQL..."
    
    if ($SkipMySQLInstall) {
        Write-Info "跳过 MySQL 安装"
        return $true
    }
    
    # 检查MySQL服务
    $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    if ($mysqlService) {
        Write-Success "MySQL 服务已存在: $($mysqlService.Name)"
        return $true
    }
    
    # 检查Docker
    if (Test-CommandExists "docker") {
        Write-Info "检测到 Docker，是否使用 Docker 运行 MySQL? (Y/N)"
        $useDocker = Read-Host
        
        if ($useDocker -eq "Y" -or $useDocker -eq "y") {
            Write-Info "正在启动 MySQL Docker 容器..."
            
            docker run -d `
                --name grt-mysql `
                -p 3306:3306 `
                -e MYSQL_ROOT_PASSWORD=grt_root_password `
                -e MYSQL_DATABASE=grt_system `
                -v grt-mysql-data:/var/lib/mysql `
                mysql:8.0
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "MySQL Docker 容器启动成功"
                return $true
            } else {
                Write-Error "MySQL Docker 容器启动失败"
                return $false
            }
        }
    }
    
    Write-Info "请手动安装 MySQL 8.0: https://dev.mysql.com/downloads/installer/"
    Write-Info "安装完成后重新运行此脚本"
    return $false
}

# 安装项目依赖
function Install-Dependencies {
    Write-Step 6 8 "安装项目依赖..."
    
    if (-not (Test-Path "package.json")) {
        Write-Error "未找到 package.json，请确保在项目根目录运行"
        return $false
    }
    
    Write-Info "正在安装依赖，这可能需要几分钟..."
    
    try {
        pnpm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "依赖安装成功"
            return $true
        } else {
            Write-Error "依赖安装失败"
            return $false
        }
    } catch {
        Write-Error "安装失败: $_"
        return $false
    }
}

# 配置环境变量
function Configure-Environment {
    Write-Step 7 8 "配置环境变量..."
    
    $envFile = ".env"
    
    if (Test-Path $envFile) {
        Write-Info ".env 文件已存在"
        $overwrite = Read-Host "是否覆盖? (Y/N)"
        if ($overwrite -ne "Y" -and $overwrite -ne "y") {
            Write-Success "保留现有配置"
            return $true
        }
    }
    
    # 生成JWT密钥
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    # 创建.env文件
    $envContent = @"
# GRT智能系统 环境配置
# 生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ==================== 核心配置 ====================
NODE_ENV=development
DATABASE_URL="mysql://root:grt_root_password@localhost:3306/grt_system"
JWT_SECRET="$jwtSecret"

# ==================== OAuth配置 ====================
VITE_APP_ID=""
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/login"
OWNER_OPEN_ID=""
OWNER_NAME=""

# ==================== Manus内置API ====================
BUILT_IN_FORGE_API_URL=""
BUILT_IN_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""
VITE_FRONTEND_FORGE_API_KEY=""

# ==================== Microsoft Graph API ====================
MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""

# ==================== Gemini API ====================
GEMINI_API_KEY=""

# ==================== 简道云API ====================
JIANDAOYUN_API_KEY=""
JIANDAOYUN_CORP_ID=""

# ==================== 前端配置 ====================
VITE_APP_TITLE="GRT智能系统"
VITE_APP_LOGO="/logo.svg"
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding utf8
    Write-Success ".env 文件已创建"
    Write-Info "请编辑 .env 文件，填写必要的配置项"
    
    return $true
}

# 初始化数据库
function Initialize-Database {
    Write-Step 8 8 "初始化数据库..."
    
    Write-Info "正在执行数据库迁移..."
    
    try {
        pnpm db:push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "数据库初始化成功"
            return $true
        } else {
            Write-Info "数据库迁移可能需要手动确认"
            return $true
        }
    } catch {
        Write-Error "数据库初始化失败: $_"
        return $false
    }
}

# 显示完成信息
function Show-CompletionInfo {
    Write-Header "安装完成"
    
    Write-Host "GRT智能系统 v1.3.22 已成功安装!" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步操作:" -ForegroundColor Yellow
    Write-Host "  1. 编辑 .env 文件，配置必要的环境变量" -ForegroundColor White
    Write-Host "  2. 运行 'pnpm dev' 启动开发服务器" -ForegroundColor White
    Write-Host "  3. 访问 http://localhost:3000 查看系统" -ForegroundColor White
    Write-Host ""
    Write-Host "常用命令:" -ForegroundColor Yellow
    Write-Host "  pnpm dev      - 启动开发服务器" -ForegroundColor Gray
    Write-Host "  pnpm build    - 构建生产版本" -ForegroundColor Gray
    Write-Host "  pnpm start    - 启动生产服务" -ForegroundColor Gray
    Write-Host "  pnpm test     - 运行测试" -ForegroundColor Gray
    Write-Host "  pnpm db:push  - 执行数据库迁移" -ForegroundColor Gray
    Write-Host ""
    Write-Host "文档位置: docs/deployment/GRT-System-Windows11-Deployment-Guide-v1.3.22.md" -ForegroundColor Gray
    Write-Host ""
}

# 主函数
function Main {
    Write-Header "GRT智能系统 安装程序 v1.3.22"
    
    # 检查管理员权限
    if (-not (Test-Administrator)) {
        Write-ColorOutput "警告: 建议以管理员身份运行此脚本" "Yellow"
    }
    
    # 交互式菜单
    if ($Interactive) {
        $Environment = Show-MainMenu
    }
    
    Write-Info "安装环境: $Environment"
    Write-Host ""
    
    # 执行安装步骤
    $steps = @(
        @{ Name = "系统要求检查"; Function = { Test-SystemRequirements } },
        @{ Name = "Node.js 安装"; Function = { Install-NodeJS } },
        @{ Name = "pnpm 安装"; Function = { Install-Pnpm } },
        @{ Name = "Git 检查"; Function = { Install-Git } },
        @{ Name = "MySQL 配置"; Function = { Install-MySQL } },
        @{ Name = "依赖安装"; Function = { Install-Dependencies } },
        @{ Name = "环境配置"; Function = { Configure-Environment } },
        @{ Name = "数据库初始化"; Function = { Initialize-Database } }
    )
    
    $success = $true
    foreach ($step in $steps) {
        $result = & $step.Function
        if (-not $result) {
            Write-Error "$($step.Name) 失败"
            $success = $false
            break
        }
    }
    
    if ($success) {
        Show-CompletionInfo
    } else {
        Write-Host ""
        Write-Error "安装未完成，请检查错误信息并重试"
        Write-Host ""
    }
}

# 运行主函数
Main

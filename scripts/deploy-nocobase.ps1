# NocoBase 本地部署自动化脚本 (Windows PowerShell)
# 用途：在Windows上自动部署NocoBase并导入GRT系统配置

param(
    [string]$ProjectPath = "D:\GRT-NocoBase",
    [string]$MySQLPassword = "nocobase123",
    [string]$AppPort = "13000",
    [switch]$SkipMysql = $false,
    [switch]$SkipInstall = $false,
    [switch]$StartServer = $true
)

# 颜色定义
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    $Color = $Colors[$Level]
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [$Level] $Message" -ForegroundColor $Color
}

function Test-Prerequisites {
    Write-Log "检查系统环境..." "Info"
    
    # 检查 Node.js
    $nodeVersion = node -v
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Node.js 版本: $nodeVersion" "Success"
    } else {
        Write-Log "Node.js 未安装，请先安装 Node.js 18+" "Error"
        exit 1
    }
    
    # 检查 npm
    $npmVersion = npm -v
    if ($LASTEXITCODE -eq 0) {
        Write-Log "npm 版本: $npmVersion" "Success"
    } else {
        Write-Log "npm 未安装" "Error"
        exit 1
    }
    
    # 检查 yarn
    $yarnVersion = yarn -v
    if ($LASTEXITCODE -eq 0) {
        Write-Log "yarn 版本: $yarnVersion" "Success"
    } else {
        Write-Log "yarn 未安装，正在安装..." "Warning"
        npm install -g yarn
    }
    
    # 检查 MySQL
    if (-not $SkipMysql) {
        try {
            $mysqlVersion = mysql --version
            Write-Log "MySQL 已安装: $mysqlVersion" "Success"
        } catch {
            Write-Log "MySQL 未安装，请先安装 MySQL 8.0" "Error"
            exit 1
        }
    }
}

function Setup-ProjectDirectory {
    Write-Log "设置项目目录..." "Info"
    
    if (-not (Test-Path $ProjectPath)) {
        New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
        Write-Log "创建项目目录: $ProjectPath" "Success"
    } else {
        Write-Log "项目目录已存在: $ProjectPath" "Info"
    }
    
    Set-Location $ProjectPath
}

function Setup-Database {
    Write-Log "配置数据库..." "Info"
    
    if ($SkipMysql) {
        Write-Log "跳过MySQL配置" "Warning"
        return
    }
    
    # 创建数据库
    $sqlCommand = @"
CREATE DATABASE IF NOT EXISTS grt_nocobase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'nocobase'@'localhost' IDENTIFIED BY '$MySQLPassword';
GRANT ALL PRIVILEGES ON grt_nocobase.* TO 'nocobase'@'localhost';
FLUSH PRIVILEGES;
"@
    
    $sqlCommand | mysql -u root -p
    Write-Log "数据库创建成功" "Success"
}

function Create-NocoBaseApp {
    Write-Log "创建NocoBase应用..." "Info"
    
    if ($SkipInstall) {
        Write-Log "跳过应用创建" "Warning"
        return
    }
    
    # 设置镜像
    npm config set registry https://registry.npmmirror.com
    yarn config set registry https://registry.npmmirror.com
    Write-Log "已设置国内镜像" "Success"
    
    # 创建应用
    yarn create nocobase-app grt-system -d mysql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "NocoBase应用创建成功" "Success"
    } else {
        Write-Log "NocoBase应用创建失败" "Error"
        exit 1
    }
}

function Configure-Environment {
    Write-Log "配置环境变量..." "Info"
    
    $envFile = "grt-system\.env"
    
    $envContent = @"
# 应用配置
APP_ENV=development
APP_PORT=$AppPort
APP_KEY=grt-nocobase-secret-key-2026-$(Get-Random)

# 数据库配置
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=grt_nocobase
DB_USER=root
DB_PASSWORD=$MySQLPassword
DB_TIMEZONE=+08:00
DB_LOGGING=false

# 管理员账号
INIT_ROOT_EMAIL=admin@grt.com
INIT_ROOT_PASSWORD=Admin@123456
INIT_ROOT_NICKNAME=GRT管理员

# 存储配置
LOCAL_STORAGE_BASE_URL=/storage/uploads
STORAGE_TYPE=local

# 日志配置
LOG_LEVEL=info
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Log "环境变量配置完成: $envFile" "Success"
}

function Initialize-NocoBase {
    Write-Log "初始化NocoBase..." "Info"
    
    Set-Location "grt-system"
    
    # 安装依赖
    Write-Log "安装依赖..." "Info"
    yarn install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "依赖安装失败" "Error"
        exit 1
    }
    
    # 初始化
    Write-Log "初始化数据库..." "Info"
    yarn nocobase install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "NocoBase初始化成功" "Success"
    } else {
        Write-Log "NocoBase初始化失败" "Error"
        exit 1
    }
}

function Import-Configurations {
    Write-Log "导入GRT系统配置..." "Info"
    
    # 这里需要手动导入或通过API导入
    Write-Log "请在NocoBase管理界面中手动导入以下配置文件:" "Warning"
    Write-Log "1. Collections: nocobase/collections/*.json" "Info"
    Write-Log "2. Workflows: nocobase/workflows/*.json" "Info"
}

function Start-Server {
    Write-Log "启动NocoBase服务器..." "Info"
    
    if (-not $StartServer) {
        Write-Log "跳过启动服务器" "Warning"
        return
    }
    
    Write-Log "启动服务器，访问地址: http://localhost:$AppPort" "Success"
    yarn dev
}

function Main {
    Write-Log "========================================" "Info"
    Write-Log "GRT系统 NocoBase 本地部署脚本" "Info"
    Write-Log "========================================" "Info"
    
    Test-Prerequisites
    Setup-ProjectDirectory
    Setup-Database
    Create-NocoBaseApp
    Configure-Environment
    Initialize-NocoBase
    Import-Configurations
    Start-Server
    
    Write-Log "========================================" "Success"
    Write-Log "部署完成！" "Success"
    Write-Log "========================================" "Success"
}

# 执行主函数
Main

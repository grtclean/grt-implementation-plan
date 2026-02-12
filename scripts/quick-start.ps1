# ==========================================
# GRT智能系统 - Windows快速启动脚本
# 版本: v3.1.9
# 适用于: Windows 10/11 + Docker Desktop
# ==========================================

param(
    [switch]$Dev,      # 开发模式（包含Adminer）
    [switch]$Prod,     # 生产模式（包含Nginx）
    [switch]$Build,    # 重新构建镜像
    [switch]$Help      # 显示帮助
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { Write-ColorOutput $args[0] "Green" }
function Write-Warning { Write-ColorOutput $args[0] "Yellow" }
function Write-Error { Write-ColorOutput $args[0] "Red" }
function Write-Info { Write-ColorOutput $args[0] "Cyan" }

# 显示横幅
function Show-Banner {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  GRT智能系统 - Windows快速启动脚本" -ForegroundColor Cyan
    Write-Host "  版本: v3.1.9" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

# 显示帮助
function Show-Help {
    Write-Host "用法: .\quick-start.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Dev     开发模式（包含Adminer数据库管理工具）"
    Write-Host "  -Prod    生产模式（包含Nginx反向代理）"
    Write-Host "  -Build   重新构建Docker镜像"
    Write-Host "  -Help    显示此帮助信息"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\quick-start.ps1           # 默认启动"
    Write-Host "  .\quick-start.ps1 -Dev      # 开发模式启动"
    Write-Host "  .\quick-start.ps1 -Build    # 重新构建并启动"
    Write-Host ""
}

# 检查Docker是否安装
function Test-Docker {
    Write-Info "检查Docker安装状态..."
    
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Docker已安装: $dockerVersion"
            return $true
        }
    }
    catch {
        Write-Error "✗ Docker未安装"
        Write-Host ""
        Write-Host "请先安装Docker Desktop for Windows:"
        Write-Host "https://docs.docker.com/desktop/install/windows-install/"
        return $false
    }
}

# 检查Docker是否运行
function Test-DockerRunning {
    Write-Info "检查Docker运行状态..."
    
    try {
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Docker Desktop正在运行"
            return $true
        }
    }
    catch {
        Write-Error "✗ Docker Desktop未运行"
        Write-Host ""
        Write-Host "请启动Docker Desktop应用程序"
        return $false
    }
}

# 检查Docker Compose
function Test-DockerCompose {
    Write-Info "检查Docker Compose..."
    
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Docker Compose已安装: $composeVersion"
            return $true
        }
    }
    catch {
        # 尝试旧版本命令
        try {
            $composeVersion = docker-compose --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Docker Compose已安装: $composeVersion"
                return $true
            }
        }
        catch {
            Write-Error "✗ Docker Compose未安装"
            return $false
        }
    }
}

# 检查环境变量文件
function Test-EnvFile {
    Write-Info "检查环境变量配置..."
    
    if (Test-Path ".env") {
        Write-Success "✓ .env文件已存在"
        return $true
    }
    else {
        Write-Warning "! .env文件不存在，正在创建默认配置..."
        
        if (Test-Path ".env.windows.example") {
            Copy-Item ".env.windows.example" ".env"
            Write-Success "✓ 已从模板创建.env文件"
        }
        else {
            # 创建基本的.env文件
            @"
# GRT智能系统环境配置
DATABASE_URL=mysql://grt:grt_password@mysql:3306/grt_db
JWT_SECRET=grt-development-jwt-secret-change-in-production
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=grt_db
MYSQL_USER=grt
MYSQL_PASSWORD=grt_password
VITE_APP_ID=grt-system
VITE_APP_TITLE=GRT智能系统
TZ=Asia/Shanghai
"@ | Out-File -FilePath ".env" -Encoding UTF8
            Write-Success "✓ 已创建默认.env文件"
        }
        
        Write-Warning "请编辑.env文件配置您的环境变量"
        return $true
    }
}

# 启动服务
function Start-Services {
    param(
        [switch]$DevMode,
        [switch]$ProdMode,
        [switch]$Rebuild
    )
    
    Write-Host ""
    Write-Info "正在启动GRT智能系统..."
    
    # 确定使用哪个compose文件
    $composeFile = "docker-compose.windows.yml"
    if (-not (Test-Path $composeFile)) {
        $composeFile = "docker-compose.yml"
    }
    
    # 构建命令
    $composeCmd = "docker compose -f $composeFile"
    
    # 添加profile
    $profiles = @()
    if ($DevMode) {
        $profiles += "dev"
        Write-Info "启动开发环境（包含Adminer）..."
    }
    if ($ProdMode) {
        $profiles += "prod"
        Write-Info "启动生产环境（包含Nginx）..."
    }
    
    # 构建参数
    $args = @()
    if ($Rebuild) {
        $args += "--build"
        Write-Info "重新构建Docker镜像..."
    }
    
    # 执行启动命令
    if ($profiles.Count -gt 0) {
        $profileArgs = ($profiles | ForEach-Object { "--profile $_" }) -join " "
        $fullCmd = "$composeCmd $profileArgs up -d $($args -join ' ')"
    }
    else {
        $fullCmd = "$composeCmd up -d $($args -join ' ')"
    }
    
    Write-Host "执行: $fullCmd" -ForegroundColor Gray
    Invoke-Expression $fullCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ 服务启动命令已执行"
    }
    else {
        Write-Error "✗ 服务启动失败"
        return $false
    }
    
    return $true
}

# 等待服务就绪
function Wait-ForServices {
    Write-Host ""
    Write-Info "等待服务就绪..."
    
    # 等待MySQL
    Write-Host -NoNewline "等待MySQL..."
    $maxRetries = 30
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        $result = docker exec grt-mysql mysqladmin ping -h localhost -u root -proot_password 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success " 就绪"
            break
        }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
        $retryCount++
    }
    
    if ($retryCount -ge $maxRetries) {
        Write-Warning " 超时（服务可能仍在启动中）"
    }
    
    # 等待应用
    Write-Host -NoNewline "等待应用服务..."
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success " 就绪"
                break
            }
        }
        catch {
            # 继续等待
        }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
        $retryCount++
    }
    
    if ($retryCount -ge $maxRetries) {
        Write-Warning " 超时（服务可能仍在启动中）"
    }
}

# 显示访问信息
function Show-AccessInfo {
    param(
        [switch]$DevMode,
        [switch]$ProdMode
    )
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  GRT智能系统已成功启动！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问地址:"
    Write-Host "  - 应用: " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Cyan
    
    if ($DevMode) {
        Write-Host "  - 数据库管理(Adminer): " -NoNewline
        Write-Host "http://localhost:8080" -ForegroundColor Cyan
        Write-Host "    服务器: mysql"
        Write-Host "    用户名: grt"
        Write-Host "    密码: (见.env文件)"
    }
    
    if ($ProdMode) {
        Write-Host "  - Nginx代理: " -NoNewline
        Write-Host "http://localhost:80" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "常用命令:"
    Write-Host "  - 查看日志: " -NoNewline
    Write-Host "docker logs -f grt-app" -ForegroundColor Yellow
    Write-Host "  - 停止服务: " -NoNewline
    Write-Host ".\scripts\stop.ps1" -ForegroundColor Yellow
    Write-Host "  - 重启服务: " -NoNewline
    Write-Host ".\scripts\restart.ps1" -ForegroundColor Yellow
    Write-Host ""
}

# 主函数
function Main {
    Show-Banner
    
    if ($Help) {
        Show-Help
        return
    }
    
    # 环境检查
    Write-Info "检查环境..."
    
    if (-not (Test-Docker)) { return }
    if (-not (Test-DockerRunning)) { return }
    if (-not (Test-DockerCompose)) { return }
    if (-not (Test-EnvFile)) { return }
    
    # 启动服务
    $started = Start-Services -DevMode:$Dev -ProdMode:$Prod -Rebuild:$Build
    
    if ($started) {
        Wait-ForServices
        Show-AccessInfo -DevMode:$Dev -ProdMode:$Prod
    }
}

# 运行主函数
Main

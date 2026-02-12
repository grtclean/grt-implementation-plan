# ==========================================
# GRT智能系统 - Windows重启脚本
# 版本: v3.1.9
# ==========================================

param(
    [switch]$Dev,      # 开发模式
    [switch]$Prod,     # 生产模式
    [switch]$Build,    # 重新构建
    [switch]$Help      # 显示帮助
)

function Show-Banner {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  GRT智能系统 - 重启服务" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host "用法: .\restart.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Dev     开发模式"
    Write-Host "  -Prod    生产模式"
    Write-Host "  -Build   重新构建镜像"
    Write-Host "  -Help    显示此帮助信息"
    Write-Host ""
}

function Restart-Services {
    Write-Host "正在重启GRT智能系统..." -ForegroundColor Yellow
    
    # 确定使用哪个compose文件
    $composeFile = "docker-compose.windows.yml"
    if (-not (Test-Path $composeFile)) {
        $composeFile = "docker-compose.yml"
    }
    
    # 停止服务
    Write-Host "停止现有服务..." -ForegroundColor Gray
    docker compose -f $composeFile down
    
    # 启动服务
    Write-Host "启动服务..." -ForegroundColor Gray
    
    $profiles = @()
    if ($Dev) { $profiles += "dev" }
    if ($Prod) { $profiles += "prod" }
    
    $args = @()
    if ($Build) { $args += "--build" }
    
    if ($profiles.Count -gt 0) {
        $profileArgs = ($profiles | ForEach-Object { "--profile $_" }) -join " "
        $fullCmd = "docker compose -f $composeFile $profileArgs up -d $($args -join ' ')"
    }
    else {
        $fullCmd = "docker compose -f $composeFile up -d $($args -join ' ')"
    }
    
    Invoke-Expression $fullCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ GRT智能系统已重启" -ForegroundColor Green
        Write-Host ""
        Write-Host "访问地址: http://localhost:3000" -ForegroundColor Cyan
    }
    else {
        Write-Host ""
        Write-Host "✗ 重启服务时出现错误" -ForegroundColor Red
    }
}

# 主函数
Show-Banner

if ($Help) {
    Show-Help
}
else {
    Restart-Services
}

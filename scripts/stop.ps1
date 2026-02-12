# ==========================================
# GRT智能系统 - Windows停止脚本
# 版本: v3.1.9
# ==========================================

param(
    [switch]$RemoveVolumes,  # 同时删除数据卷
    [switch]$Help            # 显示帮助
)

function Show-Banner {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  GRT智能系统 - 停止服务" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host "用法: .\stop.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -RemoveVolumes  同时删除数据卷（警告：会删除所有数据）"
    Write-Host "  -Help           显示此帮助信息"
    Write-Host ""
}

function Stop-Services {
    Write-Host "正在停止GRT智能系统..." -ForegroundColor Yellow
    
    # 确定使用哪个compose文件
    $composeFile = "docker-compose.windows.yml"
    if (-not (Test-Path $composeFile)) {
        $composeFile = "docker-compose.yml"
    }
    
    if ($RemoveVolumes) {
        Write-Host "警告: 将删除所有数据卷！" -ForegroundColor Red
        $confirm = Read-Host "确认删除？(y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            docker compose -f $composeFile down -v
        }
        else {
            Write-Host "已取消" -ForegroundColor Yellow
            return
        }
    }
    else {
        docker compose -f $composeFile down
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ GRT智能系统已停止" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "✗ 停止服务时出现错误" -ForegroundColor Red
    }
}

# 主函数
Show-Banner

if ($Help) {
    Show-Help
}
else {
    Stop-Services
}

# ============================================
# GRT智能系统 - 健康检查脚本
# 版本: 1.0.0
# 作者: Manus AI
# ============================================

param(
    [string]$BaseUrl = "http://localhost:3000",
    [int]$Timeout = 10,
    [switch]$AutoRestart
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GRT智能系统 - 健康检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "检查时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "目标地址: $BaseUrl" -ForegroundColor Gray

$checks = @()

# ============================================
# 检查1：Web服务可用性
# ============================================
Write-Host "`n[1/4] 检查Web服务..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec $Timeout -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web服务正常 (HTTP $($response.StatusCode))" -ForegroundColor Green
        $checks += @{Name="Web服务"; Status="正常"; Details="HTTP 200"}
    } else {
        Write-Host "⚠️ Web服务响应异常 (HTTP $($response.StatusCode))" -ForegroundColor Yellow
        $checks += @{Name="Web服务"; Status="异常"; Details="HTTP $($response.StatusCode)"}
    }
} catch {
    Write-Host "❌ Web服务无响应: $($_.Exception.Message)" -ForegroundColor Red
    $checks += @{Name="Web服务"; Status="故障"; Details=$_.Exception.Message}
}

# ============================================
# 检查2：API端点可用性
# ============================================
Write-Host "`n[2/4] 检查API端点..." -ForegroundColor Yellow

$apiUrl = "$BaseUrl/api/trpc/system.health?batch=1&input=%7B%7D"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec $Timeout -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API端点正常" -ForegroundColor Green
        $checks += @{Name="API端点"; Status="正常"; Details="tRPC响应正常"}
    } else {
        Write-Host "⚠️ API端点响应异常" -ForegroundColor Yellow
        $checks += @{Name="API端点"; Status="异常"; Details="HTTP $($response.StatusCode)"}
    }
} catch {
    Write-Host "⚠️ API端点检查失败（可能需要认证）" -ForegroundColor Yellow
    $checks += @{Name="API端点"; Status="未知"; Details="需要认证或端点不存在"}
}

# ============================================
# 检查3：数据库连接
# ============================================
Write-Host "`n[3/4] 检查数据库连接..." -ForegroundColor Yellow

try {
    # 尝试通过MySQL命令检查
    $mysqlCheck = mysql -u grt_user -p -e "SELECT 1" grt_system 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库连接正常" -ForegroundColor Green
        $checks += @{Name="数据库"; Status="正常"; Details="MySQL连接成功"}
    } else {
        Write-Host "⚠️ 数据库连接失败" -ForegroundColor Yellow
        $checks += @{Name="数据库"; Status="异常"; Details="连接失败"}
    }
} catch {
    Write-Host "⚠️ 无法检查数据库（mysql命令不可用）" -ForegroundColor Yellow
    $checks += @{Name="数据库"; Status="未知"; Details="mysql命令不可用"}
}

# ============================================
# 检查4：PM2进程状态
# ============================================
Write-Host "`n[4/4] 检查PM2进程..." -ForegroundColor Yellow

try {
    $pm2Status = pm2 jlist 2>&1 | ConvertFrom-Json
    $grtProcess = $pm2Status | Where-Object { $_.name -eq "grt-system" }
    
    if ($grtProcess) {
        $status = $grtProcess.pm2_env.status
        $uptime = [TimeSpan]::FromMilliseconds($grtProcess.pm2_env.pm_uptime)
        $memory = [math]::Round($grtProcess.monit.memory / 1MB, 2)
        $cpu = $grtProcess.monit.cpu
        
        if ($status -eq "online") {
            Write-Host "✅ PM2进程正常" -ForegroundColor Green
            Write-Host "   状态: $status" -ForegroundColor Gray
            Write-Host "   运行时间: $($uptime.Days)天 $($uptime.Hours)小时" -ForegroundColor Gray
            Write-Host "   内存: ${memory}MB | CPU: ${cpu}%" -ForegroundColor Gray
            $checks += @{Name="PM2进程"; Status="正常"; Details="运行中 (${memory}MB)"}
        } else {
            Write-Host "⚠️ PM2进程状态异常: $status" -ForegroundColor Yellow
            $checks += @{Name="PM2进程"; Status="异常"; Details=$status}
        }
    } else {
        Write-Host "⚠️ 未找到grt-system进程" -ForegroundColor Yellow
        $checks += @{Name="PM2进程"; Status="未运行"; Details="进程不存在"}
    }
} catch {
    Write-Host "⚠️ PM2检查失败（PM2可能未安装）" -ForegroundColor Yellow
    $checks += @{Name="PM2进程"; Status="未知"; Details="PM2不可用"}
}

# ============================================
# 输出结果摘要
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "健康检查结果摘要" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$normalCount = ($checks | Where-Object { $_.Status -eq "正常" }).Count
$abnormalCount = ($checks | Where-Object { $_.Status -in @("异常", "故障") }).Count
$unknownCount = ($checks | Where-Object { $_.Status -in @("未知", "未运行") }).Count

Write-Host "`n检查项状态:" -ForegroundColor White
foreach ($check in $checks) {
    $statusColor = switch ($check.Status) {
        "正常" { "Green" }
        "异常" { "Yellow" }
        "故障" { "Red" }
        "未运行" { "Red" }
        default { "Gray" }
    }
    Write-Host "  $($check.Name): " -NoNewline
    Write-Host "$($check.Status)" -ForegroundColor $statusColor -NoNewline
    Write-Host " - $($check.Details)" -ForegroundColor Gray
}

Write-Host "`n统计: 正常($normalCount) | 异常($abnormalCount) | 未知($unknownCount)" -ForegroundColor Gray

# 自动重启逻辑
if ($AutoRestart -and $abnormalCount -gt 0) {
    Write-Host "`n检测到异常，尝试自动重启..." -ForegroundColor Yellow
    try {
        pm2 restart grt-system
        Write-Host "✅ 重启命令已发送" -ForegroundColor Green
    } catch {
        Write-Host "❌ 重启失败: $_" -ForegroundColor Red
    }
}

# 返回退出码
if ($abnormalCount -gt 0) {
    exit 1
} else {
    exit 0
}

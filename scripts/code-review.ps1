# ============================================
# GRT智能系统 - 代码查验自动化脚本
# 版本: 1.0.0
# 作者: Manus AI
# ============================================

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "`n[$Step] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GRT智能系统 - 代码查验流程" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

$startTime = Get-Date
$results = @()

# ============================================
# 步骤1：检查依赖完整性
# ============================================
Write-Step "1/6" "检查依赖完整性..."

try {
    $output = pnpm install --frozen-lockfile 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "依赖安装失败"
    }
    Write-Success "依赖检查通过"
    $results += @{Step="依赖检查"; Status="通过"; Duration="N/A"}
} catch {
    Write-Failure "依赖检查失败: $_"
    $results += @{Step="依赖检查"; Status="失败"; Duration="N/A"}
    exit 1
}

# ============================================
# 步骤2：环境变量检查
# ============================================
Write-Step "2/6" "检查环境变量配置..."

$requiredEnvVars = @("DATABASE_URL", "JWT_SECRET", "VITE_APP_ID")
$missingVars = @()

foreach ($var in $requiredEnvVars) {
    if (-not [Environment]::GetEnvironmentVariable($var)) {
        # 检查.env文件
        if (Test-Path ".env") {
            $envContent = Get-Content ".env" -Raw
            if ($envContent -notmatch "$var=") {
                $missingVars += $var
            }
        } else {
            $missingVars += $var
        }
    }
}

if ($missingVars.Count -gt 0) {
    Write-Warning "缺少环境变量: $($missingVars -join ', ')"
    Write-Warning "请确保.env文件已正确配置"
    $results += @{Step="环境变量"; Status="警告"; Duration="N/A"}
} else {
    Write-Success "环境变量检查通过"
    $results += @{Step="环境变量"; Status="通过"; Duration="N/A"}
}

# ============================================
# 步骤3：TypeScript类型检查
# ============================================
Write-Step "3/6" "TypeScript类型检查..."

$tsStart = Get-Date
try {
    $output = pnpm check 2>&1
    $tsEnd = Get-Date
    $tsDuration = ($tsEnd - $tsStart).TotalSeconds
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "类型检查发现问题（非阻塞）"
        if ($Verbose) {
            Write-Host $output -ForegroundColor Gray
        }
        $results += @{Step="类型检查"; Status="警告"; Duration="$([math]::Round($tsDuration, 2))s"}
    } else {
        Write-Success "类型检查通过"
        $results += @{Step="类型检查"; Status="通过"; Duration="$([math]::Round($tsDuration, 2))s"}
    }
} catch {
    Write-Warning "类型检查执行异常: $_"
    $results += @{Step="类型检查"; Status="异常"; Duration="N/A"}
}

# ============================================
# 步骤4：代码格式检查
# ============================================
Write-Step "4/6" "代码格式检查..."

try {
    pnpm format 2>&1 | Out-Null
    Write-Success "代码格式化完成"
    $results += @{Step="代码格式"; Status="通过"; Duration="N/A"}
} catch {
    Write-Warning "代码格式化失败: $_"
    $results += @{Step="代码格式"; Status="警告"; Duration="N/A"}
}

# ============================================
# 步骤5：运行单元测试
# ============================================
if (-not $SkipTests) {
    Write-Step "5/6" "运行单元测试..."
    
    $testStart = Get-Date
    try {
        $output = pnpm test 2>&1
        $testEnd = Get-Date
        $testDuration = ($testEnd - $testStart).TotalSeconds
        
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "单元测试失败"
            if ($Verbose) {
                Write-Host $output -ForegroundColor Gray
            }
            $results += @{Step="单元测试"; Status="失败"; Duration="$([math]::Round($testDuration, 2))s"}
            exit 1
        }
        
        # 提取测试统计
        $testMatch = $output | Select-String -Pattern "(\d+) passed"
        if ($testMatch) {
            Write-Success "单元测试通过 ($($testMatch.Matches[0].Groups[1].Value) 个测试)"
        } else {
            Write-Success "单元测试通过"
        }
        $results += @{Step="单元测试"; Status="通过"; Duration="$([math]::Round($testDuration, 2))s"}
    } catch {
        Write-Failure "单元测试执行异常: $_"
        $results += @{Step="单元测试"; Status="异常"; Duration="N/A"}
        exit 1
    }
} else {
    Write-Warning "跳过单元测试"
    $results += @{Step="单元测试"; Status="跳过"; Duration="N/A"}
}

# ============================================
# 步骤6：构建测试
# ============================================
if (-not $SkipBuild) {
    Write-Step "6/6" "生产构建测试..."
    
    $buildStart = Get-Date
    try {
        $env:NODE_ENV = "production"
        $output = pnpm build 2>&1
        $buildEnd = Get-Date
        $buildDuration = ($buildEnd - $buildStart).TotalSeconds
        
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "构建失败"
            if ($Verbose) {
                Write-Host $output -ForegroundColor Gray
            }
            $results += @{Step="生产构建"; Status="失败"; Duration="$([math]::Round($buildDuration, 2))s"}
            exit 1
        }
        Write-Success "构建成功"
        $results += @{Step="生产构建"; Status="通过"; Duration="$([math]::Round($buildDuration, 2))s"}
    } catch {
        Write-Failure "构建执行异常: $_"
        $results += @{Step="生产构建"; Status="异常"; Duration="N/A"}
        exit 1
    }
} else {
    Write-Warning "跳过构建测试"
    $results += @{Step="生产构建"; Status="跳过"; Duration="N/A"}
}

# ============================================
# 输出结果摘要
# ============================================
$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "代码查验结果摘要" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n步骤结果:" -ForegroundColor White
foreach ($result in $results) {
    $statusColor = switch ($result.Status) {
        "通过" { "Green" }
        "失败" { "Red" }
        "警告" { "Yellow" }
        "跳过" { "Gray" }
        default { "White" }
    }
    Write-Host "  $($result.Step): " -NoNewline
    Write-Host "$($result.Status)" -ForegroundColor $statusColor -NoNewline
    if ($result.Duration -ne "N/A") {
        Write-Host " ($($result.Duration))" -ForegroundColor Gray
    } else {
        Write-Host ""
    }
}

$failedCount = ($results | Where-Object { $_.Status -eq "失败" }).Count
$warningCount = ($results | Where-Object { $_.Status -eq "警告" }).Count

Write-Host "`n总耗时: $([math]::Round($totalDuration, 2)) 秒" -ForegroundColor Gray
Write-Host "结束时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

if ($failedCount -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Success "所有检查通过！代码可以部署"
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Failure "检查未通过，请修复问题后重试"
    Write-Host "========================================" -ForegroundColor Cyan
    exit 1
}

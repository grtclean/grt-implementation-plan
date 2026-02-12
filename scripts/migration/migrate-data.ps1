<#
.SYNOPSIS
    GRT智能系统 - 数据迁移工具 (PowerShell包装器)
.DESCRIPTION
    提供友好的交互式界面进行数据迁移操作
.NOTES
    版本: 1.0.0
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('export', 'import', 'sync', 'rollback', 'interactive')]
    [string]$Command = 'interactive',
    
    [string]$Source,
    [string]$Target,
    [string]$File,
    [switch]$Overwrite,
    [switch]$SkipBackup
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrateScript = Join-Path $ScriptDir "migrate-data.mjs"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { Write-ColorOutput $args[0] "Green" }
function Write-Warning { Write-ColorOutput $args[0] "Yellow" }
function Write-Error { Write-ColorOutput $args[0] "Red" }
function Write-Info { Write-ColorOutput $args[0] "Cyan" }

function Show-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "║     GRT智能系统 - 数据迁移工具                               ║" -ForegroundColor Cyan
    Write-Host "║     版本: 1.0.0                                              ║" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Write-Host ""
    Write-Host "请选择操作:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] 导出数据 (从云端数据库导出)" -ForegroundColor White
    Write-Host "  [2] 导入数据 (导入到本地数据库)" -ForegroundColor White
    Write-Host "  [3] 增量同步 (云端 -> 本地)" -ForegroundColor White
    Write-Host "  [4] 数据回滚 (恢复备份)" -ForegroundColor White
    Write-Host "  [5] 查看导出文件" -ForegroundColor White
    Write-Host "  [6] 查看备份文件" -ForegroundColor White
    Write-Host "  [0] 退出" -ForegroundColor White
    Write-Host ""
    
    return Read-Host "请输入选项"
}

function Get-DatabaseUrl {
    param([string]$Prompt)
    
    Write-Host ""
    Write-Info $Prompt
    Write-Host ""
    
    $host_ = Read-Host "  数据库主机 (默认: localhost)"
    if ([string]::IsNullOrEmpty($host_)) { $host_ = "localhost" }
    
    $port = Read-Host "  数据库端口 (默认: 3306)"
    if ([string]::IsNullOrEmpty($port)) { $port = "3306" }
    
    $user = Read-Host "  用户名 (默认: root)"
    if ([string]::IsNullOrEmpty($user)) { $user = "root" }
    
    $pass = Read-Host "  密码" -AsSecureString
    $passPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass))
    
    $db = Read-Host "  数据库名称 (默认: grt_system)"
    if ([string]::IsNullOrEmpty($db)) { $db = "grt_system" }
    
    return "mysql://${user}:${passPlain}@${host_}:${port}/${db}"
}

function Select-File {
    param([string]$Directory, [string]$Filter = "*.json")
    
    $files = Get-ChildItem -Path $Directory -Filter $Filter -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($files.Count -eq 0) {
        Write-Warning "没有找到文件"
        return $null
    }
    
    Write-Host ""
    Write-Host "可用文件:" -ForegroundColor Yellow
    Write-Host ""
    
    for ($i = 0; $i -lt $files.Count; $i++) {
        $file = $files[$i]
        $size = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  [$($i + 1)] $($file.Name) ($size KB) - $($file.LastWriteTime)"
    }
    
    Write-Host ""
    $selection = Read-Host "请选择文件编号"
    
    $index = [int]$selection - 1
    if ($index -ge 0 -and $index -lt $files.Count) {
        return $files[$index].FullName
    }
    
    return $null
}

function Invoke-Export {
    Write-Info "=========================================="
    Write-Info "数据导出"
    Write-Info "=========================================="
    
    $sourceUrl = Get-DatabaseUrl "请输入云端数据库连接信息:"
    
    Write-Host ""
    Write-Info "开始导出..."
    
    node $MigrateScript export --source $sourceUrl
}

function Invoke-Import {
    Write-Info "=========================================="
    Write-Info "数据导入"
    Write-Info "=========================================="
    
    $exportsDir = Join-Path $ScriptDir "exports"
    $importFile = Select-File -Directory $exportsDir
    
    if (-not $importFile) {
        Write-Error "未选择文件"
        return
    }
    
    $targetUrl = Get-DatabaseUrl "请输入本地数据库连接信息:"
    
    Write-Host ""
    $overwrite = Read-Host "是否覆盖现有数据? (Y/N)"
    
    Write-Host ""
    Write-Info "开始导入..."
    
    $args = @("import", "--target", $targetUrl, "--file", $importFile)
    if ($overwrite -eq 'Y' -or $overwrite -eq 'y') {
        $args += "--overwrite"
    }
    
    node $MigrateScript @args
}

function Invoke-Sync {
    Write-Info "=========================================="
    Write-Info "增量同步"
    Write-Info "=========================================="
    
    $sourceUrl = Get-DatabaseUrl "请输入云端数据库连接信息:"
    $targetUrl = Get-DatabaseUrl "请输入本地数据库连接信息:"
    
    Write-Host ""
    Write-Info "开始同步..."
    
    node $MigrateScript sync --source $sourceUrl --target $targetUrl
}

function Invoke-Rollback {
    Write-Info "=========================================="
    Write-Info "数据回滚"
    Write-Info "=========================================="
    
    $backupsDir = Join-Path $ScriptDir "backups"
    $backupFile = Select-File -Directory $backupsDir
    
    if (-not $backupFile) {
        Write-Error "未选择备份文件"
        return
    }
    
    $targetUrl = Get-DatabaseUrl "请输入目标数据库连接信息:"
    
    Write-Host ""
    Write-Warning "警告: 此操作将覆盖目标数据库中的数据!"
    $confirm = Read-Host "确认回滚? (输入 YES 确认)"
    
    if ($confirm -ne 'YES') {
        Write-Info "操作已取消"
        return
    }
    
    Write-Host ""
    Write-Info "开始回滚..."
    
    node $MigrateScript rollback --target $targetUrl --file $backupFile
}

function Show-Files {
    param([string]$Type)
    
    $dir = if ($Type -eq 'exports') {
        Join-Path $ScriptDir "exports"
    } else {
        Join-Path $ScriptDir "backups"
    }
    
    Write-Host ""
    Write-Info "$Type 文件列表:"
    Write-Host ""
    
    $files = Get-ChildItem -Path $dir -Filter "*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($files.Count -eq 0) {
        Write-Warning "没有找到文件"
        return
    }
    
    foreach ($file in $files) {
        $size = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  $($file.Name) ($size KB) - $($file.LastWriteTime)"
    }
}

# 主函数
function Main {
    Show-Banner
    
    # 检查 Node.js
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Error "错误: 未安装 Node.js"
        exit 1
    }
    
    # 检查迁移脚本
    if (-not (Test-Path $MigrateScript)) {
        Write-Error "错误: 找不到迁移脚本 $MigrateScript"
        exit 1
    }
    
    # 创建必要目录
    $exportsDir = Join-Path $ScriptDir "exports"
    $backupsDir = Join-Path $ScriptDir "backups"
    $logsDir = Join-Path $ScriptDir "logs"
    
    New-Item -ItemType Directory -Path $exportsDir -Force | Out-Null
    New-Item -ItemType Directory -Path $backupsDir -Force | Out-Null
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    
    if ($Command -ne 'interactive') {
        # 命令行模式
        $args = @($Command)
        if ($Source) { $args += "--source"; $args += $Source }
        if ($Target) { $args += "--target"; $args += $Target }
        if ($File) { $args += "--file"; $args += $File }
        if ($Overwrite) { $args += "--overwrite" }
        if ($SkipBackup) { $args += "--skip-backup" }
        
        node $MigrateScript @args
        return
    }
    
    # 交互模式
    while ($true) {
        $choice = Show-Menu
        
        switch ($choice) {
            '1' { Invoke-Export }
            '2' { Invoke-Import }
            '3' { Invoke-Sync }
            '4' { Invoke-Rollback }
            '5' { Show-Files -Type "exports" }
            '6' { Show-Files -Type "backups" }
            '0' { 
                Write-Info "再见!"
                return 
            }
            default { Write-Warning "无效选项" }
        }
        
        Write-Host ""
        Read-Host "按 Enter 继续..."
    }
}

Main

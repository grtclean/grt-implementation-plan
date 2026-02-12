# GRT智能系统自动更新脚本 (Windows PowerShell)
# 功能: 从Manus平台通过Git同步拉取最新代码并自动更新部署
# 支持环境: Windows 11 (WSL2/Hyper-V/Native)

param(
    [string]$Environment = "production",
    [string]$BackupDir = "C:\GRT-Backups",
    [bool]$AutoRestart = $false,
    [bool]$DryRun = $false
)

# ============================================================================
# 配置部分
# ============================================================================

$ProjectRoot = "C:\GRT-Implementation"
$GitRepo = "https://github.com/your-org/grt-implementation-plan.git"
$LogFile = "$ProjectRoot\logs\update-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$UpdateLockFile = "$ProjectRoot\.update-lock"
$MaxBackups = 5

# 颜色定义
$Colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
}

# ============================================================================
# 工具函数
# ============================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("Info", "Success", "Warning", "Error")]
        [string]$Level = "Info"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    Write-Host $LogMessage -ForegroundColor $Colors[$Level]
    Add-Content -Path $LogFile -Value $LogMessage
}

function Test-Prerequisites {
    Write-Log "检查系统先决条件..." "Info"
    
    # 检查Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Log "错误: Git未安装或不在PATH中" "Error"
        return $false
    }
    
    # 检查Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Log "错误: Node.js未安装或不在PATH中" "Error"
        return $false
    }
    
    # 检查pnpm
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Log "错误: pnpm未安装或不在PATH中" "Error"
        return $false
    }
    
    # 检查Docker (如果使用Docker部署)
    if ($Environment -eq "docker") {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Log "错误: Docker未安装或不在PATH中" "Error"
            return $false
        }
    }
    
    Write-Log "所有先决条件检查通过" "Success"
    return $true
}

function Test-UpdateLock {
    if (Test-Path $UpdateLockFile) {
        $LockAge = (Get-Date) - (Get-Item $UpdateLockFile).LastWriteTime
        if ($LockAge.TotalMinutes -lt 30) {
            Write-Log "更新已在进行中（锁文件年龄: $($LockAge.TotalMinutes) 分钟）" "Warning"
            return $false
        } else {
            Write-Log "清除过期的锁文件" "Info"
            Remove-Item $UpdateLockFile -Force
        }
    }
    
    # 创建新的锁文件
    New-Item -Path $UpdateLockFile -ItemType File -Force | Out-Null
    return $true
}

function Create-Backup {
    Write-Log "创建备份..." "Info"
    
    $BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupPath = Join-Path $BackupDir "backup-$BackupTimestamp"
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
    }
    
    try {
        # 备份源代码
        Copy-Item -Path "$ProjectRoot\client" -Destination "$BackupPath\client" -Recurse -Force
        Copy-Item -Path "$ProjectRoot\server" -Destination "$BackupPath\server" -Recurse -Force
        Copy-Item -Path "$ProjectRoot\drizzle" -Destination "$BackupPath\drizzle" -Recurse -Force
        Copy-Item -Path "$ProjectRoot\package.json" -Destination "$BackupPath\package.json" -Force
        Copy-Item -Path "$ProjectRoot\package-lock.json" -Destination "$BackupPath\package-lock.json" -Force -ErrorAction SilentlyContinue
        
        # 备份数据库
        if ($Environment -eq "docker") {
            Write-Log "备份Docker数据库..." "Info"
            & docker exec grt-mysql mysqldump -u root -p$env:MYSQL_ROOT_PASSWORD --all-databases > "$BackupPath\database.sql"
        } else {
            Write-Log "备份本地MySQL数据库..." "Info"
            & mysqldump -u root -p$env:MYSQL_ROOT_PASSWORD --all-databases > "$BackupPath\database.sql"
        }
        
        Write-Log "备份完成: $BackupPath" "Success"
        
        # 清理旧备份
        Cleanup-OldBackups
        
        return $BackupPath
    } catch {
        Write-Log "备份失败: $_" "Error"
        return $null
    }
}

function Cleanup-OldBackups {
    Write-Log "清理旧备份（保留最新$MaxBackups个）..." "Info"
    
    $Backups = Get-ChildItem -Path $BackupDir -Directory | Sort-Object LastWriteTime -Descending
    
    if ($Backups.Count -gt $MaxBackups) {
        $OldBackups = $Backups | Select-Object -Skip $MaxBackups
        foreach ($Backup in $OldBackups) {
            Write-Log "删除旧备份: $($Backup.Name)" "Info"
            Remove-Item -Path $Backup.FullName -Recurse -Force
        }
    }
}

function Pull-LatestCode {
    Write-Log "从Manus平台拉取最新代码..." "Info"
    
    try {
        Push-Location $ProjectRoot
        
        # 检查Git状态
        $GitStatus = & git status --porcelain
        if ($GitStatus) {
            Write-Log "检测到本地更改，正在stash..." "Warning"
            & git stash
        }
        
        # 拉取最新代码
        Write-Log "执行 git pull origin main..." "Info"
        & git pull origin main
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Git pull失败" "Error"
            Pop-Location
            return $false
        }
        
        Write-Log "代码拉取成功" "Success"
        Pop-Location
        return $true
    } catch {
        Write-Log "代码拉取异常: $_" "Error"
        Pop-Location
        return $false
    }
}

function Update-Dependencies {
    Write-Log "更新依赖包..." "Info"
    
    try {
        Push-Location $ProjectRoot
        
        # 安装/更新依赖
        & pnpm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "依赖安装失败" "Error"
            Pop-Location
            return $false
        }
        
        Write-Log "依赖更新成功" "Success"
        Pop-Location
        return $true
    } catch {
        Write-Log "依赖更新异常: $_" "Error"
        Pop-Location
        return $false
    }
}

function Run-Database-Migrations {
    Write-Log "执行数据库迁移..." "Info"
    
    try {
        Push-Location $ProjectRoot
        
        # 生成并执行迁移
        & pnpm db:push
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "数据库迁移失败" "Error"
            Pop-Location
            return $false
        }
        
        Write-Log "数据库迁移成功" "Success"
        Pop-Location
        return $true
    } catch {
        Write-Log "数据库迁移异常: $_" "Error"
        Pop-Location
        return $false
    }
}

function Build-Application {
    Write-Log "构建应用程序..." "Info"
    
    try {
        Push-Location $ProjectRoot
        
        # 构建前端和后端
        & pnpm build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "应用构建失败" "Error"
            Pop-Location
            return $false
        }
        
        Write-Log "应用构建成功" "Success"
        Pop-Location
        return $true
    } catch {
        Write-Log "应用构建异常: $_" "Error"
        Pop-Location
        return $false
    }
}

function Restart-Services {
    Write-Log "重启服务..." "Info"
    
    try {
        if ($Environment -eq "docker") {
            Write-Log "重启Docker容器..." "Info"
            & docker-compose -f "$ProjectRoot\docker\docker-compose.yml" down
            & docker-compose -f "$ProjectRoot\docker\docker-compose.yml" up -d
        } else {
            Write-Log "重启PM2应用..." "Info"
            & pm2 restart grt-app
            & pm2 save
        }
        
        Write-Log "服务重启成功" "Success"
        return $true
    } catch {
        Write-Log "服务重启失败: $_" "Error"
        return $false
    }
}

function Health-Check {
    Write-Log "执行健康检查..." "Info"
    
    $MaxAttempts = 30
    $Attempt = 0
    $HealthCheckUrl = "http://localhost:3000/api/health"
    
    while ($Attempt -lt $MaxAttempts) {
        try {
            $Response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 5
            if ($Response.StatusCode -eq 200) {
                Write-Log "健康检查通过" "Success"
                return $true
            }
        } catch {
            # 继续重试
        }
        
        $Attempt++
        Write-Log "健康检查尝试 $Attempt/$MaxAttempts..." "Info"
        Start-Sleep -Seconds 2
    }
    
    Write-Log "健康检查失败" "Error"
    return $false
}

function Rollback-Update {
    param([string]$BackupPath)
    
    Write-Log "执行回滚..." "Error"
    
    try {
        # 恢复源代码
        Copy-Item -Path "$BackupPath\client" -Destination "$ProjectRoot\client" -Recurse -Force
        Copy-Item -Path "$BackupPath\server" -Destination "$ProjectRoot\server" -Recurse -Force
        Copy-Item -Path "$BackupPath\drizzle" -Destination "$ProjectRoot\drizzle" -Recurse -Force
        Copy-Item -Path "$BackupPath\package.json" -Destination "$ProjectRoot\package.json" -Force
        
        # 恢复数据库
        if ($Environment -eq "docker") {
            Write-Log "恢复Docker数据库..." "Info"
            & docker exec -i grt-mysql mysql -u root -p$env:MYSQL_ROOT_PASSWORD < "$BackupPath\database.sql"
        } else {
            Write-Log "恢复本地MySQL数据库..." "Info"
            & mysql -u root -p$env:MYSQL_ROOT_PASSWORD < "$BackupPath\database.sql"
        }
        
        Write-Log "回滚完成" "Success"
        return $true
    } catch {
        Write-Log "回滚失败: $_" "Error"
        return $false
    }
}

function Send-Notification {
    param(
        [string]$Title,
        [string]$Message,
        [ValidateSet("Success", "Error", "Warning")]
        [string]$Type = "Info"
    )
    
    # Windows通知
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    
    $APP_ID = 'GRT.Update'
    
    $template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">$Title</text>
            <text id="2">$Message</text>
        </binding>
    </visual>
</toast>
"@
    
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)
}

# ============================================================================
# 主流程
# ============================================================================

function Main {
    Write-Log "========================================" "Info"
    Write-Log "GRT智能系统自动更新脚本启动" "Info"
    Write-Log "环境: $Environment" "Info"
    Write-Log "时间: $(Get-Date)" "Info"
    Write-Log "========================================" "Info"
    
    # 创建日志目录
    $LogDir = Split-Path $LogFile
    if (-not (Test-Path $LogDir)) {
        New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
    }
    
    # 检查先决条件
    if (-not (Test-Prerequisites)) {
        Write-Log "先决条件检查失败，更新中止" "Error"
        Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
        exit 1
    }
    
    # 检查更新锁
    if (-not (Test-UpdateLock)) {
        Write-Log "更新已在进行中，中止" "Warning"
        exit 1
    }
    
    try {
        # 创建备份
        $BackupPath = Create-Backup
        if (-not $BackupPath) {
            Write-Log "备份创建失败，中止更新" "Error"
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        if ($DryRun) {
            Write-Log "DRY RUN模式: 跳过实际更新步骤" "Warning"
            Write-Log "更新流程验证完成" "Success"
            Remove-Item $UpdateLockFile -Force
            exit 0
        }
        
        # 拉取最新代码
        if (-not (Pull-LatestCode)) {
            Write-Log "代码拉取失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        # 更新依赖
        if (-not (Update-Dependencies)) {
            Write-Log "依赖更新失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        # 执行数据库迁移
        if (-not (Run-Database-Migrations)) {
            Write-Log "数据库迁移失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        # 构建应用
        if (-not (Build-Application)) {
            Write-Log "应用构建失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        # 重启服务
        if (-not (Restart-Services)) {
            Write-Log "服务重启失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        # 健康检查
        if (-not (Health-Check)) {
            Write-Log "健康检查失败，执行回滚" "Error"
            Rollback-Update $BackupPath
            Remove-Item $UpdateLockFile -Force
            exit 1
        }
        
        Write-Log "========================================" "Success"
        Write-Log "更新成功完成！" "Success"
        Write-Log "新版本已部署并通过健康检查" "Success"
        Write-Log "========================================" "Success"
        
        Send-Notification "GRT系统更新成功" "新版本已部署并运行正常" "Success"
        
        Remove-Item $UpdateLockFile -Force
        exit 0
    } catch {
        Write-Log "更新过程发生异常: $_" "Error"
        Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
        exit 1
    }
}

# 执行主程序
Main

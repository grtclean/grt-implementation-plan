# GRT智能系统 Windows 11 运维管理指南

> **版本**: v1.0  
> **适用系统**: GRT智能系统 v2.5.21  
> **更新日期**: 2026年1月28日  
> **作者**: Manus AI

---

## 目录

1. [服务管理](#1-服务管理)
2. [日志管理](#2-日志管理)
3. [数据库备份](#3-数据库备份)
4. [监控告警](#4-监控告警)
5. [性能优化](#5-性能优化)
6. [安全管理](#6-安全管理)
7. [故障恢复](#7-故障恢复)
8. [定期维护](#8-定期维护)

---

## 1. 服务管理

### 1.1 PM2 进程管理

PM2 是 Node.js 应用的生产级进程管理器，提供进程守护、负载均衡、日志管理等功能。

**安装 PM2**:

```powershell
# 全局安装 PM2
npm install -g pm2

# 安装 Windows 服务支持
npm install -g pm2-windows-startup
```

**PM2 配置文件** (`ecosystem.config.js`):

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    cwd: 'D:\\Projects\\grt-implementation-plan',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    env_development: {
      NODE_ENV: 'development',
    },
    error_file: 'logs/pm2/error.log',
    out_file: 'logs/pm2/output.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 自动重启配置
    autorestart: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
```

**常用 PM2 命令**:

| 命令 | 说明 |
|------|------|
| `pm2 start ecosystem.config.js` | 启动应用 |
| `pm2 stop grt-system` | 停止应用 |
| `pm2 restart grt-system` | 重启应用 |
| `pm2 reload grt-system` | 零停机重载 |
| `pm2 status` | 查看状态 |
| `pm2 logs` | 查看实时日志 |
| `pm2 monit` | 监控面板 |
| `pm2 save` | 保存进程列表 |

**设置开机自启**:

```powershell
# 配置 PM2 开机自启
pm2-startup install

# 保存当前进程列表
pm2 save
```

### 1.2 Windows 服务管理

**创建 Windows 服务脚本** (`scripts/service-manager.ps1`):

```powershell
# GRT系统服务管理脚本
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'restart', 'status')]
    [string]$Action
)

$ProjectPath = "D:\Projects\grt-implementation-plan"

switch ($Action) {
    'start' {
        Write-Host "启动 GRT 系统..." -ForegroundColor Green
        Set-Location $ProjectPath
        pm2 start ecosystem.config.js
        pm2 save
    }
    'stop' {
        Write-Host "停止 GRT 系统..." -ForegroundColor Yellow
        pm2 stop grt-system
    }
    'restart' {
        Write-Host "重启 GRT 系统..." -ForegroundColor Cyan
        pm2 reload grt-system
    }
    'status' {
        pm2 status
        pm2 show grt-system
    }
}
```

---

## 2. 日志管理

### 2.1 日志目录结构

```
D:\Projects\grt-implementation-plan\logs\
├── app\
│   ├── access.log          # HTTP访问日志
│   ├── error.log           # 应用错误日志
│   └── debug.log           # 调试日志
├── pm2\
│   ├── output.log          # PM2标准输出
│   └── error.log           # PM2错误输出
├── mysql\
│   ├── error.log           # MySQL错误日志
│   └── slow-query.log      # 慢查询日志
└── backup\
    └── backup.log          # 备份操作日志
```

### 2.2 日志轮转配置

**安装 PM2 日志轮转模块**:

```powershell
pm2 install pm2-logrotate
```

**配置日志轮转**:

```powershell
# 设置单个日志文件最大大小
pm2 set pm2-logrotate:max_size 10M

# 设置保留的日志文件数量
pm2 set pm2-logrotate:retain 30

# 启用压缩
pm2 set pm2-logrotate:compress true

# 设置轮转检查间隔
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

### 2.3 日志分析脚本

**日志分析脚本** (`scripts/analyze-logs.ps1`):

```powershell
# 日志分析脚本
param(
    [string]$LogPath = "D:\Projects\grt-implementation-plan\logs",
    [int]$Days = 7
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GRT系统日志分析报告" -ForegroundColor Cyan
Write-Host "  分析周期: 最近 $Days 天" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 统计错误数量
$errorLog = Join-Path $LogPath "app\error.log"
if (Test-Path $errorLog) {
    $errors = Get-Content $errorLog | 
        Where-Object { $_ -match "ERROR" } |
        Measure-Object
    Write-Host "`n错误统计:" -ForegroundColor Yellow
    Write-Host "  总错误数: $($errors.Count)" -ForegroundColor Red
}

# 统计访问量
$accessLog = Join-Path $LogPath "app\access.log"
if (Test-Path $accessLog) {
    $requests = Get-Content $accessLog | Measure-Object
    Write-Host "`n访问统计:" -ForegroundColor Yellow
    Write-Host "  总请求数: $($requests.Count)" -ForegroundColor Green
}

# 检查慢查询
$slowLog = Join-Path $LogPath "mysql\slow-query.log"
if (Test-Path $slowLog) {
    $slowQueries = Get-Content $slowLog |
        Where-Object { $_ -match "Query_time" } |
        Measure-Object
    Write-Host "`n慢查询统计:" -ForegroundColor Yellow
    Write-Host "  慢查询数: $($slowQueries.Count)" -ForegroundColor $(if($slowQueries.Count -gt 10){"Red"}else{"Green"})
}

Write-Host "`n分析完成" -ForegroundColor Green
```

---

## 3. 数据库备份

### 3.1 自动备份脚本

**数据库备份脚本** (`scripts/backup-database.ps1`):

```powershell
# GRT系统数据库备份脚本
param(
    [string]$MySQLUser = "grt_user",
    [string]$MySQLPassword = "",
    [string]$Database = "grt_system",
    [string]$BackupDir = "D:\Backups\mysql",
    [int]$RetentionDays = 30
)

# 配置
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir\${Database}_$timestamp.sql"
$logFile = "$BackupDir\backup.log"

# 创建备份目录
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force
}

# 记录日志函数
function Write-Log {
    param([string]$Message)
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
    Add-Content -Path $logFile -Value $logEntry
    Write-Host $logEntry
}

Write-Log "开始备份数据库: $Database"

try {
    # 执行备份
    $mysqldump = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    
    & $mysqldump `
        --user=$MySQLUser `
        --password=$MySQLPassword `
        --single-transaction `
        --routines `
        --triggers `
        --events `
        $Database > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        # 压缩备份文件
        $zipFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
        Remove-Item $backupFile
        
        $fileSize = (Get-Item $zipFile).Length / 1MB
        Write-Log "备份成功: $zipFile (${fileSize:N2} MB)"
    } else {
        Write-Log "备份失败: mysqldump 返回错误码 $LASTEXITCODE"
    }
} catch {
    Write-Log "备份异常: $_"
}

# 清理旧备份
Write-Log "清理 $RetentionDays 天前的备份..."
Get-ChildItem $BackupDir -Filter "*.zip" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    ForEach-Object {
        Write-Log "删除旧备份: $($_.Name)"
        Remove-Item $_.FullName
    }

Write-Log "备份任务完成"
```

### 3.2 配置定时备份

**创建计划任务**:

```powershell
# 创建每日凌晨2点的备份任务
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File D:\Projects\grt-implementation-plan\scripts\backup-database.ps1 -MySQLPassword 'your_password'"

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -RestartCount 3

Register-ScheduledTask `
    -TaskName "GRT-Database-Backup" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "GRT系统数据库每日备份" `
    -User "SYSTEM" `
    -RunLevel Highest
```

### 3.3 备份恢复流程

**恢复脚本** (`scripts/restore-database.ps1`):

```powershell
# 数据库恢复脚本
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$MySQLUser = "grt_user",
    [string]$MySQLPassword = "",
    [string]$Database = "grt_system"
)

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  警告: 此操作将覆盖现有数据库!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Yellow

$confirm = Read-Host "确认恢复? (输入 'YES' 继续)"
if ($confirm -ne "YES") {
    Write-Host "操作已取消" -ForegroundColor Yellow
    exit
}

# 解压备份文件
$sqlFile = $BackupFile -replace '\.zip$', ''
if ($BackupFile -match '\.zip$') {
    Write-Host "解压备份文件..." -ForegroundColor Cyan
    Expand-Archive -Path $BackupFile -DestinationPath (Split-Path $BackupFile) -Force
}

# 执行恢复
Write-Host "开始恢复数据库..." -ForegroundColor Cyan
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

& $mysql `
    --user=$MySQLUser `
    --password=$MySQLPassword `
    $Database < $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "数据库恢复成功!" -ForegroundColor Green
} else {
    Write-Host "数据库恢复失败!" -ForegroundColor Red
}

# 清理临时文件
if ($BackupFile -match '\.zip$') {
    Remove-Item $sqlFile
}
```

---

## 4. 监控告警

### 4.1 健康检查脚本

**健康检查脚本** (`scripts/health-check.ps1`):

```powershell
# GRT系统健康检查脚本
param(
    [string]$ApiUrl = "http://localhost:3000",
    [int]$TimeoutSeconds = 10,
    [string]$AlertEmail = ""
)

$results = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Checks = @()
    OverallStatus = "Healthy"
}

# 检查函数
function Add-CheckResult {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Message
    )
    $results.Checks += @{
        Name = $Name
        Status = $Status
        Message = $Message
    }
    if ($Status -eq "Failed") {
        $results.OverallStatus = "Unhealthy"
    }
}

# 1. 检查 API 服务
Write-Host "检查 API 服务..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod `
        -Uri "$ApiUrl/api/trpc/health" `
        -Method Get `
        -TimeoutSec $TimeoutSeconds
    
    Add-CheckResult -Name "API Service" -Status "OK" -Message "响应正常"
} catch {
    Add-CheckResult -Name "API Service" -Status "Failed" -Message $_.Exception.Message
}

# 2. 检查 PM2 进程
Write-Host "检查 PM2 进程..." -ForegroundColor Cyan
$pm2Status = pm2 jlist | ConvertFrom-Json
$grtProcess = $pm2Status | Where-Object { $_.name -eq "grt-system" }

if ($grtProcess -and $grtProcess.pm2_env.status -eq "online") {
    Add-CheckResult -Name "PM2 Process" -Status "OK" -Message "进程运行中"
} else {
    Add-CheckResult -Name "PM2 Process" -Status "Failed" -Message "进程未运行"
}

# 3. 检查 MySQL 连接
Write-Host "检查 MySQL 连接..." -ForegroundColor Cyan
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService -and $mysqlService.Status -eq "Running") {
    Add-CheckResult -Name "MySQL Service" -Status "OK" -Message "服务运行中"
} else {
    Add-CheckResult -Name "MySQL Service" -Status "Failed" -Message "服务未运行"
}

# 4. 检查磁盘空间
Write-Host "检查磁盘空间..." -ForegroundColor Cyan
$disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='D:'"
$freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
$totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
$usedPercent = [math]::Round((1 - $disk.FreeSpace / $disk.Size) * 100, 1)

if ($usedPercent -lt 80) {
    Add-CheckResult -Name "Disk Space" -Status "OK" -Message "剩余 ${freeSpaceGB}GB (${usedPercent}% 已用)"
} elseif ($usedPercent -lt 90) {
    Add-CheckResult -Name "Disk Space" -Status "Warning" -Message "剩余 ${freeSpaceGB}GB (${usedPercent}% 已用)"
} else {
    Add-CheckResult -Name "Disk Space" -Status "Failed" -Message "磁盘空间不足! 剩余 ${freeSpaceGB}GB"
}

# 5. 检查内存使用
Write-Host "检查内存使用..." -ForegroundColor Cyan
$memory = Get-WmiObject Win32_OperatingSystem
$usedMemoryPercent = [math]::Round((1 - $memory.FreePhysicalMemory / $memory.TotalVisibleMemorySize) * 100, 1)

if ($usedMemoryPercent -lt 80) {
    Add-CheckResult -Name "Memory" -Status "OK" -Message "${usedMemoryPercent}% 已用"
} else {
    Add-CheckResult -Name "Memory" -Status "Warning" -Message "${usedMemoryPercent}% 已用"
}

# 输出结果
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  健康检查结果: $($results.OverallStatus)" -ForegroundColor $(if($results.OverallStatus -eq "Healthy"){"Green"}else{"Red"})
Write-Host "========================================" -ForegroundColor Cyan

foreach ($check in $results.Checks) {
    $color = switch ($check.Status) {
        "OK" { "Green" }
        "Warning" { "Yellow" }
        "Failed" { "Red" }
    }
    Write-Host "  [$($check.Status)] $($check.Name): $($check.Message)" -ForegroundColor $color
}

# 如果不健康，发送告警
if ($results.OverallStatus -eq "Unhealthy" -and $AlertEmail) {
    # 发送邮件告警（需要配置SMTP）
    Write-Host "`n发送告警邮件..." -ForegroundColor Yellow
}

# 返回状态码
if ($results.OverallStatus -eq "Healthy") {
    exit 0
} else {
    exit 1
}
```

### 4.2 配置定时健康检查

```powershell
# 创建每5分钟执行一次的健康检查任务
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File D:\Projects\grt-implementation-plan\scripts\health-check.ps1"

$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

Register-ScheduledTask `
    -TaskName "GRT-Health-Check" `
    -Action $action `
    -Trigger $trigger `
    -Description "GRT系统健康检查"
```

---

## 5. 性能优化

### 5.1 Node.js 性能配置

**环境变量优化**:

```powershell
# 设置 Node.js 内存限制
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# 启用生产模式优化
$env:NODE_ENV = "production"
```

### 5.2 MySQL 性能配置

**my.ini 优化配置**:

```ini
[mysqld]
# 内存配置
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
innodb_log_buffer_size = 64M

# 连接配置
max_connections = 200
thread_cache_size = 50

# 查询缓存
query_cache_type = 1
query_cache_size = 128M

# 慢查询日志
slow_query_log = 1
slow_query_log_file = D:/MySQL/logs/slow-query.log
long_query_time = 2

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

### 5.3 性能监控脚本

**性能监控脚本** (`scripts/performance-monitor.ps1`):

```powershell
# 性能监控脚本
param(
    [int]$Interval = 60,
    [string]$OutputFile = "D:\Projects\grt-implementation-plan\logs\performance.csv"
)

Write-Host "开始性能监控 (间隔: ${Interval}秒)..." -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止" -ForegroundColor Yellow

# 初始化CSV文件
if (!(Test-Path $OutputFile)) {
    "Timestamp,CPU%,Memory%,DiskRead(MB/s),DiskWrite(MB/s),NetworkIn(KB/s),NetworkOut(KB/s)" | 
        Out-File $OutputFile
}

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # CPU使用率
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    
    # 内存使用率
    $memory = Get-WmiObject Win32_OperatingSystem
    $memPercent = [math]::Round((1 - $memory.FreePhysicalMemory / $memory.TotalVisibleMemorySize) * 100, 1)
    
    # 磁盘IO
    $diskRead = (Get-Counter '\PhysicalDisk(_Total)\Disk Read Bytes/sec').CounterSamples.CookedValue / 1MB
    $diskWrite = (Get-Counter '\PhysicalDisk(_Total)\Disk Write Bytes/sec').CounterSamples.CookedValue / 1MB
    
    # 网络IO
    $netIn = (Get-Counter '\Network Interface(*)\Bytes Received/sec').CounterSamples | 
        Measure-Object -Property CookedValue -Sum | 
        Select-Object -ExpandProperty Sum
    $netOut = (Get-Counter '\Network Interface(*)\Bytes Sent/sec').CounterSamples | 
        Measure-Object -Property CookedValue -Sum | 
        Select-Object -ExpandProperty Sum
    
    # 记录数据
    "$timestamp,$([math]::Round($cpu,1)),$memPercent,$([math]::Round($diskRead,2)),$([math]::Round($diskWrite,2)),$([math]::Round($netIn/1KB,2)),$([math]::Round($netOut/1KB,2))" | 
        Add-Content $OutputFile
    
    # 显示当前状态
    Write-Host "[$timestamp] CPU: $([math]::Round($cpu,1))% | Memory: $memPercent% | Disk R/W: $([math]::Round($diskRead,2))/$([math]::Round($diskWrite,2)) MB/s"
    
    Start-Sleep -Seconds $Interval
}
```

---

## 6. 安全管理

### 6.1 防火墙配置

```powershell
# 配置 Windows 防火墙规则

# 允许 Node.js 应用端口
New-NetFirewallRule `
    -DisplayName "GRT System - HTTP" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3000 `
    -Action Allow

# 限制 MySQL 只允许本地访问
New-NetFirewallRule `
    -DisplayName "MySQL - Local Only" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3306 `
    -RemoteAddress LocalSubnet `
    -Action Allow
```

### 6.2 敏感信息保护

**环境变量安全存储**:

```powershell
# 使用 Windows 凭据管理器存储敏感信息
# 安装 CredentialManager 模块
Install-Module -Name CredentialManager -Force

# 存储数据库密码
New-StoredCredential `
    -Target "GRT_MySQL" `
    -UserName "grt_user" `
    -Password "your_password" `
    -Persist LocalMachine

# 在脚本中读取
$cred = Get-StoredCredential -Target "GRT_MySQL"
$password = $cred.GetNetworkCredential().Password
```

### 6.3 SSL/TLS 配置

对于生产环境，建议配置 HTTPS：

```powershell
# 生成自签名证书（开发环境）
$cert = New-SelfSignedCertificate `
    -DnsName "localhost", "grt.local" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(1)

# 导出证书
Export-Certificate `
    -Cert $cert `
    -FilePath "D:\Projects\grt-implementation-plan\certs\grt.cer"
```

---

## 7. 故障恢复

### 7.1 故障恢复流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      故障恢复流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  发现故障 ──► 评估影响 ──► 选择恢复策略 ──► 执行恢复 ──► 验证  │
│                                                                 │
│  恢复策略:                                                      │
│  ├─ 服务重启: pm2 restart grt-system                           │
│  ├─ 进程重建: pm2 delete all && pm2 start ecosystem.config.js  │
│  ├─ 数据库恢复: 执行 restore-database.ps1                       │
│  └─ 完整恢复: 重新部署 + 数据库恢复                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 快速恢复脚本

**快速恢复脚本** (`scripts/quick-recovery.ps1`):

```powershell
# 快速恢复脚本
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('restart', 'rebuild', 'full')]
    [string]$Mode
)

$ProjectPath = "D:\Projects\grt-implementation-plan"

switch ($Mode) {
    'restart' {
        Write-Host "执行服务重启..." -ForegroundColor Cyan
        pm2 restart grt-system
    }
    'rebuild' {
        Write-Host "执行进程重建..." -ForegroundColor Yellow
        pm2 delete all
        Set-Location $ProjectPath
        pnpm build
        pm2 start ecosystem.config.js
        pm2 save
    }
    'full' {
        Write-Host "执行完整恢复..." -ForegroundColor Red
        
        # 停止服务
        pm2 delete all
        
        # 重新安装依赖
        Set-Location $ProjectPath
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        pnpm install
        
        # 重新构建
        pnpm build
        
        # 同步数据库
        pnpm db:push
        
        # 启动服务
        pm2 start ecosystem.config.js
        pm2 save
        
        Write-Host "完整恢复完成!" -ForegroundColor Green
    }
}

# 验证恢复结果
Start-Sleep -Seconds 5
& "$ProjectPath\scripts\health-check.ps1"
```

---

## 8. 定期维护

### 8.1 维护计划

| 任务 | 频率 | 脚本 | 说明 |
|------|------|------|------|
| 数据库备份 | 每日 | backup-database.ps1 | 凌晨2:00执行 |
| 健康检查 | 每5分钟 | health-check.ps1 | 持续监控 |
| 日志轮转 | 每日 | pm2-logrotate | 自动执行 |
| 性能分析 | 每周 | analyze-logs.ps1 | 周一执行 |
| 安全更新 | 每月 | - | 手动执行 |
| 依赖更新 | 每季度 | - | 手动执行 |

### 8.2 维护检查清单

```markdown
## 每日维护检查清单

- [ ] 检查备份是否成功完成
- [ ] 查看错误日志是否有异常
- [ ] 确认服务运行状态正常
- [ ] 检查磁盘空间使用情况

## 每周维护检查清单

- [ ] 分析慢查询日志
- [ ] 检查性能趋势
- [ ] 清理临时文件
- [ ] 验证备份可恢复性

## 每月维护检查清单

- [ ] 应用安全更新
- [ ] 检查SSL证书有效期
- [ ] 审查访问日志
- [ ] 更新文档
```

---

**文档版本**: v1.0  
**最后更新**: 2026年1月28日  
**维护者**: Manus AI

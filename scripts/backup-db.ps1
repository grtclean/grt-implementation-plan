# ============================================
# GRT智能系统 - 数据库备份脚本
# 版本: 1.0.0
# 作者: Manus AI
# ============================================

param(
    [string]$BackupDir = ".\backups",
    [string]$MySQLUser = "grt_user",
    [string]$Database = "grt_system",
    [switch]$Compress,
    [int]$RetainDays = 7
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GRT智能系统 - 数据库备份" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 创建备份目录
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "创建备份目录: $BackupDir" -ForegroundColor Gray
}

# 生成备份文件名
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "${Database}_${timestamp}.sql"

Write-Host "`n开始备份数据库: $Database" -ForegroundColor Yellow
Write-Host "备份文件: $backupFile" -ForegroundColor Gray

# 执行备份
try {
    $startTime = Get-Date
    
    # 使用mysqldump进行备份
    # 注意：需要输入密码或配置my.cnf
    $mysqldumpArgs = @(
        "-u", $MySQLUser,
        "-p",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        $Database
    )
    
    Write-Host "执行mysqldump..." -ForegroundColor Gray
    mysqldump @mysqldumpArgs > $backupFile
    
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump执行失败"
    }
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    $fileSize = (Get-Item $backupFile).Length / 1MB
    
    Write-Host "✅ 备份完成" -ForegroundColor Green
    Write-Host "   文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    Write-Host "   耗时: $([math]::Round($duration, 2)) 秒" -ForegroundColor Gray
    
    # 压缩备份文件
    if ($Compress) {
        Write-Host "`n压缩备份文件..." -ForegroundColor Yellow
        $zipFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
        Remove-Item $backupFile -Force
        
        $zipSize = (Get-Item $zipFile).Length / 1MB
        Write-Host "✅ 压缩完成: $zipFile" -ForegroundColor Green
        Write-Host "   压缩后大小: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray
    }
    
    # 清理旧备份
    Write-Host "`n清理 $RetainDays 天前的备份..." -ForegroundColor Yellow
    $cutoffDate = (Get-Date).AddDays(-$RetainDays)
    $oldBackups = Get-ChildItem $BackupDir -Filter "${Database}_*" | 
                  Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    if ($oldBackups.Count -gt 0) {
        $oldBackups | Remove-Item -Force
        Write-Host "已删除 $($oldBackups.Count) 个旧备份" -ForegroundColor Gray
    } else {
        Write-Host "没有需要清理的旧备份" -ForegroundColor Gray
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "✅ 备份任务完成" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ 备份失败: $_" -ForegroundColor Red
    exit 1
}

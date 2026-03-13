<#
.SYNOPSIS
    Create M0-M12 project folder structure for a new GRT project
.DESCRIPTION
    Creates the full M0-M12 lifecycle folder tree under 05_项目管理/05.1_在建项目
    with standardized sub-folders for each gate stage.
.EXAMPLE
    .\02-create-project-folders.ps1 -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter" -ProjectCode "PRJ-2026-005" -ProjectName "比亚迪新能源清洗线"
.EXAMPLE
    .\02-create-project-folders.ps1 -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter" -ProjectCode "PRJ-2026-005" -ProjectName "比亚迪新能源清洗线" -CustomerCode "BYD"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $true)]
    [string]$ProjectCode,

    [Parameter(Mandatory = $true)]
    [string]$ProjectName,

    [string]$CustomerCode = "",

    [string]$LibraryName = "Documents",

    [switch]$IncludeSubFolders,

    [switch]$WhatIf
)

# ══════════════════════════════════════════════════════════════
#  M0-M12 Stage Definitions
# ══════════════════════════════════════════════════════════════

$stages = [ordered]@{
    "M0_需求确认"    = @("客户需求书", "可行性分析", "投标文件", "报价单")
    "M1_概念设计"    = @("概念方案", "技术规格书", "风险评估FMEA", "初步BOM")
    "M2_方案评审"    = @("评审记录", "专家意见", "修改清单", "客户确认")
    "M3_详细设计"    = @("机械图纸", "电气图纸", "PLC程序", "HMI画面", "BOM终版")
    "M4_采购制造"    = @("采购订单", "供应商交期", "来料检验", "制造工单")
    "M5_装配调试"    = @("装配记录", "调试报告", "问题跟踪", "自检清单")
    "M6_FAT出厂验收" = @("FAT方案", "FAT记录", "客户签字", "整改项")
    "M7_发运安装"    = @("发运清单", "包装方案", "安装指导", "现场照片")
    "M8_SAT现场验收" = @("SAT方案", "SAT记录", "验收签字", "培训记录")
    "M9_终验收"      = @("终验报告", "遗留问题", "客户签收", "项目移交")
    "M10_质保服务"   = @("服务工单", "巡检记录", "备件更换", "客户反馈")
    "M11_质保到期"   = @("质保评估", "延保方案", "设备状态报告")
    "M12_项目关闭"   = @("结项报告", "经验总结", "财务结算", "归档清单")
}

$extraFolders = @(
    "_会议纪要"
    "_变更记录"
    "_客户往来"
)

# ══════════════════════════════════════════════════════════════
#  Build folder name
# ══════════════════════════════════════════════════════════════

$folderName = if ($CustomerCode) {
    "${ProjectCode}_${CustomerCode}_${ProjectName}"
} else {
    "${ProjectCode}_${ProjectName}"
}

$basePath = "$LibraryName/05_项目管理/05.1_在建项目/$folderName"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT Project Folder Creator (M0-M12)             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project:  $ProjectCode — $ProjectName" -ForegroundColor White
Write-Host "  Path:     $basePath" -ForegroundColor DarkGray
Write-Host "  Stages:   $($stages.Count) (M0-M12)" -ForegroundColor DarkGray
if ($IncludeSubFolders) {
    Write-Host "  Sub-folders: YES (document categories per stage)" -ForegroundColor DarkGray
}
Write-Host ""

if ($WhatIf) {
    Write-Host "[DRY RUN] Folders that would be created:" -ForegroundColor Yellow
    foreach ($stage in $stages.Keys) {
        Write-Host "  $basePath/$stage" -ForegroundColor DarkGray
        if ($IncludeSubFolders) {
            foreach ($sub in $stages[$stage]) {
                Write-Host "    $basePath/$stage/$sub" -ForegroundColor DarkGray
            }
        }
    }
    foreach ($extra in $extraFolders) {
        Write-Host "  $basePath/$extra" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "[DRY RUN] No changes made." -ForegroundColor Yellow
    return
}

# Connect
Write-Host "Connecting to SharePoint..." -ForegroundColor Yellow
try {
    Connect-PnPOnline -Url $SiteUrl -Interactive
    Write-Host "  Connected." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    return
}

# Create stage folders
$created = 0

foreach ($stage in $stages.Keys) {
    $stagePath = "$basePath/$stage"
    try {
        Resolve-PnPFolder -SiteRelativePath $stagePath -ErrorAction Stop | Out-Null
        $created++
        Write-Host "  [OK] $stage" -ForegroundColor Green

        # Sub-folders (optional)
        if ($IncludeSubFolders) {
            foreach ($sub in $stages[$stage]) {
                try {
                    Resolve-PnPFolder -SiteRelativePath "$stagePath/$sub" -ErrorAction Stop | Out-Null
                    Write-Host "       $sub" -ForegroundColor DarkGreen
                } catch {
                    Write-Host "       [FAIL] $sub — $_" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "  [FAIL] $stage — $_" -ForegroundColor Red
    }
}

# Extra folders
foreach ($extra in $extraFolders) {
    try {
        Resolve-PnPFolder -SiteRelativePath "$basePath/$extra" -ErrorAction Stop | Out-Null
        $created++
        Write-Host "  [OK] $extra" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $extra — $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Project folder created: $created folders" -ForegroundColor Green
Write-Host "  Path: $basePath" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

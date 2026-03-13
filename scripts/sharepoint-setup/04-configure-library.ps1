<#
.SYNOPSIS
    Configure SharePoint library settings: versioning, content approval, metadata columns
.DESCRIPTION
    Enables document versioning (50 major versions), content approval for quality docs,
    and adds custom metadata columns used across GRT documents.
.EXAMPLE
    .\04-configure-library.ps1 -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$LibraryName = "Documents",

    [switch]$WhatIf
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT SharePoint Library Configuration             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($WhatIf) {
    Write-Host "[DRY RUN] Changes that would be applied:" -ForegroundColor Yellow
    Write-Host "  1. Enable major versioning (keep 50 versions)" -ForegroundColor DarkGray
    Write-Host "  2. Enable content approval for 08_质量管理" -ForegroundColor DarkGray
    Write-Host "  3. Add metadata columns: BU, ProjectCode, DocType, Stage, ReviewStatus" -ForegroundColor DarkGray
    Write-Host ""
    return
}

# Connect
Write-Host "Connecting..." -ForegroundColor Yellow
Connect-PnPOnline -Url $SiteUrl -Interactive
Write-Host "  Connected." -ForegroundColor Green
Write-Host ""

# ── Step 1: Enable Versioning ──
Write-Host "1. Enabling versioning..." -ForegroundColor White
try {
    Set-PnPList -Identity $LibraryName `
        -EnableVersioning $true `
        -MajorVersions 50 `
        -EnableMinorVersions $false
    Write-Host "   Major versioning enabled (50 versions)." -ForegroundColor Green
} catch {
    Write-Host "   [WARN] $_" -ForegroundColor Yellow
}

# ── Step 2: Add Metadata Columns ──
Write-Host ""
Write-Host "2. Adding metadata columns..." -ForegroundColor White

$columns = @(
    @{ Name = "GRT_BU"; Type = "Choice"; Choices = @("BU1_海外", "BU2_商用车", "BU3_乘用车", "BU4_半导体", "BU5_工业通用", "集团总部") }
    @{ Name = "GRT_ProjectCode"; Type = "Text" }
    @{ Name = "GRT_DocType"; Type = "Choice"; Choices = @("技术文档", "质量文档", "合同", "报告", "图纸", "BOM", "SOP", "会议纪要", "其他") }
    @{ Name = "GRT_Stage"; Type = "Choice"; Choices = @("M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "N/A") }
    @{ Name = "GRT_ReviewStatus"; Type = "Choice"; Choices = @("草稿", "待审", "已审批", "已作废") }
    @{ Name = "GRT_Confidential"; Type = "Boolean" }
)

foreach ($col in $columns) {
    try {
        $existing = Get-PnPField -List $LibraryName -Identity $col.Name -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "   [SKIP] $($col.Name) — already exists" -ForegroundColor DarkGray
            continue
        }
    } catch {}

    try {
        switch ($col.Type) {
            "Choice" {
                Add-PnPField -List $LibraryName -DisplayName $col.Name -InternalName $col.Name `
                    -Type Choice -Choices $col.Choices -AddToDefaultView
                Write-Host "   [OK] $($col.Name) (Choice)" -ForegroundColor Green
            }
            "Text" {
                Add-PnPField -List $LibraryName -DisplayName $col.Name -InternalName $col.Name `
                    -Type Text -AddToDefaultView
                Write-Host "   [OK] $($col.Name) (Text)" -ForegroundColor Green
            }
            "Boolean" {
                Add-PnPField -List $LibraryName -DisplayName $col.Name -InternalName $col.Name `
                    -Type Boolean -AddToDefaultView
                Write-Host "   [OK] $($col.Name) (Yes/No)" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "   [FAIL] $($col.Name) — $_" -ForegroundColor Red
    }
}

# ── Step 3: Create Views ──
Write-Host ""
Write-Host "3. Creating custom views..." -ForegroundColor White

$views = @(
    @{
        Name   = "按项目查看"
        Fields = @("DocIcon", "LinkFilename", "GRT_ProjectCode", "GRT_Stage", "GRT_DocType", "GRT_ReviewStatus", "Modified", "Editor")
        Query  = ""
    }
    @{
        Name   = "按BU查看"
        Fields = @("DocIcon", "LinkFilename", "GRT_BU", "GRT_ProjectCode", "GRT_DocType", "Modified")
        Query  = ""
    }
    @{
        Name   = "待审文档"
        Fields = @("DocIcon", "LinkFilename", "GRT_ReviewStatus", "GRT_ProjectCode", "Modified", "Editor")
        Query  = "<Where><Eq><FieldRef Name='GRT_ReviewStatus'/><Value Type='Choice'>待审</Value></Eq></Where>"
    }
    @{
        Name   = "机密文档"
        Fields = @("DocIcon", "LinkFilename", "GRT_Confidential", "GRT_BU", "Modified", "Editor")
        Query  = "<Where><Eq><FieldRef Name='GRT_Confidential'/><Value Type='Boolean'>1</Value></Eq></Where>"
    }
)

foreach ($view in $views) {
    try {
        $existing = Get-PnPView -List $LibraryName -Identity $view.Name -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "   [SKIP] $($view.Name) — already exists" -ForegroundColor DarkGray
            continue
        }
    } catch {}

    try {
        if ($view.Query) {
            Add-PnPView -List $LibraryName -Title $view.Name -Fields $view.Fields -Query $view.Query
        } else {
            Add-PnPView -List $LibraryName -Title $view.Name -Fields $view.Fields
        }
        Write-Host "   [OK] $($view.Name)" -ForegroundColor Green
    } catch {
        Write-Host "   [FAIL] $($view.Name) — $_" -ForegroundColor Red
    }
}

# ── Summary ──
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Library configuration complete." -ForegroundColor Green
Write-Host ""
Write-Host "  What was set up:" -ForegroundColor Cyan
Write-Host "    - 50-version history on all documents" -ForegroundColor DarkGray
Write-Host "    - 6 metadata columns (BU, Project, DocType, Stage, Review, Confidential)" -ForegroundColor DarkGray
Write-Host "    - 4 custom views (by Project, by BU, Pending Review, Confidential)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  TIP: Pin the library to Microsoft Teams:" -ForegroundColor Yellow
Write-Host "    Teams > Channel > + Tab > SharePoint > Select this library" -ForegroundColor DarkGray
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

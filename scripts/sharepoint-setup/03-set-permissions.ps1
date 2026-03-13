<#
.SYNOPSIS
    Apply GRT permission matrix to SharePoint document folders
.DESCRIPTION
    Sets folder-level permissions based on the GRT organizational structure.
    Breaks permission inheritance on each top-level folder and assigns
    appropriate SharePoint groups.
.EXAMPLE
    .\03-set-permissions.ps1 -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter"
.NOTES
    IMPORTANT: Run 01-create-folder-tree.ps1 FIRST to create all folders.

    Before running, create these SharePoint Groups in Site Settings > Permissions:
      - GRT-CEO
      - GRT-CTO
      - GRT-CFO
      - GRT-HR-Directors
      - GRT-HR-Team
      - GRT-Finance-Team
      - GRT-Sales-VP
      - GRT-Sales-Team
      - GRT-PMO
      - GRT-Project-Managers
      - GRT-RD-Engineers
      - GRT-Production-VP
      - GRT-ShopFloor-Leads
      - GRT-QA-Director
      - GRT-QA-Team
      - GRT-SCM-Director
      - GRT-Procurement-Team
      - GRT-CS-Director
      - GRT-Service-Engineers
      - GRT-BU1-海外
      - GRT-BU2-商用车
      - GRT-BU3-乘用车
      - GRT-BU4-半导体
      - GRT-BU5-工业通用
      - GRT-IT-Admin
      - GRT-All-Managers
      - GRT-All-Staff
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$LibraryName = "Documents",

    [switch]$WhatIf
)

# ══════════════════════════════════════════════════════════════
#  Permission Matrix
#  Role Levels: "Full Control", "Edit", "Read"
# ══════════════════════════════════════════════════════════════

$permissionMatrix = @{
    "01_公司治理" = @{
        "Full Control" = @("GRT-CEO", "GRT-CFO")
        "Read"         = @("GRT-All-Managers")
    }
    "02_人力资源" = @{
        "Full Control" = @("GRT-HR-Directors")
        "Edit"         = @("GRT-HR-Team")
        "Read"         = @("GRT-All-Managers")
    }
    "03_财务" = @{
        "Full Control" = @("GRT-CFO")
        "Edit"         = @("GRT-Finance-Team")
        "Read"         = @("GRT-CEO")
    }
    "04_销售与CRM" = @{
        "Full Control" = @("GRT-Sales-VP")
        "Edit"         = @("GRT-Sales-Team")
        "Read"         = @("GRT-All-Managers")
    }
    "05_项目管理" = @{
        "Full Control" = @("GRT-PMO")
        "Edit"         = @("GRT-Project-Managers", "GRT-RD-Engineers")
        "Read"         = @("GRT-All-Staff")
    }
    "06_研发设计" = @{
        "Full Control" = @("GRT-CTO")
        "Edit"         = @("GRT-RD-Engineers")
        "Read"         = @("GRT-QA-Team")
    }
    "07_生产制造" = @{
        "Full Control" = @("GRT-Production-VP")
        "Edit"         = @("GRT-ShopFloor-Leads")
        "Read"         = @("GRT-QA-Team")
    }
    "08_质量管理" = @{
        "Full Control" = @("GRT-QA-Director")
        "Edit"         = @("GRT-QA-Team")
        "Read"         = @("GRT-All-Managers")
    }
    "09_供应链" = @{
        "Full Control" = @("GRT-SCM-Director")
        "Edit"         = @("GRT-Procurement-Team")
        "Read"         = @("GRT-Finance-Team")
    }
    "10_客户服务" = @{
        "Full Control" = @("GRT-CS-Director")
        "Edit"         = @("GRT-Service-Engineers")
        "Read"         = @("GRT-Sales-Team")
    }
    "11_事业部专区/BU1_海外事业部" = @{
        "Full Control" = @("GRT-CEO")
        "Edit"         = @("GRT-BU1-海外")
    }
    "11_事业部专区/BU2_商用车事业部" = @{
        "Full Control" = @("GRT-CEO")
        "Edit"         = @("GRT-BU2-商用车")
    }
    "11_事业部专区/BU3_乘用车事业部" = @{
        "Full Control" = @("GRT-CEO")
        "Edit"         = @("GRT-BU3-乘用车")
    }
    "11_事业部专区/BU4_半导体事业部" = @{
        "Full Control" = @("GRT-CEO")
        "Edit"         = @("GRT-BU4-半导体")
    }
    "11_事业部专区/BU5_工业通用事业部" = @{
        "Full Control" = @("GRT-CEO")
        "Edit"         = @("GRT-BU5-工业通用")
    }
    "12_IT与系统" = @{
        "Full Control" = @("GRT-IT-Admin")
        "Read"         = @("GRT-CEO", "GRT-CTO")
    }
    "99_模板库" = @{
        "Full Control" = @("GRT-IT-Admin")
        "Read"         = @("GRT-All-Staff")
    }
}

# SharePoint permission level mapping
$spLevels = @{
    "Full Control" = "Full Control"
    "Edit"         = "Edit"
    "Read"         = "Read"
}

# ══════════════════════════════════════════════════════════════
#  Execution
# ══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT SharePoint Permission Matrix Setup           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Folders to configure: $($permissionMatrix.Count)" -ForegroundColor DarkGray
Write-Host ""

if ($WhatIf) {
    Write-Host "[DRY RUN] Permissions that would be set:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($folder in $permissionMatrix.Keys | Sort-Object) {
        Write-Host "  $folder" -ForegroundColor White
        foreach ($level in @("Full Control", "Edit", "Read")) {
            $groups = $permissionMatrix[$folder][$level]
            if ($groups) {
                Write-Host "    $($level): $($groups -join ', ')" -ForegroundColor DarkGray
            }
        }
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

Write-Host ""

foreach ($folder in $permissionMatrix.Keys | Sort-Object) {
    $folderPath = "$LibraryName/$folder"
    Write-Host "Processing: $folder" -ForegroundColor White

    try {
        # Step 1: Break permission inheritance
        $folderItem = Get-PnPFolder -Url $folderPath -ErrorAction Stop
        $listItem = $folderItem.ListItemAllFields
        Set-PnPListItemPermission -List $LibraryName -Identity $listItem.Id -InheritPermissions:$false

        Write-Host "  Inheritance broken." -ForegroundColor DarkGreen

        # Step 2: Assign permissions per group
        foreach ($level in @("Full Control", "Edit", "Read")) {
            $groups = $permissionMatrix[$folder][$level]
            if (-not $groups) { continue }

            foreach ($group in $groups) {
                try {
                    Set-PnPListItemPermission -List $LibraryName -Identity $listItem.Id `
                        -Group $group -AddRole $spLevels[$level]
                    Write-Host "    $level -> $group" -ForegroundColor DarkGreen
                } catch {
                    Write-Host "    [WARN] $level -> $group — Group may not exist: $_" -ForegroundColor Yellow
                }
            }
        }

        Write-Host "  Done." -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $_ " -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Permission setup complete." -ForegroundColor Green
Write-Host "  IMPORTANT: Verify permissions in SharePoint UI:" -ForegroundColor Yellow
Write-Host "    Site Settings > Site Permissions > Check Permissions" -ForegroundColor DarkGray
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

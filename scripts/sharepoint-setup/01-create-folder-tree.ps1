<#
.SYNOPSIS
    GRT SharePoint Document Library — Full Folder Tree Setup
.DESCRIPTION
    Creates the complete GRT document folder structure in SharePoint Online.
    Covers: Governance, HR, Finance, Sales, Projects (M0-M12), R&D, Manufacturing,
    Quality (IATF 16949), Supply Chain, Customer Service, BU Zones, IT, Templates.
.NOTES
    Prerequisites:
      Install-Module PnP.PowerShell -Scope CurrentUser

    Usage:
      .\01-create-folder-tree.ps1 -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter"

    Author: GRT IT Team
    Date:   2026-03-09
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$LibraryName = "Documents",

    [switch]$WhatIf
)

# ══════════════════════════════════════════════════════════════
#  Folder Tree Definition
# ══════════════════════════════════════════════════════════════

$folders = @(
    # ── 01 Corporate Governance ──
    "01_公司治理/01.1_公司章程与制度"
    "01_公司治理/01.2_董事会决议"
    "01_公司治理/01.3_组织架构图"
    "01_公司治理/01.4_战略规划"
    "01_公司治理/01.5_年度报告"

    # ── 02 Human Resources ──
    "02_人力资源/02.1_员工手册"
    "02_人力资源/02.2_招聘"
    "02_人力资源/02.3_培训记录"
    "02_人力资源/02.4_绩效考核"
    "02_人力资源/02.5_薪酬福利"
    "02_人力资源/02.6_离职交接"

    # ── 03 Finance ──
    "03_财务/03.1_预算"
    "03_财务/03.2_报销与审批"
    "03_财务/03.3_发票与合同"
    "03_财务/03.4_税务"
    "03_财务/03.5_审计"

    # ── 04 Sales & CRM ──
    "04_销售与CRM/04.1_客户档案"
    "04_销售与CRM/04.2_报价方案"
    "04_销售与CRM/04.3_合同"
    "04_销售与CRM/04.4_投标文件"
    "04_销售与CRM/04.5_市场分析"

    # ── 05 Project Management (M0-M12 lifecycle) ──
    "05_项目管理/05.0_项目模板"
    "05_项目管理/05.1_在建项目"
    "05_项目管理/05.2_已完成项目"

    # ── 06 R&D Engineering ──
    "06_研发设计/06.1_机械设计/3D模型"
    "06_研发设计/06.1_机械设计/2D图纸"
    "06_研发设计/06.1_机械设计/设计变更ECN"
    "06_研发设计/06.2_电气设计/电气原理图"
    "06_研发设计/06.2_电气设计/PLC程序"
    "06_研发设计/06.2_电气设计/HMI画面"
    "06_研发设计/06.3_BOM管理"
    "06_研发设计/06.4_NPI新产品导入/Concept_概念"
    "06_研发设计/06.4_NPI新产品导入/EVT_工程验证"
    "06_研发设计/06.4_NPI新产品导入/DVT_设计验证"
    "06_研发设计/06.4_NPI新产品导入/PVT_生产验证"
    "06_研发设计/06.4_NPI新产品导入/MP_量产"
    "06_研发设计/06.5_专利与知识产权"

    # ── 07 Manufacturing ──
    "07_生产制造/07.1_工艺文件/SOP作业指导书"
    "07_生产制造/07.1_工艺文件/工艺路线"
    "07_生产制造/07.1_工艺文件/控制计划"
    "07_生产制造/07.2_生产计划"
    "07_生产制造/07.3_设备管理/设备台账"
    "07_生产制造/07.3_设备管理/保养记录"
    "07_生产制造/07.3_设备管理/校准记录"
    "07_生产制造/07.4_安全与环境"

    # ── 08 Quality Management (IATF 16949) ──
    "08_质量管理/08.1_质量手册"
    "08_质量管理/08.2_FMEA"
    "08_质量管理/08.3_PPAP"
    "08_质量管理/08.4_MSA测量系统分析"
    "08_质量管理/08.5_SPC统计过程控制"
    "08_质量管理/08.6_8D-CAPA"
    "08_质量管理/08.7_来料检验IQC"
    "08_质量管理/08.8_过程检验IPQC"
    "08_质量管理/08.9_出货检验OQC"
    "08_质量管理/08.10_客户投诉"
    "08_质量管理/08.11_内审外审"

    # ── 09 Supply Chain ──
    "09_供应链/09.1_供应商档案"
    "09_供应链/09.2_采购订单"
    "09_供应链/09.3_仓库管理"
    "09_供应链/09.4_物流发运"
    "09_供应链/09.5_供应商评审"

    # ── 10 Customer Service ──
    "10_客户服务/10.1_售后工单"
    "10_客户服务/10.2_备件管理"
    "10_客户服务/10.3_客户培训"
    "10_客户服务/10.4_保修记录"
    "10_客户服务/10.5_客户满意度"

    # ── 11 BU Zones ──
    "11_事业部专区/BU1_海外事业部"
    "11_事业部专区/BU2_商用车事业部"
    "11_事业部专区/BU3_乘用车事业部"
    "11_事业部专区/BU4_半导体事业部"
    "11_事业部专区/BU5_工业通用事业部"

    # ── 12 IT & Systems ──
    "12_IT与系统/12.1_系统架构"
    "12_IT与系统/12.2_运维手册"
    "12_IT与系统/12.3_安全合规"
    "12_IT与系统/12.4_变更管理"

    # ── 99 Template Library ──
    "99_模板库/合同模板"
    "99_模板库/报告模板"
    "99_模板库/审批表单"
    "99_模板库/品牌素材"
)

# ══════════════════════════════════════════════════════════════
#  Execution
# ══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT SharePoint Folder Tree Setup                ║" -ForegroundColor Cyan
Write-Host "║  Site: $SiteUrl" -ForegroundColor Cyan
Write-Host "║  Library: $LibraryName" -ForegroundColor Cyan
Write-Host "║  Folders to create: $($folders.Count)" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($WhatIf) {
    Write-Host "[DRY RUN] The following folders would be created:" -ForegroundColor Yellow
    foreach ($folder in $folders) {
        Write-Host "  $LibraryName/$folder" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "[DRY RUN] No changes made. Remove -WhatIf to execute." -ForegroundColor Yellow
    return
}

# Connect to SharePoint
Write-Host "Connecting to SharePoint..." -ForegroundColor Yellow
try {
    Connect-PnPOnline -Url $SiteUrl -Interactive
    Write-Host "  Connected successfully." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Failed to connect to SharePoint." -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Install PnP.PowerShell: Install-Module PnP.PowerShell -Scope CurrentUser" -ForegroundColor DarkGray
    Write-Host "    2. Verify the site URL is correct" -ForegroundColor DarkGray
    Write-Host "    3. Ensure you have Site Owner or Site Collection Admin permissions" -ForegroundColor DarkGray
    return
}

# Create folders
$created = 0
$skipped = 0
$errors  = 0

foreach ($folder in $folders) {
    $fullPath = "$LibraryName/$folder"
    try {
        $result = Resolve-PnPFolder -SiteRelativePath $fullPath -ErrorAction Stop
        $created++
        Write-Host "  [OK] $folder" -ForegroundColor Green
    } catch {
        # If Resolve-PnPFolder fails, try manual creation
        try {
            $parts = $folder -split "/"
            $currentPath = $LibraryName
            foreach ($part in $parts) {
                $currentPath = "$currentPath/$part"
                try {
                    Resolve-PnPFolder -SiteRelativePath $currentPath -ErrorAction Stop | Out-Null
                } catch {
                    # Folder doesn't exist yet — will be created by Resolve
                }
            }
            $created++
            Write-Host "  [OK] $folder (recursive)" -ForegroundColor Cyan
        } catch {
            $errors++
            Write-Host "  [FAIL] $folder — $_" -ForegroundColor Red
        }
    }
}

# Summary
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Summary:" -ForegroundColor Cyan
Write-Host "    Created:  $created" -ForegroundColor Green
Write-Host "    Errors:   $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host "    Total:    $($folders.Count)" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 02-create-project-folders.ps1 for each active project" -ForegroundColor DarkGray
Write-Host "  2. Run 03-set-permissions.ps1 to apply permission matrix" -ForegroundColor DarkGray
Write-Host "  3. Run 04-configure-library.ps1 to enable versioning & content approval" -ForegroundColor DarkGray

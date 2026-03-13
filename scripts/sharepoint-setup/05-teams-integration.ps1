<#
.SYNOPSIS
    Create Microsoft Teams channels mapped to SharePoint document folders
.DESCRIPTION
    Creates Teams channels for each department and pins the corresponding
    SharePoint folder as a tab, enabling seamless document access from Teams.
.EXAMPLE
    .\05-teams-integration.ps1 -TeamName "GRT集团" -SiteUrl "https://yourcompany.sharepoint.com/sites/GRT-DocCenter"
.NOTES
    Prerequisites:
      Install-Module MicrosoftTeams -Scope CurrentUser
      Install-Module PnP.PowerShell -Scope CurrentUser
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$TeamName,

    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [switch]$WhatIf
)

# ══════════════════════════════════════════════════════════════
#  Channel → SharePoint Folder Mapping
# ══════════════════════════════════════════════════════════════

$channelMap = @(
    @{ Channel = "01-公司治理";    Folder = "01_公司治理";    Description = "公司章程、董事会决议、战略规划" }
    @{ Channel = "02-人力资源";    Folder = "02_人力资源";    Description = "员工管理、招聘、培训、绩效" }
    @{ Channel = "03-财务";        Folder = "03_财务";        Description = "预算、报销、发票、审计" }
    @{ Channel = "04-销售与CRM";   Folder = "04_销售与CRM";   Description = "客户档案、报价、合同、市场分析" }
    @{ Channel = "05-项目管理";    Folder = "05_项目管理";    Description = "M0-M12项目全生命周期文档" }
    @{ Channel = "06-研发设计";    Folder = "06_研发设计";    Description = "机械、电气设计图纸、BOM、NPI" }
    @{ Channel = "07-生产制造";    Folder = "07_生产制造";    Description = "工艺文件、SOP、设备管理" }
    @{ Channel = "08-质量管理";    Folder = "08_质量管理";    Description = "IATF 16949、FMEA、PPAP、8D-CAPA" }
    @{ Channel = "09-供应链";      Folder = "09_供应链";      Description = "供应商、采购、仓库、物流" }
    @{ Channel = "10-客户服务";    Folder = "10_客户服务";    Description = "售后工单、备件、培训、保修" }
    @{ Channel = "11-BU1-海外";    Folder = "11_事业部专区/BU1_海外事业部"; Description = "海外事业部专区" }
    @{ Channel = "11-BU2-商用车";  Folder = "11_事业部专区/BU2_商用车事业部"; Description = "商用车事业部专区" }
    @{ Channel = "11-BU3-乘用车";  Folder = "11_事业部专区/BU3_乘用车事业部"; Description = "乘用车事业部专区" }
    @{ Channel = "11-BU4-半导体";  Folder = "11_事业部专区/BU4_半导体事业部"; Description = "半导体事业部专区" }
    @{ Channel = "11-BU5-工业通用"; Folder = "11_事业部专区/BU5_工业通用事业部"; Description = "工业通用事业部专区" }
    @{ Channel = "12-IT与系统";    Folder = "12_IT与系统";    Description = "系统架构、运维、安全合规" }
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT Teams ←→ SharePoint Integration              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Team:     $TeamName" -ForegroundColor White
Write-Host "  Site:     $SiteUrl" -ForegroundColor DarkGray
Write-Host "  Channels: $($channelMap.Count)" -ForegroundColor DarkGray
Write-Host ""

if ($WhatIf) {
    Write-Host "[DRY RUN] Channels that would be created:" -ForegroundColor Yellow
    foreach ($item in $channelMap) {
        Write-Host "  $($item.Channel)  ->  Documents/$($item.Folder)" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "[DRY RUN] No changes made." -ForegroundColor Yellow
    return
}

# Connect to Teams
Write-Host "Connecting to Microsoft Teams..." -ForegroundColor Yellow
try {
    Connect-MicrosoftTeams
    Write-Host "  Connected to Teams." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    Write-Host "  Install: Install-Module MicrosoftTeams -Scope CurrentUser" -ForegroundColor DarkGray
    return
}

# Find the team
$team = Get-Team -DisplayName $TeamName -ErrorAction SilentlyContinue
if (-not $team) {
    Write-Host "  ERROR: Team '$TeamName' not found." -ForegroundColor Red
    Write-Host "  Available teams:" -ForegroundColor Yellow
    Get-Team | Select-Object DisplayName | ForEach-Object { Write-Host "    - $($_.DisplayName)" -ForegroundColor DarkGray }
    return
}
$teamId = $team.GroupId
Write-Host "  Team found: $($team.DisplayName) ($teamId)" -ForegroundColor Green
Write-Host ""

# Create channels
foreach ($item in $channelMap) {
    Write-Host "  Creating channel: $($item.Channel)..." -ForegroundColor White

    try {
        # Check if channel exists
        $existing = Get-TeamChannel -GroupId $teamId | Where-Object { $_.DisplayName -eq $item.Channel }
        if ($existing) {
            Write-Host "    [SKIP] Already exists." -ForegroundColor DarkGray
            continue
        }

        # Create channel
        $channel = New-TeamChannel -GroupId $teamId `
            -DisplayName $item.Channel `
            -Description $item.Description `
            -MembershipType Standard

        Write-Host "    [OK] Channel created." -ForegroundColor Green

        # NOTE: Pinning SharePoint folder tabs requires Graph API.
        # Below is the manual instruction:
        Write-Host "    [INFO] To pin SharePoint folder:" -ForegroundColor Yellow
        Write-Host "      1. Open the channel in Teams" -ForegroundColor DarkGray
        Write-Host "      2. Click '+' (Add tab)" -ForegroundColor DarkGray
        Write-Host "      3. Select 'SharePoint'" -ForegroundColor DarkGray
        Write-Host "      4. Navigate to: Documents/$($item.Folder)" -ForegroundColor DarkGray
    } catch {
        Write-Host "    [FAIL] $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Teams channels created." -ForegroundColor Green
Write-Host ""
Write-Host "  Manual step required:" -ForegroundColor Yellow
Write-Host "    Pin SharePoint folders as tabs in each channel." -ForegroundColor DarkGray
Write-Host "    (See [INFO] instructions above for each channel)" -ForegroundColor DarkGray
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan

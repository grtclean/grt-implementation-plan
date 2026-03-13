#
# GRT Developer Environment Initialization Script (Windows PowerShell)
#
# Idempotent — safe to re-run at any time.
#
# Steps:
#   1/5  Create .vscode/ with CTO-standard settings
#   2/5  Install git pre-push hook
#   3/5  Test API connectivity
#   4/5  Fetch BU SharePoint directory tree
#   5/5  Print summary + next steps
#
# Usage:
#   powershell scripts/grt-init-dev-env.ps1
#

$ErrorActionPreference = "Continue"

# ── Configuration ──────────────────────────────────────────────────────

$GRT_API_BASE = if ($env:GRT_API_BASE) { $env:GRT_API_BASE } else { "http://localhost:5000" }
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$passed = 0
$failed = 0

function Step-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
    $script:passed++
}

function Step-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:failed++
}

function Step-Skip($msg) {
    Write-Host "  [SKIP] $msg" -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     GRT Developer Environment Init  (v1.0)             " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1/5: VS Code settings ────────────────────────────────────────

Write-Host "[1/5] Setting up VS Code workspace..." -ForegroundColor Cyan

$vscodePath = Join-Path $ProjectRoot ".vscode"
if (-not (Test-Path $vscodePath)) {
    New-Item -ItemType Directory -Path $vscodePath -Force | Out-Null
}

$settingsSrc = Join-Path $ScriptDir "vscode\settings.json"
$settingsDst = Join-Path $vscodePath "settings.json"
if (Test-Path $settingsSrc) {
    Copy-Item -Path $settingsSrc -Destination $settingsDst -Force
    Step-Ok ".vscode/settings.json created"
} else {
    Step-Fail "scripts/vscode/settings.json template not found"
}

$extSrc = Join-Path $ScriptDir "vscode\extensions.json"
$extDst = Join-Path $vscodePath "extensions.json"
if (Test-Path $extSrc) {
    Copy-Item -Path $extSrc -Destination $extDst -Force
    Step-Ok ".vscode/extensions.json created"
} else {
    Step-Fail "scripts/vscode/extensions.json template not found"
}

# ── Step 2/5: Git pre-push hook ───────────────────────────────────────

Write-Host ""
Write-Host "[2/5] Installing git pre-push hook..." -ForegroundColor Cyan

$gitDir = Join-Path $ProjectRoot ".git"
if (Test-Path $gitDir) {
    $hooksDir = Join-Path $gitDir "hooks"
    if (-not (Test-Path $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }

    $hookSrc = Join-Path $ScriptDir "hooks\pre-push"
    $hookDst = Join-Path $hooksDir "pre-push"
    if (Test-Path $hookSrc) {
        Copy-Item -Path $hookSrc -Destination $hookDst -Force
        Step-Ok "Pre-push hook installed (.git/hooks/pre-push)"
    } else {
        Step-Fail "scripts/hooks/pre-push not found"
    }
} else {
    Step-Fail "Not a git repository - cannot install hooks"
}

# ── Step 3/5: API connectivity ────────────────────────────────────────

Write-Host ""
Write-Host "[3/5] Testing API connectivity..." -ForegroundColor Cyan

try {
    $healthUrl = "$GRT_API_BASE/api/trpc/health"
    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    Step-Ok "API reachable at $GRT_API_BASE"
} catch {
    Step-Fail "API unreachable at $GRT_API_BASE (start with: npm run dev)"
}

# ── Step 4/5: SharePoint directory tree ───────────────────────────────

Write-Host ""
Write-Host "[4/5] Fetching BU SharePoint directory tree..." -ForegroundColor Cyan

try {
    $spUrl = "$GRT_API_BASE/api/trpc/devEnv.getSharePointTree?input=%7B%22json%22%3A%7B%7D%7D"
    $spResponse = Invoke-RestMethod -Uri $spUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    $siteCount = $spResponse.result.data.json.totalSites
    Step-Ok "SharePoint directory: $siteCount sites found"

    Write-Host ""
    Write-Host "  Project Folder Template (12 directories):" -ForegroundColor White
    Write-Host "    01_Proposal/       07_Procurement/"
    Write-Host "    02_Mechanical/     08_QA_Testing/"
    Write-Host "    03_Electrical/     09_FAT/"
    Write-Host "    04_PLC/            10_SAT/"
    Write-Host "    05_HMI/            11_Manuals/"
    Write-Host "    06_BOM/            12_Archives/"
} catch {
    Step-Skip "SharePoint tree unavailable (requires API + auth)"
}

# ── Step 5/5: Summary ─────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Init Complete: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All checks passed!" -ForegroundColor Green
} else {
    Write-Host "Some steps failed - see above for details." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Create a .grt-dev-token file with your API auth token"
Write-Host "  2. Set GRT_PROJECT_ID=<your-project-id> in your terminal"
Write-Host "  3. Install recommended VS Code extensions (Ctrl+Shift+P -> 'Install Recommended')"
Write-Host "  4. Start the dev server: npm run dev"
Write-Host "  5. Try pushing - the pre-push hook will validate mech/elec sync"
Write-Host ""

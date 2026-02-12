# deploy-grt-standalone.ps1
# GRT System - Standalone Deployment Script v2.0
# Includes: PostgreSQL migration | Local auth | Manus detach | AI config

param(
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GRT Standalone Deployment Script v2.0" -ForegroundColor Cyan
Write-Host "  PostgreSQL + Local Auth + AI Model Config" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$ProjectRoot\package.json")) {
    Write-Host "[ERROR] package.json not found in current directory" -ForegroundColor Red
    exit 1
}

$patchDir = $PSScriptRoot

# ====================================================================
# STEP 1: Install dependencies
# ====================================================================
Write-Host "[1/8] Installing dependencies..." -ForegroundColor Green
Set-Location $ProjectRoot

Write-Host "  Removing mysql2, adding pg (PostgreSQL)..." -ForegroundColor Gray
pnpm remove mysql2 2>$null
pnpm add pg drizzle-orm
pnpm add -D @types/pg

Write-Host "  Adding bcryptjs (password hashing)..." -ForegroundColor Gray
pnpm add bcryptjs
pnpm add -D @types/bcryptjs

Write-Host "  Done" -ForegroundColor Gray

# ====================================================================
# STEP 2: Database schema conversion (MySQL -> PostgreSQL)
# ====================================================================
Write-Host ""
Write-Host "[2/8] Converting database schema (MySQL -> PostgreSQL)..." -ForegroundColor Green

$schemaSrc = Join-Path $patchDir "drizzle\schema.ts"
$schemaDst = Join-Path $ProjectRoot "drizzle\schema.ts"
if (Test-Path $schemaSrc) {
    Copy-Item $schemaDst "$schemaDst.mysql.bak" -Force 2>$null
    Copy-Item $schemaSrc $schemaDst -Force
    Write-Host "  + drizzle/schema.ts (MySQL -> PostgreSQL)" -ForegroundColor Gray
} else {
    Write-Host "  ! schema.ts not found in patch" -ForegroundColor Yellow
}

$drizzleCfgSrc = Join-Path $patchDir "drizzle.config.ts"
$drizzleCfgDst = Join-Path $ProjectRoot "drizzle.config.ts"
if (Test-Path $drizzleCfgSrc) {
    Copy-Item $drizzleCfgSrc $drizzleCfgDst -Force
    Write-Host "  + drizzle.config.ts (dialect: postgresql)" -ForegroundColor Gray
}

# ====================================================================
# STEP 3: Patch server/db.ts (mysql2 -> node-postgres)
# ====================================================================
Write-Host ""
Write-Host "[3/8] Patching database driver (server/db.ts)..." -ForegroundColor Green

$dbFile = Join-Path $ProjectRoot "server\db.ts"
$dbContent = Get-Content $dbFile -Raw -Encoding UTF8

$dbContent = $dbContent -replace 'import\s*\{\s*drizzle\s*\}\s*from\s*"drizzle-orm/mysql2"', 'import { drizzle } from "drizzle-orm/node-postgres"'
$dbContent = $dbContent -replace '\.onDuplicateKeyUpdate\(\{', '.onConflictDoUpdate({ target: users.openId, set: {'

[System.IO.File]::WriteAllText($dbFile, $dbContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "  + server/db.ts: mysql2 -> node-postgres" -ForegroundColor Gray

$posDbInit = Join-Path $ProjectRoot "server\pos\db-init.ts"
if (Test-Path $posDbInit) {
    $posContent = Get-Content $posDbInit -Raw -Encoding UTF8
    $posContent = $posContent -replace '\.onDuplicateKeyUpdate\(\{', '.onConflictDoUpdate({ target: [], set: {'
    [System.IO.File]::WriteAllText($posDbInit, $posContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  + server/pos/db-init.ts patched" -ForegroundColor Gray
}

# ====================================================================
# STEP 4: Install local authentication system
# ====================================================================
Write-Host ""
Write-Host "[4/8] Installing local auth system..." -ForegroundColor Green

$serverFiles = @(
    @{ Src = "server\_core\local-auth.ts"; Dst = "server\_core\local-auth.ts"; Desc = "Local auth API" },
    @{ Src = "server\_core\context.ts"; Dst = "server\_core\context.ts"; Desc = "tRPC context" },
    @{ Src = "server\_core\index.ts"; Dst = "server\_core\index.ts"; Desc = "Server entry" },
    @{ Src = "server\_core\env.ts"; Dst = "server\_core\env.ts"; Desc = "Env config" },
    @{ Src = "server\_core\llm.ts"; Dst = "server\_core\llm.ts"; Desc = "LLM layer" }
)

foreach ($f in $serverFiles) {
    $src = Join-Path $patchDir $f.Src
    $dst = Join-Path $ProjectRoot $f.Dst
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  + $($f.Dst) ($($f.Desc))" -ForegroundColor Gray
    } else {
        Write-Host "  ! NOT FOUND: $($f.Src)" -ForegroundColor Yellow
    }
}

# ====================================================================
# STEP 5: Install frontend auth components
# ====================================================================
Write-Host ""
Write-Host "[5/8] Installing frontend login page..." -ForegroundColor Green

$clientFiles = @(
    @{ Src = "client\src\main.tsx"; Dst = "client\src\main.tsx" },
    @{ Src = "client\src\_core\hooks\useAuth.ts"; Dst = "client\src\_core\hooks\useAuth.ts" },
    @{ Src = "client\src\components\RequireAuth.tsx"; Dst = "client\src\components\RequireAuth.tsx" },
    @{ Src = "client\src\pages\LocalLogin.tsx"; Dst = "client\src\pages\LocalLogin.tsx" }
)

foreach ($f in $clientFiles) {
    $src = Join-Path $patchDir $f.Src
    $dst = Join-Path $ProjectRoot $f.Dst
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  + $($f.Dst)" -ForegroundColor Gray
    } else {
        Write-Host "  ! NOT FOUND: $($f.Src)" -ForegroundColor Yellow
    }
}

# ====================================================================
# STEP 6: Patch App.tsx - add /login route
# ====================================================================
Write-Host ""
Write-Host "[6/8] Patching routes (App.tsx + DashboardLayout.tsx)..." -ForegroundColor Green

$appTsx = Join-Path $ProjectRoot "client\src\App.tsx"
if (Test-Path $appTsx) {
    $appContent = Get-Content $appTsx -Raw -Encoding UTF8

    if ($appContent -notmatch "LocalLogin") {
        $importLine = 'import LocalLogin from "./pages/LocalLogin";'
        $appContent = $appContent -replace '(import LoginSuccess from "./pages/LoginSuccess";)', "`$1`n$importLine"
        Write-Host "  + Added LocalLogin import" -ForegroundColor Gray
    }

    if ($appContent -notmatch 'path=\{"/login"\}') {
        $routeLine = '<Route path={"/login"} component={LocalLogin} />'
        $appContent = $appContent -replace '(<Route path=\{"/login-success"\})', "$routeLine`n      `$1"
        Write-Host "  + Added /login route" -ForegroundColor Gray
    }

    [System.IO.File]::WriteAllText($appTsx, $appContent, [System.Text.UTF8Encoding]::new($false))
}

$dashLayout = Join-Path $ProjectRoot "client\src\components\DashboardLayout.tsx"
if (Test-Path $dashLayout) {
    $dashContent = Get-Content $dashLayout -Raw -Encoding UTF8
    if ($dashContent -match 'window\.location\.href = getLoginUrl\(\);' -and $dashContent -notmatch 'VITE_LOCAL_AUTH') {
        $newRedirect = 'window.location.href = import.meta.env.VITE_LOCAL_AUTH === "true" ? "/login" : getLoginUrl();'
        $dashContent = $dashContent -replace 'window\.location\.href = getLoginUrl\(\);', $newRedirect
        [System.IO.File]::WriteAllText($dashLayout, $dashContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  + DashboardLayout.tsx login redirect patched" -ForegroundColor Gray
    }
}

# ====================================================================
# STEP 7: Configure .env
# ====================================================================
Write-Host ""
Write-Host "[7/8] Configuring .env..." -ForegroundColor Green

$envFile = Join-Path $ProjectRoot ".env"
$envContent = ""
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw -Encoding UTF8
}

$additions = @()

if ($envContent -notmatch "DATABASE_URL=postgresql") {
    $envContent = $envContent -replace "DATABASE_URL=mysql://[^\r\n]*", ""
    $additions += "# PostgreSQL Database"
    $additions += "DATABASE_URL=postgresql://postgres:your_password@localhost:5432/grt_system"
    $additions += ""
}

if ($envContent -notmatch "LOCAL_AUTH=") {
    $additions += "# Local Authentication"
    $additions += "LOCAL_AUTH=true"
    $additions += "VITE_LOCAL_AUTH=true"
    $randomSuffix = Get-Random -Maximum 999999
    $additions += "JWT_SECRET=grt-standalone-secret-$randomSuffix"
    $additions += ""
}

if ($envContent -notmatch "AI_PROVIDER=") {
    $additions += "# AI Provider: openai | ollama | deepseek"
    $additions += "AI_PROVIDER=openai"
    $additions += "OPENAI_API_KEY=sk-your-openai-key-here"
    $additions += "OPENAI_BASE_URL=https://api.openai.com/v1"
    $additions += "OPENAI_MODEL=gpt-4o"
    $additions += ""
    $additions += "# Ollama (local AI - uncomment to use)"
    $additions += "# AI_PROVIDER=ollama"
    $additions += "# OLLAMA_BASE_URL=http://localhost:11434"
    $additions += "# OLLAMA_MODEL=llama3.1"
    $additions += ""
}

if ($envContent -notmatch "VITE_ANALYTICS_ENDPOINT=") {
    $additions += "# Analytics (leave empty to disable)"
    $additions += "VITE_ANALYTICS_ENDPOINT="
    $additions += "VITE_ANALYTICS_WEBSITE_ID="
    $additions += "VITE_APP_ID="
    $additions += ""
}

if ($additions.Count -gt 0) {
    $newContent = $envContent.TrimEnd() + "`n`n" + ($additions -join "`n") + "`n"
    [System.IO.File]::WriteAllText($envFile, $newContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  + .env updated" -ForegroundColor Gray
}

# ====================================================================
# STEP 8: Clean old migration files
# ====================================================================
Write-Host ""
Write-Host "[8/8] Cleaning old migration files..." -ForegroundColor Green

$metaDir = Join-Path $ProjectRoot "drizzle\meta"
if (Test-Path $metaDir) {
    Remove-Item $metaDir -Recurse -Force 2>$null
    Write-Host "  + Cleaned drizzle/meta" -ForegroundColor Gray
}

Get-ChildItem -Path (Join-Path $ProjectRoot "drizzle") -Filter "*.sql" -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "  + Cleaned old .sql files" -ForegroundColor Gray

# ====================================================================
# DONE
# ====================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Install PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host ""
Write-Host '2. Create database:  psql -U postgres -c "CREATE DATABASE grt_system;"' -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Edit .env - set DB password and AI key:" -ForegroundColor White
Write-Host "   DATABASE_URL=postgresql://postgres:YOUR_PWD@localhost:5432/grt_system" -ForegroundColor Yellow
Write-Host "   OPENAI_API_KEY=your-key  (or configure Ollama)" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Push schema:  pnpm drizzle-kit push" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Start server:  pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Open http://localhost:3000 (first user = admin)" -ForegroundColor White
Write-Host ""
Write-Host "--- AI ---" -ForegroundColor Cyan
Write-Host "OpenAI:   AI_PROVIDER=openai + OPENAI_API_KEY" -ForegroundColor White
Write-Host "Ollama:   AI_PROVIDER=ollama  (https://ollama.ai -> ollama pull llama3.1)" -ForegroundColor White
Write-Host "DeepSeek: AI_PROVIDER=deepseek + DEEPSEEK_API_KEY" -ForegroundColor White
Write-Host ""

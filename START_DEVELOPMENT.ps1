# ============================================================================
# GRT System - Start Development Environment
# ============================================================================
# This script starts the complete development environment for GRT system
# Usage: .\START_DEVELOPMENT.ps1

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  GRT System - Development Environment Startup                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get project directory
$projectDir = Get-Location
Write-Host "Project Directory: $projectDir" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Check Node.js
$nodeVersion = node --version
Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green

# Check pnpm
$pnpmVersion = pnpm --version
Write-Host "[OK] pnpm: $pnpmVersion" -ForegroundColor Green

# Check MySQL
try {
    $mysqlVersion = mysql --version
    Write-Host "[OK] MySQL: $mysqlVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARN] MySQL not found in PATH" -ForegroundColor Yellow
}

# Check Git
$gitVersion = git --version
Write-Host "[OK] Git: $gitVersion" -ForegroundColor Green

Write-Host ""

# Step 2: Install dependencies
Write-Host "Step 2: Installing Dependencies..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
pnpm install
Write-Host "[OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Verify .env file
Write-Host "Step 3: Verifying Environment Configuration..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if (Test-Path ".env") {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
    
    # Check critical env vars
    $envContent = Get-Content ".env"
    if ($envContent -match "DATABASE_URL") {
        Write-Host "[OK] DATABASE_URL is set" -ForegroundColor Green
    } else {
        Write-Host "[WARN] DATABASE_URL is not set" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] .env file not found" -ForegroundColor Yellow
    Write-Host "       Creating .env from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] .env created from template" -ForegroundColor Green
        Write-Host "       Please edit .env with your configuration" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 4: Check database
Write-Host "Step 4: Checking Database Connection..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $dbCheck = mysql -u root -p -e "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] MySQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "[WARN] MySQL connection failed" -ForegroundColor Yellow
        Write-Host "       Make sure MySQL is running and credentials are correct" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] MySQL connection check failed" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Run migrations
Write-Host "Step 5: Running Database Migrations..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

pnpm db:push
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migrations completed" -ForegroundColor Green
} else {
    Write-Host "[WARN] Migration check failed" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Start development server
Write-Host "Step 6: Starting Development Server..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Development Server Starting...                               ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  Access the application at:                                   ║" -ForegroundColor Green
Write-Host "║  http://localhost:3000                                        ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║  Press Ctrl+C to stop the server                              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Start development server
pnpm dev

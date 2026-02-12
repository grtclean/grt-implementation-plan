# ============================================================================
# GRT System - Quick Environment Check Script
# Simple diagnostic that outputs directly to console
# ============================================================================

Write-Host ""
Write-Host "======================================================================"
Write-Host "GRT System - Quick Environment Check"
Write-Host "======================================================================"
Write-Host ""

# ============================================================================
# 1. System Information
# ============================================================================
Write-Host "1. SYSTEM INFORMATION" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

$osInfo = Get-CimInstance Win32_OperatingSystem
Write-Host "OS: $($osInfo.Caption)"
Write-Host "Version: $($osInfo.Version)"
Write-Host "Build: $($osInfo.BuildNumber)"

$processor = Get-CimInstance Win32_Processor
Write-Host "CPU: $($processor.Name)"
Write-Host "Cores: $($processor.NumberOfCores)"

$memory = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
$totalMemoryGB = [math]::Round($memory.Sum / 1GB, 2)
Write-Host "RAM: $totalMemoryGB GB"

$disk = Get-Volume | Where-Object { $_.DriveLetter -eq 'C' }
$freeSpaceGB = [math]::Round($disk.SizeRemaining / 1GB, 2)
Write-Host "Disk C: $freeSpaceGB GB free"

Write-Host ""

# ============================================================================
# 2. Runtime Environments
# ============================================================================
Write-Host "2. RUNTIME ENVIRONMENTS" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

# Node.js
Write-Host -NoNewline "Node.js: "
try {
    $nodeVersion = node --version 2>$null
    Write-Host "$nodeVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# npm
Write-Host -NoNewline "npm: "
try {
    $npmVersion = npm --version 2>$null
    Write-Host "$npmVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# pnpm
Write-Host -NoNewline "pnpm: "
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "$pnpmVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# Python
Write-Host -NoNewline "Python: "
try {
    $pythonVersion = python --version 2>$null
    Write-Host "$pythonVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# Java
Write-Host -NoNewline "Java: "
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "$javaVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [WARN]" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. Development Tools
# ============================================================================
Write-Host "3. DEVELOPMENT TOOLS" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

# Git
Write-Host -NoNewline "Git: "
try {
    $gitVersion = git --version 2>$null
    Write-Host "$gitVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# Docker
Write-Host -NoNewline "Docker: "
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "$dockerVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [WARN]" -ForegroundColor Yellow
}

# VS Code
Write-Host -NoNewline "VS Code: "
try {
    $codeVersion = code --version 2>$null | Select-Object -First 1
    Write-Host "$codeVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [WARN]" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 4. Databases
# ============================================================================
Write-Host "4. DATABASES" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

# MySQL
Write-Host -NoNewline "MySQL: "
try {
    $mysqlVersion = mysql --version 2>$null
    Write-Host "$mysqlVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [FAIL]" -ForegroundColor Red
}

# PostgreSQL
Write-Host -NoNewline "PostgreSQL: "
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "$psqlVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [WARN]" -ForegroundColor Yellow
}

# MongoDB
Write-Host -NoNewline "MongoDB: "
try {
    $mongoVersion = mongod --version 2>$null | Select-Object -First 1
    Write-Host "$mongoVersion [OK]" -ForegroundColor Green
} catch {
    Write-Host "NOT FOUND [WARN]" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 5. Web Development Stack
# ============================================================================
Write-Host "5. WEB DEVELOPMENT STACK (npm packages)" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

$packages = @("typescript", "vite", "react", "tailwindcss", "drizzle-orm")

foreach ($pkg in $packages) {
    Write-Host -NoNewline "$pkg: "
    try {
        $result = npm list -g $pkg 2>&1 | Select-String "^$pkg@"
        if ($result) {
            Write-Host "installed [OK]" -ForegroundColor Green
        } else {
            Write-Host "not installed [WARN]" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "not installed [WARN]" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 6. Python AI/ML Libraries
# ============================================================================
Write-Host "6. PYTHON AI/ML LIBRARIES" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

$pythonLibs = @("tensorflow", "torch", "pandas", "numpy", "openai", "langchain")

foreach ($lib in $pythonLibs) {
    Write-Host -NoNewline "$lib: "
    try {
        $result = python -m pip show $lib 2>&1 | Select-String "Name:"
        if ($result) {
            Write-Host "installed [OK]" -ForegroundColor Green
        } else {
            Write-Host "not installed [WARN]" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "not installed [WARN]" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 7. Environment Variables
# ============================================================================
Write-Host "7. ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

$envVars = @("NODE_ENV", "DATABASE_URL", "OPENAI_API_KEY", "GEMINI_API_KEY")

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    Write-Host -NoNewline "$var: "
    if ($value) {
        if ($var -like "*KEY*") {
            $masked = $value.Substring(0, [Math]::Min(8, $value.Length)) + "****"
            Write-Host "$masked [SET]" -ForegroundColor Green
        } else {
            Write-Host "set [OK]" -ForegroundColor Green
        }
    } else {
        Write-Host "not set [WARN]" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 8. Network Ports
# ============================================================================
Write-Host "8. NETWORK PORTS" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

$ports = @(3000, 3306, 5432, 27017, 8080)

foreach ($port in $ports) {
    Write-Host -NoNewline "Port $port: "
    $connection = Test-NetConnection -ComputerName localhost -Port $port -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "in use [OK]" -ForegroundColor Green
    } else {
        Write-Host "available [WARN]" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 9. Summary
# ============================================================================
Write-Host "======================================================================"
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================================"
Write-Host ""
Write-Host "Environment check completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""
Write-Host "Legend:"
Write-Host "  [OK]   - Component is installed and working"
Write-Host "  [WARN] - Component is optional or not installed"
Write-Host "  [FAIL] - Critical component is missing"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "  1. Install any missing [FAIL] components"
Write-Host "  2. Install recommended [WARN] components"
Write-Host "  3. Configure environment variables"
Write-Host "  4. Test database connections"
Write-Host ""

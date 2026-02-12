# ============================================================================
# GRT System - Windows 11 Environment Deep Check Script
# Comprehensive diagnostic for development prerequisites
# ============================================================================

param(
    [switch]$Detailed = $false,
    [switch]$ExportReport = $false
)

# ============================================================================
# Initialize Report
# ============================================================================
$reportPath = ".\GRT_Environment_Report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$report = @()

function Write-Report {
    param([string]$message, [string]$color = "White")
    Write-Host $message -ForegroundColor $color
    $report += $message
}

function Section {
    param([string]$title)
    Write-Report ""
    Write-Report "======================================================================" -Color Cyan
    Write-Report "| $title" -Color Cyan
    Write-Report "======================================================================" -Color Cyan
    Write-Report ""
}

# ============================================================================
# Phase 1: System Information
# ============================================================================
Section "PHASE 1: SYSTEM INFORMATION"

$osInfo = Get-CimInstance Win32_OperatingSystem
Write-Report "OS Name: $($osInfo.Caption)"
Write-Report "OS Version: $($osInfo.Version)"
Write-Report "OS Build: $($osInfo.BuildNumber)"
Write-Report "System Manufacturer: $(Get-CimInstance Win32_ComputerSystem | Select-Object -ExpandProperty Manufacturer)"
Write-Report "System Model: $(Get-CimInstance Win32_ComputerSystem | Select-Object -ExpandProperty Model)"

$processor = Get-CimInstance Win32_Processor
Write-Report "Processor: $($processor.Name)"
Write-Report "Cores: $($processor.NumberOfCores)"
Write-Report "Logical Processors: $($processor.NumberOfLogicalProcessors)"

$memory = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
$totalMemoryGB = [math]::Round($memory.Sum / 1GB, 2)
Write-Report "Total Memory: $totalMemoryGB GB"

$disk = Get-Volume | Where-Object { $_.DriveLetter -eq 'C' }
$freeSpaceGB = [math]::Round($disk.SizeRemaining / 1GB, 2)
$totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
Write-Report "Disk C: Free Space $freeSpaceGB GB / Total $totalSpaceGB GB"

# ============================================================================
# Phase 2: Runtime Environments
# ============================================================================
Section "PHASE 2: RUNTIME ENVIRONMENTS"

# Node.js
Write-Report "Checking Node.js..." -Color Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    $nodePath = (Get-Command node).Source
    Write-Report "[OK] Node.js: $nodeVersion" -Color Green
    Write-Report "     Path: $nodePath"
    Write-Report "[OK] npm: $npmVersion" -Color Green
} catch {
    Write-Report "[FAIL] Node.js not found" -Color Red
}

# pnpm
Write-Report ""
Write-Report "Checking pnpm..." -Color Yellow
try {
    $pnpmVersion = pnpm --version
    $pnpmPath = (Get-Command pnpm).Source
    Write-Report "[OK] pnpm: $pnpmVersion" -Color Green
    Write-Report "     Path: $pnpmPath"
} catch {
    Write-Report "[FAIL] pnpm not found" -Color Red
}

# Python
Write-Report ""
Write-Report "Checking Python..." -Color Yellow
try {
    $pythonVersion = python --version 2>&1
    $pythonPath = (Get-Command python).Source
    Write-Report "[OK] Python: $pythonVersion" -Color Green
    Write-Report "     Path: $pythonPath"
} catch {
    Write-Report "[FAIL] Python not found" -Color Red
}

# Java
Write-Report ""
Write-Report "Checking Java..." -Color Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    $javaPath = (Get-Command java).Source
    Write-Report "[OK] Java: $javaVersion" -Color Green
    Write-Report "     Path: $javaPath"
} catch {
    Write-Report "[FAIL] Java not found" -Color Red
}

# ============================================================================
# Phase 3: Development Tools
# ============================================================================
Section "PHASE 3: DEVELOPMENT TOOLS"

# Git
Write-Report "Checking Git..." -Color Yellow
try {
    $gitVersion = git --version
    $gitPath = (Get-Command git).Source
    Write-Report "[OK] Git: $gitVersion" -Color Green
    Write-Report "     Path: $gitPath"
} catch {
    Write-Report "[FAIL] Git not found" -Color Red
}

# Docker
Write-Report ""
Write-Report "Checking Docker..." -Color Yellow
try {
    $dockerVersion = docker --version
    Write-Report "[OK] Docker: $dockerVersion" -Color Green
} catch {
    Write-Report "[WARN] Docker not found (optional)" -Color Yellow
}

# VS Code
Write-Report ""
Write-Report "Checking Visual Studio Code..." -Color Yellow
try {
    $codeVersion = code --version 2>&1 | Select-Object -First 1
    $codePath = (Get-Command code).Source
    Write-Report "[OK] VS Code: $codeVersion" -Color Green
    Write-Report "     Path: $codePath"
} catch {
    Write-Report "[WARN] VS Code not found (optional)" -Color Yellow
}

# ============================================================================
# Phase 4: Databases
# ============================================================================
Section "PHASE 4: DATABASE SYSTEMS"

# MySQL
Write-Report "Checking MySQL..." -Color Yellow
try {
    $mysqlVersion = mysql --version 2>&1
    Write-Report "[OK] MySQL: $mysqlVersion" -Color Green
    
    # Check if MySQL service is running
    $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    if ($mysqlService) {
        Write-Report "     Service Status: $($mysqlService.Status)" -Color Green
    }
} catch {
    Write-Report "[FAIL] MySQL not found" -Color Red
}

# PostgreSQL
Write-Report ""
Write-Report "Checking PostgreSQL..." -Color Yellow
try {
    $psqlVersion = psql --version 2>&1
    Write-Report "[OK] PostgreSQL: $psqlVersion" -Color Green
} catch {
    Write-Report "[WARN] PostgreSQL not found (optional)" -Color Yellow
}

# MongoDB
Write-Report ""
Write-Report "Checking MongoDB..." -Color Yellow
try {
    $mongoVersion = mongod --version 2>&1 | Select-Object -First 1
    Write-Report "[OK] MongoDB: $mongoVersion" -Color Green
} catch {
    Write-Report "[WARN] MongoDB not found (optional)" -Color Yellow
}

# ============================================================================
# Phase 5: Web Development Stack
# ============================================================================
Section "PHASE 5: WEB DEVELOPMENT STACK"

Write-Report "Checking npm packages..." -Color Yellow
$packages = @("typescript", "vite", "react", "tailwindcss", "@trpc/server", "drizzle-orm")

foreach ($pkg in $packages) {
    try {
        $pkgVersion = npm list -g $pkg 2>&1 | Select-String "^$pkg@" | ForEach-Object { $_ -replace ".*@", "" }
        if ($pkgVersion) {
            Write-Report "[OK] ${pkg}: $pkgVersion" -Color Green
        } else {
            Write-Report "[WARN] ${pkg}: not installed globally (may be local)" -Color Yellow
        }
    } catch {
        Write-Report "[WARN] ${pkg}: not installed globally (may be local)" -Color Yellow
    }
}

# ============================================================================
# Phase 6: AI/ML Development Modules
# ============================================================================
Section "PHASE 6: AI/ML DEVELOPMENT MODULES"

# Python AI Libraries
Write-Report "Checking Python AI/ML libraries..." -Color Yellow
$pythonLibs = @("tensorflow", "torch", "scikit-learn", "pandas", "numpy", "openai", "langchain")

foreach ($lib in $pythonLibs) {
    try {
        $result = python -m pip show $lib 2>&1 | Select-String "Name:"
        if ($result) {
            Write-Report "[OK] ${lib}: installed" -Color Green
        } else {
            Write-Report "[WARN] ${lib}: not installed" -Color Yellow
        }
    } catch {
        Write-Report "[WARN] ${lib}: not installed" -Color Yellow
    }
}

# ============================================================================
# Phase 7: Environment Variables
# ============================================================================
Section "PHASE 7: ENVIRONMENT VARIABLES"

Write-Report "Checking critical environment variables..." -Color Yellow

$envVars = @(
    "NODE_ENV",
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "PATH"
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        if ($var -like "*KEY*" -or $var -like "*PASSWORD*") {
            $maskedValue = $value.Substring(0, [Math]::Min(10, $value.Length)) + "****"
            Write-Report "[OK] ${var}: $maskedValue" -Color Green
        } else {
            Write-Report "[OK] ${var}: set" -Color Green
        }
    } else {
        Write-Report "[WARN] ${var}: not set" -Color Yellow
    }
}

# ============================================================================
# Phase 8: Network and Connectivity
# ============================================================================
Section "PHASE 8: NETWORK AND CONNECTIVITY"

Write-Report "Checking network connectivity..." -Color Yellow

# Check internet connectivity
try {
    $testConnection = Test-Connection -ComputerName 8.8.8.8 -Count 1 -ErrorAction SilentlyContinue
    if ($testConnection) {
        Write-Report "[OK] Internet connectivity: OK" -Color Green
    } else {
        Write-Report "[WARN] Internet connectivity: may be limited" -Color Yellow
    }
} catch {
    Write-Report "[WARN] Internet connectivity: unable to verify" -Color Yellow
}

# Check common ports
Write-Report ""
Write-Report "Checking common development ports..." -Color Yellow
$ports = @(3000, 5432, 3306, 27017, 8080, 8000)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Report "[OK] Port ${port}: in use" -Color Green
    } else {
        Write-Report "[WARN] Port ${port}: available" -Color Yellow
    }
}

# ============================================================================
# Phase 9: Recommendations
# ============================================================================
Section "PHASE 9: RECOMMENDATIONS FOR AI/ML DEVELOPMENT"

Write-Report "Recommended AI/ML Development Modules:" -Color Cyan
Write-Report ""
Write-Report "1. LLM Integration:" -Color Yellow
Write-Report "   - OpenAI API (GPT-4, GPT-3.5-turbo)"
Write-Report "   - Google Gemini API"
Write-Report "   - LangChain for LLM orchestration"
Write-Report "   - LlamaIndex for RAG (Retrieval-Augmented Generation)"
Write-Report ""

Write-Report "2. Vector Databases:" -Color Yellow
Write-Report "   - Pinecone (cloud-based)"
Write-Report "   - Weaviate (open-source)"
Write-Report "   - Milvus (open-source)"
Write-Report "   - Qdrant (open-source)"
Write-Report ""

Write-Report "3. Machine Learning Frameworks:" -Color Yellow
Write-Report "   - TensorFlow (deep learning)"
Write-Report "   - PyTorch (deep learning)"
Write-Report "   - Scikit-learn (traditional ML)"
Write-Report "   - XGBoost (gradient boosting)"
Write-Report ""

Write-Report "4. Data Processing:" -Color Yellow
Write-Report "   - Pandas (data manipulation)"
Write-Report "   - NumPy (numerical computing)"
Write-Report "   - Polars (high-performance data frames)"
Write-Report ""

Write-Report "5. Computer Vision:" -Color Yellow
Write-Report "   - OpenCV (image processing)"
Write-Report "   - YOLOv8 (object detection)"
Write-Report "   - MediaPipe (pose/hand detection)"
Write-Report ""

Write-Report "6. Natural Language Processing:" -Color Yellow
Write-Report "   - Hugging Face Transformers"
Write-Report "   - spaCy (NLP pipeline)"
Write-Report "   - NLTK (NLP toolkit)"
Write-Report ""

Write-Report "7. Monitoring and Logging:" -Color Yellow
Write-Report "   - Weights & Biases (ML experiment tracking)"
Write-Report "   - MLflow (ML lifecycle management)"
Write-Report "   - TensorBoard (training visualization)"
Write-Report ""

Write-Report "8. Development Environment:" -Color Yellow
Write-Report "   - Jupyter Notebook (interactive development)"
Write-Report "   - Conda (Python environment management)"
Write-Report "   - Docker (containerization)"
Write-Report ""

# ============================================================================
# Summary
# ============================================================================
Section "SUMMARY"

Write-Report "Environment check completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Color Green
Write-Report ""
Write-Report "For detailed information, refer to the generated report." -Color Cyan

# ============================================================================
# Export Report
# ============================================================================
if ($ExportReport) {
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Report ""
    Write-Report "Report saved to: $reportPath" -Color Green
}

Write-Report ""

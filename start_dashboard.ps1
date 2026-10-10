# ==============================================================================
# GenOS: TopoSafe-RAG Dashboard Launcher
# Runs data builder, starts local HTTP server, and opens browser automatically.
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting GenOS: TopoSafe-RAG Monochromatic Telemetry Dashboard  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Resolve Root Directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 2. Locate Working Python Interpreter
$PythonPath = $null

if (Test-Path "$ScriptDir\venv\Scripts\python.exe") {
    $PythonPath = "$ScriptDir\venv\Scripts\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe") {
    $PythonPath = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe") {
    $PythonPath = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
} else {
    $Cmd = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($Cmd) {
        $PythonPath = $Cmd.Source
    }
}

if (-not $PythonPath) {
    Write-Host "[!] Error: No suitable Python executable found on this system." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[+] Using Python: $PythonPath" -ForegroundColor Green

# 3. Build/Refresh JSON Data Artifacts
Write-Host "[*] Refreshing dashboard data JSONs from CSVs & documentation..." -ForegroundColor Yellow
try {
    & $PythonPath "$ScriptDir\Frontend\build_data.py"
    Write-Host "[+] Data build completed successfully." -ForegroundColor Green
} catch {
    Write-Host "[!] Note: Using existing data artifacts in Frontend/data/" -ForegroundColor Yellow
}

# 4. Open Default Web Browser
$Port = 8000
$Url = "http://localhost:$Port"
Write-Host "[*] Launching browser at: $Url" -ForegroundColor Cyan
Start-Process $Url

# 5. Start HTTP Server
Write-Host "[*] Starting local HTTP server on port $Port..." -ForegroundColor Green
Write-Host "    Press Ctrl+C in this window to stop the dashboard server." -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan

& $PythonPath -m http.server $Port --directory "$ScriptDir\Frontend"

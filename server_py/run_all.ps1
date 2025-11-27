<#
run_all.ps1

Creates venv (if missing), installs requirements, and starts all services:
- Frontend (Vite dev server on port 3000)
- Backend FastAPI server (port 3001)
- Transcription worker
- IMAP ingest (and Gmail ingest if creds present)

All services run in the current terminal window (no additional windows).

Usage: from project folder `server_py` run:
  .\run_all.ps1

Press Ctrl+C to stop all services.

#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "=== CallSenseCX Startup ===" -ForegroundColor Cyan
Write-Host "Working directory: $root"

# Setup Python backend
if (-not (Test-Path ".venv")) {
    Write-Host "`n[1/5] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

Write-Host "`n[2/5] Installing Python dependencies..." -ForegroundColor Yellow
. .\.venv\Scripts\Activate.ps1
pip install -q -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Created .env file. Edit it to add your API keys." -ForegroundColor Green
}

# Setup Frontend
$frontendPath = Join-Path (Split-Path -Parent $root) "front-end"
Write-Host "`n[3/5] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontendPath
if (-not (Test-Path "node_modules")) {
    npm install --silent
} else {
    Write-Host "Frontend dependencies already installed."
}
Pop-Location

# Start all services in background jobs
Write-Host "`n[4/5] Starting services..." -ForegroundColor Yellow

$jobs = @()

# Frontend
Write-Host "  - Starting Frontend (port 3000)..." -ForegroundColor Gray
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:frontendPath
    npm run dev
}
$jobs += $frontendJob

# Backend API
Write-Host "  - Starting Backend API (port 3001)..." -ForegroundColor Gray
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:root
    & "$using:root\.venv\Scripts\Activate.ps1"
    uvicorn app:app --reload --port 3001
}
$jobs += $backendJob

# Worker
Write-Host "  - Starting Transcription Worker..." -ForegroundColor Gray
$workerJob = Start-Job -ScriptBlock {
    Set-Location $using:root
    & "$using:root\.venv\Scripts\Activate.ps1"
    $env:PYTHONPATH = $using:root
    python worker/transcribe.py 2>&1
}
$jobs += $workerJob

# IMAP Ingest (optional - skip if not configured)
Write-Host "  - Starting IMAP Ingest (optional)..." -ForegroundColor Gray
$imapJob = Start-Job -ScriptBlock {
    Set-Location $using:root
    & "$using:root\.venv\Scripts\Activate.ps1"
    $env:PYTHONPATH = $using:root
    python ingest/imap_ingest.py 2>&1
}
$jobs += $imapJob

# Gmail ingest (conditional)
$envFile = Join-Path $root ".env"
$startGmail = $false
if (Test-Path $envFile) {
    $lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($l in $lines) {
        if ($l -match '^GMAIL_CLIENT_ID\s*=\s*(.+)') {
            $val = $Matches[1].Trim()
            if ($val) { $startGmail = $true }
        }
    }
}

if ($startGmail) {
    Write-Host "  - Starting Gmail Ingest..." -ForegroundColor Gray
    $gmailJob = Start-Job -ScriptBlock {
        Set-Location $using:root
        & "$using:root\.venv\Scripts\Activate.ps1"
        $env:PYTHONPATH = $using:root
        python ingest/gmail_ingest.py
    }
    $jobs += $gmailJob
}

Write-Host "`n[5/5] All services started!" -ForegroundColor Green
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:   http://localhost:3001" -ForegroundColor Green
Write-Host "  API Docs:  http://localhost:3001/docs" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all services...`n" -ForegroundColor Yellow

# Give services a moment to start
Start-Sleep -Seconds 2

# Monitor and display output
try {
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
            if ($output) {
                Write-Host $output
            }
        }
        Start-Sleep -Milliseconds 500
        
        # Check if critical jobs (frontend/backend) failed
        $criticalJobs = @($frontendJob, $backendJob)
        $failed = $criticalJobs | Where-Object { $_.State -eq 'Failed' }
        if ($failed) {
            Write-Host "`nError: Critical service failed. Check logs above." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "`n`nStopping all services..." -ForegroundColor Yellow
    $jobs | Stop-Job -ErrorAction SilentlyContinue
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}
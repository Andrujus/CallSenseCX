<#
run_all.ps1

Creates venv (if missing), installs requirements, copies .env.example -> .env (if absent),
and opens separate PowerShell windows for:
- FastAPI server (uvicorn)
- transcription worker
- IMAP ingest (and Gmail ingest if creds present)

Usage: from project folder `server_py` run:
  .\run_all.ps1

#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Working directory: $root"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtualenv .venv..."
    python -m venv .venv
}

Write-Host "Activating virtualenv and installing dependencies (may take a while)..."
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Copied .env.example -> .env. Please edit .env to add secrets before starting ingest services if needed."
}

function Start-Window($name, $command) {
    Write-Host "Starting $name..."
    $escapedRoot = $root -replace "'","''"
    $inner = "cd '$escapedRoot'; .\.venv\Scripts\Activate.ps1; $command"
    $arg = "-NoExit -Command `"$inner`""
    Start-Process -FilePath "powershell" -ArgumentList $arg -WindowStyle Normal
}

# Start FastAPI server
Start-Window "FastAPI Server" "uvicorn app:app --reload --port 3001"

# Start worker
Start-Window "Transcription Worker" "python worker/transcribe.py"

# Start IMAP ingest
Start-Window "IMAP Ingest" '$env:PYTHONPATH = (Get-Location).Path; python ingest/imap_ingest.py'

# Start Gmail ingest only if GMAIL_CLIENT_ID is set in .env
$envFile = Join-Path $root ".env"
$startGmail = $false
if (Test-Path $envFile) {
    $lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($l in $lines) {
        if ($l -match '^GMAIL_CLIENT_ID\s*=\s*(\S+)') {
            $val = $Matches[1]
            if ($val) { $startGmail = $true }
        }
    }
}

if ($startGmail) {
    Start-Window "Gmail Ingest" '$env:PYTHONPATH = (Get-Location).Path; python ingest/gmail_ingest.py'
} else {
    Write-Host "GMAIL_CLIENT_ID not set in .env — Gmail ingest will not be started."
}

Write-Host "All windows started. Check the terminal windows for logs."
<#
run_all.ps1

Creates venv (if missing), installs requirements, copies .env.example -> .env (if absent),
and opens separate PowerShell windows for:

Usage: from project folder `server_py` run:
  .\run_all.ps1

#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Working directory: $root"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtualenv .venv..."
    python -m venv .venv
}

Write-Host "Activating virtualenv and installing dependencies (may take a while)..."
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Copied .env.example -> .env. Please edit .env to add secrets before starting ingest services if needed."
}

function Start-Window($name, $command) {
    Write-Host "Starting $name..."
    $escapedRoot = $root -replace "'","''"
    $inner = "cd '$escapedRoot'; .\\.venv\\Scripts\\Activate.ps1; $command"
    $arg = "-NoExit -Command \"$inner\""
    Start-Process -FilePath "powershell" -ArgumentList $arg -WindowStyle Normal
}

# Start FastAPI server
Start-Window 'FastAPI Server' 'uvicorn app:app --reload --port 3001'

# Start worker
Start-Window 'Transcription Worker' 'python worker/transcribe.py'

# Start IMAP ingest
Start-Window 'IMAP Ingest' '$env:PYTHONPATH = (Get-Location).Path; python ingest/imap_ingest.py'

# Start Gmail ingest only if GMAIL_CLIENT_ID is set in .env
$envFile = Join-Path $root '.env'
$startGmail = $false
if (Test-Path $envFile) {
    $lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($l in $lines) {
        if ($l -match '^GMAIL_CLIENT_ID\s*=\s*(\S+)') {
            $val = $Matches[1]
            if ($val) { $startGmail = $true }
        }
    }
}

if ($startGmail) {
    Start-Window 'Gmail Ingest' '$env:PYTHONPATH = (Get-Location).Path; python ingest/gmail_ingest.py'
} else {
    Write-Host 'GMAIL_CLIENT_ID not set in .env — Gmail ingest will not be started.'
}

Write-Host 'All windows started. Check the terminal windows for logs.'
<#
run_all.ps1

Creates venv (if missing), installs requirements, copies .env.example -> .env (if absent),
and opens separate PowerShell windows for:
- FastAPI server (uvicorn)
- transcription worker
- IMAP ingest (and Gmail ingest if creds present)

Usage: from project folder `server_py` run:
  .\run_all.ps1

#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Working directory: $root"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtualenv .venv..."
    python -m venv .venv
}

Write-Host "Activating virtualenv and installing dependencies (may take a while)..."
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Copied .env.example -> .env. Please edit .env to add secrets before starting ingest services if needed."
}

function Start-Window($name, $command) {
    Write-Host "Starting $name..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","cd '$root'; .\\.venv\\Scripts\\Activate.ps1; $command" -WindowStyle Normal
}

# Start FastAPI server
Start-Window "FastAPI Server" "uvicorn app:app --reload --port 3001"

# Start worker
Start-Window "Transcription Worker" "python worker/transcribe.py"

# Start IMAP ingest
Start-Window "IMAP Ingest" "$env:PYTHONPATH = (Get-Location).Path; python ingest/imap_ingest.py"

# Start Gmail ingest only if GMAIL_CLIENT_ID is set in .env
$envFile = Join-Path $root ".env"
$startGmail = $false
if (Test-Path $envFile) {
    $lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($l in $lines) {
        if ($l -match '^GMAIL_CLIENT_ID\s*=\s*(\S+)') {
            $val = $Matches[1]
            if ($val) { $startGmail = $true }
        }
    }
}

if ($startGmail) {
    Start-Window "Gmail Ingest" "$env:PYTHONPATH = (Get-Location).Path; python ingest/gmail_ingest.py"
} else {
    Write-Host "GMAIL_CLIENT_ID not set in .env — Gmail ingest will not be started."
}

Write-Host "All windows started. Check the terminal windows for logs."
<#
run_all.ps1

Creates venv (if missing), installs requirements, copies .env.example -> .env (if absent),
and opens separate PowerShell windows for:
- FastAPI server (uvicorn)
- transcription worker
- IMAP ingest (and Gmail ingest if creds present)

Usage: from project folder `server_py` run:
  .\run_all.ps1

#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Working directory: $root"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtualenv .venv..."
    python -m venv .venv
}

Write-Host "Activating virtualenv and installing dependencies (may take a while)..."
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Copied .env.example -> .env. Please edit .env to add secrets before starting ingest services if needed."
}

function Start-Window($name, $command) {
    Write-Host "Starting $name..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","cd '$root'; .\\.venv\\Scripts\\Activate.ps1; $command" -WindowStyle Normal
}

# Start FastAPI server
Start-Window "FastAPI Server" "uvicorn app:app --reload --port 3001"

# Start worker
Start-Window "Transcription Worker" "python worker/transcribe.py"

# Start IMAP ingest
Start-Window "IMAP Ingest" "$env:PYTHONPATH = (Get-Location).Path; python ingest/imap_ingest.py"

# Start Gmail ingest only if GMAIL_CLIENT_ID is set in .env
$envFile = Join-Path $root ".env"
$startGmail = $false
if (Test-Path $envFile) {
    $lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
    foreach ($l in $lines) {
        if ($l -match '^GMAIL_CLIENT_ID\s*=\s*(\S+)') {
            $val = $Matches[1]
            if ($val) { $startGmail = $true }
        }
    }
}

if ($startGmail) {
    Start-Window "Gmail Ingest" "$env:PYTHONPATH = (Get-Location).Path; python ingest/gmail_ingest.py"
} else {
    Write-Host "GMAIL_CLIENT_ID not set in .env — Gmail ingest will not be started."
}

Write-Host "All windows started. Check the terminal windows for logs."

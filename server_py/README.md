# CallsenseCX Python PoC

This folder contains a minimal FastAPI PoC for receiving Twilio recording callbacks, storing recordings (local or S3), and a simple worker that creates transcripts/summaries (placeholder).

Quickstart

1. Create a virtualenv and install dependencies

```powershell
cd server_py
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and edit values as needed.

3. Start the server

```powershell
uvicorn app:app --reload --port 3001
```

4. In another terminal, start the worker

```powershell
python worker/transcribe.py
```

Convenience script
------------------

Run `run_all.ps1` to create the virtualenv (if missing), install dependencies, copy `.env.example` to `.env` (if absent), and open separate PowerShell windows for:
- FastAPI server
- Transcription worker
- IMAP ingestion (and Gmail ingestion if `GMAIL_CLIENT_ID` is set in `.env`)

Usage (PowerShell):

```powershell
cd server_py
.\run_all.ps1
```

The script will leave the windows open so you can inspect logs; press Ctrl+C in any window to stop that process.

Notes
- Validate Twilio webhook signatures for production.
- Replace the placeholder transcription in `worker/transcribe.py` with real ASR (Whisper, OpenAI/Google/Azure STT).
- Use S3 by setting `USE_S3=1` and `RECORDINGS_BUCKET`.

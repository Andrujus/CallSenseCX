# CallsenseCX Backend Server

This folder contains the Python FastAPI backend for CallSenseCX, handling Twilio recording callbacks, storing recordings, transcription processing, and AI-powered call analysis.

---

## 🚀 Quick Start Guide

### Prerequisites

- **Python 3.8+** installed on your system
- **PowerShell** (Windows) or terminal access
- **Gemini API Key** (get it from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Option 1: Automated Setup (Recommended)

The easiest way to launch the backend is using the automated script.

**Open PowerShell and run:**

```powershell
# Navigate to the server_py directory
cd C:\Users\Pijus\Documents\GitHub\CallSenseCX\server_py

# Run the script
.\run_all.ps1
```

**Important:** You MUST be inside the `server_py` folder when running the script.

**What this script does:**
1. Creates a Python virtual environment (`.venv`) if it doesn't exist
2. Installs all required dependencies from `requirements.txt`
3. Copies `.env.example` to `.env` (if not present)
4. Opens **separate PowerShell windows** for:
   - **FastAPI server** (port 3001)
   - **Transcription worker** (processes call recordings)
   - **IMAP ingest** (monitors email for recordings)
   - **Gmail ingest** (if GMAIL_CLIENT_ID is configured)

Each service runs in its own window so you can monitor logs independently. Press `Ctrl+C` in any window to stop that service.

---

### Option 2: Manual Setup

If you prefer to start services manually or need more control:

#### Step 1: Create Virtual Environment

```powershell
cd server_py
python -m venv .venv
```

#### Step 2: Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
.venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

#### Step 3: Install Dependencies

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 4: Configure Environment Variables

Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

Then edit `.env` and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
# Add other keys as needed for Twilio, S3, etc.
```

#### Step 5: Start the FastAPI Server

```powershell
uvicorn app:app --reload --port 3001
```

The server will start at `http://localhost:3001`

#### Step 6: Start the Transcription Worker (New Terminal)

Open a new terminal, activate the virtual environment, then run:

```powershell
cd server_py
.\.venv\Scripts\Activate.ps1
python worker/transcribe.py
```

#### Step 7: (Optional) Start Ingest Services

For email-based call ingestion:

**IMAP Ingest:**
```powershell
$env:PYTHONPATH = (Get-Location).Path
python ingest/imap_ingest.py
```

**Gmail Ingest** (requires GMAIL_CLIENT_ID in .env):
```powershell
$env:PYTHONPATH = (Get-Location).Path
python ingest/gmail_ingest.py
```

---

## 📂 Project Structure

```
server_py/
├── app.py                 # Main FastAPI application
├── transcribe_lib.py      # Transcription & AI analysis logic
├── worker/
│   └── transcribe.py      # Background worker for processing recordings
├── ingest/
│   ├── imap_ingest.py    # Email (IMAP) ingestion service
│   └── gmail_ingest.py   # Gmail API ingestion service
├── data/                  # Local storage for recordings (if not using S3)
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── run_all.ps1           # Automated startup script

```

---

## 🔧 Configuration

### Required Environment Variables

Edit `.env` with these essential settings:

```env
# AI/ML Services
GEMINI_API_KEY=your_gemini_api_key_here

# Twilio (for phone integration)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Storage (optional - defaults to local)
USE_S3=0                   # Set to 1 to use AWS S3
RECORDINGS_BUCKET=         # S3 bucket name (if USE_S3=1)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Email Ingestion (optional)
IMAP_SERVER=imap.gmail.com
IMAP_USER=your_email@gmail.com
IMAP_PASSWORD=your_app_password

# Gmail API (optional)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
```

---

## 🧪 Testing the Backend

### Check API Health

```powershell
curl http://localhost:3001/health
```

### View API Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:3001/docs
- **ReDoc:** http://localhost:3001/redoc

### Test Endpoints

```powershell
# List all calls
curl http://localhost:3001/api/calls

# Get specific call
curl http://localhost:3001/api/calls/{call_id}

# Upload recording (simulated)
curl -X POST http://localhost:3001/api/recordings/upload `
  -F "recording=@path/to/audio.mp3" `
  -F "caller=+15551234567"
```

---

## 🛠️ Troubleshooting

### "Python not found"
- Install Python from [python.org](https://www.python.org/downloads/)
- Make sure Python is added to your PATH

### "Cannot activate virtual environment"
- **Windows:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Then try activating again

### "Module not found" errors
- Make sure virtual environment is activated (you should see `(.venv)` in your prompt)
- Run `pip install -r requirements.txt` again

### "Port 3001 already in use"
- Change the port: `uvicorn app:app --reload --port 3002`
- Or find and kill the process using port 3001

### Worker not processing calls
- Check that the worker terminal is running and shows "Waiting for tasks..."
- Verify database connection in worker logs
- Check `.env` has correct GEMINI_API_KEY

---

## 📝 Development Notes

- **Hot Reload:** The FastAPI server auto-reloads when you edit `app.py` (thanks to `--reload` flag)
- **Local Storage:** Recordings are saved to `data/recordings/` by default
- **Database:** Currently uses in-memory storage; implement persistent DB as needed
- **Production:** Add Twilio webhook signature validation in production
- **AI Models:** Replace placeholder transcription with real ASR (Whisper, Google STT, Azure Speech, etc.)

---

## 🚦 Stopping Services

- **Press `Ctrl+C`** in each terminal/window to stop that service
- Or close the PowerShell windows opened by `run_all.ps1`

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Twilio Voice Webhooks](https://www.twilio.com/docs/voice/webhooks)
- [Google Gemini API](https://ai.google.dev/docs)
- [Whisper (OpenAI)](https://openai.com/research/whisper)

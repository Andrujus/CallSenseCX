# CallsenseCX Server PoC

This folder contains a minimal Express PoC for receiving Twilio recording callbacks, storing recordings (local or S3), and a simple worker that creates transcripts/summaries (placeholder).

Quickstart

1. Install dependencies

```powershell
cd server
npm install
```

2. Configure environment (see `.env.example` in project root)

3. Start server

```powershell
npm start
```

4. In another terminal, run the worker

```powershell
npm run worker
```

Notes
- The server listens on `PORT` (default 3001).
- For production, validate Twilio webhook signatures and use HTTPS.
- The worker currently writes a placeholder transcript. Replace the transcription block with Whisper or a cloud STT for production.
- Use `USE_S3=1` + AWS credentials to upload recordings to S3; otherwise recordings are saved to `server/recordings/`.

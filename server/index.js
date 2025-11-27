const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 3001;
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(__dirname, 'recordings');
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'calls.db');

fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
fs.mkdirSync(DB_DIR, { recursive: true });

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Initialize SQLite DB
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_sid TEXT,
      from_number TEXT,
      to_number TEXT,
      recording_path TEXT,
      transcript TEXT,
      summary TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/calls', (req, res) => {
  db.all('SELECT * FROM calls ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/calls/:id', (req, res) => {
  db.get('SELECT * FROM calls WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Twilio voice webhook: respond with TwiML to record the call and send recording status callback
app.post('/twilio/voice', (req, res) => {
  // For production, validate Twilio signature here
  const callbackUrl = process.env.RECORDING_CALLBACK_URL || (req.protocol + '://' + req.get('host') + '/twilio/recording-callback');
  res.type('text/xml');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">This call may be recorded for quality and training purposes.</Say>\n  <Record recordingStatusCallback="${callbackUrl}" maxLength="3600" playBeep="true"/>\n+</Response>`;
  res.send(twiml);
});

// Twilio will POST to this when a recording is complete
app.post('/twilio/recording-callback', async (req, res) => {
  try {
    // Note: Twilio sends urlencoded body by default
    const recordingUrl = req.body.RecordingUrl; // often without extension
    const callSid = req.body.CallSid || `local-${Date.now()}`;
    const from = req.body.From || null;
    const to = req.body.To || null;

    if (!recordingUrl) {
      return res.status(400).send('Missing RecordingUrl');
    }

    // Fetch audio (append .wav for Twilio recordings)
    const fetchUrl = recordingUrl.endsWith('.wav') || recordingUrl.endsWith('.mp3') ? recordingUrl : recordingUrl + '.wav';
    const audioResp = await axios.get(fetchUrl, { responseType: 'arraybuffer' });

    let storedPath = null;
    if (process.env.USE_S3 === '1') {
      // Upload to S3
      const s3 = new AWS.S3({ region: process.env.AWS_REGION });
      const bucket = process.env.RECORDINGS_BUCKET;
      if (!bucket) throw new Error('RECORDINGS_BUCKET not set');
      const key = `recordings/${callSid}-${Date.now()}.wav`;
      await s3
        .putObject({ Bucket: bucket, Key: key, Body: audioResp.data, ContentType: 'audio/wav', ServerSideEncryption: 'AES256' })
        .promise();
      storedPath = `s3://${bucket}/${key}`;
    } else {
      // Save locally
      const filename = `${callSid}-${Date.now()}.wav`;
      const filePath = path.join(RECORDINGS_DIR, filename);
      fs.writeFileSync(filePath, audioResp.data);
      storedPath = filePath;
    }

    // Insert into DB as pending for transcription
    db.run(
      'INSERT INTO calls (call_sid, from_number, to_number, recording_path, status) VALUES (?, ?, ?, ?, ?)',
      [callSid, from, to, storedPath, 'pending'],
      function (err) {
        if (err) console.error('DB insert error', err);
        else console.log('Inserted call', this.lastID);
      }
    );

    res.status(200).send('OK');
  } catch (err) {
    console.error('recording-callback error', err);
    res.status(500).send('Error');
  }
});

app.listen(PORT, () => {
  console.log(`CallsenseCX PoC server listening on http://localhost:${PORT}`);
});

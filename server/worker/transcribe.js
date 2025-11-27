const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const DB_PATH = path.join(__dirname, '..', 'data', 'calls.db');
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(__dirname, '..', 'recordings');

const db = new sqlite3.Database(DB_PATH);

async function downloadS3(s3uri) {
  const match = s3uri.match(/^s3:\/\/([^\/]+)\/(.+)$/);
  if (!match) throw new Error('Invalid s3 uri');
  const bucket = match[1];
  const key = match[2];
  const s3 = new AWS.S3({ region: process.env.AWS_REGION });
  const resp = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  return resp.Body;
}

function simpleSummarize(text) {
  if (!text) return '';
  const short = text.slice(0, 400);
  return `${short}${text.length > 400 ? '...' : ''}`;
}

function processPending() {
  db.all("SELECT * FROM calls WHERE status = 'pending'", async (err, rows) => {
    if (err) return console.error('DB select error', err);
    for (const row of rows) {
      try {
        console.log('Processing call id', row.id, 'path', row.recording_path);
        let audioBuffer = null;
        if (String(row.recording_path).startsWith('s3://')) {
          audioBuffer = await downloadS3(row.recording_path);
        } else {
          audioBuffer = fs.readFileSync(row.recording_path);
        }

        // TODO: Replace this placeholder with real ASR (Whisper, Google/Azure, or OpenAI Speech-to-Text)
        const transcript = `TRANSCRIPT_PLACEHOLDER: audio length ${audioBuffer.length} bytes`;
        const summary = simpleSummarize(transcript);

        db.run('UPDATE calls SET transcript = ?, summary = ?, status = ? WHERE id = ?', [transcript, summary, 'done', row.id], function (uerr) {
          if (uerr) console.error('DB update error', uerr);
          else console.log('Updated call', row.id);
        });
      } catch (e) {
        console.error('Error processing call', row.id, e);
        db.run('UPDATE calls SET status = ? WHERE id = ?', ['error', row.id]);
      }
    }
  });
}

// Simple loop to process pending every N seconds
const INTERVAL = parseInt(process.env.WORKER_POLL_SECS || '10', 10);
console.log('Transcription worker started; polling every', INTERVAL, 'seconds');
setInterval(processPending, INTERVAL * 1000);
processPending();

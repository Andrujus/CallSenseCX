from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse
import sqlite3
import os
import pathlib
import requests
import boto3
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = pathlib.Path(__file__).resolve().parent
RECORDINGS_DIR = pathlib.Path(os.getenv('RECORDINGS_DIR', BASE_DIR / 'recordings'))
DB_PATH = pathlib.Path(os.getenv('DB_PATH', BASE_DIR / 'data' / 'calls.db'))
USE_S3 = os.getenv('USE_S3', '0') == '1'

RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI()

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        '''
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_sid TEXT,
            from_number TEXT,
            to_number TEXT,
            recording_path TEXT,
            transcript TEXT,
            summary TEXT,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        '''
    )
    conn.commit()
    conn.close()

init_db()


@app.get('/health')
async def health():
    return {'ok': True}


@app.get('/calls')
async def list_calls():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT * FROM calls ORDER BY created_at DESC')
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@app.get('/calls/{call_id}')
async def get_call(call_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT * FROM calls WHERE id = ?', (call_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    return dict(row)


@app.post('/twilio/voice')
async def twilio_voice(request: Request):
    # For production validate Twilio signature
    host = request.headers.get('host')
    callback = os.getenv('RECORDING_CALLBACK_URL') or f"https://{host}/twilio/recording-callback"
    twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This call may be recorded for quality and training purposes.</Say>
  <Record recordingStatusCallback="{callback}" maxLength="3600" playBeep="true"/>
</Response>'''
    return Response(content=twiml, media_type='application/xml')


@app.post('/twilio/recording-callback')
async def recording_callback(request: Request):
    form = await request.form()
    recording_url = form.get('RecordingUrl')
    call_sid = form.get('CallSid') or f"local-{int(os.times()[4])}"
    from_num = form.get('From')
    to_num = form.get('To')

    if not recording_url:
        raise HTTPException(status_code=400, detail='Missing RecordingUrl')

    # Twilio often returns URL without extension; prefer .wav
    if not recording_url.endswith('.wav') and not recording_url.endswith('.mp3'):
        fetch_url = recording_url + '.wav'
    else:
        fetch_url = recording_url

    try:
        resp = requests.get(fetch_url)
        resp.raise_for_status()
        data = resp.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to fetch recording: {e}')

    stored_path = None
    if USE_S3:
        bucket = os.getenv('RECORDINGS_BUCKET')
        region = os.getenv('AWS_REGION')
        if not bucket:
            raise HTTPException(status_code=500, detail='RECORDINGS_BUCKET not configured')
        s3 = boto3.client('s3', region_name=region)
        key = f"recordings/{call_sid}-{int(os.times()[4])}.wav"
        s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType='audio/wav', ServerSideEncryption='AES256')
        stored_path = f's3://{bucket}/{key}'
    else:
        file_name = f"{call_sid}-{int(os.times()[4])}.wav"
        out_path = RECORDINGS_DIR / file_name
        with open(out_path, 'wb') as f:
            f.write(data)
        stored_path = str(out_path)

    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO calls (call_sid, from_number, to_number, recording_path, status) VALUES (?, ?, ?, ?, ?)',
                (call_sid, from_num, to_num, stored_path, 'pending'))
    conn.commit()
    conn.close()

    return PlainTextResponse('OK')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=int(os.getenv('PORT', '3001')), reload=True)

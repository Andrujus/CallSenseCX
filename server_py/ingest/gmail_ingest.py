"""
Gmail ingestion script

Polls the configured Gmail account for messages with audio attachments (wav/mp3),
downloads attachments, saves them to local storage or S3, inserts a row into
the `calls` SQLite table and marks the message as read.

Environment variables (see `.env.example`):
- GMAIL_CLIENT_ID
- GMAIL_CLIENT_SECRET
- GMAIL_REFRESH_TOKEN
- GMAIL_USER (usually 'me')
- GMAIL_POLL_SECS
- USE_S3, RECORDINGS_BUCKET, AWS_REGION
- DB_PATH, RECORDINGS_DIR

Before running, ensure you have created OAuth credentials and a refresh token
for the Gmail account. For quick testing you can generate a refresh token using
the OAuth playground or a temporary oauth script.
"""

import os
import base64
import time
import pathlib
import sqlite3
from dotenv import load_dotenv
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import boto3
import threading
from transcribe_lib import process_call_row

load_dotenv()

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = pathlib.Path(os.getenv('DB_PATH', BASE_DIR / 'data' / 'calls.db'))
RECORDINGS_DIR = pathlib.Path(os.getenv('RECORDINGS_DIR', BASE_DIR / 'recordings'))
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

GMAIL_CLIENT_ID = os.getenv('GMAIL_CLIENT_ID')
GMAIL_CLIENT_SECRET = os.getenv('GMAIL_CLIENT_SECRET')
GMAIL_REFRESH_TOKEN = os.getenv('GMAIL_REFRESH_TOKEN')
GMAIL_USER = os.getenv('GMAIL_USER', 'me')
POLL_SECS = int(os.getenv('GMAIL_POLL_SECS', '30'))

USE_S3 = os.getenv('USE_S3', '0') == '1'
AWS_REGION = os.getenv('AWS_REGION')
RECORDINGS_BUCKET = os.getenv('RECORDINGS_BUCKET')

def get_db_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def creds_from_refresh_token():
    if not (GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN):
        raise RuntimeError('GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN must be set in env')
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri='https://oauth2.googleapis.com/token'
    )
    request = Request()
    creds.refresh(request)
    return creds

def save_to_s3(filename: str, data: bytes) -> str:
    s3 = boto3.client('s3', region_name=AWS_REGION)
    key = f'recordings/{filename}'
    s3.put_object(Bucket=RECORDINGS_BUCKET, Key=key, Body=data, ContentType='audio/wav', ServerSideEncryption='AES256')
    return f's3://{RECORDINGS_BUCKET}/{key}'

def process_message(service, msg_id):
    msg = service.users().messages().get(userId=GMAIL_USER, id=msg_id, format='full').execute()
    parts = []

    def walk_parts(p):
        if 'parts' in p:
            for sp in p['parts']:
                walk_parts(sp)
        else:
            parts.append(p)

    payload = msg.get('payload', {})
    walk_parts(payload)

    for p in parts:
        filename = p.get('filename') or ''
        body = p.get('body', {})
        if not filename:
            continue
        lower = filename.lower()
        if not (lower.endswith('.wav') or lower.endswith('.mp3')):
            continue

        attach_id = body.get('attachmentId')
        if not attach_id:
            continue

        att = service.users().messages().attachments().get(userId=GMAIL_USER, messageId=msg_id, id=attach_id).execute()
        data = base64.urlsafe_b64decode(att['data'].encode('utf-8'))

        # store
        if USE_S3:
            if not RECORDINGS_BUCKET:
                print('RECORDINGS_BUCKET not set; skipping')
                continue
            stored_path = save_to_s3(filename, data)
        else:
            out_path = RECORDINGS_DIR / filename
            # ensure unique
            i = 1
            while out_path.exists():
                out_path = RECORDINGS_DIR / f"{out_path.stem}-{i}{out_path.suffix}"
                i += 1
            out_path.write_bytes(data)
            stored_path = str(out_path)

        # Insert into DB as pending
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute('INSERT INTO calls (call_sid, from_number, to_number, recording_path, status) VALUES (?, ?, ?, ?, ?)',
                    (f'gmail-{msg_id}', None, None, stored_path, 'pending'))
        conn.commit()
        call_id = cur.lastrowid
        conn.close()
        print('Inserted recording from message', msg_id, '->', stored_path, 'id=', call_id)

        # Trigger immediate transcription in background
        def _bg():
            try:
                process_call_row(call_id)
            except Exception as e:
                print('Background transcription error for', call_id, e)

        t = threading.Thread(target=_bg, daemon=True)
        t.start()

    # mark message as read
    try:
        service.users().messages().modify(userId=GMAIL_USER, id=msg_id, body={'removeLabelIds': ['UNREAD']}).execute()
    except Exception as e:
        print('Failed to mark message read', e)

def poll_loop():
    creds = creds_from_refresh_token()
    service = build('gmail', 'v1', credentials=creds)
    query = 'has:attachment (filename:mp3 OR filename:wav) label:unread'
    print('Gmail ingest started; polling every', POLL_SECS, 'seconds')
    while True:
        try:
            resp = service.users().messages().list(userId=GMAIL_USER, q=query, maxResults=50).execute()
            msgs = resp.get('messages', [])
            if msgs:
                print('Found', len(msgs), 'messages')
                for m in msgs:
                    try:
                        process_message(service, m['id'])
                    except Exception as e:
                        print('Error processing message', m['id'], e)
            time.sleep(POLL_SECS)
        except Exception as e:
            print('Gmail poll error', e)
            time.sleep(30)

if __name__ == '__main__':
    poll_loop()

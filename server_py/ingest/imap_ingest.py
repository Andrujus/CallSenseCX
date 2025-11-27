"""
IMAP ingestion script

Polls an IMAP mailbox for unread messages with audio attachments (.wav, .mp3),
downloads attachments, saves them to local storage or S3, inserts a row into
the `calls` SQLite table and triggers transcription (background thread).

Environment variables (see `.env.example`):
- IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD, IMAP_FOLDER, IMAP_POLL_SECS
- USE_S3, RECORDINGS_BUCKET, AWS_REGION
- DB_PATH, RECORDINGS_DIR

This uses built-in `imaplib` and `email` to avoid extra dependencies.
"""

import os
import time
import imaplib
import email
import pathlib
import sqlite3
import base64
import threading
from dotenv import load_dotenv
from transcribe_lib import process_call_row
import boto3

load_dotenv()

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = pathlib.Path(os.getenv('DB_PATH', BASE_DIR / 'data' / 'calls.db'))
RECORDINGS_DIR = pathlib.Path(os.getenv('RECORDINGS_DIR', BASE_DIR / 'recordings'))
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

IMAP_HOST = os.getenv('IMAP_HOST')
IMAP_PORT = int(os.getenv('IMAP_PORT', '993'))
IMAP_USER = os.getenv('IMAP_USER')
IMAP_PASSWORD = os.getenv('IMAP_PASSWORD')
IMAP_FOLDER = os.getenv('IMAP_FOLDER', 'INBOX')
IMAP_POLL_SECS = int(os.getenv('IMAP_POLL_SECS', '30'))

USE_S3 = os.getenv('USE_S3', '0') == '1'
RECORDINGS_BUCKET = os.getenv('RECORDINGS_BUCKET')
AWS_REGION = os.getenv('AWS_REGION')

def get_db_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def save_to_s3(filename: str, data: bytes) -> str:
    s3 = boto3.client('s3', region_name=AWS_REGION)
    key = f'recordings/{filename}'
    s3.put_object(Bucket=RECORDINGS_BUCKET, Key=key, Body=data, ContentType='audio/wav', ServerSideEncryption='AES256')
    return f's3://{RECORDINGS_BUCKET}/{key}'

def process_attachment(filename: str, data: bytes):
    # ensure unique filename
    safe_name = filename
    out_path = RECORDINGS_DIR / safe_name
    i = 1
    while out_path.exists():
        out_path = RECORDINGS_DIR / f"{Path(stem=out_path.stem).stem}-{i}{out_path.suffix}"
        i += 1

    if USE_S3:
        if not RECORDINGS_BUCKET:
            print('RECORDINGS_BUCKET not set; skipping S3 upload')
            return None
        stored = save_to_s3(filename, data)
    else:
        out_path.write_bytes(data)
        stored = str(out_path)

    # Insert into DB as pending
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute('INSERT INTO calls (call_sid, from_number, to_number, recording_path, status) VALUES (?, ?, ?, ?, ?)',
                (f'imap-{int(time.time())}-{filename}', None, None, stored, 'pending'))
    conn.commit()
    call_id = cur.lastrowid
    conn.close()

    print('Inserted recording from IMAP', filename, 'id=', call_id)

    # Trigger immediate transcription in background
    def _bg():
        try:
            process_call_row(call_id)
        except Exception as e:
            print('Background transcription error for', call_id, e)

    t = threading.Thread(target=_bg, daemon=True)
    t.start()


def decode_part(part):
    payload = part.get_payload(decode=True)
    return payload


def poll_loop():
    if not (IMAP_HOST and IMAP_USER and IMAP_PASSWORD):
        raise RuntimeError('IMAP_HOST/IMAP_USER/IMAP_PASSWORD must be set in env')

    print('Starting IMAP ingest; connecting to', IMAP_HOST)
    while True:
        try:
            with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as M:
                M.login(IMAP_USER, IMAP_PASSWORD)
                M.select(IMAP_FOLDER)
                typ, data = M.search(None, 'UNSEEN')
                if typ != 'OK':
                    print('IMAP search failed', typ)
                else:
                    ids = data[0].split()
                    if ids:
                        print('Found', len(ids), 'unseen messages')
                    for num in ids:
                        typ, msg_data = M.fetch(num, '(RFC822)')
                        if typ != 'OK':
                            continue
                        msg = email.message_from_bytes(msg_data[0][1])
                        # walk parts
                        for part in msg.walk():
                            if part.get_content_maintype() == 'multipart':
                                continue
                            filename = part.get_filename()
                            if not filename:
                                continue
                            lower = filename.lower()
                            if not (lower.endswith('.wav') or lower.endswith('.mp3')):
                                continue
                            data = decode_part(part)
                            if not data:
                                continue
                            process_attachment(filename, data)

                        # mark as seen
                        M.store(num, '+FLAGS', '\\Seen')

        except Exception as e:
            print('IMAP poll error', e)

        time.sleep(IMAP_POLL_SECS)


if __name__ == '__main__':
    poll_loop()

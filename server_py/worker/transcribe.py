import sqlite3
import time
import os
import pathlib
import boto3
from dotenv import load_dotenv
from transcribe_lib import process_call_row

load_dotenv()

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

def process_pending():
    conn = sqlite3.connect(str(BASE_DIR / 'data' / 'calls.db'))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id FROM calls WHERE status = 'pending'")
    rows = cur.fetchall()
    conn.close()
    for r in rows:
        cid = r['id']
        print('Processing call id', cid)
        success = process_call_row(cid)
        print('Processed', cid, 'success=', success)


if __name__ == '__main__':
    POLL = int(os.getenv('WORKER_POLL_SECS', '10'))
    print('Worker started; polling every', POLL, 'seconds')
    while True:
        process_pending()
        time.sleep(POLL)

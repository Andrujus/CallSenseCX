import os
import sqlite3
import pathlib
import boto3
import tempfile
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = pathlib.Path(__file__).resolve().parent
DB_PATH = pathlib.Path(os.getenv('DB_PATH', BASE_DIR / 'data' / 'calls.db'))
USE_S3 = os.getenv('USE_S3', '0') == '1'
AWS_REGION = os.getenv('AWS_REGION')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

def get_db_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def download_s3_to_temp(s3_uri):
    # s3://bucket/key
    _, rest = s3_uri.split('s3://', 1)
    bucket, key = rest.split('/', 1)
    s3 = boto3.client('s3', region_name=AWS_REGION)
    obj = s3.get_object(Bucket=bucket, Key=key)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=pathlib.Path(key).suffix)
    tmp.write(obj['Body'].read())
    tmp.flush()
    tmp.close()
    return tmp.name

def transcribe_with_openai(file_path: str) -> str:
    try:
        import openai
    except Exception as e:
        raise RuntimeError('openai package not installed')
    openai.api_key = OPENAI_API_KEY
    with open(file_path, 'rb') as f:
        # Uses Whisper model via OpenAI API
        resp = openai.Audio.transcribe('whisper-1', f)
    # resp may be a dict-like with 'text'
    text = None
    if isinstance(resp, dict):
        text = resp.get('text') or resp.get('transcript')
    else:
        # fallback: try attribute
        text = getattr(resp, 'text', None)
    return text or ''

def simple_summarize(text: str) -> str:
    if not text:
        return ''
    return text[:500] + ('...' if len(text) > 500 else '')

def summarize_with_openai(text: str) -> dict:
    """Call OpenAI chat API to produce a structured JSON summary.

    Returns a dict with keys: short_summary (str), action_items (list of dicts),
    topics (list of str), sentiment (str)
    """
    try:
        import openai
        import json
    except Exception as e:
        raise RuntimeError('openai package required for LLM summarization')
    if not OPENAI_API_KEY:
        raise RuntimeError('OPENAI_API_KEY not set')
    openai.api_key = OPENAI_API_KEY

    system = (
        'You are a concise call summarizer. Given a transcript, produce a JSON object '
        'with the following keys: "short_summary" (1-3 sentences), "action_items" '
        '(an array of objects with "text", "owner" (if present or null), and "due" (if present or null)), '
        '"topics" (array of short topic strings), and "sentiment" ("positive", "neutral" or "negative"). '
        'Return ONLY valid JSON with those keys. Do not include any additional text.'
    )

    user = f"Transcript:\n\n{text}"

    resp = openai.ChatCompletion.create(
        model='gpt-3.5-turbo',
        messages=[{'role': 'system', 'content': system}, {'role': 'user', 'content': user}],
        temperature=0.0,
        max_tokens=600
    )
    content = resp['choices'][0]['message']['content']
    # Try to parse JSON out of content
    try:
        return json.loads(content)
    except Exception:
        # If parsing fails, try to extract a JSON substring
        import re
        m = re.search(r'\{.*\}', content, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        # fallback to minimal structure
        return {
            'short_summary': simple_summarize(text),
            'action_items': [],
            'topics': [],
            'sentiment': 'neutral'
        }

def process_call_row(call_id: int):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute('SELECT * FROM calls WHERE id = ?', (call_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise RuntimeError('Call id not found: %s' % call_id)

    path = row['recording_path']
    local_path = None
    try:
        if USE_S3 and str(path).startswith('s3://'):
            local_path = download_s3_to_temp(path)
        else:
            local_path = path

        transcript = ''
        if OPENAI_API_KEY:
            transcript = transcribe_with_openai(local_path)
        else:
            transcript = f'TRANSCRIPT_PLACEHOLDER: processed {local_path}'

        # Use LLM to produce structured summary if available
        structured = None
        try:
            if OPENAI_API_KEY:
                structured = summarize_with_openai(transcript)
            else:
                structured = {
                    'short_summary': simple_summarize(transcript),
                    'action_items': [],
                    'topics': [],
                    'sentiment': 'neutral'
                }
        except Exception as e:
            print('LLM summarization failed', e)
            structured = {
                'short_summary': simple_summarize(transcript),
                'action_items': [],
                'topics': [],
                'sentiment': 'neutral'
            }

        # Store transcript and structured summary as JSON text
        try:
            import json
            summary_json = json.dumps(structured, ensure_ascii=False)
        except Exception:
            summary_json = str(structured)

        cur.execute('UPDATE calls SET transcript = ?, summary = ?, status = ? WHERE id = ?',
                    (transcript, summary_json, 'done', call_id))
        conn.commit()
        return True
    except Exception as e:
        print('process_call_row error', e)
        cur.execute('UPDATE calls SET status = ? WHERE id = ?', ('error', call_id))
        conn.commit()
        return False
    finally:
        conn.close()

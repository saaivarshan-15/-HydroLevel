from pathlib import Path
import json
import uuid
import webbrowser
import threading
import re
import time

import pandas as pd
from flask import Flask, request, jsonify, send_file, send_from_directory, session, redirect, url_for
from flask_cors import CORS

from services.analysis import validate_rows, analyze_dataset
from services.hydroai import row_insight, overall_insight, answer
from services.digital_twin import VehicleDigitalTwin
from reports.reporting import generate_charts, build_pdf, build_xlsx, build_csv
from config import DEFAULT_THRESHOLD_KG, DEFAULT_BLEND, MINIMUM_EXPORT_ROWS, HOST, PORT, APP_VERSION, PLAYBACK_MS_PER_ROW, VEHICLE_DETAILS, SESSION_SECRET

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / 'frontend'
GEN = ROOT / 'backend' / 'reports' / 'generated'
DATA_DIR = ROOT / 'data'
VEHICLE_DETAILS_FILE = DATA_DIR / 'vehicle_details.json'
GEN.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=str(FRONT), static_url_path='')
app.secret_key = SESSION_SECRET
CORS(app)
POSITIONS = ('FL', 'FR', 'RL', 'RR')

# ---------------------------------------------------------------------------
# SHARED SERVER STATE
# ---------------------------------------------------------------------------
# This is intentionally server-side. Every browser tab talks to the same
# state, so Monitoring, Analytics and Reports cannot disagree about the row
# count. A future database can replace this dictionary without changing the
# frontend API.
STATE = {
    'processed': None,
    'rows': [],
    'running': False,
    'completed_count': 0,
    'current_index': -1,
    'phase': 'WAITING',
    'error': '',
    'started_at': None,
}
STATE_LOCK = threading.RLock()
PLAYBACK_STOP = threading.Event()
TWIN = VehicleDigitalTwin(VEHICLE_DETAILS.get('vehicle_id', 'HYDRO-DEMO-01'))
ACTIVE_VEHICLE_DETAILS = dict(VEHICLE_DETAILS)

# These fields must be explicitly completed by the operator before monitoring
# can start. Defaults such as 'Not specified' are treated as incomplete.
REQUIRED_VEHICLE_FIELDS = (
    'vehicle_id', 'make_model', 'registration_number', 'chassis_number',
    'test_date', 'test_location', 'gvw_kg', 'front_axle_rating_kg',
    'rear_axle_rating_kg', 'payload_kg', 'wheelbase_mm', 'tyre_size', 'operator'
)

def _missing_vehicle_fields():
    missing = []
    for key in REQUIRED_VEHICLE_FIELDS:
        value = str(ACTIVE_VEHICLE_DETAILS.get(key, '')).strip()
        if not value or value.lower() in {'not specified', 'none', 'null', 'n/a'}:
            missing.append(key)
    return missing

def _vehicle_details_complete():
    return not _missing_vehicle_fields()
if VEHICLE_DETAILS_FILE.exists():
    try:
        saved_details = json.loads(VEHICLE_DETAILS_FILE.read_text(encoding='utf-8'))
        if isinstance(saved_details, dict):
            ACTIVE_VEHICLE_DETAILS.update({k: str(v) for k, v in saved_details.items() if k in ACTIVE_VEHICLE_DETAILS})
    except Exception:
        pass



def _logged_in() -> bool:
    return bool(session.get('hydrolevel_authenticated'))


def _require_login_json():
    if _logged_in():
        return None
    return jsonify({'error': 'LOGIN REQUIRED: sign in to HydroLevel first.'}), 401



def _normalise_column(name: object) -> str:
    text = str(name).strip().upper()
    text = re.sub(r'[^A-Z0-9]+', '_', text).strip('_')
    return text


def _find_position_columns(columns):
    mapping = {}
    for original in columns:
        n = _normalise_column(original)
        compact = n.replace('_', '')
        for pos in POSITIONS:
            if compact == pos or compact.startswith(pos + 'KG') or compact.startswith(pos + 'LOAD'):
                mapping[pos] = original
                break
    return mapping


def _prepare_dataframe(df: pd.DataFrame):
    if df is None or df.empty:
        return None
    mapping = _find_position_columns(df.columns)
    if len(mapping) != 4:
        return None
    clean = pd.DataFrame({p: pd.to_numeric(df[mapping[p]], errors='coerce') for p in POSITIONS})
    clean = clean.dropna(how='all').reset_index(drop=True)
    return clean


def _find_measurement_table(excel, sheet_name):
    for header_row in range(0, 15):
        try:
            candidate = pd.read_excel(excel, sheet_name=sheet_name, header=header_row)
        except Exception:
            continue
        clean = _prepare_dataframe(candidate)
        if clean is not None and not clean.empty:
            return clean

    try:
        raw = pd.read_excel(excel, sheet_name=sheet_name, header=None)
    except Exception:
        return None
    for idx in range(min(30, len(raw))):
        values = [str(v).strip().upper() for v in raw.iloc[idx].tolist()]
        pos_cols = {}
        for col_idx, value in enumerate(values):
            compact = re.sub(r'[^A-Z0-9]', '', value)
            for pos in POSITIONS:
                if compact == pos or compact.startswith(pos + 'KG') or compact.startswith(pos + 'LOAD'):
                    pos_cols[pos] = col_idx
        if len(pos_cols) == 4:
            body = raw.iloc[idx + 1:].copy()
            clean = pd.DataFrame({p: pd.to_numeric(body.iloc[:, pos_cols[p]], errors='coerce') for p in POSITIONS})
            clean = clean.dropna(how='all').reset_index(drop=True)
            if not clean.empty:
                return clean
    return None


def load_file(f):
    if not f or not f.filename:
        raise ValueError('No dataset selected. Choose a CSV or Excel file.')
    name = f.filename.lower()
    if not name.endswith(('.csv', '.xlsx', '.xls')):
        raise ValueError('Unsupported file. Use CSV, XLSX or XLS.')

    if name.endswith('.csv'):
        df = pd.read_csv(f, sep=None, engine='python')
        clean = _prepare_dataframe(df)
        if clean is None:
            raise ValueError('CSV must contain FL, FR, RL and RR columns.')
    else:
        try:
            excel = pd.ExcelFile(f)
        except Exception as exc:
            raise ValueError(f'Excel could not be opened: {exc}')
        clean = None
        for sheet in excel.sheet_names:
            candidate = _find_measurement_table(excel, sheet)
            if candidate is not None:
                clean = candidate
                break
        if clean is None:
            raise ValueError('No Excel sheet containing FL, FR, RL and RR was found.')

    clean.columns = list(POSITIONS)
    raw_records = clean.to_dict('records')
    valid, errors = validate_rows(raw_records)
    return valid, errors, len(raw_records), list(clean.columns)


def _public_state():
    with STATE_LOCK:
        completed = STATE['completed_count']
        rows = STATE['rows']
        current = STATE['current_index']
        return {
            'running': STATE['running'],
            'completed_count': completed,
            'source_rows': STATE['processed']['source_rows'] if STATE['processed'] else 0,
            'valid_count': len(rows),
            'current_index': current,
            'current_row_number': (rows[current]['index'] if 0 <= current < len(rows) else 0),
            'phase': STATE['phase'],
            'error': STATE['error'],
            'row': rows[current] if 0 <= current < len(rows) else None,
            'completed_rows': rows[:completed],
            'processed': STATE['processed'],
        }


def _playback_worker():
    while not PLAYBACK_STOP.is_set():
        with STATE_LOCK:
            i = STATE['completed_count']
            rows = STATE['rows']
            if i >= len(rows):
                STATE['running'] = False
                STATE['phase'] = 'DATASET COMPLETE'
                return
            STATE['current_index'] = i
            r = rows[i]
            step = max(0.20, PLAYBACK_MS_PER_ROW / 1000 / 6)

        phases = ['READING ROW', 'VALIDATED', 'CALCULATING', 'SCREENING', 'EQUALIZATION', 'CG / EQUALIZED', 'HYDROAI']
        for phase in phases:
            with STATE_LOCK:
                if not STATE['running']:
                    return
                STATE['phase'] = phase
            time.sleep(step)

        # Push the same analyzed row into the server-side digital twin.
        with STATE_LOCK:
            TWIN.update_from_analysis(r)

        # The row becomes completed only after equalized values have been
        # produced and the final HydroAI stage has been displayed.
        with STATE_LOCK:
            if STATE['running']:
                STATE['completed_count'] = i + 1
                STATE['phase'] = 'ROW COMPLETE'

        time.sleep(step)


@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response


@app.get('/')
def home():
    return send_from_directory(FRONT, 'index.html')


@app.get('/login')
def login_page():
    if _logged_in():
        return redirect(url_for('dashboard'))
    return send_from_directory(FRONT, 'login.html')


@app.post('/api/login')
def login():
    # Local prototype access: the operator chooses the username/password for
    # this session. There is intentionally no hard-coded account.
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))
    if not username:
        return jsonify({'error': 'Username is required.'}), 400
    if not password:
        return jsonify({'error': 'Password is required.'}), 400

    session['hydrolevel_authenticated'] = True
    session['hydrolevel_username'] = username
    return jsonify({'ok': True, 'redirect': '/dashboard', 'username': username})


@app.post('/api/logout')
def logout():
    session.clear()
    return jsonify({'ok': True})


@app.get('/api/session')
def session_info():
    guard = _require_login_json()
    if guard:
        return guard
    return jsonify({
        'authenticated': True,
        'username': session.get('hydrolevel_username', '')
    })


@app.get('/dashboard')
def dashboard():
    if not _logged_in():
        return redirect(url_for('login_page'))
    return send_from_directory(FRONT, 'dashboard.html')


@app.get('/api/vehicle-details')
def vehicle_details():
    guard = _require_login_json()
    if guard:
        return guard
    return jsonify(ACTIVE_VEHICLE_DETAILS)


@app.post('/api/vehicle-details')
def save_vehicle_details():
    guard = _require_login_json()
    if guard:
        return guard
    try:
        incoming = request.get_json(force=True) or {}
        allowed = set(ACTIVE_VEHICLE_DETAILS.keys())
        for key in allowed:
            if key in incoming:
                ACTIVE_VEHICLE_DETAILS[key] = str(incoming[key]).strip()
        TWIN.vehicle_id = ACTIVE_VEHICLE_DETAILS.get('vehicle_id', TWIN.vehicle_id)
        TWIN.state['vehicle_id'] = TWIN.vehicle_id
        VEHICLE_DETAILS_FILE.write_text(json.dumps(ACTIVE_VEHICLE_DETAILS, indent=2), encoding='utf-8')
        missing = _missing_vehicle_fields()
        return jsonify({'ok': True, 'vehicle_details': dict(ACTIVE_VEHICLE_DETAILS), 'complete': not missing, 'missing_fields': missing})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400


@app.get('/api/health')
def health():
    return jsonify({'ok': True, 'service': 'HydroLevel', 'version': APP_VERSION})


@app.get('/api/state')
def state():
    guard = _require_login_json()
    if guard:
        return guard
    return jsonify(_public_state())


@app.get('/api/sample')
def sample():
    return send_file(ROOT / 'data' / 'sample' / 'hydrolevel_demo_500.csv', as_attachment=True, download_name='hydrolevel_demo_500.csv')


@app.post('/api/analyze')
def analyze():
    guard = _require_login_json()
    if guard:
        return guard
    try:
        valid, errors, total, columns = load_file(request.files.get('file'))
        threshold = float(request.form.get('threshold', DEFAULT_THRESHOLD_KG))
        blend = float(request.form.get('blend', DEFAULT_BLEND))
        if threshold <= 0:
            raise ValueError('Threshold must be greater than zero.')
        if not 0 <= blend <= 1:
            raise ValueError('Blend must be between 0 and 1.')

        result = analyze_dataset(valid, threshold, blend)
        result.update({'validation_errors': errors, 'source_rows': total, 'columns': columns, 'ai_overall': overall_insight(result['summary']), 'insurance_review': result['summary'].get('insurance_review', {}), 'vehicle_details': dict(ACTIVE_VEHICLE_DETAILS)})
        for r in result['results']:
            r['ai'] = row_insight(r)

        with STATE_LOCK:
            PLAYBACK_STOP.set()
            STATE.update({
                'processed': result,
                'rows': result['results'],
                'running': False,
                'completed_count': 0,
                'current_index': -1,
                'phase': 'DATASET READY',
                'error': '',
                'started_at': None,
            })
            PLAYBACK_STOP.clear()
        return jsonify(result)
    except Exception as exc:
        with STATE_LOCK:
            STATE['error'] = str(exc)
        return jsonify({'error': str(exc)}), 400


@app.post('/api/start')
def start_playback():
    guard = _require_login_json()
    if guard:
        return guard

    missing_vehicle = _missing_vehicle_fields()
    if missing_vehicle:
        labels = {
            'vehicle_id': 'Vehicle ID', 'make_model': 'Make / Model',
            'registration_number': 'Registration Number', 'chassis_number': 'Chassis Number',
            'test_date': 'Test Date', 'test_location': 'Test Location',
            'gvw_kg': 'GVW', 'front_axle_rating_kg': 'Front Axle Rating',
            'rear_axle_rating_kg': 'Rear Axle Rating', 'payload_kg': 'Payload',
            'wheelbase_mm': 'Wheelbase', 'tyre_size': 'Tyre Size', 'operator': 'Operator'
        }
        names = ', '.join(labels.get(k, k) for k in missing_vehicle)
        return jsonify({'error': f'START BLOCKED: complete Vehicle Profile first. Missing: {names}', 'missing_fields': missing_vehicle}), 400

    with STATE_LOCK:
        if not STATE['rows']:
            return jsonify({'error': 'START BLOCKED: import and validate a dataset first.'}), 400
        if STATE['running']:
            return jsonify({'ok': True, 'already_running': True})
        STATE['running'] = True
        STATE['completed_count'] = 0
        STATE['current_index'] = -1
        STATE['phase'] = 'STARTING'
        STATE['error'] = ''
        STATE['started_at'] = time.time()
        PLAYBACK_STOP.clear()
    threading.Thread(target=_playback_worker, daemon=True).start()
    return jsonify({'ok': True})


@app.post('/api/stop')
def stop_playback():
    guard = _require_login_json()
    if guard:
        return guard
    with STATE_LOCK:
        STATE['running'] = False
        STATE['phase'] = 'PAUSED'
    return jsonify({'ok': True})


@app.post('/api/live')
def live():
    guard = _require_login_json()
    if guard:
        return guard
    try:
        d = request.get_json(force=True)
        vals = {p: float(d[p]) for p in POSITIONS}
        r = analyze_dataset([vals], float(d.get('threshold', DEFAULT_THRESHOLD_KG)), float(d.get('blend', DEFAULT_BLEND)))['results'][0]
        r['ai'] = row_insight(r)
        with STATE_LOCK:
            TWIN.update_from_analysis(r)
        return jsonify(r)
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400




@app.get('/api/twin/state')
def twin_state():
    guard = _require_login_json()
    if guard:
        return guard
    """Return the current server-side digital-twin state."""
    return jsonify(TWIN.get_state())


@app.post('/api/twin/telemetry')
def twin_telemetry():
    guard = _require_login_json()
    if guard:
        return guard
    """Accept a JSON telemetry payload for future live sensor integration."""
    try:
        payload = request.get_json(force=True) or {}
        state = TWIN.update_telemetry(payload)
        return jsonify(state)
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400



@app.get('/api/health-summary')
def health_summary():
    guard = _require_login_json()
    if guard:
        return guard
    with STATE_LOCK:
        summary = (STATE.get('processed') or {}).get('summary') or {}
        health = summary.get('health') or {
            'risk_score': 0, 'risk_level': 'SAFE',
            'indicators': ['No validated history available.'],
            'recommendation': 'Import and process vehicle data first.',
            'history_rows': 0,
        }
        return jsonify(health)



@app.post('/api/hydroai')
def hydroai():
    guard = _require_login_json()
    if guard:
        return guard
    try:
        d = request.get_json(force=True)
        return jsonify({'answer': answer(d.get('question', ''), d['row'])})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400


@app.post('/api/export/<kind>')
def export(kind):
    guard = _require_login_json()
    if guard:
        return guard
    try:
        # Export directly from server state. The browser cannot claim that
        # unfinished rows are completed and another tab sees the same count.
        with STATE_LOCK:
            count = STATE['completed_count']
            processed = STATE['processed']
            completed_results = list(STATE['rows'][:count])
        if count < MINIMUM_EXPORT_ROWS:
            return jsonify({'error': f'EXPORT BLOCKED: only {count} completed valid rows are available. Minimum {MINIMUM_EXPORT_ROWS} are required.'}), 400
        if len(completed_results) != count or not processed:
            return jsonify({'error': 'Completed-row state is incomplete.'}), 400

        summary_in = processed.get('summary') or {}
        threshold = float(summary_in.get('threshold_kg', DEFAULT_THRESHOLD_KG))
        blend = float(summary_in.get('equalization_blend', DEFAULT_BLEND))
        rebuilt = analyze_dataset([r['raw'] for r in completed_results], threshold, blend)
        payload = dict(processed)
        payload['results'] = completed_results
        payload['count'] = count
        payload['completed_count'] = count
        payload['summary'] = rebuilt['summary']
        payload['ai_overall'] = overall_insight(rebuilt['summary'])
        payload['insurance_review'] = rebuilt['summary'].get('insurance_review', {})
        payload['vehicle_details'] = dict(ACTIVE_VEHICLE_DETAILS)

        token = uuid.uuid4().hex[:8]
        charts = generate_charts(payload, GEN / f'charts_{token}')
        if kind == 'pdf':
            path = GEN / f'HydroLevel_Engineering_Report_{count}_completed_{token}.pdf'
            build_pdf(payload, path, charts)
            return send_file(path, as_attachment=True, download_name=path.name)
        if kind == 'xlsx':
            path = GEN / f'HydroLevel_Engineering_Data_{count}_completed_{token}.xlsx'
            build_xlsx(payload, path)
            return send_file(path, as_attachment=True, download_name=path.name)
        if kind == 'csv':
            path = GEN / f'HydroLevel_Processed_Data_{count}_completed_{token}.csv'
            build_csv(payload, path)
            return send_file(path, as_attachment=True, download_name=path.name)
        if kind == 'json':
            path = GEN / f'HydroLevel_Analysis_{count}_completed_{token}.json'
            path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
            return send_file(path, as_attachment=True, download_name=path.name)
        raise ValueError('Unsupported export type.')
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400


def open_browser():
    try:
        webbrowser.open(f'http://{HOST}:{PORT}')
    except Exception:
        pass


if __name__ == '__main__':
    threading.Timer(1.0, open_browser).start()
    app.run(host=HOST, port=PORT, debug=False, threaded=True)

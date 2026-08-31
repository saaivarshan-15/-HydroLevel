/*
 * HydroLevel dashboard controller.
 *
 * EASY TO UPGRADE:
 * - Change UI defaults in js/config.js.
 * - Change engineering formulas in backend/services/analysis.py.
 * - Change report generation in backend/reports/reporting.py.
 * - completedCount is the ONLY number allowed to unlock report export.
 */
let processed = null;
let rows = [];
let running = false;
let completedCount = 0;
let currentRowIndex = -1;

const $ = id => document.getElementById(id);
const POS = window.HYDROLEVEL_CONFIG?.analysis?.positions || ['FL', 'FR', 'RL', 'RR'];
const HC = window.HYDROLEVEL_CONFIG?.analysis || {
  defaultThresholdKg: 10,
  defaultBlend: 0.5,
  playbackMsPerRow: 15000,
  minimumExportRows: 20,
  forceConversion: 9.80665
};

function fmt(v) { return Number(v).toFixed(2); }


function updateHealthPanel(health) {
  const h = health || {};
  const score = Number(h.risk_score || 0);
  const level = String(h.risk_level || 'SAFE').toUpperCase();
  if ($('healthScore')) $('healthScore').textContent = score.toFixed(0);
  if ($('healthLevel')) $('healthLevel').textContent = level;
  if ($('healthRows')) $('healthRows').textContent = Number(h.history_rows || 0);
  if ($('healthAlertRate')) $('healthAlertRate').textContent = Number(h.alert_rate_percent || 0).toFixed(1) + '%';
  if ($('healthTrend')) $('healthTrend').textContent = String(h.trend?.deviation_direction || 'STABLE/DECREASING').toUpperCase();
  const scoreBox = document.querySelector('.healthScore');
  if (scoreBox) scoreBox.className = 'healthScore ' + level.toLowerCase();
  const list = $('healthFlags');
  if (list) {
    list.innerHTML = '';
    (h.indicators || ['No persistent abnormal load pattern detected']).slice(0, 6).forEach(flag => {
      const li = document.createElement('li');
      li.textContent = flag;
      list.appendChild(li);
    });
  }
  if ($('healthRecommendation')) $('healthRecommendation').textContent = h.recommendation || 'Continue monitoring.';
  const top = $('health');
  if (top) {
    top.textContent = '● HEALTH ' + level;
    top.className = level === 'DANGER' ? 'health-danger' : level === 'WARNING' ? 'health-warning' : 'health-safe';
  }
}

function updateSensorInterface(source = 'DATASET / PLAYBACK') {
  const el = $('sensorStatus');
  if (!el) return;
  const text = String(source || 'SENSOR INTERFACE READY').toUpperCase();
  el.textContent = text;
  el.className = text.includes('LIVE') ? 'sensor-live' : text.includes('SIMULATED') ? 'sensor-sim' : 'sensor-ready';
}

function toast(msg, isError = false) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.className = 'toast', 4500);
}

function showError(msg) {
  const b = $('errorBanner');
  if (b) {
    b.textContent = '⚠ ' + msg;
    b.classList.add('show');
  }
  toast(msg, true);
}

function clearError() {
  const b = $('errorBanner');
  if (b) b.classList.remove('show');
}

function log(msg) {
  const c = $('console');
  if (!c) return;
  const p = document.createElement('p');
  p.textContent = new Date().toLocaleTimeString() + '  ' + msg;
  c.appendChild(p);
  c.scrollTop = c.scrollHeight;
}

function stage(n) {
  document.querySelectorAll('.stages span').forEach((e, i) => e.classList.toggle('done', i <= n));
}

function setWheel(p, raw, equalized, bad) {
  const el = $('w' + p);
  if (!el) return;
  const rawEl = el.querySelector('.rawValue');
  const eqEl = el.querySelector('.eqValue');
  if (rawEl) rawEl.textContent = fmt(raw) + ' kg';
  if (eqEl) eqEl.textContent = 'EQ ' + fmt(equalized) + ' kg';
  el.classList.toggle('abnormal', bad);
  el.classList.toggle('good', !bad);
  const stateEl = el.querySelector('.wheelState');
  if (stateEl) {
    stateEl.textContent = bad ? 'RED · REVIEW' : 'GREEN · OK';
    stateEl.classList.toggle('red', bad);
    stateEl.classList.toggle('green', !bad);
  }

  const m = $('m' + p);
  if (m) {
    m.textContent = fmt(equalized) + ' kg';
    const cell = m.parentElement;
    if (cell) {
      cell.classList.toggle('eq-good', !bad);
      cell.classList.toggle('eq-bad', bad);
    }
  }
  const eq = $('eq' + p);
  if (eq) {
    eq.textContent = fmt(equalized) + ' kg';
    const cell = eq.parentElement;
    if (cell) {
      cell.classList.toggle('eq-good', !bad);
      cell.classList.toggle('eq-bad', bad);
    }
  }
}

function cgDirection(x, y) {
  const horizontal = Math.abs(x) < 0.015 ? 'CENTRE' : x > 0 ? 'RIGHT' : 'LEFT';
  const vertical = Math.abs(y) < 0.015 ? 'BALANCED' : y > 0 ? 'FRONT' : 'REAR';
  if (horizontal === 'CENTRE' && vertical === 'BALANCED') return 'BALANCED';
  return vertical + ' / ' + horizontal;
}

function update(r, post = false) {
  const vals = post ? r.equalized : r.raw;
  const alerts = post ? r.post_alerts : r.pre_alerts;

  POS.forEach(p => setWheel(p, r.raw[p], r.equalized[p], alerts.includes(p)));

  $('total').textContent = fmt(r.total) + ' kg';
  $('avg').textContent = fmt(r.average) + ' kg';
  $('front').textContent = fmt(r.front_axle) + ' kg';
  $('rear').textContent = fmt(r.rear_axle) + ' kg';
  $('left').textContent = fmt(r.left_side) + ' kg';
  $('right').textContent = fmt(r.right_side) + ' kg';

  // During pre-screening the live engineering values show RAW.
  // After equalization they show the EQ values.
  POS.forEach(p => {
    const m = $('m' + p);
    if (m) m.textContent = fmt(vals[p]) + ' kg';
  });

  const s = post ? r.post_status : r.pre_status;
  const rowHealth = String(r.health_risk_level || s || 'SAFE').toUpperCase();
  $('status').textContent = s;
  $('statusMessage').textContent = post
    ? (r.post_alerts.length
      ? 'Post-equalization alert: ' + r.post_alerts.join(', ')
      : 'Equalization complete — all monitored positions are within the configured screening range.')
    : (r.pre_alerts.length
      ? 'Pre-equalization alert: ' + r.pre_alerts.join(', ')
      : 'Pre-equalization screening is within the configured range.');

  const statusBar = document.querySelector('.statusBar');
  if (statusBar) statusBar.className = 'statusBar ' + s.toLowerCase();
  if ($('health')) { $('health').textContent = '● HEALTH ' + rowHealth; $('health').className = rowHealth === 'DANGER' ? 'health-danger' : rowHealth === 'WARNING' ? 'health-warning' : 'health-safe'; }
  document.querySelectorAll('.wheelBox').forEach(el => el.classList.remove('state-green','state-red'));
  POS.forEach(p => { const el = $('w' + p); if (el) el.classList.add(alerts.includes(p) ? 'state-red' : 'state-green'); });

  // CG is based on the displayed state: raw before equalization, equalized after.
  const cgX = post ? r.cg_x : r.raw_cg_x;
  const cgY = post ? r.cg_y : r.raw_cg_y;
  const cg = $('cg');
  if (cg) {
    cg.style.left = (50 + cgX * 22) + '%';
    cg.style.top = (50 - cgY * 22) + '%';
  }
  if ($('cgPosition')) $('cgPosition').textContent = `X ${fmt(cgX)} · Y ${fmt(cgY)}`;
  if ($('cgDirection')) $('cgDirection').textContent = cgDirection(cgX, cgY);
  if ($('eqStatus')) $('eqStatus').textContent = post ? 'ACTIVE' : 'READY';
  updateTwinEqualizedStrip(r);

  document.body.classList.toggle('alert-active', alerts.length > 0);

  // Keep the Three.js digital twin synchronized with the same analyzed row.
  if (window.HydroDigitalTwin?.isReady()) {
    window.HydroDigitalTwin.update({
      row_index: r.index,
      wheel_load_kg: r.raw,
      equalized_load_kg: r.equalized,
      total_load_kg: r.total,
      cg_x: cgX,
      cg_y: cgY,
      alerts,
      anomaly_detected: alerts.length > 0,
      source: 'hydrolevel-playback'
    });
  }
}

function clearCharts() {
  document.querySelectorAll('.chartCard canvas').forEach(c => {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const d = c.getBoundingClientRect();
    const w = Math.max(520, d.width || 520);
    c.width = w;
    c.height = 280;
    ctx.clearRect(0, 0, w, 280);
    ctx.fillStyle = '#5d747a';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for completed monitoring rows…', w / 2, 140);
  });
  const box = $('g3d');
  if (box) box.innerHTML = '<div class="graphEmpty">Waiting for completed monitoring rows…</div>';
}

function drawCanvas(id, series, labels) {
  const c = $(id);
  if (!c) return;
  const d = c.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const w = Math.max(520, d.width || 520);
  const h = 280;
  c.width = w * ratio;
  c.height = h * ratio;
  const x = c.getContext('2d');
  x.setTransform(ratio, 0, 0, ratio, 0, 0);
  x.clearRect(0, 0, w, h);

  const flat = series.flat();
  const max = Math.max(...flat, 1);
  const min = Math.min(...flat, 0);
  const range = max - min || 1;
  const pad = { l: 58, r: 18, t: 20, b: 40 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  x.strokeStyle = '#24464d';
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(pad.l, pad.t);
  x.lineTo(pad.l, h - pad.b);
  x.lineTo(w - pad.r, h - pad.b);
  x.stroke();

  for (let g = 0; g < 5; g++) {
    const yy = pad.t + g * plotH / 4;
    x.strokeStyle = '#10282e';
    x.beginPath();
    x.moveTo(pad.l, yy);
    x.lineTo(w - pad.r, yy);
    x.stroke();
    x.fillStyle = '#6e858b';
    x.font = '10px Segoe UI';
    x.textAlign = 'left';
    x.fillText((max - (max - min) * g / 4).toFixed(0), 5, yy + 3);
  }

  const colors = ['#00e5ff', '#39ff88', '#ffc857', '#ff4055'];
  series.forEach((arr, j) => {
    x.strokeStyle = colors[j % colors.length];
    x.lineWidth = 2.6;
    x.shadowColor = colors[j % colors.length];
    x.shadowBlur = 5;
    x.beginPath();
    arr.forEach((v, i) => {
      const px = pad.l + (i / Math.max(arr.length - 1, 1)) * plotW;
      const py = h - pad.b - ((v - min) / range) * plotH;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.stroke();
    x.shadowBlur = 0;
  });

  if (labels) {
    let lx = pad.l;
    labels.forEach((lab, j) => {
      x.fillStyle = colors[j % colors.length];
      x.fillRect(lx, h - 17, 12, 2);
      x.fillStyle = '#8fa5aa';
      x.font = '10px Segoe UI';
      x.textAlign = 'left';
      x.fillText(lab, lx + 16, h - 13);
      lx += Math.max(70, lab.length * 7 + 28);
    });
  }
}

function drawBarChart(id, values, labels) {
  const c = $(id);
  if (!c) return;
  const d = c.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const w = Math.max(520, d.width || 520);
  const h = 280;
  c.width = w * ratio;
  c.height = h * ratio;
  const x = c.getContext('2d');
  x.setTransform(ratio, 0, 0, ratio, 0, 0);
  x.clearRect(0, 0, w, h);

  const pad = { l: 52, r: 18, t: 20, b: 48 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const max = Math.max(...values, 1);
  x.strokeStyle = '#24464d';
  x.beginPath();
  x.moveTo(pad.l, pad.t);
  x.lineTo(pad.l, h - pad.b);
  x.lineTo(w - pad.r, h - pad.b);
  x.stroke();

  values.forEach((v, i) => {
    const bw = plotW / values.length * .58;
    const px = pad.l + (i + .5) * plotW / values.length - bw / 2;
    const ph = v / max * plotH;
    x.fillStyle = ['#00e5ff', '#39ff88', '#ffc857', '#ff4055'][i % 4];
    x.fillRect(px, h - pad.b - ph, bw, ph);
    x.fillStyle = '#d9ebee';
    x.font = '11px Segoe UI';
    x.textAlign = 'center';
    x.fillText(String(v), px + bw / 2, h - pad.b - ph - 7);
    x.fillStyle = '#8fa5aa';
    x.fillText(labels[i], px + bw / 2, h - pad.b + 20);
  });
}

function getGraphRows() {
  // Shared server state is authoritative. Every tab sees the same completed rows.
  return rows.slice(0, Math.max(0, completedCount));
}

function drawGraphs() {
  const rs = getGraphRows();
  if (!rs.length) {
    clearCharts();
    if ($('graphRowInfo')) $('graphRowInfo').textContent = 'Rows plotted: 0';
    return;
  }

  const threshold = Number($('threshold')?.value || HC.defaultThresholdKg);
  drawCanvas('gTrend', POS.map(p => rs.map(r => r.raw[p])), POS);
  drawCanvas('gForce', POS.map(p => rs.map(r => r.raw[p] * HC.forceConversion)), POS);
  drawCanvas('gTotal', [rs.map(r => r.total)], ['TOTAL LOAD']);
  drawCanvas('gAxle', [rs.map(r => r.front_axle), rs.map(r => r.rear_axle)], ['FRONT AXLE', 'REAR AXLE']);
  drawCanvas('gSide', [rs.map(r => r.left_side), rs.map(r => r.right_side)], ['LEFT', 'RIGHT']);
  drawCanvas('gDev', [rs.map(r => Math.max(...POS.map(p => Math.abs(r.deviations[p]))))], ['MAX |DEVIATION|']);
  drawBarChart('gEvents', POS.map(p => rs.filter(r => r.pre_alerts.includes(p)).length), POS);
  drawCanvas('gEq', [rs.map(r => Math.max(...POS.map(p => Math.abs(r.equalized[p] - r.raw[p]))))], ['MAX ADJUSTMENT']);
  drawCanvas('gDist', [rs.map(r => r.front_pct), rs.map(r => r.rear_pct), rs.map(r => r.left_pct), rs.map(r => r.right_pct)], ['FRONT %', 'REAR %', 'LEFT %', 'RIGHT %']);
  drawCanvas('gStatus', [rs.map(r => ({ SAFE: 0, WARNING: 1, DANGER: 2 }[r.post_status] || 0))], ['SAFE=0 WARNING=1 DANGER=2']);
  drawCanvas('gHealth', [rs.map(r => Number(r.health_risk_score || 0))], ['HEALTH RISK 0–100']);
  drawCanvas('gEqTrend', POS.map(p => rs.map(r => r.equalized[p])), POS);

  const box = $('g3d');
  if (box) {
    box.innerHTML = '';
    const n = Math.min(rs.length, 100);
    const max = Math.max(...rs.slice(0, n).flatMap(r => POS.map(p => r.raw[p])), 1);
    for (let i = 0; i < n; i++) {
      POS.forEach((p, j) => {
        const b = document.createElement('i');
        b.className = 'bar3d';
        b.title = `Row ${rs[i].index} · ${p} · ${fmt(rs[i].raw[p])} kg`;
        b.style.left = (2 + i / Math.max(n, 1) * 94 + j * .45) + '%';
        b.style.height = (18 + rs[i].raw[p] / max * 260) + 'px';
        b.style.bottom = (25 + j * 6) + 'px';
        box.appendChild(b);
      });
    }
  }

  if ($('graphRowInfo')) $('graphRowInfo').textContent = `Rows plotted: ${rs.length} completed`;
}

function updateInsuranceReview() {
  const sm = processed?.summary || {};
  const review = sm.insurance_review || processed?.insurance_review || {};
  const rowsCount = Number(sm.rows || rows.length || 0);
  const rate = Number(review.post_abnormal_rate_percent ?? sm.post_abnormal_rate_percent ?? 0);
  const ready = rowsCount >= HC.minimumExportRows;
  const screen = review.engineering_screening || (sm.post_abnormal_rows === 0 ? 'WITHIN CONFIGURED RANGE' : 'ANOMALIES REQUIRE REVIEW');
  if ($('insRows')) $('insRows').textContent = rowsCount;
  if ($('insRate')) $('insRate').textContent = rate.toFixed(1) + '%';
  if ($('insScreen')) { $('insScreen').textContent = screen; $('insScreen').className = screen === 'WITHIN CONFIGURED RANGE' ? 'greenText' : 'redText'; }
  if ($('insPayout')) { $('insPayout').textContent = review.payout_decision || 'ENGINEERING SCREENING ONLY'; $('insPayout').className = Number(sm.post_abnormal_rows || 0) === 0 ? 'statusSafe' : 'neutralText'; }
  if ($('insuranceStatus')) { $('insuranceStatus').textContent = ready ? 'REVIEWABLE' : 'WAITING FOR 20 ROWS'; $('insuranceStatus').className = ready ? 'greenText' : 'redText'; }
  if ($('insNote')) $('insNote').textContent = ready
    ? 'Full completed dataset analyzed. A SAFE result means no configured load anomaly was detected. HydroLevel supplies engineering evidence only; coverage and monetary payout are decided by the authorized insurer.'
    : `At least ${HC.minimumExportRows} completed rows are required before a full dataset review can be shown.`;
}

function updateReportGate() {
  const validated = rows.length;
  const completed = completedCount;
  const ok = completed >= HC.minimumExportRows;

  if ($('reportValidated')) $('reportValidated').textContent = validated;
  if ($('reportCompleted')) $('reportCompleted').textContent = completed;
  if ($('reportRows')) $('reportRows').textContent = completed;

  if ($('gateTitle')) $('gateTitle').textContent = ok ? 'REPORT READY' : 'REPORT BLOCKED';
  if ($('gateText')) {
    $('gateText').textContent = ok
      ? `${completed} completed rows confirmed. Exactly ${completed} rows will be exported.`
      : `Only ${completed} completed rows. Minimum ${HC.minimumExportRows} completed rows are required.`;
  }

  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.disabled = !ok;
    btn.title = ok
      ? `Export exactly ${completed} completed rows`
      : `Locked until ${HC.minimumExportRows} completed rows`;
  });
}

async function importData() {
  clearError();
  running = false;
  completedCount = 0;
  currentRowIndex = -1;

  const f = $('file').files[0];
  if (!f) {
    showError('NO DATASET SELECTED\nChoose CSV, XLSX or XLS containing FL, FR, RL and RR.');
    return;
  }

  const fd = new FormData();
  fd.append('file', f);
  fd.append('threshold', $('threshold').value);
  fd.append('blend', $('blend').value);
  $('fileStatus').textContent = 'READING ' + f.name + '…';
  $('import').disabled = true;

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: fd, cache: 'no-store' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Dataset validation failed.');

    processed = d;
    rows = d.results || [];
    completedCount = 0;
    $('row').textContent = `0 / ${rows.length}`;
    $('progress').style.width = '0%';
    $('fileStatus').textContent = `${d.count} valid / ${d.source_rows} source rows`;
    $('mode').textContent = 'DATASET READY';
    $('phase').textContent = 'WAITING';
    $('status').textContent = 'WAITING';
    $('statusMessage').textContent = 'Dataset loaded. Press START MONITORING.';
    $('aiInsight').textContent = d.ai_overall || 'Dataset ready.';
    updateHealthPanel(d.summary?.health || d.processed?.summary?.health);
    updateSensorInterface('DATASET / PLAYBACK');
    updateReportGate();
    drawGraphs();

    if (d.count < HC.minimumExportRows) {
      showError(`DATASET TOO SMALL — ${d.count} valid rows\nHydroLevel requires at least ${HC.minimumExportRows} completed valid rows for reporting.`);
    } else if (d.validation_errors?.length) {
      toast(`${d.validation_errors.length} invalid row(s) skipped. ${d.count} valid rows remain.`);
    } else {
      toast(`Excel/CSV imported successfully — ${d.count} valid rows ready.`);
    }
  } catch (e) {
    $('fileStatus').textContent = 'IMPORT ERROR';
    showError(e.message);
  } finally {
    $('import').disabled = false;
  }
}

async function loadSample() {
  clearError();
  $('fileStatus').textContent = 'DOWNLOADING 500-ROW DEMO…';
  try {
    const res = await fetch('/api/sample', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to load the bundled 500-row demo dataset.');
    const blob = await res.blob();
    const file = new File([blob], 'hydrolevel_demo_500.csv', { type: 'text/csv' });
    const dt = new DataTransfer();
    dt.items.add(file);
    $('file').files = dt.files;
    await importData();
  } catch (e) {
    showError(e.message);
  }
}

async function start() {
  clearError();
  const localMissing = getMissingVehicleFields();
  if (localMissing.length) {
    updateVehicleGate(false, localMissing);
    openVehicleProfile();
    showError('START BLOCKED — complete and save Vehicle Profile first: ' + localMissing.map(vehicleFieldLabel).join(', '));
    return;
  }
  try {
    const res = await fetch('/api/start', {method:'POST', cache:'no-store'});
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Unable to start monitoring.');
    running = true;
    $('start').textContent = 'MONITORING ACTIVE';
    $('start').classList.add('active');
    $('mode').textContent = 'PLAYBACK';
    toast('Monitoring started. All browser tabs share this run.');
    await pollState();
  } catch (e) {
    showError(e.message);
  }
}

async function stopMonitoring() {
  try { await fetch('/api/stop', {method:'POST', cache:'no-store'}); } catch (_) {}
}

function renderSharedState(d) {
  if (!d) return;
  if (d.processed) {
    processed = d.processed;
    rows = d.processed.results || d.completed_rows || [];
  }
  completedCount = Number(d.completed_count || 0);
  currentRowIndex = Number(d.current_index ?? -1);
  running = !!d.running;

  const total = Number(d.valid_count || rows.length || 0);
  const currentNumber = Number(d.current_row_number || 0);
  if ($('row')) $('row').textContent = `${currentNumber} / ${total}`;
  if ($('progress')) $('progress').style.width = total ? `${Math.min(100, currentNumber / total * 100)}%` : '0%';
  if ($('reportValidated')) $('reportValidated').textContent = total;
  if ($('fileStatus') && total) $('fileStatus').textContent = `${total} valid / ${Number(d.source_rows || total)} source rows`;
  if ($('mode')) $('mode').textContent = running ? 'PLAYBACK' : (d.phase === 'DATASET COMPLETE' ? 'COMPLETE' : 'SYSTEM READY');
  if ($('phase')) $('phase').textContent = d.phase || 'WAITING';

  if (d.row) {
    update(d.row, true);
    if ($('aiInsight')) $('aiInsight').textContent = d.row.ai || '';
    if ($('aiTitle')) $('aiTitle').textContent = `ROW ${d.current_row_number} / ${d.row.post_status || ''}`;
  }

  updateHealthPanel(processed?.summary?.health);
  updateSensorInterface(d.row ? 'DATASET / PLAYBACK' : 'SENSOR INTERFACE READY');
  updateReportGate();
  updateInsuranceReview();
  if ($('graphRowInfo')) $('graphRowInfo').textContent = `Rows plotted: ${completedCount}`;

  if (!window._lastGraphCount || window._lastGraphCount !== completedCount) {
    window._lastGraphCount = completedCount;
    drawGraphs();
  }

  if (d.error) showError(d.error);
  if (!running) {
    $('start').textContent = d.phase === 'DATASET COMPLETE' ? 'RESTART MONITORING' : 'START MONITORING';
    $('start').classList.remove('active');
  }
}

async function pollState() {
  try {
    const res = await fetch('/api/state', {cache:'no-store'});
    const d = await res.json();
    if (res.ok) renderSharedState(d);
  } catch (e) {
    // Keep the UI alive if the server briefly restarts.
  }
}

async function exportReport(kind) {
  // Server state is authoritative. No browser tab is allowed to manufacture
  // a completed-row count.
  await pollState();
  if (completedCount < HC.minimumExportRows) {
    showError(`EXPORT BLOCKED\n${completedCount} completed rows available. Minimum ${HC.minimumExportRows} completed rows are required.`);
    return;
  }

  try {
    toast(`Generating ${kind.toUpperCase()} from exactly ${completedCount} completed rows…`);
    const res = await fetch('/api/export/' + kind, {method:'POST', cache:'no-store'});
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Export failed.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = kind === 'pdf' ? 'pdf' : kind === 'xlsx' ? 'xlsx' : kind === 'csv' ? 'csv' : 'json';
    a.download = `HydroLevel_${kind}_Report_${completedCount}_completed_rows.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${kind.toUpperCase()} export complete — ${completedCount} rows included.`);
  } catch (e) {
    showError(e.message);
  }
}

async function ask() {
  if (!rows.length || currentRowIndex < 0) {
    $('answer').textContent = 'Start monitoring and complete at least one row first.';
    return;
  }
  const r = rows[Math.max(0, Math.min(rows.length - 1, currentRowIndex))];
  try {
    const res = await fetch('/api/hydroai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: $('question').value, row: r }),
      cache: 'no-store'
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'HydroAI request failed.');
    $('answer').textContent = d.answer || 'No answer returned.';
  } catch (e) {
    $('answer').textContent = e.message;
  }
}

const REQUIRED_VEHICLE_FIELDS = ['vehicle_id','make_model','registration_number','chassis_number','test_date','test_location','gvw_kg','front_axle_rating_kg','rear_axle_rating_kg','payload_kg','wheelbase_mm','tyre_size','operator'];

function vehicleFieldLabel(key) {
  const labels = {vehicle_id:'Vehicle ID',make_model:'Make / Model',registration_number:'Registration',chassis_number:'Chassis No.',test_date:'Test Date',test_location:'Test Location',gvw_kg:'GVW',front_axle_rating_kg:'Front Axle Rating',rear_axle_rating_kg:'Rear Axle Rating',payload_kg:'Payload',wheelbase_mm:'Wheelbase',tyre_size:'Tyre Size',operator:'Operator'};
  return labels[key] || key;
}

function getMissingVehicleFields() {
  return REQUIRED_VEHICLE_FIELDS.filter(key => {
    const input = $(key);
    const value = input ? String(input.value || '').trim() : '';
    return !value || ['not specified','none','null','n/a'].includes(value.toLowerCase());
  });
}

function updateVehicleGate(serverComplete = null, serverMissing = null) {
  const missing = Array.isArray(serverMissing) ? serverMissing : getMissingVehicleFields();
  const complete = serverComplete === true || (serverComplete === null && missing.length === 0);
  const badge = $('vehicleCompletion');
  const note = $('vehicleMissing');
  const nav = document.querySelector('.vehicleNav');
  const startBtn = $('start');
  if (badge) { badge.textContent = complete ? 'PROFILE COMPLETE' : 'PROFILE INCOMPLETE'; badge.classList.toggle('complete', complete); badge.classList.toggle('incomplete', !complete); }
  if (nav) nav.classList.toggle('complete', complete);
  if (note) {
    note.classList.toggle('complete', complete);
    note.textContent = complete ? 'Vehicle profile saved. Monitoring is unlocked.' : 'Required: ' + missing.map(vehicleFieldLabel).join(', ');
  }
  if (startBtn) {
    startBtn.disabled = !complete;
    startBtn.title = complete ? 'Vehicle profile complete — monitoring can start.' : 'Complete and save the Vehicle Profile first.';
  }
  return complete;
}

function openVehicleProfile() {
  const b = document.querySelector('.vehicleNav');
  if (b) b.click();
}

async function loadVehicleDetails() {
  try {
    const res = await fetch('/api/vehicle-details', { cache: 'no-store' });
    if (!res.ok) return;
    const d = await res.json();
    Object.keys(d).forEach(key => {
      const input = $(key);
      if (input && typeof d[key] !== 'object') input.value = d[key] ?? '';
    });
    updateVehicleGate(d.complete === true, d.missing_fields || getMissingVehicleFields());
    if ($('vehicleStatus')) $('vehicleStatus').textContent = d.complete ? 'SAVED · READY FOR MONITORING' : 'PROFILE NOT COMPLETE';
    if (!d.complete) openVehicleProfile();
  } catch (_) {
    updateVehicleGate();
  }
}

async function saveVehicleDetails() {
  const keys = REQUIRED_VEHICLE_FIELDS;
  const data = {};
  keys.forEach(key => { const input = $(key); if (input) data[key] = input.value.trim(); });
  const localMissing = getMissingVehicleFields();
  if (localMissing.length) {
    updateVehicleGate(false, localMissing);
    showError('VEHICLE PROFILE INCOMPLETE — ' + localMissing.map(vehicleFieldLabel).join(', '));
    return;
  }
  try {
    const res = await fetch('/api/vehicle-details', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), cache:'no-store' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Could not save vehicle details.');
    updateVehicleGate(d.complete === true, d.missing_fields || []);
    if ($('vehicleStatus')) $('vehicleStatus').textContent = d.complete ? 'SAVED · REPORT WILL USE THESE DETAILS' : 'PROFILE NOT COMPLETE';
    toast('Vehicle profile saved. Monitoring is now unlocked.');
  } catch (e) {
    if ($('vehicleStatus')) $('vehicleStatus').textContent = 'SAVE ERROR';
    showError(e.message);
  }
}

function updateTwinEqualizedStrip(r) {
  const eq = r?.equalized || {};
  POS.forEach(p => {
    const el = $('twinEq' + p);
    if (el) el.textContent = eq[p] == null ? '—' : fmt(eq[p]) + ' kg';
  });
}

function tabs() {
  document.querySelectorAll('.navBtn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.navBtn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    $('tab-' + b.dataset.tab).classList.add('active');
    $('pageTitle').textContent = b.textContent;
    drawGraphs();
  });
}

async function loadSessionUser() {
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (!res.ok) return;
    const d = await res.json();
    const el = $('userGreeting');
    if (el && d.username) el.textContent = 'HI ' + String(d.username).toUpperCase();
  } catch (_) {}
}

function hideBoot() {
  const boot = $('boot');
  if (!boot) return;
  boot.classList.add('done');
  setTimeout(() => boot.style.display = 'none', 900);
}

window.addEventListener('error', e => {
  if (e.message) showError('FRONTEND ERROR\n' + e.message);
});

window.addEventListener('load', () => {
  setTimeout(hideBoot, 900);
  setTimeout(hideBoot, 3000);
  document.body.classList.add('prestart');
  tabs();
  updateReportGate();
  updateVehicleGate();
  updateHealthPanel({risk_score:0,risk_level:'SAFE',history_rows:0,alert_rate_percent:0,indicators:['Import historical vehicle data to begin health screening.'],recommendation:'No validated history available.',trend:{deviation_direction:'stable/decreasing'}});
  updateSensorInterface('SENSOR INTERFACE READY');
  clearCharts();

  $('sample').onclick = loadSample;
  $('import').onclick = importData;
  $('start').onclick = start;
  $('ask').onclick = ask;
  if ($('saveVehicle')) $('saveVehicle').onclick = saveVehicleDetails;
  if ($('goMonitoring')) $('goMonitoring').onclick = () => {
    if (getMissingVehicleFields().length) { openVehicleProfile(); showError('Complete and save the Vehicle Profile before monitoring.'); return; }
    const monitor = document.querySelector('.navBtn[data-tab=\"monitor\"]');
    if (monitor) monitor.click();
  };
  REQUIRED_VEHICLE_FIELDS.forEach(key => { const input = $(key); if (input) input.addEventListener('input', () => updateVehicleGate()); });
  if ($('logout')) $('logout').onclick = async () => { try { await fetch('/api/logout',{method:'POST'}); } finally { location.href='/login'; } };
  loadSessionUser();
  loadVehicleDetails();
  document.querySelectorAll('[data-export]').forEach(b => {
    b.disabled = true;
    b.onclick = () => exportReport(b.dataset.export);
  });
  window.addEventListener('resize', () => {
    if (completedCount > 0) drawGraphs();
  });
  pollState();
  clearInterval(window._statePoll);
  window._statePoll = setInterval(pollState, 500);
});

// Apply editable frontend defaults after the DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
  const C = window.HYDROLEVEL_CONFIG?.analysis;
  if (!C) return;
  if ($('threshold')) $('threshold').value = C.defaultThresholdKg;
  if ($('blend')) $('blend').value = String(C.defaultBlend);
});

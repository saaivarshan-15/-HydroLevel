# HydroLevel — AI-Powered Vehicle Load Intelligence & Digital Twin

**Team Volts and Bolts** | Prasunethon 2.0 — Round 2 Submission
**Version:** V7.0 (Vehicle Health Intelligence + Sensor-Ready Telemetry)

> "Don't just measure the load. Understand what the load is doing to the vehicle."

---

## 1. Problem

A vehicle can stay within its total permissible load while that load is distributed
unevenly across the four wheel positions (FL / FR / RL / RR) — hiding a risk that a
single total-weight reading can never reveal. HydroLevel makes that hidden
distribution visible, understandable, and actionable.

## 2. What HydroLevel Does

- **Monitors** four-point vehicle load data through the current Excel/CSV playback pipeline and a sensor-ready JSON telemetry interface for future ESP32/HX711 connection.
- **Analyses** total, average, deviation, and equalized reference values per wheel.
- **Visualizes** the vehicle as a Digital Twin (FL/FR/RL/RR + centre of gravity),
  with CG shifting live toward the higher-load side.
- **Detects** abnormal loading per wheel position independently using the configurable ±10 kg project screening threshold.
- **Screens vehicle health** from historical rows using repeated overloads, persistence and deviation trends to produce an explainable 0–100 early-risk indicator (rule-based, not a trained ML failure probability).
- **Interprets** results in plain language via HydroAI ("Which side is overloaded?").
- **Reports** a structured engineering export (PDF / Excel / CSV / JSON), gated at a
  minimum of 20 completed rows to keep exports statistically meaningful, including vehicle-health screening metrics.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Python 3, Flask, Flask-CORS |
| Data | pandas, openpyxl, xlrd (CSV/XLSX/XLS import) |
| Reporting | ReportLab (PDF), matplotlib (graphs) |
| Hardware interface | ESP32/HX711 JSON telemetry contract ready; physical load cells/IMU/GPS/OBD-CAN integration is next phase |

## 4. Project Status — What's Actually Built vs. Planned

| Component | Status |
|---|---|
| Dashboard, Digital Twin, CG tracking | ✅ Working |
| Excel/CSV import + row playback | ✅ Working |
| Equalization + engineering analysis | ✅ Working |
| Report export (PDF/Excel/CSV/JSON), 20-row gate | ✅ Working |
| HydroAI + vehicle-health risk screening | ✅ Working (transparent rule-based early-warning engine; not a trained ML failure model) |
| Login / session handling | ✅ Working (local prototype auth) |
| Insurance Review Support panel | ✅ Working — engineering evidence only; does **not** approve/deny claims |
| ESP32/HX711 telemetry interface | ✅ API contract ready; 🔜 physical sensor connection / calibration |
| IMU / GPS / OBD-CAN | 🔜 Phase 4 |
| Field validation with known loads | 🔜 Phase 5 |

## 5. Running Locally

```bash
pip install -r requirements.txt
python backend/app.py
```

Then open **http://127.0.0.1:5050**.

**Import formats accepted:** `.csv`, `.xlsx`, `.xls` — with columns such as
`FL`, `FR`, `RL`, `RR` (or `FL (kg)` etc.).

**Report rule:** fewer than 20 completed rows blocks export; at 20+, the
report contains exactly that many completed rows (never in-progress rows).

## 6. Repository Structure

```
backend/
  app.py                  API server, import handling, session/auth
  config.py               Server + vehicle metadata defaults
  services/analysis.py    Load equalization, CG, deviation calculations
  services/digital_twin.py Digital Twin state model
  services/hydroai.py     Rule-based insight/answer engine
  reports/reporting.py    PDF/Excel/CSV report + chart generation
frontend/
  index.html, login.html, dashboard.html
  css/, js/
data/sample/              500-row demo dataset
docs/                     Flow diagrams, Digital Twin, hardware integration contract, graph spec, sample report preview
```

## 7. Security & Scalability Notes

- Current auth is a local-prototype session login — suitable for a single
  demo/pilot deployment, not yet multi-tenant.
- Server holds shared in-memory state (`STATE` dict) per process, so all
  browser tabs agree on row counts; a database layer is the natural next
  step for multi-vehicle / multi-user scale.
- Recommended before production use: per-vehicle data isolation, a real
  secret-key management strategy (currently a placeholder in `config.py`),
  and input validation hardening on the importer.

## 8. Roadmap

**Done:** Dashboard, 4-point data model, Excel import, load analysis, Digital
Twin, engineering report.
**In progress:** HydroAI health intelligence, historical trend analysis and event/risk scoring.
**Next:** Physical hardware connection/calibration (Phase 3), real-time vehicle telemetry (Phase 4), field validation (Phase 5), fleet-scale platform (Phase 6, vision).

## 9. Demo

A recorded walkthrough (import → playback → equalization → Digital Twin CG →
HydroAI → report export) is included as `demo_video` alongside this
submission. Sample dataset: `data/sample/hydrolevel_demo_500.csv`.

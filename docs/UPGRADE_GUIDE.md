# HydroLevel — Editable / Upgradeable Architecture

This project is intentionally split into frontend, backend services, reporting,
data and documentation. Do **not** put the whole application into one HTML file.

## 1. Change normal project settings

Edit:

`frontend/js/config.js`

You can safely change:

- HydroLevel name/tagline/version
- logo paths
- demo values
- threshold
- 50% / 80% equalization blends
- minimum export rows
- row playback duration
- team member names
- roles
- phone numbers
- email addresses
- LinkedIn URLs
- team member photos

The UI reads these settings without changing the analysis engine.

## 2. Change engineering calculations

Edit:

`backend/services/analysis.py`

This is the single source of truth for:

- total load
- arithmetic reference / average
- deviation
- equalization
- front/rear axle load
- left/right load
- distribution percentages
- status screening
- CG coordinates
- row validation

Keep raw values separate from calculated/equalized values.

## 3. Change HydroAI behaviour

Edit:

`backend/services/hydroai.py`

Keep HydroAI grounded in the row/result object. Do not hard-code fake sensor results.

## 4. Change PDF/Excel/CSV report structure

Edit:

`backend/reports/reporting.py`

Charts are generated before the PDF so the same analysis package can be exported.

## 5. Add a new graph

1. Add a calculation/series in `backend/reports/reporting.py` if it requires a new derived metric.
2. Add the chart to `generate_charts()`.
3. Add the chart to `build_pdf()`.
4. Add a corresponding dashboard canvas in `frontend/dashboard.html`.
5. Add its renderer in `frontend/js/dashboard.js`.
6. Update `docs/GRAPH_SPEC.md`.

## 6. Add a new hardware input later

Do not modify FL/FR/RL/RR logic directly. Add a separate field in the incoming packet/API and extend validation deliberately.

Example future fields:

- timestamp
- vehicle_id
- speed
- payload
- wheelbase
- track_width
- IMU values
- GPS values

## 7. Replace the Digital Twin later

Current assets are ordinary image assets for reliable local deployment. You can later replace them with:

- SVG engineering drawings
- Three.js model
- GLB/GLTF vehicle
- WebGL Digital Twin

The analysis API should remain unchanged. The new renderer only consumes the existing result object.

## 8. Important rule

**Frontend = presentation. Backend = calculations. Reports = export. Data = datasets. Config = editable settings.**

This separation makes HydroLevel easier to upgrade for ESP32/live sensors, databases,
real AI APIs and a production Digital Twin later.

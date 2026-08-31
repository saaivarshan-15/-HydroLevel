HYDROLEVEL V3 — SHARED STATE BUILD

IMPORTANT: The earlier problem was caused by each browser tab keeping its own JavaScript playback state. That meant one tab could show ROW 34 while another showed COMPLETED 0.

This build moves dataset/playback/completed-row state into the Flask backend. All tabs now read the same state.

RUN
1. Extract the ZIP.
2. Open the HydroLevel folder.
3. Double-click RUN_THIS_FIRST.bat.
4. Open http://127.0.0.1:5050
5. You can open Monitoring, Analytics and Reports in separate tabs; they share the same run.

WORKFLOW
Import Excel/CSV -> Validate -> Start Monitoring -> Equalize -> mark row complete -> next row.

REPORT
19 completed = BLOCKED.
20 completed = READY.
If 37 rows are completed, every export contains exactly 37 rows.

DIGITAL TWIN
No vehicle image. Only FL, FR, RL, RR load boxes and CG.

EQUALIZATION
The raw red wheel remains flagged while equalization is processed. The equalized value is then shown in the dashboard. If the post-equalization value is within the configured screening range, the wheel becomes GREEN before the next row begins.

EXCEL
CSV, XLSX and XLS are supported. The importer searches sheets and the first 15 header rows for FL/FR/RL/RR, including names such as FL (kg), FR Load, etc.

EDITABLE
frontend/js/config.js       UI/project settings
frontend/dashboard.html     page structure
frontend/css/dashboard.css  styling
frontend/js/dashboard.js    dashboard/polling/graphs
backend/services/analysis.py engineering calculations
backend/app.py              API + shared playback state
backend/reports/reporting.py PDF/Excel/CSV reports

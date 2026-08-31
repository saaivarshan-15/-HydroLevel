HYDROLEVEL V5 — EDITABLE BUILD

This build keeps the engineering pipeline intact and makes the visual status system obvious:
GREEN = within configured screening range / equalized OK
RED = requires review / outside configured screening range
AMBER = warning

Team images are local assets under frontend/assets and are referenced as /assets/<filename>.
If you edit colours, use frontend/css/dashboard.css.
If you edit calculations, use backend/services/analysis.py.
If you edit report generation, use backend/reports/reporting.py.
If you edit team details, use frontend/js/config.js.

Report export remains server-gated: fewer than 20 completed rows cannot export.
Export uses only the completed rows, never all imported rows.


V5 UPDATE — LOGIN + VEHICLE DETAILS + DIGITAL TWIN EQUALIZATION
===============================================================
1. Open http://127.0.0.1:5050 and choose LAUNCH PLATFORM.
2. Login defaults are username: admin / password: hydrolevel.
3. Change LOGIN_USERNAME and LOGIN_PASSWORD in backend/config.py if needed.
4. After login, the dashboard contains an editable VEHICLE DETAILS panel.
5. Click SAVE VEHICLE DETAILS. The values are saved to data/vehicle_details.json and are included in new PDF/XLSX exports.
6. The Digital Twin load map now shows an always-visible EQUALIZED LOAD strip for FL/FR/RL/RR in addition to the EQ value inside every wheel card.
7. Equalized values remain calculated by backend/services/analysis.py; this update only makes the values explicit in the Digital Twin UI.

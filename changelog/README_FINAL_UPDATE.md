# HydroLevel V5 Final Completed Update

## Fixed in this build

- Excel export no longer fails when the summary contains the Insurance Review dictionary.
- Export remains locked until 20 completed rows.
- Exports contain exactly the completed rows, not the full imported dataset.
- XLSX contains Raw Data, Processed Data, Events, Insurance Review, Vehicle Details and Validation Errors sheets.
- PDF includes vehicle/test details, import/validation log, raw + equalized row data, engineering graphs, HydroAI insight and the team appendix at the end.
- Team group photo and individual team photos are placed at the end of the PDF.
- Equalized FL/FR/RL/RR values are explicitly included in the dashboard and report.
- Red/green wheel state is driven by post-equalization screening: a wheel is green only when its equalized deviation is within the configured threshold; otherwise it remains red for review.
- Landing page uses the configured individual `photo` field.

## Editable vehicle metadata

Edit `backend/config.py` -> `VEHICLE_DETAILS` for vehicle ID, vehicle type, test type and measurement metadata.

## Editable engineering logic

Edit `backend/services/analysis.py` for calculations.

## Editable dashboard behavior

Edit `frontend/js/dashboard.js` for state and display behavior.

## Editable visual design

Edit `frontend/css/dashboard.css` for colors, layout and animations.

## Editable report

Edit `backend/reports/reporting.py` for PDF/XLSX/CSV report content.

## Run

Create/activate a virtual environment, install `requirements.txt`, then run:

`python backend\\app.py`

Open the Flask URL printed by the terminal. Do not use Live Server for this backend-driven build.

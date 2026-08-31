# HydroLevel — Insurance Review Support

HydroLevel can be demonstrated as an engineering evidence platform that analyzes a completed wheel-load dataset and prepares information for an insurance review workflow.

## What it does
- Reads FL / FR / RL / RR measurements.
- Calculates total, axle, side, distribution, deviation, equalization and estimated CG shift.
- Uses the configured screening threshold.
- Shows **RED** when a wheel remains outside the configured screening range.
- Shows **GREEN** when the wheel is within the configured screening range after equalization.
- Requires at least 20 completed rows for the full report.
- Analyzes the complete completed dataset at the end.
- Adds an Insurance Review Support section to the dashboard and exported report.

## Important scope
The insurance section is **not an actual insurance underwriting, claim approval, claim denial or payout engine**. It reports engineering evidence and screening results. A real insurer must apply policy terms, claim evidence, vehicle documentation, applicable procedures and authorized human review.

## Editable locations
- `frontend/js/config.js` — branding, team, demo values, thresholds and labels.
- `backend/services/analysis.py` — engineering calculations and screening logic.
- `backend/services/hydroai.py` — engineering language/insight rules.
- `frontend/js/dashboard.js` — dashboard behavior and red/green state presentation.
- `frontend/css/dashboard.css` — colors and visual styling.
- `backend/reports/reporting.py` — PDF/Excel/CSV report content.
- `frontend/assets/` — project/team logos and member photos.

## Team photos
The previous landing-page issue was caused by `landing.js` reading `member.image` while the configuration stores the field as `photo`. This build uses `member.photo` and has a fallback image if an individual photo cannot load.

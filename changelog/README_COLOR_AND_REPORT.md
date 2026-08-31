# HydroLevel — Color + Report Complete Build

This build keeps the project modular and editable. The visual layer, dashboard state logic, engineering calculations, digital twin, and report generator remain in separate files.

## Color behavior

- **GREEN** = OK / equalized value is inside the configured screening range.
- **RED** = engineering alert / wheel requires review.
- **AMBER** = warning state.
- Status dots and wheel cards use a controlled color pulse so the current state is easy to notice.
- The page itself does not flash or change the whole screen.
- The Three.js digital twin uses the same red/green state mapping.

## Report format

The PDF export contains:

1. HydroLevel cover/header with project branding.
2. Dataset summary and configured threshold/blend.
3. Team group photograph.
4. Executive engineering summary.
5. Insurance Review Support section.
6. Team responsibilities and individual photographs.
7. Row-by-row engineering analysis.
8. Graph package generated from the same completed rows.
9. HydroAI engineering insight and engineering note.
10. Page numbers and report footer.

## Insurance boundary

HydroLevel provides engineering evidence and screening only. The report explicitly keeps payout decisions outside the system and requires authorized human/insurer review.

## Edit these files when you want changes

- `frontend/css/dashboard.css` — colors, spacing, animations, layout.
- `frontend/dashboard.html` — dashboard structure and report page sections.
- `frontend/js/dashboard.js` — row playback, status display, graphs and export UI.
- `frontend/js/digital-twin.js` — 3D vehicle and digital-twin state colors.
- `frontend/js/config.js` — editable defaults.
- `backend/services/analysis.py` — engineering calculations and screening rules.
- `backend/reports/reporting.py` — PDF, Excel and CSV report formatting.
- `backend/config.py` — server settings and playback defaults.

The code uses ordinary functions, clear names, and comments around the parts intended for future upgrades.

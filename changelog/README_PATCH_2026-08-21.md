# HydroLevel V6 — Login + Insurance Report Patch

This patch intentionally preserves the existing landing page and Digital Twin design.

## Login
- `/login` remains the required entry point.
- `/dashboard` redirects to `/login` when the session is not authenticated.
- The operator may choose any non-empty username and password for the local session.
- The dashboard greeting becomes `HI <USERNAME>`.
- No hard-coded username/password is required.

## Insurance report
The report now uses insurance-support language:
- SAFE: `PASS — NO SIGNIFICANT LOAD ANOMALY DETECTED`
- WARNING: `REVIEW — LOAD ANOMALY DETECTED`
- DANGER: `ALERT — SIGNIFICANT LOAD ANOMALY DETECTED`
- Payout decision: `INSURER DECISION REQUIRED`

HydroLevel remains an engineering screening/evidence system and does not make the final insurance payout decision.

## Graph verification
The report generator produces all 12 graph files from the same completed rows used by the dashboard:
1. Four-Wheel Load Trend
2. Force vs Time
3. Total Vehicle Load
4. Front vs Rear Axle Load
5. Left vs Right Load Distribution
6. Load Imbalance / Deviation
7. Pre-Equalization Alert Frequency
8. Equalization Adjustment Magnitude
9. 3D Time × Node × Load Distribution
10. Equalized Four-Wheel Trend
11. Overall Load Distribution Percentages
12. Post-Equalization Status Timeline

A 20-row SAFE dataset was used to verify that all 12 charts generate successfully and that the PDF/XLSX report builds successfully.

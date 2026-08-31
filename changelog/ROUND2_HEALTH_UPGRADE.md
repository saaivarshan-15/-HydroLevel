# HydroLevel V7.0 — Vehicle Health Intelligence Upgrade

Implemented to align the software with the Omnikon National Hackathon 2026 concept deck.

## Added
- Explainable vehicle-health risk screening from historical load rows.
- 0–100 health-risk score with SAFE / WARNING / DANGER levels.
- Repeated overload and persistence indicators per wheel.
- Historical deviation trend analysis.
- Early-warning recommendation.
- Health-risk timeline in analytics.
- Vehicle-health section in engineering PDF and Excel outputs.
- Server `/api/health-summary` endpoint.
- Sensor-ready JSON telemetry contract via `/api/twin/telemetry`.
- Digital Twin health fields and sensor-interface status.
- Hardware integration documentation for Load Cells → HX711 → ESP32.
- Core analysis unit tests.

## Honesty boundary
The current submission remains dataset/playback based unless physical ESP32/HX711 hardware is connected. The health engine is rule-based and explainable; it is not a trained ML model or a certified vehicle-failure predictor. The ±10 kg value is a project screening threshold and requires field validation before production safety use.

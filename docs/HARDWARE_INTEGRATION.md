# HydroLevel Hardware Integration Contract

HydroLevel is prepared for a physical four-point sensor layer. The current Round-2 software remains dataset-playback based unless a real ESP32 telemetry device is connected.

## Hardware architecture

4 × Load Cells (FL/FR/RL/RR)
→ HX711 amplifiers
→ ESP32
→ Wi-Fi / HTTP JSON
→ `/api/twin/telemetry`
→ HydroLevel Digital Twin + Health Intelligence

Optional future telemetry:
- IMU: vehicle orientation
- GPS: location and movement
- OBD/CAN: vehicle-state data

## Telemetry contract

POST JSON to `/api/twin/telemetry` after authentication:

```json
{
  "wheel_load_kg": {
    "FL": 410.2,
    "FR": 402.8,
    "RL": 365.4,
    "RR": 372.1
  },
  "speed": 32.5,
  "rpm": 1850,
  "temp": 88.0,
  "timestamp": "2026-08-23T08:00:00",
  "source": "esp32-hx711"
}
```

The endpoint updates the server-side Digital Twin. Load-risk analysis remains governed by the configured project threshold and the same FL/FR/RL/RR analysis pipeline.

## Validation and safety

Before physical deployment:
1. Calibrate each load cell at zero and known reference loads.
2. Filter/average noisy readings.
3. Reject missing, non-finite and negative values.
4. Compare repeated readings for sensor drift.
5. Validate the ±10 kg project screening threshold against known loads and manufacturer specifications.
6. Never treat the software screening result as a substitute for certified vehicle safety inspection.

The software architecture intentionally separates sensor ingestion from engineering analysis so the data source can change without changing the Digital Twin contract.

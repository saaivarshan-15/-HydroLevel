# HydroLevel Digital Twin

## Architecture

The digital twin is split into two small layers:

1. `backend/services/digital_twin.py` — server-side state model.
2. `frontend/js/digital-twin.js` — Three.js renderer and GSAP camera transitions.

The existing HydroLevel analysis engine remains the source of truth for FL, FR, RL, RR, equalized values, status and CG.

## Current playback

When a playback row reaches the final analysis stage, the backend sends the same analyzed row into `VehicleDigitalTwin`. The browser then renders:

- four wheel nodes: FL / FR / RL / RR
- raw and equalized load values
- estimated CG position
- normal / equalized / alert node state
- top / front / side / isometric camera views

## Future live telemetry

The API accepts JSON at `POST /api/twin/telemetry`. Example payload:

```json
{
  "speed": 42,
  "rpm": 1850,
  "temp": 92,
  "wheel_load_kg": {"FL": 220, "FR": 230, "RL": 240, "RR": 220}
}
```

The state is available from `GET /api/twin/state`. This contract is intentionally simple so MQTT, Kafka, Node-RED or another ingestion service can be connected later.

## Frontend libraries

The dashboard loads Three.js and GSAP from CDN. If Three.js is unavailable, the page falls back to a lightweight CSS load-map representation instead of becoming blank.

React-Bits is not forced into the existing Flask/vanilla-JS architecture because converting the complete application to React would replace working routes and state handling. The landing-page interaction layer follows the same component/interaction philosophy while keeping the current application editable and stable.

## Safe upgrade points

- Change 3D geometry: `frontend/js/digital-twin.js` → `createVehicle()`
- Change camera views: `frontend/js/digital-twin.js` → `views`
- Change visual colours: `frontend/js/digital-twin.js` → `COLORS` and `frontend/css/dashboard.css`
- Change state calculations: `backend/services/analysis.py`
- Change server twin contract: `backend/services/digital_twin.py`
- Change report generation: `backend/reports/reporting.py`
- Change frontend defaults: `frontend/js/config.js`

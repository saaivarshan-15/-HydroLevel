"""HydroLevel digital-twin state model.

This module is deliberately small and dependency-free so it can be replaced by
an MQTT/Kafka/IoT ingestion layer later without changing the UI contract.
"""
from __future__ import annotations

import json
from copy import deepcopy
from typing import Any, Dict


WHEELS = ("FL", "FR", "RL", "RR")


class VehicleDigitalTwin:
    """Server-side state for one HydroLevel vehicle twin."""

    def __init__(self, vehicle_id: str = "HYDRO-DEMO-01") -> None:
        self.vehicle_id = vehicle_id
        self.state: Dict[str, Any] = {
            "vehicle_id": vehicle_id,
            "timestamp": None,
            "row_index": 0,
            "speed_kmh": 0.0,
            "engine_rpm": 0,
            "engine_temp_c": 90.0,
            "tire_pressure_psi": {w.lower(): 32.0 for w in WHEELS},
            "wheel_load_kg": {w: 0.0 for w in WHEELS},
            "equalized_load_kg": {w: 0.0 for w in WHEELS},
            "total_load_kg": 0.0,
            "front_axle_kg": 0.0,
            "rear_axle_kg": 0.0,
            "left_side_kg": 0.0,
            "right_side_kg": 0.0,
            "cg_x": 0.0,
            "cg_y": 0.0,
            "status": "IDLE",
            "anomaly_detected": False,
            "alerts": [],
            "source": "demo",
            "sensor_interface": "READY",
            "sensor_protocol": "JSON / ESP32-ready telemetry",
            "health_risk_score": 0.0,
            "health_risk_level": "SAFE",
            "health_flags": [],
            "health_recommendation": "No validated history available.",
        }

    def update_telemetry(self, raw_data: str | Dict[str, Any]) -> Dict[str, Any]:
        """Merge a telemetry payload into the current twin state.

        Accepted payloads can contain the HydroLevel wheel loads (FL/FR/RL/RR)
        plus optional vehicle telemetry such as speed, rpm and temperature.
        """
        if isinstance(raw_data, str):
            payload = json.loads(raw_data)
        else:
            payload = dict(raw_data)

        loads = payload.get("wheel_load_kg") or payload.get("loads")
        if loads:
            for wheel in WHEELS:
                if wheel in loads:
                    self.state["wheel_load_kg"][wheel] = float(loads[wheel])

        eq = payload.get("equalized_load_kg") or payload.get("equalized")
        if eq:
            for wheel in WHEELS:
                if wheel in eq:
                    self.state["equalized_load_kg"][wheel] = float(eq[wheel])

        for key, source_key in (
            ("speed_kmh", "speed"),
            ("engine_rpm", "rpm"),
            ("engine_temp_c", "temp"),
        ):
            if source_key in payload:
                self.state[key] = float(payload[source_key])

        if "row_index" in payload:
            self.state["row_index"] = int(payload["row_index"])
        if "timestamp" in payload:
            self.state["timestamp"] = payload["timestamp"]
        if "source" in payload:
            self.state["source"] = str(payload["source"])
        if "status" in payload:
            self.state["status"] = str(payload["status"])
        if "alerts" in payload:
            self.state["alerts"] = list(payload["alerts"] or [])
        if "cg_x" in payload:
            self.state["cg_x"] = float(payload["cg_x"])
        if "cg_y" in payload:
            self.state["cg_y"] = float(payload["cg_y"])
        if "tire_pressure_psi" in payload:
            self.state["tire_pressure_psi"].update(payload["tire_pressure_psi"])

        self._recalculate()
        return self.get_state()

    def update_from_analysis(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Update the twin from a HydroLevel analyzed row."""
        return self.update_telemetry({
            "row_index": row.get("index", 0),
            "wheel_load_kg": row.get("raw", {}),
            "equalized_load_kg": row.get("equalized", {}),
            "source": "hydrolevel-playback",
            "cg_x": row.get("cg_x", 0.0),
            "cg_y": row.get("cg_y", 0.0),
            "status": row.get("post_status", "SAFE"),
            "alerts": row.get("post_alerts", []),
            "health_risk_score": row.get("health_risk_score", 0.0),
            "health_risk_level": row.get("health_risk_level", row.get("post_status", "SAFE")),
            "health_flags": row.get("health_flags", []),
            "health_recommendation": row.get("health_recommendation", "Continue monitoring."),
        })

    def _recalculate(self) -> None:
        loads = self.state["wheel_load_kg"]
        total = sum(float(loads[w]) for w in WHEELS)
        self.state["total_load_kg"] = total
        self.state["front_axle_kg"] = loads["FL"] + loads["FR"]
        self.state["rear_axle_kg"] = loads["RL"] + loads["RR"]
        self.state["left_side_kg"] = loads["FL"] + loads["RL"]
        self.state["right_side_kg"] = loads["FR"] + loads["RR"]

        if total:
            self.state["cg_x"] = (self.state["right_side_kg"] - self.state["left_side_kg"]) / total
            self.state["cg_y"] = (self.state["front_axle_kg"] - self.state["rear_axle_kg"]) / total

        alerts = list(self.state.get("alerts", []))
        anomaly = bool(alerts) or self.state["engine_temp_c"] > 110.0
        self.state["anomaly_detected"] = anomaly
        if alerts:
            self.state["status"] = "DANGER"
        elif total:
            self.state["status"] = "SAFE"
        else:
            self.state["status"] = "IDLE"

    def get_state(self) -> Dict[str, Any]:
        return deepcopy(self.state)

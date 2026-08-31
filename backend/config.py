"""HydroLevel backend configuration.

Edit this file to change server-side defaults without touching analysis logic.
Keep engineering formulas in services/analysis.py so the calculation engine
remains independently testable and upgradeable.
"""

APP_NAME = "HydroLevel"
APP_VERSION = "V6.1-LOGIN-INSURANCE-GRAPHS-2026.08.21"
HOST = "127.0.0.1"
PORT = 5050

# Local prototype login is session-based. The operator chooses credentials on the login page.
SESSION_SECRET = "hydrolevel-local-secret-change-me"

DEFAULT_THRESHOLD_KG = 10.0
DEFAULT_BLEND = 0.50
STRONG_BLEND = 0.80
MINIMUM_EXPORT_ROWS = 20
PLAYBACK_MS_PER_ROW = 6000
FORCE_CONVERSION = 9.80665
POSITIONS = ("FL", "FR", "RL", "RR")

# Branding / project metadata used by report generation and future APIs.
PROJECT_STATUS = "Prototype / Academic Engineering Project"
TEAM_NAME = "Team Volts and Bolts"
PROJECT_NAME = "HydroLevel"

# Editable vehicle/test metadata. These values appear in the exported report.
# Replace them with the actual vehicle information when the test vehicle is fixed.
VEHICLE_DETAILS = {
    "vehicle_id": "HYDROLEVEL-TEST-001",
    "vehicle_type": "Vehicle Load Test / Digital Twin Prototype",
    "make_model": "Not specified",
    "registration_number": "Not specified",
    "chassis_number": "Not specified",
    "test_date": "Not specified",
    "test_location": "Not specified",
    "gvw_kg": "Not specified",
    "front_axle_rating_kg": "Not specified",
    "rear_axle_rating_kg": "Not specified",
    "payload_kg": "Not specified",
    "wheelbase_mm": "Not specified",
    "tyre_size": "Not specified",
    "operator": "Team Volts and Bolts",
    "test_type": "Four-wheel static load distribution analysis",
    "measurement_points": "FL / FR / RL / RR",
    "load_unit": "kg",
    "force_unit": "N",
    "data_source": "Imported CSV/XLSX/XLS or bundled demo dataset",
    "note": "Edit this block for vehicle-specific information."
}

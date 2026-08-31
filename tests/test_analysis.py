import unittest

from services.analysis import analyze_dataset, validate_rows


class HydroLevelAnalysisTests(unittest.TestCase):
    def test_validation_rejects_negative_and_missing_values(self):
        rows, errors = validate_rows([
            {"FL": 100, "FR": 100, "RL": 100, "RR": -1},
            {"FL": 100, "FR": 100, "RL": 100},
        ])
        self.assertEqual(len(rows), 0)
        self.assertEqual(len(errors), 2)

    def test_threshold_status_and_health_fields(self):
        data = [
            {"FL": 100, "FR": 100, "RL": 100, "RR": 100},
            {"FL": 130, "FR": 100, "RL": 100, "RR": 100},
            {"FL": 130, "FR": 100, "RL": 100, "RR": 100},
            {"FL": 130, "FR": 100, "RL": 100, "RR": 100},
        ]
        result = analyze_dataset(data, threshold=10, blend=0.5)
        self.assertEqual(result["count"], 4)
        self.assertIn(result["results"][1]["post_status"], {"WARNING", "DANGER"})
        self.assertIn(result["summary"]["health"]["risk_level"], {"SAFE", "WARNING", "DANGER"})
        self.assertIn("health_risk_score", result["results"][1])

    def test_report_gate(self):
        data = [{"FL": 100, "FR": 100, "RL": 100, "RR": 100}] * 19
        result = analyze_dataset(data)
        self.assertFalse(result["summary"]["report_allowed"])

        data = [{"FL": 100, "FR": 100, "RL": 100, "RR": 100}] * 20
        result = analyze_dataset(data)
        self.assertTrue(result["summary"]["report_allowed"])


if __name__ == "__main__":
    unittest.main()

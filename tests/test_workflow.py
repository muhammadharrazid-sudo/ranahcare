"""Focused tests for workflow routing, safety checks, and booking consistency."""

import os
import tempfile
import unittest
from pathlib import Path

from app.database import create_reservation, initialize_database, list_schedules
from app.safety import extract_symptoms, find_emergency_sign
from app.workflow import workflow


class WorkflowTests(unittest.TestCase):
    """Verify routing and appointment behavior without external model keys."""

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["DATABASE_PATH"] = str(Path(self.temp_dir.name) / "test.db")
        initialize_database()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()
        os.environ.pop("DATABASE_PATH", None)

    def test_triage_gathers_context_across_turns(self) -> None:
        first = workflow.invoke(
            {"message": "Saya demam", "context": {}, "allow_ai": False}
        )
        self.assertEqual(first["intent"], "triage")
        self.assertIn("sajak bilo", first["reply"])

        second = workflow.invoke(
            {
                "message": "Sudah dua hari",
                "context": first["context"],
                "allow_ai": False,
            }
        )
        self.assertIn("Sakiknyo ringan", second["reply"])

        third = workflow.invoke(
            {
                "message": "Ringan",
                "context": second["context"],
                "allow_ai": False,
            }
        )
        self.assertTrue(third["triage"]["human_review_required"])
        self.assertEqual(third["triage"]["symptoms"], ["demam"])
        self.assertEqual(third["context"]["mode"], "completed")

    def test_emergency_sign_overrides_routine_triage(self) -> None:
        result = workflow.invoke(
            {
                "message": "Saya mengalami nyeri dada berat",
                "context": {},
                "allow_ai": False,
            }
        )
        self.assertEqual(result["triage"]["urgency"], "darurat")
        self.assertIn("Jangan menunggu", result["reply"])
        self.assertEqual(find_emergency_sign("nyeri dada berat"), "nyeri dada berat")
        self.assertIsNone(find_emergency_sign("tidak ada nyeri dada"))
        self.assertNotIn("nyeri_dada", extract_symptoms("tidak nyeri dada"))

    def test_schedule_and_booking_use_same_database_slot(self) -> None:
        slots = list_schedules("umum", limit=1)
        self.assertEqual(len(slots), 1)
        slot = slots[0]
        booking = create_reservation(
            {
                "schedule_id": slot["id"],
                "service": slot["service"],
                "starts_at": slot["starts_at"],
                "patient_name": "Pasien Demo",
                "phone": "081234567890",
                "complaint": "",
            }
        )
        self.assertEqual(booking["queue_number"], 1)
        remaining = list_schedules("umum", limit=1)[0]["available"]
        self.assertEqual(remaining, slot["capacity"] - 1)


if __name__ == "__main__":
    unittest.main()

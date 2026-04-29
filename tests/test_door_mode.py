import unittest
from datetime import datetime

from app.database import DoorControlSettings
from app.services.door_mode import (
    MODE_FIRST_SCAN_HOLD,
    MODE_NORMAL,
    SCHEDULE_PHASE_HELD_OPEN,
    SCHEDULE_PHASE_INACTIVE,
    SCHEDULE_PHASE_LOCKED_WINDOW,
    SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN,
    evaluate_schedule,
    validate_schedule_config,
)
from app.timezone import APP_TIMEZONE


class DoorModeTests(unittest.TestCase):
    def make_settings(self, **overrides):
        defaults = {
            "id": 1,
            "access_mode": MODE_FIRST_SCAN_HOLD,
            "daily_lock_time": "22:00",
            "first_unlock_time": "09:00",
            "schedule_hold_date": None,
            "schedule_hold_started_at": None,
        }
        defaults.update(overrides)
        return DoorControlSettings(**defaults)

    def test_validate_schedule_uses_defaults(self):
        daily_lock_time, first_unlock_time = validate_schedule_config(None, None)
        self.assertEqual(daily_lock_time, "22:00")
        self.assertEqual(first_unlock_time, "09:00")

    def test_validate_schedule_rejects_reversed_range(self):
        with self.assertRaises(ValueError):
            validate_schedule_config("09:00", "22:00")

    def test_normal_mode_is_inactive(self):
        settings = self.make_settings(access_mode=MODE_NORMAL)
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_INACTIVE)

    def test_schedule_before_first_unlock_stays_locked(self):
        settings = self.make_settings()
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 8, 30, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_LOCKED_WINDOW)

    def test_schedule_waits_for_first_scan_after_unlock_time(self):
        settings = self.make_settings()
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 9, 15, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN)

    def test_schedule_marks_day_as_held_open_after_first_scan(self):
        settings = self.make_settings(schedule_hold_date="2026-04-29")
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_HELD_OPEN)

    def test_schedule_clears_hold_after_daily_lock_time(self):
        settings = self.make_settings(schedule_hold_date="2026-04-29")
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 22, 30, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_LOCKED_WINDOW)
        self.assertTrue(evaluation.should_clear_hold)


if __name__ == "__main__":
    unittest.main()

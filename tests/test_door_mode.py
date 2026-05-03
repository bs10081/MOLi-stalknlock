import unittest
from datetime import datetime
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, DoorControlSettings
from app.services.door_mode import (
    ACCESS_DECISION_ACTIVATE_HOLD,
    ACCESS_DECISION_DENY,
    ACCESS_DECISION_TIMED_UNLOCK,
    MODE_FIRST_SCAN_FLEX,
    MODE_FIRST_SCAN_HOLD,
    MODE_NORMAL,
    SCHEDULE_PHASE_HELD_OPEN,
    SCHEDULE_PHASE_INACTIVE,
    SCHEDULE_PHASE_OUTSIDE_SCHEDULE,
    SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN,
    can_defer_mode_switch,
    evaluate_schedule,
    get_card_access_decision,
    normalize_weekday_mode_overrides,
    resolve_effective_access_mode,
    serialize_door_settings,
    serialize_weekday_mode_overrides,
    sync_door_hardware_state,
    validate_schedule_config,
)
from app.timezone import APP_TIMEZONE


class DoorModeTests(unittest.TestCase):
    def make_settings(self, **overrides):
        defaults = {
            "id": 1,
            "access_mode": MODE_FIRST_SCAN_HOLD,
            "pending_access_mode": None,
            "weekday_mode_overrides": serialize_weekday_mode_overrides(None),
            "pending_weekday_mode_overrides": None,
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
        self.assertEqual(evaluation.effective_access_mode, MODE_NORMAL)

    def test_weekday_override_resolves_today_mode_and_source(self):
        weekday_mode_overrides = serialize_weekday_mode_overrides({
            "mon": None,
            "tue": None,
            "wed": MODE_FIRST_SCAN_HOLD,
            "thu": None,
            "fri": None,
            "sat": None,
            "sun": None,
        })
        settings = self.make_settings(
            access_mode=MODE_NORMAL,
            weekday_mode_overrides=weekday_mode_overrides,
        )

        wednesday_resolution = resolve_effective_access_mode(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        thursday_resolution = resolve_effective_access_mode(
            settings,
            datetime(2026, 4, 30, 10, 0, tzinfo=APP_TIMEZONE),
        )

        self.assertEqual(wednesday_resolution.access_mode, MODE_FIRST_SCAN_HOLD)
        self.assertEqual(wednesday_resolution.active_mode_source, "weekday_override")
        self.assertEqual(thursday_resolution.access_mode, MODE_NORMAL)
        self.assertEqual(thursday_resolution.active_mode_source, "default")

    def test_schedule_waits_for_first_scan_on_override_day(self):
        settings = self.make_settings(
            access_mode=MODE_NORMAL,
            weekday_mode_overrides=serialize_weekday_mode_overrides({
                "mon": None,
                "tue": None,
                "wed": MODE_FIRST_SCAN_FLEX,
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
            }),
        )
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 9, 15, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN)
        self.assertEqual(evaluation.effective_access_mode, MODE_FIRST_SCAN_FLEX)
        self.assertEqual(evaluation.active_mode_source, "weekday_override")

    def test_schedule_marks_day_as_held_open_after_first_scan_on_override_day(self):
        settings = self.make_settings(
            access_mode=MODE_NORMAL,
            weekday_mode_overrides=serialize_weekday_mode_overrides({
                "mon": None,
                "tue": None,
                "wed": MODE_FIRST_SCAN_FLEX,
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
            }),
            schedule_hold_date="2026-04-29",
        )
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_HELD_OPEN)
        self.assertEqual(evaluation.effective_access_mode, MODE_FIRST_SCAN_FLEX)

    def test_schedule_clears_hold_after_daily_lock_time(self):
        settings = self.make_settings(schedule_hold_date="2026-04-29")
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 22, 30, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_OUTSIDE_SCHEDULE)
        self.assertTrue(evaluation.should_clear_hold)

    def test_non_today_override_falls_back_to_default_mode(self):
        settings = self.make_settings(
            access_mode=MODE_NORMAL,
            weekday_mode_overrides=serialize_weekday_mode_overrides({
                "mon": None,
                "tue": None,
                "wed": None,
                "thu": MODE_FIRST_SCAN_HOLD,
                "fri": None,
                "sat": None,
                "sun": None,
            }),
        )
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        self.assertEqual(evaluation.phase, SCHEDULE_PHASE_INACTIVE)
        self.assertEqual(evaluation.effective_access_mode, MODE_NORMAL)
        self.assertEqual(evaluation.active_mode_source, "default")

    def test_access_decision_strict_outside_schedule_denies(self):
        self.assertEqual(
            get_card_access_decision(MODE_FIRST_SCAN_HOLD, SCHEDULE_PHASE_OUTSIDE_SCHEDULE),
            ACCESS_DECISION_DENY,
        )

    def test_access_decision_flex_outside_schedule_uses_timed_unlock(self):
        self.assertEqual(
            get_card_access_decision(MODE_FIRST_SCAN_FLEX, SCHEDULE_PHASE_OUTSIDE_SCHEDULE),
            ACCESS_DECISION_TIMED_UNLOCK,
        )

    def test_access_decision_schedule_modes_activate_hold_during_waiting_phase(self):
        self.assertEqual(
            get_card_access_decision(MODE_FIRST_SCAN_HOLD, SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN),
            ACCESS_DECISION_ACTIVATE_HOLD,
        )
        self.assertEqual(
            get_card_access_decision(MODE_FIRST_SCAN_FLEX, SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN),
            ACCESS_DECISION_ACTIVATE_HOLD,
        )

    def test_can_defer_mode_switch_requires_held_open_schedule_modes_without_time_changes(self):
        self.assertTrue(
            can_defer_mode_switch(
                MODE_FIRST_SCAN_HOLD,
                MODE_FIRST_SCAN_FLEX,
                SCHEDULE_PHASE_HELD_OPEN,
                "22:00",
                "09:00",
                "22:00",
                "09:00",
            )
        )
        self.assertFalse(
            can_defer_mode_switch(
                MODE_NORMAL,
                MODE_FIRST_SCAN_FLEX,
                SCHEDULE_PHASE_HELD_OPEN,
                "22:00",
                "09:00",
                "22:00",
                "09:00",
            )
        )
        self.assertFalse(
            can_defer_mode_switch(
                MODE_FIRST_SCAN_HOLD,
                MODE_FIRST_SCAN_FLEX,
                SCHEDULE_PHASE_HELD_OPEN,
                "22:00",
                "09:00",
                "21:30",
                "09:00",
            )
        )

    def test_normalize_weekday_mode_overrides_rejects_invalid_shapes(self):
        invalid_payloads = [
            {"mon": MODE_NORMAL},
            {
                "mon": MODE_NORMAL,
                "tue": None,
                "wed": None,
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
                "holiday": MODE_FIRST_SCAN_HOLD,
            },
            {
                "mon": MODE_NORMAL,
                "tue": None,
                "wed": "invalid_mode",
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
            },
            ["mon", MODE_NORMAL],
        ]

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    normalize_weekday_mode_overrides(payload)

    def test_serialize_door_settings_returns_effective_and_default_mode_fields(self):
        settings = self.make_settings(
            access_mode=MODE_NORMAL,
            pending_access_mode=MODE_NORMAL,
            weekday_mode_overrides=serialize_weekday_mode_overrides({
                "mon": None,
                "tue": None,
                "wed": MODE_FIRST_SCAN_HOLD,
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
            }),
            pending_weekday_mode_overrides=serialize_weekday_mode_overrides({
                "mon": None,
                "tue": None,
                "wed": MODE_FIRST_SCAN_FLEX,
                "thu": None,
                "fri": None,
                "sat": None,
                "sun": None,
            }),
        )
        evaluation = evaluate_schedule(
            settings,
            datetime(2026, 4, 29, 10, 0, tzinfo=APP_TIMEZONE),
        )
        payload = serialize_door_settings(settings, evaluation)

        self.assertEqual(payload["access_mode"], MODE_FIRST_SCAN_HOLD)
        self.assertEqual(payload["default_access_mode"], MODE_NORMAL)
        self.assertEqual(payload["active_mode_source"], "weekday_override")
        self.assertEqual(payload["weekday_mode_overrides"]["wed"], MODE_FIRST_SCAN_HOLD)
        self.assertEqual(payload["pending_weekday_mode_overrides"]["wed"], MODE_FIRST_SCAN_FLEX)

    def test_sync_applies_pending_weekday_override_after_daily_lock(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        Base.metadata.create_all(bind=engine)
        session = TestingSession()

        try:
            session.add(self.make_settings(
                access_mode=MODE_NORMAL,
                pending_access_mode=MODE_NORMAL,
                weekday_mode_overrides=serialize_weekday_mode_overrides({
                    "mon": None,
                    "tue": None,
                    "wed": MODE_FIRST_SCAN_HOLD,
                    "thu": None,
                    "fri": None,
                    "sat": None,
                    "sun": None,
                }),
                pending_weekday_mode_overrides=serialize_weekday_mode_overrides({
                    "mon": None,
                    "tue": None,
                    "wed": MODE_FIRST_SCAN_FLEX,
                    "thu": None,
                    "fri": None,
                    "sat": None,
                    "sun": None,
                }),
                schedule_hold_date="2026-04-29",
            ))
            session.commit()

            with patch(
                "app.services.door_mode.now_app_timezone",
                return_value=datetime(2026, 4, 29, 22, 30, tzinfo=APP_TIMEZONE),
            ), patch(
                "app.services.door_mode.get_lock_runtime_status",
                return_value={"door_state": "held_open"},
            ), patch("app.services.door_mode.force_lock") as force_lock:
                settings, evaluation, sync_result = sync_door_hardware_state(session)

            self.assertEqual(
                normalize_weekday_mode_overrides(settings.weekday_mode_overrides)["wed"],
                MODE_FIRST_SCAN_FLEX,
            )
            self.assertIsNone(settings.pending_access_mode)
            self.assertIsNone(settings.pending_weekday_mode_overrides)
            self.assertIsNone(settings.schedule_hold_date)
            self.assertEqual(evaluation.phase, SCHEDULE_PHASE_OUTSIDE_SCHEDULE)
            self.assertEqual(evaluation.effective_access_mode, MODE_FIRST_SCAN_FLEX)
            self.assertTrue(sync_result["cleared_schedule_hold"])
            self.assertEqual(sync_result["applied_pending_mode"], MODE_FIRST_SCAN_FLEX)
            force_lock.assert_called_once()
        finally:
            session.close()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()

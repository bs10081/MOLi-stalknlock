import unittest
from datetime import datetime

from app.timezone import app_time_to_utc_naive, serialize_datetime


class TimezoneTests(unittest.TestCase):
    def test_serialize_datetime_treats_naive_values_as_utc(self):
        self.assertEqual(
            serialize_datetime(datetime(2026, 4, 28, 12, 27, 28)),
            "2026-04-28T20:27:28+08:00",
        )

    def test_app_time_to_utc_naive_converts_taipei_midnight_boundary(self):
        self.assertEqual(
            app_time_to_utc_naive(datetime(2026, 4, 1, 0, 0, 0)),
            datetime(2026, 3, 31, 16, 0, 0),
        )


if __name__ == "__main__":
    unittest.main()

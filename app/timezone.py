from datetime import datetime, timezone
from zoneinfo import ZoneInfo

APP_TIMEZONE_NAME = "Asia/Taipei"
APP_TIMEZONE = ZoneInfo(APP_TIMEZONE_NAME)
UTC = timezone.utc


def utcnow() -> datetime:
    """Return naive UTC for SQLite-stored runtime timestamps."""
    return datetime.now(UTC).replace(tzinfo=None)


def utcnow_aware() -> datetime:
    """Return aware UTC for in-memory runtime timestamps."""
    return datetime.now(UTC)


def now_app_timezone() -> datetime:
    """Return the current aware datetime in the app's default timezone."""
    return datetime.now(APP_TIMEZONE)


def to_app_timezone(value: datetime | None) -> datetime | None:
    """Convert a stored datetime into the app's default timezone.

    SQLite timestamps in this project are stored as naive UTC values, so naive
    inputs are treated as UTC before conversion.
    """
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)

    return value.astimezone(APP_TIMEZONE)


def serialize_datetime(value: datetime | None) -> str | None:
    localized = to_app_timezone(value)
    return localized.isoformat() if localized else None


def app_time_to_utc_naive(value: datetime) -> datetime:
    """Convert an aware local datetime into naive UTC for SQLite comparisons."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=APP_TIMEZONE)

    return value.astimezone(UTC).replace(tzinfo=None)

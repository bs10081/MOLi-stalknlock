from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time
import json
from typing import Mapping

from sqlalchemy.orm import Session

from app.database import DoorControlSettings
from app.services.gpio_control import force_lock, get_lock_runtime_status, hold_unlock
from app.timezone import app_time_to_utc_naive, now_app_timezone, serialize_datetime

MODE_NORMAL = "normal"
MODE_ALWAYS_LOCKED = "always_locked"
MODE_FIRST_SCAN_HOLD = "first_scan_hold"
MODE_FIRST_SCAN_FLEX = "first_scan_flex"

SUPPORTED_ACCESS_MODES = {
    MODE_NORMAL,
    MODE_ALWAYS_LOCKED,
    MODE_FIRST_SCAN_HOLD,
    MODE_FIRST_SCAN_FLEX,
}
SCHEDULE_ACCESS_MODES = {MODE_FIRST_SCAN_HOLD, MODE_FIRST_SCAN_FLEX}

SCHEDULE_PHASE_INACTIVE = "inactive"
SCHEDULE_PHASE_OUTSIDE_SCHEDULE = "outside_schedule"
SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN = "waiting_for_first_scan"
SCHEDULE_PHASE_HELD_OPEN = "held_open"

ACCESS_DECISION_DENY = "deny"
ACCESS_DECISION_TIMED_UNLOCK = "timed_unlock"
ACCESS_DECISION_ACTIVATE_HOLD = "activate_hold"
ACCESS_DECISION_HELD_OPEN = "held_open"

DEFAULT_DAILY_LOCK_TIME = "22:00"
DEFAULT_FIRST_UNLOCK_TIME = "09:00"

WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
WEEKDAY_LABELS = {
    "mon": "週一",
    "tue": "週二",
    "wed": "週三",
    "thu": "週四",
    "fri": "週五",
    "sat": "週六",
    "sun": "週日",
}


@dataclass(frozen=True)
class EffectiveModeResolution:
    access_mode: str
    default_access_mode: str
    weekday_key: str
    active_mode_source: str
    weekday_mode_overrides: dict[str, str | None]


@dataclass(frozen=True)
class ScheduleEvaluation:
    phase: str
    now_local: datetime
    today: str
    should_clear_hold: bool
    effective_access_mode: str
    default_access_mode: str
    weekday_key: str
    active_mode_source: str
    weekday_mode_overrides: dict[str, str | None]


def is_schedule_access_mode(access_mode: str | None) -> bool:
    return access_mode in SCHEDULE_ACCESS_MODES


def get_access_mode_label(access_mode: str | None) -> str:
    if access_mode == MODE_ALWAYS_LOCKED:
        return "永久上鎖"
    if access_mode == MODE_FIRST_SCAN_HOLD:
        return "每日首刷常開（時段外禁止刷卡）"
    if access_mode == MODE_FIRST_SCAN_FLEX:
        return "每日首刷常開（時段外一般通行）"
    return "一般通行"


def get_weekday_label(weekday_key: str) -> str:
    return WEEKDAY_LABELS.get(weekday_key, weekday_key)


def get_default_weekday_mode_overrides() -> dict[str, str | None]:
    return {key: None for key in WEEKDAY_KEYS}


def normalize_access_mode(
    access_mode: str | None,
    *,
    field_name: str = "access_mode",
    allow_none: bool = False,
) -> str | None:
    if access_mode is None:
        if allow_none:
            return None
        return MODE_NORMAL

    if access_mode not in SUPPORTED_ACCESS_MODES:
        raise ValueError(f"{field_name} 不支援的門禁模式")

    return access_mode


def normalize_weekday_mode_overrides(
    value: str | Mapping[str, str | None] | None,
    *,
    field_name: str = "weekday_mode_overrides",
) -> dict[str, str | None]:
    if value is None:
        return get_default_weekday_mode_overrides()

    if isinstance(value, str):
        normalized_value = value.strip()
        if not normalized_value:
            return get_default_weekday_mode_overrides()
        try:
            payload = json.loads(normalized_value)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{field_name} 必須是包含 mon 到 sun 的 JSON object") from exc
    elif isinstance(value, Mapping):
        payload = dict(value)
    else:
        raise ValueError(f"{field_name} 必須是包含 mon 到 sun 的 JSON object")

    if not isinstance(payload, dict):
        raise ValueError(f"{field_name} 必須是包含 mon 到 sun 的 JSON object")

    payload_keys = set(payload.keys())
    expected_keys = set(WEEKDAY_KEYS)
    if payload_keys != expected_keys:
        raise ValueError(f"{field_name} 必須完整提供 mon 到 sun 七天設定")

    normalized: dict[str, str | None] = {}
    for weekday_key in WEEKDAY_KEYS:
        mode = payload.get(weekday_key)
        if mode is None:
            normalized[weekday_key] = None
            continue

        if not isinstance(mode, str):
            raise ValueError(f"{field_name}.{weekday_key} 必須是門禁模式字串或 null")

        normalized[weekday_key] = normalize_access_mode(
            mode,
            field_name=f"{field_name}.{weekday_key}",
        )

    return normalized


def serialize_weekday_mode_overrides(value: str | Mapping[str, str | None] | None) -> str:
    normalized = normalize_weekday_mode_overrides(value)
    return json.dumps(normalized, separators=(",", ":"))


def get_weekday_key(now_local: datetime) -> str:
    return WEEKDAY_KEYS[now_local.weekday()]


def resolve_effective_access_mode(
    settings: DoorControlSettings,
    now_local: datetime | None = None,
    *,
    default_access_mode: str | None = None,
    weekday_mode_overrides: str | Mapping[str, str | None] | None = None,
) -> EffectiveModeResolution:
    now_local = now_local or now_app_timezone()
    normalized_default_access_mode = normalize_access_mode(default_access_mode or settings.access_mode) or MODE_NORMAL
    normalized_weekday_mode_overrides = normalize_weekday_mode_overrides(
        settings.weekday_mode_overrides if weekday_mode_overrides is None else weekday_mode_overrides
    )

    weekday_key = get_weekday_key(now_local)
    override_mode = normalized_weekday_mode_overrides.get(weekday_key)
    if override_mode is not None:
        return EffectiveModeResolution(
            access_mode=override_mode,
            default_access_mode=normalized_default_access_mode,
            weekday_key=weekday_key,
            active_mode_source="weekday_override",
            weekday_mode_overrides=normalized_weekday_mode_overrides,
        )

    return EffectiveModeResolution(
        access_mode=normalized_default_access_mode,
        default_access_mode=normalized_default_access_mode,
        weekday_key=weekday_key,
        active_mode_source="default",
        weekday_mode_overrides=normalized_weekday_mode_overrides,
    )


def resolve_pending_effective_access_mode(
    settings: DoorControlSettings,
    now_local: datetime | None = None,
) -> EffectiveModeResolution:
    return resolve_effective_access_mode(
        settings,
        now_local,
        default_access_mode=settings.pending_access_mode or settings.access_mode,
        weekday_mode_overrides=settings.pending_weekday_mode_overrides or settings.weekday_mode_overrides,
    )


def get_card_access_decision(access_mode: str, schedule_phase: str) -> str:
    if access_mode == MODE_ALWAYS_LOCKED:
        return ACCESS_DECISION_DENY

    if access_mode == MODE_FIRST_SCAN_HOLD:
        if schedule_phase == SCHEDULE_PHASE_OUTSIDE_SCHEDULE:
            return ACCESS_DECISION_DENY
        if schedule_phase == SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN:
            return ACCESS_DECISION_ACTIVATE_HOLD
        if schedule_phase == SCHEDULE_PHASE_HELD_OPEN:
            return ACCESS_DECISION_HELD_OPEN
        return ACCESS_DECISION_TIMED_UNLOCK

    if access_mode == MODE_FIRST_SCAN_FLEX:
        if schedule_phase == SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN:
            return ACCESS_DECISION_ACTIVATE_HOLD
        if schedule_phase == SCHEDULE_PHASE_HELD_OPEN:
            return ACCESS_DECISION_HELD_OPEN
        return ACCESS_DECISION_TIMED_UNLOCK

    return ACCESS_DECISION_TIMED_UNLOCK


def can_defer_mode_switch(
    current_access_mode: str,
    next_access_mode: str,
    schedule_phase: str,
    current_daily_lock_time: str,
    current_first_unlock_time: str,
    next_daily_lock_time: str,
    next_first_unlock_time: str,
) -> bool:
    return (
        schedule_phase == SCHEDULE_PHASE_HELD_OPEN
        and is_schedule_access_mode(current_access_mode)
        and is_schedule_access_mode(next_access_mode)
        and current_daily_lock_time == next_daily_lock_time
        and current_first_unlock_time == next_first_unlock_time
    )


def parse_time_value(value: str | None) -> time | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    parts = normalized.split(":")
    if len(parts) != 2:
        raise ValueError("時間格式需為 HH:MM")

    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError as exc:
        raise ValueError("時間格式需為 HH:MM") from exc

    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError("時間格式需為 HH:MM")

    return time(hour=hour, minute=minute)


def normalize_time_value(value: str | None) -> str | None:
    parsed = parse_time_value(value)
    return parsed.strftime("%H:%M") if parsed else None


def validate_schedule_config(daily_lock_time: str | None, first_unlock_time: str | None) -> tuple[str, str]:
    normalized_daily_lock_time = normalize_time_value(daily_lock_time) or DEFAULT_DAILY_LOCK_TIME
    normalized_first_unlock_time = normalize_time_value(first_unlock_time) or DEFAULT_FIRST_UNLOCK_TIME

    first_unlock = parse_time_value(normalized_first_unlock_time)
    daily_lock = parse_time_value(normalized_daily_lock_time)

    if first_unlock is None or daily_lock is None:
        raise ValueError("請同時設定每日上鎖時間與首刷常開時間")

    if first_unlock >= daily_lock:
        raise ValueError("首刷常開時間必須早於每日上鎖時間")

    return normalized_daily_lock_time, normalized_first_unlock_time


def get_or_create_door_settings(db: Session) -> DoorControlSettings:
    settings = db.query(DoorControlSettings).first()
    if settings:
        mutated = False

        normalized_access_mode = normalize_access_mode(settings.access_mode) or MODE_NORMAL
        if settings.access_mode != normalized_access_mode:
            settings.access_mode = normalized_access_mode
            mutated = True

        normalized_pending_access_mode = normalize_access_mode(
            settings.pending_access_mode,
            field_name="pending_access_mode",
            allow_none=True,
        )
        if settings.pending_access_mode != normalized_pending_access_mode:
            settings.pending_access_mode = normalized_pending_access_mode
            mutated = True

        normalized_weekday_mode_overrides = serialize_weekday_mode_overrides(settings.weekday_mode_overrides)
        if settings.weekday_mode_overrides != normalized_weekday_mode_overrides:
            settings.weekday_mode_overrides = normalized_weekday_mode_overrides
            mutated = True

        if settings.pending_weekday_mode_overrides is not None:
            normalized_pending_weekday_mode_overrides = serialize_weekday_mode_overrides(
                settings.pending_weekday_mode_overrides
            )
            if settings.pending_weekday_mode_overrides != normalized_pending_weekday_mode_overrides:
                settings.pending_weekday_mode_overrides = normalized_pending_weekday_mode_overrides
                mutated = True

        if not settings.daily_lock_time:
            settings.daily_lock_time = DEFAULT_DAILY_LOCK_TIME
            mutated = True
        if not settings.first_unlock_time:
            settings.first_unlock_time = DEFAULT_FIRST_UNLOCK_TIME
            mutated = True

        if mutated:
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    settings = DoorControlSettings(
        id=1,
        access_mode=MODE_NORMAL,
        weekday_mode_overrides=serialize_weekday_mode_overrides(None),
        daily_lock_time=DEFAULT_DAILY_LOCK_TIME,
        first_unlock_time=DEFAULT_FIRST_UNLOCK_TIME,
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def clear_schedule_hold(settings: DoorControlSettings) -> None:
    settings.schedule_hold_date = None
    settings.schedule_hold_started_at = None


def evaluate_schedule(
    settings: DoorControlSettings,
    now_local: datetime | None = None,
    *,
    default_access_mode: str | None = None,
    weekday_mode_overrides: str | Mapping[str, str | None] | None = None,
) -> ScheduleEvaluation:
    now_local = now_local or now_app_timezone()
    today = now_local.date().isoformat()
    mode_resolution = resolve_effective_access_mode(
        settings,
        now_local,
        default_access_mode=default_access_mode,
        weekday_mode_overrides=weekday_mode_overrides,
    )

    if not is_schedule_access_mode(mode_resolution.access_mode):
        return ScheduleEvaluation(
            phase=SCHEDULE_PHASE_INACTIVE,
            now_local=now_local,
            today=today,
            should_clear_hold=bool(settings.schedule_hold_date or settings.schedule_hold_started_at),
            effective_access_mode=mode_resolution.access_mode,
            default_access_mode=mode_resolution.default_access_mode,
            weekday_key=mode_resolution.weekday_key,
            active_mode_source=mode_resolution.active_mode_source,
            weekday_mode_overrides=mode_resolution.weekday_mode_overrides,
        )

    daily_lock_time, first_unlock_time = validate_schedule_config(
        settings.daily_lock_time,
        settings.first_unlock_time,
    )

    current_time = now_local.time().replace(second=0, microsecond=0)
    daily_lock = parse_time_value(daily_lock_time)
    first_unlock = parse_time_value(first_unlock_time)

    in_outside_schedule = current_time >= daily_lock or current_time < first_unlock
    hold_is_active = settings.schedule_hold_date == today and not in_outside_schedule
    should_clear_hold = bool(settings.schedule_hold_date or settings.schedule_hold_started_at) and not hold_is_active

    if in_outside_schedule:
        phase = SCHEDULE_PHASE_OUTSIDE_SCHEDULE
    elif hold_is_active:
        phase = SCHEDULE_PHASE_HELD_OPEN
    else:
        phase = SCHEDULE_PHASE_WAITING_FOR_FIRST_SCAN

    return ScheduleEvaluation(
        phase=phase,
        now_local=now_local,
        today=today,
        should_clear_hold=should_clear_hold,
        effective_access_mode=mode_resolution.access_mode,
        default_access_mode=mode_resolution.default_access_mode,
        weekday_key=mode_resolution.weekday_key,
        active_mode_source=mode_resolution.active_mode_source,
        weekday_mode_overrides=mode_resolution.weekday_mode_overrides,
    )


def activate_schedule_hold(
    db: Session,
    settings: DoorControlSettings | None = None,
    now_local: datetime | None = None,
) -> ScheduleEvaluation:
    settings = settings or get_or_create_door_settings(db)
    now_local = now_local or now_app_timezone()

    settings.schedule_hold_date = now_local.date().isoformat()
    settings.schedule_hold_started_at = app_time_to_utc_naive(now_local)
    db.add(settings)
    db.commit()
    db.refresh(settings)

    hold_unlock()
    return evaluate_schedule(settings, now_local)


def sync_door_hardware_state(
    db: Session,
    *,
    interrupt_timed_unlock: bool = False,
) -> tuple[DoorControlSettings, ScheduleEvaluation, dict[str, bool | str | None]]:
    settings = get_or_create_door_settings(db)
    evaluation = evaluate_schedule(settings)
    runtime = get_lock_runtime_status()

    mutated = False
    hardware_action = None
    current_door_state = runtime["door_state"]
    cleared_schedule_hold = False
    previous_effective_access_mode = evaluation.effective_access_mode
    applied_pending_mode = None
    pending_settings_applied = False

    if evaluation.should_clear_hold:
        cleared_schedule_hold = True
        clear_schedule_hold(settings)

        if settings.pending_access_mode is not None:
            settings.access_mode = settings.pending_access_mode
            settings.pending_access_mode = None
            pending_settings_applied = True

        if settings.pending_weekday_mode_overrides is not None:
            settings.weekday_mode_overrides = settings.pending_weekday_mode_overrides
            settings.pending_weekday_mode_overrides = None
            pending_settings_applied = True

        db.add(settings)
        db.commit()
        db.refresh(settings)
        evaluation = evaluate_schedule(settings, evaluation.now_local)
        mutated = True

        if pending_settings_applied:
            applied_pending_mode = evaluation.effective_access_mode

    should_force_lock = False
    should_hold_open = False
    effective_access_mode = evaluation.effective_access_mode

    if effective_access_mode == MODE_ALWAYS_LOCKED:
        should_force_lock = True
    elif effective_access_mode == MODE_FIRST_SCAN_HOLD:
        if evaluation.phase == SCHEDULE_PHASE_HELD_OPEN:
            should_hold_open = True
        else:
            should_force_lock = True
    elif effective_access_mode == MODE_FIRST_SCAN_FLEX:
        should_hold_open = evaluation.phase == SCHEDULE_PHASE_HELD_OPEN
        should_force_lock = current_door_state == "held_open" and evaluation.phase != SCHEDULE_PHASE_HELD_OPEN
    else:
        should_force_lock = current_door_state == "held_open"

    if should_hold_open and current_door_state != "held_open":
        hold_unlock()
        hardware_action = "hold_unlock"
    elif should_force_lock and (
        current_door_state == "held_open"
        or (interrupt_timed_unlock and current_door_state == "unlocking")
    ):
        force_lock()
        hardware_action = "force_lock"

    return settings, evaluation, {
        "mutated": mutated,
        "hardware_action": hardware_action,
        "cleared_schedule_hold": cleared_schedule_hold,
        "previous_access_mode": previous_effective_access_mode,
        "applied_pending_mode": applied_pending_mode,
        "pending_settings_applied": pending_settings_applied,
    }


def serialize_door_settings(
    settings: DoorControlSettings,
    evaluation: ScheduleEvaluation | None = None,
) -> dict[str, object | None]:
    evaluation = evaluation or evaluate_schedule(settings)
    pending_weekday_mode_overrides = (
        normalize_weekday_mode_overrides(settings.pending_weekday_mode_overrides)
        if settings.pending_weekday_mode_overrides is not None
        else None
    )

    return {
        "access_mode": evaluation.effective_access_mode,
        "default_access_mode": evaluation.default_access_mode,
        "pending_access_mode": settings.pending_access_mode,
        "weekday_mode_overrides": evaluation.weekday_mode_overrides,
        "pending_weekday_mode_overrides": pending_weekday_mode_overrides,
        "active_mode_source": evaluation.active_mode_source,
        "schedule_lock_time": settings.daily_lock_time or DEFAULT_DAILY_LOCK_TIME,
        "schedule_first_unlock_time": settings.first_unlock_time or DEFAULT_FIRST_UNLOCK_TIME,
        "schedule_phase": evaluation.phase,
        "schedule_hold_date": settings.schedule_hold_date,
        "schedule_hold_started_at": serialize_datetime(settings.schedule_hold_started_at),
    }

import time
import logging
import atexit
import threading
from datetime import timedelta

from app.config import LOCK_PIN, LOCK_ACTIVE_LEVEL, LOCK_DURATION
from app.timezone import serialize_datetime, utcnow_aware

log = logging.getLogger(__name__)
LOCK_OPERATION_GUARD = threading.Lock()
LOCK_STATUS_GUARD = threading.Lock()

_last_unlock_started_at = None
_last_unlock_finished_at = None
_unlock_until = None
_hold_open_started_at = None
_door_state = "locked"
_state_token = 0

# GPIO initialization
GPIO = None
GPIO_AVAILABLE = False

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(LOCK_PIN, GPIO.OUT)
    
    # Set default state (prevent accidental unlock on boot)
    default_state = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
    GPIO.output(LOCK_PIN, default_state)
    
    log.info(f"GPIO initialized successfully, lock pin: GPIO {LOCK_PIN}")
except Exception as e:
    log.warning(f"GPIO not available (test mode): {e}")
    
    # Mock GPIO for testing
    class MockGPIO:
        HIGH = 1
        LOW = 0
        
        def output(self, *args):
            pass
        
        def cleanup(self):
            pass
    
    GPIO = MockGPIO()

def cleanup_gpio():
    """Cleanup GPIO on exit"""
    if GPIO_AVAILABLE:
        GPIO.cleanup()
        log.info("GPIO cleaned up")

atexit.register(cleanup_gpio)


def _utcnow():
    return utcnow_aware()


def _serialize_datetime(value):
    return serialize_datetime(value)


def _get_relay_levels():
    active = GPIO.LOW if LOCK_ACTIVE_LEVEL == 0 else GPIO.HIGH
    inactive = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
    return active, inactive


def _set_relay_state(unlocked: bool):
    active, inactive = _get_relay_levels()
    GPIO.output(LOCK_PIN, active if unlocked else inactive)


def get_lock_runtime_status():
    """Return the current in-memory lock runtime status for UI and diagnostics."""
    with LOCK_STATUS_GUARD:
        return {
            "door_state": _door_state,
            "gpio_available": GPIO_AVAILABLE,
            "lock_duration_seconds": LOCK_DURATION,
            "lock_pin": LOCK_PIN,
            "lock_active_level": LOCK_ACTIVE_LEVEL,
            "unlock_until": _serialize_datetime(_unlock_until) if _door_state == "unlocking" else None,
            "last_unlock_started_at": _serialize_datetime(_last_unlock_started_at),
            "last_unlock_finished_at": _serialize_datetime(_last_unlock_finished_at),
            "hold_open_started_at": _serialize_datetime(_hold_open_started_at),
        }


def open_lock():
    """Unlock the door for specified duration"""
    with LOCK_OPERATION_GUARD:
        started_at = _utcnow()
        with LOCK_STATUS_GUARD:
            global _last_unlock_started_at, _last_unlock_finished_at, _unlock_until
            global _hold_open_started_at, _door_state, _state_token
            _state_token += 1
            operation_token = _state_token
            _last_unlock_started_at = started_at
            _last_unlock_finished_at = None
            _unlock_until = started_at + timedelta(seconds=LOCK_DURATION)
            _hold_open_started_at = None
            _door_state = "unlocking"

        log.info(f"🔓 Unlocking door for {LOCK_DURATION} seconds")
        try:
            _set_relay_state(True)
            if not GPIO_AVAILABLE:
                log.info(f"(Simulating unlock for {LOCK_DURATION} seconds...)")
            time.sleep(LOCK_DURATION)
        finally:
            should_lock = False
            with LOCK_STATUS_GUARD:
                if _state_token == operation_token and _door_state == "unlocking":
                    _last_unlock_finished_at = _utcnow()
                    _unlock_until = None
                    _door_state = "locked"
                    should_lock = True
            if should_lock:
                _set_relay_state(False)
                log.info("🔒 Door locked")


def hold_unlock():
    """Keep the door unlocked until another mode or schedule forces it closed."""
    started_at = _utcnow()
    with LOCK_STATUS_GUARD:
        global _last_unlock_started_at, _last_unlock_finished_at, _unlock_until
        global _hold_open_started_at, _door_state, _state_token
        _state_token += 1
        _door_state = "held_open"
        _last_unlock_started_at = started_at
        _last_unlock_finished_at = None
        _unlock_until = None
        if _hold_open_started_at is None:
            _hold_open_started_at = started_at

    _set_relay_state(True)
    log.info("🔓 Door set to held-open state")


def force_lock():
    """Immediately force the door back into the locked state."""
    with LOCK_STATUS_GUARD:
        global _last_unlock_finished_at, _unlock_until, _hold_open_started_at, _door_state, _state_token
        _state_token += 1
        _door_state = "locked"
        _unlock_until = None
        _hold_open_started_at = None
        _last_unlock_finished_at = _utcnow()

    _set_relay_state(False)
    log.info("🔒 Door force-locked")

def deny_access():
    """Log access denial"""
    log.warning("🚫 Access denied")

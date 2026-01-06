import time
import logging
import atexit
import pytz
from datetime import datetime
from threading import Lock

from app.config import (
    LOCK_PIN, LOCK_ACTIVE_LEVEL, LOCK_DURATION,
    DAYTIME_MODE_ENABLED, DAYTIME_START_HOUR, DAYTIME_END_HOUR,
    DAYTIME_WEEKDAYS, TIMEZONE
)

log = logging.getLogger(__name__)

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

def open_lock():
    """Unlock the door for specified duration"""
    log.info(f"🔓 Unlocking door for {LOCK_DURATION} seconds")
    
    if GPIO_AVAILABLE:
        # Calculate trigger level
        active = GPIO.LOW if LOCK_ACTIVE_LEVEL == 0 else GPIO.HIGH
        inactive = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
        
        # Trigger relay
        GPIO.output(LOCK_PIN, active)
        time.sleep(LOCK_DURATION)
        GPIO.output(LOCK_PIN, inactive)
        log.info("🔒 Door locked")
    else:
        log.info(f"(Simulating unlock for {LOCK_DURATION} seconds...)")
        time.sleep(LOCK_DURATION)

def deny_access():
    """Log access denial"""
    log.warning("🚫 Access denied")

def unlock_persistent():
    """持續解鎖門（不自動鎖回）- 用於白天模式"""
    log.info("🔓 Unlocking door (persistent mode - daytime)")

    if GPIO_AVAILABLE:
        active = GPIO.LOW if LOCK_ACTIVE_LEVEL == 0 else GPIO.HIGH
        GPIO.output(LOCK_PIN, active)
        log.info("🔓 Door unlocked and will stay unlocked")
    else:
        log.info("(Simulating persistent unlock...)")

def lock_door():
    """鎖門"""
    log.info("🔒 Locking door")

    if GPIO_AVAILABLE:
        inactive = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
        GPIO.output(LOCK_PIN, inactive)
        log.info("🔒 Door locked")
    else:
        log.info("(Simulating lock...)")

def get_lock_state() -> bool:
    """取得當前門鎖狀態 (True=解鎖, False=上鎖)"""
    if GPIO_AVAILABLE:
        current = GPIO.input(LOCK_PIN)
        active = GPIO.LOW if LOCK_ACTIVE_LEVEL == 0 else GPIO.HIGH
        return current == active
    return False


class DaytimeModeManager:
    """白天解鎖模式狀態管理器"""

    def __init__(self):
        self._is_daytime_unlocked = False   # 當前是否已在白天模式下解鎖
        self._unlock_date = None             # 解鎖的日期 (用於日期變更檢測)
        self._first_unlock_user = None       # 記錄第一位解鎖者
        self._first_unlock_time = None       # 第一次解鎖時間
        self._lock = Lock()                  # 線程安全鎖

    @property
    def is_daytime_unlocked(self) -> bool:
        """取得當前白天模式解鎖狀態"""
        with self._lock:
            return self._is_daytime_unlocked

    def set_daytime_unlocked(self, value: bool, user_info: str = None):
        """設定白天模式解鎖狀態"""
        with self._lock:
            self._is_daytime_unlocked = value
            if value:
                self._unlock_date = self._get_current_date()
                self._first_unlock_user = user_info
                self._first_unlock_time = datetime.now(self._get_tz())
            else:
                self._unlock_date = None
                self._first_unlock_user = None
                self._first_unlock_time = None

    def _get_tz(self):
        """取得時區物件"""
        return pytz.timezone(TIMEZONE)

    def _get_current_date(self):
        """取得當前日期"""
        return datetime.now(self._get_tz()).date()

    def is_daytime_hours(self) -> bool:
        """檢查當前是否在白天時段內"""
        if not DAYTIME_MODE_ENABLED:
            return False

        # 檢查日期是否變更
        if self.check_date_changed():
            self.set_daytime_unlocked(False)

        tz = self._get_tz()
        now = datetime.now(tz)

        # 檢查是否為指定的工作日
        weekdays = [int(d) for d in DAYTIME_WEEKDAYS.split(',')]
        if now.weekday() not in weekdays:
            return False

        # 檢查時間範圍
        return DAYTIME_START_HOUR <= now.hour < DAYTIME_END_HOUR

    def should_use_daytime_mode(self) -> bool:
        """判斷是否應使用白天模式（時段內且未解鎖）"""
        return DAYTIME_MODE_ENABLED and self.is_daytime_hours()

    def check_date_changed(self) -> bool:
        """檢查日期是否已變更（用於處理跨日邊界）"""
        with self._lock:
            if self._unlock_date is None:
                return False
            return self._unlock_date != self._get_current_date()

    def get_status(self) -> dict:
        """取得當前狀態（供 API 查詢）"""
        return {
            "daytime_mode_enabled": DAYTIME_MODE_ENABLED,
            "is_daytime_hours": self.is_daytime_hours(),
            "is_daytime_unlocked": self.is_daytime_unlocked,
            "first_unlock_user": self._first_unlock_user,
            "first_unlock_time": self._first_unlock_time.isoformat() if self._first_unlock_time else None
        }


# 全域實例
daytime_manager = DaytimeModeManager()


class LockModeManager:
    """手動鎖門模式管理器"""

    def __init__(self):
        self._always_lock = False  # False = Stay Unlocked, True = Always Lock
        self._lock = Lock()

    @property
    def always_lock(self) -> bool:
        """取得當前模式狀態"""
        with self._lock:
            return self._always_lock

    def toggle(self) -> bool:
        """切換模式並回傳新狀態"""
        with self._lock:
            self._always_lock = not self._always_lock
            return self._always_lock

    def set_mode(self, always_lock: bool):
        """直接設定模式"""
        with self._lock:
            self._always_lock = always_lock

    def get_status(self) -> dict:
        """取得當前狀態（供 API 查詢）"""
        return {
            "always_lock": self.always_lock,
            "mode_name": "隨時上鎖" if self.always_lock else "不上鎖"
        }


# 全域實例
lock_mode_manager = LockModeManager()

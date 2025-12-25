import time
import logging
import atexit

from app.config import LOCK_PIN, LOCK_ACTIVE_LEVEL, LOCK_DURATION

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

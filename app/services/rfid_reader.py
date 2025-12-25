import asyncio
import logging
import os
from typing import Optional, Callable

from app.config import RFID_DEVICE_PATH, DEV_MODE

log = logging.getLogger(__name__)

# Conditional import of evdev (only available on Linux)
try:
    from evdev import InputDevice, ecodes, list_devices
    EVDEV_AVAILABLE = True
except ImportError:
    log.warning("evdev not available (likely running on non-Linux system)")
    EVDEV_AVAILABLE = False
    InputDevice = None
    ecodes = None
    list_devices = None

# Scancode mapping for RFID reader
SCANCODE_MAP = {
    2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
    7: '6', 8: '7', 9: '8', 10: '9', 11: '0'
}

class RFIDReader:
    def __init__(self):
        self.device: Optional[InputDevice] = None
        self.device_path = RFID_DEVICE_PATH
        self.current_code = ""
        self.callback: Optional[Callable] = None
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.dev_mode = DEV_MODE or not os.path.exists("/dev/input")

        if self.dev_mode:
            log.info("🔧 RFID Reader in DEVELOPMENT MODE - use /dev/simulate-scan API")

    def initialize_device(self) -> bool:
        """Initialize RFID device"""
        if self.dev_mode:
            log.info("⚠️ Skipping RFID device initialization (dev mode)")
            return False

        if not EVDEV_AVAILABLE:
            log.error("evdev module not available - cannot initialize RFID device")
            return False

        try:
            # Try specified path first
            if os.path.exists(self.device_path):
                self.device = InputDevice(self.device_path)
                log.info(f"📡 RFID device connected: {self.device.name} at {self.device_path}")
                return True

            # Auto-detect RFID device
            log.warning(f"Specified device path not found: {self.device_path}")
            log.info("Attempting to auto-detect RFID device...")

            devices = [InputDevice(path) for path in list_devices()]
            for dev in devices:
                if 'rfid' in dev.name.lower() or 'sycreader' in dev.name.lower():
                    self.device = dev
                    self.device_path = dev.path
                    log.info(f"📡 Auto-detected RFID device: {dev.name} at {dev.path}")
                    return True

            log.error("No RFID device found")
            return False

        except Exception as e:
            log.error(f"Failed to initialize RFID device: {e}")
            return False

    async def simulate_scan(self, card_uid: str):
        """開發模式：模擬 RFID 刷卡"""
        if not self.dev_mode:
            raise Exception("simulate_scan only available in DEV_MODE")

        if self.callback:
            log.info(f"🔧 [DEV MODE] Simulating card scan: {card_uid}")
            await self.callback(card_uid)
            return True
        else:
            log.warning("⚠️ No callback registered for RFID reader")
            return False

    async def read_loop(self, callback: Callable[[str], None]):
        """
        Async RFID reading loop
        callback: async function to call when card is scanned
        """
        self.callback = callback

        if self.dev_mode:
            log.info("🔧 RFID reader in dev mode - waiting for simulated scans via API")
            # Keep the loop alive but don't actually read from device
            while True:
                await asyncio.sleep(1)
            return

        if not self.initialize_device():
            log.error("Cannot start RFID loop without device")
            return

        self.loop = asyncio.get_event_loop()
        log.info("RFID reader loop started")

        try:
            # Run blocking read_loop in executor
            await self.loop.run_in_executor(None, self._blocking_read_loop)
        except Exception as e:
            log.error(f"RFID read loop error: {e}")

    def _blocking_read_loop(self):
        """Blocking read loop (runs in executor)"""
        for event in self.device.read_loop():
            if event.type == ecodes.EV_KEY and event.value == 1:  # Key down
                if event.code == 28:  # Enter key
                    if self.current_code:
                        # Schedule callback in main event loop
                        asyncio.run_coroutine_threadsafe(
                            self.callback(self.current_code),
                            self.loop
                        )
                        self.current_code = ""
                elif event.code in SCANCODE_MAP:
                    self.current_code += SCANCODE_MAP[event.code]

# Global reader instance
rfid_reader = RFIDReader()

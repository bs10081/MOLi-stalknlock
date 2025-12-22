import asyncio
import logging
import os
from evdev import InputDevice, ecodes, list_devices
from typing import Optional, Callable

from app.config import RFID_DEVICE_PATH

log = logging.getLogger(__name__)

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
    
    def initialize_device(self) -> bool:
        """Initialize RFID device"""
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
    
    async def read_loop(self, callback: Callable[[str], None]):
        """
        Async RFID reading loop
        callback: async function to call when card is scanned
        """
        if not self.initialize_device():
            log.error("Cannot start RFID loop without device")
            return
        
        self.callback = callback
        log.info("RFID reader loop started")
        
        try:
            # Run blocking read_loop in executor
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._blocking_read_loop)
        except Exception as e:
            log.error(f"RFID read loop error: {e}")
    
    def _blocking_read_loop(self):
        """Blocking read loop (runs in executor)"""
        for event in self.device.read_loop():
            if event.type == ecodes.EV_KEY and event.value == 1:  # Key down
                if event.code == 28:  # Enter key
                    if self.current_code:
                        # Schedule callback in event loop
                        asyncio.create_task(self.callback(self.current_code))
                        self.current_code = ""
                elif event.code in SCANCODE_MAP:
                    self.current_code += SCANCODE_MAP[event.code]

# Global reader instance
rfid_reader = RFIDReader()

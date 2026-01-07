import os
from dotenv import load_dotenv

load_dotenv()

# Version (Semantic Versioning)
VERSION = "2.1.1"
VERSION_CODENAME = "Lock Commander"  # Optional codename for release

# Development Mode
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./moli_door.db")

# Telegram
BOT_TOKEN = os.getenv("BOT_TOKEN")
TG_CHAT_ID = os.getenv("TG_CHAT_ID")

# RFID Device
RFID_DEVICE_PATH = os.getenv(
    "RFID_DEVICE_PATH",
    "/dev/input/by-id/usb-Sycreader_RFID_Technology_Co.__Ltd_SYC_ID_IC_USB_Reader_08FF20140315-event-kbd"
)

# GPIO
LOCK_PIN = int(os.getenv("LOCK_PIN", "16"))
LOCK_ACTIVE_LEVEL = int(os.getenv("LOCK_ACTIVE_LEVEL", "1"))
LOCK_DURATION = int(os.getenv("LOCK_DURATION", "3"))

# Registration
REGISTER_TIMEOUT = int(os.getenv("REGISTER_TIMEOUT", "90"))

# API
API_KEY = os.getenv("API_KEY")

# Daytime Unlock Mode (白天解鎖模式)
DAYTIME_MODE_ENABLED = os.getenv("DAYTIME_MODE_ENABLED", "true").lower() == "true"
DAYTIME_START_HOUR = int(os.getenv("DAYTIME_START_HOUR", "8"))      # 08:00
DAYTIME_END_HOUR = int(os.getenv("DAYTIME_END_HOUR", "19"))         # 19:00
DAYTIME_WEEKDAYS = os.getenv("DAYTIME_WEEKDAYS", "0,1,2,3,4")       # 週一至週五 (0=Monday)
TIMEZONE = os.getenv("TIMEZONE", "Asia/Taipei")

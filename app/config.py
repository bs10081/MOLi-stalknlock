import os
from dotenv import load_dotenv

load_dotenv()

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

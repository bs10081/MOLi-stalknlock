import os
from dotenv import load_dotenv

load_dotenv()

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

# ==================== JWT 身份驗證 ====================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    if not DEV_MODE:
        raise RuntimeError(
            "❌ JWT_SECRET_KEY 環境變數未設置！\n"
            "請執行以下指令生成金鑰並加入 .env 檔案：\n"
            "  python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )
    else:
        # 開發模式使用預設金鑰並發出警告
        import warnings
        JWT_SECRET_KEY = "dev-mode-secret-key-not-for-production"
        warnings.warn(
            "⚠️ 開發模式使用預設 JWT_SECRET_KEY！生產環境必須設定唯一金鑰！",
            RuntimeWarning,
            stacklevel=2
        )

if len(JWT_SECRET_KEY) < 32 and not DEV_MODE:
    raise RuntimeError(
        f"⚠️ JWT_SECRET_KEY 長度不足！\n"
        f"當前長度: {len(JWT_SECRET_KEY)} 字元\n"
        f"建議長度: 至少 32 字元以確保安全性"
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# ==================== 速率限制 ====================
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "5"))

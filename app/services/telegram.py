import requests
import logging
from app.config import BOT_TOKEN, TG_CHAT_ID

log = logging.getLogger(__name__)

def send_telegram(text: str):
    """Send message to Telegram chat"""
    if not BOT_TOKEN or not TG_CHAT_ID:
        log.warning("Telegram not configured, skipping notification")
        return False
    
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": TG_CHAT_ID, "text": text},
            timeout=5
        )
        response.raise_for_status()
        return True
    except Exception as e:
        log.error(f"Failed to send Telegram message: {e}")
        return False

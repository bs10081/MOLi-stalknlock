import requests
import logging
import time
from app.config import BOT_TOKEN, TG_CHAT_ID

log = logging.getLogger(__name__)

def send_telegram(text: str, max_retries: int = 3):
    """Send message to Telegram chat with retry mechanism"""
    if not BOT_TOKEN or not TG_CHAT_ID:
        log.warning("Telegram not configured, skipping notification")
        return False
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": TG_CHAT_ID, "text": text},
                timeout=10,
                verify=True  # Keep SSL verification but with longer timeout
            )
            response.raise_for_status()
            log.info(f"✅ Telegram notification sent: {text[:50]}...")
            return True
        except requests.exceptions.SSLError as e:
            log.warning(f"Telegram SSL error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(1)  # Wait 1 second before retry
                continue
        except requests.exceptions.RequestException as e:
            log.error(f"Failed to send Telegram message (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
        except Exception as e:
            log.error(f"Unexpected error sending Telegram: {e}")
            return False
    
    log.error(f"Failed to send Telegram after {max_retries} attempts")
    return False

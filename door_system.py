import time
import threading
import os
import sqlite3  # 使用 SQLite
import sys
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from evdev import InputDevice, ecodes
import atexit

# ================= 環境載入 =================
load_dotenv()

# ================= 設定 =================
# 資料庫檔案
DB_FILE = os.getenv('DB_FILE', 'moli_door.db')
LOG_FILE = os.getenv('DOOR_LOG_FILE', 'door_system.log')
PORT = 5001
REGISTER_TIMEOUT = 60

# GPIO 腳位 (GPIO 16 / Pin 36)
LOCK_PIN = 16 
# 0 = 低電位觸發, 1 = 高電位觸發
LOCK_ACTIVE_LEVEL = int(os.getenv('LOCK_ACTIVE_LEVEL', '1')) 

# RFID 裝置路徑
RFID_DEVICE_PATH = '/dev/input/event9' 

# ================= Logging 設定 =================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

# ================= GPIO 初始化 =================
GPIO = None
GPIO_AVAILABLE = False

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(LOCK_PIN, GPIO.OUT)
    
    # 預設狀態設定 (避免開機誤開門)
    default_state = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
    GPIO.output(LOCK_PIN, default_state)
    
    log.info(f"[GPIO] 成功載入，鎖定腳位: GPIO {LOCK_PIN}")
except Exception as e:
    log.info(f"[GPIO] 無法載入 RPi.GPIO (測試模式): {e}")
    class MockGPIO:
        HIGH = 1; LOW = 0
        def output(self, *args): pass
        def cleanup(self): pass
    GPIO = MockGPIO()

def cleanup_gpio():
    if GPIO_AVAILABLE:
        GPIO.cleanup()

atexit.register(cleanup_gpio)

# ================= 資料庫連線 (SQLite) =================
def get_db_connection():
    try:
        # SQLite 連線
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        return conn
    except Exception as e:
        log.error(f"資料庫連線失敗: {e}")
        return None

# ================= 開鎖邏輯 =================
def open_lock():
    log.info("🔓 [開鎖] 允許通行！")
    
    if GPIO_AVAILABLE:
        # 計算觸發電位
        active = GPIO.LOW if LOCK_ACTIVE_LEVEL == 0 else GPIO.HIGH
        inactive = GPIO.HIGH if LOCK_ACTIVE_LEVEL == 0 else GPIO.LOW
        
        # 觸發繼電器
        GPIO.output(LOCK_PIN, active)
        time.sleep(3)  # 開門 3 秒
        GPIO.output(LOCK_PIN, inactive)
    else:
        log.info("(模擬開鎖 3 秒...)")
        time.sleep(3)

def deny_access():
    log.info("🚫 [拒絕] 無權限或卡片未註冊")

# ================= 核心邏輯 =================
state = {
    "mode": "NORMAL",
    "target_student_id": None,
    "first_scan_uid": None,
    "step": 0,
    "start_time": 0
}

def check_access(card_uid):
    conn = get_db_connection()
    if not conn:
        return

    try:
        cur = conn.cursor()
        # SQLite 使用 ? 作為佔位符
        cur.execute("SELECT student_id, name FROM users WHERE rfid_uid = ?", (card_uid,))
        row = cur.fetchone()

        if row:
            student_id, name = row
            log.info(f"✅ 識別成功: {name} ({student_id})")
            
            # 寫入 Access Log (SQLite)
            cur.execute(
                "INSERT INTO access_logs (student_id, rfid_uid, action, timestamp) VALUES (?, ?, 'entry', ?)",
                (student_id, card_uid, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            )
            conn.commit()
            
            # 開門
            threading.Thread(target=open_lock).start()
        else:
            log.info(f"⚠️ 未知卡片: {card_uid}")
            deny_access()

    except Exception as e:
        log.error(f"查詢錯誤: {e}")
    finally:
        conn.close()

def handle_register(card_uid):
    if time.time() - state["start_time"] > REGISTER_TIMEOUT:
        log.info("⏰ 註冊逾時，返回正常模式")
        state["mode"] = "NORMAL"
        return

    log.info(f"📝 [註冊模式] 讀取到卡號: {card_uid}")

    if state["step"] == 0:
        state["first_scan_uid"] = card_uid
        state["step"] = 1
        log.info(f"請再次刷卡以確認綁定學號: {state['target_student_id']}")
    
    elif state["step"] == 1:
        if card_uid == state["first_scan_uid"]:
            conn = get_db_connection()
            if not conn:
                return

            try:
                cur = conn.cursor()
                # 更新使用者的 rfid_uid
                cur.execute("UPDATE users SET rfid_uid = ? WHERE student_id = ?", 
                           (card_uid, state["target_student_id"]))
                
                if cur.rowcount > 0:
                    conn.commit()
                    log.info(f"🎉 註冊成功！學號 {state['target_student_id']} 已綁定卡號 {card_uid}")
                    threading.Thread(target=open_lock).start()
                else:
                    log.error(f"❌ 找不到學號 {state['target_student_id']}")
            except Exception as e:
                log.error(f"資料庫寫入失敗: {e}")
            finally:
                conn.close()
            
            state["mode"] = "NORMAL"
        else:
            log.warning("❌ 兩次卡號不一致，請重新操作")
            state["step"] = 0
            state["first_scan_uid"] = None

# ================= Flask API =================
app = Flask(__name__)
CORS(app)

@app.route('/mode/register', methods=['POST'])
def start_register():
    data = request.json
    student_id = data.get('student_id')
    if not student_id:
        return jsonify({"error": "缺少 student_id"}), 400
    
    state["mode"] = "REGISTER"
    state["target_student_id"] = student_id
    state["step"] = 0
    state["start_time"] = time.time()
    
    log.info(f"🔄 切換至註冊模式，目標學號: {student_id}")
    return jsonify({"status": "ok", "message": "請刷卡"})

def run_flask():
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False)

# ================= RFID 讀取迴圈 =================
SCANCODE_MAP = {
    2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
    7: '6', 8: '7', 9: '8', 10: '9', 11: '0'
}

def rfid_loop():
    device_path = RFID_DEVICE_PATH
    
    try:
        # 自動搜尋裝置 (修正版，防止變數錯誤)
        if not os.path.exists(device_path):
            from evdev import list_devices
            devices = [InputDevice(path) for path in list_devices()]
            for dev in devices:
                if 'rfid' in dev.name.lower() or 'keyboard' in dev.name.lower():
                    device_path = dev.path
                    break
        
        dev = InputDevice(device_path)
        log.info(f"📡 監聽讀卡機 (SQLite模式): {dev.name}")
        
        current_code = ""
        for event in dev.read_loop():
            if event.type == ecodes.EV_KEY and event.value == 1: # Key down
                if event.code == 28: # Enter
                    if current_code:
                        if state["mode"] == "NORMAL":
                            check_access(current_code)
                        else:
                            handle_register(current_code)
                        current_code = ""
                elif event.code in SCANCODE_MAP:
                    current_code += SCANCODE_MAP[event.code]
                    
    except Exception as e:
        log.error(f"讀卡機錯誤: {e}")
        log.info("請確認有沒有插上讀卡機，或使用 sudo 執行")

if __name__ == "__main__":
    threading.Thread(target=run_flask, daemon=True).start()
    log.info("🚀 門禁系統啟動 (SQLite 本機版 - GPIO 16)")
    rfid_loop()

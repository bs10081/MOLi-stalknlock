import os
import psycopg2
from dotenv import load_dotenv

# 載入 .env 設定
load_dotenv()

def view_data():
    try:
        # 連線到 PostgreSQL
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT', 5432)
        )
        cur = conn.cursor()

        print("========================================")
        print(f"📂 資料庫查詢結果 (PostgreSQL)")
        print("========================================")

        # 1. 查詢已註冊的用戶 (users)
        print("\n[ 👤 用戶列表 (users) ]")
        print(f"{'學號 (ID)':<15} | {'姓名 (Name)':<10} | {'卡號 (UID)':<15}")
        print("-" * 50)
        
        cur.execute("SELECT student_id, name, rfid_uid FROM users;")
        rows = cur.fetchall()
        if not rows:
            print("(目前沒有資料)")
        else:
            for row in rows:
                uid = row[2] if row[2] else "[未綁定]"
                print(f"{row[0]:<15} | {row[1]:<10} | {uid:<15}")

        # 2. 查詢最新的進出紀錄 (access_logs)
        print("\n[ 📝 最新 5 筆紀錄 (access_logs) ]")
        print(f"{'時間':<25} | {'學號':<10} | {'動作':<10} | {'卡號'}")
        print("-" * 60)

        cur.execute("SELECT timestamp, student_id, action, rfid_uid FROM access_logs ORDER BY timestamp DESC LIMIT 5;")
        rows = cur.fetchall()
        if not rows:
            print("(目前沒有紀錄)")
        else:
            for row in rows:
                # row[0] 是時間物件，轉字串顯示
                time_str = str(row[0])[:19] 
                print(f"{time_str:<25} | {row[1]:<10} | {row[2]:<10} | {row[3]}")

        print("\n" + "="*40)
        conn.close()

    except Exception as e:
        print(f"❌ 查詢失敗: {e}")

if __name__ == "__main__":
    view_data()

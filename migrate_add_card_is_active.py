#!/usr/bin/env python3
"""
資料庫遷移腳本：為 cards 表添加 is_active 欄位
"""
import sqlite3
import os

DB_PATH = "./moli_door.db"

def migrate():
    """執行資料庫遷移"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 資料庫檔案不存在: {DB_PATH}")
        return False

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 檢查 is_active 欄位是否已存在
        cursor.execute("PRAGMA table_info(cards)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'is_active' in columns:
            print("✅ is_active 欄位已存在，無需遷移")
            return True

        print("🔄 開始遷移：為 cards 表添加 is_active 欄位...")

        # 添加 is_active 欄位，預設值為 1 (True)
        cursor.execute("""
            ALTER TABLE cards
            ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
        """)

        conn.commit()
        print("✅ 遷移完成！所有現有卡片已設定為啟用狀態")

        # 驗證遷移
        cursor.execute("SELECT COUNT(*) FROM cards WHERE is_active = 1")
        active_count = cursor.fetchone()[0]
        print(f"📊 啟用的卡片數量: {active_count}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ 遷移失敗: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("資料庫遷移：為 cards 表添加 is_active 欄位")
    print("=" * 50)

    success = migrate()

    if success:
        print("\n✅ 遷移成功完成！")
    else:
        print("\n❌ 遷移失敗，請檢查錯誤訊息")

#!/usr/bin/env python3
import sqlite3
import sys
from datetime import datetime

DB_PATH = '/home/pi/molidorbackend/moli_door.db'

def get_columns():
    """獲取資料表欄位"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    conn.close()
    return columns

def register_user():
    """註冊新使用者到資料庫"""
    print("=== 使用者註冊系統 ===\n")

    student_id = input("請輸入學號: ").strip()
    if not student_id:
        print("錯誤: 學號不能為空")
        return False

    name = input("請輸入姓名: ").strip()
    if not name:
        print("錯誤: 姓名不能為空")
        return False

    rfid_uid = input("請輸入 RFID UID: ").strip()
    if not rfid_uid:
        print("錯誤: RFID UID 不能為空")
        return False

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        columns = get_columns()

        cursor.execute("SELECT student_id FROM users WHERE student_id = ?", (student_id,))
        if cursor.fetchone():
            print(f"錯誤: 學號 {student_id} 已存在")
            conn.close()
            return False

        cursor.execute("SELECT rfid_uid FROM users WHERE rfid_uid = ?", (rfid_uid,))
        if cursor.fetchone():
            print(f"錯誤: RFID UID {rfid_uid} 已被使用")
            conn.close()
            return False

        created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if 'created_at' in columns:
            cursor.execute(
                "INSERT INTO users (student_id, name, rfid_uid, created_at) VALUES (?, ?, ?, ?)",
                (student_id, name, rfid_uid, created_at)
            )
        else:
            cursor.execute(
                "INSERT INTO users (student_id, name, rfid_uid) VALUES (?, ?, ?)",
                (student_id, name, rfid_uid)
            )

        conn.commit()
        conn.close()

        print(f"\n✓ 註冊成功!")
        print(f"  學號: {student_id}")
        print(f"  姓名: {name}")
        print(f"  RFID UID: {rfid_uid}")
        return True

    except sqlite3.Error as e:
        print(f"資料庫錯誤: {e}")
        return False

def update_user():
    """修改使用者資料"""
    print("=== 使用者資料修改 ===\n")

    student_id = input("請輸入要修改的學號: ").strip()
    if not student_id:
        print("錯誤: 學號不能為空")
        return False

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT student_id, name, rfid_uid FROM users WHERE student_id = ?", (student_id,))
        user = cursor.fetchone()

        if not user:
            print(f"錯誤: 找不到學號 {student_id} 的用戶")
            conn.close()
            return False

        print(f"\n目前資料:")
        print(f"  學號: {user[0]}")
        print(f"  姓名: {user[1]}")
        print(f"  RFID UID: {user[2]}")
        print("\n請輸入新資料 (直接按 Enter 保持不變):\n")

        new_name = input(f"新姓名 [{user[1]}]: ").strip()
        new_rfid = input(f"新 RFID UID [{user[2]}]: ").strip()

        if not new_name and not new_rfid:
            print("沒有任何修改")
            conn.close()
            return False

        # 使用原值如果沒有輸入新值
        new_name = new_name if new_name else user[1]
        new_rfid = new_rfid if new_rfid else user[2]

        # 檢查新 RFID 是否被其他使用者使用
        if new_rfid != user[2]:
            cursor.execute("SELECT student_id FROM users WHERE rfid_uid = ? AND student_id != ?", 
                         (new_rfid, student_id))
            if cursor.fetchone():
                print(f"錯誤: RFID UID {new_rfid} 已被其他使用者使用")
                conn.close()
                return False

        cursor.execute(
            "UPDATE users SET name = ?, rfid_uid = ? WHERE student_id = ?",
            (new_name, new_rfid, student_id)
        )

        conn.commit()
        conn.close()

        print(f"\n✓ 修改成功!")
        print(f"  學號: {student_id}")
        print(f"  姓名: {new_name}")
        print(f"  RFID UID: {new_rfid}")
        return True

    except sqlite3.Error as e:
        print(f"資料庫錯誤: {e}")
        return False

def main_menu():
    """主選單"""
    while True:
        print("\n" + "="*30)
        print("使用者管理系統")
        print("="*30)
        print("1. 註冊新使用者")
        print("2. 修改使用者資料")
        print("3. 退出")
        print("="*30)

        choice = input("\n請選擇功能 (1-3): ").strip()

        if choice == '1':
            register_user()
        elif choice == '2':
            update_user()
        elif choice == '3':
            print("再見!")
            break
        else:
            print("無效的選擇，請重新輸入")

def main():
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(0)

if __name__ == "__main__":
    main()


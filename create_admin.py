import sqlite3
import bcrypt
import uuid
import getpass

def create_admin():
    conn = sqlite3.connect('/home/pi/Host/molidorbackend/data/moli_door.db')
    cur = conn.cursor()
    
    # 創建 admins 表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    print("=" * 50)
    print("創建管理員帳號")
    print("=" * 50)
    
    username = input("管理員帳號: ").strip()
    name = input("管理員姓名: ").strip()
    password = getpass.getpass("密碼: ")
    password_confirm = getpass.getpass("確認密碼: ")
    
    if password != password_confirm:
        print("❌ 密碼不一致")
        return
    
    if len(password) < 6:
        print("❌ 密碼長度至少 6 個字元")
        return
    
    # 檢查帳號是否已存在
    cur.execute("SELECT COUNT(*) FROM admins WHERE username = ?", (username,))
    if cur.fetchone()[0] > 0:
        print(f"❌ 帳號 {username} 已存在")
        return
    
    # 產生密碼雜湊
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # 插入管理員
    admin_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO admins (id, username, password_hash, name) VALUES (?, ?, ?, ?)",
        (admin_id, username, password_hash, name)
    )
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ 管理員 {username} ({name}) 創建成功！")
    print(f"ID: {admin_id}")

if __name__ == "__main__":
    try:
        create_admin()
    except KeyboardInterrupt:
        print("\n操作取消")
    except Exception as e:
        print(f"\n❌ 錯誤: {e}")

import sqlite3
import bcrypt
import uuid

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

# 管理員資料
username = "bs10081"
name = "系統管理員"
password = "isPasswd"

# 檢查是否已有此管理員
cur.execute("SELECT COUNT(*) FROM admins WHERE username = ?", (username,))
if cur.fetchone()[0] > 0:
    print(f"⚠️ 管理員 {username} 已存在")
    conn.close()
    exit(0)

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

print("=" * 50)
print("✅ 管理員帳號已創建：")
print("=" * 50)
print(f"帳號：{username}")
print(f"姓名：{name}")
print(f"ID：{admin_id}")

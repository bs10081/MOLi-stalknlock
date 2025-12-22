import sqlite3
import uuid
from datetime import datetime

conn = sqlite3.connect('/home/pi/Host/molidorbackend/data/moli_door.db')
cur = conn.cursor()

print("開始遷移資料庫至一人多卡結構...")

# Step 1: 創建 cards 表
print("\n[1/5] 創建 cards 表...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        rfid_uid VARCHAR(50) NOT NULL UNIQUE,
        user_id VARCHAR(36) NOT NULL,
        nickname VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users (id)
    )
""")
print("✅ cards 表已創建")

# Step 2: 從 users 表遷移 rfid_uid 到 cards 表
print("\n[2/5] 遷移現有卡片資料...")
cur.execute("SELECT id, rfid_uid, created_at FROM users WHERE rfid_uid IS NOT NULL AND rfid_uid != ''")
users_with_cards = cur.fetchall()

migrated_count = 0
for user_id, rfid_uid, created_at in users_with_cards:
    card_id = str(uuid.uuid4())
    try:
        cur.execute(
            "INSERT INTO cards (id, rfid_uid, user_id, nickname, created_at) VALUES (?, ?, ?, ?, ?)",
            (card_id, rfid_uid, user_id, "主要卡片", created_at)
        )
        migrated_count += 1
        print(f"  ✅ 遷移卡片: {rfid_uid} -> user_id: {user_id}")
    except sqlite3.IntegrityError as e:
        print(f"  ⚠️ 跳過重複卡片: {rfid_uid} ({e})")

print(f"✅ 已遷移 {migrated_count} 張卡片")

# Step 3: 創建新的 users 表（不含 rfid_uid）
print("\n[3/5] 重建 users 表...")
cur.execute("ALTER TABLE users RENAME TO users_old")
cur.execute("""
    CREATE TABLE users (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
cur.execute("INSERT INTO users (id, student_id, name, created_at) SELECT id, student_id, name, created_at FROM users_old")
cur.execute("DROP TABLE users_old")
print("✅ users 表已重建")

# Step 4: 更新 access_logs 表添加 card_id
print("\n[4/5] 更新 access_logs 表...")
cur.execute("ALTER TABLE access_logs RENAME TO access_logs_old")
cur.execute("""
    CREATE TABLE access_logs (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(36) NOT NULL,
        card_id VARCHAR(36),
        rfid_uid VARCHAR(50),
        action VARCHAR(10),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users (id),
        FOREIGN KEY(card_id) REFERENCES cards (id)
    )
""")

# 遷移舊資料並自動填充 card_id
cur.execute("""
    INSERT INTO access_logs (id, user_id, card_id, rfid_uid, action, timestamp)
    SELECT 
        al.id,
        al.user_id,
        c.id,
        al.rfid_uid,
        al.action,
        al.timestamp
    FROM access_logs_old al
    LEFT JOIN cards c ON al.rfid_uid = c.rfid_uid
""")
cur.execute("DROP TABLE access_logs_old")
print("✅ access_logs 表已更新")

# Step 5: 更新 registration_sessions 表（使用 user_id）
print("\n[5/5] 更新 registration_sessions 表...")
try:
    cur.execute("DROP TABLE IF EXISTS registration_sessions")
    cur.execute("""
        CREATE TABLE registration_sessions (
            user_id VARCHAR(36) NOT NULL PRIMARY KEY,
            first_uid VARCHAR(50),
            step INTEGER DEFAULT 0,
            expires_at TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users (id)
        )
    """)
    print("✅ registration_sessions 表已更新")
except Exception as e:
    print(f"⚠️ registration_sessions 表更新失敗: {e}")

# 提交更改
conn.commit()

# 驗證遷移結果
print("\n" + "="*50)
print("遷移結果驗證:")
print("="*50)

cur.execute("SELECT COUNT(*) FROM users")
user_count = cur.fetchone()[0]
print(f"👥 用戶總數: {user_count}")

cur.execute("SELECT COUNT(*) FROM cards")
card_count = cur.fetchone()[0]
print(f"💳 卡片總數: {card_count}")

cur.execute("SELECT COUNT(*) FROM access_logs")
log_count = cur.fetchone()[0]
print(f"📝 存取記錄: {log_count}")

# 顯示每個用戶的卡片數
print("\n每個用戶的卡片數:")
cur.execute("""
    SELECT u.student_id, u.name, COUNT(c.id) as card_count
    FROM users u
    LEFT JOIN cards c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY card_count DESC, u.student_id
""")
for student_id, name, count in cur.fetchall():
    status = "✅" if count > 0 else "⚠️"
    print(f"  {status} {student_id} ({name}): {count} 張卡片")

conn.close()
print("\n✅ 資料庫遷移完成！")

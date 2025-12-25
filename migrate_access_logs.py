import sqlite3

conn = sqlite3.connect('data/moli_door.db')
cur = conn.cursor()

print("Migrating access_logs table...")

# 1. 備份舊表
print("1. Backing up access_logs...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS access_logs_backup AS 
    SELECT * FROM access_logs
""")
conn.commit()

# 2. 刪除舊表
print("2. Dropping old access_logs table...")
cur.execute("DROP TABLE access_logs")
conn.commit()

# 3. 建立新表（使用 user_id）
print("3. Creating new access_logs table with user_id...")
cur.execute("""
    CREATE TABLE access_logs (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(36) NOT NULL,
        rfid_uid VARCHAR(50),
        action VARCHAR(10),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users (id)
    )
""")
conn.commit()

print("✅ Migration complete!")
conn.close()

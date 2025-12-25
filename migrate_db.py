import sqlite3
import uuid
from datetime import datetime

# Connect to database
conn = sqlite3.connect('data/moli_door.db')
cur = conn.cursor()

print("Starting database migration...")

# 1. Backup old users table
print("1. Backing up old users table...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS users_backup AS 
    SELECT * FROM users
""")
conn.commit()
print("   ✓ Backup created")

# 2. Get all existing users
print("2. Reading existing users...")
cur.execute("SELECT student_id, name, rfid_uid, created_at FROM users")
old_users = cur.fetchall()
print(f"   ✓ Found {len(old_users)} users")

# 3. Drop old users table
print("3. Dropping old users table...")
cur.execute("DROP TABLE users")
conn.commit()
print("   ✓ Old table dropped")

# 4. Create new users table with UUID
print("4. Creating new users table with UUID...")
cur.execute("""
    CREATE TABLE users (
        id VARCHAR(36) NOT NULL,
        student_id VARCHAR(20) NOT NULL,
        name VARCHAR(50) NOT NULL,
        rfid_uid VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE (student_id),
        UNIQUE (rfid_uid)
    )
""")
conn.commit()
print("   ✓ New table created")

# 5. Migrate data with UUIDs
print("5. Migrating data with generated UUIDs...")
for student_id, name, rfid_uid, created_at in old_users:
    user_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO users (id, student_id, name, rfid_uid, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, student_id, name, rfid_uid, created_at)
    )
    print(f"   ✓ Migrated: {student_id} ({name}) -> UUID: {user_id}")

conn.commit()
print("   ✓ All users migrated")

# 6. Verify migration
cur.execute("SELECT COUNT(*) FROM users")
new_count = cur.fetchone()[0]
print(f"\n✅ Migration complete! Total users: {new_count}")

# 7. Show sample
print("\nSample migrated users:")
cur.execute("SELECT id, student_id, name, rfid_uid FROM users LIMIT 3")
for row in cur.fetchall():
    print(f"  {row[1]} ({row[2]}): UUID={row[0]}, RFID={row[3]}")

conn.close()
print("\n🎉 Database migration successful!")

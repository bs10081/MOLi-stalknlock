#!/usr/bin/env python3
"""
Database migration for v2.1.0
Add card_type column to cards table
"""

import sqlite3
import sys

def migrate():
    try:
        # Connect to database
        conn = sqlite3.connect('/app/data/moli_door.db')
        cursor = conn.cursor()

        # Check if column already exists
        cursor.execute("PRAGMA table_info(cards)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'card_type' in columns:
            print("✅ Migration already applied: card_type column exists")
            return

        # Add card_type column
        print("🔄 Adding card_type column...")
        cursor.execute("""
            ALTER TABLE cards
            ADD COLUMN card_type VARCHAR(20) NOT NULL DEFAULT 'access'
        """)

        # Verify
        cursor.execute("SELECT COUNT(*) FROM cards")
        total_cards = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM cards WHERE card_type = 'access'")
        access_cards = cursor.fetchone()[0]

        conn.commit()

        print(f"✅ Migration completed successfully!")
        print(f"   Total cards: {total_cards}")
        print(f"   Access cards: {access_cards}")

        conn.close()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()

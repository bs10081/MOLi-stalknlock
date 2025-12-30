#!/usr/bin/env python3
"""建立測試管理員帳號"""

import sys
sys.path.insert(0, '/Users/bs10081/Developer/MOLi-stalknlock')

from app.database import SessionLocal, Admin, generate_uuid
from app.services.auth import hash_password

def create_test_admin():
    db = SessionLocal()
    try:
        # 檢查是否已存在測試管理員
        existing = db.query(Admin).filter(Admin.username == "test_admin").first()
        if existing:
            print(f"✅ 測試管理員已存在: test_admin (ID: {existing.id})")
            return

        # 建立測試管理員
        admin = Admin(
            id=generate_uuid(),
            username="test_admin",
            password_hash=hash_password("test123"),
            name="測試管理員"
        )
        db.add(admin)
        db.commit()
        print(f"✅ 測試管理員已建立: test_admin / test123 (ID: {admin.id})")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_admin()

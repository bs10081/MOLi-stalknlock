#!/usr/bin/env python3
"""建立測試使用者"""

import sys
sys.path.insert(0, '/Users/bs10081/Developer/MOLi-stalknlock')

from app.database import SessionLocal, User, generate_uuid

def create_test_user():
    db = SessionLocal()
    try:
        # 檢查是否已存在測試使用者
        existing = db.query(User).filter(User.student_id == "B11109999").first()
        if existing:
            print(f"✅ 測試使用者已存在: B11109999 - {existing.name} (ID: {existing.id})")
            return

        # 建立測試使用者
        user = User(
            id=generate_uuid(),
            student_id="B11109999",
            name="測試使用者",
            email="test@example.com",
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"✅ 測試使用者已建立: B11109999 - {user.name} (ID: {user.id})")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()

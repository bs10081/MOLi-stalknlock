#!/usr/bin/env python3
"""建立測試卡片"""

import sys
sys.path.insert(0, '/Users/bs10081/Developer/MOLi-stalknlock')

from app.database import SessionLocal, User, Card, generate_uuid

def create_test_card():
    db = SessionLocal()
    try:
        # 查找測試使用者
        user = db.query(User).filter(User.student_id == "B11109999").first()
        if not user:
            print("❌ 測試使用者不存在，請先執行 create_test_user.py")
            return

        # 檢查是否已存在測試卡片
        existing = db.query(Card).filter(Card.rfid_uid == "TEST123456").first()
        if existing:
            print(f"✅ 測試卡片已存在: TEST123456 (ID: {existing.id})")
            return

        # 建立測試卡片
        card = Card(
            id=generate_uuid(),
            rfid_uid="TEST123456",
            user_id=user.id,
            nickname="測試卡片",
            is_active=True
        )
        db.add(card)
        db.commit()
        print(f"✅ 測試卡片已建立: TEST123456 - {user.name} (ID: {card.id})")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_card()

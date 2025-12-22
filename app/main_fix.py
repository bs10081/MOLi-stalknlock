# 只顯示修改的部分
async def handle_normal_mode(card_uid: str):
    """Handle card scan in normal access control mode"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.rfid_uid == card_uid).first()
        
        if user:
            log.info(f"✅ Access granted: {user.name} ({user.student_id})")
            
            # 第一優先級：立即開門（同步執行，不等待）
            open_lock()
            
            # 背景任務：記錄和通知（不阻塞）
            async def background_tasks():
                # 資料庫寫入
                try:
                    db.add(AccessLog(user_id=user.id, rfid_uid=card_uid, action="entry"))
                    db.commit()
                except Exception as e:
                    log.error(f"Failed to log access: {e}")
                
                # Telegram 通知（非阻塞）
                await asyncio.to_thread(send_telegram, f"歡迎！{user.name} ({user.student_id}) 已進入實驗室")
            
            # 在背景執行任務
            asyncio.create_task(background_tasks())
        else:
            log.warning(f"⚠️ Unknown card: {card_uid}")
            deny_access()
    finally:
        db.close()

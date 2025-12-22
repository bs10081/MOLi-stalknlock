import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import init_db, get_db, User, Card, RegistrationSession, AccessLog
from app.routers import api, web
from app.services.rfid_reader import rfid_reader
from app.services.gpio_control import open_lock, deny_access
from app.services.telegram import send_telegram

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

# Application state
app_state = {
    "mode": "NORMAL",  # NORMAL or REGISTER
    "target_student_id": None,
    "first_scan_uid": None,
    "step": 0,
    "start_time": 0
}

async def handle_rfid_scan(card_uid: str):
    """Handle RFID card scan based on current mode"""
    log.info(f"📇 Card scanned: {card_uid}")
    
    if app_state["mode"] == "NORMAL":
        await handle_normal_mode(card_uid)
    elif app_state["mode"] == "REGISTER":
        await handle_register_mode(card_uid)

async def handle_normal_mode(card_uid: str):
    """Handle card scan in normal access control mode (支援一人多卡)"""
    db = next(get_db())
    try:
        # 🔍 查詢卡片（一人多卡支援）
        card = db.query(Card).filter(Card.rfid_uid == card_uid).first()
        
        if card and card.user:
            user = card.user
            card_info = f" ({card.nickname})" if card.nickname else ""
            log.info(f"✅ Access granted: {user.name} ({user.student_id}){card_info}")
            
            # 第一優先級：立即開門（同步執行，不等待）
            open_lock()
            
            # 背景任務：記錄和通知（不阻塞）
            async def background_tasks():
                # 資料庫寫入（記錄使用哪張卡）
                try:
                    db.add(AccessLog(
                        user_id=user.id,
                        card_id=card.id,
                        rfid_uid=card_uid,
                        action="entry"
                    ))
                    db.commit()
                except Exception as e:
                    log.error(f"Failed to log access: {e}")
                
                # Telegram 通知（非阻塞）
                message = f"歡迎！{user.name} ({user.student_id}) 已進入實驗室{card_info}"
                await asyncio.to_thread(send_telegram, message)
            
            # 在背景執行任務
            asyncio.create_task(background_tasks())
        else:
            log.warning(f"⚠️ Unknown card: {card_uid}")
            deny_access()
    finally:
        db.close()

async def handle_register_mode(card_uid: str):
    """Handle card scan in registration mode (支援一人多卡)"""
    # Check timeout
    if (datetime.utcnow().timestamp() - app_state["start_time"]) > 90:
        log.info("⏰ Registration timeout, returning to normal mode")
        app_state["mode"] = "NORMAL"
        return
    
    log.info(f"📝 [Registration] Card scanned: {card_uid}")
    
    db = next(get_db())
    try:
        user = db.query(User).filter(User.student_id == app_state["target_student_id"]).first()
        if not user:
            log.error(f"❌ User not found: {app_state['target_student_id']}")
            app_state["mode"] = "NORMAL"
            return
        
        session = db.query(RegistrationSession).filter(
            RegistrationSession.user_id == user.id
        ).first()
        
        if not session:
            log.error("❌ No registration session found")
            app_state["mode"] = "NORMAL"
            return
        
        # First scan
        if session.step == 0:
            # Check if card already bound to ANOTHER user
            existing_card = db.query(Card).filter(Card.rfid_uid == card_uid).first()
            
            if existing_card and existing_card.user_id != user.id:
                log.warning(f"⚠️ Card already bound to {existing_card.user.student_id}")
                asyncio.create_task(asyncio.to_thread(
                    send_telegram,
                    f"⚠️ 綁定失敗：卡片已被 {existing_card.user.student_id} 使用"
                ))
                return
            
            # 如果是同一個用戶重複綁定同一張卡（允許重新綁定）
            if existing_card and existing_card.user_id == user.id:
                log.info(f"ℹ️ Card already belongs to this user, allowing re-bind")
            
            session.first_uid = card_uid
            session.step = 1
            db.commit()
            log.info(f"📝 First scan OK, please scan again to confirm")
        
        # Second scan
        elif session.step == 1:
            if session.first_uid == card_uid:
                # 🎯 創建或更新卡片記錄
                existing_card = db.query(Card).filter(
                    Card.rfid_uid == card_uid,
                    Card.user_id == user.id
                ).first()
                
                if existing_card:
                    log.info(f"ℹ️ Card already exists, updating...")
                else:
                    # 創建新卡片
                    from app.database import generate_uuid
                    new_card = Card(
                        id=generate_uuid(),
                        rfid_uid=card_uid,
                        user_id=user.id,
                        nickname=None  # 可以之後通過 API 更新
                    )
                    db.add(new_card)
                
                db.delete(session)
                db.commit()
                
                # 計算用戶總卡片數
                card_count = db.query(Card).filter(Card.user_id == user.id).count()
                
                log.info(f"🎉 Card bound: {user.student_id} -> {card_uid} (總共 {card_count} 張卡片)")
                
                # 立即開門慶祝
                open_lock()
                
                # Telegram 通知改為非阻塞
                asyncio.create_task(asyncio.to_thread(
                    send_telegram,
                    f"綁定成功：{user.name} ({user.student_id})\n現在有 {card_count} 張卡片"
                ))
                
                # Return to normal mode
                app_state["mode"] = "NORMAL"
            else:
                log.warning(f"❌ Card mismatch, resetting")
                session.first_uid = None
                session.step = 0
                db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    log.info("🚀 MOLi Door System starting up...")
    
    # Initialize database
    init_db()
    log.info("✅ Database initialized")
    
    # Start RFID reader in background
    asyncio.create_task(rfid_reader.read_loop(handle_rfid_scan))
    log.info("✅ RFID reader started")
    
    log.info("✅ System ready!")
    
    yield
    
    # Shutdown
    log.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="MOLi Door System",
    description="FastAPI-based door access control system with web UI",
    version="2.0.0",
    lifespan=lifespan
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routers
app.include_router(web.router)
app.include_router(api.router)

# Endpoint to switch to registration mode (called by web frontend)
@app.post("/mode/register")
async def switch_to_register_mode(student_id: str, db: Session = Depends(get_db)):
    """Switch system to registration mode for a specific student"""
    # 查詢或創建用戶
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        log.error(f"❌ User not found: {student_id}")
        return {"status": "error", "message": "用戶不存在"}
    
    # 計算當前卡片數量
    initial_card_count = db.query(Card).filter(Card.user_id == user.id).count()
    
    # 創建或更新 registration session
    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()
    
    if session:
        session.first_uid = None
        session.step = 0
        session.expires_at = datetime.utcnow() + timedelta(seconds=90)
        session.initial_card_count = initial_card_count
    else:
        session = RegistrationSession(
            user_id=user.id,
            first_uid=None,
            step=0,
            expires_at=datetime.utcnow() + timedelta(seconds=90),
            initial_card_count=initial_card_count
        )
        db.add(session)
    
    db.commit()
    
    # Switch to REGISTER mode
    app_state["mode"] = "REGISTER"
    app_state["target_student_id"] = student_id
    app_state["step"] = 0
    app_state["start_time"] = datetime.utcnow().timestamp()
    
    log.info(f"🔄 Switched to REGISTER mode for {student_id} (initial cards: {initial_card_count})")
    return {"status": "ok", "message": "請刷卡"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

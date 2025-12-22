import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import init_db, get_db, User, RegistrationSession
from app.routers import api, web
from app.services.rfid_reader import rfid_reader
from app.services.gpio_control import open_lock, deny_access
from app.services.telegram import send_telegram
from datetime import datetime

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
    """Handle card scan in normal access control mode"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.rfid_uid == card_uid).first()
        
        if user:
            log.info(f"✅ Access granted: {user.name} ({user.student_id})")
            
            # Open lock in background
            asyncio.create_task(asyncio.to_thread(open_lock))
            
            # Send notification
            send_telegram(f"歡迎！{user.name} ({user.student_id}) 已進入實驗室")
        else:
            log.warning(f"⚠️ Unknown card: {card_uid}")
            deny_access()
    finally:
        db.close()

async def handle_register_mode(card_uid: str):
    """Handle card scan in registration mode"""
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
            # Check if card already bound
            existing = db.query(User).filter(
                User.rfid_uid == card_uid,
                User.id != user.id
            ).first()
            
            if existing:
                log.warning(f"⚠️ Card already bound to {existing.student_id}")
                send_telegram(f"⚠️ 綁定失敗：卡片已被 {existing.student_id} 使用")
                return
            
            session.first_uid = card_uid
            session.step = 1
            db.commit()
            log.info(f"📝 First scan OK, please scan again to confirm")
        
        # Second scan
        elif session.step == 1:
            if session.first_uid == card_uid:
                # Bind card
                user.rfid_uid = card_uid
                db.delete(session)
                db.commit()
                
                log.info(f"🎉 Card bound: {user.student_id} -> {card_uid}")
                send_telegram(f"綁定成功：{user.name} ({user.student_id})")
                
                # Open lock as celebration
                asyncio.create_task(asyncio.to_thread(open_lock))
                
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
async def switch_to_register_mode(student_id: str):
    """Switch system to registration mode for a specific student"""
    app_state["mode"] = "REGISTER"
    app_state["target_student_id"] = student_id
    app_state["step"] = 0
    app_state["start_time"] = datetime.utcnow().timestamp()
    
    log.info(f"🔄 Switched to REGISTER mode for {student_id}")
    return {"status": "ok", "message": "請刷卡"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

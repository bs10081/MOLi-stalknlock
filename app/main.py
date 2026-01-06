import asyncio
import logging
import sys
import pytz
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.routers import api, web, admin

from app.database import init_db, get_db, User, Card, RegistrationSession, AccessLog

from app.services.rfid_reader import rfid_reader
from app.services.gpio_control import (
    open_lock, deny_access, unlock_persistent, lock_door, daytime_manager
)
from app.services.telegram import send_telegram
from app.config import DAYTIME_END_HOUR, DAYTIME_MODE_ENABLED, TIMEZONE

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

async def handle_rfid_scan(card_uid: str):
    """Handle RFID card scan based on current mode"""
    try:
        log.info(f"📇 Card scanned: {card_uid}")

        # 查詢資料庫決定當前模式
        db = next(get_db())
        try:
            # 檢查是否有未過期且未完成的 RegistrationSession
            now = datetime.utcnow()
            active_session = db.query(RegistrationSession).filter(
                RegistrationSession.expires_at > now,
                RegistrationSession.completed == False
            ).first()

            if active_session:
                # 進入註冊模式
                await handle_register_mode(card_uid)
            else:
                # 進入正常模式
                await handle_normal_mode(card_uid)
        finally:
            db.close()

    except Exception as e:
        log.error(f"❌ Error handling RFID scan: {e}", exc_info=True)

async def handle_normal_mode(card_uid: str):
    """Handle card scan in normal access control mode (支援一人多卡)"""
    db = next(get_db())
    try:
        # 🔍 查詢卡片（一人多卡支援）
        card = db.query(Card).filter(Card.rfid_uid == card_uid).first()

        if card and card.user:
            user = card.user

            # 檢查使用者是否已啟用
            if not user.is_active:
                log.warning(f"⚠️ Access denied (user disabled): {user.name} ({user.student_id})")
                deny_access()
                return

            # 檢查卡片是否已啟用
            if not card.is_active:
                log.warning(f"⚠️ Access denied (card disabled): {user.name} ({user.student_id}) - Card {card.rfid_uid}")
                deny_access()
                return

            card_info = f" ({card.nickname})" if card.nickname else ""
            log.info(f"✅ Access granted: {user.name} ({user.student_id}){card_info}")

            # === 白天模式判斷 ===
            if daytime_manager.should_use_daytime_mode():
                if not daytime_manager.is_daytime_unlocked:
                    # 第一次解鎖：持續解鎖
                    unlock_persistent()
                    daytime_manager.set_daytime_unlocked(
                        True,
                        f"{user.name} ({user.student_id})"
                    )
                    log.info(f"🌞 Daytime mode activated by {user.name}")

                    # Telegram 通知（白天模式啟動）
                    message = f"🌞 [白天模式] {user.name} ({user.student_id}) 開啟門禁{card_info}\n門將保持解鎖至 {DAYTIME_END_HOUR}:00"
                    asyncio.create_task(asyncio.to_thread(send_telegram, message))
                else:
                    # 已經解鎖：只記錄，不操作門鎖
                    log.info(f"🌞 Daytime mode: Door already unlocked, logging only")
            else:
                # 正常模式：開門後自動鎖回
                open_lock()

                # Telegram 通知
                message = f"歡迎！{user.name} ({user.student_id}) 解鎖門禁{card_info}"
                asyncio.create_task(asyncio.to_thread(send_telegram, message))

            # 背景任務：記錄存取日誌（兩種模式都要記錄）
            async def background_tasks():
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

            asyncio.create_task(background_tasks())
        else:
            log.warning(f"⚠️ Unknown card: {card_uid}")
            deny_access()
    finally:
        db.close()

async def handle_register_mode(card_uid: str):
    """Handle card scan in registration mode (支援一人多卡)"""
    log.info(f"📝 [Registration] Card scanned: {card_uid}")

    db = next(get_db())
    try:
        # 查詢未過期且未完成的 RegistrationSession
        now = datetime.utcnow()
        session = db.query(RegistrationSession).filter(
            RegistrationSession.expires_at > now,
            RegistrationSession.completed == False
        ).first()

        if not session:
            log.error("❌ No active registration session found")
            return

        # 檢查是否超時
        if session.expires_at <= now:
            log.info("⏰ Registration timeout, marking session as expired")
            session.completed = True
            db.commit()
            return

        # 取得關聯的使用者
        user = session.user
        if not user:
            log.error(f"❌ User not found for session")
            session.completed = True
            db.commit()
            return

        # First scan
        if session.step == 0:
            # 檢查卡片是否已被其他使用者綁定
            existing_card = db.query(Card).filter(Card.rfid_uid == card_uid).first()

            if existing_card and existing_card.user_id != user.id:
                log.warning(f"⚠️ Card already bound to {existing_card.user.student_id}")
                asyncio.create_task(asyncio.to_thread(
                    send_telegram,
                    f"⚠️ 綁定失敗：卡片已被 {existing_card.user.student_id} 使用"
                ))
                return

            # 如果是同一個使用者重複綁定同一張卡（允許重新綁定）
            if existing_card and existing_card.user_id == user.id:
                log.info(f"ℹ️ Card already belongs to this user, allowing re-bind")

            # 記錄第一次刷卡的 UID
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
                    # 如果 session 有新的 nickname，則更新
                    if session.nickname is not None:
                        existing_card.nickname = session.nickname
                else:
                    # 創建新卡片
                    from app.database import generate_uuid
                    new_card = Card(
                        id=generate_uuid(),
                        rfid_uid=card_uid,
                        user_id=user.id,
                        nickname=session.nickname  # 使用 session 中的卡片別名
                    )
                    db.add(new_card)

                # 標記 session 為已完成（而非刪除）
                session.completed = True
                db.commit()

                # 計算使用者總卡片數
                card_count = db.query(Card).filter(Card.user_id == user.id).count()

                log.info(f"🎉 Card bound: {user.student_id} -> {card_uid} (總共 {card_count} 張卡片)")

                # 立即開門慶祝
                open_lock()

                # Telegram 通知改為非阻塞
                asyncio.create_task(asyncio.to_thread(
                    send_telegram,
                    f"綁定成功：{user.name} ({user.student_id})\n現在有 {card_count} 張卡片"
                ))
            else:
                log.warning(f"❌ Card mismatch, resetting")
                session.first_uid = None
                session.step = 0
                db.commit()
    finally:
        db.close()

async def auto_lock_scheduler():
    """自動鎖門排程器 - 每天在指定時間鎖門"""
    tz = pytz.timezone(TIMEZONE)

    while True:
        now = datetime.now(tz)

        # 計算到今天結束時間的秒數
        target_time = now.replace(
            hour=DAYTIME_END_HOUR,
            minute=0,
            second=0,
            microsecond=0
        )

        if now >= target_time:
            # 已過結束時間，等到明天
            target_time += timedelta(days=1)

        wait_seconds = (target_time - now).total_seconds()
        log.info(f"⏰ Auto-lock scheduled in {wait_seconds:.0f} seconds ({target_time.strftime('%Y-%m-%d %H:%M:%S')})")

        await asyncio.sleep(wait_seconds)

        # 執行鎖門
        if daytime_manager.is_daytime_unlocked:
            log.info(f"🔒 Auto-lock triggered at {DAYTIME_END_HOUR}:00")
            lock_door()
            daytime_manager.set_daytime_unlocked(False)

            # Telegram 通知
            await asyncio.to_thread(
                send_telegram,
                f"🌙 [白天模式結束] 門已自動上鎖 ({DAYTIME_END_HOUR}:00)"
            )

        # 等待 1 分鐘避免重複觸發
        await asyncio.sleep(60)

async def check_daytime_status_on_startup():
    """啟動時檢查白天模式狀態"""
    if not DAYTIME_MODE_ENABLED:
        return

    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)

    if daytime_manager.is_daytime_hours():
        log.info(f"🌞 System started during daytime hours ({now.strftime('%H:%M')})")
        log.info("   Daytime mode available - waiting for first card scan")
        # 安全考量：不自動解鎖，等待第一次刷卡
    else:
        log.info(f"🌙 System started outside daytime hours ({now.strftime('%H:%M')})")
        # 確保門是鎖上的
        lock_door()
        daytime_manager.set_daytime_unlocked(False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    log.info("🚀 MOLi Door System starting up...")

    # Initialize database
    init_db()
    log.info("✅ Database initialized")

    # 檢查啟動時的白天模式狀態
    await check_daytime_status_on_startup()

    # Start RFID reader in background
    asyncio.create_task(rfid_reader.read_loop(handle_rfid_scan))
    log.info("✅ RFID reader started")

    # 啟動自動鎖門排程器
    if DAYTIME_MODE_ENABLED:
        asyncio.create_task(auto_lock_scheduler())
        log.info("✅ Auto-lock scheduler started")

    log.info("✅ System ready!")

    yield

    # Shutdown
    log.info("Shutting down...")
    # 關機時確保門鎖上
    if daytime_manager.is_daytime_unlocked:
        lock_door()
        log.info("🔒 Door locked on shutdown")

# Create FastAPI app
app = FastAPI(
    title="MOLi Door System",
    description="FastAPI-based door access control system with web UI",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware for React SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8000",
        "http://localhost:8001",
        "http://100.72.74.25:8000",
        "http://100.72.74.25:8001",
    ],
    allow_credentials=True,  # 必須，讓 cookie 能被傳送
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount React SPA assets (if exists)
import os
from fastapi.responses import FileResponse

if os.path.exists("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="spa_assets")

# Register routers
app.include_router(web.router)
app.include_router(admin.router)
app.include_router(api.router)

# Endpoint to switch to registration mode (called by web frontend)
@app.post("/mode/register")
async def switch_to_register_mode(
    student_id: str = Form(...),
    nickname: str = Form(None),
    db: Session = Depends(get_db)
):
    """Switch system to registration mode for a specific student (支援卡片別名)"""
    # 查詢或創建使用者
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        log.error(f"❌ User not found: {student_id}")
        return {"status": "error", "message": "使用者不存在"}

    # 計算當前卡片數量
    initial_card_count = db.query(Card).filter(Card.user_id == user.id).count()

    # 創建或更新 registration session
    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()

    if session:
        # 更新現有 session
        session.first_uid = None
        session.step = 0
        session.expires_at = datetime.utcnow() + timedelta(seconds=90)
        session.initial_card_count = initial_card_count
        session.completed = False  # 重置為未完成
        session.nickname = nickname  # 設置卡片別名
    else:
        # 創建新 session
        session = RegistrationSession(
            user_id=user.id,
            first_uid=None,
            step=0,
            expires_at=datetime.utcnow() + timedelta(seconds=90),
            initial_card_count=initial_card_count,
            completed=False,
            nickname=nickname  # 設置卡片別名
        )
        db.add(session)

    db.commit()

    log.info(f"🔄 Switched to REGISTER mode for {student_id} (initial cards: {initial_card_count}, nickname: {nickname})")
    return {"status": "ok", "message": "請刷卡"}

# Serve React SPA for all /admin/* and /dashboard/* routes (catch-all for React Router)
@app.get("/admin/{full_path:path}")
@app.get("/dashboard/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve React SPA for all admin/dashboard routes (支援 React Router)"""
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    # Fallback: 如果沒有前端構建，返回 404
    from fastapi import HTTPException
    raise HTTPException(404, "Frontend not built")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import api, web, admin
from app.routers.dependencies import get_current_admin

from app.database import init_db, get_db, SessionLocal, User, Card, AccessLog, DoorEvent
from app.versioning import get_app_version, get_build_info

from app.services.rfid_reader import rfid_reader
from app.services.gpio_control import open_lock, deny_access
from app.services.door_mode import (
    ACCESS_DECISION_ACTIVATE_HOLD,
    ACCESS_DECISION_DENY,
    ACCESS_DECISION_HELD_OPEN,
    MODE_ALWAYS_LOCKED,
    MODE_FIRST_SCAN_HOLD,
    SCHEDULE_PHASE_OUTSIDE_SCHEDULE,
    SCHEDULE_PHASE_HELD_OPEN,
    activate_schedule_hold,
    get_access_mode_label,
    get_card_access_decision,
    get_weekday_label,
    is_schedule_access_mode,
    sync_door_hardware_state,
)
from app.services.registration import (
    get_active_registration_sessions,
    REGISTRATION_STATUS_CARD_MISMATCH_RESET,
    REGISTRATION_STATUS_COMPLETED,
    REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN,
    REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN,
    start_registration_session,
)
from app.services.telegram import send_telegram

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)


async def door_mode_heartbeat():
    """Continuously enforce persisted door-control settings such as daily auto-lock."""
    while True:
        try:
            with SessionLocal() as db:
                settings, evaluation, sync_result = sync_door_hardware_state(db)
                hardware_action = sync_result.get("hardware_action")
                applied_pending_mode = sync_result.get("applied_pending_mode")
                cleared_schedule_hold = bool(sync_result.get("cleared_schedule_hold"))
                previous_access_mode = sync_result.get("previous_access_mode")

                if applied_pending_mode:
                    source_label = (
                        f"{get_weekday_label(evaluation.weekday_key)}規則"
                        if evaluation.active_mode_source == "weekday_override"
                        else "預設模式"
                    )
                    db.add(DoorEvent(
                        admin_id=None,
                        admin_name="系統自動化",
                        action="door_settings_applied",
                        source="door_scheduler",
                        result="accepted",
                        description=(
                            f"已到每日上鎖時間，今日門禁已切換為 "
                            f"{source_label} 的 {get_access_mode_label(applied_pending_mode)}。"
                        ),
                    ))
                    db.commit()
                elif cleared_schedule_hold and is_schedule_access_mode(previous_access_mode):
                    db.add(DoorEvent(
                        admin_id=None,
                        admin_name="系統自動化",
                        action="schedule_auto_lock",
                        source="door_scheduler",
                        result="accepted",
                        description=f"已到每日上鎖時間，門禁恢復上鎖（{settings.daily_lock_time}）。",
                    ))
                    db.commit()

                if hardware_action == "force_lock" and not applied_pending_mode:
                    if evaluation.effective_access_mode == MODE_ALWAYS_LOCKED:
                        db.add(DoorEvent(
                            admin_id=None,
                            admin_name="系統自動化",
                            action="always_locked_enforced",
                            source="door_scheduler",
                            result="accepted",
                            description="門禁維持在永久上鎖模式。",
                        ))
                        db.commit()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error(f"❌ Door mode heartbeat failed: {exc}", exc_info=True)

        await asyncio.sleep(15)

async def handle_rfid_scan(card_uid: str):
    """Handle an RFID scan without allowing active binding flows to hijack normal access."""
    try:
        log.info(f"📇 Card scanned: {card_uid}")

        db = next(get_db())
        try:
            active_sessions = get_active_registration_sessions(db)
            existing_card = db.query(Card).filter(Card.rfid_uid == card_uid).first()

            if len(active_sessions) > 1:
                session_ids = ", ".join(session.user_id for session in active_sessions)
                log.error(f"❌ Multiple active registration sessions detected: {session_ids}")
                deny_access()
            elif existing_card:
                await handle_normal_mode(card_uid, db, existing_card)
            elif active_sessions:
                await handle_register_mode(card_uid, db, active_sessions[0])
            else:
                log.warning(f"⚠️ Unknown card: {card_uid}")
                deny_access()
        finally:
            db.close()

    except Exception as e:
        log.error(f"❌ Error handling RFID scan: {e}", exc_info=True)

async def handle_normal_mode(card_uid: str, db: Session, card: Optional[Card] = None):
    """Handle card scan in normal access control mode (支援一人多卡)."""
    card = card or db.query(Card).filter(Card.rfid_uid == card_uid).first()
    if not card or not card.user:
        log.warning(f"⚠️ Unknown card: {card_uid}")
        deny_access()
        return

    user = card.user

    if not user.is_active:
        log.warning(f"⚠️ Access denied (user disabled): {user.name} ({user.student_id})")
        deny_access()
        return

    if not card.is_active:
        log.warning(f"⚠️ Access denied (card disabled): {user.name} ({user.student_id}) - Card {card.rfid_uid}")
        deny_access()
        return

    user_id = user.id
    user_name = user.name
    student_id = user.student_id
    card_id = card.id
    card_info = f" ({card.nickname})" if card.nickname else ""
    log.info(f"✅ Access granted: {user_name} ({student_id}){card_info}")

    settings, schedule_evaluation, _ = sync_door_hardware_state(db)
    effective_access_mode = schedule_evaluation.effective_access_mode
    access_note = ""

    access_decision = get_card_access_decision(effective_access_mode, schedule_evaluation.phase)

    if access_decision == ACCESS_DECISION_DENY:
        if effective_access_mode == MODE_ALWAYS_LOCKED:
            log.warning(f"⚠️ Access denied by always-locked mode: {user_name} ({student_id})")
        elif effective_access_mode == MODE_FIRST_SCAN_HOLD and schedule_evaluation.phase == SCHEDULE_PHASE_OUTSIDE_SCHEDULE:
            log.warning(f"⚠️ Access denied outside schedule window: {user_name} ({student_id})")
        else:
            log.warning(f"⚠️ Access denied by access mode policy: {user_name} ({student_id})")
        deny_access()
        return

    if access_decision == ACCESS_DECISION_ACTIVATE_HOLD:
        activate_schedule_hold(db, settings)
        access_note = f"，已切換為今日常開，預計 {settings.daily_lock_time} 自動上鎖"
        db.add(DoorEvent(
            admin_id=None,
            admin_name=user_name,
            action="schedule_hold_open",
            source="rfid_access",
            result="accepted",
            description=f"{user_name} 首次刷卡後，門禁維持解鎖直到 {settings.daily_lock_time}。",
        ))
        db.commit()
    elif access_decision == ACCESS_DECISION_HELD_OPEN:
        access_note = f"，目前維持常開至 {settings.daily_lock_time}"
    else:
        asyncio.create_task(asyncio.to_thread(open_lock))

    async def background_tasks():
        with SessionLocal() as background_db:
            try:
                background_db.add(AccessLog(
                    user_id=user_id,
                    card_id=card_id,
                    rfid_uid=card_uid,
                    action="entry"
                ))
                background_db.commit()
            except Exception as exc:
                background_db.rollback()
                log.error(f"Failed to log access: {exc}")

        message = f"歡迎！{user_name} ({student_id}) 通過門禁{card_info}{access_note}"
        await asyncio.to_thread(send_telegram, message)

    asyncio.create_task(background_tasks())


async def handle_register_mode(card_uid: str, db: Session, session):
    """Handle a registration scan for an active binding session."""
    log.info(f"📝 [Registration] Card scanned: {card_uid}")
    if not session:
        log.error("❌ No active registration session found")
        return

    user = session.user
    if not user:
        log.error("❌ User not found for session")
        session.completed = True
        session.last_status = REGISTRATION_STATUS_COMPLETED
        db.commit()
        return

    existing_card = db.query(Card).filter(Card.rfid_uid == card_uid).first()
    if existing_card:
        log.warning(f"⚠️ Known card scanned during binding: {existing_card.rfid_uid}")
        await handle_normal_mode(card_uid, db, existing_card)
        return

    if session.step == 0:
        session.first_uid = card_uid
        session.step = 1
        session.last_status = REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN
        db.commit()
        log.info("📝 First scan OK, please scan again to confirm")
        return

    if session.step == 1 and session.first_uid == card_uid:
        from app.database import generate_uuid

        new_card = Card(
            id=generate_uuid(),
            rfid_uid=card_uid,
            user_id=user.id,
            nickname=session.nickname,
        )
        db.add(new_card)
        session.completed = True
        session.last_status = REGISTRATION_STATUS_COMPLETED
        db.commit()

        card_count = db.query(Card).filter(Card.user_id == user.id).count()
        log.info(f"🎉 Card bound: {user.student_id} -> {card_uid} (總共 {card_count} 張卡片)")

        settings, schedule_evaluation, _ = sync_door_hardware_state(db)
        access_decision = get_card_access_decision(
            schedule_evaluation.effective_access_mode,
            schedule_evaluation.phase,
        )
        if access_decision not in {ACCESS_DECISION_DENY, ACCESS_DECISION_HELD_OPEN}:
            asyncio.create_task(asyncio.to_thread(open_lock))
        asyncio.create_task(asyncio.to_thread(
            send_telegram,
            f"綁定成功：{user.name} ({user.student_id})\n現在有 {card_count} 張卡片"
        ))
        return

    log.warning("❌ Unknown card mismatch during confirmation, resetting session")
    session.first_uid = None
    session.step = 0
    session.last_status = REGISTRATION_STATUS_CARD_MISMATCH_RESET
    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    log.info("🚀 Makers' Open Lab for Innovation Door System starting up...")

    # Initialize database
    init_db()
    log.info("✅ Database initialized")

    door_mode_task = asyncio.create_task(door_mode_heartbeat())
    log.info("✅ Door mode heartbeat started")

    # Start RFID reader in background
    asyncio.create_task(rfid_reader.read_loop(handle_rfid_scan))
    log.info("✅ RFID reader started")

    log.info("✅ System ready!")

    yield

    # Shutdown
    log.info("Shutting down...")
    door_mode_task.cancel()
    try:
        await door_mode_task
    except asyncio.CancelledError:
        pass

# Create FastAPI app
app = FastAPI(
    title="Makers' Open Lab for Innovation Door Access System",
    description="FastAPI-based door access control system for Makers' Open Lab for Innovation",
    version=get_app_version(),
    lifespan=lifespan
)
app.state.build_info = get_build_info()

# Setup rate limiter
from app.config import RATE_LIMIT_ENABLED
if RATE_LIMIT_ENABLED:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    log.info("✅ Rate limiting enabled")
else:
    log.info("⚠️ Rate limiting disabled")

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
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Switch system to registration mode for a specific student (支援卡片別名)

    **需要管理員權限**
    """
    # 查詢或創建使用者
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        log.error(f"❌ User not found: {student_id} (requested by {admin['name']})")
        raise HTTPException(status_code=404, detail="使用者不存在")

    session, conflicting_session = start_registration_session(db, user.id, nickname)
    if conflicting_session:
        owner = conflicting_session.user
        owner_label = (
            f"{owner.name} ({owner.student_id})"
            if owner else conflicting_session.user_id
        )
        log.warning(f"⚠️ Registration conflict for {student_id}: {owner_label}")
        raise HTTPException(
            status_code=409,
            detail=f"已有其他綁定流程進行中：{owner_label}",
        )

    log.info(
        f"🔄 Admin {admin['name']} switched to REGISTER mode for {student_id} "
        f"(initial cards: {session.initial_card_count}, nickname: {nickname or 'N/A'})"
    )
    return {"status": "ok", "message": "請刷卡（既有有效卡仍可正常通行）"}

# Serve React SPA for all /admin/* routes (catch-all for React Router)
@app.get("/admin", include_in_schema=False)
async def redirect_admin_root():
    return RedirectResponse(url="/admin/", status_code=307)


@app.get("/dashboard", include_in_schema=False)
@app.get("/dashboard/", include_in_schema=False)
@app.get("/dashboard/{full_path:path}", include_in_schema=False)
async def redirect_legacy_dashboard(full_path: str = ""):
    """Redirect legacy dashboard routes to the SPA's /admin/* namespace."""
    target = "/admin/dashboard"
    if full_path:
        target = f"/admin/dashboard/{full_path}"
    return RedirectResponse(url=target, status_code=307)


@app.get("/admin/", include_in_schema=False)
@app.get("/admin/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str = ""):
    """Serve React SPA for all admin/dashboard routes (支援 React Router)"""
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    # Fallback: 如果沒有前端構建，返回 404
    raise HTTPException(404, "Frontend not built")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

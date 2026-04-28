import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request, Form, Depends, HTTPException, Cookie, Response, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db, User, Card, Admin, RegistrationSession
from app.routers.dependencies import get_current_admin, get_optional_admin
from app.services.registration import (
    REGISTRATION_STATUS_CARD_MISMATCH_RESET,
    REGISTRATION_STATUS_COMPLETED,
    REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN,
    REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN,
    start_registration_session,
)
from app.services.telegram import send_telegram
from app.services.auth import verify_password, create_access_token
from app.config import COOKIE_SECURE, RATE_LIMIT_PER_MINUTE, RATE_LIMIT_ENABLED

log = logging.getLogger(__name__)
router = APIRouter(tags=["web"])

# Setup limiter
limiter = Limiter(key_func=get_remote_address)

# Templates
templates = Jinja2Templates(directory="templates")


def spa_available() -> bool:
    return os.path.exists("frontend/dist/index.html")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request, admin_token: Optional[str] = Cookie(None)):
    """Redirect to the SPA when available, otherwise fall back to the legacy login page."""
    current_admin = get_optional_admin(admin_token)

    if spa_available():
        target = "/admin/dashboard" if current_admin else "/admin/"
        return RedirectResponse(url=target, status_code=307)

    return templates.TemplateResponse("login.html", {"request": request})


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, admin_token: Optional[str] = Cookie(None)):
    """Serve or redirect to the login page for browsers hitting GET /login."""
    current_admin = get_optional_admin(admin_token)

    if spa_available():
        target = "/admin/dashboard" if current_admin else "/admin/login"
        return RedirectResponse(url=target, status_code=307)

    return templates.TemplateResponse("login.html", {"request": request})


@router.post("/login")
@limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute") if RATE_LIMIT_ENABLED else lambda f: f
async def login(
    request: Request,  # 新增：slowapi 需要
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """管理員登入（帶速率限制）"""
    # 查詢管理員
    admin = db.query(Admin).filter(Admin.username == username).first()

    if not admin or not verify_password(password, admin.password_hash):
        log.warning(f"⚠️ Failed login attempt for username: {username}")
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

    # 創建 JWT token
    token = create_access_token(data={
        "sub": admin.username,
        "id": admin.id,
        "name": admin.name
    })

    log.info(f"✅ Admin login: {admin.name} ({admin.username})")

    # 設置 cookie（增強安全性）
    response = JSONResponse({"status": "ok", "message": "登入成功"})
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",  # 從 lax 改為 strict
        path="/",
        max_age=28800  # 8 hours
    )

    return response

@router.post("/logout")
async def logout(response: Response):
    """登出"""
    response = JSONResponse({"status": "ok", "message": "已登出"})
    response.delete_cookie(
        key="admin_token",
        path="/",
        secure=COOKIE_SECURE,
        samesite="strict",
    )
    return response

@router.get("/me")
async def get_current_user(admin_token: Optional[str] = Cookie(None)):
    """檢查當前登入狀態"""
    return get_current_admin(admin_token)

@router.post("/register")
async def register_post(
    background_tasks: BackgroundTasks,
    student_id: str = Form(...),
    name: str = Form(...),
    email: Optional[str] = Form(None),
    telegram_id: Optional[str] = Form(None),
    nickname: Optional[str] = Form(None),
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Handle registration form submission (支援副卡綁定、email、telegram_id、卡片別名)"""
    # 驗證管理員身份
    current_admin = get_current_admin(admin_token)

    student_id = student_id.strip()
    name = name.strip()
    if email:
        email = email.strip() or None
    if telegram_id:
        telegram_id = telegram_id.strip() or None
    if nickname:
        nickname = nickname.strip() or None

    # Check if student_id already exists
    existing = db.query(User).filter(User.student_id == student_id).first()

    if existing:
        # 更新用戶資訊（如果有改變）
        if existing.name != name:
            existing.name = name
            log.info(f"📝 Updated name for {student_id}: {name}")
        if email is not None and existing.email != email:
            existing.email = email
            log.info(f"📧 Updated email for {student_id}: {email}")
        if telegram_id is not None and existing.telegram_id != telegram_id:
            existing.telegram_id = telegram_id
            log.info(f"📱 Updated telegram_id for {student_id}: {telegram_id}")

        user = existing

        # 檢查現有卡片數量（僅用於顯示資訊）
        card_count = db.query(Card).filter(Card.user_id == existing.id).count()
        log.info(f"📋 User {student_id} ({name}) currently has {card_count} card(s), adding new card...")
    else:
        # 創建新用戶
        from app.database import generate_uuid
        user = User(
            id=generate_uuid(),
            student_id=student_id,
            name=name,
            email=email,
            telegram_id=telegram_id
        )
        db.add(user)
        log.info(f"📝 New user created: {name} ({student_id}), UUID: {user.id}")

    session, conflicting_session = start_registration_session(
        db,
        user.id,
        nickname,
        commit=False,
    )
    if conflicting_session:
        db.rollback()
        owner = conflicting_session.user
        owner_label = (
            f"{owner.name} ({owner.student_id})"
            if owner else conflicting_session.user_id
        )
        raise HTTPException(
            status_code=409,
            detail=f"已有其他綁定流程進行中：{owner_label}",
        )

    db.commit()
    db.refresh(user)

    # 🔧 Send Telegram notification in background (非阻塞)
    card_count = session.initial_card_count
    if card_count > 0:
        message = f"新增副卡綁定：{name} ({student_id}) - 目前 {card_count} 張卡\n操作者：{current_admin['name']}"
    else:
        message = f"新註冊待綁定：{name} ({student_id})\n操作者：{current_admin['name']}"

    background_tasks.add_task(send_telegram, message)

    log.info(f"✅ Registration session created for {student_id}")

    if card_count > 0:
        message = (
            f"{name} 同學，請在90秒內刷新卡片兩次完成副卡綁定"
            f"（目前已有 {card_count} 張卡片，既有有效卡仍可正常通行）"
        )
    else:
        message = f"{name} 同學，請在90秒內刷學生證兩次完成綁定（其他有效卡仍可正常通行）"
    
    return JSONResponse({
        "status": "ready_to_scan",
        "message": message
    })

@router.get("/check_status/{student_id}")
async def check_status(
    student_id: str,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """檢查卡片綁定狀態（僅管理員）"""
    # 強制驗證管理員身份
    current_admin = get_current_admin(admin_token)

    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        return {"bound": False, "card_count": 0, "binding_in_progress": False}

    # 查詢當前卡片數量
    current_card_count = db.query(Card).filter(Card.user_id == user.id).count()

    # 查詢 registration session
    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()

    if session:
        # 檢查 session 是否已完成
        if session.completed:
            return {
                "bound": True,
                "card_count": current_card_count,
                "binding_in_progress": False,
                "initial_count": session.initial_card_count,
                "step": 2,
                "status_message": "綁定完成",
                "last_status": session.last_status or REGISTRATION_STATUS_COMPLETED,
            }

        # 檢查是否過期
        if session.expires_at and session.expires_at < datetime.utcnow():
            return {
                "bound": False,
                "card_count": current_card_count,
                "binding_in_progress": False,
                "initial_count": session.initial_card_count,
                "step": session.step,
                "status_message": "綁定逾時",
                "last_status": session.last_status or "timed_out",
            }

        status_map = {
            REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN: "請刷卡第一次",
            REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN: "很好！請再刷一次相同的卡片",
            REGISTRATION_STATUS_CARD_MISMATCH_RESET: "卡片不一致，已重設，請重新刷第一次",
        }
        current_status = session.last_status or (
            REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN if session.step == 1
            else REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN
        )
        status_msg = status_map.get(current_status, "處理中...")

        return {
            "bound": False,
            "card_count": current_card_count,
            "binding_in_progress": True,
            "initial_count": session.initial_card_count,
            "step": session.step,
            "status_message": status_msg,
            "last_status": current_status,
        }
    else:
        # 沒有 session
        return {
            "bound": current_card_count > 0,
            "card_count": current_card_count,
            "binding_in_progress": False
        }

@router.get("/success", response_class=HTMLResponse)
async def success(request: Request, student_id: str, db: Session = Depends(get_db)):
    """Success page after binding"""
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if spa_available():
        return RedirectResponse(url="/admin/dashboard/users", status_code=307)

    card_count = db.query(Card).filter(Card.user_id == user.id).count()
    content = (
        "<html><body>"
        f"<h1>綁定成功</h1><p>{user.name} ({user.student_id})</p>"
        f"<p>目前共有 {card_count} 張卡片</p>"
        "</body></html>"
    )
    return HTMLResponse(content)

from fastapi import APIRouter, Request, Form, Depends, HTTPException, Cookie, Response, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
import logging
from datetime import datetime, timedelta

from app.database import get_db, User, Card, Admin, RegistrationSession
from app.services.telegram import send_telegram
from app.services.auth import verify_password, create_access_token, verify_access_token

log = logging.getLogger(__name__)
router = APIRouter(tags=["web"])

# Templates
templates = Jinja2Templates(directory="templates")

def get_current_admin(token: Optional[str] = Cookie(None, alias="admin_token")) -> Optional[dict]:
    """從 cookie 中驗證管理員身份"""
    if not token:
        return None
    return verify_access_token(token)

@router.get("/")
async def home():
    """Redirect root to admin dashboard"""
    return RedirectResponse(url="/admin/dashboard", status_code=302)

@router.post("/login")
async def login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """管理員登入"""
    # 查詢管理員
    admin = db.query(Admin).filter(Admin.username == username).first()
    
    if not admin or not verify_password(password, admin.password_hash):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    
    # 創建 JWT token
    token = create_access_token(data={
        "sub": admin.username,
        "id": admin.id,
        "name": admin.name
    })
    
    log.info(f"✅ Admin login: {admin.name} ({admin.username})")
    
    # 設置 cookie
    response = JSONResponse({"status": "ok", "message": "登入成功"})
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        max_age=28800,  # 8 hours
        samesite="lax"
    )
    
    return response

@router.post("/logout")
async def logout(response: Response):
    """登出"""
    response = JSONResponse({"status": "ok", "message": "已登出"})
    response.delete_cookie(key="admin_token")
    return response

@router.get("/me")
async def get_current_user(admin_token: Optional[str] = Cookie(None)):
    """檢查當前登入狀態"""
    admin = get_current_admin(admin_token)
    if not admin:
        raise HTTPException(status_code=401, detail="未登入")
    return admin

@router.post("/register")
async def register_post(
    request: Request,
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
    if not current_admin:
        raise HTTPException(status_code=401, detail="請先登入")

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
        db.commit()

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
        db.commit()
        log.info(f"📝 New user created: {name} ({student_id}), UUID: {user.id}")
    
    # 🔧 Send Telegram notification in background (非阻塞)
    card_count = db.query(Card).filter(Card.user_id == user.id).count()
    if card_count > 0:
        message = f"新增副卡綁定：{name} ({student_id}) - 目前 {card_count} 張卡\n操作者：{current_admin['name']}"
    else:
        message = f"新註冊待綁定：{name} ({student_id})\n操作者：{current_admin['name']}"
    
    background_tasks.add_task(send_telegram, message)

    # 直接創建 RegistrationSession（與 main.py 的 switch_to_register_mode 相同邏輯）
    initial_card_count = db.query(Card).filter(Card.user_id == user.id).count()

    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()

    if session:
        session.first_uid = None
        session.step = 0
        session.expires_at = datetime.utcnow() + timedelta(seconds=90)
        session.initial_card_count = initial_card_count
        session.completed = False
        session.nickname = nickname  # 新增：記錄卡片別名
    else:
        session = RegistrationSession(
            user_id=user.id,
            first_uid=None,
            step=0,
            expires_at=datetime.utcnow() + timedelta(seconds=90),
            initial_card_count=initial_card_count,
            completed=False,
            nickname=nickname  # 新增：記錄卡片別名
        )
        db.add(session)

    db.commit()
    log.info(f"✅ Registration session created for {student_id}")

    card_count = db.query(Card).filter(Card.user_id == user.id).count()
    if card_count > 0:
        message = f"{name} 同學，請在90秒內刷新卡片兩次完成副卡綁定（目前已有 {card_count} 張卡片）"
    else:
        message = f"{name} 同學，請在90秒內刷學生證兩次完成綁定"
    
    return JSONResponse({
        "status": "ready_to_scan",
        "message": message
    })

@router.get("/check_status/{student_id}")
async def check_status(student_id: str, db: Session = Depends(get_db)):
    """Check if student has completed RFID binding (支援副卡檢測)"""
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
                "status_message": "綁定完成"
            }

        # 檢查是否過期
        if session.expires_at and session.expires_at < datetime.utcnow():
            return {
                "bound": False,
                "card_count": current_card_count,
                "binding_in_progress": False,
                "initial_count": session.initial_card_count,
                "step": session.step,
                "status_message": "綁定逾時"
            }

        # 進行中
        if session.step == 0:
            status_msg = "請刷卡第一次"
        elif session.step == 1:
            status_msg = "很好！請再刷一次相同的卡片"
        else:
            status_msg = "處理中..."

        return {
            "bound": False,
            "card_count": current_card_count,
            "binding_in_progress": True,
            "initial_count": session.initial_card_count,
            "step": session.step,
            "status_message": status_msg
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
    
    # 計算卡片數量
    card_count = db.query(Card).filter(Card.user_id == user.id).count()

    return templates.TemplateResponse("success.html", {
        "request": request,
        "user": user,
        "card_count": card_count
    })


from fastapi import APIRouter, Request, Form, Depends, HTTPException, Cookie, Response, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
import logging
import requests

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

@router.get("/", response_class=HTMLResponse)
async def home(request: Request, admin_token: Optional[str] = Cookie(None)):
    """Registration home page (需要登入)"""
    current_admin = get_current_admin(admin_token)
    
    if not current_admin:
        # 未登入，顯示登入頁面
        return templates.TemplateResponse("login.html", {"request": request})
    
    # 已登入，顯示註冊頁面
    return templates.TemplateResponse("register.html", {
        "request": request,
        "admin": current_admin
    })

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

@router.post("/register")
async def register_post(
    request: Request,
    background_tasks: BackgroundTasks,
    student_id: str = Form(...),
    name: str = Form(...),
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Handle registration form submission (支援副卡綁定)"""
    # 驗證管理員身份
    current_admin = get_current_admin(admin_token)
    if not current_admin:
        raise HTTPException(status_code=401, detail="請先登入")
    
    student_id = student_id.strip()
    name = name.strip()
    
    # Check if student_id already exists
    existing = db.query(User).filter(User.student_id == student_id).first()
    
    if existing:
        # 更新姓名（如果有改變）
        if existing.name != name:
            existing.name = name
            db.commit()
            log.info(f"📝 Updated name for {student_id}: {name}")
        
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
            name=name
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
    
    # Switch to registration mode (立即執行，不等待 Telegram)
    try:
        response = requests.post(
            "http://localhost:8000/mode/register",
            params={"student_id": student_id},
            timeout=2
        )
        if response.status_code == 200:
            log.info(f"✅ Switched to registration mode for {student_id}")
        else:
            log.error(f"Failed to switch to registration mode: {response.status_code}")
    except Exception as e:
        log.error(f"Error calling /mode/register: {e}")
    
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
        # 有進行中的 session，檢查卡片數量是否增加
        binding_completed = current_card_count > session.initial_card_count
        return {
            "bound": binding_completed,
            "card_count": current_card_count,
            "binding_in_progress": True,
            "initial_count": session.initial_card_count
        }
    else:
        # 沒有 session，返回當前狀態
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

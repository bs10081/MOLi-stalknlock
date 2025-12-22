from fastapi import APIRouter, Depends, HTTPException, Cookie, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import logging
from datetime import datetime

from app.database import get_db, User, Card, Admin, AccessLog, generate_uuid
from app.services.telegram import send_telegram
from app.services.gpio_control import open_lock
from app.services.auth import verify_access_token, hash_password

log = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_admin(token: Optional[str] = Cookie(None, alias="admin_token")) -> dict:
    """驗證管理員身份，未登入則拋出 401"""
    if not token:
        raise HTTPException(401, "請先登入")
    
    admin = verify_access_token(token)
    if not admin:
        raise HTTPException(401, "登入已過期")
    
    return admin

@router.get("/users")
async def list_users(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """列出所有用戶及其卡片數"""
    current_admin = get_current_admin(admin_token)
    
    users = db.query(User).all()
    result = []
    for u in users:
        card_count = db.query(Card).filter(Card.user_id == u.id).count()
        result.append({
            "id": u.id,
            "student_id": u.student_id,
            "name": u.name,
            "card_count": card_count,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    
    return result

@router.get("/users/{user_id}/cards")
async def list_user_cards(
    user_id: str,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """查詢指定用戶的所有卡片"""
    current_admin = get_current_admin(admin_token)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用戶不存在")
    
    cards = db.query(Card).filter(Card.user_id == user_id).all()
    return [{
        "id": c.id,
        "rfid_uid": c.rfid_uid,
        "nickname": c.nickname,
        "created_at": c.created_at.isoformat() if c.created_at else None
    } for c in cards]

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    background_tasks: BackgroundTasks,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """刪除用戶及其所有卡片"""
    current_admin = get_current_admin(admin_token)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用戶不存在")
    
    user_name = user.name
    user_student_id = user.student_id
    card_count = db.query(Card).filter(Card.user_id == user_id).count()
    
    # 刪除用戶（cascade 會自動刪除卡片）
    db.delete(user)
    db.commit()
    
    # 背景發送通知
    message = f"🗑️ 刪除用戶：{user_name} ({user_student_id})\n刪除 {card_count} 張卡片\n操作者：{current_admin['name']}"
    background_tasks.add_task(send_telegram, message)
    
    log.info(f"🗑️ Admin {current_admin['name']} deleted user {user_name} ({user_student_id}) with {card_count} cards")
    
    return {"message": f"已刪除用戶 {user_name} 及其 {card_count} 張卡片"}

@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    background_tasks: BackgroundTasks,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """刪除指定卡片"""
    current_admin = get_current_admin(admin_token)
    
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(404, "卡片不存在")
    
    # 取得用戶資訊
    user = db.query(User).filter(User.id == card.user_id).first()
    card_uid = card.rfid_uid
    
    # 刪除卡片
    db.delete(card)
    db.commit()
    
    # 背景發送通知
    if user:
        message = f"🗑️ 刪除卡片：{user.name} ({user.student_id})\nRFID: {card_uid}\n操作者：{current_admin['name']}"
        background_tasks.add_task(send_telegram, message)
    
    log.info(f"🗑️ Admin {current_admin['name']} deleted card {card_uid}")
    
    return {"message": "卡片已刪除"}

@router.put("/cards/{card_id}")
async def update_card(
    card_id: str,
    nickname: str = Form(...),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """修改卡片暱稱"""
    current_admin = get_current_admin(admin_token)
    
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(404, "卡片不存在")
    
    old_nickname = card.nickname
    card.nickname = nickname
    db.commit()
    
    log.info(f"✏️ Admin {current_admin['name']} updated card {card.rfid_uid} nickname: {old_nickname} → {nickname}")
    
    return {"message": f"卡片暱稱已更新為 '{nickname}'"}

@router.get("/admins")
async def list_admins(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """列出所有管理員"""
    current_admin = get_current_admin(admin_token)
    
    admins = db.query(Admin).all()
    return [{
        "id": a.id,
        "username": a.username,
        "name": a.name,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in admins]

@router.post("/admins")
async def create_admin(
    username: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """新增管理員"""
    current_admin = get_current_admin(admin_token)
    
    # 檢查用戶名是否已存在
    if db.query(Admin).filter(Admin.username == username).first():
        raise HTTPException(400, "用戶名已存在")
    
    # 創建新管理員
    new_admin = Admin(
        id=generate_uuid(),
        username=username,
        password_hash=hash_password(password),
        name=name
    )
    db.add(new_admin)
    db.commit()
    
    log.info(f"👤 Admin {current_admin['name']} created new admin: {name} ({username})")
    
    return {"message": f"管理員 {name} 已創建"}

@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: str,
    background_tasks: BackgroundTasks,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """刪除管理員（保留至少一個）"""
    current_admin = get_current_admin(admin_token)
    
    # 檢查是否至少保留一個管理員
    admin_count = db.query(Admin).count()
    if admin_count <= 1:
        raise HTTPException(400, "至少需要保留一個管理員")
    
    # 不允許刪除自己
    if admin_id == current_admin['id']:
        raise HTTPException(400, "不能刪除自己的管理員帳號")
    
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(404, "管理員不存在")
    
    admin_name = admin.name
    admin_username = admin.username
    
    db.delete(admin)
    db.commit()
    
    log.info(f"🗑️ Admin {current_admin['name']} deleted admin {admin_name} ({admin_username})")
    
    return {"message": f"管理員 {admin_name} 已刪除"}

@router.post("/door/unlock")
async def remote_unlock(
    background_tasks: BackgroundTasks,
    admin_token: Optional[str] = Cookie(None)
):
    """遠程開門"""
    current_admin = get_current_admin(admin_token)
    
    # 立即開門
    open_lock()
    
    # 背景發送通知
    message = f"🚪 遠程開門操作\n操作者：{current_admin['name']}"
    background_tasks.add_task(send_telegram, message)
    
    log.info(f"🚪 Admin {current_admin['name']} triggered remote unlock")
    
    return {"message": "門已開啟"}

@router.get("/logs")
async def get_access_logs(
    limit: int = 50,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """查詢存取紀錄"""
    current_admin = get_current_admin(admin_token)
    
    logs = db.query(AccessLog).order_by(AccessLog.timestamp.desc()).limit(limit).all()
    
    result = []
    for log_entry in logs:
        user = db.query(User).filter(User.id == log_entry.user_id).first() if log_entry.user_id else None
        result.append({
            "id": log_entry.id,
            "user_name": user.name if user else "未知",
            "student_id": user.student_id if user else "N/A",
            "rfid_uid": log_entry.rfid_uid,
            "action": log_entry.action,
            "timestamp": log_entry.timestamp.isoformat() if log_entry.timestamp else None
        })
    
    return result

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    name: str = Form(...),
    student_id: str = Form(...),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """修改用戶姓名和學號"""
    current_admin = get_current_admin(admin_token)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用戶不存在")

    # 檢查學號是否重複
    if student_id != user.student_id:
        existing = db.query(User).filter(
            User.student_id == student_id,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(400, "學號已被使用")

    old_name = user.name
    old_student_id = user.student_id
    
    user.name = name
    user.student_id = student_id
    db.commit()
    
    log.info(f"✏️ Admin {current_admin['name']} updated user: {old_name} ({old_student_id}) → {name} ({student_id})")
    
    return {"message": "用戶資料已更新"}

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Cookie, BackgroundTasks, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import pytz
import logging
from datetime import datetime, timedelta

from app.database import get_db, User, Card, Admin, AccessLog, generate_uuid
from app.routers.dependencies import get_current_admin
from app.services.card_uid import CardUIDNormalizationError, normalize_card_uid_input
from app.services.registration import start_registration_session
from app.services.telegram import send_telegram
from app.services.gpio_control import open_lock
from app.services.auth import hash_password

log = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

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
            "email": u.email,
            "telegram_id": u.telegram_id,
            "is_active": u.is_active,
            "card_count": card_count,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return result

@router.post("/users")
async def create_user(
    student_id: str = Form(...),
    name: str = Form(...),
    email: Optional[str] = Form(None),
    telegram_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """新增使用者"""
    current_admin = get_current_admin(admin_token)

    # 檢查學號是否已存在
    existing = db.query(User).filter(User.student_id == student_id).first()
    if existing:
        raise HTTPException(400, "學號已存在")

    user = User(
        id=generate_uuid(),
        student_id=student_id,
        name=name,
        email=email,
        telegram_id=telegram_id
    )
    db.add(user)
    db.commit()

    log.info(f"👤 Admin {current_admin['name']} created user: {name} ({student_id})")

    # 背景發送通知
    if background_tasks:
        message = f"👤 新增使用者：{name} ({student_id})\n操作者：{current_admin['name']}"
        background_tasks.add_task(send_telegram, message)

    return {"message": "使用者已新增", "user_id": user.id}

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
        "user_id": c.user_id,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None
    } for c in cards]

@router.get("/cards")
async def list_all_cards(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """列出所有卡片及其擁有者"""
    current_admin = get_current_admin(admin_token)

    cards = db.query(Card).all()
    result = []
    for c in cards:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "rfid_uid": c.rfid_uid,
            "nickname": c.nickname,
            "user_id": c.user_id,
            "is_active": c.is_active,
            "user_name": user.name if user else "未知",
            "student_id": user.student_id if user else "N/A",
            "created_at": c.created_at.isoformat() if c.created_at else None
        })

    return result

@router.post("/cards")
async def create_card(
    user_id: str = Form(...),
    rfid_uid: Optional[str] = Form(None),
    ios_scan_text: Optional[str] = Form(None),
    nickname: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """新增卡片（手動輸入 RFID UID）"""
    current_admin = get_current_admin(admin_token)

    # 檢查使用者是否存在
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "使用者不存在")

    try:
        normalized_rfid_uid = normalize_card_uid_input(rfid_uid, ios_scan_text)
    except CardUIDNormalizationError as exc:
        raise HTTPException(400, str(exc)) from exc

    # 檢查 RFID UID 是否已被使用
    existing = db.query(Card).filter(Card.rfid_uid == normalized_rfid_uid).first()
    if existing:
        raise HTTPException(400, "此卡片 UID 已被使用")

    card = Card(
        id=generate_uuid(),
        rfid_uid=normalized_rfid_uid,
        user_id=user_id,
        nickname=nickname
    )
    db.add(card)
    db.commit()

    log.info(f"💳 Admin {current_admin['name']} created card for {user.name}: {normalized_rfid_uid}")

    # 背景發送通知
    if background_tasks:
        message = f"💳 新增卡片：{user.name} ({user.student_id})\nRFID: {normalized_rfid_uid}\n操作者：{current_admin['name']}"
        background_tasks.add_task(send_telegram, message)

    return {
        "message": "卡片已新增",
        "card_id": card.id,
        "rfid_uid": normalized_rfid_uid,
    }

@router.post("/cards/bind")
async def start_card_binding(
    user_id: str = Form(...),
    nickname: Optional[str] = Form(None),
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """啟動刷卡綁定模式（為指定使用者綁定新卡片）

    **重構說明**：
    - 移除 HTTP 呼叫 `/mode/register`
    - 直接操作資料庫（與 main.py 邏輯一致）
    - 支援卡片別名參數
    """
    current_admin = get_current_admin(admin_token)

    # 查詢使用者
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "使用者不存在")

    session, conflicting_session = start_registration_session(db, user.id, nickname)
    if conflicting_session:
        owner = conflicting_session.user
        owner_label = (
            f"{owner.name} ({owner.student_id})"
            if owner else conflicting_session.user_id
        )
        raise HTTPException(
            status_code=409,
            detail=f"已有其他綁定流程進行中：{owner_label}",
        )

    log.info(f"🔗 Admin {current_admin['name']} started card binding for {user.name} ({user.student_id}), nickname: {nickname or 'N/A'}")

    return {
        "message": "請在90秒內刷卡兩次完成綁定（既有有效卡仍可正常通行）",
        "student_id": user.student_id,
        "initial_card_count": session.initial_card_count,
    }

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

@router.delete("/users/bulk")
async def bulk_delete_users(
    user_ids: List[str] = Form(...),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """批量刪除用戶"""
    current_admin = get_current_admin(admin_token)

    deleted_count = 0
    deleted_card_count = 0

    for user_id in user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            card_count = db.query(Card).filter(Card.user_id == user_id).count()
            db.delete(user)
            deleted_count += 1
            deleted_card_count += card_count

    db.commit()

    log.info(f"🗑️ Admin {current_admin['name']} bulk deleted {deleted_count} users with {deleted_card_count} cards")

    # 背景發送通知
    if background_tasks:
        message = f"🗑️ 批量刪除：{deleted_count} 位用戶及 {deleted_card_count} 張卡片\n操作者：{current_admin['name']}"
        background_tasks.add_task(send_telegram, message)

    return {"message": f"已刪除 {deleted_count} 位用戶及 {deleted_card_count} 張卡片"}

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

@router.delete("/cards/bulk")
async def bulk_delete_cards(
    card_ids: List[str] = Form(...),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """批量刪除卡片"""
    current_admin = get_current_admin(admin_token)

    deleted_count = 0

    for card_id in card_ids:
        card = db.query(Card).filter(Card.id == card_id).first()
        if card:
            db.delete(card)
            deleted_count += 1

    db.commit()

    log.info(f"🗑️ Admin {current_admin['name']} bulk deleted {deleted_count} cards")

    # 背景發送通知
    if background_tasks:
        message = f"🗑️ 批量刪除：{deleted_count} 張卡片\n操作者：{current_admin['name']}"
        background_tasks.add_task(send_telegram, message)

    return {"message": f"已刪除 {deleted_count} 張卡片"}

@router.put("/cards/{card_id}")
async def update_card(
    card_id: str,
    nickname: Optional[str] = Form(None),
    is_active: str = Form("true"),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """修改卡片資料"""
    current_admin = get_current_admin(admin_token)

    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(404, "卡片不存在")

    old_nickname = card.nickname
    old_active = card.is_active

    # 將字符串轉換為 boolean
    is_active_bool = is_active.lower() in ('true', '1', 'yes')

    # 只在提供 nickname 時才更新
    if nickname is not None:
        card.nickname = nickname
    card.is_active = is_active_bool
    db.commit()

    # 記錄狀態變更
    status_msg = ""
    if old_active != is_active_bool:
        status_msg = f" (狀態: {'啟用' if is_active_bool else '停用'})"

    nickname_msg = f"nickname: {old_nickname} → {card.nickname}" if nickname is not None else f"nickname: {card.nickname}"
    log.info(f"✏️ Admin {current_admin['name']} updated card {card.rfid_uid} {nickname_msg}{status_msg}")

    return {"message": "卡片資料已更新"}

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

@router.put("/admins/{admin_id}")
async def update_admin(
    admin_id: str,
    name: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """修改管理員（密碼/姓名）"""
    current_admin = get_current_admin(admin_token)

    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(404, "管理員不存在")

    old_name = admin.name
    updated = False

    if name is not None:
        name = name.strip()
        if not name:
            raise HTTPException(400, "姓名不能為空白")
        admin.name = name
        updated = True
    if password is not None:
        password = password.strip()
    if password:
        admin.password_hash = hash_password(password)
        updated = True

    if updated:
        db.commit()

    log.info(f"✏️ Admin {current_admin['name']} updated admin: {old_name} → {admin.name}")

    return {"message": "管理員資料已更新"}

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

    # 非阻塞地觸發開門，避免卡住整個事件迴圈
    asyncio.create_task(asyncio.to_thread(open_lock))

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

    # 使用 UTC+8 時區
    tz = pytz.timezone('Asia/Taipei')
    
    result = []
    for log_entry in logs:
        user = db.query(User).filter(User.id == log_entry.user_id).first() if log_entry.user_id else None
        
        # 將時間戳轉換為 UTC+8
        if log_entry.timestamp:
            if log_entry.timestamp.tzinfo is None:
                timestamp_with_tz = tz.localize(log_entry.timestamp)
            else:
                timestamp_with_tz = log_entry.timestamp.astimezone(tz)
            timestamp_str = timestamp_with_tz.isoformat()
        else:
            timestamp_str = None
            
        result.append({
            "id": log_entry.id,
            "user_id": log_entry.user_id,
            "user_name": user.name if user else "未知",
            "student_id": user.student_id if user else "N/A",
            "rfid_uid": log_entry.rfid_uid,
            "action": log_entry.action,
            "timestamp": timestamp_str
        })

    return result

@router.get("/stats")
async def get_stats(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """獲取統計數據"""
    current_admin = get_current_admin(admin_token)
    
    from sqlalchemy import func
    
    # 使用 func.count() 而不是 .count()，避免查詢所有欄位
    user_count = db.query(func.count(User.id)).scalar()
    card_count = db.query(func.count(Card.id)).scalar()
    admin_count = db.query(func.count(Admin.id)).scalar()
    log_count = db.query(func.count(AccessLog.id)).scalar()
    
    # 使用 UTC+8 時區
    tz = pytz.timezone('Asia/Taipei')
    now = datetime.now(tz)
    
    # 本月第一天（UTC+8）
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # 本週第一天（週一，UTC+8）
    days_since_monday = now.weekday()
    first_day_of_week = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 計算本月存取次數 - 只查詢 id 欄位
    monthly_logs = db.query(func.count(AccessLog.id)).filter(
        AccessLog.timestamp >= first_day_of_month
    ).scalar()
    
    # 計算本週活躍使用者數（去重）- 只查詢 user_id 欄位
    active_users = db.query(func.count(func.distinct(AccessLog.user_id))).filter(
        AccessLog.timestamp >= first_day_of_week,
        AccessLog.user_id.isnot(None)
    ).scalar()

    return {
        "user_count": user_count,
        "card_count": card_count,
        "admin_count": admin_count,
        "log_count": log_count,
        "monthly_access_count": monthly_logs,
        "active_users_count": active_users
    }

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    name: str = Form(...),
    student_id: str = Form(...),
    email: Optional[str] = Form(None),
    telegram_id: Optional[str] = Form(None),
    is_active: str = Form("true"),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """修改用戶資料"""
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
    old_active = user.is_active

    # 將字符串轉換為 boolean
    is_active_bool = is_active.lower() in ('true', '1', 'yes')

    user.name = name
    user.student_id = student_id
    user.email = email
    user.telegram_id = telegram_id
    user.is_active = is_active_bool
    db.commit()

    # 記錄狀態變更
    status_msg = ""
    if old_active != is_active_bool:
        status_msg = f" (狀態: {'啟用' if is_active_bool else '停用'})"

    log.info(f"✏️ Admin {current_admin['name']} updated user: {old_name} ({old_student_id}) → {name} ({student_id}){status_msg}")

    return {"message": "用戶資料已更新"}

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Cookie, BackgroundTasks, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import logging
from datetime import timedelta

from app.database import get_db, User, Card, Admin, AccessLog, DoorEvent, generate_uuid
from app.routers.dependencies import get_current_admin
from app.services.card_uid import CardUIDNormalizationError, normalize_card_uid_input
from app.services.door_mode import (
    MODE_ALWAYS_LOCKED,
    MODE_FIRST_SCAN_HOLD,
    MODE_NORMAL,
    serialize_door_settings,
    sync_door_hardware_state,
    validate_schedule_config,
)
from app.services.registration import start_registration_session
from app.services.telegram import send_telegram
from app.services.gpio_control import open_lock, get_lock_runtime_status
from app.services.auth import hash_password
from app.services.rfid_reader import rfid_reader
from app.config import DEV_MODE, LOCK_DURATION
from app.timezone import app_time_to_utc_naive, now_app_timezone, serialize_datetime

log = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def _build_door_status_payload(db: Session) -> dict:
    settings, evaluation, _ = sync_door_hardware_state(db)

    last_remote_unlock = db.query(DoorEvent).filter(
        DoorEvent.action == "remote_unlock"
    ).order_by(DoorEvent.created_at.desc()).first()

    remote_unlock_count = db.query(func.count(DoorEvent.id)).filter(
        DoorEvent.action == "remote_unlock"
    ).scalar()

    status = get_lock_runtime_status()
    status.update(serialize_door_settings(settings, evaluation))
    status.update({
        "dev_mode": DEV_MODE,
        "rfid_reader_mode": "dev" if rfid_reader.dev_mode else "hardware",
        "rfid_device_connected": True if rfid_reader.dev_mode else rfid_reader.device is not None,
        "rfid_device_path": None if rfid_reader.dev_mode else rfid_reader.device_path,
        "can_simulate_scan": DEV_MODE and rfid_reader.dev_mode,
        "last_remote_unlock_at": serialize_datetime(last_remote_unlock.created_at) if last_remote_unlock else None,
        "last_remote_unlock_by": last_remote_unlock.admin_name if last_remote_unlock else None,
        "remote_unlock_count": remote_unlock_count or 0,
    })

    return status


def _describe_door_mode(access_mode: str, daily_lock_time: str, first_unlock_time: str) -> str:
    if access_mode == MODE_ALWAYS_LOCKED:
        return "門禁已切換為永久上鎖模式。"
    if access_mode == MODE_FIRST_SCAN_HOLD:
        return f"門禁已設定為每日 {daily_lock_time} 上鎖，{first_unlock_time} 後首張有效卡會維持解鎖。"
    return "門禁已恢復為一般刷卡開門模式。"

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
            "created_at": serialize_datetime(u.created_at)
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
        "created_at": serialize_datetime(c.created_at)
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
            "created_at": serialize_datetime(c.created_at)
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
        "created_at": serialize_datetime(a.created_at)
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
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """遠程開門"""
    current_admin = get_current_admin(admin_token)
    current_status = _build_door_status_payload(db)

    if current_status["door_state"] == "held_open":
        event = DoorEvent(
            admin_id=current_admin["id"],
            admin_name=current_admin["name"],
            action="remote_unlock",
            source="door_control_ui",
            result="accepted",
            description="門目前已維持解鎖，略過額外開門請求。",
        )
        db.add(event)
        db.commit()
        return {
            "message": "門目前已維持解鎖",
            "event_id": event.id,
            "lock_duration_seconds": LOCK_DURATION,
            "status": current_status,
        }

    if current_status["door_state"] == "unlocking":
        return {
            "message": "門目前正在開啟中",
            "lock_duration_seconds": LOCK_DURATION,
            "status": current_status,
        }

    # 非阻塞地觸發開門，避免卡住整個事件迴圈
    asyncio.create_task(asyncio.to_thread(open_lock))

    event = DoorEvent(
        admin_id=current_admin["id"],
        admin_name=current_admin["name"],
        action="remote_unlock",
        source="door_control_ui",
        result="accepted",
        description=f"遠程開門請求已送出，預計持續 {LOCK_DURATION} 秒",
    )
    db.add(event)
    db.commit()

    # 背景發送通知
    message = f"🚪 遠程開門操作\n操作者：{current_admin['name']}"
    background_tasks.add_task(send_telegram, message)

    log.info(f"🚪 Admin {current_admin['name']} triggered remote unlock")

    return {
        "message": "門已開啟",
        "event_id": event.id,
        "lock_duration_seconds": LOCK_DURATION,
        "status": _build_door_status_payload(db),
    }


@router.put("/door/settings")
async def update_door_settings(
    access_mode: str = Form(...),
    daily_lock_time: Optional[str] = Form(None),
    first_unlock_time: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """更新門禁模式與每日首刷常開排程。"""
    current_admin = get_current_admin(admin_token)

    if access_mode not in {MODE_NORMAL, MODE_ALWAYS_LOCKED, MODE_FIRST_SCAN_HOLD}:
        raise HTTPException(400, "不支援的門禁模式")

    try:
        normalized_daily_lock_time, normalized_first_unlock_time = validate_schedule_config(
            daily_lock_time,
            first_unlock_time,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    settings, _, _ = sync_door_hardware_state(db)
    settings.access_mode = access_mode
    settings.daily_lock_time = normalized_daily_lock_time
    settings.first_unlock_time = normalized_first_unlock_time
    if access_mode != MODE_FIRST_SCAN_HOLD:
        settings.schedule_hold_date = None
        settings.schedule_hold_started_at = None

    db.add(settings)
    db.commit()
    db.refresh(settings)

    settings, evaluation, _ = sync_door_hardware_state(db, interrupt_timed_unlock=True)
    description = _describe_door_mode(
        settings.access_mode,
        settings.daily_lock_time,
        settings.first_unlock_time,
    )

    event = DoorEvent(
        admin_id=current_admin["id"],
        admin_name=current_admin["name"],
        action="door_settings_updated",
        source="door_control_ui",
        result="accepted",
        description=description,
    )
    db.add(event)
    db.commit()

    if background_tasks:
        background_tasks.add_task(
            send_telegram,
            f"🚪 門禁模式更新\n操作者：{current_admin['name']}\n{description}",
        )

    status = _build_door_status_payload(db)
    status.update(serialize_door_settings(settings, evaluation))

    return {
        "message": description,
        "status": status,
        "event_id": event.id,
    }

@router.get("/door/status")
async def get_door_status(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """回傳門禁設備即時狀態與可用能力"""
    current_admin = get_current_admin(admin_token)
    return _build_door_status_payload(db)

@router.get("/door/events")
async def get_door_events(
    limit: int = 20,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """查詢最近的門禁控制事件"""
    current_admin = get_current_admin(admin_token)

    events = db.query(DoorEvent).order_by(DoorEvent.created_at.desc()).limit(limit).all()
    return [{
        "id": event.id,
        "admin_id": event.admin_id,
        "admin_name": event.admin_name,
        "action": event.action,
        "source": event.source,
        "result": event.result,
        "description": event.description,
        "created_at": serialize_datetime(event.created_at),
    } for event in events]

@router.post("/door/simulate-scan")
async def simulate_door_scan(
    card_uid: str = Form(...),
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """管理後台使用的模擬刷卡入口（僅開發模式）"""
    current_admin = get_current_admin(admin_token)

    if not DEV_MODE:
        raise HTTPException(403, "此功能僅在開發模式可用")

    if not rfid_reader.dev_mode:
        raise HTTPException(403, "RFID 讀卡機目前不在模擬模式")

    card_uid = card_uid.strip()
    if not card_uid:
        raise HTTPException(400, "請輸入卡片 UID")

    success = await rfid_reader.simulate_scan(card_uid)
    if not success:
        raise HTTPException(500, "RFID 讀卡機未就緒")

    event = DoorEvent(
        admin_id=current_admin["id"],
        admin_name=current_admin["name"],
        action="simulate_scan",
        source="door_control_ui",
        result="accepted",
        description=f"已送出模擬刷卡：{card_uid}",
    )
    db.add(event)
    db.commit()

    log.info(f"🧪 Admin {current_admin['name']} simulated card scan: {card_uid}")

    return {
        "message": f"已模擬刷卡：{card_uid}",
        "card_uid": card_uid,
        "event_id": event.id,
    }

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
            "user_id": log_entry.user_id,
            "user_name": user.name if user else "未知",
            "student_id": user.student_id if user else "N/A",
            "rfid_uid": log_entry.rfid_uid,
            "action": log_entry.action,
            "timestamp": serialize_datetime(log_entry.timestamp)
        })

    return result

@router.get("/stats")
async def get_stats(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """獲取統計數據"""
    current_admin = get_current_admin(admin_token)
    
    # 使用 func.count() 而不是 .count()，避免查詢所有欄位
    user_count = db.query(func.count(User.id)).scalar()
    card_count = db.query(func.count(Card.id)).scalar()
    admin_count = db.query(func.count(Admin.id)).scalar()
    log_count = db.query(func.count(AccessLog.id)).scalar()
    
    now = now_app_timezone()

    # 本月第一天（Asia/Taipei）後再轉回 SQLite 用的 UTC naive
    first_day_of_month = app_time_to_utc_naive(
        now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    )

    # 本週第一天（週一，Asia/Taipei）後再轉回 SQLite 用的 UTC naive
    days_since_monday = now.weekday()
    first_day_of_week = app_time_to_utc_naive(
        (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    )
    
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

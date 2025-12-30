from fastapi import APIRouter, Request, Depends, HTTPException, Form, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import logging

from app.database import get_db, User, Card, AccessLog, RegistrationSession
from app.services.telegram import send_telegram
from app.services.rfid_reader import rfid_reader
from app.services.auth import verify_access_token
from app.config import DEV_MODE

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["api"])

@router.post("/scan")
async def api_scan(
    request: Request,
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Handle RFID scan for access control (僅限管理員測試)

    **需要管理員權限**
    **僅在開發模式啟用**
    """
    # 驗證管理員身份
    if not admin_token:
        raise HTTPException(401, "未授權：需要管理員權限")

    current_admin = verify_access_token(admin_token)
    if not current_admin:
        raise HTTPException(401, "登入已過期")

    # 僅在開發模式啟用
    if not DEV_MODE:
        raise HTTPException(403, "此端點僅在開發模式可用")

    data = await request.json()
    rfid_uid = data.get("rfid_uid")

    if not rfid_uid:
        return JSONResponse({"error": "missing rfid_uid"}, status_code=400)

    # 檢查卡片是否已註冊（使用新的一對多架構）
    card = db.query(Card).filter(Card.rfid_uid == rfid_uid).first()

    if card and card.user:
        user = card.user
        log.info(f"✅ Access granted (via API scan by {current_admin['name']}): {user.name} ({user.student_id})")

        # Log access
        db.add(AccessLog(
            user_id=user.id,
            card_id=card.id,
            rfid_uid=rfid_uid,
            action="entry"
        ))
        db.commit()

        # Send notification
        send_telegram(f"歡迎！{user.name} ({user.student_id}) 解鎖門禁（測試模式 - {current_admin['name']}）")

        return {
            "status": "allow",
            "user_id": user.id,
            "student_id": user.student_id,
            "name": user.name
        }
    else:
        log.warning(f"⚠️ Unknown card: {rfid_uid} (API scan by {current_admin['name']})")
        return {"status": "deny"}

@router.post("/register/start")
async def api_register_start_deprecated(request: Request):
    """
    **DEPRECATED**: 此端點已廢棄

    請改用：
    - 前端：`POST /register` (web.py)
    - 內部：`POST /mode/register` (main.py)

    Raises:
        HTTPException 410: Gone（端點已移除）
    """
    log.warning("⚠️ Deprecated endpoint called: POST /api/register/start")
    raise HTTPException(
        status_code=410,
        detail="此端點已廢棄，請使用 POST /register 或 POST /mode/register"
    )

@router.post("/register/scan")
async def api_register_scan_deprecated(request: Request):
    """
    **DEPRECATED**: 此端點已廢棄

    綁定流程已整合到主註冊流程中。

    Raises:
        HTTPException 410: Gone（端點已移除）
    """
    log.warning("⚠️ Deprecated endpoint called: POST /api/register/scan")
    raise HTTPException(
        status_code=410,
        detail="此端點已廢棄，綁定功能已整合到主註冊流程"
    )

    return JSONResponse({"error": "invalid_state"}, status_code=400)

# ========== Development Mode API ==========

@router.post("/dev/simulate-scan")
async def simulate_rfid_scan(card_uid: str = Form(...)):
    """
    [開發模式] 模擬 RFID 刷卡
    - 用於本地開發測試，無需實際讀卡機
    - 生產環境應禁用此端點
    """
    if not DEV_MODE:
        raise HTTPException(403, "此端點僅在開發模式可用")

    if not rfid_reader.dev_mode:
        raise HTTPException(403, "RFID 讀卡機不在開發模式")

    try:
        success = await rfid_reader.simulate_scan(card_uid)
        if success:
            return {"status": "ok", "message": f"已模擬刷卡: {card_uid}"}
        else:
            return JSONResponse(
                {"status": "error", "message": "RFID 讀卡機未就緒"},
                status_code=500
            )
    except Exception as e:
        log.error(f"模擬刷卡失敗: {e}")
        raise HTTPException(500, f"模擬刷卡失敗: {str(e)}")

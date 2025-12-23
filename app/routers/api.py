from fastapi import APIRouter, Request, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.database import get_db, User, AccessLog, RegistrationSession
from app.services.telegram import send_telegram
from app.services.rfid_reader import rfid_reader
from app.config import DEV_MODE

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["api"])

@router.post("/scan")
async def api_scan(request: Request, db: Session = Depends(get_db)):
    """Handle RFID scan for access control"""
    data = await request.json()
    rfid_uid = data.get("rfid_uid")
    
    if not rfid_uid:
        return JSONResponse({"error": "missing rfid_uid"}, status_code=400)
    
    # Check if card is registered
    user = db.query(User).filter(User.rfid_uid == rfid_uid).first()
    
    if user:
        # Grant access
        log.info(f"✅ Access granted: {user.name} ({user.student_id})")
        
        # Log access
        db.add(AccessLog(user_id=user.id, rfid_uid=rfid_uid, action="entry"))
        db.commit()
        
        # Send notification
        send_telegram(f"歡迎！{user.name} ({user.student_id}) 解鎖門禁")
        
        return {
            "status": "allow",
            "user_id": user.id,
            "student_id": user.student_id,
            "name": user.name
        }
    else:
        log.warning(f"⚠️ Unknown card: {rfid_uid}")
        return {"status": "deny"}

@router.post("/register/start")
async def api_register_start(request: Request, db: Session = Depends(get_db)):
    """Start registration session for a user"""
    data = await request.json()
    student_id = data.get("student_id")
    
    if not student_id:
        return JSONResponse({"error": "missing student_id"}, status_code=400)
    
    # Find user by student_id
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        return JSONResponse({"error": "user_not_found"}, status_code=404)
    
    # Create or update registration session
    expires = datetime.utcnow() + timedelta(seconds=90)
    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()
    
    if session:
        session.first_uid = None
        session.step = 0
        session.expires_at = expires
    else:
        session = RegistrationSession(user_id=user.id, expires_at=expires)
        db.add(session)
    
    db.commit()
    log.info(f"📝 Registration session started for {user.student_id}")
    
    return {"status": "ok", "message": "請刷卡"}

@router.post("/register/scan")
async def api_register_scan(request: Request, db: Session = Depends(get_db)):
    """Handle RFID scan during registration"""
    data = await request.json()
    student_id = data.get("student_id")
    rfid_uid = data.get("rfid_uid")
    
    if not student_id or not rfid_uid:
        return JSONResponse({"error": "missing data"}, status_code=400)
    
    # Find user
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        return JSONResponse({"error": "user_not_found"}, status_code=404)
    
    # Get registration session
    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user.id
    ).first()
    
    if not session or (session.expires_at and session.expires_at < datetime.utcnow()):
        return JSONResponse({"error": "no session or expired"}, status_code=400)
    
    # First scan
    if session.step == 0:
        # Check if card is already bound to another user
        existing = db.query(User).filter(
            User.rfid_uid == rfid_uid,
            User.id != user.id
        ).first()
        
        if existing:
            log.warning(f"⚠️ Card {rfid_uid} already bound to {existing.student_id}")
            return JSONResponse({"error": "uid_already_bound"}, status_code=400)
        
        session.first_uid = rfid_uid
        session.step = 1
        session.expires_at = datetime.utcnow() + timedelta(seconds=90)
        db.commit()
        
        log.info(f"📝 First scan recorded for {student_id}, waiting for confirmation")
        return {"status": "first_scan_ok", "message": "請再次刷卡確認"}
    
    # Second scan (confirmation)
    if session.step == 1:
        if session.first_uid == rfid_uid:
            # Bind card to user
            user.rfid_uid = rfid_uid
            
            # Log binding
            db.add(AccessLog(user_id=user.id, rfid_uid=rfid_uid, action="bind"))
            
            # Delete session
            db.delete(session)
            db.commit()
            
            log.info(f"🎉 Card bound successfully: {user.student_id} -> {rfid_uid}")
            send_telegram(f"綁定成功：{user.name} ({user.student_id})")
            
            return {"status": "bound", "message": "綁定成功！"}
        else:
            # Mismatch, reset
            log.warning(f"❌ Card mismatch for {student_id}, resetting")
            session.first_uid = None
            session.step = 0
            db.commit()
            
            return JSONResponse({"error": "mismatch", "message": "兩次卡號不一致，請重新操作"}, status_code=400)

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

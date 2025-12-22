from fastapi import APIRouter, Request, Form, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import logging
import threading

from app.database import get_db, User
from app.services.telegram import send_telegram
import requests
import os

log = logging.getLogger(__name__)
router = APIRouter(tags=["web"])

# Templates
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Registration home page"""
    return templates.TemplateResponse("register.html", {"request": request})

@router.post("/register")
async def register_post(
    request: Request,
    student_id: str = Form(...),
    name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle registration form submission"""
    student_id = student_id.strip()
    name = name.strip()
    
    # Check if student_id already exists and has RFID bound
    existing = db.query(User).filter(User.student_id == student_id).first()
    
    if existing and existing.rfid_uid:
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": "此學號已完成註冊，請直接刷卡進門"
        })
    
    # Create or update user
    if existing:
        existing.name = name
        user = existing
    else:
        user = User(student_id=student_id, name=name)
        db.add(user)
    
    db.commit()
    log.info(f"📝 User registered: {name} ({student_id}), UUID: {user.id}")
    
    # Send Telegram notification
    send_telegram(f"新註冊待綁定：{name} ({student_id})")
    
    # Notify registration system (if configured)
    threading.Thread(
        target=notify_registration_system,
        args=(student_id,)
    ).start()
    
    return JSONResponse({
        "status": "ready_to_scan",
        "message": f"{name} 同學，請在90秒內刷學生證兩次完成綁定"
    })

@router.get("/check_status/{student_id}")
async def check_status(student_id: str, db: Session = Depends(get_db)):
    """Check if student has completed RFID binding"""
    user = db.query(User).filter(User.student_id == student_id).first()
    return {"bound": bool(user and user.rfid_uid)}

@router.get("/success", response_class=HTMLResponse)
async def success(request: Request, student_id: str, db: Session = Depends(get_db)):
    """Success page after binding"""
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return templates.TemplateResponse("success.html", {
        "request": request,
        "user": user
    })

def notify_registration_system(student_id: str):
    """Notify the RFID system to enter registration mode"""
    # This would call the local RFID handler to switch to registration mode
    # Since we're running in the same process, this will be handled differently
    pass

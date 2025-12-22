#!/usr/bin/env python3
from fastapi import FastAPI, Request, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, String, TIMESTAMP, func, Integer, ForeignKey, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
import os
from dotenv import load_dotenv
import requests
import threading
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
BOT_TOKEN = os.getenv("BOT_TOKEN")
TG_CHAT_ID = os.getenv("TG_CHAT_ID")
PI_API_URL = os.getenv("PI_API_URL")
PI_API_KEY = os.getenv("PI_API_KEY")
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    student_id = Column(String(20), primary_key=True)
    name = Column(String(50), nullable=False)
    rfid_uid = Column(String(50), unique=True, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class AccessLog(Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True)
    student_id = Column(String(20), ForeignKey("users.student_id"))
    rfid_uid = Column(String(50))
    action = Column(String(10))
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

class RegistrationSession(Base):
    __tablename__ = "registration_sessions"
    student_id = Column(String(20), ForeignKey("users.student_id"), primary_key=True)
    first_uid = Column(String(50), nullable=True)
    step = Column(Integer, default=0)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def send_telegram(text: str):
    if not BOT_TOKEN or not TG_CHAT_ID:
        return
    try:
        requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                      json={"chat_id": TG_CHAT_ID, "text": text}, timeout=5)
    except:
        pass

def notify_pi_register_bg(student_id: str):
    if not PI_API_URL:
        return
    try:
        headers = {"Content-Type": "application/json"}
        if PI_API_KEY:
            headers["X-API-KEY"] = PI_API_KEY
        requests.post(f"{PI_API_URL.rstrip('/')}/mode/register",
                      json={"student_id": student_id}, headers=headers, timeout=5)
    except Exception as e:
        print(f"[notify_pi] error: {e}")

# === Pi 呼叫的 API（保持不變）===
@app.post("/api/scan")
async def api_scan(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    rfid_uid = data.get("rfid_uid")
    if not rfid_uid:
        return JSONResponse({"error": "missing rfid_uid"}, status_code=400)

    user = db.query(User).filter(User.rfid_uid == rfid_uid).first()
    if user:
        db.add(AccessLog(student_id=user.student_id, rfid_uid=rfid_uid, action="entry"))
        db.commit()
        send_telegram(f"歡迎！{user.name} ({user.student_id}) 已進入實驗室")
        return {"status": "allow", "student_id": user.student_id, "name": user.name}
    return {"status": "deny"}

@app.post("/api/register/start")
async def api_register_start(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    student_id = data.get("student_id")
    if not student_id:
        return JSONResponse({"error": "missing student_id"}, status_code=400)
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    expires = datetime.utcnow() + timedelta(seconds=90)
    session = db.query(RegistrationSession).filter(RegistrationSession.student_id == student_id).first()
    if session:
        session.first_uid = None
        session.step = 0
        session.expires_at = expires
    else:
        session = RegistrationSession(student_id=student_id, expires_at=expires)
        db.add(session)
    db.commit()
    return {"status": "ok"}

@app.post("/api/register/scan")
async def api_register_scan(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    student_id = data.get("student_id")
    rfid_uid = data.get("rfid_uid")
    if not student_id or not rfid_uid:
        return JSONResponse({"error": "missing data"}, status_code=400)

    session = db.query(RegistrationSession).filter(RegistrationSession.student_id == student_id).first()
    if not session or (session.expires_at and session.expires_at < datetime.utcnow()):
        return JSONResponse({"error": "no session or expired"}, status_code=400)

    if session.step == 0:
        if db.query(User).filter(and_(User.rfid_uid == rfid_uid, User.student_id != student_id)).first():
            return JSONResponse({"error": "uid_already_bound"}, status_code=400)
        session.first_uid = rfid_uid
        session.step = 1
        session.expires_at = datetime.utcnow() + timedelta(seconds=90)
        db.commit()
        return {"status": "first_scan_ok"}

    if session.step == 1:
        if session.first_uid == rfid_uid:
            user = db.query(User).filter(User.student_id == student_id).first()
            user.rfid_uid = rfid_uid
            db.add(AccessLog(student_id=student_id, rfid_uid=rfid_uid, action="bind"))
            db.delete(session)
            db.commit()
            send_telegram(f"綁定成功：{user.name} ({student_id})")
            return {"status": "bound"}
        else:
            session.first_uid = None
            session.step = 0
            return JSONResponse({"error": "mismatch"}, status_code=400)

# === 前端網頁（保持不變）===
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/register")
async def register_post(request: Request, student_id: str = Form(...), name: str = Form(...), db: Session = Depends(get_db)):
    student_id = student_id.strip()
    name = name.strip()

    existing = db.query(User).filter(User.student_id == student_id).first()
    if existing and existing.rfid_uid:
        return templates.TemplateResponse("register.html", {"request": request, "error": "此學號已完成註冊，請直接刷卡進門"})

    if existing:
        existing.name = name
    else:
        existing = User(student_id=student_id, name=name)
        db.add(existing)
    db.commit()

    send_telegram(f"新註冊待綁定：{name} ({student_id})")
    threading.Thread(target=notify_pi_register_bg, args=(student_id,)).start()

    return JSONResponse({"status": "ready_to_scan", "message": f"{name} 同學，請在90秒內刷學生證兩次完成綁定"})

@app.get("/check_status/{student_id}")
async def check_status(student_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.student_id == student_id).first()
    return {"bound": bool(user and user.rfid_uid)}

@app.get("/success")
async def success(request: Request, student_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        raise HTTPException(404)
    return templates.TemplateResponse("success.html", {"request": request, "user": user})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
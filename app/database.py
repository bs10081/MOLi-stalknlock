from sqlalchemy import create_engine, Column, String, TIMESTAMP, func, Integer, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import uuid

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationship: One user can have multiple cards
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfid_uid = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    nickname = Column(String(50), nullable=True)  # Optional: 卡片暱稱（例如：學生證、備用卡）
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="cards")

class AccessLog(Base):
    __tablename__ = "access_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    card_id = Column(String(36), ForeignKey("cards.id"), nullable=True)  # 記錄使用哪張卡
    rfid_uid = Column(String(50))
    action = Column(String(10))
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())

class RegistrationSession(Base):
    __tablename__ = "registration_sessions"
    
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    first_uid = Column(String(50), nullable=True)
    step = Column(Integer, default=0)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    initial_card_count = Column(Integer, default=0)  # 記錄開始綁定時的卡片數量

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

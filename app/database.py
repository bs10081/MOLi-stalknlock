from sqlalchemy import (
    create_engine,
    Column,
    String,
    TIMESTAMP,
    func,
    Integer,
    ForeignKey,
    Boolean,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import json
import uuid

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())


DEFAULT_WEEKDAY_MODE_OVERRIDES_JSON = json.dumps(
    {
        "mon": None,
        "tue": None,
        "wed": None,
        "thu": None,
        "fri": None,
        "sat": None,
        "sun": None,
    },
    separators=(",", ":"),
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    telegram_id = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationship: One user can have multiple cards
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfid_uid = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    nickname = Column(String(50), nullable=True)  # Optional: 卡片暱稱（例如：學生證、備用卡）
    is_active = Column(Boolean, default=True, nullable=False)
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

class DoorEvent(Base):
    __tablename__ = "door_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(String(36), nullable=True)
    admin_name = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    result = Column(String(20), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class DoorControlSettings(Base):
    __tablename__ = "door_control_settings"

    id = Column(Integer, primary_key=True, default=1)
    access_mode = Column(String(20), nullable=False, default="normal")
    pending_access_mode = Column(String(20), nullable=True)
    weekday_mode_overrides = Column(String, nullable=True, default=DEFAULT_WEEKDAY_MODE_OVERRIDES_JSON)
    pending_weekday_mode_overrides = Column(String, nullable=True)
    daily_lock_time = Column(String(5), nullable=True)
    first_unlock_time = Column(String(5), nullable=True)
    schedule_hold_date = Column(String(10), nullable=True)
    schedule_hold_started_at = Column(TIMESTAMP(timezone=True), nullable=True)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class RegistrationSession(Base):
    __tablename__ = "registration_sessions"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    first_uid = Column(String(50), nullable=True)
    step = Column(Integer, default=0)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    initial_card_count = Column(Integer, default=0)  # 記錄開始綁定時的卡片數量
    completed = Column(Boolean, default=False, nullable=False)  # 標記綁定是否完成
    nickname = Column(String(50), nullable=True)  # 卡片別名（用於綁定時設置）
    last_status = Column(String(50), nullable=True)

    # Relationship
    user = relationship("User")

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
    _ensure_runtime_columns()


def _ensure_runtime_columns():
    """Apply lightweight SQLite-safe schema additions needed by newer code paths."""
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if "registration_sessions" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("registration_sessions")}
        if "last_status" not in column_names:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE registration_sessions ADD COLUMN last_status VARCHAR(50)")
                )

    if "door_control_settings" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("door_control_settings")}
        if "pending_access_mode" not in column_names:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE door_control_settings ADD COLUMN pending_access_mode VARCHAR(20)")
                )
            column_names.add("pending_access_mode")
        if "weekday_mode_overrides" not in column_names:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE door_control_settings "
                    f"ADD COLUMN weekday_mode_overrides TEXT DEFAULT '{DEFAULT_WEEKDAY_MODE_OVERRIDES_JSON}'"
                )
            column_names.add("weekday_mode_overrides")
        if "pending_weekday_mode_overrides" not in column_names:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE door_control_settings ADD COLUMN pending_weekday_mode_overrides TEXT")
                )

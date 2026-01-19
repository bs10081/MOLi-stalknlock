import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# JWT 配置（從 config.py 讀取）
SECRET_KEY = JWT_SECRET_KEY
ALGORITHM = JWT_ALGORITHM
# ACCESS_TOKEN_EXPIRE_MINUTES 已從 config 匯入

def verify_password(plain_password: str, password_hash: str) -> bool:
    """驗證密碼"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """創建 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> Optional[dict]:
    """驗證 JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

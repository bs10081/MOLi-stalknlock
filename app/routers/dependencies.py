"""FastAPI 共用 Dependencies

提供跨路由的共用依賴項，包括身份驗證、權限檢查等。
"""
from typing import Optional
from fastapi import Cookie, HTTPException
from app.database import SessionLocal, Admin
from app.services.auth import verify_access_token
import logging

log = logging.getLogger(__name__)

def _resolve_admin(admin_token: Optional[str]) -> Optional[dict]:
    """Resolve the current admin from the JWT and database state."""
    if not admin_token:
        return None

    payload = verify_access_token(admin_token)
    if not payload:
        return None

    admin_id = payload.get("id")
    if not admin_id:
        return None

    with SessionLocal() as db:
        admin = db.query(Admin).filter(Admin.id == admin_id).first()
        if not admin:
            return None

        return {
            "id": admin.id,
            "username": admin.username,
            "name": admin.name,
            "sub": admin.username,
        }


def get_optional_admin(admin_token: Optional[str] = Cookie(None, alias="admin_token")) -> Optional[dict]:
    """Return the current admin if the token is valid and the admin still exists."""
    return _resolve_admin(admin_token)


def get_current_admin(admin_token: Optional[str] = Cookie(None, alias="admin_token")) -> dict:
    """
    驗證管理員身份（Dependency）

    使用方式：
        from fastapi import Depends
        from app.routers.dependencies import get_current_admin

        @router.get("/protected")
        async def protected_endpoint(admin: dict = Depends(get_current_admin)):
            print(f"Admin: {admin['name']}")
            return {"message": "Success"}

    Args:
        admin_token: 從 Cookie 中提取的 JWT token

    Returns:
        dict: 包含管理員資訊的字典
            - id (str): 管理員 UUID
            - username (str): 使用者名稱
            - name (str): 管理員姓名
            - sub (str): JWT subject（等同 username）

    Raises:
        HTTPException 401: 未提供 token 或 token 無效

    Example:
        >>> # 在端點中使用
        >>> @router.post("/admin/action")
        >>> async def admin_action(admin: dict = Depends(get_current_admin)):
        >>>     log.info(f"Action performed by {admin['name']}")
        >>>     return {"status": "ok"}
    """
    if not admin_token:
        log.warning("⚠️ Unauthorized access attempt: No admin token provided")
        raise HTTPException(status_code=401, detail="未授權：請先登入")

    admin = _resolve_admin(admin_token)
    if not admin:
        log.warning("⚠️ Unauthorized access attempt: Invalid token or admin no longer exists")
        raise HTTPException(status_code=401, detail="登入已過期或憑證無效")

    return admin

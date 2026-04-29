from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.config import REGISTER_TIMEOUT
from app.database import Card, RegistrationSession
from app.timezone import utcnow

REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN = "waiting_for_first_scan"
REGISTRATION_STATUS_WAITING_FOR_SECOND_SCAN = "waiting_for_second_scan"
REGISTRATION_STATUS_CARD_MISMATCH_RESET = "card_mismatch_reset"
REGISTRATION_STATUS_COMPLETED = "completed"


def get_active_registration_sessions(
    db: Session,
    now: Optional[datetime] = None,
) -> list[RegistrationSession]:
    """Return all active registration sessions."""
    if now is None:
        now = utcnow()

    return db.query(RegistrationSession).filter(
        RegistrationSession.completed.is_(False),
        RegistrationSession.expires_at.isnot(None),
        RegistrationSession.expires_at > now,
    ).all()


def get_active_registration_session(
    db: Session,
    user_id: str,
    now: Optional[datetime] = None,
) -> Optional[RegistrationSession]:
    """Return the active registration session for a specific user."""
    if now is None:
        now = utcnow()

    return db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user_id,
        RegistrationSession.completed.is_(False),
        RegistrationSession.expires_at.isnot(None),
        RegistrationSession.expires_at > now,
    ).first()


def start_registration_session(
    db: Session,
    user_id: str,
    nickname: Optional[str] = None,
    now: Optional[datetime] = None,
    commit: bool = True,
) -> Tuple[Optional[RegistrationSession], Optional[RegistrationSession]]:
    """
    Start or reset a registration session for the target user.

    Returns a tuple of `(session, conflicting_session)`. A conflicting session
    means another user already has an active binding flow, and no changes were made.
    """
    if now is None:
        now = utcnow()

    conflicting_session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id != user_id,
        RegistrationSession.completed.is_(False),
        RegistrationSession.expires_at.isnot(None),
        RegistrationSession.expires_at > now,
    ).first()
    if conflicting_session:
        return None, conflicting_session

    initial_card_count = db.query(Card).filter(Card.user_id == user_id).count()
    expires_at = now + timedelta(seconds=REGISTER_TIMEOUT)

    session = db.query(RegistrationSession).filter(
        RegistrationSession.user_id == user_id
    ).first()

    if session:
        session.first_uid = None
        session.step = 0
        session.expires_at = expires_at
        session.initial_card_count = initial_card_count
        session.completed = False
        session.nickname = nickname
        session.last_status = REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN
    else:
        session = RegistrationSession(
            user_id=user_id,
            first_uid=None,
            step=0,
            expires_at=expires_at,
            initial_card_count=initial_card_count,
            completed=False,
            nickname=nickname,
            last_status=REGISTRATION_STATUS_WAITING_FOR_FIRST_SCAN,
        )
        db.add(session)

    if commit:
        db.commit()
        db.refresh(session)
    else:
        db.flush()
    return session, None

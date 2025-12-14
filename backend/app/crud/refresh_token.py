from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_refresh_token
from app.db import models
from app.crud import refresh_token as crud_refresh_token


def create_refresh_token(db: Session, user: models.User, raw_token: str) -> models.RefreshToken:
    """Persist a new refresh token for the given user"""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRATION_DAYS)

    db_token = models.RefreshToken(user_id=user.id, token_hash=hash_refresh_token(raw_token),
                                   expires_at=expires_at, revoked=False)
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_valid_refresh_token(db: Session, raw_token: str) -> models.RefreshToken | None:
    """
    Retrieve a non-expired refresh token by its raw value. If a matching token is found but has already expired,
    it is deleted from the database before returning None.

     Returns:
        The matching RefreshToken instance if it exists and has not expired, otherwise None.
    """
    token_hash = hash_refresh_token(raw_token)
    token = (db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash).first())

    if token is None:
        return None

    now = datetime.now(timezone.utc)
    if token.expires_at <= now or token.revoked:
        try:
            crud_refresh_token.delete_refresh_token(db, token)
            db.commit()
        except Exception:
            db.rollback()

        return None

    return token

def delete_refresh_token(db: Session, token: models.RefreshToken) -> None:
    """Delete a single refresh token from the database - no commit."""
    db.delete(token)


def delete_expired_refresh_tokens(db: Session) -> int:
    """
    Delete all refresh tokens that have passed their expiry time.

    Returns:
        int: number of deleted rows.
    """
    now = datetime.now(timezone.utc)
    result = (
        db.query(models.RefreshToken).filter(models.RefreshToken.expires_at <= now).delete(synchronize_session=False))
    return result

import hashlib
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db import models
from app.schemas.secret import SecretCreate


def generate_unique_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token for secret sharing links.
    
    Args:
        length: Number of bytes in the token (default 32 for high entropy).
    
    Returns:
        A URL-safe random token string.
    """
    return secrets.token_urlsafe(length)


def create_secret(db: Session, owner_id: int, secret: SecretCreate) -> models.Secret:
    """Create a new secret owned by the given user.
    
    Args:
        db: SQLAlchemy database session.
        owner_id: The ID of the user creating the secret.
        secret: SecretCreate payload with content, max_accesses, expires_in_seconds, and optional password.
    
    Returns:
        The newly created Secret ORM model instance.
    """
    token = generate_unique_token()
    expires_at = datetime.utcnow() + timedelta(seconds=secret.expires_in_seconds)
    
    db_secret = models.Secret(
        owner_id=owner_id,
        token=token,
        content=secret.content,
        max_accesses=secret.max_accesses,
        remaining_accesses=secret.max_accesses,
        expires_at=expires_at,
        is_revoked=False,
        password_hash=(secret.password.strip() or None) if secret.password else None
    )
    db.add(db_secret)
    db.commit()
    db.refresh(db_secret)
    return db_secret


def get_secret_by_token(db: Session, token: str) -> models.Secret | None:
    """Fetch a secret by its unique token.
    
    Args:
        db: SQLAlchemy database session.
        token: The secret's unique token.
    
    Returns:
        The Secret model instance, or None if not found.
    """
    return db.query(models.Secret).filter(models.Secret.token == token).first()


def get_secret_by_id(db: Session, secret_id: int) -> models.Secret | None:
    """Fetch a secret by its ID.
    
    Args:
        db: SQLAlchemy database session.
        secret_id: The secret's ID.
    
    Returns:
        The Secret model instance, or None if not found.
    """
    return db.query(models.Secret).filter(models.Secret.id == secret_id).first()


def get_secrets_for_user(db: Session, owner_id: int):
    """Fetch all secrets owned by a user.
    
    Args:
        db: SQLAlchemy database session.
        owner_id: The user's ID.
    
    Returns:
        List of Secret model instances owned by the user.
    """
    return db.query(models.Secret).filter(models.Secret.owner_id == owner_id).all()


def access_secret(db: Session, secret: models.Secret) -> int:
    """Consume one access for the secret and persist the change.

    Checks expiry, revocation, and remaining accesses. If accessible,
    decrements `remaining_accesses` and commits. If the count reaches 0
    the secret is deleted from the database.

    Args:
        db: SQLAlchemy database session.
        secret: The Secret model instance.

    Returns:
        The remaining accesses after consumption (>= 0) on success.
        Returns -1 if the secret is inaccessible (expired/revoked/no remaining).
    """
    # Check if expired
    if datetime.utcnow() > secret.expires_at:
        return -1

    # Check if revoked
    if secret.is_revoked:
        return -1

    # Check if accesses remaining
    if secret.remaining_accesses <= 0:
        return -1

    # Capture new remaining count, then persist
    secret.remaining_accesses -= 1
    new_remaining = secret.remaining_accesses
    db.add(secret)

    # If no more accesses, delete the secret (it will no longer be queryable)
    if new_remaining <= 0:
        db.delete(secret)

    db.commit()
    # Return remaining accesses (0 if deleted)
    return max(new_remaining, 0)


def revoke_secret(db: Session, secret: models.Secret) -> models.Secret:
    """Mark a secret as revoked (cannot be accessed anymore).
    
    Args:
        db: SQLAlchemy database session.
        secret: The Secret model instance to revoke.
    
    Returns:
        The updated Secret model instance.
    """
    secret.is_revoked = True
    db.add(secret)
    db.commit()
    db.refresh(secret)
    return secret


def verify_secret_password(secret: models.Secret, password: str) -> bool:
    """Verify if the provided password matches the secret's password hash.
    
    If the secret has no password protection, this returns True.
    
    Args:
        secret: The Secret model instance.
        password: The password to verify.
    
    Returns:
        True if password is valid or if secret has no password, False otherwise.
    """
    if secret.password_hash is None:
        return True
      
    incoming_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return secrets.compare_digest(incoming_hash, secret.password_hash)

def delete_expired_secrets(db: Session) -> int:
    """
    Delete all secrets that have passed their expiry time or have been revoked.

    Returns:
        int: number of deleted rows.
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    result = (
        db.query(models.Secret).filter(models.Secret.expires_at <= now).delete(synchronize_session=False))
    return result

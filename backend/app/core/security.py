import secrets
import hashlib

from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
    pbkdf2_sha256__rounds=600_000,
    pbkdf2_sha256__salt_size=16,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify the client's AuthHash against the stored server-side PBKDF2-SHA256 hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Derive the server-side FinalHash from the client's AuthHash using
    PBKDF2-HMAC-SHA256 with a random salt and high iteration count
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Creates a new JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.TOKEN_EXPIRATION_MIN)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def generate_refresh_token() -> str:
    """
    Generate a random opaque refresh token value that will be given to the client.
    This raw value is NEVER stored in the database, only its hash is.
    """
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    """Deterministically hash the refresh token using SHA-256"""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

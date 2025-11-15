from sqlalchemy.orm import Session
from app.db import models
from app.schemas.user import UserCreate
from app.core.security import get_password_hash


def get_user_by_email(db: Session, email: str):
    """Fetches a single user from the DB by their email"""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: UserCreate):
    """
    Creates a new user in the database.
    This hashes the AuthHash before storing.
    """
    hashed_auth = get_password_hash(user.auth_hash)
    db_user = models.User(email=user.email, hashed_auth_hash=hashed_auth, protected_vault_key=user.protected_vault_key,
                          protected_vault_key_iv=user.protected_vault_key_iv)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
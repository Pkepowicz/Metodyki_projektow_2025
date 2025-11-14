from sqlalchemy import Column, Integer, String
from .base import Base


class User(Base):
    """ORM model representing an application user"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_auth_hash = Column(String, nullable=False)
    protected_vault_key = Column(String, nullable=False)
    protected_vault_key_iv = Column(String, nullable=False)
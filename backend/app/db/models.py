from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base


class User(Base):
    """ORM model representing an application user"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_auth_hash = Column(String, nullable=False)
    protected_vault_key = Column(String, nullable=False)
    protected_vault_key_iv = Column(String, nullable=False)

    # Relationship to vault items owned by this user
    vault_items = relationship("VaultItem", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship('RefreshToken', back_populates='user', cascade='all, delete-orphan')


class VaultItem(Base):
    """ORM model representing an encrypted vault item tied to a user"""
    __tablename__ = "vault_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    site = Column(String, nullable=False)
    encrypted_password = Column(String, nullable=False)

    owner = relationship("User", back_populates="vault_items")


class RefreshToken(Base):
    """ORM model representing a long-lived refresh token"""
    __tablename__ = 'refresh_tokens'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)

    user = relationship('User', back_populates='refresh_tokens')

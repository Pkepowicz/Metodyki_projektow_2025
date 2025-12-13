from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
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
    # Relationship to secrets created by this user
    secrets = relationship("Secret", back_populates="owner", cascade="all, delete-orphan")


class VaultItem(Base):
    """ORM model representing an encrypted vault item tied to a user"""
    __tablename__ = "vault_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    site = Column(String, nullable=False)
    encrypted_password = Column(String, nullable=False)

    owner = relationship("User", back_populates="vault_items")


class Secret(Base):
    """ORM model representing a shared secret (text message) accessible via unique token"""
    __tablename__ = "secrets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)  # Unique shareable link token
    content = Column(Text, nullable=False)  # The actual secret text message
    max_accesses = Column(Integer, nullable=False)  # Maximum number of times it can be accessed
    remaining_accesses = Column(Integer, nullable=False)  # How many accesses are left
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # When the secret expires
    is_revoked = Column(bool, default=0, nullable=False)  # 0 = active, 1 = revoked
    password_hash = Column(String, nullable=True)  # Optional password hash for accessing the secret

    owner = relationship("User", back_populates="secrets")

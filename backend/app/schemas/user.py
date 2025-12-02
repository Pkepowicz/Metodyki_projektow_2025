from typing import List
from pydantic import BaseModel, EmailStr
from app.schemas.vault import VaultItem


class ProtectedVaultKey(BaseModel):
    """
    Response schema for returning the current user's protected vault key and IV.
    Also used as a base for models that carry these fields.
    """
    protected_vault_key: str
    protected_vault_key_iv: str


class UserCreate(ProtectedVaultKey):
    """Schema for creating a new user"""
    email: EmailStr
    auth_hash: str


class UserLogin(BaseModel):
    """Schema for logging in a user"""
    email: EmailStr
    auth_hash: str


class ChangePasswordAndRotatePayload(BaseModel):
    """
    Schema for changing a user's hashed password and associated encrypted vault key.
    This operation requires vault items to be rotated.
    """
    current_auth_hash: str
    new_auth_hash: str
    new_protected_vault_key: str
    new_protected_vault_key_iv: str
    items: List[VaultItem]

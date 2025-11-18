from typing import List
from pydantic import BaseModel, EmailStr
from app.schemas.vault import VaultItem


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: EmailStr
    auth_hash: str
    protected_vault_key: str
    protected_vault_key_iv: str

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
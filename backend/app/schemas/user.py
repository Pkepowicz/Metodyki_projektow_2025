from pydantic import BaseModel, EmailStr


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

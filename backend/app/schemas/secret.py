from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SecretCreate(BaseModel):
    """Schema for creating a new secret"""
    content: str  # The secret text message
    max_accesses: int  # How many times can this secret be accessed before it's deleted
    expires_in_seconds: int  # How many seconds until the secret expires (e.g., 3600 for 1 hour)
    password: Optional[str] = None  # Optional password to protect access to this secret


class SecretResponse(BaseModel):
    """Schema for returning created secret (includes the token for sharing)"""
    id: int
    token: str  # The unique shareable link token
    owner_id: int
    max_accesses: int
    remaining_accesses: int
    created_at: datetime
    expires_at: datetime
    is_revoked: int

    class Config:
        orm_mode = True


class SecretAccessResponse(BaseModel):
    """Schema for accessing a secret via token (no owner info exposed)"""
    content: str
    remaining_accesses: int
    expires_at: datetime

    class Config:
        orm_mode = True


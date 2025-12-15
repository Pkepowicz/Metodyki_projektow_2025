from pydantic import BaseModel


class RefreshTokenBase(BaseModel):
    """Base schema for objects that carry a refresh token."""
    refresh_token: str


class Token(RefreshTokenBase):
    """Schema for the response sent on successful login"""
    access_token: str
    token_type: str


class RefreshRequest(RefreshTokenBase):
    """Request body for endpoint refreshing tokens."""
    pass

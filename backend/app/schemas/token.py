from pydantic import BaseModel


class Token(BaseModel):
    """Schema for the response sent on successful login"""
    access_token: str
    token_type: str

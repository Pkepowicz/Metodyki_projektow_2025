from pydantic import BaseModel, EmailStr


class EmailLeakCheckRequest(BaseModel):
    """Request body for the email leak checking endpoint"""
    email: EmailStr

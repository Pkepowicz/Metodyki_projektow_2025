from pydantic import BaseModel, EmailStr, constr


class EmailLeakCheckRequest(BaseModel):
    """Request body for the email leak checking endpoint"""
    email: EmailStr

class PasswordHashLeakCheckRequest(BaseModel):
    """Request body for the password leak checking endpoint"""
    password: constr(strip_whitespace=True, min_length=40, max_length=40)

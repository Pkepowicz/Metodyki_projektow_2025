from fastapi import APIRouter
from app.api.v1.endpoints import auth

# This is the main router for API version 1
api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

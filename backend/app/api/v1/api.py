from fastapi import APIRouter
from app.api.v1.endpoints import auth, vault, leaks, secret

# This is the main router for API version 1
api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(vault.router, prefix="/vault", tags=["vault"])
api_router.include_router(leaks.router, prefix="/leaks", tags=["leaks"])
api_router.include_router(secret.router, prefix="/secrets", tags=["secrets"])

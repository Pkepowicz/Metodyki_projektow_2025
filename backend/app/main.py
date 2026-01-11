from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.api.v1.endpoints.secret import public_router
from app.db import models
from app.db.base import engine
from app.db.init_db import init_db_with_fake_user

models.Base.metadata.create_all(bind=engine)
init_db_with_fake_user()

app = FastAPI(
        title=settings.PROJECT_NAME, 
        docs_url="/api/docs",
        openapi_url=f'{settings.API_V1_STR}/openapi.json',
        redoc_url=None
      )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Development
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        # Production
        "https://leakchecker.mwalas.pl",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=3600,
)

app.include_router(public_router, prefix="/api/secrets", tags=["secrets-public"])

app.include_router(api_router, prefix=settings.API_V1_STR)

from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.api import api_router
from app.db import models
from app.db.base import engine

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f'{settings.API_V1_STR}/openapi.json')
app.include_router(api_router, prefix=settings.API_V1_STR)

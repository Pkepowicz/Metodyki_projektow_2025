from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    PROJECT_NAME: str = 'Leak Checker'
    API_V1_STR: str = '/api/v1'

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str
    TOKEN_EXPIRATION_MIN: int

    class Config:
        env_file = '.env'


settings = Settings()

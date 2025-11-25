from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    PROJECT_NAME: str = 'Leak Checker'
    API_V1_STR: str = '/api/v1'

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str
    TOKEN_EXPIRATION_MIN: int

    XPOSEDORNOT_API_URL: str = "https://api.xposedornot.com/v1"
    XPOSEDORNOT_TIMEOUT_SECONDS: float = 30.0

    LEAKCHECK_API_URL: str = "https://leakcheck.io/api/public"
    LEAKCHECK_TIMEOUT_SECONDS: float = 30.0

    PWNED_PASSWORDS_API_URL: str = 'https://api.pwnedpasswords.com'
    PWNED_PASSWORDS_TIMEOUT_SECONDS: float = 30.0
    PWNED_PASSWORDS_USER_AGENT: str = 'LeakCheckerService/1.0'  # HIBP requires a User-Agent

    class Config:
        env_file = '.env'


settings = Settings()

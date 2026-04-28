from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent / ".env"

class Settings(BaseSettings):
    MISTRAL_API_KEY: str = "placeholder"
    MISTRAL_MODEL: str = "mistral-medium-latest"
    JWT_SECRET: str = "dev_secret_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    DATABASE_URL: str = "sqlite:///./mis.db"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = str(_ENV_FILE)
        extra = "ignore"

settings = Settings()

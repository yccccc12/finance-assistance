"""
Configuration module for the FastAPI backend.
Handles environment variables and application settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # ignore env vars that aren't defined here
    )
    
    # Taggun API Configuration
    taggun_api_key: Optional[str] = None
    taggun_api_url: str = "https://api.taggun.io/api/receipt/v1/verbose/file"
    
    # Server Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    # CORS Configuration
    allowed_origins: str = "http://localhost:4028,http://localhost:3000"
    
    # File Upload Configuration
    max_upload_size: int = 10485760  # 10MB
    allowed_file_types: str = "image/jpeg,image/png,image/jpg,image/heic,application/pdf"
    
    # Logging
    log_level: str = "INFO"
    
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def allowed_mime_types(self) -> List[str]:
        """Parse allowed file types from comma-separated string."""
        return [file_type.strip() for file_type in self.allowed_file_types.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()

"""Application configuration management."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Config
    app_name: str = "AI Photo Editor"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # API Config
    api_v1_prefix: str = "/api/v1"
    
    # Storage Config
    cloud_storage_bucket: Optional[str] = None
    cloud_storage_endpoint: Optional[str] = None  # Deprecated, kept for backward compatibility
    local_storage_path: str = "./storage"
    # GCS credentials are loaded from:
    # 1. GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
    # 2. gcloud auth application-default login
    # 3. GCE/Cloud Run metadata service (if running on GCP)
    
    # Model Config
    model_cache_dir: str = "./model_cache"
    use_quantization: bool = True
    max_image_size: int = 2048
    
    # Processing Config
    timeout_seconds: int = 300
    max_concurrent_jobs: int = 5
    
    # Imaginary API Config
    imaginary_base_url: str = "http://localhost:8080"
    imaginary_timeout: int = 30
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra environment variables (like GOOGLE_APPLICATION_CREDENTIALS)
        protected_namespaces=("settings_",)  # Only protect settings_ namespace, not model_
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

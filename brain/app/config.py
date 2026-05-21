"""
Application configuration using Pydantic Settings.
Loads from environment variables and .env file.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database (must be set via DATABASE_URL env var in production)
    database_url: str = ""

    # Application
    app_env: str = "production"
    debug: bool = False
    app_title: str = "Fair Dispatch System"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    # CORS - comma-separated allowed origins
    cors_origins: str = "https://fairrelay.vercel.app,https://fairrelay-dashboard.vercel.app"

    # Workload Score Weights
    workload_weight_a: float = 1.0  # num_packages weight
    workload_weight_b: float = 0.5  # total_weight_kg weight
    workload_weight_c: float = 10.0  # route_difficulty_score weight
    workload_weight_d: float = 0.2  # estimated_time_minutes weight

    # Clustering Settings
    target_packages_per_route: int = 20

    # Route Difficulty Weights
    difficulty_weight_per_kg: float = 0.01
    difficulty_weight_per_stop: float = 0.1
    difficulty_base: float = 1.0

    # Time Estimation (minutes)
    time_per_package: float = 5.0
    time_per_stop: float = 3.0
    base_route_time: float = 30.0

    # LangGraph / LangSmith (optional)
    langchain_tracing_v2: bool = False
    langchain_api_key: Optional[str] = None
    langchain_project: str = "fair-dispatch-dev"

    # AI / LLM (optional)
    botlearn_api_key: Optional[str] = None   # botlearn.ai proxy → Gemini 2.5 Flash
    google_api_key: Optional[str] = None     # native Google API key fallback
    gemini_model: str = "gemini-2.5-flash"
    enable_gemini_explain: bool = False

    # Admin protection
    admin_api_key: Optional[str] = None      # required for /admin/learning POST endpoints

    # LoRRI integration
    lorri_webhook_url: str = ""
    lorri_webhook_secret: str = ""
    ola_maps_api_key: Optional[str] = None

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if not self.is_production:
            origins.extend(["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"])
        return origins


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

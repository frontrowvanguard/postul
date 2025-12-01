from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase Configuration
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_key: str = Field(..., description="Supabase anon/public key")
    supabase_jwt_secret: str = Field(
        ..., description="Supabase JWT secret for token verification"
    )

    # Database Configuration (Supabase PostgreSQL)
    database_url: str = Field(..., description="PostgreSQL database URL from Supabase")

    # OpenAI Configuration
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")

    # Gemini Configuration
    gemini_api_key: str = Field(..., description="Gemini API key")
    gemini_model: str = Field(
        default="gemini-2.5-flash-image", description="Gemini model to use"
    )

    # Application Configuration
    app_name: str = Field(default="Postul API", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")
    cors_origins: Union[str, list[str]] = Field(
        default="http://localhost:3000,http://localhost:8081",
        description="CORS allowed origins (comma-separated string or list)",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or return as list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Database Pool Configuration
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(
        default=20, description="Maximum database pool overflow"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


# Global settings instance
settings = Settings()

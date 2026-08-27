from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    secret: str = Field(
        default="terra-demo-secret-not-for-production",
        validation_alias=AliasChoices("TERRA_SECRET", "secret"),
    )
    database_url: str = Field(
        default="sqlite:///./terra.db",
        validation_alias=AliasChoices("TERRA_DATABASE_URL", "database_url"),
    )
    cors_origins: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("TERRA_CORS_ORIGINS", "cors_origins"),
    )
    hf_token: str = Field(default="", validation_alias=AliasChoices("HF_TOKEN", "hf_token"))
    access_token_minutes: int = 60 * 12
    tiles_dir: str = "tiles"

    @property
    def cors_origin_list(self) -> list[str]:
        return [p.strip() for p in self.cors_origins.split(",") if p.strip()]


settings = Settings()

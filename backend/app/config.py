from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://mygolf:mygolf@localhost:5432/mygolf"
    app_name: str = "My Golf API"
    debug: bool = False


settings = Settings()

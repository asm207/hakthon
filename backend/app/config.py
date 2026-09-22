"""Application settings, read from environment variables / the .env file."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _tls_verify(value: str) -> bool | str:
    if value.lower() in ("true", "1", "yes"):
        return True
    if value.lower() in ("false", "0", "no"):
        return False
    return value  # path to a CA bundle


def _database_url(value: str) -> str:
    # Hosting providers (e.g. Render) give "postgres://" or "postgresql://" URLs; SQLAlchemy needs the driver name.
    for prefix in ("postgres://", "postgresql://"):
        if value.startswith(prefix):
            return "postgresql+psycopg://" + value[len(prefix):]
    return value


def _self_base_url() -> str:
    # Where the smoke-test endpoint reaches this same server. Empty = use the incoming request's URL.
    if os.getenv("SELF_BASE_URL"):
        return os.environ["SELF_BASE_URL"]
    return f"http://127.0.0.1:{os.environ['PORT']}" if os.getenv("PORT") else ""


class Settings:
    database_url: str = _database_url(
        os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/paysim"))
    # Optional: API key of the "Demo Store" merchant, created/updated at startup (used when deployed).
    demo_api_key: str = os.getenv("DEMO_API_KEY", "")
    self_base_url: str = _self_base_url()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    gemini_fallback_model: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-flash-lite-latest")
    cors_origins: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]
    rate_limit: str = os.getenv("RATE_LIMIT", "60/minute")
    sim_processing_delay: float = float(os.getenv("SIM_PROCESSING_DELAY", "1"))
    sim_outcome_delay: float = float(os.getenv("SIM_OUTCOME_DELAY", "2"))
    sim_timeout_delay: float = float(os.getenv("SIM_TIMEOUT_DELAY", "8"))
    smoke_tls_verify: bool | str = _tls_verify(os.getenv("SMOKE_TLS_VERIFY", "true"))


settings = Settings()

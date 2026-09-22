"""Create the database tables and a demo merchant, then print its sandbox API key.

Usage (from the backend folder):  .venv\\Scripts\\python scripts\\seed.py
Run again with --rotate to replace the demo merchant's key.
"""
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, make_url, select, text  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Merchant  # noqa: E402
from app.security.auth import hash_api_key  # noqa: E402

DEMO_NAME = "Demo Store"


def ensure_database() -> None:
    """Create the database named in DATABASE_URL if it does not exist yet."""
    url = make_url(settings.database_url)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database})
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
            print(f"Database '{url.database}' created.")
    admin.dispose()


def main() -> None:
    ensure_database()
    Base.metadata.create_all(engine)
    rotate = "--rotate" in sys.argv
    with SessionLocal() as db:
        merchant = db.scalar(select(Merchant).where(Merchant.name == DEMO_NAME))
        if merchant and not rotate:
            print(f"Merchant '{DEMO_NAME}' already exists. Run with --rotate to issue a new key.")
            return
        api_key = "sk_test_" + secrets.token_urlsafe(24)
        if merchant:
            merchant.api_key_hash = hash_api_key(api_key)
        else:
            db.add(Merchant(name=DEMO_NAME, api_key_hash=hash_api_key(api_key)))
        db.commit()
    print("Tables ready.")
    print(f"Sandbox API key for '{DEMO_NAME}' (shown only once):")
    print(api_key)


if __name__ == "__main__":
    main()

"""Startup tasks: create tables and (optionally) the demo merchant from DEMO_API_KEY."""
from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Merchant
from app.security.auth import hash_api_key

DEMO_NAME = "Demo Store"


def init_database() -> None:
    Base.metadata.create_all(engine)
    if settings.demo_api_key:
        ensure_demo_merchant(settings.demo_api_key)


def ensure_demo_merchant(api_key: str) -> None:
    with SessionLocal() as db:
        merchant = db.scalar(select(Merchant).where(Merchant.name == DEMO_NAME))
        key_hash = hash_api_key(api_key)
        if merchant is None:
            db.add(Merchant(name=DEMO_NAME, api_key_hash=key_hash))
        elif merchant.api_key_hash != key_hash:
            merchant.api_key_hash = key_hash
        db.commit()

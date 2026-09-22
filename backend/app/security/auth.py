"""Bearer token authentication for merchant requests."""
import hashlib
import secrets

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.models import ApiKey, Merchant

bearer_scheme = HTTPBearer(auto_error=False, description="Merchant API key, e.g. sk_test_...")


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_api_key() -> str:
    return "sk_test_" + secrets.token_urlsafe(24)


def get_current_merchant(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Merchant:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise errors.unauthorized()
    key_hash = hash_api_key(credentials.credentials)
    merchant = db.scalar(select(Merchant).where(Merchant.api_key_hash == key_hash))
    if merchant is None:
        merchant = db.scalar(
            select(Merchant).join(ApiKey, ApiKey.merchant_id == Merchant.id).where(ApiKey.key_hash == key_hash)
        )
    if merchant is None:
        raise errors.unauthorized()
    return merchant

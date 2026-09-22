"""Bearer token authentication for merchant requests."""
import hashlib

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.models import Merchant

bearer_scheme = HTTPBearer(auto_error=False, description="Merchant API key, e.g. sk_test_...")


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def get_current_merchant(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Merchant:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise errors.unauthorized()
    merchant = db.scalar(select(Merchant).where(Merchant.api_key_hash == hash_api_key(credentials.credentials)))
    if merchant is None:
        raise errors.unauthorized()
    return merchant

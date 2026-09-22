"""Merchant accounts: sign up, sign in and account info. Each account gets its own sandbox API keys."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import ApiKey, Merchant, utcnow
from app.schemas import AccountResponse, ErrorResponse, LoginRequest, MerchantInfo, RegisterRequest
from app.security.auth import generate_api_key, get_current_merchant, hash_api_key
from app.security.passwords import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Accounts"])


def _info(merchant: Merchant) -> MerchantInfo:
    return MerchantInfo(id=merchant.id, name=merchant.name, email=merchant.email, created_at=merchant.created_at)


@router.post(
    "/register",
    status_code=201,
    response_model=AccountResponse,
    summary="Create a sandbox merchant account",
    responses={409: {"model": ErrorResponse, "description": "Email already registered"},
               422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if db.scalar(select(Merchant.id).where(Merchant.email == email)) is not None:
        raise APIError(409, "EMAIL_TAKEN", "An account with this email already exists. Sign in instead.")

    api_key = generate_api_key()
    merchant = Merchant(name=body.business_name.strip(), email=email, password_hash=hash_password(body.password),
                        api_key_hash=hash_api_key(api_key), created_at=utcnow())
    db.add(merchant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise APIError(409, "EMAIL_TAKEN", "An account with this email already exists. Sign in instead.")
    return AccountResponse(merchant=_info(merchant), api_key=api_key)


@router.post(
    "/login",
    response_model=AccountResponse,
    summary="Sign in and receive a new sandbox API key",
    responses={401: {"model": ErrorResponse, "description": "Wrong email or password"},
               422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    merchant = db.scalar(select(Merchant).where(Merchant.email == body.email.strip().lower()))
    # Same error (and same scrypt work) whether the email or the password is wrong.
    if not verify_password(body.password, merchant.password_hash if merchant else None):
        raise APIError(401, "INVALID_CREDENTIALS", "Wrong email or password.")

    api_key = generate_api_key()
    db.add(ApiKey(merchant_id=merchant.id, key_hash=hash_api_key(api_key), label="Sign-in", created_at=utcnow()))
    db.commit()
    return AccountResponse(merchant=_info(merchant), api_key=api_key)


@router.get(
    "/me",
    response_model=MerchantInfo,
    summary="The merchant that owns the API key",
    responses={401: {"model": ErrorResponse}},
)
def me(merchant: Merchant = Depends(get_current_merchant)):
    return _info(merchant)

"""Idempotency-Key handling: a repeated key returns the stored response instead of acting twice."""
import hashlib
import json

from fastapi import Header
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import IdempotencyRecord

REPLAY_HEADER = "Idempotent-Replayed"


def require_idempotency_key(
    idempotency_key: str | None = Header(
        default=None, alias="Idempotency-Key",
        description="Unique key per operation (e.g. a UUID). Repeating it returns the original response.",
    ),
) -> str:
    if idempotency_key is None or not idempotency_key.strip():
        raise APIError(400, "IDEMPOTENCY_KEY_MISSING", "The 'Idempotency-Key' header is required for this request.")
    key = idempotency_key.strip()
    if len(key) > 255:
        raise APIError(400, "IDEMPOTENCY_KEY_INVALID", "The 'Idempotency-Key' header must be at most 255 characters.")
    return key


def request_fingerprint(endpoint: str, payload: dict | None) -> str:
    canonical = json.dumps({"endpoint": endpoint, "payload": payload}, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def find_replay(db: Session, merchant_id: int, key: str, endpoint: str, fingerprint: str) -> JSONResponse | None:
    """Return the stored response for this key, None if the key is new, or raise on a conflicting reuse."""
    record = db.scalar(
        select(IdempotencyRecord).where(IdempotencyRecord.merchant_id == merchant_id, IdempotencyRecord.key == key)
    )
    if record is None:
        return None
    if record.endpoint != endpoint or record.request_hash != fingerprint:
        raise APIError(
            409, "IDEMPOTENCY_KEY_CONFLICT",
            "This Idempotency-Key was already used with a different request. Use a new key for a new operation.",
        )
    return JSONResponse(record.response_body, status_code=record.response_status, headers={REPLAY_HEADER: "true"})


def store_response(db: Session, merchant_id: int, key: str, endpoint: str, fingerprint: str,
                   status: int, body: dict) -> None:
    """Add the record to the current DB transaction; commits together with the business change."""
    db.add(IdempotencyRecord(merchant_id=merchant_id, key=key, endpoint=endpoint, request_hash=fingerprint,
                             response_status=status, response_body=body))

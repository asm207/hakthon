"""Core payment endpoints: create, query, refund."""
from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.models import Merchant, Transaction, utcnow
from app.sandbox_engine import run_simulation
from app.schemas import CreatePaymentRequest, ErrorResponse, PaymentResponse
from app.security import idempotency
from app.security.auth import get_current_merchant
from app.state_machine import PENDING, REFUNDED, lock_transaction, record_creation, transition

router = APIRouter(prefix="/payments", tags=["Payments"])

COMMON_ERRORS = {
    401: {"model": ErrorResponse, "description": "Missing or invalid API key"},
    429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
}


def _commit_or_replay(db: Session, merchant_id: int, key: str, endpoint: str, fingerprint: str) -> JSONResponse | None:
    """Commit; if a concurrent request with the same key won the race, return its stored response."""
    try:
        db.commit()
        return None
    except IntegrityError:
        db.rollback()
        replay = idempotency.find_replay(db, merchant_id, key, endpoint, fingerprint)
        if replay is None:
            raise
        return replay


@router.post(
    "",
    status_code=201,
    response_model=PaymentResponse,
    summary="Create a sandbox payment",
    responses={
        **COMMON_ERRORS,
        400: {"model": ErrorResponse, "description": "Missing Idempotency-Key"},
        409: {"model": ErrorResponse, "description": "Idempotency-Key reused with a different body"},
        422: {"model": ErrorResponse, "description": "Invalid amount, currency, reference or simulation_mode"},
    },
)
def create_payment(
    body: CreatePaymentRequest,
    background: BackgroundTasks,
    merchant: Merchant = Depends(get_current_merchant),
    idempotency_key: str = Depends(idempotency.require_idempotency_key),
    db: Session = Depends(get_db),
):
    endpoint = "POST /api/v1/payments"
    fingerprint = idempotency.request_fingerprint(endpoint, body.model_dump(mode="json"))
    replay = idempotency.find_replay(db, merchant.id, idempotency_key, endpoint, fingerprint)
    if replay is not None:
        return replay

    now = utcnow()
    txn = Transaction(merchant_id=merchant.id, amount=body.amount, currency=body.currency, reference=body.reference,
                      simulation_mode=body.simulation_mode, status=PENDING, created_at=now, updated_at=now)
    db.add(txn)
    db.flush()
    record_creation(db, txn)
    db.flush()

    response_body = PaymentResponse.from_model(txn).model_dump(mode="json")
    idempotency.store_response(db, merchant.id, idempotency_key, endpoint, fingerprint, 201, response_body)
    replay = _commit_or_replay(db, merchant.id, idempotency_key, endpoint, fingerprint)
    if replay is not None:
        return replay

    background.add_task(run_simulation, txn.id, txn.simulation_mode)
    return JSONResponse(response_body, status_code=201)


@router.get(
    "/{transaction_id}",
    response_model=PaymentResponse,
    summary="Get payment status",
    responses={**COMMON_ERRORS, 404: {"model": ErrorResponse, "description": "Payment not found"}},
)
def get_payment(transaction_id: str, merchant: Merchant = Depends(get_current_merchant), db: Session = Depends(get_db)):
    txn = db.get(Transaction, transaction_id)
    if txn is None or txn.merchant_id != merchant.id:
        raise errors.payment_not_found(transaction_id)
    return PaymentResponse.from_model(txn)


@router.post(
    "/{transaction_id}/refund",
    response_model=PaymentResponse,
    summary="Fully refund a successful payment",
    responses={
        **COMMON_ERRORS,
        400: {"model": ErrorResponse, "description": "Missing Idempotency-Key"},
        404: {"model": ErrorResponse, "description": "Payment not found"},
        409: {"model": ErrorResponse, "description": "Payment is not in 'success' status, or Idempotency-Key conflict"},
    },
)
def refund_payment(
    transaction_id: str,
    merchant: Merchant = Depends(get_current_merchant),
    idempotency_key: str = Depends(idempotency.require_idempotency_key),
    db: Session = Depends(get_db),
):
    endpoint = f"POST /api/v1/payments/{transaction_id}/refund"
    fingerprint = idempotency.request_fingerprint(endpoint, None)
    replay = idempotency.find_replay(db, merchant.id, idempotency_key, endpoint, fingerprint)
    if replay is not None:
        return replay

    txn = lock_transaction(db, transaction_id)
    if txn is None or txn.merchant_id != merchant.id:
        raise errors.payment_not_found(transaction_id)
    transition(db, txn, REFUNDED, "payment.refunded", {"refund_type": "full", "amount": f"{txn.amount:.2f}"})
    db.flush()

    response_body = PaymentResponse.from_model(txn).model_dump(mode="json")
    idempotency.store_response(db, merchant.id, idempotency_key, endpoint, fingerprint, 200, response_body)
    replay = _commit_or_replay(db, merchant.id, idempotency_key, endpoint, fingerprint)
    if replay is not None:
        return replay
    return JSONResponse(response_body, status_code=200)

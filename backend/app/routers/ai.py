"""AI developer assistant endpoints (Gemini). The Gemini key stays on the server."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.models import Merchant, Transaction
from app.schemas import AuditSummaryResponse, DebugRequest, DebugSuggestion, ErrorResponse, PaymentResponse
from app.security.auth import get_current_merchant
from app.services import gemini

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

AI_ERRORS = {
    401: {"model": ErrorResponse},
    429: {"model": ErrorResponse},
    502: {"model": ErrorResponse, "description": "Gemini request failed"},
    503: {"model": ErrorResponse, "description": "Gemini is not configured"},
}


@router.post("/debug", response_model=DebugSuggestion, summary="Explain a failed API call", responses=AI_ERRORS)
def debug(call: DebugRequest, merchant: Merchant = Depends(get_current_merchant)):
    return gemini.debug_failed_call(call)


@router.post(
    "/audit-summary/{transaction_id}",
    response_model=AuditSummaryResponse,
    summary="Plain-English audit summary of a transaction",
    responses={**AI_ERRORS, 404: {"model": ErrorResponse}},
)
def audit_summary(transaction_id: str, merchant: Merchant = Depends(get_current_merchant),
                  db: Session = Depends(get_db)):
    txn = db.get(Transaction, transaction_id)
    if txn is None or txn.merchant_id != merchant.id:
        raise errors.payment_not_found(transaction_id)
    summary = gemini.summarize_transaction(PaymentResponse.from_model(txn))
    return AuditSummaryResponse(transaction_id=txn.id, summary=summary)

"""The payment state machine: the single source of truth for allowed status changes.

    pending -> processing -> success -> refunded
                          -> failed
                          -> timeout
"""
from sqlalchemy.orm import Session

from app import errors
from app.models import AuditLog, Transaction, utcnow

PENDING, PROCESSING, SUCCESS, FAILED, TIMEOUT, REFUNDED = (
    "pending", "processing", "success", "failed", "timeout", "refunded",
)

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    PENDING: {PROCESSING},
    PROCESSING: {SUCCESS, FAILED, TIMEOUT},
    SUCCESS: {REFUNDED},
    FAILED: set(),
    TIMEOUT: set(),
    REFUNDED: set(),
}


def lock_transaction(db: Session, transaction_id: str) -> Transaction | None:
    """Load a transaction with a row lock (SELECT ... FOR UPDATE) until the next commit."""
    return db.get(Transaction, transaction_id, with_for_update=True, populate_existing=True)


def transition(db: Session, txn: Transaction, to_status: str, event: str, details: dict | None = None) -> None:
    """Move a (locked) transaction to a new status and write the audit log. Caller commits."""
    if to_status not in ALLOWED_TRANSITIONS[txn.status]:
        raise errors.invalid_transition(txn.status, to_status)

    now = utcnow()
    txn.audit_logs.append(AuditLog(from_status=txn.status, to_status=to_status,
                                   event=event, details=details, created_at=now))
    txn.status = to_status
    txn.updated_at = now
    if to_status == REFUNDED:
        txn.refunded_at = now


def record_creation(db: Session, txn: Transaction) -> None:
    txn.audit_logs.append(AuditLog(from_status=None, to_status=PENDING, event="payment.created",
                                   details={"simulation_mode": txn.simulation_mode},
                                   created_at=txn.created_at))

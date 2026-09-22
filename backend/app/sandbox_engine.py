"""Sandbox Engine: simulates payment processing in the background.

The outcome is deterministic and chosen by `simulation_mode`:
    force_success -> success, force_failure -> failed, force_timeout -> timeout
"""
import time

from app.config import settings
from app.database import SessionLocal
from app.state_machine import FAILED, PROCESSING, SUCCESS, TIMEOUT, lock_transaction, transition

OUTCOMES = {
    "force_success": (SUCCESS, "payment.succeeded", {"message": "Simulated approval."}),
    "force_failure": (FAILED, "payment.failed", {"decline_code": "simulated_decline",
                                                 "message": "Simulated decline (force_failure)."}),
    "force_timeout": (TIMEOUT, "payment.timed_out", {"message": "Simulated processor timeout (force_timeout)."}),
}


def _step(transaction_id: str, expected_status: str, to_status: str, event: str, details: dict) -> bool:
    with SessionLocal() as db:
        txn = lock_transaction(db, transaction_id)
        if txn is None or txn.status != expected_status:
            db.rollback()
            return False
        transition(db, txn, to_status, event, details)
        db.commit()
        return True


def run_simulation(transaction_id: str, simulation_mode: str) -> None:
    """Runs after the create response is sent (FastAPI BackgroundTasks, in a worker thread)."""
    time.sleep(settings.sim_processing_delay)
    if not _step(transaction_id, "pending", PROCESSING, "payment.processing", {"message": "Sent to sandbox processor."}):
        return

    delay = settings.sim_timeout_delay if simulation_mode == "force_timeout" else settings.sim_outcome_delay
    time.sleep(delay)
    to_status, event, details = OUTCOMES[simulation_mode]
    _step(transaction_id, PROCESSING, to_status, event, details)

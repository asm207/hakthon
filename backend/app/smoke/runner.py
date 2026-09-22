"""End-to-end smoke test: Create -> Idempotency replay -> Query -> Force outcome -> Refund.

Used by both scripts/smoke_test.py (CLI) and POST /api/v1/sandbox/smoke-test.
The httpx.Client passed in must already carry the base URL and the Authorization header.
"""
import time
import uuid
from collections.abc import Callable

import httpx

POLL_INTERVAL = 0.5
POLL_TIMEOUT = 20.0


class StepFailed(Exception):
    pass


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise StepFailed(message)


def run_smoke(client: httpx.Client, on_step: Callable[[dict], None] | None = None) -> dict:
    state: dict = {}
    payload = {
        "amount": "100.00",
        "currency": "LYD",
        "reference": f"SMOKE-{uuid.uuid4().hex[:8].upper()}",
        "simulation_mode": "force_success",
    }
    create_key = str(uuid.uuid4())

    def create():
        r = client.post("/api/v1/payments", json=payload, headers={"Idempotency-Key": create_key})
        _expect(r.status_code == 201, f"expected 201, got {r.status_code}: {r.text[:200]}")
        body = r.json()
        _expect(body["status"] == "pending", f"expected status 'pending', got '{body['status']}'")
        state["id"] = body["id"]
        return f"created {body['id']} ({body['amount']} {body['currency']}) -> pending"

    def replay():
        r = client.post("/api/v1/payments", json=payload, headers={"Idempotency-Key": create_key})
        _expect(r.status_code == 201, f"expected 201, got {r.status_code}")
        _expect(r.json()["id"] == state["id"], "a duplicate payment was created")
        _expect(r.headers.get("Idempotent-Replayed") == "true", "missing Idempotent-Replayed header")
        return "same Idempotency-Key returned the original payment (no double charge)"

    def query():
        r = client.get(f"/api/v1/payments/{state['id']}")
        _expect(r.status_code == 200, f"expected 200, got {r.status_code}")
        body = r.json()
        _expect(body["id"] == state["id"], "wrong payment returned")
        return f"status is '{body['status']}'"

    def outcome():
        deadline = time.monotonic() + POLL_TIMEOUT
        seen = []
        while time.monotonic() < deadline:
            status = client.get(f"/api/v1/payments/{state['id']}").json()["status"]
            if not seen or seen[-1] != status:
                seen.append(status)
            if status == "success":
                return " -> ".join(seen)
            _expect(status in ("pending", "processing"), f"unexpected final status '{status}'")
            time.sleep(POLL_INTERVAL)
        raise StepFailed(f"payment did not reach 'success' within {POLL_TIMEOUT:.0f}s ({' -> '.join(seen)})")

    def refund():
        r = client.post(f"/api/v1/payments/{state['id']}/refund", headers={"Idempotency-Key": str(uuid.uuid4())})
        _expect(r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}")
        _expect(r.json()["status"] == "refunded", "refund did not set status 'refunded'")
        check = client.get(f"/api/v1/payments/{state['id']}").json()
        _expect(check["status"] == "refunded", "GET does not show 'refunded'")
        return "success -> refunded (confirmed by GET)"

    steps_def = [
        ("Create payment", create),
        ("Idempotency replay", replay),
        ("Query payment", query),
        ("Force outcome (success)", outcome),
        ("Refund payment", refund),
    ]

    steps: list[dict] = []
    failed = False
    started = time.monotonic()
    for name, fn in steps_def:
        if failed:
            step = {"name": name, "status": "skipped", "duration_ms": 0, "detail": "skipped after a failure"}
        else:
            t0 = time.monotonic()
            try:
                step = {"name": name, "status": "passed", "detail": fn()}
            except (StepFailed, httpx.HTTPError, KeyError, ValueError) as exc:
                failed = True
                step = {"name": name, "status": "failed", "detail": str(exc) or type(exc).__name__}
            step["duration_ms"] = int((time.monotonic() - t0) * 1000)
        steps.append(step)
        if on_step:
            on_step(step)

    return {
        "passed": not failed,
        "transaction_id": state.get("id"),
        "total_ms": int((time.monotonic() - started) * 1000),
        "steps": steps,
    }

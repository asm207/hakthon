"""PaySim Sandbox API: application entry point."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.bootstrap import init_database
from app.config import settings
from app.errors import register_error_handlers
from app.routers import accounts, ai, payments, sandbox
from app.security.rate_limit import RateLimitMiddleware

DESCRIPTION = """
Isolated sandbox that simulates the full payment lifecycle. **No real money, no bank connections.**

**Lifecycle:** `pending → processing → success | failed | timeout`, then `success → refunded`.

**Accounts:** sign up at `POST /api/v1/auth/register` to get your own sandbox API key
(`POST /api/v1/auth/login` issues a new one), then click **Authorize** and paste it.

**Security:** Bearer API key on every request, `Idempotency-Key` on every POST that changes money state,
strict schema validation, and a rate limit of 60 requests/minute per API key.

**Errors** always use `{"error": {"code", "message", "details"}}`:

| HTTP | code | When |
|---|---|---|
| 400 | `IDEMPOTENCY_KEY_MISSING` | POST without an `Idempotency-Key` header |
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer API key |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password on sign-in |
| 409 | `EMAIL_TAKEN` | Sign-up with an email that already has an account |
| 404 | `PAYMENT_NOT_FOUND` | Unknown payment id (or another merchant's) |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Same `Idempotency-Key` reused with a different body |
| 409 | `INVALID_STATE_TRANSITION` | e.g. refunding a payment that is not `success` |
| 422 | `VALIDATION_ERROR` | Invalid amount, currency, reference, simulation_mode or extra fields |
| 429 | `RATE_LIMITED` | More than 60 requests/minute (see `Retry-After`) |
| 502 | `AI_ERROR` | Gemini request failed or is overloaded |
| 503 | `AI_UNAVAILABLE` | `GEMINI_API_KEY` is not configured |
"""


FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield


app = FastAPI(title="PaySim Sandbox API", version="1.0.0", description=DESCRIPTION, lifespan=lifespan)

register_error_handlers(app)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    expose_headers=["Idempotent-Replayed", "Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining",
                    "X-RateLimit-Reset"],
)

for module in (accounts, payments, sandbox, ai):
    app.include_router(module.router, prefix="/api/v1")

# When the built UI is present (deployment), serve it from the same server at "/".
# Mounted last so /api, /docs and /openapi.json keep priority.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

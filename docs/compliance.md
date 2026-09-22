# PaySim Sandbox — Track Compliance Sheet

How each track requirement is satisfied, and where to verify it.

| # | Requirement | How PaySim satisfies it | Where / how to verify |
|---|---|---|---|
| 1 | **Isolated sandbox, no real money** | Payments exist only as rows in a local PostgreSQL database. There is no bank, card network or payment-processor integration; outcomes are produced by the in-process Sandbox Engine. The only outbound call is to Gemini (for developer assistance), never with payment credentials. | `backend/app/sandbox_engine.py`; "Test mode" badge in the UI |
| 2 | **Full transaction lifecycle** | `pending → processing → success / failed / timeout`, then `success → refunded`. A single transition table rejects every other move with `409 INVALID_STATE_TRANSITION`. Every change is written to `audit_logs`. | `backend/app/state_machine.py`; "State history" in the Sandbox Console |
| 3 | **Controllable simulation** | `simulation_mode` = `force_success` / `force_failure` / `force_timeout` deterministically forces the outcome. | Simulation mode dropdown; `POST /api/v1/payments` body |
| 4 | **Core REST API** | `POST /api/v1/payments`, `GET /api/v1/payments/{transaction_id}`, `POST /api/v1/payments/{transaction_id}/refund` | `docs/openapi.json`, live docs at `https://127.0.0.1:8000/docs` |
| 5 | **Authentication** | `Authorization: Bearer sk_test_...` on every endpoint. Each merchant signs up (`POST /api/v1/auth/register`) and gets its own sandbox key; signing in issues an additional key. Keys are stored only as SHA-256 hashes, passwords as salted scrypt hashes. A merchant can only see its own payments. Sign-up / sign-in are limited to 10 attempts per minute per IP. | `backend/app/security/auth.py`, `backend/app/routers/accounts.py` — no key → `401 UNAUTHORIZED` |
| 6 | **Idempotency** | `Idempotency-Key` is required on every money-moving POST. Same key + same body returns the stored response (`Idempotent-Replayed: true`), same key + different body → `409`. The record is committed in the same DB transaction as the payment, and a unique constraint handles concurrent duplicates. The store's "Pay" button reuses one key per checkout, so a double click can never charge twice. | `backend/app/security/idempotency.py`; smoke-test step "Idempotency replay" |
| 7 | **Schema validation** | Positive amount, max 2 decimals, ≤ 1,000,000; currency must be `LYD`/`USD`/`EUR`; reference 1–64 chars `[A-Za-z0-9_-]`; unknown fields rejected. Errors list the failing field. | `backend/app/schemas.py` — e.g. `currency: "XYZ"` → `422 VALIDATION_ERROR` |
| 8 | **Rate limiting** | 60 requests/minute per API key (moving window); `429 RATE_LIMITED` with `Retry-After` and `X-RateLimit-*` headers. | `backend/app/security/rate_limit.py` |
| 9 | **HTTPS** | API and UI are served over TLS with a locally-trusted certificate (mkcert); plain HTTP connections to the API are refused. | `https://127.0.0.1:8000`, `https://localhost:5173` |
| 10 | **Automated Smoke Test** | Create → Idempotency replay → Query → Force outcome → Refund, runnable from the CLI (exit code 0/1) or with one click in the UI via `POST /api/v1/sandbox/smoke-test`. | `backend/scripts/smoke_test.py`; "Run Smoke Test" panel |
| 11 | **Unified error format** | Every error is `{"error": {"code", "message", "details"}}` with documented codes. | Error table in `docs/openapi.json` description |
| 12 | **AI developer assistant (Gemini)** | "Explain with AI" analyses any failed request/response and returns problem / cause / fix / corrected payload. "AI audit summary" turns a transaction's ledger records into a plain-English summary. The API key stays on the server and `Authorization` headers are redacted before anything is sent to Gemini. | `backend/app/services/gemini.py`; buttons in the Sandbox Console |

## Security notes

- Secrets (`DATABASE_URL`, `GEMINI_API_KEY`) live only in `backend/.env`, which is git-ignored.
- The demo UI holds a **sandbox** `sk_test_` key in `frontend/.env.local`. This is acceptable for a sandbox
  (the key can only create simulated payments); a production integration would call the API from the merchant's server.

"""Gemini AI developer assistant: debug failed API calls and summarise transaction audit trails."""
import json
import time

from google.genai import errors as genai_errors

from app.config import settings
from app.errors import APIError
from app.schemas import DebugRequest, DebugSuggestion, PaymentResponse

API_RULES = """PaySim Sandbox API rules:
- Every request needs the header 'Authorization: Bearer sk_test_...'. Missing/invalid -> 401 UNAUTHORIZED.
- POST /api/v1/payments and POST /api/v1/payments/{id}/refund need an 'Idempotency-Key' header
  (unique string, e.g. a UUID). Missing -> 400 IDEMPOTENCY_KEY_MISSING. The same key with a different
  body -> 409 IDEMPOTENCY_KEY_CONFLICT. The same key with the same body returns the original response.
- Create body (JSON, no extra fields allowed):
  amount: positive decimal, max 2 decimal places, max 1000000 (e.g. "100.00")
  currency: one of "LYD", "USD", "EUR" (uppercase ISO 4217)
  reference: 1-64 chars, letters, digits, '-' or '_'
  simulation_mode (optional): "force_success" | "force_failure" | "force_timeout"
  Invalid -> 422 VALIDATION_ERROR.
- Lifecycle: pending -> processing -> success | failed | timeout; success -> refunded.
  Refund is only allowed from 'success' -> otherwise 409 INVALID_STATE_TRANSITION.
- Unknown payment id -> 404 PAYMENT_NOT_FOUND. More than 60 requests/minute -> 429 RATE_LIMITED (see Retry-After).
"""

DEBUG_INSTRUCTIONS = (
    "You are the PaySim Sandbox developer assistant. A developer's API call failed. "
    "Using the API rules below, explain the problem briefly and precisely, give the root cause, and the exact fix. "
    "If the request body must change, return the corrected JSON body as a string in corrected_payload; "
    "otherwise set it to null. Never invent endpoints or fields. Keep each field under 3 sentences.\n\n" + API_RULES
)

AUDIT_INSTRUCTIONS = (
    "You are a payments auditor for the PaySim Sandbox (test money only, no real funds). "
    "Given a transaction and its audit trail, write a plain-English summary in 3 to 5 sentences: "
    "what was requested, each status change with timing, the final state, and anything unusual "
    "(failures, timeouts, refunds). Plain text only, no markdown.\n\n" + API_RULES
)

RETRY_ATTEMPTS = 3  # total attempts on temporary Gemini errors
BUSY_CODES = (429, 500, 503, 504)  # overload / deadline exceeded: worth retrying
RETRY_DELAY = 1.0   # seconds, grows with each attempt
REQUEST_TIMEOUT_MS = 12_000  # per attempt, so the UI never hangs for long

_client = None


def _get_client():
    global _client
    if not settings.gemini_api_key:
        raise APIError(503, "AI_UNAVAILABLE", "Gemini is not configured. Set GEMINI_API_KEY in backend/.env.")
    if _client is None:
        from google import genai
        from google.genai import types
        _client = genai.Client(api_key=settings.gemini_api_key,
                               http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS))
    return _client


def _generate(instructions: str, contents: str, schema=None):
    from google.genai import types

    config = types.GenerateContentConfig(
        system_instruction=instructions,
        temperature=0.2,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    if schema is not None:
        config.response_mime_type = "application/json"
        config.response_schema = schema
    client = _get_client()
    # Main model first; the last attempt uses the faster fallback model.
    models = [settings.gemini_model] * (RETRY_ATTEMPTS - 1) + [settings.gemini_fallback_model]
    for attempt, model in enumerate(models, start=1):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except genai_errors.APIError as exc:
            busy = exc.code in BUSY_CODES
            if busy and attempt < len(models):
                time.sleep(RETRY_DELAY * attempt)
                continue
            message = ("Gemini is busy right now. Please try again in a few seconds." if busy
                       else "The Gemini request failed.")
            raise APIError(502, "AI_ERROR", message, {"reason": str(exc)[:300]})
        except Exception as exc:  # network errors and client-side timeouts
            if attempt < len(models):
                continue
            raise APIError(502, "AI_ERROR", "The Gemini request failed.", {"reason": str(exc)[:300]})


def _redact(headers: dict[str, str]) -> dict[str, str]:
    return {k: ("[REDACTED]" if k.lower() in ("authorization", "cookie") else v) for k, v in headers.items()}


def debug_failed_call(call: DebugRequest) -> DebugSuggestion:
    data = call.model_dump()
    data["headers"] = _redact(call.headers)  # never send API keys to a third party
    contents = "Failed API call:\n" + json.dumps(data, indent=2, default=str)[:8000]
    response = _generate(DEBUG_INSTRUCTIONS, contents, schema=DebugSuggestion)
    if isinstance(response.parsed, DebugSuggestion):
        return response.parsed
    try:
        return DebugSuggestion.model_validate_json(response.text or "")
    except ValueError:
        raise APIError(502, "AI_ERROR", "Gemini returned an unexpected response.")


def summarize_transaction(payment: PaymentResponse) -> str:
    contents = "Transaction record:\n" + payment.model_dump_json(indent=2)
    text = (_generate(AUDIT_INSTRUCTIONS, contents).text or "").strip()
    if not text:
        raise APIError(502, "AI_ERROR", "Gemini returned an empty summary.")
    return text

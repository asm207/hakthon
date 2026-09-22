"""Rate limiting: a maximum number of requests per minute for each API key (or IP if no key)."""
import hashlib
import time

from fastapi.responses import JSONResponse
from limits import parse, storage, strategies
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings
from app.errors import error_body

LIMIT = parse(settings.rate_limit)
# Sign-up / sign-in get a stricter per-IP limit to slow down password guessing.
AUTH_LIMIT = parse(settings.auth_rate_limit)
AUTH_PATHS = ("/api/v1/auth/register", "/api/v1/auth/login")
_limiter = strategies.MovingWindowRateLimiter(storage.MemoryStorage())


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limit_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer ") and len(auth) > 7:
        return "key:" + hashlib.sha256(auth[7:].strip().encode()).hexdigest()[:16]
    return "ip:" + client_ip(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Applies LIMIT to every /api/ request and adds X-RateLimit-* headers."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/") or request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in AUTH_PATHS:
            limit, key, limit_text = AUTH_LIMIT, "auth:" + client_ip(request), f"{settings.auth_rate_limit} per IP"
        else:
            limit, key, limit_text = LIMIT, rate_limit_key(request), f"{settings.rate_limit} per API key"
        allowed = _limiter.hit(limit, key)
        reset_at, remaining = _limiter.get_window_stats(limit, key)
        headers = {
            "X-RateLimit-Limit": str(limit.amount),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(reset_at)),
        }
        if not allowed:
            headers["Retry-After"] = str(max(1, int(reset_at - time.time()) + 1))
            return JSONResponse(
                error_body("RATE_LIMITED", f"Too many requests. Limit is {limit_text}."),
                status_code=429, headers=headers,
            )

        response = await call_next(request)
        response.headers.update(headers)
        return response

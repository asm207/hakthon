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
_limiter = strategies.MovingWindowRateLimiter(storage.MemoryStorage())


def rate_limit_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer ") and len(auth) > 7:
        return "key:" + hashlib.sha256(auth[7:].strip().encode()).hexdigest()[:16]
    return "ip:" + (request.client.host if request.client else "unknown")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Applies LIMIT to every /api/ request and adds X-RateLimit-* headers."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/") or request.method == "OPTIONS":
            return await call_next(request)

        key = rate_limit_key(request)
        allowed = _limiter.hit(LIMIT, key)
        reset_at, remaining = _limiter.get_window_stats(LIMIT, key)
        headers = {
            "X-RateLimit-Limit": str(LIMIT.amount),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(reset_at)),
        }
        if not allowed:
            headers["Retry-After"] = str(max(1, int(reset_at - time.time()) + 1))
            return JSONResponse(
                error_body("RATE_LIMITED", f"Too many requests. Limit is {settings.rate_limit} per API key."),
                status_code=429, headers=headers,
            )

        response = await call_next(request)
        response.headers.update(headers)
        return response

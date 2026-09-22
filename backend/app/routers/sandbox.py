"""Sandbox tools: one-click automated smoke test."""
import httpx
from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.models import Merchant
from app.schemas import ErrorResponse, SmokeTestResponse
from app.security.auth import get_current_merchant
from app.smoke.runner import run_smoke

router = APIRouter(prefix="/sandbox", tags=["Sandbox"])


@router.post(
    "/smoke-test",
    response_model=SmokeTestResponse,
    summary="Run the full payment lifecycle smoke test",
    responses={401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
def smoke_test(request: Request, merchant: Merchant = Depends(get_current_merchant)):
    # Calls this same API over HTTP with the caller's own API key.
    base_url = settings.self_base_url or str(request.base_url).rstrip("/")
    headers = {"Authorization": request.headers["authorization"]}
    with httpx.Client(base_url=base_url, headers=headers, verify=settings.smoke_tls_verify, timeout=15) as client:
        return run_smoke(client)

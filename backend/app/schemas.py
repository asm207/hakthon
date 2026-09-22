"""Request validation rules and response shapes."""
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import Transaction

Currency = Literal["LYD", "USD", "EUR"]
SimulationMode = Literal["force_success", "force_failure", "force_timeout"]
PaymentStatus = Literal["pending", "processing", "success", "failed", "timeout", "refunded"]


class CreatePaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: Decimal = Field(gt=0, le=Decimal("1000000"), max_digits=12, decimal_places=2,
                            description="Positive amount with at most 2 decimal places.", examples=["100.00"])
    currency: Currency = Field(description="ISO 4217 code (uppercase).", examples=["LYD"])
    reference: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$",
                           description="Merchant order reference.", examples=["ORDER-1001"])
    simulation_mode: SimulationMode = Field(default="force_success",
                                            description="Controls the simulated outcome.")


class StatusChange(BaseModel):
    from_status: str | None
    to_status: str
    event: str
    details: dict | None = None
    at: datetime


class PaymentResponse(BaseModel):
    id: str
    object: Literal["payment"] = "payment"
    amount: str
    currency: str
    reference: str
    simulation_mode: str
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime
    refunded_at: datetime | None
    history: list[StatusChange]

    @classmethod
    def from_model(cls, txn: Transaction) -> "PaymentResponse":
        return cls(
            id=txn.id,
            amount=f"{txn.amount:.2f}",
            currency=txn.currency,
            reference=txn.reference,
            simulation_mode=txn.simulation_mode,
            status=txn.status,
            created_at=txn.created_at,
            updated_at=txn.updated_at,
            refunded_at=txn.refunded_at,
            history=[
                StatusChange(from_status=a.from_status, to_status=a.to_status, event=a.event,
                             details=a.details, at=a.created_at)
                for a in txn.audit_logs
            ],
        )


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail


class SmokeStep(BaseModel):
    name: str
    status: Literal["passed", "failed", "skipped"]
    duration_ms: int
    detail: str


class SmokeTestResponse(BaseModel):
    passed: bool
    transaction_id: str | None
    total_ms: int
    steps: list[SmokeStep]


EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=2, max_length=80, examples=["Benghazi Tech Store"])
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN, examples=["dev@example.com"])
    password: str = Field(min_length=8, max_length=128, description="At least 8 characters.")


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=1, max_length=128)


class MerchantInfo(BaseModel):
    id: int
    name: str
    email: str | None
    created_at: datetime


class AccountResponse(BaseModel):
    merchant: MerchantInfo
    api_key: str = Field(description="Sandbox API key. Shown only once; signing in again issues a new one.")


class DebugRequest(BaseModel):
    """A failed API call to be analysed by Gemini."""
    model_config = ConfigDict(extra="forbid")

    method: str = Field(max_length=10, examples=["POST"])
    path: str = Field(max_length=300, examples=["/api/v1/payments"])
    headers: dict[str, str] = Field(default_factory=dict)
    body: Any = None
    response_status: int
    response_body: Any = None


class DebugSuggestion(BaseModel):
    problem: str
    cause: str
    fix: str
    corrected_payload: str | None = Field(default=None, description="Corrected JSON body as a string, if relevant.")


class AuditSummaryResponse(BaseModel):
    transaction_id: str
    summary: str

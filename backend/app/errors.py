"""Error codes and the unified error format: {"error": {"code", "message", "details"}}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}


def error_body(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def unauthorized(message: str = "Missing or invalid API key. Use 'Authorization: Bearer sk_test_...'.") -> APIError:
    return APIError(401, "UNAUTHORIZED", message)


def payment_not_found(transaction_id: str) -> APIError:
    return APIError(404, "PAYMENT_NOT_FOUND", f"Payment '{transaction_id}' was not found.")


def invalid_transition(current: str, target: str) -> APIError:
    return APIError(
        409,
        "INVALID_STATE_TRANSITION",
        f"Cannot move payment from '{current}' to '{target}'.",
        {"current_status": current, "requested_status": target},
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(request: Request, exc: APIError):
        return JSONResponse(error_body(exc.code, exc.message, exc.details), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        fields = [
            {"field": ".".join(str(p) for p in err["loc"] if p != "body"), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            error_body("VALIDATION_ERROR", "The request body is invalid.", {"fields": fields}),
            status_code=422,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(error_body(code, str(exc.detail)), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception):
        return JSONResponse(error_body("INTERNAL_ERROR", "Unexpected server error."), status_code=500)

import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

logger = logging.getLogger(__name__)


def rate_limit_exceeded_handler(request: Request, exc: Exception):
    if isinstance(exc, RateLimitExceeded):
        return _rate_limit_exceeded_handler(request, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception on %s %s from %s: %s",
        request.method,
        request.url,
        request.client.host if request.client else "unknown",
        repr(exc),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(
            "HTTPException on %s %s from %s: status=%s detail=%r",
            request.method,
            request.url,
            request.client.host if request.client else "unknown",
            exc.status_code,
            exc.detail,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

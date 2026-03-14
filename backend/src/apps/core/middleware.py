from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from src.apps.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # HSTS must only be sent over HTTPS — setting it on plain HTTP causes
        # browsers to refuse subsequent HTTP connections to this host entirely.
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # CSP with allowances for Swagger UI.
        # connect-src includes the API server host so Swagger's "Try it out"
        # calls always work regardless of which origin loads the page.
        _connect_hosts = " ".join(filter(None, [
            "'self'",
            settings.SERVER_HOST.rstrip("/") if settings.SERVER_HOST else None,
        ]))
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
            "font-src 'self' data:; "
            f"connect-src {_connect_hosts}"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        return response

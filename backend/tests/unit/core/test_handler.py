import pytest
from fastapi import Request
from slowapi.errors import RateLimitExceeded

from src.apps.core.handler import global_exception_handler, rate_limit_exceeded_handler


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "headers": [],
            "query_string": b"",
            "server": ("testserver", 80),
            "client": ("127.0.0.1", 12345),
            "scheme": "http",
        }
    )


class TestHandlers:
    def test_rate_limit_exceeded_handler_delegates(self, monkeypatch: pytest.MonkeyPatch):
        request = _request()
        expected = object()
        limit = type("Limit", (), {"error_message": "too many"})()
        monkeypatch.setattr(
            "src.apps.core.handler._rate_limit_exceeded_handler",
            lambda req, exc: expected,
        )

        response = rate_limit_exceeded_handler(request, RateLimitExceeded(limit))
        assert response is expected

    def test_rate_limit_exceeded_handler_falls_back_to_500(self):
        request = _request()
        response = rate_limit_exceeded_handler(request, RuntimeError("boom"))

        assert response.status_code == 500
        assert response.body == b'{"detail":"Internal server error"}'

    @pytest.mark.asyncio
    async def test_global_exception_handler_returns_generic_message(self):
        request = _request()
        response = await global_exception_handler(request, RuntimeError("boom"))

        assert response.status_code == 500
        assert response.body == b'{"detail":"An unexpected error occurred. Please try again later."}'

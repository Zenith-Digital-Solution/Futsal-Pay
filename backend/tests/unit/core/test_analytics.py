from unittest.mock import MagicMock

import pytest

from src.apps.core.analytics import _Analytics


class TestAnalytics:
    def test_get_client_disabled_returns_none(self, monkeypatch: pytest.MonkeyPatch):
        analytics = _Analytics()
        monkeypatch.setattr("src.apps.core.analytics.settings.POSTHOG_ENABLED", False)
        monkeypatch.setattr("src.apps.core.analytics.settings.POSTHOG_API_KEY", "")
        assert analytics._get_client() is None

    def test_get_client_enabled_creates_singleton(self, monkeypatch: pytest.MonkeyPatch):
        analytics = _Analytics()
        client = MagicMock()
        posthog_cls = MagicMock(return_value=client)
        monkeypatch.setattr("src.apps.core.analytics.settings.POSTHOG_ENABLED", True)
        monkeypatch.setattr("src.apps.core.analytics.settings.POSTHOG_API_KEY", "phc_test")
        monkeypatch.setattr("src.apps.core.analytics.Posthog", posthog_cls)

        first = analytics._get_client()
        second = analytics._get_client()

        assert first is client
        assert second is client
        posthog_cls.assert_called_once()

    def test_track_identify_and_group_are_safe(self, monkeypatch: pytest.MonkeyPatch):
        analytics = _Analytics()
        client = MagicMock()
        analytics._client = client
        monkeypatch.setattr(analytics, "_get_client", MagicMock(return_value=client))

        analytics.track("1", "signed_in", {"k": "v"})
        analytics.identify("1", {"email": "a@example.com"})
        analytics.group("1", "tenant", "abc", {"name": "Test"})

        client.capture.assert_any_call(distinct_id="1", event="signed_in", properties={"k": "v"})
        client.identify.assert_called_once_with(distinct_id="1", properties={"email": "a@example.com"})
        assert client.group_identify.called
        assert client.capture.call_count >= 2

    def test_track_identify_group_swallow_exceptions(self, monkeypatch: pytest.MonkeyPatch):
        analytics = _Analytics()
        client = MagicMock()
        client.capture.side_effect = RuntimeError("capture fail")
        client.identify.side_effect = RuntimeError("identify fail")
        client.group_identify.side_effect = RuntimeError("group fail")
        monkeypatch.setattr(analytics, "_get_client", MagicMock(return_value=client))

        analytics.track("1", "event")
        analytics.identify("1")
        analytics.group("1", "tenant", "abc")

    def test_shutdown_handles_present_and_failing_client(self):
        analytics = _Analytics()
        client = MagicMock()
        analytics._client = client

        analytics.shutdown()
        client.shutdown.assert_called_once()

        client.shutdown.reset_mock()
        client.shutdown.side_effect = RuntimeError("shutdown fail")
        analytics.shutdown()

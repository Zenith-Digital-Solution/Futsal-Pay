from unittest.mock import AsyncMock, MagicMock

import pytest

from src.apps.core.cache import RedisCache


@pytest.fixture(autouse=True)
async def reset_cache_state():
    RedisCache._client = None
    RedisCache._pool = None
    yield
    RedisCache._client = None
    RedisCache._pool = None


class TestRedisCache:
    @pytest.mark.asyncio
    async def test_get_client_returns_none_in_debug(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.apps.core.cache.settings.DEBUG", True)
        assert await RedisCache.get_client() is None

    @pytest.mark.asyncio
    async def test_get_client_creates_and_reuses_client(self, monkeypatch: pytest.MonkeyPatch):
        pool = MagicMock()
        client = MagicMock()
        monkeypatch.setattr("src.apps.core.cache.settings.DEBUG", False)
        monkeypatch.setattr("src.apps.core.cache.settings.REDIS_URL", "redis://localhost:6379/0")
        monkeypatch.setattr("src.apps.core.cache.ConnectionPool.from_url", MagicMock(return_value=pool))
        monkeypatch.setattr("src.apps.core.cache.Redis", MagicMock(return_value=client))

        first = await RedisCache.get_client()
        second = await RedisCache.get_client()

        assert first is client
        assert second is client

    @pytest.mark.asyncio
    async def test_close_shuts_down_client_and_pool(self):
        client = AsyncMock()
        pool = AsyncMock()
        RedisCache._client = client
        RedisCache._pool = pool

        await RedisCache.close()

        client.close.assert_awaited_once()
        pool.disconnect.assert_awaited_once()
        assert RedisCache._client is None
        assert RedisCache._pool is None

    @pytest.mark.asyncio
    async def test_get_returns_deserialized_value(self, monkeypatch: pytest.MonkeyPatch):
        client = AsyncMock()
        client.get.return_value = '{"ok": true}'
        monkeypatch.setattr(RedisCache, "get_client", AsyncMock(return_value=client))

        assert await RedisCache.get("key") == {"ok": True}

    @pytest.mark.asyncio
    async def test_get_returns_none_on_missing_or_error(self, monkeypatch: pytest.MonkeyPatch):
        client = AsyncMock()
        client.get.side_effect = RuntimeError("boom")
        monkeypatch.setattr(RedisCache, "get_client", AsyncMock(return_value=client))
        assert await RedisCache.get("key") is None

        client.get.side_effect = None
        client.get.return_value = None
        assert await RedisCache.get("key") is None

    @pytest.mark.asyncio
    async def test_set_delete_exists_short_circuit_without_client(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr(RedisCache, "get_client", AsyncMock(return_value=None))

        assert await RedisCache.set("a", {"b": 1}) is False
        assert await RedisCache.delete("a") is False
        assert await RedisCache.exists("a") is False
        assert await RedisCache.clear_pattern("x:*") == 0

    @pytest.mark.asyncio
    async def test_set_delete_exists_success_and_failure(self, monkeypatch: pytest.MonkeyPatch):
        client = AsyncMock()
        client.exists.return_value = 1
        monkeypatch.setattr(RedisCache, "get_client", AsyncMock(return_value=client))

        assert await RedisCache.set("a", {"b": 1}) is True
        assert await RedisCache.delete("a") is True
        assert await RedisCache.exists("a") is True

        client.setex.side_effect = RuntimeError("set failed")
        client.delete.side_effect = RuntimeError("delete failed")
        client.exists.side_effect = RuntimeError("exists failed")

        assert await RedisCache.set("a", {"b": 1}) is False
        assert await RedisCache.delete("a") is False
        assert await RedisCache.exists("a") is False

    @pytest.mark.asyncio
    async def test_clear_pattern_deletes_matching_keys_and_handles_errors(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ):
        client = AsyncMock()

        async def scan_iter(match: str):
            assert match == "prefix:*"
            for key in ["prefix:1", "prefix:2"]:
                yield key

        client.scan_iter = scan_iter
        client.delete.return_value = 2
        monkeypatch.setattr(RedisCache, "get_client", AsyncMock(return_value=client))

        assert await RedisCache.clear_pattern("prefix:*") == 2

        async def broken_scan_iter(match: str):
            raise RuntimeError("scan failed")
            yield  # pragma: no cover

        client.scan_iter = broken_scan_iter
        assert await RedisCache.clear_pattern("prefix:*") == 0

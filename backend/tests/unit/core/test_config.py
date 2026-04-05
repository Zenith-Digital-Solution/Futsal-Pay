import pytest
from src.apps.core.config import Settings, _should_load_env_file, load_settings_from_db, settings


class TestSettings:
    """Test application settings."""
    
    def test_project_name(self):
        """Test project name is set."""
        assert settings.PROJECT_NAME == "FastAPI Template"
    
    def test_api_version(self):
        """Test API version prefix."""
        assert settings.API_V1_STR == "/api/v1"
    
    def test_token_expiry_settings(self):
        """Test token expiry settings are configured."""
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0
        assert settings.REFRESH_TOKEN_EXPIRE_DAYS > 0
    
    def test_password_policy_settings(self):
        """Test password policy settings."""
        assert settings.PASSWORD_MIN_LENGTH >= 8
        assert isinstance(settings.PASSWORD_REQUIRE_UPPERCASE, bool)
        assert isinstance(settings.PASSWORD_REQUIRE_LOWERCASE, bool)
        assert isinstance(settings.PASSWORD_REQUIRE_DIGIT, bool)
    
    def test_security_settings(self):
        """Test security settings are configured."""
        assert settings.SECRET_KEY is not None
        assert len(settings.SECRET_KEY) > 0
        assert settings.MAX_LOGIN_ATTEMPTS > 0
        assert settings.ACCOUNT_LOCKOUT_DURATION_MINUTES > 0
    
    def test_cors_origins(self):
        """Test CORS origins are configured."""
        assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
        assert len(settings.BACKEND_CORS_ORIGINS) > 0

    def test_cors_origins_from_comma_separated_env(self, monkeypatch: pytest.MonkeyPatch):
        """Comma-separated env values should be normalized into a list."""
        monkeypatch.setenv(
            "BACKEND_CORS_ORIGINS",
            "http://example.com,http://localhost:3000",
        )

        configured = Settings(_env_file=None)

        assert configured.BACKEND_CORS_ORIGINS == [
            "http://example.com",
            "http://localhost:3000",
        ]

    def test_allowed_hosts_from_comma_separated_env(self, monkeypatch: pytest.MonkeyPatch):
        """Comma-separated host env values should be normalized into a list."""
        monkeypatch.setenv("ALLOWED_HOSTS", "144.126.252.228,localhost")

        configured = Settings(_env_file=None)

        assert configured.ALLOWED_HOSTS == ["144.126.252.228", "localhost"]
    
    def test_database_url(self):
        """Test database URL is configured."""
        assert settings.DATABASE_URL is not None
        assert len(settings.DATABASE_URL) > 0
    
    def test_debug_mode(self):
        """Test debug mode setting."""
        assert isinstance(settings.DEBUG, bool)

    def test_should_load_env_file_disabled_in_testing(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("TESTING", "true")
        assert _should_load_env_file() is None

    def test_should_load_env_file_defaults_to_dotenv(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.delenv("TESTING", raising=False)
        assert _should_load_env_file() == ".env"

    def test_builds_redis_and_celery_urls_without_password(self):
        configured = Settings(
            _env_file=None,
            REDIS_URL=None,
            CELERY_BROKER_URL=None,
            CELERY_RESULT_BACKEND=None,
            DEBUG=False,
        )
        assert configured.REDIS_URL.startswith("redis://")
        assert configured.CELERY_BROKER_URL.startswith("redis://")
        assert configured.CELERY_RESULT_BACKEND.startswith("redis://")

    def test_invalid_cors_origin_format_raises(self):
        with pytest.raises(ValueError):
            Settings(_env_file=None, BACKEND_CORS_ORIGINS=123)  # type: ignore[arg-type]

    def test_invalid_allowed_hosts_format_raises(self):
        with pytest.raises(ValueError):
            Settings(_env_file=None, ALLOWED_HOSTS=123)  # type: ignore[arg-type]

    @pytest.mark.asyncio
    async def test_load_settings_from_db_updates_known_fields(self, monkeypatch: pytest.MonkeyPatch):
        class FakeResult:
            def fetchall(self):
                return [
                    ("DEBUG", "false"),
                    ("ACCESS_TOKEN_EXPIRE_MINUTES", "99"),
                    ("POSTHOG_HOST", "https://example.com"),
                    ("UNKNOWN_FIELD", "ignored"),
                ]

        class FakeSession:
            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def execute(self, _query):
                return FakeResult()

        monkeypatch.setattr(
            "src.db.session.async_session_factory",
            lambda: FakeSession(),
        )

        original_debug = settings.DEBUG
        original_expiry = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        original_posthog_host = settings.POSTHOG_HOST
        try:
            await load_settings_from_db()
            assert settings.DEBUG is False
            assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 99
            assert settings.POSTHOG_HOST == "https://example.com"
        finally:
            object.__setattr__(settings, "DEBUG", original_debug)
            object.__setattr__(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", original_expiry)
            object.__setattr__(settings, "POSTHOG_HOST", original_posthog_host)

    @pytest.mark.asyncio
    async def test_load_settings_from_db_handles_missing_table(self, monkeypatch: pytest.MonkeyPatch):
        class FakeSession:
            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def execute(self, _query):
                raise RuntimeError("missing table")

        monkeypatch.setattr(
            "src.db.session.async_session_factory",
            lambda: FakeSession(),
        )

        await load_settings_from_db()

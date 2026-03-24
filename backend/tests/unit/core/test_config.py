import pytest
from src.apps.core.config import Settings, settings


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
            "http://144.126.252.228,http://144.126.252.228:3000",
        )

        configured = Settings(_env_file=None)

        assert configured.BACKEND_CORS_ORIGINS == [
            "http://144.126.252.228",
            "http://144.126.252.228:3000",
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

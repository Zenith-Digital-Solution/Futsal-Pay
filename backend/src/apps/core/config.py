from typing import List, Union
from pydantic import SecretStr, field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Template"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS:int = 7
    ACCESS_TOKEN_COOKIE: str = "access_token"
    REFRESH_TOKEN_COOKIE: str = "refresh_token"

    SECURE_COOKIES: bool = False
    
    # Account security settings
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30
    REQUIRE_EMAIL_VERIFICATION: bool = False
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = False

    # Debug settings for environment
    DEBUG: bool = True
    TESTING: bool = False

    # Celery and Redis settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_MAX_CONNECTIONS: int = 10
    REDIS_URL: str | None = None
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None

    @field_validator("REDIS_URL", mode="before")
    def assemble_redis_url(cls, v: str | None, info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v
        data = info.data
        password = data.get('REDIS_PASSWORD')
        if password:
            return f"redis://:{password}@{data.get('REDIS_HOST')}:{data.get('REDIS_PORT')}/{data.get('REDIS_DB')}"
        return f"redis://{data.get('REDIS_HOST')}:{data.get('REDIS_PORT')}/{data.get('REDIS_DB')}"

    @field_validator("CELERY_BROKER_URL", mode="before")
    def assemble_celery_broker(cls, v: str | None, info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v
        data = info.data
        debug: bool = data.get("DEBUG", True)
        if debug:
            return "memory://"
        else:
            return f"redis://{data.get('REDIS_HOST')}:{data.get('REDIS_PORT')}/{data.get('REDIS_DB')}"

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    def assemble_celery_backend(cls, v: str | None, info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v
        data = info.data
        debug: bool = data.get("DEBUG", True)
        if debug:
            return "cache+memory://"
        else:
            return f"redis://{data.get('REDIS_HOST')}:{data.get('REDIS_PORT')}/{data.get('REDIS_DB')}"

    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError("Invalid CORS origins format", v)
    
    # PostgreSQL settings
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "mydatabase"
    DATABASE_URL: str | None = None
    SYNC_DATABASE_URL: str | None = None

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str | None, info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v
        data = info.data
        debug: bool = data.get("DEBUG", True)
        if debug:
            return f"sqlite+aiosqlite:///./{data.get('POSTGRES_DB')}.db"
        else:
            return f"postgresql+asyncpg://{data.get('POSTGRES_USER')}:{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_SERVER')}/{data.get('POSTGRES_DB')}"
        
    @field_validator("SYNC_DATABASE_URL", mode="before")
    def assemble_sync_db_connection(cls, v: str | None, info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v
        data = info.data
        debug: bool = data.get("DEBUG", True)
        if debug:
            return f"sqlite:///./{data.get('POSTGRES_DB')}.db"
        else:
            return f"postgresql://{data.get('POSTGRES_USER')}:{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_SERVER')}/{data.get('POSTGRES_DB')}"
        
    @field_validator("ALLOWED_HOSTS", mode="before")
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError("Invalid ALLOWED_HOSTS format", v)
    
    # Email settings
    EMAIL_ENABLED: bool = False
    EMAIL_HOST: str = "smtp.example.com"
    EMAIL_PORT: int = 587
    EMAIL_HOST_USER: str = "user@example.com"
    EMAIL_HOST_PASSWORD: SecretStr = SecretStr("password")
    EMAIL_FROM_ADDRESS: str = "noreply@example.com"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    SERVER_HOST: str = "http://localhost:8000"

    # Hosts allowed by TrustedHostMiddleware.  Should be a list of hostnames
    # or IPs that the server will accept in the Host header.  Wildcard (*) is
    # convenient in development but avoid it in production for security.
    ALLOWED_HOSTS: List[str] = ["*"]


    # Media / file uploads
    MEDIA_DIR: str = "media"
    MEDIA_URL: str = "/media"
    MAX_AVATAR_SIZE_MB: int = 5

    # ---------------------------------------------------------------------------
    # Payment gateway settings
    # ---------------------------------------------------------------------------
    # Khalti (sandbox test credentials — from https://docs.khalti.com/)
    KHALTI_ENABLED: bool = True
    KHALTI_SECRET_KEY: str = "05bf95cc57244045b8df5fad06748dab"
    KHALTI_BASE_URL: str = "https://dev.khalti.com/api/v2/"

    # eSewa (sandbox test credentials — from https://developer.esewa.com.np/)
    ESEWA_ENABLED: bool = True
    ESEWA_SECRET_KEY: str = "8gBm/:&EnhH.1/q"
    ESEWA_MERCHANT_CODE: str = "EPAYTEST"
    ESEWA_BASE_URL: str = "https://rc-epay.esewa.com.np/api/epay/"

    # Stripe (https://dashboard.stripe.com/test/apikeys)
    STRIPE_ENABLED: bool = False
    STRIPE_SECRET_KEY: str = "sk_test_your_stripe_secret_key"
    STRIPE_WEBHOOK_SECRET: str = "whsec_your_stripe_webhook_secret"

    # PayPal (https://developer.paypal.com/dashboard/applications/sandbox)
    PAYPAL_ENABLED: bool = False
    PAYPAL_CLIENT_ID: str = "your_paypal_sandbox_client_id"
    PAYPAL_CLIENT_SECRET: str = "your_paypal_sandbox_client_secret"
    PAYPAL_MODE: str = "sandbox"  # "sandbox" or "live"

    # ---------------------------------------------------------------------------
    # Payout mode — controls where booking money first lands.
    #
    # PLATFORM (default / recommended for testing):
    #   Player → Platform merchant account (below credentials).
    #   Midnight Celery job transfers from platform → each owner's gateway.
    #   Superuser can inspect, hold, or release funds before they go out.
    #
    # DIRECT:
    #   Player → Owner's own Khalti / eSewa merchant account directly.
    #   Midnight job just marks ledger entries settled (no transfer needed).
    #   Owner must have a verified payment gateway configured.
    # ---------------------------------------------------------------------------
    PAYOUT_MODE: str = "PLATFORM"  # "PLATFORM" | "DIRECT"

    # Platform (superuser) receiving credentials — used in PLATFORM mode.
    # Money from player bookings lands here; midnight job sends it to owners.
    PLATFORM_KHALTI_SECRET_KEY: str = ""
    PLATFORM_KHALTI_MOBILE: str = ""          # Khalti-registered merchant mobile

    PLATFORM_ESEWA_MERCHANT_CODE: str = ""    # eSewa merchant code
    PLATFORM_ESEWA_SECRET_KEY: str = ""

    PLATFORM_BANK_NAME: str = ""
    PLATFORM_BANK_ACCOUNT_NUMBER: str = ""
    PLATFORM_BANK_ACCOUNT_NAME: str = ""
    PLATFORM_BANK_SWIFT_CODE: str = ""

    # Default platform fee percentage kept by the superuser (0–100).
    PLATFORM_FEE_PCT: float = 5.0

    # Push notification settings (Web Push / VAPID)
    PUSH_ENABLED: bool = False
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@example.com"

    # SMS / message notification settings (Twilio)
    SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # Firebase Cloud Messaging (FCM) push notification settings
    # Set FCM_ENABLED=True and provide credentials via one of:
    #   FIREBASE_CREDENTIALS_PATH — absolute path to service-account JSON file
    #   FIREBASE_CREDENTIALS_JSON — raw JSON string (useful for env-var injection in containers)
    FCM_ENABLED: bool = False
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""

    # PostHog analytics (server-side)
    POSTHOG_ENABLED: bool = False
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://us.i.posthog.com"

    # ---------------------------------------------------------------------------
    # Map provider settings
    #
    # MAP_PROVIDER selects which tile/SDK is used on the frontend map.
    # Supported values: "osm" | "mapbox" | "google"
    #
    #   osm     — OpenStreetMap via Leaflet (no key required)
    #   mapbox  — Mapbox GL JS  (set MAPBOX_TOKEN)
    #   google  — Google Maps JS (set GOOGLE_MAPS_KEY)
    # ---------------------------------------------------------------------------
    MAP_PROVIDER: str = "osm"
    MAPBOX_TOKEN: str = ""
    GOOGLE_MAPS_KEY: str = ""

    # Social auth settings
    GOOGLE_ENABLED: bool = False
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_ENABLED: bool = False
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    FACEBOOK_ENABLED: bool = False
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    # URL to redirect user to after successful social login (frontend URL)
    SOCIAL_AUTH_REDIRECT_URL: str = "http://localhost:3000/auth/callback"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()


async def load_settings_from_db() -> None:
    """Override ``settings`` with values stored in the ``generalsettings`` table.

    Called once at application startup (after the database is initialised).
    For every row in the table the corresponding attribute on the global
    ``settings`` object is updated, casting the stored string to the field's
    declared Python type.  Unknown keys are silently ignored so that stale DB
    rows never crash the application.
    """
    from sqlalchemy import text
    from src.db.session import async_session_factory

    try:
        async with async_session_factory() as session:
            result = await session.execute(text("SELECT key, value FROM generalsettings"))
            rows = result.fetchall()
    except Exception:
        # Table may not exist yet on the very first run — fall back to .env.
        return

    fields = settings.model_fields
    for key, raw_value in rows:
        if key not in fields:
            continue
        field_info = fields[key]
        # Determine the target Python type from the annotation.
        annotation = field_info.annotation
        try:
            if annotation is bool or annotation == "bool":
                coerced = raw_value.lower() in ("1", "true", "yes")
            elif annotation is int or annotation == "int":
                coerced = int(raw_value)
            elif annotation is float or annotation == "float":
                coerced = float(raw_value)
            else:
                coerced = raw_value
            object.__setattr__(settings, key, coerced)
        except (ValueError, TypeError):
            # Malformed value in DB — keep the existing setting.
            pass


# ---------------------------------------------------------------------------
# OAuth2 provider static configuration (endpoints, scopes, extra params).
# Credentials are read from Settings above; only fixed metadata lives here.
# ---------------------------------------------------------------------------
from typing import Any  # noqa: E402

OAUTH_PROVIDERS: dict[str, dict[str, Any]] = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
        "extra_params": {"access_type": "online", "response_type": "code"},
    },
    "github": {
        # GitHub OAuth App docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "emails_url": "https://api.github.com/user/emails",
        "scope": "read:user user:email",
        "extra_params": {},
    },
    "facebook": {
        "authorize_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email,picture",
        "scope": "email,public_profile",
        "extra_params": {"response_type": "code"},
    },
}
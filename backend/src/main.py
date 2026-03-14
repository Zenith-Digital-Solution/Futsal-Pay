from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from src.apps.core.config import settings, load_settings_from_db
from src.apps.core.api import router as core_config_router
from src.apps.core.handler import rate_limit_exceeded_handler, global_exception_handler
from src.apps.core.middleware import SecurityHeadersMiddleware
from src.apps.iam.api import api_router
from src.apps.finance.api import finance_router
from src.apps.multitenancy.api import multitenancy_router
from src.db.session import engine, init_db
from src.apps.iam.casbin_enforcer import CasbinEnforcer
from src.apps.websocket.api import ws_router
from src.apps.websocket.manager import manager as ws_manager
from src.apps.core.cache import RedisCache
from src.apps.notification.api import notification_router
from src.apps.futsal.api import futsal_router
from src.apps.payout.api import payout_router
from src.apps.subscription.api import subscription_router

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables, Casbin enforcer, Redis cache, and WebSocket manager on startup.

    Every startup step is wrapped individually so that a failure in a non-critical
    step (seeding, Casbin, Redis) does NOT prevent the server from starting.
    Only a total DB failure would make the API useless, but the process still
    stays alive so the container/process manager can detect it via health checks
    rather than receiving an unexpected exit.
    """
    try:
        await init_db()
    except Exception:
        logger.exception("Failed to initialise database tables — continuing startup")

    try:
        await load_settings_from_db()
    except Exception:
        logger.exception("Failed to load settings from DB — using defaults")

    try:
        enforcer = await CasbinEnforcer.get_enforcer(engine)
        app.state.casbin_enforcer = enforcer
    except Exception:
        logger.exception("Failed to initialise Casbin enforcer — authorization may not work")
        app.state.casbin_enforcer = None

    # Seed default roles and permissions on first run
    try:
        from src.db.session import get_session as _get_session
        from src.apps.iam.casbin_init import setup_default_roles_and_permissions
        async for _session in _get_session():
            await setup_default_roles_and_permissions(_session)
            break
    except Exception:
        logger.exception("Failed to seed default roles/permissions — will retry on next startup")

    # Initialize Redis cache + WebSocket pub/sub in production
    if not settings.DEBUG:
        if settings.REDIS_URL:
            try:
                await RedisCache.get_client()
                await ws_manager.setup_redis(settings.REDIS_URL)
            except Exception:
                logger.exception("Failed to connect to Redis — real-time features may be degraded")

    app.state.ws_manager = ws_manager

    yield

    # Cleanup on shutdown
    try:
        await ws_manager.teardown()
    except Exception:
        logger.exception("Error during WebSocket manager teardown")
    try:
        await RedisCache.close()
    except Exception:
        logger.exception("Error closing Redis connection")

app = FastAPI(
    lifespan=lifespan,
    title="Futsal",
    description="A template for FastAPI applications",
    version="0.1.0",
    swagger_ui_parameters={
        "syntaxHighlight.theme": "monokai",  # Syntax highlighting theme
        "deepLinking": True,  # Enable deep linking to operations
        "displayOperationId": True,  # Show operation IDs
        "filter": True,  # Enable search/filter bar
        "showExtensions": True,  # Show vendor extensions
        "showCommonExtensions": True,
        "persistAuthorization": True,  # Remember authorization between reloads
        "displayRequestDuration": True,  # Show request duration
        "docExpansion": "list",  # Default expansion: "list", "full", or "none"
        "defaultModelsExpandDepth": 1,  # How deep to expand models
        "defaultModelExpandDepth": 1,
    }
)

# Add rate limiter to app state and register exception handlers
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
# Catch-all: return 500 JSON instead of crashing the worker
app.add_exception_handler(Exception, global_exception_handler)

# Trust proxy headers (X-Forwarded-For / X-Real-IP) so request.client.host
# reflects the real client IP rather than the loopback / proxy address.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware
#
# Rules:
# • If BACKEND_CORS_ORIGINS contains "*" (the default), use wildcard so any
#   browser origin is accepted.  allow_credentials MUST be False when using
#   wildcard — browsers reject the combination.  The frontend uses
#   localStorage-based tokens (not cookies), so credentials=False is fine.
# • If specific origins are listed, use those plus FRONTEND_URL and enable
#   credentials so cookies / Authorization headers are forwarded correctly.
_raw_origins = [str(_o).rstrip("/") for _o in settings.BACKEND_CORS_ORIGINS]
if "*" in _raw_origins:
    _cors_origins: list[str] = ["*"]
    _allow_credentials = False
else:
    _origin_set: set[str] = {_o for _o in _raw_origins if _o}
    # Always include the canonical frontend URL so it works even if omitted
    # from BACKEND_CORS_ORIGINS.
    _origin_set.add(settings.FRONTEND_URL.rstrip("/"))
    _cors_origins = list(_origin_set)
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware (prevent host header attacks)

# always install; the list itself comes from configuration
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

app.include_router(core_config_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(finance_router, prefix=settings.API_V1_STR)
app.include_router(multitenancy_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(notification_router, prefix=settings.API_V1_STR)
app.include_router(futsal_router, prefix=settings.API_V1_STR)
app.include_router(payout_router, prefix=settings.API_V1_STR)
app.include_router(subscription_router, prefix=settings.API_V1_STR)

# Serve uploaded media files (avatars, etc.)
os.makedirs(settings.MEDIA_DIR, exist_ok=True)
app.mount(settings.MEDIA_URL, StaticFiles(directory=settings.MEDIA_DIR), name="media")

@app.get("/", include_in_schema=False)
async def read_root() -> RedirectResponse:
    """Redirect root to the interactive API documentation."""
    return RedirectResponse(url="/docs")
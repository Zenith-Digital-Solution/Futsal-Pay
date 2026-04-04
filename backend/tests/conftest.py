import pytest
import os
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

from src.main import app

# Set TESTING before anything else imports settings
os.environ["TESTING"] = "True"

# ---------------------------------------------------------------------------
# Test database URL
#
# Use TESTING_DB_URL env var to point at a real PostgreSQL test DB:
#   TESTING_DB_URL=postgresql+asyncpg://postgres:postgres@localhost/test_futsal
#
# If not set, fall back to an in-memory SQLite database so the unit-test
# suite still runs without a running PostgreSQL server (e.g. on a developer
# machine that only has Python + SQLite).
# ---------------------------------------------------------------------------
_TEST_DB_URL = os.environ.get(
    "TESTING_DB_URL",
    "sqlite+aiosqlite:///:memory:",
)
_IS_SQLITE_TEST = _TEST_DB_URL.startswith("sqlite")


@pytest.fixture(scope="function")
async def test_engine():
    """Create a test engine for each test function."""
    if _IS_SQLITE_TEST:
        from sqlalchemy.pool import StaticPool
        engine = create_async_engine(
            _TEST_DB_URL,
            echo=False,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_async_engine(
            _TEST_DB_URL,
            echo=False,
            poolclass=NullPool,
        )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database session override and disabled rate limiting."""
    from src.apps.iam.api.deps import get_db

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Disable rate limiting for tests
    if hasattr(app.state, "limiter"):
        original_enabled = app.state.limiter.enabled
        app.state.limiter.enabled = False
    else:
        original_enabled = None

    limiters_to_restore = []
    try:
        from src.apps.iam.api.v1.auth import signup, login, password
        for module in [signup, login, password]:
            if hasattr(module, "limiter"):
                limiters_to_restore.append((module.limiter, module.limiter.enabled))
                module.limiter.enabled = False
    except Exception:
        pass

    # Mock email service to avoid sending real emails
    with patch("src.apps.iam.services.email.EmailService.send_welcome_email", new_callable=AsyncMock):
        with patch("src.apps.iam.services.email.EmailService.send_verification_email", new_callable=AsyncMock):
            with patch("src.apps.iam.services.email.EmailService.send_password_reset_email", new_callable=AsyncMock):
                async with AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://test",
                ) as test_client:
                    yield test_client

    if original_enabled is not None:
        app.state.limiter.enabled = original_enabled

    for limiter_obj, was_enabled in limiters_to_restore:
        limiter_obj.enabled = was_enabled

    app.dependency_overrides.clear()


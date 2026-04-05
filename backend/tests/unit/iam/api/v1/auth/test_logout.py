import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.core import security
from src.main import app
from src.apps.iam.api.deps import get_current_user
from src.apps.iam.models.token_tracking import TokenTracking
from tests.factories import UserFactory


class TestLogout:
    """Test logout endpoint."""
    
    @pytest.mark.asyncio
    async def test_logout_requires_auth(self, client: AsyncClient):
        """Test logout requires authentication."""
        response = await client.post("/api/v1/auth/logout/")
        
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_revokes_tokens_from_bearer_header(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """Bearer-based logout should revoke active tokens for the current IP."""
        user = UserFactory.build()
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        access_token = security.create_access_token(user.id)
        refresh_token = security.create_refresh_token(user.id)
        access_payload = security.verify_token(access_token, token_type=security.TokenType.ACCESS)
        refresh_payload = security.verify_token(refresh_token, token_type=security.TokenType.REFRESH)

        db_session.add(
            TokenTracking(
                user_id=user.id,
                token_jti=access_payload["jti"],
                token_type=security.TokenType.ACCESS,
                ip_address="127.0.0.1",
                user_agent="test-agent",
                is_active=True,
                expires_at=user.created_at,
            )
        )
        db_session.add(
            TokenTracking(
                user_id=user.id,
                token_jti=refresh_payload["jti"],
                token_type=security.TokenType.REFRESH,
                ip_address="127.0.0.1",
                user_agent="test-agent",
                is_active=True,
                expires_at=user.created_at,
            )
        )
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/logout/",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        assert response.json() == {"message": "Successfully logged out from this device"}

        result = await db_session.execute(
            select(TokenTracking).where(TokenTracking.user_id == user.id)
        )
        tokens = result.scalars().all()
        assert tokens
        assert all(token.is_active is False for token in tokens)
        assert all(token.revoke_reason == "User logout from this device" for token in tokens)

    @pytest.mark.asyncio
    async def test_logout_uses_cookie_when_no_bearer_header(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """Cookie-based logout should still succeed."""
        user = UserFactory.build()
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        access_token = security.create_access_token(user.id)
        payload = security.verify_token(access_token, token_type=security.TokenType.ACCESS)
        db_session.add(
            TokenTracking(
                user_id=user.id,
                token_jti=payload["jti"],
                token_type=security.TokenType.ACCESS,
                ip_address="127.0.0.1",
                user_agent="test-agent",
                is_active=True,
                expires_at=user.created_at,
            )
        )
        await db_session.commit()

        client.cookies.set("access_token", access_token)
        response = await client.post("/api/v1/auth/logout/")

        assert response.status_code == 200
        result = await db_session.execute(
            select(TokenTracking).where(TokenTracking.user_id == user.id)
        )
        assert result.scalars().first().is_active is False

    @pytest.mark.asyncio
    async def test_logout_ignores_invalid_runtime_token(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """Invalid runtime token decode should be swallowed after auth succeeds."""
        user = UserFactory.build()
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        good_token = security.create_access_token(user.id)
        payload = security.verify_token(good_token, token_type=security.TokenType.ACCESS)
        db_session.add(
            TokenTracking(
                user_id=user.id,
                token_jti=payload["jti"],
                token_type=security.TokenType.ACCESS,
                ip_address="127.0.0.1",
                user_agent="test-agent",
                is_active=True,
                expires_at=user.created_at,
            )
        )
        await db_session.commit()

        async def override_current_user():
            return user

        original_decode = security.jwt.decode

        def flaky_decode(token, *args, **kwargs):
            if token == "runtime-invalid-token":
                raise RuntimeError("decode failed")
            return original_decode(token, *args, **kwargs)

        app.dependency_overrides[get_current_user] = override_current_user
        monkeypatch.setattr("src.apps.iam.api.v1.auth.login.jwt.decode", flaky_decode)
        try:
            client.cookies.set("access_token", "runtime-invalid-token")
            response = await client.post("/api/v1/auth/logout/")
        finally:
            app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 200

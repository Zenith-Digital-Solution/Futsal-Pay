import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from src.apps.core import security
from src.apps.core.config import settings
from src.apps.iam.models.login_attempt import LoginAttempt
from src.apps.iam.models.token_tracking import TokenTracking
from src.apps.iam.models.user import User
from tests.factories import UserFactory


class TestLogin:
    """Test login endpoint."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, db_session: AsyncSession):
        """Test successful login."""
        # Create user with whitelisted IP
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="loginuser",
            email="login@example.com",
            hashed_password=hashed_pw,
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        user_id = user.id
        
        login_data = {
            "username": "loginuser",
            "password": "TestPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json=login_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access" in data
        assert "refresh" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, db_session: AsyncSession):
        """Test login with wrong password."""
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="wrongpwuser",
            hashed_password=hashed_pw
        )
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "username": "wrongpwuser",
            "password": "WrongPass456"
        }
        
        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json=login_data
        )
        
        assert response.status_code == 400
        assert "Incorrect username or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        login_data = {
            "username": "nonexistent",
            "password": "TestPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json=login_data
        )
        
        assert response.status_code == 400
        assert "Incorrect username or password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_user_tracks_attempt_without_user_id(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """Failed lookups should be tracked without breaking the DB session."""
        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json={"username": "missing-user", "password": "TestPass123"},
        )

        assert response.status_code == 400

        result = await db_session.execute(
            select(LoginAttempt).where(LoginAttempt.failure_reason == "User not found")
        )
        attempt = result.scalars().first()

        assert attempt is not None
        assert attempt.user_id is None
        assert attempt.success is False
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db_session: AsyncSession):
        """Test login with inactive user."""
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="inactiveuser",
            hashed_password=hashed_pw,
            is_active=False
        )
        db_session.add(user)
        await db_session.commit()
        
        login_data = {
            "username": "inactiveuser",
            "password": "TestPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json=login_data
        )
        
        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_social_account_rejected(self, client: AsyncClient, db_session: AsyncSession):
        """Password login should be rejected for social-only accounts."""
        user = UserFactory.build(
            username="socialuser",
            email="social@example.com",
            hashed_password="",
            social_provider="google",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json={"username": "socialuser", "password": "TestPass123"},
        )

        assert response.status_code == 400
        assert "Please sign in with your social provider." in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_requires_otp_for_enabled_user(self, client: AsyncClient, db_session: AsyncSession):
        """Users with verified OTP enabled should receive a temp token instead of session tokens."""
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="otpuser",
            email="otp@example.com",
            hashed_password=hashed_pw,
            is_active=True,
            otp_enabled=True,
            otp_verified=True,
            otp_base32="JBSWY3DPEHPK3PXP",
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json={"username": "otpuser", "password": "TestPass123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["requires_otp"] is True
        assert data["message"] == "Please provide OTP code"
        payload = security.verify_token(data["temp_token"], token_type=security.TokenType.TEMP_AUTH)
        assert payload["sub"] == str(user.id)

    @pytest.mark.asyncio
    async def test_login_sets_cookie_when_requested(self, client: AsyncClient, db_session: AsyncSession):
        """Cookie mode should return a message and set the access cookie."""
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="cookieuser",
            email="cookie@example.com",
            hashed_password=hashed_pw,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login/?set_cookie=true",
            json={"username": "cookieuser", "password": "TestPass123"},
        )

        assert response.status_code == 200
        assert response.json() == {"message": "Logged in successfully"}
        set_cookie_header = response.headers.get("set-cookie", "")
        assert f"{settings.ACCESS_TOKEN_COOKIE}=" in set_cookie_header

    @pytest.mark.asyncio
    async def test_login_generic_error_rolls_back_and_tracks_server_error(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """Unexpected errors should become 500s and leave an audit trail."""
        hashed_pw = security.get_password_hash("TestPass123")
        user = UserFactory.build(
            username="boomuser",
            email="boom@example.com",
            hashed_password=hashed_pw,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        user_id = user.id

        async def explode(*args, **kwargs):
            raise RuntimeError("boom")

        monkeypatch.setattr(
            "src.apps.iam.api.v1.auth.login.revoke_tokens_for_ip",
            explode,
        )

        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json={"username": "boomuser", "password": "TestPass123"},
        )

        assert response.status_code == 500
        assert response.json()["detail"] == "An error occurred during login"

        result = await db_session.execute(
            select(LoginAttempt).where(LoginAttempt.user_id == user_id)
        )
        attempts = result.scalars().all()
        assert any(a.failure_reason == "Server error: boom" for a in attempts)
        assert all(t.failure_reason == "" or t.failure_reason == "Server error: boom" for t in attempts)

        token_result = await db_session.execute(
            select(TokenTracking).where(TokenTracking.user_id == user_id)
        )
        assert token_result.scalars().all() == []

    @pytest.mark.asyncio
    async def test_login_audit_failure_does_not_poison_session(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """If login-attempt persistence fails, the request should still return cleanly and session stays usable."""
        original_commit = db_session.commit
        state = {"failed": False}

        async def flaky_commit():
            if not state["failed"]:
                state["failed"] = True
                raise SQLAlchemyError("audit write failed")
            return await original_commit()

        monkeypatch.setattr(db_session, "commit", flaky_commit)

        response = await client.post(
            "/api/v1/auth/login/?set_cookie=false",
            json={"username": "missing-after-fail", "password": "TestPass123"},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Incorrect username or password"

        verification_user = UserFactory.build(
            username="stillworks",
            email="stillworks@example.com",
            hashed_password=security.get_password_hash("TestPass123"),
        )
        db_session.add(verification_user)
        await original_commit()

        result = await db_session.execute(
            select(User).where(User.username == "stillworks")
        )
        assert result.scalars().first() is not None

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.iam.models.user import User
from tests.factories import UserFactory


class TestSignup:
    """Test signup endpoint."""
    
    @pytest.mark.asyncio
    async def test_signup_success(self, client: AsyncClient, db_session: AsyncSession):
        """Test successful user signup."""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "TestPass123",
            "confirm_password": "TestPass123",
            "first_name": "New",
            "last_name": "User"
        }
        
        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=false",
            json=user_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert data["token_type"] == "bearer"
        
        # Verify user was created in database
        result = await db_session.execute(
            select(User).where(User.username == "newuser")
        )
        user = result.scalars().first()
        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.is_active is True
    
    @pytest.mark.asyncio
    async def test_signup_duplicate_username(self, client: AsyncClient, db_session: AsyncSession):
        """Test signup fails with duplicate username."""
        # Create existing user
        existing_user = UserFactory.build(username="existinguser")
        db_session.add(existing_user)
        await db_session.commit()
        
        user_data = {
            "username": "existinguser",
            "email": "different@example.com",
            "password": "TestPass123",
            "confirm_password": "TestPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=false",
            json=user_data
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_signup_invalid_password(self, client: AsyncClient):
        """Test signup with invalid password."""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "weak",
            "confirm_password": "weak"
        }
        
        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=false",
            json=user_data
        )
        
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_signup_duplicate_email(self, client: AsyncClient, db_session: AsyncSession):
        """Test signup fails with duplicate email."""
        existing_user = UserFactory.build(username="usera", email="existing@example.com")
        db_session.add(existing_user)
        await db_session.commit()

        user_data = {
            "username": "userb",
            "email": "existing@example.com",
            "password": "TestPass123",
            "confirm_password": "TestPass123"
        }

        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=false",
            json=user_data
        )

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_signup_with_cookie(self, client: AsyncClient, db_session: AsyncSession):
        """Test signup with cookie response."""
        user_data = {
            "username": "cookieuser",
            "email": "cookie@example.com",
            "password": "TestPass123",
            "confirm_password": "TestPass123"
        }
        
        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=true",
            json=user_data
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Account created successfully"
        assert "access_token" in response.cookies

    @pytest.mark.asyncio
    async def test_signup_unexpected_error_returns_500_and_logs(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
        caplog: pytest.LogCaptureFixture,
    ):
        """Unexpected signup errors should be logged with context and returned as 500."""
        async def explode(*args, **kwargs):
            raise RuntimeError("signup boom")

        monkeypatch.setattr(
            "src.apps.iam.api.v1.auth.signup.revoke_tokens_for_ip",
            explode,
        )

        response = await client.post(
            "/api/v1/auth/signup/?set_cookie=false",
            json={
                "username": "boomsignup",
                "email": "boomsignup@example.com",
                "password": "TestPass123",
                "confirm_password": "TestPass123",
            },
        )

        assert response.status_code == 500
        assert response.json()["detail"] == "An error occurred during signup"
        assert "Signup unexpected error" in caplog.text

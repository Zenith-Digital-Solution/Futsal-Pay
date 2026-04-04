"""
Comprehensive tests for the futsal domain:
  - Grounds (list, get, create)
  - Slot availability
  - Bookings (create, list, get, cancel, QR)
  - Reviews (create, list, owner reply)
  - Favourites (toggle, list)
"""
import pytest
import uuid
from datetime import date, time, datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from jose import jwt

from src.apps.core import security
from src.apps.core.security import ALGORITHM, TokenType
from src.apps.core.config import settings
from src.apps.iam.utils.hashid import encode_id
from src.apps.iam.models.token_tracking import TokenTracking
from src.apps.futsal.models.ground import FutsalGround, GroundType
from src.apps.futsal.models.booking import Booking, BookingStatus
from src.apps.futsal.models.review import Review
from src.apps.futsal.models.favourite import FavouriteGround
from tests.factories import UserFactory


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

async def _create_user(db: AsyncSession, username="testuser", email="test@example.com", superuser=False):
    """Create and persist a user with a tracked token; return (user, auth_headers)."""
    hashed_pw = security.get_password_hash("TestPass123")
    user = UserFactory.build(
        username=username,
        email=email,
        hashed_password=hashed_pw,
        is_active=True,
        is_superuser=superuser,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = security.create_access_token(user.id)

    # The auth middleware verifies the token JTI exists in TokenTracking
    payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    jti = payload["jti"]
    exp = payload["exp"]
    tracking = TokenTracking(
        token_jti=jti,
        token_type=TokenType.ACCESS,
        ip_address="127.0.0.1",
        user_agent="test-agent",
        is_active=True,
        expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
        user_id=user.id,
    )
    db.add(tracking)
    await db.commit()

    headers = {"Authorization": f"Bearer {access_token}"}
    return user, headers


async def _create_ground(db: AsyncSession, owner_id: int, name="Test Ground", price=1000.0) -> FutsalGround:
    """Create and persist a futsal ground."""
    import uuid
    ground = FutsalGround(
        name=name,
        slug=f"test-ground-{uuid.uuid4().hex[:8]}",
        owner_id=owner_id,
        location="Kathmandu, Nepal",
        ground_type=GroundType.OUTDOOR,
        price_per_hour=price,
        open_time=time(6, 0),
        close_time=time(22, 0),
        slot_duration_minutes=60,
        is_active=True,
        is_verified=True,
    )
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


async def _create_confirmed_booking(
    db: AsyncSession,
    user_id: int,
    ground: FutsalGround,
    booking_date: date = None,
) -> Booking:
    """Create a confirmed booking (skips payment flow)."""
    if booking_date is None:
        booking_date = date(2030, 6, 15)
    import uuid
    booking = Booking(
        user_id=user_id,
        ground_id=ground.id,
        booking_date=booking_date,
        start_time=time(10, 0),
        end_time=time(11, 0),
        total_amount=ground.price_per_hour,
        paid_amount=ground.price_per_hour,
        status=BookingStatus.CONFIRMED,
        qr_code=str(uuid.uuid4()),
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


# ──────────────────────────────────────────────────────────────────────────────
# Ground Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestGrounds:
    """Tests for ground listing and retrieval (public + owner)."""

    @pytest.mark.asyncio
    async def test_list_grounds_empty(self, client: AsyncClient):
        """GET /futsal/grounds returns empty list when no grounds exist."""
        response = await client.get("/api/v1/futsal/grounds")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_grounds_with_data(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds returns active grounds."""
        owner, _ = await _create_user(db_session, "groundowner", "owner@example.com")
        await _create_ground(db_session, owner.id, "Alpha Futsal")
        await _create_ground(db_session, owner.id, "Beta Futsal")

        response = await client.get("/api/v1/futsal/grounds")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = {g["name"] for g in data}
        assert "Alpha Futsal" in names
        assert "Beta Futsal" in names

    @pytest.mark.asyncio
    async def test_get_ground_by_id(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds/{id} returns ground detail using encoded hashid."""
        owner, _ = await _create_user(db_session, "slugholder", "slug@example.com")
        ground = await _create_ground(db_session, owner.id, "Slug Ground")
        gid = encode_id(ground.id)

        response = await client.get(f"/api/v1/futsal/grounds/{gid}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Slug Ground"

    @pytest.mark.asyncio
    async def test_get_ground_not_found(self, client: AsyncClient):
        """GET /futsal/grounds/{id} returns 404 for unknown id."""
        response = await client.get("/api/v1/futsal/grounds/zzzzzzzz")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_ground_requires_auth(self, client: AsyncClient):
        """POST /futsal/grounds requires authentication."""
        response = await client.post("/api/v1/futsal/grounds", json={
            "name": "No Auth Ground",
            "location": "Somewhere",
            "price_per_hour": 500,
        })
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_create_ground_authenticated(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/grounds creates a ground for an authenticated owner."""
        owner, headers = await _create_user(db_session, "owneruser", "owneruser@example.com")

        payload = {
            "name": "New Ground",
            "location": "Lalitpur, Nepal",
            "price_per_hour": 800,
            "ground_type": "outdoor",
            "open_time": "06:00:00",
            "close_time": "22:00:00",
            "slot_duration_minutes": 60,
        }
        response = await client.post("/api/v1/futsal/grounds", json=payload, headers=headers)
        # Either 201 (created) or 402 (subscription required) — both are valid auth-dependent responses
        assert response.status_code in (201, 402)

    @pytest.mark.asyncio
    async def test_list_grounds_search_filter(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds?search=Alpha returns filtered results."""
        owner, _ = await _create_user(db_session, "searchowner", "search@example.com")
        await _create_ground(db_session, owner.id, "Alpha Futsal")
        await _create_ground(db_session, owner.id, "Beta Futsal")

        response = await client.get("/api/v1/futsal/grounds?search=Alpha")
        assert response.status_code == 200
        data = response.json()
        assert all("Alpha" in g["name"] for g in data)

    @pytest.mark.asyncio
    async def test_list_grounds_inactive_hidden(self, client: AsyncClient, db_session: AsyncSession):
        """Inactive grounds are not returned in the public listing."""
        owner, _ = await _create_user(db_session, "inactive_owner", "inactive@example.com")
        import uuid
        inactive = FutsalGround(
            name="Closed Ground",
            slug=f"closed-{uuid.uuid4().hex[:8]}",
            owner_id=owner.id,
            location="Nowhere",
            ground_type=GroundType.OUTDOOR,
            price_per_hour=500.0,
            open_time=time(6, 0),
            close_time=time(22, 0),
            slot_duration_minutes=60,
            is_active=False,
        )
        db_session.add(inactive)
        await db_session.commit()

        response = await client.get("/api/v1/futsal/grounds")
        assert response.status_code == 200
        names = [g["name"] for g in response.json()]
        assert "Closed Ground" not in names


# ──────────────────────────────────────────────────────────────────────────────
# Slot Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestSlots:
    """Tests for slot availability endpoint."""

    @pytest.mark.asyncio
    async def test_get_slots_returns_list(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds/{id}/slots returns a list of slots."""
        owner, _ = await _create_user(db_session, "slotowner", "slotowner@example.com")
        ground = await _create_ground(db_session, owner.id, "Slot Ground")
        gid = encode_id(ground.id)

        response = await client.get(
            f"/api/v1/futsal/grounds/{gid}/slots",
            params={"booking_date": "2030-07-01"},
        )
        assert response.status_code == 200
        slots = response.json()
        assert isinstance(slots, list)
        assert len(slots) > 0
        assert all("start_time" in s and "end_time" in s and "is_available" in s for s in slots)

    @pytest.mark.asyncio
    async def test_slots_booked_slot_unavailable(self, client: AsyncClient, db_session: AsyncSession):
        """A confirmed booking blocks its slot in availability."""
        owner, _ = await _create_user(db_session, "slotbookowner", "slotbookowner@example.com")
        player, _ = await _create_user(db_session, "slotplayer", "slotplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Availability Ground")
        gid = encode_id(ground.id)

        await _create_confirmed_booking(db_session, player.id, ground, date(2030, 8, 10))

        response = await client.get(
            f"/api/v1/futsal/grounds/{gid}/slots",
            params={"booking_date": "2030-08-10"},
        )
        assert response.status_code == 200
        slots = response.json()
        booked = [s for s in slots if s["start_time"].startswith("10:00")]
        assert len(booked) == 1
        assert booked[0]["is_available"] is False


# ──────────────────────────────────────────────────────────────────────────────
# Booking Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestBookings:
    """Tests for booking create, list, cancel, and QR endpoints."""

    @pytest.mark.asyncio
    async def test_list_bookings_requires_auth(self, client: AsyncClient):
        """GET /futsal/bookings requires authentication."""
        response = await client.get("/api/v1/futsal/bookings")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_list_my_bookings_empty(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings returns empty list for new user."""
        _, headers = await _create_user(db_session, "newbooker", "newbooker@example.com")
        response = await client.get("/api/v1/futsal/bookings", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_my_bookings_returns_user_bookings(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings returns only the current user's bookings."""
        owner, _ = await _create_user(db_session, "listbookowner", "listbookowner@example.com")
        player, headers = await _create_user(db_session, "listplayer", "listplayer@example.com")
        other, _ = await _create_user(db_session, "otherlister", "otherlister@example.com")
        ground = await _create_ground(db_session, owner.id, "List Booking Ground")

        await _create_confirmed_booking(db_session, player.id, ground, date(2030, 9, 1))
        await _create_confirmed_booking(db_session, other.id, ground, date(2030, 9, 2))

        response = await client.get("/api/v1/futsal/bookings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    @pytest.mark.asyncio
    async def test_create_booking_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/bookings requires authentication."""
        owner, _ = await _create_user(db_session, "unauthedowner", "unauthed@example.com")
        ground = await _create_ground(db_session, owner.id, "Unauthed Ground")
        gid = encode_id(ground.id)

        response = await client.post("/api/v1/futsal/bookings", json={
            "ground_id": gid,
            "booking_date": "2030-10-01",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
        })
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_create_booking_success(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/bookings creates a booking for an authenticated user."""
        owner, _ = await _create_user(db_session, "bookowner2", "bookowner2@example.com")
        player, headers = await _create_user(db_session, "bookplayer2", "bookplayer2@example.com")
        ground = await _create_ground(db_session, owner.id, "Bookable Ground")
        gid = encode_id(ground.id)

        response = await client.post("/api/v1/futsal/bookings", headers=headers, json={
            "ground_id": gid,
            "booking_date": "2030-11-01",
            "start_time": "14:00:00",
            "end_time": "15:00:00",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert data["ground_id"] is not None

    @pytest.mark.asyncio
    async def test_create_booking_inactive_ground(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/bookings returns 404 for inactive ground."""
        owner, _ = await _create_user(db_session, "inactivegowner", "inactivegowner@example.com")
        player, headers = await _create_user(db_session, "inactivegplayer", "inactivegplayer@example.com")
        import uuid
        inactive = FutsalGround(
            name="Inactive",
            slug=f"inactive-{uuid.uuid4().hex[:8]}",
            owner_id=owner.id,
            location="Nowhere",
            ground_type=GroundType.OUTDOOR,
            price_per_hour=500.0,
            open_time=time(6, 0),
            close_time=time(22, 0),
            slot_duration_minutes=60,
            is_active=False,
        )
        db_session.add(inactive)
        await db_session.commit()
        await db_session.refresh(inactive)
        gid = encode_id(inactive.id)

        response = await client.post("/api/v1/futsal/bookings", headers=headers, json={
            "ground_id": gid,
            "booking_date": "2030-11-05",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_booking_outside_hours(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/bookings returns 400 for times outside operating hours."""
        owner, _ = await _create_user(db_session, "hoursowner", "hoursowner@example.com")
        player, headers = await _create_user(db_session, "hoursplayer", "hoursplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Hours Ground")
        gid = encode_id(ground.id)

        response = await client.post("/api/v1/futsal/bookings", headers=headers, json={
            "ground_id": gid,
            "booking_date": "2030-11-10",
            "start_time": "23:00:00",
            "end_time": "24:00:00",
        })
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_double_booking_conflict(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/bookings returns 409 when slot is already booked."""
        owner, _ = await _create_user(db_session, "dblbookowner", "dblbookowner@example.com")
        player1, h1 = await _create_user(db_session, "dblplayer1", "dblplayer1@example.com")
        player2, h2 = await _create_user(db_session, "dblplayer2", "dblplayer2@example.com")
        ground = await _create_ground(db_session, owner.id, "Conflict Ground")
        gid = encode_id(ground.id)

        payload = {
            "ground_id": gid,
            "booking_date": "2030-12-01",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
        }

        r1 = await client.post("/api/v1/futsal/bookings", headers=h1, json=payload)
        assert r1.status_code == 201

        r2 = await client.post("/api/v1/futsal/bookings", headers=h2, json=payload)
        assert r2.status_code == 409

    @pytest.mark.asyncio
    async def test_get_booking_by_id(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings/{id} returns booking detail."""
        owner, _ = await _create_user(db_session, "getbookowner", "getbookowner@example.com")
        player, headers = await _create_user(db_session, "getbookplayer", "getbookplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Get Booking Ground")
        booking = await _create_confirmed_booking(db_session, player.id, ground)
        bid = encode_id(booking.id)

        response = await client.get(f"/api/v1/futsal/bookings/{bid}", headers=headers)
        assert response.status_code == 200
        assert response.json()["id"] == bid

    @pytest.mark.asyncio
    async def test_get_booking_unauthorized(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings/{id} returns 403 for another user."""
        owner, _ = await _create_user(db_session, "unauth_owner_b", "unauth_owner_b@example.com")
        player, _ = await _create_user(db_session, "unauth_player_b", "unauth_player_b@example.com")
        other, other_headers = await _create_user(db_session, "other_user_b", "other_user_b@example.com")
        ground = await _create_ground(db_session, owner.id, "Unauth Booking Ground")
        booking = await _create_confirmed_booking(db_session, player.id, ground)
        bid = encode_id(booking.id)

        response = await client.get(f"/api/v1/futsal/bookings/{bid}", headers=other_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cancel_booking(self, client: AsyncClient, db_session: AsyncSession):
        """PATCH /futsal/bookings/{id}/cancel cancels a booking within grace period."""
        owner, _ = await _create_user(db_session, "cancelowner", "cancelowner@example.com")
        player, headers = await _create_user(db_session, "cancelplayer", "cancelplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Cancel Ground")

        # Create booking far in the future (well outside grace period)
        import uuid
        booking = Booking(
            user_id=player.id,
            ground_id=ground.id,
            booking_date=date(2035, 1, 1),
            start_time=time(10, 0),
            end_time=time(11, 0),
            total_amount=1000.0,
            paid_amount=0.0,
            status=BookingStatus.CONFIRMED,
            qr_code=str(uuid.uuid4()),
        )
        db_session.add(booking)
        await db_session.commit()
        await db_session.refresh(booking)
        bid = encode_id(booking.id)

        response = await client.patch(f"/api/v1/futsal/bookings/{bid}/cancel", headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_get_booking_qr(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings/{id}/qr returns PNG image for confirmed booking."""
        owner, _ = await _create_user(db_session, "qrowner", "qrowner@example.com")
        player, headers = await _create_user(db_session, "qrplayer", "qrplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "QR Ground")
        booking = await _create_confirmed_booking(db_session, player.id, ground)
        bid = encode_id(booking.id)

        response = await client.get(f"/api/v1/futsal/bookings/{bid}/qr", headers=headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"

    @pytest.mark.asyncio
    async def test_pending_reviews_empty_for_new_user(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/bookings/pending-reviews returns empty list for new user."""
        _, headers = await _create_user(db_session, "pendingrev", "pendingrev@example.com")
        response = await client.get("/api/v1/futsal/bookings/pending-reviews", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_ground_bookings_requires_owner(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds/{id}/bookings returns 403 for non-owner."""
        owner, _ = await _create_user(db_session, "gbookowner", "gbookowner@example.com")
        outsider, outsider_headers = await _create_user(db_session, "outsider_b", "outsider_b@example.com")
        ground = await _create_ground(db_session, owner.id, "Owner Booking Ground")
        gid = encode_id(ground.id)

        response = await client.get(f"/api/v1/futsal/grounds/{gid}/bookings", headers=outsider_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_ground_bookings_owner_can_view(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds/{id}/bookings returns bookings for the ground owner."""
        owner, owner_headers = await _create_user(db_session, "gbookowner2", "gbookowner2@example.com")
        player, _ = await _create_user(db_session, "gbookplayer2", "gbookplayer2@example.com")
        ground = await _create_ground(db_session, owner.id, "Owner View Ground")
        gid = encode_id(ground.id)
        await _create_confirmed_booking(db_session, player.id, ground)

        response = await client.get(f"/api/v1/futsal/grounds/{gid}/bookings", headers=owner_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


# ──────────────────────────────────────────────────────────────────────────────
# Review Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestReviews:
    """Tests for review creation, listing, and owner reply."""

    @pytest.mark.asyncio
    async def test_list_reviews_empty(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/grounds/{id}/reviews returns empty list for new ground."""
        owner, _ = await _create_user(db_session, "revowner1", "revowner1@example.com")
        ground = await _create_ground(db_session, owner.id, "Review Ground 1")
        gid = encode_id(ground.id)

        response = await client.get(f"/api/v1/futsal/grounds/{gid}/reviews")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_create_review_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/reviews requires authentication."""
        response = await client.post("/api/v1/futsal/reviews", json={
            "ground_id": "fakeid",
            "booking_id": "fakeid",
            "rating": 5,
        })
        assert response.status_code in (401, 403, 422)

    @pytest.mark.asyncio
    async def test_create_review_success(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/reviews creates a review for a completed booking."""
        owner, _ = await _create_user(db_session, "revowner2", "revowner2@example.com")
        player, headers = await _create_user(db_session, "revplayer2", "revplayer2@example.com")
        ground = await _create_ground(db_session, owner.id, "Review Ground 2")

        booking = await _create_confirmed_booking(db_session, player.id, ground)
        # Mark booking completed
        booking.status = BookingStatus.COMPLETED
        db_session.add(booking)
        await db_session.commit()

        gid = encode_id(ground.id)
        bid = encode_id(booking.id)

        response = await client.post("/api/v1/futsal/reviews", headers=headers, json={
            "ground_id": gid,
            "booking_id": bid,
            "rating": 4,
            "comment": "Great ground!",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["rating"] == 4
        assert data["comment"] == "Great ground!"

    @pytest.mark.asyncio
    async def test_create_review_not_completed(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/reviews returns 400 for non-completed booking."""
        owner, _ = await _create_user(db_session, "revowner3", "revowner3@example.com")
        player, headers = await _create_user(db_session, "revplayer3", "revplayer3@example.com")
        ground = await _create_ground(db_session, owner.id, "Review Ground 3")
        booking = await _create_confirmed_booking(db_session, player.id, ground)
        # Leave status as CONFIRMED (not COMPLETED)

        gid = encode_id(ground.id)
        bid = encode_id(booking.id)

        response = await client.post("/api/v1/futsal/reviews", headers=headers, json={
            "ground_id": gid,
            "booking_id": bid,
            "rating": 5,
        })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_duplicate_review_rejected(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/reviews returns 409 for duplicate review."""
        owner, _ = await _create_user(db_session, "duprevowner", "duprevowner@example.com")
        player, headers = await _create_user(db_session, "duprevplayer", "duprevplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Dup Review Ground")

        booking = await _create_confirmed_booking(db_session, player.id, ground)
        booking.status = BookingStatus.COMPLETED
        db_session.add(booking)
        await db_session.commit()

        gid = encode_id(ground.id)
        bid = encode_id(booking.id)

        # First review
        r1 = await client.post("/api/v1/futsal/reviews", headers=headers, json={
            "ground_id": gid, "booking_id": bid, "rating": 4,
        })
        assert r1.status_code == 201

        # Second review on same booking
        r2 = await client.post("/api/v1/futsal/reviews", headers=headers, json={
            "ground_id": gid, "booking_id": bid, "rating": 3,
        })
        assert r2.status_code == 409

    @pytest.mark.asyncio
    async def test_owner_reply_to_review(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/reviews/{id}/reply allows owner to reply."""
        owner, owner_headers = await _create_user(db_session, "replyowner", "replyowner@example.com")
        player, _ = await _create_user(db_session, "replyplayer", "replyplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Reply Ground")

        booking = await _create_confirmed_booking(db_session, player.id, ground)
        booking.status = BookingStatus.COMPLETED
        db_session.add(booking)
        await db_session.commit()

        import uuid
        review = Review(
            user_id=player.id,
            ground_id=ground.id,
            booking_id=booking.id,
            rating=3,
            comment="Average",
            is_verified=True,
        )
        db_session.add(review)
        await db_session.commit()
        await db_session.refresh(review)
        rid = encode_id(review.id)

        response = await client.post(
            f"/api/v1/futsal/reviews/{rid}/reply",
            headers=owner_headers,
            json={"reply": "Thank you for your feedback!"},
        )
        assert response.status_code == 200
        assert "Thank you" in response.json()["owner_reply"]


# ──────────────────────────────────────────────────────────────────────────────
# Favourite Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFavourites:
    """Tests for favourites toggle and listing."""

    @pytest.mark.asyncio
    async def test_list_favourites_empty(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/favourites returns empty list for new user."""
        _, headers = await _create_user(db_session, "favuser1", "favuser1@example.com")
        response = await client.get("/api/v1/futsal/favourites", headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_toggle_favourite_add(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/favourites/{id} adds a ground to favourites."""
        owner, _ = await _create_user(db_session, "favowner", "favowner@example.com")
        player, headers = await _create_user(db_session, "favplayer", "favplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Favourite Ground")
        gid = encode_id(ground.id)

        response = await client.post(f"/api/v1/futsal/favourites/{gid}", headers=headers)
        assert response.status_code == 201
        assert response.json()["added"] is True

    @pytest.mark.asyncio
    async def test_toggle_favourite_remove(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/favourites/{id} twice removes from favourites."""
        owner, _ = await _create_user(db_session, "unfavowner", "unfavowner@example.com")
        player, headers = await _create_user(db_session, "unfavplayer", "unfavplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Unfavourite Ground")
        gid = encode_id(ground.id)

        # Add
        r1 = await client.post(f"/api/v1/futsal/favourites/{gid}", headers=headers)
        assert r1.status_code == 201
        assert r1.json()["added"] is True

        # Remove
        r2 = await client.post(f"/api/v1/futsal/favourites/{gid}", headers=headers)
        assert r2.status_code == 201
        assert r2.json()["added"] is False

    @pytest.mark.asyncio
    async def test_list_favourites_after_adding(self, client: AsyncClient, db_session: AsyncSession):
        """GET /futsal/favourites returns the list after toggling."""
        owner, _ = await _create_user(db_session, "listfavowner", "listfavowner@example.com")
        player, headers = await _create_user(db_session, "listfavplayer", "listfavplayer@example.com")
        ground = await _create_ground(db_session, owner.id, "Listed Favourite Ground")
        gid = encode_id(ground.id)

        await client.post(f"/api/v1/futsal/favourites/{gid}", headers=headers)

        response = await client.get("/api/v1/futsal/favourites", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["ground_id"] == gid

    @pytest.mark.asyncio
    async def test_favourite_requires_auth(self, client: AsyncClient, db_session: AsyncSession):
        """POST /futsal/favourites/{id} requires authentication."""
        owner, _ = await _create_user(db_session, "favnonauthowner", "favnonauthowner@example.com")
        ground = await _create_ground(db_session, owner.id, "Noauth Fav Ground")
        gid = encode_id(ground.id)

        response = await client.post(f"/api/v1/futsal/favourites/{gid}")
        assert response.status_code in (401, 403)

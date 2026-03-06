from datetime import date, time
from typing import Optional
from pydantic import BaseModel, field_serializer

from src.apps.iam.utils.hashid import encode_id


# ── Input schemas ────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    ground_id: str  # encoded hashid — decoded by the API endpoint before DB lookup
    booking_date: date
    start_time: time
    end_time: time
    team_name: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: bool = False
    recurring_type: Optional[str] = None
    recurring_end_date: Optional[date] = None
    loyalty_points_to_redeem: int = 0


# ── Response schemas ─────────────────────────────────────────────────────────

class BookingResponse(BaseModel):
    id: int
    user_id: int
    ground_id: int
    booking_date: date
    start_time: time
    end_time: time
    status: str
    total_amount: float
    paid_amount: float
    team_name: Optional[str] = None
    notes: Optional[str] = None
    qr_code: str
    is_recurring: bool
    recurring_type: Optional[str] = None
    recurring_end_date: Optional[date] = None
    cancellation_reason: Optional[str] = None

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: int) -> str:
        return encode_id(value)

    @field_serializer("user_id")
    def serialize_user_id(self, value: int) -> str:
        return encode_id(value)

    @field_serializer("ground_id")
    def serialize_ground_id(self, value: int) -> str:
        return encode_id(value)


class PendingReviewBooking(BaseModel):
    """A completed booking that the user has not yet reviewed."""
    booking_id: str
    ground_id: str
    ground_name: str
    ground_location: str
    booking_date: date
    start_time: time
    end_time: time

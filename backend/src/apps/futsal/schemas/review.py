from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_serializer

from src.apps.iam.utils.hashid import encode_id


# ── Input schemas ────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None
    image_url: Optional[str] = None


class DirectReviewCreate(ReviewCreate):
    """Used by POST /reviews — includes ground + booking IDs in the body."""
    ground_id: str   # encoded hashid
    booking_id: str  # encoded hashid


class OwnerReplyCreate(BaseModel):
    reply: str


# ── Response schemas ─────────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    id: int
    user_id: int
    ground_id: int
    booking_id: int
    rating: int
    comment: Optional[str] = None
    image_url: Optional[str] = None
    owner_reply: Optional[str] = None
    is_verified: bool
    created_at: datetime

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

    @field_serializer("booking_id")
    def serialize_booking_id(self, value: int) -> str:
        return encode_id(value)

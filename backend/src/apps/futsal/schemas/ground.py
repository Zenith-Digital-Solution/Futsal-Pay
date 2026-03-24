from datetime import date, time
from typing import Optional
from pydantic import BaseModel, field_serializer

from src.apps.futsal.models.ground import GroundType
from src.apps.iam.utils.hashid import encode_id


# ── Input schemas ────────────────────────────────────────────────────────────

class GroundCreate(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    ground_type: GroundType = GroundType.OUTDOOR
    price_per_hour: float
    weekend_price_per_hour: Optional[float] = None
    peak_hours_start: Optional[time] = None
    peak_hours_end: Optional[time] = None
    peak_price_multiplier: float = 1.0
    open_time: time
    close_time: time
    slot_duration_minutes: int = 60
    amenities: Optional[dict] = None


class GroundUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    ground_type: Optional[GroundType] = None
    price_per_hour: Optional[float] = None
    weekend_price_per_hour: Optional[float] = None
    peak_hours_start: Optional[time] = None
    peak_hours_end: Optional[time] = None
    peak_price_multiplier: Optional[float] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    slot_duration_minutes: Optional[int] = None
    amenities: Optional[dict] = None
    is_active: Optional[bool] = None


# ── Response schemas ─────────────────────────────────────────────────────────

class SlotResponse(BaseModel):
    start_time: time
    end_time: time
    is_available: bool
    is_locked: bool
    price: float


class GroundResponse(BaseModel):
    id: int
    name: str
    slug: str
    owner_id: int
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    ground_type: GroundType
    price_per_hour: float
    weekend_price_per_hour: Optional[float] = None
    peak_hours_start: Optional[time] = None
    peak_hours_end: Optional[time] = None
    peak_price_multiplier: float
    open_time: time
    close_time: time
    slot_duration_minutes: int
    is_active: bool
    is_verified: bool
    average_rating: float = 0.0
    rating_count: int = 0
    amenities: Optional[dict] = None
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: int) -> str:
        return encode_id(value)

    @field_serializer("owner_id")
    def serialize_owner_id(self, value: int) -> str:
        return encode_id(value)


class GroundImageResponse(BaseModel):
    id: int
    ground_id: int
    image_url: str
    is_primary: bool
    display_order: int

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: int) -> str:
        return encode_id(value)

    @field_serializer("ground_id")
    def serialize_ground_id(self, value: int) -> str:
        return encode_id(value)


class GroundClosureCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None


class GroundClosureResponse(BaseModel):
    id: int
    ground_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = None

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: int) -> str:
        return encode_id(value)

    @field_serializer("ground_id")
    def serialize_ground_id(self, value: int) -> str:
        return encode_id(value)

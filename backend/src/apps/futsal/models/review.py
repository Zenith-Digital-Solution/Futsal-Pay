from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint

if TYPE_CHECKING:
    from src.apps.iam.models.user import User
    from .ground import FutsalGround
    from .booking import Booking


class ReviewBase(SQLModel):
    user_id: int = Field(foreign_key="user.id", index=True)
    ground_id: int = Field(foreign_key="futsal_grounds.id", index=True)
    booking_id: int = Field(foreign_key="bookings.id")
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)
    image_url: Optional[str] = Field(default=None, max_length=500)


class Review(ReviewBase, table=True):
    __tablename__ = "reviews"  # type: ignore
    __table_args__ = (
        UniqueConstraint("booking_id", name="uq_review_booking_id"),
        UniqueConstraint("user_id", "ground_id", "booking_id", name="uq_review_booking"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_reply: Optional[str] = Field(default=None, max_length=1000)
    owner_replied_at: Optional[datetime] = Field(default=None)
    is_verified: bool = Field(default=True)  # True when booking status was COMPLETED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: Optional["User"] = Relationship()
    ground: Optional["FutsalGround"] = Relationship(back_populates="reviews")
    booking: Optional["Booking"] = Relationship(back_populates="review")

from datetime import date, datetime, time, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import DateTime, Index


class BookingLock(SQLModel, table=True):
    """
    Short-lived record tracking a slot reserved during payment flow.
    Overlap detection is enforced at the application level via SELECT FOR UPDATE
    on the FutsalGround row in booking_service.create_booking — not via a DB
    constraint — because a UniqueConstraint on (start_time, end_time) only catches
    exact duplicates, not overlapping intervals (e.g. 10:00-13:00 vs 11:00-12:00).
    TTL: 10 minutes. Released by Celery task or on payment completion.
    """
    __tablename__ = "booking_locks"  # type: ignore
    __table_args__ = (
        Index("ix_booking_lock_ground_date", "ground_id", "booking_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    ground_id: int = Field(foreign_key="futsal_grounds.id", index=True)
    booking_date: date = Field(index=True)
    start_time: time
    end_time: time
    locked_by_booking_id: Optional[int] = Field(default=None, foreign_key="bookings.id")
    locked_by_user_id: int = Field(foreign_key="user.id")
    locked_at: datetime = Field(sa_type=DateTime(timezone=True), default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime  # locked_at + 10 minutes

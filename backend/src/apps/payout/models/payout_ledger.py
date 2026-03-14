from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint
from sqlalchemy import DateTime

if TYPE_CHECKING:
    from .payout_record import PayoutRecord


class PayoutLedger(SQLModel, table=True):
    """
    One entry per completed booking. Accumulates until daily payout sweeps it.
    """
    __tablename__ = "payout_ledger"  # type: ignore
    __table_args__ = (
        UniqueConstraint("booking_id", name="uq_payout_ledger_booking_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    ground_id: int = Field(foreign_key="futsal_grounds.id", index=True)
    owner_id: int = Field(foreign_key="user.id", index=True)
    booking_id: int = Field(foreign_key="bookings.id")
    gross_amount: float = Field(ge=0)
    platform_fee_pct: float = Field(default=5.0, ge=0, le=100)
    platform_fee: float = Field(ge=0)
    net_amount: float = Field(ge=0)
    # Records which mode was active when this entry was created.
    # PLATFORM = money sits in platform account waiting for nightly transfer.
    # DIRECT   = money already landed in owner's account; transfer not needed.
    payout_mode: str = Field(default="PLATFORM", max_length=10)
    settled: bool = Field(default=False, index=True)
    payout_id: Optional[int] = Field(default=None, foreign_key="payout_records.id")
    created_at: datetime = Field(sa_type=DateTime(timezone=True), default_factory=lambda: datetime.now(timezone.utc))

    payout: Optional["PayoutRecord"] = Relationship(back_populates="ledger_entries")

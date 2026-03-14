from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint
from sqlalchemy import DateTime

if TYPE_CHECKING:
    from src.apps.iam.models.user import User
    from .ground import FutsalGround


class FavouriteGround(SQLModel, table=True):
    __tablename__ = "favourite_grounds"  # type: ignore
    __table_args__ = (
        UniqueConstraint("user_id", "ground_id", name="uq_favourite"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    ground_id: int = Field(foreign_key="futsal_grounds.id", index=True)
    created_at: datetime = Field(sa_type=DateTime(timezone=True), default_factory=lambda: datetime.now(timezone.utc))

    user: Optional["User"] = Relationship()
    ground: Optional["FutsalGround"] = Relationship(back_populates="favourites")

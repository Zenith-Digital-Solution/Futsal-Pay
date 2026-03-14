from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import DateTime

if TYPE_CHECKING:
    from .ground import FutsalGround


class GroundImageBase(SQLModel):
    ground_id: int = Field(foreign_key="futsal_grounds.id", index=True)
    image_url: str = Field(max_length=500)
    is_primary: bool = Field(default=False)
    display_order: int = Field(default=0)


class GroundImage(GroundImageBase, table=True):
    __tablename__ = "ground_images"  # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(sa_type=DateTime(timezone=True), default_factory=lambda: datetime.now(timezone.utc))

    ground: Optional["FutsalGround"] = Relationship(back_populates="images")

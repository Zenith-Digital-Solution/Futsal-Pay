"""Notification ORM model."""
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, JSON
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.apps.iam.models.user import User


class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    PAYMENT = "payment"
    AUTH = "auth"
    SYSTEM = "system"


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str = Field(max_length=255)
    body: str = Field(max_length=2000)
    type: NotificationType = Field(default=NotificationType.INFO)
    is_read: bool = Field(default=False)
    extra_data: Optional[Any] = Field(default=None, sa_type=JSON)
    created_at: datetime = Field(sa_type=DateTime(timezone=True), default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    user: Optional["User"] = Relationship(back_populates="notifications")

"""FCM device token model — stores per-device Firebase Cloud Messaging tokens."""
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.apps.iam.models.user import User


class FCMDeviceToken(SQLModel, table=True):
    """
    Stores a Firebase Cloud Messaging registration token for a specific user device.

    A user may have multiple active tokens (phone, tablet, web browser with
    Firebase JS SDK, etc.).  Tokens are deactivated rather than deleted so that
    stale tokens can be detected and cleaned up asynchronously.
    """

    __tablename__ = "fcmdevicetoken"    # type: ignore

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)

    fcm_token: str = Field(
        max_length=512,
        unique=True,
        index=True,
        description="Firebase Cloud Messaging registration token",
    )
    device_type: str = Field(
        default="web",
        max_length=20,
        description="Device platform: web | android | ios",
    )
    device_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional human-readable device label (e.g. 'My Phone')",
    )
    is_active: bool = Field(
        default=True,
        description="Whether this token is still considered valid",
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship
    user: Optional["User"] = Relationship(back_populates="fcm_tokens")

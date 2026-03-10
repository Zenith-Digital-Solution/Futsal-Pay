"""Pydantic schemas for Firebase Cloud Messaging (FCM) device tokens and push requests."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FCMDeviceTokenRegister(BaseModel):
    """Payload sent by the client to register or refresh an FCM device token."""

    fcm_token: str = Field(
        max_length=512,
        description="Firebase Cloud Messaging registration token obtained from the Firebase SDK",
    )
    device_type: str = Field(
        default="web",
        max_length=20,
        description="Device platform: web | android | ios",
    )
    device_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional human-readable label for this device",
    )


class FCMDeviceTokenRead(BaseModel):
    """Public representation of a stored FCM device token."""

    id: int
    user_id: int
    fcm_token: str
    device_type: str
    device_name: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FCMDeviceTokenUpdate(BaseModel):
    """Fields that can be updated on an existing token registration."""

    device_name: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


class FCMSendRequest(BaseModel):
    """
    Request body for the admin endpoint that sends an FCM notification to a
    specific user (all active devices).
    """

    user_id: int = Field(description="Target user's database ID")
    title: str = Field(max_length=255)
    body: str = Field(max_length=2000)
    data: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional key/value data payload forwarded to the device",
    )
    image_url: Optional[str] = Field(
        default=None,
        description="Optional image URL to display in the notification",
    )


class FCMTopicSendRequest(BaseModel):
    """
    Request body for sending an FCM notification to a Firebase topic
    (broadcast / group messaging).
    """

    topic: str = Field(
        max_length=255,
        description="Firebase topic name (e.g. 'all-users', 'news')",
    )
    title: str = Field(max_length=255)
    body: str = Field(max_length=2000)
    data: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional key/value data payload forwarded to devices subscribed to the topic",
    )
    image_url: Optional[str] = Field(
        default=None,
        description="Optional image URL to display in the notification",
    )


class FCMSendResponse(BaseModel):
    """Response summary after sending an FCM push notification."""

    success_count: int
    failure_count: int
    failed_tokens: List[str] = Field(
        default_factory=list,
        description="List of tokens that failed to receive the notification",
    )

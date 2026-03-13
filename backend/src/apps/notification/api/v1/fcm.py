"""
Firebase Cloud Messaging (FCM) REST API.

Endpoints
─────────
  POST   /notifications/fcm/tokens/              — register a new FCM device token
  GET    /notifications/fcm/tokens/              — list current user's registered devices
  PATCH  /notifications/fcm/tokens/{token_id}/   — update device metadata
  DELETE /notifications/fcm/tokens/{token_id}/   — deactivate a specific token
  DELETE /notifications/fcm/tokens/by-value/     — deactivate token by FCM token string
  POST   /notifications/fcm/send/                — (superuser) send FCM push to a user
  POST   /notifications/fcm/send-topic/          — (superuser) send FCM push to a topic
  POST   /notifications/fcm/subscribe-topic/     — (superuser) subscribe tokens to a topic
  POST   /notifications/fcm/unsubscribe-topic/   — (superuser) unsubscribe tokens from a topic
"""
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlmodel import col

from src.apps.iam.api.deps import get_current_active_superuser, get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.notification.models.fcm_device import FCMDeviceToken
from src.apps.notification.schemas.fcm import (
    FCMDeviceTokenRead,
    FCMDeviceTokenRegister,
    FCMDeviceTokenUpdate,
    FCMSendRequest,
    FCMSendResponse,
    FCMTopicSendRequest,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/fcm", tags=["notifications-fcm"])


# ---------------------------------------------------------------------------
# Device token management
# ---------------------------------------------------------------------------


@router.post(
    "/tokens/",
    response_model=FCMDeviceTokenRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register FCM device token",
)
async def register_fcm_token(
    data: FCMDeviceTokenRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FCMDeviceTokenRead:
    """
    Register (or re-activate) an FCM device token for the current user.

    If the token already exists in the database (for any user) it is
    re-associated with the current user and marked active.  This handles the
    case where a device token is recycled by Firebase.
    """
    assert isinstance(current_user.id, int), "User ID can't be None"

    result = await db.execute(
        select(FCMDeviceToken).where(col(FCMDeviceToken.fcm_token) == data.fcm_token)
    )
    device = result.scalars().first()

    if device:
        device.user_id = current_user.id
        device.device_type = data.device_type
        if data.device_name is not None:
            device.device_name = data.device_name
        device.is_active = True
        device.updated_at = datetime.now()
    else:
        device = FCMDeviceToken(
            user_id=current_user.id,
            fcm_token=data.fcm_token,
            device_type=data.device_type,
            device_name=data.device_name,
            is_active=True,
        )
        db.add(device)

    db.add(device)
    await db.commit()
    await db.refresh(device)
    return FCMDeviceTokenRead.model_validate(device)


@router.get(
    "/tokens/",
    response_model=List[FCMDeviceTokenRead],
    summary="List registered FCM device tokens",
)
async def list_fcm_tokens(
    active_only: bool = Query(True, description="Return only active tokens"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[FCMDeviceTokenRead]:
    """Return all FCM device tokens registered by the current user."""
    assert isinstance(current_user.id, int), "User ID can't be None"

    query = select(FCMDeviceToken).where(col(FCMDeviceToken.user_id) == current_user.id)
    if active_only:
        query = query.where(col(FCMDeviceToken.is_active) == True)  # noqa: E712

    result = await db.execute(query.order_by(col(FCMDeviceToken.created_at).desc()))
    devices = result.scalars().all()
    return [FCMDeviceTokenRead.model_validate(d) for d in devices]


@router.patch(
    "/tokens/{token_id}/",
    response_model=FCMDeviceTokenRead,
    summary="Update FCM device token metadata",
)
async def update_fcm_token(
    token_id: int,
    data: FCMDeviceTokenUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FCMDeviceTokenRead:
    """Update the device name or active status of a registered token."""
    assert isinstance(current_user.id, int), "User ID can't be None"

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.id) == token_id,
                col(FCMDeviceToken.user_id) == current_user.id,
            )
        )
    )
    device = result.scalars().first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FCM token not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(device, field, value)
    device.updated_at = datetime.now()

    db.add(device)
    await db.commit()
    await db.refresh(device)
    return FCMDeviceTokenRead.model_validate(device)


@router.delete(
    "/tokens/{token_id}/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate a registered FCM token by ID",
)
async def deactivate_fcm_token(
    token_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Deactivate (soft-delete) a specific FCM token belonging to the current user."""
    assert isinstance(current_user.id, int), "User ID can't be None"

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.id) == token_id,
                col(FCMDeviceToken.user_id) == current_user.id,
            )
        )
    )
    device = result.scalars().first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FCM token not found")

    device.is_active = False
    device.updated_at = datetime.now()
    db.add(device)
    await db.commit()


@router.delete(
    "/tokens/by-value/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate an FCM token by its token string",
)
async def deactivate_fcm_token_by_value(
    fcm_token: str = Query(..., description="The FCM registration token string to deactivate"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deactivate an FCM token identified by its token string.
    Useful when the Firebase SDK reports a token as expired or replaced.
    """
    assert isinstance(current_user.id, int), "User ID can't be None"

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.fcm_token) == fcm_token,
                col(FCMDeviceToken.user_id) == current_user.id,
            )
        )
    )
    device = result.scalars().first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FCM token not found")

    device.is_active = False
    device.updated_at = datetime.now()
    db.add(device)
    await db.commit()


# ---------------------------------------------------------------------------
# Admin: send push notifications
# ---------------------------------------------------------------------------


@router.post(
    "/send/",
    response_model=FCMSendResponse,
    summary="Send FCM push notification to a user (superuser)",
)
async def send_fcm_to_user(
    data: FCMSendRequest,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
) -> FCMSendResponse:
    """
    Send a Firebase Cloud Messaging push notification directly to all active
    devices registered by the target user.

    Requires superuser privileges.
    """
    from src.apps.notification.services.push_service import send_push_notification

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.user_id) == data.user_id,
                col(FCMDeviceToken.is_active) == True,  # noqa: E712
            )
        )
    )
    devices = result.scalars().all()
    tokens = [d.fcm_token for d in devices]

    if not tokens:
        return FCMSendResponse(success_count=0, failure_count=0, failed_tokens=[])

    str_data = {k: str(v) for k, v in (data.data or {}).items()}
    send_result = send_push_notification(
        tokens=tokens,
        title=data.title,
        body=data.body,
        data=str_data if str_data else None,
        image_url=data.image_url,
    )

    # Deactivate tokens that FCM reports as invalid
    if send_result["failed_tokens"]:
        failed_set = set(send_result["failed_tokens"])
        for device in devices:
            if device.fcm_token in failed_set:
                device.is_active = False
                device.updated_at = datetime.now()
                db.add(device)
        await db.commit()

    return FCMSendResponse(
        success_count=send_result["success_count"],
        failure_count=send_result["failure_count"],
        failed_tokens=send_result["failed_tokens"],
    )


@router.post(
    "/send-topic/",
    summary="Send FCM push notification to a topic (superuser)",
)
async def send_fcm_topic(
    data: FCMTopicSendRequest,
    current_user: User = Depends(get_current_active_superuser),
) -> dict:
    """
    Send a Firebase Cloud Messaging push notification to all devices subscribed
    to the given topic.

    Requires superuser privileges.
    """
    from src.apps.notification.services.push_service import send_push_to_topic

    success = send_push_to_topic(
        topic=data.topic,
        title=data.title,
        body=data.body,
        data={k: str(v) for k, v in (data.data or {}).items()} or None,
        image_url=data.image_url,
    )
    return {"success": success, "topic": data.topic}


# ---------------------------------------------------------------------------
# Admin: topic subscription management
# ---------------------------------------------------------------------------


@router.post(
    "/subscribe-topic/",
    summary="Subscribe user devices to an FCM topic (superuser)",
)
async def subscribe_user_to_topic(
    user_id: int = Query(..., description="Target user ID"),
    topic: str = Query(..., description="FCM topic name"),
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Subscribe all active FCM tokens of a user to a Firebase topic."""
    from src.apps.notification.services.push_service import subscribe_tokens_to_topic

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.user_id) == user_id,
                col(FCMDeviceToken.is_active) == True,  # noqa: E712
            )
        )
    )
    tokens = [d.fcm_token for d in result.scalars().all()]
    if not tokens:
        return {"success_count": 0, "failure_count": 0, "detail": "No active tokens found"}

    res = subscribe_tokens_to_topic(tokens, topic)
    return {**res, "topic": topic}


@router.post(
    "/unsubscribe-topic/",
    summary="Unsubscribe user devices from an FCM topic (superuser)",
)
async def unsubscribe_user_from_topic(
    user_id: int = Query(..., description="Target user ID"),
    topic: str = Query(..., description="FCM topic name"),
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Unsubscribe all active FCM tokens of a user from a Firebase topic."""
    from src.apps.notification.services.push_service import unsubscribe_tokens_from_topic

    result = await db.execute(
        select(FCMDeviceToken).where(
            and_(
                col(FCMDeviceToken.user_id) == user_id,
                col(FCMDeviceToken.is_active) == True,  # noqa: E712
            )
        )
    )
    tokens = [d.fcm_token for d in result.scalars().all()]
    if not tokens:
        return {"success_count": 0, "failure_count": 0, "detail": "No active tokens found"}

    res = unsubscribe_tokens_from_topic(tokens, topic)
    return {**res, "topic": topic}

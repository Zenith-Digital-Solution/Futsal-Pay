from datetime import datetime, timezone

import pytest

from src.apps.iam.utils.hashid import encode_id
from src.apps.multitenancy.models.tenant import InvitationStatus, TenantRole
from src.apps.multitenancy.schemas.tenant import (
    TenantCreate,
    TenantInvitationResponse,
    TenantMemberResponse,
    TenantResponse,
)


def test_tenant_create_validates_slug_rules():
    assert TenantCreate(name="Club", slug="club-one").slug == "club-one"

    with pytest.raises(ValueError):
        TenantCreate(name="Club", slug="Club One")


def test_tenant_response_serializes_ids_as_hashids():
    payload = TenantResponse(
        id=12,
        name="Tenant",
        slug="tenant",
        description="",
        is_active=True,
        owner_id=34,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    dumped = payload.model_dump()

    assert dumped["id"] == encode_id(12)
    assert dumped["owner_id"] == encode_id(34)


def test_tenant_member_response_serializes_related_ids():
    payload = TenantMemberResponse(
        id=1,
        tenant_id=2,
        user_id=3,
        role=TenantRole.ADMIN,
        is_active=True,
        joined_at=datetime.now(timezone.utc),
    )

    dumped = payload.model_dump()

    assert dumped["id"] == encode_id(1)
    assert dumped["tenant_id"] == encode_id(2)
    assert dumped["user_id"] == encode_id(3)


def test_tenant_invitation_response_serializes_optional_invited_by():
    payload = TenantInvitationResponse(
        id=4,
        tenant_id=5,
        email="invite@example.com",
        role=TenantRole.MEMBER,
        status=InvitationStatus.PENDING,
        invited_by=6,
        expires_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        accepted_at=None,
    )

    dumped = payload.model_dump()

    assert dumped["id"] == encode_id(4)
    assert dumped["tenant_id"] == encode_id(5)
    assert dumped["invited_by"] == encode_id(6)

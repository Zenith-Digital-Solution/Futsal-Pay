from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from src.apps.multitenancy.api.v1.tenant import (
    _get_tenant_or_404,
    _require_tenant_role,
    accept_invitation,
    create_tenant,
    invite_member,
    list_my_tenants,
)
from src.apps.multitenancy.models.tenant import InvitationStatus, TenantRole
from src.apps.multitenancy.schemas.tenant import AcceptInvitationRequest, TenantCreate, TenantInvitationCreate
from tests.fixtures.domain_builders import (
    create_invitation,
    create_membership,
    create_tenant as create_tenant_model,
    create_user,
)


@pytest.mark.asyncio
async def test_get_tenant_or_404_returns_existing_tenant(db_session):
    owner = await create_user(db_session, username="tenant-owner", email="tenant-owner@example.com")
    tenant = await create_tenant_model(db_session, owner_id=owner.id, slug="tenant-helper")

    found = await _get_tenant_or_404(tenant.id, db_session)

    assert found.id == tenant.id


@pytest.mark.asyncio
async def test_get_tenant_or_404_raises_for_missing_tenant(db_session):
    with pytest.raises(HTTPException) as exc:
        await _get_tenant_or_404(99999, db_session)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_require_tenant_role_enforces_membership_and_role(db_session):
    owner = await create_user(db_session, username="role-owner", email="role-owner@example.com")
    member = await create_user(db_session, username="role-member", email="role-member@example.com")
    tenant = await create_tenant_model(db_session, owner_id=owner.id, slug="role-tenant")
    await create_membership(db_session, tenant_id=tenant.id, user_id=member.id, role=TenantRole.MEMBER)

    membership = await _require_tenant_role(tenant.id, member, db_session, min_role=TenantRole.MEMBER)
    assert membership.user_id == member.id

    with pytest.raises(HTTPException) as exc:
        await _require_tenant_role(tenant.id, member, db_session, min_role=TenantRole.ADMIN)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_create_tenant_adds_owner_membership_and_clears_cache(db_session, monkeypatch):
    owner = await create_user(db_session, username="creator-owner", email="creator-owner@example.com")
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.CasbinEnforcer.add_role_for_user", AsyncMock())
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.RedisCache.clear_pattern", AsyncMock())

    created = await create_tenant(
        TenantCreate(name="Creators", slug="creators"),
        current_user=owner,
        db=db_session,
    )

    membership = await _require_tenant_role(created.id, owner, db_session, min_role=TenantRole.OWNER)
    assert created.owner_id == owner.id
    assert membership.role == TenantRole.OWNER


@pytest.mark.asyncio
async def test_list_my_tenants_uses_cache_when_present(db_session, monkeypatch):
    owner = await create_user(db_session, username="cache-owner", email="cache-owner@example.com")
    tenant = await create_tenant_model(db_session, owner_id=owner.id, slug="cache-tenant")
    await create_membership(db_session, tenant_id=tenant.id, user_id=owner.id, role=TenantRole.OWNER)
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.RedisCache.get", AsyncMock(return_value=None))
    set_mock = AsyncMock()
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.RedisCache.set", set_mock)

    result = await list_my_tenants(skip=0, limit=10, current_user=owner, db=db_session)

    assert result.total == 1
    assert len(result.items) == 1
    set_mock.assert_awaited()


@pytest.mark.asyncio
async def test_invite_and_accept_invitation_flow(db_session, monkeypatch):
    owner = await create_user(db_session, username="invite-owner", email="invite-owner@example.com")
    invited = await create_user(db_session, username="invite-user", email="invite-user@example.com")
    tenant = await create_tenant_model(db_session, owner_id=owner.id, slug="invite-tenant")
    await create_membership(db_session, tenant_id=tenant.id, user_id=owner.id, role=TenantRole.OWNER)
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.CasbinEnforcer.add_role_for_user", AsyncMock())
    monkeypatch.setattr("src.apps.multitenancy.api.v1.tenant.RedisCache.clear_pattern", AsyncMock())

    invitation = await invite_member(
        tenant.id,
        TenantInvitationCreate(email=invited.email, role=TenantRole.ADMIN),
        current_user=owner,
        db=db_session,
    )
    accepted = await accept_invitation(
        AcceptInvitationRequest(token=invitation.token),
        current_user=invited,
        db=db_session,
    )

    assert invitation.status == InvitationStatus.ACCEPTED
    assert accepted.user_id == invited.id
    assert accepted.role == TenantRole.ADMIN


@pytest.mark.asyncio
async def test_accept_invitation_rejects_expired_or_wrong_email(db_session):
    owner = await create_user(db_session, username="expired-owner", email="expired-owner@example.com")
    invited = await create_user(db_session, username="expired-user", email="expired-user@example.com")
    tenant = await create_tenant_model(db_session, owner_id=owner.id, slug="expired-tenant")
    expired_invitation = await create_invitation(
        db_session,
        tenant_id=tenant.id,
        email=invited.email,
        invited_by=owner.id,
        token="expired-token",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    with pytest.raises(HTTPException) as expired_exc:
        await accept_invitation(
            AcceptInvitationRequest(token=expired_invitation.token),
            current_user=invited,
            db=db_session,
        )
    assert expired_exc.value.status_code == 400

    second_invitation = await create_invitation(
        db_session,
        tenant_id=tenant.id,
        email="other@example.com",
        invited_by=owner.id,
        token="wrong-email-token",
        status=InvitationStatus.PENDING,
    )
    with pytest.raises(HTTPException) as wrong_email_exc:
        await accept_invitation(
            AcceptInvitationRequest(token=second_invitation.token),
            current_user=invited,
            db=db_session,
        )
    assert wrong_email_exc.value.status_code == 403

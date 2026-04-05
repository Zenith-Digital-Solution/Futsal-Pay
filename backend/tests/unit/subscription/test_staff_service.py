import pytest

from src.apps.subscription.models.ground_staff import StaffRole
from src.apps.subscription.services.staff_service import (
    accept_invite,
    get_staff_role,
    invite_staff,
    list_staff,
    remove_staff,
)
from tests.fixtures.domain_builders import create_ground, create_staff, create_user


@pytest.mark.asyncio
async def test_invite_staff_creates_pending_staff_record(db_session):
    owner = await create_user(db_session, username="staff-owner", email="staff-owner@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="staff-ground")

    staff = await invite_staff(
        db_session,
        ground_id=ground.id,
        email="manager@example.com",
        role=StaffRole.MANAGER,
        invited_by=owner.id,
    )

    assert staff.id is not None
    assert staff.role == StaffRole.MANAGER
    assert staff.invite_token is not None


@pytest.mark.asyncio
async def test_invite_staff_rejects_existing_active_member(db_session):
    owner = await create_user(db_session, username="dup-owner", email="dup-owner@example.com")
    staff_user = await create_user(db_session, username="dup-staff", email="dup-staff@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="dup-ground")
    await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=staff_user.id,
        invited_by=owner.id,
        role=StaffRole.STAFF,
    )

    with pytest.raises(ValueError, match="already a staff member"):
        await invite_staff(
            db_session,
            ground_id=ground.id,
            email=f"staff-{staff_user.id}@example.com",
            role=StaffRole.STAFF,
            invited_by=owner.id,
        )


@pytest.mark.asyncio
async def test_accept_invite_assigns_user_and_clears_token(db_session):
    owner = await create_user(db_session, username="accept-owner", email="accept-owner@example.com")
    invited_user = await create_user(db_session, username="accept-staff", email="accept@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="accept-ground")
    pending = await invite_staff(
        db_session,
        ground_id=ground.id,
        email=invited_user.email,
        role=StaffRole.STAFF,
        invited_by=owner.id,
    )

    accepted = await accept_invite(db_session, pending.invite_token, invited_user)

    assert accepted.user_id == invited_user.id
    assert accepted.invite_token is None
    assert accepted.accepted_at is not None


@pytest.mark.asyncio
async def test_accept_invite_rejects_wrong_email(db_session):
    owner = await create_user(db_session, username="wrong-owner", email="wrong-owner@example.com")
    invited_user = await create_user(db_session, username="wrong-staff", email="wrong@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="wrong-ground")
    pending = await invite_staff(
        db_session,
        ground_id=ground.id,
        email="other@example.com",
        role=StaffRole.STAFF,
        invited_by=owner.id,
    )

    with pytest.raises(ValueError, match="different email"):
        await accept_invite(db_session, pending.invite_token, invited_user)


@pytest.mark.asyncio
async def test_list_staff_and_get_staff_role_only_return_active_accepted_staff(db_session):
    owner = await create_user(db_session, username="list-owner", email="list-owner@example.com")
    staff_user = await create_user(db_session, username="list-staff", email="list-staff@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="list-ground")
    await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=staff_user.id,
        invited_by=owner.id,
        role=StaffRole.MANAGER,
    )

    staff_records = await list_staff(db_session, ground.id)
    role = await get_staff_role(db_session, ground.id, staff_user.id)

    assert len(staff_records) == 1
    assert role == StaffRole.MANAGER


@pytest.mark.asyncio
async def test_remove_staff_requires_ground_owner(db_session):
    owner = await create_user(db_session, username="remove-owner", email="remove-owner@example.com")
    outsider = await create_user(db_session, username="remove-outsider", email="remove-outsider@example.com")
    staff_user = await create_user(db_session, username="remove-staff", email="remove-staff@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="remove-ground")
    staff = await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=staff_user.id,
        invited_by=owner.id,
        role=StaffRole.STAFF,
    )

    with pytest.raises(PermissionError):
        await remove_staff(db_session, staff.id, outsider.id)

    await remove_staff(db_session, staff.id, owner.id)
    await db_session.refresh(staff)
    assert staff.is_active is False

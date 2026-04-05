import pytest
from fastapi import HTTPException

from src.apps.subscription.models.ground_staff import StaffRole
from src.apps.subscription.models.subscription import SubscriptionStatus
from src.apps.subscription.dependencies import (
    require_active_subscription,
    require_ground_owner_or_manager,
    require_staff_checkin_access,
)
from tests.fixtures.domain_builders import (
    create_ground,
    create_plan,
    create_staff,
    create_subscription,
    create_user,
)


@pytest.mark.asyncio
async def test_require_active_subscription_allows_superuser_without_subscription(db_session):
    user = await create_user(
        db_session,
        username="super-sub",
        email="super-sub@example.com",
        is_superuser=True,
    )

    assert await require_active_subscription(current_user=user, db=db_session) == user


@pytest.mark.asyncio
async def test_require_active_subscription_rejects_inactive_owner(db_session):
    owner = await create_user(db_session, username="inactive-owner", email="inactive-owner@example.com")

    with pytest.raises(HTTPException) as exc:
        await require_active_subscription(current_user=owner, db=db_session)

    assert exc.value.status_code == 402


@pytest.mark.asyncio
async def test_require_active_subscription_allows_active_owner(db_session):
    owner = await create_user(db_session, username="active-owner", email="active-owner@example.com")
    plan = await create_plan(db_session, slug="dep-plan")
    await create_subscription(
        db_session,
        owner_id=owner.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
    )

    assert await require_active_subscription(current_user=owner, db=db_session) == owner


@pytest.mark.asyncio
async def test_require_ground_owner_or_manager_allows_owner_and_manager(db_session):
    owner = await create_user(db_session, username="dep-owner", email="dep-owner@example.com")
    manager = await create_user(db_session, username="dep-manager", email="dep-manager@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="dep-ground")
    await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=manager.id,
        invited_by=owner.id,
        role=StaffRole.MANAGER,
    )

    assert await require_ground_owner_or_manager(ground.id, current_user=owner, db=db_session) == owner
    assert await require_ground_owner_or_manager(ground.id, current_user=manager, db=db_session) == manager


@pytest.mark.asyncio
async def test_require_ground_owner_or_manager_rejects_non_manager_staff(db_session):
    owner = await create_user(db_session, username="dep-owner-2", email="dep-owner-2@example.com")
    staff = await create_user(db_session, username="dep-staff", email="dep-staff@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="dep-ground-2")
    await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=staff.id,
        invited_by=owner.id,
        role=StaffRole.STAFF,
    )

    with pytest.raises(HTTPException) as exc:
        await require_ground_owner_or_manager(ground.id, current_user=staff, db=db_session)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_require_staff_checkin_access_allows_staff_and_rejects_missing_ground(db_session):
    owner = await create_user(db_session, username="check-owner", email="check-owner@example.com")
    staff = await create_user(db_session, username="check-staff", email="check-staff@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="check-ground")
    await create_staff(
        db_session,
        ground_id=ground.id,
        user_id=staff.id,
        invited_by=owner.id,
        role=StaffRole.STAFF,
    )

    assert await require_staff_checkin_access(ground.id, current_user=staff, db=db_session) == staff

    with pytest.raises(HTTPException) as exc:
        await require_staff_checkin_access(99999, current_user=staff, db=db_session)

    assert exc.value.status_code == 404

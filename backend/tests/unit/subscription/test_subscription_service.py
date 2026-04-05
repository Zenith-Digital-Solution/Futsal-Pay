from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from src.apps.subscription.models.subscription import SubscriptionStatus
from src.apps.subscription.services.subscription_service import (
    activate_subscription,
    cancel_subscription,
    get_subscription,
    is_subscription_active,
    refresh_subscription_statuses,
    start_trial,
)
from tests.fixtures.domain_builders import create_plan, create_subscription, create_user


@pytest.mark.asyncio
async def test_start_trial_creates_trialing_subscription(db_session, monkeypatch):
    monkeypatch.setattr("src.apps.subscription.services.subscription_service.analytics.track", MagicMock())
    owner = await create_user(db_session, username="trial-owner", email="trial-owner@example.com")
    plan = await create_plan(db_session, slug="trial-plan", trial_days=10)

    subscription = await start_trial(db_session, owner.id, plan.id)

    assert subscription.owner_id == owner.id
    assert subscription.status == SubscriptionStatus.TRIALING
    assert subscription.trial_ends_at is not None


@pytest.mark.asyncio
async def test_start_trial_raises_for_missing_plan(db_session):
    owner = await create_user(db_session, username="missing-plan-owner", email="missing-plan-owner@example.com")

    with pytest.raises(ValueError, match="Plan not found"):
        await start_trial(db_session, owner.id, 9999)


@pytest.mark.asyncio
async def test_activate_subscription_creates_new_active_record(db_session, monkeypatch):
    monkeypatch.setattr("src.apps.subscription.services.subscription_service.analytics.track", MagicMock())
    owner = await create_user(db_session, username="activate-owner", email="activate-owner@example.com")
    plan = await create_plan(db_session, slug="activate-plan")

    subscription = await activate_subscription(
        db_session,
        owner.id,
        plan.id,
        transaction_id=123,
        billing_interval="yearly",
    )

    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.last_payment_transaction_id == 123
    assert subscription.billing_interval == "yearly"
    assert subscription.current_period_end == date.today() + timedelta(days=365)


@pytest.mark.asyncio
async def test_activate_subscription_renews_existing_record(db_session, monkeypatch):
    monkeypatch.setattr("src.apps.subscription.services.subscription_service.analytics.track", MagicMock())
    owner = await create_user(db_session, username="renew-owner", email="renew-owner@example.com")
    plan = await create_plan(db_session, slug="renew-plan")
    existing = await create_subscription(
        db_session,
        owner_id=owner.id,
        plan_id=plan.id,
        current_period_end=date.today() + timedelta(days=5),
    )
    previous_period_end = existing.current_period_end

    renewed = await activate_subscription(
        db_session,
        owner.id,
        plan.id,
        transaction_id=999,
        billing_interval="quarterly",
    )

    assert renewed.id == existing.id
    assert renewed.current_period_start == previous_period_end
    assert renewed.current_period_end == previous_period_end + timedelta(days=90)
    assert renewed.cancel_at_period_end is False


@pytest.mark.asyncio
async def test_cancel_subscription_supports_immediate_and_period_end(db_session, monkeypatch):
    monkeypatch.setattr("src.apps.subscription.services.subscription_service.analytics.track", MagicMock())
    owner = await create_user(db_session, username="cancel-owner", email="cancel-owner@example.com")
    plan = await create_plan(db_session, slug="cancel-plan")
    active = await create_subscription(db_session, owner_id=owner.id, plan_id=plan.id)

    scheduled = await cancel_subscription(db_session, owner.id, immediately=False)
    assert scheduled.cancel_at_period_end is True

    immediate = await cancel_subscription(db_session, owner.id, immediately=True)
    assert immediate.status == SubscriptionStatus.CANCELLED
    assert immediate.cancelled_at is not None


def test_is_subscription_active_handles_supported_statuses():
    now = datetime.now(timezone.utc)

    assert is_subscription_active(None) is False
    assert is_subscription_active(type("S", (), {"status": SubscriptionStatus.ACTIVE})()) is True
    assert is_subscription_active(type("S", (), {"status": SubscriptionStatus.PAST_DUE})()) is True
    assert is_subscription_active(type("S", (), {"status": SubscriptionStatus.GRACE})()) is True
    assert is_subscription_active(
        type("S", (), {"status": SubscriptionStatus.TRIALING, "trial_ends_at": now + timedelta(days=1)})()
    ) is True
    assert is_subscription_active(
        type("S", (), {"status": SubscriptionStatus.TRIALING, "trial_ends_at": now - timedelta(days=1)})()
    ) is False
    assert is_subscription_active(type("S", (), {"status": SubscriptionStatus.EXPIRED})()) is False


@pytest.mark.asyncio
async def test_refresh_subscription_statuses_moves_records_between_states(db_session):
    owner = await create_user(db_session, username="refresh-owner", email="refresh-owner@example.com")
    plan = await create_plan(db_session, slug="refresh-plan")
    await create_subscription(
        db_session,
        owner_id=owner.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIALING,
        trial_ends_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    second_owner = await create_user(db_session, username="expired-owner", email="expired-owner@example.com")
    await create_subscription(
        db_session,
        owner_id=second_owner.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        current_period_end=date.today() - timedelta(days=10),
    )

    results = await refresh_subscription_statuses(db_session)

    assert results["to_grace"] >= 1
    assert results["to_expired"] >= 1


@pytest.mark.asyncio
async def test_get_subscription_returns_first_record_for_owner(db_session):
    owner = await create_user(db_session, username="getsub-owner", email="getsub-owner@example.com")
    plan = await create_plan(db_session, slug="getsub-plan")
    created = await create_subscription(db_session, owner_id=owner.id, plan_id=plan.id)

    fetched = await get_subscription(db_session, owner.id)

    assert fetched.id == created.id

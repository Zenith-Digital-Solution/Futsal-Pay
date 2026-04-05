from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlmodel import select

from src.apps.payout.models.owner_gateway import GatewayProvider
from src.apps.payout.models.payout_record import PayoutRecord, PayoutStatus
from src.apps.payout.services.encryption import encrypt_credentials
from src.apps.payout.services.payout_service import (
    PayoutMode,
    _call_gateway,
    _process_platform_payout,
    _settle_direct,
    get_payout_mode,
    get_platform_pending_balance,
    process_daily_payouts,
)
from src.apps.subscription.models.subscription import SubscriptionStatus
from tests.fixtures.domain_builders import (
    create_booking,
    create_gateway,
    create_ground,
    create_payout_ledger,
    create_plan,
    create_subscription,
    create_user,
)


@pytest.mark.asyncio
async def test_settle_direct_creates_completed_record_and_settles_ledgers(db_session, monkeypatch):
    owner = await create_user(db_session, username="owner-direct", email="owner-direct@example.com")
    player = await create_user(db_session, username="player-direct", email="player-direct@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="direct-ground")
    booking = await create_booking(db_session, user_id=player.id, ground_id=ground.id)
    ledger = await create_payout_ledger(
        db_session,
        ground_id=ground.id,
        owner_id=owner.id,
        booking_id=booking.id,
    )

    results = {"direct_settled": 0}
    await _settle_direct(db_session, owner.id, [ledger], booking.booking_date, results)

    record = (await db_session.execute(select(PayoutRecord))).scalars().one()
    assert record.status == PayoutStatus.COMPLETED
    assert record.payout_mode == PayoutMode.DIRECT.value
    assert results["direct_settled"] == 1

    await db_session.refresh(ledger)
    assert ledger.settled is True
    assert ledger.payout_id == record.id


@pytest.mark.asyncio
async def test_process_platform_payout_without_verified_gateway_puts_record_on_hold(db_session):
    owner = await create_user(db_session, username="owner-hold", email="owner-hold@example.com")
    player = await create_user(db_session, username="player-hold", email="player-hold@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="hold-ground")
    booking = await create_booking(db_session, user_id=player.id, ground_id=ground.id)
    ledger = await create_payout_ledger(
        db_session,
        ground_id=ground.id,
        owner_id=owner.id,
        booking_id=booking.id,
    )

    results = {"processed": 0, "failed": 0, "on_hold": 0, "direct_settled": 0}
    await _process_platform_payout(db_session, owner.id, [ledger], booking.booking_date, results)

    record = (await db_session.execute(select(PayoutRecord))).scalars().one()
    assert record.status == PayoutStatus.ON_HOLD
    assert "No verified payment gateway" in record.last_error
    assert results["on_hold"] == 1


@pytest.mark.asyncio
async def test_process_platform_payout_success_marks_record_completed(db_session, monkeypatch):
    monkeypatch.setattr(
        "src.apps.payout.services.payout_service.analytics.track",
        MagicMock(),
    )
    owner = await create_user(db_session, username="owner-ok", email="owner-ok@example.com")
    player = await create_user(db_session, username="player-ok", email="player-ok@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="ok-ground")
    booking = await create_booking(db_session, user_id=player.id, ground_id=ground.id)
    ledger = await create_payout_ledger(
        db_session,
        ground_id=ground.id,
        owner_id=owner.id,
        booking_id=booking.id,
    )
    creds = encrypt_credentials({"mobile": "9800000000"})
    await create_gateway(db_session, owner_id=owner.id, credentials_encrypted=creds)
    monkeypatch.setattr(
        "src.apps.payout.services.payout_service._call_gateway",
        AsyncMock(return_value=(True, "txn-123")),
    )

    results = {"processed": 0, "failed": 0, "on_hold": 0, "direct_settled": 0}
    await _process_platform_payout(db_session, owner.id, [ledger], booking.booking_date, results)

    record = (await db_session.execute(select(PayoutRecord))).scalars().one()
    assert record.status == PayoutStatus.COMPLETED
    assert record.transaction_ref == "txn-123"
    assert results["processed"] == 1

    await db_session.refresh(ledger)
    assert ledger.settled is True
    assert ledger.payout_id == record.id


@pytest.mark.asyncio
async def test_process_daily_payouts_respects_direct_mode(db_session, monkeypatch):
    monkeypatch.setattr("src.apps.payout.services.payout_service.settings.PAYOUT_MODE", "DIRECT")
    owner = await create_user(db_session, username="owner-daily", email="owner-daily@example.com")
    player = await create_user(db_session, username="player-daily", email="player-daily@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="daily-ground")
    plan = await create_plan(db_session, slug="daily-plan")
    await create_subscription(
        db_session,
        owner_id=owner.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
    )
    booking = await create_booking(db_session, user_id=player.id, ground_id=ground.id)
    await create_payout_ledger(
        db_session,
        ground_id=ground.id,
        owner_id=owner.id,
        booking_id=booking.id,
    )

    results = await process_daily_payouts(db_session)

    assert results["mode"] == "DIRECT"
    assert results["direct_settled"] == 1


@pytest.mark.asyncio
async def test_get_platform_pending_balance_sums_unsettled_platform_ledgers(db_session):
    owner = await create_user(db_session, username="owner-balance", email="owner-balance@example.com")
    player = await create_user(db_session, username="player-balance", email="player-balance@example.com")
    ground = await create_ground(db_session, owner_id=owner.id, slug="balance-ground")
    booking = await create_booking(db_session, user_id=player.id, ground_id=ground.id)
    await create_payout_ledger(
        db_session,
        ground_id=ground.id,
        owner_id=owner.id,
        booking_id=booking.id,
        payout_mode="PLATFORM",
    )

    balance = await get_platform_pending_balance(db_session)

    assert balance["unsettled_entries"] == 1
    assert balance["total_gross_npr"] == 2000
    assert balance["total_platform_fee_npr"] == 100
    assert balance["total_owed_to_owners_npr"] == 1900


def test_get_payout_mode_defaults_for_unknown_setting(monkeypatch):
    monkeypatch.setattr("src.apps.payout.services.payout_service.settings.PAYOUT_MODE", "weird")

    assert get_payout_mode() == PayoutMode.PLATFORM


@pytest.mark.asyncio
async def test_call_gateway_returns_failure_for_unsupported_provider(monkeypatch, db_session):
    owner = await create_user(db_session, username="owner-unsupported", email="owner-unsupported@example.com")
    gateway = await create_gateway(
        db_session,
        owner_id=owner.id,
        credentials_encrypted=encrypt_credentials({"foo": "bar"}),
        provider=GatewayProvider.BANK_TRANSFER,
    )
    monkeypatch.setattr(
        "src.apps.payout.services.payout_service._bank_transfer_payout",
        AsyncMock(return_value=(True, "bank-ref")),
    )

    success, ref = await _call_gateway(gateway, 1000)

    assert success is True
    assert ref == "bank-ref"

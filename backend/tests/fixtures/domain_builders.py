from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.apps.futsal.models.booking import Booking, BookingStatus
from src.apps.futsal.models.ground import FutsalGround
from src.apps.iam.models.user import User
from src.apps.multitenancy.models.tenant import (
    InvitationStatus,
    Tenant,
    TenantInvitation,
    TenantMember,
    TenantRole,
)
from src.apps.payout.models.owner_gateway import GatewayProvider, OwnerPaymentGateway
from src.apps.payout.models.payout_ledger import PayoutLedger
from src.apps.subscription.models.ground_staff import GroundStaff, StaffRole
from src.apps.subscription.models.plan import SubscriptionPlan
from src.apps.subscription.models.subscription import OwnerSubscription, SubscriptionStatus


async def create_user(
    db: AsyncSession,
    *,
    username: str,
    email: str,
    is_superuser: bool = False,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password="hashed",
        is_superuser=is_superuser,
        is_active=is_active,
        is_confirmed=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_ground(
    db: AsyncSession,
    *,
    owner_id: int,
    slug: str,
    name: str = "Test Ground",
) -> FutsalGround:
    ground = FutsalGround(
        name=name,
        slug=slug,
        owner_id=owner_id,
        location="Kathmandu",
        price_per_hour=1500,
        open_time=time(6, 0),
        close_time=time(22, 0),
    )
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


async def create_booking(
    db: AsyncSession,
    *,
    user_id: int,
    ground_id: int,
    booking_date: date | None = None,
    status: BookingStatus = BookingStatus.COMPLETED,
    total_amount: float = 2000,
) -> Booking:
    booking = Booking(
        user_id=user_id,
        ground_id=ground_id,
        booking_date=booking_date or (date.today() - timedelta(days=1)),
        start_time=time(9, 0),
        end_time=time(10, 0),
        total_amount=total_amount,
        paid_amount=total_amount,
        status=status,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


async def create_plan(
    db: AsyncSession,
    *,
    slug: str = "basic-plan",
    name: str = "Basic",
    trial_days: int = 14,
) -> SubscriptionPlan:
    plan = SubscriptionPlan(
        name=name,
        slug=slug,
        price_monthly=999,
        price_quarterly=2500,
        price_yearly=9000,
        max_grounds=2,
        max_staff=4,
        trial_days=trial_days,
        features='["bookings"]',
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def create_subscription(
    db: AsyncSession,
    *,
    owner_id: int,
    plan_id: int,
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
    billing_interval: str = "monthly",
    current_period_end: date | None = None,
    trial_ends_at: datetime | None = None,
    cancel_at_period_end: bool = False,
) -> OwnerSubscription:
    subscription = OwnerSubscription(
        owner_id=owner_id,
        plan_id=plan_id,
        status=status,
        billing_interval=billing_interval,
        current_period_start=date.today() - timedelta(days=5),
        current_period_end=current_period_end or (date.today() + timedelta(days=25)),
        trial_ends_at=trial_ends_at,
        cancel_at_period_end=cancel_at_period_end,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


async def create_staff(
    db: AsyncSession,
    *,
    ground_id: int,
    user_id: int,
    invited_by: int,
    role: StaffRole = StaffRole.STAFF,
    accepted: bool = True,
) -> GroundStaff:
    staff = GroundStaff(
        ground_id=ground_id,
        user_id=user_id,
        invited_by=invited_by,
        role=role,
        invite_email=f"staff-{user_id}@example.com",
        invite_token=None if accepted else f"token-{user_id}",
        accepted_at=datetime.now(timezone.utc) if accepted else None,
        is_active=True,
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff


async def create_gateway(
    db: AsyncSession,
    *,
    owner_id: int,
    credentials_encrypted: str,
    provider: GatewayProvider = GatewayProvider.KHALTI,
    is_verified: bool = True,
    is_active: bool = True,
) -> OwnerPaymentGateway:
    gateway = OwnerPaymentGateway(
        owner_id=owner_id,
        provider=provider,
        credentials_encrypted=credentials_encrypted,
        account_name="Owner",
        account_number_hint="1234",
        is_verified=is_verified,
        is_active=is_active,
    )
    db.add(gateway)
    await db.commit()
    await db.refresh(gateway)
    return gateway


async def create_payout_ledger(
    db: AsyncSession,
    *,
    ground_id: int,
    owner_id: int,
    booking_id: int,
    payout_mode: str = "PLATFORM",
    settled: bool = False,
) -> PayoutLedger:
    ledger = PayoutLedger(
        ground_id=ground_id,
        owner_id=owner_id,
        booking_id=booking_id,
        gross_amount=2000,
        platform_fee_pct=5,
        platform_fee=100,
        net_amount=1900,
        payout_mode=payout_mode,
        settled=settled,
    )
    db.add(ledger)
    await db.commit()
    await db.refresh(ledger)
    return ledger


async def create_tenant(
    db: AsyncSession,
    *,
    owner_id: int,
    slug: str = "tenant-one",
    name: str = "Tenant One",
) -> Tenant:
    tenant = Tenant(name=name, slug=slug, description="", owner_id=owner_id)
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


async def create_membership(
    db: AsyncSession,
    *,
    tenant_id: int,
    user_id: int,
    role: TenantRole = TenantRole.MEMBER,
    is_active: bool = True,
) -> TenantMember:
    membership = TenantMember(
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        is_active=is_active,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


async def create_invitation(
    db: AsyncSession,
    *,
    tenant_id: int,
    email: str,
    invited_by: int,
    role: TenantRole = TenantRole.MEMBER,
    token: str = "invite-token",
    status: InvitationStatus = InvitationStatus.PENDING,
    expires_at: datetime | None = None,
) -> TenantInvitation:
    invitation = TenantInvitation(
        tenant_id=tenant_id,
        email=email,
        invited_by=invited_by,
        role=role,
        status=status,
        token=token,
        expires_at=expires_at or (datetime.now(timezone.utc) + timedelta(hours=48)),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    return invitation

"""
Subscription Celery tasks:
- Daily: expire subscriptions past their period, move to grace, then expired
- Send renewal reminder emails at 7d / 3d / 1d before expiry
"""
import logging
from datetime import date, timedelta

from src.apps.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="subscription.refresh_statuses", bind=True, max_retries=3)
def refresh_subscription_statuses_task(self):
    """Daily: update subscription statuses (ACTIVE→GRACE→EXPIRED)."""
    import asyncio
    from src.db.session import async_session_factory
    from src.apps.subscription.services.subscription_service import refresh_subscription_statuses

    async def _run():
        async with async_session_factory() as db:
            return await refresh_subscription_statuses(db)

    try:
        result = asyncio.get_event_loop().run_until_complete(_run())
        return result
    except Exception as exc:
        logger.error("refresh_subscription_statuses task failed: %s", exc)
        try:
            raise self.retry(exc=exc, countdown=300)
        except self.MaxRetriesExceededError:
            logger.error("refresh_subscription_statuses exceeded max retries — giving up: %s", exc)


@celery_app.task(name="subscription.send_renewal_reminders", bind=True, max_retries=3)
def send_renewal_reminders_task(self):
    """
    Daily: notify owners whose subscription expires in 7, 3, or 1 day.
    Uses existing notification infrastructure (email/push).
    """
    import asyncio
    from src.db.session import async_session_factory
    from sqlmodel import select
    from src.apps.subscription.models.subscription import OwnerSubscription, SubscriptionStatus

    async def _run():
        async with async_session_factory() as db:
            today = date.today()
            reminder_offsets = [7, 3, 1]
            sent = 0
            for days_out in reminder_offsets:
                target_date = today + timedelta(days=days_out)
                result = await db.execute(
                    select(OwnerSubscription).where(
                        OwnerSubscription.status == SubscriptionStatus.ACTIVE,
                        OwnerSubscription.current_period_end == target_date,
                        OwnerSubscription.cancel_at_period_end == False,
                    )
                )
                subs = result.scalars().all()
                for sub in subs:
                    # Fire-and-forget notification to the owner
                    try:
                        from src.apps.notification.services.email import send_email
                        await send_email(
                            user_id=sub.owner_id,
                            subject=f"Your FutsalApp subscription renews in {days_out} day(s)",
                            body=(
                                f"Your subscription will automatically expire in {days_out} day(s). "
                                f"Visit your dashboard to renew and keep access to your owner dashboard."
                            ),
                        )
                        sent += 1
                    except Exception as exc:
                        logger.warning(
                            "Failed to send renewal reminder to owner_id=%s: %s",
                            sub.owner_id, exc,
                        )
            return {"reminders_sent": sent}

    try:
        return asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        logger.error("send_renewal_reminders task failed: %s", exc)
        try:
            raise self.retry(exc=exc, countdown=300)
        except self.MaxRetriesExceededError:
            logger.error("send_renewal_reminders exceeded max retries — giving up: %s", exc)


# ── Celery Beat schedule ──────────────────────────────────────────────────────
from celery.schedules import crontab  # noqa: E402

celery_app.conf.beat_schedule.update(
    {
        # Run at 01:00 UTC daily (after midnight payouts settle)
        "subscription-refresh-statuses": {
            "task": "subscription.refresh_statuses",
            "schedule": crontab(hour=1, minute=0),
        },
        # Send renewal reminders at 08:00 UTC daily
        "subscription-renewal-reminders": {
            "task": "subscription.send_renewal_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
    }
)

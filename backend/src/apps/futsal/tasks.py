"""
Celery tasks for the futsal app.
- release_expired_booking_locks: frees locks past TTL
- update_completed_bookings: marks past confirmed bookings as COMPLETED
- send_booking_reminders: 24h and 2h reminders
- expire_loyalty_points: monthly cleanup
"""
import asyncio
from datetime import datetime, date, timedelta, timezone
import logging

from src.apps.core.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="futsal.release_expired_locks")
def release_expired_locks():
    """Remove BookingLock entries whose TTL has expired."""
    from src.db.session import async_session_factory
    from src.apps.futsal.models.booking_lock import BookingLock
    from src.apps.futsal.models.booking import Booking, BookingStatus
    from sqlmodel import select, delete

    async def _run():
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            # Delete expired locks
            expired = await db.execute(
                select(BookingLock).where(BookingLock.expires_at <= now)
            )
            expired_locks = expired.scalars().all()
            for lock in expired_locks:
                # Cancel the pending booking if payment wasn't completed
                if lock.locked_by_booking_id:
                    booking = await db.get(Booking, lock.locked_by_booking_id)
                    if booking and booking.status == BookingStatus.PENDING:
                        booking.status = BookingStatus.CANCELLED
                        booking.cancellation_reason = "Payment timeout — lock expired."
                        db.add(booking)
                await db.delete(lock)

                # Notify waitlist users for this slot
                from src.apps.futsal.models.waitlist import WaitlistEntry
                waitlist = await db.execute(
                    select(WaitlistEntry).where(
                        WaitlistEntry.ground_id == lock.ground_id,
                        WaitlistEntry.booking_date == lock.booking_date,
                        WaitlistEntry.start_time == lock.start_time,
                        WaitlistEntry.end_time == lock.end_time,
                        WaitlistEntry.is_active == True,
                    ).order_by(WaitlistEntry.created_at).limit(1)
                )
                first_waiter = waitlist.scalars().first()
                if first_waiter:
                    first_waiter.notified_at = now
                    first_waiter.is_active = False
                    db.add(first_waiter)
                    # TODO: trigger notification to first_waiter.user_id

            await db.commit()
            logger.info(f"Released {len(expired_locks)} expired booking locks.")

    try:
        asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        logger.error("release_expired_locks task failed: %s", exc)


@celery_app.task(name="futsal.update_completed_bookings")
def update_completed_bookings():
    """Mark confirmed bookings whose end_time has passed as COMPLETED."""
    from src.db.session import async_session_factory
    from src.apps.futsal.models.booking import Booking, BookingStatus

    async def _run():
        async with async_session_factory() as db:
            from sqlmodel import select
            now = datetime.now(timezone.utc)
            today = now.date()
            result = await db.execute(
                select(Booking).where(
                    Booking.status == BookingStatus.CONFIRMED,
                    Booking.booking_date <= today,
                )
            )
            updated = 0
            for booking in result.scalars().all():
                booking_end = datetime.combine(booking.booking_date, booking.end_time)
                if booking_end < now:
                    booking.status = BookingStatus.COMPLETED
                    booking.updated_at = now
                    db.add(booking)
                    updated += 1
            await db.commit()
            logger.info(f"Marked {updated} bookings as COMPLETED.")

    try:
        asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        logger.error("update_completed_bookings task failed: %s", exc)


@celery_app.task(name="futsal.send_booking_reminders")
def send_booking_reminders():
    """Send a 2-hour pre-play reminder for upcoming confirmed bookings (once per booking)."""
    from src.db.session import async_session_factory
    from src.apps.futsal.models.booking import Booking, BookingStatus
    from src.apps.notification.models.notification import NotificationType
    from src.apps.notification.schemas.notification import NotificationCreate
    from src.apps.notification.services.notification import create_notification

    async def _run():
        async with async_session_factory() as db:
            from sqlmodel import select
            now = datetime.now(timezone.utc)
            # Window: bookings starting in 1.75 – 2.25 hours that haven't been reminded yet
            window_start = now + timedelta(hours=1, minutes=45)
            window_end   = now + timedelta(hours=2, minutes=15)

            result = await db.execute(
                select(Booking).where(
                    Booking.status == BookingStatus.CONFIRMED,
                    Booking.pre_play_reminder_sent == False,  # noqa: E712
                )
            )
            notified = 0
            for booking in result.scalars().all():
                start_dt = datetime.combine(booking.booking_date, booking.start_time)
                if not (window_start <= start_dt <= window_end):
                    continue

                time_str = booking.start_time.strftime("%I:%M %p")
                await create_notification(
                    db,
                    NotificationCreate(
                        user_id=booking.user_id,
                        title="⚽ Your match starts in 2 hours!",
                        body=(
                            f"Your futsal slot on {booking.booking_date} at {time_str} "
                            f"is coming up soon. Don't forget your gear!"
                        ),
                        type=NotificationType.INFO,
                        extra_data={
                            "booking_id": booking.id,
                            "booking_date": str(booking.booking_date),
                            "start_time": str(booking.start_time),
                        },
                    ),
                )
                booking.pre_play_reminder_sent = True
                db.add(booking)
                notified += 1

            await db.commit()
            logger.info(f"Sent pre-play reminders for {notified} bookings.")

    try:
        asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        logger.error("send_booking_reminders task failed: %s", exc)


# Register beat schedule
from celery.schedules import crontab  # noqa

celery_app.conf.beat_schedule.update({
    "release-expired-locks": {
        "task": "futsal.release_expired_locks",
        "schedule": 300,  # every 5 minutes
    },
    "update-completed-bookings": {
        "task": "futsal.update_completed_bookings",
        "schedule": 300,  # every 5 minutes
    },
    "send-booking-reminders": {
        "task": "futsal.send_booking_reminders",
        "schedule": 600,  # every 10 minutes for accurate 2-hour window detection
    },
})

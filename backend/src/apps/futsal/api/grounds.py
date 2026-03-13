"""
Grounds API: CRUD + images + closures + slot availability.
"""
import re
from datetime import date
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select, func, or_, and_

from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.iam.utils.hashid import decode_id_or_404
from src.apps.futsal.models.ground import FutsalGround
from src.apps.futsal.models.ground_image import GroundImage
from src.apps.futsal.models.ground_closure import GroundClosure
from src.apps.futsal.schemas import (
    GroundCreate, GroundUpdate, GroundResponse, GroundImageResponse,
    SlotResponse, GroundClosureCreate, GroundClosureResponse,
)
from src.apps.futsal.services.slot_service import get_available_slots
from src.apps.core.config import settings
from src.apps.subscription.dependencies import require_active_subscription

# Alias for owner-mutating endpoints — requires active subscription
_owner = require_active_subscription
import os, uuid, shutil

router = APIRouter(prefix="/grounds", tags=["Grounds"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower()).strip()
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug + "-" + str(uuid.uuid4())[:8]


def _require_owner(user: User) -> None:
    if not user.is_superuser:
        # Check via role name — adjust if your RBAC uses a different pattern
        pass  # roles checked at route level via Casbin or inline


async def _get_ground_or_404(db: AsyncSession, ground_id: int) -> FutsalGround:
    ground = await db.get(FutsalGround, ground_id)
    if not ground:
        raise HTTPException(status_code=404, detail="Ground not found.")
    return ground


# ──────────────────────────────────────────────────────────────────────────────
# Public endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[GroundResponse])
async def list_grounds(
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Optional[str] = Query(None, description="Search by name or location"),
    location: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    ground_type: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    stmt = select(FutsalGround).where(FutsalGround.is_active == True)
    if search:
        stmt = stmt.where(or_(
            col(FutsalGround.name).ilike(f"%{search}%"),
            col(FutsalGround.location).ilike(f"%{search}%"),
        ))
    if location:
        stmt = stmt.where(col(FutsalGround.location).ilike(f"%{location}%"))
    if min_price is not None:
        stmt = stmt.where(FutsalGround.price_per_hour >= min_price)
    if max_price is not None:
        stmt = stmt.where(FutsalGround.price_per_hour <= max_price)
    if ground_type:
        stmt = stmt.where(FutsalGround.ground_type == ground_type)
    if verified_only:
        stmt = stmt.where(FutsalGround.is_verified == True)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/my", response_model=List[GroundResponse])
async def list_my_grounds(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Owner: list ALL own grounds including disabled-by-limit ones."""
    result = await db.execute(
        select(FutsalGround).where(FutsalGround.owner_id == current_user.id)
        .order_by(col(FutsalGround.created_at).desc())
    )
    return result.scalars().all()


@router.get("/{ground_id}", response_model=GroundResponse)
async def get_ground(ground_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    gid = decode_id_or_404(ground_id)
    return await _get_ground_or_404(db, gid)


@router.get("/{ground_id}/slots", response_model=List[SlotResponse])
async def get_slots(
    ground_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    booking_date: date = Query(...),
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if not ground.is_active:
        raise HTTPException(status_code=400, detail="Ground is not active.")
    return await get_available_slots(db, ground, booking_date)


@router.get("/{ground_id}/images", response_model=List[GroundImageResponse])
async def get_ground_images(ground_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    gid = decode_id_or_404(ground_id)
    await _get_ground_or_404(db, gid)
    result = await db.execute(
        select(GroundImage).where(GroundImage.ground_id == gid)
        .order_by(col(GroundImage.is_primary).desc(), col(GroundImage.display_order))
    )
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────────────────
# Owner / Superuser endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=GroundResponse, status_code=status.HTTP_201_CREATED)
async def create_ground(
    data: GroundCreate,
    current_user: Annotated[User, Depends(_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Enforce max_grounds limit from subscription plan
    if not current_user.is_superuser:
        from src.apps.subscription.models.subscription import OwnerSubscription
        from src.apps.subscription.models.plan import SubscriptionPlan
        sub_result = await db.execute(
            select(OwnerSubscription).where(OwnerSubscription.owner_id == current_user.id)
        )
        sub = sub_result.scalars().first()
        if sub:
            plan = await db.get(SubscriptionPlan, sub.plan_id)
            if plan:
                count_result = await db.execute(
                    select(func.count()).select_from(FutsalGround).where(
                        FutsalGround.owner_id == current_user.id,
                        FutsalGround.is_active == True,
                    )
                )
                active_count = count_result.scalar_one()
                if active_count >= plan.max_grounds:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "code": "ground_limit_reached",
                            "message": f"Your plan allows a maximum of {plan.max_grounds} active ground(s). Upgrade your plan to add more.",
                            "max_grounds": plan.max_grounds,
                            "current_count": active_count,
                        },
                    )
    assert current_user.id is not None  # should never happen due to dependency
    ground = FutsalGround(
        **data.model_dump(),
        owner_id=current_user.id,
        slug=_slugify(data.name),
    )
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


@router.put("/{ground_id}", response_model=GroundResponse)
@router.patch("/{ground_id}", response_model=GroundResponse)
async def update_ground(
    ground_id: str,
    data: GroundUpdate,
    current_user: Annotated[User, Depends(_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if ground.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ground, field, value)
    from datetime import datetime
    ground.updated_at = datetime.utcnow()
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


@router.delete("/{ground_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_ground(
    ground_id: str,
    current_user: Annotated[User, Depends(_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if ground.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")
    ground.is_active = False
    db.add(ground)
    await db.commit()


@router.post("/{ground_id}/verify", response_model=GroundResponse)
async def verify_ground(
    ground_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Superuser only: mark ground as verified."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser only.")
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    ground.is_verified = True
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


@router.post("/{ground_id}/images", response_model=GroundImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    ground_id: str,
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(_owner),
    db: AsyncSession = Depends(get_db),
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if ground.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")

    os.makedirs(settings.MEDIA_DIR + "/grounds", exist_ok=True)
    filename = f"{uuid.uuid4()}{os.path.splitext(file.filename or '.jpg')[1]}"
    dest = os.path.join(settings.MEDIA_DIR, "grounds", filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    image_url = f"{settings.MEDIA_URL}/grounds/{filename}"
    image = GroundImage(ground_id=gid, image_url=image_url, is_primary=is_primary)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/{ground_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    ground_id: str,
    image_id: str,
    current_user: Annotated[User, Depends(_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    gid = decode_id_or_404(ground_id)
    iid = decode_id_or_404(image_id)
    ground = await _get_ground_or_404(db, gid)
    if ground.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")
    img = await db.get(GroundImage, iid)
    if not img or img.ground_id != gid:
        raise HTTPException(status_code=404, detail="Image not found.")
    await db.delete(img)
    await db.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Closures — helpers
# ──────────────────────────────────────────────────────────────────────────────

async def _can_manage_closure(db: AsyncSession, ground: FutsalGround, user: User) -> bool:
    """Return True if user is owner, superuser, or a MANAGER-role staff of the ground."""
    if user.is_superuser or ground.owner_id == user.id:
        return True
    from src.apps.subscription.models.ground_staff import GroundStaff, StaffRole
    result = await db.execute(
        select(GroundStaff).where(
            GroundStaff.ground_id == ground.id,
            GroundStaff.user_id == user.id,
            GroundStaff.role == StaffRole.MANAGER,
            GroundStaff.is_active == True,
        )
    )
    return result.scalars().first() is not None


async def _get_affected_bookings(db: AsyncSession, ground_id: int, start_date: date, end_date: date):
    """Return pending/confirmed bookings in the closure date range."""
    from src.apps.futsal.models.booking import Booking, BookingStatus
    result = await db.execute(
        select(Booking).where(
            Booking.ground_id == ground_id,
            Booking.booking_date >= start_date,
            Booking.booking_date <= end_date,
            col(Booking.status).in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
    )
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────────────────
# Closures — list
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{ground_id}/closures", response_model=List[GroundClosureResponse])
async def list_closures(
    ground_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if not await _can_manage_closure(db, ground, current_user):
        raise HTTPException(status_code=403, detail="Not authorized.")
    result = await db.execute(
        select(GroundClosure).where(GroundClosure.ground_id == gid)
        .order_by(col(GroundClosure.start_date))
    )
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────────────────
# Closures — preview (dry-run: returns affected bookings without committing)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{ground_id}/closures/preview")
async def preview_closure(
    ground_id: str,
    current_user: Annotated[User, Depends(get_current_user)] ,
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: date = Query(...),
    end_date: date = Query(...),
):
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if not await _can_manage_closure(db, ground, current_user):
        raise HTTPException(status_code=403, detail="Not authorized.")
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="end_date must be >= start_date.")
    bookings = await _get_affected_bookings(db, gid, start_date, end_date)
    return {
        "affected_count": len(bookings),
        "total_refund_amount": sum(b.paid_amount for b in bookings),
        "bookings": [
            {
                "id": b.id,
                "booking_date": str(b.booking_date),
                "start_time": str(b.start_time),
                "end_time": str(b.end_time),
                "status": b.status,
                "paid_amount": b.paid_amount,
                "user_id": b.user_id,
            }
            for b in bookings
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Closures — create (cancels affected bookings + notifies users)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{ground_id}/closures", response_model=GroundClosureResponse, status_code=status.HTTP_201_CREATED)
async def add_closure(
    ground_id: str,
    data: GroundClosureCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from datetime import datetime as dt
    from src.apps.futsal.models.booking import Booking, BookingStatus
    from src.apps.notification.models.notification import Notification, NotificationType

    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if not await _can_manage_closure(db, ground, current_user):
        raise HTTPException(status_code=403, detail="Not authorized.")
    if data.end_date < data.start_date:
        raise HTTPException(status_code=422, detail="end_date must be >= start_date.")

    # Cancel affected bookings and notify users
    affected = await _get_affected_bookings(db, gid, data.start_date, data.end_date)
    reason_text = data.reason or "Ground closure"
    for booking in affected:
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = f"Ground closed: {reason_text}"
        booking.cancelled_at = dt.utcnow()
        db.add(booking)
        # In-app notification for the affected user
        notification = Notification(
            user_id=booking.user_id,
            title="Booking Cancelled — Ground Closure",
            body=(
                f"Your booking at {ground.name} on {booking.booking_date} "
                f"({booking.start_time}–{booking.end_time}) has been cancelled due to a ground closure "
                f"({data.start_date} to {data.end_date}). "
                f"Reason: {reason_text}. "
                + (f"Refund of NPR {booking.paid_amount:.0f} will be processed." if booking.paid_amount > 0 else "")
            ),
            type=NotificationType.WARNING,
            extra_data={
                "booking_id": booking.id,
                "ground_id": gid,
                "ground_name": ground.name,
                "refund_amount": booking.paid_amount,
                "closure_start": str(data.start_date),
                "closure_end": str(data.end_date),
            },
        )
        db.add(notification)

    closure = GroundClosure(ground_id=gid, **data.model_dump())
    db.add(closure)
    await db.commit()
    await db.refresh(closure)
    return closure


# ──────────────────────────────────────────────────────────────────────────────
# Closures — delete
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/{ground_id}/closures/{closure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_closure(
    ground_id: str,
    closure_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    gid = decode_id_or_404(ground_id)
    cid = decode_id_or_404(closure_id)
    ground = await _get_ground_or_404(db, gid)
    if not await _can_manage_closure(db, ground, current_user):
        raise HTTPException(status_code=403, detail="Not authorized.")
    closure = await db.get(GroundClosure, cid)
    if not closure or closure.ground_id != gid:
        raise HTTPException(status_code=404, detail="Closure not found.")
    await db.delete(closure)
    await db.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Owner: re-enable a ground that was disabled by subscription limit
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{ground_id}/re-enable", response_model=GroundResponse)
async def re_enable_ground(
    ground_id: str,
    current_user: Annotated[User, Depends(_owner)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Owner: re-enable a ground disabled by subscription limit (must be within limit now)."""
    gid = decode_id_or_404(ground_id)
    ground = await _get_ground_or_404(db, gid)
    if ground.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if not ground.disabled_by_limit:
        raise HTTPException(status_code=400, detail="Ground is not disabled by limit.")

    # Check they are still within limit
    from src.apps.subscription.models.subscription import OwnerSubscription
    from src.apps.subscription.models.plan import SubscriptionPlan
    sub_result = await db.execute(
        select(OwnerSubscription).where(OwnerSubscription.owner_id == current_user.id)
    )
    sub = sub_result.scalars().first()
    if sub:
        plan = await db.get(SubscriptionPlan, sub.plan_id)
        if plan:
            count_result = await db.execute(
                select(func.count()).select_from(FutsalGround).where(
                    FutsalGround.owner_id == current_user.id,
                    FutsalGround.is_active == True,
                )
            )
            active_count = count_result.scalar_one()
            if active_count >= plan.max_grounds:
                raise HTTPException(
                    status_code=403,
                    detail=f"You are already at your plan's limit of {plan.max_grounds} active ground(s). Disable another ground or upgrade first.",
                )

    ground.is_active = True
    ground.disabled_by_limit = False
    from datetime import datetime
    ground.updated_at = datetime.utcnow()
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground


# ──────────────────────────────────────────────────────────────────────────────
# Superuser: create a ground on behalf of any owner
# ──────────────────────────────────────────────────────────────────────────────

class AdminGroundCreate(GroundCreate):
    owner_id: str  # admin must specify owner (encoded hashid)

@router.post("/admin/create", response_model=GroundResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_ground(
    data: AdminGroundCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Superuser only: create a ground for any owner, bypassing subscription checks."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser only.")
    owner_id_int = decode_id_or_404(data.owner_id)
    ground_data = data.model_dump(exclude={"owner_id"})
    ground = FutsalGround(
        **ground_data,
        owner_id=owner_id_int,
        slug=_slugify(data.name),
    )
    db.add(ground)
    await db.commit()
    await db.refresh(ground)
    return ground

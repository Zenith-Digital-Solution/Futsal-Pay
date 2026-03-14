"""Reviews API: CRUD + owner reply."""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import datetime, timezone

from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.iam.utils.hashid import decode_id_or_404
from src.apps.futsal.models.ground import FutsalGround
from src.apps.futsal.models.booking import Booking, BookingStatus
from src.apps.futsal.models.review import Review
from src.apps.futsal.schemas import ReviewCreate, ReviewResponse, OwnerReplyCreate, DirectReviewCreate
from src.apps.core.analytics import analytics

router = APIRouter(tags=["Reviews"])


@router.get("/grounds/{ground_id}/reviews", response_model=List[ReviewResponse])
async def list_reviews(ground_id: str, db: Annotated[AsyncSession, Depends(get_db)]):
    gid = decode_id_or_404(ground_id)
    result = await db.execute(
        select(Review).where(Review.ground_id == gid)
        .order_by(Review.created_at.desc())
    )
    return result.scalars().all()


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review_direct(
    data: DirectReviewCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit a review using ground_id + booking_id in the request body.
    The booking must be COMPLETED and not already reviewed.
    """
    gid = decode_id_or_404(data.ground_id)
    bid = decode_id_or_404(data.booking_id)

    booking = await db.get(Booking, bid)
    if not booking or booking.user_id != current_user.id or booking.ground_id != gid:
        raise HTTPException(status_code=400, detail="Invalid booking.")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="You can only review a ground after your booking is completed.",
        )

    existing = await db.execute(select(Review).where(Review.booking_id == bid))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="You already reviewed this booking.")

    review = Review(
        user_id=current_user.id,
        ground_id=gid,
        booking_id=bid,
        rating=data.rating,
        comment=data.comment,
        image_url=data.image_url,
        is_verified=True,
    )
    db.add(review)

    ground = await db.get(FutsalGround, gid)
    if ground:
        total = ground.average_rating * ground.rating_count + data.rating
        ground.rating_count += 1
        ground.average_rating = round(total / ground.rating_count, 2)
        db.add(ground)

    await db.commit()
    await db.refresh(review)

    analytics.track(
        distinct_id=str(current_user.id),
        event="review_submitted",
        properties={"ground_id": gid, "rating": data.rating, "booking_id": bid},
    )
    return review


@router.post("/grounds/{ground_id}/reviews", response_model=ReviewResponse,
             status_code=status.HTTP_201_CREATED)
async def create_review(
    ground_id: str,
    data: ReviewCreate,
    booking_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """User can only review a ground if they have a COMPLETED booking there."""
    gid = decode_id_or_404(ground_id)
    bid = decode_id_or_404(booking_id)
    # Verify booking eligibility
    booking = await db.get(Booking, bid)
    if not booking or booking.user_id != current_user.id or booking.ground_id != gid:
        raise HTTPException(status_code=400, detail="Invalid booking.")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="You can only review after completing a booking.")

    # Check duplicate review
    existing = await db.execute(
        select(Review).where(Review.booking_id == bid)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="You already reviewed this booking.")

    review = Review(
        user_id=current_user.id,
        ground_id=gid,
        booking_id=bid,
        **data.model_dump(),
        is_verified=True,
    )
    db.add(review)

    # Update ground's average rating
    ground = await db.get(FutsalGround, gid)
    if ground:
        total = ground.average_rating * ground.rating_count + data.rating
        ground.rating_count += 1
        ground.average_rating = round(total / ground.rating_count, 2)
        db.add(ground)

    await db.commit()
    await db.refresh(review)

    analytics.track(
        distinct_id=str(current_user.id),
        event="review_submitted",
        properties={
            "ground_id": gid,
            "rating": data.rating,
            "booking_id": bid,
        },
    )
    return review


@router.get("/reviews/my", response_model=List[ReviewResponse])
async def my_reviews(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
):
    """Return all reviews written by the current user."""
    result = await db.execute(
        select(Review)
        .where(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    data: ReviewCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    rid = decode_id_or_404(review_id)
    review = await db.get(Review, rid)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(review, k, v)
    review.updated_at = datetime.now(timezone.utc)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    rid = decode_id_or_404(review_id)
    review = await db.get(Review, rid)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    if review.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized.")
    await db.delete(review)
    await db.commit()


@router.post("/reviews/{review_id}/reply", response_model=ReviewResponse)
async def owner_reply(
    review_id: str,
    data: OwnerReplyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Ground owner replies to a review."""
    rid = decode_id_or_404(review_id)
    review = await db.get(Review, rid)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    ground = await db.get(FutsalGround, review.ground_id)
    if not ground or ground.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    review.owner_reply = data.reply
    review.owner_replied_at = datetime.now(timezone.utc)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review

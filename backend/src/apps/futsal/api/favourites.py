"""Favourites and Waitlist API."""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.exc import IntegrityError

from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.iam.utils.hashid import decode_id_or_404, encode_id
from src.apps.futsal.models.favourite import FavouriteGround
from src.apps.futsal.models.waitlist import WaitlistEntry
from src.apps.futsal.schemas import GroundClosureCreate

router = APIRouter(tags=["Favourites & Waitlist"])


@router.post("/favourites/{ground_id}", status_code=status.HTTP_201_CREATED)
async def toggle_favourite(
    ground_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Toggle favourite. Returns {added: true/false}."""
    gid = decode_id_or_404(ground_id)
    existing = await db.execute(
        select(FavouriteGround).where(
            FavouriteGround.user_id == current_user.id,
            FavouriteGround.ground_id == gid,
        )
    )
    fav = existing.scalars().first()
    if fav:
        await db.delete(fav)
        await db.commit()
        return {"added": False, "ground_id": ground_id}
    try:
        fav = FavouriteGround(user_id=current_user.id, ground_id=gid)
        db.add(fav)
        await db.commit()
        return {"added": True, "ground_id": ground_id}
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Already favourited.")


@router.get("/favourites", response_model=List[dict])
async def list_favourites(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(FavouriteGround).where(FavouriteGround.user_id == current_user.id)
    )
    return [
        {"id": encode_id(f.id), "ground_id": encode_id(f.ground_id), "created_at": f.created_at}
        for f in result.scalars().all()
    ]


@router.post("/waitlist", status_code=status.HTTP_201_CREATED)
async def join_waitlist(
    entry: WaitlistEntry,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Join waitlist for a specific slot."""
    waitlist = WaitlistEntry(
        user_id=current_user.id,
        ground_id=entry.ground_id,
        booking_date=entry.booking_date,
        start_time=entry.start_time,
        end_time=entry.end_time,
    )
    db.add(waitlist)
    await db.commit()
    await db.refresh(waitlist)
    return waitlist


@router.delete("/waitlist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def leave_waitlist(
    entry_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    eid = decode_id_or_404(entry_id)
    entry = await db.get(WaitlistEntry, eid)
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Waitlist entry not found.")
    await db.delete(entry)
    await db.commit()

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.bag import get_bag_clubs, replace_bag
from app.database import get_db
from app.schemas import BagClubRead, BagUpdate

router = APIRouter(prefix="/bag", tags=["bag"])


@router.get("", response_model=list[BagClubRead])
async def get_bag(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import BagClub

    await get_bag_clubs(db)  # seed if empty
    result = await db.execute(select(BagClub).order_by(BagClub.sort_order))
    return list(result.scalars().all())


@router.put("", response_model=list[str])
async def put_bag(payload: BagUpdate, db: AsyncSession = Depends(get_db)):
    return await replace_bag(db, payload.clubs)

DEFAULT_BAG = [
    "Driver", "3M", "5M", "4H", "5H", "4I", "5I", "6I", "7I", "8I", "9I",
    "PW", "GW", "SW", "LW", "Putter",
]


async def get_bag_clubs(db) -> list[str]:
    from sqlalchemy import select
    from app.models import BagClub

    result = await db.execute(select(BagClub).order_by(BagClub.sort_order))
    clubs = list(result.scalars().all())
    if not clubs:
        for i, name in enumerate(DEFAULT_BAG, start=1):
            db.add(BagClub(name=name, sort_order=i))
        await db.commit()
        result = await db.execute(select(BagClub).order_by(BagClub.sort_order))
        clubs = list(result.scalars().all())
    return [c.name for c in clubs]


async def replace_bag(db, club_names: list[str]) -> list[str]:
    from sqlalchemy import delete
    from app.models import BagClub

    cleaned = [n.strip() for n in club_names if n.strip()]
    if not cleaned:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bag cannot be empty")

    await db.execute(delete(BagClub))
    for i, name in enumerate(cleaned, start=1):
        db.add(BagClub(name=name, sort_order=i))
    await db.commit()
    return cleaned

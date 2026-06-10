"""Filtros compartidos para estadísticas."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Hole, Round


class RoundRange(str, Enum):
    last_5 = "last_5"
    last_10 = "last_10"
    last_20 = "last_20"
    season = "season"
    all = "all"


class HolesFilter(str, Enum):
    h9 = "9"
    h18 = "18"
    both_normalized = "both_normalized"


async def load_rounds(db: AsyncSession) -> list[Round]:
    result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    return list(result.scalars().all())


def filter_rounds(
    rounds: list[Round],
    *,
    round_range: RoundRange,
    holes_filter: HolesFilter,
    course: str | None,
) -> list[Round]:
    filtered = [r for r in rounds if any(h.completed for h in r.holes)]
    if course:
        filtered = [r for r in filtered if r.course_name == course]
    if holes_filter == HolesFilter.h9:
        filtered = [r for r in filtered if r.planned_holes == 9]
    elif holes_filter == HolesFilter.h18:
        filtered = [r for r in filtered if r.planned_holes == 18]

    filtered.sort(key=lambda r: r.played_at, reverse=True)

    if round_range == RoundRange.all:
        return filtered
    if round_range == RoundRange.season:
        year = datetime.now(timezone.utc).year
        return [r for r in filtered if r.played_at.year == year]
    limits = {RoundRange.last_5: 5, RoundRange.last_10: 10, RoundRange.last_20: 20}
    return filtered[: limits[round_range]]


def available_courses(rounds: list[Round]) -> list[str]:
    names = {r.course_name for r in rounds if any(h.completed for h in r.holes)}
    return sorted(names, key=str.lower)

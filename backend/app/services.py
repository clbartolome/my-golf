import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.enums import (
    PENALTY_TRIGGER_RESULTS,
    PenaltyReason,
    PenaltyRelief,
    ShotResult,
    ShotType,
)
from app.models import Hole, Round, Shot
from app.schemas import HoleCreate, NextShotHint, PenaltyCreate, RoundCreate, RoundUpdate, ShotCreate


async def get_round_or_404(db: AsyncSession, round_id: uuid.UUID) -> Round:
    result = await db.execute(select(Round).where(Round.id == round_id))
    round_ = result.scalar_one_or_none()
    if round_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")
    return round_


async def get_hole_or_404(db: AsyncSession, hole_id: uuid.UUID) -> Hole:
    result = await db.execute(
        select(Hole).options(selectinload(Hole.shots)).where(Hole.id == hole_id)
    )
    hole = result.scalar_one_or_none()
    if hole is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hole not found")
    return hole


async def create_round(db: AsyncSession, payload: RoundCreate) -> Round:
    data = payload.model_dump(exclude_unset=True)
    round_ = Round(**data)
    db.add(round_)
    await db.commit()
    await db.refresh(round_)
    return round_


async def update_round(db: AsyncSession, round_id: uuid.UUID, payload: RoundUpdate) -> Round:
    round_ = await get_round_or_404(db, round_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(round_, field, value)
    await db.commit()
    await db.refresh(round_)
    return round_


async def delete_round(db: AsyncSession, round_id: uuid.UUID) -> None:
    round_ = await get_round_or_404(db, round_id)
    await db.delete(round_)
    await db.commit()


async def list_rounds(
    db: AsyncSession,
    *,
    status_filter: str | None = None,
    course_name: str | None = None,
) -> list[Round]:
    query = select(Round).order_by(Round.played_at.desc())
    if status_filter:
        query = query.where(Round.status == status_filter)
    if course_name:
        query = query.where(Round.course_name.ilike(f"%{course_name}%"))
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_round_detail(db: AsyncSession, round_id: uuid.UUID) -> Round:
    result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .where(Round.id == round_id)
    )
    round_ = result.scalar_one_or_none()
    if round_ is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")
    return round_


async def create_hole(db: AsyncSession, round_id: uuid.UUID, payload: HoleCreate) -> Hole:
    round_ = await get_round_or_404(db, round_id)
    if payload.hole_number > round_.planned_holes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This round only has {round_.planned_holes} holes",
        )

    existing = await db.execute(
        select(Hole).where(Hole.round_id == round_id, Hole.hole_number == payload.hole_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hole already started")

    hole = Hole(round_id=round_id, **payload.model_dump())
    db.add(hole)
    await db.commit()

    result = await db.execute(
        select(Hole).options(selectinload(Hole.shots)).where(Hole.id == hole.id)
    )
    return result.scalar_one()


def _next_stroke_number(shots: list[Shot]) -> int:
    if not shots:
        return 1
    return max(shot.stroke_number for shot in shots) + 1


def _last_normal_shot(shots: list[Shot]) -> Shot | None:
    normal = [s for s in shots if s.shot_type == ShotType.normal]
    return normal[-1] if normal else None


def _resolve_distance_before(hole: Hole, shots: list[Shot], provided: Decimal | None) -> Decimal:
    if provided is not None:
        return provided

    if not shots:
        return hole.starting_distance

    last = shots[-1]
    if last.shot_type == ShotType.penalty:
        if provided is not None:
            return provided
        trigger = _last_normal_shot(shots)
        if trigger and trigger.distance_before is not None:
            return trigger.distance_before
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="distance_before is required after a drop (use next_shot_hint from penalty response)",
        )

    if last.distance_after is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Previous shot has no distance_after; resolve penalty before continuing",
        )

    return last.distance_after


def _penalty_reason_from_result(result: ShotResult) -> PenaltyReason | None:
    mapping = {
        ShotResult.ob: PenaltyReason.ob,
        ShotResult.water: PenaltyReason.water,
        ShotResult.lost: PenaltyReason.lost,
        ShotResult.unplayable: PenaltyReason.unplayable,
    }
    return mapping.get(result)


def _should_exclude_from_stats(result: ShotResult, distance_after: Decimal | None) -> bool:
    if result in PENALTY_TRIGGER_RESULTS and distance_after is None:
        return True
    return result in PENALTY_TRIGGER_RESULTS


async def create_shot(db: AsyncSession, hole_id: uuid.UUID, payload: ShotCreate):
    hole = await get_hole_or_404(db, hole_id)
    if hole.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hole already completed")

    shots = sorted(hole.shots, key=lambda s: s.stroke_number)
    if (
        shots
        and shots[-1].shot_type == ShotType.normal
        and shots[-1].distance_after is None
        and shots[-1].result not in PENALTY_TRIGGER_RESULTS
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Previous shot has no distance_after",
        )
    if shots and shots[-1].shot_type == ShotType.normal and shots[-1].result in PENALTY_TRIGGER_RESULTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Previous shot awaits penalty resolution",
        )

    distance_before = _resolve_distance_before(hole, shots, payload.distance_before)
    distance_after = payload.distance_after
    if payload.result == ShotResult.holed and distance_after is None:
        distance_after = Decimal("0")

    shot = Shot(
        hole_id=hole.id,
        stroke_number=_next_stroke_number(shots),
        shot_type=ShotType.normal,
        club=payload.club.strip(),
        distance_before=distance_before,
        distance_after=distance_after,
        distance_unit=payload.distance_unit,
        result=payload.result,
        miss_line=payload.miss_line,
        exclude_from_stats=_should_exclude_from_stats(payload.result, distance_after),
    )
    db.add(shot)

    penalty_required = payload.result in PENALTY_TRIGGER_RESULTS and distance_after is None
    if payload.result == ShotResult.holed or distance_after == Decimal("0"):
        from datetime import UTC, datetime

        hole.completed = True
        hole.completed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(shot)

    suggested = _penalty_reason_from_result(payload.result) if penalty_required else None
    return shot, penalty_required, suggested


async def create_penalty(db: AsyncSession, hole_id: uuid.UUID, payload: PenaltyCreate):
    hole = await get_hole_or_404(db, hole_id)
    if hole.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hole already completed")

    shots = sorted(hole.shots, key=lambda s: s.stroke_number)
    if not shots:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No shot to penalize")
    if shots[-1].shot_type == ShotType.penalty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Penalty already pending relief")

    last_normal = _last_normal_shot(shots)
    if last_normal is None or last_normal.result not in PENALTY_TRIGGER_RESULTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Last shot does not require a penalty",
        )

    expected_reason = _penalty_reason_from_result(last_normal.result)
    if payload.reason != expected_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Penalty reason must match last shot ({expected_reason.value})",
        )

    penalty = Shot(
        hole_id=hole.id,
        stroke_number=_next_stroke_number(shots),
        shot_type=ShotType.penalty,
        penalty_reason=payload.reason,
    )
    db.add(penalty)
    await db.commit()
    await db.refresh(penalty)

    if payload.relief == PenaltyRelief.replay:
        if last_normal.distance_before is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot replay without distance_before")
        hint = NextShotHint(
            distance_before=last_normal.distance_before,
            distance_unit=last_normal.distance_unit or hole.starting_unit,
        )
    else:
        hint = NextShotHint(
            distance_before=payload.drop_distance,  # type: ignore[arg-type]
            distance_unit=payload.drop_unit,  # type: ignore[arg-type]
        )

    return penalty, hint

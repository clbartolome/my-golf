"""Exportación e importación de todos los datos de la app."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.bag import get_bag_clubs
from app.models import BagClub, Hole, Round, Shot
from app.schemas import BackupExport, BackupImportResult, ExportHole, ExportRound, ExportShot

BACKUP_VERSION = 1


class ImportMode(str, Enum):
    replace = "replace"
    merge = "merge"


async def export_all(db: AsyncSession) -> BackupExport:
    bag = await get_bag_clubs(db)

    rounds_result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.asc())
    )
    rounds = rounds_result.scalars().all()

    export_rounds: list[ExportRound] = []
    for round_ in rounds:
        holes = sorted(round_.holes, key=lambda h: h.hole_number)
        export_rounds.append(
            ExportRound(
                course_name=round_.course_name,
                tees=round_.tees,
                wind=round_.wind,
                planned_holes=round_.planned_holes,
                played_at=round_.played_at,
                status=round_.status,
                notes=round_.notes,
                course_rating=round_.course_rating,
                slope_rating=round_.slope_rating,
                holes=[
                    ExportHole(
                        hole_number=h.hole_number,
                        par=h.par,
                        starting_distance=h.starting_distance,
                        starting_unit=h.starting_unit,
                        completed=h.completed,
                        completed_at=h.completed_at,
                        shots=[
                            ExportShot(
                                stroke_number=s.stroke_number,
                                shot_type=s.shot_type,
                                club=s.club,
                                distance_before=s.distance_before,
                                distance_after=s.distance_after,
                                distance_unit=s.distance_unit,
                                result=s.result,
                                miss_line=s.miss_line,
                                penalty_reason=s.penalty_reason,
                                exclude_from_stats=s.exclude_from_stats,
                            )
                            for s in sorted(h.shots, key=lambda x: x.stroke_number)
                        ],
                    )
                    for h in holes
                ],
            )
        )

    return BackupExport(
        version=BACKUP_VERSION,
        exported_at=datetime.now(UTC),
        bag=bag,
        rounds=export_rounds,
    )


async def _clear_all(db: AsyncSession) -> None:
    await db.execute(delete(Round))
    await db.execute(delete(BagClub))
    await db.flush()


async def _insert_rounds(db: AsyncSession, rounds: list[ExportRound]) -> int:
    for rd in rounds:
        round_ = Round(
            course_name=rd.course_name,
            tees=rd.tees,
            wind=rd.wind,
            planned_holes=rd.planned_holes,
            played_at=rd.played_at,
            status=rd.status,
            notes=rd.notes,
            course_rating=rd.course_rating,
            slope_rating=rd.slope_rating,
        )
        db.add(round_)
        await db.flush()

        for hd in rd.holes:
            hole = Hole(
                round_id=round_.id,
                hole_number=hd.hole_number,
                par=hd.par,
                starting_distance=hd.starting_distance,
                starting_unit=hd.starting_unit,
                completed=hd.completed,
                completed_at=hd.completed_at,
            )
            db.add(hole)
            await db.flush()

            for sd in hd.shots:
                db.add(
                    Shot(
                        hole_id=hole.id,
                        stroke_number=sd.stroke_number,
                        shot_type=sd.shot_type,
                        club=sd.club,
                        distance_before=sd.distance_before,
                        distance_after=sd.distance_after,
                        distance_unit=sd.distance_unit,
                        result=sd.result,
                        miss_line=sd.miss_line,
                        penalty_reason=sd.penalty_reason,
                        exclude_from_stats=sd.exclude_from_stats,
                    )
                )

    await db.flush()
    return len(rounds)


async def _set_bag(db: AsyncSession, names: list[str]) -> None:
    cleaned = [n.strip() for n in names if n.strip()]
    if not cleaned:
        return
    await db.execute(delete(BagClub))
    for i, name in enumerate(cleaned, start=1):
        db.add(BagClub(name=name, sort_order=i))


async def import_all(
    db: AsyncSession,
    payload: BackupExport,
    mode: ImportMode,
) -> BackupImportResult:
    if payload.version != BACKUP_VERSION:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported backup version {payload.version}",
        )

    if mode == ImportMode.replace:
        await _clear_all(db)
    elif not payload.rounds and not payload.bag:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Backup is empty")

    rounds_imported = await _insert_rounds(db, payload.rounds)

    bag_count = len(payload.bag)
    if payload.bag:
        await _set_bag(db, payload.bag)
    elif mode == ImportMode.replace:
        bag_count = 0

    await db.commit()
    return BackupImportResult(
        mode=mode.value,
        rounds_imported=rounds_imported,
        bag_clubs=bag_count,
    )

from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.enums import DistanceUnit, RoundStatus, ShotResult, ShotType
from app.green import update_on_green
from app.models import Hole, Round, Shot
from app.handicap import (
    EligibleRound,
    build_eligible_round,
    compute_handicap,
    handicap_history,
    score_differential,
)
from app.schemas import (
    ClubDistanceStat,
    ClubTrendPoint,
    ClubTrendSeries,
    CourseStats,
    HandicapDifferentialRead,
    HandicapHistoryPoint,
    HandicapStats,
    HoleStats,
    OverviewStats,
    RoundStats,
    RoundSummaryStats,
    ScoringTrendPoint,
    ShotAnalysisOverview,
    PhaseMissStats,
    ProximityBucket,
    ClubMissStats,
)
from app.shot_analytics import (
    ShotPhase,
    aggregate_by_club,
    aggregate_phase,
    collect_analyzed_shots,
    proximity_buckets,
)


def _is_gir(par: int, normal_shots: list[Shot]) -> bool:
    strokes_to_green = 0
    for shot in normal_shots:
        strokes_to_green += 1
        if shot.result in (ShotResult.green, ShotResult.holed):
            return strokes_to_green <= par - 2
    return False


def _count_putts(normal_shots: list[Shot]) -> int:
    """Putts = golpes en el green, sin contar el approach que te pone en él."""
    on_green = False
    putts = 0
    for shot in normal_shots:
        if on_green:
            putts += 1
        if shot.result == ShotResult.holed:
            return putts
        on_green = update_on_green(on_green, shot.result)
    return putts


def _is_fir(par: int, normal_shots: list[Shot]) -> bool | None:
    if par < 4 or not normal_shots:
        return None
    return normal_shots[0].result == ShotResult.fairway


def _hole_stats(hole: Hole) -> HoleStats | None:
    if not hole.completed:
        return None

    shots = sorted(hole.shots, key=lambda s: s.stroke_number)
    normal = [s for s in shots if s.shot_type == ShotType.normal]
    strokes = len(shots)
    penalties = sum(1 for s in shots if s.shot_type == ShotType.penalty)

    return HoleStats(
        hole_id=hole.id,
        hole_number=hole.hole_number,
        par=hole.par,
        strokes=strokes,
        score_vs_par=strokes - hole.par,
        putts=_count_putts(normal),
        gir=_is_gir(hole.par, normal),
        fir=_is_fir(hole.par, normal),
        penalties=penalties,
    )


def _aggregate_hole_stats(hole_stats: list[HoleStats]) -> dict:
    total_holes = len(hole_stats)
    fir_opps = [h for h in hole_stats if h.fir is not None]

    def _avg(values: list[int]) -> Decimal | None:
        if not values:
            return None
        return (Decimal(sum(values)) / Decimal(len(values))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    gir_pct = None
    if total_holes:
        gir_pct = (
            Decimal(sum(1 for h in hole_stats if h.gir)) / Decimal(total_holes) * 100
        ).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    fir_pct = None
    if fir_opps:
        fir_pct = (
            Decimal(sum(1 for h in fir_opps if h.fir)) / Decimal(len(fir_opps)) * 100
        ).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    return {
        "total_strokes": sum(h.strokes for h in hole_stats),
        "total_par": sum(h.par for h in hole_stats),
        "putts": sum(h.putts for h in hole_stats),
        "gir_count": sum(1 for h in hole_stats if h.gir),
        "gir_opportunities": total_holes,
        "fir_count": sum(1 for h in fir_opps if h.fir),
        "fir_opportunities": len(fir_opps),
        "penalty_strokes": sum(h.penalties for h in hole_stats),
        "avg_score_vs_par": _avg([h.score_vs_par for h in hole_stats]),
        "avg_putts_per_hole": _avg([h.putts for h in hole_stats]),
        "gir_pct": gir_pct,
        "fir_pct": fir_pct,
    }


def _round_hole_stats(round_: Round) -> list[HoleStats]:
    return [hs for h in round_.holes if (hs := _hole_stats(h))]


async def round_stats(db: AsyncSession, round_id: UUID) -> RoundStats:
    result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .where(Round.id == round_id)
    )
    round_ = result.scalar_one_or_none()
    if round_ is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")

    hole_stats = _round_hole_stats(round_)
    total_strokes = sum(h.strokes for h in hole_stats)
    total_par = sum(h.par for h in hole_stats)
    putts = sum(h.putts for h in hole_stats)
    gir_count = sum(1 for h in hole_stats if h.gir)
    fir_opportunities = [h for h in hole_stats if h.fir is not None]
    fir_count = sum(1 for h in fir_opportunities if h.fir)
    penalty_strokes = sum(h.penalties for h in hole_stats)

    return RoundStats(
        round_id=round_.id,
        course_name=round_.course_name,
        played_at=round_.played_at,
        total_strokes=total_strokes,
        total_par=total_par,
        score_vs_par=total_strokes - total_par,
        putts=putts,
        gir_count=gir_count,
        gir_opportunities=len(hole_stats),
        fir_count=fir_count,
        fir_opportunities=len(fir_opportunities),
        penalty_strokes=penalty_strokes,
        holes=sorted(hole_stats, key=lambda h: h.hole_number),
    )


async def overview_stats(db: AsyncSession) -> OverviewStats:
    rounds_result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    rounds = list(rounds_result.scalars().all())

    all_hole_stats: list[HoleStats] = []
    for round_ in rounds:
        all_hole_stats.extend(_round_hole_stats(round_))

    agg = _aggregate_hole_stats(all_hole_stats)

    club_result = await db.execute(
        text(
            """
            SELECT club, distance_unit, COUNT(*) AS shots,
                   AVG(distance_before - distance_after) AS avg_distance
            FROM shots
            WHERE shot_type = 'normal'
              AND NOT exclude_from_stats
              AND distance_before IS NOT NULL
              AND distance_after IS NOT NULL
            GROUP BY club, distance_unit
            ORDER BY club
            """
        )
    )
    club_distances = [
        ClubDistanceStat(
            club=row.club,
            shots=row.shots,
            avg_distance=Decimal(str(row.avg_distance)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
            unit=DistanceUnit(row.distance_unit),
        )
        for row in club_result
    ]

    return OverviewStats(
        rounds_total=len(rounds),
        rounds_completed=sum(1 for r in rounds if r.status == RoundStatus.completed),
        total_holes=len(all_hole_stats),
        avg_score_vs_par=agg["avg_score_vs_par"],
        avg_putts_per_hole=agg["avg_putts_per_hole"],
        gir_pct=agg["gir_pct"],
        fir_pct=agg["fir_pct"],
        penalty_strokes=agg["penalty_strokes"],
        club_distances=club_distances,
    )


async def all_rounds_stats(db: AsyncSession) -> list[RoundSummaryStats]:
    rounds_result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    summaries: list[RoundSummaryStats] = []
    for round_ in rounds_result.scalars().all():
        hole_stats = _round_hole_stats(round_)
        agg = _aggregate_hole_stats(hole_stats)
        summaries.append(
            RoundSummaryStats(
                round_id=round_.id,
                course_name=round_.course_name,
                played_at=round_.played_at,
                status=round_.status,
                tees=round_.tees,
                wind=round_.wind,
                planned_holes=round_.planned_holes,
                holes_completed=len(hole_stats),
                total_strokes=agg["total_strokes"],
                total_par=agg["total_par"],
                score_vs_par=agg["total_strokes"] - agg["total_par"],
                putts=agg["putts"],
                gir_count=agg["gir_count"],
                gir_opportunities=agg["gir_opportunities"],
                fir_count=agg["fir_count"],
                fir_opportunities=agg["fir_opportunities"],
                penalty_strokes=agg["penalty_strokes"],
            )
        )
    return summaries


async def stats_by_course(db: AsyncSession) -> list[CourseStats]:
    rounds_result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    by_course: dict[str, list[HoleStats]] = {}
    round_counts: dict[str, int] = {}
    for round_ in rounds_result.scalars().all():
        hole_stats = _round_hole_stats(round_)
        if not hole_stats:
            continue
        by_course.setdefault(round_.course_name, []).extend(hole_stats)
        round_counts[round_.course_name] = round_counts.get(round_.course_name, 0) + 1

    results: list[CourseStats] = []
    for course_name, hole_stats in sorted(by_course.items(), key=lambda x: x[0].lower()):
        agg = _aggregate_hole_stats(hole_stats)
        results.append(
            CourseStats(
                course_name=course_name,
                rounds=round_counts[course_name],
                holes=len(hole_stats),
                avg_score_vs_par=agg["avg_score_vs_par"],
                avg_putts_per_hole=agg["avg_putts_per_hole"],
                gir_pct=agg["gir_pct"],
                fir_pct=agg["fir_pct"],
                penalty_strokes=agg["penalty_strokes"],
            )
        )
    return results


async def _load_all_rounds(db: AsyncSession) -> list[Round]:
    result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    return list(result.scalars().all())


def _eligible_from_round(round_: Round) -> EligibleRound | None:
    hole_stats = _round_hole_stats(round_)
    if not hole_stats:
        return None
    total_strokes = sum(h.strokes for h in hole_stats)
    total_par = sum(h.par for h in hole_stats)
    return build_eligible_round(
        round_id=round_.id,
        played_at=round_.played_at,
        course_name=round_.course_name,
        total_strokes=total_strokes,
        total_par=total_par,
        course_rating=round_.course_rating,
        slope_rating=round_.slope_rating,
        holes_completed=len(hole_stats),
        planned_holes=round_.planned_holes,
    )


async def handicap_stats(db: AsyncSession) -> HandicapStats:
    rounds = await _load_all_rounds(db)
    eligible = [e for r in rounds if (e := _eligible_from_round(r))]

    index, sorted_rounds, used_ids = compute_handicap(eligible)
    history_raw = handicap_history(eligible)

    differentials = [
        HandicapDifferentialRead(
            round_id=r.round_id,
            played_at=r.played_at,
            course_name=r.course_name,
            total_strokes=r.total_strokes,
            course_rating=r.course_rating,
            differential=r.differential,
            used_in_index=r.round_id in used_ids,
        )
        for r in sorted_rounds
    ]

    return HandicapStats(
        handicap_index=index,
        eligible_rounds=len(eligible),
        rounds_needed=max(0, 3 - len(eligible)),
        differentials=differentials,
        history=[
            HandicapHistoryPoint(played_at=d, handicap_index=idx) for d, idx in history_raw
        ],
    )


async def scoring_trends(db: AsyncSession) -> list[ScoringTrendPoint]:
    rounds = await _load_all_rounds(db)
    points: list[ScoringTrendPoint] = []
    for round_ in sorted(rounds, key=lambda r: r.played_at):
        hole_stats = _round_hole_stats(round_)
        if not hole_stats:
            continue
        total_strokes = sum(h.strokes for h in hole_stats)
        total_par = sum(h.par for h in hole_stats)
        eligible = _eligible_from_round(round_)
        diff = eligible.differential if eligible else None
        points.append(
            ScoringTrendPoint(
                round_id=round_.id,
                played_at=round_.played_at,
                course_name=round_.course_name,
                total_strokes=total_strokes,
                total_par=total_par,
                score_vs_par=total_strokes - total_par,
                holes_completed=len(hole_stats),
                planned_holes=round_.planned_holes,
                differential=diff,
            )
        )
    return points


async def club_trends(db: AsyncSession) -> list[ClubTrendSeries]:
    rounds = await _load_all_rounds(db)
    by_club: dict[str, list[ClubTrendPoint]] = {}

    for round_ in sorted(rounds, key=lambda r: r.played_at):
        club_shots: dict[str, list[Decimal]] = {}
        unit_map: dict[str, DistanceUnit] = {}
        for hole in round_.holes:
            for shot in hole.shots:
                if (
                    shot.shot_type != ShotType.normal
                    or shot.exclude_from_stats
                    or shot.distance_before is None
                    or shot.distance_after is None
                    or not shot.club
                ):
                    continue
                dist = shot.distance_before - shot.distance_after
                club_shots.setdefault(shot.club, []).append(dist)
                unit_map[shot.club] = shot.distance_unit or DistanceUnit.m

        for club, distances in club_shots.items():
            avg = (sum(distances) / Decimal(len(distances))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            point = ClubTrendPoint(
                round_id=round_.id,
                played_at=round_.played_at,
                club=club,
                shots=len(distances),
                avg_distance=avg,
                unit=unit_map[club],
            )
            by_club.setdefault(club, []).append(point)

    return [
        ClubTrendSeries(club=club, points=pts)
        for club, pts in sorted(by_club.items(), key=lambda x: x[0])
    ]


def _phase_stats(data: dict) -> PhaseMissStats:
    return PhaseMissStats(**data)


def _club_stats(data: dict) -> ClubMissStats:
    return ClubMissStats(**data)


async def shot_analysis(db: AsyncSession) -> ShotAnalysisOverview:
    rounds = await _load_all_rounds(db)
    shots = collect_analyzed_shots(rounds)

    return ShotAnalysisOverview(
        total_shots=len(shots),
        tee=_phase_stats(aggregate_phase(shots, ShotPhase.tee)),
        approach=_phase_stats(aggregate_phase(shots, ShotPhase.approach)),
        putt=_phase_stats(aggregate_phase(shots, ShotPhase.putt)),
        proximity_buckets=[ProximityBucket(**b) for b in proximity_buckets(shots)],
        by_club=[_club_stats(c) for c in aggregate_by_club(shots)],
    )

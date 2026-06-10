"""Distancias reales por palo (carry) ordenadas por bolsa."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.bag import get_bag_clubs
from app.club_analysis import (
    MIN_SAMPLE_DEFAULT,
    _collect_club_shots,
    _eligible,
    _percentile,
    _q,
)
from app.schemas import (
    ClubDistanceDetail,
    DistanceAnalysisResponse,
    DistanceHistogramBar,
    DistanceMapEntry,
    DistanceRow,
)
from app.shot_analytics import _is_putter
from app.stats_filters import HolesFilter, RoundRange, available_courses, filter_rounds, load_rounds


def _stats(carries: list[float]) -> dict:
    if not carries:
        return {
            "avg_m": None,
            "median_m": None,
            "min_m": None,
            "max_m": None,
            "p10_m": None,
            "p25_m": None,
            "p75_m": None,
            "p90_m": None,
        }
    return {
        "avg_m": _q(sum(carries) / len(carries)),
        "median_m": _percentile(carries, 50),
        "min_m": _q(min(carries), "0"),
        "max_m": _q(max(carries), "0"),
        "p10_m": _percentile(carries, 10),
        "p25_m": _percentile(carries, 25),
        "p75_m": _percentile(carries, 75),
        "p90_m": _percentile(carries, 90),
    }


def _histogram(carries: list[float], bucket_m: int = 10) -> list[DistanceHistogramBar]:
    if not carries:
        return []
    lo = int(min(carries) // bucket_m * bucket_m)
    hi = int(max(carries) // bucket_m * bucket_m) + bucket_m
    buckets: dict[str, int] = {}
    for c in carries:
        start = int(c // bucket_m * bucket_m)
        label = f"{start}–{start + bucket_m}m"
        buckets[label] = buckets.get(label, 0) + 1
    return [
        DistanceHistogramBar(label=k, count=v)
        for k, v in sorted(buckets.items(), key=lambda x: int(x[0].split("–")[0]))
    ]


def _build_detail(club: str, carries: list[float]) -> ClubDistanceDetail:
    s = _stats(carries)
    bucket = 5 if carries and max(carries) < 60 else 10
    return ClubDistanceDetail(
        club=club,
        shots=len(carries),
        **s,
        histogram=_histogram(carries, bucket),
    )


async def distance_analysis_stats(
    db: AsyncSession,
    *,
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    min_sample: int = MIN_SAMPLE_DEFAULT,
) -> DistanceAnalysisResponse:
    all_rounds = await load_rounds(db)
    pool = filter_rounds(all_rounds, round_range=round_range, holes_filter=holes_filter, course=course)

    by_club = _collect_club_shots(pool)
    details: dict[str, ClubDistanceDetail] = {}

    for club, shots in by_club.items():
        if _is_putter(club):
            continue
        carries = [float(s["carry"]) for s in shots if s.get("carry") is not None]
        if not carries:
            continue
        details[club] = _build_detail(club, carries)

    bag_names = await get_bag_clubs(db)
    bag_rows: list[DistanceRow] = []
    map_entries: list[DistanceMapEntry] = []

    for name in bag_names:
        if _is_putter(name):
            continue
        d = details.get(name)
        if not d or not _eligible(d.shots, min_sample):
            continue
        bag_rows.append(
            DistanceRow(
                club=name,
                shots=d.shots,
                avg_m=d.avg_m,
                median_m=d.median_m,
                min_m=d.min_m,
                max_m=d.max_m,
            )
        )
        if d.median_m is not None:
            map_entries.append(
                DistanceMapEntry(
                    club=name,
                    median_m=d.median_m,
                    min_m=d.min_m or d.median_m,
                    max_m=d.max_m or d.median_m,
                    avg_m=d.avg_m or d.median_m,
                )
            )

    map_entries.sort(key=lambda e: float(e.median_m), reverse=True)
    visible = {r.club: details[r.club] for r in bag_rows}

    return DistanceAnalysisResponse(
        round_range=round_range.value,
        holes_filter=holes_filter.value,
        course=course,
        available_courses=available_courses(all_rounds),
        rounds_in_period=len(pool),
        min_sample=min_sample,
        bag_rows=bag_rows,
        yardage_map=map_entries,
        clubs=visible,
    )

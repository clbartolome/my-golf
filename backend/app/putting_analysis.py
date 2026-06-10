"""Análisis de putting: todo visible sin selección por palo."""

from __future__ import annotations

from collections import Counter
from decimal import Decimal

from app.enums import ShotMissLine, ShotResult, ShotType
from app.green import update_on_green
from app.models import Round
from app.schemas import (
    DispersionHeatmap,
    PercentRow,
    PuttDistanceBucket,
    PuttingAnalysisResponse,
)
from app.shot_analytics import MissDirection, _is_putter, classify_direction
from app.stats_filters import HolesFilter, RoundRange, available_courses, filter_rounds, load_rounds
from sqlalchemy.ext.asyncio import AsyncSession

from app.club_analysis import (
    DIRECTION_LABELS,
    _build_heatmap,
    _dominant_pattern,
    _lost_points,
    _pct,
    _q,
)


def _collect_putt_data(rounds: list[Round]) -> tuple[list[dict], list[int]]:
    """Golpes con putter + recuento de putts por hoyo."""
    shots: list[dict] = []
    putts_per_hole: list[int] = []

    for round_ in rounds:
        for hole in round_.holes:
            if not hole.completed:
                continue
            on_green = False
            hole_putts = 0
            normal_shots = sorted(
                [s for s in hole.shots if s.shot_type == ShotType.normal],
                key=lambda s: s.stroke_number,
            )
            for shot in normal_shots:
                if not shot.club or shot.result is None:
                    continue
                is_putt = _is_putter(shot.club) or on_green
                if is_putt:
                    direction = classify_direction(shot.result, shot.miss_line)
                    holed = shot.result == ShotResult.holed
                    dist = float(shot.distance_before) if shot.distance_before is not None else None
                    shots.append(
                        {
                            "result": shot.result,
                            "direction": direction,
                            "miss_line": shot.miss_line,
                            "distance_m": dist,
                            "holed": holed,
                            "good": holed,
                            "lost": _lost_points(shot.result, shot.miss_line, direction),
                        }
                    )
                    hole_putts += 1
                on_green = update_on_green(on_green, shot.result)

            if hole_putts:
                putts_per_hole.append(hole_putts)

    return shots, putts_per_hole


def _distance_buckets(shots: list[dict]) -> list[PuttDistanceBucket]:
    bands: list[tuple[str, float, float]] = [
        ("0–1 m", 0, 1),
        ("1–2 m", 1, 2),
        ("2–5 m", 2, 5),
        ("5–10 m", 5, 10),
        ("10 m+", 10, 999),
    ]
    rows: list[PuttDistanceBucket] = []
    for label, lo, hi in bands:
        bucket = [
            s
            for s in shots
            if s["distance_m"] is not None and lo <= s["distance_m"] < hi
        ]
        if not bucket:
            continue
        made = sum(1 for s in bucket if s["holed"])
        rows.append(
            PuttDistanceBucket(
                label=label,
                attempts=len(bucket),
                make_pct=_pct(made, len(bucket)),
            )
        )
    return rows


def _hole_putt_rates(putts_per_hole: list[int]) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    if not putts_per_hole:
        return None, None, None
    n = len(putts_per_hole)
    one = sum(1 for p in putts_per_hole if p == 1)
    two = sum(1 for p in putts_per_hole if p == 2)
    three_plus = sum(1 for p in putts_per_hole if p >= 3)
    return _pct(one, n), _pct(two, n), _pct(three_plus, n)


async def putting_analysis_stats(
    db: AsyncSession,
    *,
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
) -> PuttingAnalysisResponse:
    all_rounds = await load_rounds(db)
    pool = filter_rounds(all_rounds, round_range=round_range, holes_filter=holes_filter, course=course)
    num_rounds = max(len(pool), 1)

    shots, putts_per_hole = _collect_putt_data(pool)
    total = len(shots)

    if not total:
        one, two, three = None, None, None
        return PuttingAnalysisResponse(
            round_range=round_range.value,
            holes_filter=holes_filter.value,
            course=course,
            available_courses=available_courses(all_rounds),
            rounds_in_period=len(pool),
            total_putts=0,
            putts_per_round=Decimal("0"),
            stroke_cost_per_round=Decimal("0"),
            make_pct=Decimal("0"),
            avg_length_m=None,
            one_putt_pct=one,
            two_putt_pct=two,
            three_putt_plus_pct=three,
            dominant_pattern="—",
            dominant_pattern_pct=Decimal("0"),
            heatmap=DispersionHeatmap(
                left_pct=Decimal("0"),
                center_pct=Decimal("0"),
                right_pct=Decimal("0"),
                short_pct=Decimal("0"),
                long_pct=Decimal("0"),
            ),
            miss_breakdown=[],
            distance_buckets=[],
        )

    total_lost = sum(s["lost"] for s in shots)
    made = sum(1 for s in shots if s["holed"])
    lengths = [s["distance_m"] for s in shots if s["distance_m"] is not None]
    avg_len = _q(sum(lengths) / len(lengths)) if lengths else None

    dir_counts: Counter[str] = Counter()
    for s in shots:
        if s["holed"]:
            continue
        dl = DIRECTION_LABELS.get(s["direction"], s["direction"].value)
        dir_counts[dl] += 1

    miss_total = sum(dir_counts.values())
    pattern, pattern_pct = _dominant_pattern(shots)
    one, two, three = _hole_putt_rates(putts_per_hole)

    return PuttingAnalysisResponse(
        round_range=round_range.value,
        holes_filter=holes_filter.value,
        course=course,
        available_courses=available_courses(all_rounds),
        rounds_in_period=len(pool),
        total_putts=total,
        putts_per_round=_q(Decimal(total) / Decimal(num_rounds)),
        stroke_cost_per_round=_q(total_lost / Decimal(num_rounds)),
        make_pct=_pct(made, total),
        avg_length_m=avg_len,
        one_putt_pct=one,
        two_putt_pct=two,
        three_putt_plus_pct=three,
        dominant_pattern=pattern,
        dominant_pattern_pct=pattern_pct,
        heatmap=_build_heatmap(shots),
        miss_breakdown=[
            PercentRow(label=k, pct=_pct(v, miss_total if miss_total else total))
            for k, v in dir_counts.most_common()
        ],
        distance_buckets=_distance_buckets(shots),
    )

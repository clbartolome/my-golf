"""Análisis de dispersión y desvíos a partir de golpes registrados."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum

from app.enums import ShotMissLine, ShotResult, ShotType
from app.green import update_on_green
from app.models import Hole, Round, Shot


class ShotPhase(str, Enum):
    tee = "tee"
    approach = "approach"
    putt = "putt"


class MissDirection(str, Enum):
    on_target = "on_target"
    left = "left"
    right = "right"
    short = "short"
    long = "long"
    other = "other"
    trouble = "trouble"


ON_TARGET_LIES = {ShotResult.fairway, ShotResult.green, ShotResult.holed}
LEFT_LEGACY = {ShotResult.rough_left, ShotResult.miss_left}
RIGHT_LEGACY = {ShotResult.rough_right, ShotResult.miss_right}
TROUBLE = {ShotResult.water, ShotResult.ob, ShotResult.lost, ShotResult.unplayable}

_MISS_LINE_TO_DIRECTION = {
    ShotMissLine.on_target: MissDirection.on_target,
    ShotMissLine.short: MissDirection.short,
    ShotMissLine.long: MissDirection.long,
    ShotMissLine.left: MissDirection.left,
    ShotMissLine.right: MissDirection.right,
}


def classify_direction(
    result: ShotResult | None,
    miss_line: ShotMissLine | None = None,
) -> MissDirection:
    if miss_line is not None:
        return _MISS_LINE_TO_DIRECTION.get(miss_line, MissDirection.other)
    if result is None:
        return MissDirection.other
    if result in ON_TARGET_LIES:
        return MissDirection.on_target
    if result in LEFT_LEGACY:
        return MissDirection.left
    if result in RIGHT_LEGACY:
        return MissDirection.right
    if result == ShotResult.miss_short:
        return MissDirection.short
    if result == ShotResult.miss_long:
        return MissDirection.long
    if result in TROUBLE:
        return MissDirection.trouble
    return MissDirection.other


def _is_putter(club: str | None) -> bool:
    if not club:
        return False
    c = club.lower()
    return c in ("putter", "putt", "p") or "putter" in c


@dataclass
class AnalyzedShot:
    club: str
    phase: ShotPhase
    result: ShotResult
    direction: MissDirection
    distance_before: Decimal
    distance_after: Decimal | None
    shot_distance: Decimal | None
    par: int
    hole_number: int


def analyze_hole(hole: Hole) -> list[AnalyzedShot]:
    if not hole.completed:
        return []

    normal_shots = sorted(
        [s for s in hole.shots if s.shot_type == ShotType.normal],
        key=lambda s: s.stroke_number,
    )
    analyzed: list[AnalyzedShot] = []
    on_green = False
    normal_idx = 0

    for shot in normal_shots:
        if shot.result is None or shot.club is None or shot.distance_before is None:
            normal_idx += 1
            continue

        if on_green or _is_putter(shot.club):
            phase = ShotPhase.putt
        elif normal_idx == 0:
            phase = ShotPhase.tee
        else:
            phase = ShotPhase.approach

        dist_after = shot.distance_after
        shot_dist = None
        if dist_after is not None and not shot.exclude_from_stats:
            shot_dist = shot.distance_before - dist_after

        analyzed.append(
            AnalyzedShot(
                club=shot.club,
                phase=phase,
                result=shot.result,
                direction=classify_direction(shot.result, shot.miss_line),
                distance_before=shot.distance_before,
                distance_after=dist_after,
                shot_distance=shot_dist,
                par=hole.par,
                hole_number=hole.hole_number,
            )
        )

        on_green = update_on_green(on_green, shot.result)
        normal_idx += 1

    return analyzed


def collect_analyzed_shots(rounds: list[Round]) -> list[AnalyzedShot]:
    shots: list[AnalyzedShot] = []
    for round_ in rounds:
        for hole in round_.holes:
            shots.extend(analyze_hole(hole))
    return shots


def _pct(count: int, total: int) -> Decimal | None:
    if not total:
        return None
    return (Decimal(count) / Decimal(total) * 100).quantize(Decimal("0.1"))


def _avg(values: list[Decimal]) -> Decimal | None:
    if not values:
        return None
    return (sum(values) / Decimal(len(values))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def direction_counts(shots: list[AnalyzedShot]) -> dict[str, int]:
    counts = {d.value: 0 for d in MissDirection}
    for s in shots:
        counts[s.direction.value] += 1
    return counts


def aggregate_phase(shots: list[AnalyzedShot], phase: ShotPhase) -> dict:
    phase_shots = [s for s in shots if s.phase == phase]
    total = len(phase_shots)
    counts = direction_counts(phase_shots)
    return {
        "total_shots": total,
        "on_target_pct": _pct(counts["on_target"], total),
        "left_pct": _pct(counts["left"], total),
        "right_pct": _pct(counts["right"], total),
        "short_pct": _pct(counts["short"], total),
        "long_pct": _pct(counts["long"], total),
        "trouble_pct": _pct(counts["trouble"], total),
        "counts": counts,
    }


def aggregate_by_club(shots: list[AnalyzedShot]) -> list[dict]:
    by_club: dict[str, list[AnalyzedShot]] = {}
    for s in shots:
        by_club.setdefault(s.club, []).append(s)

    results = []
    for club, club_shots in sorted(by_club.items(), key=lambda x: x[0]):
        total = len(club_shots)
        counts = direction_counts(club_shots)
        carries = [s.shot_distance for s in club_shots if s.shot_distance is not None and s.phase != ShotPhase.putt]
        remainings = [
            s.distance_after
            for s in club_shots
            if s.distance_after is not None
            and s.phase == ShotPhase.approach
            and s.result not in (ShotResult.green, ShotResult.fringe, ShotResult.holed)
        ]
        approach_on_green = [
            s.distance_after
            for s in club_shots
            if s.phase == ShotPhase.approach and s.result in (ShotResult.green, ShotResult.fringe)
        ]
        putt_lengths = [s.distance_before for s in club_shots if s.phase == ShotPhase.putt]
        putts_made = sum(1 for s in club_shots if s.phase == ShotPhase.putt and s.result == ShotResult.holed)

        tee_shots = [s for s in club_shots if s.phase == ShotPhase.tee]
        fir = sum(1 for s in tee_shots if s.result == ShotResult.fairway)
        tee_miss_l = sum(1 for s in tee_shots if s.direction == MissDirection.left)
        tee_miss_r = sum(1 for s in tee_shots if s.direction == MissDirection.right)

        results.append({
            "club": club,
            "total_shots": total,
            "avg_carry_m": _avg(carries),
            "avg_remaining_m": _avg(remainings),
            "avg_proximity_m": _avg(approach_on_green),
            "avg_putt_length_m": _avg(putt_lengths),
            "putt_make_pct": _pct(putts_made, len([s for s in club_shots if s.phase == ShotPhase.putt])),
            "on_target_pct": _pct(counts["on_target"], total),
            "left_pct": _pct(counts["left"], total),
            "right_pct": _pct(counts["right"], total),
            "short_pct": _pct(counts["short"], total),
            "long_pct": _pct(counts["long"], total),
            "trouble_pct": _pct(counts["trouble"], total),
            "fir_pct": _pct(fir, len(tee_shots)) if tee_shots else None,
            "tee_miss_left_pct": _pct(tee_miss_l, len(tee_shots)) if tee_shots else None,
            "tee_miss_right_pct": _pct(tee_miss_r, len(tee_shots)) if tee_shots else None,
        })
    return results


def proximity_buckets(shots: list[AnalyzedShot]) -> list[dict]:
    """Distancia al hoyo tras approach (metros)."""
    approaches = [
        s
        for s in shots
        if s.phase == ShotPhase.approach
        and s.distance_after is not None
        and s.result not in TROUBLE
    ]
    buckets = [
        ("0–5 m", 0, 5),
        ("5–10 m", 5, 10),
        ("10–20 m", 10, 20),
        ("20–30 m", 20, 30),
        ("30+ m", 30, 9999),
    ]
    result = []
    for label, lo, hi in buckets:
        in_bucket = [s for s in approaches if lo <= float(s.distance_after) < hi]  # type: ignore[arg-type]
        gir = sum(1 for s in in_bucket if s.result in (ShotResult.green, ShotResult.fringe))
        result.append({
            "label": label,
            "shots": len(in_bucket),
            "gir_pct": _pct(gir, len(in_bucket)),
            "avg_remaining_m": _avg([s.distance_after for s in in_bucket if s.distance_after is not None]),  # type: ignore[list-item]
        })
    return result

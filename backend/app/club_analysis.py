"""Análisis por palo (sin putter): coste en golpes, fiabilidad, heatmap."""

from __future__ import annotations

import math
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP

from app.enums import ShotMissLine, ShotResult, ShotType
from app.green import update_on_green
from app.models import Round
from app.schemas import (
    AnalyzedClub,
    BagClubRow,
    ClubAnalysisResponse,
    ClubAnalysisSummary,
    ClubDetail,
    ClubRankingRow,
    ClubRecommendation,
    DispersionHeatmap,
    PercentRow,
)
from app.shot_analytics import (
    MissDirection,
    ShotPhase,
    TROUBLE,
    _is_putter,
    classify_direction,
)
from app.bag import get_bag_clubs
from app.stats_filters import HolesFilter, RoundRange, available_courses, filter_rounds, load_rounds
from sqlalchemy.ext.asyncio import AsyncSession

MIN_SAMPLE_DEFAULT = 10


def _eligible(total: int, min_sample: int) -> bool:
    if min_sample <= 0:
        return True
    return total >= min_sample

GOOD_LIES = {ShotResult.fairway, ShotResult.green, ShotResult.fringe, ShotResult.holed}
BAD_LIES = {
    ShotResult.water,
    ShotResult.ob,
    ShotResult.lost,
    ShotResult.unplayable,
    ShotResult.bunker,
    ShotResult.recovery,
}

LIE_LOST = {
    ShotResult.green: Decimal("0"),
    ShotResult.fairway: Decimal("0"),
    ShotResult.fringe: Decimal("0"),
    ShotResult.holed: Decimal("0"),
    ShotResult.rough: Decimal("0.25"),
    ShotResult.bunker: Decimal("0.5"),
    ShotResult.recovery: Decimal("1"),
    ShotResult.water: Decimal("2"),
    ShotResult.ob: Decimal("2"),
    ShotResult.lost: Decimal("2"),
    ShotResult.unplayable: Decimal("1"),
    ShotResult.miss_short: Decimal("0.25"),
    ShotResult.miss_long: Decimal("0.25"),
    ShotResult.miss_left: Decimal("0.25"),
    ShotResult.miss_right: Decimal("0.25"),
    ShotResult.rough_left: Decimal("0.25"),
    ShotResult.rough_right: Decimal("0.25"),
}

LINE_LOST = {
    ShotMissLine.on_target: Decimal("0"),
    ShotMissLine.short: Decimal("0.25"),
    ShotMissLine.long: Decimal("0.25"),
    ShotMissLine.left: Decimal("0.25"),
    ShotMissLine.right: Decimal("0.25"),
}

RESULT_LABELS = {
    ShotResult.fairway: "Calle",
    ShotResult.rough: "Rough",
    ShotResult.bunker: "Bunker",
    ShotResult.green: "Green",
    ShotResult.fringe: "Fringe",
    ShotResult.water: "Agua",
    ShotResult.ob: "Out",
    ShotResult.lost: "Perdida",
    ShotResult.unplayable: "Injugable",
    ShotResult.recovery: "Árboles",
    ShotResult.holed: "Dentro",
}

DIRECTION_LABELS = {
    MissDirection.on_target: "En línea",
    MissDirection.left: "Izquierda",
    MissDirection.right: "Derecha",
    MissDirection.short: "Corto",
    MissDirection.long: "Largo",
}


def _q(value: Decimal | float, places: str = "0.1") -> Decimal:
    return Decimal(str(value)).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _pct(count: int, total: int) -> Decimal:
    if not total:
        return Decimal("0")
    return _q(Decimal(count) / Decimal(total) * 100)


def _is_good(result: ShotResult, direction: MissDirection) -> bool:
    if result in GOOD_LIES:
        return True
    if result == ShotResult.rough and direction == MissDirection.on_target:
        return True
    return False


def _lost_points(result: ShotResult, miss_line: ShotMissLine | None, direction: MissDirection) -> Decimal:
    lie_pts = LIE_LOST.get(result, Decimal("0.25"))
    if miss_line is not None:
        line_pts = LINE_LOST.get(miss_line, Decimal("0"))
    else:
        line_pts = {
            MissDirection.on_target: Decimal("0"),
            MissDirection.short: Decimal("0.25"),
            MissDirection.long: Decimal("0.25"),
            MissDirection.left: Decimal("0.25"),
            MissDirection.right: Decimal("0.25"),
        }.get(direction, Decimal("0"))
    return lie_pts + line_pts


def _percentile(values: list[float], p: float) -> Decimal | None:
    if not values:
        return None
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(math.ceil(len(ordered) * p / 100)) - 1))
    return _q(ordered[idx], "0")


def _std_dev(values: list[float]) -> Decimal | None:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / len(values)
    return _q(math.sqrt(var), "0")


def _horizontal_bucket(miss_line: ShotMissLine | None, direction: MissDirection) -> str:
    if miss_line == ShotMissLine.left or direction == MissDirection.left:
        return "left"
    if miss_line == ShotMissLine.right or direction == MissDirection.right:
        return "right"
    return "center"


def _dominant_pattern(shots: list[dict]) -> tuple[str, Decimal]:
    patterns: Counter[str] = Counter()
    for s in shots:
        if s["good"]:
            continue
        parts: list[str] = []
        ml = s.get("miss_line")
        d = s["direction"]
        if ml == ShotMissLine.short or d == MissDirection.short:
            parts.append("Corto")
        elif ml == ShotMissLine.long or d == MissDirection.long:
            parts.append("Largo")
        elif ml == ShotMissLine.left or d == MissDirection.left:
            parts.append("Izquierda")
        elif ml == ShotMissLine.right or d == MissDirection.right:
            parts.append("Derecha")

        res = s["result"]
        if res in BAD_LIES or (res == ShotResult.rough and not s["good"]):
            label = RESULT_LABELS.get(res, res.value)
            if label not in parts:
                parts.append(label)

        key = " + ".join(parts) if parts else "Otro"
        patterns[key] += 1

    if not patterns:
        return "Sin patrón claro", Decimal("0")
    label, count = patterns.most_common(1)[0]
    total_bad = sum(1 for s in shots if not s["good"])
    return label, _pct(count, total_bad if total_bad else len(shots))


def _build_heatmap(shots: list[dict]) -> DispersionHeatmap:
    total = len(shots)
    if not total:
        return DispersionHeatmap(
            left_pct=Decimal("0"),
            center_pct=Decimal("0"),
            right_pct=Decimal("0"),
            short_pct=Decimal("0"),
            long_pct=Decimal("0"),
        )

    h_left = h_center = h_right = 0
    short_n = long_n = 0
    for s in shots:
        bucket = _horizontal_bucket(s.get("miss_line"), s["direction"])
        if bucket == "left":
            h_left += 1
        elif bucket == "right":
            h_right += 1
        else:
            h_center += 1
        ml = s.get("miss_line")
        if ml == ShotMissLine.short or s["direction"] == MissDirection.short:
            short_n += 1
        if ml == ShotMissLine.long or s["direction"] == MissDirection.long:
            long_n += 1

    return DispersionHeatmap(
        left_pct=_pct(h_left, total),
        center_pct=_pct(h_center, total),
        right_pct=_pct(h_right, total),
        short_pct=_pct(short_n, total),
        long_pct=_pct(long_n, total),
    )


def _collect_club_shots(rounds: list[Round]) -> dict[str, list]:
    by_club: dict[str, list] = {}
    for round_ in rounds:
        for hole in round_.holes:
            if not hole.completed:
                continue
            on_green = False
            normal_idx = 0
            normal_shots = sorted(
                [s for s in hole.shots if s.shot_type == ShotType.normal],
                key=lambda s: s.stroke_number,
            )
            for shot in normal_shots:
                if not shot.club or shot.result is None:
                    normal_idx += 1
                    continue
                if _is_putter(shot.club):
                    on_green = update_on_green(on_green, shot.result)
                    normal_idx += 1
                    continue

                if on_green:
                    phase = ShotPhase.putt
                elif normal_idx == 0:
                    phase = ShotPhase.tee
                else:
                    phase = ShotPhase.approach

                direction = classify_direction(shot.result, shot.miss_line)
                carry = None
                if (
                    shot.distance_before is not None
                    and shot.distance_after is not None
                    and not shot.exclude_from_stats
                ):
                    carry = float(shot.distance_before - shot.distance_after)

                entry = {
                    "result": shot.result,
                    "direction": direction,
                    "miss_line": shot.miss_line,
                    "carry": carry,
                    "phase": phase,
                    "good": _is_good(shot.result, direction),
                    "lost": _lost_points(shot.result, shot.miss_line, direction),
                    "trouble": shot.result in TROUBLE,
                }
                by_club.setdefault(shot.club, []).append(entry)
                on_green = update_on_green(on_green, shot.result)
                normal_idx += 1
    return by_club


def _build_details(shots_by_club: dict[str, list], num_rounds: int, min_sample: int) -> dict[str, ClubDetail]:
    details: dict[str, ClubDetail] = {}
    for club, shots in shots_by_club.items():
        if _is_putter(club):
            continue
        total = len(shots)
        if not total:
            continue

        good = sum(1 for s in shots if s["good"])
        trouble = sum(1 for s in shots if s["trouble"])
        total_lost = sum(s["lost"] for s in shots)
        stroke_cost = _q(total_lost / Decimal(num_rounds)) if num_rounds else Decimal("0")

        carries = [float(s["carry"]) for s in shots if s["carry"] is not None]
        avg_dist = _q(sum(carries) / len(carries)) if carries else None
        std_dev = _std_dev(carries)
        control_pct = None
        if std_dev is not None and avg_dist and float(avg_dist) > 0:
            control_pct = _q(Decimal("100") - (std_dev / avg_dist * Decimal("100")), "0")
            control_pct = max(Decimal("0"), min(Decimal("100"), control_pct))

        pattern, pattern_pct = _dominant_pattern(shots)

        result_counts: dict[str, int] = {}
        dir_counts: dict[str, int] = {}
        for s in shots:
            rl = RESULT_LABELS.get(s["result"], s["result"].value)
            result_counts[rl] = result_counts.get(rl, 0) + 1
            dl = DIRECTION_LABELS.get(s["direction"], s["direction"].value)
            dir_counts[dl] = dir_counts.get(dl, 0) + 1

        details[club] = ClubDetail(
            club=club,
            total_shots=total,
            eligible=_eligible(total, min_sample),
            avg_distance_m=avg_dist,
            distance_p20=_percentile(carries, 20),
            distance_p80=_percentile(carries, 80),
            control_pct=control_pct,
            carry_std_dev_m=std_dev,
            reliability_pct=_pct(good, total),
            stroke_cost_per_round=stroke_cost,
            penalty_pct=_pct(trouble, total),
            dominant_pattern=pattern,
            dominant_pattern_pct=pattern_pct,
            heatmap=_build_heatmap(shots),
            results_breakdown=[
                PercentRow(label=k, pct=_pct(v, total))
                for k, v in sorted(result_counts.items(), key=lambda x: -x[1])
            ],
            miss_breakdown=[
                PercentRow(label=k, pct=_pct(v, total))
                for k, v in sorted(dir_counts.items(), key=lambda x: -x[1])
            ],
        )
    return details


def _build_insights(eligible: list[ClubRankingRow], details: dict[str, ClubDetail]) -> list[str]:
    insights: list[str] = []
    if not eligible:
        return insights

    costly = max(eligible, key=lambda r: float(r.stroke_cost_per_round))
    if float(costly.stroke_cost_per_round) >= 1:
        insights.append(f"El {costly.club} te cuesta {costly.stroke_cost_per_round} golpes por ronda.")

    reliable = max(eligible, key=lambda r: float(r.reliability_pct))
    if float(reliable.reliability_pct) >= 65:
        insights.append(f"Tu {reliable.club} es tu palo más fiable ({reliable.reliability_pct}%).")

    for row in sorted(eligible, key=lambda r: -float(r.stroke_cost_per_round)):
        d = details.get(row.club)
        if not d or float(d.dominant_pattern_pct) < 35:
            continue
        insights.append(f"{row.club}: patrón «{d.dominant_pattern}» ({d.dominant_pattern_pct}%).")
        break

    return insights[:4]


def _build_recommendation(
    eligible: list[ClubRankingRow], details: dict[str, ClubDetail]
) -> ClubRecommendation | None:
    if not eligible:
        return None
    worst = max(eligible, key=lambda r: float(r.stroke_cost_per_round))
    if float(worst.stroke_cost_per_round) < Decimal("0.5"):
        return None
    d = details.get(worst.club)
    reason = f"Te cuesta {worst.stroke_cost_per_round} golpes por ronda."
    if d and float(d.dominant_pattern_pct) >= 30:
        reason += f" Patrón: {d.dominant_pattern} ({d.dominant_pattern_pct}%)."
    return ClubRecommendation(
        title=f"Prioriza entrenar o limitar el {worst.club}",
        reason=reason,
    )


async def club_analysis_stats(
    db: AsyncSession,
    *,
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    min_sample: int = MIN_SAMPLE_DEFAULT,
) -> ClubAnalysisResponse:
    all_rounds = await load_rounds(db)
    pool = filter_rounds(all_rounds, round_range=round_range, holes_filter=holes_filter, course=course)
    num_rounds = max(len(pool), 1)

    by_club = _collect_club_shots(pool)
    details = _build_details(by_club, num_rounds, min_sample)
    visible = {club: d for club, d in details.items() if d.eligible}

    total_trouble = sum(
        sum(1 for s in shots if s["trouble"])
        for club, shots in by_club.items()
        if club in visible and not _is_putter(club)
    )

    ranking: list[ClubRankingRow] = []
    for club, d in visible.items():
        trouble_n = sum(1 for s in by_club[club] if s["trouble"])
        trouble_share = _pct(trouble_n, total_trouble) if total_trouble else Decimal("0")
        ranking.append(
            ClubRankingRow(
                club=club,
                total_shots=d.total_shots,
                eligible=True,
                reliability_pct=d.reliability_pct,
                avg_distance_m=d.avg_distance_m,
                control_pct=d.control_pct,
                stroke_cost_per_round=d.stroke_cost_per_round,
                penalty_share_pct=trouble_share if trouble_n else Decimal("0"),
                penalty_pct=d.penalty_pct,
            )
        )

    eligible_rows = sorted(ranking, key=lambda r: float(r.stroke_cost_per_round), reverse=True)

    helps = sorted(eligible_rows, key=lambda r: float(r.reliability_pct), reverse=True)[:5]
    hurts = eligible_rows[:5]

    analyzed = [
        AnalyzedClub(club=r.club, total_shots=r.total_shots)
        for r in sorted(eligible_rows, key=lambda x: -x.total_shots)
    ]

    summary = ClubAnalysisSummary(
        most_costly_club=eligible_rows[0].club if eligible_rows else None,
        most_costly_strokes=eligible_rows[0].stroke_cost_per_round if eligible_rows else None,
        most_reliable_club=helps[0].club if helps else None,
        most_reliable_pct=helps[0].reliability_pct if helps else None,
        top_penalty_source_club=None,
        top_penalty_source_pct=None,
        total_shots_analyzed=sum(d.total_shots for d in visible.values()),
    )

    if eligible_rows:
        by_pen_share = max(eligible_rows, key=lambda r: float(r.penalty_share_pct))
        if float(by_pen_share.penalty_share_pct) > 0:
            summary.top_penalty_source_club = by_pen_share.club
            summary.top_penalty_source_pct = by_pen_share.penalty_share_pct

    bag_names = await get_bag_clubs(db)
    bag_rows: list[BagClubRow] = []
    for name in bag_names:
        if _is_putter(name) or name not in visible:
            continue
        d = visible[name]
        bag_rows.append(
            BagClubRow(
                club=name,
                total_shots=d.total_shots,
                stroke_cost_per_round=d.stroke_cost_per_round,
                reliability_pct=d.reliability_pct,
            )
        )

    return ClubAnalysisResponse(
        round_range=round_range.value,
        holes_filter=holes_filter.value,
        course=course,
        available_courses=available_courses(all_rounds),
        rounds_in_period=len(pool),
        min_sample=min_sample,
        summary=summary,
        analyzed_clubs=analyzed,
        hurts_ranking=hurts,
        helps_ranking=helps,
        ranking=eligible_rows,
        bag_rows=bag_rows,
        clubs=visible,
        insights=_build_insights(eligible_rows, visible),
        recommendation=_build_recommendation(eligible_rows, visible),
    )

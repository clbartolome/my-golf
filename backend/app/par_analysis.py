"""Estadísticas por tipo de hoyo (par 3, 4, 5)."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import ParAnalysisResponse, ParScoreBreakdown, ParTypeStats
from app.stats import _hole_stats
from app.stats_filters import HolesFilter, RoundRange, available_courses, filter_rounds, load_rounds


def _q(value: Decimal | float, places: str = "0.01") -> Decimal:
    return Decimal(str(value)).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _pct(count: int, total: int) -> Decimal | None:
    if not total:
        return None
    return _q(Decimal(count) / Decimal(total) * 100, "0.1")


def _score_label(vs_par: int) -> str:
    if vs_par <= -2:
        return "eagle_or_better"
    if vs_par == -1:
        return "birdie"
    if vs_par == 0:
        return "par"
    if vs_par == 1:
        return "bogey"
    return "double_plus"


SCORE_LABELS = {
    "eagle_or_better": "Águila o mejor",
    "birdie": "Birdie",
    "par": "Par",
    "bogey": "Bogey",
    "double_plus": "Doble o peor",
}


def _build_par_stats(par: int, holes: list) -> ParTypeStats:
    n = len(holes)
    score_counts: dict[str, int] = defaultdict(int)
    for h in holes:
        score_counts[_score_label(h.score_vs_par)] += 1

    fir_opps = [h for h in holes if h.fir is not None]
    penalty_holes = sum(1 for h in holes if h.penalties > 0)

    return ParTypeStats(
        par=par,
        holes_played=n,
        avg_strokes=_q(sum(h.strokes for h in holes) / n, "0.01") if n else None,
        avg_vs_par=_q(sum(h.score_vs_par for h in holes) / n, "0.01") if n else None,
        gir_pct=_pct(sum(1 for h in holes if h.gir), n),
        fir_pct=_pct(sum(1 for h in fir_opps if h.fir), len(fir_opps)) if fir_opps else None,
        avg_putts=_q(sum(h.putts for h in holes) / n, "0.01") if n else None,
        penalty_hole_pct=_pct(penalty_holes, n),
        score_breakdown=[
            ParScoreBreakdown(
                label=SCORE_LABELS[key],
                count=score_counts.get(key, 0),
                pct=_pct(score_counts.get(key, 0), n) or Decimal("0"),
            )
            for key in ("eagle_or_better", "birdie", "par", "bogey", "double_plus")
        ],
    )


def _insights(by_par: list[ParTypeStats]) -> list[str]:
    lines: list[str] = []
    if not by_par:
        return lines

    worst = max(by_par, key=lambda p: float(p.avg_vs_par or 0))
    if worst.avg_vs_par and float(worst.avg_vs_par) >= 0.5:
        lines.append(f"Par {worst.par}: +{worst.avg_vs_par} de media por hoyo.")

    best = min(by_par, key=lambda p: float(p.avg_vs_par or 99))
    if best.avg_vs_par is not None and float(best.avg_vs_par) < 0.5:
        lines.append(f"Par {best.par}: tu fuerte ({best.avg_vs_par} vs par).")

    for p in by_par:
        bogey_pct = next(
            (float(b.pct) for b in p.score_breakdown if b.label == "Bogey"),
            0,
        )
        if bogey_pct >= 40:
            lines.append(f"Par {p.par}: {bogey_pct:.0f}% bogeys.")
            break

    return lines[:4]


async def par_analysis_stats(
    db: AsyncSession,
    *,
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
) -> ParAnalysisResponse:
    all_rounds = await load_rounds(db)
    pool = filter_rounds(all_rounds, round_range=round_range, holes_filter=holes_filter, course=course)

    by_par: dict[int, list] = defaultdict(list)
    for round_ in pool:
        for hole in round_.holes:
            hs = _hole_stats(hole)
            if hs and hs.par in (3, 4, 5):
                by_par[hs.par].append(hs)

    stats = [_build_par_stats(par, by_par[par]) for par in sorted(by_par.keys())]

    return ParAnalysisResponse(
        round_range=round_range.value,
        holes_filter=holes_filter.value,
        course=course,
        available_courses=available_courses(all_rounds),
        rounds_in_period=len(pool),
        by_par=stats,
        insights=_insights(stats),
    )

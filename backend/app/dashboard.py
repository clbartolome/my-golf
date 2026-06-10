"""Dashboard principal: KPIs, tendencias y ranking de golpes perdidos."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.enums import ShotMissLine, ShotResult, ShotType
from app.green import update_on_green
from app.models import Hole, Round, Shot
from app.schemas import (
    DashboardFilters,
    DashboardKPI,
    DashboardObjective,
    DashboardResponse,
    DashboardSummary,
    LostPointsCategory,
)
from app.shot_analytics import _is_putter, classify_direction


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

CATEGORY_LABELS = {
    "penalties": "Penalizaciones",
    "approach": "Approach",
    "putting": "Putting",
    "tee": "Tee shots",
    "short_game": "Juego corto",
}

PENALTY_STROKE_LOST = Decimal("2")


def _q(value: Decimal, places: str = "0.1") -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _avg(values: list[Decimal | float | int]) -> Decimal | None:
    if not values:
        return None
    return _q(Decimal(sum(values)) / Decimal(len(values)))


def _normalize_totals(
    strokes: int,
    putts: int,
    penalties: int,
    planned_holes: int,
    *,
    normalize_18: bool,
) -> tuple[int, int, int]:
    if normalize_18 and planned_holes == 9:
        return strokes * 2, putts * 2, penalties * 2
    return strokes, putts, penalties


def _score_18(strokes: int, planned_holes: int, normalize_18: bool) -> int:
    if normalize_18 and planned_holes == 9:
        return strokes * 2
    return strokes


def _lost_points(result: ShotResult | None, miss_line: ShotMissLine | None) -> Decimal:
    if result is None:
        return Decimal("0")
    lie_pts = LIE_LOST.get(result, Decimal("0.25"))
    if miss_line is not None:
        line_pts = LINE_LOST.get(miss_line, Decimal("0"))
    else:
        direction = classify_direction(result, None)
        line_pts = {
            "on_target": Decimal("0"),
            "short": Decimal("0.25"),
            "long": Decimal("0.25"),
            "left": Decimal("0.25"),
            "right": Decimal("0.25"),
            "trouble": Decimal("0"),
            "other": Decimal("0"),
        }.get(direction.value, Decimal("0"))
    return lie_pts + line_pts


def _shot_category(
    club: str | None,
    normal_idx: int,
    on_green_before: bool,
    distance_before: Decimal | None,
) -> str:
    if club and _is_putter(club):
        return "putting"
    if normal_idx == 0 and not on_green_before:
        return "tee"
    if distance_before is not None and distance_before <= 50:
        return "short_game"
    return "approach"


def _count_putts_by_club(normal_shots: list[Shot]) -> int:
    return sum(1 for s in normal_shots if s.club and _is_putter(s.club))


def _is_gir(par: int, normal_shots: list[Shot]) -> bool:
    strokes = 0
    for shot in normal_shots:
        strokes += 1
        if shot.result in (ShotResult.green, ShotResult.holed):
            return strokes <= par - 2
    return False


@dataclass
class RoundMetrics:
    round_id: str
    played_at: datetime
    course_name: str
    planned_holes: int
    score_18: int
    putts_18: int
    penalties_18: int
    gir_pct: Decimal | None
    gir_count: int
    gir_opportunities: int
    category_lost: dict[str, Decimal] = field(default_factory=lambda: {k: Decimal("0") for k in CATEGORY_LABELS})


def _round_metrics(round_: Round, *, normalize_18: bool) -> RoundMetrics | None:
    hole_stats = [h for h in round_.holes if h.completed]
    if not hole_stats:
        return None

    total_strokes = 0
    total_putts = 0
    total_penalties = 0
    gir_count = 0

    category_lost = {k: Decimal("0") for k in CATEGORY_LABELS}

    for hole in hole_stats:
        shots = sorted(hole.shots, key=lambda s: s.stroke_number)
        normal = [s for s in shots if s.shot_type == ShotType.normal]
        total_strokes += len(shots)
        total_putts += _count_putts_by_club(normal)
        total_penalties += sum(1 for s in shots if s.shot_type == ShotType.penalty)
        if _is_gir(hole.par, normal):
            gir_count += 1

        on_green = False
        normal_idx = 0
        for shot in shots:
            if shot.shot_type == ShotType.penalty:
                category_lost["penalties"] += PENALTY_STROKE_LOST
                continue
            if shot.club is None or shot.result is None:
                normal_idx += 1
                continue
            cat = _shot_category(shot.club, normal_idx, on_green, shot.distance_before)
            category_lost[cat] += _lost_points(shot.result, shot.miss_line)
            on_green = update_on_green(on_green, shot.result)
            normal_idx += 1

    score_18, putts_18, penalties_18 = _normalize_totals(
        total_strokes, total_putts, total_penalties, round_.planned_holes, normalize_18=normalize_18
    )
    holes = len(hole_stats)
    gir_pct = _q(Decimal(gir_count) / Decimal(holes) * 100) if holes else None

    return RoundMetrics(
        round_id=str(round_.id),
        played_at=round_.played_at,
        course_name=round_.course_name,
        planned_holes=round_.planned_holes,
        score_18=score_18,
        putts_18=putts_18,
        penalties_18=penalties_18,
        gir_pct=gir_pct,
        gir_count=gir_count,
        gir_opportunities=holes,
        category_lost=category_lost,
    )


def _filter_rounds(
    metrics: list[RoundMetrics],
    *,
    round_range: RoundRange,
    holes_filter: HolesFilter,
    course: str | None,
) -> list[RoundMetrics]:
    filtered = metrics
    if course:
        filtered = [m for m in filtered if m.course_name == course]
    if holes_filter == HolesFilter.h9:
        filtered = [m for m in filtered if m.planned_holes == 9]
    elif holes_filter == HolesFilter.h18:
        filtered = [m for m in filtered if m.planned_holes == 18]

    filtered = sorted(filtered, key=lambda m: m.played_at, reverse=True)

    if round_range == RoundRange.all:
        return filtered
    if round_range == RoundRange.season:
        year = datetime.now(timezone.utc).year
        return [m for m in filtered if m.played_at.year == year]
    limits = {RoundRange.last_5: 5, RoundRange.last_10: 10, RoundRange.last_20: 20}
    return filtered[: limits[round_range]]


def _kpi_status_penalties(v: Decimal) -> str:
    if v < Decimal("1.5"):
        return "good"
    if v <= Decimal("3"):
        return "neutral"
    return "bad"


def _kpi_status_putts(v: Decimal) -> str:
    if v < Decimal("34"):
        return "good"
    if v <= Decimal("38"):
        return "neutral"
    return "bad"


def _kpi_status_score_trend(trend: Decimal | None) -> str:
    if trend is None:
        return "neutral"
    if trend <= Decimal("-2"):
        return "good"
    if trend >= Decimal("2"):
        return "bad"
    return "neutral"


def _kpi_status_gir_trend(trend: Decimal | None) -> str:
    if trend is None:
        return "neutral"
    if trend >= Decimal("5"):
        return "good"
    if trend <= Decimal("-5"):
        return "bad"
    return "neutral"


def _build_objective(
    penalties: Decimal | None,
    putts: Decimal | None,
    gir_pct: Decimal | None,
    ranking: list[LostPointsCategory],
) -> DashboardObjective:
    if penalties is not None and penalties > Decimal("3"):
        return DashboardObjective(
            title="Reducir penalizaciones a menos de 2 por vuelta",
            reason=f"Ahora haces {penalties} penalizaciones por ronda. Es tu mayor fuente de golpes perdidos.",
            action="Jugar más conservador en hoyos estrechos; evita el driver cuando no haga falta.",
        )
    if putts is not None and putts > Decimal("38"):
        return DashboardObjective(
            title="Bajar de 36 putts por ronda",
            reason=f"Promedias {putts} putts por ronda (normalizado a 18 hoyos).",
            action="Entrenar putts de 1–2 m y control de distancia en lag putts.",
        )
    if gir_pct is not None and gir_pct < Decimal("20"):
        return DashboardObjective(
            title="Subir el GIR al 25%",
            reason=f"Tu GIR actual es {gir_pct}%.",
            action="Apunta al centro del green y elige un palo más en los approaches.",
        )
    if ranking:
        top = ranking[0]
        return DashboardObjective(
            title=f"Mejorar tu {top.label.lower()}",
            reason=f"Pierdes {top.points_per_round} puntos por ronda en esta fase del juego.",
            action="Registra cada golpe con lie y línea para afinar el diagnóstico.",
        )
    return DashboardObjective(
        title="Sigue registrando rondas completas",
        reason="Necesitamos más datos para detectar tu prioridad de entrenamiento.",
        action=None,
    )


def _build_insights(
    trend: Decimal | None,
    penalties: Decimal | None,
    ranking: list[LostPointsCategory],
    rounds_count: int,
) -> list[str]:
    insights: list[str] = []
    if rounds_count < 3:
        insights.append("Aún no hay suficientes rondas para tendencias fiables. Sigue registrando.")
        return insights
    if trend is not None:
        if trend < 0:
            insights.append(
                f"Estás mejorando: tu score medio ha bajado {abs(trend)} golpes respecto al periodo anterior."
            )
        elif trend > 0:
            insights.append(
                f"Tu score medio ha subido {trend} golpes respecto al periodo anterior."
            )
    if penalties is not None and penalties > Decimal("3"):
        insights.append(f"Tu mayor problema ahora son las penalizaciones: {penalties} por ronda.")
    elif ranking:
        insights.append(
            f"Donde más pierdes: {ranking[0].label} ({ranking[0].points_per_round} pts/ronda)."
        )
    return insights


async def dashboard_stats(
    db: AsyncSession,
    *,
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
) -> DashboardResponse:
    result = await db.execute(
        select(Round)
        .options(selectinload(Round.holes).selectinload(Hole.shots))
        .order_by(Round.played_at.desc())
    )
    rounds = list(result.scalars().all())

    normalize_18 = holes_filter == HolesFilter.both_normalized
    all_metrics = [m for r in rounds if (m := _round_metrics(r, normalize_18=normalize_18))]
    courses = sorted({m.course_name for m in all_metrics}, key=str.lower)

    pool = _filter_rounds(all_metrics, round_range=round_range, holes_filter=holes_filter, course=course)
    n = len(pool)

    base = _filter_rounds(
        all_metrics,
        round_range=RoundRange.all,
        holes_filter=holes_filter,
        course=course,
    )
    if round_range in (RoundRange.last_5, RoundRange.last_10, RoundRange.last_20):
        count = {RoundRange.last_5: 5, RoundRange.last_10: 10, RoundRange.last_20: 20}[round_range]
        current = base[:count]
        previous = base[count : count * 2]
    elif round_range == RoundRange.season:
        year = datetime.now(timezone.utc).year
        current = [m for m in base if m.played_at.year == year]
        previous = [m for m in base if m.played_at.year == year - 1]
    else:
        mid = max(1, len(base) // 2)
        current = base[:mid]
        previous = base[mid:]

    if not current and pool:
        current = pool

    def _period_stats(items: list[RoundMetrics]) -> dict:
        if not items:
            return {}
        scores = [m.score_18 for m in items]
        return {
            "avg_score": _avg([Decimal(s) for s in scores]),
            "best": min(scores),
            "worst": max(scores),
            "avg_penalties": _avg([Decimal(m.penalties_18) for m in items]),
            "avg_putts": _avg([Decimal(m.putts_18) for m in items]),
            "gir_pct": _avg([m.gir_pct for m in items if m.gir_pct is not None]),
        }

    cur = _period_stats(current if current else pool)
    prev = _period_stats(previous)

    trend_score = None
    if cur.get("avg_score") is not None and prev.get("avg_score") is not None:
        trend_score = _q(cur["avg_score"] - prev["avg_score"])

    trend_pen = None
    if cur.get("avg_penalties") is not None and prev.get("avg_penalties") is not None:
        trend_pen = _q(cur["avg_penalties"] - prev["avg_penalties"])

    trend_putts = None
    if cur.get("avg_putts") is not None and prev.get("avg_putts") is not None:
        trend_putts = _q(cur["avg_putts"] - prev["avg_putts"])

    trend_gir = None
    if cur.get("gir_pct") is not None and prev.get("gir_pct") is not None:
        trend_gir = _q(cur["gir_pct"] - prev["gir_pct"])

    # Stats del periodo visible (pool)
    visible = _period_stats(pool if pool else current)
    avg_pen = visible.get("avg_penalties")
    avg_putts = visible.get("avg_putts")
    gir_pct = visible.get("gir_pct")

    # Ranking golpes perdidos
    cat_totals = {k: Decimal("0") for k in CATEGORY_LABELS}
    for m in pool:
        for k, v in m.category_lost.items():
            cat_totals[k] += v
    ranking_raw = [
        (k, _q(cat_totals[k] / Decimal(n)) if n else Decimal("0"))
        for k in CATEGORY_LABELS
    ]
    ranking_raw.sort(key=lambda x: x[1], reverse=True)
    total_lost_per_round = sum(v for _, v in ranking_raw)
    lost_ranking = [
        LostPointsCategory(
            category=k,
            label=CATEGORY_LABELS[k],
            points_per_round=v,
            pct_of_total=_q(v / total_lost_per_round * 100) if total_lost_per_round > 0 else Decimal("0"),
        )
        for k, v in ranking_raw
    ]

    objective = _build_objective(avg_pen, avg_putts, gir_pct, lost_ranking)
    insights = _build_insights(trend_score, avg_pen, lost_ranking, n)

    return DashboardResponse(
        filters=DashboardFilters(
            round_range=round_range.value,
            holes_filter=holes_filter.value,
            course=course,
        ),
        available_courses=courses,
        rounds_in_period=n,
        insufficient_data=n < 3,
        summary=DashboardSummary(
            avg_score_18=visible.get("avg_score"),
            best_score_18=visible.get("best"),
            worst_score_18=visible.get("worst"),
            trend_score=trend_score,
        ),
        kpis={
            "score": DashboardKPI(
                value=visible.get("avg_score"),
                trend=trend_score,
                status=_kpi_status_score_trend(trend_score),
                label="Score medio",
            ),
            "penalties": DashboardKPI(
                value=avg_pen,
                trend=trend_pen,
                status=_kpi_status_penalties(avg_pen) if avg_pen is not None else "neutral",
                label="Penalizaciones / ronda",
            ),
            "putts": DashboardKPI(
                value=avg_putts,
                trend=trend_putts,
                status=_kpi_status_putts(avg_putts) if avg_putts is not None else "neutral",
                label="Putts / ronda",
            ),
            "gir": DashboardKPI(
                value=gir_pct,
                trend=trend_gir,
                status=_kpi_status_gir_trend(trend_gir),
                label="GIR %",
            ),
        },
        lost_points_ranking=lost_ranking,
        recommended_objective=objective,
        insights=insights,
    )

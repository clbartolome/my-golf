"""Cálculo de Handicap Index según WHS (simplificado para app personal).

Usa las mejores tarjetas de las últimas 20 rondas elegibles.
Si no hay course_rating, se usa la suma de par como valoración del campo.
Slope por defecto: 113.
"""

from decimal import Decimal, ROUND_DOWN
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

# Cuántas tarjetas usar según cuántas elegibles tengas (tabla WHS)
WHS_COUNT_TABLE: dict[int, int] = {
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 2,
    9: 3,
    10: 3,
    11: 3,
    12: 4,
    13: 4,
    14: 4,
    15: 5,
    16: 5,
    17: 6,
    18: 6,
    19: 7,
    20: 8,
}


@dataclass
class EligibleRound:
    round_id: UUID
    played_at: datetime
    course_name: str
    total_strokes: int
    total_par: int
    course_rating: Decimal
    slope_rating: int
    differential: Decimal


def _count_to_use(n: int) -> int:
    if n >= 20:
        return 8
    if n < 3:
        return 0
    return WHS_COUNT_TABLE.get(n, 8)


def score_differential(
    adjusted_gross: int,
    course_rating: Decimal,
    slope_rating: int,
) -> Decimal:
    """(113 / Slope) × (AGS − Course Rating)"""
    slope = slope_rating or 113
    diff = (Decimal(113) / Decimal(slope)) * (Decimal(adjusted_gross) - course_rating)
    return diff.quantize(Decimal("0.1"))


def handicap_index_from_differentials(differentials: list[Decimal]) -> Decimal | None:
    """Promedio de las mejores N × 0,96, truncado a 1 decimal (WHS)."""
    n = len(differentials)
    to_use = _count_to_use(n)
    if to_use == 0:
        return None

    recent = differentials[:20]
    lowest = sorted(recent)[:to_use]
    avg = sum(lowest) / Decimal(len(lowest))
    index = avg * Decimal("0.96")
    # Truncar (no redondear) a 1 decimal
    return index.quantize(Decimal("0.1"), rounding=ROUND_DOWN)


def build_eligible_round(
    round_id: UUID,
    played_at: datetime,
    course_name: str,
    total_strokes: int,
    total_par: int,
    course_rating: Decimal | None,
    slope_rating: int | None,
    holes_completed: int,
    planned_holes: int,
) -> EligibleRound | None:
    """Ronda elegible = todos los hoyos planificados completados (9 o 18)."""
    if holes_completed != planned_holes or planned_holes not in (9, 18):
        return None

    cr = course_rating if course_rating is not None else Decimal(total_par)
    slope = slope_rating or 113

    # Rondas de 9 hoyos: WHS usa CR de 9; si solo tenemos par de 9, OK
    diff = score_differential(total_strokes, cr, slope)

    return EligibleRound(
        round_id=round_id,
        played_at=played_at,
        course_name=course_name,
        total_strokes=total_strokes,
        total_par=total_par,
        course_rating=cr,
        slope_rating=slope,
        differential=diff,
    )


def compute_handicap(eligible: list[EligibleRound]) -> tuple[Decimal | None, list[EligibleRound], set[UUID]]:
    """Ordena por fecha desc, calcula índice con las últimas 20."""
    sorted_rounds = sorted(eligible, key=lambda r: r.played_at, reverse=True)
    recent = sorted_rounds[:20]
    diffs = [r.differential for r in recent]
    index = handicap_index_from_differentials(diffs)
    to_use = _count_to_use(len(diffs))
    used_ids: set[UUID] = set()
    if to_use:
        lowest = sorted(recent, key=lambda r: r.differential)[:to_use]
        used_ids = {r.round_id for r in lowest}
    return index, sorted_rounds, used_ids


def handicap_history(eligible: list[EligibleRound]) -> list[tuple[datetime, Decimal | None]]:
    """Índice recalculado tras cada ronda (orden cronológico)."""
    chronological = sorted(eligible, key=lambda r: r.played_at)
    history: list[tuple[datetime, Decimal | None]] = []
    accumulated: list[EligibleRound] = []

    for r in chronological:
        accumulated.append(r)
        sorted_acc = sorted(accumulated, key=lambda x: x.played_at, reverse=True)
        diffs = [x.differential for x in sorted_acc[:20]]
        idx = handicap_index_from_differentials(diffs)
        history.append((r.played_at, idx))

    return history

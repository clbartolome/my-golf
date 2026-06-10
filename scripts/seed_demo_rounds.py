#!/usr/bin/env python3
"""Genera rondas de prueba vía API para previsualizar estadísticas de palos."""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

COURSE_LAYOUT: list[tuple[int, int, int]] = [
    (1, 4, 395),
    (2, 3, 158),
    (3, 5, 512),
    (4, 4, 368),
    (5, 4, 410),
    (6, 3, 172),
    (7, 5, 538),
    (8, 4, 385),
    (9, 4, 420),
    (10, 4, 400),
    (11, 3, 145),
    (12, 5, 525),
    (13, 4, 355),
    (14, 4, 430),
    (15, 3, 165),
    (16, 4, 390),
    (17, 5, 505),
    (18, 4, 415),
]

PENALTY_RESULTS = {"water", "ob", "lost", "unplayable"}


def api(base: str, method: str, path: str, body: dict | None = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    req = Request(
        f"{base.rstrip('/')}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urlopen(req, timeout=120) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(f"{method} {path} -> {exc.code}: {detail}") from exc


def pick_club(distance: float, par: int, tee: bool, rng: random.Random) -> str:
    if tee and par >= 4:
        if par == 5 and rng.random() < 0.15:
            return "3M"
        return "Driver"
    if distance <= 12:
        return "Putter"
    if distance <= 35:
        return rng.choice(["GW", "SW", "PW"])
    if distance <= 75:
        return "PW"
    if distance <= 105:
        return rng.choice(["8I", "PW"])
    if distance <= 135:
        return "7I"
    if distance <= 175:
        return rng.choice(["4H", "5I"])
    return rng.choice(["4H", "3M"])


def sample_carry(club: str, rng: random.Random) -> float:
    profiles: dict[str, tuple[float, float]] = {
        "Driver": (205, 35),
        "3M": (185, 28),
        "4H": (168, 18),
        "5I": (155, 22),
        "7I": (122, 24),
        "8I": (108, 18),
        "PW": (86, 12),
        "GW": (24, 6),
        "SW": (14, 4),
        "Putter": (3, 1),
    }
    mean, std = profiles.get(club, (100, 20))
    return max(1.0, rng.gauss(mean, std))


def sample_outcome(club: str, rng: random.Random) -> tuple[str, str | None]:
    """(result, miss_line) — miss_line None si penalización."""
    if club == "Putter":
        if rng.random() < 0.35:
            return "green", rng.choice(["short", "long", "left", "right"])
        return "holed", "on_target"

    tables: dict[str, list[tuple[str, str | None, float]]] = {
        "Driver": [
            ("fairway", "on_target", 0.22),
            ("rough", "right", 0.32),
            ("rough", "left", 0.10),
            ("fairway", "long", 0.08),
            ("bunker", "right", 0.10),
            ("rough", "right", 0.08),
            ("water", None, 0.05),
            ("ob", None, 0.05),
        ],
        "3M": [
            ("fairway", "on_target", 0.45),
            ("rough", "right", 0.20),
            ("rough", "left", 0.12),
            ("fairway", "long", 0.10),
            ("bunker", "left", 0.08),
            ("ob", None, 0.05),
        ],
        "4H": [
            ("fairway", "on_target", 0.42),
            ("green", "on_target", 0.08),
            ("rough", "right", 0.12),
            ("rough", "left", 0.08),
            ("fairway", "long", 0.12),
            ("bunker", "short", 0.10),
            ("rough", "short", 0.08),
        ],
        "5I": [
            ("fairway", "on_target", 0.35),
            ("rough", "short", 0.18),
            ("rough", "right", 0.15),
            ("green", "on_target", 0.10),
            ("bunker", "short", 0.12),
            ("fairway", "long", 0.10),
        ],
        "7I": [
            ("rough", "short", 0.28),
            ("fairway", "on_target", 0.18),
            ("green", "short", 0.15),
            ("rough", "left", 0.12),
            ("bunker", "short", 0.10),
            ("green", "on_target", 0.10),
            ("fairway", "long", 0.07),
        ],
        "8I": [
            ("fairway", "on_target", 0.30),
            ("green", "on_target", 0.18),
            ("rough", "short", 0.18),
            ("rough", "right", 0.14),
            ("bunker", "short", 0.12),
            ("green", "short", 0.08),
        ],
        "PW": [
            ("green", "on_target", 0.38),
            ("green", "short", 0.18),
            ("fringe", "on_target", 0.12),
            ("rough", "short", 0.12),
            ("bunker", "short", 0.10),
            ("green", "long", 0.10),
        ],
        "GW": [
            ("green", "on_target", 0.40),
            ("green", "short", 0.22),
            ("fringe", "on_target", 0.15),
            ("rough", "short", 0.13),
            ("green", "long", 0.10),
        ],
        "SW": [
            ("green", "on_target", 0.45),
            ("green", "short", 0.25),
            ("fringe", "on_target", 0.15),
            ("rough", "short", 0.15),
        ],
    }
    options = tables.get(club, tables["7I"])
    roll = rng.random()
    acc = 0.0
    for result, miss, weight in options:
        acc += weight
        if roll <= acc:
            return result, miss
    last = options[-1]
    return last[0], last[1]


def post_shot(
    base: str,
    hole_id: str,
    *,
    club: str,
    distance_before: float | None,
    distance_after: float | None = None,
    distance_carry: float | None = None,
    result: str,
    miss_line: str | None,
) -> dict:
    body: dict[str, Any] = {
        "club": club,
        "distance_unit": "m",
        "result": result,
    }
    if distance_before is not None:
        body["distance_before"] = round(distance_before, 1)
    if distance_carry is not None:
        body["distance_carry"] = round(distance_carry, 1)
    elif distance_after is not None:
        body["distance_after"] = round(distance_after, 1)
    if miss_line is not None:
        body["miss_line"] = miss_line
    return api(base, "POST", f"/holes/{hole_id}/shots", body)


def resolve_penalty(base: str, hole_id: str, reason: str, distance_before: float) -> float:
    resp = api(
        base,
        "POST",
        f"/holes/{hole_id}/penalties",
        {"reason": reason, "relief": "replay"},
    )
    hint = resp["next_shot_hint"]
    return float(hint["distance_before"])


def play_shot(
    base: str,
    hole_id: str,
    *,
    club: str,
    distance: float,
    rng: random.Random,
    skip_carry_chance: float = 0.18,
    max_retries: int = 2,
) -> float:
    """Registra un golpe y devuelve distancia restante al hoyo (simulada)."""
    for attempt in range(max_retries + 1):
        result, miss_line = sample_outcome(club, rng)
        carry = sample_carry(club, rng)

        if club == "Putter":
            if result == "holed":
                post_shot(
                    base,
                    hole_id,
                    club=club,
                    distance_before=distance,
                    distance_after=0,
                    result="holed",
                    miss_line="on_target",
                )
                return 0.0
            leave = max(0.5, min(distance, rng.uniform(0.5, min(6.0, distance))))
            putt_carry = distance - leave
            if rng.random() < skip_carry_chance * 0.5:
                post_shot(
                    base,
                    hole_id,
                    club=club,
                    distance_before=distance,
                    result=result,
                    miss_line=miss_line,
                )
            else:
                post_shot(
                    base,
                    hole_id,
                    club=club,
                    distance_before=distance,
                    distance_carry=putt_carry,
                    result=result,
                    miss_line=miss_line,
                )
            return leave

        if result in PENALTY_RESULTS:
            post_shot(
                base,
                hole_id,
                club=club,
                distance_before=distance,
                distance_after=None,
                result=result,
                miss_line=None,
            )
            distance = resolve_penalty(base, hole_id, result, distance)
            continue

        if result in {"green", "fringe"}:
            leave = rng.uniform(1.0, min(12.0, max(2.0, distance * 0.35)))
            approach_carry = distance - leave
            if rng.random() < skip_carry_chance:
                post_shot(
                    base,
                    hole_id,
                    club=club,
                    distance_before=distance,
                    result=result,
                    miss_line=miss_line or "on_target",
                )
            else:
                post_shot(
                    base,
                    hole_id,
                    club=club,
                    distance_before=distance,
                    distance_carry=approach_carry,
                    result=result,
                    miss_line=miss_line or "on_target",
                )
            return leave

        remaining = max(0.0, distance - carry)
        if remaining <= 0.5:
            post_shot(
                base,
                hole_id,
                club=club,
                distance_before=distance,
                distance_after=0,
                result="holed",
                miss_line="on_target",
            )
            return 0.0

        post_shot(
            base,
            hole_id,
            club=club,
            distance_before=distance,
            distance_carry=carry if rng.random() >= skip_carry_chance else None,
            result=result,
            miss_line=miss_line or "on_target",
        )
        return remaining

    return distance


def play_hole(base: str, round_id: str, hole_number: int, par: int, start_distance: int, rng: random.Random) -> None:
    hole = api(
        base,
        "POST",
        f"/rounds/{round_id}/holes",
        {
            "hole_number": hole_number,
            "par": par,
            "starting_distance": start_distance,
            "starting_unit": "m",
        },
    )
    hole_id = hole["id"]
    distance = float(start_distance)
    tee = True
    safety = 0

    while distance > 0.5 and safety < 12:
        safety += 1
        club = pick_club(distance, par, tee, rng)
        tee = False
        distance = play_shot(base, hole_id, club=club, distance=distance, rng=rng)
        if distance <= 0.5:
            break


def seed_rounds(
    *,
    base: str,
    course: str,
    count: int,
    holes: int,
    seed: int,
    clean: bool,
) -> None:
    rng = random.Random(seed)

    if clean:
        existing = api(base, "GET", f"/rounds?course_name={course.replace(' ', '%20')}")
        for r in existing:
            api(base, "DELETE", f"/rounds/{r['id']}")
        if existing:
            print(f"Eliminadas {len(existing)} rondas previas en «{course}»")

    layout = COURSE_LAYOUT[:holes]
    now = datetime.now(timezone.utc)

    for i in range(count):
        played_at = (now - timedelta(days=count - i)).isoformat().replace("+00:00", "Z")
        round_ = api(
            base,
            "POST",
            "/rounds",
            {
                "course_name": course,
                "tees": "yellow",
                "planned_holes": holes,
                "played_at": played_at,
                "notes": "Ronda de prueba generada automáticamente",
            },
        )
        round_id = round_["id"]
        print(f"Ronda {i + 1}/{count} · {played_at[:10]} · id={round_id[:8]}…")

        for hole_number, par, distance in layout:
            play_hole(base, round_id, hole_number, par, distance, rng)

        api(base, "PATCH", f"/rounds/{round_id}", {"status": "completed"})
        time.sleep(0.05)

    print(f"\n✓ {count} rondas completadas en «{course}» ({holes} hoyos)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://localhost:8000", help="URL base de la API")
    parser.add_argument("--course", default="Campo Prueba", help="Nombre del campo")
    parser.add_argument("--rounds", type=int, default=10, help="Número de rondas")
    parser.add_argument("--holes", type=int, default=18, choices=[9, 18], help="Hoyos por ronda")
    parser.add_argument("--seed", type=int, default=42, help="Semilla aleatoria")
    parser.add_argument("--clean", action="store_true", help="Borrar rondas previas del mismo campo")
    args = parser.parse_args()

    try:
        api(args.api, "GET", "/health")
    except Exception as exc:
        print(f"API no disponible en {args.api}: {exc}", file=sys.stderr)
        sys.exit(1)

    t0 = time.time()
    seed_rounds(
        base=args.api,
        course=args.course,
        count=args.rounds,
        holes=args.holes,
        seed=args.seed,
        clean=args.clean,
    )
    elapsed = time.time() - t0
    print(f"Tiempo: {elapsed:.1f}s")
    print(f"\nFiltra por campo «{args.course}» en http://localhost:3001")
    print(f"Detalle de rondas: http://localhost:3001/rounds")


if __name__ == "__main__":
    main()

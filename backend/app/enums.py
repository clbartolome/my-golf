import enum


class RoundStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"


class DistanceUnit(str, enum.Enum):
    m = "m"
    yds = "yds"
    ft = "ft"


class ShotType(str, enum.Enum):
    normal = "normal"
    penalty = "penalty"


class PenaltyReason(str, enum.Enum):
    ob = "ob"
    water = "water"
    lost = "lost"
    unplayable = "unplayable"


class PenaltyRelief(str, enum.Enum):
    replay = "replay"
    drop = "drop"


class ShotMissLine(str, enum.Enum):
    on_target = "on_target"
    short = "short"
    long = "long"
    left = "left"
    right = "right"


class ShotResult(str, enum.Enum):
    fairway = "fairway"
    rough = "rough"
    rough_left = "rough_left"
    rough_right = "rough_right"
    bunker = "bunker"
    green = "green"
    fringe = "fringe"
    miss_short = "miss_short"
    miss_long = "miss_long"
    miss_left = "miss_left"
    miss_right = "miss_right"
    water = "water"
    ob = "ob"
    lost = "lost"
    unplayable = "unplayable"
    recovery = "recovery"
    holed = "holed"


PENALTY_TRIGGER_RESULTS = {
    ShotResult.water,
    ShotResult.ob,
    ShotResult.lost,
    ShotResult.unplayable,
}

# Valores legacy en result; los nuevos golpes usan lie + miss_line.
LEGACY_COMBINED_RESULTS = {
    ShotResult.miss_short,
    ShotResult.miss_long,
    ShotResult.miss_left,
    ShotResult.miss_right,
    ShotResult.rough_left,
    ShotResult.rough_right,
}

LIE_RESULTS = {
    ShotResult.fairway,
    ShotResult.rough,
    ShotResult.bunker,
    ShotResult.green,
    ShotResult.fringe,
    ShotResult.water,
    ShotResult.ob,
    ShotResult.lost,
    ShotResult.unplayable,
    ShotResult.recovery,
    ShotResult.holed,
}

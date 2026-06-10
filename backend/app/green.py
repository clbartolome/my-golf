"""Estado en green tras cada golpe (solo depende del lie, no de la línea)."""

from app.enums import ShotResult

ON_GREEN_LIES = {ShotResult.green, ShotResult.fringe, ShotResult.holed}
LEAVES_GREEN_LIES = {
    ShotResult.rough,
    ShotResult.rough_left,
    ShotResult.rough_right,
    ShotResult.bunker,
    ShotResult.recovery,
    ShotResult.water,
    ShotResult.ob,
    ShotResult.lost,
    ShotResult.unplayable,
}


def update_on_green(on_green: bool, result: ShotResult | None) -> bool:
    if result is None:
        return on_green
    if result in ON_GREEN_LIES:
        return True
    if on_green and result in LEAVES_GREEN_LIES:
        return False
    return on_green

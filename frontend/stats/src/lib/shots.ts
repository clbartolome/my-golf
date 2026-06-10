const LIE_LABELS: Record<string, string> = {
  fairway: "Fairway",
  rough: "Rough",
  bunker: "Bunker",
  green: "Green",
  fringe: "Fringe",
  water: "Agua",
  ob: "OB",
  lost: "Perdida",
  unplayable: "Imposible",
  recovery: "Recovery",
  holed: "Dentro",
};

const LINE_LABELS: Record<string, string> = {
  on_target: "Buena",
  short: "Corto",
  long: "Largo",
  left: "Izquierda",
  right: "Derecha",
};

export function formatShotResult(lie: string | null, missLine: string | null): string {
  if (!lie) return "";
  const lieLabel = LIE_LABELS[lie] ?? lie;
  if (!missLine || missLine === "on_target" || lie === "holed" || ["water", "ob", "lost", "unplayable"].includes(lie)) {
    return lieLabel;
  }
  return `${lieLabel} · ${LINE_LABELS[missLine] ?? missLine}`;
}

export function shotCarryMeters(before: string | null, after: string | null): number | null {
  if (before == null || after == null) return null;
  const carry = Number(before) - Number(after);
  if (!Number.isFinite(carry) || carry < 0) return null;
  return carry;
}

export function formatShotDistances(shot: {
  distance_before: string | null;
  distance_after: string | null;
  distance_unit: string | null;
  result: string | null;
}): string {
  const unit = shot.distance_unit ?? "m";
  const before = shot.distance_before;
  const after = shot.distance_after;
  if (before == null) return "—";
  const carry = shotCarryMeters(before, after);
  if (shot.result === "holed" || after === "0") {
    return `${before} ${unit} → ${before} m golpe`;
  }
  if (carry != null && carry > 0 && after != null) {
    const carryLabel = Number.isInteger(carry) ? `${carry}` : carry.toFixed(1);
    return `${before} → ${carryLabel} m → ${after} ${unit}`;
  }
  if (after != null) return `${before} → ${after} ${unit}`;
  return `${before} ${unit} · sin carry`;
}

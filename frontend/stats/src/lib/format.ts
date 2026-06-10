export function scoreLabel(vsPar: number): string {
  if (vsPar === 0) return "E";
  if (vsPar > 0) return `+${vsPar}`;
  return `${vsPar}`;
}

export function scoreClass(vsPar: number): string {
  if (vsPar < 0) return "text-lime-glow";
  if (vsPar === 0) return "text-white";
  if (vsPar === 1) return "text-sand";
  return "text-danger";
}

export function pct(n: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

export function fmtPct(value: string | null | undefined): string {
  if (value == null) return "—";
  return `${value}%`;
}

export function fmtNum(value: string | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${n}${suffix}`;
}

/** Media numérica sin prefijo + (putts, distancias, etc.) */
export function fmtAvg(value: string | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function teesLabel(tees: string | null): string {
  const map: Record<string, string> = {
    white: "Blancas",
    yellow: "Amarillas",
    blue: "Azules",
    red: "Rojas",
  };
  return tees ? map[tees] ?? tees : "—";
}

export function windLabel(wind: string | null): string {
  const map: Record<string, string> = {
    calm: "Calma",
    light: "Suave",
    strong: "Fuerte",
  };
  return wind ? map[wind] ?? wind : "—";
}

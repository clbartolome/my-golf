import type { DashboardKPI, HolesFilter, MinSample, RoundRange } from "../types";

export function fmtScore(v: string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toFixed(1);
}

export function fmtPct(v: string | null | undefined): string {
  if (v == null) return "—";
  return `${Number(v).toFixed(0)}%`;
}

export function fmtTrend(v: string | null | undefined, unit = "golpes", invert = false): string {
  if (v == null) return "";
  const n = Number(v);
  if (n === 0) return "sin cambio";
  const improving = invert ? n > 0 : n < 0;
  const arrow = improving ? "↓" : "↑";
  const sign = n > 0 ? "+" : "";
  return `${arrow} ${sign}${n.toFixed(1)} ${unit} vs periodo anterior`;
}

export function statusColor(status: DashboardKPI["status"]): string {
  if (status === "good") return "text-lime-glow";
  if (status === "bad") return "text-danger";
  return "text-white/55";
}

export const ROUND_RANGE_OPTIONS: { value: RoundRange; label: string }[] = [
  { value: "last_5", label: "Últimas 5" },
  { value: "last_10", label: "Últimas 10" },
  { value: "last_20", label: "Últimas 20" },
  { value: "season", label: "Temporada actual" },
  { value: "all", label: "Todo el histórico" },
];

export const HOLES_FILTER_OPTIONS: { value: HolesFilter; label: string }[] = [
  { value: "both_normalized", label: "Ambas (norm. 18)" },
  { value: "9", label: "Solo 9 hoyos" },
  { value: "18", label: "Solo 18 hoyos" },
];

export const MIN_SAMPLE_OPTIONS: { value: MinSample; label: string }[] = [
  { value: 0, label: "Sin mínimo" },
  { value: 10, label: "Mín. 10 golpes" },
  { value: 20, label: "Mín. 20 golpes" },
];

const MIN_SAMPLE_KEY = "mygolf-min-sample";

export function loadMinSample(): MinSample {
  const raw = localStorage.getItem(MIN_SAMPLE_KEY);
  if (raw === "0" || raw === "10" || raw === "20") return Number(raw) as MinSample;
  return 10;
}

export function saveMinSample(value: MinSample): void {
  localStorage.setItem(MIN_SAMPLE_KEY, String(value));
}

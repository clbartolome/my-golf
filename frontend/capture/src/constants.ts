import type { ShotLie, ShotLine } from "./types";

export type { ShotLie, ShotLine } from "./types";

export const LINE_OPTIONS: ShotLine[] = ["on_target", "short", "long", "left", "right"];

export const LINE_LABELS: Record<ShotLine, string> = {
  on_target: "Buena",
  short: "Corto",
  long: "Largo",
  left: "Izquierda",
  right: "Derecha",
};

export const LIE_LABELS: Record<string, string> = {
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
  // legacy
  rough_left: "Rough ←",
  rough_right: "Rough →",
  miss_short: "Corto",
  miss_long: "Largo",
  miss_left: "Izquierda",
  miss_right: "Derecha",
};

export const TEE_LIES: ShotLie[] = ["holed", "fairway", "rough", "bunker", "recovery", "green", "water", "ob"];

export const APPROACH_LIES: ShotLie[] = [
  "holed",
  "green",
  "fringe",
  "fairway",
  "rough",
  "bunker",
  "recovery",
  "water",
  "ob",
  "unplayable",
];

export const PUTT_LIES: ShotLie[] = ["holed", "green", "fringe", "rough", "bunker"];

export const PENALTY_LIES = new Set<ShotLie>(["water", "ob", "lost", "unplayable"]);

/** @deprecated use PENALTY_LIES */
export const PENALTY_RESULTS = PENALTY_LIES;

export function lieNeedsLine(lie: ShotLie | null): boolean {
  if (!lie) return false;
  return !PENALTY_LIES.has(lie) && lie !== "holed";
}

export function loadClubs(): string[] {
  try {
    const raw = localStorage.getItem(CLUB_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [...DEFAULT_CLUBS];
}

export function saveClubs(clubs: string[]): void {
  localStorage.setItem(CLUB_STORAGE_KEY, JSON.stringify(clubs));
}

const ON_GREEN_LIES = new Set(["green", "fringe", "holed"]);
const LEAVES_GREEN_LIES = new Set([
  "rough",
  "bunker",
  "recovery",
  "water",
  "ob",
  "lost",
  "unplayable",
]);

function updateOnGreen(onGreen: boolean, lie: string | null): boolean {
  if (!lie) return onGreen;
  if (ON_GREEN_LIES.has(lie)) return true;
  if (onGreen && LEAVES_GREEN_LIES.has(lie)) return false;
  return onGreen;
}

export function pendingPenaltyReason(
  shots: { shot_type: string; result: string | null; distance_after: string | null }[],
): "ob" | "water" | "lost" | "unplayable" | null {
  const last = shots.at(-1);
  if (!last || last.shot_type === "penalty") return null;
  if (
    last.shot_type === "normal" &&
    last.result &&
    PENALTY_LIES.has(last.result as ShotLie) &&
    last.distance_after === null
  ) {
    return last.result as "ob" | "water" | "lost" | "unplayable";
  }
  return null;
}

export function isOnGreen(shots: { result: string | null; shot_type: string }[]): boolean {
  let onGreen = false;
  for (const s of shots) {
    if (s.shot_type === "penalty") continue;
    onGreen = updateOnGreen(onGreen, s.result);
  }
  return onGreen;
}

export function formatShotResult(lie: string | null, missLine: string | null): string {
  if (!lie) return "";
  const lieLabel = LIE_LABELS[lie] ?? lie;
  if (!missLine || missLine === "on_target" || PENALTY_LIES.has(lie as ShotLie) || lie === "holed") {
    return lieLabel;
  }
  return `${lieLabel} · ${LINE_LABELS[missLine as ShotLine] ?? missLine}`;
}

export const DEFAULT_CLUBS = [
  "Driver",
  "3M",
  "5M",
  "4H",
  "5H",
  "4I",
  "5I",
  "6I",
  "7I",
  "8I",
  "9I",
  "PW",
  "GW",
  "SW",
  "LW",
  "Putter",
] as const;

export const CLUB_STORAGE_KEY = "mygolf-clubs";

export const TEES_OPTIONS = [
  { value: "white", label: "Blancas" },
  { value: "yellow", label: "Amarillas" },
  { value: "blue", label: "Azules" },
  { value: "red", label: "Rojas" },
] as const;

export const WIND_OPTIONS = [
  { value: "calm", label: "Calma" },
  { value: "light", label: "Suave" },
  { value: "strong", label: "Fuerte" },
] as const;

export const PAR_OPTIONS = [3, 4, 5] as const;

export function nextStrokeNumber(shots: { stroke_number: number }[]): number {
  if (!shots.length) return 1;
  return Math.max(...shots.map((s) => s.stroke_number)) + 1;
}

export function holeScore(shots: unknown[]): number {
  return shots.length;
}

export function scoreLabel(vsPar: number): string {
  if (vsPar === 0) return "E";
  if (vsPar > 0) return `+${vsPar}`;
  return `${vsPar}`;
}

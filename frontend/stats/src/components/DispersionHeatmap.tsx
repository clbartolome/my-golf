import { fmtPct } from "../lib/dashboard";
import type { DispersionHeatmap as HeatmapData } from "../types";

interface Props {
  heatmap: HeatmapData;
  club: string;
  embedded?: boolean;
}

function Cell({ label, pct, highlight }: { label: string; pct: string; highlight?: boolean }) {
  const n = Number(pct);
  const intensity = Math.min(1, n / 60);
  return (
    <div
      className="rounded-lg px-3 py-4 text-center"
      style={{
        backgroundColor: highlight
          ? `rgba(239, 68, 68, ${0.15 + intensity * 0.45})`
          : `rgba(184, 240, 69, ${0.08 + intensity * 0.35})`,
      }}
    >
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{fmtPct(pct)}</p>
    </div>
  );
}

export function DispersionHeatmap({ heatmap, club, embedded }: Props) {
  const hMax = Math.max(Number(heatmap.left_pct), Number(heatmap.center_pct), Number(heatmap.right_pct));

  return (
    <div className={embedded ? "panel p-4" : "card p-4"}>
      <p className="mb-3 text-sm font-semibold text-white/70">Tendencia de golpes · {club}</p>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Izquierda" pct={heatmap.left_pct} highlight={Number(heatmap.left_pct) === hMax && hMax >= 30} />
        <Cell label="Centro" pct={heatmap.center_pct} highlight={Number(heatmap.center_pct) === hMax && hMax >= 30} />
        <Cell label="Derecha" pct={heatmap.right_pct} highlight={Number(heatmap.right_pct) === hMax && hMax >= 30} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Cell label="Corto" pct={heatmap.short_pct} />
        <Cell label="Largo" pct={heatmap.long_pct} />
      </div>
    </div>
  );
}

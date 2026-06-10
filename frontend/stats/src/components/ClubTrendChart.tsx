import { useMemo, useState } from "react";
import { ClubTrendSeries } from "../types";
import { fmtDate } from "../lib/format";

interface ClubTrendChartProps {
  series: ClubTrendSeries[];
}

export function ClubTrendChart({ series }: ClubTrendChartProps) {
  const clubs = useMemo(() => series.map((s) => s.club), [series]);
  const [selected, setSelected] = useState(clubs[0] ?? "");

  const current = series.find((s) => s.club === selected);

  if (!series.length) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-white/35">
        Sin datos de distancias por ronda
      </div>
    );
  }

  if (!current || current.points.length < 2) {
    return (
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {clubs.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                selected === c ? "bg-lime-glow text-fairway-950" : "bg-white/8 text-white/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-sm text-white/35">Se necesitan al menos 2 rondas con datos de {selected}</p>
      </div>
    );
  }

  const dists = current.points.map((p) => Number(p.avg_distance));
  const min = Math.min(...dists) - 5;
  const max = Math.max(...dists) + 5;
  const range = max - min || 1;
  const w = 100 / (current.points.length - 1);
  const points = current.points
    .map((p, i) => `${i * w},${100 - ((Number(p.avg_distance) - min) / range) * 100}`)
    .join(" ");

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="font-bold">Distancia por palo</h3>
        <p className="text-xs text-white/45">Media por ronda (m)</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {clubs.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelected(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              selected === c ? "bg-lime-glow text-fairway-950" : "bg-white/8 text-white/60"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline fill="none" stroke="#b8f045" strokeWidth="1.5" points={points} />
          {current.points.map((p, i) => (
            <circle
              key={p.round_id}
              cx={i * w}
              cy={100 - ((Number(p.avg_distance) - min) / range) * 100}
              r="2"
              fill="#b8f045"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-white/35">
        <span>{fmtDate(current.points[0].played_at)}</span>
        <span>{fmtDate(current.points[current.points.length - 1].played_at)}</span>
      </div>
    </div>
  );
}

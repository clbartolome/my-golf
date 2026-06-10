import { ScoringTrendPoint } from "../types";
import { fmtDate, scoreClass, scoreLabel } from "../lib/format";

interface StrokesTrendChartProps {
  data: ScoringTrendPoint[];
}

export function StrokesTrendChart({ data }: StrokesTrendChartProps) {
  const eligible = data.filter((d) => d.holes_completed === d.planned_holes);
  if (eligible.length < 2) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-white/35">
        Completa al menos 2 rondas enteras para ver la evolución de golpes
      </div>
    );
  }

  const strokes = eligible.map((d) => d.total_strokes);
  const min = Math.min(...strokes) - 2;
  const max = Math.max(...strokes) + 2;
  const range = max - min || 1;
  const w = 100 / (eligible.length - 1);

  const strokePoints = eligible
    .map((d, i) => `${i * w},${100 - ((d.total_strokes - min) / range) * 100}`)
    .join(" ");

  return (
    <div className="card p-5">
      <h3 className="font-bold">Golpes por ronda</h3>
      <p className="text-xs text-white/45">Solo rondas completas (9 o 18 hoyos)</p>
      <div className="relative mt-6 h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" points={strokePoints} />
          {eligible.map((d, i) => (
            <circle
              key={d.round_id}
              cx={i * w}
              cy={100 - ((d.total_strokes - min) / range) * 100}
              r="2"
              fill="#38bdf8"
            />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {eligible.slice(-4).map((d) => (
          <span key={d.round_id} className="text-xs text-white/50">
            {fmtDate(d.played_at)}: <strong>{d.total_strokes}</strong> (
            <span className={scoreClass(d.score_vs_par)}>{scoreLabel(d.score_vs_par)}</span>)
          </span>
        ))}
      </div>
    </div>
  );
}

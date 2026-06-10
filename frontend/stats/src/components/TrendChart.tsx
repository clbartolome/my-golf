import { RoundSummaryStats } from "../types";
import { fmtDate, scoreClass, scoreLabel } from "../lib/format";

interface TrendChartProps {
  rounds: RoundSummaryStats[];
}

export function TrendChart({ rounds }: TrendChartProps) {
  const data = rounds
    .filter((r) => r.holes_completed > 0)
    .slice(0, 12)
    .reverse();

  if (data.length < 2) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-white/35">
        Necesitas al menos 2 rondas con hoyos para ver tendencia
      </div>
    );
  }

  const scores = data.map((r) => r.score_vs_par);
  const min = Math.min(...scores) - 1;
  const max = Math.max(...scores) + 1;
  const range = max - min || 1;
  const w = 100 / (data.length - 1);

  const points = data
    .map((r, i) => {
      const x = i * w;
      const y = 100 - ((r.score_vs_par - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="card p-5">
      <h3 className="font-bold">Tendencia vs par</h3>
      <p className="text-xs text-white/45">Últimas rondas con hoyos completados (más bajo = mejor)</p>
      <div className="relative mt-6 h-40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <polyline
            fill="none"
            stroke="#b8f045"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
          {data.map((r, i) => {
            const x = i * w;
            const y = 100 - ((r.score_vs_par - min) / range) * 100;
            return <circle key={r.round_id} cx={x} cy={y} r="2" fill="#b8f045" />;
          })}
        </svg>
        <div className="mt-2 flex justify-between text-[10px] text-white/35">
          {data.map((r) => (
            <span key={r.round_id}>{fmtDate(r.played_at).slice(0, 6)}</span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {data.slice(-3).map((r) => (
          <span key={r.round_id} className="text-xs text-white/50">
            {fmtDate(r.played_at)}:{" "}
            <strong className={scoreClass(r.score_vs_par)}>{scoreLabel(r.score_vs_par)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

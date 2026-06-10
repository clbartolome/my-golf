import { HandicapHistoryPoint } from "../types";
import { fmtDate } from "../lib/format";

interface HandicapChartProps {
  history: HandicapHistoryPoint[];
}

export function HandicapChart({ history }: HandicapChartProps) {
  const data = history.filter((h) => h.handicap_index != null);
  if (data.length < 2) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-white/35">
        Necesitas al menos 3 rondas completas para ver evolución del handicap
      </div>
    );
  }

  const values = data.map((d) => Number(d.handicap_index));
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min || 1;
  const w = 100 / (data.length - 1);

  const points = data
    .map((d, i) => {
      const x = i * w;
      const y = 100 - ((Number(d.handicap_index) - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="card p-5">
      <h3 className="font-bold">Evolución del Handicap</h3>
      <p className="text-xs text-white/45">WHS: mejores 8 de las últimas 20 tarjetas × 0,96</p>
      <div className="relative mt-6 h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline fill="none" stroke="#b8f045" strokeWidth="1.5" points={points} />
          {data.map((d, i) => {
            const x = i * w;
            const y = 100 - ((Number(d.handicap_index) - min) / range) * 100;
            return <circle key={i} cx={x} cy={y} r="2" fill="#b8f045" />;
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/35">
        <span>{fmtDate(data[0].played_at)}</span>
        <span>{fmtDate(data[data.length - 1].played_at)}</span>
      </div>
    </div>
  );
}

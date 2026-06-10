import { ClubDistanceStat } from "../types";

interface ClubChartProps {
  data: ClubDistanceStat[];
}

export function ClubChart({ data }: ClubChartProps) {
  if (!data.length) {
    return (
      <div className="card flex h-48 items-center justify-center text-sm text-white/35">
        Sin datos de distancias aún
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Number(d.avg_distance)));

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="font-bold">Distancia media por palo</h3>
        <p className="text-xs text-white/45">Calculada a partir de tus golpes registrados</p>
      </div>
      <div className="space-y-3">
        {data.map((d) => {
          const pct = max ? (Number(d.avg_distance) / max) * 100 : 0;
          return (
            <div key={`${d.club}-${d.unit}`} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3">
              <span className="text-sm font-bold">{d.club}</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fairway-600 to-lime-glow transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right text-sm tabular-nums text-white/70">
                {Number(d.avg_distance).toFixed(0)} {d.unit}
                <span className="ml-1 text-white/30">({d.shots})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

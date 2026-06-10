import { ProximityBucket } from "../types";

interface ProximityChartProps {
  buckets: ProximityBucket[];
}

export function ProximityChart({ buckets }: ProximityChartProps) {
  const withData = buckets.filter((b) => b.shots > 0);
  if (!withData.length) {
    return (
      <div className="card flex h-40 items-center justify-center text-sm text-white/35">
        Sin datos de proximidad al hoyo
      </div>
    );
  }

  const max = Math.max(...withData.map((b) => b.shots));

  return (
    <div className="card p-5">
      <h3 className="font-bold">Proximidad tras approach</h3>
      <p className="text-xs text-white/45">Metros restantes al hoyo · % de green alcanzado por franja</p>
      <div className="mt-5 space-y-3">
        {buckets.map((b) => (
          <div key={b.label} className="grid grid-cols-[5rem_1fr_4rem_4rem] items-center gap-3 text-sm">
            <span className="font-medium text-white/70">{b.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-water to-lime-glow"
                style={{ width: `${max ? (b.shots / max) * 100 : 0}%` }}
              />
            </div>
            <span className="text-right tabular-nums text-white/50">{b.shots} golpes</span>
            <span className="text-right tabular-nums text-lime-soft">
              {b.gir_pct != null ? `${b.gir_pct}% G` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

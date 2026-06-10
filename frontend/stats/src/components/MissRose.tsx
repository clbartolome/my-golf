import { PhaseMissStats } from "../types";

interface MissRoseProps {
  title: string;
  subtitle?: string;
  stats: PhaseMissStats;
}

function pct(v: string | null): number {
  return v ? Number(v) : 0;
}

export function MissRose({ title, subtitle, stats }: MissRoseProps) {
  if (!stats.total_shots) {
    return (
      <div className="card flex h-64 items-center justify-center p-5 text-sm text-white/35">
        Sin datos de {title.toLowerCase()}
      </div>
    );
  }

  const segments = [
    { key: "on_target", label: "Objetivo", pct: pct(stats.on_target_pct), color: "#b8f045" },
    { key: "left", label: "Izquierda", pct: pct(stats.left_pct), color: "#38bdf8" },
    { key: "right", label: "Derecha", pct: pct(stats.right_pct), color: "#f59e0b" },
    { key: "short", label: "Corto", pct: pct(stats.short_pct), color: "#a78bfa" },
    { key: "long", label: "Largo", pct: pct(stats.long_pct), color: "#f472b6" },
    { key: "trouble", label: "Problema", pct: pct(stats.trouble_pct), color: "#ff5c5c" },
  ].filter((s) => s.pct > 0);

  const cx = 100;
  const cy = 100;
  const maxR = 70;

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-white/45">{subtitle}</p>}
        <p className="mt-1 text-sm text-white/50">{stats.total_shots} golpes analizados</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="relative mx-auto aspect-square w-full max-w-[220px]">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            {/* crosshairs */}
            <line x1={cx} y1={30} x2={cx} y2={170} stroke="rgba(255,255,255,0.08)" />
            <line x1={30} y1={cy} x2={170} y2={cy} stroke="rgba(255,255,255,0.08)" />
            <text x={cx} y={22} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">
              LARGO
            </text>
            <text x={cx} y={188} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">
              CORTO
            </text>
            <text x={18} y={cy + 3} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">
              ←
            </text>
            <text x={182} y={cy + 3} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">
              →
            </text>
            <circle cx={cx} cy={cy} r={4} fill="#b8f045" opacity={0.8} />

            {segments.map((s) => {
              const r = (s.pct / 100) * maxR;
              let x = cx;
              let y = cy;
              if (s.key === "left") x = cx - r;
              else if (s.key === "right") x = cx + r;
              else if (s.key === "short") y = cy + r;
              else if (s.key === "long") y = cy - r;
              else if (s.key === "on_target") {
                return (
                  <circle key={s.key} cx={cx} cy={cy} r={8 + r * 0.15} fill={s.color} opacity={0.35} />
                );
              }
              if (s.key === "trouble") {
                return (
                  <circle key={s.key} cx={cx} cy={cy} r={r * 0.5} fill={s.color} opacity={0.5} stroke={s.color} strokeWidth={1} />
                );
              }
              return (
                <g key={s.key}>
                  <line x1={cx} y1={cy} x2={x} y2={y} stroke={s.color} strokeWidth={2 + s.pct / 20} opacity={0.7} />
                  <circle cx={x} cy={y} r={4 + s.pct / 15} fill={s.color} />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-2">
          {segments
            .sort((a, b) => b.pct - a.pct)
            .map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-sm">{s.label}</span>
                <span className="font-bold tabular-nums">{s.pct.toFixed(1)}%</span>
                <span className="w-8 text-right text-xs text-white/35">{stats.counts[s.key] ?? 0}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

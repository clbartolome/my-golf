import { fmtScore } from "../lib/dashboard";
import type { DistanceHistogramBar } from "../types";

interface Props {
  bars: DistanceHistogramBar[];
  club: string;
  embedded?: boolean;
}

export function DistanceHistogram({ bars, club, embedded }: Props) {
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className={embedded ? "panel p-4" : "card p-4"}>
      <p className="mb-3 text-sm font-semibold text-white/70">Distribución de carry · {club}</p>
      {bars.length === 0 ? (
        <p className="text-sm text-white/45">Sin datos de distancia.</p>
      ) : (
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {bars.map((b) => {
            const h = Math.max(4, (b.count / max) * 120);
            return (
              <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-white/50">{b.count}</span>
                <div
                  className="w-full rounded-t-md bg-lime-glow/70 transition-all"
                  style={{ height: h }}
                  title={`${b.label}: ${b.count} golpes`}
                />
                <span className="w-full truncate text-center text-[9px] leading-tight text-white/40">{b.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MapProps {
  entries: { club: string; median_m: string; min_m: string; max_m: string; avg_m: string }[];
  selectedClub?: string | null;
  onSelect?: (club: string) => void;
}

/** Mapa de distancias para consultar en campo: barras por palo ordenadas de largo a corto. */
export function YardageMap({ entries, selectedClub, onSelect }: MapProps) {
  const scaleMax = Math.max(...entries.map((e) => Number(e.max_m)), 1);

  return (
    <div className="card p-4">
      <p className="mb-1 text-sm font-semibold text-white/80">Mapa de distancias</p>
      <p className="mb-4 text-xs text-white/40">
        Referencia en campo · barra = rango min–max · punto = mediana
      </p>
      <div className="space-y-2">
        {entries.map((e) => {
          const min = Number(e.min_m);
          const max = Number(e.max_m);
          const med = Number(e.median_m);
          const left = (min / scaleMax) * 100;
          const width = Math.max(((max - min) / scaleMax) * 100, 2);
          const medPos = (med / scaleMax) * 100;
          const active = selectedClub === e.club;
          return (
            <button
              key={e.club}
              type="button"
              onClick={() => onSelect?.(e.club)}
              className={[
                "grid w-full grid-cols-[4.5rem_1fr_3rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition",
                active ? "bg-lime-glow/10" : "hover:bg-white/4",
              ].join(" ")}
            >
              <span className="truncate text-sm font-semibold">{e.club}</span>
              <div className="relative h-5 rounded-full bg-white/6">
                <div
                  className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-lime-glow/35"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-lime-glow"
                  style={{ left: `${medPos}%` }}
                />
              </div>
              <span className="text-right text-sm font-bold tabular-nums text-lime-glow">
                {fmtScore(e.median_m)}m
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-white/30 tabular-nums">
        <span>0m</span>
        <span>{Math.round(scaleMax)}m</span>
      </div>
    </div>
  );
}

interface BoxProps {
  p10: string | null;
  p25: string | null;
  median: string | null;
  p75: string | null;
  p90: string | null;
  min: string | null;
  max: string | null;
}

export function DistanceBoxPlot({ p10, p25, median, p75, p90, min, max }: BoxProps) {
  const vals = [min, p10, p25, median, p75, p90, max].map((v) => (v != null ? Number(v) : null)).filter((v) => v != null) as number[];
  if (vals.length < 2) return null;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const pos = (v: number) => ((v - lo) / span) * 100;

  const p25n = p25 ? Number(p25) : null;
  const p75n = p75 ? Number(p75) : null;
  const medn = median ? Number(median) : null;

  return (
    <div className="panel p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/45">Rango de distancias</p>
      <div className="relative mx-2 h-10 rounded-full bg-white/6">
        {min != null && max != null && (
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-white/25"
            style={{ left: `${pos(Number(min))}%`, width: `${pos(Number(max)) - pos(Number(min))}%` }}
          />
        )}
        {p25n != null && p75n != null && (
          <div
            className="absolute top-1/2 h-6 -translate-y-1/2 rounded bg-lime-glow/25"
            style={{ left: `${pos(p25n)}%`, width: `${Math.max(pos(p75n) - pos(p25n), 1)}%` }}
          />
        )}
        {medn != null && (
          <div
            className="absolute top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-lime-glow"
            style={{ left: `${pos(medn)}%` }}
          />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-7">
        {[
          ["Min", min],
          ["P10", p10],
          ["P25", p25],
          ["Med", median],
          ["P75", p75],
          ["P90", p90],
          ["Max", max],
        ].map(([label, val]) => (
          <div key={label as string} className="text-center">
            <dt className="text-white/40">{label}</dt>
            <dd className="font-semibold tabular-nums">{val ? `${fmtScore(val as string)}m` : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

import { ClubMissStats } from "../types";

function fmt(v: string | null, suffix = ""): string {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}${suffix}`;
}

function fmtPct(v: string | null): string {
  if (v == null) return "—";
  return `${Number(v).toFixed(0)}%`;
}

interface ClubAnalyticsTableProps {
  clubs: ClubMissStats[];
}

export function ClubAnalyticsTable({ clubs }: ClubAnalyticsTableProps) {
  if (!clubs.length) {
    return (
      <div className="card flex h-32 items-center justify-center text-sm text-white/35">
        Sin datos por palo
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/40">
            <th className="px-3 py-3">Palo</th>
            <th className="px-3 py-3">Golpes</th>
            <th className="px-3 py-3">Carry m</th>
            <th className="px-3 py-3">Restante m</th>
            <th className="px-3 py-3">Prox. m</th>
            <th className="px-3 py-3">Objetivo</th>
            <th className="px-3 py-3">←</th>
            <th className="px-3 py-3">→</th>
            <th className="px-3 py-3">Corto</th>
            <th className="px-3 py-3">Largo</th>
            <th className="px-3 py-3">FIR</th>
            <th className="px-3 py-3">Putt m</th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((c) => (
            <tr key={c.club} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-3 py-2.5 font-bold">{c.club}</td>
              <td className="px-3 py-2.5 tabular-nums">{c.total_shots}</td>
              <td className="px-3 py-2.5 tabular-nums text-white/70">{fmt(c.avg_carry_m)}</td>
              <td className="px-3 py-2.5 tabular-nums text-white/70">{fmt(c.avg_remaining_m)}</td>
              <td className="px-3 py-2.5 tabular-nums text-lime-soft">{fmt(c.avg_proximity_m)}</td>
              <td className="px-3 py-2.5 tabular-nums">{fmtPct(c.on_target_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums text-water">{fmtPct(c.left_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums text-amber-300/80">{fmtPct(c.right_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums">{fmtPct(c.short_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums">{fmtPct(c.long_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums text-lime-glow">{fmtPct(c.fir_pct)}</td>
              <td className="px-3 py-2.5 tabular-nums">{fmt(c.avg_putt_length_m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

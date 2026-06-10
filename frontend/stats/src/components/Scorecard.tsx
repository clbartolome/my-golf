import { HoleStats } from "../types";
import { scoreClass, scoreLabel } from "../lib/format";

interface ScorecardProps {
  holes: HoleStats[];
  plannedHoles?: number;
}

export function Scorecard({ holes, plannedHoles = 18 }: ScorecardProps) {
  const holeMap = new Map(holes.map((h) => [h.hole_number, h]));
  const numbers = Array.from({ length: plannedHoles }, (_, i) => i + 1);
  const half = Math.ceil(plannedHoles / 2);
  const front = numbers.slice(0, half);
  const back = numbers.slice(half);

  const renderRow = (nums: number[], label: string) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${nums.length}, minmax(0, 1fr))` }}>
        {nums.map((n) => {
          const h = holeMap.get(n);
          return (
            <div key={n} className="card overflow-hidden p-0 text-center">
              <div className="bg-white/5 px-1 py-1 text-[10px] font-bold text-white/40">H{n}</div>
              <div className="px-1 py-1 text-xs text-white/45">{h?.par ?? "·"}</div>
              <div className={`px-1 py-2 text-lg font-extrabold tabular-nums ${h ? scoreClass(h.score_vs_par) : "text-white/20"}`}>
                {h ? h.strokes : "·"}
              </div>
              <div className={`px-1 pb-2 text-xs font-semibold ${h ? scoreClass(h.score_vs_par) : "text-white/15"}`}>
                {h ? scoreLabel(h.score_vs_par) : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="card space-y-6 p-5">
      <h3 className="font-bold">Tarjeta de score</h3>
      {renderRow(front, plannedHoles <= 9 ? "Recorrido" : "Ida")}
      {back.length > 0 && renderRow(back, "Vuelta")}
    </div>
  );
}

interface HolesDetailTableProps {
  holes: HoleStats[];
}

export function HolesDetailTable({ holes }: HolesDetailTableProps) {
  if (!holes.length) return null;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-xs uppercase tracking-wider text-white/40">
            <th className="px-4 py-3">Hoyo</th>
            <th className="px-4 py-3">Par</th>
            <th className="px-4 py-3">Golpes</th>
            <th className="px-4 py-3">vs Par</th>
            <th className="px-4 py-3">Putts</th>
            <th className="px-4 py-3">GIR</th>
            <th className="px-4 py-3">FIR</th>
            <th className="px-4 py-3">Pen.</th>
          </tr>
        </thead>
        <tbody>
          {holes.map((h) => (
            <tr key={h.hole_id} className="border-b border-white/5">
              <td className="px-4 py-3 font-bold">{h.hole_number}</td>
              <td className="px-4 py-3 text-white/60">{h.par}</td>
              <td className="px-4 py-3 font-semibold tabular-nums">{h.strokes}</td>
              <td className={`px-4 py-3 font-bold tabular-nums ${scoreClass(h.score_vs_par)}`}>
                {scoreLabel(h.score_vs_par)}
              </td>
              <td className="px-4 py-3 tabular-nums">{h.putts}</td>
              <td className="px-4 py-3">{h.gir ? "✓" : "✗"}</td>
              <td className="px-4 py-3">{h.fir == null ? "—" : h.fir ? "✓" : "✗"}</td>
              <td className="px-4 py-3 tabular-nums text-white/50">{h.penalties || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { RoundSummaryStats } from "../types";
import { fmtDate, pct, scoreClass, scoreLabel } from "../lib/format";
import { Link } from "react-router-dom";

interface RoundsTableProps {
  rounds: RoundSummaryStats[];
  compact?: boolean;
  onDelete?: (round: RoundSummaryStats) => void;
}

export function RoundsTable({ rounds, compact, onDelete }: RoundsTableProps) {
  if (!rounds.length) {
    return (
      <div className="card flex h-32 items-center justify-center text-sm text-white/35">
        No hay rondas todavía
      </div>
    );
  }

  const shown = compact ? rounds.slice(0, 5) : rounds;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-xs uppercase tracking-wider text-white/40">
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Campo</th>
            {!compact && <th className="px-4 py-3 font-semibold">Estado</th>}
            <th className="px-4 py-3 font-semibold">Hoyos</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">GIR</th>
            <th className="px-4 py-3 font-semibold">Putts</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.round_id} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-4 py-3 text-white/70">{fmtDate(r.played_at)}</td>
              <td className="px-4 py-3 font-medium">{r.course_name}</td>
              {!compact && (
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "completed" ? "bg-lime-glow/15 text-lime-soft" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {r.status === "completed" ? "Completa" : "En curso"}
                  </span>
                </td>
              )}
              <td className="px-4 py-3 tabular-nums text-white/60">
                {r.holes_completed}/{r.planned_holes}
              </td>
              <td className={`px-4 py-3 font-bold tabular-nums ${scoreClass(r.score_vs_par)}`}>
                {r.holes_completed ? scoreLabel(r.score_vs_par) : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums text-white/60">
                {r.gir_opportunities ? pct(r.gir_count, r.gir_opportunities) : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums text-white/60">{r.holes_completed ? r.putts : "—"}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link to={`/rounds/${r.round_id}`} className="text-lime-glow/80 hover:text-lime-glow">
                    Ver
                  </Link>
                  {onDelete && !compact && (
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      className="text-danger/70 hover:text-danger"
                      title="Borrar ronda"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

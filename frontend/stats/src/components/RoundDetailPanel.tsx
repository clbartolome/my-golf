import { fmtDateTime, pct, scoreClass, scoreLabel, teesLabel, windLabel } from "../lib/format";
import { formatShotDistances, formatShotResult } from "../lib/shots";
import type { HoleRead, HoleStats, RoundDetail, RoundStatsDetail, RoundSummaryStats } from "../types";

interface RoundDetailPanelProps {
  summary: RoundSummaryStats;
  detail: RoundDetail;
  holeStats: RoundStatsDetail;
  onClose: () => void;
  captureUrl: string;
}

export function RoundDetailPanel({
  summary,
  detail,
  holeStats,
  onClose,
  captureUrl,
}: RoundDetailPanelProps) {
  const statsByHole = new Map(holeStats.holes.map((h) => [h.hole_number, h]));

  return (
    <div className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/45">{fmtDateTime(detail.played_at)}</p>
          <h2 className="mt-1 text-xl font-extrabold">{detail.course_name}</h2>
          <p className="mt-1 text-sm text-white/45">
            {detail.planned_holes} hoyos
            {detail.tees ? ` · ${teesLabel(detail.tees)}` : ""}
            {detail.wind ? ` · ${windLabel(detail.wind)}` : ""}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className={`text-3xl font-extrabold tabular-nums ${scoreClass(summary.score_vs_par)}`}>
              {scoreLabel(summary.score_vs_par)}
            </p>
            <p className="text-sm text-white/45 tabular-nums">{summary.total_strokes} golpes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/6"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-white/8 px-5 py-4 sm:grid-cols-4">
        <StatChip label="Putts" value={String(summary.putts)} />
        <StatChip label="Penaliz." value={String(summary.penalty_strokes)} />
        <StatChip label="GIR" value={pct(summary.gir_count, summary.gir_opportunities)} />
        <StatChip label="FIR" value={pct(summary.fir_count, summary.fir_opportunities)} />
      </div>

      {detail.notes && (
        <p className="border-b border-white/8 px-5 py-3 text-sm text-white/50">{detail.notes}</p>
      )}

      {summary.status === "in_progress" && (
        <div className="border-b border-white/8 px-5 py-3">
          <a
            href={captureUrl}
            className="inline-flex rounded-xl bg-lime-glow px-4 py-2 text-sm font-bold text-fairway-950"
          >
            Continuar en captura
          </a>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {[...detail.holes]
          .sort((a, b) => a.hole_number - b.hole_number)
          .map((hole) => (
            <HoleSection key={hole.id} hole={hole} stats={statsByHole.get(hole.hole_number)} />
          ))}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function HoleSection({ hole, stats }: { hole: HoleRead; stats?: HoleStats }) {
  const scoreVsPar = stats?.score_vs_par ?? hole.shots.length - hole.par;

  return (
    <details className="group px-5 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fairway-800 text-sm font-bold">
            {hole.hole_number}
          </span>
          <div className="min-w-0">
            <p className="font-semibold">
              Par {hole.par}
              <span className="ml-2 text-white/45">· {hole.starting_distance} m</span>
            </p>
            <p className="text-xs text-white/40">
              {hole.shots.length} golpe{hole.shots.length !== 1 ? "s" : ""}
              {stats != null && ` · ${stats.putts} putt${stats.putts !== 1 ? "s" : ""}`}
              {stats?.gir && " · GIR"}
              {stats?.fir === true && " · FIR"}
              {stats != null && stats.penalties > 0 && ` · ${stats.penalties} pen.`}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-lg font-bold tabular-nums ${scoreClass(scoreVsPar)}`}>
          {scoreLabel(scoreVsPar)}
        </span>
      </summary>

      <div className="mt-3 space-y-2 pb-1 pl-11">
        {hole.shots.map((shot) => (
          <div key={shot.id} className="panel px-3 py-2.5 text-sm">
            {shot.shot_type === "penalty" ? (
              <p className="font-semibold text-danger">
                Penalización · {shot.penalty_reason?.toUpperCase()}
              </p>
            ) : (
              <>
                <p className="font-semibold">{shot.club}</p>
                <p className="mt-0.5 text-xs text-white/45">{formatShotDistances(shot)}</p>
                {shot.result && (
                  <p className="mt-0.5 text-xs text-white/55">
                    {formatShotResult(shot.result, shot.miss_line)}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

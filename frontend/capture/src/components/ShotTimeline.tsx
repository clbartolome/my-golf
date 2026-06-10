import { Shot } from "../types";
import { formatShotDistances, formatShotResult } from "../constants";

interface ShotTimelineProps {
  shots: Shot[];
}

export function ShotTimeline({ shots }: ShotTimelineProps) {
  if (!shots.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/35">
        Aún no hay golpes en este hoyo
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {shots.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fairway-700 text-sm font-bold">
            {s.stroke_number}
          </span>
          {s.shot_type === "penalty" ? (
            <div>
              <p className="font-semibold text-danger">Penalización</p>
              <p className="text-xs text-white/45 uppercase">{s.penalty_reason}</p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.club}</p>
              <p className="truncate text-xs text-white/45">
                {formatShotDistances(s)}
                {s.result && ` · ${formatShotResult(s.result, s.miss_line)}`}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

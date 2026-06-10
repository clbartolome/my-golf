import type { HolesFilter, MinSample, RoundRange } from "../types";
import { HOLES_FILTER_OPTIONS, MIN_SAMPLE_OPTIONS, ROUND_RANGE_OPTIONS } from "../lib/dashboard";

interface StatsFiltersProps {
  roundRange: RoundRange;
  holesFilter: HolesFilter;
  course: string;
  courses: string[];
  onRoundRangeChange: (v: RoundRange) => void;
  onHolesFilterChange: (v: HolesFilter) => void;
  onCourseChange: (v: string) => void;
  minSample?: MinSample;
  onMinSampleChange?: (v: MinSample) => void;
}

export function StatsFilters({
  roundRange,
  holesFilter,
  course,
  courses,
  onRoundRangeChange,
  onHolesFilterChange,
  onCourseChange,
  minSample,
  onMinSampleChange,
}: StatsFiltersProps) {
  return (
    <div className="card flex flex-wrap gap-3 p-3">
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-white/45">
        Rondas
        <select
          value={roundRange}
          onChange={(e) => onRoundRangeChange(e.target.value as RoundRange)}
          className="rounded-xl border border-white/10 bg-fairway-950 px-3 py-2 text-sm text-white"
        >
          {ROUND_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-white/45">
        Tipo de vuelta
        <select
          value={holesFilter}
          onChange={(e) => onHolesFilterChange(e.target.value as HolesFilter)}
          className="rounded-xl border border-white/10 bg-fairway-950 px-3 py-2 text-sm text-white"
        >
          {HOLES_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[160px] flex-[2] flex-col gap-1 text-xs text-white/45">
        Campo
        <select
          value={course}
          onChange={(e) => onCourseChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-fairway-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos los campos</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {minSample !== undefined && onMinSampleChange && (
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-white/45">
          Muestra por palo
          <select
            value={minSample}
            onChange={(e) => onMinSampleChange(Number(e.target.value) as MinSample)}
            className="rounded-xl border border-white/10 bg-fairway-950 px-3 py-2 text-sm text-white"
          >
            {MIN_SAMPLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

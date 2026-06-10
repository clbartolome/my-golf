import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DispersionHeatmap } from "../components/DispersionHeatmap";
import { PageShell } from "../components/PageShell";
import { StatCard } from "../components/StatCard";
import { StatsFilters } from "../components/StatsFilters";
import { fmtPct, fmtScore } from "../lib/dashboard";
import type { HolesFilter, PuttingAnalysisResponse, RoundRange } from "../types";

export function PuttingPage() {
  const [roundRange, setRoundRange] = useState<RoundRange>("last_10");
  const [holesFilter, setHolesFilter] = useState<HolesFilter>("both_normalized");
  const [course, setCourse] = useState("");
  const [data, setData] = useState<PuttingAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.putting({
          round_range: roundRange,
          holes_filter: holesFilter,
          course: course || null,
        }),
      );
    } catch {
      setError("No se pudo cargar el análisis de putting");
    } finally {
      setLoading(false);
    }
  }, [roundRange, holesFilter, course]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <p className="text-white/40">Cargando…</p>;
  if (error && !data) return <p className="text-white/50">{error}</p>;
  if (!data) return null;

  const empty = data.total_putts === 0;

  return (
    <PageShell
      title="Putting"
      subtitle={`${data.rounds_in_period} ronda${data.rounds_in_period !== 1 ? "s" : ""} en el periodo`}
      footer={
        <p className="page-footer">
          <Link to="/clubs" className="text-lime-glow/70 underline">
            Volver a palos de juego
          </Link>
        </p>
      }
    >
      <StatsFilters
        roundRange={roundRange}
        holesFilter={holesFilter}
        course={course}
        courses={data.available_courses}
        onRoundRangeChange={setRoundRange}
        onHolesFilterChange={setHolesFilter}
        onCourseChange={setCourse}
      />

      {empty ? (
        <div className="card px-5 py-12 text-center text-white/45">No hay putts registrados en este periodo.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Putts / ronda" value={fmtScore(data.putts_per_round)} hint={`${data.total_putts} total`} />
            <StatCard
              label="Puntos / ronda"
              value={fmtScore(data.stroke_cost_per_round)}
              hint="Errores de línea y distancia"
              valueClassName={Number(data.stroke_cost_per_round) >= 1 ? "text-danger" : undefined}
            />
            <StatCard label="Make %" value={fmtPct(data.make_pct)} hint="Putts embocados" accent />
            <StatCard
              label="Distancia media"
              value={data.avg_length_m ? `${fmtScore(data.avg_length_m)}m` : "—"}
              hint="Antes de cada putt"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="1 putt" value={data.one_putt_pct ? fmtPct(data.one_putt_pct) : "—"} hint="% hoyos" />
            <StatCard label="2 putts" value={data.two_putt_pct ? fmtPct(data.two_putt_pct) : "—"} hint="% hoyos" />
            <StatCard
              label="3+ putts"
              value={data.three_putt_plus_pct ? fmtPct(data.three_putt_plus_pct) : "—"}
              hint="% hoyos"
              valueClassName="text-danger"
            />
          </div>

          <div className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Patrón en fallos</p>
            <p className="mt-1 text-xl font-extrabold">{data.dominant_pattern}</p>
            {Number(data.dominant_pattern_pct) > 0 && (
              <p className="mt-0.5 text-sm text-white/45">{fmtPct(data.dominant_pattern_pct)} de fallos</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DispersionHeatmap heatmap={data.heatmap} club="Putting" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <BreakdownTable title="Desvío en fallos" rows={data.miss_breakdown} />
              <div className="panel p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                  Make % por distancia
                </p>
                {data.distance_buckets.length === 0 ? (
                  <p className="text-sm text-white/45">Sin datos de distancia.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.distance_buckets.map((b) => (
                      <li key={b.label} className="flex items-center gap-3 text-sm">
                        <span className="min-w-0 flex-1 text-white/70">{b.label}</span>
                        <span className="shrink-0 tabular-nums text-white/40">{b.attempts}</span>
                        <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-lime-glow">
                          {b.make_pct ? fmtPct(b.make_pct) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; pct: string }[] }) {
  if (rows.length === 0) {
    return (
      <div className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{title}</p>
        <p className="mt-1 text-sm text-white/45">Sin fallos registrados.</p>
      </div>
    );
  }
  return (
    <div className="panel p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between text-sm">
            <span className="text-white/70">{r.label}</span>
            <span className="tabular-nums font-medium">{fmtPct(r.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

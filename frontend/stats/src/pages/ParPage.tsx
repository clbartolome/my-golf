import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { PageShell } from "../components/PageShell";
import { StatCard } from "../components/StatCard";
import { StatsFilters } from "../components/StatsFilters";
import { fmtPct, fmtScore } from "../lib/dashboard";
import type { HolesFilter, ParAnalysisResponse, ParTypeStats, RoundRange } from "../types";

export function ParPage() {
  const [roundRange, setRoundRange] = useState<RoundRange>("last_10");
  const [holesFilter, setHolesFilter] = useState<HolesFilter>("both_normalized");
  const [course, setCourse] = useState("");
  const [data, setData] = useState<ParAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.par({
          round_range: roundRange,
          holes_filter: holesFilter,
          course: course || null,
        }),
      );
    } catch {
      setError("No se pudo cargar el análisis por par");
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

  return (
    <PageShell
      title="Por tipo de hoyo"
      subtitle={`Par 3, 4 y 5 · ${data.rounds_in_period} ronda${data.rounds_in_period !== 1 ? "s" : ""}`}
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

      {data.by_par.length === 0 ? (
        <div className="card px-5 py-12 text-center text-white/45">No hay hoyos completados en este periodo.</div>
      ) : (
        <div className="space-y-4">
          {data.insights.length > 0 && (
            <ul className="space-y-2">
              {data.insights.map((line) => (
                <li key={line} className="panel px-4 py-2.5 text-sm text-white/75">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {data.by_par.map((p) => (
            <ParSection key={p.par} stats={p} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ParSection({ stats: p }: { stats: ParTypeStats }) {
  const vsPar = p.avg_vs_par != null ? Number(p.avg_vs_par) : 0;

  return (
    <section className="card space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-3">
        <div>
          <h3 className="text-xl font-extrabold">Par {p.par}</h3>
          <p className="text-sm text-white/45">{p.holes_played} hoyos jugados</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-extrabold tabular-nums ${vsPar < 0 ? "text-lime-glow" : vsPar > 0.5 ? "text-danger" : vsPar > 0 ? "text-sand" : "text-white"}`}>
            {p.avg_vs_par != null
              ? `${vsPar > 0 ? "+" : ""}${fmtScore(p.avg_vs_par)}`
              : "—"}
          </p>
          <p className="text-xs text-white/40">media vs par · {p.avg_strokes ? fmtScore(p.avg_strokes) : "—"} golpes</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GIR" value={p.gir_pct ? fmtPct(p.gir_pct) : "—"} hint="Green en regulación" />
        {p.fir_pct != null && <StatCard label="FIR" value={fmtPct(p.fir_pct)} hint="Salida a calle" />}
        <StatCard label="Putts / hoyo" value={p.avg_putts ? fmtScore(p.avg_putts) : "—"} />
        <StatCard
          label="Hoyos con penalización"
          value={p.penalty_hole_pct ? fmtPct(p.penalty_hole_pct) : "—"}
          valueClassName={Number(p.penalty_hole_pct) > 15 ? "text-danger" : undefined}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Distribución de score</p>
        <div className="space-y-2">
          {p.score_breakdown.map((b) => {
            const pct = Number(b.pct);
            const tone =
              b.label.includes("Águila") || b.label === "Birdie"
                ? "bg-lime-glow"
                : b.label === "Par"
                  ? "bg-white/40"
                  : b.label === "Bogey"
                    ? "bg-sand"
                    : "bg-danger";
            return (
              <div key={b.label}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="text-white/70">{b.label}</span>
                  <span className="tabular-nums text-white/50">
                    {b.count} · {fmtPct(b.pct)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, b.count ? 2 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

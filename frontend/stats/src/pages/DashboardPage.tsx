import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { KpiCard } from "../components/KpiCard";
import { PageShell } from "../components/PageShell";
import { StatCard } from "../components/StatCard";
import { StatsFilters } from "../components/StatsFilters";
import {
  fmtScore,
  fmtTrend,
} from "../lib/dashboard";
import type { DashboardResponse, HolesFilter, RoundRange } from "../types";

export function DashboardPage() {
  const [roundRange, setRoundRange] = useState<RoundRange>("last_10");
  const [holesFilter, setHolesFilter] = useState<HolesFilter>("both_normalized");
  const [course, setCourse] = useState<string>("");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard({
        round_range: roundRange,
        holes_filter: holesFilter,
        course: course || null,
      });
      setData(res);
    } catch {
      setError("No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  }, [roundRange, holesFilter, course]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-white/40">Cargando…</p>;
  }

  if (error && !data) {
    return <p className="text-white/50">{error}</p>;
  }

  if (!data) return null;

  const empty = data.rounds_in_period === 0;

  return (
    <PageShell
      title="¿Qué entrenar ahora?"
      subtitle={`${data.rounds_in_period} ronda${data.rounds_in_period !== 1 ? "s" : ""} en el periodo`}
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
        <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center">
          <p className="text-4xl">⛳</p>
          <p className="max-w-md text-lg font-semibold">Aún no hay rondas en este filtro</p>
          <p className="max-w-md text-sm text-white/45">
            Completa al menos una ronda en la app de captura para ver tu dashboard.
          </p>
          <a
            href="http://localhost:3000"
            className="mt-2 rounded-xl bg-lime-glow px-6 py-3 font-bold text-fairway-950"
          >
            Ir a captura
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {data.insufficient_data && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
              Aún no hay suficientes datos para tendencias fiables (menos de 3 rondas). Sigue registrando.
            </div>
          )}

          {data.insights.length > 0 && (
            <ul className="space-y-2">
              {data.insights.map((line) => (
                <li key={line} className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/75">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {/* Resumen de juego */}
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/45">Resumen de juego</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Score medio (18 h)" value={fmtScore(data.summary.avg_score_18)} accent />
              <StatCard
                label="Mejor vuelta"
                value={data.summary.best_score_18 != null ? String(data.summary.best_score_18) : "—"}
              />
              <StatCard
                label="Peor vuelta"
                value={data.summary.worst_score_18 != null ? String(data.summary.worst_score_18) : "—"}
              />
              <StatCard
                label="Tendencia"
                value={
                  data.summary.trend_score != null
                    ? `${Number(data.summary.trend_score) > 0 ? "+" : ""}${fmtScore(data.summary.trend_score)}`
                    : "—"
                }
                hint={fmtTrend(data.summary.trend_score, "golpes", false) || "Sin periodo anterior"}
                valueClassName={
                  data.summary.trend_score != null && Number(data.summary.trend_score) < 0
                    ? "text-lime-glow"
                    : data.summary.trend_score != null && Number(data.summary.trend_score) > 2
                      ? "text-danger"
                      : undefined
                }
              />
            </div>
          </section>

          {/* KPIs */}
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/45">KPIs principales</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard kpi={data.kpis.score} format="score" invertTrend={false} />
              <KpiCard kpi={data.kpis.penalties} invertTrend={true} />
              <KpiCard kpi={data.kpis.putts} invertTrend={true} />
              <KpiCard kpi={data.kpis.gir} format="pct" invertTrend={true} />
            </div>
          </section>

          {/* Objetivo recomendado */}
          <section className="card border-lime-glow/30 bg-lime-glow/8 p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime-glow/80">Objetivo recomendado</p>
            <h3 className="mt-2 text-xl font-bold text-lime-glow">{data.recommended_objective.title}</h3>
            <p className="mt-2 text-white/70">{data.recommended_objective.reason}</p>
            {data.recommended_objective.action && (
              <p className="mt-3 text-sm text-white/50">
                <span className="font-semibold text-white/70">Acción: </span>
                {data.recommended_objective.action}
              </p>
            )}
          </section>

          {/* Dónde pierdo más golpes */}
          <section>
            <h3 className="mb-1 text-lg font-bold">Dónde pierdo más golpes</h3>
            <p className="mb-4 text-sm text-white/45">% del total de puntos perdidos por ronda</p>
            <div className="card space-y-3 p-4">
              {data.lost_points_ranking.map((item, i) => {
                const pct = Number(item.pct_of_total);
                return (
                  <div key={item.category}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="font-semibold">
                        {i + 1}. {item.label}
                      </span>
                      <span className="text-lg font-bold tabular-nums text-lime-glow">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-lime-glow/70 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-white/35">{item.points_per_round} pts/ronda</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}

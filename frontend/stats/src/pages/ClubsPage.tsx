import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DispersionHeatmap } from "../components/DispersionHeatmap";
import { PageShell } from "../components/PageShell";
import { StatsFilters } from "../components/StatsFilters";
import { fmtPct, fmtScore, loadMinSample, saveMinSample } from "../lib/dashboard";
import type { ClubAnalysisResponse, HolesFilter, MinSample, RoundRange } from "../types";

export function ClubsPage() {
  const [roundRange, setRoundRange] = useState<RoundRange>("last_10");
  const [holesFilter, setHolesFilter] = useState<HolesFilter>("both_normalized");
  const [course, setCourse] = useState("");
  const [minSample, setMinSample] = useState<MinSample>(() => loadMinSample());
  const [data, setData] = useState<ClubAnalysisResponse | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.clubs({
        round_range: roundRange,
        holes_filter: holesFilter,
        course: course || null,
        min_sample: minSample,
      });
      setData(res);
      setSelectedClub((prev) => {
        if (prev && res.clubs[prev]) return prev;
        return res.bag_rows[0]?.club ?? null;
      });
    } catch {
      setError("No se pudo cargar el análisis de palos");
    } finally {
      setLoading(false);
    }
  }, [roundRange, holesFilter, course, minSample]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <p className="text-white/40">Cargando…</p>;
  if (error && !data) return <p className="text-white/50">{error}</p>;
  if (!data) return null;

  const rows = data.bag_rows;
  const empty = rows.length === 0;
  const detail = selectedClub ? data.clubs[selectedClub] : null;

  return (
    <PageShell
      title="Palos de juego"
      subtitle={[
        "Tu bolsa · pulsa un palo para ver el detalle",
        data.min_sample > 0 ? `mín. ${data.min_sample} golpes` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      footer={
        <p className="page-footer">
          {data.summary.total_shots_analyzed} golpes analizados · {data.rounds_in_period} rondas ·{" "}
          <Link to="/putting" className="text-lime-glow/70 underline">
            Ver putting
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
        minSample={minSample}
        onMinSampleChange={(v) => {
          setMinSample(v);
          saveMinSample(v);
        }}
      />

      {empty ? (
        <div className="card px-5 py-12 text-center text-white/45">
          {data.min_sample > 0
            ? `Ningún palo de tu bolsa llega a ${data.min_sample} golpes en este periodo.`
            : "No hay golpes registrados en este periodo."}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs font-semibold uppercase tracking-wider text-white/45">
                  <th className="px-4 py-2.5">Palo</th>
                  <th className="hidden px-4 py-2.5 text-right sm:table-cell">Golpes</th>
                  <th className="px-4 py-2.5 text-right">Puntos / ronda</th>
                  <th className="w-40 px-4 py-2.5 text-right md:w-52">Fiabilidad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.club}
                    onClick={() => setSelectedClub(row.club)}
                    className={[
                      "cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/4",
                      selectedClub === row.club ? "bg-lime-glow/10" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 font-semibold">{row.club}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-white/45 sm:table-cell">
                      {row.total_shots}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={[
                          "font-bold tabular-nums",
                          Number(row.stroke_cost_per_round) >= 1 ? "text-danger" : "text-white/90",
                        ].join(" ")}
                      >
                        {fmtScore(row.stroke_cost_per_round)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ReliabilityBar pct={row.reliability_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detail && (
            <section className="card space-y-4 p-4 md:p-5">
              <div className="border-b border-white/8 pb-3">
                <h3 className="text-lg font-extrabold md:text-xl">{detail.club}</h3>
                <p className="text-sm text-white/45">{detail.total_shots} golpes en el periodo</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Distancia media" value={detail.avg_distance_m ? `${fmtScore(detail.avg_distance_m)}m` : "—"} />
                <Metric label="Fiabilidad" value={fmtPct(detail.reliability_pct)} accent />
                <Metric label="Puntos perdidos" value={`${fmtScore(detail.stroke_cost_per_round)}/ronda`} danger />
                <Metric label="Patrón principal" value={detail.dominant_pattern} hint={fmtPct(detail.dominant_pattern_pct)} />
                <Metric label="Penalizaciones" value={fmtPct(detail.penalty_pct)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <DispersionHeatmap heatmap={detail.heatmap} club={detail.club} embedded />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="panel p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Control</p>
                    {detail.control_pct != null ? (
                      <p className="mt-1 text-2xl font-extrabold tabular-nums text-lime-glow">
                        {fmtPct(detail.control_pct)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-white/45">Sin datos de carry.</p>
                    )}
                    {detail.carry_std_dev_m && detail.avg_distance_m && (
                      <p className="mt-0.5 text-xs text-white/40">
                        σ {fmtScore(detail.carry_std_dev_m)}m · media {fmtScore(detail.avg_distance_m)}m
                      </p>
                    )}
                    {(detail.distance_p20 || detail.distance_p80) && (
                      <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-white/8 pt-2 text-sm">
                        <div>
                          <dt className="text-white/45">P20</dt>
                          <dd className="font-medium tabular-nums">
                            {detail.distance_p20 ? `${fmtScore(detail.distance_p20)}m` : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-white/45">P80</dt>
                          <dd className="font-medium tabular-nums">
                            {detail.distance_p80 ? `${fmtScore(detail.distance_p80)}m` : "—"}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>

                  <BreakdownTable title="Resultado" rows={detail.results_breakdown} />
                  <BreakdownTable title="Desvío" rows={detail.miss_breakdown} />
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function ReliabilityBar({ pct }: { pct: string }) {
  const n = Number(pct);
  const tone = n >= 70 ? "bg-lime-glow" : n >= 50 ? "bg-sand" : "bg-danger";
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, n)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums">{fmtPct(pct)}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={["mt-0.5 text-base font-bold md:text-lg", accent ? "text-lime-glow" : danger ? "text-danger" : ""].join(" ")}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; pct: string }[] }) {
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

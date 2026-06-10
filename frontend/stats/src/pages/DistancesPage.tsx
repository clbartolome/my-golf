import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { DistanceBoxPlot, DistanceHistogram, YardageMap } from "../components/DistanceChart";
import { PageShell } from "../components/PageShell";
import { StatsFilters } from "../components/StatsFilters";
import { fmtScore, loadMinSample, saveMinSample } from "../lib/dashboard";
import type { DistanceAnalysisResponse, HolesFilter, MinSample, RoundRange } from "../types";

function fmtDist(v: string | null | undefined): string {
  if (v == null) return "—";
  return `${fmtScore(v)}m`;
}

export function DistancesPage() {
  const [roundRange, setRoundRange] = useState<RoundRange>("last_10");
  const [holesFilter, setHolesFilter] = useState<HolesFilter>("both_normalized");
  const [course, setCourse] = useState("");
  const [minSample, setMinSample] = useState<MinSample>(() => loadMinSample());
  const [data, setData] = useState<DistanceAnalysisResponse | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.distances({
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
      setError("No se pudieron cargar las distancias");
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
  const detail = selectedClub ? data.clubs[selectedClub] : null;

  return (
    <PageShell
      title="Distancias"
      subtitle={[
        "Carry real por palo · orden de la bolsa",
        data.min_sample > 0 ? `mín. ${data.min_sample} golpes` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
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

      {rows.length === 0 ? (
        <div className="card px-5 py-12 text-center text-white/45">
          {data.min_sample > 0
            ? `Ningún palo con al menos ${data.min_sample} golpes con carry registrado.`
            : "No hay datos de distancia en este periodo."}
        </div>
      ) : (
        <div className="space-y-4">
          {data.yardage_map.length > 0 && (
            <YardageMap
              entries={data.yardage_map}
              selectedClub={selectedClub}
              onSelect={setSelectedClub}
            />
          )}

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs font-semibold uppercase tracking-wider text-white/45">
                  <th className="px-4 py-2.5">Palo</th>
                  <th className="px-4 py-2.5 text-right">Mediana</th>
                  <th className="px-4 py-2.5 text-right">Media</th>
                  <th className="px-4 py-2.5 text-right">Min</th>
                  <th className="px-4 py-2.5 text-right">Max</th>
                  <th className="hidden px-4 py-2.5 text-right sm:table-cell">Golpes</th>
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
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-lime-glow">
                      {fmtDist(row.median_m)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/80">{fmtDist(row.avg_m)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/50">{fmtDist(row.min_m)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/50">{fmtDist(row.max_m)}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-white/40 sm:table-cell">
                      {row.shots}
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
                <p className="text-sm text-white/45">{detail.shots} golpes con carry medido</p>
              </div>

              <DistanceBoxPlot
                min={detail.min_m}
                p10={detail.p10_m}
                p25={detail.p25_m}
                median={detail.median_m}
                p75={detail.p75_m}
                p90={detail.p90_m}
                max={detail.max_m}
              />

              <DistanceHistogram bars={detail.histogram} club={detail.club} embedded />
            </section>
          )}
        </div>
      )}

      <p className="page-footer">{data.rounds_in_period} rondas en el periodo</p>
    </PageShell>
  );
}

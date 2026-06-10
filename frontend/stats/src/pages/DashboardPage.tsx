import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ClubChart } from "../components/ClubChart";
import { RoundsTable } from "../components/RoundsTable";
import { StatCard } from "../components/StatCard";
import { TrendChart } from "../components/TrendChart";
import { fmtAvg, fmtNum, fmtPct } from "../lib/format";
import { HandicapStats, OverviewStats, RoundSummaryStats } from "../types";

export function DashboardPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [rounds, setRounds] = useState<RoundSummaryStats[]>([]);
  const [handicap, setHandicap] = useState<HandicapStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.overview(), api.rounds(), api.handicap()])
      .then(([o, r, h]) => {
        setOverview(o);
        setRounds(r);
        setHandicap(h);
      })
      .catch(() => setError("No se pudieron cargar las estadísticas"));
  }, []);

  if (error) {
    return <p className="text-white/50">{error}</p>;
  }

  if (!overview) {
    return <p className="text-white/40">Cargando…</p>;
  }

  const empty = overview.total_holes === 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Dashboard</h2>
        <p className="mt-1 text-white/50">Resumen de tu juego</p>
      </div>

      {empty ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-4xl">⛳</p>
          <p className="max-w-md text-lg font-semibold">Aún no hay hoyos completados</p>
          <p className="max-w-md text-sm text-white/45">
            Registra una ronda en la app de captura y completa al menos un hoyo para ver estadísticas aquí.
          </p>
          <a
            href="http://localhost:3000"
            className="mt-2 rounded-xl bg-lime-glow px-6 py-3 font-bold text-fairway-950"
          >
            Ir a captura
          </a>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Handicap"
              value={handicap?.handicap_index != null ? Number(handicap.handicap_index).toFixed(1) : "—"}
              accent
              hint={
                handicap && handicap.rounds_needed > 0
                  ? `Faltan ${handicap.rounds_needed} rondas`
                  : "WHS simplificado"
              }
            />
            <StatCard
              label="Media vs par / hoyo"
              value={fmtNum(overview.avg_score_vs_par)}
              hint={`${overview.total_holes} hoyos analizados`}
            />
            <StatCard label="Putts / hoyo" value={fmtAvg(overview.avg_putts_per_hole)} hint="Golpes en el green" />
            <StatCard label="GIR" value={fmtPct(overview.gir_pct)} hint="Greens en regulación" />
            <StatCard label="FIR" value={fmtPct(overview.fir_pct)} hint="Fairways de salida" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Rondas" value={`${overview.rounds_total}`} hint={`${overview.rounds_completed} completadas`} />
            <StatCard label="Penalizaciones" value={`${overview.penalty_strokes}`} />
            <StatCard
              label="Palo más usado"
              value={overview.club_distances.sort((a, b) => b.shots - a.shots)[0]?.club ?? "—"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TrendChart rounds={rounds} />
            <ClubChart data={overview.club_distances} />
          </div>

          <div className="flex gap-4">
            <Link to="/handicap" className="text-sm text-lime-glow/80 hover:text-lime-glow">
              Ver handicap →
            </Link>
            <Link to="/trends" className="text-sm text-lime-glow/80 hover:text-lime-glow">
              Ver tendencias →
            </Link>
            <Link to="/analysis" className="text-sm text-lime-glow/80 hover:text-lime-glow">
              Análisis de tiros →
            </Link>
          </div>
        </>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Rondas recientes</h3>
          <Link to="/rounds" className="text-sm text-lime-glow/80 hover:text-lime-glow">
            Ver todas →
          </Link>
        </div>
        <RoundsTable rounds={rounds} compact />
      </div>
    </div>
  );
}

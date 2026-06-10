import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { HolesDetailTable, Scorecard } from "../components/Scorecard";
import { StatCard } from "../components/StatCard";
import { fmtDateTime, pct, scoreClass, scoreLabel } from "../lib/format";
import { RoundStats } from "../types";

export function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<RoundStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .round(id)
      .then(setStats)
      .catch(() => setError("Ronda no encontrada"));
  }, [id]);

  if (error) return <p className="text-white/50">{error}</p>;
  if (!stats) return <p className="text-white/40">Cargando…</p>;

  const plannedHoles = Math.max(...stats.holes.map((h) => h.hole_number), 9);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/rounds" className="text-sm text-white/45 hover:text-white/70">
            ← Rondas
          </Link>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">{stats.course_name}</h2>
          <p className="mt-1 text-white/50">{fmtDateTime(stats.played_at)}</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 rounded-xl border border-danger/30 px-4 py-2 text-sm font-semibold text-danger/80 hover:bg-danger/10"
        >
          Borrar ronda
        </button>
      </div>

      {stats.holes.length === 0 ? (
        <div className="card px-6 py-12 text-center text-white/45">Esta ronda aún no tiene hoyos completados</div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center gap-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Score total</p>
              <p className={`text-5xl font-extrabold tabular-nums ${scoreClass(stats.score_vs_par)}`}>
                {scoreLabel(stats.score_vs_par)}
              </p>
              <p className="text-sm text-white/50">
                {stats.total_strokes} golpes · Par {stats.total_par}
              </p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <span className="text-white/40">GIR </span>
                <span className="font-semibold">{pct(stats.gir_count, stats.gir_opportunities)}</span>
              </div>
              <div>
                <span className="text-white/40">FIR </span>
                <span className="font-semibold">{pct(stats.fir_count, stats.fir_opportunities)}</span>
              </div>
              <div>
                <span className="text-white/40">Putts </span>
                <span className="font-semibold">{stats.putts}</span>
              </div>
              <div>
                <span className="text-white/40">Pen. </span>
                <span className="font-semibold">{stats.penalty_strokes}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="GIR" value={pct(stats.gir_count, stats.gir_opportunities)} />
            <StatCard label="FIR" value={pct(stats.fir_count, stats.fir_opportunities)} />
            <StatCard label="Putts totales" value={`${stats.putts}`} />
            <StatCard label="Penalizaciones" value={`${stats.penalty_strokes}`} />
          </div>

          <Scorecard holes={stats.holes} plannedHoles={plannedHoles} />
          <HolesDetailTable holes={stats.holes} />
        </>
      )}

      {confirmDelete && (
        <ConfirmDelete
          label={stats.course_name}
          loading={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await api.deleteRound(id);
              navigate("/rounds");
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}

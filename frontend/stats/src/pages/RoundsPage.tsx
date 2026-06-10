import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { PageShell } from "../components/PageShell";
import { RoundDetailModal } from "../components/RoundDetailModal";
import { fmtDate, scoreClass, scoreLabel, teesLabel, windLabel } from "../lib/format";
import type { RoundDetail, RoundStatsDetail, RoundStatus, RoundSummaryStats } from "../types";

type StatusFilter = "all" | RoundStatus;

const CAPTURE_URL = "http://localhost:3000";

export function RoundsPage() {
  const [rounds, setRounds] = useState<RoundSummaryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoundDetail | null>(null);
  const [holeStats, setHoleStats] = useState<RoundStatsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRounds(await api.rounds());
    } catch {
      setError("No se pudieron cargar las rondas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(async (roundId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setHoleStats(null);
    try {
      const [roundDetail, stats] = await Promise.all([
        api.getRound(roundId),
        api.roundStats(roundId),
      ]);
      setDetail(roundDetail);
      setHoleStats(stats);
    } catch {
      setDetailError("No se pudo cargar el detalle de la ronda");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = (roundId: string) => {
    setSelectedId(roundId);
    loadDetail(roundId);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setHoleStats(null);
    setDetailError(null);
  };

  const courses = useMemo(
    () => [...new Set(rounds.map((r) => r.course_name))].sort((a, b) => a.localeCompare(b, "es")),
    [rounds],
  );

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (courseFilter && r.course_name !== courseFilter) return false;
      return true;
    });
  }, [rounds, statusFilter, courseFilter]);

  const selectedSummary = useMemo(
    () => (selectedId ? rounds.find((r) => r.round_id === selectedId) : undefined),
    [rounds, selectedId],
  );

  const completed = filtered.filter((r) => r.status === "completed");
  const avgScore =
    completed.length > 0
      ? (completed.reduce((s, r) => s + r.score_vs_par, 0) / completed.length).toFixed(1)
      : null;

  const handleDelete = async (round: RoundSummaryStats) => {
    const label = `${round.course_name} · ${fmtDate(round.played_at)}`;
    if (!window.confirm(`¿Eliminar la ronda «${label}»? Esta acción no se puede deshacer.`)) return;
    setBusyId(round.round_id);
    try {
      await api.deleteRound(round.round_id);
      if (selectedId === round.round_id) closeDetail();
      await load();
    } catch {
      window.alert("No se pudo eliminar la ronda");
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (round: RoundSummaryStats) => {
    setBusyId(round.round_id);
    try {
      await api.updateRound(round.round_id, { status: "completed" });
      await load();
      if (selectedId === round.round_id) await loadDetail(round.round_id);
    } catch {
      window.alert("No se pudo marcar como completada");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && rounds.length === 0) return <p className="text-white/40">Cargando…</p>;

  return (
    <PageShell
      title="Rondas"
      subtitle={[
        `${rounds.length} registrada${rounds.length !== 1 ? "s" : ""}`,
        avgScore != null ? `media ${Number(avgScore) >= 0 ? "+" : ""}${avgScore} vs par` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      action={
        <a
          href={CAPTURE_URL}
          className="shrink-0 rounded-xl bg-lime-glow px-4 py-2 text-sm font-bold text-fairway-950 transition hover:brightness-110"
        >
          Nueva ronda
        </a>
      }
    >
      {error && <p className="text-danger">{error}</p>}

      <div className="card flex flex-wrap gap-3 p-3">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-white/45">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-white/10 bg-fairway-950 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todas</option>
            <option value="completed">Completadas</option>
            <option value="in_progress">En curso</option>
          </select>
        </label>
        <label className="flex min-w-[160px] flex-[2] flex-col gap-1 text-xs text-white/45">
          Campo
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
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
      </div>

      {filtered.length === 0 ? (
        <div className="card px-5 py-12 text-center text-white/45">
          {rounds.length === 0
            ? "Aún no hay rondas. Empieza una en la app de captura."
            : "Ninguna ronda coincide con los filtros."}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs font-semibold uppercase tracking-wider text-white/45">
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Campo</th>
                <th className="px-4 py-2.5">Resultado</th>
                <th className="px-4 py-2.5">Hoyos</th>
                <th className="px-4 py-2.5">Putts</th>
                <th className="px-4 py-2.5">Pen.</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const busy = busyId === r.round_id;
                return (
                  <tr key={r.round_id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">{fmtDate(r.played_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.course_name}</p>
                      <p className="text-xs text-white/40">
                        {r.planned_holes} hoyos
                        {r.tees ? ` · ${teesLabel(r.tees)}` : ""}
                        {r.wind ? ` · ${windLabel(r.wind)}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold tabular-nums ${scoreClass(r.score_vs_par)}`}>
                        {scoreLabel(r.score_vs_par)}
                      </span>
                      <p className="text-xs text-white/40 tabular-nums">{r.total_strokes} golpes</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/70">
                      {r.holes_completed}/{r.planned_holes}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{r.putts}</td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{r.penalty_strokes}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(r.round_id)}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/6"
                        >
                          Detalle
                        </button>
                        {r.status === "in_progress" && (
                          <>
                            <a
                              href={CAPTURE_URL}
                              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/6"
                            >
                              Continuar
                            </a>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleComplete(r)}
                              className="rounded-lg border border-lime-glow/30 px-3 py-1.5 text-xs font-semibold text-lime-glow hover:bg-lime-glow/10 disabled:opacity-50"
                            >
                              Completar
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(r)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RoundDetailModal
        open={selectedId != null}
        loading={detailLoading}
        error={detailError}
        summary={selectedSummary}
        detail={detail}
        holeStats={holeStats}
        onClose={closeDetail}
        captureUrl={CAPTURE_URL}
      />
    </PageShell>
  );
}

function StatusBadge({ status }: { status: RoundStatus }) {
  if (status === "completed") {
    return (
      <span className="rounded-full bg-lime-glow/15 px-2.5 py-1 text-xs font-semibold text-lime-glow">
        Completada
      </span>
    );
  }
  return (
    <span className="rounded-full bg-sand/15 px-2.5 py-1 text-xs font-semibold text-sand">En curso</span>
  );
}

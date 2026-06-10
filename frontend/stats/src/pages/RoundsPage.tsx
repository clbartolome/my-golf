import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { RoundsTable } from "../components/RoundsTable";
import { RoundSummaryStats } from "../types";

export function RoundsPage() {
  const [rounds, setRounds] = useState<RoundSummaryStats[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "completed" | "in_progress">("all");
  const [toDelete, setToDelete] = useState<RoundSummaryStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.rounds().then(setRounds).catch(() => setRounds([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (search && !r.course_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rounds, search, status]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteRound(toDelete.round_id);
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Rondas</h2>
        <p className="mt-1 text-white/50">Historial completo de salidas</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar campo…"
          className="card min-h-11 flex-1 px-4 outline-none focus:border-lime-glow/40"
        />
        <div className="flex gap-2">
          {(["all", "completed", "in_progress"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                status === s ? "bg-lime-glow text-fairway-950" : "card text-white/60"
              }`}
            >
              {s === "all" ? "Todas" : s === "completed" ? "Completas" : "En curso"}
            </button>
          ))}
        </div>
      </div>

      <RoundsTable rounds={filtered} onDelete={setToDelete} />

      {toDelete && (
        <ConfirmDelete
          label={`${toDelete.course_name} (${toDelete.planned_holes} hoyos)`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

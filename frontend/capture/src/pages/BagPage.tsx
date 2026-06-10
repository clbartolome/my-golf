import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { DEFAULT_CLUBS } from "../constants";
import { Shell } from "../components/Shell";
import { useBag } from "../hooks/useBag";

export function BagPage() {
  const navigate = useNavigate();
  const { clubs, setClubs } = useBag();
  const [newClub, setNewClub] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (updated: string[]) => {
    setSaving(true);
    try {
      const saved = await api.saveBag(updated);
      setClubs(saved);
    } finally {
      setSaving(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...clubs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setClubs(next);
  };

  return (
    <Shell
      header={
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="text-white/50">
            ←
          </button>
          <h1 className="text-lg font-bold">Mi bolsa</h1>
        </div>
      }
      footer={
        <div className="p-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(clubs)}
            className="w-full min-h-14 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950 disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <p className="text-sm text-white/50">Ordena los palos que aparecen al registrar golpes.</p>

        <ul className="space-y-2">
          {clubs.map((club, i) => (
            <li key={club} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
              <span className="flex-1 font-semibold">{club}</span>
              <button type="button" onClick={() => move(i, -1)} className="px-3 py-2 text-white/40">
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} className="px-3 py-2 text-white/40">
                ↓
              </button>
              <button
                type="button"
                disabled={clubs.length <= 1}
                onClick={() => {
                  const u = clubs.filter((_, j) => j !== i);
                  setClubs(u);
                  save(u);
                }}
                className="px-3 py-2 text-danger/80 disabled:opacity-30"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            value={newClub}
            onChange={(e) => setNewClub(e.target.value)}
            placeholder="Añadir palo…"
            className="min-h-12 flex-1 rounded-2xl border border-white/12 bg-white/6 px-4 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const name = newClub.trim();
              if (!name || clubs.includes(name)) return;
              const u = [...clubs, name];
              setClubs(u);
              setNewClub("");
              save(u);
            }}
            className="min-h-12 rounded-2xl bg-white/10 px-5 font-bold"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => save([...DEFAULT_CLUBS])}
          className="w-full py-3 text-sm text-white/40"
        >
          Restaurar bolsa por defecto
        </button>
      </div>
    </Shell>
  );
}

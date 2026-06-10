import { useEffect, useState } from "react";
import { api } from "../api/client";

export function BagPage() {
  const [clubs, setClubs] = useState<string[]>([]);
  const [newClub, setNewClub] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.bag().then((b) => setClubs(b.map((c) => c.name)));
  }, []);

  const save = async (updated: string[]) => {
    setSaving(true);
    setMsg(null);
    try {
      const saved = await api.saveBag(updated);
      setClubs(saved);
      setMsg("Bolsa guardada");
    } catch {
      setMsg("Error al guardar");
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

  const remove = (idx: number) => {
    if (clubs.length <= 1) return;
    save(clubs.filter((_, i) => i !== idx));
  };

  const add = () => {
    const name = newClub.trim();
    if (!name || clubs.includes(name)) return;
    const updated = [...clubs, name];
    setClubs(updated);
    setNewClub("");
    save(updated);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Mi bolsa</h2>
        <p className="mt-1 text-white/50">
          Configura tus palos. Se sincroniza con la app de captura en el móvil.
        </p>
      </div>

      <ul className="card divide-y divide-white/8">
        {clubs.map((club, i) => (
          <li key={club} className="flex items-center gap-2 px-4 py-3">
            <span className="w-6 text-xs text-white/30">{i + 1}</span>
            <span className="flex-1 font-semibold">{club}</span>
            <button type="button" onClick={() => move(i, -1)} className="px-2 text-white/40 hover:text-white">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} className="px-2 text-white/40 hover:text-white">
              ↓
            </button>
            <button type="button" onClick={() => remove(i)} className="px-2 text-danger/80">
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newClub}
          onChange={(e) => setNewClub(e.target.value)}
          placeholder="Nuevo palo…"
          className="card min-h-12 flex-1 px-4 outline-none focus:border-lime-glow/40"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          type="button"
          onClick={add}
          disabled={!newClub.trim()}
          className="min-h-12 rounded-2xl bg-lime-glow px-5 font-bold text-fairway-950 disabled:opacity-40"
        >
          Añadir
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => save(clubs)}
        className="w-full min-h-14 rounded-2xl border border-lime-glow/30 bg-lime-glow/10 font-bold text-lime-glow"
      >
        {saving ? "Guardando…" : "Guardar orden"}
      </button>

      {msg && <p className="text-center text-sm text-lime-soft">{msg}</p>}
    </div>
  );
}

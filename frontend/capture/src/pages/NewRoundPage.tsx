import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Chip, ChipGrid } from "../components/Chip";
import { Shell } from "../components/Shell";
import { TEES_OPTIONS, WIND_OPTIONS } from "../constants";
import { useAppStore } from "../store";

export function NewRoundPage() {
  const navigate = useNavigate();
  const setActiveRoundId = useAppStore((s) => s.setActiveRoundId);

  const [courseName, setCourseName] = useState("");
  const [tees, setTees] = useState<string | null>(null);
  const [wind, setWind] = useState<string | null>(null);
  const [holes, setHoles] = useState<9 | 18>(18);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [courseRating, setCourseRating] = useState("");
  const [slopeRating, setSlopeRating] = useState("113");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!courseName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const round = await api.createRound({
        course_name: courseName.trim(),
        tees: tees ?? undefined,
        wind: wind ?? undefined,
        planned_holes: holes,
        course_rating: courseRating ? Number(courseRating) : undefined,
        slope_rating: slopeRating ? Number(slopeRating) : undefined,
      });
      setActiveRoundId(round.id);
      navigate(`/round/${round.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear ronda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      header={
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="text-white/50">
            ←
          </button>
          <h1 className="text-lg font-bold">Nueva ronda</h1>
        </div>
      }
      footer={
        <div className="p-4">
          <button
            type="button"
            disabled={!courseName.trim() || loading}
            onClick={submit}
            className="w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950 disabled:opacity-40"
          >
            {loading ? "Creando…" : "Empezar ronda"}
          </button>
        </div>
      }
    >
      <div className="space-y-7 p-4">
        <div>
          <label htmlFor="course" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/45">
            Campo
          </label>
          <input
            id="course"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Ej. Club de Golf Las Rejas"
            className="w-full min-h-14 rounded-2xl border border-white/12 bg-white/6 px-4 text-lg outline-none focus:border-lime-glow/50"
            autoFocus
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Tees</p>
          <ChipGrid cols={2}>
            {TEES_OPTIONS.map((t) => (
              <Chip key={t.value} label={t.label} selected={tees === t.value} onClick={() => setTees(t.value)} />
            ))}
          </ChipGrid>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Viento</p>
          <ChipGrid cols={3}>
            {WIND_OPTIONS.map((w) => (
              <Chip key={w.value} label={w.label} selected={wind === w.value} onClick={() => setWind(w.value)} />
            ))}
          </ChipGrid>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Hoyos</p>
          <ChipGrid cols={2}>
            <Chip label="9 hoyos" selected={holes === 9} onClick={() => setHoles(9)} className="min-h-14" />
            <Chip label="18 hoyos" selected={holes === 18} onClick={() => setHoles(18)} className="min-h-14" />
          </ChipGrid>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-lime-glow/80"
        >
          {showAdvanced ? "Ocultar" : "Mostrar"} datos para handicap (valoración / slope)
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/4 p-4">
            <p className="text-xs text-white/45">
              Opcional. Si no los pones, se usa el par del recorrido y slope 113.
            </p>
            <div>
              <label className="mb-1 block text-xs text-white/45">Valoración del campo (CR)</label>
              <input
                value={courseRating}
                onChange={(e) => setCourseRating(e.target.value)}
                placeholder="Ej. 72.4"
                inputMode="decimal"
                className="w-full min-h-12 rounded-xl border border-white/12 bg-white/6 px-4 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/45">Slope</label>
              <input
                value={slopeRating}
                onChange={(e) => setSlopeRating(e.target.value)}
                placeholder="113"
                inputMode="numeric"
                className="w-full min-h-12 rounded-xl border border-white/12 bg-white/6 px-4 outline-none"
              />
            </div>
          </div>
        )}

        {error && <p className="rounded-xl bg-danger/20 px-4 py-3 text-sm text-red-100">{error}</p>}
      </div>
    </Shell>
  );
}

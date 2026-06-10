import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shell } from "../components/Shell";
import { useAppStore } from "../store";

export function HomePage() {
  const navigate = useNavigate();
  const activeRoundId = useAppStore((s) => s.activeRoundId);
  const [roundName, setRoundName] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRoundId) {
      setRoundName(null);
      return;
    }
    api
      .getRound(activeRoundId)
      .then((r) => {
        if (r.status === "in_progress") setRoundName(r.course_name);
        else useAppStore.getState().setActiveRoundId(null);
      })
      .catch(() => useAppStore.getState().setActiveRoundId(null));
  }, [activeRoundId]);

  return (
    <Shell>
      <div className="relative flex min-h-full flex-col overflow-hidden px-5 pb-10 pt-8 safe-top">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime-glow/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-fairway-600/30 blur-3xl" />

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-glow/70">My Golf</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight">
          Captura
          <br />
          <span className="text-lime-glow">en el campo</span>
        </h1>
        <p className="mt-4 max-w-xs text-base text-white/55">
          Golpe a golpe, sin fricción. Diseñado para el móvil con una mano en el carrito.
        </p>

        <div className="mt-10 space-y-3">
          <Link
            to="/round/new"
            className="flex min-h-16 items-center justify-center rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950 shadow-[0_8px_40px_rgba(184,240,69,0.25)] active:scale-[0.98]"
          >
            Nueva ronda
          </Link>
          {activeRoundId && roundName && (
            <button
              type="button"
              onClick={() => navigate(`/round/${activeRoundId}`)}
              className="flex w-full min-h-16 flex-col items-start justify-center rounded-2xl border border-white/12 bg-white/6 px-5 active:bg-white/10"
            >
              <span className="text-xs text-white/45">Continuar ronda</span>
              <span className="text-lg font-bold">{roundName}</span>
            </button>
          )}
          <Link
            to="/bag"
            className="flex min-h-14 items-center justify-center rounded-2xl border border-white/12 text-sm font-semibold text-white/70"
          >
            Configurar mi bolsa
          </Link>
        </div>

        <div className="mt-auto pt-10">
          <p className="text-xs text-white/30">Añade la web a la pantalla de inicio para abrirla como app.</p>
        </div>
      </div>
    </Shell>
  );
}

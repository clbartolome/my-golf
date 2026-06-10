import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ClubPicker } from "../components/ClubPicker";
import { HoleSetup } from "../components/HoleSetup";
import { HoleStrip } from "../components/HoleStrip";
import { NumPad } from "../components/NumPad";
import { PenaltySheet } from "../components/PenaltySheet";
import { getResultMode, ResultPicker } from "../components/ResultPicker";
import { Shell } from "../components/Shell";
import { ShotTimeline } from "../components/ShotTimeline";
import {
  isOnGreen,
  lieNeedsLine,
  nextStrokeNumber,
  pendingPenaltyReason,
  PENALTY_LIES,
  holeScore,
  scoreLabel,
} from "../constants";
import { useBag } from "../hooks/useBag";
import { useAppStore } from "../store";
import {
  Hole,
  NextShotHint,
  PenaltyReason,
  RoundDetail,
  ShotLie,
  ShotLine,
  ShotPhase,
} from "../types";

type View = "setup" | "club" | "result" | "done";

export function PlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveRoundId = useAppStore((s) => s.setActiveRoundId);

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [currentHoleNum, setCurrentHoleNum] = useState(1);
  const [view, setView] = useState<View>("setup");
  const [phase, setPhase] = useState<ShotPhase>("club");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hole setup
  const [setupPar, setSetupPar] = useState(4);
  const [setupDistance, setSetupDistance] = useState("");

  // Shot entry
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [distance, setDistance] = useState("");
  const [selectedLie, setSelectedLie] = useState<ShotLie | null>(null);
  const [selectedLine, setSelectedLine] = useState<ShotLine | null>(null);
  const [nextHint, setNextHint] = useState<NextShotHint | null>(null);

  // Penalty
  const [penaltyReason, setPenaltyReason] = useState<PenaltyReason | null>(null);

  const { clubs } = useBag();

  const currentHole: Hole | undefined = round?.holes.find((h) => h.hole_number === currentHoleNum);
  const onGreen = currentHole ? isOnGreen(currentHole.shots) : false;
  const strokeNum = currentHole ? nextStrokeNumber(currentHole.shots) : 1;
  const lastClub =
    currentHole?.shots.filter((s) => s.shot_type === "normal").at(-1)?.club ?? null;

  const refresh = useCallback(async () => {
    if (!id) return;
    const data = await api.getRound(id);
    setRound(data);
    setActiveRoundId(data.id);

    const firstIncomplete =
      data.holes.find((h: Hole) => !h.completed)?.hole_number ??
      Math.min(data.holes.length + 1, data.planned_holes);

    setCurrentHoleNum((prev) => {
      const exists = data.holes.some((h: Hole) => h.hole_number === prev);
      return exists ? prev : firstIncomplete;
    });
  }, [id, setActiveRoundId]);

  useEffect(() => {
    if (!id) return;
    refresh()
      .catch(() => setError("No se pudo cargar la ronda"))
      .finally(() => setLoading(false));
  }, [id, refresh]);

  useEffect(() => {
    if (!round) return;
    const hole = round.holes.find((h) => h.hole_number === currentHoleNum);
    if (!hole) {
      setView("setup");
      setSetupPar(4);
      setSetupDistance("");
      resetShotForm();
    } else if (hole.completed) {
      setView("done");
      clearHint(hole.id);
      resetShotForm();
    } else if (hole.shots.at(-1)?.shot_type === "penalty") {
      setView("club");
      setPhase("club");
      setSelectedClub(null);
      setDistance("");
      setSelectedLie(null);
      setSelectedLine(null);
      setPenaltyReason(null);
      setError(null);
      const hint = loadHint(hole.id);
      if (hint) setNextHint(hint);
    } else {
      const pending = pendingPenaltyReason(hole.shots);
      if (pending) {
        setPenaltyReason(pending);
        setView("club");
        setPhase("club");
        resetShotForm(true);
      } else {
        setView("club");
        setPhase("club");
        resetShotForm();
      }
    }
  }, [currentHoleNum, round?.holes]);

  const resetShotForm = (keepHint = false) => {
    setSelectedClub(null);
    setDistance("");
    setSelectedLie(null);
    setSelectedLine(null);
    setPhase("club");
    if (!keepHint) setNextHint(null);
  };

  const handleSelectLie = (lie: ShotLie) => {
    setSelectedLie(lie);
    if (lie === "holed") {
      setDistance("0");
      setSelectedLine("on_target");
    } else if (PENALTY_LIES.has(lie)) {
      setSelectedLine(null);
    }
  };

  const storeHint = (holeId: string, hint: NextShotHint) => {
    setNextHint(hint);
    sessionStorage.setItem(`hint-${holeId}`, JSON.stringify(hint));
  };

  const loadHint = (holeId: string): NextShotHint | null => {
    const raw = sessionStorage.getItem(`hint-${holeId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as NextShotHint;
    } catch {
      return null;
    }
  };

  const clearHint = (holeId: string) => {
    sessionStorage.removeItem(`hint-${holeId}`);
    setNextHint(null);
  };

  const startHole = async () => {
    if (!id || !setupDistance) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.startHole(id, {
        hole_number: currentHoleNum,
        par: setupPar,
        starting_distance: Number(setupDistance),
        starting_unit: "m",
      });
      await refresh();
      setView("club");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitShot = async () => {
    if (!currentHole || !selectedClub || !selectedLie) return;

    const unit = "m" as const;
    const isHoled = selectedLie === "holed";
    const isPenaltyLie = PENALTY_LIES.has(selectedLie);
    const needsLine = lieNeedsLine(selectedLie);
    const distValue = isHoled ? 0 : distance ? Number(distance) : null;

    if (needsLine && !selectedLine) {
      setError("Indica la línea del tiro");
      return;
    }
    if (!isHoled && !isPenaltyLie && (!distValue || distValue < 0)) {
      setError("Introduce la distancia al hoyo");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body: Parameters<typeof api.addShot>[1] = {
        club: selectedClub,
        distance_unit: unit,
        result: selectedLie,
      };
      if (needsLine && selectedLine) body.miss_line = selectedLine;
      if (nextHint) body.distance_before = Number(nextHint.distance_before);
      else if (currentHole.shots.at(-1)?.shot_type === "penalty") {
        setError("Falta la distancia tras la penalización. Vuelve a confirmar rejuego o suelto.");
        setSubmitting(false);
        return;
      }
      if (isHoled) body.distance_after = 0;
      else if (distValue !== null && !isPenaltyLie) body.distance_after = distValue;

      const res = await api.addShot(currentHole.id, body);

      if (res.penalty_required && res.suggested_penalty_reason) {
        setPenaltyReason(res.suggested_penalty_reason);
        await refresh();
        return;
      }

      clearHint(currentHole.id);
      await refresh();
      if (isHoled || distValue === 0) {
        setView("done");
      } else {
        resetShotForm();
        setView("club");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar golpe");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPenalty = async (
    relief: "replay" | "drop",
    drop?: { distance: number; unit: "m" },
  ) => {
    if (!currentHole || !penaltyReason) return;
    setSubmitting(true);
    try {
      const res = await api.addPenalty(currentHole.id, {
        reason: penaltyReason,
        relief,
        drop_distance: drop?.distance,
        drop_unit: drop?.unit ?? "m",
      });
      storeHint(currentHole.id, res.next_shot_hint);
      setPenaltyReason(null);
      setError(null);
      await refresh();
      setSelectedClub(null);
      setDistance("");
      setSelectedLie(null);
      setSelectedLine(null);
      setPhase("club");
      setView("club");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en penalización");
    } finally {
      setSubmitting(false);
    }
  };

  const finishRound = async () => {
    if (!id) return;
    await api.completeRound(id);
    setActiveRoundId(null);
    navigate("/");
  };

  const goNextHole = () => {
    if (!round) return;
    if (currentHoleNum >= round.planned_holes) return;
    setCurrentHoleNum(currentHoleNum + 1);
  };

  const resultMode = getResultMode(currentHole?.par ?? 4, strokeNum, onGreen);
  const canSubmitShot =
    selectedLie &&
    !submitting &&
    (!lieNeedsLine(selectedLie) || selectedLine) &&
    (selectedLie === "holed" || PENALTY_LIES.has(selectedLie) || Boolean(distance));

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center text-white/40">Cargando…</div>
      </Shell>
    );
  }

  if (!round) {
    return (
      <Shell>
        <div className="p-6 text-center text-white/50">{error ?? "Ronda no encontrada"}</div>
      </Shell>
    );
  }

  const totalStrokes = round.holes.filter((h) => h.completed).reduce((acc, h) => acc + holeScore(h.shots), 0);
  const totalPar = round.holes.filter((h) => h.completed).reduce((acc, h) => acc + h.par, 0);

  return (
    <Shell
      header={
        <div>
          <div className="flex items-center justify-between px-4 py-2">
            <button type="button" onClick={() => navigate("/")} className="text-sm text-white/45">
              ← Salir
            </button>
            <div className="text-center">
              <p className="text-xs text-white/45">{round.course_name}</p>
              <p className="font-bold tabular-nums">
                {totalStrokes > 0 ? `${totalStrokes} (${scoreLabel(totalStrokes - totalPar)})` : "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={finishRound}
              className="text-sm text-lime-glow/80"
              disabled={round.holes.filter((h) => h.completed).length === 0}
            >
              Fin
            </button>
          </div>
          <HoleStrip plannedHoles={round.planned_holes} holes={round.holes} currentHole={currentHoleNum} />
        </div>
      }
      footer={
        view === "club" && phase === "club" && selectedClub ? (
          <div className="p-4">
            <button
              type="button"
              onClick={() => setPhase("result")}
              className="w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950"
            >
              He golpeado con {selectedClub}
            </button>
          </div>
        ) : view === "club" && phase === "result" ? (
          <div className="p-4">
            <button
              type="button"
              disabled={!canSubmitShot}
              onClick={submitShot}
              className="w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950 disabled:opacity-40"
            >
              {submitting ? "Guardando…" : "Guardar golpe"}
            </button>
          </div>
        ) : view === "done" ? (
          <div className="space-y-2 p-4">
            {currentHoleNum < round.planned_holes ? (
              <button
                type="button"
                onClick={goNextHole}
                className="w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950"
              >
                Hoyo {currentHoleNum + 1} →
              </button>
            ) : (
              <button
                type="button"
                onClick={finishRound}
                className="w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950"
              >
                Finalizar ronda
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="p-4 pb-8">
        {error && (
          <div className="mb-4 rounded-xl bg-danger/20 px-4 py-3 text-sm text-red-100">{error}</div>
        )}

        {view === "setup" && (
          <HoleSetup
            holeNumber={currentHoleNum}
            par={setupPar}
            distance={setupDistance}
            onParChange={setSetupPar}
            onDistanceChange={setSetupDistance}
            onStart={startHole}
            loading={submitting}
          />
        )}

        {view === "club" && currentHole && (
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45">
                  Hoyo {currentHoleNum} · Par {currentHole.par}
                </p>
                <h2 className="text-3xl font-extrabold">
                  Golpe {strokeNum}
                  {onGreen && <span className="ml-2 text-base font-medium text-lime-glow">en green</span>}
                </h2>
              </div>
              {nextHint && (
                <p className="text-right text-sm text-white/50">
                  Desde
                  <br />
                  <span className="text-lg font-bold text-white">
                    {nextHint.distance_before} {nextHint.distance_unit}
                  </span>
                </p>
              )}
            </div>

            {phase === "club" ? (
              <>
                <p className="text-sm text-white/50">Elige el palo antes de golpear</p>
                <ClubPicker
                  clubs={clubs}
                  selected={selectedClub}
                  onSelect={setSelectedClub}
                  lastClub={lastClub}
                />
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                  <p className="text-xs text-white/45">Palo</p>
                  <p className="text-xl font-bold">{selectedClub}</p>
                  <button
                    type="button"
                    onClick={() => setPhase("club")}
                    className="mt-1 text-xs text-lime-glow/80"
                  >
                    Cambiar palo
                  </button>
                </div>

                {selectedLie && selectedLie !== "holed" && !PENALTY_LIES.has(selectedLie) && (
                  <NumPad value={distance} onChange={setDistance} unit="m" allowDecimal />
                )}

                <ResultPicker
                  mode={resultMode}
                  selectedLie={selectedLie}
                  selectedLine={selectedLine}
                  onSelectLie={handleSelectLie}
                  onSelectLine={setSelectedLine}
                />
              </>
            )}

            <details className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-white/50">Ver golpes del hoyo</summary>
              <div className="mt-3">
                <ShotTimeline shots={currentHole.shots} />
              </div>
            </details>
          </div>
        )}

        {view === "done" && currentHole && (
          <div className="space-y-5 text-center">
            <div className="rounded-3xl border border-lime-glow/25 bg-lime-glow/10 px-6 py-10">
              <p className="text-sm uppercase tracking-wider text-lime-glow/70">Hoyo {currentHoleNum} completado</p>
              <p className="mt-2 text-6xl font-extrabold tabular-nums">
                {scoreLabel(holeScore(currentHole.shots) - currentHole.par)}
              </p>
              <p className="mt-2 text-white/50">
                {holeScore(currentHole.shots)} golpes · Par {currentHole.par}
              </p>
            </div>
            <ShotTimeline shots={currentHole.shots} />
          </div>
        )}
      </div>

      {penaltyReason && (
        <PenaltySheet reason={penaltyReason} onConfirm={submitPenalty} />
      )}
    </Shell>
  );
}

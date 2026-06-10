import { useState } from "react";
import { PenaltyReason, PenaltyRelief } from "../types";
import { NumPad } from "./NumPad";

interface PenaltySheetProps {
  reason: PenaltyReason;
  onConfirm: (relief: PenaltyRelief, drop?: { distance: number; unit: "m" }) => void;
  onClose?: () => void;
}

const REASON_LABELS: Record<PenaltyReason, string> = {
  ob: "Fuera de límites (OB)",
  water: "Agua",
  lost: "Bola perdida",
  unplayable: "Lie imposible",
};

export function PenaltySheet({ reason, onConfirm, onClose }: PenaltySheetProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const [dist, setDist] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="animate-slide-up safe-bottom max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-fairway-900 p-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-xl font-bold">Penalización +1</h2>
        <p className="mt-1 text-sm text-white/55">{REASON_LABELS[reason]}</p>

        {!dropOpen ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onConfirm("replay")}
              className="min-h-20 rounded-2xl border border-white/15 bg-white/6 p-4 text-left active:bg-white/12"
            >
              <p className="font-bold">Rejuego</p>
              <p className="mt-1 text-xs text-white/50">Mismo sitio</p>
            </button>
            <button
              type="button"
              onClick={() => setDropOpen(true)}
              className="min-h-20 rounded-2xl border border-water/30 bg-water/10 p-4 text-left active:bg-water/20"
            >
              <p className="font-bold">Suelto</p>
              <p className="mt-1 text-xs text-white/50">Nueva distancia</p>
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="font-bold">Distancia al hoyo tras el drop (m)</p>
            <NumPad value={dist} onChange={setDist} unit="m" allowDecimal />
            <button
              type="button"
              disabled={!dist || Number(dist) <= 0}
              onClick={() => onConfirm("drop", { distance: Number(dist), unit: "m" })}
              className="w-full min-h-14 rounded-2xl bg-lime-glow font-bold text-fairway-950 disabled:opacity-40"
            >
              Confirmar drop
            </button>
            <button type="button" onClick={() => setDropOpen(false)} className="w-full py-2 text-sm text-white/45">
              Volver
            </button>
          </div>
        )}

        {!dropOpen && onClose && (
          <button type="button" onClick={onClose} className="mt-4 w-full py-3 text-sm text-white/45">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

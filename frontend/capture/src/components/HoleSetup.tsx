import { PAR_OPTIONS } from "../constants";
import { Chip } from "./Chip";
import { NumPad } from "./NumPad";

interface HoleSetupProps {
  holeNumber: number;
  par: number;
  distance: string;
  onParChange: (par: number) => void;
  onDistanceChange: (d: string) => void;
  onStart: () => void;
  loading?: boolean;
}

export function HoleSetup({
  holeNumber,
  par,
  distance,
  onParChange,
  onDistanceChange,
  onStart,
  loading,
}: HoleSetupProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="rounded-3xl border border-lime-glow/20 bg-gradient-to-br from-fairway-800 to-fairway-900 p-6">
        <p className="text-sm font-medium text-lime-glow/80">Hoyo {holeNumber}</p>
        <h2 className="mt-1 text-2xl font-bold">Configura el hoyo</h2>
        <p className="mt-2 text-sm text-white/50">Par y distancia al hoyo desde el tee</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Par</p>
        <div className="flex gap-3">
          {PAR_OPTIONS.map((p) => (
            <Chip
              key={p}
              label={`Par ${p}`}
              selected={par === p}
              onClick={() => onParChange(p)}
              className="min-h-16 flex-1 text-lg"
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Distancia desde el tee (m)</p>
        <NumPad value={distance} onChange={onDistanceChange} unit="m" allowDecimal />
      </div>

      <button
        type="button"
        disabled={!distance || Number(distance) <= 0 || loading}
        onClick={onStart}
        className="pulse-glow w-full min-h-16 rounded-2xl bg-lime-glow text-lg font-bold text-fairway-950 disabled:opacity-40"
      >
        {loading ? "Guardando…" : "Empezar hoyo"}
      </button>
    </div>
  );
}

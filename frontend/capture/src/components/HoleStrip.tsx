import { Hole } from "../types";
import { holeScore, scoreLabel } from "../constants";

interface HoleStripProps {
  plannedHoles: number;
  holes: Hole[];
  currentHole: number;
  onSelect?: (n: number) => void;
}

export function HoleStrip({ plannedHoles, holes, currentHole, onSelect }: HoleStripProps) {
  const holeMap = new Map(holes.map((h) => [h.hole_number, h]));

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: plannedHoles }, (_, i) => i + 1).map((n) => {
        const hole = holeMap.get(n);
        const active = n === currentHole;
        const done = hole?.completed;
        const started = !!hole;
        const strokes = hole ? holeScore(hole.shots) : 0;
        const vsPar = hole ? strokes - hole.par : 0;

        return (
          <button
            key={n}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(n)}
            className={[
              "flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-2xl px-2 py-2 transition",
              active
                ? "bg-lime-glow text-fairway-950 shadow-[0_0_24px_rgba(184,240,69,0.3)]"
                : done
                  ? "bg-white/10 text-white/80"
                  : started
                    ? "bg-fairway-700 text-white"
                    : "bg-white/5 text-white/35",
            ].join(" ")}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">H{n}</span>
            <span className="text-lg font-extrabold leading-none">
              {done ? scoreLabel(vsPar) : started ? strokes : "·"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

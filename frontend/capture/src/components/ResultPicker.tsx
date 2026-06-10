import {
  APPROACH_LIES,
  LIE_LABELS,
  LINE_LABELS,
  LINE_OPTIONS,
  PUTT_LIES,
  TEE_LIES,
  lieNeedsLine,
} from "../constants";
import type { ShotLie, ShotLine } from "../types";
import { Chip, ChipGrid } from "./Chip";

interface ResultPickerProps {
  mode: "tee" | "approach" | "putt";
  selectedLie: ShotLie | null;
  selectedLine: ShotLine | null;
  onSelectLie: (lie: ShotLie) => void;
  onSelectLine: (line: ShotLine) => void;
}

const modeLies = {
  tee: TEE_LIES,
  approach: APPROACH_LIES,
  putt: PUTT_LIES,
};

const lieVariant = (lie: string): "default" | "danger" | "success" | "water" => {
  if (lie === "holed" || lie === "green" || lie === "fairway") return "success";
  if (lie === "water") return "water";
  if (["ob", "lost", "unplayable"].includes(lie)) return "danger";
  return "default";
};

export function ResultPicker({
  mode,
  selectedLie,
  selectedLine,
  onSelectLie,
  onSelectLine,
}: ResultPickerProps) {
  const lies = modeLies[mode];
  const showLine = lieNeedsLine(selectedLie);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
          ¿Dónde quedó la bola?
        </p>
        <ChipGrid cols={3}>
          {lies.map((lie) => (
            <Chip
              key={lie}
              label={LIE_LABELS[lie] ?? lie}
              selected={selectedLie === lie}
              variant={selectedLie === lie ? "default" : lieVariant(lie)}
              onClick={() => onSelectLie(lie)}
              className="min-h-14"
            />
          ))}
        </ChipGrid>
      </div>

      {showLine && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
            Línea del tiro
          </p>
          <ChipGrid cols={3}>
            {LINE_OPTIONS.map((line) => (
              <Chip
                key={line}
                label={LINE_LABELS[line]}
                selected={selectedLine === line}
                variant={selectedLine === line ? "default" : line === "on_target" ? "success" : "default"}
                onClick={() => onSelectLine(line)}
                className="min-h-14"
              />
            ))}
          </ChipGrid>
        </div>
      )}
    </div>
  );
}

export function getResultMode(
  _par: number,
  strokeNumber: number,
  onGreen: boolean,
): "tee" | "approach" | "putt" {
  if (onGreen) return "putt";
  if (strokeNumber === 1) return "tee";
  return "approach";
}

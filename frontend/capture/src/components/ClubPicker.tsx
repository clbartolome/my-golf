import { Chip, ChipGrid } from "./Chip";

interface ClubPickerProps {
  clubs: string[];
  selected: string | null;
  onSelect: (club: string) => void;
  lastClub?: string | null;
}

export function ClubPicker({ clubs, selected, onSelect, lastClub }: ClubPickerProps) {
  const ordered = [...clubs].sort((a, b) => {
    if (a === lastClub) return -1;
    if (b === lastClub) return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {lastClub && (
        <button
          type="button"
          onClick={() => onSelect(lastClub)}
          className="flex w-full min-h-16 items-center justify-between rounded-2xl border border-lime-glow/30 bg-lime-glow/10 px-5 active:scale-[0.98]"
        >
          <span className="text-sm text-white/60">Repetir último</span>
          <span className="text-xl font-bold text-lime-glow">{lastClub}</span>
        </button>
      )}
      <ChipGrid cols={4}>
        {ordered.map((club) => (
          <Chip
            key={club}
            label={club}
            selected={selected === club}
            onClick={() => onSelect(club)}
            className="min-h-14 text-base"
          />
        ))}
      </ChipGrid>
    </div>
  );
}

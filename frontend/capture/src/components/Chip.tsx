interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  variant?: "default" | "danger" | "success" | "water";
  className?: string;
}

const variants = {
  default: "border-white/15 bg-white/6 text-white hover:bg-white/10",
  danger: "border-danger/40 bg-danger/15 text-red-100",
  success: "border-lime-glow/40 bg-lime-glow/15 text-lime-soft",
  water: "border-water/40 bg-water/15 text-sky-100",
};

export function Chip({ label, selected, onClick, variant = "default", className = "" }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-12 rounded-2xl border px-4 py-3 text-sm font-semibold transition active:scale-95",
        selected ? "border-lime-glow bg-lime-glow text-fairway-950 shadow-[0_0_20px_rgba(184,240,69,0.25)]" : variants[variant],
        className,
      ].join(" ")}
    >
      {label}
    </button>
  );
}

interface ChipGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

export function ChipGrid({ children, cols = 3 }: ChipGridProps) {
  const grid = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  return <div className={`grid ${grid} gap-2.5`}>{children}</div>;
}

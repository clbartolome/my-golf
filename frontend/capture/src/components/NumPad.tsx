interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  allowDecimal?: boolean;
}

export function NumPad({ value, onChange, unit, allowDecimal = false }: NumPadProps) {
  const append = (digit: string) => {
    if (digit === "." && (!allowDecimal || value.includes("."))) return;
    if (value === "0" && digit !== ".") {
      onChange(digit);
      return;
    }
    onChange(value + digit);
  };

  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "", "0", "⌫"];

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between rounded-2xl border border-white/10 bg-fairway-800/60 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/45">Distancia al hoyo</p>
          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
            {value || "—"}
            {value && unit && <span className="ml-2 text-xl font-semibold text-lime-glow">{unit}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white/60 active:bg-white/15"
        >
          Borrar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, i) =>
          key ? (
            <button
              key={`${key}-${i}`}
              type="button"
              onClick={() => (key === "⌫" ? backspace() : append(key))}
              className="flex min-h-[3.75rem] items-center justify-center rounded-2xl bg-white/8 text-2xl font-semibold active:bg-lime-glow active:text-fairway-950"
            >
              {key}
            </button>
          ) : (
            <div key={`empty-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

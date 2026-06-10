interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  unit?: string;
  allowDecimal?: boolean;
  tone?: "prepare" | "result" | "neutral";
}

const NUMPAD_TONE = {
  prepare: {
    box: "border-sky-400/25 bg-sky-400/8",
    label: "text-sky-200/80",
    unit: "text-sky-300",
    keyActive: "active:bg-sky-400 active:text-fairway-950",
  },
  result: {
    box: "border-sand/30 bg-sand/8",
    label: "text-sand/90",
    unit: "text-sand",
    keyActive: "active:bg-sand active:text-fairway-950",
  },
  neutral: {
    box: "border-white/10 bg-fairway-800/60",
    label: "text-white/45",
    unit: "text-lime-glow",
    keyActive: "active:bg-lime-glow active:text-fairway-950",
  },
};

export function NumPad({
  value,
  onChange,
  label = "Distancia al hoyo",
  hint,
  unit,
  allowDecimal = false,
  tone = "neutral",
}: NumPadProps) {
  const t = NUMPAD_TONE[tone];
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
      <div className={`flex items-end justify-between rounded-2xl border px-5 py-4 ${t.box}`}>
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${t.label}`}>{label}</p>
          {hint && <p className="mt-0.5 text-xs text-white/35">{hint}</p>}
          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
            {value || "—"}
            {value && unit && <span className={`ml-2 text-xl font-semibold ${t.unit}`}>{unit}</span>}
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
              className={`flex min-h-[3.75rem] items-center justify-center rounded-2xl bg-white/8 text-2xl font-semibold ${t.keyActive}`}
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

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  valueClassName?: string;
}

export function StatCard({ label, value, hint, accent, valueClassName }: StatCardProps) {
  return (
    <div className={`card p-4 ${accent ? "border-lime-glow/25 bg-lime-glow/5" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`stat-value mt-1.5 ${valueClassName ?? ""} ${accent && !valueClassName ? "text-lime-glow" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

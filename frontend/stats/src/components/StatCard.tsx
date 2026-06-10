interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div className={`card p-5 ${accent ? "border-lime-glow/25 bg-lime-glow/5" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`stat-value mt-2 ${accent ? "text-lime-glow" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

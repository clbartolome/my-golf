import { StatCard } from "../components/StatCard";
import type { DashboardKPI } from "../types";
import { fmtPct, fmtScore, fmtTrend, statusColor } from "../lib/dashboard";

interface KpiCardProps {
  kpi: DashboardKPI;
  format?: "score" | "pct" | "decimal";
  invertTrend?: boolean;
}

function formatValue(kpi: DashboardKPI, format: KpiCardProps["format"]): string {
  if (kpi.value == null) return "—";
  if (format === "pct") return fmtPct(kpi.value);
  if (format === "score") return fmtScore(kpi.value);
  return fmtScore(kpi.value);
}

export function KpiCard({ kpi, format = "decimal", invertTrend = false }: KpiCardProps) {
  const trendUnit = format === "pct" ? "pts" : kpi.label.includes("Putt") ? "putts" : "golpes";
  const trend = fmtTrend(kpi.trend, trendUnit, invertTrend);

  return (
    <StatCard
      label={kpi.label}
      value={formatValue(kpi, format)}
      hint={trend || undefined}
      accent={kpi.status === "good"}
      valueClassName={statusColor(kpi.status)}
    />
  );
}

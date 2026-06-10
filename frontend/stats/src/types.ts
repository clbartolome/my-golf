export type RoundRange = "last_5" | "last_10" | "last_20" | "season" | "all";
export type HolesFilter = "9" | "18" | "both_normalized";
export type MinSample = 0 | 10 | 20;
export type RoundStatus = "in_progress" | "completed";

export interface DashboardFilters {
  round_range: RoundRange;
  holes_filter: HolesFilter;
  course: string | null;
}

export interface DashboardSummary {
  avg_score_18: string | null;
  best_score_18: number | null;
  worst_score_18: number | null;
  trend_score: string | null;
}

export interface DashboardKPI {
  label: string;
  value: string | null;
  trend: string | null;
  status: "good" | "neutral" | "bad";
}

export interface LostPointsCategory {
  category: string;
  label: string;
  points_per_round: string;
  pct_of_total: string;
}

export interface DashboardObjective {
  title: string;
  reason: string;
  action: string | null;
}

export interface DashboardResponse {
  filters: DashboardFilters;
  available_courses: string[];
  rounds_in_period: number;
  insufficient_data: boolean;
  summary: DashboardSummary;
  kpis: {
    score: DashboardKPI;
    penalties: DashboardKPI;
    putts: DashboardKPI;
    gir: DashboardKPI;
  };
  lost_points_ranking: LostPointsCategory[];
  recommended_objective: DashboardObjective;
  insights: string[];
}

export interface BagClub {
  id: string;
  name: string;
  sort_order: number;
}

export interface PercentRow {
  label: string;
  pct: string;
}

export interface DispersionHeatmap {
  left_pct: string;
  center_pct: string;
  right_pct: string;
  short_pct: string;
  long_pct: string;
}

export interface BagClubRow {
  club: string;
  total_shots: number;
  stroke_cost_per_round: string;
  reliability_pct: string;
}

export interface PuttDistanceBucket {
  label: string;
  attempts: number;
  make_pct: string | null;
}

export interface PuttingAnalysisResponse {
  round_range: string;
  holes_filter: string;
  course: string | null;
  available_courses: string[];
  rounds_in_period: number;
  total_putts: number;
  putts_per_round: string;
  stroke_cost_per_round: string;
  make_pct: string;
  avg_length_m: string | null;
  one_putt_pct: string | null;
  two_putt_pct: string | null;
  three_putt_plus_pct: string | null;
  dominant_pattern: string;
  dominant_pattern_pct: string;
  heatmap: DispersionHeatmap;
  miss_breakdown: PercentRow[];
  distance_buckets: PuttDistanceBucket[];
}

export interface AnalyzedClub {
  club: string;
  total_shots: number;
}

export interface ClubRankingRow {
  club: string;
  total_shots: number;
  eligible: boolean;
  reliability_pct: string;
  avg_distance_m: string | null;
  control_pct: string | null;
  stroke_cost_per_round: string;
  penalty_share_pct: string;
  penalty_pct: string;
}

export interface ClubDetail {
  club: string;
  total_shots: number;
  eligible: boolean;
  avg_distance_m: string | null;
  distance_p20: string | null;
  distance_p80: string | null;
  control_pct: string | null;
  carry_std_dev_m: string | null;
  reliability_pct: string;
  stroke_cost_per_round: string;
  penalty_pct: string;
  dominant_pattern: string;
  dominant_pattern_pct: string;
  heatmap: DispersionHeatmap;
  results_breakdown: PercentRow[];
  miss_breakdown: PercentRow[];
}

export interface ClubAnalysisSummary {
  most_costly_club: string | null;
  most_costly_strokes: string | null;
  most_reliable_club: string | null;
  most_reliable_pct: string | null;
  top_penalty_source_club: string | null;
  top_penalty_source_pct: string | null;
  total_shots_analyzed: number;
}

export interface ClubRecommendation {
  title: string;
  reason: string;
}

export interface ClubAnalysisResponse {
  round_range: string;
  holes_filter: string;
  course: string | null;
  available_courses: string[];
  rounds_in_period: number;
  min_sample: number;
  summary: ClubAnalysisSummary;
  analyzed_clubs: AnalyzedClub[];
  hurts_ranking: ClubRankingRow[];
  helps_ranking: ClubRankingRow[];
  ranking: ClubRankingRow[];
  bag_rows: BagClubRow[];
  clubs: Record<string, ClubDetail>;
  insights: string[];
  recommendation: ClubRecommendation | null;
}

export interface DistanceRow {
  club: string;
  shots: number;
  avg_m: string | null;
  median_m: string | null;
  min_m: string | null;
  max_m: string | null;
}

export interface DistanceHistogramBar {
  label: string;
  count: number;
}

export interface ClubDistanceDetail {
  club: string;
  shots: number;
  avg_m: string | null;
  median_m: string | null;
  min_m: string | null;
  max_m: string | null;
  p10_m: string | null;
  p25_m: string | null;
  p75_m: string | null;
  p90_m: string | null;
  histogram: DistanceHistogramBar[];
}

export interface DistanceMapEntry {
  club: string;
  median_m: string;
  min_m: string;
  max_m: string;
  avg_m: string;
}

export interface DistanceAnalysisResponse {
  round_range: string;
  holes_filter: string;
  course: string | null;
  available_courses: string[];
  rounds_in_period: number;
  min_sample: number;
  bag_rows: DistanceRow[];
  yardage_map: DistanceMapEntry[];
  clubs: Record<string, ClubDistanceDetail>;
}

export interface ParScoreBreakdown {
  label: string;
  count: number;
  pct: string;
}

export interface ParTypeStats {
  par: number;
  holes_played: number;
  avg_strokes: string | null;
  avg_vs_par: string | null;
  gir_pct: string | null;
  fir_pct: string | null;
  avg_putts: string | null;
  penalty_hole_pct: string | null;
  score_breakdown: ParScoreBreakdown[];
}

export interface ParAnalysisResponse {
  round_range: string;
  holes_filter: string;
  course: string | null;
  available_courses: string[];
  rounds_in_period: number;
  by_par: ParTypeStats[];
  insights: string[];
}

export interface RoundSummaryStats {
  round_id: string;
  course_name: string;
  played_at: string;
  status: RoundStatus;
  tees: string | null;
  wind: string | null;
  planned_holes: number;
  holes_completed: number;
  total_strokes: number;
  total_par: number;
  score_vs_par: number;
  putts: number;
  gir_count: number;
  gir_opportunities: number;
  fir_count: number;
  fir_opportunities: number;
  penalty_strokes: number;
}

export interface ShotRead {
  id: string;
  stroke_number: number;
  shot_type: "normal" | "penalty";
  club: string | null;
  distance_before: string | null;
  distance_after: string | null;
  distance_unit: "m" | "yds" | "ft" | null;
  result: string | null;
  miss_line: string | null;
  penalty_reason: string | null;
  exclude_from_stats: boolean;
}

export interface HoleRead {
  id: string;
  hole_number: number;
  par: number;
  starting_distance: string;
  starting_unit: string;
  completed: boolean;
  shots: ShotRead[];
}

export interface RoundDetail {
  id: string;
  course_name: string;
  played_at: string;
  status: RoundStatus;
  tees: string | null;
  wind: string | null;
  planned_holes: number;
  notes: string | null;
  holes: HoleRead[];
}

export interface HoleStats {
  hole_number: number;
  par: number;
  strokes: number;
  score_vs_par: number;
  putts: number;
  gir: boolean;
  fir: boolean | null;
  penalties: number;
}

export interface RoundStatsDetail {
  round_id: string;
  course_name: string;
  played_at: string;
  total_strokes: number;
  total_par: number;
  score_vs_par: number;
  putts: number;
  gir_count: number;
  gir_opportunities: number;
  fir_count: number;
  fir_opportunities: number;
  penalty_strokes: number;
  holes: HoleStats[];
}

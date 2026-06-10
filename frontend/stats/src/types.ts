export type RoundStatus = "in_progress" | "completed";

export interface OverviewStats {
  rounds_total: number;
  rounds_completed: number;
  total_holes: number;
  avg_score_vs_par: string | null;
  avg_putts_per_hole: string | null;
  gir_pct: string | null;
  fir_pct: string | null;
  penalty_strokes: number;
  club_distances: ClubDistanceStat[];
}

export interface HandicapStats {
  handicap_index: string | null;
  eligible_rounds: number;
  rounds_needed: number;
  differentials: HandicapDifferential[];
  history: HandicapHistoryPoint[];
}

export interface HandicapDifferential {
  round_id: string;
  played_at: string;
  course_name: string;
  total_strokes: number;
  course_rating: string;
  differential: string;
  used_in_index: boolean;
}

export interface HandicapHistoryPoint {
  played_at: string;
  handicap_index: string | null;
}

export interface ScoringTrendPoint {
  round_id: string;
  played_at: string;
  course_name: string;
  total_strokes: number;
  total_par: number;
  score_vs_par: number;
  holes_completed: number;
  planned_holes: number;
  differential: string | null;
}

export interface ClubTrendPoint {
  round_id: string;
  played_at: string;
  club: string;
  shots: number;
  avg_distance: string;
  unit: string;
}

export interface ClubTrendSeries {
  club: string;
  points: ClubTrendPoint[];
}

export interface BagClub {
  id: string;
  name: string;
  sort_order: number;
}

export interface PhaseMissStats {
  total_shots: number;
  on_target_pct: string | null;
  left_pct: string | null;
  right_pct: string | null;
  short_pct: string | null;
  long_pct: string | null;
  trouble_pct: string | null;
  counts: Record<string, number>;
}

export interface ProximityBucket {
  label: string;
  shots: number;
  gir_pct: string | null;
  avg_remaining_m: string | null;
}

export interface ClubMissStats {
  club: string;
  total_shots: number;
  avg_carry_m: string | null;
  avg_remaining_m: string | null;
  avg_proximity_m: string | null;
  avg_putt_length_m: string | null;
  putt_make_pct: string | null;
  on_target_pct: string | null;
  left_pct: string | null;
  right_pct: string | null;
  short_pct: string | null;
  long_pct: string | null;
  trouble_pct: string | null;
  fir_pct: string | null;
  tee_miss_left_pct: string | null;
  tee_miss_right_pct: string | null;
}

export interface ShotAnalysisOverview {
  total_shots: number;
  tee: PhaseMissStats;
  approach: PhaseMissStats;
  putt: PhaseMissStats;
  proximity_buckets: ProximityBucket[];
  by_club: ClubMissStats[];
}

export interface ClubDistanceStat {
  club: string;
  shots: number;
  avg_distance: string;
  unit: string;
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

export interface HoleStats {
  hole_id: string;
  hole_number: number;
  par: number;
  strokes: number;
  score_vs_par: number;
  putts: number;
  gir: boolean;
  fir: boolean | null;
  penalties: number;
}

export interface RoundStats {
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

export interface CourseStats {
  course_name: string;
  rounds: number;
  holes: number;
  avg_score_vs_par: string | null;
  avg_putts_per_hole: string | null;
  gir_pct: string | null;
  fir_pct: string | null;
  penalty_strokes: number;
}

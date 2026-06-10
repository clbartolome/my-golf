export type RoundStatus = "in_progress" | "completed";
export type DistanceUnit = "m" | "yds" | "ft";
export type ShotType = "normal" | "penalty";
export type PenaltyReason = "ob" | "water" | "lost" | "unplayable";
export type PenaltyRelief = "replay" | "drop";

export type ShotLie =
  | "fairway"
  | "rough"
  | "bunker"
  | "green"
  | "fringe"
  | "water"
  | "ob"
  | "lost"
  | "unplayable"
  | "recovery"
  | "holed";

export type ShotLine = "on_target" | "short" | "long" | "left" | "right";

/** Solo para lectura de datos legacy */
export type ShotResult =
  | ShotLie
  | "rough_left"
  | "rough_right"
  | "miss_short"
  | "miss_long"
  | "miss_left"
  | "miss_right";

export interface RoundSummary {
  id: string;
  course_name: string;
  tees: string | null;
  wind: string | null;
  planned_holes: number;
  played_at: string;
  status: RoundStatus;
  notes: string | null;
}

export interface Shot {
  id: string;
  stroke_number: number;
  shot_type: ShotType;
  club: string | null;
  distance_before: string | null;
  distance_after: string | null;
  distance_unit: DistanceUnit | null;
  result: ShotResult | null;
  miss_line: ShotLine | null;
  penalty_reason: PenaltyReason | null;
  exclude_from_stats: boolean;
}

export interface Hole {
  id: string;
  round_id: string;
  hole_number: number;
  par: number;
  starting_distance: string;
  starting_unit: DistanceUnit;
  completed: boolean;
  shots: Shot[];
}

export interface RoundDetail extends RoundSummary {
  holes: Hole[];
}

export interface ShotCreateResponse {
  shot: Shot;
  penalty_required: boolean;
  suggested_penalty_reason: PenaltyReason | null;
}

export interface PenaltyCreateResponse {
  penalty_shot: Shot;
  next_shot_hint: {
    distance_before: string;
    distance_unit: DistanceUnit;
  };
}

export type ShotPhase = "club" | "result";

export interface PendingShot {
  club: string;
}

export interface NextShotHint {
  distance_before: string;
  distance_unit: DistanceUnit;
}

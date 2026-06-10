from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.enums import (
    DistanceUnit,
    PenaltyReason,
    PenaltyRelief,
    RoundStatus,
    ShotMissLine,
    ShotResult,
    ShotType,
    LIE_RESULTS,
    LEGACY_COMBINED_RESULTS,
    PENALTY_TRIGGER_RESULTS,
)


class RoundCreate(BaseModel):
    course_name: str = Field(min_length=1)
    tees: str | None = None
    wind: str | None = None
    planned_holes: int = Field(ge=9, le=18)
    played_at: datetime | None = None
    notes: str | None = None
    course_rating: Decimal | None = Field(default=None, ge=50, le=90)
    slope_rating: int | None = Field(default=None, ge=55, le=155)

    @field_validator("planned_holes")
    @classmethod
    def validate_planned_holes(cls, value: int) -> int:
        if value not in (9, 18):
            raise ValueError("planned_holes must be 9 or 18")
        return value


class RoundUpdate(BaseModel):
    status: RoundStatus | None = None
    notes: str | None = None
    tees: str | None = None
    wind: str | None = None


class RoundSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_name: str
    tees: str | None
    wind: str | None
    planned_holes: int
    played_at: datetime
    status: RoundStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ShotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stroke_number: int
    shot_type: ShotType
    club: str | None
    distance_before: Decimal | None
    distance_after: Decimal | None
    distance_unit: DistanceUnit | None
    result: ShotResult | None
    miss_line: ShotMissLine | None
    penalty_reason: PenaltyReason | None
    exclude_from_stats: bool
    created_at: datetime


class HoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    round_id: UUID
    hole_number: int
    par: int
    starting_distance: Decimal
    starting_unit: DistanceUnit
    completed: bool
    completed_at: datetime | None
    created_at: datetime
    shots: list[ShotRead] = []


class RoundDetail(RoundSummary):
    holes: list[HoleRead] = []


class HoleCreate(BaseModel):
    hole_number: int = Field(ge=1, le=18)
    par: int = Field(ge=3, le=6)
    starting_distance: Decimal = Field(gt=0)
    starting_unit: DistanceUnit = DistanceUnit.m


class ShotCreate(BaseModel):
    club: str = Field(min_length=1)
    distance_after: Decimal | None = Field(default=None, ge=0)
    distance_carry: Decimal | None = Field(default=None, gt=0)
    distance_unit: DistanceUnit
    result: ShotResult
    miss_line: ShotMissLine | None = None
    distance_before: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_shot(self) -> "ShotCreate":
        if self.result in LEGACY_COMBINED_RESULTS:
            raise ValueError("Use lie (result) and miss_line separately")
        if self.result not in LIE_RESULTS:
            raise ValueError("Invalid lie result")
        if self.distance_carry is not None and self.distance_after is not None:
            raise ValueError("Use distance_carry or distance_after, not both")
        if self.result == ShotResult.holed:
            if self.distance_carry is not None:
                raise ValueError("holed shots must not include distance_carry")
            if self.distance_after not in (None, Decimal("0")):
                raise ValueError("holed shots must have distance_after 0 or omitted")
        if self.distance_after == Decimal("0") and self.result != ShotResult.holed:
            self.result = ShotResult.holed
        if self.result in PENALTY_TRIGGER_RESULTS:
            self.miss_line = None
            if self.distance_carry is not None:
                raise ValueError("penalty results must not include distance_carry")
        elif self.result == ShotResult.holed:
            self.miss_line = ShotMissLine.on_target
        elif self.miss_line is None:
            raise ValueError("miss_line is required for non-penalty shots")
        return self


class PenaltyCreate(BaseModel):
    reason: PenaltyReason
    relief: PenaltyRelief
    drop_distance: Decimal | None = Field(default=None, gt=0)
    drop_unit: DistanceUnit | None = None

    @model_validator(mode="after")
    def validate_drop(self) -> "PenaltyCreate":
        if self.relief == PenaltyRelief.drop:
            if self.drop_distance is None or self.drop_unit is None:
                raise ValueError("drop_distance and drop_unit are required for drop relief")
        elif self.drop_distance is not None or self.drop_unit is not None:
            raise ValueError("drop fields only apply to drop relief")
        return self


class NextShotHint(BaseModel):
    distance_before: Decimal
    distance_unit: DistanceUnit


class ShotCreateResponse(BaseModel):
    shot: ShotRead
    penalty_required: bool = False
    suggested_penalty_reason: PenaltyReason | None = None


class PenaltyCreateResponse(BaseModel):
    penalty_shot: ShotRead
    next_shot_hint: NextShotHint


class HoleStats(BaseModel):
    hole_id: UUID
    hole_number: int
    par: int
    strokes: int
    score_vs_par: int
    putts: int
    gir: bool
    fir: bool | None
    penalties: int


class RoundStats(BaseModel):
    round_id: UUID
    course_name: str
    played_at: datetime
    total_strokes: int
    total_par: int
    score_vs_par: int
    putts: int
    gir_count: int
    gir_opportunities: int
    fir_count: int
    fir_opportunities: int
    penalty_strokes: int
    holes: list[HoleStats]


class ClubDistanceStat(BaseModel):
    club: str
    shots: int
    avg_distance: Decimal
    unit: DistanceUnit


class OverviewStats(BaseModel):
    rounds_total: int
    rounds_completed: int
    total_holes: int
    avg_score_vs_par: Decimal | None
    avg_putts_per_hole: Decimal | None
    gir_pct: Decimal | None
    fir_pct: Decimal | None
    penalty_strokes: int
    club_distances: list[ClubDistanceStat]


class RoundSummaryStats(BaseModel):
    round_id: UUID
    course_name: str
    played_at: datetime
    status: RoundStatus
    tees: str | None
    wind: str | None
    planned_holes: int
    holes_completed: int
    total_strokes: int
    total_par: int
    score_vs_par: int
    putts: int
    gir_count: int
    gir_opportunities: int
    fir_count: int
    fir_opportunities: int
    penalty_strokes: int


class CourseStats(BaseModel):
    course_name: str
    rounds: int
    holes: int
    avg_score_vs_par: Decimal | None
    avg_putts_per_hole: Decimal | None
    gir_pct: Decimal | None
    fir_pct: Decimal | None
    penalty_strokes: int


class HandicapDifferentialRead(BaseModel):
    round_id: UUID
    played_at: datetime
    course_name: str
    total_strokes: int
    course_rating: Decimal
    differential: Decimal
    used_in_index: bool = False


class HandicapStats(BaseModel):
    handicap_index: Decimal | None
    eligible_rounds: int
    rounds_needed: int  # mínimo 3 para tener índice
    differentials: list[HandicapDifferentialRead]
    history: list["HandicapHistoryPoint"]


class HandicapHistoryPoint(BaseModel):
    played_at: datetime
    handicap_index: Decimal | None


class ScoringTrendPoint(BaseModel):
    round_id: UUID
    played_at: datetime
    course_name: str
    total_strokes: int
    total_par: int
    score_vs_par: int
    holes_completed: int
    planned_holes: int
    differential: Decimal | None


class ClubTrendPoint(BaseModel):
    round_id: UUID
    played_at: datetime
    club: str
    shots: int
    avg_distance: Decimal
    unit: DistanceUnit


class ClubTrendSeries(BaseModel):
    club: str
    points: list[ClubTrendPoint]


class BagUpdate(BaseModel):
    clubs: list[str] = Field(min_length=1)


class BagClubRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    sort_order: int


class PhaseMissStats(BaseModel):
    total_shots: int
    on_target_pct: Decimal | None
    left_pct: Decimal | None
    right_pct: Decimal | None
    short_pct: Decimal | None
    long_pct: Decimal | None
    trouble_pct: Decimal | None
    counts: dict[str, int]


class ProximityBucket(BaseModel):
    label: str
    shots: int
    gir_pct: Decimal | None
    avg_remaining_m: Decimal | None


class ClubMissStats(BaseModel):
    club: str
    total_shots: int
    avg_carry_m: Decimal | None
    avg_remaining_m: Decimal | None
    avg_proximity_m: Decimal | None
    avg_putt_length_m: Decimal | None
    putt_make_pct: Decimal | None
    on_target_pct: Decimal | None
    left_pct: Decimal | None
    right_pct: Decimal | None
    short_pct: Decimal | None
    long_pct: Decimal | None
    trouble_pct: Decimal | None
    fir_pct: Decimal | None
    tee_miss_left_pct: Decimal | None
    tee_miss_right_pct: Decimal | None


class ShotAnalysisOverview(BaseModel):
    total_shots: int
    tee: PhaseMissStats
    approach: PhaseMissStats
    putt: PhaseMissStats
    proximity_buckets: list[ProximityBucket]
    by_club: list[ClubMissStats]


class DashboardFilters(BaseModel):
    round_range: str
    holes_filter: str
    course: str | None


class DashboardSummary(BaseModel):
    avg_score_18: Decimal | None
    best_score_18: int | None
    worst_score_18: int | None
    trend_score: Decimal | None


class DashboardKPI(BaseModel):
    label: str
    value: Decimal | None
    trend: Decimal | None
    status: str


class LostPointsCategory(BaseModel):
    category: str
    label: str
    points_per_round: Decimal
    pct_of_total: Decimal


class DashboardObjective(BaseModel):
    title: str
    reason: str
    action: str | None = None


class DashboardResponse(BaseModel):
    filters: DashboardFilters
    available_courses: list[str]
    rounds_in_period: int
    insufficient_data: bool
    summary: DashboardSummary
    kpis: dict[str, DashboardKPI]
    lost_points_ranking: list[LostPointsCategory]
    recommended_objective: DashboardObjective
    insights: list[str]


class PercentRow(BaseModel):
    label: str
    pct: Decimal


class DispersionHeatmap(BaseModel):
    left_pct: Decimal
    center_pct: Decimal
    right_pct: Decimal
    short_pct: Decimal
    long_pct: Decimal


class AnalyzedClub(BaseModel):
    club: str
    total_shots: int


class BagClubRow(BaseModel):
    club: str
    total_shots: int
    stroke_cost_per_round: Decimal
    reliability_pct: Decimal


class PuttDistanceBucket(BaseModel):
    label: str
    attempts: int
    make_pct: Decimal | None


class PuttingAnalysisResponse(BaseModel):
    round_range: str
    holes_filter: str
    course: str | None
    available_courses: list[str]
    rounds_in_period: int
    total_putts: int
    putts_per_round: Decimal
    stroke_cost_per_round: Decimal
    make_pct: Decimal
    avg_length_m: Decimal | None
    one_putt_pct: Decimal | None
    two_putt_pct: Decimal | None
    three_putt_plus_pct: Decimal | None
    dominant_pattern: str
    dominant_pattern_pct: Decimal
    heatmap: DispersionHeatmap
    miss_breakdown: list[PercentRow]
    distance_buckets: list[PuttDistanceBucket]


class ClubRankingRow(BaseModel):
    club: str
    total_shots: int
    eligible: bool
    reliability_pct: Decimal
    avg_distance_m: Decimal | None
    control_pct: Decimal | None
    stroke_cost_per_round: Decimal
    penalty_share_pct: Decimal
    penalty_pct: Decimal


class ClubDetail(BaseModel):
    club: str
    total_shots: int
    eligible: bool
    avg_distance_m: Decimal | None
    distance_p20: Decimal | None
    distance_p80: Decimal | None
    control_pct: Decimal | None
    carry_std_dev_m: Decimal | None
    reliability_pct: Decimal
    stroke_cost_per_round: Decimal
    penalty_pct: Decimal
    dominant_pattern: str
    dominant_pattern_pct: Decimal
    heatmap: DispersionHeatmap
    results_breakdown: list[PercentRow]
    miss_breakdown: list[PercentRow]


class ClubAnalysisSummary(BaseModel):
    most_costly_club: str | None
    most_costly_strokes: Decimal | None
    most_reliable_club: str | None
    most_reliable_pct: Decimal | None
    top_penalty_source_club: str | None
    top_penalty_source_pct: Decimal | None
    total_shots_analyzed: int


class ClubRecommendation(BaseModel):
    title: str
    reason: str


class ClubAnalysisResponse(BaseModel):
    round_range: str
    holes_filter: str
    course: str | None
    available_courses: list[str]
    rounds_in_period: int
    min_sample: int
    summary: ClubAnalysisSummary
    analyzed_clubs: list[AnalyzedClub]
    hurts_ranking: list[ClubRankingRow]
    helps_ranking: list[ClubRankingRow]
    ranking: list[ClubRankingRow]
    bag_rows: list[BagClubRow]
    clubs: dict[str, ClubDetail]
    insights: list[str]
    recommendation: ClubRecommendation | None


class DistanceRow(BaseModel):
    club: str
    shots: int
    avg_m: Decimal | None
    median_m: Decimal | None
    min_m: Decimal | None
    max_m: Decimal | None


class DistanceHistogramBar(BaseModel):
    label: str
    count: int


class ClubDistanceDetail(BaseModel):
    club: str
    shots: int
    avg_m: Decimal | None
    median_m: Decimal | None
    min_m: Decimal | None
    max_m: Decimal | None
    p10_m: Decimal | None
    p25_m: Decimal | None
    p75_m: Decimal | None
    p90_m: Decimal | None
    histogram: list[DistanceHistogramBar]


class DistanceMapEntry(BaseModel):
    club: str
    median_m: Decimal
    min_m: Decimal
    max_m: Decimal
    avg_m: Decimal


class DistanceAnalysisResponse(BaseModel):
    round_range: str
    holes_filter: str
    course: str | None
    available_courses: list[str]
    rounds_in_period: int
    min_sample: int
    bag_rows: list[DistanceRow]
    yardage_map: list[DistanceMapEntry]
    clubs: dict[str, ClubDistanceDetail]


class ParScoreBreakdown(BaseModel):
    label: str
    count: int
    pct: Decimal


class ParTypeStats(BaseModel):
    par: int
    holes_played: int
    avg_strokes: Decimal | None
    avg_vs_par: Decimal | None
    gir_pct: Decimal | None
    fir_pct: Decimal | None
    avg_putts: Decimal | None
    penalty_hole_pct: Decimal | None
    score_breakdown: list[ParScoreBreakdown]


class ParAnalysisResponse(BaseModel):
    round_range: str
    holes_filter: str
    course: str | None
    available_courses: list[str]
    rounds_in_period: int
    by_par: list[ParTypeStats]
    insights: list[str]


# ---------------------------------------------------------------------------
# Backup / restore
# ---------------------------------------------------------------------------


class ExportShot(BaseModel):
    stroke_number: int
    shot_type: ShotType
    club: str | None = None
    distance_before: Decimal | None = None
    distance_after: Decimal | None = None
    distance_unit: DistanceUnit | None = None
    result: ShotResult | None = None
    miss_line: ShotMissLine | None = None
    penalty_reason: PenaltyReason | None = None
    exclude_from_stats: bool = False


class ExportHole(BaseModel):
    hole_number: int
    par: int
    starting_distance: Decimal
    starting_unit: DistanceUnit
    completed: bool
    completed_at: datetime | None = None
    shots: list[ExportShot] = []


class ExportRound(BaseModel):
    course_name: str
    tees: str | None = None
    wind: str | None = None
    planned_holes: int
    played_at: datetime
    status: RoundStatus
    notes: str | None = None
    course_rating: Decimal | None = None
    slope_rating: int | None = None
    holes: list[ExportHole] = []


class BackupExport(BaseModel):
    version: int
    exported_at: datetime
    app: str = "my-golf"
    bag: list[str] = []
    rounds: list[ExportRound] = []


class BackupImportResult(BaseModel):
    mode: str
    rounds_imported: int
    bag_clubs: int

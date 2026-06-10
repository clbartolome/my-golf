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
        if self.result == ShotResult.holed and self.distance_after not in (None, Decimal("0")):
            raise ValueError("holed shots must have distance_after 0 or omitted")
        if self.distance_after == Decimal("0") and self.result != ShotResult.holed:
            self.result = ShotResult.holed
        if self.result in PENALTY_TRIGGER_RESULTS:
            self.miss_line = None
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

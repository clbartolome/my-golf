from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.club_analysis import club_analysis_stats
from app.distance_analysis import distance_analysis_stats
from app.par_analysis import par_analysis_stats
from app.putting_analysis import putting_analysis_stats
from app.schemas import (
    ClubAnalysisResponse,
    CourseStats,
    DashboardResponse,
    DistanceAnalysisResponse,
    HandicapStats,
    OverviewStats,
    ParAnalysisResponse,
    PuttingAnalysisResponse,
    RoundStats,
    RoundSummaryStats,
    ScoringTrendPoint,
    ClubTrendSeries,
    ShotAnalysisOverview,
)
from app.dashboard import dashboard_stats
from app.stats_filters import HolesFilter, RoundRange
from app.stats import (
    all_rounds_stats,
    club_trends,
    handicap_stats,
    overview_stats,
    round_stats,
    scoring_trends,
    shot_analysis,
    stats_by_course,
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_stats(
        db,
        round_range=round_range,
        holes_filter=holes_filter,
        course=course,
    )


@router.get("/clubs", response_model=ClubAnalysisResponse)
async def get_club_analysis(
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    min_sample: int = Query(10, description="Mínimo de golpes por palo (0 = sin mínimo)"),
    db: AsyncSession = Depends(get_db),
):
    if min_sample not in (0, 10, 20):
        raise HTTPException(status_code=400, detail="min_sample must be 0, 10, or 20")
    return await club_analysis_stats(
        db,
        round_range=round_range,
        holes_filter=holes_filter,
        course=course,
        min_sample=min_sample,
    )


@router.get("/distances", response_model=DistanceAnalysisResponse)
async def get_distance_analysis(
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    min_sample: int = Query(10, description="Mínimo de golpes por palo (0 = sin mínimo)"),
    db: AsyncSession = Depends(get_db),
):
    if min_sample not in (0, 10, 20):
        raise HTTPException(status_code=400, detail="min_sample must be 0, 10, or 20")
    return await distance_analysis_stats(
        db,
        round_range=round_range,
        holes_filter=holes_filter,
        course=course,
        min_sample=min_sample,
    )


@router.get("/par", response_model=ParAnalysisResponse)
async def get_par_analysis(
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await par_analysis_stats(
        db,
        round_range=round_range,
        holes_filter=holes_filter,
        course=course,
    )


@router.get("/putting", response_model=PuttingAnalysisResponse)
async def get_putting_analysis(
    round_range: RoundRange = RoundRange.last_10,
    holes_filter: HolesFilter = HolesFilter.both_normalized,
    course: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await putting_analysis_stats(
        db,
        round_range=round_range,
        holes_filter=holes_filter,
        course=course,
    )


@router.get("/overview", response_model=OverviewStats)
async def get_overview(db: AsyncSession = Depends(get_db)):
    return await overview_stats(db)


@router.get("/rounds", response_model=list[RoundSummaryStats])
async def get_rounds_stats(db: AsyncSession = Depends(get_db)):
    return await all_rounds_stats(db)


@router.get("/rounds/{round_id}", response_model=RoundStats)
async def get_round_stats(round_id: UUID, db: AsyncSession = Depends(get_db)):
    return await round_stats(db, round_id)


@router.get("/courses", response_model=list[CourseStats])
async def get_course_stats(db: AsyncSession = Depends(get_db)):
    return await stats_by_course(db)


@router.get("/handicap", response_model=HandicapStats)
async def get_handicap(db: AsyncSession = Depends(get_db)):
    return await handicap_stats(db)


@router.get("/trends/scoring", response_model=list[ScoringTrendPoint])
async def get_scoring_trends(db: AsyncSession = Depends(get_db)):
    return await scoring_trends(db)


@router.get("/trends/clubs", response_model=list[ClubTrendSeries])
async def get_club_trends(db: AsyncSession = Depends(get_db)):
    return await club_trends(db)


@router.get("/shot-analysis", response_model=ShotAnalysisOverview)
async def get_shot_analysis(db: AsyncSession = Depends(get_db)):
    return await shot_analysis(db)

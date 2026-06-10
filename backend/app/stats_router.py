from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    CourseStats,
    HandicapStats,
    OverviewStats,
    RoundStats,
    RoundSummaryStats,
    ScoringTrendPoint,
    ClubTrendSeries,
    ShotAnalysisOverview,
)
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

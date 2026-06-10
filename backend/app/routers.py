from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import RoundStatus
from app.schemas import (
    HoleCreate,
    HoleRead,
    PenaltyCreate,
    PenaltyCreateResponse,
    RoundCreate,
    RoundDetail,
    RoundSummary,
    RoundUpdate,
    ShotCreate,
    ShotCreateResponse,
    ShotRead,
)
from app.services import (
    create_hole,
    create_penalty,
    create_round,
    create_shot,
    delete_round,
    get_round_detail,
    get_hole_or_404,
    list_rounds,
    update_round,
)

router = APIRouter(tags=["rounds"])


@router.post("/rounds", response_model=RoundSummary, status_code=201)
async def post_round(payload: RoundCreate, db: AsyncSession = Depends(get_db)):
    return await create_round(db, payload)


@router.get("/rounds", response_model=list[RoundSummary])
async def get_rounds(
    status: RoundStatus | None = None,
    course_name: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_rounds(db, status_filter=status.value if status else None, course_name=course_name)


@router.get("/rounds/{round_id}", response_model=RoundDetail)
async def get_round(round_id: UUID, db: AsyncSession = Depends(get_db)):
    return await get_round_detail(db, round_id)


@router.patch("/rounds/{round_id}", response_model=RoundSummary)
async def patch_round(round_id: UUID, payload: RoundUpdate, db: AsyncSession = Depends(get_db)):
    return await update_round(db, round_id, payload)


@router.delete("/rounds/{round_id}", status_code=204)
async def remove_round(round_id: UUID, db: AsyncSession = Depends(get_db)):
    await delete_round(db, round_id)


@router.post("/rounds/{round_id}/holes", response_model=HoleRead, status_code=201)
async def post_hole(round_id: UUID, payload: HoleCreate, db: AsyncSession = Depends(get_db)):
    hole = await create_hole(db, round_id, payload)
    return hole


@router.get("/holes/{hole_id}", response_model=HoleRead)
async def get_hole(hole_id: UUID, db: AsyncSession = Depends(get_db)):
    return await get_hole_or_404(db, hole_id)


@router.post("/holes/{hole_id}/shots", response_model=ShotCreateResponse, status_code=201)
async def post_shot(hole_id: UUID, payload: ShotCreate, db: AsyncSession = Depends(get_db)):
    shot, penalty_required, suggested = await create_shot(db, hole_id, payload)
    return ShotCreateResponse(
        shot=ShotRead.model_validate(shot),
        penalty_required=penalty_required,
        suggested_penalty_reason=suggested,
    )


@router.post("/holes/{hole_id}/penalties", response_model=PenaltyCreateResponse, status_code=201)
async def post_penalty(hole_id: UUID, payload: PenaltyCreate, db: AsyncSession = Depends(get_db)):
    penalty, hint = await create_penalty(db, hole_id, payload)
    return PenaltyCreateResponse(
        penalty_shot=ShotRead.model_validate(penalty),
        next_shot_hint=hint,
    )

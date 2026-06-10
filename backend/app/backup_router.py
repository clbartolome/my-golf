import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.backup import ImportMode, export_all, import_all
from app.database import get_db
from app.schemas import BackupExport, BackupImportResult

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("/export")
async def get_export(db: AsyncSession = Depends(get_db)):
    data = await export_all(db)
    filename = f"my-golf-backup-{datetime.now(UTC).strftime('%Y-%m-%d')}.json"
    return JSONResponse(
        content=json.loads(data.model_dump_json()),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=BackupImportResult)
async def post_import(
    file: UploadFile = File(...),
    mode: ImportMode = Query(default=ImportMode.replace),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload a .json backup file",
        )

    raw = await file.read()
    try:
        payload = BackupExport.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid backup file: {exc}",
        ) from exc

    return await import_all(db, payload, mode)

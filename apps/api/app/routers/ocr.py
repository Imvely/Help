"""라벨 OCR 작업 API (docs/06 §2, §3).

POST /ocr/label  (multipart image, ean13?, product_id?, text?)  → 202 {job_id, status}
GET  /ocr/jobs/{id}                                            → {job_id, status, result|null, error?}
dev(ocr_inline=True): 업로드 직후 BackgroundTasks 로 처리. prod: 워커가 queued 를 처리.
`text` 는 테스트/디버그용 — OCR 텍스트를 직접 넘기면 OCR 엔진을 건너뛴다.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import OptionalUser, optional_user
from app.config import get_settings
from app.db import models as m
from app.db.base import SessionLocal, get_db
from app.pipeline.ocr_worker import process_job
from app.schemas import OcrJobOut
from app.services import storage

router = APIRouter(prefix="/ocr", tags=["ocr"])

MAX_IMAGE_BYTES = 8 * 1024 * 1024


def _run_inline(job_id: str) -> None:
    with SessionLocal() as db:
        process_job(db, job_id)


@router.post("/label", response_model=OcrJobOut, status_code=202)
async def submit_label(
    background: BackgroundTasks,
    image: UploadFile = File(...),
    ean13: str | None = Form(None),
    product_id: str | None = Form(None),
    text: str | None = Form(None),
    db: Session = Depends(get_db),
    user: OptionalUser = Depends(optional_user),
):
    data = await image.read()
    if not data:
        raise HTTPException(422, "이미지가 비어 있습니다")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "이미지는 8MB 이하여야 합니다")
    ext = "png" if (image.content_type or "").endswith("png") else "jpg"
    key = storage.put_bytes(data, prefix="ocr", ext=ext)
    job = m.OcrJob(image_key=key, ean13=ean13, product_id=product_id, ocr_text=text,
                   user_id=user.id if user else None)
    db.add(job)
    db.commit()
    db.refresh(job)
    if get_settings().ocr_inline:
        background.add_task(_run_inline, job.id)
    return OcrJobOut(job_id=job.id, status=job.status, result=job.result)


@router.get("/jobs/{job_id}", response_model=OcrJobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(m.OcrJob, job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다")
    return OcrJobOut(job_id=job.id, status=job.status, result=job.result, error=job.error)

"""라벨 OCR 작업 (M2). 지금은 작업 큐 인터페이스만: 업로드 → job_id, 폴링.

실제 OCR(PaddleOCR) + Claude 구조화는 워커(app/pipeline/ocr_worker.py, M2)에서 처리한다.
여기서는 인메모리 큐로 계약을 고정해 앱이 먼저 붙을 수 있게 한다.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import OcrJobOut
from app.services.ingredient_parser import parse_ingredients
from app.services.label_parser import parse_label_text

router = APIRouter(prefix="/ocr", tags=["ocr"])

_JOBS: dict[str, OcrJobOut] = {}


@router.post("/label", response_model=OcrJobOut, status_code=202)
async def submit_label(image: UploadFile = File(...), text: str | None = None):
    """image: 라벨 사진. text: (테스트/디버그용) OCR 결과 텍스트를 직접 넘기면 즉시 파싱."""
    job_id = str(uuid.uuid4())
    if text:
        parsed = parse_label_text(text)
        parsed["ingredients"] = [
            {"name": i.name, "origin": i.origin, "function": i.function_hint,
             "sub_ingredients": [s.name for s in i.sub_ingredients]}
            for i in parse_ingredients(parsed.get("ingredients_raw"))
        ]
        job = OcrJobOut(job_id=job_id, status="done", result=parsed)
    else:
        await image.read()  # M2: 저장소에 저장 후 워커 큐에 넣는다
        job = OcrJobOut(job_id=job_id, status="queued", result=None)
    _JOBS[job_id] = job
    return job


@router.get("/jobs/{job_id}", response_model=OcrJobOut)
def get_job(job_id: str):
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다")
    return job

"""사용자 기여: 정정 요청, (P1) 바코드 세션 이미지 기여."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.base import get_db
from app.schemas import CorrectionIn, CorrectionOut

router = APIRouter(prefix="/contributions", tags=["contributions"])

ALLOWED_FIELDS = {
    "name", "brand", "manufacturing_country", "brand_owner_country", "ingredient_origin",
    "ingredients", "allergens", "may_contain", "caffeine_mg", "nutrition", "barcode", "other",
}


@router.post("/corrections", response_model=CorrectionOut, status_code=201)
def create_correction(body: CorrectionIn, db: Session = Depends(get_db)):
    if body.field not in ALLOWED_FIELDS:
        raise HTTPException(422, f"field 는 {sorted(ALLOWED_FIELDS)} 중 하나여야 합니다")
    if not db.get(m.Product, body.product_id):
        raise HTTPException(404, "제품을 찾을 수 없습니다")
    c = m.Correction(product_id=body.product_id, field=body.field,
                     proposed_value=body.proposed_value, evidence_url=body.evidence_url,
                     note=body.note)
    db.add(c)
    db.commit()
    db.refresh(c)
    return CorrectionOut(id=c.id, status=c.status, created_at=c.created_at)

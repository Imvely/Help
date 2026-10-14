"""사용자 기여: 정정 요청, (P1) 바코드 세션 이미지 기여."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import OptionalUser, optional_user
from app.config import get_settings
from app.db import models as m
from app.db.base import get_db
from app.schemas import CorrectionIn, CorrectionOut, LabelContributionIn, LabelContributionOut
from app.services.ingredient_parser import COUNTRY_WORDS, ParsedIngredient
from app.services.product_writer import LabelFacts, touch_source, upsert_product

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


def _norm_country(v: str | None) -> str | None:
    if not v:
        return None
    v = v.strip()
    if v in ("unknown", "알 수 없음", ""):
        return None
    if v in COUNTRY_WORDS:
        return COUNTRY_WORDS[v]
    return v  # 이미 ISO 코드이거나 '외국산'


def _fingerprint(ex) -> str:
    """같은 라벨을 읽은 제보끼리 같은 값. 원재료 이름·원산지·제조국만 본다(대소문자·공백 무시)."""
    core = {
        "ingredients": [(i.name.replace(" ", "").lower(), _norm_country(i.origin)) for i in ex.ingredients],
        "manufacturing_country": _norm_country(ex.manufacturing_country),
        "caffeine_mg": ex.caffeine_mg,
    }
    return hashlib.sha256(json.dumps(core, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


@router.post("/label", response_model=LabelContributionOut, status_code=201)
def contribute_label(body: LabelContributionIn, db: Session = Depends(get_db),
                     user: OptionalUser = Depends(optional_user)):
    """OCR 확인·수정 결과를 제품 정보로 저장. 제보 n명 일치 시 ocr_verified 로 승격."""
    ex = body.extraction
    if not ex.ingredients and not ex.ingredients_raw and not body.product_name:
        raise HTTPException(422, "원재료 또는 제품명 중 하나는 필요합니다")
    if body.job_id and not db.get(m.OcrJob, body.job_id):
        raise HTTPException(404, "OCR 작업을 찾을 수 없습니다")

    parsed = [
        ParsedIngredient(name=i.name.strip(), raw=i.name.strip(), origin=_norm_country(i.origin),
                         function_hint=i.function,
                         sub_ingredients=[ParsedIngredient(name=s, raw=s) for s in i.sub_ingredients])
        for i in ex.ingredients if i.name.strip()
    ] or None
    nutrition = {"caffeine_mg": ex.caffeine_mg} if ex.caffeine_mg is not None else None
    facts = LabelFacts(
        name=body.product_name, brand=body.brand, category=body.category, ean13=body.ean13,
        ingredients_raw=ex.ingredients_raw, ingredients=parsed,
        manufacturing_country=_norm_country(ex.manufacturing_country),
        manufacturer=ex.manufacturer, brand_owner_name=ex.brand_owner,
        origin_confidence="ocr", may_contain=ex.may_contain_detected,
        nutrition=nutrition, high_caffeine=ex.high_caffeine or None,
    )
    product, created = upsert_product(db, facts, source="ocr_user", source_date=datetime.now(UTC).date(),
                                      source_ref=body.job_id, product_id=body.product_id)

    fp = _fingerprint(ex)
    db.add(m.LabelContribution(product_id=product.id, job_id=body.job_id,
                               user_id=user.id if user else None, fingerprint=fp, extraction=ex.model_dump()))
    db.flush()
    agree = db.execute(
        select(func.count(m.LabelContribution.id)).where(m.LabelContribution.product_id == product.id,
                                                          m.LabelContribution.fingerprint == fp)
    ).scalar_one()
    source = "ocr_user"
    if agree >= get_settings().label_verify_threshold:
        source = "ocr_verified"
        touch_source(product, "ocr_verified", datetime.now(UTC).date(), fp[:12], confirmations=agree)
        for pi in product.ingredients:
            for o in pi.origins:
                o.source = "ocr_verified"
                o.confirmations = agree
    else:
        touch_source(product, "ocr_user", datetime.now(UTC).date(), body.job_id, confirmations=agree)
    db.commit()
    return LabelContributionOut(product_id=product.id, created=created, source=source, confirmations=agree)

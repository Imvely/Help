"""OCR 작업 처리 (docs/06 §3).

흐름: 이미지 로드 → (선택) PaddleOCR → 정규식 1차 → Claude 구조화(가능하면) → 알레르겐 코드 매핑 → 저장.
dev 는 요청 안에서 BackgroundTasks 로, prod 는 워커가 queued 작업을 집어 처리한다.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m
from app.ml import label_extractor
from app.ml.ocr import get_ocr
from app.services import storage
from app.services.allergen_matcher import extract_may_contain, match_allergens
from app.services.ingredient_parser import COUNTRY_WORDS, flatten_names, parse_ingredients
from app.services.label_parser import parse_label_text

log = logging.getLogger(__name__)


def _allergen_syn(db: Session) -> dict[str, list[str]]:
    return {a.code: [a.name_ko, *(a.synonyms or [])] for a in db.execute(select(m.Allergen)).scalars()}


def _country_code(text: str | None) -> str | None:
    if not text:
        return None
    t = text.strip()
    for word, code in COUNTRY_WORDS.items():
        if t.startswith(word):
            return code
    return None


def build_result(db: Session, image_bytes: bytes, media_type: str, ocr_text: str | None) -> dict:
    """OCR 텍스트(없어도 됨) + 이미지 → 앱이 쓰는 LabelExtraction dict."""
    regex = parse_label_text(ocr_text) if ocr_text else {}
    llm = label_extractor.extract(image_bytes, media_type, ocr_text)

    ingredients_raw = (llm.ingredients_raw if llm else None) or regex.get("ingredients_raw")
    if llm and llm.ingredients:
        ingredients = [
            {"name": i.name, "origin": _country_code(i.origin) or (i.origin or None),
             "function": i.function, "sub_ingredients": i.sub_ingredients}
            for i in llm.ingredients
        ]
    else:
        ingredients = [
            {"name": i.name, "origin": i.origin, "function": i.function_hint,
             "sub_ingredients": [s.name for s in i.sub_ingredients]}
            for i in parse_ingredients(ingredients_raw)
        ]

    syn = _allergen_syn(db)
    names = [i["name"] for i in ingredients] + [s for i in ingredients for s in i["sub_ingredients"]]
    if not names and ingredients_raw:
        names = flatten_names(parse_ingredients(ingredients_raw))
    allergen_statement = (llm.allergen_statement if llm else None) or regex.get("allergen_statement")
    may_contain_statement = (llm.may_contain_statement if llm else None) or regex.get("may_contain_statement")
    detected = {h.code for h in match_allergens(names, syn)}
    if allergen_statement:
        detected |= {h.code for h in match_allergens([allergen_statement], syn)}
    may_contain = extract_may_contain(may_contain_statement, syn)

    manufacturing = (llm.manufacturing_country if llm else None) or regex.get("manufacturing_country")
    return {
        "ocr_text": ocr_text or "",
        "ingredients_raw": ingredients_raw,
        "ingredients": ingredients,
        "country_of_origin": llm.country_of_origin if llm else None,
        "manufacturing_country": _country_code(manufacturing) or manufacturing,
        "manufacturer": (llm.manufacturer if llm else None) or regex.get("manufacturer"),
        "brand_owner": (llm.brand_owner if llm else None) or regex.get("brand_owner"),
        "caffeine_mg": (llm.caffeine_mg if llm else None) or regex.get("caffeine_mg"),
        "high_caffeine": bool((llm.high_caffeine if llm else False) or regex.get("high_caffeine")),
        "allergen_statement": allergen_statement,
        "may_contain_statement": may_contain_statement,
        "allergens_detected": sorted(detected),
        "may_contain_detected": [c for c in may_contain if c not in detected],
        "product_name": llm.product_name if llm else None,
        "brand": llm.brand if llm else None,
        "extraction_method": "claude" if llm else "regex",
        "ocr_corrections": llm.ocr_corrections if llm else [],
    }


def process_job(db: Session, job_id: str) -> m.OcrJob:
    job = db.get(m.OcrJob, job_id)
    if not job:
        raise KeyError(job_id)
    job.status = "running"
    db.commit()
    try:
        image = storage.get_bytes(job.image_key)
        media_type = "image/png" if job.image_key.endswith(".png") else "image/jpeg"
        ocr_text: str | None = job.ocr_text
        if ocr_text is None:
            engine = get_ocr()
            if engine:
                ocr_text, conf = engine.run(image)
                log.info("paddle ocr conf=%.2f chars=%d", conf, len(ocr_text))
        job.ocr_text = ocr_text
        job.result = build_result(db, image, media_type, ocr_text)
        job.status = "done"
    except Exception as e:  # noqa: BLE001  — 작업 실패를 기록하고 앱에 알린다
        log.exception("ocr job %s failed", job_id)
        job.status = "failed"
        job.error = str(e)[:500]
    job.updated_at = datetime.now(UTC)
    db.commit()
    return job


def run_queued(limit: int = 10) -> int:
    """워커 모드: queued 작업을 집어 처리."""
    from app.db.base import SessionLocal

    n = 0
    with SessionLocal() as db:
        ids = db.execute(
            select(m.OcrJob.id).where(m.OcrJob.status == "queued")
            .order_by(m.OcrJob.created_at).limit(limit)
        ).scalars().all()
    for jid in ids:
        with SessionLocal() as db:
            process_job(db, jid)
            n += 1
    return n


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("processed", run_queued())

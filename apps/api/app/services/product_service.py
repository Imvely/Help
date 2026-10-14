"""DB 객체 → API 응답(ProductResponse) 조립.

여기서 하는 일:
1) 원재료 목록 + 성분 사전의 등급/근거를 붙인다.
2) 알레르겐: 성분 사전 매핑 ∪ 동의어 텍스트 매칭. '혼입 가능' 은 별도.
3) 원산지: 레벨별 배지 문구 생성. 표시 없는 원료는 unknown.
4) 회수: 바코드/품목보고번호/product_id 로 매칭된 최신 1건.
개인화 경고는 만들지 않는다 — 기기(packages/domain)가 프로필과 교차한다.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import models as m
from app.schemas import (
    AllergensOut,
    GradeSummary,
    IngredientOriginOut,
    IngredientOut,
    NutritionOut,
    OriginBadgeOut,
    OriginOut,
    ProductBrief,
    ProductResponse,
    RecallOut,
    SourceOut,
)
from app.services import origin as origin_svc
from app.services.allergen_matcher import match_allergens


def load_product(db: Session, product_id: str) -> m.Product | None:
    stmt = (
        select(m.Product)
        .where(m.Product.id == product_id)
        .options(
            selectinload(m.Product.barcodes),
            selectinload(m.Product.origin),
            selectinload(m.Product.ingredients)
            .selectinload(m.ProductIngredient.ingredient)
            .selectinload(m.Ingredient.hazard),
            selectinload(m.Product.ingredients)
            .selectinload(m.ProductIngredient.ingredient)
            .selectinload(m.Ingredient.allergens),
            selectinload(m.Product.ingredients).selectinload(m.ProductIngredient.origins),
            selectinload(m.Product.may_contain),
            selectinload(m.Product.nutrition),
            selectinload(m.Product.sources),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def product_by_barcode(db: Session, ean13: str) -> m.Product | None:
    row = db.get(m.ProductBarcode, ean13)
    if not row:
        return None
    return load_product(db, row.product_id)


def allergen_synonyms(db: Session) -> tuple[dict[str, list[str]], dict[str, str]]:
    rows = db.execute(select(m.Allergen)).scalars().all()
    syn = {a.code: [a.name_ko, *a.synonyms] for a in rows}
    labels = {a.code: a.name_ko for a in rows}
    return syn, labels


def latest_recall(db: Session, product: m.Product) -> m.Recall | None:
    eans = [b.ean13 for b in product.barcodes]
    conds = [m.Recall.product_id == product.id]
    if eans:
        conds.append(m.Recall.barcode.in_(eans))
    if product.mfds_report_no:
        conds.append(m.Recall.report_no == product.mfds_report_no)
    stmt = select(m.Recall).where(or_(*conds)).order_by(m.Recall.issued_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


def build_response(db: Session, product: m.Product) -> ProductResponse:
    syn_by_code, labels = allergen_synonyms(db)

    # ── 성분 ──
    ingredients_out: list[IngredientOut] = []
    grade_counter: Counter[str] = Counter()
    contains: set[str] = set()
    names_for_text_match: list[str] = []
    for pi in product.ingredients:
        ing = pi.ingredient
        hz = ing.hazard if ing else None
        grade = hz.grade if hz else None
        grade_counter[str(grade) if grade is not None else "unknown"] += 1
        if ing:
            contains.update(a.allergen_code for a in ing.allergens)
        names_for_text_match.append(pi.raw_text)
        ingredients_out.append(
            IngredientOut(
                id=ing.id if ing else None,
                name=ing.name_ko if ing else pi.raw_text.split("(")[0].strip(),
                rank=pi.rank,
                function=pi.function_hint or (ing.functions[0] if ing and ing.functions else None),
                grade=grade,
                evidence=hz.evidence_level if hz else None,
                applies_to_groups=hz.applies_to_groups if hz else [],
                summary=hz.summary_ko if hz else None,
                regulatory_status=hz.regulatory_status if hz else {},
            )
        )
    # 동의어 텍스트 매칭(성분 사전에 없는 원료도 잡는다)
    contains.update(h.code for h in match_allergens(names_for_text_match, syn_by_code))
    may_contain = sorted(mc.allergen_code for mc in product.may_contain)
    # 포함 확정이면 혼입가능에서 제거
    may_contain = [c for c in may_contain if c not in contains]

    # ── 원산지 ──
    o = product.origin
    ing_origins: list[tuple[str, str | None, str | None]] = []
    ing_origin_out: list[IngredientOriginOut] = []
    undisclosed = 0
    for pi in product.ingredients:
        name = pi.ingredient.name_ko if pi.ingredient else pi.raw_text.split("(")[0].strip()
        if pi.origins:
            best = max(pi.origins, key=lambda x: x.confirmations)
            ing_origins.append((name, best.country, best.source))
            ing_origin_out.append(
                IngredientOriginOut(
                    name=name, rank=pi.rank, country=best.country, source=best.source,
                    text=origin_svc.ingredient_origin_text(name, best.country, best.source),
                )
            )
        else:
            undisclosed += 1
    badges = origin_svc.build_badges(
        o.manufacturing_country if o else None,
        o.brand_owner_country if o else None,
        bool(o.oem_flag) if o else False,
        ing_origins,
        undisclosed_count=undisclosed,
    )
    origin_out = OriginOut(
        declared_origin_country=o.declared_origin_country if o else None,
        manufacturing_country=o.manufacturing_country if o else None,
        manufacturer_name=o.manufacturer_name if o else None,
        brand_owner_name=o.brand_owner_name if o else None,
        brand_owner_country=o.brand_owner_country if o else None,
        oem=bool(o.oem_flag) if o else False,
        confidence=o.confidence if o else "inferred",
        ingredients=ing_origin_out,
        undisclosed_note=(
            f"{undisclosed}개 원료는 원산지 표시 의무가 없어 알 수 없음" if undisclosed else None
        ),
        badges=[OriginBadgeOut(**b.__dict__) for b in badges],
        disclaimer=origin_svc.DISCLAIMER,
    )

    # ── 영양 ──
    n = product.nutrition
    nutrition_out = (
        NutritionOut(
            per_serving_g=_f(n.serving_g), per_serving_ml=_f(n.serving_ml), kcal=_f(n.kcal),
            sodium_mg=_f(n.sodium_mg), sugar_g=_f(n.sugar_g), sat_fat_g=_f(n.sat_fat_g),
            trans_fat_g=_f(n.trans_fat_g), protein_g=_f(n.protein_g),
            caffeine_mg=_f(n.caffeine_mg), high_caffeine=bool(n.high_caffeine), source=n.source,
        )
        if n
        else None
    )

    # ── 회수 ──
    r = latest_recall(db, product)
    recall_out = (
        RecallOut(id=r.id, reason=r.reason, grade=r.grade, issued_at=r.issued_at,
                  product_name=r.product_name, company_name=r.company_name)
        if r
        else None
    )

    used_labels = {c: labels.get(c, c) for c in sorted(contains | set(may_contain))}
    return ProductResponse(
        product=ProductBrief(
            id=product.id, name=product.name, brand=product.brand,
            manufacturer=product.manufacturer, category=product.category,
            subcategory=product.subcategory, image_url=product.image_url,
        ),
        origin=origin_out,
        ingredients=ingredients_out,
        grade_summary=GradeSummary(**{k: grade_counter.get(k, 0) for k in ("0", "1", "2", "3")},
                                   unknown=grade_counter.get("unknown", 0)),
        allergens=AllergensOut(contains=sorted(contains), may_contain=may_contain,
                               labels=used_labels),
        nutrition=nutrition_out,
        recall=recall_out,
        sources=[
            SourceOut(type=s.type, date=s.date, confirmations=s.confirmations)
            for s in sorted(product.sources, key=lambda s: (s.date or datetime.min.date()))
        ],
        generated_at=datetime.now(UTC),
    )


def _f(v) -> float | None:
    return float(v) if v is not None else None

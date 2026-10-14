"""제품 쓰기(upsert) 공용 서비스.

세 곳에서 같은 로직을 쓴다: 식약처 C002 정규화, 사용자 라벨 기여, 샘플 시드.
입력은 '라벨 정보(LabelFacts)' 하나로 통일하고, 출처(source)만 다르게 넘긴다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m
from app.services.ingredient_parser import ParsedIngredient, parse_ingredients


@dataclass
class LabelFacts:
    name: str | None = None
    brand: str | None = None
    manufacturer: str | None = None
    category: str = "food"
    subcategory: str | None = None
    mfds_report_no: str | None = None
    ean13: str | None = None
    ingredients_raw: str | None = None
    ingredients: list[ParsedIngredient] | None = None  # 이미 파싱된 경우(기여 UI 수정본)
    manufacturing_country: str | None = None
    manufacturer_country: str | None = None
    brand_owner_name: str | None = None
    brand_owner_country: str | None = None
    declared_origin_country: str | None = None
    oem_flag: bool | None = None
    origin_confidence: str | None = None
    may_contain: list[str] = field(default_factory=list)
    nutrition: dict | None = None  # serving_g, serving_ml, kcal, sodium_mg, sugar_g, ..., caffeine_mg
    high_caffeine: bool | None = None
    image_url: str | None = None


class IngredientIndex:
    """이름/동의어 → Ingredient. 공백 제거·소문자 기준. 한 번 만들어 재사용."""

    def __init__(self, db: Session) -> None:
        self.idx: dict[str, m.Ingredient] = {}
        for ing in db.execute(select(m.Ingredient)).scalars():
            for key in [ing.name_ko, *(ing.synonyms or [])]:
                self.idx[key.replace(" ", "").lower()] = ing

    def match(self, name: str) -> m.Ingredient | None:
        k = name.replace(" ", "").lower()
        if k in self.idx:
            return self.idx[k]
        for key, ing in self.idx.items():
            if len(key) >= 3 and key in k:
                return ing
        return None


def find_product(db: Session, facts: LabelFacts, product_id: str | None = None) -> m.Product | None:
    if product_id:
        return db.get(m.Product, product_id)
    if facts.ean13:
        b = db.get(m.ProductBarcode, facts.ean13)
        if b:
            return db.get(m.Product, b.product_id)
    if facts.mfds_report_no:
        return db.execute(
            select(m.Product).where(m.Product.mfds_report_no == facts.mfds_report_no)
        ).scalar_one_or_none()
    return None


def upsert_product(
    db: Session,
    facts: LabelFacts,
    *,
    source: str,
    source_date: date | None = None,
    source_ref: str | None = None,
    idx: IngredientIndex | None = None,
    product_id: str | None = None,
    replace_ingredients: bool = True,
) -> tuple[m.Product, bool]:
    """(product, created). source 예: mfds_c002 | ocr_user | ocr_verified | seed"""
    idx = idx or IngredientIndex(db)
    product = find_product(db, facts, product_id)
    created = False
    if not product:
        product = m.Product(name=facts.name or "(이름 없음)", category=facts.category)
        db.add(product)
        created = True
    # 기본 정보: 새 값이 있을 때만 덮어쓴다
    if facts.name:
        product.name = facts.name
    if facts.brand:
        product.brand = facts.brand
    if facts.manufacturer:
        product.manufacturer = facts.manufacturer
    if not product.brand and product.manufacturer:
        product.brand = product.manufacturer
    if facts.subcategory:
        product.subcategory = facts.subcategory
    if facts.mfds_report_no:
        product.mfds_report_no = facts.mfds_report_no
    if facts.image_url:
        product.image_url = facts.image_url
    product.category = facts.category or product.category
    db.flush()

    if facts.ean13 and not db.get(m.ProductBarcode, facts.ean13):
        product.barcodes.append(m.ProductBarcode(ean13=facts.ean13, source=source))

    # 원재료
    parsed = facts.ingredients
    if parsed is None and facts.ingredients_raw:
        parsed = parse_ingredients(facts.ingredients_raw)
    if parsed is not None:
        if replace_ingredients:
            for pi in list(product.ingredients):
                product.ingredients.remove(pi)
                db.delete(pi)
            db.flush()
        for rank, item in enumerate(parsed, start=1):
            _add_ingredient(product, item, rank, idx, source)
        db.flush()

    # 혼입 가능
    if facts.may_contain:
        existing = {mc.allergen_code for mc in product.may_contain}
        for code in facts.may_contain:
            if code not in existing and db.get(m.Allergen, code):
                product.may_contain.append(m.ProductMayContain(allergen_code=code))

    # 원산지
    o = product.origin or m.ProductOrigin(source=source)
    if product.origin is None:
        product.origin = o
    for attr in ("manufacturing_country", "manufacturer_country", "brand_owner_name",
                 "brand_owner_country", "declared_origin_country"):
        v = getattr(facts, attr)
        if v:
            setattr(o, attr, v)
    if facts.manufacturer and not o.manufacturer_name:
        o.manufacturer_name = facts.manufacturer
    if facts.oem_flag is not None:
        o.oem_flag = facts.oem_flag
    elif o.manufacturer_name and o.brand_owner_name and o.manufacturer_name != o.brand_owner_name:
        o.oem_flag = True
    if facts.origin_confidence:
        o.confidence = facts.origin_confidence
    o.source = source

    # 영양
    if facts.nutrition:
        n = product.nutrition or m.ProductNutrition(source=source)
        if product.nutrition is None:
            product.nutrition = n
        for k, v in facts.nutrition.items():
            if hasattr(n, k) and v is not None:
                setattr(n, k, v)
        if facts.high_caffeine is not None:
            n.high_caffeine = facts.high_caffeine
        elif n.caffeine_mg and n.serving_ml:
            n.high_caffeine = float(n.caffeine_mg) / float(n.serving_ml) >= 0.15
        n.source = source

    touch_source(product, source, source_date, source_ref)
    db.flush()
    return product, created


def _add_ingredient(product: m.Product, item: ParsedIngredient, rank: int,
                    idx: IngredientIndex, source: str) -> None:
    ing = idx.match(item.name)
    pi = m.ProductIngredient(ingredient_id=ing.id if ing else None, rank=rank, raw_text=item.raw,
                             function_hint=item.function_hint, source=source)
    product.ingredients.append(pi)
    if item.origin:
        pi.origins.append(m.IngredientOrigin(country=item.origin, raw_text=item.origin_raw,
                                             source="label", confirmations=1))


def touch_source(product: m.Product, type_: str, d: date | None, ref: str | None,
                 confirmations: int | None = None) -> m.ProductSource:
    for s in product.sources:
        if s.type == type_:
            s.date = d or s.date
            s.ref = ref or s.ref
            if confirmations is not None:
                s.confirmations = confirmations
            return s
    s = m.ProductSource(type=type_, date=d, ref=ref, confirmations=confirmations or 0)
    product.sources.append(s)
    return s
